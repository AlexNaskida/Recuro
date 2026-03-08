import { useState } from "react";
import {
  AlertCircle, ArrowRight, CheckCircle2, ExternalLink,
  Loader2, Shield, Timer, Users,
} from "lucide-react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import { Card, Button, Badge, Skeleton, Separator } from "@/components/ui/index";
import { useSubscribe } from "@/hooks/index";
import { cn } from "@/lib/utils";
import { SOLSCAN_ACC, SOLSCAN_TX, formatUSDC, intervalLabel, truncate } from "@/constants";
import type { PlanAccount } from "@solana-subscription/sdk";

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ icon: Icon, label, value }: {
  icon: React.ElementType; label: string; value: string;
}) {
  return (
    <div className="flex items-center gap-2 rounded-xl bg-surface-3 px-3 py-2.5">
      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground">{label}</p>
        <p className="text-xs font-semibold truncate">{value}</p>
      </div>
    </div>
  );
}

// ── Subscribe confirmation dialog ─────────────────────────────────────────────
interface SubscribeDialogProps {
  plan:     PlanAccount;
  open:     boolean;
  onClose:  () => void;
}

function SubscribeDialog({ plan, open, onClose }: SubscribeDialogProps) {
  const subscribe = useSubscribe();
  const [result, setResult] = useState<{ sig: string; subPubkey: string } | null>(null);
  const planKey = plan.publicKey.toBase58();
  const amount  = plan.amountUsdc.toNumber();
  const interval = intervalLabel(plan.intervalSeconds.toNumber());

  async function handleSubscribe() {
    try {
      const res = await subscribe.mutateAsync({ planPubkey: planKey });
      setResult({ sig: res.signature, subPubkey: res.subscriptionPubkey.toBase58() });
    } catch {
      // error handled by mutation
    }
  }

  function handleClose() {
    setResult(null);
    subscribe.reset();
    onClose();
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-surface-4 bg-surface-2 p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {result ? (
            // ── Success state ──────────────────────────────────────────
            <div className="flex flex-col items-center gap-5 text-center py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">You're subscribed!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Payments will be automated by Clockwork on-chain.
                </p>
              </div>
              <div className="w-full space-y-2 text-left">
                <div className="rounded-xl bg-surface-3 p-3">
                  <p className="text-[11px] text-muted-foreground mb-1">Subscription PDA</p>
                  <a
                    href={SOLSCAN_ACC(result.subPubkey)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-brand-400 hover:underline flex items-center gap-1"
                  >
                    {truncate(result.subPubkey, 20, 6)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="rounded-xl bg-surface-3 p-3">
                  <p className="text-[11px] text-muted-foreground mb-1">Transaction</p>
                  <a
                    href={SOLSCAN_TX(result.sig)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-xs text-brand-400 hover:underline flex items-center gap-1"
                  >
                    {truncate(result.sig, 20, 6)}
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
              </div>
              <Button variant="surface" className="w-full" onClick={handleClose}>
                Done
              </Button>
            </div>
          ) : (
            // ── Confirmation state ─────────────────────────────────────
            <>
              <AlertDialog.Title className="text-lg font-bold">
                Confirm subscription
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-1 text-sm text-muted-foreground">
                Review the details before authorising the on-chain transaction.
              </AlertDialog.Description>

              {/* Plan summary */}
              <div className="mt-5 rounded-xl border border-surface-4 bg-surface-3 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{plan.name}</span>
                  <span className="text-xl font-bold text-emerald-400">
                    {formatUSDC(amount)} <span className="text-sm font-normal text-muted-foreground">/ {interval}</span>
                  </span>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">First charge</span>
                    <span>{plan.trialSeconds.toNumber() > 0
                      ? `After ${plan.trialSeconds.toNumber() / 86400}-day trial`
                      : "Upon confirmation"}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Auto-renews</span>
                    <span>Every {interval}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cancellation</span>
                    <span>Any time, on-chain</span>
                  </div>
                </div>
              </div>

              {/* Security note */}
              <div className="mt-4 flex gap-2.5 rounded-xl border border-brand-500/20 bg-brand-500/5 p-3">
                <Shield className="h-4 w-4 text-brand-400 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">Non-custodial.</span>{" "}
                  Your USDC stays in your wallet. Only the exact plan amount is pulled each cycle by the on-chain Clockwork thread.
                </p>
              </div>

              {/* Error */}
              {subscribe.isError && (
                <div className="mt-3 flex gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">
                    {(subscribe.error as Error)?.message ?? "Transaction failed"}
                  </p>
                </div>
              )}

              <div className="mt-5 flex gap-3">
                <AlertDialog.Cancel asChild>
                  <Button variant="surface" className="flex-1" disabled={subscribe.isPending}>
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <Button
                  className="flex-1"
                  loading={subscribe.isPending}
                  onClick={handleSubscribe}
                >
                  {subscribe.isPending ? "Confirming…" : "Subscribe"}
                  {!subscribe.isPending && <ArrowRight className="h-4 w-4" />}
                </Button>
              </div>
            </>
          )}
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────
interface PlanCardProps {
  plan:         PlanAccount;
  isSubscribed?: boolean;
}

export function PlanCard({ plan, isSubscribed = false }: PlanCardProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const amount   = plan.amountUsdc.toNumber();
  const interval = intervalLabel(plan.intervalSeconds.toNumber());
  const trial    = plan.trialSeconds.toNumber();
  const capacity = plan.maxSubscribers.toNumber();
  const active   = plan.activeSubscribers.toNumber();
  const isFull   = capacity > 0 && active >= capacity;

  return (
    <>
      <Card className={cn(
        "group flex flex-col transition-all duration-300 hover:border-brand-500/40 hover:shadow-xl hover:shadow-brand-500/10",
        isSubscribed && "border-emerald-500/40 bg-emerald-500/5"
      )}>
        {/* Header */}
        <div className="p-5 pb-0 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-semibold truncate text-lg">{plan.name}</h3>
            <a
              href={SOLSCAN_ACC(plan.publicKey.toBase58())}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-[11px] text-muted-foreground hover:text-brand-400 transition-colors flex items-center gap-1"
            >
              {truncate(plan.publicKey.toBase58())}
              <ExternalLink className="h-2.5 w-2.5" />
            </a>
          </div>
          {isSubscribed
            ? <Badge variant="active">Subscribed</Badge>
            : isFull
              ? <Badge variant="expired">Full</Badge>
              : <Badge variant="default">Active</Badge>
          }
        </div>

        {/* Price */}
        <div className="px-5 py-4">
          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-bold text-emerald-400">
              {formatUSDC(amount)}
            </span>
            <span className="text-sm text-muted-foreground">/ {interval}</span>
          </div>
          {trial > 0 && (
            <p className="mt-1 text-xs text-amber-400 flex items-center gap-1">
              <Timer className="h-3 w-3" />
              {trial / 86400}-day free trial
            </p>
          )}
        </div>

        {/* Description */}
        {plan.description && (
          <div className="px-5 pb-4">
            <p className="text-sm text-muted-foreground line-clamp-2">{plan.description}</p>
          </div>
        )}

        <Separator />

        {/* Stats */}
        <div className="p-4 grid grid-cols-2 gap-2">
          <StatPill
            icon={Users}
            label="Subscribers"
            value={capacity > 0 ? `${active} / ${capacity}` : `${active} active`}
          />
          <StatPill
            icon={Shield}
            label="Security"
            value="Non-custodial"
          />
        </div>

        {/* CTA */}
        <div className="p-4 pt-0">
          {isSubscribed ? (
            <Button variant="surface" size="lg" className="w-full" disabled>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Already subscribed
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full group-hover:shadow-lg group-hover:shadow-brand-500/20 transition-shadow"
              disabled={isFull}
              onClick={() => setDialogOpen(true)}
            >
              {isFull ? "Plan is full" : "Subscribe with USDC"}
              {!isFull && <ArrowRight className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </Card>

      <SubscribeDialog
        plan={plan}
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
      />
    </>
  );
}

// ── Skeleton card ──────────────────────────────────────────────────────────────
export function PlanCardSkeleton() {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex justify-between">
        <div className="space-y-2"><Skeleton className="h-5 w-36" /><Skeleton className="h-3 w-24" /></div>
        <Skeleton className="h-6 w-16 rounded-full" />
      </div>
      <Skeleton className="h-10 w-28" />
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-3/4" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-12 rounded-xl" />
        <Skeleton className="h-12 rounded-xl" />
      </div>
      <Skeleton className="h-11 rounded-xl" />
    </Card>
  );
}
