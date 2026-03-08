import { useState } from "react";
import { Search, Zap } from "lucide-react";
import { Input, Button, Card, Skeleton } from "@/components/ui/index";
import { PlanCard, PlanCardSkeleton } from "@/components/subscription/PlanCard";
import { usePlan, useMySubscriptions } from "@/hooks/index";

// ── Plan lookup by address ────────────────────────────────────────────────────
function PlanLookup() {
  const [address, setAddress] = useState(
    import.meta.env.VITE_DEMO_PLAN_PUBKEY ?? ""
  );
  const [query, setQuery] = useState(
    import.meta.env.VITE_DEMO_PLAN_PUBKEY ?? ""
  );
  const { data: plan, isLoading, isError } = usePlan(query || null);
  const { data: mySubscriptions = [] } = useMySubscriptions();

  const isSubscribed = mySubscriptions.some(
    (s) => s.plan.toBase58() === query
  );

  return (
    <div className="space-y-5">
      {/* Search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Enter Plan PDA address…"
            className="pl-10 h-11 font-mono text-sm"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && setQuery(address.trim())}
          />
        </div>
        <Button
          size="md"
          className="h-11 px-5"
          onClick={() => setQuery(address.trim())}
          disabled={!address.trim() || address.trim() === query}
        >
          Load Plan
        </Button>
      </div>

      {/* Result */}
      {isLoading && <PlanCardSkeleton />}

      {isError && (
        <Card className="p-6 border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-400">
            Could not load plan. Check the address and cluster.
          </p>
        </Card>
      )}

      {plan && !isLoading && (
        <div className="animate-fade-in">
          <PlanCard plan={plan} isSubscribed={isSubscribed} />
        </div>
      )}
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
          Enter a merchant's Plan address below to load their subscription plan. Your USDC stays in your wallet until payment time.
        </p>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-3 gap-4 text-center">
        {[
          { step: "1", title: "Load plan",  body: "Enter the merchant's Plan PDA address."           },
          { step: "2", title: "Subscribe",  body: "Approve an SPL delegate — one transaction."       },
          { step: "3", title: "Relax",      body: "Clockwork handles billing. Cancel any time."      },
        ].map(({ step, title, body }) => (
          <div key={step} className="rounded-2xl border border-surface-4 bg-surface-2 p-4 space-y-2">
            <div className="mx-auto flex h-8 w-8 items-center justify-center rounded-full bg-brand-500/15 text-sm font-bold text-brand-400">
              {step}
            </div>
            <p className="font-semibold text-sm">{title}</p>
            <p className="text-xs text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>

      {/* Lookup */}
      <div className="rounded-2xl border border-surface-4 bg-surface-2 p-6">
        <h2 className="font-semibold mb-4">Load a subscription plan</h2>
        <PlanLookup />
      </div>
    </div>
  );
}
