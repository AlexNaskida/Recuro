import { useState, useEffect } from "react";
import { EventParser } from "@coral-xyz/anchor";
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
  Pause,
  Clock,
  DollarSign,
  Wallet,
  FileText,
  Hash,
} from "lucide-react";
import { microToUsdc } from "@/lib/pda";
import { MOCK_LOGS, type LogEntry } from "@/lib/mock-data";
import { useMerchantWallet } from "@/hooks/useMerchantWallet";

// ── Helpers ───────────────────────────────────────────────────────────────────

function unixToDate(unix: number): string {
  if (!unix) return "-";
  return new Date(unix * 1000).toISOString().split("T")[0];
}

function unixToUtcDateTime(unix: number): string {
  if (!unix) return "-";
  return new Date(unix * 1000)
    .toISOString()
    .replace("T", " ")
    .replace(".000Z", " UTC");
}

function bnToNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (
    value &&
    typeof (value as { toNumber?: () => number }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return 0;
}

function truncate(addr: string, start = 6, end = 4): string {
  if (addr.length <= start + end + 3) return addr;
  return addr.slice(0, start) + "..." + addr.slice(-end);
}

async function fetchProgramSignatures(
  connection: {
    getSignaturesForAddress: (
      address: { toBase58: () => string },
      options?: { limit?: number; before?: string },
    ) => Promise<Array<{ signature: string }>>;
  },
  programId: { toBase58: () => string },
) {
  const allSignatures: Array<{ signature: string }> = [];
  let before: string | undefined;

  for (let page = 0; page < 5; page += 1) {
    const batch = await connection.getSignaturesForAddress(programId, {
      limit: 200,
      before,
    });

    if (batch.length === 0) break;

    allSignatures.push(...batch);
    before = batch[batch.length - 1]?.signature;

    if (batch.length < 200) break;
  }

  return allSignatures;
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
  SubscriptionPaused: {
    label: "Subscription Paused",
    icon: Pause,
    color: "text-amber-500",
    badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
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
            value={`${entry.plan} - ${truncate(entry.planPubkey || "-", 8, 4)}`}
            mono={!!entry.planPubkey}
          />
          <DetailRow
            icon={DollarSign}
            label="Amount"
            value={
              entry.amountUsdc > 0
                ? `$${entry.amountUsdc.toFixed(4)} USDC`
                : "-"
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
            value={entry.paymentCount > 0 ? `${entry.paymentCount}` : "-"}
          />
          <DetailRow
            icon={Clock}
            label="Date"
            value={
              entry.timestampUnix
                ? unixToUtcDateTime(Math.floor(entry.timestampUnix / 1000))
                : entry.timestamp
            }
          />
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
  const { publicKey, connected } = useMerchantWallet();
  const { program } = useAnchorProgram();
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [usingMock, setUsingMock] = useState(true);
  const [typeFilter, setTypeFilter] = useState<string>("all");

  useEffect(() => {
    async function fetchLogs() {
      if (!program || !connected || !publicKey) {
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
        const merchantPlanPubkeys = new Set<string>();
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        planAccounts.forEach((a: any) => {
          const planPubkey = a.publicKey.toBase58();
          planNames[planPubkey] = a.account.name;
          merchantPlanPubkeys.add(planPubkey);
        });

        // Fetch all subscriptions for merchant's plans
        const connection = program.provider.connection;
        type DecodedSubscriptionRow = {
          publicKey: { toBase58: () => string };
          account: Record<string, unknown>;
        };
        const allSubs: DecodedSubscriptionRow[] = [];

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

        const subscriptionState = new Map(
          allSubs.map((a) => [a.publicKey.toBase58(), a.account]),
        );

        const parser = new EventParser(program.programId, program.coder);
        const signatures = await fetchProgramSignatures(
          connection,
          program.programId,
        );
        const transactions = await Promise.all(
          signatures.map(async ({ signature }) => {
            const tx = await connection.getTransaction(signature, {
              commitment: "confirmed",
              maxSupportedTransactionVersion: 0,
            });
            return { signature, tx };
          }),
        );

        const entries: LogEntry[] = [];

        transactions.forEach(({ signature, tx }) => {
          const logMessages = tx?.meta?.logMessages;
          if (!logMessages?.length) return;

          let eventIndex = 0;
          for (const parsed of parser.parseLogs(logMessages)) {
            const eventName = parsed.name;
            const event = parsed.data as Record<string, unknown>;
            const planPubkey = event.plan?.toString?.() ?? "";
            if (!merchantPlanPubkeys.has(planPubkey)) continue;

            const subscriptionPubkey = event.subscription?.toString?.() ?? "";
            const state = subscriptionState.get(subscriptionPubkey);
            const timestamp = bnToNumber(event.timestamp);
            const paymentCount =
              bnToNumber(event.paymentCount) || bnToNumber(state?.paymentCount);
            const totalPaid = microToUsdc(bnToNumber(state?.totalPaid));

            const base = {
              id: `${signature}-${eventName}-${eventIndex++}`,
              subscriber: event.subscriber?.toString?.() ?? "",
              plan: planNames[planPubkey] ?? planPubkey.slice(0, 8) + "...",
              planPubkey,
              amountUsdc:
                eventName === "PaymentExecuted" ||
                eventName === "SubscriptionCreated"
                  ? microToUsdc(bnToNumber(event.amountUsdc))
                  : 0,
              totalPaid,
              paymentCount,
              status: eventName,
              timestamp: unixToDate(timestamp),
              timestampUnix: timestamp > 0 ? timestamp * 1000 : 0,
              raw: subscriptionPubkey,
            };

            if (eventName === "PaymentExecuted") {
              entries.push({ ...base, type: "PaymentExecuted" });
            } else if (eventName === "PaymentFailed") {
              entries.push({ ...base, type: "PaymentFailed" });
            } else if (eventName === "SubscriptionCreated") {
              entries.push({ ...base, type: "SubscriptionCreated" });
            } else if (eventName === "SubscriptionPaused") {
              entries.push({ ...base, type: "SubscriptionPaused" });
            } else if (eventName === "SubscriptionCancelled") {
              entries.push({ ...base, type: "SubscriptionCancelled" });
            } else if (eventName === "SubscriptionExpired") {
              entries.push({ ...base, type: "SubscriptionExpired" });
            }
          }
        });

        if (entries.length === 0) {
          // Fall back to current account snapshots when historical event logs are unavailable.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          allSubs.forEach((a: any) => {
            const acc = a.account;
            const planPk = acc.plan.toBase58();
            const subPk = a.publicKey.toBase58();
            const startedAt = bnToNumber(acc.startedAt);
            const lastPaidAt = bnToNumber(acc.lastPaidAt);
            const lastFailedAt = bnToNumber(acc.lastFailedAt);
            const endedAt = bnToNumber(acc.endedAt);
            const paymentCount = bnToNumber(acc.paymentCount);
            const totalFailures = bnToNumber(acc.totalFailures);
            const base = {
              subscriber: acc.subscriber.toBase58(),
              plan: planNames[planPk] ?? planPk.slice(0, 8) + "...",
              planPubkey: planPk,
              amountUsdc: microToUsdc(acc.amountUsdc),
              totalPaid: microToUsdc(acc.totalPaid),
              paymentCount,
              status: Object.keys(acc.status ?? {})[0] ?? "active",
              raw: subPk,
            };

            if (startedAt > 0) {
              entries.push({
                ...base,
                id: `${subPk}-created`,
                type: "SubscriptionCreated",
                timestamp: unixToDate(startedAt),
                timestampUnix: startedAt * 1000,
              });
            }

            if (paymentCount > 0 && lastPaidAt > 0) {
              entries.push({
                ...base,
                id: `${subPk}-paid-${lastPaidAt}`,
                type: "PaymentExecuted",
                timestamp: unixToDate(lastPaidAt),
                timestampUnix: lastPaidAt * 1000,
              });
            }

            if (totalFailures > 0 && lastFailedAt > 0) {
              entries.push({
                ...base,
                id: `${subPk}-failed-${lastFailedAt}`,
                type: "PaymentFailed",
                timestamp: unixToDate(lastFailedAt),
                timestampUnix: lastFailedAt * 1000,
              });
            }

            if (acc.status?.cancelled !== undefined) {
              const cancelledAt = endedAt > 0 ? endedAt : startedAt;
              entries.push({
                ...base,
                id: `${subPk}-cancelled-${cancelledAt}`,
                type: "SubscriptionCancelled",
                timestamp: unixToDate(cancelledAt),
                timestampUnix: cancelledAt > 0 ? cancelledAt * 1000 : 0,
              });
            }

            if (acc.status?.paused !== undefined) {
              const pausedAt = lastPaidAt > 0 ? lastPaidAt : startedAt;
              entries.push({
                ...base,
                id: `${subPk}-paused-${pausedAt}`,
                type: "SubscriptionPaused",
                timestamp: unixToDate(pausedAt),
                timestampUnix: pausedAt > 0 ? pausedAt * 1000 : 0,
              });
            }

            if (acc.status?.expired !== undefined) {
              const expiredAt =
                endedAt > 0 ? endedAt : lastFailedAt || startedAt;
              entries.push({
                ...base,
                id: `${subPk}-expired-${expiredAt}`,
                type: "SubscriptionExpired",
                timestamp: unixToDate(expiredAt),
                timestampUnix: expiredAt > 0 ? expiredAt * 1000 : 0,
              });
            }
          });
        }

        // Sort newest first
        const sorted = entries.sort((a, b) => {
          const aTs = a.timestampUnix ?? (Date.parse(a.timestamp) || 0);
          const bTs = b.timestampUnix ?? (Date.parse(b.timestamp) || 0);
          return bTs - aTs;
        });
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
          "SubscriptionPaused",
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
