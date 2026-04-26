import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Zap } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Explore" },
  { to: "/demo", label: "Demo" },
  { to: "/subscriptions", label: "My Subscriptions" },
] as const;

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-background/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
            <Zap className="h-5 w-5 font-bold" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground">
            Merchant
          </span>
          {/* <span className="hidden sm:block rounded-full border border-primary/25 bg-primary/10 px-2.5 py-1 text-[11px] font-semibold text-primary uppercase tracking-wider">
            Devnet
          </span> */}
        </div>

        {/* Nav */}
        <nav className="hidden sm:flex gap-0.5">
          {NAV.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end
              className={({ isActive }) =>
                cn(
                  "rounded-lg px-4 py-2 text-sm font-semibold transition-all",
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted",
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
