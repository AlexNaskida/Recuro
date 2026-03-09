import { NavLink, Outlet } from "react-router-dom";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import {
  BarChart3, Bell, BookOpen, Home, LayoutGrid,
  PlusCircle, Settings, Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAnalyticsStore } from "@/store/analyticsStore";
import { useRealtimeEvents } from "@/hooks/useRealtimeEvents";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/toaster";

const NAV_ITEMS = [
  { to: "/",           icon: Home,        label: "Overview"   },
  { to: "/plans",      icon: LayoutGrid,  label: "Plans"      },
  { to: "/create",     icon: PlusCircle,  label: "New Plan"   },
  { to: "/analytics",  icon: BarChart3,   label: "Analytics"  },
  { to: "/logs",       icon: BookOpen,    label: "Exec Logs"  },
] as const;

export function Shell() {
  // Start real-time event listeners
  useRealtimeEvents();

  const wallet     = useAnchorWallet();
  const unread     = useAnalyticsStore((s) => s.unreadCount);
  const clearUnread = useAnalyticsStore((s) => s.clearUnread);

  return (
    <div className="flex min-h-screen bg-surface-1">
      {/* ── Sidebar ─────────────────────────────────────────────────── */}
      <aside className="w-60 shrink-0 flex flex-col border-r border-surface-4 bg-surface-2">
        {/* Brand */}
        <div className="flex items-center gap-3 px-5 py-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-brand">
            <Zap className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-none">SubFlow</p>
            <p className="text-xs text-muted-foreground mt-0.5">Merchant</p>
          </div>
        </div>

        <Separator />

        {/* Nav */}
        <nav className="flex flex-col gap-1 p-3 flex-1">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-brand-500/10 text-brand-400 border border-brand-500/20"
                    : "text-muted-foreground hover:bg-surface-3 hover:text-foreground"
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}

          <Separator className="my-2" />

          <NavLink
            to="/settings"
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-brand-500/10 text-brand-400"
                  : "text-muted-foreground hover:bg-surface-3 hover:text-foreground"
              )
            }
          >
            <Settings className="h-4 w-4 shrink-0" />
            Settings
          </NavLink>
        </nav>

        {/* Wallet */}
        <div className="border-t border-surface-4 p-3">
          <WalletMultiButton />
        </div>
      </aside>

      {/* ── Main ────────────────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col min-w-0">
        {/* Topbar */}
        <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-surface-4 bg-surface-2/80 px-6 backdrop-blur-sm">
          {/* Left: connection status */}
          <div className="flex items-center gap-2">
            <div className={cn(
              "h-2 w-2 rounded-full",
              wallet ? "bg-emerald-500 animate-pulse" : "bg-surface-4"
            )} />
            <span className="text-xs text-muted-foreground">
              {wallet ? "Connected" : "Wallet disconnected"}
            </span>
          </div>

          {/* Right: notifications */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="relative flex items-center justify-center h-8 w-8 rounded-lg hover:bg-surface-3 transition-colors"
                onClick={clearUnread}
              >
                <Bell className="h-4 w-4 text-muted-foreground" />
                {unread > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-500 text-[10px] font-bold text-white">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {unread > 0 ? `${unread} new on-chain events` : "No new events"}
            </TooltipContent>
          </Tooltip>
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
