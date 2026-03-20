import {
  Archive,
  CirclePause,
  CirclePlay,
  Info,
  MoreVertical,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
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
  onInfo: (plan: Plan) => void;
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
  onInfo,
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
        <DropdownMenuItem onClick={() => onInfo(plan)}>
          <Info className="mr-2 h-4 w-4" />
          Info
        </DropdownMenuItem>
        {plan.status === "archived" ? (
          <>
            <DropdownMenuItem
              onClick={() => onUnarchive(plan.pubkey)}
              disabled={!plan.pubkey || unarchivingPlanId === plan.pubkey}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              {unarchivingPlanId === plan.pubkey
                ? "Unarchiving..."
                : "Unarchive"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDeleteRequest(plan)}
              disabled={!plan.pubkey || deletingPlanId === plan.pubkey}
              className="text-red-500 focus:text-red-600 dark:text-red-500 dark:focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              {deletingPlanId === plan.pubkey ? "Deleting..." : "Delete"}
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem
              onClick={() => onEdit(plan)}
              disabled={!plan.pubkey}
            >
              <Pencil className="mr-2 h-4 w-4" />
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
              {plan.status === "paused" ? (
                <CirclePlay className="mr-2 h-4 w-4" />
              ) : (
                <CirclePause className="mr-2 h-4 w-4" />
              )}
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
              <Archive className="mr-2 h-4 w-4" />
              {archivingPlanId === plan.pubkey ? "Archiving..." : "Archive"}
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
