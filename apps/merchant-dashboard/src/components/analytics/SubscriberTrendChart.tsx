import {
  BarChart, Bar, CartesianGrid, ResponsiveContainer,
  Tooltip, XAxis, YAxis, Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/toaster";
import { CHART_COLORS } from "@/constants";
import type { SubscriptionTrendPoint } from "@solana-subscription/sdk";

interface Props {
  data:       SubscriptionTrendPoint[];
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
            <span className="h-2 w-2 rounded-full" style={{ background: entry.fill }} />
            {entry.name}
          </span>
          <span className="font-mono font-semibold">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export function SubscriberTrendChart({ data, isLoading }: Props) {
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
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Subscriber Trend</CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        {data.length === 0 ? (
          <div className="flex h-52 items-center justify-center text-sm text-muted-foreground">
            No subscriber data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART_COLORS.grid} vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fill: CHART_COLORS.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: CHART_COLORS.muted, fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                width={32}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ paddingTop: "12px", fontSize: "12px", color: CHART_COLORS.muted }}
              />
              <Bar dataKey="new"       fill={CHART_COLORS.secondary} name="New"       radius={[3, 3, 0, 0]} maxBarSize={32} />
              <Bar dataKey="active"    fill={CHART_COLORS.primary}   name="Active"    radius={[3, 3, 0, 0]} maxBarSize={32} />
              <Bar dataKey="cancelled" fill={CHART_COLORS.danger}    name="Cancelled" radius={[3, 3, 0, 0]} maxBarSize={32} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}
