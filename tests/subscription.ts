/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * SOLANA SUBSCRIPTION PROTOCOL - FULL TEST SUITE
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * STEP 1 - change ONE line in programs/subscription/src/constants.rs:
 *   pub const MIN_INTERVAL_SECONDS: i64 = 1;   // was 86_400
 * Then run:  anchor test --provider.cluster localnet
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ANCHOR 0.32 ACCOUNT RESOLUTION - FINAL CONFIRMED RULES
 * ─────────────────────────────────────────────────────────────────────────────
 * There are TWO resolution strategies Anchor supports. Only ONE works reliably:
 *
 *   ✓ WORKS:  accounts whose seeds are fully derivable from instruction params
 *             or other already-known signer/mint addresses.
 *             Example: config PDA (seeds=["config"]), plan PDA in create_plan
 *             (because plan_id is in the instruction params struct).
 *
 *   ✗ BROKEN: "circular" PDAs whose seeds contain fields from another account
 *             that isn't loaded yet. Plan PDA (seeds include plan.plan_id which
 *             lives inside the plan) and Subscription PDA (seeds include
 *             subscription.plan and subscription.subscriber from inside the
 *             account) cannot be auto-resolved.
 *
 *   ✗ BROKEN: address = account.field constraints do NOT trigger chain-
 *             resolution in 0.32. Even if subscription is loaded and plan's
 *             address is subscription.plan, Anchor still requires plan to be
 *             passed explicitly.
 *
 * RULE: pass every account via .accountsPartial(). The only things Anchor can
 *       auto-fill are program addresses (systemProgram, tokenProgram, etc.)
 *       and the config PDA.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * ACCOUNTS PER INSTRUCTION (all explicit)
 * ─────────────────────────────────────────────────────────────────────────────
 *  initialize_config    admin
 *  create_plan          merchant, usdcMint
 *  update_plan          merchant, plan
 *  create_subscription  subscriber, usdcMint, plan, subscription
 *  execute_payment      keeper, subscription, plan,
 *                       subscriber, subscriberTokenAccount, usdcMint,
 *                       guardAccount, guardProgram,
 *                       merchantTokenAccount, treasuryTokenAccount
 *  pause_subscription   authority, subscription, plan
 *  resume_subscription  authority, subscription, plan
 *  cancel_subscription  authority, subscription, plan
 *  pause_plan           merchant, plan
 *  archive_plan         merchant, plan
 *
 * FEE MODEL (fee on top):
 *   fee          = plan_amount × fee_bps / 10_000
 *   total_charge = plan_amount + fee          ← subscriber pays this
 *   merchant     receives plan_amount
 *   treasury     receives fee
 *
 * SUBSCRIPTION STATUS: active | paused | cancelled | expired
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import BN from "bn.js";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import pkg from "@solana/spl-token";
const { createMint, createAssociatedTokenAccount, mintTo, getAccount } = pkg;
import { assert } from "chai";
import type { Subscription } from "../target/types/subscription";

// ─── Constants ───────────────────────────────────────────────────────────────
const USDC_DECIMALS = 6;
const USDC_FACTOR = 1_000_000;
const PLAN_AMOUNT = new BN(10 * USDC_FACTOR); // $10.00
const INTERVAL_S = new BN(1); // 1 sec - requires MIN_INTERVAL_SECONDS=1
const TRIAL_S = new BN(0);
const MAX_SUBS = new BN(100);
const FEE_BPS = 25; // 0.25%

// ─── PDA Helpers ─────────────────────────────────────────────────────────────

async function airdrop(provider: AnchorProvider, to: PublicKey, sol = 2) {
  const sig = await provider.connection.requestAirdrop(
    to,
    sol * LAMPORTS_PER_SOL,
  );
  await provider.connection.confirmTransaction(sig, "confirmed");
}

function derivePlanPDA(
  merchant: PublicKey,
  planId: BN,
  programId: PublicKey,
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("plan"),
      merchant.toBuffer(),
      planId.toArrayLike(Buffer, "le", 8),
    ],
    programId,
  );
  return pda;
}

function deriveSubscriptionPDA(
  plan: PublicKey,
  subscriber: PublicKey,
  programId: PublicKey,
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("subscription"), plan.toBuffer(), subscriber.toBuffer()],
    programId,
  );
  return pda;
}

function deriveGuardPDA(
  subscription: PublicKey,
  guardProgramId: PublicKey,
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("guard"), subscription.toBuffer()],
    guardProgramId,
  );
  return pda;
}

function deriveConfigPDA(programId: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from("config")],
    programId,
  );
  return pda;
}

function formatUSDC(val: bigint | BN | number): string {
  const n =
    typeof val === "bigint"
      ? Number(val)
      : val instanceof BN
        ? val.toNumber()
        : val;
  return `$${(n / USDC_FACTOR).toFixed(6)}`;
}

function section(title: string) {
  console.log(`\n${"═".repeat(65)}`);
  console.log(`  ${title}`);
  console.log("═".repeat(65));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════════════════
describe("Solana Subscription Protocol - Full Suite", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Subscription as Program<Subscription>;
  const guardProgramId = new PublicKey(
    "grdvTYiUwMY5j2R7UCnR5B8WkrGmD8KES2BJ63V2zZS",
  );
  const programId = program.programId;

  console.log("\n  Program ID:", programId.toBase58());

  const admin = provider.wallet as anchor.Wallet;
  const merchant = Keypair.generate();
  const subscriber = Keypair.generate();
  const keeper = Keypair.generate();
  const treasury = Keypair.generate();
  const intruder = Keypair.generate();

  let usdcMint: PublicKey;
  let merchantUsdcAta: PublicKey;
  let subscriberUsdcAta: PublicKey;
  let treasuryUsdcAta: PublicKey;
  let configPDA: PublicKey;
  let planId: BN;
  let planPDA: PublicKey;
  let subscriptionPDA: PublicKey;
  let guardPDA: PublicKey;

  before("Fund actors & create mock USDC", async () => {
    section("SETUP");

    console.log("\n  admin      =", admin.publicKey.toBase58());
    console.log("  merchant   =", merchant.publicKey.toBase58());
    console.log("  subscriber =", subscriber.publicKey.toBase58());
    console.log("  keeper     =", keeper.publicKey.toBase58());
    console.log("  treasury   =", treasury.publicKey.toBase58());

    await Promise.all([
      airdrop(provider, merchant.publicKey, 2),
      airdrop(provider, subscriber.publicKey, 2),
      airdrop(provider, keeper.publicKey, 2),
      airdrop(provider, treasury.publicKey, 1),
      airdrop(provider, intruder.publicKey, 1),
    ]);

    // Mock USDC (devnet: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU)
    usdcMint = await createMint(
      provider.connection,
      admin.payer,
      admin.publicKey,
      null,
      USDC_DECIMALS,
    );
    console.log("\n  Mock USDC:", usdcMint.toBase58());

    [merchantUsdcAta, subscriberUsdcAta, treasuryUsdcAta] = await Promise.all([
      createAssociatedTokenAccount(
        provider.connection,
        merchant,
        usdcMint,
        merchant.publicKey,
      ),
      createAssociatedTokenAccount(
        provider.connection,
        subscriber,
        usdcMint,
        subscriber.publicKey,
      ),
      createAssociatedTokenAccount(
        provider.connection,
        admin.payer,
        usdcMint,
        treasury.publicKey,
      ),
    ]);

    await mintTo(
      provider.connection,
      admin.payer,
      usdcMint,
      subscriberUsdcAta,
      admin.publicKey,
      500 * USDC_FACTOR,
    );

    const bal = await getAccount(provider.connection, subscriberUsdcAta);
    console.log("  Subscriber balance:", formatUSDC(bal.amount));

    configPDA = deriveConfigPDA(programId);
    planId = new BN(Date.now());
    planPDA = derivePlanPDA(merchant.publicKey, planId, programId);
    subscriptionPDA = deriveSubscriptionPDA(
      planPDA,
      subscriber.publicKey,
      programId,
    );
    guardPDA = deriveGuardPDA(subscriptionPDA, guardProgramId);

    console.log("\n  configPDA       =", configPDA.toBase58());
    console.log("  planPDA         =", planPDA.toBase58());
    console.log("  subscriptionPDA =", subscriptionPDA.toBase58());
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. initialize_config
  // ═══════════════════════════════════════════════════════════════════════════
  describe("1 · initialize_config", () => {
    it("creates the ProtocolConfig PDA", async () => {
      section("1. initialize_config");

      const tx = await program.methods
        .initializeConfig({ feeBps: FEE_BPS, treasury: treasury.publicKey })
        .accounts({ admin: admin.publicKey })
        .rpc();

      console.log("  TX:", tx);
      const cfg = await program.account.protocolConfig.fetch(configPDA);
      console.log("  admin    =", cfg.admin.toBase58());
      console.log("  treasury =", cfg.treasury.toBase58());
      console.log("  fee_bps  =", cfg.feeBps, `(${cfg.feeBps / 100}%)`);

      assert.equal(cfg.feeBps, FEE_BPS);
      assert.equal(cfg.treasury.toBase58(), treasury.publicKey.toBase58());
      assert.isFalse(cfg.creationPaused);
      console.log("  ✓ ProtocolConfig initialised");
    });

    it("rejects re-initialisation", async () => {
      try {
        await program.methods
          .initializeConfig({ feeBps: 600, treasury: treasury.publicKey })
          .accounts({ admin: admin.publicKey })
          .rpc();
        assert.fail("Should have thrown");
      } catch (err: any) {
        console.log(
          "  ✓ Rejected:",
          err.message.split("\n")[0].substring(0, 70),
        );
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. create_plan
  //    plan_id IS in params → Anchor can derive plan PDA → only merchant + mint needed
  // ═══════════════════════════════════════════════════════════════════════════
  describe("2 · create_plan", () => {
    it("creates a plan PDA", async () => {
      section("2. create_plan");

      const tx = await program.methods
        .createPlan({
          planId,
          name: "Pro Monthly",
          description: "Full access to all features",
          amountUsdc: PLAN_AMOUNT,
          intervalSeconds: INTERVAL_S,
          trialSeconds: TRIAL_S,
          maxSubscribers: MAX_SUBS,
        })
        .accounts({ merchant: merchant.publicKey, usdcMint })
        .signers([merchant])
        .rpc();

      console.log("  TX:", tx);

      const plan = await program.account.plan.fetch(planPDA);
      console.log("  name               =", plan.name);
      console.log("  amount_usdc        =", formatUSDC(plan.amountUsdc));
      console.log(
        "  interval_seconds   =",
        plan.intervalSeconds.toString(),
        "sec",
      );
      console.log("  max_subscribers    =", plan.maxSubscribers.toString());
      console.log("  active_subscribers =", plan.activeSubscribers.toString());
      console.log("  successful_payments=", plan.successfulPayments.toString());
      console.log("  status             =", JSON.stringify(plan.status));

      assert.equal(plan.name, "Pro Monthly");
      assert.isTrue(plan.amountUsdc.eq(PLAN_AMOUNT));
      assert.isTrue(plan.activeSubscribers.eqn(0));
      assert.deepEqual(plan.status, { active: {} });
      console.log("  ✓ Plan created");
    });

    it("rejects name longer than 64 characters", async () => {
      const badId = new BN(planId.toNumber() + 1);
      try {
        await program.methods
          .createPlan({
            planId: badId,
            name: "A".repeat(65),
            description: "",
            amountUsdc: PLAN_AMOUNT,
            intervalSeconds: INTERVAL_S,
            trialSeconds: TRIAL_S,
            maxSubscribers: MAX_SUBS,
          })
          .accounts({ merchant: merchant.publicKey, usdcMint })
          .signers([merchant])
          .rpc();
        assert.fail("Should throw PlanNameTooLong");
      } catch (err: any) {
        assert.include(err.message, "PlanNameTooLong");
        console.log("  ✓ Rejected: PlanNameTooLong");
      }
    });

    it("rejects amount below minimum", async () => {
      const badId = new BN(planId.toNumber() + 2);
      try {
        await program.methods
          .createPlan({
            planId: badId,
            name: "Free",
            description: "",
            amountUsdc: new BN(1), // below MIN_AMOUNT_USDC (10_000)
            intervalSeconds: INTERVAL_S,
            trialSeconds: TRIAL_S,
            maxSubscribers: MAX_SUBS,
          })
          .accounts({ merchant: merchant.publicKey, usdcMint })
          .signers([merchant])
          .rpc();
        assert.fail("Should throw InvalidAmount");
      } catch (err: any) {
        assert.include(err.message, "InvalidAmount");
        console.log("  ✓ Rejected: InvalidAmount");
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. update_plan
  //    plan_id circular → pass plan explicitly
  // ═══════════════════════════════════════════════════════════════════════════
  describe("3 · update_plan", () => {
    it("merchant updates name and max_subscribers", async () => {
      section("3. update_plan");

      const before = await program.account.plan.fetch(planPDA);
      console.log(
        "  Before: name =",
        before.name,
        "| max_subs =",
        before.maxSubscribers.toString(),
      );

      const tx = await program.methods
        .updatePlan({
          name: "Pro Monthly - Updated",
          description: null,
          maxSubscribers: new BN(200),
        })
        .accountsPartial({ merchant: merchant.publicKey, plan: planPDA })
        .signers([merchant])
        .rpc();

      console.log("  TX:", tx);
      const after = await program.account.plan.fetch(planPDA);
      console.log(
        "  After:  name =",
        after.name,
        "| max_subs =",
        after.maxSubscribers.toString(),
      );

      assert.equal(after.name, "Pro Monthly - Updated");
      assert.isTrue(after.maxSubscribers.eqn(200));
      console.log("  ✓ Plan updated");
    });

    it("non-merchant cannot update", async () => {
      try {
        // Passes a plan that intruder doesn't own → constraint `address = plan.merchant` fails
        const fakePDA = derivePlanPDA(intruder.publicKey, planId, programId);
        await program.methods
          .updatePlan({
            name: "Hacked",
            description: null,
            maxSubscribers: null,
          })
          .accountsPartial({ merchant: intruder.publicKey, plan: fakePDA })
          .signers([intruder])
          .rpc();
        assert.fail("Should throw");
      } catch (err: any) {
        console.log(
          "  ✓ Rejected:",
          err.message.split("\n")[0].substring(0, 70),
        );
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. create_subscription
  //    Both plan + subscription circular → pass both explicitly
  // ═══════════════════════════════════════════════════════════════════════════
  describe("4 · create_subscription", () => {
    it("creates subscription PDA and sets SPL delegate", async () => {
      section("4. create_subscription");

      const beforeBal = (
        await getAccount(provider.connection, subscriberUsdcAta)
      ).amount;
      console.log("  Subscriber USDC before:", formatUSDC(beforeBal));

      const tx = await program.methods
        .createSubscription()
        .accountsPartial({
          subscriber: subscriber.publicKey,
          usdcMint,
          merchantTokenAccount: merchantUsdcAta,
          plan: planPDA,
          subscription: subscriptionPDA,
          guardAccount: guardPDA,
          guardProgram: guardProgramId,
        })
        .signers([subscriber])
        .rpc();

      console.log("  TX:", tx);

      const sub = await program.account.subscription.fetch(subscriptionPDA);
      const plan = await program.account.plan.fetch(planPDA);
      const tokenAcct = await getAccount(
        provider.connection,
        subscriberUsdcAta,
      );

      console.log("  status          =", JSON.stringify(sub.status));
      console.log("  payment_count   =", sub.paymentCount.toString());
      console.log(
        "  next_payment_at =",
        new Date(sub.nextPaymentAt.toNumber() * 1000).toISOString(),
      );
      console.log(
        "  started_at      =",
        new Date(sub.startedAt.toNumber() * 1000).toISOString(),
      );
      console.log(
        "  delegate        =",
        tokenAcct.delegate?.toBase58() ?? "none",
      );
      console.log(
        "  delegate=guardPDA?=",
        tokenAcct.delegate?.toBase58() === guardPDA.toBase58(),
      );
      console.log("  active_subs     =", plan.activeSubscribers.toString());
      console.log(
        "  Balance after:  ",
        formatUSDC(tokenAcct.amount),
        "(unchanged - funds stay in wallet)",
      );

      assert.deepEqual(sub.subscriber, subscriber.publicKey);
      assert.isTrue(sub.amountUsdc.eq(PLAN_AMOUNT));
      assert.deepEqual(sub.status, { active: {} });
      assert.isTrue(plan.activeSubscribers.eqn(1));
      assert.equal(
        beforeBal,
        tokenAcct.amount,
        "Balance unchanged on subscribe",
      );
      console.log("  ✓ Subscription created");
    });

    it("rejects subscribing to a plan at capacity", async () => {
      const capId = new BN(planId.toNumber() + 50);
      const capPDA = derivePlanPDA(merchant.publicKey, capId, programId);

      await program.methods
        .createPlan({
          planId: capId,
          name: "Cap Test",
          description: "",
          amountUsdc: PLAN_AMOUNT,
          intervalSeconds: INTERVAL_S,
          trialSeconds: TRIAL_S,
          maxSubscribers: new BN(1),
        })
        .accounts({ merchant: merchant.publicKey, usdcMint })
        .signers([merchant])
        .rpc();

      const sub1 = Keypair.generate();
      const sub1PDA = deriveSubscriptionPDA(capPDA, sub1.publicKey, programId);
      const sub1GuardPDA = deriveGuardPDA(sub1PDA, guardProgramId);
      await airdrop(provider, sub1.publicKey);
      const sub1Ata = await createAssociatedTokenAccount(
        provider.connection,
        sub1,
        usdcMint,
        sub1.publicKey,
      );
      await program.methods
        .createSubscription()
        .accountsPartial({
          subscriber: sub1.publicKey,
          usdcMint,
          merchantTokenAccount: merchantUsdcAta,
          plan: capPDA,
          subscription: sub1PDA,
          subscriberTokenAccount: sub1Ata,
          guardAccount: sub1GuardPDA,
          guardProgram: guardProgramId,
        })
        .signers([sub1])
        .rpc();

      const sub2 = Keypair.generate();
      const sub2PDA = deriveSubscriptionPDA(capPDA, sub2.publicKey, programId);
      const sub2GuardPDA = deriveGuardPDA(sub2PDA, guardProgramId);
      await airdrop(provider, sub2.publicKey);
      const sub2Ata = await createAssociatedTokenAccount(
        provider.connection,
        sub2,
        usdcMint,
        sub2.publicKey,
      );
      try {
        await program.methods
          .createSubscription()
          .accountsPartial({
            subscriber: sub2.publicKey,
            usdcMint,
            merchantTokenAccount: merchantUsdcAta,
            plan: capPDA,
            subscription: sub2PDA,
            subscriberTokenAccount: sub2Ata,
            guardAccount: sub2GuardPDA,
            guardProgram: guardProgramId,
          })
          .signers([sub2])
          .rpc();
        assert.fail("Should throw PlanAtCapacity");
      } catch (err: any) {
        assert.include(err.message, "PlanAtCapacity");
        console.log("  ✓ Rejected: PlanAtCapacity");
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. execute_payment
  //    address = account.field does NOT chain-resolve in Anchor 0.32.
  //    Pass every account explicitly.
  //
  //    Fee math ($10.00 @ 0.25%):
  //      fee          = 10_000_000 × 25 / 10_000 = 25_000   ($0.025000)
  //      total_charge = 10_000_000 + 25_000       = 10_025_000 ($10.025000)
  //      merchant receives plan_amount (10_000_000)
  //      subscriber pays total_charge  (10_025_000)
  // ═══════════════════════════════════════════════════════════════════════════
  describe("5 · execute_payment", () => {
    it("transfers USDC to merchant + treasury, updates counters", async () => {
      section("5. execute_payment");

      console.log(
        "\n  Waiting 2s for payment to become due (interval = 1s)...",
      );
      await sleep(2000);

      const b_sub = (await getAccount(provider.connection, subscriberUsdcAta))
        .amount;
      const b_mer = (await getAccount(provider.connection, merchantUsdcAta))
        .amount;
      const b_trea = (await getAccount(provider.connection, treasuryUsdcAta))
        .amount;

      console.log("  Balances BEFORE:");
      console.log("  subscriber =", formatUSDC(b_sub));
      console.log("  merchant   =", formatUSDC(b_mer));
      console.log("  treasury   =", formatUSDC(b_trea));

      const tx = await program.methods
        .executePayment()
        .accountsPartial({
          keeper: keeper.publicKey,
          subscription: subscriptionPDA,
          plan: planPDA,
          subscriber: subscriber.publicKey,
          subscriberTokenAccount: subscriberUsdcAta,
          merchantTokenAccount: merchantUsdcAta,
          treasuryTokenAccount: treasuryUsdcAta,
          usdcMint,
          guardAccount: guardPDA,
          guardProgram: guardProgramId,
        })
        .signers([keeper])
        .rpc();

      console.log("\n  TX:", tx);

      const a_sub = (await getAccount(provider.connection, subscriberUsdcAta))
        .amount;
      const a_mer = (await getAccount(provider.connection, merchantUsdcAta))
        .amount;
      const a_trea = (await getAccount(provider.connection, treasuryUsdcAta))
        .amount;
      const subA = await program.account.subscription.fetch(subscriptionPDA);
      const planA = await program.account.plan.fetch(planPDA);

      const planAmtBig = BigInt(PLAN_AMOUNT.toNumber());
      const expectedFee = BigInt(
        Math.round((Number(planAmtBig) * FEE_BPS) / 10_000),
      );
      const totalCharge = planAmtBig + expectedFee;

      console.log("  Balances AFTER:");
      console.log(
        "  subscriber =",
        formatUSDC(a_sub),
        " Δ -",
        formatUSDC(b_sub - a_sub),
      );
      console.log(
        "  merchant   =",
        formatUSDC(a_mer),
        " Δ +",
        formatUSDC(a_mer - b_mer),
      );
      console.log(
        "  treasury   =",
        formatUSDC(a_trea),
        " Δ +",
        formatUSDC(a_trea - b_trea),
      );
      console.log(
        "  Fee model: plan =",
        formatUSDC(planAmtBig),
        "| fee =",
        formatUSDC(expectedFee),
        "| total_charge =",
        formatUSDC(totalCharge),
      );
      console.log(
        "  payment_count =",
        subA.paymentCount.toString(),
        "| successful_payments =",
        planA.successfulPayments.toString(),
      );

      assert.equal(
        a_mer - b_mer,
        planAmtBig,
        "Merchant received full plan amount",
      );
      assert.equal(a_trea - b_trea, expectedFee, "Treasury received fee");
      assert.equal(b_sub - a_sub, totalCharge, "Subscriber paid plan + fee");
      assert.isTrue(subA.paymentCount.eqn(1));
      assert.deepEqual(subA.status, { active: {} });
      console.log("  ✓ Payment executed correctly");
    });

    it("auto-expires after 3 consecutive failed payments", async () => {
      section("5b. 3 failures → auto-expire");

      const brokeId = new BN(planId.toNumber() + 200);
      const brokePDA = derivePlanPDA(merchant.publicKey, brokeId, programId);
      const broke = Keypair.generate();

      await airdrop(provider, broke.publicKey);
      const brokeAta = await createAssociatedTokenAccount(
        provider.connection,
        broke,
        usdcMint,
        broke.publicKey,
      );
      await mintTo(
        provider.connection,
        admin.payer,
        usdcMint,
        brokeAta,
        admin.publicKey,
        5 * USDC_FACTOR,
      );
      const brokeSubPDA = deriveSubscriptionPDA(
        brokePDA,
        broke.publicKey,
        programId,
      );
      const brokeGuardPDA = deriveGuardPDA(brokeSubPDA, guardProgramId);

      console.log("  Broke subscriber: $5.00, plan costs $10.00 + fee");

      await program.methods
        .createPlan({
          planId: brokeId,
          name: "Failure Test",
          description: "",
          amountUsdc: PLAN_AMOUNT,
          intervalSeconds: INTERVAL_S,
          trialSeconds: TRIAL_S,
          maxSubscribers: MAX_SUBS,
        })
        .accounts({ merchant: merchant.publicKey, usdcMint })
        .signers([merchant])
        .rpc();

      await program.methods
        .createSubscription()
        .accountsPartial({
          subscriber: broke.publicKey,
          usdcMint,
          merchantTokenAccount: merchantUsdcAta,
          plan: brokePDA,
          subscription: brokeSubPDA,
          subscriberTokenAccount: brokeAta,
          guardAccount: brokeGuardPDA,
          guardProgram: guardProgramId,
        })
        .signers([broke])
        .rpc();

      for (let attempt = 1; attempt <= 3; attempt++) {
        await sleep(1500);
        console.log(
          `\n  Attempt ${attempt}/3 (insufficient balance - returns Ok, logs failure)...`,
        );

        // execute_payment returns Ok() on insufficient balance; records failure internally
        await program.methods
          .executePayment()
          .accountsPartial({
            keeper: keeper.publicKey,
            subscription: brokeSubPDA,
            plan: brokePDA,
            subscriber: broke.publicKey,
            subscriberTokenAccount: brokeAta,
            merchantTokenAccount: merchantUsdcAta,
            treasuryTokenAccount: treasuryUsdcAta,
            usdcMint,
            guardAccount: brokeGuardPDA,
            guardProgram: guardProgramId,
          })
          .signers([keeper])
          .rpc();

        const s = await program.account.subscription.fetch(brokeSubPDA);
        console.log(`  status = ${JSON.stringify(s.status)}`);

        if (attempt < 3) {
          assert.notDeepEqual(
            s.status,
            { expired: {} },
            `Should not be expired after only ${attempt} failure(s)`,
          );
        } else {
          assert.deepEqual(
            s.status,
            { expired: {} },
            "Should auto-expire after 3 consecutive failures",
          );
          console.log("  ✓ Auto-expired after 3 failures");
        }
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. pause_subscription / resume_subscription
  //    address = subscription.plan does NOT chain-resolve → pass plan explicitly
  // ═══════════════════════════════════════════════════════════════════════════
  describe("6 · pause_subscription / resume_subscription", () => {
    let pauseSub: Keypair;
    let pauseSubPDA: PublicKey;
    let pPlanPDA: PublicKey;

    before("create fresh plan+sub for pause tests", async () => {
      pauseSub = Keypair.generate();
      await airdrop(provider, pauseSub.publicKey);
      await createAssociatedTokenAccount(
        provider.connection,
        pauseSub,
        usdcMint,
        pauseSub.publicKey,
      );

      const pPlanId = new BN(planId.toNumber() + 300);
      pPlanPDA = derivePlanPDA(merchant.publicKey, pPlanId, programId);
      pauseSubPDA = deriveSubscriptionPDA(
        pPlanPDA,
        pauseSub.publicKey,
        programId,
      );
      const pauseGuardPDA = deriveGuardPDA(pauseSubPDA, guardProgramId);

      await program.methods
        .createPlan({
          planId: pPlanId,
          name: "Pause Test",
          description: "",
          amountUsdc: PLAN_AMOUNT,
          intervalSeconds: INTERVAL_S,
          trialSeconds: TRIAL_S,
          maxSubscribers: MAX_SUBS,
        })
        .accounts({ merchant: merchant.publicKey, usdcMint })
        .signers([merchant])
        .rpc();

      await program.methods
        .createSubscription()
        .accountsPartial({
          subscriber: pauseSub.publicKey,
          usdcMint,
          merchantTokenAccount: merchantUsdcAta,
          plan: pPlanPDA,
          subscription: pauseSubPDA,
          guardAccount: pauseGuardPDA,
          guardProgram: guardProgramId,
        })
        .signers([pauseSub])
        .rpc();
    });

    it("subscriber can pause their subscription", async () => {
      section("6a. pause_subscription");

      const tx = await program.methods
        .pauseSubscription()
        .accountsPartial({
          authority: pauseSub.publicKey,
          subscription: pauseSubPDA,
          plan: pPlanPDA,
        })
        .signers([pauseSub])
        .rpc();

      console.log("  TX:", tx);
      const sub = await program.account.subscription.fetch(pauseSubPDA);
      console.log("  status =", JSON.stringify(sub.status));
      assert.deepEqual(sub.status, { paused: {} });
      console.log("  ✓ Paused");
    });

    it("subscriber can resume their subscription", async () => {
      section("6b. resume_subscription");

      const tx = await program.methods
        .resumeSubscription()
        .accountsPartial({
          authority: pauseSub.publicKey,
          subscription: pauseSubPDA,
          plan: pPlanPDA,
        })
        .signers([pauseSub])
        .rpc();

      console.log("  TX:", tx);
      const sub = await program.account.subscription.fetch(pauseSubPDA);
      console.log("  status =", JSON.stringify(sub.status));
      assert.deepEqual(sub.status, { active: {} });
      console.log("  ✓ Resumed");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. cancel_subscription
  //    address = subscription.plan does NOT chain-resolve → pass plan explicitly
  // ═══════════════════════════════════════════════════════════════════════════
  describe("7 · cancel_subscription", () => {
    it("rejects cancel from intruder (UnauthorizedActor)", async () => {
      section("7. cancel_subscription");
      try {
        await program.methods
          .cancelSubscription()
          .accountsPartial({
            authority: intruder.publicKey,
            subscription: subscriptionPDA,
            plan: planPDA,
          })
          .signers([intruder])
          .rpc();
        assert.fail("Should throw");
      } catch (err: any) {
        console.log(
          "  ✓ Intruder rejected:",
          err.message.split("\n")[0].substring(0, 70),
        );
      }
    });

    it("subscriber can cancel their subscription", async () => {
      const before_plan = await program.account.plan.fetch(planPDA);
      const before_sub =
        await program.account.subscription.fetch(subscriptionPDA);
      console.log(
        "\n  Before: status =",
        JSON.stringify(before_sub.status),
        "| active_subs =",
        before_plan.activeSubscribers.toString(),
      );

      const tx = await program.methods
        .cancelSubscription()
        .accountsPartial({
          authority: subscriber.publicKey,
          subscription: subscriptionPDA,
          plan: planPDA,
        })
        .signers([subscriber])
        .rpc();

      console.log("  TX:", tx);

      const after_plan = await program.account.plan.fetch(planPDA);
      const after_sub =
        await program.account.subscription.fetch(subscriptionPDA);
      console.log(
        "  After:  status =",
        JSON.stringify(after_sub.status),
        "| active_subs =",
        after_plan.activeSubscribers.toString(),
      );

      assert.deepEqual(after_sub.status, { cancelled: {} });
      assert.isTrue(
        after_plan.activeSubscribers.lt(before_plan.activeSubscribers),
      );
      console.log("  ✓ Subscription cancelled");
    });

    it("cannot cancel an already-cancelled subscription (AlreadyCancelled)", async () => {
      try {
        await program.methods
          .cancelSubscription()
          .accountsPartial({
            authority: subscriber.publicKey,
            subscription: subscriptionPDA,
            plan: planPDA,
          })
          .signers([subscriber])
          .rpc();
        assert.fail("Should throw AlreadyCancelled");
      } catch (err: any) {
        assert.include(err.message, "AlreadyCancelled");
        console.log("  ✓ Rejected: AlreadyCancelled");
      }
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 8. pause_plan / archive_plan
  //    plan_id circular → pass plan explicitly
  // ═══════════════════════════════════════════════════════════════════════════
  describe("8 · pause_plan / archive_plan", () => {
    it("merchant can pause a plan", async () => {
      section("8a. pause_plan");

      const tx = await program.methods
        .pausePlan()
        .accountsPartial({ merchant: merchant.publicKey, plan: planPDA })
        .signers([merchant])
        .rpc();

      console.log("  TX:", tx);
      const plan = await program.account.plan.fetch(planPDA);
      console.log("  status =", JSON.stringify(plan.status));
      assert.deepEqual(plan.status, { paused: {} });
      console.log("  ✓ Plan paused");
    });

    it("cannot subscribe to a paused plan (PlanNotActive)", async () => {
      const s = Keypair.generate();
      const sPDA = deriveSubscriptionPDA(planPDA, s.publicKey, programId);
      const sGuardPDA = deriveGuardPDA(sPDA, guardProgramId);
      await airdrop(provider, s.publicKey);
      const sAta = await createAssociatedTokenAccount(
        provider.connection,
        s,
        usdcMint,
        s.publicKey,
      );
      try {
        await program.methods
          .createSubscription()
          .accountsPartial({
            subscriber: s.publicKey,
            usdcMint,
            merchantTokenAccount: merchantUsdcAta,
            plan: planPDA,
            subscription: sPDA,
            subscriberTokenAccount: sAta,
            guardAccount: sGuardPDA,
            guardProgram: guardProgramId,
          })
          .signers([s])
          .rpc();
        assert.fail("Should throw PlanNotActive");
      } catch (err: any) {
        assert.include(err.message, "PlanNotActive");
        console.log("  ✓ Rejected: PlanNotActive");
      }
    });

    it("merchant can archive a plan", async () => {
      section("8b. archive_plan");

      const tx = await program.methods
        .archivePlan()
        .accountsPartial({ merchant: merchant.publicKey, plan: planPDA })
        .signers([merchant])
        .rpc();

      console.log("  TX:", tx);
      const plan = await program.account.plan.fetch(planPDA);
      console.log("  status =", JSON.stringify(plan.status));
      assert.deepEqual(plan.status, { archived: {} });
      console.log("  ✓ Plan archived");
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 9. PDA derivation consistency
  // ═══════════════════════════════════════════════════════════════════════════
  describe("9 · PDA derivation", () => {
    it('config PDA: seeds ["config"]', () => {
      section("9. PDA verification");
      const [d] = PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        programId,
      );
      assert.equal(d.toBase58(), configPDA.toBase58());
      console.log("  ✓ configPDA =", configPDA.toBase58());
    });

    it('plan PDA: seeds ["plan", merchant, planId_le8]', () => {
      const [d] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("plan"),
          merchant.publicKey.toBuffer(),
          planId.toArrayLike(Buffer, "le", 8),
        ],
        programId,
      );
      assert.equal(d.toBase58(), planPDA.toBase58());
      console.log("  ✓ planPDA =", planPDA.toBase58());
    });

    it('subscription PDA: seeds ["subscription", plan, subscriber]', () => {
      const [d] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("subscription"),
          planPDA.toBuffer(),
          subscriber.publicKey.toBuffer(),
        ],
        programId,
      );
      assert.equal(d.toBase58(), subscriptionPDA.toBase58());
      console.log("  ✓ subscriptionPDA =", subscriptionPDA.toBase58());
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 10. Final state dump
  // ═══════════════════════════════════════════════════════════════════════════
  after("print final on-chain state", async () => {
    section("FINAL STATE SUMMARY");

    try {
      const cfg = await program.account.protocolConfig.fetch(configPDA);
      console.log(
        "  fee_bps =",
        cfg.feeBps,
        "| treasury =",
        cfg.treasury.toBase58(),
      );
    } catch {
      console.log("  (config fetch failed)");
    }

    try {
      const plan = await program.account.plan.fetch(planPDA);
      console.log(
        "  plan status =",
        JSON.stringify(plan.status),
        "| active_subs =",
        plan.activeSubscribers.toString(),
        "| successful_payments =",
        plan.successfulPayments.toString(),
      );
    } catch {
      console.log("  (plan fetch failed)");
    }

    try {
      const sub = await program.account.subscription.fetch(subscriptionPDA);
      console.log(
        "  sub status =",
        JSON.stringify(sub.status),
        "| payment_count =",
        sub.paymentCount.toString(),
      );
    } catch {
      console.log("  (subscription fetch failed)");
    }

    try {
      const s = await getAccount(provider.connection, subscriberUsdcAta);
      const m = await getAccount(provider.connection, merchantUsdcAta);
      const t = await getAccount(provider.connection, treasuryUsdcAta);
      console.log("\n  Final USDC balances:");
      console.log("  subscriber =", formatUSDC(s.amount));
      console.log("  merchant   =", formatUSDC(m.amount));
      console.log("  treasury   =", formatUSDC(t.amount));
      console.log(
        "  total      =",
        formatUSDC(s.amount + m.amount + t.amount),
        "(started $500)",
      );
    } catch {
      console.log("  (balance fetch failed)");
    }
    console.log("\n" + "═".repeat(65));
  });
});
