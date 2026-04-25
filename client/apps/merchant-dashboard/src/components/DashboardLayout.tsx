import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
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
  MoonStar,
  SunMedium,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
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
import OnboardingModal from "@/components/OnboardingModal";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useMerchantWallet } from "@/hooks/useMerchantWallet";

const mainNav = [
  { title: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { title: "Plans", path: "/plans", icon: FileText },
  { title: "Subscribers", path: "/subscribers", icon: Users },
];

const managementNav = [
  { title: "Analytics", path: "/analytics", icon: BarChart3 },
  { title: "Execution Logs", path: "/logs", icon: ScrollText },
  { title: "Settings", path: "/settings", icon: Settings },
];

const breadcrumbs: Record<string, string> = {
  "/dashboard": "Overview",
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
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [showSupport, setShowSupport] = useState(true);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const { showOnboarding, mounted, completeOnboarding } = useOnboarding();

  const {
    authenticated,
    connected,
    publicKey,
    walletAddress,
    connectWallet,
    logout,
  } = useMerchantWallet();

  // Show onboarding modal when user first connects wallet
  useEffect(() => {
    if (mounted && connected && showOnboarding) {
      setOnboardingOpen(true);
    }
  }, [mounted, connected, showOnboarding]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen(true);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const walletAddressValue = walletAddress || publicKey?.toBase58() || "";

  const handleDisconnect = () => {
    Promise.resolve(logout()).finally(() => {
      navigate("/", { replace: true });
    });
  };

  const copyWallet = () => {
    if (!walletAddressValue) return;
    navigator.clipboard.writeText(walletAddressValue);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const crumb = breadcrumbs[location.pathname] || "Overview";
  const isDarkTheme = resolvedTheme === "dark";
  const searchActions = [
    { label: "Dashboard", href: "/dashboard", shortcut: "1" },
    { label: "Plans", href: "/plans", shortcut: "2" },
    { label: "Subscribers", href: "/subscribers", shortcut: "3" },
    { label: "Analytics", href: "/analytics", shortcut: "4" },
    { label: "Execution Logs", href: "/logs", shortcut: "5" },
    { label: "Settings", href: "/settings", shortcut: "6" },
  ];

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
      <OnboardingModal
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        onComplete={completeOnboarding}
      />
      <CommandDialog open={commandOpen} onOpenChange={setCommandOpen}>
        <CommandInput placeholder="Search pages or jump to a section" />
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Navigation">
            {searchActions.map((item) => (
              <CommandItem
                key={item.href}
                onSelect={() => {
                  navigate(item.href);
                  setCommandOpen(false);
                }}
              >
                {item.label}
                <CommandShortcut>{item.shortcut}</CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Actions">
            <CommandItem
              onSelect={() => {
                connectWallet();
                setCommandOpen(false);
              }}
            >
              Connect Wallet
            </CommandItem>
            <CommandItem
              onSelect={() => {
                setTheme(isDarkTheme ? "light" : "dark");
                setCommandOpen(false);
              }}
            >
              Toggle Theme
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
      <aside className="fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r bg-card">
        <div className="flex h-14 items-center gap-2.5 px-5">
          <img
            src="/favicon.svg"
            alt="Recuro logo"
            className="h-8 w-8 shrink-0"
          />
          <span className="inline-flex items-baseline text-lg font-semibold leading-none text-foreground">
            Recur<span className="-ml-[0.02em] text-primary">o</span>
          </span>
        </div>

        <div className="px-4 pb-2">
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="relative flex h-9 w-full items-center rounded-md border bg-muted px-3 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <span className="text-xs pl-6">Search or jump to...</span>
            <kbd className="pointer-events-none ml-auto rounded border bg-background px-1.5 py-0.5 text-xs text-muted-foreground">
              ⌘K
            </kbd>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 pt-2">
          <div className="flex min-h-full flex-col">
            <div className="space-y-4">
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
            </div>

            <div className="mt-auto -mx-3 border-t border-border px-3 pt-4 pb-2">
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
          {!showSupport && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setTheme(isDarkTheme ? "light" : "dark")}
              className="w-full justify-start gap-3 px-3 text-sm text-muted-foreground hover:text-foreground"
            >
              {isDarkTheme ? (
                <SunMedium className="h-4 w-4" />
              ) : (
                <MoonStar className="h-4 w-4" />
              )}
              {isDarkTheme ? "Light mode" : "Dark mode"}
            </Button>
          )}
          <Link
            to="/settings"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          {authenticated && connected && (
            <button
              onClick={handleDisconnect}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-muted hover:text-foreground transition-colors w-full"
            >
              <LogOut className="h-4 w-4" />
              Sign out
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

          {authenticated && connected && walletAddressValue ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted transition-colors">
                  <WalletIdenticon
                    address={walletAddressValue}
                    size={32}
                    className="border-2 border-muted"
                  />
                  <span className="text-sm font-medium">
                    {truncateWallet(walletAddressValue)}
                  </span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    {walletAddressValue}
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
                  onClick={handleDisconnect}
                  className="text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" onClick={() => connectWallet()}>
                  <Wallet className="mr-2 h-4 w-4" />
                  Connect Wallet
                </Button>
              </TooltipTrigger>
              <TooltipContent>Open Privy wallet access</TooltipContent>
            </Tooltip>
          )}
        </header>

        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}
