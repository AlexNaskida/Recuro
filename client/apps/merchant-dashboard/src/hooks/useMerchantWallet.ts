import { useMemo } from "react";
import { Transaction, PublicKey } from "@solana/web3.js";
import { usePrivy } from "@privy-io/react-auth";
import { useWallet } from "@solana/wallet-adapter-react";

export function useMerchantWallet() {
  const privy = usePrivy();
  const {
    publicKey: adapterPublicKey,
    signTransaction: adapterSignTransaction,
    signAllTransactions: adapterSignAllTransactions,
  } = useWallet();

  const connectedWallet = adapterPublicKey
    ? {
        address: adapterPublicKey.toString(),
      }
    : null;
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
    if (!adapterPublicKey || !publicKey) return null;

    return {
      publicKey,
      signTransaction: async (transaction: Transaction) => {
        if (!adapterSignTransaction)
          throw new Error("wallet cannot sign transactions");
        const signed = await adapterSignTransaction(transaction);
        return signed;
      },
      signAllTransactions: async (transactions: Transaction[]) => {
        if (adapterSignAllTransactions) {
          return adapterSignAllTransactions(transactions);
        }

        const signed: Transaction[] = [];
        for (const tx of transactions) {
          if (!adapterSignTransaction)
            throw new Error("wallet cannot sign transactions");
          signed.push(await adapterSignTransaction(tx));
        }
        return signed;
      },
    };
  }, [
    adapterPublicKey,
    publicKey,
    adapterSignTransaction,
    adapterSignAllTransactions,
  ]);

  const canSignTransactions = !!anchorWallet;

  return {
    ready: privy.ready,
    authenticated: privy.authenticated,
    connected: privy.authenticated && !!walletAddress,
    canSignTransactions,
    connecting: !privy.ready,
    publicKey,
    walletAddress,
    wallet: anchorWallet,
    walletCount: connectedWallet ? 1 : 0,
    connectWallet: privy.connectWallet,
    connectOrCreateWallet: privy.connectOrCreateWallet,
    link: privy.link,
    login: privy.login,
    logout: privy.logout,
  };
}
