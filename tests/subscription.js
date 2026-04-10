"use strict";
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
 *                       subscriber, subscriberTokenAccount,
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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const anchor = __importStar(require("@coral-xyz/anchor"));
const bn_js_1 = __importDefault(require("bn.js"));
const web3_js_1 = require("@solana/web3.js");
const spl_token_1 = require("@solana/spl-token");
const chai_1 = require("chai");
// ─── Constants ───────────────────────────────────────────────────────────────
const USDC_DECIMALS = 6;
const USDC_FACTOR = 1000000;
const PLAN_AMOUNT = new bn_js_1.default(10 * USDC_FACTOR); // $10.00
const INTERVAL_S = new bn_js_1.default(1); // 1 sec - requires MIN_INTERVAL_SECONDS=1
const TRIAL_S = new bn_js_1.default(0);
const MAX_SUBS = new bn_js_1.default(100);
const FEE_BPS = 25; // 0.25%
// ─── PDA Helpers ─────────────────────────────────────────────────────────────
function airdrop(provider_1, to_1) {
    return __awaiter(this, arguments, void 0, function* (provider, to, sol = 2) {
        const sig = yield provider.connection.requestAirdrop(to, sol * web3_js_1.LAMPORTS_PER_SOL);
        yield provider.connection.confirmTransaction(sig, "confirmed");
    });
}
function derivePlanPDA(merchant, planId, programId) {
    const [pda] = web3_js_1.PublicKey.findProgramAddressSync([
        Buffer.from("plan"),
        merchant.toBuffer(),
        planId.toArrayLike(Buffer, "le", 8),
    ], programId);
    return pda;
}
function deriveSubscriptionPDA(plan, subscriber, programId) {
    const [pda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("subscription"), plan.toBuffer(), subscriber.toBuffer()], programId);
    return pda;
}
function deriveConfigPDA(programId) {
    const [pda] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
    return pda;
}
function formatUSDC(val) {
    const n = typeof val === "bigint"
        ? Number(val)
        : val instanceof bn_js_1.default
            ? val.toNumber()
            : val;
    return `$${(n / USDC_FACTOR).toFixed(6)}`;
}
function section(title) {
    console.log(`\n${"═".repeat(65)}`);
    console.log(`  ${title}`);
    console.log("═".repeat(65));
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// ═══════════════════════════════════════════════════════════════════════════════
describe("Solana Subscription Protocol - Full Suite", () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);
    const program = anchor.workspace.Subscription;
    const programId = program.programId;
    console.log("\n  Program ID:", programId.toBase58());
    const admin = provider.wallet;
    const merchant = web3_js_1.Keypair.generate();
    const subscriber = web3_js_1.Keypair.generate();
    const keeper = web3_js_1.Keypair.generate();
    const treasury = web3_js_1.Keypair.generate();
    const intruder = web3_js_1.Keypair.generate();
    let usdcMint;
    let merchantUsdcAta;
    let subscriberUsdcAta;
    let treasuryUsdcAta;
    let configPDA;
    let planId;
    let planPDA;
    let subscriptionPDA;
    before("Fund actors & create mock USDC", () => __awaiter(void 0, void 0, void 0, function* () {
        section("SETUP");
        console.log("\n  admin      =", admin.publicKey.toBase58());
        console.log("  merchant   =", merchant.publicKey.toBase58());
        console.log("  subscriber =", subscriber.publicKey.toBase58());
        console.log("  keeper     =", keeper.publicKey.toBase58());
        console.log("  treasury   =", treasury.publicKey.toBase58());
        yield Promise.all([
            airdrop(provider, merchant.publicKey, 2),
            airdrop(provider, subscriber.publicKey, 2),
            airdrop(provider, keeper.publicKey, 2),
            airdrop(provider, treasury.publicKey, 1),
            airdrop(provider, intruder.publicKey, 1),
        ]);
        // Mock USDC (devnet: 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU)
        usdcMint = yield (0, spl_token_1.createMint)(provider.connection, admin.payer, admin.publicKey, null, USDC_DECIMALS);
        console.log("\n  Mock USDC:", usdcMint.toBase58());
        [merchantUsdcAta, subscriberUsdcAta, treasuryUsdcAta] = yield Promise.all([
            (0, spl_token_1.createAssociatedTokenAccount)(provider.connection, merchant, usdcMint, merchant.publicKey),
            (0, spl_token_1.createAssociatedTokenAccount)(provider.connection, subscriber, usdcMint, subscriber.publicKey),
            (0, spl_token_1.createAssociatedTokenAccount)(provider.connection, admin.payer, usdcMint, treasury.publicKey),
        ]);
        yield (0, spl_token_1.mintTo)(provider.connection, admin.payer, usdcMint, subscriberUsdcAta, admin.publicKey, 500 * USDC_FACTOR);
        const bal = yield (0, spl_token_1.getAccount)(provider.connection, subscriberUsdcAta);
        console.log("  Subscriber balance:", formatUSDC(bal.amount));
        configPDA = deriveConfigPDA(programId);
        planId = new bn_js_1.default(Date.now());
        planPDA = derivePlanPDA(merchant.publicKey, planId, programId);
        subscriptionPDA = deriveSubscriptionPDA(planPDA, subscriber.publicKey, programId);
        console.log("\n  configPDA       =", configPDA.toBase58());
        console.log("  planPDA         =", planPDA.toBase58());
        console.log("  subscriptionPDA =", subscriptionPDA.toBase58());
    }));
    // ═══════════════════════════════════════════════════════════════════════════
    // 1. initialize_config
    // ═══════════════════════════════════════════════════════════════════════════
    describe("1 · initialize_config", () => {
        it("creates the ProtocolConfig PDA", () => __awaiter(void 0, void 0, void 0, function* () {
            section("1. initialize_config");
            const tx = yield program.methods
                .initializeConfig({ feeBps: FEE_BPS, treasury: treasury.publicKey })
                .accounts({ admin: admin.publicKey })
                .rpc();
            console.log("  TX:", tx);
            const cfg = yield program.account.protocolConfig.fetch(configPDA);
            console.log("  admin    =", cfg.admin.toBase58());
            console.log("  treasury =", cfg.treasury.toBase58());
            console.log("  fee_bps  =", cfg.feeBps, `(${cfg.feeBps / 100}%)`);
            chai_1.assert.equal(cfg.feeBps, FEE_BPS);
            chai_1.assert.equal(cfg.treasury.toBase58(), treasury.publicKey.toBase58());
            chai_1.assert.isFalse(cfg.creationPaused);
            console.log("  ✓ ProtocolConfig initialised");
        }));
        it("rejects re-initialisation", () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                yield program.methods
                    .initializeConfig({ feeBps: 600, treasury: treasury.publicKey })
                    .accounts({ admin: admin.publicKey })
                    .rpc();
                chai_1.assert.fail("Should have thrown");
            }
            catch (err) {
                console.log("  ✓ Rejected:", err.message.split("\n")[0].substring(0, 70));
            }
        }));
    });
    // ═══════════════════════════════════════════════════════════════════════════
    // 2. create_plan
    //    plan_id IS in params → Anchor can derive plan PDA → only merchant + mint needed
    // ═══════════════════════════════════════════════════════════════════════════
    describe("2 · create_plan", () => {
        it("creates a plan PDA", () => __awaiter(void 0, void 0, void 0, function* () {
            section("2. create_plan");
            const tx = yield program.methods
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
            const plan = yield program.account.plan.fetch(planPDA);
            console.log("  name               =", plan.name);
            console.log("  amount_usdc        =", formatUSDC(plan.amountUsdc));
            console.log("  interval_seconds   =", plan.intervalSeconds.toString(), "sec");
            console.log("  max_subscribers    =", plan.maxSubscribers.toString());
            console.log("  active_subscribers =", plan.activeSubscribers.toString());
            console.log("  successful_payments=", plan.successfulPayments.toString());
            console.log("  status             =", JSON.stringify(plan.status));
            chai_1.assert.equal(plan.name, "Pro Monthly");
            chai_1.assert.isTrue(plan.amountUsdc.eq(PLAN_AMOUNT));
            chai_1.assert.isTrue(plan.activeSubscribers.eqn(0));
            chai_1.assert.deepEqual(plan.status, { active: {} });
            console.log("  ✓ Plan created");
        }));
        it("rejects name longer than 64 characters", () => __awaiter(void 0, void 0, void 0, function* () {
            const badId = new bn_js_1.default(planId.toNumber() + 1);
            try {
                yield program.methods
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
                chai_1.assert.fail("Should throw PlanNameTooLong");
            }
            catch (err) {
                chai_1.assert.include(err.message, "PlanNameTooLong");
                console.log("  ✓ Rejected: PlanNameTooLong");
            }
        }));
        it("rejects amount below minimum", () => __awaiter(void 0, void 0, void 0, function* () {
            const badId = new bn_js_1.default(planId.toNumber() + 2);
            try {
                yield program.methods
                    .createPlan({
                    planId: badId,
                    name: "Free",
                    description: "",
                    amountUsdc: new bn_js_1.default(1), // below MIN_AMOUNT_USDC (10_000)
                    intervalSeconds: INTERVAL_S,
                    trialSeconds: TRIAL_S,
                    maxSubscribers: MAX_SUBS,
                })
                    .accounts({ merchant: merchant.publicKey, usdcMint })
                    .signers([merchant])
                    .rpc();
                chai_1.assert.fail("Should throw InvalidAmount");
            }
            catch (err) {
                chai_1.assert.include(err.message, "InvalidAmount");
                console.log("  ✓ Rejected: InvalidAmount");
            }
        }));
    });
    // ═══════════════════════════════════════════════════════════════════════════
    // 3. update_plan
    //    plan_id circular → pass plan explicitly
    // ═══════════════════════════════════════════════════════════════════════════
    describe("3 · update_plan", () => {
        it("merchant updates name and max_subscribers", () => __awaiter(void 0, void 0, void 0, function* () {
            section("3. update_plan");
            const before = yield program.account.plan.fetch(planPDA);
            console.log("  Before: name =", before.name, "| max_subs =", before.maxSubscribers.toString());
            const tx = yield program.methods
                .updatePlan({
                name: "Pro Monthly - Updated",
                description: null,
                maxSubscribers: new bn_js_1.default(200),
            })
                .accountsPartial({ merchant: merchant.publicKey, plan: planPDA })
                .signers([merchant])
                .rpc();
            console.log("  TX:", tx);
            const after = yield program.account.plan.fetch(planPDA);
            console.log("  After:  name =", after.name, "| max_subs =", after.maxSubscribers.toString());
            chai_1.assert.equal(after.name, "Pro Monthly - Updated");
            chai_1.assert.isTrue(after.maxSubscribers.eqn(200));
            console.log("  ✓ Plan updated");
        }));
        it("non-merchant cannot update", () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                // Passes a plan that intruder doesn't own → constraint `address = plan.merchant` fails
                const fakePDA = derivePlanPDA(intruder.publicKey, planId, programId);
                yield program.methods
                    .updatePlan({
                    name: "Hacked",
                    description: null,
                    maxSubscribers: null,
                })
                    .accountsPartial({ merchant: intruder.publicKey, plan: fakePDA })
                    .signers([intruder])
                    .rpc();
                chai_1.assert.fail("Should throw");
            }
            catch (err) {
                console.log("  ✓ Rejected:", err.message.split("\n")[0].substring(0, 70));
            }
        }));
    });
    // ═══════════════════════════════════════════════════════════════════════════
    // 4. create_subscription
    //    Both plan + subscription circular → pass both explicitly
    // ═══════════════════════════════════════════════════════════════════════════
    describe("4 · create_subscription", () => {
        it("creates subscription PDA and sets SPL delegate", () => __awaiter(void 0, void 0, void 0, function* () {
            var _a, _b, _c;
            section("4. create_subscription");
            const beforeBal = (yield (0, spl_token_1.getAccount)(provider.connection, subscriberUsdcAta)).amount;
            console.log("  Subscriber USDC before:", formatUSDC(beforeBal));
            const tx = yield program.methods
                .createSubscription()
                .accountsPartial({
                subscriber: subscriber.publicKey,
                usdcMint,
                plan: planPDA,
                subscription: subscriptionPDA,
            })
                .signers([subscriber])
                .rpc();
            console.log("  TX:", tx);
            const sub = yield program.account.subscription.fetch(subscriptionPDA);
            const plan = yield program.account.plan.fetch(planPDA);
            const tokenAcct = yield (0, spl_token_1.getAccount)(provider.connection, subscriberUsdcAta);
            console.log("  status          =", JSON.stringify(sub.status));
            console.log("  payment_count   =", sub.paymentCount.toString());
            console.log("  next_payment_at =", new Date(sub.nextPaymentAt.toNumber() * 1000).toISOString());
            console.log("  started_at      =", new Date(sub.startedAt.toNumber() * 1000).toISOString());
            console.log("  delegate        =", (_b = (_a = tokenAcct.delegate) === null || _a === void 0 ? void 0 : _a.toBase58()) !== null && _b !== void 0 ? _b : "none");
            console.log("  delegate=subPDA?=", ((_c = tokenAcct.delegate) === null || _c === void 0 ? void 0 : _c.toBase58()) === subscriptionPDA.toBase58());
            console.log("  active_subs     =", plan.activeSubscribers.toString());
            console.log("  Balance after:  ", formatUSDC(tokenAcct.amount), "(unchanged - funds stay in wallet)");
            chai_1.assert.deepEqual(sub.subscriber, subscriber.publicKey);
            chai_1.assert.isTrue(sub.amountUsdc.eq(PLAN_AMOUNT));
            chai_1.assert.deepEqual(sub.status, { active: {} });
            chai_1.assert.isTrue(plan.activeSubscribers.eqn(1));
            chai_1.assert.equal(beforeBal, tokenAcct.amount, "Balance unchanged on subscribe");
            console.log("  ✓ Subscription created");
        }));
        it("rejects subscribing to a plan at capacity", () => __awaiter(void 0, void 0, void 0, function* () {
            const capId = new bn_js_1.default(planId.toNumber() + 50);
            const capPDA = derivePlanPDA(merchant.publicKey, capId, programId);
            yield program.methods
                .createPlan({
                planId: capId,
                name: "Cap Test",
                description: "",
                amountUsdc: PLAN_AMOUNT,
                intervalSeconds: INTERVAL_S,
                trialSeconds: TRIAL_S,
                maxSubscribers: new bn_js_1.default(1),
            })
                .accounts({ merchant: merchant.publicKey, usdcMint })
                .signers([merchant])
                .rpc();
            const sub1 = web3_js_1.Keypair.generate();
            const sub1PDA = deriveSubscriptionPDA(capPDA, sub1.publicKey, programId);
            yield airdrop(provider, sub1.publicKey);
            yield (0, spl_token_1.createAssociatedTokenAccount)(provider.connection, sub1, usdcMint, sub1.publicKey);
            yield program.methods
                .createSubscription()
                .accountsPartial({
                subscriber: sub1.publicKey,
                usdcMint,
                plan: capPDA,
                subscription: sub1PDA,
            })
                .signers([sub1])
                .rpc();
            const sub2 = web3_js_1.Keypair.generate();
            const sub2PDA = deriveSubscriptionPDA(capPDA, sub2.publicKey, programId);
            yield airdrop(provider, sub2.publicKey);
            yield (0, spl_token_1.createAssociatedTokenAccount)(provider.connection, sub2, usdcMint, sub2.publicKey);
            try {
                yield program.methods
                    .createSubscription()
                    .accountsPartial({
                    subscriber: sub2.publicKey,
                    usdcMint,
                    plan: capPDA,
                    subscription: sub2PDA,
                })
                    .signers([sub2])
                    .rpc();
                chai_1.assert.fail("Should throw PlanAtCapacity");
            }
            catch (err) {
                chai_1.assert.include(err.message, "PlanAtCapacity");
                console.log("  ✓ Rejected: PlanAtCapacity");
            }
        }));
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
        it("transfers USDC to merchant + treasury, updates counters", () => __awaiter(void 0, void 0, void 0, function* () {
            section("5. execute_payment");
            console.log("\n  Waiting 2s for payment to become due (interval = 1s)...");
            yield sleep(2000);
            const b_sub = (yield (0, spl_token_1.getAccount)(provider.connection, subscriberUsdcAta))
                .amount;
            const b_mer = (yield (0, spl_token_1.getAccount)(provider.connection, merchantUsdcAta))
                .amount;
            const b_trea = (yield (0, spl_token_1.getAccount)(provider.connection, treasuryUsdcAta))
                .amount;
            console.log("  Balances BEFORE:");
            console.log("  subscriber =", formatUSDC(b_sub));
            console.log("  merchant   =", formatUSDC(b_mer));
            console.log("  treasury   =", formatUSDC(b_trea));
            const tx = yield program.methods
                .executePayment()
                .accountsPartial({
                keeper: keeper.publicKey,
                subscription: subscriptionPDA,
                plan: planPDA,
                subscriber: subscriber.publicKey,
                subscriberTokenAccount: subscriberUsdcAta,
                merchantTokenAccount: merchantUsdcAta,
                treasuryTokenAccount: treasuryUsdcAta,
            })
                .signers([keeper])
                .rpc();
            console.log("\n  TX:", tx);
            const a_sub = (yield (0, spl_token_1.getAccount)(provider.connection, subscriberUsdcAta))
                .amount;
            const a_mer = (yield (0, spl_token_1.getAccount)(provider.connection, merchantUsdcAta))
                .amount;
            const a_trea = (yield (0, spl_token_1.getAccount)(provider.connection, treasuryUsdcAta))
                .amount;
            const subA = yield program.account.subscription.fetch(subscriptionPDA);
            const planA = yield program.account.plan.fetch(planPDA);
            const planAmtBig = BigInt(PLAN_AMOUNT.toNumber());
            const expectedFee = BigInt(Math.round((Number(planAmtBig) * FEE_BPS) / 10000));
            const totalCharge = planAmtBig + expectedFee;
            console.log("  Balances AFTER:");
            console.log("  subscriber =", formatUSDC(a_sub), " Δ -", formatUSDC(b_sub - a_sub));
            console.log("  merchant   =", formatUSDC(a_mer), " Δ +", formatUSDC(a_mer - b_mer));
            console.log("  treasury   =", formatUSDC(a_trea), " Δ +", formatUSDC(a_trea - b_trea));
            console.log("  Fee model: plan =", formatUSDC(planAmtBig), "| fee =", formatUSDC(expectedFee), "| total_charge =", formatUSDC(totalCharge));
            console.log("  payment_count =", subA.paymentCount.toString(), "| successful_payments =", planA.successfulPayments.toString());
            chai_1.assert.equal(a_mer - b_mer, planAmtBig, "Merchant received full plan amount");
            chai_1.assert.equal(a_trea - b_trea, expectedFee, "Treasury received fee");
            chai_1.assert.equal(b_sub - a_sub, totalCharge, "Subscriber paid plan + fee");
            chai_1.assert.isTrue(subA.paymentCount.eqn(1));
            chai_1.assert.deepEqual(subA.status, { active: {} });
            console.log("  ✓ Payment executed correctly");
        }));
        it("auto-expires after 3 consecutive failed payments", () => __awaiter(void 0, void 0, void 0, function* () {
            section("5b. 3 failures → auto-expire");
            const brokeId = new bn_js_1.default(planId.toNumber() + 200);
            const brokePDA = derivePlanPDA(merchant.publicKey, brokeId, programId);
            const broke = web3_js_1.Keypair.generate();
            yield airdrop(provider, broke.publicKey);
            const brokeAta = yield (0, spl_token_1.createAssociatedTokenAccount)(provider.connection, broke, usdcMint, broke.publicKey);
            yield (0, spl_token_1.mintTo)(provider.connection, admin.payer, usdcMint, brokeAta, admin.publicKey, 5 * USDC_FACTOR);
            const brokeSubPDA = deriveSubscriptionPDA(brokePDA, broke.publicKey, programId);
            console.log("  Broke subscriber: $5.00, plan costs $10.00 + fee");
            yield program.methods
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
            yield program.methods
                .createSubscription()
                .accountsPartial({
                subscriber: broke.publicKey,
                usdcMint,
                plan: brokePDA,
                subscription: brokeSubPDA,
            })
                .signers([broke])
                .rpc();
            for (let attempt = 1; attempt <= 3; attempt++) {
                yield sleep(1500);
                console.log(`\n  Attempt ${attempt}/3 (insufficient balance - returns Ok, logs failure)...`);
                // execute_payment returns Ok() on insufficient balance; records failure internally
                yield program.methods
                    .executePayment()
                    .accountsPartial({
                    keeper: keeper.publicKey,
                    subscription: brokeSubPDA,
                    plan: brokePDA,
                    subscriber: broke.publicKey,
                    subscriberTokenAccount: brokeAta,
                    merchantTokenAccount: merchantUsdcAta,
                    treasuryTokenAccount: treasuryUsdcAta,
                })
                    .signers([keeper])
                    .rpc();
                const s = yield program.account.subscription.fetch(brokeSubPDA);
                console.log(`  status = ${JSON.stringify(s.status)}`);
                if (attempt < 3) {
                    chai_1.assert.notDeepEqual(s.status, { expired: {} }, `Should not be expired after only ${attempt} failure(s)`);
                }
                else {
                    chai_1.assert.deepEqual(s.status, { expired: {} }, "Should auto-expire after 3 consecutive failures");
                    console.log("  ✓ Auto-expired after 3 failures");
                }
            }
        }));
    });
    // ═══════════════════════════════════════════════════════════════════════════
    // 6. pause_subscription / resume_subscription
    //    address = subscription.plan does NOT chain-resolve → pass plan explicitly
    // ═══════════════════════════════════════════════════════════════════════════
    describe("6 · pause_subscription / resume_subscription", () => {
        let pauseSub;
        let pauseSubPDA;
        let pPlanPDA;
        before("create fresh plan+sub for pause tests", () => __awaiter(void 0, void 0, void 0, function* () {
            pauseSub = web3_js_1.Keypair.generate();
            yield airdrop(provider, pauseSub.publicKey);
            yield (0, spl_token_1.createAssociatedTokenAccount)(provider.connection, pauseSub, usdcMint, pauseSub.publicKey);
            const pPlanId = new bn_js_1.default(planId.toNumber() + 300);
            pPlanPDA = derivePlanPDA(merchant.publicKey, pPlanId, programId);
            pauseSubPDA = deriveSubscriptionPDA(pPlanPDA, pauseSub.publicKey, programId);
            yield program.methods
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
            yield program.methods
                .createSubscription()
                .accountsPartial({
                subscriber: pauseSub.publicKey,
                usdcMint,
                plan: pPlanPDA,
                subscription: pauseSubPDA,
            })
                .signers([pauseSub])
                .rpc();
        }));
        it("subscriber can pause their subscription", () => __awaiter(void 0, void 0, void 0, function* () {
            section("6a. pause_subscription");
            const tx = yield program.methods
                .pauseSubscription()
                .accountsPartial({
                authority: pauseSub.publicKey,
                subscription: pauseSubPDA,
                plan: pPlanPDA,
            })
                .signers([pauseSub])
                .rpc();
            console.log("  TX:", tx);
            const sub = yield program.account.subscription.fetch(pauseSubPDA);
            console.log("  status =", JSON.stringify(sub.status));
            chai_1.assert.deepEqual(sub.status, { paused: {} });
            console.log("  ✓ Paused");
        }));
        it("subscriber can resume their subscription", () => __awaiter(void 0, void 0, void 0, function* () {
            section("6b. resume_subscription");
            const tx = yield program.methods
                .resumeSubscription()
                .accountsPartial({
                authority: pauseSub.publicKey,
                subscription: pauseSubPDA,
                plan: pPlanPDA,
            })
                .signers([pauseSub])
                .rpc();
            console.log("  TX:", tx);
            const sub = yield program.account.subscription.fetch(pauseSubPDA);
            console.log("  status =", JSON.stringify(sub.status));
            chai_1.assert.deepEqual(sub.status, { active: {} });
            console.log("  ✓ Resumed");
        }));
    });
    // ═══════════════════════════════════════════════════════════════════════════
    // 7. cancel_subscription
    //    address = subscription.plan does NOT chain-resolve → pass plan explicitly
    // ═══════════════════════════════════════════════════════════════════════════
    describe("7 · cancel_subscription", () => {
        it("rejects cancel from intruder (UnauthorizedActor)", () => __awaiter(void 0, void 0, void 0, function* () {
            section("7. cancel_subscription");
            try {
                yield program.methods
                    .cancelSubscription()
                    .accountsPartial({
                    authority: intruder.publicKey,
                    subscription: subscriptionPDA,
                    plan: planPDA,
                })
                    .signers([intruder])
                    .rpc();
                chai_1.assert.fail("Should throw");
            }
            catch (err) {
                console.log("  ✓ Intruder rejected:", err.message.split("\n")[0].substring(0, 70));
            }
        }));
        it("subscriber can cancel their subscription", () => __awaiter(void 0, void 0, void 0, function* () {
            const before_plan = yield program.account.plan.fetch(planPDA);
            const before_sub = yield program.account.subscription.fetch(subscriptionPDA);
            console.log("\n  Before: status =", JSON.stringify(before_sub.status), "| active_subs =", before_plan.activeSubscribers.toString());
            const tx = yield program.methods
                .cancelSubscription()
                .accountsPartial({
                authority: subscriber.publicKey,
                subscription: subscriptionPDA,
                plan: planPDA,
            })
                .signers([subscriber])
                .rpc();
            console.log("  TX:", tx);
            const after_plan = yield program.account.plan.fetch(planPDA);
            const after_sub = yield program.account.subscription.fetch(subscriptionPDA);
            console.log("  After:  status =", JSON.stringify(after_sub.status), "| active_subs =", after_plan.activeSubscribers.toString());
            chai_1.assert.deepEqual(after_sub.status, { cancelled: {} });
            chai_1.assert.isTrue(after_plan.activeSubscribers.lt(before_plan.activeSubscribers));
            console.log("  ✓ Subscription cancelled");
        }));
        it("cannot cancel an already-cancelled subscription (AlreadyCancelled)", () => __awaiter(void 0, void 0, void 0, function* () {
            try {
                yield program.methods
                    .cancelSubscription()
                    .accountsPartial({
                    authority: subscriber.publicKey,
                    subscription: subscriptionPDA,
                    plan: planPDA,
                })
                    .signers([subscriber])
                    .rpc();
                chai_1.assert.fail("Should throw AlreadyCancelled");
            }
            catch (err) {
                chai_1.assert.include(err.message, "AlreadyCancelled");
                console.log("  ✓ Rejected: AlreadyCancelled");
            }
        }));
    });
    // ═══════════════════════════════════════════════════════════════════════════
    // 8. pause_plan / archive_plan
    //    plan_id circular → pass plan explicitly
    // ═══════════════════════════════════════════════════════════════════════════
    describe("8 · pause_plan / archive_plan", () => {
        it("merchant can pause a plan", () => __awaiter(void 0, void 0, void 0, function* () {
            section("8a. pause_plan");
            const tx = yield program.methods
                .pausePlan()
                .accountsPartial({ merchant: merchant.publicKey, plan: planPDA })
                .signers([merchant])
                .rpc();
            console.log("  TX:", tx);
            const plan = yield program.account.plan.fetch(planPDA);
            console.log("  status =", JSON.stringify(plan.status));
            chai_1.assert.deepEqual(plan.status, { paused: {} });
            console.log("  ✓ Plan paused");
        }));
        it("cannot subscribe to a paused plan (PlanNotActive)", () => __awaiter(void 0, void 0, void 0, function* () {
            const s = web3_js_1.Keypair.generate();
            const sPDA = deriveSubscriptionPDA(planPDA, s.publicKey, programId);
            yield airdrop(provider, s.publicKey);
            yield (0, spl_token_1.createAssociatedTokenAccount)(provider.connection, s, usdcMint, s.publicKey);
            try {
                yield program.methods
                    .createSubscription()
                    .accountsPartial({
                    subscriber: s.publicKey,
                    usdcMint,
                    plan: planPDA,
                    subscription: sPDA,
                })
                    .signers([s])
                    .rpc();
                chai_1.assert.fail("Should throw PlanNotActive");
            }
            catch (err) {
                chai_1.assert.include(err.message, "PlanNotActive");
                console.log("  ✓ Rejected: PlanNotActive");
            }
        }));
        it("merchant can archive a plan", () => __awaiter(void 0, void 0, void 0, function* () {
            section("8b. archive_plan");
            const tx = yield program.methods
                .archivePlan()
                .accountsPartial({ merchant: merchant.publicKey, plan: planPDA })
                .signers([merchant])
                .rpc();
            console.log("  TX:", tx);
            const plan = yield program.account.plan.fetch(planPDA);
            console.log("  status =", JSON.stringify(plan.status));
            chai_1.assert.deepEqual(plan.status, { archived: {} });
            console.log("  ✓ Plan archived");
        }));
    });
    // ═══════════════════════════════════════════════════════════════════════════
    // 9. PDA derivation consistency
    // ═══════════════════════════════════════════════════════════════════════════
    describe("9 · PDA derivation", () => {
        it('config PDA: seeds ["config"]', () => {
            section("9. PDA verification");
            const [d] = web3_js_1.PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
            chai_1.assert.equal(d.toBase58(), configPDA.toBase58());
            console.log("  ✓ configPDA =", configPDA.toBase58());
        });
        it('plan PDA: seeds ["plan", merchant, planId_le8]', () => {
            const [d] = web3_js_1.PublicKey.findProgramAddressSync([
                Buffer.from("plan"),
                merchant.publicKey.toBuffer(),
                planId.toArrayLike(Buffer, "le", 8),
            ], programId);
            chai_1.assert.equal(d.toBase58(), planPDA.toBase58());
            console.log("  ✓ planPDA =", planPDA.toBase58());
        });
        it('subscription PDA: seeds ["subscription", plan, subscriber]', () => {
            const [d] = web3_js_1.PublicKey.findProgramAddressSync([
                Buffer.from("subscription"),
                planPDA.toBuffer(),
                subscriber.publicKey.toBuffer(),
            ], programId);
            chai_1.assert.equal(d.toBase58(), subscriptionPDA.toBase58());
            console.log("  ✓ subscriptionPDA =", subscriptionPDA.toBase58());
        });
    });
    // ═══════════════════════════════════════════════════════════════════════════
    // 10. Final state dump
    // ═══════════════════════════════════════════════════════════════════════════
    after("print final on-chain state", () => __awaiter(void 0, void 0, void 0, function* () {
        section("FINAL STATE SUMMARY");
        try {
            const cfg = yield program.account.protocolConfig.fetch(configPDA);
            console.log("  fee_bps =", cfg.feeBps, "| treasury =", cfg.treasury.toBase58());
        }
        catch (_a) {
            console.log("  (config fetch failed)");
        }
        try {
            const plan = yield program.account.plan.fetch(planPDA);
            console.log("  plan status =", JSON.stringify(plan.status), "| active_subs =", plan.activeSubscribers.toString(), "| successful_payments =", plan.successfulPayments.toString());
        }
        catch (_b) {
            console.log("  (plan fetch failed)");
        }
        try {
            const sub = yield program.account.subscription.fetch(subscriptionPDA);
            console.log("  sub status =", JSON.stringify(sub.status), "| payment_count =", sub.paymentCount.toString());
        }
        catch (_c) {
            console.log("  (subscription fetch failed)");
        }
        try {
            const s = yield (0, spl_token_1.getAccount)(provider.connection, subscriberUsdcAta);
            const m = yield (0, spl_token_1.getAccount)(provider.connection, merchantUsdcAta);
            const t = yield (0, spl_token_1.getAccount)(provider.connection, treasuryUsdcAta);
            console.log("\n  Final USDC balances:");
            console.log("  subscriber =", formatUSDC(s.amount));
            console.log("  merchant   =", formatUSDC(m.amount));
            console.log("  treasury   =", formatUSDC(t.amount));
            console.log("  total      =", formatUSDC(s.amount + m.amount + t.amount), "(started $500)");
        }
        catch (_d) {
            console.log("  (balance fetch failed)");
        }
        console.log("\n" + "═".repeat(65));
    }));
});
