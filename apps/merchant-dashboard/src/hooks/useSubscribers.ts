import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { useAnchorProgram } from "./useAnchorProgram";
import { microToUsdc } from "@/lib/pda";
import { subscribers as mockSubs } from "@/lib/mock-data";

export interface Subscriber {
  wallet: string;
  plan: string;
  planPubkey: string;
  status: "active" | "paused" | "cancelled" | "expired";
  started: string;
  lastPayment: string;
  nextPayment: string;
  totalPaid: number;
  paymentCount: number;
}

function decodeSubStatus(raw: Record<string, unknown>): Subscriber["status"] {
  if (raw.active !== undefined) return "active";
  if (raw.paused !== undefined) return "paused";
  if (raw.cancelled !== undefined) return "cancelled";
  return "expired";
}

function unixToDate(unix: number): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toISOString().split("T")[0];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMock(s: any): Subscriber {
  return {
    ...s,
    status:
      s.status === "past_due" ? "active" : (s.status as Subscriber["status"]),
    planPubkey: "",
    nextPayment: "—",
    paymentCount: 0,
  };
}

export function useSubscribers(planPubkeys?: string[]) {
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [usingMock, setUsingMock] = useState(true);

  const fetchSubscribers = useCallback(async () => {
    if (!program || !publicKey) {
      setSubscribers(mockSubs.map(toMock));
      setUsingMock(true);
      return;
    }

    setLoading(true);
    try {
      // ── Step 1: resolve plan pubkeys owned by this merchant ─────────────────
      let resolvedPlanPubkeys: string[] = planPubkeys ?? [];

      if (resolvedPlanPubkeys.length === 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const planAccounts = await (program.account as any).plan.all([
          { memcmp: { offset: 8, bytes: publicKey.toBase58() } },
        ]);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        resolvedPlanPubkeys = planAccounts.map((a: any) =>
          a.publicKey.toBase58(),
        );

        // Build plan name map from fetched accounts
        const planNames: Record<string, string> = {};
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        planAccounts.forEach((a: any) => {
          planNames[a.publicKey.toBase58()] = a.account.name;
        });

        if (resolvedPlanPubkeys.length === 0) {
          setSubscribers(mockSubs.map(toMock));
          setUsingMock(true);
          return;
        }

        // ── Step 2: fetch subscriptions using raw getProgramAccounts ───────────
        // Filters by dataSize:173 to skip stale old-layout accounts that would
        // crash Anchor's deserializer with "Trying to access beyond buffer length"
        const connection = program.provider.connection;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const allSubs: any[] = [];

        for (const pk of resolvedPlanPubkeys) {
          const rawAccounts = await connection.getProgramAccounts(
            program.programId,
            {
              filters: [
                { dataSize: 173 },
                { memcmp: { offset: 8, bytes: pk } },
              ],
            },
          );

          for (const { pubkey, account } of rawAccounts) {
            try {
              const decoded = program.coder.accounts.decode(
                "subscription",
                account.data,
              );
              allSubs.push({ publicKey: pubkey, account: decoded });
            } catch {
              console.warn(
                "Skipping undeserializable subscription:",
                pubkey.toBase58(),
              );
            }
          }
        }

        if (allSubs.length === 0) {
          setSubscribers(mockSubs.map(toMock));
          setUsingMock(true);
          return;
        }

        // ── Step 3: map to Subscriber shape ────────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const real: Subscriber[] = allSubs.map((a: any) => {
          const acc = a.account;
          const planPk = acc.plan.toBase58();
          return {
            wallet: acc.subscriber.toBase58(),
            plan: planNames[planPk] ?? planPk.slice(0, 8) + "...",
            planPubkey: planPk,
            status: decodeSubStatus(acc.status),
            started: unixToDate(acc.startedAt.toNumber()),
            lastPayment:
              acc.lastPaidAt.toNumber() > 0
                ? unixToDate(acc.lastPaidAt.toNumber())
                : "—",
            nextPayment: unixToDate(acc.nextPaymentAt.toNumber()),
            totalPaid: microToUsdc(acc.totalPaid),
            paymentCount: acc.paymentCount.toNumber(),
          };
        });

        setSubscribers(real);
        setUsingMock(false);
        return;
      }

      // ── Fallback path when planPubkeys passed explicitly ────────────────────
      const planNames: Record<string, string> = {};
      await Promise.all(
        resolvedPlanPubkeys.map(async (pk) => {
          try {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const planAcc = await (program.account as any).plan.fetch(pk);
            planNames[pk] = planAcc.name;
          } catch {
            planNames[pk] = pk.slice(0, 8) + "...";
          }
        }),
      );

      const connection = program.provider.connection;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allSubs: any[] = [];

      for (const pk of resolvedPlanPubkeys) {
        const rawAccounts = await connection.getProgramAccounts(
          program.programId,
          {
            filters: [{ dataSize: 173 }, { memcmp: { offset: 8, bytes: pk } }],
          },
        );

        for (const { pubkey, account } of rawAccounts) {
          try {
            const decoded = program.coder.accounts.decode(
              "subscription",
              account.data,
            );
            allSubs.push({ publicKey: pubkey, account: decoded });
          } catch {
            console.warn(
              "Skipping undeserializable subscription:",
              pubkey.toBase58(),
            );
          }
        }
      }

      if (allSubs.length === 0) {
        setSubscribers(mockSubs.map(toMock));
        setUsingMock(true);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const real: Subscriber[] = allSubs.map((a: any) => {
        const acc = a.account;
        const planPk = acc.plan.toBase58();
        return {
          wallet: acc.subscriber.toBase58(),
          plan: planNames[planPk] ?? planPk.slice(0, 8) + "...",
          planPubkey: planPk,
          status: decodeSubStatus(acc.status),
          started: unixToDate(acc.startedAt.toNumber()),
          lastPayment:
            acc.lastPaidAt.toNumber() > 0
              ? unixToDate(acc.lastPaidAt.toNumber())
              : "—",
          nextPayment: unixToDate(acc.nextPaymentAt.toNumber()),
          totalPaid: microToUsdc(acc.totalPaid),
          paymentCount: acc.paymentCount.toNumber(),
        };
      });

      setSubscribers(real);
      setUsingMock(false);
    } catch (err) {
      console.warn("[useSubscribers] fetch failed, using mock:", err);
      setSubscribers(mockSubs.map(toMock));
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, planPubkeys]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  return { subscribers, loading, usingMock, refetch: fetchSubscribers };
}
