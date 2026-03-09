import { Routes, Route, Navigate } from "react-router-dom";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Zap, BarChart3, Shield, Repeat } from "lucide-react";
import { Shell } from "@/components/layout/Shell";
import {
  OverviewPage, PlansPage, CreatePlanPage,
  AnalyticsPage, LogsPage, SettingsPage,
} from "@/pages/index";

// ── Landing (unauthenticated) ───────────────────────────────────────────────
function Landing() {
  const features = [
    { icon: Shield,   title: "Non-custodial",   body: "Funds stay in the subscriber's wallet. No escrow, no counterparty risk." },
    { icon: Repeat,   title: "Fully automated", body: "Clockwork threads execute payments on-chain — no backend required."      },
    { icon: BarChart3, title: "Real-time analytics", body: "On-chain event listeners power live revenue dashboards."            },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 py-20">
      {/* Hero */}
      <div className="text-center max-w-2xl mx-auto mb-16 space-y-6">
        <div className="inline-flex items-center gap-2 rounded-full border border-brand-500/30 bg-brand-500/10 px-4 py-1.5 text-sm text-brand-400">
          <Zap className="h-3.5 w-3.5" />
          Powered by Solana + Clockwork
        </div>
        <h1 className="text-5xl font-bold leading-tight">
          Subscription revenue,{" "}
          <span className="text-gradient">on-chain.</span>
        </h1>
        <p className="text-lg text-muted-foreground">
          Deploy subscription plans as Solana PDAs. Automate recurring USDC billing.
          Keep full custody of your revenue from day one.
        </p>
        <WalletMultiButton />
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl w-full">
        {features.map(({ icon: Icon, title, body }) => (
          <div
            key={title}
            className="rounded-xl border border-surface-4 bg-surface-2 p-6 space-y-3"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-500/15">
              <Icon className="h-5 w-5 text-brand-400" />
            </div>
            <h3 className="font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Root App ────────────────────────────────────────────────────────────────
export default function App() {
  const wallet = useAnchorWallet();

  if (!wallet) return <Landing />;

  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index            element={<OverviewPage   />} />
        <Route path="plans"     element={<PlansPage      />} />
        <Route path="create"    element={<CreatePlanPage />} />
        <Route path="analytics" element={<AnalyticsPage  />} />
        <Route path="logs"      element={<LogsPage       />} />
        <Route path="settings"  element={<SettingsPage   />} />
        <Route path="*"         element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
