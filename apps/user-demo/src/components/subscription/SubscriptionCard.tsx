import { useState } from "react";
import {
  AlertCircle, Calendar, CheckCircle2, Clock,
  ExternalLink, RefreshCw, XCircle,
} from "lucide-react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Card, Button, Badge, Separator } from "@/components/ui/index";
import { useCancelSubscription } from "@/hooks/index";
import { cn } from "@/lib/utils";
import {
  SOLSCAN_ACC, SOLSCAN_TX, formatUSDC, intervalLabel, truncate,
} from "@/constants";
import { formatTs, formatTsRelative } from "@/lib/utils";
import type { SubscriptionAccount } from "@solana-subscription/sdk";

type SubStatus = "Active" | "Cancelled" | "Expired" | "PastDue";

function statusVariant(status: SubStatus): Parameters<typeof Badge>[0]["variant"] {
  switch (status) {
    case "Active":    return "active";
    case "Cancelled": return "cancelled";
    case "Expired":   return "expired";
    case "PastDue":   return "past_due";
    default:          return "default";
  }
}

// ── Cancel confirmation dialog ────────────────────────────────────────────────
function CancelDialog({
  sub, open, onClose,
}: { sub: SubscriptionAccount; open: boolean; onClose: () => void }) {
  const cancel = useCancelSubscription();
  const [sig, setSig] = useState<string | null>(null);

  async function handleCancel() {
    try {
      const res = await cancel.mutateAsync(sub.publicKey.toBase58());
      setSig(res.signature);
    } catch { /* handled by mutation */ }
  }

  function handleClose() {
    setSig(null);
    cancel.reset();
    onClose();
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-surface-4 bg-surface-2 p-6 shadow-2xl">
          {sig ? (
            <div className="flex flex-col items-center gap-5 text-center py-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-500/15">
                <CheckCircle2 className="h-7 w-7 text-red-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Subscription cancelled</h2>
                <p className="text-sm text-muted-foreground mt-1">No future payments will be taken.</p>
              </div>
              <a
                href={SOLSCAN_TX(sig)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-xs text-brand-400 hover:underline font-mono"
              >
                View transaction <ExternalLink className="h-3 w-3" />
              </a>
              <Button variant="surface" className="w-full" onClick={handleClose}>Close</Button>
            </div>
          ) : (
            <>
              <AlertDialog.Title className="text-lg font-bold text-red-400">
                Cancel subscription?
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-1 text-sm text-muted-foreground">
                This will stop all future automated payments. The cancellation is recorded on-chain immediately.
              </AlertDialog.Description>

              <div className="mt-5 rounded-xl bg-surface-3 border border-surface-4 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total paid</span>
                  <span className="font-semibold">{formatUSDC(sub.totalPaid.toNumber())}</span>
                </div>
                <div className="flex justify-between mt-2">
                  <span className="text-muted-foreground">Payments made</span>
                  <span>{sub.paymentCount.toNumber()}</span>
                </div>
              </div>

              {cancel.isError && (
                <div className="mt-3 flex gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                  <p className="text-xs text-red-400">{(cancel.error as Error)?.message}</p>
                </div>
              )}

              <div className="mt-5 flex gap-3">
                <AlertDialog.Cancel asChild>
                  <Button variant="surface" className="flex-1" disabled={cancel.isPending}>
                    Keep subscription
                  </Button>
                </AlertDialog.Cancel>
                <Button
                  variant="destructive"
                  className="flex-1"
                  loading={cancel.isPending}
                  onClick={handleCancel}
                >
                  <XCircle className="h-4 w-4" />
                  {cancel.isPending ? "Cancelling…" : "Yes, cancel"}
                </Button>
              </div>
            </>
          )}
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

// ── Subscription Card ─────────────────────────────────────────────────────────
export function SubscriptionCard({ sub }: { sub: SubscriptionAccount }) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const status   = sub.status as SubStatus;
  const amount   = sub.amountUsdc.toNumber();
  const interval = intervalLabel(sub.intervalSeconds.toNumber());
  const nextPay  = sub.nextPaymentAt.toNumber();
  const lastPay  = sub.lastPaidAt.toNumber();
  const isActive = status === "Active" || status === "PastDue";

  return (
    <>
      <Card className={cn(
        "transition-all duration-200",
        status === "Active"    && "border-emerald-500/30 hover:border-emerald-500/50",
        status === "PastDue"   && "border-amber-500/30",
        status === "Cancelled" && "opacity-60",
        status === "Expired"   && "opacity-50",
      )}>
        {/* Header */}
        <div className="p-5 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">Subscription</p>
            <a
              href={SOLSCAN_ACC(sub.publicKey.toBase58())}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-sm text-brand-400 hover:underline flex items-center gap-1"
            >
              {truncate(sub.publicKey.toBase58(), 10, 6)}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <Badge variant={statusVariant(status)}>{status}</Badge>
        </div>

        <Separator />

        {/* Details */}
        <div className="p-5 space-y-3">
          {/* Amount */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-3xl font-bold text-emerald-400">{formatUSDC(amount)}</span>
            <span className="text-sm text-muted-foreground">/ {interval}</span>
          </div>

          {/* Timeline */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="rounded-xl bg-surface-3 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Calendar className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">
                  {isActive ? "Next payment" : "Last payment"}
                </span>
              </div>
              <p className="text-sm font-semibold">
                {isActive
                  ? nextPay > 0 ? formatTs(nextPay) : "—"
                  : lastPay > 0 ? formatTs(lastPay) : "—"
                }
              </p>
              {isActive && nextPay > 0 && (
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {formatTsRelative(nextPay)}
                </p>
              )}
            </div>

            <div className="rounded-xl bg-surface-3 p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Clock className="h-3 w-3 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Total paid</span>
              </div>
              <p className="text-sm font-semibold">{formatUSDC(sub.totalPaid.toNumber())}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {sub.paymentCount.toNumber()} payment{sub.paymentCount.toNumber() !== 1 ? "s" : ""}
              </p>
            </div>
          </div>

          {/* Failures warning */}
          {sub.consecutiveFailures > 0 && (
            <div className="flex gap-2 rounded-xl border border-amber-500/20 bg-amber-500/5 p-3">
              <AlertCircle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-400">
                {sub.consecutiveFailures} consecutive payment failure{sub.consecutiveFailures > 1 ? "s" : ""}.
                Top up your USDC balance to avoid subscription expiry.
              </p>
            </div>
          )}

          {/* Plan reference */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">Plan</span>
            <a
              href={SOLSCAN_ACC(sub.plan.toBase58())}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-muted-foreground hover:text-brand-400 transition-colors flex items-center gap-1"
            >
              {truncate(sub.plan.toBase58())}
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
        </div>

        {/* Actions */}
        {isActive && (
          <>
            <Separator />
            <div className="p-4">
              <Button
                variant="destructive"
                size="md"
                className="w-full"
                onClick={() => setCancelOpen(true)}
              >
                <XCircle className="h-4 w-4" />
                Cancel subscription
              </Button>
            </div>
          </>
        )}
      </Card>

      <CancelDialog
        sub={sub}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
      />
    </>
  );
}
