/**
 * Creates a short-interval test plan for keeper testing.
 *
 * Usage:
 *   node create_test_plan.mjs
 *
 * Creates a plan with:
 *   - amount: $1.00 (1,000,000 μUSDC)
 *   - interval: 60 seconds
 *   - name: "Keeper Test"
 */

import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import {
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token";
import { readFileSync } from "fs";
import { homedir } from "os";

// ── Config ────────────────────────────────────────────────────────────────────

const PROGRAM_ID = new PublicKey(
  "HoTMwTrd7g4fGBX547LzGbH9FKju8QNVFAd9FGMLHRxq",
);
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

const PLAN_NAME = "Basic";
const AMOUNT_USDC = 2_000_000; // $2.00 in μUSDC (6 decimals) 9.999_999 would be $9.999999
const INTERVAL_SECS = 30; // 30 seconds — fires every 30 seconds
const TRIAL_SECS = 0;

// ── Setup ─────────────────────────────────────────────────────────────────────

const idl = JSON.parse(readFileSync("../target/idl/subscription.json", "utf8"));
const keypair = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(readFileSync(homedir() + "/.config/solana/id.json", "utf8")),
  ),
);

const connection = new anchor.web3.Connection(
  "https://api.devnet.solana.com",
  "confirmed",
);
const wallet = new anchor.Wallet(keypair);
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
const program = new anchor.Program(idl, provider);

// ── Derive PDAs ───────────────────────────────────────────────────────────────

const planId = new BN(Date.now());

const [planPubkey] = PublicKey.findProgramAddressSync(
  [
    Buffer.from("plan"),
    keypair.publicKey.toBuffer(),
    planId.toArrayLike(Buffer, "le", 8),
  ],
  PROGRAM_ID,
);

const merchantTokenAccount = await getAssociatedTokenAddress(
  USDC_MINT,
  keypair.publicKey,
);

// ── Create plan ───────────────────────────────────────────────────────────────

console.log("Creating test plan...");
console.log("  Merchant:  ", keypair.publicKey.toBase58());
console.log("  Plan PDA:  ", planPubkey.toBase58());
console.log("  Amount:     $1.00 (1,000,000 μUSDC)");
console.log("  Interval:   120 seconds");

try {
  const tx = await program.methods
    .createPlan({
      planId,
      name: PLAN_NAME,
      description: "Short interval plan for keeper testing",
      amountUsdc: new BN(AMOUNT_USDC),
      intervalSeconds: new BN(INTERVAL_SECS),
      trialSeconds: new BN(TRIAL_SECS),
      maxSubscribers: new BN(0),
    })
    .accounts({
      merchant: keypair.publicKey,
      usdcMint: USDC_MINT,
      merchantTokenAccount,
      plan: planPubkey,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc({ commitment: "confirmed" });

  console.log("\n✅ Plan created!");
  console.log("   Plan PDA:  ", planPubkey.toBase58());
  console.log("   Tx:        ", tx);
  console.log(
    "   Explorer:   https://explorer.solana.com/tx/" + tx + "?cluster=devnet",
  );
  console.log(
    "\n── Next steps ───────────────────────────────────────────────",
  );
  console.log("1. Subscribe to this plan (from any wallet with devnet USDC)");
  console.log("2. Run the keeper — it will fire execute_payment every 120s");
  console.log("   POLL_INTERVAL=120 node keeper.mjs");
} catch (err) {
  console.error("❌ Error:", err.message);
  if (err.logs) console.error("Logs:\n", err.logs.join("\n"));
}
