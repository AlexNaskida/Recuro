export const revenueData = Array.from({ length: 7 }, (_, i) => {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"];
  return {
    month: months[i],
    revenue: Math.floor(15000 + Math.random() * 10000 + i * 2000),
    mrr: Math.floor(10000 + Math.random() * 7000 + i * 1500),
  };
});

export const subscriberData = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(2026, 1, i + 1).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  }),
  subscribers: Math.floor(40 + i * 2 + Math.random() * 10),
}));

export const mrrData = Array.from({ length: 12 }, (_, i) => ({
  month: new Date(2025, i + 3, 1).toLocaleDateString("en-US", {
    month: "short",
  }),
  mrr: Math.floor(2000 + i * 800 + Math.random() * 500),
}));

export const churnData = Array.from({ length: 12 }, (_, i) => ({
  month: new Date(2025, i + 3, 1).toLocaleDateString("en-US", {
    month: "short",
  }),
  rate: parseFloat((5 - i * 0.2 + Math.random() * 1.5).toFixed(1)),
}));

export const plans = [
  {
    id: "1",
    name: "Starter",
    price: 9.99,
    interval: "monthly",
    subscribers: 47,
    revenue: 469.53,
    status: "active" as const,
  },
  {
    id: "2",
    name: "Pro",
    price: 29.99,
    interval: "monthly",
    subscribers: 128,
    revenue: 3838.72,
    status: "active" as const,
  },
  {
    id: "3",
    name: "Enterprise",
    price: 99.99,
    interval: "monthly",
    subscribers: 12,
    revenue: 1199.88,
    status: "active" as const,
  },
  {
    id: "4",
    name: "Beta Access",
    price: 4.99,
    interval: "monthly",
    subscribers: 0,
    revenue: 0,
    status: "paused" as const,
  },
];

export const subscribers = [
  {
    wallet: "9WzDXwBbmPEi3dFLQR2JPhL1LCfQB5C3RkKvLLRUwZsG",
    plan: "Pro",
    status: "active" as const,
    started: "2025-11-12",
    lastPayment: "2026-02-12",
    totalPaid: 119.96,
  },
  {
    wallet: "3Kb3VVgCFnPBrE1p5GQyGzSv9KWcg1YxDSqnMKAMRzGv",
    plan: "Starter",
    status: "active" as const,
    started: "2025-12-01",
    lastPayment: "2026-02-01",
    totalPaid: 29.97,
  },
  {
    wallet: "HN7cABqLq46Es1jh92dQQisAq662SmxELLLsHHe4YWrH",
    plan: "Enterprise",
    status: "active" as const,
    started: "2026-01-15",
    lastPayment: "2026-02-15",
    totalPaid: 199.98,
  },
  {
    wallet: "5Zzguz4NsSRFxGkHfM4FmeFUqy6VpaCCm9RxSvXgk7AB",
    plan: "Pro",
    status: "past_due" as const,
    started: "2025-10-20",
    lastPayment: "2026-01-20",
    totalPaid: 89.97,
  },
  {
    wallet: "DRpbCBMxVnDK7maPM5tGv6MvB3v1sRMC86PZ8okm21hy",
    plan: "Starter",
    status: "cancelled" as const,
    started: "2025-09-05",
    lastPayment: "2025-12-05",
    totalPaid: 29.97,
  },
  {
    wallet: "FQJ2czigCYDRPMEMCEAfbPxuMXj3r6hKm7o2GBr9RGKY",
    plan: "Pro",
    status: "active" as const,
    started: "2026-01-01",
    lastPayment: "2026-02-01",
    totalPaid: 59.98,
  },
];

export const events = [
  {
    type: "SubscriptionPaused",
    wallet: "6yQm...A2Kd",
    plan: "Pro",
    amount: 0,
    time: "4 min ago",
  },
  {
    type: "PaymentExecuted",
    wallet: "9WzD...wsG",
    plan: "Pro",
    amount: 29.99,
    time: "2 min ago",
  },
  {
    type: "SubscriptionCreated",
    wallet: "FQJ2...GKY",
    plan: "Starter",
    amount: 9.99,
    time: "15 min ago",
  },
  {
    type: "PaymentExecuted",
    wallet: "HN7c...WrH",
    plan: "Enterprise",
    amount: 99.99,
    time: "1 hr ago",
  },
  {
    type: "PaymentFailed",
    wallet: "5Zzg...7AB",
    plan: "Pro",
    amount: 29.99,
    time: "2 hrs ago",
  },
  {
    type: "SubscriptionCancelled",
    wallet: "DRpb...1hy",
    plan: "Starter",
    amount: 0,
    time: "5 hrs ago",
  },
  {
    type: "PaymentExecuted",
    wallet: "3Kb3...zGv",
    plan: "Starter",
    amount: 9.99,
    time: "8 hrs ago",
  },
  {
    type: "SubscriptionCreated",
    wallet: "HN7c...WrH",
    plan: "Enterprise",
    amount: 99.99,
    time: "1 day ago",
  },
  {
    type: "PaymentExecuted",
    wallet: "9WzD...wsG",
    plan: "Pro",
    amount: 29.99,
    time: "1 day ago",
  },
];

export interface LogEntry {
  id: string; // subscription pubkey
  type:
    | "PaymentExecuted"
    | "PaymentFailed"
    | "SubscriptionCreated"
    | "SubscriptionPaused"
    | "SubscriptionCancelled"
    | "SubscriptionExpired";
  subscriber: string;
  plan: string;
  planPubkey: string;
  amountUsdc: number;
  totalPaid: number;
  paymentCount: number;
  status: string;
  timestamp: string; // ISO date string from lastPaidAt or startedAt
  timestampUnix?: number; // milliseconds since epoch for precise sorting
  raw: string; // subscription pubkey for explorer link
}

export const MOCK_LOGS: LogEntry[] = [
  {
    id: "mock-1",
    type: "PaymentExecuted",
    subscriber: "9WzDXwBb...RUwZsG",
    plan: "Pro",
    planPubkey: "",
    amountUsdc: 29.99,
    totalPaid: 119.96,
    paymentCount: 4,
    status: "active",
    timestamp: "2026-03-13",
    raw: "",
  },
  {
    id: "mock-2",
    type: "PaymentExecuted",
    subscriber: "HN7cABqL...4YWrH",
    plan: "Enterprise",
    planPubkey: "",
    amountUsdc: 99.99,
    totalPaid: 199.98,
    paymentCount: 2,
    status: "active",
    timestamp: "2026-03-12",
    raw: "",
  },
  {
    id: "mock-3",
    type: "PaymentFailed",
    subscriber: "5Zzguz4N...k7AB",
    plan: "Pro",
    planPubkey: "",
    amountUsdc: 29.99,
    totalPaid: 89.97,
    paymentCount: 3,
    status: "expired",
    timestamp: "2026-03-11",
    raw: "",
  },
  {
    id: "mock-4",
    type: "SubscriptionCreated",
    subscriber: "FQJ2czigC...RGKY",
    plan: "Starter",
    planPubkey: "",
    amountUsdc: 9.99,
    totalPaid: 0,
    paymentCount: 0,
    status: "active",
    timestamp: "2026-03-10",
    raw: "",
  },
  {
    id: "mock-5",
    type: "SubscriptionCancelled",
    subscriber: "DRpbCBMx...21hy",
    plan: "Starter",
    planPubkey: "",
    amountUsdc: 9.99,
    totalPaid: 29.97,
    paymentCount: 3,
    status: "cancelled",
    timestamp: "2026-03-09",
    raw: "",
  },
  {
    id: "mock-6",
    type: "SubscriptionPaused",
    subscriber: "6yQmW9wY...A2Kd",
    plan: "Pro",
    planPubkey: "",
    amountUsdc: 0,
    totalPaid: 59.98,
    paymentCount: 2,
    status: "paused",
    timestamp: "2026-03-14",
    raw: "",
  },
];

export const planBreakdown = [
  {
    plan: "Starter",
    subscribers: 47,
    mrr: 469.53,
    churn: 3.2,
    avgLifetime: "4.2 months",
  },
  {
    plan: "Pro",
    subscribers: 128,
    mrr: 3838.72,
    churn: 1.8,
    avgLifetime: "7.1 months",
  },
  {
    plan: "Enterprise",
    subscribers: 12,
    mrr: 1199.88,
    churn: 0.8,
    avgLifetime: "11.3 months",
  },
];

// Sparkline data for KPI cards
export const revenueSparkline = [3200, 4100, 3800, 5200, 4900, 5800, 6200];
export const subscriberSparkline = [120, 132, 141, 148, 155, 168, 187];
export const successSparkline = [94, 95, 96, 97, 96, 98, 97];

// Donut data
export const planDistribution = [
  { name: "Starter", value: 47, fill: "hsl(168, 82%, 32%)" },
  { name: "Pro", value: 128, fill: "hsl(168, 82%, 50%)" },
  { name: "Enterprise", value: 12, fill: "hsl(220, 9%, 72%)" },
];
