import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
  LayoutDashboard,
  FileText,
  Users,
  BarChart3,
  Settings,
  ScrollText,
  Search,
  Wallet,
  Copy,
  Check,
  ChevronDown,
  LogOut,
  HelpCircle,
  X,
  BookOpen,
  ExternalLink,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import WalletIdenticon from "@/components/WalletIdenticon";
import { CLUSTER } from "@/lib/config";

const mainNav = [
  { title: "Dashboard", path: "/", icon: LayoutDashboard },
  { title: "Plans", path: "/plans", icon: FileText },
  { title: "Subscribers", path: "/subscribers", icon: Users },
];

const managementNav = [
  { title: "Analytics", path: "/analytics", icon: BarChart3 },
  { title: "Execution Logs", path: "/logs", icon: ScrollText },
  { title: "Settings", path: "/settings", icon: Settings },
];

const breadcrumbs: Record<string, string> = {
  "/": "Overview",
  "/plans": "Plans",
  "/subscribers": "Subscribers",
  "/analytics": "Analytics",
  "/logs": "Execution Logs",
  "/settings": "Settings",
};

function truncateWallet(addr: string) {
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const location = useLocation();
  const [copied, setCopied] = useState(false);
  const [showSupport, setShowSupport] = useState(true);

  const { publicKey, disconnect, connected } = useWallet();
  const { setVisible } = useWalletModal();

  const walletAddress = publicKey?.toBase58() ?? "";

  const copyWallet = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const crumb = breadcrumbs[location.pathname] || "Overview";

  const NavItem = ({ item }: { item: (typeof mainNav)[0] }) => {
    const active = location.pathname === item.path;
    return (
      <Link
        to={item.path}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          active
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <item.icon className="h-4 w-4" />
        {item.title}
      </Link>
    );
  };

  return (
    <div className="flex min-h-screen w-full">
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r bg-card">
        <div className="flex h-14 items-center gap-2.5 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground text-sm font-bold">
            S
          </div>
          <span className="text-lg font-semibold text-foreground">Recuro</span>
        </div>

        <div className="px-4 pb-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search"
              className="pl-9 h-9 text-sm bg-muted border-0"
            />
            <kbd className="absolute right-2.5 top-2 pointer-events-none text-xs text-muted-foreground bg-background border rounded px-1.5 py-0.5">
              ⌘K
            </kbd>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pt-2 space-y-4">
          <div>
            <p className="px-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Main menu
            </p>
            <div className="space-y-0.5">
              {mainNav.map((item) => (
                <NavItem key={item.path} item={item} />
              ))}
            </div>
          </div>
          <div>
            <p className="px-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Management
            </p>
            <div className="space-y-0.5">
              {managementNav.map((item) => (
                <NavItem key={item.path} item={item} />
              ))}
            </div>
          </div>
          <div>
            <p className="px-3 pb-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Resources
            </p>
            <div className="space-y-0.5">
              <a
                href="https://recuro.gitbook.io"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                Documentation
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
              <a
                href="https://github.com/AlexNaskida/recuro-sdk"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                <BookOpen className="h-4 w-4" />
                GitHub
                <ExternalLink className="h-3 w-3 ml-auto" />
              </a>
            </div>
          </div>
        </nav>

        <div className="border-t p-3 space-y-2">
          {showSupport && (
            <div className="rounded-xl bg-muted p-3 relative">
              <button
                onClick={() => setShowSupport(false)}
                className="absolute top-2 right-2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
              <div className="flex items-center gap-2 mb-1">
                <HelpCircle className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Need support</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Contact our team for help.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs h-7"
              >
                Contact support
              </Button>
            </div>
          )}
          <Link
            to="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          {connected && (
            <button
              onClick={disconnect}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
            >
              <LogOut className="h-4 w-4" />
              Disconnect Wallet
            </button>
          )}
        </div>
      </aside>

      <div className="flex flex-1 flex-col pl-60">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-card px-6">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Dashboard</span>
            <span className="text-muted-foreground">/</span>
            <span className="font-semibold text-foreground">{crumb}</span>
          </div>

          {connected && walletAddress ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors">
                  <WalletIdenticon
                    address={walletAddress}
                    size={32}
                    className="border-2 border-muted"
                  />
                  <span className="text-sm font-medium">
                    {truncateWallet(walletAddress)}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    {walletAddress}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={copyWallet}>
                  {copied ? (
                    <Check className="mr-2 h-4 w-4" />
                  ) : (
                    <Copy className="mr-2 h-4 w-4" />
                  )}
                  {copied ? "Copied!" : "Copy Address"}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Badge
                    className={cn(
                      "text-xs",
                      CLUSTER === "mainnet-beta"
                        ? "bg-primary/20 text-primary border-primary/30"
                        : "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
                    )}
                    variant="outline"
                  >
                    {CLUSTER === "mainnet-beta" ? "Mainnet" : "Devnet"}
                  </Badge>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={disconnect}
                  className="text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Disconnect
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" onClick={() => setVisible(true)}>
                  <Wallet className="mr-2 h-4 w-4" />
                  Connect Wallet
                </Button>
              </TooltipTrigger>
              <TooltipContent>Connect Phantom or Solflare</TooltipContent>
            </Tooltip>
          )}
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
