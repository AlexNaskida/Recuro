// PoweredByVisuals.tsx - protocol-native previews for the landing page
import { cn } from "@/lib/cn";

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
  variant?: "active" | "paused" | "cancelled" | "gated";
}) {
  return (
    <span
      className={cn(
        "text-[9px] font-medium px-1.5 py-0.5 rounded-full border",
        variant === "active" &&
          "text-violet-600 bg-violet-50 border-violet-200",
        variant === "paused" && "text-amber-600 bg-amber-50 border-amber-200",
        variant === "cancelled" && "text-red-500 bg-red-50 border-red-200",
        variant === "gated" &&
          "text-emerald-600 bg-emerald-50 border-emerald-200",
      )}
    >
      {variant}
    </span>
  );
}

// ─── 1. Protocol - plan setup + billing overview ──────────────────────────────
export function ProtocolPreview() {
  return (
    <div className="flex flex-col gap-2.5 p-4 bg-gradient-to-br from-slate-50 to-violet-50/20 rounded-2xl border border-gray-200 h-full">
      <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">
        Protocol plans
      </div>

      <div className="grid grid-cols-2 gap-2">
        {[
          {
            name: "Creator",
            price: "$9.99",
            subs: 47,
            status: "active" as const,
          },
          {
            name: "Pro",
            price: "$29.99",
            subs: 128,
            status: "active" as const,
          },
        ].map((p) => (
          <DashCard key={p.name} className="p-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-semibold text-gray-700">
                {p.name}
              </span>
              <Badge variant={p.status} />
            </div>
            <div className="text-sm font-bold text-gray-900">
              {p.price}
              <span className="text-[9px] font-normal text-gray-400">/mo</span>
            </div>
            <div className="text-[9px] text-gray-400 mt-0.5">
              {p.subs} subscribers
            </div>
          </DashCard>
        ))}
      </div>

      {/* Mini revenue chart */}
      <DashCard className="p-2.5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-semibold text-gray-700">
            Plan totals
          </span>
          <span className="text-[10px] font-bold text-violet-600">
            $4,308.25
          </span>
        </div>
        <svg viewBox="0 0 240 48" className="w-full" preserveAspectRatio="none">
          <defs>
            <linearGradient id="sg" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0,38 C30,35 60,28 90,20 C120,12 150,15 180,10 C200,7 220,5 240,3 L240,48 L0,48 Z"
            fill="url(#sg)"
          />
          <path
            d="M0,38 C30,35 60,28 90,20 C120,12 150,15 180,10 C200,7 220,5 240,3"
            stroke="#7c3aed"
            strokeWidth="1.5"
            fill="none"
            strokeLinecap="round"
          />
        </svg>
        <div className="flex justify-between text-[8px] text-gray-300 mt-1">
          {["Feb", "Mar", "Apr", "May", "Jun", "Jul"].map((m) => (
            <span key={m}>{m}</span>
          ))}
        </div>
      </DashCard>

      <DashCard className="px-3 py-2">
        <div className="text-[9px] font-semibold text-gray-400 mb-1.5">
          Latest executions
        </div>
        {[
          { wallet: "9WzD...wsG", plan: "Pro", amount: "$29.99" },
          { wallet: "FQJ2...GKY", plan: "Creator", amount: "$9.99" },
        ].map((r, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center justify-between py-1.5 text-[10px]",
              i === 0 && "border-b border-gray-50",
            )}
          >
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span className="font-mono text-gray-600">{r.wallet}</span>
              <span className="text-gray-400">· {r.plan}</span>
            </div>
            <span className="font-semibold text-gray-800">{r.amount}</span>
          </div>
        ))}
      </DashCard>
    </div>
  );
}

// ─── 2. Wallet - scoped approval + revoke flow ───────────────────────────────
export function WalletPreview() {
  const approvals = [
    {
      label: "One-cycle delegate",
      value: "Exact amount only",
      color: "bg-emerald-400",
    },
    {
      label: "Wallet control",
      value: "Revoke in Phantom",
      color: "bg-violet-500",
    },
  ];

  return (
    <div className="flex flex-col gap-2.5 p-4 bg-gradient-to-br from-slate-50 to-violet-50/20 rounded-2xl border border-gray-200 h-full">
      <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">
        Subscriber safety
      </div>

      {approvals.map((item) => (
        <DashCard key={item.label} className="p-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <div className={cn("h-2 w-2 rounded-full", item.color)} />
              <span className="text-[10px] font-semibold text-gray-800">
                {item.label}
              </span>
            </div>
            <span className="text-[9px] text-gray-400">Active now</span>
          </div>
          <div className="mt-1.5 text-[10px] font-medium text-gray-500">
            {item.value}
          </div>
        </DashCard>
      ))}

      <DashCard className="px-3 py-2 flex items-center gap-2">
        <div className="h-6 w-6 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
          <svg
            className="h-3 w-3 text-emerald-500"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M3 8l4 4 6-6" />
          </svg>
        </div>
        <div>
          <div className="text-[10px] font-semibold text-gray-800">
            Cancel anytime in Phantom
          </div>
          <div className="text-[9px] text-gray-400">
            No support ticket · instant SPL revoke
          </div>
        </div>
      </DashCard>
    </div>
  );
}

// ─── 3. Keeper - execution coverage and redundancy ───────────────────────────
export function KeeperPreview() {
  const keepers = [
    {
      name: "Primary",
      status: "active" as const,
      detail: "Merchant-run keeper",
    },
    {
      name: "Backup",
      status: "active" as const,
      detail: "Managed service fallback",
    },
    {
      name: "Public",
      status: "gated" as const,
      detail: "Permissionless execution",
    },
  ];

  return (
    <div className="flex flex-col gap-2.5 p-4 bg-gradient-to-br from-slate-50 to-violet-50/20 rounded-2xl border border-gray-200 h-full">
      <div className="text-[9px] font-semibold text-gray-400 uppercase tracking-widest">
        Keeper network
      </div>

      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Uptime", value: "24/7" },
          { label: "Missed cycles", value: "0" },
          { label: "Fallbacks", value: "3" },
        ].map((s) => (
          <DashCard key={s.label} className="p-2 text-center">
            <div className="text-sm font-bold text-gray-900">{s.value}</div>
            <div className="text-[9px] text-gray-400 mt-0.5">{s.label}</div>
          </DashCard>
        ))}
      </div>

      <DashCard>
        <div className="px-3 py-2 border-b border-gray-100 text-[9px] font-semibold text-gray-400 uppercase tracking-wide">
          Execution queue
        </div>
        {keepers.map((keeper, i) => (
          <div
            key={i}
            className={cn(
              "flex items-center gap-2 px-3 py-2 text-[10px]",
              i < keepers.length - 1 && "border-b border-gray-50",
            )}
          >
            <div
              className={cn(
                "h-5 w-5 rounded flex items-center justify-center shrink-0",
                keeper.status === "gated" ? "bg-violet-50" : "bg-emerald-50",
              )}
            >
              {keeper.status === "gated" ? (
                <svg
                  className="h-2.5 w-2.5 text-violet-500"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <rect x="3" y="8" width="10" height="6" rx="1" />
                  <path d="M5 8V6a3 3 0 016 0v2" />
                </svg>
              ) : (
                <svg
                  className="h-2.5 w-2.5 text-emerald-500"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="8" cy="8" r="5" />
                  <path d="M8 5v3l2 2" />
                </svg>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-700 truncate">
                {keeper.name}
              </div>
              <div className="text-[9px] text-gray-400">{keeper.detail}</div>
            </div>
            <Badge variant={keeper.status} />
          </div>
        ))}
      </DashCard>
    </div>
  );
}
