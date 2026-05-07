import { useMemo, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import {
  Check,
  CheckCircle2,
  ExternalLink,
  AlertCircle,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Card, Button, Badge } from "@/components/ui/index";
import { MERCHANT } from "@/lib/config";
import { SOLSCAN_TX, SOLSCAN_ACC } from "@/constants";
import { useMerchantPlans, useSubscribe } from "@/hooks";

// Features are UI-only - not stored on-chain in description
const PLAN_FEATURES: Record<string, string[]> = {
  Starter: [
    "Up to 500 active subscribers",
    "Automated recurring billing",
    "Email receipts",
  ],
  Growth: [
    "Up to 5,000 active subscribers",
    "Smart retries and dunning",
    "Advanced analytics",
  ],
  Scale: ["Unlimited subscribers", "Priority support", "Custom integrations"],
};

const HIGHLIGHTED_PLAN = "Growth";

export function DemoPage() {
  const wallet = useAnchorWallet();
  const subscribe = useSubscribe();
  const { data: onChainPlans = [], isLoading } = useMerchantPlans(MERCHANT);

  const [selectedPlanName, setSelectedPlanName] = useState(HIGHLIGHTED_PLAN);
  const [txResult, setTxResult] = useState<{
    signature: string;
    subscriptionPubkey: string;
  } | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  // Sort by amount so order is always Starter → Growth → Scale
  const plans = useMemo(
    () =>
      [...onChainPlans].sort(
        (a, b) => a.amountUsdc.toNumber() - b.amountUsdc.toNumber(),
      ),
    [onChainPlans],
  );

  const selectedPlan = useMemo(
    () =>
      plans.find((p) => p.name === selectedPlanName) ?? plans[1] ?? plans[0],
    [plans, selectedPlanName],
  );

  async function handleSubscribe() {
    setPayError(null);
    setTxResult(null);

    if (!wallet) {
      setPayError("Connect your wallet first.");
      return;
    }
    if (!selectedPlan) {
      setPayError("Plan not found on-chain.");
      return;
    }

    try {
      const result = await subscribe.mutateAsync({
        planPubkey: selectedPlan.publicKey.toBase58(),
      });
      setTxResult({
        signature: result.signature,
        subscriptionPubkey: result.subscriptionPubkey.toBase58(),
      });
    } catch (err) {
      setPayError((err as Error)?.message ?? "Checkout failed");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        Loading plans from chain…
      </div>
    );
  }

  if (plans.length === 0) {
    return (
      <div className="flex items-center justify-center py-24 text-muted-foreground text-sm">
        No plans found.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8 animate-fade-in sm:px-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <Badge className="mx-auto bg-primary/10 text-primary border-primary/20">
          Checkout
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          Subscription Pricing
        </h1>
        <p className="mx-auto max-w-xl text-sm text-muted-foreground">
          Plans are published on Solana. Approve once - payments run
          automatically.
        </p>
      </div>

      {/* Plan cards */}
      <section className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const isSelected = selectedPlanName === plan.name;
          const isHighlighted = plan.name === HIGHLIGHTED_PLAN;
          const priceUsd = (plan.amountUsdc.toNumber() / 1_000_000).toFixed(0);
          const features = PLAN_FEATURES[plan.name] ?? [];

          return (
            <Card
              key={plan.publicKey.toBase58()}
              className={
                isSelected
                  ? "p-6 border-primary/50 shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                  : isHighlighted
                    ? "p-6 border-primary/35 shadow-lg shadow-primary/10"
                    : "p-6"
              }
            >
              <div className="space-y-4">
                {/* Name + badge */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-semibold">{plan.name}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {plan.description}
                    </p>
                  </div>
                  {isHighlighted && (
                    <Badge className="shrink-0 bg-primary/12 text-primary text-[10px] border-primary/25 px-2.5 py-1">
                      Most Popular
                    </Badge>
                  )}
                </div>

                {/* Price - from chain */}
                <div className="flex items-end gap-1">
                  <span className="text-3xl font-bold">${priceUsd}</span>
                  <span className="pb-1 text-sm text-muted-foreground">
                    /month
                  </span>
                </div>

                {/* Features - UI only */}
                <ul className="space-y-2 text-sm">
                  {features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* PDA link */}
                <a
                  href={`https://solscan.io/account/${plan.publicKey.toBase58()}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors font-mono"
                >
                  {plan.publicKey.toBase58().slice(0, 8)}…
                  <ExternalLink className="h-3 w-3" />
                </a>

                <Button
                  className="w-full"
                  variant={isSelected ? "brand" : "outline"}
                  onClick={() => {
                    setSelectedPlanName(plan.name);
                    setTxResult(null);
                    setPayError(null);
                  }}
                >
                  {isSelected
                    ? `Selected - ${plan.name}`
                    : `Select ${plan.name}`}
                </Button>
              </div>
            </Card>
          );
        })}
      </section>

      {/* Checkout panel */}
      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <WalletCards className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">Payment options</h3>
          </div>
          {[
            {
              name: "Recuro Gateway",
              type: "On-chain recurring",
              summary:
                "Non-custodial recurring payments. Approve once, automated forever.",
              primary: true,
            },
            {
              name: "Card Processor",
              type: "Card payments",
              summary: "Traditional credit and debit card checkout.",
            },
            {
              name: "Wallet Pay",
              type: "Digital wallet",
              summary: "Fast one-click wallet checkout for supported users.",
            },
          ].map((opt) => (
            <div
              key={opt.name}
              className={`rounded-xl border p-4 mb-3 ${opt.primary ? "border-primary/30 bg-primary/5" : "border-border bg-card"}`}
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="font-medium">{opt.name}</p>
                  <p className="text-xs text-muted-foreground">{opt.type}</p>
                </div>
                {opt.primary && (
                  <Badge className="bg-primary text-primary-foreground border-primary">
                    Primary
                  </Badge>
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {opt.summary}
              </p>
            </div>
          ))}
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="h-5 w-5 text-emerald-500" />
            <h3 className="text-lg font-semibold">Checkout preview</h3>
          </div>

          <div className="rounded-xl border border-border bg-muted p-4 space-y-3">
            {selectedPlan && (
              <>
                <Row label="Plan" value={selectedPlan.name} />
                <Row label="Billing cycle" value="Monthly" />
                <Row
                  label="Gateway"
                  value="Recuro Gateway"
                  valueClass="text-primary"
                />
                <div className="h-px bg-border" />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Due now</span>
                  <span className="text-xl font-semibold">
                    $
                    {(selectedPlan.amountUsdc.toNumber() / 1_000_000).toFixed(
                      0,
                    )}
                    .00
                  </span>
                </div>
              </>
            )}

            {txResult && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Subscription created on-chain
                </div>
                <a
                  href={SOLSCAN_TX(txResult!.signature)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 underline"
                >
                  View transaction <ExternalLink className="h-3 w-3" />
                </a>
                <a
                  href={SOLSCAN_ACC(txResult!.subscriptionPubkey)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 underline"
                >
                  View subscription PDA <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            )}

            {(payError || subscribe.isError) && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {payError ??
                    (subscribe.error as Error)?.message ??
                    "Checkout failed"}
                </div>
              </div>
            )}

            <Button
              className="w-full"
              loading={subscribe.isPending}
              onClick={handleSubscribe}
            >
              {subscribe.isPending ? "Processing…" : "Pay with Recuro"}
            </Button>
            <Button variant="outline" className="w-full">
              Other payment methods
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}

function Row({
  label,
  value,
  valueClass = "text-foreground",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className={`font-medium ${valueClass}`}>{value}</span>
    </div>
  );
}
