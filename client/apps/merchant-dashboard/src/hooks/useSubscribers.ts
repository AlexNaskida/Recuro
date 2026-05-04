import { useState, useEffect, useCallback } from "react";
import { useAnchorProgram } from "./useAnchorProgram";
import { useMerchantWallet } from "./useMerchantWallet";
import { microToUsdc } from "@/lib/pda";
import { subscribers as mockSubs } from "@/lib/mock-data";
import { SHOW_MOCK_DATA } from "@/lib/config";

export interface Subscriber {
  wallet: string;
  plan: string;
  planPubkey: string;
  status: "active" | "paused" | "cancelled" | "expired";
  startedAt: number;
  lastPaidAt: number;
  lastFailedAt: number;
  endedAt: number;
  started: string;
  lastPayment: string;
  nextPayment: string;
  nextPaymentAt: number;
  amountUsdc: number;
  totalPaid: number;
  paymentCount: number;
  totalFailures: number;
  failedPaymentCount: number;
}

function decodeSubStatus(raw: Record<string, unknown>): Subscriber["status"] {
  if (raw.active !== undefined) return "active";
  if (raw.paused !== undefined) return "paused";
  if (raw.cancelled !== undefined) return "cancelled";
  return "expired";
}

function unixToDate(unix: number): string {
  if (!unix) return "-";
  return new Date(unix * 1000).toISOString().split("T")[0];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toMock(s: any): Subscriber {
  const startedAt = Date.parse(s.started || "");
  return {
    ...s,
    status:
      s.status === "past_due" ? "active" : (s.status as Subscriber["status"]),
    startedAt: Number.isNaN(startedAt) ? 0 : startedAt,
    lastPaidAt: 0,
    lastFailedAt: 0,
    endedAt: 0,
    planPubkey: "",
    nextPayment: "-",
    nextPaymentAt: 0,
    amountUsdc: 0,
    paymentCount: 0,
    totalFailures: 0,
    failedPaymentCount: 0,
  };
}

export function useSubscribers(planPubkeys?: string[]) {
  const { publicKey, connected } = useMerchantWallet();
  const { program } = useAnchorProgram();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [usingMock, setUsingMock] = useState(true);

  const fetchSubscribers = useCallback(async () => {
    if (SHOW_MOCK_DATA) {
      setSubscribers(mockSubs.map(toMock));
      setUsingMock(true);
      return;
    }

    if (!program || !connected || !publicKey) {
      setSubscribers([]);
      setUsingMock(false);
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
          setSubscribers([]);
          setUsingMock(false);
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
          setSubscribers([]);
          setUsingMock(false);
          return;
        }

        // ── Step 3: map to Subscriber shape ────────────────────────────────────
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const real: Subscriber[] = allSubs.map((a: any) => {
          const acc = a.account;
          const planPk = acc.plan.toBase58();
          const startedAt = acc.startedAt.toNumber();
          const lastPaidAt = acc.lastPaidAt.toNumber();
          const lastFailedAt = acc.lastFailedAt?.toNumber?.() ?? 0;
          const endedAt = acc.endedAt?.toNumber?.() ?? 0;
          const nextPaymentAt = acc.nextPaymentAt.toNumber();
          return {
            wallet: acc.subscriber.toBase58(),
            plan: planNames[planPk] ?? planPk.slice(0, 8) + "...",
            planPubkey: planPk,
            status: decodeSubStatus(acc.status),
            startedAt: startedAt * 1000,
            lastPaidAt: lastPaidAt * 1000,
            lastFailedAt: lastFailedAt * 1000,
            endedAt: endedAt * 1000,
            started: unixToDate(startedAt),
            lastPayment: lastPaidAt > 0 ? unixToDate(lastPaidAt) : "-",
            nextPayment: unixToDate(nextPaymentAt),
            nextPaymentAt: nextPaymentAt * 1000,
            amountUsdc: microToUsdc(acc.amountUsdc),
            totalPaid: microToUsdc(acc.totalPaid),
            paymentCount: acc.paymentCount.toNumber(),
            totalFailures: Number(acc.totalFailures ?? 0),
            failedPaymentCount: Number(acc.failedPaymentCount ?? 0),
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
        setSubscribers([]);
        setUsingMock(false);
        return;
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const real: Subscriber[] = allSubs.map((a: any) => {
        const acc = a.account;
        const planPk = acc.plan.toBase58();
        const startedAt = acc.startedAt.toNumber();
        const lastPaidAt = acc.lastPaidAt.toNumber();
        const lastFailedAt = acc.lastFailedAt?.toNumber?.() ?? 0;
        const endedAt = acc.endedAt?.toNumber?.() ?? 0;
        const nextPaymentAt = acc.nextPaymentAt.toNumber();
        return {
          wallet: acc.subscriber.toBase58(),
          plan: planNames[planPk] ?? planPk.slice(0, 8) + "...",
          planPubkey: planPk,
          status: decodeSubStatus(acc.status),
          startedAt: startedAt * 1000,
          lastPaidAt: lastPaidAt * 1000,
          lastFailedAt: lastFailedAt * 1000,
          endedAt: endedAt * 1000,
          started: unixToDate(startedAt),
          lastPayment: lastPaidAt > 0 ? unixToDate(lastPaidAt) : "-",
          nextPayment: unixToDate(nextPaymentAt),
          nextPaymentAt: nextPaymentAt * 1000,
          amountUsdc: microToUsdc(acc.amountUsdc),
          totalPaid: microToUsdc(acc.totalPaid),
          paymentCount: acc.paymentCount.toNumber(),
          totalFailures: Number(acc.totalFailures ?? 0),
          failedPaymentCount: Number(acc.failedPaymentCount ?? 0),
        };
      });

      setSubscribers(real);
      setUsingMock(false);
    } catch (err) {
      console.warn("[useSubscribers] fetch failed:", err);
      setSubscribers([]);
      setUsingMock(false);
    } finally {
      setLoading(false);
    }
  }, [connected, program, publicKey, planPubkeys]);

  useEffect(() => {
    fetchSubscribers();
  }, [fetchSubscribers]);

  return { subscribers, loading, usingMock, refetch: fetchSubscribers };
}
