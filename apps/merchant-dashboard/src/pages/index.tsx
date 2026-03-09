// ============================================================
// src/pages/OverviewPage.tsx
// ============================================================
import { BarChart3, DollarSign, Users, XCircle } from "lucide-react";
import { KpiCard } from "@/components/analytics/KpiCard";
import { RevenueChart } from "@/components/analytics/RevenueChart";
import { SubscriberTrendChart } from "@/components/analytics/SubscriberTrendChart";
import { LiveEventFeed } from "@/components/analytics/LiveEventFeed";
import { useAnalytics } from "@/hooks/useAnalytics";

export function OverviewPage() {
  const { data: analytics, isLoading } = useAnalytics();

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your subscription revenue at a glance.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Total Revenue"
          value={analytics ? `$${analytics.totalRevenue.toFixed(2)}` : "—"}
          subLabel="All-time USDC"
          icon={DollarSign}
          highlight="emerald"
          isLoading={isLoading}
        />
        <KpiCard
          label="Active Subscribers"
          value={analytics?.activeSubscriptions.toString() ?? "—"}
          subLabel="Paying now"
          icon={Users}
          highlight="brand"
          isLoading={isLoading}
        />
        <KpiCard
          label="Churn Rate"
          value={analytics ? `${analytics.churnRate.toFixed(1)}%` : "—"}
          subLabel="Cancelled + expired"
          icon={XCircle}
          highlight={
            analytics && analytics.churnRate > 10 ? "amber" : "default"
          }
          isLoading={isLoading}
        />
        <KpiCard
          label="Failed Payments"
          value={analytics?.failedPayments.toString() ?? "—"}
          subLabel="Total attempts failed"
          icon={BarChart3}
          isLoading={isLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RevenueChart
          data={analytics?.revenueOverTime ?? []}
          isLoading={isLoading}
        />
        <SubscriberTrendChart
          data={analytics?.subscriptionsTrend ?? []}
          isLoading={isLoading}
        />
      </div>

      {/* Live feed */}
      <LiveEventFeed maxItems={15} />
    </div>
  );
}

// ============================================================
// src/pages/PlansPage.tsx
// ============================================================
import { Link } from "react-router-dom";
import { PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PlanCard, PlanCardSkeleton } from "@/components/plans/PlanCard";
import { useAnalyticsStore } from "@/store/analyticsStore";
import { useMerchantPlans } from "@/hooks/useMerchantPlans";
import { useAnchorWallet } from "@solana/wallet-adapter-react";

export function PlansPage() {
  const wallet = useAnchorWallet();
  const { data: plans, isLoading } = useMerchantPlans();
  const { selectedPlanId, setSelectedPlan } = useAnalyticsStore();

  if (!wallet) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="text-center">
          <h2 className="text-xl font-semibold">Connect your wallet</h2>
          <p className="text-sm text-muted-foreground mt-2">
            Connect to manage your plans.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Plans</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {plans?.length ?? 0} plan{plans?.length !== 1 ? "s" : ""} deployed
          </p>
        </div>
        <Button variant="brand" asChild>
          <Link to="/create">
            <PlusCircle className="h-4 w-4" /> New Plan
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <PlanCardSkeleton key={i} />
          ))}
        </div>
      ) : plans && plans.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
          {plans.map((plan) => (
            <PlanCard
              key={plan.publicKey.toBase58()}
              plan={plan}
              isSelected={selectedPlanId === plan.publicKey.toBase58()}
              onSelect={setSelectedPlan}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 border border-dashed border-surface-4 rounded-xl">
          <h3 className="font-semibold text-lg">No plans yet</h3>
          <p className="text-sm text-muted-foreground mt-1 mb-6">
            Deploy your first plan to start accepting subscriptions.
          </p>
          <Button variant="brand" asChild>
            <Link to="/create">
              <PlusCircle className="h-4 w-4" /> Create your first plan
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}

// ============================================================
// src/pages/CreatePlanPage.tsx
// ============================================================
import { CreatePlanForm } from "@/components/plans/CreatePlanForm";

export function CreatePlanPage() {
  return (
    <div className="animate-fade-in">
      <div className="px-6 pt-6">
        <h1 className="text-2xl font-bold">Create Plan</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Deploy a new subscription plan PDA to Solana. Price and interval are
          immutable after creation.
        </p>
      </div>
      <CreatePlanForm />
    </div>
  );
}

// ============================================================
// src/pages/AnalyticsPage.tsx
// ============================================================
import { RevenueChart as RC } from "@/components/analytics/RevenueChart";
import { SubscriberTrendChart as STC } from "@/components/analytics/SubscriberTrendChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import { CHART_COLORS, formatUSDC } from "@/constants";
import { KpiCard as KC } from "@/components/analytics/KpiCard";
import { TrendingDown, Activity } from "lucide-react";

export function AnalyticsPage() {
  const { data: analytics, isLoading } = useAnalytics();

  const pieData = analytics
    ? [
        {
          name: "Active",
          value: analytics.activeSubscriptions,
          color: CHART_COLORS.secondary,
        },
        {
          name: "Cancelled",
          value: analytics.cancelledSubscriptions,
          color: CHART_COLORS.danger,
        },
        {
          name: "Expired",
          value: analytics.expiredSubscriptions,
          color: CHART_COLORS.muted,
        },
      ].filter((d) => d.value > 0)
    : [];

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Analytics</h1>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <KC
          label="MRR"
          value={
            analytics
              ? formatUSDC(analytics.totalRevenue * 1_000_000, true)
              : "—"
          }
          subLabel="Monthly recurring"
          icon={DollarSign}
          highlight="emerald"
          isLoading={isLoading}
        />
        <KC
          label="Total Subscribers"
          value={analytics?.totalSubscriptions.toString() ?? "—"}
          subLabel="All-time"
          icon={Users}
          highlight="brand"
          isLoading={isLoading}
        />
        <KC
          label="Churn"
          value={analytics ? `${analytics.churnRate.toFixed(1)}%` : "—"}
          subLabel="Cancellation rate"
          icon={TrendingDown}
          isLoading={isLoading}
        />
        <KC
          label="Retention"
          value={analytics ? `${(100 - analytics.churnRate).toFixed(1)}%` : "—"}
          subLabel="Still active"
          icon={Activity}
          highlight="brand"
          isLoading={isLoading}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2">
          <RC data={analytics?.revenueOverTime ?? []} isLoading={isLoading} />
        </div>

        <Card className="card-hover">
          <CardHeader>
            <CardTitle className="text-base">Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="45%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: CHART_COLORS.tooltip_bg,
                      border: `1px solid ${CHART_COLORS.grid}`,
                      borderRadius: "12px",
                      fontSize: 12,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: 12, color: CHART_COLORS.muted }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
                No data
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <STC data={analytics?.subscriptionsTrend ?? []} isLoading={isLoading} />
    </div>
  );
}

// ============================================================
// src/pages/LogsPage.tsx
// ============================================================
import { ExecutionLogsTable } from "@/components/logs/ExecutionLogsTable";

export function LogsPage() {
  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold">Execution Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Real-time on-chain event log — all payment executions, failures, and
          subscription changes.
        </p>
      </div>
      <ExecutionLogsTable />
    </div>
  );
}

// ============================================================
// src/pages/SettingsPage.tsx
// ============================================================
import { useAnchorWallet as useWallet } from "@solana/wallet-adapter-react";
import { CLUSTER, PROGRAM_ID, USDC_MINT, truncate as trunc } from "@/constants";

export function SettingsPage() {
  const w = useWallet();
  const info = [
    { label: "Cluster", value: CLUSTER },
    { label: "Program ID", value: PROGRAM_ID, mono: true, copy: true },
    { label: "USDC Mint", value: USDC_MINT, mono: true, copy: true },
    { label: "Wallet", value: w?.publicKey.toBase58() ?? "—", mono: true },
  ];

  return (
    <div className="p-6 max-w-2xl space-y-6 animate-fade-in">
      <h1 className="text-2xl font-bold">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Protocol Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {info.map(({ label, value, mono }) => (
            <div
              key={label}
              className="flex items-center justify-between py-2 border-b border-surface-4 last:border-0"
            >
              <span className="text-sm text-muted-foreground">{label}</span>
              <span className={`text-sm ${mono ? "font-mono" : "font-medium"}`}>
                {mono && value.length > 20 ? trunc(value) : value}
              </span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
