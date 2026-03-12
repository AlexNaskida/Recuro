import * as anchor from "@coral-xyz/anchor";
import { readFileSync } from "fs";

const idl = JSON.parse(readFileSync("./target/idl/subscription.json", "utf8"));
const keypair = anchor.web3.Keypair.fromSecretKey(
  Uint8Array.from(
    JSON.parse(
      readFileSync(process.env.HOME + "/.config/solana/id.json", "utf8"),
    ),
  ),
);

const PROGRAM_ID = new anchor.web3.PublicKey(
  "HoTMwTrd7g4fGBX547LzGbH9FKju8QNVFAd9FGMLHRxq",
);
const connection = new anchor.web3.Connection(
  "https://api.devnet.solana.com",
  "confirmed",
);
const wallet = new anchor.Wallet(keypair);
const provider = new anchor.AnchorProvider(connection, wallet, {
  commitment: "confirmed",
});
anchor.setProvider(provider);

const program = new anchor.Program(idl, provider);
console.log("Program ID:", program.programId.toBase58());

const FEE_BPS = 25;
const [config] = anchor.web3.PublicKey.findProgramAddressSync(
  [Buffer.from("config")],
  PROGRAM_ID,
);

try {
  const existing = await program.account.protocolConfig.fetch(config);
  console.log("Config already initialised:", config.toBase58());
  console.log("Current fee_bps:", existing.feeBps);
} catch {
  const tx = await program.methods
    .initializeConfig({ feeBps: FEE_BPS, treasury: wallet.publicKey })
    .accounts({
      admin: wallet.publicKey,
      config,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .rpc();
  console.log("✅ Protocol config initialised:", config.toBase58());
  console.log(`   Fee: ${FEE_BPS} bps (${FEE_BPS / 100}%)`);
  console.log(`   Treasury: ${wallet.publicKey.toBase58()}`);
  console.log("   Tx:", tx);
}
