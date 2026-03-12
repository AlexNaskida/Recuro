import { Zap } from "lucide-react";
import { Card } from "@/components/ui/index";
import { PlanCard, PlanCardSkeleton } from "@/components/subscription/PlanCard";
import { useMySubscriptions, useMerchantPlans } from "@/hooks/index";

const MERCHANT = import.meta.env.VITE_MERCHANT_WALLET ?? null;

// ── Plan list — auto-fetches all plans for the merchant ───────────────────────
function PlanList() {
  const { data: plans = [], isLoading, isError } = useMerchantPlans(MERCHANT);
  const { data: mySubscriptions = [] } = useMySubscriptions();

  if (isLoading)
    return (
      <div className="space-y-4">
        <PlanCardSkeleton />
        <PlanCardSkeleton />
      </div>
    );

  if (isError)
    return (
      <Card className="p-6 border-red-500/20 bg-red-500/5">
        <p className="text-sm text-red-400">
          Could not load plans. Check your connection.
        </p>
      </Card>
    );

  if (plans.length === 0)
    return (
      <Card className="p-6 text-center">
        <p className="text-sm text-muted-foreground">No active plans found.</p>
      </Card>
    );

  return (
    <div className="space-y-4">
      {plans.map((plan) => (
        <PlanCard
          key={plan.publicKey.toBase58()}
          plan={plan}
          isSubscribed={mySubscriptions.some(
            (s) => s.plan.toBase58() === plan.publicKey.toBase58(),
          )}
        />
      ))}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function ExplorePage() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-10 animate-fade-in">
      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm text-brand-400">
          <Zap className="h-3.5 w-3.5" />
          Non-custodial USDC subscriptions
        </div>
        <h1 className="text-4xl font-bold leading-tight">
          Subscribe to anything,{" "}
          <span className="bg-gradient-to-r from-brand-400 to-emerald-400 bg-clip-text text-transparent">
            on-chain.
          </span>
        </h1>
        <p className="text-muted-foreground max-w-md mx-auto">
          Browse available subscription plans below. Your USDC stays in your
          wallet until payment time.
        </p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-4 text-center">
        {[
          {
            step: "1",
            title: "Browse plans",
            body: "All available plans are loaded automatically.",
          },
          {
            step: "2",
            title: "Subscribe",
            body: "Approve an SPL delegate — one transaction.",
          },
          {
            step: "3",
            title: "Relax",
            body: "Keeper handles billing. Cancel any time.",
          },
        ].map(({ step, title, body }) => (
          <div
            key={step}
            className="rounded-2xl border border-surface-4 bg-surface-2 p-4 space-y-2"
          >
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-sm font-bold text-brand-400">
              {step}
            </div>
            <p className="font-semibold text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      {/* Plans */}
      <div className="rounded-2xl border border-surface-4 bg-surface-2 p-6">
        <h2 className="font-semibold mb-4">Available Plans</h2>
        <PlanList />
      </div>
    </div>
  );
}
