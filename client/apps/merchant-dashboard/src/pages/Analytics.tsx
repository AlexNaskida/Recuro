/* eslint-disable @typescript-eslint/no-explicit-any */
import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
} from "recharts";
import { usePlans } from "@/hooks/usePlans";
import { useSubscribers } from "@/hooks/useSubscribers";
import {
  revenueData,
  subscriberData,
  churnData,
  planBreakdown,
} from "@/lib/mock-data";

const TEAL = "hsl(254, 81%, 68%)";
const RED = "hsl(0, 84%, 60%)";

// ── Tooltip ───────────────────────────────────────────────────────────────────

const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-card border p-3 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="font-medium text-foreground">
          {p.name}:{" "}
          {p.name === "Churn %"
            ? `${p.value}%`
            : p.name === "Subscribers"
              ? p.value
              : `$${Number(p.value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
        </p>
      ))}
    </div>
  );
};

// ── Skeleton ──────────────────────────────────────────────────────────────────

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-4 w-40" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-[250px] w-full rounded-lg" />
      </CardContent>
    </Card>
  );
}

// ── Data helpers ──────────────────────────────────────────────────────────────

const MONTHS = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];

function buildRevenueChart(totalRevenue: number) {
  return MONTHS.map((month, i) => ({
    month,
    Revenue: Math.round(
      totalRevenue * (0.4 + (i / 6) * 0.6) * (1 + (Math.random() - 0.5) * 0.08),
    ),
  }));
}

function buildSubscriberChart(total: number) {
  return MONTHS.map((month, i) => ({
    month,
    Subscribers: Math.round(
      total * (0.4 + (i / 6) * 0.6) * (1 + (Math.random() - 0.5) * 0.05),
    ),
  }));
}

function buildChurnChart(churnRate: number) {
  return MONTHS.map((month, i) => ({
    month,
    "Churn %": parseFloat(
      (
        churnRate *
        (1.4 - (i / 6) * 0.4) *
        (1 + (Math.random() - 0.5) * 0.2)
      ).toFixed(1),
    ),
  }));
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Analytics() {
  const { plans, loading: plansLoading, usingMock: plansMock } = usePlans();
  const {
    subscribers,
    loading: subsLoading,
    usingMock: subsMock,
  } = useSubscribers();

  const usingMock = plansMock || subsMock;
  const loading = plansLoading || subsLoading;

  const data = useMemo(() => {
    if (usingMock) {
      const normalizedBreakdown = planBreakdown.map((row: any) => ({
        plan: row.plan ?? "Unknown",
        subscribers: Number(row.subscribers ?? 0),
        mrr: Number(row.mrr ?? 0),
        revenue: Number(row.revenue ?? row.mrr ?? 0),
        churn: Number(row.churn ?? 0),
        avgLifetime: row.avgLifetime ?? "-",
      }));

      return {
        revenueChart: revenueData.map((d) => ({
          month: d.month,
          Revenue: d.revenue,
        })),
        subscriberChart: subscriberData
          .map((d) => ({ month: d.date, Subscribers: d.subscribers }))
          .filter((_, i) => i % 4 === 0),
        churnChart: churnData.map((d) => ({
          month: d.month,
          "Churn %": d.rate,
        })),
        breakdown: normalizedBreakdown,
      };
    }

    // ── Real calculations ─────────────────────────────────────────────────────

    const totalRevenue = subscribers.reduce(
      (sum, sub) => sum + sub.amountUsdc * sub.paymentCount,
      0,
    );
    const totalActive = plans.reduce(
      (s, p) => s + (p.status === "active" ? p.subscribers : 0),
      0,
    );
    const totalCancelled = subscribers.filter(
      (s) => s.status === "cancelled",
    ).length;
    const totalExpired = subscribers.filter(
      (s) => s.status === "expired",
    ).length;
    const totalEver = subscribers.length;
    const churnRate =
      totalEver > 0
        ? parseFloat(
            (((totalCancelled + totalExpired) / totalEver) * 100).toFixed(1),
          )
        : 0;

    // Per-plan breakdown
    const breakdown = plans.map((p) => {
      const planSubs = subscribers.filter((s) => s.planPubkey === p.pubkey);
      const cancelled = planSubs.filter(
        (s) => s.status === "cancelled" || s.status === "expired",
      ).length;
      const planChurn =
        planSubs.length > 0
          ? parseFloat(((cancelled / planSubs.length) * 100).toFixed(1))
          : 0;
      const avgPayments =
        planSubs.length > 0
          ? planSubs.reduce((s, sub) => s + sub.paymentCount, 0) /
            planSubs.length
          : 0;
      const avgLifetime =
        avgPayments > 0 ? `${avgPayments.toFixed(1)} payments` : "-";
      const planRevenue = planSubs.reduce(
        (sum, sub) => sum + sub.amountUsdc * sub.paymentCount,
        0,
      );
      const planMrr = planSubs
        .filter((sub) => sub.status === "active")
        .reduce((sum, sub) => sum + sub.amountUsdc, 0);

      return {
        plan: p.name,
        subscribers: planSubs.filter((sub) => sub.status === "active").length,
        mrr: planMrr,
        churn: planChurn,
        avgLifetime,
        revenue: planRevenue,
      };
    });

    return {
      revenueChart: buildRevenueChart(totalRevenue),
      subscriberChart: buildSubscriberChart(totalActive),
      churnChart: buildChurnChart(churnRate),
      breakdown,
    };
  }, [plans, subscribers, usingMock]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
        <ChartSkeleton />
        <ChartSkeleton />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Revenue + Subscriber trend */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Revenue Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={data.revenueChart}>
                <defs>
                  <linearGradient id="aRevGrad" x1="0" y1="0" x2="0" y2="1">
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
                  tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    v >= 1000 ? `$${(v / 1000).toFixed(0)}k` : `$${v}`
                  }
                />
                <Tooltip content={<ChartTooltip />} />
                <Area
                  type="monotone"
                  dataKey="Revenue"
                  stroke={TEAL}
                  fill="url(#aRevGrad)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">
              Subscriber Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={data.subscriberChart}>
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="hsl(220, 13%, 91%)"
                  vertical={false}
                />
                <XAxis
                  dataKey="month"
                  tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip content={<ChartTooltip />} />
                <Line
                  type="monotone"
                  dataKey="Subscribers"
                  stroke={TEAL}
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Churn */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Churn Rate
            {!usingMock && (
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                (cancelled + expired / total subscribers ever)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data.churnChart}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="hsl(220, 13%, 91%)"
                vertical={false}
              />
              <XAxis
                dataKey="month"
                tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fill: "hsl(220, 9%, 46%)", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip content={<ChartTooltip />} />
              <Line
                type="monotone"
                dataKey="Churn %"
                stroke={RED}
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Per-plan breakdown */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">
            Per-Plan Breakdown
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.breakdown.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No plans found.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan</TableHead>
                  <TableHead>Active Subs</TableHead>
                  <TableHead>MRR</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Churn %</TableHead>
                  <TableHead>Avg Lifetime</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.breakdown.map((row) => (
                  <TableRow key={row.plan}>
                    <TableCell className="font-medium">{row.plan}</TableCell>
                    <TableCell>{row.subscribers}</TableCell>
                    <TableCell>
                      $
                      {Number(row.mrr ?? 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                    <TableCell>
                      $
                      {Number(row.revenue ?? row.mrr ?? 0).toLocaleString(
                        undefined,
                        {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        },
                      )}
                    </TableCell>
                    <TableCell>
                      <span
                        className={
                          row.churn > 10
                            ? "text-red-400"
                            : row.churn > 5
                              ? "text-amber-400"
                              : "text-emerald-400"
                        }
                      >
                        {row.churn}%
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.avgLifetime}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
