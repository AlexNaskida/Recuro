import { useState } from "react";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  RefreshCw,
  Shield,
  Timer,
  Users,
  XCircle,
} from "lucide-react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import {
  Card,
  Button,
  Badge,
  Skeleton,
  Separator,
} from "@/components/ui/index";
import {
  useSubscribe,
  useCancelSubscription,
  useRenewSubscription,
} from "@/hooks/index";
import { cn } from "@/lib/utils";
import {
  SOLSCAN_ACC,
  SOLSCAN_TX,
  formatUSDC,
  intervalLabel,
  truncate,
} from "@/constants";
import type {
  PlanAccount,
  SubscriptionAccount,
} from "@solana-subscription/sdk";

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
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

// ── Subscribe dialog ──────────────────────────────────────────────────────────
interface SubscribeDialogProps {
  plan: PlanAccount;
  open: boolean;
  onClose: () => void;
}

function SubscribeDialog({ plan, open, onClose }: SubscribeDialogProps) {
  const subscribe = useSubscribe();
  const [result, setResult] = useState<{
    sig: string;
    subPubkey: string;
  } | null>(null);
  const planKey = plan.publicKey.toBase58();
  const amount = plan.amountUsdc.toNumber();
  const interval = intervalLabel(plan.intervalSeconds.toNumber());

  async function handleSubscribe() {
    try {
      const res = await subscribe.mutateAsync({ planPubkey: planKey });
      setResult({
        sig: res.signature,
        subPubkey: res.subscriptionPubkey.toBase58(),
      });
    } catch {}
  }

  function handleClose() {
    setResult(null);
    subscribe.reset();
    onClose();
  }

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-surface-4 bg-surface-2 p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {result ? (
            <div className="flex flex-col items-center gap-5 text-center py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">You're subscribed!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  First payment charged immediately. Future payments are
                  automated.
                </p>
              </div>
              <div className="w-full space-y-2 text-left">
                <div className="rounded-xl bg-surface-3 p-3">
                  <p className="text-[11px] text-muted-foreground mb-1">
                    Subscription PDA
                  </p>
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
                  <p className="text-[11px] text-muted-foreground mb-1">
                    Transaction
                  </p>
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
              <Button
                variant="surface"
                className="w-full"
                onClick={handleClose}
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              <AlertDialog.Title className="text-lg font-bold">
                Confirm subscription
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-1 text-sm text-muted-foreground">
                Review the details before authorising the on-chain transaction.
              </AlertDialog.Description>
              <div className="mt-5 rounded-xl border border-surface-4 bg-surface-3 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{plan.name}</span>
                  <span className="text-xl font-bold text-emerald-400">
                    {formatUSDC(amount)}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      / {interval}
                    </span>
                  </span>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">First charge</span>
                    <span>
                      {plan.trialSeconds.toNumber() > 0
                        ? `After ${plan.trialSeconds.toNumber() / 86400}-day trial`
                        : "Immediately on confirm"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Auto-renews</span>
                    <span>Every {interval}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total authorised
                    </span>
                    <span className="text-amber-400">
                      {formatUSDC(amount * 12)} (12 cycles)
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cancellation</span>
                    <span>Any time, on-chain</span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2.5 rounded-xl border border-brand-500/20 bg-brand-500/5 p-3">
                <Shield className="h-4 w-4 text-brand-400 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">
                    Non-custodial.
                  </span>{" "}
                  Your USDC stays in your wallet. Only the exact plan amount is
                  pulled each cycle.
                </p>
              </div>
              {subscribe.isError && (
                <div className="mt-3 flex gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">
                    {(subscribe.error as Error)?.message ??
                      "Transaction failed"}
                  </p>
                </div>
              )}
              <div className="mt-5 flex gap-3">
                <AlertDialog.Cancel asChild>
                  <Button
                    variant="surface"
                    className="flex-1"
                    disabled={subscribe.isPending}
                  >
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

// ── Renew dialog ──────────────────────────────────────────────────────────────
interface RenewDialogProps {
  plan: PlanAccount;
  subscription: SubscriptionAccount;
  open: boolean;
  onClose: () => void;
}

function RenewDialog({ plan, subscription, open, onClose }: RenewDialogProps) {
  const renew = useRenewSubscription();
  const [result, setResult] = useState<{ sig: string } | null>(null);
  const amount = plan.amountUsdc.toNumber();
  const interval = intervalLabel(plan.intervalSeconds.toNumber());

  async function handleRenew() {
    try {
      const res = await renew.mutateAsync({
        subscriptionPubkey: subscription.publicKey.toBase58(),
        planPubkey: plan.publicKey.toBase58(),
      });
      setResult({ sig: res.signature });
    } catch {}
  }

  function handleClose() {
    setResult(null);
    renew.reset();
    onClose();
  }

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-surface-4 bg-surface-2 p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {result ? (
            <div className="flex flex-col items-center gap-5 text-center py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20">
                <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Subscription renewed!</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  First payment charged immediately. 12 new cycles authorised.
                </p>
              </div>
              <div className="rounded-xl bg-surface-3 p-3 w-full text-left">
                <p className="text-[11px] text-muted-foreground mb-1">
                  Transaction
                </p>
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
              <Button
                variant="surface"
                className="w-full"
                onClick={handleClose}
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              <AlertDialog.Title className="text-lg font-bold">
                Renew subscription?
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-1 text-sm text-muted-foreground">
                Your subscription expired. Renewing will charge immediately and
                authorise 12 new cycles.
              </AlertDialog.Description>
              <div className="mt-5 rounded-xl border border-surface-4 bg-surface-3 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{plan.name}</span>
                  <span className="text-xl font-bold text-emerald-400">
                    {formatUSDC(amount)}{" "}
                    <span className="text-sm font-normal text-muted-foreground">
                      / {interval}
                    </span>
                  </span>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">First charge</span>
                    <span>Immediately on confirm</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">New cycles</span>
                    <span>12 months</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total authorised
                    </span>
                    <span className="text-amber-400">
                      {formatUSDC(amount * 12)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Previous total paid
                    </span>
                    <span className="text-muted-foreground">
                      {formatUSDC(subscription.totalPaid?.toNumber?.() ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2.5 rounded-xl border border-brand-500/20 bg-brand-500/5 p-3">
                <Shield className="h-4 w-4 text-brand-400 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  <span className="text-foreground font-medium">
                    Non-custodial.
                  </span>{" "}
                  Same subscription PDA reused — no new account created.
                </p>
              </div>
              {renew.isError && (
                <div className="mt-3 flex gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">
                    {(renew.error as Error)?.message ?? "Transaction failed"}
                  </p>
                </div>
              )}
              <div className="mt-5 flex gap-3">
                <AlertDialog.Cancel asChild>
                  <Button
                    variant="surface"
                    className="flex-1"
                    disabled={renew.isPending}
                  >
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <Button
                  className="flex-1"
                  loading={renew.isPending}
                  onClick={handleRenew}
                >
                  {renew.isPending ? "Renewing…" : "Renew subscription"}
                  {!renew.isPending && <RefreshCw className="h-4 w-4" />}
                </Button>
              </div>
            </>
          )}
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

// ── Cancel dialog ─────────────────────────────────────────────────────────────
interface CancelDialogProps {
  plan: PlanAccount;
  subscription: SubscriptionAccount;
  open: boolean;
  onClose: () => void;
}

function CancelDialog({
  plan,
  subscription,
  open,
  onClose,
}: CancelDialogProps) {
  const cancel = useCancelSubscription();
  const [done, setDone] = useState(false);
  const amount = plan.amountUsdc.toNumber();
  const interval = intervalLabel(plan.intervalSeconds.toNumber());

  async function handleCancel() {
    try {
      await cancel.mutateAsync(subscription.publicKey.toBase58());
      setDone(true);
    } catch {}
  }

  function handleClose() {
    setDone(false);
    cancel.reset();
    onClose();
  }

  return (
    <AlertDialog.Root
      open={open}
      onOpenChange={(o) => {
        if (!o) handleClose();
      }}
    >
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <AlertDialog.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-surface-4 bg-surface-2 p-6 shadow-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95">
          {done ? (
            <div className="flex flex-col items-center gap-5 text-center py-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-500/20">
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Subscription cancelled</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Delegate revoked on-chain. No further payments will be taken.
                </p>
              </div>
              <Button
                variant="surface"
                className="w-full"
                onClick={handleClose}
              >
                Done
              </Button>
            </div>
          ) : (
            <>
              <AlertDialog.Title className="text-lg font-bold">
                Cancel subscription?
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-1 text-sm text-muted-foreground">
                This is irreversible. You can re-subscribe at any time.
              </AlertDialog.Description>
              <div className="mt-5 rounded-xl border border-surface-4 bg-surface-3 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{plan.name}</span>
                  <span className="text-lg font-bold text-muted-foreground line-through">
                    {formatUSDC(amount)}{" "}
                    <span className="text-sm font-normal">/ {interval}</span>
                  </span>
                </div>
                <Separator />
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Cycles remaining
                    </span>
                    <span>
                      {"cyclesRemaining" in subscription
                        ? ((subscription as any).cyclesRemaining ?? "—")
                        : "—"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total paid</span>
                    <span>
                      {formatUSDC(subscription.totalPaid?.toNumber?.() ?? 0)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="mt-4 flex gap-2.5 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">
                  Cancelling will{" "}
                  <span className="text-foreground font-medium">
                    immediately revoke
                  </span>{" "}
                  the USDC delegate. The keeper cannot charge you after this
                  point.
                </p>
              </div>
              {cancel.isError && (
                <div className="mt-3 flex gap-2 rounded-xl border border-red-500/20 bg-red-500/5 p-3">
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-400">
                    {(cancel.error as Error)?.message ?? "Transaction failed"}
                  </p>
                </div>
              )}
              <div className="mt-5 flex gap-3">
                <AlertDialog.Cancel asChild>
                  <Button
                    variant="surface"
                    className="flex-1"
                    disabled={cancel.isPending}
                  >
                    Keep subscription
                  </Button>
                </AlertDialog.Cancel>
                <Button
                  variant="destructive"
                  className="flex-1"
                  loading={cancel.isPending}
                  onClick={handleCancel}
                >
                  {cancel.isPending ? "Cancelling…" : "Cancel subscription"}
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
  plan: PlanAccount;
  isSubscribed?: boolean;
  subscription?: SubscriptionAccount;
}

export function PlanCard({
  plan,
  isSubscribed = false,
  subscription,
}: PlanCardProps) {
  const [subscribeOpen, setSubscribeOpen] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const amount = plan.amountUsdc.toNumber();
  const interval = intervalLabel(plan.intervalSeconds.toNumber());
  const trial = plan.trialSeconds.toNumber();
  const capacity = plan.maxSubscribers.toNumber();
  const active = plan.activeSubscribers.toNumber();
  const isFull = capacity > 0 && active >= capacity;

  const isExpired = subscription?.status === "Expired";
  const isCancelled = subscription?.status === "Cancelled";
  const isActive = isSubscribed && subscription?.status === "Active";

  return (
    <>
      <Card
        className={cn(
          "group flex flex-col transition-all duration-300 hover:border-brand-500/40 hover:shadow-xl hover:shadow-brand-500/10",
          isActive && "border-emerald-500/40 bg-emerald-500/5",
          isExpired && "border-amber-500/40 bg-amber-500/5",
          isCancelled && "border-surface-4",
        )}
      >
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
          {isActive ? (
            <Badge variant="active">Subscribed</Badge>
          ) : isExpired ? (
            <Badge variant="expired">Expired</Badge>
          ) : isCancelled ? (
            <Badge variant="cancelled">Cancelled</Badge>
          ) : isFull ? (
            <Badge variant="expired">Full</Badge>
          ) : (
            <Badge variant="default">Active</Badge>
          )}
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
          {isActive && subscription && (
            <p className="mt-1 text-xs text-muted-foreground">
              {(subscription as any).cyclesRemaining ?? "—"} cycles remaining
            </p>
          )}
          {isExpired && (
            <p className="mt-1 text-xs text-amber-400">
              Subscription expired - renew to continue
            </p>
          )}
        </div>

        {plan.description && (
          <div className="px-5 pb-4">
            <p className="text-sm text-muted-foreground line-clamp-2">
              {plan.description}
            </p>
          </div>
        )}

        <Separator />

        {/* Stats */}
        <div className="p-4 grid grid-cols-2 gap-2">
          <StatPill
            icon={Users}
            label="Subscribers"
            value={
              capacity > 0 ? `${active} / ${capacity}` : `${active} active`
            }
          />
          <StatPill icon={Shield} label="Security" value="Non-custodial" />
        </div>

        {/* CTA */}
        <div className="p-4 pt-0 space-y-2">
          {isActive ? (
            <>
              <Button variant="surface" size="lg" className="w-full" disabled>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                Already subscribed
              </Button>
              {subscription && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  onClick={() => setCancelOpen(true)}
                >
                  <XCircle className="h-3.5 w-3.5" />
                  Cancel subscription
                </Button>
              )}
            </>
          ) : isExpired && subscription ? (
            <Button
              size="lg"
              className="w-full bg-amber-500/90 hover:bg-amber-500"
              onClick={() => setRenewOpen(true)}
            >
              <RefreshCw className="h-4 w-4" />
              Renew subscription
            </Button>
          ) : (
            <Button
              size="lg"
              className="w-full group-hover:shadow-lg group-hover:shadow-brand-500/20 transition-shadow"
              disabled={isFull}
              onClick={() => setSubscribeOpen(true)}
            >
              {isFull ? "Plan is full" : "Subscribe with USDC"}
              {!isFull && <ArrowRight className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </Card>

      <SubscribeDialog
        plan={plan}
        open={subscribeOpen}
        onClose={() => setSubscribeOpen(false)}
      />

      {subscription && isExpired && (
        <RenewDialog
          plan={plan}
          subscription={subscription}
          open={renewOpen}
          onClose={() => setRenewOpen(false)}
        />
      )}

      {subscription && isActive && (
        <CancelDialog
          plan={plan}
          subscription={subscription}
          open={cancelOpen}
          onClose={() => setCancelOpen(false)}
        />
      )}
    </>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
export function PlanCardSkeleton() {
  return (
    <Card className="p-5 space-y-4">
      <div className="flex justify-between">
        <div className="space-y-2">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="h-3 w-24" />
        </div>
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
