import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type { AnalyticsData, ExecutionLog, PlanMetrics } from "@solana-subscription/sdk";

// ── Types ─────────────────────────────────────────────────────────────────────
export type LiveEventType =
  | "payment_executed"
  | "payment_failed"
  | "subscription_created"
  | "subscription_cancelled"
  | "subscription_expired";

export interface LiveEvent {
  id:                  string;   // transaction signature
  type:                LiveEventType;
  timestamp:           number;   // unix seconds
  subscriptionPubkey:  string;
  subscriberAddress:   string;
  planPubkey?:         string;
  amountUsdc?:         number;   // human-readable USDC
  status:              "success" | "failed";
  txSignature?:        string;
}

// ── Selectors ─────────────────────────────────────────────────────────────────
interface AnalyticsState {
  // Aggregated analytics (loaded from chain)
  analytics:      AnalyticsData | null;
  isLoadingFull:  boolean;
  lastFetched:    number | null;
  fetchError:     string | null;

  // Live events from on-chain listeners
  liveEvents:     LiveEvent[];
  unreadCount:    number;

  // Per-plan drill-down selection
  selectedPlanId: string | null;

  // Time granularity for graphs
  granularity:    "day" | "week" | "month";

  // Actions
  setAnalytics:        (data: AnalyticsData) => void;
  setLoadingFull:      (v: boolean) => void;
  setFetchError:       (e: string | null) => void;
  pushLiveEvent:       (e: LiveEvent) => void;
  clearUnread:         () => void;
  setSelectedPlan:     (id: string | null) => void;
  setGranularity:      (g: "day" | "week" | "month") => void;
  reset:               () => void;
}

const INITIAL: Pick<
  AnalyticsState,
  | "analytics" | "isLoadingFull" | "lastFetched" | "fetchError"
  | "liveEvents" | "unreadCount" | "selectedPlanId" | "granularity"
> = {
  analytics:      null,
  isLoadingFull:  false,
  lastFetched:    null,
  fetchError:     null,
  liveEvents:     [],
  unreadCount:    0,
  selectedPlanId: null,
  granularity:    "day",
};

export const useAnalyticsStore = create<AnalyticsState>()(
  subscribeWithSelector((set) => ({
    ...INITIAL,

    setAnalytics: (data) =>
      set({ analytics: data, lastFetched: Date.now(), fetchError: null }),

    setLoadingFull: (v) => set({ isLoadingFull: v }),

    setFetchError: (e) => set({ fetchError: e, isLoadingFull: false }),

    pushLiveEvent: (event) =>
      set((state) => ({
        liveEvents:  [event, ...state.liveEvents].slice(0, 500), // keep last 500
        unreadCount: state.unreadCount + 1,
      })),

    clearUnread: () => set({ unreadCount: 0 }),

    setSelectedPlan: (id) => set({ selectedPlanId: id }),

    setGranularity: (g) => set({ granularity: g }),

    reset: () => set(INITIAL),
  }))
);

// ── Derived selectors (use outside components for perf) ───────────────────────
export const selectFilteredEvents = (
  store: AnalyticsState,
  types?: LiveEventType[]
): LiveEvent[] =>
  types
    ? store.liveEvents.filter((e) => types.includes(e.type))
    : store.liveEvents;

export const selectPlanById = (
  store: AnalyticsState,
  planId: string
): PlanMetrics | undefined =>
  store.analytics?.plans.find((p) => p.planPubkey === planId);
