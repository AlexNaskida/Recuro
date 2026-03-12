export const PROGRAM_ID = "HoTMwTrd7g4fGBX547LzGbH9FKju8QNVFAd9FGMLHRxq";

export const USDC_MINT = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

export const CLUSTER =
  (import.meta.env.VITE_SOLANA_CLUSTER as "devnet" | "mainnet-beta") ??
  "devnet";

export const SOLSCAN_BASE =
  CLUSTER === "mainnet-beta"
    ? "https://solscan.io"
    : "https://solscan.io/?cluster=devnet";

export const SOLSCAN_TX = (sig: string) => `${SOLSCAN_BASE}/tx/${sig}`;
export const SOLSCAN_ACC = (addr: string) => `${SOLSCAN_BASE}/account/${addr}`;

export const USDC_FACTOR = 1_000_000;
export const toUSDC = (micro: number) => micro / USDC_FACTOR;
export const toMicro = (usdc: number) => Math.round(usdc * USDC_FACTOR);

export const formatUSDC = (micro: number) =>
  `$${toUSDC(micro).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export const truncate = (s: string, h = 6, t = 4) =>
  s.length > h + t + 3 ? `${s.slice(0, h)}…${s.slice(-t)}` : s;

export const SECONDS_PER_DAY = 86_400;

export const intervalLabel = (seconds: number) => {
  const d = seconds / SECONDS_PER_DAY;
  if (d === 1) return "day";
  if (d === 7) return "week";
  if (d === 30) return "month";
  if (d === 90) return "quarter";
  if (d === 365) return "year";
  return `${d} days`;
};
