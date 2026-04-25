import { useMemo } from "react";
import { Transaction, PublicKey } from "@solana/web3.js";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets, useSignTransaction } from "@privy-io/react-auth/solana";

export function useMerchantWallet() {
  const privy = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { signTransaction } = useSignTransaction();

  const connectedWallet = wallets[0] ?? null;
  const walletAddress = connectedWallet?.address ?? "";

  const publicKey = useMemo(() => {
    if (!walletAddress) return null;
    return new PublicKey(walletAddress);
  }, [walletAddress]);

  const anchorWallet = useMemo(() => {
    if (!connectedWallet || !publicKey) return null;

    return {
      publicKey,
      signTransaction: async (transaction: Transaction) => {
        const serialized = transaction.serialize({
          requireAllSignatures: false,
          verifySignatures: false,
        });
        const result = await signTransaction({
          transaction: serialized,
          wallet: connectedWallet,
        });
        return Transaction.from(result.signedTransaction);
      },
      signAllTransactions: async (transactions: Transaction[]) => {
        const signedTransactions = [] as Transaction[];

        for (const transaction of transactions) {
          const signed = await signTransaction({
            transaction: transaction.serialize({
              requireAllSignatures: false,
              verifySignatures: false,
            }),
            wallet: connectedWallet,
          });
          signedTransactions.push(Transaction.from(signed.signedTransaction));
        }

        return signedTransactions;
      },
    };
  }, [connectedWallet, publicKey, signTransaction]);

  return {
    ready: privy.ready && walletsReady,
    authenticated: privy.authenticated,
    connected: privy.authenticated && !!connectedWallet,
    connecting: !privy.ready || !walletsReady,
    publicKey,
    walletAddress,
    wallet: anchorWallet,
    walletCount: wallets.length,
    connectWallet: privy.connectWallet,
    connectOrCreateWallet: privy.connectOrCreateWallet,
    login: privy.login,
    logout: privy.logout,
  };
}
