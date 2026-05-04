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
export const QVAC_BASE_URL =
  import.meta.env.VITE_QVAC_BASE_URL ?? "http://localhost:11434/v1";
export const QVAC_MODEL = import.meta.env.VITE_QVAC_MODEL ?? "recuro-assistant";

export const STABLECOIN_MINTS = {
  USDC: import.meta.env.VITE_USDC_MINT ?? "",
  USDT: import.meta.env.VITE_USDT_MINT ?? "",
  PYUSD: import.meta.env.VITE_PYUSD_MINT ?? "",
} as const;

export const USDC_MINT = STABLECOIN_MINTS.USDC;
export const USDT_MINT = STABLECOIN_MINTS.USDT;
export const PYUSD_MINT = STABLECOIN_MINTS.PYUSD;

export const MERCHANT = import.meta.env.VITE_MERCHANT_WALLET ?? null;
export const SHOW_MOCK_DATA = parseEnvBoolean(
  import.meta.env.VITE_SHOW_MOCK_DATA,
  true,
);
