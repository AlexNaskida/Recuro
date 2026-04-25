// FeatureVisuals.tsx — styled to match Recuro dashboard exactly
import { cn } from "@/lib/cn";

// ─── Shared chrome wrapper (mimics the dashboard card style) ─────────────────
function DashCard({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden",
        className,
      )}
    >
      {children}
    </div>
  );
}

function Badge({
  variant = "active",
}: {
  variant?: "active" | "paused" | "cancelled";
}) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium px-2 py-0.5 rounded-full border",
        variant === "active" &&
          "text-violet-600 bg-violet-50 border-violet-200",
        variant === "paused" && "text-amber-600 bg-amber-50 border-amber-200",
        variant === "cancelled" && "text-red-500 bg-red-50 border-red-200",
      )}
    >
      {variant}
    </span>
  );
}

// ─── 1. Subscriptions — mimics Plans page ────────────────────────────────────
function SubscriptionsVisual() {
  const plans = [
    {
      name: "Starter",
      price: "$9.99",
      subs: 47,
      revenue: "$469.53",
      status: "active" as const,
    },
    {
      name: "Pro",
      price: "$29.99",
      subs: 128,
      revenue: "$3,838.72",
      status: "active" as const,
    },
    {
      name: "Enterprise",
      price: "$99.99",
      subs: 12,
      revenue: "$1,199.88",
      status: "active" as const,
    },
    {
      name: "Beta Access",
      price: "$4.99",
      subs: 0,
      revenue: "$0",
      status: "paused" as const,
    },
  ];

  return (
    <div className="w-full h-full flex flex-col gap-3 p-1">
      {/* Page header */}
      <div className="flex items-center justify-between px-0.5">
        <div>
          <div className="text-[10px] text-gray-400">Dashboard / Plans</div>
          <div className="text-sm font-semibold text-gray-800 mt-0.5">
            Plans
          </div>
        </div>
        <div className="flex items-center gap-1.5 bg-violet-600 text-white text-[10px] font-semibold px-2.5 py-1.5 rounded-lg">
          <span className="text-sm leading-none">+</span> Create Plan
        </div>
      </div>

      {/* Plan cards grid */}
      <div className="grid grid-cols-2 gap-2.5">
        {plans.map((p) => (
          <DashCard key={p.name} className="p-3.5">
            <div className="flex items-start justify-between mb-1">
              <span className="text-xs font-semibold text-gray-800">
                {p.name}
              </span>
              <Badge variant={p.status} />
            </div>
            <div className="text-lg font-bold text-gray-900 tracking-tight">
              {p.price}
              <span className="text-[11px] font-normal text-gray-400">
                /month
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2 text-[10px] text-gray-400">
              <span className="flex items-center gap-1">
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="8" cy="6" r="2.5" />
                  <path d="M2 14c0-3.3 2.7-6 6-6s6 2.7 6 6" />
                </svg>
                {p.subs}
              </span>
              <span className="flex items-center gap-1">
                <svg
                  className="h-3 w-3"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                >
                  <circle cx="8" cy="8" r="6" />
                  <path d="M8 5v3l2 2" />
                </svg>
                {p.revenue}
              </span>
            </div>
          </DashCard>
        ))}
      </div>
    </div>
  );
}

// ─── 2. Non-custodial — mimics Subscribers table ─────────────────────────────
function NonCustodialVisual() {
  const rows = [
    {
      wallet: "HN7c...YWrH",
      plan: "Enterprise",
      status: "active" as const,
      started: "2026-01-15",
      paid: "$199.98",
    },
    {
      wallet: "FQJ2...RGKY",
      plan: "Pro",
      status: "active" as const,
      started: "2026-01-01",
      paid: "$59.98",
    },
    {
      wallet: "3Kb3...RzGv",
      plan: "Starter",
      status: "active" as const,
      started: "2025-12-01",
      paid: "$29.97",
    },
    {
      wallet: "9WzD...wZsG",
      plan: "Pro",
      status: "active" as const,
      started: "2025-11-12",
      paid: "$119.96",
    },
    {
      wallet: "DRpb...21hy",
      plan: "Starter",
      status: "cancelled" as const,
      started: "2025-09-05",
      paid: "$29.97",
    },
  ];

  return (
    <div className="w-full h-full flex flex-col gap-3 p-1">
      <div className="px-0.5">
        <div className="text-[10px] text-gray-400">Dashboard / Subscribers</div>
        <div className="text-sm font-semibold text-gray-800 mt-0.5">
          Subscribers
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {["All Plans", "All Statuses"].map((f) => (
          <div
            key={f}
            className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-2.5 py-1.5 text-[10px] text-gray-500 bg-white"
          >
            {f}
            <svg
              className="h-3 w-3 text-gray-400"
              viewBox="0 0 12 12"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path d="M3 4.5l3 3 3-3" />
            </svg>
          </div>
        ))}
      </div>

      {/* Table */}
      <DashCard>
        <div className="grid grid-cols-[1.6fr_0.8fr_0.7fr_0.9fr] text-[9px] font-semibold text-gray-400 uppercase tracking-wide px-3.5 py-2 border-b border-gray-100">
          <span>Wallet</span>
          <span>Plan</span>
          <span>Status</span>
          <span className="text-right">Total Paid</span>
        </div>
        {rows.map((r, i) => (
          <div
            key={i}
            className={cn(
              "grid grid-cols-[1.6fr_0.8fr_0.7fr_0.9fr] items-center px-3.5 py-2.5 text-[10px]",
              i < rows.length - 1 && "border-b border-gray-50",
            )}
          >
            <span className="font-mono text-gray-700 font-medium">
              {r.wallet}
            </span>
            <span className="text-gray-600">{r.plan}</span>
            <span>
              <Badge variant={r.status} />
            </span>
            <span className="text-right font-semibold text-gray-800">
              {r.paid}
            </span>
          </div>
        ))}
      </DashCard>
    </div>
  );
}

// ─── 3. Reliability — mimics Execution Logs ──────────────────────────────────
function ReliabilityVisual() {
  const filters = [
    "All",
    "Payment Executed",
    "Payment Failed",
    "Subscription Created",
    "Subscription Paused",
  ];

  const logs = [
    {
      type: "Payment Executed",
      plan: "Pro",
      wallet: "9WzD...wsG",
      amount: "$29.99",
      date: "2026-04-25",
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      type: "Subscription Created",
      plan: "Starter",
      wallet: "FQJ2...GKY",
      amount: "$9.99",
      date: "2026-04-25",
      color: "text-violet-600 bg-violet-50 border-violet-200",
    },
    {
      type: "Payment Executed",
      plan: "Enterprise",
      wallet: "HN7c...WrH",
      amount: "$99.99",
      date: "2026-04-24",
      color: "text-emerald-600 bg-emerald-50 border-emerald-200",
    },
    {
      type: "Payment Failed",
      plan: "Pro",
      wallet: "5Zzg...7AB",
      amount: "$29.99",
      date: "2026-04-24",
      color: "text-red-500 bg-red-50 border-red-200",
    },
    {
      type: "Subscription Paused",
      plan: "Pro",
      wallet: "6yQm...A2Kd",
      amount: "—",
      date: "2026-04-23",
      color: "text-amber-600 bg-amber-50 border-amber-200",
    },
    {
      type: "Subscription Cancelled",
      plan: "Starter",
      wallet: "DRpb...1hy",
      amount: "—",
      date: "2026-04-22",
      color: "text-gray-500 bg-gray-50 border-gray-200",
    },
  ];

  const icons: Record<string, string> = {
    "Payment Executed": "M5 12l4 4 6-7",
    "Subscription Created": "M12 5v14M5 12h14",
    "Payment Failed": "M6 6l8 8M14 6l-8 8",
    "Subscription Paused": "M8 5v6M14 5v6",
    "Subscription Cancelled": "M6 6l8 8M14 6l-8 8",
  };

  return (
    <div className="w-full h-full flex flex-col gap-3 p-1">
      <div className="px-0.5">
        <div className="text-[10px] text-gray-400">
          Dashboard / Execution Logs
        </div>
        <div className="text-sm font-semibold text-gray-800 mt-0.5">
          Execution Logs
        </div>
        <div className="text-[10px] text-gray-400">
          On-chain subscription activity for your plans
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-1.5 flex-wrap">
        {filters.map((f, i) => (
          <span
            key={f}
            className={cn(
              "text-[9px] font-medium px-2 py-1 rounded-full border",
              i === 0
                ? "bg-violet-600 text-white border-violet-600"
                : "bg-white text-gray-500 border-gray-200",
            )}
          >
            {f}
          </span>
        ))}
      </div>

      {/* Log entries */}
      <DashCard>
        {logs.map((log, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-2.5 px-3.5 py-2.5",
              i < logs.length - 1 && "border-b border-gray-50",
            )}
          >
            <div
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border",
                log.color,
              )}
            >
              <svg
                className="h-3 w-3"
                viewBox="0 0 20 20"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d={icons[log.type] ?? "M5 12l4 4 6-7"} />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-semibold text-gray-800">
                  {log.type}
                </span>
                <span className="text-[9px] bg-violet-50 text-violet-600 border border-violet-100 rounded-full px-1.5 py-0.5 font-medium">
                  {log.plan}
                </span>
              </div>
              <div className="text-[10px] text-gray-400 font-mono mt-0.5">
                {log.wallet}
              </div>
            </div>
            <div className="text-right shrink-0">
              <div className="text-[11px] font-semibold text-gray-800">
                {log.amount}
              </div>
              <div className="text-[9px] text-gray-400 mt-0.5">{log.date}</div>
            </div>
          </div>
        ))}
      </DashCard>
    </div>
  );
}

// ─── Panel wrapper matching landing page tint ────────────────────────────────
function Panel({
  tint,
  children,
  className,
}: {
  tint: string;
  children: React.ReactNode;
  className?: string;
}) {
  const bg: Record<string, string> = {
    teal: "bg-gradient-to-br from-slate-50 to-violet-50/30",
    purple: "bg-gradient-to-br from-slate-50 to-violet-50/30",
    blue: "bg-gradient-to-br from-slate-50 to-violet-50/30",
  };
  return (
    <div
      className={cn(
        "relative w-full min-h-[340px] rounded-2xl border border-gray-200 overflow-hidden p-5 shadow-sm",
        bg[tint] ?? bg.blue,
        className,
      )}
    >
      {children}
    </div>
  );
}

// ─── Router ──────────────────────────────────────────────────────────────────
const VISUALS: Record<string, React.ComponentType> = {
  Subscriptions: SubscriptionsVisual,
  "Non-custodial": NonCustodialVisual,
  Reliability: ReliabilityVisual,
};

export function FeatureVisual({
  tag,
  tint,
  className,
}: {
  tag: string;
  tint: string;
  className?: string;
}) {
  const Visual = VISUALS[tag];
  if (!Visual)
    return (
      <Panel tint={tint} className={className}>
        <span className="text-xs text-gray-400">{tag}</span>
      </Panel>
    );
  return (
    <Panel tint={tint} className={className}>
      <Visual />
    </Panel>
  );
}
