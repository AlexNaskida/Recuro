import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMerchantWallet } from "@/hooks/useMerchantWallet";
import {
  Wallet,
  ArrowRight,
  RefreshCw,
  ShieldCheck,
  Zap,
  BarChart3,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Wallet,
    title: "Wallet login",
    desc: "Connect with Phantom, Solflare, or a Privy embedded wallet. No passwords.",
  },
  {
    icon: Zap,
    title: "Instant access",
    desc: "Your on-chain merchant account loads automatically once verified.",
  },
  {
    icon: BarChart3,
    title: "Full dashboard",
    desc: "Manage subscription plans, subscribers, revenue, and execution logs.",
  },
];

export default function AuthPage() {
  const navigate = useNavigate();
  const { authenticated, connected, login } = useMerchantWallet();
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    if (authenticated && connected) {
      navigate("/dashboard", { replace: true });
    }
  }, [authenticated, connected, navigate]);

  // Reset spinner if user dismisses the modal without connecting
  useEffect(() => {
    if (!authenticated) {
      setIsConnecting(false);
    }
  }, [authenticated]);

  function handleConnect() {
    setIsConnecting(true);

    // Do NOT await — Privy's modal is fire-and-forget.
    // Navigation is handled by the useEffect above watching authenticated + connected.
    // If the modal is dismissed or errors, reset the spinner.
    try {
      void login();
    } catch (err) {
      console.error("[AuthPage] login failed:", err);
      setIsConnecting(false);
    }

    // Safety timeout — reset spinner if nothing happens after 15s
    const timeout = setTimeout(() => setIsConnecting(false), 15_000);
    return () => clearTimeout(timeout);
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top nav */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-border/50">
        <span className="text-base font-semibold tracking-tight text-foreground">
          Recuro
        </span>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-3.5 w-3.5 text-primary" />
          Merchant portal
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 items-center justify-center px-4 py-16">
        <div className="w-full max-w-4xl grid lg:grid-cols-2 gap-12 items-center">
          {/* Left — copy */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
                <ShieldCheck className="h-3 w-3" />
                Wallet-gated access
              </div>
              <h1 className="text-4xl font-bold tracking-tight text-foreground leading-tight">
                Your recurring revenue,
                <br />
                <span className="text-primary">on-chain.</span>
              </h1>
              <p className="text-base text-muted-foreground leading-relaxed max-w-md">
                Recuro is a non-custodial subscription protocol on Solana.
                Connect your wallet to open the protected merchant dashboard.
              </p>
            </div>

            <div className="space-y-4">
              {FEATURES.map(({ icon: Icon, title, desc }) => (
                <div key={title} className="flex items-start gap-4">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      {title}
                    </p>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-0.5">
                      {desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — auth card */}
          <div className="rounded-2xl border border-border bg-card shadow-xl shadow-black/5 p-8 space-y-7">
            <div className="space-y-1.5">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary mb-4">
                <Wallet className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">
                Connect to continue
              </h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Connecting your wallet gives Recuro a way to identify your
                merchant account — no email or password needed.
              </p>
            </div>

            <ol className="space-y-3">
              {[
                {
                  n: 1,
                  label:
                    "Connect your Solana wallet or use a Privy embedded wallet",
                },
                {
                  n: 2,
                  label: "Recuro verifies your on-chain merchant account",
                },
                { n: 3, label: "Your protected dashboard opens automatically" },
              ].map((s) => (
                <li key={s.n} className="flex items-start gap-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-foreground mt-0.5">
                    {s.n}
                  </span>
                  <span className="text-muted-foreground leading-relaxed">
                    {s.label}
                  </span>
                </li>
              ))}
            </ol>

            <div className="border-t border-border" />

            <div className="space-y-3">
              <Button
                size="lg"
                className="w-full text-base h-12"
                onClick={handleConnect}
                disabled={isConnecting}
              >
                {isConnecting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Waiting for wallet…
                  </>
                ) : (
                  <>
                    <Wallet className="h-4 w-4" />
                    Connect wallet
                    <ArrowRight className="h-4 w-4 ml-auto" />
                  </>
                )}
              </Button>

              {isConnecting && (
                <p className="text-center text-xs text-muted-foreground">
                  Check for a wallet popup or modal window
                </p>
              )}

              {!isConnecting && (
                <p className="text-center text-xs text-muted-foreground">
                  Non-custodial · No custody transfer · Your keys stay yours
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
