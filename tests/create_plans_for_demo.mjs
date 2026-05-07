import * as anchor from "@coral-xyz/anchor";
import BN from "bn.js";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { readFileSync } from "fs";
import { homedir } from "os";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const PROGRAM_ID = new PublicKey(
  "45WGwEH24Y9J6ZHYoKiGRET4t4xpu6ESiTeRdhRf9pfr",
);
const USDC_MINT = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
);
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
);

function getAssociatedTokenAddress(mint, owner) {
  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID,
  )[0];
}

const PLANS = [
  {
    planId: 1,
    name: "Starter",
    description: "Good for small teams launching their first subscriptions.",
    amountUsdc: 19_000_000,
    intervalDays: 30,
  },
  {
    planId: 2,
    name: "Growth",
    description: "Built for merchants scaling recurring revenue.",
    amountUsdc: 49_000_000,
    intervalDays: 30,
  },
  {
    planId: 3,
    name: "Scale",
    description: "For high-volume businesses and multi-market operations.",
    amountUsdc: 129_000_000,
    intervalDays: 30,
  },
];

const idl = JSON.parse(
  readFileSync(resolve(__dirname, "../target/idl/subscription.json"), "utf8"),
);
const keypair = anchor.web3.Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(readFileSync(homedir() + "/.config/solana/id.json", "utf8")),
  ),
);
const provider = new anchor.AnchorProvider(
  new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed"),
  new anchor.Wallet(keypair),
  { commitment: "confirmed" },
);
const program = new anchor.Program(
  { ...idl, address: PROGRAM_ID.toBase58() },
  provider,
);

const merchantTokenAccount = await getAssociatedTokenAddress(
  USDC_MINT,
  keypair.publicKey,
);

for (const plan of PLANS) {
  const planId = new BN(plan.planId);
  const [planPubkey] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("plan"),
      keypair.publicKey.toBuffer(),
      planId.toArrayLike(Buffer, "le", 8),
    ],
    PROGRAM_ID,
  );

  console.log(`\nCreating plan: ${plan.name}`);
  console.log(`  PDA: ${planPubkey.toBase58()}`);

  try {
    const tx = await program.methods
      .createPlan({
        planId,
        name: plan.name,
        description: plan.description,
        amountUsdc: new BN(plan.amountUsdc),
        intervalSeconds: new BN(plan.intervalDays * 86_400),
        trialSeconds: new BN(0),
        maxSubscribers: new BN(0),
        merchantReceiveAddress: null,
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

    console.log(`  ✅ Done - tx: ${tx}`);
  } catch (err) {
    if (err.message?.includes("already in use")) {
      console.log(`  ⚠️  Already exists, skipping`);
    } else {
      console.error(`  ❌ ${err.message}`);
    }
  }
}
