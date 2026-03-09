import {
  AreaChart, Area, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from "recharts";
import { useAnalyticsStore } from "@/store/analyticsStore";
import { CHART_COLORS, formatUSDC } from "@/constants";
import { bucketByTime } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/toaster";
import type { RevenueDataPoint } from "@solana-subscription/sdk";

interface Props {
  data:       RevenueDataPoint[];
  isLoading?: boolean;
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-surface-4 bg-surface-2 p-3 shadow-xl text-xs">
      <p className="text-muted-foreground mb-2 font-medium">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.dataKey} className="flex items-center justify-between gap-6">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ background: entry.color }} />
            {entry.name}
          </span>
          <span className="font-mono font-semibold">{formatUSDC(entry.value * 1_000_000)}</span>
        </div>
      ))}
    </div>
  );
};

export function RevenueChart({ data, isLoading }: Props) {
  const { granularity, setGranularity } = useAnalyticsStore();

  const chartData = bucketByTime(
    data.map((d) => ({ ts: new Date(d.date).getTime() / 1000, value: d.revenue })),
    granularity
  );

  if (isLoading) {
    return (
      <Card>
        <CardHeader><CardTitle><Skeleton className="h-5 w-40" /></CardTitle></CardHeader>
        <CardContent><Skeleton className="h-52 w-full" /></CardContent>
      </Card>
    );
  }

  return (
    <Card className="card-hover">
      <CardHeader className="flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Revenue</CardTitle>
        <div className="flex gap-1 rounded-lg border border-surface-4 p-0.5 text-xs">
          {(["day", "week", "month"] as const).map((g) => (
            <button
              key={g}
              onClick={() => setGranularity(g)}
              className={`rounded-md px-2.5 py-1 capitalize transition-colors ${
                granularity === g
                  ? "bg-brand-500 text-white"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="pb-4">
        {chartData.length === 0 ? (
          <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
            No revenue data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <defs>
                <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CHART_COLORS.primary} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={CHART_COLORS.primary} stopOpacity={0}    />
                </linearGradient>
                <linearGradient id="gradCumulative" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={CHART_COLORS.secondary} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={CHART_COLORS.secondary} stopOpacity={0}   />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART_COLORS.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: CHART_COLORS.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `$${v}`}
                width={48}
              />
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="cumulative"
                stroke={CHART_COLORS.secondary}
                fill="url(#gradCumulative)"
                strokeWidth={2}
                name="Cumulative"
                dot={false}
              />
              <Area
                type="monotone"
                dataKey="value"
                stroke={CHART_COLORS.primary}
                fill="url(#gradRevenue)"
                strokeWidth={2}
                name="Period"
                dot={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
