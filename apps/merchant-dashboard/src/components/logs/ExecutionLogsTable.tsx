import { useState } from "react";
import { ExternalLink, Filter } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/toaster";
import { useAnalyticsStore } from "@/store/analyticsStore";
import { SOLSCAN_TX, truncate, formatUSDC } from "@/constants";
import { formatTsFull } from "@/lib/utils";
import type { LiveEvent, LiveEventType } from "@/store/analyticsStore";

const ALL_TYPES: { value: LiveEventType | "all"; label: string }[] = [
  { value: "all",                  label: "All"       },
  { value: "payment_executed",     label: "Payments"  },
  { value: "payment_failed",       label: "Failed"    },
  { value: "subscription_created", label: "New Subs"  },
  { value: "subscription_cancelled", label: "Cancelled" },
];

const TYPE_META: Record<LiveEventType, { label: string; variant: Parameters<typeof Badge>[0]["variant"] }> = {
  payment_executed:       { label: "Payment",      variant: "success"    },
  payment_failed:         { label: "Failed",       variant: "destructive" },
  subscription_created:   { label: "New Sub",      variant: "default"    },
  subscription_cancelled: { label: "Cancelled",    variant: "cancelled"  },
  subscription_expired:   { label: "Expired",      variant: "expired"    },
};

export function ExecutionLogsTable() {
  const allEvents              = useAnalyticsStore((s) => s.liveEvents);
  const [filter, setFilter]    = useState<LiveEventType | "all">("all");
  const [search, setSearch]    = useState("");

  const filtered = allEvents.filter((e) => {
    const typeOk   = filter === "all" || e.type === filter;
    const searchOk = !search ||
      e.subscriberAddress.toLowerCase().includes(search.toLowerCase()) ||
      e.subscriptionPubkey.toLowerCase().includes(search.toLowerCase()) ||
      e.txSignature?.toLowerCase().includes(search.toLowerCase());
    return typeOk && searchOk;
  });

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by address or signature…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1.5">
          {ALL_TYPES.map(({ value, label }) => (
            <Button
              key={value}
              variant={filter === value ? "brand" : "surface"}
              size="sm"
              onClick={() => setFilter(value)}
            >
              {label}
            </Button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.length} events
        </span>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-surface-4 bg-surface-2 overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-[160px_130px_1fr_90px_90px_48px] gap-4 px-4 py-3 bg-surface-3 text-[11px] font-medium uppercase tracking-wider text-muted-foreground border-b border-surface-4">
          <span>Timestamp</span>
          <span>Type</span>
          <span>Subscriber</span>
          <span>Amount</span>
          <span>Status</span>
          <span />
        </div>

        <ScrollArea className="h-[calc(100vh-320px)] min-h-[400px]">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center py-20 text-sm text-muted-foreground">
              No events match your filters.
            </div>
          ) : (
            filtered.map((event, idx) => (
              <EventRow key={`${event.id}-${idx}`} event={event} />
            ))
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

function EventRow({ event }: { event: LiveEvent }) {
  const meta = TYPE_META[event.type];

  return (
    <div className="grid grid-cols-[160px_130px_1fr_90px_90px_48px] gap-4 px-4 py-3.5 border-b border-surface-4 last:border-0 hover:bg-surface-3/60 transition-colors text-sm items-center animate-fade-in">
      <span className="font-mono text-xs text-muted-foreground">
        {formatTsFull(event.timestamp)}
      </span>
      <Badge variant={meta.variant}>{meta.label}</Badge>
      <div className="min-w-0">
        <p className="font-mono text-xs truncate">{truncate(event.subscriberAddress, 8, 6)}</p>
        <p className="font-mono text-[10px] text-muted-foreground truncate mt-0.5">
          {truncate(event.subscriptionPubkey, 8, 6)}
        </p>
      </div>
      <span className={`font-mono text-xs font-semibold ${event.amountUsdc ? "text-emerald-400" : "text-muted-foreground"}`}>
        {event.amountUsdc ? formatUSDC(event.amountUsdc * 1_000_000) : "—"}
      </span>
      <Badge variant={event.status === "success" ? "success" : "destructive"}>
        {event.status}
      </Badge>
      {event.txSignature ? (
        <a
          href={SOLSCAN_TX(event.txSignature)}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center h-7 w-7 rounded-lg hover:bg-surface-4 text-muted-foreground hover:text-brand-400 transition-colors"
        >
          <ExternalLink className="h-3.5 w-3.5" />
        </a>
      ) : (
        <span />
      )}
    </div>
  );
}
