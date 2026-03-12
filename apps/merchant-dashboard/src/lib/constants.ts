// ─── SubPay Protocol Constants ───────────────────────────────────────────────
// Update PROGRAM_ID after anchor deploy

export const PROGRAM_ID = "HoTMwTrd7g4fGBX547LzGbH9FKju8QNVFAd9FGMLHRxq";

export const CLUSTER = "devnet" as const;

// export const RPC_URL = "https://api.devnet.solana.com";
export const RPC_URL =
  "https://devnet.helius-rpc.com/?api-key=fd0c3173-d028-49bf-8b2a-40d695f76b03";

export const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"; // devnet USDC

// Seeds (must match Rust constants)
export const SEED_PLAN = "plan";
export const SEED_SUBSCRIPTION = "subscription";
export const SEED_CONFIG = "config";
