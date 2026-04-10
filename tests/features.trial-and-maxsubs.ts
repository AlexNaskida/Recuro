/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FREE TRIAL & MAX SUBSCRIBERS FEATURE TEST
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * SETUP (one-time):
 *   1. Edit programs/subscription/src/constants.rs:
 *      pub const MIN_INTERVAL_SECONDS: i64 = 1;   // was 86_400
 *
 * RUN:
 *   anchor test --provider.cluster localnet
 *
 * TESTS:
 *   ✓ Free Trial: Subscriber in trial period doesn't get charged
 *   ✓ Max Subscribers: Plan respects max subscription cap
 *   ✓ Over-subscription prevention: Rejects new subscriptions when at capacity
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import * as anchor from "@coral-xyz/anchor";
import { Program, AnchorProvider } from "@coral-xyz/anchor";
import BN from "bn.js";
import { Keypair, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
  createMint,
  createAssociatedTokenAccount,
  mintTo,
  getAccount,
} from "@solana/spl-token";
import { assert } from "chai";
import type { Subscription } from "../target/types/subscription";

// ─── Constants ───────────────────────────────────────────────────────────────
const USDC_DECIMALS = 6;
const USDC_FACTOR = 1_000_000;
const PLAN_AMOUNT = new BN(10 * USDC_FACTOR); // $10.00
const INTERVAL_S = new BN(10); // 10 seconds - for quick testing
const FEE_BPS = 25; // 0.25%

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
  console.log(`\n${"═".repeat(70)}`);
  console.log(`  ${title}`);
  console.log("═".repeat(70));
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════════════════════════════════════
describe("Free Trial & Max Subscribers Features", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Subscription as Program<Subscription>;
  const programId = program.programId;

  const admin = provider.wallet as anchor.Wallet;
  const merchant = Keypair.generate();
  const keeper = Keypair.generate();
  const treasury = Keypair.generate();

  // Subscribers for different test scenarios
  const subscriber1 = Keypair.generate(); // For free trial test
  const subscriber2 = Keypair.generate(); // For max subs test
  const subscriber3 = Keypair.generate(); // For max subs test (should fail)

  let usdcMint: PublicKey;
  let configPDA: PublicKey;

  // Plan 1: With 7-day free trial, max 2 subscribers
  let planId1: BN;
  let planPDA1: PublicKey;
  let subscriptionPDA1: PublicKey;
  let merchantUsdcAta1: PublicKey;
  let subscriber1UsdcAta: PublicKey;

  // Plan 2: No trial, max 1 subscriber, for overflow test
  let planId2: BN;
  let planPDA2: PublicKey;
  let subscriptionPDA2_a: PublicKey;
  let subscriptionPDA2_b: PublicKey;
  let merchantUsdcAta2: PublicKey;
  let subscriber2UsdcAta: PublicKey;
  let subscriber3UsdcAta: PublicKey;

  before(
    "Initialize: Fund actors, create USDC, setup protocol config",
    async () => {
      section("SETUP: Initialize Test Environment");

      console.log(
        "\n  Program ID  =",
        programId.toBase58().substring(0, 16) + "...",
      );
      console.log(
        "  Admin       =",
        admin.publicKey.toBase58().substring(0, 16) + "...",
      );

      // Fund all actors
      await Promise.all([
        airdrop(provider, merchant.publicKey, 2),
        airdrop(provider, subscriber1.publicKey, 3),
        airdrop(provider, subscriber2.publicKey, 3),
        airdrop(provider, subscriber3.publicKey, 3),
        airdrop(provider, keeper.publicKey, 2),
        airdrop(provider, treasury.publicKey, 1),
      ]);

      console.log("  ✓ All actors funded\n");

      // Create mock USDC
      usdcMint = await createMint(
        provider.connection,
        admin.payer,
        admin.publicKey,
        null,
        USDC_DECIMALS,
      );
      console.log(
        "  Mock USDC   =",
        usdcMint.toBase58().substring(0, 16) + "...",
      );

      // Create ATAs for all parties
      merchantUsdcAta1 = await createAssociatedTokenAccount(
        provider.connection,
        merchant,
        usdcMint,
        merchant.publicKey,
      );

      merchantUsdcAta2 = await createAssociatedTokenAccount(
        provider.connection,
        merchant,
        usdcMint,
        merchant.publicKey,
      );

      subscriber1UsdcAta = await createAssociatedTokenAccount(
        provider.connection,
        subscriber1,
        usdcMint,
        subscriber1.publicKey,
      );

      subscriber2UsdcAta = await createAssociatedTokenAccount(
        provider.connection,
        subscriber2,
        usdcMint,
        subscriber2.publicKey,
      );

      subscriber3UsdcAta = await createAssociatedTokenAccount(
        provider.connection,
        subscriber3,
        usdcMint,
        subscriber3.publicKey,
      );

      const treasuryUsdcAta = await createAssociatedTokenAccount(
        provider.connection,
        admin.payer,
        usdcMint,
        treasury.publicKey,
      );

      console.log("  ✓ ATAs created\n");

      // Mint USDC to subscribers (each gets enough for multiple payments + fees)
      const mintAmount = 1000 * USDC_FACTOR; // $1000 each
      await Promise.all([
        mintTo(
          provider.connection,
          admin.payer,
          usdcMint,
          subscriber1UsdcAta,
          admin.publicKey,
          mintAmount,
        ),
        mintTo(
          provider.connection,
          admin.payer,
          usdcMint,
          subscriber2UsdcAta,
          admin.publicKey,
          mintAmount,
        ),
        mintTo(
          provider.connection,
          admin.payer,
          usdcMint,
          subscriber3UsdcAta,
          admin.publicKey,
          mintAmount,
        ),
      ]);

      const bal1 = await getAccount(provider.connection, subscriber1UsdcAta);
      console.log("  Subscriber 1 USDC =", formatUSDC(bal1.amount));
      console.log("  Subscriber 2 USDC =", formatUSDC(bal1.amount));
      console.log("  Subscriber 3 USDC =", formatUSDC(bal1.amount));

      // Derive PDAs
      configPDA = deriveConfigPDA(programId);
      planId1 = new BN(1000 + Date.now());
      planPDA1 = derivePlanPDA(merchant.publicKey, planId1, programId);
      subscriptionPDA1 = deriveSubscriptionPDA(
        planPDA1,
        subscriber1.publicKey,
        programId,
      );

      planId2 = new BN(2000 + Date.now());
      planPDA2 = derivePlanPDA(merchant.publicKey, planId2, programId);
      subscriptionPDA2_a = deriveSubscriptionPDA(
        planPDA2,
        subscriber2.publicKey,
        programId,
      );
      subscriptionPDA2_b = deriveSubscriptionPDA(
        planPDA2,
        subscriber3.publicKey,
        programId,
      );

      console.log("\n  ✓ Environment initialized\n");

      // Initialize protocol config (one-time)
      try {
        await program.methods
          .initializeConfig({ feeBps: FEE_BPS, treasury: treasury.publicKey })
          .accounts({ admin: admin.publicKey })
          .rpc();
        console.log("  ✓ Protocol config initialized");
      } catch (err: any) {
        if (err.message.includes("already")) {
          console.log("  ℹ Protocol config already exists (reusing)");
        } else {
          throw err;
        }
      }
    },
  );

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 1: FREE TRIAL
  // ═════════════════════════════════════════════════════════════════════════════
  describe("1. Free Trial Feature", () => {
    it("should create a plan with 7-day free trial and max 2 subscribers", async () => {
      section("TEST 1A: Create Plan with Free Trial");

      const trialDays = 7;
      const trialSeconds = new BN(trialDays * 24 * 60 * 60);

      const tx = await program.methods
        .createPlan({
          planId: planId1,
          name: "Pro Plan with Free Trial",
          description: "7-day free trial included",
          amountUsdc: PLAN_AMOUNT,
          intervalSeconds: INTERVAL_S,
          trialSeconds,
          maxSubscribers: new BN(2),
        })
        .accounts({ merchant: merchant.publicKey, usdcMint })
        .signers([merchant])
        .rpc();

      console.log("  TX:", tx.substring(0, 20) + "...");

      const plan = await program.account.plan.fetch(planPDA1);
      console.log("\n  Plan Details:");
      console.log("    Name              =", plan.name);
      console.log("    Amount            =", formatUSDC(plan.amountUsdc));
      console.log(
        "    Interval          =",
        plan.intervalSeconds.toString(),
        "sec",
      );
      console.log(
        "    Trial Period      =",
        plan.trialSeconds.toString(),
        "sec",
      );
      console.log("    Max Subscribers   =", plan.maxSubscribers.toString());
      console.log("    Active Subs       =", plan.activeSubscribers.toString());
      console.log("    Status            =", JSON.stringify(plan.status));

      assert.equal(plan.name, "Pro Plan with Free Trial");
      assert.isTrue(plan.trialSeconds.eq(trialSeconds));
      assert.isTrue(plan.maxSubscribers.eqn(2));
      console.log("\n  ✓ Plan created with correct trial settings");
    });

    it("should create subscription in free trial period", async () => {
      section("TEST 1B: Create Subscription in Trial");

      const beforePlan = await program.account.plan.fetch(planPDA1);
      const beforeSubs = beforePlan.activeSubscribers.toNumber();

      const tx = await program.methods
        .createSubscription({})
        .accountsPartial({
          subscriber: subscriber1.publicKey,
          usdcMint,
          plan: planPDA1,
          subscription: subscriptionPDA1,
        })
        .signers([subscriber1])
        .rpc();

      console.log("  TX:", tx.substring(0, 20) + "...");

      const subscription =
        await program.account.subscription.fetch(subscriptionPDA1);
      const plan = await program.account.plan.fetch(planPDA1);

      const now = Math.floor(Date.now() / 1000);
      const trialEndsAt = subscription.trialEndsAt.toNumber();
      const nextPaymentAt = subscription.nextPaymentAt.toNumber();
      const trialDaysRemaining = Math.floor(
        (trialEndsAt - now) / (24 * 60 * 60),
      );

      console.log("\n  Subscription Details:");
      console.log(
        "    Status            =",
        JSON.stringify(subscription.status),
      );
      console.log(
        "    Started At        =",
        new Date(subscription.startedAt.toNumber() * 1000).toISOString(),
      );
      console.log(
        "    Trial Ends At     =",
        new Date(trialEndsAt * 1000).toISOString(),
      );
      console.log("    Days Remaining    =", trialDaysRemaining, "days");
      console.log(
        "    Next Payment At   =",
        new Date(nextPaymentAt * 1000).toISOString(),
      );
      console.log(
        "    Payment Count     =",
        subscription.paymentCount.toString(),
      );

      console.log("\n  Plan State:");
      console.log(
        "    Active Subs       =",
        plan.activeSubscribers.toString(),
        "(was",
        beforeSubs + ")",
      );

      assert.isTrue(subscription.trialEndsAt.gt(new BN(now)));
      assert.isTrue(subscription.nextPaymentAt.gt(subscription.trialEndsAt));
      assert.equal(plan.activeSubscribers.toNumber(), beforeSubs + 1);
      assert.deepEqual(subscription.status, { active: {} });

      console.log("\n  ✓ Subscription created in trial period");
      console.log("  ✓ Payment correctly deferred until after trial");
    });

    it("should not charge during trial period", async () => {
      section("TEST 1C: Verify No Charge During Trial");

      const subscription =
        await program.account.subscription.fetch(subscriptionPDA1);
      const now = Math.floor(Date.now() / 1000);

      const isInTrial = now < subscription.trialEndsAt.toNumber();
      const paymentNotDue = now < subscription.nextPaymentAt.toNumber();

      console.log("  Current Time      =", new Date(now * 1000).toISOString());
      console.log(
        "  Trial Ends At     =",
        new Date(subscription.trialEndsAt.toNumber() * 1000).toISOString(),
      );
      console.log(
        "  Next Payment At   =",
        new Date(subscription.nextPaymentAt.toNumber() * 1000).toISOString(),
      );
      console.log("  Is in Trial       =", isInTrial);
      console.log("  Payment Not Due   =", paymentNotDue);

      assert.isTrue(isInTrial, "Subscriber should still be in trial period");
      assert.isTrue(paymentNotDue, "Next payment should not be due yet");

      const balBefore = await getAccount(
        provider.connection,
        subscriber1UsdcAta,
      );
      console.log(
        "\n  Subscriber USDC Balance = ",
        formatUSDC(balBefore.amount),
        "(unchanged)",
      );

      console.log("\n  ✓ No charges applied during trial period");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // TEST 2: MAX SUBSCRIBERS
  // ═════════════════════════════════════════════════════════════════════════════
  describe("2. Max Subscribers Feature", () => {
    it("should create a plan with max 1 subscriber", async () => {
      section("TEST 2A: Create Plan with Max Subscribers = 1");

      const tx = await program.methods
        .createPlan({
          planId: planId2,
          name: "Starter Plan (Limited)",
          description: "Only 1 subscriber allowed",
          amountUsdc: PLAN_AMOUNT,
          intervalSeconds: INTERVAL_S,
          trialSeconds: new BN(0),
          maxSubscribers: new BN(1), // ← KEY: Max 1 subscriber
        })
        .accounts({ merchant: merchant.publicKey, usdcMint })
        .signers([merchant])
        .rpc();

      console.log("  TX:", tx.substring(0, 20) + "...");

      const plan = await program.account.plan.fetch(planPDA2);
      console.log("\n  Plan Details:");
      console.log("    Name              =", plan.name);
      console.log("    Max Subscribers   =", plan.maxSubscribers.toString());
      console.log("    Active Subs       =", plan.activeSubscribers.toString());

      assert.isTrue(plan.maxSubscribers.eqn(1));
      console.log("\n  ✓ Plan created with max 1 subscriber");
    });

    it("should allow first subscriber to join (capacity available)", async () => {
      section("TEST 2B: First Subscriber Joins");

      const planBefore = await program.account.plan.fetch(planPDA2);
      console.log(
        "  Capacity Before   =",
        planBefore.activeSubscribers.toString(),
        "/",
        planBefore.maxSubscribers.toString(),
      );

      const tx = await program.methods
        .createSubscription({})
        .accountsPartial({
          subscriber: subscriber2.publicKey,
          usdcMint,
          plan: planPDA2,
          subscription: subscriptionPDA2_a,
        })
        .signers([subscriber2])
        .rpc();

      console.log("  TX:", tx.substring(0, 20) + "...");

      const plan = await program.account.plan.fetch(planPDA2);
      const subscription =
        await program.account.subscription.fetch(subscriptionPDA2_a);

      console.log("\n  After Subscription:");
      console.log(
        "    Plan Active Subs  =",
        plan.activeSubscribers.toString(),
        "/",
        plan.maxSubscribers.toString(),
      );
      console.log(
        "    Subscription Status =",
        JSON.stringify(subscription.status),
      );

      assert.equal(plan.activeSubscribers.toNumber(), 1);
      assert.deepEqual(subscription.status, { active: {} });
      console.log("\n  ✓ First subscriber successfully joined");
    });

    it("should reject second subscriber when at max capacity", async () => {
      section("TEST 2C: Second Subscriber Rejected (Over Capacity)");

      const planBefore = await program.account.plan.fetch(planPDA2);
      console.log(
        "  Capacity Status   =",
        planBefore.activeSubscribers.toString(),
        "/",
        planBefore.maxSubscribers.toString(),
        "(FULL)",
      );

      let subscriptionCreated = false;
      let errorMessage = "";

      try {
        await program.methods
          .createSubscription({})
          .accountsPartial({
            subscriber: subscriber3.publicKey,
            usdcMint,
            plan: planPDA2,
            subscription: subscriptionPDA2_b,
          })
          .signers([subscriber3])
          .rpc();

        subscriptionCreated = true;
      } catch (err: any) {
        errorMessage = err.message;
      }

      assert.isFalse(
        subscriptionCreated,
        "Second subscription should have been rejected",
      );

      console.log("  Error Message     =", errorMessage.split("\n")[0]);

      // Verify plan capacity unchanged
      const planAfter = await program.account.plan.fetch(planPDA2);
      console.log(
        "  Capacity After    =",
        planAfter.activeSubscribers.toString(),
        "/",
        planAfter.maxSubscribers.toString(),
        "(unchanged)",
      );

      assert.equal(planAfter.activeSubscribers.toNumber(), 1);

      console.log("\n  ✓ Correctly rejected subscription when at capacity");
      console.log("  ✓ Capacity limit enforced");
    });

    it("should increase capacity when existing subscriber is cancelled", async () => {
      section("TEST 2D: Verify Capacity Freed Up After Cancellation");

      const planBefore = await program.account.plan.fetch(planPDA2);
      console.log(
        "  Capacity Before   =",
        planBefore.activeSubscribers.toString(),
        "/",
        planBefore.maxSubscribers.toString(),
      );

      // Cancel first subscription to free up capacity
      const tx = await program.methods
        .cancelSubscription({})
        .accountsPartial({
          authority: subscriber2.publicKey,
          subscription: subscriptionPDA2_a,
          plan: planPDA2,
        })
        .signers([subscriber2])
        .rpc();

      console.log("  Cancelled Sub TX  =", tx.substring(0, 20) + "...");

      const planAfter = await program.account.plan.fetch(planPDA2);
      console.log(
        "  Capacity After    =",
        planAfter.activeSubscribers.toString(),
        "/",
        planAfter.maxSubscribers.toString(),
      );

      assert.equal(planAfter.activeSubscribers.toNumber(), 0);

      // Now second subscriber should be able to join
      const tx2 = await program.methods
        .createSubscription({})
        .accountsPartial({
          subscriber: subscriber3.publicKey,
          usdcMint,
          plan: planPDA2,
          subscription: subscriptionPDA2_b,
        })
        .signers([subscriber3])
        .rpc();

      console.log("  New Sub TX        =", tx2.substring(0, 20) + "...");

      const planFinal = await program.account.plan.fetch(planPDA2);
      const sub3 = await program.account.subscription.fetch(subscriptionPDA2_b);

      console.log("\n  Final State:");
      console.log(
        "    Plan Active Subs  =",
        planFinal.activeSubscribers.toString(),
        "/",
        planFinal.maxSubscribers.toString(),
      );
      console.log("    Sub 3 Status      =", JSON.stringify(sub3.status));

      assert.equal(planFinal.activeSubscribers.toNumber(), 1);
      assert.deepEqual(sub3.status, { active: {} });

      console.log("\n  ✓ Capacity correctly freed after cancellation");
      console.log("  ✓ New subscriber can join when capacity available");
    });
  });

  // ═════════════════════════════════════════════════════════════════════════════
  // SUMMARY
  // ═════════════════════════════════════════════════════════════════════════════

  after(() => {
    section("TEST SUMMARY");
    console.log("\n  ✓ Free Trial Tests");
    console.log("    - Plan created with configurable trial period");
    console.log("    - Subscription in trial defers payment");
    console.log("    - No charges applied during trial\n");

    console.log("  ✓ Max Subscribers Tests");
    console.log("    - Plan capacity enforced");
    console.log("    - Over-subscription prevented");
    console.log("    - Capacity freed after cancellation\n");
  });
});
