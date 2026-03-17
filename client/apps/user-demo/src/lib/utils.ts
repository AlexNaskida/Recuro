import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const tsToDate = (unix: number) => new Date(unix * 1000);

export const formatTs = (unix: number) =>
  tsToDate(unix).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

export const formatTsRelative = (unix: number) => {
  const diff = Date.now() / 1000 - unix;
  if (diff < 60)    return "just now";
  if (diff < 3600)  return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

export const formatTsFull = (unix: number) =>
  tsToDate(unix).toLocaleString("en-US", {
    month: "short", day: "numeric", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
