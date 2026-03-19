/**
 * My Subscriptions page — shows all subscriptions for the connected wallet.
 * Supports pause, resume, and cancel actions per subscription.
 */
import { useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ExternalLink, Pause, Play, XCircle, ChevronDown, ChevronUp } from "lucide-react";
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
  Button, Badge, Skeleton,
} from "@/components/ui";
import {
  useMySubscriptions,
  usePlan,
  useCancelSubscription,
  usePauseSubscription,
  useResumeSubscription,
} from "@/hooks/useSubscriptions";
import {
  cn, formatUSDC, intervalLabel, truncate,
  formatTs, formatTsRelative, SOLSCAN_ACC, SOLSCAN_TX,
} from "@/lib/utils";
import type { SubscriptionAccount } from "@recuro/sdk";

// ── Subscription row ──────────────────────────────────────────────────────────
function SubscriptionRow({ sub }: { sub: SubscriptionAccount }) {
  const [expanded, setExpanded] = useState(false);

  const { data: plan, isLoading: planLoading } = usePlan(sub.plan.toBase58());
  const cancel  = useCancelSubscription();
  const pause   = usePauseSubscription();
  const resume  = useResumeSubscription();

  const subKey    = sub.publicKey.toBase58();
  const isMutating = cancel.isPending || pause.isPending || resume.isPending;

  const statusVariant =
    sub.status === "Active"    ? "success" :
    sub.status === "Paused"    ? "warning" :
    sub.status === "Cancelled" ? "muted"   : "danger";

  const nextPayment = sub.nextPaymentAt.toNumber();
  const now         = Math.floor(Date.now() / 1000);
  const isDue       = nextPayment > 0 && nextPayment <= now;

  return (
    <Card className={cn(
      "transition-colors",
      sub.status === "Active"    ? "border-[hsl(var(--success)/0.2)]" : "",
      sub.status === "Paused"    ? "border-[hsl(var(--warning)/0.2)]" : "",
      sub.status === "Cancelled" ? "opacity-60" : "",
    )}>
      {/* Collapsed header */}
      <CardHeader
        className="cursor-pointer select-none"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Badge variant={statusVariant}>{sub.status}</Badge>
            <div className="min-w-0">
              {planLoading ? (
                <Skeleton className="h-4 w-32" />
              ) : (
                <CardTitle className="text-base truncate">
                  {plan?.name ?? truncate(sub.plan.toBase58())}
                </CardTitle>
              )}
              <CardDescription className="mt-0.5">
                {formatUSDC(sub.amountUsdc.toNumber())} /{" "}
                {plan ? intervalLabel(plan.intervalSeconds.toNumber()) : "…"}
              </CardDescription>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isDue && sub.status === "Active" && (
              <Badge variant="warning">Payment due</Badge>
            )}
            {expanded ? (
              <ChevronUp className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            ) : (
              <ChevronDown className="h-4 w-4 text-[hsl(var(--muted-foreground))]" />
            )}
          </div>
        </div>
      </CardHeader>

      {/* Expanded details */}
      {expanded && (
        <CardContent className="border-t border-[hsl(var(--border))] pt-4 space-y-4">
          {/* Stats grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
                Total paid
              </p>
              <p className="font-semibold num">{formatUSDC(sub.totalPaid.toNumber())}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
                Payments
              </p>
              <p className="font-semibold num">{sub.paymentCount.toNumber()}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
                Started
              </p>
              <p className="font-semibold">{formatTs(sub.startedAt.toNumber())}</p>
            </div>
            {sub.status === "Active" && nextPayment > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
                  Next payment
                </p>
                <p className={cn("font-semibold", isDue ? "text-[hsl(var(--warning))]" : "")}>
                  {isDue ? "Due now" : formatTsRelative(nextPayment)}
                </p>
              </div>
            )}
            {sub.lastPaidAt.toNumber() > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
                  Last paid
                </p>
                <p className="font-semibold">{formatTsRelative(sub.lastPaidAt.toNumber())}</p>
              </div>
            )}
            {sub.failedPaymentCount > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
                  Failed payments
                </p>
                <p className="font-semibold text-[hsl(var(--destructive))]">
                  {sub.failedPaymentCount} / 3
                </p>
              </div>
            )}
            {sub.trialEndsAt.toNumber() > 0 && (
              <div>
                <p className="text-[10px] uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
                  Trial ends
                </p>
                <p className="font-semibold">{formatTs(sub.trialEndsAt.toNumber())}</p>
              </div>
            )}
          </div>

          {/* PDAs */}
          <div className="rounded-xl bg-[hsl(var(--muted))] p-3 space-y-2 text-xs font-mono">
            <div className="flex justify-between items-center gap-2">
              <span className="text-[hsl(var(--muted-foreground))]">Subscription PDA</span>
              <a href={SOLSCAN_ACC(subKey)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[hsl(var(--primary))] hover:underline">
                {truncate(subKey)} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <div className="flex justify-between items-center gap-2">
              <span className="text-[hsl(var(--muted-foreground))]">Plan PDA</span>
              <a href={SOLSCAN_ACC(sub.plan.toBase58())} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[hsl(var(--primary))] hover:underline">
                {truncate(sub.plan.toBase58())} <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          {/* Actions */}
          {(sub.status === "Active" || sub.status === "Paused") && (
            <div className="flex gap-2 pt-1">
              {sub.status === "Active" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => pause.mutate(subKey)}
                  disabled={isMutating}
                  loading={pause.isPending}
                >
                  <Pause className="h-3.5 w-3.5" />
                  Pause
                </Button>
              )}
              {sub.status === "Paused" && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => resume.mutate(subKey)}
                  disabled={isMutating}
                  loading={resume.isPending}
                >
                  <Play className="h-3.5 w-3.5" />
                  Resume
                </Button>
              )}
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (confirm("Cancel this subscription? This cannot be undone.")) {
                    cancel.mutate(subKey);
                  }
                }}
                disabled={isMutating}
                loading={cancel.isPending}
              >
                <XCircle className="h-3.5 w-3.5" />
                Cancel subscription
              </Button>
            </div>
          )}

          {(cancel.isError || pause.isError || resume.isError) && (
            <p className="text-xs text-[hsl(var(--destructive))]">
              {((cancel.error || pause.error || resume.error) as Error)?.message}
            </p>
          )}
        </CardContent>
      )}
    </Card>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function SubscriptionsPage() {
  const wallet              = useAnchorWallet();
  const { data: subs, isLoading } = useMySubscriptions();

  const [filter, setFilter] = useState<"all" | "active" | "inactive">("all");

  const filtered = subs?.filter((s) => {
    if (filter === "active")   return s.status === "Active" || s.status === "Paused";
    if (filter === "inactive") return s.status === "Cancelled" || s.status === "Expired";
    return true;
  }) ?? [];

  const active    = subs?.filter((s) => s.status === "Active").length ?? 0;
  const paused    = subs?.filter((s) => s.status === "Paused").length ?? 0;
  const cancelled = subs?.filter((s) => s.status === "Cancelled" || s.status === "Expired").length ?? 0;

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
        <p className="text-[hsl(var(--muted-foreground))]">Connect your wallet to view subscriptions</p>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6 animate-[fade-in_0.35s_ease-out]">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
            My Subscriptions
          </h1>
          <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
            {active} active · {paused} paused · {cancelled} ended
          </p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 rounded-xl border border-[hsl(var(--border))] p-1 w-fit">
        {(["all", "active", "inactive"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium capitalize transition-colors",
              filter === f
                ? "bg-[hsl(var(--primary))] text-white"
                : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]"
            )}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Subscription list */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 flex flex-col items-center gap-3">
            <p className="text-[hsl(var(--muted-foreground))]">
              {subs?.length === 0
                ? "No subscriptions yet. Browse plans to get started."
                : "No subscriptions match this filter."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filtered.map((sub) => (
            <SubscriptionRow key={sub.publicKey.toBase58()} sub={sub} />
          ))}
        </div>
      )}
    </div>
  );
}
