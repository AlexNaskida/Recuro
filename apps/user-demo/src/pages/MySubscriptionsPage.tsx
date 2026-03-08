import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Inbox, RefreshCw } from "lucide-react";
import { Button, Card, Skeleton } from "@/components/ui/index";
import { SubscriptionCard } from "@/components/subscription/SubscriptionCard";
import { useMySubscriptions } from "@/hooks/index";

export function MySubscriptionsPage() {
  const wallet = useAnchorWallet();
  const { data: subs = [], isLoading, refetch, isFetching } = useMySubscriptions();

  if (!wallet) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center space-y-5 animate-fade-in">
        <div className="flex h-16 w-16 mx-auto items-center justify-center rounded-2xl border border-surface-4 bg-surface-2">
          <Inbox className="h-7 w-7 text-muted-foreground" />
        </div>
        <div>
          <h2 className="text-xl font-bold">Connect your wallet</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Connect to view and manage your on-chain subscriptions.
          </p>
        </div>
        <WalletMultiButton />
      </div>
    );
  }

  const active    = subs.filter((s) => s.status === "Active" || s.status === "PastDue");
  const inactive  = subs.filter((s) => s.status === "Cancelled" || s.status === "Expired");

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">My Subscriptions</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? "Loading…" : `${active.length} active · ${inactive.length} inactive`}
          </p>
        </div>
        <Button
          variant="surface"
          size="sm"
          onClick={() => refetch()}
          disabled={isFetching}
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Loading skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <Card key={i} className="p-5 space-y-4">
              <div className="flex justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
              <Skeleton className="h-9 w-28" />
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-16 rounded-xl" />
                <Skeleton className="h-16 rounded-xl" />
              </div>
              <Skeleton className="h-10 rounded-xl" />
            </Card>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!isLoading && subs.length === 0 && (
        <Card className="p-10 text-center space-y-4 border-dashed">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-2xl bg-surface-3">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-semibold">No subscriptions yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Go to Explore to find and subscribe to a plan.
            </p>
          </div>
        </Card>
      )}

      {/* Active subscriptions */}
      {active.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Active
          </h2>
          {active.map((sub) => (
            <SubscriptionCard key={sub.publicKey.toBase58()} sub={sub} />
          ))}
        </section>
      )}

      {/* Inactive subscriptions */}
      {inactive.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Inactive
          </h2>
          {inactive.map((sub) => (
            <SubscriptionCard key={sub.publicKey.toBase58()} sub={sub} />
          ))}
        </section>
      )}
    </div>
  );
}
