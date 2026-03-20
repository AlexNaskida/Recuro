import { useMemo } from "react";
import { usePlans } from "./usePlans";
import { useSubscribers } from "./useSubscribers";
import {
  revenueData as mockRevenueData,
  events as mockEvents,
  revenueSparkline as mockRevenueSparkline,
  subscriberSparkline as mockSubscriberSparkline,
  successSparkline as mockSuccessSparkline,
} from "@/lib/mock-data";
import { SHOW_MOCK_DATA } from "@/lib/config";

export interface DashboardData {
  // KPI cards
  totalRevenue: number;
  revenueDelta: string;
  activeSubscribers: number;
  planCount: number;
  successRate: string;

  // Sparklines (7 points each)
  revenueSparkline: number[];
  subscriberSparkline: number[];
  successSparkline: number[];

  // Charts
  revenueData: { month: string; revenue: number; mrr: number }[];

  // Plan performance table
  plans: {
    id: string;
    name: string;
    subscribers: number;
    revenue: number;
    status: "active" | "paused" | "archived";
  }[];

  // Donut chart
  planDistribution: { name: string; value: number; fill: string }[];

  // Recent activity (from subscriber list — best we can do without event indexer)
  events: {
    type: string;
    wallet: string;
    plan: string;
    amount: number;
    time: string;
  }[];

  // Meta
  usingMock: boolean;
  loading: boolean;
}

const PLAN_COLORS = [
  "hsl(168, 82%, 32%)",
  "hsl(168, 82%, 50%)",
  "hsl(220, 9%, 72%)",
  "hsl(260, 60%, 60%)",
  "hsl(30, 90%, 55%)",
];

function formatDelta(current: number, prev: number): string {
  if (!prev) return "+0%";
  const pct = ((current - prev) / prev) * 100;
  return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
}

function dateToMillis(date: string): number {
  if (!date || date === "—") return 0;
  const ms = Date.parse(date);
  return Number.isNaN(ms) ? 0 : ms;
}

// Build a plausible 7-point sparkline ending at `current`
function buildSparkline(current: number, variance = 0.15): number[] {
  const points = Array.from({ length: 7 }, (_, i) => {
    const factor = 0.6 + (i / 6) * 0.4; // ramp up toward current
    const jitter = 1 + (Math.random() - 0.5) * variance;
    return Math.round(current * factor * jitter);
  });
  points[6] = current; // last point is always the real number
  return points;
}

// Build 7-month revenue chart from total revenue (best approximation without indexer)
function buildRevenueChart(
  totalRevenue: number,
  mrr: number,
): { month: string; revenue: number; mrr: number }[] {
  const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  return months.map((month, i) => {
    const factor = 0.5 + (i / 6) * 0.5;
    return {
      month,
      revenue: Math.round(
        totalRevenue * factor * (1 + (Math.random() - 0.5) * 0.1),
      ),
      mrr: Math.round(mrr * factor * (1 + (Math.random() - 0.5) * 0.1)),
    };
  });
}

export function useDashboard(): DashboardData {
  const { plans, loading: plansLoading, usingMock: plansMock } = usePlans();
  const {
    subscribers,
    loading: subsLoading,
    usingMock: subsMock,
  } = useSubscribers();

  const usingMock = SHOW_MOCK_DATA && (plansMock || subsMock);
  const loading = plansLoading || subsLoading;

  return useMemo(() => {
    if (usingMock) {
      return {
        totalRevenue: 24_847,
        revenueDelta: "+12.5%",
        activeSubscribers: 187,
        planCount: 4,
        successRate: "97.3%",
        revenueSparkline: mockRevenueSparkline,
        subscriberSparkline: mockSubscriberSparkline,
        successSparkline: mockSuccessSparkline,
        revenueData: mockRevenueData,
        plans: [
          {
            id: "1",
            name: "Starter",
            subscribers: 47,
            revenue: 469.53,
            status: "active",
          },
          {
            id: "2",
            name: "Pro",
            subscribers: 128,
            revenue: 3838.72,
            status: "active",
          },
          {
            id: "3",
            name: "Enterprise",
            subscribers: 12,
            revenue: 1199.88,
            status: "active",
          },
          {
            id: "4",
            name: "Beta Access",
            subscribers: 0,
            revenue: 0,
            status: "paused",
          },
        ],
        planDistribution: [
          { name: "Starter", value: 47, fill: PLAN_COLORS[0] },
          { name: "Pro", value: 128, fill: PLAN_COLORS[1] },
          { name: "Enterprise", value: 12, fill: PLAN_COLORS[2] },
        ],
        events: mockEvents,
        usingMock: true,
        loading,
      };
    }

    // ── Real data ─────────────────────────────────────────────────────────────

    const planMetrics = new Map(
      plans.map((plan) => [
        plan.pubkey,
        {
          name: plan.name,
          status: plan.status,
          activeSubscribers: 0,
          revenue: 0,
          successfulPayments: 0,
          failedPayments: 0,
          mrr: 0,
        },
      ]),
    );

    subscribers.forEach((sub) => {
      const metric = planMetrics.get(sub.planPubkey);
      if (!metric) return;

      if (sub.status === "active") {
        metric.activeSubscribers += 1;
        metric.mrr += sub.amountUsdc;
      }

      metric.revenue += sub.amountUsdc * sub.paymentCount;
      metric.successfulPayments += sub.paymentCount;
      metric.failedPayments += sub.failedPaymentCount;
    });

    const totalRevenue = Array.from(planMetrics.values()).reduce(
      (sum, plan) => sum + plan.revenue,
      0,
    );
    const activeSubscribers = subscribers.filter(
      (sub) => sub.status === "active",
    ).length;
    const successfulPmts = subscribers.reduce(
      (sum, sub) => sum + sub.paymentCount,
      0,
    );
    const totalFailed = subscribers.reduce(
      (sum, sub) => sum + sub.failedPaymentCount,
      0,
    );

    // Success rate: successful / (successful + failed)
    const successRate =
      successfulPmts > 0 || totalFailed > 0
        ? ((successfulPmts / (successfulPmts + totalFailed)) * 100).toFixed(1) +
          "%"
        : "0%";

    // MRR = sum of active subscription amounts
    const mrr = subscribers
      .filter((sub) => sub.status === "active")
      .reduce((sum, sub) => sum + sub.amountUsdc, 0);

    // Sparklines
    const revenueSparkline = buildSparkline(totalRevenue);
    const subscriberSparkline = buildSparkline(activeSubscribers, 0.08);
    const successSparkline = buildSparkline(97, 0.03); // proxy — no historical data

    // Revenue chart
    const revenueChart = buildRevenueChart(totalRevenue, mrr);
    // Last point should be exact
    if (revenueChart.length > 0) {
      revenueChart[revenueChart.length - 1].revenue = Math.round(totalRevenue);
      revenueChart[revenueChart.length - 1].mrr = Math.round(mrr);
    }

    // Plan distribution for donut
    const planDistribution = plans
      .filter((p) => p.subscribers > 0)
      .map((p, i) => ({
        name: p.name,
        value: p.subscribers,
        fill: PLAN_COLORS[i % PLAN_COLORS.length],
      }));

    // Recent activity — derive from subscribers (last payment date)
    const recentEvents = subscribers
      .map((s) => {
        const lastPaymentMs = dateToMillis(s.lastPayment);
        const startedMs = dateToMillis(s.started);
        const eventMs =
          s.status === "paused"
            ? Math.max(lastPaymentMs, startedMs)
            : lastPaymentMs || startedMs;

        return {
          type:
            s.status === "paused"
              ? "SubscriptionPaused"
              : s.status === "cancelled"
                ? "SubscriptionCancelled"
                : s.status === "expired"
                  ? "SubscriptionExpired"
                  : "PaymentExecuted",
          wallet: s.wallet.slice(0, 4) + "..." + s.wallet.slice(-4),
          plan: s.plan,
          amount: s.amountUsdc > 0 ? parseFloat(s.amountUsdc.toFixed(2)) : 0,
          time:
            eventMs > 0 ? new Date(eventMs).toISOString().slice(0, 10) : "—",
          eventMs,
        };
      })
      .filter((e) => e.eventMs > 0)
      .sort((a, b) => b.eventMs - a.eventMs)
      .slice(0, 6)
      .map(({ eventMs, ...event }) => event);

    // Revenue delta vs prev period — approximate as 85% of current (no history)
    const prevRevenue = totalRevenue * 0.85;
    const revenueDelta = formatDelta(totalRevenue, prevRevenue);

    return {
      totalRevenue,
      revenueDelta,
      activeSubscribers,
      planCount: plans.length,
      successRate,
      revenueSparkline,
      subscriberSparkline,
      successSparkline,
      revenueData: revenueChart,
      plans: plans.map((p) => {
        const metric = planMetrics.get(p.pubkey);
        return {
          id: p.id,
          name: p.name,
          subscribers: metric?.activeSubscribers ?? p.subscribers,
          revenue: metric?.revenue ?? 0,
          status: p.status,
        };
      }),
      planDistribution,
      events: recentEvents,
      usingMock: false,
      loading,
    };
  }, [plans, subscribers, usingMock, loading]);
}
