/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  MoreHorizontal,
  ChevronDown,
  DollarSign,
  Users,
  CheckCircle,
  ArrowUpRight,
  AlertCircle,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboard } from "@/hooks/useDashboard";

const TEAL = "hsl(254, 81%, 68%)";
const GRAY = "hsl(220, 9%, 72%)";

// ── Sparklines ────────────────────────────────────────────────────────────────

function SparkBars({ data, color = TEAL }: { data: number[]; color?: string }) {
  const max = Math.max(...data);
  return (
    <div className="flex items-end gap-0.5 h-10">
      {data.map((v, i) => (
        <div
          key={i}
          className="rounded-sm w-2"
          style={{
            height: `${(v / max) * 100}%`,
            backgroundColor: i === data.length - 1 ? color : `${color}40`,
          }}
        />
      ))}
    </div>
  );
}

function SparkLine({ data }: { data: number[] }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const h = 40;
  const w = data.length * 12;
  const points = data
    .map((v, i) => `${i * 12},${h - ((v - min) / range) * h}`)
    .join(" ");
  return (
    <svg width={w} height={h} className="overflow-visible">
      <polyline
        points={points}
        fill="none"
        stroke={TEAL}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Chart tooltip ─────────────────────────────────────────────────────────────
const ChartTooltipContent = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-card border p-3 text-xs shadow-lg">
      <p className="font-medium text-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <div
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-muted-foreground">{p.name}</span>
          <span className="font-medium text-foreground ml-auto">
            ${p.value?.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

// ── Event icon map ────────────────────────────────────────────────────────────

const eventIcons: Record<string, { color: string; icon: string }> = {
  PaymentExecuted: { color: "text-success", icon: "↗" },
  SubscriptionCreated: { color: "text-primary", icon: "+" },
  SubscriptionPaused: { color: "text-amber-500", icon: "∥" },
  PaymentFailed: { color: "text-destructive", icon: "!" },
  SubscriptionCancelled: { color: "text-warning", icon: "−" },
  SubscriptionExpired: { color: "text-muted-foreground", icon: "×" },
};

// ── KPI skeleton ──────────────────────────────────────────────────────────────

function KpiSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-32" />
      </CardHeader>
      <CardContent className="flex items-end justify-between">
        <div className="space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-10 w-16" />
      </CardContent>
    </Card>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Dashboard() {
  const d = useDashboard();
  const [showMockBanner, setShowMockBanner] = useState(true);

  useEffect(() => {
    if (d.usingMock) setShowMockBanner(true);
  }, [d.usingMock]);

  if (d.loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiSkeleton />
          <KpiSkeleton />
          <KpiSkeleton />
        </div>
      </div>
    );
  }

  const totalSubscribers = d.planDistribution.reduce((s, p) => s + p.value, 0);

  return (
    <div className="space-y-6">
      {/* Mock data banner */}
      {d.usingMock && showMockBanner && (
        <Alert className="relative pr-10">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Showing sample data. Connect your wallet to see real on-chain
            analytics.
          </AlertDescription>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-2 top-1/2 h-6 w-6 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            onClick={() => setShowMockBanner(false)}
            aria-label="Dismiss sample data banner"
          >
            <X className="h-4 w-4" />
          </Button>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">
                $
                {d.totalRevenue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </div>
              <p className="text-xs text-primary flex items-center gap-0.5 mt-1">
                <ArrowUpRight className="h-3 w-3" />
                {d.revenueDelta} vs last period
              </p>
            </div>
            <SparkBars data={d.revenueSparkline} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Users className="h-4 w-4" />
              Active Subscribers
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">{d.activeSubscribers}</div>
              <p className="text-xs text-muted-foreground mt-1">
                Across {d.planCount} plan{d.planCount !== 1 ? "s" : ""}
              </p>
            </div>
            <SparkLine data={d.subscriberSparkline} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Success Rate
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-end justify-between">
            <div>
              <div className="text-2xl font-bold">{d.successRate}</div>
              <p className="text-xs text-primary flex items-center gap-0.5 mt-1">
                <ArrowUpRight className="h-3 w-3" />
                Payment success
              </p>
            </div>
            <SparkBars data={d.successSparkline} />
          </CardContent>
        </Card>
      </div>

      {/* Chart + Activity */}
      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row items-center justify-between">
            <div className="flex items-center gap-4">
              <CardTitle className="text-sm font-medium">
                Revenue vs MRR
              </CardTitle>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-2 rounded-full bg-primary" />
                  Revenue
                </span>
                <span className="flex items-center gap-1.5">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: GRAY }}
                  />
                  MRR
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={d.revenueData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={TEAL} stopOpacity={0.15} />
                    <stop offset="100%" stopColor={TEAL} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(220, 13%, 91%)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                  }
                />
                <Tooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke={TEAL}
                  fill="url(#revGrad)"
                  strokeWidth={2}
                  name="Revenue"
                />
                <Line
                  type="monotone"
                  dataKey="mrr"
                  stroke={GRAY}
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={false}
                  name="MRR"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">
              Recent Activity
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="space-y-1">
            {d.events.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No recent activity
              </p>
            ) : (
              d.events.slice(0, 6).map((e, i) => {
                const ev = eventIcons[e.type] ?? {
                  color: "text-muted-foreground",
                  icon: "•",
                };
                return (
                  <div
                    key={i}
                    className="flex items-center gap-3 py-2.5 border-b last:border-0"
                  >
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg bg-muted text-sm font-bold ${ev.color}`}
                    >
                      {ev.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {e.type.replace(/([A-Z])/g, " $1").trim()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {e.wallet} · {e.plan}
                      </p>
                    </div>
                    {e.amount > 0 && (
                      <span className="text-sm font-semibold">
                        ${e.amount.toFixed(2)}
                      </span>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Donut */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Subscribers by Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-8">
            {totalSubscribers === 0 ? (
              <p className="text-sm text-muted-foreground">
                No subscribers yet
              </p>
            ) : (
              <>
                <div className="relative">
                  <ResponsiveContainer width={160} height={160}>
                    <PieChart>
                      <Pie
                        data={d.planDistribution}
                        innerRadius={50}
                        outerRadius={75}
                        paddingAngle={2}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {d.planDistribution.map((entry, i) => (
                          <Cell key={i} fill={entry.fill} />
                        ))}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold">
                      {totalSubscribers}
                    </span>
                    <span className="text-xs text-muted-foreground">Total</span>
                  </div>
                </div>
                <div className="space-y-3 flex-1">
                  {d.planDistribution.map((p) => (
                    <div
                      key={p.name}
                      className="flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: p.fill }}
                        />
                        <span className="text-sm">{p.name}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-medium">
                          {Math.round((p.value / totalSubscribers) * 100)}%
                        </span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {p.value}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Plan Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Plan Performance
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {d.plans.map((plan) => (
              <div
                key={plan.id}
                className="flex items-center justify-between py-3 border-b last:border-0"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{plan.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {plan.subscribers} subscribers
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold">
                    $
                    {plan.revenue.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                  <Badge
                    variant="outline"
                    className={
                      plan.status === "active"
                        ? "bg-primary/10 text-primary border-primary/20"
                        : "bg-muted text-muted-foreground"
                    }
                  >
                    {plan.status}
                  </Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
