# Solana Subscription Protocol

> **Non-custodial, on-chain recurring USDC subscriptions powered by Solana + open keepers.**

Funds stay in the subscriber's wallet until payment time. Billing is automated by permissionless keepers that call `execute_payment()` on-chain.

---

## Architecture overview

```
┌──────────────────────────────────────────────────────────────┐
│                      Solana Blockchain                       │
│                                                              │
│  ┌─────────────┐       ┌──────────────────────────────────┐  │
│  │  Plan PDA   │◄──────│     Subscription Program         │  │
│  │  (merchant) │       │       (Anchor / Rust)            │  │
│  └─────────────┘       └──────────────┬───────────────────┘  │
│                                        │                     │
│  ┌──────────────────────┐              │ CPI                 │
│  │  Subscription PDA    │◄─────────────┘                     │
│  │  (per subscriber)    │                                    │
│  └──────────┬───────────┘                                    │
│             │                                                │
│             │ SPL delegate approval (exact amount only)      │
│             ▼                                                │
│  ┌──────────────────────┐                                    │
│  │        Guard         │  checks:                           │
│  │   (per subscription) │  ✓ correct merchant?               │
│  │                      │  ✓ exact amount?                   │
│  │                      │  ✓ interval respected?             │
│  │                      │  ✓ status == active?               │
│  └──────────┬───────────┘                                    │
│             │  only releases funds if all checks pass        │
│             ▼                                                │
│  ┌──────────────────────┐   ┌──────────────────────────┐     │
│  │  Subscriber USDC ATA │──►│  Merchant USDC ATA       │     │
│  │  (funds stay here)   │   │  (receives payment)      │     │
│  └──────────────────────┘   └──────────────────────────┘     │
│                                                              │
│  ┌──────────────────────┐                                    │
│  │  On-Chain Thread     │  fires execute_payment() every     │
│  │                      │  billing interval automatically    │
│  └──────────────────────┘                                    │
└──────────────────────────────────────────────────────────────┘
```

### Key design decisions

| Decision             | Reasoning                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Non-custodial**    | Subscriber's USDC stays in their wallet. SPL delegate approval is granted to a per-subscription Guard PDA, not to a keeper wallet.                                       |
| **Price integrity**  | The `amount_usdc` field on the Subscription PDA is **copied from the Plan PDA** at creation time by the program. No user-supplied amount is ever accepted for transfers. |
| **Guarded transfer** | `execute_payment()` calls Guard via CPI. Guard enforces caller, destination ATA, interval, and transfer amount before moving tokens.                                     |
| **Fully automated**  | Permissionless keepers execute `execute_payment()` on-chain. There is no centralized billing backend that can unilaterally charge users.                                 |
| **Auto-expiry**      | Three consecutive payment failures → subscription auto-expires; subscriber rent is returned.                                                                             |
| **Protocol fee**     | Configurable fee (hard cap: 5%) deducted from each payment and sent to the protocol treasury ATA.                                                                        |

---

## Repository layout

```
recuro-sdk/
├── programs/subscription/           # Anchor / Rust smart contract
│   └── src/
│       ├── lib.rs                   # Program entrypoint; all instruction handlers
│       ├── errors.rs                # Custom error codes
│       ├── events.rs                # On-chain event definitions
│       ├── utils.rs                 # Arithmetic helpers, cron builder
│       ├── state/
│       │   ├── config.rs            # ProtocolConfig PDA
│       │   ├── plan.rs              # Plan PDA + PlanStatus enum
│       │   └── subscription.rs      # Subscription PDA + events
│       └── instructions/
│           ├── initialize_config.rs
│           ├── create_plan.rs
│           ├── update_plan.rs       # (also pause_plan, archive_plan)
│           ├── create_subscription.rs
│           ├── execute_payment.rs
│           ├── cancel_subscription.rs
│           └── charge_now.rs
├── programs/recuro-guard/           # Anchor / Rust guard program
│   └── src/
│       └── lib.rs                   # Guard PDA state + authorize_payment gatekeeper
│
├── sdk/                             # TypeScript SDK (@recuro/sdk)
│   └── src/
│       ├── SubscriptionSdk.ts       # Main SDK class
│       ├── types.ts                 # Full TypeScript type definitions
│       ├── constants.ts             # Program IDs, USDC mints, limits
│       ├── idl.json                 # Generated by `anchor build` - copy with `yarn anchor:idl`
│       └── utils/
│           ├── pda.ts               # PDA derivation helpers
│           ├── analytics.ts         # Analytics aggregation
│           └── format.ts            # USDC formatting, interval labels
│
├── client/
│   └── apps/
│   ├── merchant-dashboard/          # React + Vite + shadcn/ui (port 3001)
│   │   └── src/
│   │       ├── App.tsx              # Router setup; landing page
│   │       ├── main.tsx             # Providers: Wallet, QueryClient, Tooltip
│   │       ├── constants/           # Addresses, formatters, chart colours
│   │       ├── lib/                 # Anchor factory, utils
│   │       ├── store/               # Zustand: live events, analytics state
│   │       ├── hooks/               # React Query: plans, analytics, realtime
│   │       ├── components/
│   │       │   ├── layout/Shell.tsx # Sidebar + topbar layout
│   │       │   ├── ui/              # shadcn/ui components
│   │       │   ├── analytics/       # KpiCard, RevenueChart, SubscriberTrend, LiveEventFeed
│   │       │   ├── plans/           # PlanCard, CreatePlanForm
│   │       │   └── logs/            # ExecutionLogsTable
│   │       └── pages/               # OverviewPage, PlansPage, CreatePlanPage,
│   │                                #   AnalyticsPage, LogsPage, SettingsPage
│   │
│   └── user-demo/                   # React + Vite subscriber portal (port 3000)
│       └── src/
│           ├── App.tsx
│           ├── components/
│           │   ├── layout/Topbar.tsx
│           │   ├── ui/index.tsx     # Shared primitives
│           │   └── subscription/    # PlanCard (with SubscribeDialog),
│           │                        #   SubscriptionCard (with CancelDialog)
│           └── pages/
│               ├── ExplorePage.tsx  # Load plan by PDA, subscribe
│               └── MySubscriptionsPage.tsx
│
├── tests/
│   └── subscription.ts              # 17-case integration test suite
│
└── .github/workflows/ci.yml         # Rust fmt + clippy + anchor test + SDK + apps
```

---

## Quick start

### Prerequisites

| Tool         | Version |
| ------------ | ------- |
| Rust + Cargo | 1.75+   |
| Solana CLI   | 1.18+   |
| Anchor CLI   | 0.29+   |
| Node.js      | 20+     |
| Yarn         | 1.22+   |

### 1 - Install dependencies

```bash
yarn install
```

### 2 - Build the smart contract

```bash
anchor build
```

This compiles the Rust program and generates `target/idl/subscription.json`.

### 3 - Sync the IDL to the SDK

```bash
yarn anchor:idl
# equivalent to: cp target/idl/subscription.json sdk/src/idl.json
```

The SDK uses this IDL to generate type-safe instruction builders and account deserializers.

### 4 - Run the test suite (localnet)

```bash
anchor test
# or:
yarn test
```

The test validator starts automatically. 17 test cases cover all instruction paths.

### 5 - Deploy to devnet

```bash
# Fund your wallet
solana airdrop 2 --url devnet

# Deploy
anchor deploy --provider.cluster devnet

# Note the program ID from the output, then update:
#   Anchor.toml         → [programs.devnet]
#   programs/subscription/src/lib.rs → declare_id!(...)
#   client/apps/*/.env.local   → VITE_PROGRAM_ID=...

# Rebuild and redeploy with correct ID
anchor build && anchor deploy --provider.cluster devnet
```

### 6 - Run the apps

```bash
# All three apps in parallel
yarn dev

# Or individually
yarn dev:merchant   # http://localhost:3001
yarn dev:user       # http://localhost:3000
yarn dev:landing    # http://localhost:3002
```

Copy `client/apps/merchant-dashboard/.env.example` → `.env.local` and fill in your deployed values before running.

---

## SDK usage

Install the SDK:

```bash
yarn add @recuro/sdk
```

```typescript
import { AnchorProvider } from "@coral-xyz/anchor";
import { SubscriptionSdk } from "@recuro/sdk";

// 1. Instantiate
const provider = new AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
const sdk = new SubscriptionSdk(provider, { cluster: "devnet" });

// 2. Create a plan (merchant)
const { planPubkey, signature } = await sdk.createPlan({
  planId: Date.now(),
  name: "Pro Monthly",
  description: "Full access to all features",
  amountUsdc: 9.99, // human USDC - SDK converts to micro-USDC
  intervalDays: 30,
  trialDays: 7, // 7-day free trial
  maxSubscribers: 0, // unlimited
});

// 3. Subscribe (user)
const { subscriptionPubkey } = await sdk.createSubscription({ planPubkey });

// 4. Cancel (user or merchant)
await sdk.cancelSubscription(subscriptionPubkey);

// 5. Fetch accounts
const plan = await sdk.fetchPlan(planPubkey);
const subs = await sdk.fetchMerchantPlans(merchantPublicKey);
const mySubs = await sdk.fetchSubscriberSubscriptions(subscriberPublicKey);

// 6. Analytics
const analytics = await sdk.getAnalytics(merchantPublicKey);
console.log(analytics.totalRevenue); // human USDC
console.log(analytics.activeSubscriptions);
console.log(analytics.churnRate); // %

// 7. Real-time event listeners
const id = sdk.onPaymentExecuted((event, slot, signature) => {
  console.log(`Payment: $${event.netAmount.toNumber() / 1e6} USDC`);
});

// Clean up
await sdk.removeEventListener(id);
```

### PDA derivation

```typescript
import { getPlanPDA, getSubscriptionPDA } from "@recuro/sdk/utils/pda";

const planPda = getPlanPDA(merchantPublicKey, planId, programId);
const subPda = getSubscriptionPDA(planPda, subscriberPublicKey, programId);
```

---

## On-chain events

All events are emitted via Anchor's event system and indexed by the SDK's `onXxx` listeners.

| Event                   | Emitted when                                         |
| ----------------------- | ---------------------------------------------------- |
| `PlanCreated`           | Merchant deploys a new plan                          |
| `PlanUpdated`           | Merchant updates plan metadata                       |
| `SubscriptionCreated`   | User subscribes to a plan                            |
| `PaymentExecuted`       | Guard-authorized payment succeeds                    |
| `PaymentFailed`         | Transfer fails (low balance, revoked delegate, etc.) |
| `SubscriptionCancelled` | Subscriber or merchant cancels                       |
| `SubscriptionExpired`   | Auto-closed after 3 consecutive failures             |

---

## Security model

### Price spoofing is impossible

The `execute_payment` path uses amount from on-chain state only. Recuro CPI-calls Guard, and Guard always transfers its stored `amount_per_period`. No user-supplied transfer amount is accepted.

### Delegate scoping

The SPL delegate approval is granted **to the Guard PDA** (not a keeper wallet), for a bounded recurring allowance. This means:

- Guard can only transfer its configured amount to its configured destination.
- The subscriber can revoke the approval at any time from any SPL-aware wallet.
- If the approval is revoked, the next payment fails gracefully and the failure counter increments.

### Guard caller enforcement

Any keeper may call `execute_payment`, but merchant principal transfer still requires Guard authorization. Guard verifies caller identity, interval elapsed, and destination ATA before transfer.

---

## Contributing

1. Fork and create a feature branch.
2. Run `anchor test` - all 17 tests must pass.
3. Run `cargo clippy --all-targets -- -D warnings` - zero warnings.
4. Open a pull request against `main`.

---

## License

MIT © 2026 Netflix
