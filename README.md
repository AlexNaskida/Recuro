# Recuro Protocol — v2.0

**On-chain recurring payments for Solana.**

Recuro is an Anchor program that lets merchants define subscription plans and
lets subscribers pay automatically — no frontend required after the initial
sign-up. Payments are triggered by an off-chain keeper and all fund movements
happen through the [Solana Foundation Subscriptions &
Allowances](https://github.com/solana-labs/solana-program-library) program,
which acts as the SPL delegate layer.

**Program ID (devnet & mainnet-beta):**
`45WGwEH24Y9J6ZHYoKiGRET4t4xpu6ESiTeRdhRf9pfr`

**Foundation Subscriptions program (all clusters):**
`De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44`

---

## What's New in v2.0

| Change | Detail |
|---|---|
| **FeeRouter PDA** | Protocol-owned intermediary that signs Foundation CPIs, making `execute_payment` permissionless — any keeper can call it |
| **Fee-on-top model** | Subscribers pay `plan_amount + fee`; merchant receives the full advertised price unchanged |
| **Fee floor** | `MIN_FEE_USDC = 10_000` (0.01 USDC) ensures keeper rewards on near-zero `fee_bps` settings, capped at 10% of plan amount |
| **SDK reconciliation** | `reconcileSubscriptionState()` surfaces drift between Recuro state and Foundation SubscriptionDelegation |
| **Re-init guard** | `FeeRouterAlreadyInitialized` error code prevents FeeRouter from being overwritten |
| **Multi-stablecoin** | SDK `SdkConfig.stablecoin` supports USDC, USDT, PYUSD |

---

## Architecture

### Stack

```
┌──────────────────────────────────────────────────────┐
│  Off-chain keeper (thread/keeper.mjs)                │
│  TypeScript SDK  (sdk/src/SubscriptionSdk.ts)        │
└──────────────────┬───────────────────────────────────┘
                   │ RPC
┌──────────────────▼───────────────────────────────────┐
│  Recuro Program  (programs/subscription)             │
│  45WGwEH24Y9J6ZHYoKiGRET4t4xpu6ESiTeRdhRf9pfr       │
└──────────────────┬───────────────────────────────────┘
                   │ CPI (invoke_signed)
┌──────────────────▼───────────────────────────────────┐
│  Foundation Subscriptions & Allowances               │
│  De1egAFMkMWZSN5rYXRj9CAdheBamobVNubTsi9avR44       │
└──────────────────────────────────────────────────────┘
```

### Foundation integration

Foundation manages the actual SPL delegate (`SubscriptionAuthority` PDA, approved
for `u64::MAX` tokens at subscribe-time) and a `SubscriptionDelegation` record per
subscriber. Recuro never holds subscriber funds — they stay in the subscriber's
wallet until the moment a payment executes via `transfer_subscription` (disc 10).

Foundation enforces:
- The destination must be in the plan's `destinations[0..3]` whitelist
- The puller must be in the plan's `pullers[0..3]` whitelist
- Per-period pull limits (`terms.amount`) are respected

### FeeRouter

The `FeeRouter` PDA (`seeds = [b"fee_router"]`) solves the keeper authorization
problem. At plan creation, `destinations[2]` and `pullers[0]` on the Foundation
plan are both set to the FeeRouter PDA. When a keeper calls `execute_payment`,
Recuro uses `invoke_signed` with FeeRouter seeds so the PDA signs the three
Foundation `transfer_subscription` calls. The keeper's identity is irrelevant to
Foundation — any valid caller can run a keeper.

After the third Foundation transfer lands tokens in the FeeRouter's ATA, a
standard SPL `transfer` (also PDA-signed) forwards the keeper reward directly to
`keeper_token_account`.

```
execute_payment legs:
  1. Foundation CPI → subscriber ATA → merchant ATA        (plan_amount)
  2. Foundation CPI → subscriber ATA → treasury ATA        (fee × 40%)
  3. Foundation CPI → subscriber ATA → FeeRouter ATA       (fee × 60%)
  4. SPL transfer   → FeeRouter ATA  → keeper ATA          (fee × 60%)
```

---

## Security Model

**What Recuro guarantees:**
- Plan price is immutable after creation — subscribers can never be surprised by a rate increase
- `execute_payment` checks timing on-chain (`next_payment_at`), status (`Active`), and balance before any token movement
- After 3 consecutive failed payments the subscription auto-expires — no funds can be pulled from a subscriber who has had 3 failures
- After 12 billing cycles the SPL delegate expires and the subscription moves to `Expired`; the subscriber must opt in again via `renew_subscription`

**What Recuro does NOT guarantee:**
- Atomicity between Recuro state and Foundation state on merchant-cancel: when a merchant cancels, the Foundation CPI is intentionally skipped (only the subscriber can sign Foundation's `cancel_subscription`). Foundation-side the delegation expires at the next period end. Use `reconcileSubscriptionState()` to detect and surface this lag
- Keeper liveness: the off-chain keeper is not part of the program and has no on-chain enforcement. A keeper that goes offline stops payments. This is an acceptable tradeoff for permissionless keeper incentives

**Admin keys:**
- `initialize_config` is a one-time setup instruction — admin address stored in `ProtocolConfig`
- `update_config` allows admin to change `fee_bps` (0–500) and treasury address
- `initialize_fee_router` is admin-only; the FeeRouter PDA is stable once deployed

---

## Protocol Flow

### 1. Plan creation (merchant)

```
merchant → createPlan(planId, name, amount, interval, ...)
  └─ Recuro: create Plan PDA
  └─ Foundation CPI (disc 7): create_plan
       destinations: [merchant, treasury, feeRouter, zero]
       pullers:      [feeRouter, zero, zero, zero]
       terms.amount: plan_amount + 5% max fee
```

The Foundation plan `terms.amount` is set to `plan_amount × 1.05` at creation,
covering any fee within the allowed 0–500 bps range for the lifetime of the plan.

### 2. Subscription (subscriber)

```
subscriber → createSubscription(planPubkey)
  └─ Recuro: create Subscription PDA (init_if_needed)
  └─ Foundation CPI (disc 0): init_subscription_authority
       → creates SubscriptionAuthority PDA, approves SPL delegate u64::MAX
  └─ Foundation CPI (disc 11): subscribe
       → creates SubscriptionDelegation PDA, records consent
```

### 3. Payment execution (keeper)

```
keeper → executePayment(subscriptionPubkey, keeperTokenAccount)
  Recuro checks: status == Active, not in trial, payment is due
  └─ Foundation CPI × 3 (disc 10, FeeRouter PDA signer)
       leg 1: subscriber → merchant      (plan_amount)
       leg 2: subscriber → treasury      (fee × 40%)
       leg 3: subscriber → FeeRouter ATA (fee × 60%)
  └─ SPL transfer (FeeRouter PDA signer)
       FeeRouter ATA → keeper ATA        (fee × 60%)
  Recuro state: next_payment_at += interval, cycles_remaining--
```

On insufficient balance: `failed_payment_count++`. At 3 failures: status → `Expired`.
At 12 successful cycles: status → `Expired`; subscriber renews to continue.

### 4. Cancellation

```
subscriber → cancelSubscription(subscriptionPubkey)
  └─ Recuro: status → Cancelled
  └─ Foundation CPI (disc 12): cancel_subscription
       → sets expires_at_ts on SubscriptionDelegation

merchant → cancelSubscription(subscriptionPubkey)
  └─ Recuro: status → Cancelled
  └─ NO Foundation CPI (merchant cannot sign Foundation cancel)
     Foundation delegation expires at next period end (~1 billing cycle lag)
```

---

## Instructions Reference

| Instruction | Signer | Description |
|---|---|---|
| `initialize_config` | admin | One-time: create ProtocolConfig PDA |
| `initialize_fee_router` | admin | One-time: create FeeRouter PDA + ATA |
| `create_plan` | merchant | Create plan PDA + Foundation plan |
| `update_plan` | merchant | Update name, description, capacity, receive address |
| `archive_plan` | merchant | Stop accepting new subscribers |
| `unarchive_plan` | merchant | Re-enable a previously archived plan |
| `delete_plan` | merchant | Close an archived plan with 0 active subscribers |
| `create_subscription` | subscriber | Subscribe + set up Foundation delegation |
| `renew_subscription` | subscriber | Re-approve delegate after 12-cycle expiry |
| `cancel_subscription` | subscriber or merchant | Cancel; Foundation CPI on subscriber path only |
| `close_subscription` | subscriber | Close Cancelled/Expired PDA, reclaim rent |
| `execute_payment` | any (keeper) | Trigger due payment; permissionless |
| `update_config` | admin | Change fee_bps (0–500) or treasury address |

---

## Running a Keeper

The reference keeper is `thread/keeper.mjs`. It polls all active subscriptions
every 60 seconds and calls `execute_payment` for each one that is due.

```bash
# Prerequisites
export KEEPER_KEYPAIR=/path/to/keeper-keypair.json
export RECURO_PROGRAM_ID=45WGwEH24Y9J6ZHYoKiGRET4t4xpu6ESiTeRdhRf9pfr
export SOLANA_CLUSTER=devnet

node thread/keeper.mjs
```

The keeper does not require any special permissions or registration. Any wallet
can run a keeper.

### Fee economics

At a 100 bps (1%) fee setting:

| Plan price | Gross fee | Keeper reward (60%) |
|---|---|---|
| $1.00/mo | $0.010 | $0.006 |
| $9.99/mo | $0.100 | $0.060 |
| $49.99/mo | $0.500 | $0.300 |

**Break-even estimate:** At 1% fee and 60% keeper split, a keeper earning SOL
transaction fees of ~$0.00025/tx and server costs of ~$5/month needs roughly
**1,400 successful executions/month** from $10/month subscriptions to cover
costs — well within reach for a keeper serving a live merchant with a modest
subscriber base.

The `MIN_FEE_USDC` floor (0.01 USDC) ensures reward is non-trivial even when
`fee_bps` is set near zero for promotional periods.

---

## SDK Reference

```typescript
import { SubscriptionSdk } from "@recuro/sdk";
import { AnchorProvider } from "@coral-xyz/anchor";

const provider = AnchorProvider.env();
const sdk = new SubscriptionSdk(provider, { cluster: "devnet" });

// Merchant: create a plan
const { planPubkey } = await sdk.createPlan({
  planId: 1,
  name: "Pro",
  amountUsdc: 9.99,
  intervalDays: 30,
  trialDays: 7,
});

// Subscriber: subscribe
const { subscriptionPubkey } = await sdk.createSubscription({ planPubkey });

// Keeper: execute a due payment
await sdk.executePayment(subscriptionPubkey, keeperTokenAccount);

// Subscriber/merchant: cancel
await sdk.cancelSubscription(subscriptionPubkey);

// Diagnose state drift between Recuro and Foundation
const state = await sdk.reconcileSubscriptionState(subscriptionPubkey);
// { recuroStatus, foundationCancelled, foundationExpiresAt, inSync }
```

**Key SDK methods:**

| Method | Description |
|---|---|
| `createPlan(params)` | Deploy a new subscription plan |
| `createSubscription({ planPubkey })` | Subscribe to a plan |
| `renewSubscription(sub, plan)` | Renew after 12-cycle expiry |
| `cancelSubscription(sub)` | Cancel; warns on Foundation state drift |
| `executePayment(sub, keeperATA)` | Execute a due payment (keeper path) |
| `reconcileSubscriptionState(sub)` | Compare Recuro vs Foundation state |
| `fetchPlan(pubkey)` | Fetch plan account |
| `fetchSubscription(pubkey)` | Fetch subscription account |
| `fetchMerchantPlans(merchant)` | All plans for a merchant |
| `fetchSubscriberSubscriptions(subscriber)` | All subscriptions for a wallet |
| `getAnalytics(merchant)` | Aggregated merchant analytics |
| `onPaymentExecuted(cb)` | Subscribe to payment events |

---

## Known Limitations

1. **Merchant-cancel Foundation lag.** When a merchant cancels, Foundation's
   `SubscriptionDelegation` isn't cancelled immediately — it expires naturally
   at the next billing period. A keeper that runs between the Recuro cancel and
   the Foundation expiry will find Recuro status `Cancelled` and abort without
   charging. `reconcileSubscriptionState()` returns `inSync: false` to surface
   this state.

2. **Keeper liveness is off-chain.** There is no on-chain enforcement of keeper
   uptime. If no keeper runs, payments simply don't execute. Merchants should
   either run their own keeper or verify a third-party keeper is active before
   launching.

3. **12-cycle hard limit per SA delegation.** The SPL delegate approved at
   subscribe-time covers exactly 12 billing cycles. After the 12th payment
   the subscription expires and requires subscriber action (`renewSubscription`)
   to continue. This is intentional: subscribers explicitly re-consent each year.

4. **No partial refunds.** Recuro has no refund instruction. Merchants handle
   refunds off-chain or through a separate SPL transfer.

5. **Foundation `expires_at_ts` byte offset.** The SDK's
   `_getFoundationSubscriptionStatus()` parses the Foundation
   `SubscriptionDelegation` at a fixed byte offset (65) based on the observed
   account layout. If the Foundation program is upgraded and the layout changes,
   this offset must be updated.

---

## Deployment

### Devnet

```bash
anchor build
anchor deploy --provider.cluster devnet

# Initialize protocol config (admin wallet)
anchor run initialize-config

# Initialize FeeRouter (admin wallet)
anchor run initialize-fee-router
```

### Mainnet checklist

- [ ] Audit `ProtocolConfig.fee_bps` — set conservatively (suggest 100 bps)
- [ ] Confirm `treasury` address is a multisig (Squads recommended)
- [ ] Confirm `admin` address is a multisig
- [ ] Initialize FeeRouter PDA; verify ATA is created
- [ ] Run `anchor verify` against the deployed program binary
- [ ] Confirm Foundation Subscriptions program is deployed on mainnet-beta
- [ ] Test `create_plan` → `create_subscription` → `execute_payment` end-to-end on devnet with final config before mainnet deploy
- [ ] Fund at least one keeper wallet with SOL for transaction fees
- [ ] Monitor FeeRouter ATA — residual balance should be 0 between payment cycles (keeper reward is forwarded immediately)

---

## Changelog

### v2.0.0
- FeeRouter PDA: permissionless keeper architecture
- Fee-on-top model replacing fee-from-merchant
- `MIN_FEE_USDC` floor (0.01 USDC) with 10% plan-amount cap
- SDK: `executePayment`, `reconcileSubscriptionState`, Foundation state pre-checks
- Multi-stablecoin SDK support (USDC, USDT, PYUSD)
- `FeeRouterAlreadyInitialized` error code

### v1.0.0
- Initial release: Clockwork-thread based keeper, single USDC, Guard PDA architecture
