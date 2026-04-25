import { Check, ShieldCheck, WalletCards } from "lucide-react";
import { Card, Button, Badge } from "@/components/ui/index";

type DemoPlan = {
  name: string;
  price: string;
  interval: string;
  description: string;
  features: string[];
  highlighted?: boolean;
};

const PLANS: DemoPlan[] = [
  {
    name: "Starter",
    price: "$19",
    interval: "month",
    description: "Good for small teams launching their first subscriptions.",
    features: [
      "Up to 500 active subscribers",
      "Automated recurring billing",
      "Email receipts",
    ],
  },
  {
    name: "Growth",
    price: "$49",
    interval: "month",
    description: "Built for merchants scaling recurring revenue.",
    features: [
      "Up to 5,000 active subscribers",
      "Smart retries and dunning",
      "Advanced analytics",
    ],
    highlighted: true,
  },
  {
    name: "Scale",
    price: "$129",
    interval: "month",
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
  return (
    <div className="mx-auto max-w-6xl px-4 py-10 space-y-8 animate-fade-in sm:px-6">
      <div className="text-center space-y-3">
        <Badge className="mx-auto bg-primary/10 text-primary border-primary/20">
          Checkout Demo
        </Badge>
        <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Subscription Pricing Demo
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
              plan.highlighted
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
                  <Badge className="bg-primary/12 text-primary border-primary/25">
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

              <Button className="w-full">Select {plan.name}</Button>
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
              <span className="font-medium text-foreground">Growth</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Billing cycle</span>
              <span className="font-medium text-foreground">Monthly</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Gateway</span>
              <span className="font-medium text-primary">Recuro Gateway</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Due now</span>
              <span className="text-xl font-semibold text-foreground">
                $49.00
              </span>
            </div>
            <Button className="w-full">Pay with Recuro</Button>
            <Button variant="outline" className="w-full">
              Other payment methods
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}
