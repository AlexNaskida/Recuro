import { Connection, PublicKey } from "@solana/web3.js";
const conn = new Connection("https://api.devnet.solana.com", "confirmed");
const ATA = new PublicKey("2E5aDHcBcyuQYnJberGVGLoeivTAiaqMNUfWisMKJF4m");
const info = await conn.getAccountInfo(ATA);
if (!info) { console.log("ATA not found"); process.exit(1); }
const data = info.data;
const delegateOption = data.readUInt32LE(72);
if (delegateOption === 0) {
  console.log("Delegate: none");
  console.log("Delegated amount: 0");
} else {
  const delegate = new PublicKey(data.slice(76, 108));
  const delegatedAmount = data.readBigUInt64LE(164);
  console.log("Delegate:", delegate.toBase58());
  console.log("Delegated amount (micro):", delegatedAmount.toString());
  console.log("Delegated amount (USDC):", Number(delegatedAmount) / 1e6);
}
