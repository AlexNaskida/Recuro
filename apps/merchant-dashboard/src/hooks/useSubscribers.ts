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
  if (raw.active !== undefined)    return "active";
  if (raw.paused !== undefined)    return "paused";
  if (raw.cancelled !== undefined) return "cancelled";
  return "expired";
}

function unixToDate(unix: number): string {
  if (!unix) return "—";
  return new Date(unix * 1000).toISOString().split("T")[0];
}

export function useSubscribers(planPubkeys?: string[]) {
  const { publicKey } = useWallet();
  const { program } = useAnchorProgram();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(false);
  const [usingMock, setUsingMock] = useState(true);

  const fetchSubscribers = useCallback(async () => {
    if (!program || !publicKey) {
      setSubscribers(
        mockSubs.map((s) => ({
          ...s,
          status: s.status === "past_due" ? "active" : (s.status as Subscriber["status"]),
          planPubkey: "",
          nextPayment: "—",
          paymentCount: 0,
        }))
      );
      setUsingMock(true);
      return;
    }

    setLoading(true);
    try {
      // Fetch all subscriptions for plans owned by this merchant
      const filters = planPubkeys && planPubkeys.length > 0
        ? planPubkeys.map((pk) => ({ memcmp: { offset: 8, bytes: pk } }))
        : [{ memcmp: { offset: 8 + 32, bytes: publicKey.toBase58() } }];

      const allAccounts: any[] = [];
      for (const filter of filters) {
        const accounts = await (program.account as any).subscription.all([filter]);
        allAccounts.push(...accounts);
      }

      if (allAccounts.length === 0) {
        setSubscribers(
          mockSubs.map((s) => ({
            ...s,
            status: s.status === "past_due" ? "active" : (s.status as Subscriber["status"]),
            planPubkey: "",
            nextPayment: "—",
            paymentCount: 0,
          }))
        );
        setUsingMock(true);
      } else {
        const real: Subscriber[] = allAccounts.map((a: any) => {
          const acc = a.account;
          return {
            wallet: acc.subscriber.toBase58(),
            plan: acc.plan.toBase58().slice(0, 8) + "...",
            planPubkey: acc.plan.toBase58(),
            status: decodeSubStatus(acc.status),
            started: unixToDate(acc.startedAt.toNumber()),
            lastPayment: acc.lastPaidAt.toNumber() > 0 ? unixToDate(acc.lastPaidAt.toNumber()) : "—",
            nextPayment: unixToDate(acc.nextPaymentAt.toNumber()),
            totalPaid: microToUsdc(acc.totalPaid),
            paymentCount: acc.paymentCount.toNumber(),
          };
        });
        setSubscribers(real);
        setUsingMock(false);
      }
    } catch (err) {
      console.warn("[useSubscribers] fetch failed, using mock:", err);
      setSubscribers(
        mockSubs.map((s) => ({
          ...s,
          status: s.status === "past_due" ? "active" : (s.status as Subscriber["status"]),
          planPubkey: "",
          nextPayment: "—",
          paymentCount: 0,
        }))
      );
      setUsingMock(true);
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, planPubkeys]);

  useEffect(() => { fetchSubscribers(); }, [fetchSubscribers]);

  return { subscribers, loading, usingMock, refetch: fetchSubscribers };
}
