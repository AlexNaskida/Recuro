import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { createUserSdk } from "@/lib/sdk";
import type { SubscriptionSdk } from "@solana-subscription/sdk";

// ── SDK factory ───────────────────────────────────────────────────────────────
export function useSdk(): SubscriptionSdk | null {
  const { connection } = useConnection();
  const wallet = useAnchorWallet();
  return useMemo(() => {
    if (!wallet) {
      // read-only — no wallet needed for fetching plans
      const rpcUrl =
        import.meta.env.VITE_RPC_URL ?? "https://api.devnet.solana.com";
      const readConn = new Connection(rpcUrl, "confirmed");
      const dummyWallet = {
        publicKey: PublicKey.default,
        signTransaction: async (t: any) => t,
        signAllTransactions: async (t: any) => t,
      };
      return createUserSdk(readConn, dummyWallet as any);
    }
    return createUserSdk(connection, wallet);
  }, [connection, wallet]);
}

// ── Fetch plan by pubkey ──────────────────────────────────────────────────────
export function usePlan(pubkey: string | null) {
  const sdk = useSdk();
  return useQuery({
    queryKey: ["plan", pubkey],
    queryFn: async () => {
      if (!sdk || !pubkey) return null;
      return sdk.fetchPlan(new PublicKey(pubkey));
    },
    enabled: !!sdk && !!pubkey,
    staleTime: 30_000,
  });
}

// ── Fetch all subscriptions for the connected wallet ─────────────────────────
export function useMySubscriptions() {
  const sdk = useSdk();
  const wallet = useAnchorWallet();
  return useQuery({
    queryKey: ["my-subscriptions", wallet?.publicKey.toBase58()],
    queryFn: async () => {
      if (!sdk || !wallet) return [];
      return sdk.fetchSubscriberSubscriptions(wallet.publicKey);
    },
    enabled: !!sdk && !!wallet,
    refetchInterval: 60_000,
  });
}

// --- Fetch all plans belonging to merchant ─────────────────────────────────
export function useMerchantPlans(merchantPubkey: string | null) {
  const sdk = useSdk();
  return useQuery({
    queryKey: ["merchant-plans", merchantPubkey],
    queryFn: async () => {
      if (!sdk || !merchantPubkey) return [];
      return sdk.fetchMerchantPlans(new PublicKey(merchantPubkey));
    },
    enabled: !!merchantPubkey && !!sdk,
    staleTime: 30_000,
  });
}

// ── Fetch single subscription ─────────────────────────────────────────────────
export function useSubscription(pubkey: string | null) {
  const sdk = useSdk();
  return useQuery({
    queryKey: ["subscription", pubkey],
    queryFn: async () => {
      if (!sdk || !pubkey) return null;
      return sdk.fetchSubscription(new PublicKey(pubkey));
    },
    enabled: !!sdk && !!pubkey,
    refetchInterval: 30_000,
  });
}

// ── Subscribe to a plan ───────────────────────────────────────────────────────
export function useSubscribe() {
  const sdk = useSdk();
  const wallet = useAnchorWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planPubkey }: { planPubkey: string }) => {
      if (!sdk) throw new Error("Wallet not connected");
      return sdk.createSubscription({ planPubkey: new PublicKey(planPubkey) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["my-subscriptions", wallet?.publicKey.toBase58()],
      });
    },
  });
}

// ── Cancel a subscription ─────────────────────────────────────────────────────
export function useCancelSubscription() {
  const sdk = useSdk();
  const wallet = useAnchorWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionPubkey: string) => {
      if (!sdk) throw new Error("Wallet not connected");
      return sdk.cancelSubscription(new PublicKey(subscriptionPubkey));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["my-subscriptions", wallet?.publicKey.toBase58()],
      });
    },
  });
}
