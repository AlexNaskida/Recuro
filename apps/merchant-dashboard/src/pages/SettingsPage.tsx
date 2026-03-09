import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Copy, Check } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

const TREASURY = "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU";

function truncateWallet(addr: string) {
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export default function SettingsPage() {
  const [paused, setPaused] = useState(false);
  const [copied, setCopied] = useState(false);

  const copyAddr = () => {
    navigator.clipboard.writeText(TREASURY);
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
          <CardDescription>Where subscription payments are deposited.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Label className="text-muted-foreground text-sm">Address</Label>
            <Tooltip>
              <TooltipTrigger asChild>
                <button onClick={copyAddr} className="flex items-center gap-1.5 font-mono text-sm hover:text-foreground text-muted-foreground transition-colors">
                  {truncateWallet(TREASURY)}
                  {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                </button>
              </TooltipTrigger>
              <TooltipContent>{copied ? "Copied!" : "Copy address"}</TooltipContent>
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
          <CardDescription>Fee charged per successful payment execution.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Label className="text-muted-foreground text-sm">Current Fee</Label>
            <span className="text-sm font-medium">0.5%</span>
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
              <p className="text-xs text-muted-foreground mt-0.5">Existing subscribers will not be affected.</p>
            </div>
            <Switch checked={paused} onCheckedChange={togglePause} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
