import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Zap } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/",             label: "Explore"       },
  { to: "/subscriptions", label: "My Subscriptions" },
] as const;

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-surface-4 bg-surface-1/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold tracking-tight">Netflix</span>
          <span className="rounded-full border border-brand-500/30 bg-brand-500/10 px-2 py-0.5 text-[10px] font-medium text-brand-400">
            Devnet
          </span>
        </div>

        {/* Nav */}
        <nav className="hidden sm:flex gap-1">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-500/10 text-brand-400"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface-3"
                )
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Wallet */}
        <WalletMultiButton />
      </div>
    </header>
  );
}
