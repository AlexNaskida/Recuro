// ─── SubPay Protocol Constants ───────────────────────────────────────────────
// Update PROGRAM_ID after anchor deploy

export const PROGRAM_ID = "11111111111111111111111111111111"; // TODO: replace after anchor deploy

export const CLUSTER = "devnet" as const;

export const RPC_URL = "https://api.devnet.solana.com";

export const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"; // devnet USDC

// Seeds (must match Rust constants)
export const SEED_PLAN         = "plan";
export const SEED_SUBSCRIPTION = "subscription";
export const SEED_CONFIG       = "config";
