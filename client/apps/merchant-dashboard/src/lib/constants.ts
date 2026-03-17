// ─── SubPay Protocol Constants ───────────────────────────────────────────────
// Update PROGRAM_ID after anchor deploy
import { env } from "./config";

export const PROGRAM_ID = "HoTMwTrd7g4fGBX547LzGbH9FKju8QNVFAd9FGMLHRxq";

export const CLUSTER = "devnet" as const;

export const RPC_URL = env.rpcUrl;

export const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU"; // devnet USDC

// Seeds (must match Rust constants)
export const SEED_PLAN = "plan";
export const SEED_SUBSCRIPTION = "subscription";
export const SEED_CONFIG = "config";
