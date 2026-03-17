import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Plan } from "@/hooks/usePlans";

type DeletePlanConfirmDialogProps = {
  plan: Plan | null;
  deleting: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (planPubkey: string) => Promise<void>;
};

export function DeletePlanConfirmDialog({
  plan,
  deleting,
  onOpenChange,
  onConfirm,
}: DeletePlanConfirmDialogProps) {
  return (
    <AlertDialog open={!!plan} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete archived plan?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently close the plan account and return rent to your
            wallet. This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        {plan && (
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground">{plan.name}</p>
            <p className="mt-1 font-mono break-all">{plan.pubkey}</p>
          </div>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-600 hover:bg-red-700"
            disabled={!plan?.pubkey || deleting}
            onClick={(e) => {
              e.preventDefault();
              if (!plan?.pubkey) return;
              void onConfirm(plan.pubkey);
            }}
          >
            {deleting ? "Deleting..." : "Delete Plan"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
