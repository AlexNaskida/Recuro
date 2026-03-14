/**
 * Updates the protocol config with a new treasury address.
 * Run from project root: node tests/update_config.mjs
 */

import * as anchor from "@coral-xyz/anchor";
import { PublicKey, Keypair, SystemProgram } from "@solana/web3.js";
import { readFileSync } from "fs";
import { homedir } from "os";

const PROGRAM_ID    = new PublicKey("HoTMwTrd7g4fGBX547LzGbH9FKju8QNVFAd9FGMLHRxq");
const NEW_TREASURY  = new PublicKey("G3DGfs821mhkCxJyvaoXVQ86G2HahiR913phA9Nn3NxM");
const NEW_FEE_BPS   = 25; // keep 0.25%

const idl     = JSON.parse(readFileSync("./target/idl/subscription.json", "utf8"));
const keypair = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(readFileSync(homedir() + "/.config/solana/id.json", "utf8")))
);

const connection = new anchor.web3.Connection("https://api.devnet.solana.com", "confirmed");
const wallet     = new anchor.Wallet(keypair);
const provider   = new anchor.AnchorProvider(connection, wallet, { commitment: "confirmed" });
const program    = new anchor.Program(idl, provider);

const [configPDA] = PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID);

// Show current config
const before = await program.account.protocolConfig.fetch(configPDA);
console.log("Before:");
console.log("  treasury:", before.treasury.toBase58());
console.log("  fee_bps: ", before.feeBps);

const tx = await program.methods
  .updateConfig(NEW_TREASURY, NEW_FEE_BPS)
  .accounts({
    admin:  keypair.publicKey,
    config: configPDA,
  })
  .rpc({ commitment: "confirmed" });

const after = await program.account.protocolConfig.fetch(configPDA);
console.log("\n✅ Config updated!");
console.log("  treasury:", after.treasury.toBase58());
console.log("  fee_bps: ", after.feeBps);
console.log("  tx:      ", tx);
