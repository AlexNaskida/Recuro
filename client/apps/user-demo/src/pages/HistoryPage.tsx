/**
 * Payment History page — shows a timeline of all past payments.
 */
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { ExternalLink, CheckCircle2, AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@/components/ui";
import { useMySubscriptions, usePlan } from "@/hooks/useSubscriptions";
import { formatUSDC, formatTs, formatTsRelative, truncate, SOLSCAN_ACC } from "@/lib/utils";
import type { SubscriptionAccount } from "@solana-subscription/sdk";

// ── Payment summary per subscription ─────────────────────────────────────────
function SubPaymentSummary({ sub }: { sub: SubscriptionAccount }) {
  const { data: plan } = usePlan(sub.plan.toBase58());
  const count          = sub.paymentCount.toNumber();
  const totalPaid      = sub.totalPaid.toNumber();
  const lastPaid       = sub.lastPaidAt.toNumber();

  if (count === 0) return null;

  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-[hsl(var(--border))] last:border-0">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--success-muted))]">
          <CheckCircle2 className="h-4 w-4 text-[hsl(var(--success))]" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {plan?.name ?? truncate(sub.plan.toBase58())}
          </p>
          <p className="text-xs text-[hsl(var(--muted-foreground))]">
            {count} payment{count !== 1 ? "s" : ""} · Last {formatTsRelative(lastPaid)}
          </p>
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold num">{formatUSDC(totalPaid)}</p>
        <p className="text-xs text-[hsl(var(--muted-foreground))]">total paid</p>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export function HistoryPage() {
  const wallet            = useAnchorWallet();
  const { data: subs, isLoading } = useMySubscriptions();

  const withPayments = subs?.filter((s) => s.paymentCount.toNumber() > 0) ?? [];
  const grandTotal   = withPayments.reduce((sum, s) => sum + s.totalPaid.toNumber(), 0);
  const totalPayments = withPayments.reduce((sum, s) => sum + s.paymentCount.toNumber(), 0);

  if (!wallet) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8">
        <p className="text-[hsl(var(--muted-foreground))]">Connect your wallet to view history</p>
        <WalletMultiButton />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-6 animate-[fade-in_0.35s_ease-out]">
      <div>
        <h1 className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
          Payment History
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          All USDC payments made through your subscriptions.
        </p>
      </div>

      {/* Summary cards */}
      {!isLoading && withPayments.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-5 pb-5">
              <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
                Total spent
              </p>
              <p className="text-2xl font-bold num">{formatUSDC(grandTotal)}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-5 pb-5">
              <p className="text-xs uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
                Payments made
              </p>
              <p className="text-2xl font-bold num">{totalPayments}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Payment list */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment Summary by Plan</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : withPayments.length === 0 ? (
            <div className="py-8 text-center text-sm text-[hsl(var(--muted-foreground))]">
              No payments yet. Payments appear here after your first billing cycle.
            </div>
          ) : (
            withPayments.map((sub) => (
              <SubPaymentSummary key={sub.publicKey.toBase58()} sub={sub} />
            ))
          )}
        </CardContent>
      </Card>

      {/* Failed payments warning */}
      {subs?.some((s) => s.failedPaymentCount > 0) && (
        <Card className="border-[hsl(var(--destructive)/0.3)]">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-4 w-4 text-[hsl(var(--destructive))] shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-[hsl(var(--destructive))]">
                  Failed payment detected
                </p>
                <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                  One or more subscriptions have payment failures. Ensure your USDC balance
                  is sufficient to avoid automatic cancellation after 3 failures.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
