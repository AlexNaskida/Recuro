import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";
import BN from "bn.js";
import { useSdk } from "@/hooks/useSdk";
import type { SubscriptionAccount } from "@recuro/sdk";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout<T>(promise: Promise<T>, ms: number, message: string) {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error(message)), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

function deriveAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
): PublicKey {
  const tokenProgramId = new PublicKey(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
  );
  const associatedTokenProgramId = new PublicKey(
    "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL",
  );

  return PublicKey.findProgramAddressSync(
    [owner.toBuffer(), tokenProgramId.toBuffer(), mint.toBuffer()],
    associatedTokenProgramId,
  )[0];
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
      const toSafeNumber = (bn: BN): number | null => {
        const raw = bn.toString(10);
        const num = Number(raw);
        return Number.isSafeInteger(num) ? num : null;
      };

      const plans = await sdk.fetchMerchantPlans(new PublicKey(merchantPubkey));

      // First remove archived and dedupe by pubkey.
      const base = Array.from(
        new Map(
          plans
            .filter((plan) => plan.status !== "Archived")
            .map((plan) => [plan.publicKey.toBase58(), plan]),
        ).values(),
      );

      // Only keep plans that satisfy PDA seeds and have sane business fields.
      const valid = base.filter((plan) => {
        const [expectedPlanPda] = PublicKey.findProgramAddressSync(
          [
            Buffer.from("plan"),
            plan.merchant.toBuffer(),
            plan.planId.toArrayLike(Buffer, "le", 8),
          ],
          sdk.programId,
        );

        const seedValid = expectedPlanPda.equals(plan.publicKey);
        const amount = toSafeNumber(plan.amountUsdc);
        const interval = toSafeNumber(plan.intervalSeconds);
        const hasName = !!plan.name?.trim();
        return seedValid && hasName && (amount ?? 0) > 0 && (interval ?? 0) > 0;
      });

      if (base.length > 0 && valid.length === 0) {
        console.warn(
          "[user-demo] all plans were filtered out (seed-invalid or zero/blank fields)",
        );
      }

      return valid;
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

      const boundProgramId = (sdk.program as any)?.programId as
        | PublicKey
        | undefined;
      if (!boundProgramId || !boundProgramId.equals(sdk.programId)) {
        throw new Error(
          `SDK program binding mismatch. bound=${boundProgramId?.toBase58() ?? "unknown"} expected=${sdk.programId.toBase58()}. Restart dev server and hard refresh.`,
        );
      }

      const plan = new PublicKey(planPubkey);
      const decodedPlan = await withTimeout(
        sdk.fetchPlan(plan),
        12_000,
        "Timed out reading plan account from RPC.",
      );

      if (!decodedPlan) {
        throw new Error("Plan not found on chain.");
      }

      if (decodedPlan.status !== "Active") {
        throw new Error("Plan is not accepting new subscribers.");
      }

      const subscriber = wallet.publicKey;
      const [subscriptionPubkey] = PublicKey.findProgramAddressSync(
        [Buffer.from("subscription"), plan.toBuffer(), subscriber.toBuffer()],
        sdk.programId,
      );

      const subscriberTokenAccount = deriveAssociatedTokenAddress(
        sdk.usdcMint,
        subscriber,
      );

      const signature = await withTimeout(
        (sdk.program as any).methods
          .createSubscription()
          .accountsPartial({
            subscriber,
            usdcMint: sdk.usdcMint,
            plan,
            subscription: subscriptionPubkey,
            subscriberTokenAccount,
          })
          .rpc({ commitment: "confirmed" }),
        30_000,
        "No wallet prompt or RPC confirmation within 30s. Reconnect wallet and try again.",
      );

      return { signature: String(signature), subscriptionPubkey };
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
