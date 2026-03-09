import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, format } from "date-fns";

// ── shadcn/ui utility ────────────────────────────────────────────────────────
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Date helpers ──────────────────────────────────────────────────────────────
export function tsToDate(unixSeconds: number | bigint): Date {
  return new Date(Number(unixSeconds) * 1000);
}

export function formatTs(unixSeconds: number | bigint, fmt = "MMM d, yyyy"): string {
  return format(tsToDate(unixSeconds), fmt);
}

export function formatTsRelative(unixSeconds: number | bigint): string {
  return formatDistanceToNow(tsToDate(unixSeconds), { addSuffix: true });
}

export function formatTsFull(unixSeconds: number | bigint): string {
  return format(tsToDate(unixSeconds), "MMM d, yyyy HH:mm:ss");
}

// ── Number helpers ────────────────────────────────────────────────────────────
export function formatNumber(n: number, decimals = 2): string {
  return n.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

export function formatPercent(n: number, decimals = 1): string {
  return `${n.toFixed(decimals)}%`;
}

export function formatCompact(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}K`;
  return n.toFixed(2);
}

// ── Percentage change indicator ───────────────────────────────────────────────
export function pctChange(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
}

// ── Array helpers ─────────────────────────────────────────────────────────────
export function groupBy<T>(arr: T[], key: (item: T) => string): Record<string, T[]> {
  return arr.reduce<Record<string, T[]>>((acc, item) => {
    const k = key(item);
    (acc[k] ??= []).push(item);
    return acc;
  }, {});
}

// Bucket an array of {date, value} by calendar day/week/month
export type TimeGranularity = "day" | "week" | "month";

export function bucketByTime(
  items: Array<{ ts: number; value: number }>,
  granularity: TimeGranularity = "day"
): Array<{ label: string; value: number; cumulative: number }> {
  const fmt: Record<TimeGranularity, string> = {
    day:   "MMM d",
    week:  "'W'I yyyy",
    month: "MMM yyyy",
  };

  const map = new Map<string, number>();
  const sortedItems = [...items].sort((a, b) => a.ts - b.ts);

  for (const { ts, value } of sortedItems) {
    const label = format(new Date(ts * 1000), fmt[granularity]);
    map.set(label, (map.get(label) ?? 0) + value);
  }

  let cumulative = 0;
  return Array.from(map.entries()).map(([label, value]) => {
    cumulative += value;
    return { label, value, cumulative };
  });
}

// ── Sleep ─────────────────────────────────────────────────────────────────────
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Copy to clipboard ─────────────────────────────────────────────────────────
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
