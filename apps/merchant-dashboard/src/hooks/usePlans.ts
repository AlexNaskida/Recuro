import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAnchorProgram } from "./useAnchorProgram";
import { microToUsdc } from "@/lib/pda";
import { plans as mockPlans } from "@/lib/mock-data";

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  subscribers: number;
  revenue: number;
  feePaid: number;
  successfulPayments: number;
  status: "active" | "paused" | "archived";
  pubkey: string;
}

function decodePlanStatus(raw: Record<string, unknown>): Plan["status"] {
  if (raw.active !== undefined) return "active";
  if (raw.paused !== undefined) return "paused";
  if (raw.archived !== undefined) return "archived";
  return "active";
}

function intervalLabel(seconds: number): string {
  const days = seconds / 86_400;
  if (days <= 7) return "weekly";
  if (days <= 31) return "monthly";
  if (days <= 93) return "quarterly";
  return "yearly";
}

// export function intervalLabel(seconds: number): string {
//   if (seconds < 3600)   return `${seconds}s`;         // < 1 hour
//   if (seconds < 86400)  return `${Math.round(seconds / 3600)}h`;  // < 1 day
//   if (seconds < 604800) return `${Math.round(seconds / 86400)}d`; // < 1 week
//   if (seconds < 2592000) return `${Math.round(seconds / 604800)}w`;
//   return `${Math.round(seconds / 2592000)} month${Math.round(seconds / 2592000) === 1 ? "" : "s"}`;
// }

export function usePlans() {
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [usingMock, setUsingMock] = useState(true);

  const fetchPlans = useCallback(async () => {
    if (!program || !publicKey) {
      // Not connected — show mock data
      setPlans(
        mockPlans.map((p) => ({
          ...p,
          description: "",
          feePaid: 0,
          successfulPayments: 0,
          pubkey: "",
        })),
      );
      setUsingMock(true);
      return;
    }

    setLoading(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts = await (program.account as any).plan.all([
        { memcmp: { offset: 8, bytes: publicKey.toBase58() } },
      ]);

      if (accounts.length === 0) {
        // Connected but no on-chain plans yet — show mock with a note
        setPlans(
          mockPlans.map((p) => ({
            ...p,
            description: "",
            feePaid: 0,
            successfulPayments: 0,
            pubkey: "",
          })),
        );
        setUsingMock(true);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const real: Plan[] = accounts.map((a: any) => {
          const acc = a.account;
          return {
            id: a.publicKey.toBase58(),
            pubkey: a.publicKey.toBase58(),
            name: acc.name,
            description: acc.description ?? "",
            price: microToUsdc(acc.amountUsdc),
            interval: intervalLabel(acc.intervalSeconds.toNumber()),
            subscribers: acc.activeSubscribers.toNumber(),
            revenue: microToUsdc(acc.totalRevenue),
            feePaid: microToUsdc(acc.feesPaid),
            successfulPayments: acc.successfulPayments.toNumber(),
            status: decodePlanStatus(acc.status),
          };
        });
        setPlans(real);
        setUsingMock(false);
      }
    } catch (err) {
      console.warn("[usePlans] fetch failed, using mock:", err);
      setPlans(
        mockPlans.map((p) => ({
          ...p,
          description: "",
          feePaid: 0,
          successfulPayments: 0,
          pubkey: "",
        })),
      );
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return { plans, loading, usingMock, refetch: fetchPlans };
}
