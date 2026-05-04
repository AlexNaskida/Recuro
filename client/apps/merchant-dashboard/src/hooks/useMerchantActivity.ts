/* eslint-disable @typescript-eslint/no-explicit-any */
import { useCallback, useEffect, useState } from "react";
import { EventParser } from "@coral-xyz/anchor";
import { useAnchorProgram } from "./useAnchorProgram";
import { useMerchantWallet } from "./useMerchantWallet";
import { microToUsdc } from "@/lib/pda";
import { MOCK_LOGS, type LogEntry } from "@/lib/mock-data";
import { SHOW_MOCK_DATA } from "@/lib/config";

function unixToDate(unix: number): string {
  if (!unix) return "-";
  return new Date(unix * 1000).toISOString().split("T")[0];
}

function bnToNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (
    value &&
    typeof (value as { toNumber?: () => number }).toNumber === "function"
  ) {
    return (value as { toNumber: () => number }).toNumber();
  }
  return 0;
}

async function fetchProgramSignatures(
  connection: {
    getSignaturesForAddress: (
      address: { toBase58: () => string },
      options?: { limit?: number; before?: string },
    ) => Promise<Array<{ signature: string }>>;
  },
  programId: { toBase58: () => string },
) {
  const allSignatures: Array<{ signature: string }> = [];
  let before: string | undefined;

  for (let page = 0; page < 5; page += 1) {
    const batch = await connection.getSignaturesForAddress(programId, {
      limit: 200,
      before,
    });

    if (batch.length === 0) break;

    allSignatures.push(...batch);
    before = batch[batch.length - 1]?.signature;

    if (batch.length < 200) break;
  }

  return allSignatures;
}

export function useMerchantActivity(enabled = true) {
  const { publicKey, connected } = useMerchantWallet();
  const { program } = useAnchorProgram();
  const [events, setEvents] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [usingMock, setUsingMock] = useState(true);

  const fetchActivity = useCallback(async () => {
    if (!enabled) {
      setEvents([]);
      setUsingMock(true);
      return;
    }

    if (SHOW_MOCK_DATA) {
      setEvents(MOCK_LOGS);
      setUsingMock(true);
      return;
    }

    if (!program || !connected || !publicKey) {
      setEvents([]);
      setUsingMock(false);
      return;
    }

    setLoading(true);
    try {
      const planAccounts = await (program.account as any).plan.all([
        { memcmp: { offset: 8, bytes: publicKey.toBase58() } },
      ]);

      if (planAccounts.length === 0) {
        setEvents([]);
        setUsingMock(false);
        return;
      }

      const planNames: Record<string, string> = {};
      const merchantPlanPubkeys = new Set<string>();
      planAccounts.forEach((a: any) => {
        const planPubkey = a.publicKey.toBase58();
        planNames[planPubkey] = a.account.name;
        merchantPlanPubkeys.add(planPubkey);
      });

      const connection = program.provider.connection;
      type DecodedSubscriptionRow = {
        publicKey: { toBase58: () => string };
        account: Record<string, unknown>;
      };
      const allSubs: DecodedSubscriptionRow[] = [];

      for (const plan of planAccounts) {
        const rawAccounts = await connection.getProgramAccounts(
          program.programId,
          {
            filters: [
              { dataSize: 173 },
              { memcmp: { offset: 8, bytes: plan.publicKey.toBase58() } },
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
        setEvents([]);
        setUsingMock(false);
        return;
      }

      const subscriptionState = new Map(
        allSubs.map((a) => [a.publicKey.toBase58(), a.account]),
      );

      const parser = new EventParser(program.programId, program.coder);
      const signatures = await fetchProgramSignatures(
        connection,
        program.programId,
      );
      const transactions = await Promise.all(
        signatures.map(async ({ signature }) => {
          const tx = await connection.getTransaction(signature, {
            commitment: "confirmed",
            maxSupportedTransactionVersion: 0,
          });
          return { signature, tx };
        }),
      );

      const entries: LogEntry[] = [];

      transactions.forEach(({ signature, tx }) => {
        const logMessages = tx?.meta?.logMessages;
        if (!logMessages?.length) return;

        let eventIndex = 0;
        for (const parsed of parser.parseLogs(logMessages)) {
          const eventName = parsed.name;
          const event = parsed.data as Record<string, unknown>;
          const planPubkey = event.plan?.toString?.() ?? "";
          if (!merchantPlanPubkeys.has(planPubkey)) continue;

          const subscriptionPubkey = event.subscription?.toString?.() ?? "";
          const state = subscriptionState.get(subscriptionPubkey);
          const timestamp = bnToNumber(event.timestamp);
          const paymentCount =
            bnToNumber(event.paymentCount) || bnToNumber(state?.paymentCount);
          const totalPaid = microToUsdc(bnToNumber(state?.totalPaid));

          const base = {
            id: `${signature}-${eventName}-${eventIndex++}`,
            subscriber: event.subscriber?.toString?.() ?? "",
            plan: planNames[planPubkey] ?? planPubkey.slice(0, 8) + "...",
            planPubkey,
            amountUsdc:
              eventName === "PaymentExecuted" ||
              eventName === "SubscriptionCreated"
                ? microToUsdc(bnToNumber(event.amountUsdc))
                : 0,
            totalPaid,
            paymentCount,
            status: eventName,
            timestamp: unixToDate(timestamp),
            timestampUnix: timestamp > 0 ? timestamp * 1000 : 0,
            raw: subscriptionPubkey,
          };

          if (eventName === "PaymentExecuted") {
            entries.push({ ...base, type: "PaymentExecuted" });
          } else if (eventName === "PaymentFailed") {
            entries.push({ ...base, type: "PaymentFailed" });
          } else if (eventName === "SubscriptionCreated") {
            entries.push({ ...base, type: "SubscriptionCreated" });
          } else if (eventName === "SubscriptionPaused") {
            entries.push({ ...base, type: "SubscriptionPaused" });
          } else if (eventName === "SubscriptionCancelled") {
            entries.push({ ...base, type: "SubscriptionCancelled" });
          } else if (eventName === "SubscriptionExpired") {
            entries.push({ ...base, type: "SubscriptionExpired" });
          }
        }
      });

      if (entries.length === 0) {
        allSubs.forEach((a: any) => {
          const acc = a.account;
          const planPk = acc.plan.toBase58();
          const subPk = a.publicKey.toBase58();
          const startedAt = bnToNumber(acc.startedAt);
          const lastPaidAt = bnToNumber(acc.lastPaidAt);
          const lastFailedAt = bnToNumber(acc.lastFailedAt);
          const endedAt = bnToNumber(acc.endedAt);
          const paymentCount = bnToNumber(acc.paymentCount);
          const totalFailures = bnToNumber(acc.totalFailures);
          const base = {
            subscriber: acc.subscriber.toBase58(),
            plan: planNames[planPk] ?? planPk.slice(0, 8) + "...",
            planPubkey: planPk,
            amountUsdc: microToUsdc(acc.amountUsdc),
            totalPaid: microToUsdc(acc.totalPaid),
            paymentCount,
            status: Object.keys(acc.status ?? {})[0] ?? "active",
            raw: subPk,
          };

          if (startedAt > 0) {
            entries.push({
              ...base,
              id: `${subPk}-created`,
              type: "SubscriptionCreated",
              timestamp: unixToDate(startedAt),
              timestampUnix: startedAt * 1000,
            });
          }

          if (paymentCount > 0 && lastPaidAt > 0) {
            entries.push({
              ...base,
              id: `${subPk}-paid-${lastPaidAt}`,
              type: "PaymentExecuted",
              timestamp: unixToDate(lastPaidAt),
              timestampUnix: lastPaidAt * 1000,
            });
          }

          if (totalFailures > 0 && lastFailedAt > 0) {
            entries.push({
              ...base,
              id: `${subPk}-failed-${lastFailedAt}`,
              type: "PaymentFailed",
              timestamp: unixToDate(lastFailedAt),
              timestampUnix: lastFailedAt * 1000,
            });
          }

          if (acc.status?.cancelled !== undefined) {
            const cancelledAt = endedAt > 0 ? endedAt : startedAt;
            entries.push({
              ...base,
              id: `${subPk}-cancelled-${cancelledAt}`,
              type: "SubscriptionCancelled",
              timestamp: unixToDate(cancelledAt),
              timestampUnix: cancelledAt > 0 ? cancelledAt * 1000 : 0,
            });
          }

          if (acc.status?.paused !== undefined) {
            const pausedAt = lastPaidAt > 0 ? lastPaidAt : startedAt;
            entries.push({
              ...base,
              id: `${subPk}-paused-${pausedAt}`,
              type: "SubscriptionPaused",
              timestamp: unixToDate(pausedAt),
              timestampUnix: pausedAt > 0 ? pausedAt * 1000 : 0,
            });
          }

          if (acc.status?.expired !== undefined) {
            const expiredAt = endedAt > 0 ? endedAt : lastFailedAt || startedAt;
            entries.push({
              ...base,
              id: `${subPk}-expired-${expiredAt}`,
              type: "SubscriptionExpired",
              timestamp: unixToDate(expiredAt),
              timestampUnix: expiredAt > 0 ? expiredAt * 1000 : 0,
            });
          }
        });
      }

      const sorted = entries.sort((a, b) => {
        const aTs = a.timestampUnix ?? (Date.parse(a.timestamp) || 0);
        const bTs = b.timestampUnix ?? (Date.parse(b.timestamp) || 0);
        return bTs - aTs;
      });

      setEvents(sorted);
      setUsingMock(false);
    } catch (error) {
      console.warn("[useMerchantActivity] fetch failed:", error);
      setEvents([]);
      setUsingMock(false);
    } finally {
      setLoading(false);
    }
  }, [connected, enabled, program, publicKey]);

  useEffect(() => {
    void fetchActivity();
  }, [fetchActivity]);

  return { events, loading, usingMock, refetch: fetchActivity };
}
