import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMerchantWallet } from "@/hooks/useMerchantWallet";
import {
  Pause,
  Plus,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  Wallet,
  X,
  LayoutDashboard,
  FileText,
  Users,
  BarChart2,
  Settings,
  TrendingUp,
  Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const METRICS = [
  {
    label: "Total Revenue",
    target: 24847,
    delta: "+12.5%",
    formatter: (value: number) => `$${Math.round(value).toLocaleString()}`,
  },
  {
    label: "Active Subscribers",
    target: 187,
    delta: "+6.1%",
    formatter: (value: number) => `${Math.round(value)}`,
  },
  {
    label: "Success Rate",
    target: 97.3,
    delta: "+1.2%",
    formatter: (value: number) => `${value.toFixed(1)}%`,
  },
];

const ACTIVITY = [
  {
    id: "act-1",
    type: "Subscription Paused",
    wallet: "6yQm...A2Kd",
    plan: "Pro",
    amount: "–",
    icon: Pause,
    tone: "text-amber-600 border-amber-200 bg-amber-50",
  },
  {
    id: "act-2",
    type: "Payment Executed",
    wallet: "9WzD...wsG",
    plan: "Pro",
    amount: "$29.99",
    icon: TrendingUp,
    tone: "text-emerald-600 border-emerald-200 bg-emerald-50",
  },
  {
    id: "act-3",
    type: "Subscription Created",
    wallet: "FQJ2...GKY",
    plan: "Starter",
    amount: "$9.99",
    icon: Plus,
    tone: "text-violet-600 border-violet-200 bg-violet-50",
  },
  {
    id: "act-4",
    type: "Payment Executed",
    wallet: "HN7c...WrH",
    plan: "Enterprise",
    amount: "$99.99",
    icon: TrendingUp,
    tone: "text-emerald-600 border-emerald-200 bg-emerald-50",
  },
  {
    id: "act-5",
    type: "Payment Failed",
    wallet: "5Zzg...7AB",
    plan: "Pro",
    amount: "$29.99",
    icon: X,
    tone: "text-red-500 border-red-200 bg-red-50",
  },
  {
    id: "act-6",
    type: "Subscription Cancelled",
    wallet: "DRpb...1hy",
    plan: "Starter",
    amount: "–",
    icon: Minus,
    tone: "text-gray-400 border-gray-200 bg-gray-50",
  },
];

const NAV_ICONS = [LayoutDashboard, FileText, Users, BarChart2];

const DONUT_PLANS = [
  { label: "Starter", pct: 25, count: 47, color: "#10b981" },
  { label: "Pro", pct: 68, count: 128, color: "#06b6d4" },
  { label: "Enterprise", pct: 6, count: 12, color: "#1e293b" },
];

function Sparkline({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 56 20" fill="none" className="h-5 w-14 shrink-0">
      <path
        d={d}
        stroke="#7c3aed"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function AreaChart({ progress }: { progress: number }) {
  const line =
    "M0,126 C18,124 38,118 60,108 C84,97 108,82 132,72 C156,62 180,60 204,50 C228,40 252,36 276,22 C286,16 293,10 300,6";
  const area = `${line} L300,130 L0,130 Z`;
  const revealWidth = Math.max(3, Math.min(300, 300 * progress));
  return (
    <svg
      viewBox="0 0 300 130"
      className="w-full h-full"
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id="ag" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[20, 52, 84, 116].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2="300"
          y2={y}
          stroke="#e2e8f0"
          strokeWidth="0.8"
          strokeDasharray="3 3"
        />
      ))}
      <clipPath id="chartReveal">
        <rect x="0" y="0" width={revealWidth} height="130" />
      </clipPath>
      <g clipPath="url(#chartReveal)">
        <path d={area} fill="url(#ag)" />
        <path
          d={line}
          pathLength={1}
          stroke="#7c3aed"
          strokeWidth="2"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="1"
          strokeDashoffset={1 - progress}
        />
      </g>
    </svg>
  );
}

function DonutChart({ progress }: { progress: number }) {
  const r = 40;
  const cx = 48;
  const cy = 48;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const segs = DONUT_PLANS.map((p) => {
    const dash = (p.pct / 100) * circ;
    const seg = { ...p, dash, offset };
    offset += dash;
    return seg;
  });
  return (
    <svg viewBox="0 0 96 96" className="h-24 w-24 shrink-0 -rotate-90">
      {segs.map((s) => (
        <circle
          key={s.label}
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={s.color}
          strokeWidth="16"
          strokeDasharray={`${s.dash * progress} ${circ - s.dash * progress}`}
          strokeDashoffset={-s.offset}
        />
      ))}
      <circle cx={cx} cy={cy} r={31} fill="white" />
    </svg>
  );
}

export default function AuthPage() {
  const navigate = useNavigate();
  const {
    ready,
    authenticated,
    connected,
    connectWallet,
    connectOrCreateWallet,
    link,
    login,
  } = useMerchantWallet();

  const [isConnecting, setIsConnecting] = useState(false);
  const timeoutRef = useRef<number | null>(null);
  const [introProgress, setIntroProgress] = useState(0);
  const [displayedActivity, setDisplayedActivity] = useState(() =>
    ACTIVITY.slice(2),
  );
  const [newActivityIds, setNewActivityIds] = useState<Set<string>>(
    () => new Set(),
  );

  // ── Redirect once Privy is fully ready AND wallet is hydrated ──
  useEffect(() => {
    if (ready && authenticated && connected) {
      navigate("/dashboard", { replace: true });
    }
  }, [ready, authenticated, connected, navigate]);

  // ── Reset spinner whenever auth state settles ──
  useEffect(() => {
    if (!authenticated || (ready && connected)) {
      setIsConnecting(false);
    }
  }, [authenticated, ready, connected]);

  // ── Cleanup timeout on unmount ──
  useEffect(
    () => () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    },
    [],
  );

  // ── Animate dashboard intro on mount ──
  useEffect(() => {
    let frame = 0;
    const duration = 1300;
    const start = performance.now();
    const animate = (now: number) => {
      const raw = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - raw, 3);
      setIntroProgress(eased);
      if (raw < 1) frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // ── Stage activity feed items ──
  useEffect(() => {
    const stagedItems = [ACTIVITY[1], ACTIVITY[0]];
    const timers: number[] = [];
    stagedItems.forEach((item, index) => {
      const timer = window.setTimeout(
        () => {
          setDisplayedActivity((prev) =>
            [item, ...prev.filter((entry) => entry.id !== item.id)].slice(
              0,
              ACTIVITY.length,
            ),
          );
          setNewActivityIds((prev) => {
            const next = new Set(prev);
            next.add(item.id);
            return next;
          });
          window.requestAnimationFrame(() => {
            setNewActivityIds((prev) => {
              const next = new Set(prev);
              next.delete(item.id);
              return next;
            });
          });
        },
        450 + index * 700,
      );
      timers.push(timer);
    });
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, []);

  function handleConnect() {
    setIsConnecting(true);
    const action = authenticated
      ? (connectOrCreateWallet ?? connectWallet ?? link)
      : (login ?? connectOrCreateWallet ?? connectWallet);
    try {
      if (!action) throw new Error("No wallet action available");
      void action();
    } catch (err) {
      console.error("[AuthPage]", err);
      setIsConnecting(false);
    }
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    timeoutRef.current = window.setTimeout(() => {
      setIsConnecting(false);
      timeoutRef.current = null;
    }, 15_000);
  }

  return (
    <div className="min-h-screen bg-[#050b24] text-white lg:grid lg:grid-cols-[1fr_1.15fr] lg:divide-x lg:divide-white/10">
      {/* ── LEFT ─────────────────────────────────────────── */}
      <section className="flex flex-col justify-center min-h-screen px-10 py-16 sm:px-16 lg:px-20">
        <div className="mb-8 inline-flex w-fit items-center gap-2 rounded-full border border-violet-400/30 bg-violet-400/10 px-3.5 py-1.5 text-xs font-medium text-violet-200">
          <ShieldCheck className="h-3.5 w-3.5" />
          Merchant Dashboard Access
        </div>

        <h1 className="max-w-[480px] text-5xl font-bold leading-[1.08] tracking-tight text-white sm:text-6xl">
          Start building
          <br />
          with Recuro
        </h1>

        <p className="mt-7 max-w-[420px] text-lg leading-relaxed text-slate-300">
          Connect with Privy to access your wallet-gated merchant dashboard,
          monitor subscriptions, and manage recurring on-chain revenue.
        </p>

        <div className="mt-12 w-full max-w-[400px] space-y-4">
          <Button
            size="lg"
            className="h-14 w-full rounded-full bg-violet-500 text-base font-semibold text-white hover:bg-violet-400 transition-colors"
            onClick={handleConnect}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <>
                <RefreshCw className="h-4 w-4 animate-spin" />
                Waiting for wallet...
              </>
            ) : (
              <>
                <Wallet className="h-4 w-4" />
                Get started
                <ArrowRight className="ml-auto h-4 w-4" />
              </>
            )}
          </Button>
          <p className="text-sm text-slate-500">
            Non-custodial · No custody transfer · Your keys stay yours
          </p>
        </div>
      </section>

      {/* ── RIGHT: dashboard preview ─────────────────────── */}
      <section className="relative hidden lg:flex lg:items-end lg:justify-end overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,rgba(167,139,250,0.14)_1px,transparent_0)] [background-size:22px_22px] opacity-50" />
        <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />

        <div
          className="relative flex overflow-hidden bg-white shadow-[0_32px_80px_-10px_rgba(2,6,23,0.8)]"
          style={{
            width: "92%",
            height: "82vh",
            marginTop: "auto",
            marginBottom: "0",
            borderRadius: "20px 0 0 0",
            borderTop: "1px solid #e2e8f0",
            borderLeft: "1px solid #e2e8f0",
          }}
        >
          {/* Sidebar */}
          <aside className="flex w-16 shrink-0 flex-col items-center gap-3 border-r border-slate-100 bg-slate-50/80 pt-8 pb-6 px-2">
            {NAV_ICONS.map((Icon, i) => (
              <div
                key={i}
                className={`flex h-11 w-11 items-center justify-center rounded-xl transition-colors
                  ${i === 0 ? "bg-violet-100 text-violet-600" : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"}`}
              >
                <Icon className="h-[22px] w-[22px]" />
              </div>
            ))}
            <div className="mt-auto flex h-11 w-11 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100">
              <Settings className="h-[22px] w-[22px]" />
            </div>
          </aside>

          {/* Dashboard content */}
          <main className="flex flex-1 flex-col overflow-y-auto bg-white p-7 gap-3">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] text-slate-400">
                  Dashboard / Overview
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
                  Dashboard
                </h2>
              </div>
              <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-medium text-violet-700">
                Overview
              </span>
            </div>

            {/* Stat cards */}
            <div className="grid grid-cols-3 gap-3">
              {METRICS.map((m, i) => (
                <div
                  key={m.label}
                  className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-xs text-slate-400 mb-2">{m.label}</p>
                  <p className="text-[26px] font-bold text-slate-900 leading-none tracking-tight">
                    {m.formatter(m.target * introProgress)}
                  </p>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-medium text-violet-600">
                      ↗ {m.delta}
                    </span>
                    <Sparkline
                      d={
                        [
                          "M0,16 C8,13 18,10 28,6 C38,3 46,4 56,1",
                          "M0,14 C10,12 20,10 30,7 C40,5 48,5 56,2",
                          "M0,17 C10,14 20,11 32,8 C42,5 50,6 56,2",
                        ][i]
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Chart + Activity */}
            <div className="grid grid-cols-[1.3fr_1fr] gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-slate-800">
                    Revenue vs MRR
                  </span>
                  <div className="flex gap-3 text-[10px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-violet-500 inline-block" />
                      Revenue
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-slate-300 inline-block" />
                      MRR
                    </span>
                  </div>
                </div>
                <div className="flex flex-1 min-h-[220px] gap-2">
                  <div className="flex h-full flex-col justify-between pb-6 text-[9px] text-slate-300 shrink-0">
                    <span>$38k</span>
                    <span>$29k</span>
                    <span>$19k</span>
                    <span>$0</span>
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="min-h-[190px] flex-1">
                      <AreaChart progress={introProgress} />
                    </div>
                    <div className="mt-2 flex justify-between text-[9px] text-slate-300">
                      {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"].map(
                        (m) => (
                          <span key={m}>{m}</span>
                        ),
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm overflow-hidden">
                <p className="text-sm font-semibold text-slate-800 mb-3">
                  Recent Activity
                </p>
                <div className="space-y-2">
                  {displayedActivity.map((e) => {
                    const Icon = e.icon;
                    return (
                      <div
                        key={e.id}
                        className={`flex items-center gap-2.5 transition-all duration-500 ${
                          newActivityIds.has(e.id)
                            ? "-translate-y-2 opacity-0"
                            : "translate-y-0 opacity-100"
                        }`}
                      >
                        <span
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${e.tone}`}
                        >
                          <Icon className="h-3.5 w-3.5" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-semibold text-slate-800 leading-none">
                            {e.type}
                          </p>
                          <p className="truncate text-[10px] text-slate-400 mt-0.5">
                            {e.wallet} · {e.plan}
                          </p>
                        </div>
                        <p className="text-xs font-semibold text-slate-700 shrink-0">
                          {e.amount}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Donut + Plan Performance */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-800 mb-3">
                  Subscribers by Plan
                </p>
                <div className="flex items-center gap-4">
                  <div className="relative shrink-0">
                    <DonutChart progress={introProgress} />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className="text-base font-bold text-slate-900 leading-none">
                        {Math.round(187 * introProgress)}
                      </span>
                      <span className="text-[9px] text-slate-400 mt-0.5">
                        Total
                      </span>
                    </div>
                  </div>
                  <div className="space-y-2 flex-1">
                    {DONUT_PLANS.map((p) => (
                      <div
                        key={p.label}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2.5 w-2.5 rounded-full shrink-0"
                            style={{ background: p.color }}
                          />
                          <span className="text-slate-600">{p.label}</span>
                        </span>
                        <span className="text-slate-400">
                          {Math.round(p.pct * introProgress)}%{" "}
                          <span className="text-slate-300 text-[10px]">
                            {Math.round(p.count * introProgress)}
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-semibold text-slate-800 mb-3">
                  Plan Performance
                </p>
                <div className="space-y-2.5">
                  {[
                    { name: "Starter", subs: 47, rev: "$469.53", s: "active" },
                    { name: "Pro", subs: 128, rev: "$3,838.72", s: "active" },
                    {
                      name: "Enterprise",
                      subs: 12,
                      rev: "$1,199.88",
                      s: "active",
                    },
                    { name: "Beta Access", subs: 0, rev: "$0", s: "paused" },
                  ].map((p) => (
                    <div key={p.name} className="flex items-center gap-2.5">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100">
                        <span className="text-[9px] font-bold text-slate-400">
                          $
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 leading-none">
                          {p.name}
                        </p>
                        <p className="text-[10px] text-slate-400">
                          {p.subs} subscribers
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-slate-700">
                        {p.rev}
                      </span>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium shrink-0 ${
                          p.s === "active"
                            ? "text-violet-600 bg-violet-50 border-violet-200"
                            : "text-amber-600 bg-amber-50 border-amber-200"
                        }`}
                      >
                        {p.s}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
        </div>
      </section>
    </div>
  );
}
