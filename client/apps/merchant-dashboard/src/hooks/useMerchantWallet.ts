import { useMemo } from "react";
import { Transaction, PublicKey } from "@solana/web3.js";
import { usePrivy } from "@privy-io/react-auth";
import { useWallets, useSignTransaction } from "@privy-io/react-auth/solana";

export function useMerchantWallet() {
  const privy = usePrivy();
  const { wallets, ready: walletsReady } = useWallets();
  const { signTransaction } = useSignTransaction();

  const connectedWallet =
    wallets.find(
      (wallet) =>
        typeof wallet.address === "string" && wallet.address.length > 0,
    ) ?? null;
  const fallbackWalletAddress =
    ((privy.user as any)?.wallet?.address as string | undefined) ??
    (((privy.user as any)?.linkedAccounts as Array<any> | undefined)?.find(
      (account) =>
        account?.chainType === "solana" && typeof account?.address === "string",
    )?.address as string | undefined) ??
    "";
  const walletAddress = connectedWallet?.address ?? fallbackWalletAddress;

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
    ready: privy.ready,
    authenticated: privy.authenticated,
    connected: privy.authenticated && !!walletAddress,
    connecting: !privy.ready,
    publicKey,
    walletAddress,
    wallet: anchorWallet,
    walletCount: wallets.length,
    connectWallet: privy.connectWallet,
    connectOrCreateWallet: privy.connectOrCreateWallet,
    link: privy.link,
    login: privy.login,
    logout: privy.logout,
  };
}
