import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { useSdk } from "@/hooks/useSdk";
import type { SubscriptionAccount } from "@recuro/sdk";

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

export const SUBSCRIPTION_QUERY_KEYS = {
  all: ["subscriptions"] as const,
  my: (wallet: string | undefined) => ["my-subscriptions", wallet] as const,
  merchantPlans: (merchantPubkey: string | null) =>
    ["merchant-plans", merchantPubkey] as const,
  plan: (pubkey: string | null) => ["plan", pubkey] as const,
  subscription: (pubkey: string | null) => ["subscription", pubkey] as const,
};

export function usePlan(pubkey: string | null) {
  const sdk = useSdk();
  return useQuery({
    queryKey: SUBSCRIPTION_QUERY_KEYS.plan(pubkey),
    queryFn: async () => {
      if (!sdk || !pubkey) return null;
      return sdk.fetchPlan(new PublicKey(pubkey));
    },
    enabled: !!sdk && !!pubkey,
    staleTime: 30_000,
  });
}

export function useMySubscriptions() {
  const sdk = useSdk();
  const wallet = useAnchorWallet();
  return useQuery({
    queryKey: SUBSCRIPTION_QUERY_KEYS.my(wallet?.publicKey.toBase58()),
    queryFn: async () => {
      if (!sdk || !wallet) return [];
      return sdk.fetchSubscriberSubscriptions(wallet.publicKey);
    },
    enabled: !!sdk && !!wallet,
    refetchInterval: 60_000,
  });
}

export function useMerchantPlans(merchantPubkey: string | null) {
  const sdk = useSdk();
  return useQuery({
    queryKey: SUBSCRIPTION_QUERY_KEYS.merchantPlans(merchantPubkey),
    queryFn: async () => {
      if (!sdk || !merchantPubkey) return [];
      const plans = await sdk.fetchMerchantPlans(new PublicKey(merchantPubkey));

      // First remove archived and dedupe by pubkey.
      const base = Array.from(
        new Map(
          plans
            .filter((plan) => plan.status !== "Archived")
            .map((plan) => [plan.publicKey.toBase58(), plan]),
        ).values(),
      );

      // Prefer valid-looking plans, but never return empty because of strict guards.
      const valid = base.filter((plan) => {
        const amount = plan.amountUsdc.toNumber();
        const interval = plan.intervalSeconds.toNumber();
        const hasName = !!plan.name?.trim();
        return hasName && amount > 0 && interval > 0;
      });

      // Fallback: if strict validation removes all entries, return base list.
      return valid.length > 0 ? valid : base;
    },
    enabled: !!merchantPubkey && !!sdk,
    staleTime: 30_000,
  });
}

export function useSubscription(pubkey: string | null) {
  const sdk = useSdk();
  return useQuery({
    queryKey: SUBSCRIPTION_QUERY_KEYS.subscription(pubkey),
    queryFn: async () => {
      if (!sdk || !pubkey) return null;
      return sdk.fetchSubscription(new PublicKey(pubkey));
    },
    enabled: !!sdk && !!pubkey,
    refetchInterval: 30_000,
  });
}

export function useSubscribe() {
  const sdk = useSdk();
  const wallet = useAnchorWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ planPubkey }: { planPubkey: string }) => {
      if (!sdk || !wallet) throw new Error("Wallet not connected");
      return sdk.createSubscription({ planPubkey: new PublicKey(planPubkey) });
    },
    onSuccess: async (result, variables) => {
      const queryKey = SUBSCRIPTION_QUERY_KEYS.my(wallet?.publicKey.toBase58());

      if (sdk && wallet) {
        const optimistic = buildOptimisticSubscription(
          result.subscriptionPubkey,
          new PublicKey(variables.planPubkey),
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

export function useRenewSubscription() {
  const sdk = useSdk();
  const wallet = useAnchorWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      subscriptionPubkey,
      planPubkey,
    }: {
      subscriptionPubkey: string;
      planPubkey: string;
    }) => {
      if (!sdk || !wallet) throw new Error("Wallet not connected");
      return sdk.renewSubscription(
        new PublicKey(subscriptionPubkey),
        new PublicKey(planPubkey),
      );
    },
    onSuccess: async (result) => {
      const queryKey = SUBSCRIPTION_QUERY_KEYS.my(wallet?.publicKey.toBase58());

      if (sdk) {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const fresh = await sdk.fetchSubscription(
            new PublicKey(result.subscriptionPubkey),
          );
          if (fresh && fresh.status === "Active") {
            queryClient.setQueryData<SubscriptionAccount[]>(
              queryKey,
              (prev) => {
                const current = Array.isArray(prev) ? prev : [];
                return current.map((s) =>
                  s.publicKey.toBase58() === fresh.publicKey.toBase58()
                    ? fresh
                    : s,
                );
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

export function useCancelSubscription() {
  const sdk = useSdk();
  const wallet = useAnchorWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionPubkey: string) => {
      if (!sdk || !wallet) throw new Error("Wallet not connected");
      return sdk.cancelSubscription(new PublicKey(subscriptionPubkey));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: SUBSCRIPTION_QUERY_KEYS.my(wallet?.publicKey.toBase58()),
      });
    },
  });
}

export function usePauseSubscription() {
  const sdk = useSdk();
  const wallet = useAnchorWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionPubkey: string) => {
      if (!sdk || !wallet) throw new Error("Wallet not connected");
      return sdk.pauseSubscription(new PublicKey(subscriptionPubkey));
    },
    onSuccess: async (_result, subscriptionPubkey) => {
      const queryKey = SUBSCRIPTION_QUERY_KEYS.my(wallet?.publicKey.toBase58());

      queryClient.setQueryData<SubscriptionAccount[]>(queryKey, (prev) => {
        const current = Array.isArray(prev) ? prev : [];
        return current.map((sub) =>
          sub.publicKey.toBase58() === subscriptionPubkey
            ? { ...sub, status: "Paused" }
            : sub,
        );
      });

      if (sdk) {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const fresh = await sdk.fetchSubscription(
            new PublicKey(subscriptionPubkey),
          );
          if (fresh?.status === "Paused") {
            queryClient.setQueryData<SubscriptionAccount[]>(
              queryKey,
              (prev) => {
                const current = Array.isArray(prev) ? prev : [];
                return current.map((sub) =>
                  sub.publicKey.toBase58() === subscriptionPubkey ? fresh : sub,
                );
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

export function useResumeSubscription() {
  const sdk = useSdk();
  const wallet = useAnchorWallet();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (subscriptionPubkey: string) => {
      if (!sdk || !wallet) throw new Error("Wallet not connected");
      return sdk.resumeSubscription(new PublicKey(subscriptionPubkey));
    },
    onSuccess: async (_result, subscriptionPubkey) => {
      const queryKey = SUBSCRIPTION_QUERY_KEYS.my(wallet?.publicKey.toBase58());

      queryClient.setQueryData<SubscriptionAccount[]>(queryKey, (prev) => {
        const current = Array.isArray(prev) ? prev : [];
        return current.map((sub) =>
          sub.publicKey.toBase58() === subscriptionPubkey
            ? { ...sub, status: "Active" }
            : sub,
        );
      });

      if (sdk) {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          const fresh = await sdk.fetchSubscription(
            new PublicKey(subscriptionPubkey),
          );
          if (fresh?.status === "Active") {
            queryClient.setQueryData<SubscriptionAccount[]>(
              queryKey,
              (prev) => {
                const current = Array.isArray(prev) ? prev : [];
                return current.map((sub) =>
                  sub.publicKey.toBase58() === subscriptionPubkey ? fresh : sub,
                );
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
