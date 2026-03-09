import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { useToast } from "@/components/ui/use-toast";
import { useSdk } from "./useAnchorProgram";
import type { CreatePlanParams, PlanAccount } from "@solana-subscription/sdk";

const QUERY_KEYS = {
  plans:        (merchant: string) => ["plans", merchant] as const,
  plan:         (pubkey: string)   => ["plan", pubkey] as const,
  analytics:    (merchant: string) => ["analytics", merchant] as const,
  subscriptions:(planPubkey: string) => ["subscriptions", planPubkey] as const,
};

export { QUERY_KEYS };

// ── Fetch all plans for the connected merchant ────────────────────────────────
export function useMerchantPlans() {
  const wallet = useAnchorWallet();
  const sdk    = useSdk();

  return useQuery({
    queryKey:  QUERY_KEYS.plans(wallet?.publicKey.toBase58() ?? ""),
    queryFn:   async (): Promise<PlanAccount[]> => {
      if (!sdk || !wallet) return [];
      return sdk.fetchMerchantPlans(wallet.publicKey);
    },
    enabled:   !!sdk && !!wallet,
    staleTime: 30_000,
  });
}

// ── Fetch a single plan by pubkey ─────────────────────────────────────────────
export function usePlan(pubkey: string | null) {
  const sdk = useSdk();

  return useQuery({
    queryKey: QUERY_KEYS.plan(pubkey ?? ""),
    queryFn:  async (): Promise<PlanAccount | null> => {
      if (!sdk || !pubkey) return null;
      const { PublicKey } = await import("@solana/web3.js");
      return sdk.fetchPlan(new PublicKey(pubkey));
    },
    enabled: !!sdk && !!pubkey,
  });
}

// ── Create plan mutation ──────────────────────────────────────────────────────
export function useCreatePlan() {
  const sdk          = useSdk();
  const wallet       = useAnchorWallet();
  const queryClient  = useQueryClient();
  const { toast }    = useToast();

  return useMutation({
    mutationFn: async (params: CreatePlanParams) => {
      if (!sdk) throw new Error("Wallet not connected");
      return sdk.createPlan(params);
    },
    onSuccess: ({ planPubkey }, variables) => {
      toast({
        title:       "Plan deployed",
        description: `"${variables.name}" is now live on Solana.`,
        variant:     "default",
      });

      // Invalidate plans list
      if (wallet) {
        queryClient.invalidateQueries({
          queryKey: QUERY_KEYS.plans(wallet.publicKey.toBase58()),
        });
      }

      return { planPubkey };
    },
    onError: (error: Error) => {
      toast({
        title:       "Deployment failed",
        description: error.message,
        variant:     "destructive",
      });
    },
  });
}

// ── Close plan mutation ────────────────────────────────────────────────────────
export function useClosePlan() {
  const sdk         = useSdk();
  const wallet      = useAnchorWallet();
  const queryClient = useQueryClient();
  const { toast }   = useToast();

  return useMutation({
    mutationFn: async (planPubkey: string) => {
      if (!sdk) throw new Error("Wallet not connected");
      const { PublicKey } = await import("@solana/web3.js");
      return sdk.closePlan(new PublicKey(planPubkey));
    },
    onSuccess: () => {
      toast({ title: "Plan archived", description: "No new subscriptions will be accepted." });
      if (wallet) {
        queryClient.invalidateQueries({ queryKey: QUERY_KEYS.plans(wallet.publicKey.toBase58()) });
      }
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });
}

// ── Fetch plan subscriptions ──────────────────────────────────────────────────
export function usePlanSubscriptions(planPubkey: string | null) {
  const sdk = useSdk();

  return useQuery({
    queryKey: QUERY_KEYS.subscriptions(planPubkey ?? ""),
    queryFn:  async () => {
      if (!sdk || !planPubkey) return [];
      const { PublicKey } = await import("@solana/web3.js");
      return sdk.fetchPlanSubscriptions(new PublicKey(planPubkey));
    },
    enabled: !!sdk && !!planPubkey,
  });
}
