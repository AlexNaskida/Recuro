import { useMemo, useState } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ExternalLink,
  ShieldCheck,
  WalletCards,
} from "lucide-react";
import { Card, Button, Badge } from "@/components/ui/index";
import { MERCHANT } from "@/lib/config";
import { SOLSCAN_ACC, SOLSCAN_TX } from "@/constants";
import { useMerchantPlans, useSdk, useSubscribe } from "@/hooks";

type DemoPlan = {
  planId: number;
  name: string;
  price: string;
  amountUsdc: number;
  interval: string;
  intervalDays: number;
  description: string;
  features: string[];
  highlighted?: boolean;
};

const PLANS: DemoPlan[] = [
  {
    planId: 1,
    name: "Starter",
    price: "$19",
    amountUsdc: 19,
    interval: "month",
    intervalDays: 30,
    description: "Good for small teams launching their first subscriptions.",
    features: [
      "Up to 500 active subscribers",
      "Automated recurring billing",
      "Email receipts",
    ],
  },
  {
    planId: 2,
    name: "Growth",
    price: "$49",
    amountUsdc: 49,
    interval: "month",
    intervalDays: 30,
    description: "Built for merchants scaling recurring revenue.",
    features: [
      "Up to 5,000 active subscribers",
      "Smart retries and dunning",
      "Advanced analytics",
    ],
    highlighted: true,
  },
  {
    planId: 3,
    name: "Scale",
    price: "$129",
    amountUsdc: 129,
    interval: "month",
    intervalDays: 30,
    description: "For high-volume businesses and multi-market operations.",
    features: [
      "Unlimited subscribers",
      "Priority support",
      "Custom integrations",
    ],
  },
];

const PAYMENT_OPTIONS = [
  {
    name: "Recuro Gateway",
    type: "On-chain recurring",
    summary: "Primary checkout option with non-custodial recurring payments.",
    highlighted: true,
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
];

export function DemoPage() {
  const wallet = useAnchorWallet();
  const sdk = useSdk();
  const subscribe = useSubscribe();
  const { data: plans = [] } = useMerchantPlans(MERCHANT);
  const [selectedPlanName, setSelectedPlanName] = useState("Growth");
  const [txResult, setTxResult] = useState<{
    signature: string;
    subscriptionPubkey: string;
  } | null>(null);
  const [payError, setPayError] = useState<string | null>(null);

  const selectedPlan = useMemo(
    () => PLANS.find((plan) => plan.name === selectedPlanName) ?? PLANS[1],
    [selectedPlanName],
  );

  const onChainPlan = useMemo(
    () =>
      plans.find(
        (plan) =>
          plan.name.trim().toLowerCase() === selectedPlan.name.toLowerCase(),
      ),
    [plans, selectedPlan.name],
  );

  async function ensureSelectedPlan() {
    if (onChainPlan) return onChainPlan.publicKey;

    if (!sdk || !wallet?.publicKey || !MERCHANT) {
      throw new Error(
        `${selectedPlan.name} plan is not published yet. Connect the merchant wallet and publish it first.`,
      );
    }

    if (!wallet.publicKey.equals(new PublicKey(MERCHANT))) {
      throw new Error(
        `${selectedPlan.name} plan is not published yet. Connect the merchant wallet and publish it first.`,
      );
    }

    const result = await sdk.createPlan({
      planId: selectedPlan.planId,
      name: selectedPlan.name,
      description: selectedPlan.description,
      amountUsdc: selectedPlan.amountUsdc,
      intervalDays: selectedPlan.intervalDays,
      trialDays: 0,
      maxSubscribers: 0,
    });

    return result.planPubkey;
  }

  async function handlePayWithRecuro() {
    setPayError(null);
    setTxResult(null);

    if (!wallet) {
      setPayError("Connect your wallet first to checkout with Recuro.");
      return;
    }

    if (!MERCHANT) {
      setPayError("Missing VITE_MERCHANT_WALLET in environment config.");
      return;
    }

    try {
      const planPubkey = await ensureSelectedPlan();
      const result = await subscribe.mutateAsync({
        planPubkey: planPubkey.toBase58(),
      });

      setTxResult({
        signature: result.signature,
        subscriptionPubkey: result.subscriptionPubkey.toBase58(),
      });
    } catch (error) {
      setPayError((error as Error)?.message ?? "Checkout failed");
    }
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8 animate-fade-in sm:px-6">
      <div className="text-center space-y-3">
        <Badge className="mx-auto bg-primary/10 text-primary border-primary/20">
          Checkout
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Subscription Pricing
        </h1>
        <p className="mx-auto max-w-2xl text-sm text-muted-foreground sm:text-base">
          Neutral storefront preview with multiple pricing plans and payment
          gateways. This page is designed to show how Recuro can appear in a
          merchant checkout.
        </p>
      </div>

      <section className="grid gap-4 lg:grid-cols-3">
        {PLANS.map((plan) => (
          <Card
            key={plan.name}
            className={
              selectedPlanName === plan.name
                ? "p-6 border-primary/50 shadow-lg shadow-primary/10 ring-1 ring-primary/20"
                : plan.highlighted
                  ? "p-6 border-primary/35 shadow-lg shadow-primary/10"
                  : "p-6"
            }
          >
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-semibold text-foreground">
                    {plan.name}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {plan.description}
                  </p>
                </div>
                {plan.highlighted && (
                  <Badge className="shrink-0 whitespace-nowrap bg-primary/12 text-primary text-[10px] leading-none border-primary/25 px-2.5 py-1">
                    Most Popular
                  </Badge>
                )}
              </div>

              <div className="flex items-end gap-1">
                <span className="text-3xl font-bold text-foreground">
                  {plan.price}
                </span>
                <span className="pb-1 text-sm text-muted-foreground">
                  /{plan.interval}
                </span>
              </div>

              <ul className="space-y-2 text-sm text-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-success" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                variant={selectedPlanName === plan.name ? "brand" : "outline"}
                onClick={() => {
                  setSelectedPlanName(plan.name);
                  setTxResult(null);
                  setPayError(null);
                }}
              >
                {selectedPlanName === plan.name
                  ? `Selected ${plan.name}`
                  : `Select ${plan.name}`}
              </Button>
            </div>
          </Card>
        ))}
      </section>

      <section className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-6">
          <div className="flex items-center gap-2">
            <WalletCards className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-foreground">
              Payment gateway options
            </h3>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose a primary payment method and keep alternatives available
            during checkout.
          </p>

          <div className="mt-5 space-y-3">
            {PAYMENT_OPTIONS.map((option) => (
              <div
                key={option.name}
                className={
                  option.highlighted
                    ? "rounded-xl border border-primary/30 bg-primary/5 p-4"
                    : "rounded-xl border border-border bg-card p-4"
                }
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{option.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {option.type}
                    </p>
                  </div>
                  {option.highlighted && (
                    <Badge className="bg-primary text-primary-foreground border-primary">
                      Primary
                    </Badge>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  {option.summary}
                </p>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-success" />
            <h3 className="text-lg font-semibold text-foreground">
              Checkout preview
            </h3>
          </div>

          <div className="mt-4 rounded-xl border border-border bg-muted p-4 space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span className="font-medium text-foreground">
                {selectedPlan.name}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Billing cycle</span>
              <span className="font-medium text-foreground">
                {selectedPlan.interval === "month"
                  ? "Monthly"
                  : selectedPlan.interval}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Gateway</span>
              <span className="font-medium text-primary">Recuro Gateway</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Due now</span>
              <span className="text-xl font-semibold text-foreground">
                {selectedPlan.price}.00
              </span>
            </div>

            {txResult && (
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-700 space-y-2">
                <div className="flex items-center gap-2 font-medium">
                  <CheckCircle2 className="h-4 w-4" />
                  Payment initialized on-chain via Recuro SDK
                </div>
                <a
                  href={SOLSCAN_TX(txResult.signature)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 underline"
                >
                  View transaction
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
                <a
                  href={SOLSCAN_ACC(txResult.subscriptionPubkey)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 underline"
                >
                  View subscription account
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}

            {(payError || subscribe.isError) && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-600">
                <div className="flex items-start gap-2">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>
                    {payError ??
                      ((subscribe.error as Error)?.message ||
                        "Checkout failed")}
                  </span>
                </div>
              </div>
            )}

            <Button
              className="w-full"
              loading={subscribe.isPending}
              onClick={handlePayWithRecuro}
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
