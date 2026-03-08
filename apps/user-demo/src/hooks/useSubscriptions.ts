import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useSdk } from "./useSdk";
import type { SubscriptionAccount, PlanAccount } from "@solana-subscription/sdk";

const KEYS = {
  subscriptions: (subscriber: string)  => ["subscriptions", subscriber] as const,
  plan:          (pubkey: string)       => ["plan", pubkey] as const,
  allPlans:      ()                     => ["plans"] as const,
};

// ── Fetch subscriber's own subscriptions ─────────────────────────────────────
export function useMySubscriptions() {
  const wallet = useAnchorWallet();
  const sdk    = useSdk();

  return useQuery({
    queryKey: KEYS.subscriptions(wallet?.publicKey.toBase58() ?? ""),
    queryFn:  async (): Promise<SubscriptionAccount[]> => {
      if (!sdk || !wallet) return [];
      return sdk.fetchSubscriberSubscriptions(wallet.publicKey);
    },
    enabled:        !!sdk && !!wallet,
    staleTime:      30_000,
    refetchInterval: 60_000,
  });
}

// ── Fetch a single plan ───────────────────────────────────────────────────────
export function usePlan(pubkeyStr: string | null | undefined) {
  const sdk = useSdk();

  return useQuery({
    queryKey: KEYS.plan(pubkeyStr ?? ""),
    queryFn:  async (): Promise<PlanAccount | null> => {
      if (!sdk || !pubkeyStr) return null;
      return sdk.fetchPlan(new PublicKey(pubkeyStr));
    },
    enabled:   !!sdk && !!pubkeyStr,
    staleTime: 60_000,
  });
}

// ── Subscribe mutation ────────────────────────────────────────────────────────
export function useSubscribe() {
  const sdk         = useSdk();
  const wallet      = useAnchorWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planPubkey: string) => {
      if (!sdk) throw new Error("Connect your wallet first");
      return sdk.createSubscription({ planPubkey: new PublicKey(planPubkey) });
    },
    onSuccess: () => {
      if (wallet) {
        queryClient.invalidateQueries({
          queryKey: KEYS.subscriptions(wallet.publicKey.toBase58()),
        });
      }
    },
  });
}

// ── Cancel mutation ───────────────────────────────────────────────────────────
export function useCancelSubscription() {
  const sdk         = useSdk();
  const wallet      = useAnchorWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionPubkey: string) => {
      if (!sdk) throw new Error("Connect your wallet first");
      return sdk.cancelSubscription(new PublicKey(subscriptionPubkey));
    },
    onSuccess: () => {
      if (wallet) {
        queryClient.invalidateQueries({
          queryKey: KEYS.subscriptions(wallet.publicKey.toBase58()),
        });
      }
    },
  });
}

// ── Pause mutation ────────────────────────────────────────────────────────────
export function usePauseSubscription() {
  const sdk         = useSdk();
  const wallet      = useAnchorWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionPubkey: string) => {
      if (!sdk) throw new Error("Connect your wallet first");
      return sdk.pauseSubscription(new PublicKey(subscriptionPubkey));
    },
    onSuccess: () => {
      if (wallet) {
        queryClient.invalidateQueries({
          queryKey: KEYS.subscriptions(wallet.publicKey.toBase58()),
        });
      }
    },
  });
}

// ── Resume mutation ───────────────────────────────────────────────────────────
export function useResumeSubscription() {
  const sdk         = useSdk();
  const wallet      = useAnchorWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionPubkey: string) => {
      if (!sdk) throw new Error("Connect your wallet first");
      return sdk.resumeSubscription(new PublicKey(subscriptionPubkey));
    },
    onSuccess: () => {
      if (wallet) {
        queryClient.invalidateQueries({
          queryKey: KEYS.subscriptions(wallet.publicKey.toBase58()),
        });
      }
    },
  });
}
