import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import BN from "bn.js";
import { createUserSdk } from "@/lib/sdk";
import type {
  SubscriptionAccount,
  SubscriptionSdk,
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
      const plans = await sdk.fetchMerchantPlans(new PublicKey(merchantPubkey));
      return plans.filter((plan) => plan.status !== "Archived");
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
    onSuccess: async (result, variables) => {
      const queryKey = ["my-subscriptions", wallet?.publicKey.toBase58()];

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

// ── Renew an expired subscription ─────────────────────────────────────────────
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
      if (!sdk) throw new Error("Wallet not connected");
      return sdk.renewSubscription(
        new PublicKey(subscriptionPubkey),
        new PublicKey(planPubkey),
      );
    },
    onSuccess: async (result) => {
      const queryKey = ["my-subscriptions", wallet?.publicKey.toBase58()];

      // Poll until the subscription shows as Active on-chain
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
