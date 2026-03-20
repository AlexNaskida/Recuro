import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  CalendarDays,
  Clock3,
  Landmark,
  UserRound,
  Wallet,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Plan } from "@/hooks/usePlans";

type PlanInfoDialogProps = {
  plan: Plan | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function formatDate(ts: number): string {
  if (!ts) return "-";
  return new Date(ts).toLocaleString();
}

function statusClass(status: Plan["status"]): string {
  if (status === "active")
    return "bg-primary/10 text-primary border-primary/20";
  if (status === "paused")
    return "bg-yellow-500/10 text-yellow-700 border-yellow-500/20";
  return "bg-muted text-muted-foreground border-border";
}

function intervalToMonths(interval: string): number {
  if (interval === "weekly") return 0.23;
  if (interval === "monthly") return 1;
  if (interval === "quarterly") return 3;
  if (interval === "yearly") return 12;
  return 1;
}

export function PlanInfoDialog({
  plan,
  open,
  onOpenChange,
}: PlanInfoDialogProps) {
  const months = plan ? intervalToMonths(plan.interval) : 1;
  const monthlyEquivalent = plan ? plan.price / months : 0;
  const annualRunRate = monthlyEquivalent * 12 * (plan?.subscribers ?? 0);
  const netIncome = (plan?.revenue ?? 0) - (plan?.feePaid ?? 0);

  const chartData = [
    { label: "Revenue", value: plan?.revenue ?? 0 },
    { label: "Fees", value: plan?.feePaid ?? 0 },
    { label: "Net", value: netIncome },
    { label: "Subs", value: plan?.subscribers ?? 0 },
    { label: "Payments", value: plan?.successfulPayments ?? 0 },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Plan Info</DialogTitle>
          <DialogDescription>
            {plan
              ? "Detailed plan metadata, financials, and quick analytics."
              : "No plan selected."}
          </DialogDescription>
        </DialogHeader>

        {plan && (
          <Tabs defaultValue="overview" className="w-full">
            <TabsList>
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
              <TabsTrigger value="raw">Raw</TabsTrigger>
            </TabsList>

            <TabsContent
              value="overview"
              className="space-y-4 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">{plan.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {plan.description || "No description"}
                  </p>
                </div>
                <Badge variant="outline" className={statusClass(plan.status)}>
                  {plan.status}
                </Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground">
                      Price
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold">
                    ${plan.price.toFixed(2)}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground">
                      Subscribers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold">
                    {plan.subscribers}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground">
                      Revenue
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold">
                    ${plan.revenue.toLocaleString()}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-xs text-muted-foreground">
                      Net Income
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="text-xl font-semibold">
                    ${netIncome.toLocaleString()}
                  </CardContent>
                </Card>
              </div>

              <Separator />

              <div className="grid gap-2 text-sm sm:grid-cols-2">
                <div className="flex items-center justify-between rounded-md border p-2.5">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Clock3 className="h-3.5 w-3.5" />
                    Interval
                  </span>
                  <span className="font-medium capitalize">
                    {plan.interval}
                    {plan.intervalSeconds > 0
                      ? ` (${plan.intervalSeconds}s)`
                      : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-2.5">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    Created
                  </span>
                  <span className="font-medium">
                    {formatDate(plan.createdAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-2.5">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <UserRound className="h-3.5 w-3.5" />
                    Deployer
                  </span>
                  <span className="font-medium font-mono text-xs break-all text-right max-w-[65%]">
                    {plan.deployer || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-2.5">
                  <span className="text-muted-foreground flex items-center gap-1.5">
                    <Landmark className="h-3.5 w-3.5" />
                    Receive Address
                  </span>
                  <span className="font-medium font-mono text-xs break-all text-right max-w-[65%]">
                    {plan.merchantReceiveAddress || "N/A"}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-2.5">
                  <span className="text-muted-foreground">
                    Monthly Equivalent
                  </span>
                  <span className="font-medium">
                    ${monthlyEquivalent.toFixed(2)}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-md border p-2.5">
                  <span className="text-muted-foreground">Annual Run Rate</span>
                  <span className="font-medium">
                    $
                    {annualRunRate.toLocaleString(undefined, {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="analytics"
              className="space-y-4 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0"
            >
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">
                    Plan Metrics Snapshot
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-72 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                        <YAxis tick={{ fontSize: 12 }} />
                        <Tooltip />
                        <Bar
                          dataKey="value"
                          fill="hsl(var(--primary))"
                          radius={[6, 6, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent
              value="raw"
              className="space-y-3 focus-visible:ring-0 focus-visible:ring-transparent focus-visible:ring-offset-0"
            >
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground mb-1">
                  PDA Address
                </p>
                <p className="font-mono text-xs break-all">
                  {plan.pubkey || "N/A (mock plan)"}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                  <UserRound className="h-3.5 w-3.5" />
                  Deployer Address
                </p>
                <p className="font-mono text-xs break-all">
                  {plan.deployer || "N/A"}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                  <Wallet className="h-3.5 w-3.5" />
                  Merchant Receive Address
                </p>
                <p className="font-mono text-xs break-all">
                  {plan.merchantReceiveAddress || "N/A"}
                </p>
              </div>
              <div className="rounded-md border p-3">
                <p className="text-xs text-muted-foreground mb-2">All fields</p>
                <pre className="overflow-auto rounded bg-muted p-3 text-xs">
                  {JSON.stringify(plan, null, 2)}
                </pre>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
