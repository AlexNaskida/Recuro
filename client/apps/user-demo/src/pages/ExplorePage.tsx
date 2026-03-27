import { Zap } from "lucide-react";
import { Card } from "@/components/ui/index";
import { PlanCard, PlanCardSkeleton } from "@/components/subscription/PlanCard";
import { useMySubscriptions, useMerchantPlans } from "@/hooks/index";
import type { SubscriptionAccount } from "@recuro/sdk";
import { MERCHANT } from "@/lib/config";

// ── Plan list - auto-fetches all plans for the merchant ───────────────────────
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
      {plans.map((plan) => {
        const userSub =
          mySubscriptions
            .filter(
              (s: SubscriptionAccount) =>
                s.plan.toBase58() === plan.publicKey.toBase58(),
            )
            .sort(
              (a: SubscriptionAccount, b: SubscriptionAccount) =>
                b.startedAt.toNumber() - a.startedAt.toNumber(),
            )[0] ?? undefined;

        return (
          <PlanCard
            key={plan.publicKey.toBase58()}
            plan={plan}
            subscription={userSub}
          />
        );
      })}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function ExplorePage() {
  return (
    <div className="min-h-screen bg-netflix-black">
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-8 animate-fade-in">
        {/* Hero card */}
        <Card className="p-6 space-y-4 border-netflix-gray bg-netflix-darkGray">
          <div className="inline-flex items-center gap-2 rounded-full border border-netflix-red/40 bg-netflix-red/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-netflix-red">
            <Zap className="h-3.5 w-3.5" />
            Recuro Memberships
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black leading-tight text-white">
              Discover plans, keep control.
            </h1>
            <p className="mt-2 text-sm text-gray-300 leading-relaxed">
              Subscribe on-chain with non-custodial USDC payments and clear,
              predictable renewals.
            </p>
          </div>
        </Card>

        {/* Feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              title: "Non-custodial",
              desc: "Funds stay in your wallet.",
            },
            {
              title: "Cancelable",
              desc: "Revoke anytime on-chain.",
            },
            {
              title: "Transparent",
              desc: "Plan terms are immutable.",
            },
          ].map((feature) => (
            <Card
              key={feature.title}
              className="p-4 border-netflix-gray bg-netflix-darkGray hover:border-netflix-red/40 transition-colors"
            >
              <h3 className="text-sm font-semibold text-white">
                {feature.title}
              </h3>
              <p className="mt-1 text-xs text-gray-400">{feature.desc}</p>
            </Card>
          ))}
        </div>

        {/* Plans section */}
        <section className="space-y-3">
          <div>
            <h2 className="text-xl font-bold text-white">Featured Plans</h2>
            <p className="text-sm text-gray-400">
              Browse and subscribe to available memberships
            </p>
          </div>
          <Card className="p-5 border-netflix-gray bg-netflix-darkGray">
            <PlanList />
          </Card>
        </section>
      </div>
    </div>
  );
}
