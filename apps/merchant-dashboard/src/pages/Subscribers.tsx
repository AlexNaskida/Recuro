import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Copy, Check, AlertCircle } from "lucide-react";
import WalletIdenticon from "@/components/WalletIdenticon";
import { useSubscribers } from "@/hooks/useSubscribers";

function truncateWallet(addr: string) {
  return addr.slice(0, 4) + "..." + addr.slice(-4);
}

const statusStyles: Record<string, string> = {
  active:    "bg-primary/10 text-primary border-primary/20",
  paused:    "bg-yellow-500/20 text-yellow-600 border-yellow-500/30",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
  expired:   "bg-muted text-muted-foreground",
};

export default function Subscribers() {
  const { connected } = useWallet();
  const { subscribers, loading, usingMock } = useSubscribers();
  const [planFilter, setPlanFilter]     = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [copiedIdx, setCopiedIdx]       = useState<number | null>(null);

  const uniquePlans = [...new Set(subscribers.map((s) => s.plan))];

  const filtered = subscribers.filter((s) => {
    if (planFilter !== "all" && s.plan !== planFilter) return false;
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });

  const copyWallet = (wallet: string, idx: number) => {
    navigator.clipboard.writeText(wallet);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div className="space-y-4">
      {usingMock && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {connected
              ? "No on-chain subscribers found. Showing demo data."
              : "Connect wallet to see real subscriber data."}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3">
        <Select value={planFilter} onValueChange={setPlanFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Plans" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            {uniquePlans.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-40"><SelectValue placeholder="All Statuses" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
            <SelectItem value="expired">Expired</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Wallet</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Last Payment</TableHead>
              <TableHead className="text-right">Total Paid</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.map((sub, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button onClick={() => copyWallet(sub.wallet, i)} className="flex items-center gap-2 font-mono text-xs hover:text-foreground text-muted-foreground transition-colors">
                        <WalletIdenticon address={sub.wallet} size={24} />
                        {truncateWallet(sub.wallet)}
                        {copiedIdx === i ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>{copiedIdx === i ? "Copied!" : "Copy address"}</TooltipContent>
                  </Tooltip>
                </TableCell>
                <TableCell className="text-sm">{sub.plan}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusStyles[sub.status] ?? ""}>
                    {sub.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">{sub.started}</TableCell>
                <TableCell className="text-sm text-muted-foreground">{sub.lastPayment}</TableCell>
                <TableCell className="text-right font-medium">${sub.totalPaid.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
