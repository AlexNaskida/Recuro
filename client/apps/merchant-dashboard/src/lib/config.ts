const DEFAULT_RPC_URL = "https://api.devnet.solana.com";

function parseEnvBoolean(
  value: string | undefined,
  fallback: boolean,
): boolean {
  if (value == null) return fallback;
  return ["1", "true", "yes", "on"].includes(value.toLowerCase());
}

export const CLUSTER = import.meta.env.VITE_SOLANA_CLUSTER ?? "devnet";
export const PROGRAM_ID = import.meta.env.VITE_PROGRAM_ID;
export const RPC_URL = import.meta.env.VITE_RPC_URL ?? DEFAULT_RPC_URL;

export const USDC_MINT =
  import.meta.env.VITE_USDC_MINT ??
  "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";

export const MERCHANT = import.meta.env.VITE_MERCHANT_WALLET ?? null;
export const SHOW_MOCK_DATA = parseEnvBoolean(
  import.meta.env.VITE_SHOW_MOCK_DATA,
  true,
);
