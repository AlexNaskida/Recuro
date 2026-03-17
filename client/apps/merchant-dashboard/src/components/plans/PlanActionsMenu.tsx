import { MoreVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Plan } from "@/hooks/usePlans";

type PlanActionsMenuProps = {
  plan: Plan;
  pausingPlanId: string | null;
  resumingPlanId: string | null;
  archivingPlanId: string | null;
  unarchivingPlanId: string | null;
  deletingPlanId: string | null;
  onEdit: (plan: Plan) => void;
  onPause: (planPubkey: string) => void;
  onResume: (planPubkey: string) => void;
  onArchive: (planPubkey: string) => void;
  onUnarchive: (planPubkey: string) => void;
  onDeleteRequest: (plan: Plan) => void;
};

export function PlanActionsMenu({
  plan,
  pausingPlanId,
  resumingPlanId,
  archivingPlanId,
  unarchivingPlanId,
  deletingPlanId,
  onEdit,
  onPause,
  onResume,
  onArchive,
  onUnarchive,
  onDeleteRequest,
}: PlanActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-8 w-8">
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {plan.status === "archived" ? (
          <>
            <DropdownMenuItem
              onClick={() => onUnarchive(plan.pubkey)}
              disabled={!plan.pubkey || unarchivingPlanId === plan.pubkey}
            >
              {unarchivingPlanId === plan.pubkey
                ? "Unarchiving..."
                : "Unarchive"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDeleteRequest(plan)}
              disabled={!plan.pubkey || deletingPlanId === plan.pubkey}
              className="text-red-500 focus:text-red-600 dark:text-red-500 dark:focus:text-red-600"
            >
              {deletingPlanId === plan.pubkey ? "Deleting..." : "Delete"}
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              onClick={() => onEdit(plan)}
              disabled={!plan.pubkey}
            >
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                plan.status === "paused"
                  ? onResume(plan.pubkey)
                  : onPause(plan.pubkey)
              }
              disabled={
                !plan.pubkey ||
                pausingPlanId === plan.pubkey ||
                resumingPlanId === plan.pubkey
              }
            >
              {pausingPlanId === plan.pubkey
                ? "Pausing..."
                : resumingPlanId === plan.pubkey
                  ? "Resuming..."
                  : plan.status === "paused"
                    ? "Resume"
                    : "Pause"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onArchive(plan.pubkey)}
              disabled={!plan.pubkey || archivingPlanId === plan.pubkey}
              className="text-red-500 focus:text-red-600 dark:text-red-500 dark:focus:text-red-600"
            >
              {archivingPlanId === plan.pubkey ? "Archiving..." : "Archive"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
