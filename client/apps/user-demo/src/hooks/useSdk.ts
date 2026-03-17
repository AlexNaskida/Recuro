import { useMemo } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { createUserSdk } from "@/lib/sdk";
import type { SubscriptionSdk } from "@solana-subscription/sdk";

export function useSdk(): SubscriptionSdk | null {
  const { connection } = useConnection();
  const wallet         = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) return null;
    return createUserSdk(connection, wallet);
  }, [connection, wallet]);
}
