"use client";

import { useEffect, useRef, useState } from "react";
import {
  DollarSign,
  Users,
  CheckCircle,
  TrendingUp,
  Plus,
  AlertCircle,
  Minus,
} from "lucide-react";

// ─── Hooks ───────────────────────────────────────────────────────────────────

function useInView(threshold = 0.25) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

function useCountUp(target: number, inView: boolean, duration = 1400) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (!inView) return;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min((now - start) / duration, 1);
      // ease out cubic
      const ease = 1 - Math.pow(1 - p, 3);
      setValue(Math.floor(ease * target));
      if (p < 1) requestAnimationFrame(tick);
      else setValue(target);
    };
    requestAnimationFrame(tick);
  }, [inView, target, duration]);
  return value;
}

// ─── SVG helpers ─────────────────────────────────────────────────────────────

const SPARKLINE_D = {
  revenue: "M0,22 C10,20 20,16 32,12 C44,8 54,10 64,6 C70,4 74,3 80,2",
  subscribers: "M0,20 C12,18 24,16 36,13 C48,10 56,11 68,8 C72,7 76,6 80,5",
  success: "M0,24 C14,22 26,18 38,15 C50,12 58,13 68,9 C73,7 76,6 80,5",
};

const CHART_LINE =
  "M0,118 C40,112 80,100 120,80 C160,60 200,58 240,52 C280,46 320,48 360,38 C400,28 440,32 480,24 C510,18 540,14 580,8";
const CHART_AREA = `${CHART_LINE} L580,155 L0,155 Z`;

function Sparkline({ d, inView }: { d: string; inView: boolean }) {
  const pathRef = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(0);
  useEffect(() => {
    if (pathRef.current) setLen(pathRef.current.getTotalLength());
  }, []);

  return (
    <svg viewBox="0 0 80 28" fill="none" className="h-7 w-20 shrink-0">
      <path
        ref={pathRef}
        d={d}
        stroke="#7c3aed"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray={len || 200}
        strokeDashoffset={inView ? 0 : len || 200}
        style={{
          transition: inView
            ? "stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1) 0.3s"
            : "none",
        }}
      />
    </svg>
  );
}

function RevenueChart({ inView }: { inView: boolean }) {
  const lineRef = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(0);
  useEffect(() => {
    if (lineRef.current) setLen(lineRef.current.getTotalLength());
  }, []);

  return (
    <svg viewBox="0 0 580 155" className="w-full" preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#7c3aed" stopOpacity="0.12" />
          <stop offset="100%" stopColor="#7c3aed" stopOpacity="0.01" />
        </linearGradient>
        <clipPath id="chartClip">
          <rect
            x="0"
            y="0"
            height="155"
            width={inView ? 580 : 0}
            style={{
              transition: inView
                ? "width 1.4s cubic-bezier(0.4,0,0.2,1) 0.2s"
                : "none",
            }}
          />
        </clipPath>
      </defs>
      {[20, 55, 90, 125].map((y) => (
        <line
          key={y}
          x1="0"
          y1={y}
          x2="580"
          y2={y}
          stroke="#e5e7eb"
          strokeWidth="1"
          strokeDasharray="4 4"
        />
      ))}
      <g clipPath="url(#chartClip)">
        <path d={CHART_AREA} fill="url(#areaGrad)" />
        <path
          ref={lineRef}
          d={CHART_LINE}
          stroke="#7c3aed"
          strokeWidth="2.5"
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={len || 900}
          strokeDashoffset={inView ? 0 : len || 900}
          style={{
            transition: inView
              ? "stroke-dashoffset 1.4s cubic-bezier(0.4,0,0.2,1) 0.2s"
              : "none",
          }}
        />
      </g>
    </svg>
  );
}

// ─── Activity ─────────────────────────────────────────────────────────────────

const ACTIVITY = [
  {
    icon: AlertCircle,
    color: "text-amber-500 bg-amber-50",
    label: "Subscription Paused",
    sub: "6yQm...A2Kd · Pro",
    amount: null,
  },
  {
    icon: TrendingUp,
    color: "text-emerald-500 bg-emerald-50",
    label: "Payment Executed",
    sub: "9WzD...wsG · Pro",
    amount: "$29.99",
  },
  {
    icon: Plus,
    color: "text-violet-500 bg-violet-50",
    label: "Subscription Created",
    sub: "FQJ2...GKY · Starter",
    amount: "$9.99",
  },
  {
    icon: TrendingUp,
    color: "text-emerald-500 bg-emerald-50",
    label: "Payment Executed",
    sub: "HN7c...WrH · Enterprise",
    amount: "$99.99",
  },
  {
    icon: AlertCircle,
    color: "text-red-500 bg-red-50",
    label: "Payment Failed",
    sub: "5Zzg...7AB · Pro",
    amount: "$29.99",
  },
  {
    icon: Minus,
    color: "text-gray-400 bg-gray-100",
    label: "Subscription Cancelled",
    sub: "DRpb...1hy · Starter",
    amount: null,
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function HeroDashboardOverlay() {
  const { ref, inView } = useInView(0.2);

  const revenue = useCountUp(24847, inView, 1600);
  const subscribers = useCountUp(187, inView, 1400);
  const success = useCountUp(973, inView, 1500); // /10 → 97.3

  return (
    <div
      ref={ref}
      className="w-full overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl shadow-violet-100/40"
    >
      {/* Window chrome */}
      <div className="flex items-center gap-1.5 border-b border-gray-100 px-4 py-3">
        <span className="h-3 w-3 rounded-full bg-red-400" />
        <span className="h-3 w-3 rounded-full bg-amber-400" />
        <span className="h-3 w-3 rounded-full bg-emerald-400" />
      </div>

      <div className="p-5 space-y-3">
        {/* Stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
              <DollarSign className="h-3.5 w-3.5" /> Total Revenue
            </div>
            <div className="text-[22px] font-bold text-gray-900 tracking-tight leading-none mb-2">
              ${revenue.toLocaleString()}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-violet-600 font-medium">
                ↗ +12.5% vs last period
              </span>
              <Sparkline d={SPARKLINE_D.revenue} inView={inView} />
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
              <Users className="h-3.5 w-3.5" /> Active Subscribers
            </div>
            <div className="text-[22px] font-bold text-gray-900 tracking-tight leading-none mb-2">
              {subscribers}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">Across 4 plans</span>
              <Sparkline d={SPARKLINE_D.subscribers} inView={inView} />
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3.5">
            <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-2">
              <CheckCircle className="h-3.5 w-3.5" /> Success Rate
            </div>
            <div className="text-[22px] font-bold text-gray-900 tracking-tight leading-none mb-2">
              {(success / 10).toFixed(1)}%
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-violet-600 font-medium">
                ↗ Payment success
              </span>
              <Sparkline d={SPARKLINE_D.success} inView={inView} />
            </div>
          </div>
        </div>

        {/* Chart + Activity */}
        <div className="grid grid-cols-[1.15fr_0.85fr] gap-3">
          <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3.5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-800">
                Revenue vs MRR
              </span>
              <div className="flex items-center gap-3 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-violet-500 inline-block" />
                  Revenue
                </span>
                <span className="flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-gray-300 inline-block" />
                  MRR
                </span>
              </div>
            </div>
            <div className="flex gap-2">
              <div className="flex flex-col justify-between text-[10px] text-gray-300 pb-5 shrink-0">
                <span>$34k</span>
                <span>$26k</span>
                <span>$17k</span>
                <span>$0</span>
              </div>
              <div className="flex-1 min-w-0">
                <div style={{ height: 130 }}>
                  <RevenueChart inView={inView} />
                </div>
                <div className="flex justify-between text-[10px] text-gray-300 mt-1">
                  {["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul"].map(
                    (m) => (
                      <span key={m}>{m}</span>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3.5">
            <div className="text-sm font-semibold text-gray-800 mb-3">
              Recent Activity
            </div>
            <div className="space-y-2.5">
              {ACTIVITY.map((item, i) => {
                const Icon = item.icon;
                return (
                  <div
                    key={i}
                    className="flex items-center gap-2"
                    style={{
                      opacity: inView ? 1 : 0,
                      transform: inView ? "translateY(0)" : "translateY(8px)",
                      transition: inView
                        ? `opacity 0.4s ease ${0.3 + i * 0.07}s, transform 0.4s ease ${0.3 + i * 0.07}s`
                        : "none",
                    }}
                  >
                    <div
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${item.color}`}
                    >
                      <Icon className="h-3 w-3" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-gray-800 truncate">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-gray-400 truncate">
                        {item.sub}
                      </div>
                    </div>
                    {item.amount && (
                      <span className="text-xs font-semibold text-gray-700 shrink-0">
                        {item.amount}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
