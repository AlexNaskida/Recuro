import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { useAnchorProgram } from "./useAnchorProgram";
import { microToUsdc } from "@/lib/pda";
import { plans as mockPlans } from "@/lib/mock-data";
import { SHOW_MOCK_DATA } from "@/lib/config";

export interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  interval: string;
  intervalSeconds: number;
  createdAt: number;
  subscribers: number;
  revenue: number;
  feePaid: number;
  successfulPayments: number;
  status: "active" | "paused" | "archived";
  pubkey: string;
  deployer: string;
  merchantReceiveAddress: string;
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

function statusRank(status: Plan["status"]): number {
  if (status === "active") return 0;
  if (status === "paused") return 1;
  return 2;
}

function sortPlans(plans: Plan[]): Plan[] {
  return [...plans].sort((a, b) => {
    const byStatus = statusRank(a.status) - statusRank(b.status);
    if (byStatus !== 0) return byStatus;
    return b.createdAt - a.createdAt;
  });
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
      if (SHOW_MOCK_DATA) {
        // Not connected - show mock data
        setPlans(
          sortPlans(
            mockPlans.map((p, index) => ({
              ...p,
              createdAt: Date.now() - index * 60_000,
              intervalSeconds: 0,
              description: "",
              feePaid: 0,
              successfulPayments: 0,
              pubkey: "",
              deployer: "",
              merchantReceiveAddress: "",
            })),
          ),
        );
        setUsingMock(true);
      } else {
        setPlans([]);
        setUsingMock(false);
      }
      return;
    }

    setLoading(true);
    try {
      const connection = program.provider.connection;
      const rawAccounts = await connection.getProgramAccounts(
        program.programId,
        {
          filters: [
            { dataSize: 562 },
            { memcmp: { offset: 8, bytes: publicKey.toBase58() } },
          ],
        },
      );

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const accounts: Array<{ publicKey: any; account: any }> = [];
      for (const { pubkey, account } of rawAccounts) {
        try {
          const decoded = program.coder.accounts.decode("plan", account.data);
          accounts.push({ publicKey: pubkey, account: decoded });
        } catch {
          console.warn(
            "[usePlans] skipping undecodable plan:",
            pubkey.toBase58(),
          );
        }
      }

      console.debug("[usePlans] plan fetch", {
        merchant: publicKey.toBase58(),
        programId: program.programId.toBase58(),
        rpcEndpoint: connection.rpcEndpoint,
        rawCount: rawAccounts.length,
        decodedCount: accounts.length,
      });

      if (accounts.length === 0) {
        if (SHOW_MOCK_DATA) {
          // Connected but no on-chain plans yet - show mock with a note
          setPlans(
            sortPlans(
              mockPlans.map((p, index) => ({
                ...p,
                createdAt: Date.now() - index * 60_000,
                intervalSeconds: 0,
                description: "",
                feePaid: 0,
                successfulPayments: 0,
                pubkey: "",
                deployer: "",
                merchantReceiveAddress: "",
              })),
            ),
          );
          setUsingMock(true);
        } else {
          setPlans([]);
          setUsingMock(false);
        }
      } else {
        const real: Plan[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        for (const a of accounts as any[]) {
          try {
            const acc = a.account;

            // Keep only plans whose PDA matches ["plan", merchant, plan_id].
            // This prevents stale/misaligned accounts from causing ConstraintSeeds errors later.
            const [expectedPlanPda] = PublicKey.findProgramAddressSync(
              [
                Buffer.from("plan"),
                acc.merchant.toBuffer(),
                acc.planId.toArrayLike(Buffer, "le", 8),
              ],
              program.programId,
            );
            if (!expectedPlanPda.equals(a.publicKey)) {
              console.warn(
                "[usePlans] skipping seed-invalid plan:",
                a.publicKey.toBase58(),
              );
              continue;
            }

            const deployer =
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (acc.merchant as any)?.toBase58?.() ?? publicKey.toBase58();
            const merchantReceiveAddress =
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              (acc.merchantReceiveAddress as any)?.toBase58?.() ?? deployer;

            real.push({
              id: a.publicKey.toBase58(),
              pubkey: a.publicKey.toBase58(),
              name: acc.name,
              description: acc.description ?? "",
              price: microToUsdc(acc.amountUsdc),
              interval: intervalLabel(acc.intervalSeconds.toNumber()),
              intervalSeconds: acc.intervalSeconds.toNumber(),
              createdAt: acc.createdAt.toNumber() * 1000,
              subscribers: acc.activeSubscribers.toNumber(),
              revenue: microToUsdc(acc.totalRevenue),
              feePaid: microToUsdc(acc.feesPaid),
              successfulPayments: acc.successfulPayments.toNumber(),
              status: decodePlanStatus(acc.status),
              deployer,
              merchantReceiveAddress,
            });
          } catch {
            console.warn(
              "[usePlans] skipping plan with invalid numeric fields:",
              a.publicKey.toBase58(),
            );
          }
        }

        setPlans(sortPlans(real));
        setUsingMock(false);
      }
    } catch (err) {
      if (SHOW_MOCK_DATA) {
        console.warn("[usePlans] fetch failed, using mock:", err);
        setPlans(
          sortPlans(
            mockPlans.map((p, index) => ({
              ...p,
              createdAt: Date.now() - index * 60_000,
              intervalSeconds: 0,
              description: "",
              feePaid: 0,
              successfulPayments: 0,
              pubkey: "",
              deployer: "",
              merchantReceiveAddress: "",
            })),
          ),
        );
        setUsingMock(true);
      } else {
        console.warn("[usePlans] fetch failed, mock disabled:", err);
        setPlans([]);
        setUsingMock(false);
      }
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  return { plans, loading, usingMock, refetch: fetchPlans };
}
