import { useEffect, useMemo } from "react";
import {
  Transaction,
  VersionedTransaction,
  PublicKey,
} from "@solana/web3.js";
import { usePrivy } from "@privy-io/react-auth";
import {
  useSignTransaction,
  useWallets as useSolanaWallets,
} from "@privy-io/react-auth/solana";

// Only accept Solana addresses (base58, 32–44 chars). Skip EVM (0x…) addresses.
const isLikelySolanaAddress = (value: unknown): value is string =>
  typeof value === "string" && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(value);

export function useMerchantWallet() {
  const privy = usePrivy();
  const { wallets: solanaWallets } = useSolanaWallets();
  const { signTransaction: privySignTransaction } = useSignTransaction();

  // Pick the active Solana wallet from Privy. Prefer one matching a Solana
  // address found in privy.user (covers external + embedded wallets).
  const linkedAccounts =
    ((privy.user as any)?.linkedAccounts as Array<any> | undefined) ?? [];
  const preferredAddress =
    (linkedAccounts.find(
      (a) =>
        a?.chainType === "solana" && isLikelySolanaAddress(a?.address),
    )?.address as string | undefined) ??
    (linkedAccounts.find((a) => isLikelySolanaAddress(a?.address))
      ?.address as string | undefined);

  const activeWallet =
    solanaWallets.find((w) => w.address === preferredAddress) ??
    solanaWallets.find((w) => isLikelySolanaAddress(w.address)) ??
    null;

  const walletAddress =
    activeWallet?.address ??
    preferredAddress ??
    "";

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
    if (!publicKey || !activeWallet) return null;

    const signOne = async <T extends Transaction | VersionedTransaction>(
      tx: T,
    ): Promise<T> => {
      const isVersioned = "version" in tx;
      const serialized = isVersioned
        ? (tx as VersionedTransaction).serialize()
        : (tx as Transaction).serialize({ requireAllSignatures: false });
      const { signedTransaction } = await privySignTransaction({
        transaction: serialized,
        wallet: activeWallet,
      });
      return (
        isVersioned
          ? VersionedTransaction.deserialize(signedTransaction)
          : Transaction.from(signedTransaction)
      ) as T;
    };

    return {
      publicKey,
      signTransaction: signOne,
      signAllTransactions: async <
        T extends Transaction | VersionedTransaction,
      >(
        txs: T[],
      ): Promise<T[]> => {
        const signed: T[] = [];
        for (const tx of txs) {
          signed.push(await signOne(tx));
        }
        return signed;
      },
    };
  }, [publicKey, activeWallet, privySignTransaction]);

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
    walletCount: activeWallet ? 1 : 0,
    connectWallet: privy.connectWallet,
    connectOrCreateWallet: privy.connectOrCreateWallet,
    link: privy.link,
    login: privy.login,
    logout: privy.logout,
  };
}
