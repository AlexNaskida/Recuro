/**
 * Browse Plans page - shows publicly available subscription plans.
 * Users enter a plan PDA address to look up any plan, or can browse
 * a curated list stored in the .env file.
 */
import { useState } from "react";
import { PublicKey } from "@solana/web3.js";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ExternalLink, Search, Zap, ShieldCheck, Clock } from "lucide-react";
import { Card, Button, Input, Badge, Skeleton } from "@/components/ui/index";
import { usePlan, useSubscribe, useMySubscriptions } from "@/hooks";
import { cn, formatTs } from "@/lib/utils";
import {
  formatUSDC,
  intervalLabel,
  truncate,
  SOLSCAN_ACC,
  CLUSTER,
} from "@/constants";
import { FEATURED_PLANS } from "@/lib/config";
import type { SubscriptionAccount } from "@recuro/sdk";

// Demo plans to showcase - in production these come from an off-chain registry
// or the merchant shares the plan PDA address with customers.

// ── Plan Detail Card ──────────────────────────────────────────────────────────
function PlanDetail({ planPubkey }: { planPubkey: string }) {
  const { data: plan, isLoading, error } = usePlan(planPubkey);
  const { data: mySubs } = useMySubscriptions();
  const subscribe = useSubscribe();
  const wallet = useAnchorWallet();

  const isSubscribed = mySubs?.some(
    (s: SubscriptionAccount) =>
      s.plan.toBase58() === planPubkey && s.status === "Active",
  );

  const isPaused = mySubs?.some(
    (s: SubscriptionAccount) =>
      s.plan.toBase58() === planPubkey && s.status === "Paused",
  );

  const handleSubscribe = async () => {
    if (!wallet) return;
    await subscribe.mutateAsync({ planPubkey });
  };

  if (isLoading) {
    return (
      <Card>
        <div className="p-6">
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-72" />
        </div>
        <div className="px-6 pb-6 space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </Card>
    );
  }

  if (error || !plan) {
    return (
      <Card className="border-[hsl(var(--destructive)/0.3)]">
        <div className="pt-6 px-6 pb-6">
          <p className="text-sm text-[hsl(var(--muted-foreground))]">
            {error
              ? "Could not load plan - check the address."
              : "Plan not found."}
          </p>
        </div>
      </Card>
    );
  }

  const interval = intervalLabel(plan.intervalSeconds.toNumber());
  const trialDays = plan.trialSeconds.toNumber() / 86_400;
  const hasCapacity =
    plan.maxSubscribers.toNumber() === 0 ||
    plan.activeSubscribers.toNumber() < plan.maxSubscribers.toNumber();

  const statusVariant =
    plan.status === "Active"
      ? "default"
      : plan.status === "Paused"
        ? "past_due"
        : "expired";

  return (
    <Card
      className={cn(
        "transition-all duration-200",
        isSubscribed
          ? "border-[hsl(var(--success)/0.4)] shadow-[0_0_20px_hsl(var(--success)/0.1)]"
          : "",
      )}
    >
      <div className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">{plan.name}</h3>
            {plan.description && (
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                {plan.description}
              </p>
            )}
          </div>
          <Badge variant={statusVariant}>{plan.status}</Badge>
        </div>
      </div>

      <div className="px-6 pb-6 space-y-5">
        {/* Pricing */}
        <div className="flex items-end gap-2">
          <span
            className="text-4xl font-bold tracking-tight num"
            style={{ fontFamily: "var(--font-display)" }}
          >
            {formatUSDC(plan.amountUsdc.toNumber())}
          </span>
          <span className="text-[hsl(var(--muted-foreground))] pb-1">
            / {interval}
          </span>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {trialDays > 0 && (
            <div className="flex items-center gap-2 text-[hsl(var(--success))]">
              <ShieldCheck className="h-4 w-4 shrink-0" />
              <span>{trialDays}-day free trial</span>
            </div>
          )}
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
            <Clock className="h-4 w-4 shrink-0" />
            <span>Billed every {interval}</span>
          </div>
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
            <Zap className="h-4 w-4 shrink-0" />
            <span>Auto-renewing</span>
          </div>
          <div className="flex items-center gap-2 text-[hsl(var(--muted-foreground))]">
            <ShieldCheck className="h-4 w-4 shrink-0" />
            <span>Cancel anytime</span>
          </div>
        </div>

        {/* Plan metadata */}
        <div className="rounded-xl bg-[hsl(var(--muted))] p-4 text-xs space-y-2">
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">
              Subscribers
            </span>
            <span className="font-medium num">
              {plan.activeSubscribers.toNumber()}
              {plan.maxSubscribers.toNumber() > 0 &&
                ` / ${plan.maxSubscribers.toNumber()}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">Plan ID</span>
            <span className="font-mono">{plan.planId.toNumber()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[hsl(var(--muted-foreground))]">
              Deployed
            </span>
            <span>{formatTs(plan.createdAt.toNumber())}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-[hsl(var(--muted-foreground))]">
              Plan address
            </span>
            <a
              href={SOLSCAN_ACC(planPubkey)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-[hsl(var(--primary))] hover:underline font-mono"
            >
              {truncate(planPubkey, 6, 4)}
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>

      <div className="px-6 pb-6 flex flex-col gap-3">
        {!wallet ? (
          <WalletMultiButton style={{ width: "100%" }} />
        ) : isSubscribed ? (
          <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--success-muted))] border border-[hsl(var(--success)/0.3)] py-3 text-sm font-medium text-[hsl(var(--success))]">
            <ShieldCheck className="h-4 w-4" />
            You're subscribed
          </div>
        ) : isPaused ? (
          <div className="w-full flex items-center justify-center gap-2 rounded-xl bg-[hsl(var(--warning-muted))] border border-[hsl(var(--warning)/0.3)] py-3 text-sm font-medium text-[hsl(var(--warning))]">
            Subscription paused
          </div>
        ) : (
          <Button
            className="w-full h-12 text-base"
            onClick={handleSubscribe}
            disabled={!hasCapacity || plan.status !== "Active"}
            loading={subscribe.isPending}
          >
            {!hasCapacity
              ? "Plan is full"
              : subscribe.isPending
                ? "Confirming on-chain…"
                : `Subscribe for ${formatUSDC(plan.amountUsdc.toNumber())}/${interval}`}
          </Button>
        )}

        {subscribe.isError && (
          <p className="text-xs text-[hsl(var(--destructive))] text-center">
            {(subscribe.error as Error).message}
          </p>
        )}

        {!isSubscribed && plan.status === "Active" && (
          <p className="text-[11px] text-center text-[hsl(var(--muted-foreground))]">
            Funds stay in your wallet. Charged automatically every {interval}.
            Cancel anytime.
          </p>
        )}
      </div>
    </Card>
  );
}

// ── Browse Page ───────────────────────────────────────────────────────────────
export function BrowsePage() {
  const [lookupKey, setLookupKey] = useState<string | null>(null);
  const [inputVal, setInputVal] = useState("");

  const handleLookup = () => {
    try {
      new PublicKey(inputVal); // validate
      setLookupKey(inputVal.trim());
    } catch {
      alert("Invalid Solana public key");
    }
  };

  const displayKey = lookupKey || (FEATURED_PLANS[0] ?? null);

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8 animate-[fade-in_0.35s_ease-out]">
      {/* Header */}
      <div>
        <h1
          className="text-2xl font-bold"
          style={{ fontFamily: "var(--font-display)" }}
        >
          Browse Plans
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Paste a Plan PDA address to subscribe, or browse featured plans below.
        </p>
      </div>

      {/* Search / lookup */}
      <div className="flex gap-2">
        <Input
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          placeholder="Enter Plan PDA address…"
          className="font-mono text-xs"
          onKeyDown={(e) => e.key === "Enter" && handleLookup()}
        />
        <Button onClick={handleLookup} disabled={!inputVal.trim()}>
          <Search className="h-4 w-4" />
          Look up
        </Button>
      </div>

      {/* Plan card */}
      {displayKey ? (
        <PlanDetail planPubkey={displayKey} />
      ) : (
        <Card>
          <div className="pt-6 flex flex-col items-center gap-4 py-12 px-6">
            <div className="h-12 w-12 rounded-full bg-[hsl(var(--muted))] flex items-center justify-center">
              <Search className="h-5 w-5 text-[hsl(var(--muted-foreground))]" />
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] text-center max-w-xs">
              Enter a Plan PDA address above to view and subscribe to a plan.
            </p>
          </div>
        </Card>
      )}

      {/* Network badge */}
      <p className="text-center text-xs text-[hsl(var(--muted-foreground))]">
        Connected to Solana{" "}
        <span className="font-medium capitalize">{CLUSTER}</span>
      </p>
    </div>
  );
}
