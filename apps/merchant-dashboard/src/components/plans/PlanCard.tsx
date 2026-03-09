import { useState } from "react";
import { ExternalLink, MoreHorizontal, Copy, ArchiveX, Users } from "lucide-react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/toaster";
import { useClosePlan } from "@/hooks/useMerchantPlans";
import { SOLSCAN_ACC, formatUSDC, intervalLabel, truncate } from "@/constants";
import { copyToClipboard } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import type { PlanAccount } from "@solana-subscription/sdk";

// ── Plan Status Badge ─────────────────────────────────────────────────────────
function PlanStatusBadge({ status }: { status: string }) {
  const variantMap: Record<string, Parameters<typeof Badge>[0]["variant"]> = {
    Active:   "active",
    Paused:   "paused",
    Archived: "archived",
  };
  return <Badge variant={variantMap[status] ?? "outline"}>{status}</Badge>;
}

// ── Plan Metrics Row ──────────────────────────────────────────────────────────
function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold">{value}</span>
    </div>
  );
}

// ── Plan Card ─────────────────────────────────────────────────────────────────
interface PlanCardProps {
  plan:        PlanAccount;
  isSelected?: boolean;
  onSelect?:   (pubkey: string) => void;
}

export function PlanCard({ plan, isSelected, onSelect }: PlanCardProps) {
  const closePlan   = useClosePlan();
  const { toast }   = useToast();
  const pubkeyStr   = plan.publicKey.toBase58();
  const amountUsdc  = plan.amountUsdc.toNumber() / 1_000_000;
  const interval    = intervalLabel(plan.intervalSeconds.toNumber());

  const handleCopy = async () => {
    await copyToClipboard(pubkeyStr);
    toast({ title: "Copied", description: "Plan address copied to clipboard." });
  };

  return (
    <Card
      onClick={() => onSelect?.(pubkeyStr)}
      className={`cursor-pointer transition-all duration-200 ${
        isSelected
          ? "border-brand-500/60 bg-brand-500/5 shadow-lg shadow-brand-500/10"
          : "card-hover"
      }`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold truncate">{plan.name}</h3>
            <button
              onClick={(e) => { e.stopPropagation(); handleCopy(); }}
              className="flex items-center gap-1 mt-0.5 text-[11px] font-mono text-muted-foreground hover:text-brand-400 transition-colors"
            >
              {truncate(pubkeyStr)}
              <Copy className="h-3 w-3" />
            </button>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <PlanStatusBadge status={plan.status as string} />
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  className="z-50 min-w-[160px] rounded-xl border border-surface-4 bg-surface-2 p-1 shadow-xl"
                  sideOffset={4}
                  align="end"
                >
                  <DropdownMenu.Item
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-surface-3 outline-none"
                    onClick={handleCopy}
                  >
                    <Copy className="h-3.5 w-3.5" /> Copy address
                  </DropdownMenu.Item>
                  <DropdownMenu.Item
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-surface-3 outline-none"
                    asChild
                  >
                    <a href={SOLSCAN_ACC(pubkeyStr)} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3.5 w-3.5" /> View on Solscan
                    </a>
                  </DropdownMenu.Item>
                  <DropdownMenu.Separator className="my-1 h-px bg-surface-4" />
                  <DropdownMenu.Item
                    className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-400 cursor-pointer hover:bg-red-500/10 outline-none"
                    onClick={() => closePlan.mutate(pubkeyStr)}
                  >
                    <ArchiveX className="h-3.5 w-3.5" /> Archive plan
                  </DropdownMenu.Item>
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Price */}
        <div className="flex items-baseline gap-1.5">
          <span className="text-3xl font-bold text-emerald-400">
            ${amountUsdc.toFixed(2)}
          </span>
          <span className="text-sm text-muted-foreground">USDC / {interval}</span>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-surface-4">
          <MetricPill
            label="Subscribers"
            value={plan.activeSubscribers.toNumber().toString()}
          />
          <MetricPill
            label="Revenue"
            value={formatUSDC(plan.totalRevenue.toNumber(), true)}
          />
          <MetricPill
            label="Payments"
            value={plan.successfulPayments?.toNumber().toString() ?? "—"}
          />
        </div>

        {plan.description && (
          <p className="text-xs text-muted-foreground line-clamp-2">{plan.description}</p>
        )}
      </CardContent>
    </Card>
  );
}

// ── Skeleton plan card ────────────────────────────────────────────────────────
export function PlanCardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex justify-between">
          <div className="space-y-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-6 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Skeleton className="h-9 w-28" />
        <div className="grid grid-cols-3 gap-4 pt-2 border-t border-surface-4">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
        </div>
      </CardContent>
    </Card>
  );
}
