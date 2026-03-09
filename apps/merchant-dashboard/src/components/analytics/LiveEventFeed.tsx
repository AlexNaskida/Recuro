import { ExternalLink, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/toaster";
import { useAnalyticsStore } from "@/store/analyticsStore";
import { SOLSCAN_TX, truncate, formatUSDC } from "@/constants";
import { formatTsRelative } from "@/lib/utils";
import type { LiveEvent, LiveEventType } from "@/store/analyticsStore";

const EVENT_META: Record<
  LiveEventType,
  { label: string; badge: Parameters<typeof Badge>[0]["variant"] }
> = {
  payment_executed:     { label: "Payment",     badge: "success"   },
  payment_failed:       { label: "Failed",      badge: "destructive" },
  subscription_created: { label: "New Sub",     badge: "default"   },
  subscription_cancelled: { label: "Cancelled", badge: "cancelled" },
  subscription_expired: { label: "Expired",     badge: "expired"   },
};

function EventRow({ event }: { event: LiveEvent }) {
  const meta = EVENT_META[event.type];
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-surface-4 last:border-0 animate-fade-in">
      <div className="flex items-start gap-3 min-w-0">
        <Badge variant={meta.badge} className="shrink-0 mt-0.5">{meta.label}</Badge>
        <div className="min-w-0">
          <p className="font-mono text-xs text-muted-foreground truncate">
            {truncate(event.subscriberAddress)}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {formatTsRelative(event.timestamp)}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {event.amountUsdc && (
          <span className="text-sm font-semibold text-emerald-400">
            {formatUSDC(event.amountUsdc * 1_000_000)}
          </span>
        )}
        {event.txSignature && (
          <a
            href={SOLSCAN_TX(event.txSignature)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted-foreground hover:text-brand-400 transition-colors"
          >
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    </div>
  );
}

export function LiveEventFeed({ maxItems = 20 }: { maxItems?: number }) {
  const events = useAnalyticsStore((s) => s.liveEvents.slice(0, maxItems));

  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Live Events
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-72 px-6">
          {events.length === 0 ? (
            <div className="flex h-full items-center justify-center py-12 text-sm text-muted-foreground">
              <div className="text-center">
                <Zap className="mx-auto h-8 w-8 opacity-20 mb-2" />
                Listening for on-chain events…
              </div>
            </div>
          ) : (
            events.map((e) => <EventRow key={e.id} event={e} />)
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
