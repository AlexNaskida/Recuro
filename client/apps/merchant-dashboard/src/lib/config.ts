const DEFAULT_RPC_URL = "https://api.devnet.solana.com";

export const env = {
  rpcUrl: import.meta.env.VITE_RPC_URL ?? DEFAULT_RPC_URL,
} as const;
