import { useEffect, useMemo } from "react";
import { Transaction, PublicKey } from "@solana/web3.js";
import { usePrivy } from "@privy-io/react-auth";
import { useWallet } from "@solana/wallet-adapter-react";

// Only accept Solana addresses (base58, 32–44 chars). Skip EVM (0x…) addresses.
const isLikelySolanaAddress = (value: unknown): value is string =>
  typeof value === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);

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

  const linkedAccounts =
    ((privy.user as any)?.linkedAccounts as Array<any> | undefined) ?? [];

  // First, prefer an explicitly Solana-tagged linked account
  const linkedSolanaAddress = linkedAccounts.find(
    (account) =>
      account?.chainType === "solana" && isLikelySolanaAddress(account?.address),
  )?.address as string | undefined;

  // Otherwise, take any base58-shaped address from linkedAccounts
  const anyBase58Linked = linkedAccounts.find((account) =>
    isLikelySolanaAddress(account?.address),
  )?.address as string | undefined;

  const privyWalletAddress = (privy.user as any)?.wallet?.address as
    | string
    | undefined;

  const fallbackWalletAddress =
    (isLikelySolanaAddress(privyWalletAddress) && privyWalletAddress) ||
    linkedSolanaAddress ||
    anyBase58Linked ||
    "";

  const walletAddress = connectedWallet?.address ?? fallbackWalletAddress;

  // If authenticated but we couldn't find a Solana address (e.g. a leftover
  // EVM session from a previous config), force a logout so the user can
  // reconnect under the Solana-only flow.
  useEffect(() => {
    if (!privy.ready) return;
    if (privy.authenticated && !walletAddress) {
      void privy.logout();
    }
  }, [privy.ready, privy.authenticated, walletAddress, privy]);

  const publicKey = useMemo(() => {
    if (!walletAddress) return null;
    try {
      return new PublicKey(walletAddress);
    } catch {
      return null;
    }
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
    connected: !!walletAddress,
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
