// ── Solana addresses ────────────────────────────────────────────────────────
export const PROGRAM_ID =
  import.meta.env.VITE_PROGRAM_ID ??
  "SubsCR1PT111111111111111111111111111111111111";

export const USDC_MINT_DEVNET  = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
export const USDC_MINT_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

export const USDC_MINT =
  import.meta.env.VITE_USDC_MINT ?? USDC_MINT_DEVNET;

export const CLUSTER =
  (import.meta.env.VITE_SOLANA_CLUSTER as "devnet" | "mainnet-beta") ?? "devnet";

export const SOLSCAN_BASE = CLUSTER === "mainnet-beta"
  ? "https://solscan.io"
  : "https://solscan.io/?cluster=devnet";

export const SOLSCAN_TX  = (sig: string)  => `${SOLSCAN_BASE}/tx/${sig}`;
export const SOLSCAN_ACC = (addr: string) => `${SOLSCAN_BASE}/account/${addr}`;

// ── USDC formatting ─────────────────────────────────────────────────────────
export const USDC_DECIMALS  = 6;
export const USDC_FACTOR    = 1_000_000;

export const toUSDC  = (micro: number | bigint) => Number(micro) / USDC_FACTOR;
export const toMicro = (usdc: number)            => Math.round(usdc * USDC_FACTOR);

export const formatUSDC = (micro: number | bigint, compact = false) => {
  const val = toUSDC(micro);
  return compact && val >= 1000
    ? `$${(val / 1000).toFixed(1)}K`
    : `$${val.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

// ── Address helpers ─────────────────────────────────────────────────────────
export const truncate = (s: string, head = 6, tail = 4) =>
  s.length > head + tail + 3 ? `${s.slice(0, head)}…${s.slice(-tail)}` : s;

// ── Time helpers ────────────────────────────────────────────────────────────
export const SECONDS_PER_DAY = 86_400;

export const intervalLabel = (seconds: number) => {
  const days = seconds / SECONDS_PER_DAY;
  if (days === 1)  return "Daily";
  if (days === 7)  return "Weekly";
  if (days === 14) return "Bi-weekly";
  if (days === 30) return "Monthly";
  if (days === 90) return "Quarterly";
  if (days === 365) return "Annually";
  return `Every ${days}d`;
};

// ── Colours for recharts ────────────────────────────────────────────────────
export const CHART_COLORS = {
  primary:    "#6366f1",
  secondary:  "#10b981",
  amber:      "#f59e0b",
  danger:     "#ef4444",
  muted:      "#475569",
  grid:       "#1e293b",
  tooltip_bg: "#0f172a",
};
