import { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAnchorProgram } from "@/hooks/useAnchorProgram";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertCircle,
  CheckCircle2,
  XCircle,
  PlusCircle,
  MinusCircle,
  Clock,
  DollarSign,
  Wallet,
  FileText,
  Hash,
} from "lucide-react";
import { microToUsdc } from "@/lib/pda";
import { MOCK_LOGS, type LogEntry } from "@/lib/mock-data";

// ── Helpers ───────────────────────────────────────────────────────────────────

function unixToDate(unix: number): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toISOString().split("T")[0];
}

function truncate(addr: string, start = 6, end = 4): string {
  if (addr.length <= start + end + 3) return addr;
  return addr.slice(0, start) + "..." + addr.slice(-end);
}

function deriveLogType(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  status: any,
  _paymentCount: number,
  lastPaidAt: number,
): LogEntry["type"] {
  if (status.cancelled !== undefined) return "SubscriptionCancelled";
  if (status.expired !== undefined) return "SubscriptionExpired";
  if (lastPaidAt > 0) return "PaymentExecuted";
  return "SubscriptionCreated";
}

const typeConfig: Record<
  LogEntry["type"],
  {
    label: string;
    icon: React.ElementType;
    color: string;
    badge: string;
  }
> = {
  PaymentExecuted: {
    label: "Payment Executed",
    icon: CheckCircle2,
    color: "text-green-500",
    badge: "bg-green-500/10 text-green-500 border-green-500/20",
  },
  PaymentFailed: {
    label: "Payment Failed",
    icon: XCircle,
    color: "text-orange-400",
    badge: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  },
  SubscriptionCreated: {
    label: "Subscription Created",
    icon: PlusCircle,
    color: "text-blue-500",
    badge: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  },
  SubscriptionCancelled: {
    label: "Subscription Cancelled",
    icon: MinusCircle,
    color: "text-red-500",
    badge: "bg-red-500/10 text-red-500 border-red-500/20",
  },
  SubscriptionExpired: {
    label: "Subscription Expired",
    icon: AlertCircle,
    color: "text-red-500",
    badge: "bg-red-500/10 text-red-500 border-red-500/20",
  },
};

// ── Detail row ────────────────────────────────────────────────────────────────

function DetailRow({
  icon: Icon,
  label,
  value,
  mono = false,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b last:border-0">
      <Icon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
      <span className="text-sm text-muted-foreground w-32 shrink-0">
        {label}
      </span>
      <span
        className={`text-sm break-all ${mono ? "font-mono" : "font-medium"}`}
      >
        {value}
      </span>
    </div>
  );
}

// ── Log Card (Accordion Item) ─────────────────────────────────────────────────

function LogCard({ entry, index }: { entry: LogEntry; index: number }) {
  const cfg = typeConfig[entry.type];
  const Icon = cfg.icon;

  return (
    <AccordionItem
      value={entry.id}
      className="rounded-xl border border-border bg-card overflow-hidden shadow-sm"
    >
      <AccordionTrigger className="px-4 py-3 hover:no-underline hover:bg-muted/40 transition-colors [&>svg]:text-muted-foreground">
        <div className="flex items-center gap-3 flex-1 min-w-0 text-left">
          {/* Icon */}
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted ${cfg.color}`}
          >
            <Icon className="h-4 w-4" />
          </div>

          {/* Main info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-medium text-sm">{cfg.label}</span>
              <Badge
                variant="outline"
                className={`text-[10px] px-2 py-0 ${cfg.badge}`}
              >
                {entry.plan}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono">
              {truncate(entry.subscriber, 8, 4)}
            </p>
          </div>

          {/* Right side */}
          <div className="text-right shrink-0 mr-2">
            {entry.amountUsdc > 0 && (
              <p className="text-sm font-semibold">
                ${entry.amountUsdc.toFixed(2)}
              </p>
            )}
            <p className="text-xs text-muted-foreground">{entry.timestamp}</p>
          </div>
        </div>
      </AccordionTrigger>

      <AccordionContent className="px-4 pb-4 pt-1">
        <div className="rounded-lg bg-muted/40 p-3 space-y-0">
          <DetailRow
            icon={Wallet}
            label="Subscriber"
            value={entry.subscriber}
            mono
          />
          <DetailRow
            icon={FileText}
            label="Plan"
            value={`${entry.plan} — ${truncate(entry.planPubkey || "—", 8, 4)}`}
            mono={!!entry.planPubkey}
          />
          <DetailRow
            icon={DollarSign}
            label="Amount"
            value={
              entry.amountUsdc > 0
                ? `$${entry.amountUsdc.toFixed(4)} USDC`
                : "—"
            }
          />
          <DetailRow
            icon={DollarSign}
            label="Total Paid"
            value={`$${entry.totalPaid.toFixed(4)} USDC`}
          />
          <DetailRow
            icon={Hash}
            label="Payment #"
            value={entry.paymentCount > 0 ? `${entry.paymentCount}` : "—"}
          />
          <DetailRow icon={Clock} label="Date" value={entry.timestamp} />
          {entry.raw && (
            <div className="pt-2">
              <a
                href={`https://explorer.solana.com/address/${entry.raw}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-blue-400 hover:underline font-mono"
              >
                View subscription on-chain ↗
              </a>
            </div>
          )}
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Logs() {
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [usingMock, setUsingMock] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchLogs() {
      if (!program || !publicKey) {
        setLogs(MOCK_LOGS);
        setUsingMock(true);
        return;
      }

      setLoading(true);
      try {
        // Fetch all plans for this merchant
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const planAccounts = await (program.account as any).plan.all([
          { memcmp: { offset: 8, bytes: publicKey.toBase58() } },
        ]);

        if (planAccounts.length === 0) {
          setLogs(MOCK_LOGS);
          setUsingMock(true);
          return;
        }

        // Build plan name map
        const planNames: Record<string, string> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        planAccounts.forEach((a: any) => {
          planNames[a.publicKey.toBase58()] = a.account.name;
        });

        // Fetch all subscriptions for merchant's plans
        const connection = program.provider.connection;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allSubs: any[] = [];

        for (const plan of planAccounts) {
          const rawAccounts = await connection.getProgramAccounts(
            program.programId,
            {
              filters: [
                { dataSize: 173 }, // current layout only
                { memcmp: { offset: 8, bytes: plan.publicKey.toBase58() } },
              ],
            },
          );

          for (const { pubkey, account } of rawAccounts) {
            try {
              const decoded = program.coder.accounts.decode(
                "subscription",
                account.data,
              );
              allSubs.push({ publicKey: pubkey, account: decoded });
            } catch {
              console.warn(
                "Skipping undeserializable subscription:",
                pubkey.toBase58(),
              );
            }
          }
        }

        if (allSubs.length === 0) {
          setLogs(MOCK_LOGS);
          setUsingMock(true);
          return;
        }

        // Map each subscription to a log entry
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const entries: LogEntry[] = allSubs.map((a: any) => {
          const acc = a.account;
          const planPk = acc.plan.toBase58();
          const lastPaidAt = acc.lastPaidAt.toNumber();
          const type = deriveLogType(
            acc.status,
            acc.paymentCount.toNumber(),
            lastPaidAt,
          );

          return {
            id: a.publicKey.toBase58(),
            type,
            subscriber: acc.subscriber.toBase58(),
            plan: planNames[planPk] ?? planPk.slice(0, 8) + "...",
            planPubkey: planPk,
            amountUsdc: microToUsdc(acc.amountUsdc),
            totalPaid: microToUsdc(acc.totalPaid),
            paymentCount: acc.paymentCount.toNumber(),
            status: Object.keys(acc.status)[0],
            timestamp:
              lastPaidAt > 0
                ? unixToDate(lastPaidAt)
                : unixToDate(acc.startedAt.toNumber()),
            raw: a.publicKey.toBase58(),
          };
        });

        // Sort newest first
        const sorted = entries.sort((a, b) =>
          b.timestamp.localeCompare(a.timestamp),
        );
        setLogs(sorted);
        setUsingMock(false);
      } catch (err) {
        console.error("[Logs] fetch failed:", err);
        setLogs(MOCK_LOGS);
        setUsingMock(true);
      } finally {
        setLoading(false);
      }
    }

    fetchLogs();
  }, [program, publicKey]);

  const filtered =
    typeFilter === "all" ? logs : logs.filter((l) => l.type === typeFilter);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">Execution Logs</h1>
        <p className="text-sm text-muted-foreground mt-1">
          On-chain subscription activity for your plans
        </p>
      </div>

      {usingMock && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {publicKey
              ? "No on-chain activity found for your plans."
              : "Connect your wallet to see real execution logs."}
          </AlertDescription>
        </Alert>
      )}

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        {[
          "all",
          "PaymentExecuted",
          "PaymentFailed",
          "SubscriptionCreated",
          "SubscriptionCancelled",
          "SubscriptionExpired",
        ].map((t) => (
          <button
            key={t}
            onClick={() => setTypeFilter(t)}
            className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              typeFilter === t
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-transparent text-muted-foreground border-border hover:border-foreground/30"
            }`}
          >
            {t === "all" ? "All" : t.replace(/([A-Z])/g, " $1").trim()}
          </button>
        ))}
      </div>

      {/* Log list */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border p-4 space-y-2">
              <div className="flex items-center gap-3">
                <Skeleton className="h-9 w-9 rounded-lg" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-4 w-16" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border p-8 text-center">
          <p className="text-sm text-muted-foreground">
            No logs match this filter.
          </p>
        </div>
      ) : (
        <Accordion type="multiple" className="space-y-3">
          {filtered.map((entry, i) => (
            <LogCard key={entry.id} entry={entry} index={i} />
          ))}
        </Accordion>
      )}
    </div>
  );
}
