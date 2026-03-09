import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Plus,
  MoreVertical,
  Loader2,
  Users,
  DollarSign,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { usePlans } from "@/hooks/usePlans";
import { useCreatePlan } from "@/hooks/useCreatePlan";

export default function Plans() {
  const { connected } = useWallet();
  const { plans, loading, usingMock, refetch } = usePlans();
  const { createPlan, loading: deploying, canCreate } = useCreatePlan();
  const [open, setOpen] = useState(false);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [interval, setInterval] = useState("monthly");
  const [trialDays, setTrialDays] = useState("0");
  const [maxSubs, setMaxSubs] = useState("0");

  const intervalToDays: Record<string, number> = {
    weekly: 7,
    monthly: 30,
    quarterly: 91,
    yearly: 365,
  };

  const handleDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canCreate) {
      toast.error("Connect wallet first and ensure program is deployed");
      return;
    }
    try {
      const sig = await createPlan({
        name,
        description,
        amountUsdc: parseFloat(price),
        intervalDays: intervalToDays[interval] ?? 30,
        trialDays: parseInt(trialDays) || 0,
        maxSubscribers: parseInt(maxSubs) || 0,
      });
      toast.success("Plan deployed!", {
        description: `Tx: ${sig?.slice(0, 8)}...`,
      });
      setOpen(false);
      setName("");
      setDescription("");
      setPrice("");
      setInterval("monthly");
      refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Deploy failed", { description: message });
    }
  };

  const statusStyle = (s: string) =>
    s === "active"
      ? "bg-primary/10 text-primary border-primary/20"
      : s === "paused"
        ? "bg-warning/10 text-warning border-warning/20"
        : "bg-destructive/10 text-destructive border-destructive/20";

  return (
    <div className="space-y-6">
      {/* Mock data banner */}
      {usingMock && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {connected
              ? "No on-chain plans found. Deploy your first plan to see real data."
              : "Connect your wallet to see your on-chain plans. Showing demo data."}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <div />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Plan
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Plan</DialogTitle>
            </DialogHeader>
            {!connected && (
              <Alert className="mb-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Connect wallet to deploy on-chain.
                </AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleDeploy} className="space-y-4">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input
                  placeholder="e.g. Pro Monthly"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  placeholder="Optional description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Price (USDC)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder="29.99"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Interval</Label>
                  <Select value={interval} onValueChange={setInterval}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                      <SelectItem value="quarterly">Quarterly</SelectItem>
                      <SelectItem value="yearly">Yearly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Trial Days</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={trialDays}
                    onChange={(e) => setTrialDays(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max Subscribers (0 = unlimited)</Label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={maxSubs}
                    onChange={(e) => setMaxSubs(e.target.value)}
                  />
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={deploying}>
                {deploying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {deploying
                  ? "Waiting for wallet..."
                  : connected
                    ? "Deploy Plan On-Chain"
                    : "Connect Wallet to Deploy"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card key={plan.id}>
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div>
                  <CardTitle className="text-base">{plan.name}</CardTitle>
                  <p className="text-2xl font-bold mt-1">
                    ${plan.price}
                    <span className="text-sm font-normal text-muted-foreground">
                      /{plan.interval.replace("ly", "")}
                    </span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={statusStyle(plan.status)}>
                    {plan.status}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => toast.info("Edit coming soon")}
                      >
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => toast.info("Pause coming soon")}
                      >
                        Pause
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => toast.info("Archive coming soon")}
                        className="text-destructive"
                      >
                        Archive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {plan.description && (
                  <p className="text-xs text-muted-foreground">
                    {plan.description}
                  </p>
                )}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" />
                    {plan.subscribers}
                  </span>
                  <span className="flex items-center gap-1">
                    <DollarSign className="h-3.5 w-3.5" />$
                    {plan.revenue.toLocaleString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
