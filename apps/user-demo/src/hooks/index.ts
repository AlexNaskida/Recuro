import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { AnchorProvider } from "@coral-xyz/anchor";
import { SubscriptionSdk } from "@solana-subscription/sdk";
import { CLUSTER, PROGRAM_ID, USDC_MINT } from "@/constants";

// ── SDK factory ───────────────────────────────────────────────────────────────
export function useSdk(): SubscriptionSdk | null {
  const { connection } = useConnection();
  const wallet         = useAnchorWallet();
  return useMemo(() => {
    if (!wallet) return null;
    const provider = new AnchorProvider(connection, wallet, { commitment: "confirmed" });
    return new SubscriptionSdk(provider, { cluster: CLUSTER, programId: PROGRAM_ID, usdcMint: USDC_MINT });
  }, [connection, wallet]);
}

// ── Fetch plan by pubkey ──────────────────────────────────────────────────────
export function usePlan(pubkey: string | null) {
  const sdk = useSdk();
  return useQuery({
    queryKey: ["plan", pubkey],
    queryFn:  async () => {
      if (!sdk || !pubkey) return null;
      return sdk.fetchPlan(new PublicKey(pubkey));
    },
    enabled: !!sdk && !!pubkey,
    staleTime: 30_000,
  });
}

// ── Fetch all subscriptions for the connected wallet ─────────────────────────
export function useMySubscriptions() {
  const sdk    = useSdk();
  const wallet = useAnchorWallet();
  return useQuery({
    queryKey: ["my-subscriptions", wallet?.publicKey.toBase58()],
    queryFn:  async () => {
      if (!sdk || !wallet) return [];
      return sdk.fetchSubscriberSubscriptions(wallet.publicKey);
    },
    enabled:         !!sdk && !!wallet,
    refetchInterval: 60_000,
  });
}

// ── Fetch single subscription ─────────────────────────────────────────────────
export function useSubscription(pubkey: string | null) {
  const sdk = useSdk();
  return useQuery({
    queryKey: ["subscription", pubkey],
    queryFn:  async () => {
      if (!sdk || !pubkey) return null;
      return sdk.fetchSubscription(new PublicKey(pubkey));
    },
    enabled: !!sdk && !!pubkey,
    refetchInterval: 30_000,
  });
}

// ── Subscribe to a plan ───────────────────────────────────────────────────────
export function useSubscribe() {
  const sdk         = useSdk();
  const wallet      = useAnchorWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planPubkey }: { planPubkey: string }) => {
      if (!sdk) throw new Error("Wallet not connected");
      return sdk.createSubscription({ planPubkey: new PublicKey(planPubkey) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions", wallet?.publicKey.toBase58()] });
    },
  });
}

// ── Cancel a subscription ─────────────────────────────────────────────────────
export function useCancelSubscription() {
  const sdk         = useSdk();
  const wallet      = useAnchorWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionPubkey: string) => {
      if (!sdk) throw new Error("Wallet not connected");
      return sdk.cancelSubscription(new PublicKey(subscriptionPubkey));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-subscriptions", wallet?.publicKey.toBase58()] });
    },
  });
}
