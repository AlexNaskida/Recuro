import { useQuery } from "@tanstack/react-query";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { useSdk } from "./useAnchorProgram";
import { useAnalyticsStore } from "@/store/analyticsStore";
import { QUERY_KEYS } from "./useMerchantPlans";
import type { AnalyticsData } from "@solana-subscription/sdk";

export function useAnalytics() {
  const wallet    = useAnchorWallet();
  const sdk       = useSdk();
  const setData   = useAnalyticsStore((s) => s.setAnalytics);
  const setError  = useAnalyticsStore((s) => s.setFetchError);
  const setLoading = useAnalyticsStore((s) => s.setLoadingFull);

  return useQuery<AnalyticsData>({
    queryKey: QUERY_KEYS.analytics(wallet?.publicKey.toBase58() ?? ""),
    queryFn:  async () => {
      if (!sdk || !wallet) throw new Error("Wallet not connected");
      setLoading(true);
      try {
        const data = await sdk.getAnalytics(wallet.publicKey);
        setData(data);
        return data;
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : "Unknown error";
        setError(msg);
        throw e;
      } finally {
        setLoading(false);
      }
    },
    enabled:         !!sdk && !!wallet,
    staleTime:       60_000,
    refetchInterval: 120_000,
  });
}
