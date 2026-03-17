const DEFAULT_RPC_URL = "https://api.devnet.solana.com";

export const RPC_URL =
  import.meta.env.VITE_RPC_URL ??
  import.meta.env.VITE_RPC_ENDPOINT ??
  DEFAULT_RPC_URL;

export const MERCHANT = import.meta.env.VITE_MERCHANT_WALLET ?? null;

export const FEATURED_PLANS: string[] = (
  import.meta.env.VITE_FEATURED_PLANS ?? ""
)
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);
