/// Maximum byte length for a plan name stored on-chain
pub const MAX_PLAN_NAME_LEN: usize = 64;

/// Maximum byte length for a plan description stored on-chain
pub const MAX_PLAN_DESC_LEN: usize = 256;

/// Number of consecutive failed payments before auto-expiry
pub const MAX_FAILED_PAYMENTS: u8 = 3;

/// USDC mint on devnet (Circle's devnet faucet)
pub const DEVNET_USDC_MINT: &str = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

/// USDC mint on mainnet-beta
pub const MAINNET_USDC_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

/// Minimum billing interval: 1 day (86,400 seconds)
pub const MIN_INTERVAL_SECONDS: i64 = 1;

/// Maximum billing interval: 1 year (365 days)
pub const MAX_INTERVAL_SECONDS: i64 = 365 * 86_400;

/// Minimum billable amount: 0.01 USDC (10_000 micro-units)
pub const MIN_AMOUNT_USDC: u64 = 10_000;

/// Maximum billable amount: 10,000 USDC
pub const MAX_AMOUNT_USDC: u64 = 10_000 * 1_000_000;

/// Seed prefixes for PDA derivation
pub const SEED_PLAN: &[u8] = b"plan";
pub const SEED_SUBSCRIPTION: &[u8] = b"subscription";
pub const SEED_THREAD: &[u8] = b"payment";
