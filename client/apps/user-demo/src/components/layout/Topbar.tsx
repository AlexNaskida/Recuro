import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { Zap } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Explore" },
  { to: "/subscriptions", label: "My Subscriptions" },
] as const;

export function Topbar() {
  return (
    <header className="sticky top-0 z-30 border-b border-netflix-gray bg-netflix-black shadow-2xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-netflix-red">
            <Zap className="h-5 w-5 text-white font-bold" />
          </div>
          <span className="text-2xl font-black tracking-tighter text-white">
            Netflix
          </span>
          <span className="hidden sm:block rounded-full border border-netflix-red/40 bg-netflix-red/10 px-2.5 py-1 text-[11px] font-bold text-netflix-red uppercase tracking-wider">
            Devnet
          </span>
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
                    ? "bg-netflix-red/20 text-netflix-red"
                    : "text-gray-300 hover:text-white hover:bg-netflix-darkGray/50",
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
