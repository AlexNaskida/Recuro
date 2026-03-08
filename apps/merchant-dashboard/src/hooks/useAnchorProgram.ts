import { useMemo } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { createSdk, createReadOnlyProgram } from "@/lib/anchor";
import type { SubscriptionSdk } from "@solana-subscription/sdk";

/**
 * Returns the SubscriptionSdk when a wallet is connected,
 * or null if no wallet is present (read-only mode).
 */
export function useSdk(): SubscriptionSdk | null {
  const { connection } = useConnection();
  const wallet         = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) return null;
    return createSdk(connection, wallet);
  }, [connection, wallet]);
}

/**
 * Returns a read-only Anchor Program instance for fetching accounts
 * without requiring a connected wallet.
 */
export function useReadOnlyProgram() {
  const { connection } = useConnection();
  return useMemo(() => createReadOnlyProgram(connection), [connection]);
}
