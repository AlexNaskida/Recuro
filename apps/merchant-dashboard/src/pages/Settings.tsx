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
import { Copy, Check } from "lucide-react";
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
    <div className="max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Treasury</CardTitle>
          <CardDescription>
            Where subscription payments are deposited.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Label className="text-muted-foreground text-sm">Address</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={copyAddr}
                  className="flex items-center gap-1.5 font-mono text-sm hover:text-foreground text-muted-foreground transition-colors"
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
          <div className="flex items-center gap-3">
            <Label className="text-muted-foreground text-sm">Network</Label>
            <Badge variant="outline">Devnet</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Protocol Fees</CardTitle>
          <CardDescription>
            Fee charged per successful payment execution.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Label className="text-muted-foreground text-sm">Current Fee</Label>
            <span className="text-sm font-medium">{feePercent}</span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Customize how the dashboard looks.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Dark Mode</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
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

      <Card>
        <CardHeader>
          <CardTitle>Subscription Controls</CardTitle>
          <CardDescription>Manage incoming subscriptions.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label>Pause New Subscriptions</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                Existing subscribers will not be affected.
              </p>
            </div>
            <Switch checked={paused} onCheckedChange={togglePause} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
