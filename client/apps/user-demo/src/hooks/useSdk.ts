import { useMemo } from "react";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";

import { Connection, PublicKey } from "@solana/web3.js";
import type { AnchorWallet } from "@solana/wallet-adapter-react";
import { createUserSdk } from "@/lib/sdk";
import type { SubscriptionSdk } from "@recuro/sdk";

export function useSdk(): SubscriptionSdk | null {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();

  return useMemo(() => {
    if (!wallet) {
      const rpcUrl =
        import.meta.env.VITE_RPC_URL ?? "https://api.devnet.solana.com";
      const readConnection = new Connection(rpcUrl, "confirmed");
      const readOnlyWallet = {
        publicKey: PublicKey.default,
        signTransaction: async (tx) => tx,
        signAllTransactions: async (txs) => txs,
      } as unknown as AnchorWallet;
      return createUserSdk(readConnection, readOnlyWallet);
    }

    return createUserSdk(connection, wallet);
  }, [connection, wallet]);
}
