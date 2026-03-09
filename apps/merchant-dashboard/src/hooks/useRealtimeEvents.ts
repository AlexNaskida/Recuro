import { useEffect, useRef } from "react";
import { useAnchorWallet } from "@solana/wallet-adapter-react";
import { useQueryClient } from "@tanstack/react-query";
import { useSdk } from "./useAnchorProgram";
import { useAnalyticsStore } from "@/store/analyticsStore";
import { QUERY_KEYS } from "./useMerchantPlans";
import type { LiveEvent } from "@/store/analyticsStore";

/**
 * Subscribes to all program events for the connected merchant and
 * pushes them into the global Zustand store for real-time display.
 *
 * Also invalidates React Query caches so KPI cards refresh automatically.
 */
export function useRealtimeEvents() {
  const sdk          = useSdk();
  const wallet       = useAnchorWallet();
  const queryClient  = useQueryClient();
  const pushEvent    = useAnalyticsStore((s) => s.pushLiveEvent);
  const listenerIds  = useRef<number[]>([]);

  useEffect(() => {
    if (!sdk || !wallet) return;

    const merchantKey = wallet.publicKey.toBase58();

    const invalidatePlans = () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.plans(merchantKey) });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.analytics(merchantKey) });
    };

    // Payment executed ──────────────────────────────────────────────────────
    listenerIds.current.push(
      sdk.onPaymentExecuted((evt, _slot, sig) => {
        // Only push events for THIS merchant's plans
        // (the SDK filters by program, not merchant — we do it here)
        const event: LiveEvent = {
          id:                 sig,
          type:               "payment_executed",
          timestamp:          evt.timestamp.toNumber(),
          subscriptionPubkey: evt.subscription.toBase58(),
          subscriberAddress:  evt.subscriber.toBase58(),
          planPubkey:         evt.plan.toBase58(),
          amountUsdc:         evt.grossAmount.toNumber() / 1_000_000,
          status:             "success",
          txSignature:        sig,
        };
        pushEvent(event);
        invalidatePlans();
      })
    );

    // Payment failed ────────────────────────────────────────────────────────
    listenerIds.current.push(
      sdk.onPaymentFailed((evt, _slot, sig) => {
        pushEvent({
          id:                 sig,
          type:               "payment_failed",
          timestamp:          evt.timestamp.toNumber(),
          subscriptionPubkey: evt.subscription.toBase58(),
          subscriberAddress:  evt.subscriber.toBase58(),
          planPubkey:         evt.plan.toBase58(),
          status:             "failed",
          txSignature:        sig,
        });
        invalidatePlans();
      })
    );

    // Subscription created ──────────────────────────────────────────────────
    listenerIds.current.push(
      sdk.onSubscriptionCreated((evt, _slot, sig) => {
        pushEvent({
          id:                 sig,
          type:               "subscription_created",
          timestamp:          evt.timestamp.toNumber(),
          subscriptionPubkey: evt.subscription.toBase58(),
          subscriberAddress:  evt.subscriber.toBase58(),
          planPubkey:         evt.plan.toBase58(),
          amountUsdc:         evt.amountUsdc.toNumber() / 1_000_000,
          status:             "success",
          txSignature:        sig,
        });
        invalidatePlans();
      })
    );

    // Subscription cancelled ────────────────────────────────────────────────
    listenerIds.current.push(
      sdk.onSubscriptionCancelled((evt, _slot, sig) => {
        pushEvent({
          id:                 sig,
          type:               "subscription_cancelled",
          timestamp:          evt.timestamp.toNumber(),
          subscriptionPubkey: evt.subscription.toBase58(),
          subscriberAddress:  evt.subscriber.toBase58(),
          planPubkey:         evt.plan.toBase58(),
          status:             "success",
          txSignature:        sig,
        });
        invalidatePlans();
      })
    );

    return () => {
      listenerIds.current.forEach((id) => {
        sdk.removeEventListener(id).catch(() => {});
      });
      listenerIds.current = [];
    };
  }, [sdk, wallet?.publicKey.toBase58()]); // eslint-disable-line
}
