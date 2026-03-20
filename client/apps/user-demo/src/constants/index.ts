export const PROGRAM_ID = "45WGwEH24Y9J6ZHYoKiGRET4t4xpu6ESiTeRdhRf9pfr";

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

export function intervalLabel(seconds: number): string {
  if (seconds < 3600) return `${seconds}s`; // < 1 hour
  if (seconds < 86400) return `${Math.round(seconds / 3600)}h`; // < 1 day
  if (seconds < 604800) return `${Math.round(seconds / 86400)}d`; // < 1 week
  if (seconds < 2592000) return `${Math.round(seconds / 604800)}w`;
  return `${Math.round(seconds / 2592000)} month${Math.round(seconds / 2592000) === 1 ? "" : "s"}`;
}
