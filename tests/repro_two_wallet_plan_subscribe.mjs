import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  SYSVAR_RENT_PUBKEY,
} from "@solana/web3.js";
import { randomBytes } from "crypto";
import { readFileSync, existsSync } from "fs";
import { homedir } from "os";

const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);

const PROGRAM_ID = new PublicKey(
  "45WGwEH24Y9J6ZHYoKiGRET4t4xpu6ESiTeRdhRf9pfr",
);
const GUARD_PROGRAM_ID = new PublicKey(
  "4Fgs3dSAP869uEwsTd1tyh2pTkvLK1ji2BAhmfbBzCDr",
);
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

const RPC_URL = process.env.RPC_URL ?? "https://api.devnet.solana.com";
const MERCHANT_KEYPAIR =
  process.env.MERCHANT_KEYPAIR ?? homedir() + "/.config/solana/id.json";
const SUBSCRIBER_KEYPAIR = process.env.SUBSCRIBER_KEYPAIR;
const PLAN_NAME = process.env.PLAN_NAME ?? "Keeper Repro";
const PLAN_DESCRIPTION =
  process.env.PLAN_DESCRIPTION ?? "Repro plan for keeper debugging";
const AMOUNT_USDC = Number(process.env.AMOUNT_USDC ?? "2");
const INTERVAL_DAYS = Number(process.env.INTERVAL_DAYS ?? "30");
const TRIAL_DAYS = Number(process.env.TRIAL_DAYS ?? "0");
const MAX_SUBSCRIBERS = Number(process.env.MAX_SUBSCRIBERS ?? "0");

if (!SUBSCRIBER_KEYPAIR) {
  console.error(
    "Set SUBSCRIBER_KEYPAIR to a second wallet JSON file before running this script.",
  );
  process.exit(1);
}

function loadKeypair(filePath) {
  return Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(filePath, "utf8"))),
  );
}

function getAssociatedTokenAddress(mint, owner) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

async function ensureAta(connection, payer, mint, owner) {
  const ata = getAssociatedTokenAddress(mint, owner);
  const existing = await connection.getAccountInfo(ata, "confirmed");
  if (existing) return ata;

  const ix = new TransactionInstruction({
    programId: ASSOCIATED_TOKEN_PROGRAM_ID,
    keys: [
      { pubkey: payer.publicKey, isSigner: true, isWritable: true },
      { pubkey: ata, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
    ],
    data: Buffer.alloc(0),
  });

  const tx = new Transaction().add(ix);
  const sig = await connection.sendTransaction(tx, [payer]);
  await connection.confirmTransaction(sig, "confirmed");
  return ata;
}

async function ensureAirdrop(connection, pubkey) {
  const balance = await connection.getBalance(pubkey, "confirmed");
  if (balance >= 500_000_000) return;
  const sig = await connection.requestAirdrop(pubkey, 1_000_000_000);
  await connection.confirmTransaction(sig, "confirmed");
}

function randomPlanId() {
  return new BN(randomBytes(8).toString("hex"), 16);
}

function derivePlanPda(merchant, planId) {
  return PublicKey.findProgramAddressSync(
    [
      Buffer.from("plan"),
      merchant.toBuffer(),
      planId.toArrayLike(Buffer, "le", 8),
    ],
    PROGRAM_ID,
  )[0];
}

function deriveSubscriptionPda(plan, subscriber) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("subscription"), plan.toBuffer(), subscriber.toBuffer()],
    PROGRAM_ID,
  )[0];
}

function deriveGuardPda(subscription) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("guard"), subscription.toBuffer()],
    GUARD_PROGRAM_ID,
  )[0];
}

const idl = JSON.parse(readFileSync("./target/idl/subscription.json", "utf8"));
const merchant = loadKeypair(MERCHANT_KEYPAIR);
const subscriber = loadKeypair(SUBSCRIBER_KEYPAIR);

const connection = new Connection(RPC_URL, "confirmed");
const merchantProvider = new anchor.AnchorProvider(
  connection,
  new anchor.Wallet(merchant),
  { commitment: "confirmed" },
);
const subscriberProvider = new anchor.AnchorProvider(
  connection,
  new anchor.Wallet(subscriber),
  { commitment: "confirmed" },
);

const merchantProgram = new anchor.Program(
  { ...idl, address: PROGRAM_ID.toBase58() },
  merchantProvider,
);
const subscriberProgram = new anchor.Program(
  { ...idl, address: PROGRAM_ID.toBase58() },
  subscriberProvider,
);

const planId = randomPlanId();
const planPda = derivePlanPda(merchant.publicKey, planId);
const subscriptionPda = deriveSubscriptionPda(planPda, subscriber.publicKey);
const guardPda = deriveGuardPda(subscriptionPda);
const merchantUsdcAta = await ensureAta(
  connection,
  merchant,
  USDC_MINT,
  merchant.publicKey,
);
const subscriberUsdcAta = await ensureAta(
  connection,
  subscriber,
  USDC_MINT,
  subscriber.publicKey,
);

await Promise.all([
  ensureAirdrop(connection, merchant.publicKey),
  ensureAirdrop(connection, subscriber.publicKey),
]);

console.log("Merchant:", merchant.publicKey.toBase58());
console.log("Subscriber:", subscriber.publicKey.toBase58());
console.log("Plan PDA:", planPda.toBase58());
console.log("Subscription PDA:", subscriptionPda.toBase58());
console.log("Guard PDA:", guardPda.toBase58());
console.log("Merchant ATA:", merchantUsdcAta.toBase58());
console.log("Subscriber ATA:", subscriberUsdcAta.toBase58());

try {
  const planTx = await merchantProgram.methods
    .createPlan({
      planId,
      name: PLAN_NAME,
      description: PLAN_DESCRIPTION,
      amountUsdc: new BN(Math.round(AMOUNT_USDC * 1_000_000)),
      intervalSeconds: new BN(INTERVAL_DAYS * 86_400),
      trialSeconds: new BN(TRIAL_DAYS * 86_400),
      maxSubscribers: new BN(MAX_SUBSCRIBERS),
      merchantReceiveAddress: null,
    })
    .accounts({
      merchant: merchant.publicKey,
      usdcMint: USDC_MINT,
      merchantTokenAccount: merchantUsdcAta,
      plan: planPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .rpc({ commitment: "confirmed" });

  console.log("Plan tx:", planTx);

  const subscribeTx = await subscriberProgram.methods
    .createSubscription()
    .accounts({
      subscriber: subscriber.publicKey,
      plan: planPda,
      config: PublicKey.findProgramAddressSync(
        [Buffer.from("config")],
        PROGRAM_ID,
      )[0],
      subscription: subscriptionPda,
      subscriberTokenAccount: subscriberUsdcAta,
      usdcMint: USDC_MINT,
      merchantTokenAccount: merchantUsdcAta,
      guardProgram: GUARD_PROGRAM_ID,
      guardAccount: guardPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
      rent: anchor.web3.SYSVAR_RENT_PUBKEY,
    })
    .rpc({ commitment: "confirmed" });

  console.log("Subscribe tx:", subscribeTx);
  console.log(
    "Ready for keeper run. Start the keeper now and it should pick up the new subscription.",
  );
} catch (error) {
  console.error("Script failed:", error?.message ?? error);
  if (error?.logs) {
    console.error(error.logs.join("\n"));
  }
  process.exit(1);
}
