import { NavLink, Outlet } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useAnchorWallet, useConnection } from "@solana/wallet-adapter-react";
import { LayoutGrid, CreditCard, History, Settings, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/",               icon: LayoutGrid, label: "Browse Plans"       },
  { to: "/subscriptions",  icon: CreditCard, label: "My Subscriptions"   },
  { to: "/history",        icon: History,    label: "Payment History"     },
] as const;

export function Shell() {
  const wallet = useAnchorWallet();

  return (
    <div className="flex min-h-screen bg-[hsl(var(--background))]">
      {/* Sidebar */}
      <aside className="w-56 shrink-0 flex flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))]">
        {/* Brand */}
        <div className="flex items-center gap-2.5 px-5 py-5 border-b border-[hsl(var(--border))]">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--primary))]">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none" style={{ fontFamily: "var(--font-display)" }}>
              SubFlow
            </p>
            <p className="text-[11px] text-[hsl(var(--muted-foreground))] mt-0.5">Subscriber</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-0.5 p-3 flex-1">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-[hsl(var(--primary)/0.12)] text-[hsl(var(--primary))] border border-[hsl(var(--primary)/0.2)]"
                    : "text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Wallet */}
        <div className="border-t border-[hsl(var(--border))] p-3">
          {wallet && (
            <div className="mb-2 px-2">
              <p className="text-[10px] text-[hsl(var(--muted-foreground))] uppercase tracking-wider mb-0.5">Connected</p>
              <p className="text-xs font-mono text-[hsl(var(--foreground))] truncate">
                {wallet.publicKey.toBase58().slice(0, 16)}…
              </p>
            </div>
          )}
          <WalletMultiButton style={{ width: "100%", justifyContent: "center", fontSize: "13px" }} />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
