import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { useSdk } from "./useSdk";
import type {
  SubscriptionAccount,
  PlanAccount,
} from "@solana-subscription/sdk";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function buildOptimisticSubscription(
  subscriptionPubkey: PublicKey,
  planPubkey: PublicKey,
  subscriber: PublicKey,
): SubscriptionAccount {
  const now = Math.floor(Date.now() / 1000);
  return {
    publicKey: subscriptionPubkey,
    plan: planPubkey,
    subscriber,
    subscriberTokenAccount: subscriber,
    amountUsdc: new BN(0),
    intervalSeconds: new BN(0),
    nextPaymentAt: new BN(now),
    startedAt: new BN(now),
    endedAt: new BN(0),
    lastPaidAt: new BN(0),
    lastFailedAt: new BN(0),
    totalPaid: new BN(0),
    paymentCount: new BN(0),
    consecutiveFailures: 0,
    failedPaymentCount: 0,
    totalFailures: 0,
    status: "Active",
    bump: 0,
  };
}

const KEYS = {
  subscriptions: (subscriber: string) => ["subscriptions", subscriber] as const,
  plan: (pubkey: string) => ["plan", pubkey] as const,
  allPlans: () => ["plans"] as const,
};

// ── Fetch subscriber's own subscriptions ─────────────────────────────────────
export function useMySubscriptions() {
  const wallet = useAnchorWallet();
  const sdk = useSdk();

  return useQuery({
    queryKey: KEYS.subscriptions(wallet?.publicKey.toBase58() ?? ""),
    queryFn: async (): Promise<SubscriptionAccount[]> => {
      if (!sdk || !wallet) return [];
      return sdk.fetchSubscriberSubscriptions(wallet.publicKey);
    },
    enabled: !!sdk && !!wallet,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

// ── Fetch a single plan ───────────────────────────────────────────────────────
export function usePlan(pubkeyStr: string | null | undefined) {
  const sdk = useSdk();

  return useQuery({
    queryKey: KEYS.plan(pubkeyStr ?? ""),
    queryFn: async (): Promise<PlanAccount | null> => {
      if (!sdk || !pubkeyStr) return null;
      return sdk.fetchPlan(new PublicKey(pubkeyStr));
    },
    enabled: !!sdk && !!pubkeyStr,
    staleTime: 60_000,
  });
}

// ── Subscribe mutation ────────────────────────────────────────────────────────
export function useSubscribe() {
  const sdk = useSdk();
  const wallet = useAnchorWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (planPubkey: string) => {
      if (!sdk) throw new Error("Connect your wallet first");
      return sdk.createSubscription({ planPubkey: new PublicKey(planPubkey) });
    },
    onSuccess: async (result, planPubkey) => {
      if (!wallet) return;

      const queryKey = KEYS.subscriptions(wallet.publicKey.toBase58());

      if (sdk) {
        const optimistic = buildOptimisticSubscription(
          result.subscriptionPubkey,
          new PublicKey(planPubkey),
          wallet.publicKey,
        );

        queryClient.setQueryData<SubscriptionAccount[]>(queryKey, (prev) => {
          const current = Array.isArray(prev) ? prev : [];
          const filtered = current.filter(
            (s) => s.publicKey.toBase58() !== optimistic.publicKey.toBase58(),
          );
          return [optimistic, ...filtered];
        });

        for (let attempt = 0; attempt < 8; attempt += 1) {
          const fresh = await sdk.fetchSubscription(result.subscriptionPubkey);
          if (fresh) {
            queryClient.setQueryData<SubscriptionAccount[]>(
              queryKey,
              (prev) => {
                const current = Array.isArray(prev) ? prev : [];
                const filtered = current.filter(
                  (s) => s.publicKey.toBase58() !== fresh.publicKey.toBase58(),
                );
                return [fresh, ...filtered];
              },
            );
            break;
          }

          await sleep(350 * (attempt + 1));
        }
      }

      queryClient.invalidateQueries({ queryKey });
    },
  });
}

// ── Cancel mutation ───────────────────────────────────────────────────────────
export function useCancelSubscription() {
  const sdk = useSdk();
  const wallet = useAnchorWallet();
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
  const sdk = useSdk();
  const wallet = useAnchorWallet();
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
  const sdk = useSdk();
  const wallet = useAnchorWallet();
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
