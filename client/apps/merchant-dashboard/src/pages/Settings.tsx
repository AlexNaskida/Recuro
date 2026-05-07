import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import type { PublicKey } from "@solana/web3.js";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Copy,
  Check,
  ShieldCheck,
  Palette,
  PauseCircle,
  Landmark,
  CircleDollarSign,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import { useAnchorProgram } from "@/hooks/useAnchorProgram";
import { getConfigPDA } from "@/lib/pda";

const TREASURY = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";

function truncateWallet(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export default function SettingsPage() {
  const [paused, setPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const [treasuryAddress, setTreasuryAddress] = useState(TREASURY);
  const [feePercent, setFeePercent] = useState("-");
  const { program } = useAnchorProgram();
  const { resolvedTheme, setTheme } = useTheme();

  useEffect(() => {
    let cancelled = false;

    async function fetchProtocolConfig() {
      if (!program) {
        setTreasuryAddress(TREASURY);
        setFeePercent("-");
        return;
      }

      try {
        const configPda = getConfigPDA();
        const protocolConfigClient = (
          program.account as {
            protocolConfig?: {
              fetch: (
                pubkey: PublicKey,
              ) => Promise<{ feeBps: number; treasury: PublicKey | string }>;
            };
          }
        ).protocolConfig;

        if (!protocolConfigClient) {
          throw new Error("protocolConfig account client unavailable");
        }

        const cfg = await protocolConfigClient.fetch(configPda);
        if (cancelled) return;

        const treasury =
          typeof cfg.treasury === "string"
            ? cfg.treasury
            : cfg.treasury.toBase58();

        setTreasuryAddress(treasury);
        setFeePercent(`${(cfg.feeBps / 100).toFixed(2)}%`);
      } catch (err) {
        if (!cancelled) {
          console.error("[Settings] failed to fetch protocol config:", err);
          setTreasuryAddress(TREASURY);
          setFeePercent("-");
        }
      }
    }

    fetchProtocolConfig();

    return () => {
      cancelled = true;
    };
  }, [program]);

  const copyAddr = () => {
    navigator.clipboard.writeText(treasuryAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const togglePause = (val: boolean) => {
    setPaused(val);
    toast.success(val ? "New subscriptions paused" : "Subscriptions resumed");
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/70 bg-[linear-gradient(130deg,hsl(var(--card))_0%,hsl(var(--muted)/0.25)_100%)]">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Settings & Controls
          </CardTitle>
          <CardDescription>
            Configure treasury details, protocol behavior, and dashboard
            preferences.
          </CardDescription>
        </CardHeader>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Landmark className="h-4 w-4 text-primary" />
              Treasury
            </CardTitle>
            <CardDescription>Destination for merchant payouts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Address</p>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={copyAddr}
                    className="mt-1 flex items-center gap-1.5 font-mono text-sm text-foreground hover:text-primary transition-colors"
                  >
                    {truncateWallet(treasuryAddress)}
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {copied ? "Copied!" : "Copy address"}
                </TooltipContent>
              </Tooltip>
            </div>
            <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-2">
              <Label className="text-sm text-muted-foreground">Network</Label>
              <Badge variant="outline">Devnet</Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDollarSign className="h-4 w-4 text-primary" />
              Protocol Fees
            </CardTitle>
            <CardDescription>
              Current fee configuration for successful charges.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="text-xs text-muted-foreground">Current fee</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {feePercent}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Palette className="h-4 w-4 text-primary" />
            Appearance
          </CardTitle>
          <CardDescription>Choose how your workspace feels.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-3">
            <div>
              <Label>Dark Mode</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Switch between light and dark theme.
              </p>
            </div>
            <Switch
              checked={resolvedTheme === "dark"}
              onCheckedChange={(val) => setTheme(val ? "dark" : "light")}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/70">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <PauseCircle className="h-4 w-4 text-primary" />
            Subscription Controls
          </CardTitle>
          <CardDescription>Manage incoming subscriptions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between rounded-lg border bg-muted/20 px-3 py-3">
            <div>
              <Label>Pause New Subscriptions</Label>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Existing subscribers will not be affected.
              </p>
            </div>
            <Switch checked={paused} onCheckedChange={togglePause} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>
            Quick answers to common questions about Recuro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            <AccordionItem value="item-1">
              <AccordionTrigger className="text-sm font-medium hover:text-foreground">
                How do subscribers authorize payments?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Subscribers connect their wallet and approve a scoped delegation
                to Recuro's guard program. This is a single transaction that
                explicitly limits what you can charge and when. They retain full
                control and can revoke access anytime.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-2">
              <AccordionTrigger className="text-sm font-medium hover:text-foreground">
                What tokens can I charge in?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Recuro supports USDC, USDT, and PYUSD on Solana. You can choose
                which token to accept when creating a subscription plan.
                Different tokens can be selected for different plans.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-3">
              <AccordionTrigger className="text-sm font-medium hover:text-foreground">
                How are payments executed?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Payments are executed via Recuro's keeper network, which
                monitors active subscriptions and charges on schedule. You can
                also trigger payments manually via the dashboard. Each charge
                appears as an on-chain transaction that's transparent and
                verifiable.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-4">
              <AccordionTrigger className="text-sm font-medium hover:text-foreground">
                Where do my subscriber payments go?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                All payments are deposited directly to your Treasury address
                (the wallet you specify in settings). You have direct custody of
                all funds-Recuro never holds your money. Protocol fees are
                deducted automatically and sent to the treasury address.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-5">
              <AccordionTrigger className="text-sm font-medium hover:text-foreground">
                Can I modify a subscription plan after creation?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                Yes. You can update plan details, pause new subscriptions to
                that plan, or disable it entirely. Existing subscribers won't be
                affected by plan changes unless you modify their individual
                subscription settings.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-6">
              <AccordionTrigger className="text-sm font-medium hover:text-foreground">
                What happens if a payment fails?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                If a payment fails (e.g., insufficient subscriber balance),
                Recuro retries automatically according to the retry policy. You
                can view all payment attempts and failures in the Execution Logs
                section, including timestamps and error reasons.
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="item-7">
              <AccordionTrigger className="text-sm font-medium hover:text-foreground">
                Is there a setup fee or hidden costs?
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground">
                No setup fees. You only pay the protocol fee on successful
                payments (shown in Settings). This fee is transparent and
                charged per transaction. You can see the exact fee before
                creating plans.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
