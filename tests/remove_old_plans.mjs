import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { readFileSync } from "fs";
import { homedir } from "os";

const PROGRAM_ID = new PublicKey(
  "45WGwEH24Y9J6ZHYoKiGRET4t4xpu6ESiTeRdhRf9pfr",
);
const RPC_URL = "https://api.devnet.solana.com";
const IDL_PATH =
  "/Users/alex/Desktop/Web3/Projects/Recuro/recuro/target/idl/subscription.json";

const PLANS_TO_REMOVE = [
  "B8Ntjvh2tFLLu1DtqdjmgJKqsRxAaxRhA4oAQskpxRny",
  "CQqCErmpsJQcUaYTEDyvVhWQ12brQfAFmrcrQTFnFVq4",
  "8X3djeNRFyeS5e7ktHdKxkeDE4NWiDBQfMHUFgnkK17e",
  "CSo4mtDPaFEx5U3QMAR8umNLuLg3Cmvqpe9NpUiMyNFb",
].map((value) => new PublicKey(value));

const idl = JSON.parse(readFileSync(IDL_PATH, "utf8"));
const keypair = Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(readFileSync(homedir() + "/.config/solana/id.json", "utf8")),
  ),
);

const provider = new anchor.AnchorProvider(
  new anchor.web3.Connection(RPC_URL, "confirmed"),
  new anchor.Wallet(keypair),
  { commitment: "confirmed" },
);

const program = new anchor.Program(
  { ...idl, address: PROGRAM_ID.toBase58() },
  provider,
);

for (const plan of PLANS_TO_REMOVE) {
  console.log(`\nPlan: ${plan.toBase58()}`);

  try {
    await program.methods
      .archivePlan()
      .accounts({
        merchant: keypair.publicKey,
        plan,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ commitment: "confirmed" });
    console.log("  archived");
  } catch (err) {
    console.log(`  archive skipped: ${err?.message ?? err}`);
  }

  try {
    await program.methods
      .deletePlan()
      .accounts({
        merchant: keypair.publicKey,
        plan,
        systemProgram: SystemProgram.programId,
      })
      .rpc({ commitment: "confirmed" });
    console.log("  deleted");
  } catch (err) {
    console.error(`  delete failed: ${err?.message ?? err}`);
  }
}
