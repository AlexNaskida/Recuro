import { type LucideIcon, TrendingDown, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/toaster";

interface KpiCardProps {
  label:       string;
  value:       string;
  subLabel?:   string;
  trend?:      number;    // percent change — positive = up, negative = down
  trendLabel?: string;
  icon?:       LucideIcon;
  iconColor?:  string;
  isLoading?:  boolean;
  highlight?:  "brand" | "emerald" | "amber" | "default";
}

export function KpiCard({
  label, value, subLabel, trend, trendLabel,
  icon: Icon, iconColor, isLoading = false, highlight = "default",
}: KpiCardProps) {
  const highlightClass: Record<string, string> = {
    brand:   "border-brand-500/30 bg-brand-500/5",
    emerald: "border-emerald-500/30 bg-emerald-500/5",
    amber:   "border-amber-500/30 bg-amber-500/5",
    default: "border-surface-4 bg-surface-2",
  };

  const iconColorClass: Record<string, string> = {
    brand:   "bg-brand-500/15 text-brand-400",
    emerald: "bg-emerald-500/15 text-emerald-400",
    amber:   "bg-amber-500/15 text-amber-400",
    default: "bg-surface-3 text-muted-foreground",
  };

  if (isLoading) {
    return (
      <div className="rounded-xl border border-surface-4 bg-surface-2 p-5">
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  const trendUp      = (trend ?? 0) >= 0;
  const TrendIcon    = trendUp ? TrendingUp : TrendingDown;
  const trendColor   = trendUp ? "text-emerald-400" : "text-red-400";
  const trendBg      = trendUp ? "bg-emerald-500/10" : "bg-red-500/10";

  return (
    <div className={cn(
      "rounded-xl border p-5 transition-all duration-200 card-hover",
      highlightClass[highlight]
    )}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        {Icon && (
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            iconColor ?? iconColorClass[highlight]
          )}>
            <Icon className="h-4 w-4" />
          </div>
        )}
      </div>

      <p className={cn(
        "text-2xl font-bold leading-none mb-1",
        highlight !== "default" && {
          brand:   "text-brand-400",
          emerald: "text-emerald-400",
          amber:   "text-amber-400",
        }[highlight]
      )}>
        {value}
      </p>

      <div className="flex items-center gap-2">
        {subLabel && (
          <p className="text-xs text-muted-foreground">{subLabel}</p>
        )}
        {trend !== undefined && (
          <div className={cn(
            "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
            trendBg, trendColor
          )}>
            <TrendIcon className="h-3 w-3" />
            {Math.abs(trend).toFixed(1)}%
          </div>
        )}
        {trendLabel && (
          <p className="text-[11px] text-muted-foreground">{trendLabel}</p>
        )}
      </div>
    </div>
  );
}
