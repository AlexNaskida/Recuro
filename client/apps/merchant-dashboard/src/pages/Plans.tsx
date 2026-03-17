import { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, SystemProgram } from "@solana/web3.js";
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
import { Plus, Loader2, Users, DollarSign, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { type Plan, usePlans } from "@/hooks/usePlans";
import { useCreatePlan } from "@/hooks/useCreatePlan";
import { useAnchorProgram } from "@/hooks/useAnchorProgram";
import { PlanActionsMenu } from "@/components/plans/PlanActionsMenu";
import { DeletePlanConfirmDialog } from "@/components/plans/DeletePlanConfirmDialog";

export default function Plans() {
  const { connected, publicKey } = useWallet();
  const { program } = useAnchorProgram();
  const { plans, loading, usingMock, refetch } = usePlans();
  const { createPlan, loading: deploying, canCreate } = useCreatePlan();
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [updatingPlan, setUpdatingPlan] = useState(false);
  const [pausingPlanId, setPausingPlanId] = useState<string | null>(null);
  const [resumingPlanId, setResumingPlanId] = useState<string | null>(null);
  const [archivingPlanId, setArchivingPlanId] = useState<string | null>(null);
  const [unarchivingPlanId, setUnarchivingPlanId] = useState<string | null>(
    null,
  );
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);
  const [deleteConfirmPlan, setDeleteConfirmPlan] = useState<Plan | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "paused" | "archived"
  >("all");

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
        : "bg-black text-white border-black";

  const filteredPlans =
    statusFilter === "all"
      ? plans
      : plans.filter((plan) => plan.status === statusFilter);

  const sortedPlans = [...filteredPlans].sort((a, b) => {
    const rank = (status: Plan["status"]) => {
      if (status === "active") return 0;
      if (status === "paused") return 1;
      return 2;
    };

    const byStatus = rank(a.status) - rank(b.status);
    if (byStatus !== 0) return byStatus;

    return b.createdAt - a.createdAt;
  });

  const openEditDialog = (plan: Plan) => {
    setEditingPlan(plan);
    setEditName(plan.name);
    setEditDescription(plan.description ?? "");
    setEditOpen(true);
  };

  const handleUpdatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!program || !publicKey || !editingPlan?.pubkey) {
      toast.error("Connect wallet first");
      return;
    }

    const nextName = editName.trim();
    const nextDescription = editDescription.trim();

    if (!nextName) {
      toast.error("Plan name is required");
      return;
    }

    const nameChanged = nextName !== editingPlan.name;
    const descriptionChanged =
      nextDescription !== (editingPlan.description ?? "");

    if (!nameChanged && !descriptionChanged) {
      toast.info("No changes to save");
      return;
    }

    setUpdatingPlan(true);
    try {
      const signature = await program.methods
        .updatePlan({
          name: nameChanged ? nextName : null,
          description: descriptionChanged ? nextDescription : null,
          maxSubscribers: null,
        })
        .accounts({
          merchant: publicKey,
          plan: new PublicKey(editingPlan.pubkey),
        })
        .rpc({ commitment: "confirmed" });

      toast.success("Plan updated", {
        description: `Tx: ${signature.slice(0, 8)}...`,
      });
      setEditOpen(false);
      setEditingPlan(null);
      await refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Update failed", { description: message });
    } finally {
      setUpdatingPlan(false);
    }
  };

  const handlePausePlan = async (planPubkey: string) => {
    if (!program || !publicKey) {
      toast.error("Connect wallet first");
      return;
    }

    if (!planPubkey) {
      toast.error("Cannot pause mock plan");
      return;
    }

    setPausingPlanId(planPubkey);
    try {
      const signature = await program.methods
        .pausePlan()
        .accounts({
          merchant: publicKey,
          plan: new PublicKey(planPubkey),
        })
        .rpc({ commitment: "confirmed" });

      toast.success("Plan paused", {
        description: `Tx: ${signature.slice(0, 8)}...`,
      });
      await refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Pause failed", { description: message });
    } finally {
      setPausingPlanId(null);
    }
  };

  const handleResumePlan = async (planPubkey: string) => {
    if (!program || !publicKey) {
      toast.error("Connect wallet first");
      return;
    }

    if (!planPubkey) {
      toast.error("Cannot resume mock plan");
      return;
    }

    setResumingPlanId(planPubkey);
    try {
      const signature = await program.methods
        .resumePlan()
        .accounts({
          merchant: publicKey,
          plan: new PublicKey(planPubkey),
        })
        .rpc({ commitment: "confirmed" });

      toast.success("Plan resumed", {
        description: `Tx: ${signature.slice(0, 8)}...`,
      });
      await refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Resume failed", { description: message });
    } finally {
      setResumingPlanId(null);
    }
  };

  const handleArchivePlan = async (planPubkey: string) => {
    if (!program || !publicKey) {
      toast.error("Connect wallet first");
      return;
    }

    if (!planPubkey) {
      toast.error("Cannot archive mock plan");
      return;
    }

    setArchivingPlanId(planPubkey);
    try {
      const signature = await program.methods
        .archivePlan()
        .accounts({
          merchant: publicKey,
          plan: new PublicKey(planPubkey),
        })
        .rpc({ commitment: "confirmed" });

      toast.success("Plan archived", {
        description: `Tx: ${signature.slice(0, 8)}...`,
      });
      await refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Archive failed", { description: message });
    } finally {
      setArchivingPlanId(null);
    }
  };

  const handleUnarchivePlan = async (planPubkey: string) => {
    if (!program || !publicKey) {
      toast.error("Connect wallet first");
      return;
    }

    if (!planPubkey) {
      toast.error("Cannot unarchive mock plan");
      return;
    }

    setUnarchivingPlanId(planPubkey);
    try {
      const signature = await program.methods
        .unarchivePlan()
        .accounts({
          merchant: publicKey,
          plan: new PublicKey(planPubkey),
        })
        .rpc({ commitment: "confirmed" });

      toast.success("Plan unarchived", {
        description: `Tx: ${signature.slice(0, 8)}...`,
      });
      await refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Unarchive failed", { description: message });
    } finally {
      setUnarchivingPlanId(null);
    }
  };

  const handleDeletePlan = async (planPubkey: string) => {
    if (!program || !publicKey) {
      toast.error("Connect wallet first");
      return;
    }

    if (!planPubkey) {
      toast.error("Cannot delete mock plan");
      return;
    }

    setDeletingPlanId(planPubkey);
    try {
      const signature = await program.methods
        .deletePlan()
        .accounts({
          merchant: publicKey,
          plan: new PublicKey(planPubkey),
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });

      toast.success("Plan deleted", {
        description: `Tx: ${signature.slice(0, 8)}...`,
      });
      setDeleteConfirmPlan(null);
      await refetch();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      toast.error("Delete failed", { description: message });
    } finally {
      setDeletingPlanId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Mock data banner */}
      {usingMock && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {connected
              ? "No on-chain plans found. Deploy your first plan to see real data."
              : "Connect your wallet to see your on-chain plans."}
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between">
        <Select
          value={statusFilter}
          onValueChange={(val) =>
            setStatusFilter(val as "all" | "active" | "paused" | "archived")
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Filter plans" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Plans</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="paused">Paused</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
          </SelectContent>
        </Select>
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

        <Dialog
          open={editOpen}
          onOpenChange={(nextOpen) => {
            setEditOpen(nextOpen);
            if (!nextOpen) {
              setEditingPlan(null);
            }
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Plan</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleUpdatePlan} className="space-y-4">
              <div className="space-y-2">
                <Label>Plan Name</Label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <Button type="submit" className="w-full" disabled={updatingPlan}>
                {updatingPlan && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                Save Changes
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
          {sortedPlans.map((plan) => (
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
                  <PlanActionsMenu
                    plan={plan}
                    pausingPlanId={pausingPlanId}
                    resumingPlanId={resumingPlanId}
                    archivingPlanId={archivingPlanId}
                    unarchivingPlanId={unarchivingPlanId}
                    deletingPlanId={deletingPlanId}
                    onEdit={openEditDialog}
                    onPause={handlePausePlan}
                    onResume={handleResumePlan}
                    onArchive={handleArchivePlan}
                    onUnarchive={handleUnarchivePlan}
                    onDeleteRequest={setDeleteConfirmPlan}
                  />
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

      <DeletePlanConfirmDialog
        plan={deleteConfirmPlan}
        deleting={!!deletingPlanId}
        onOpenChange={(open) => {
          if (!open && !deletingPlanId) setDeleteConfirmPlan(null);
        }}
        onConfirm={handleDeletePlan}
      />
    </div>
  );
}
