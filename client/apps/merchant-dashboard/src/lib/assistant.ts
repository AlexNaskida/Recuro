import type { LogEntry } from "@/lib/mock-data";
import type { Plan } from "@/hooks/usePlans";
import type { Subscriber } from "@/hooks/useSubscribers";

export type AssistantToolName =
  | "create_plan"
  | "delete_plan"
  | "launch_promo_code"
  | "update_plan_price";

export interface AssistantToolCall {
  id: string;
  name: AssistantToolName;
  arguments: Record<string, unknown>;
}

export interface AssistantContextPlan {
  name: string;
  pubkey: string;
  status: Plan["status"];
  subscribers: number;
  revenue: number;
  churnRate: number;
  paymentSuccessRate: number;
  paymentFailureRate: number;
}

export interface AssistantContext {
  generatedAt: string;
  merchantWallet: string;
  totals: {
    activeSubscribers: number;
    planCount: number;
    revenueTotal: number;
    revenueThisWeek: number;
    revenueThisMonth: number;
    churnEventsThisWeek: number;
    paymentSuccessRate: number;
    paymentFailureRate: number;
  };
  churnEventsThisWeek: Array<{
    plan: string;
    type: string;
    timestamp: string;
    subscriber: string;
  }>;
  plans: AssistantContextPlan[];
  atRiskSubscribers: Array<{
    wallet: string;
    plan: string;
    nextPayment: string;
    failedPaymentCount: number;
    totalFailures: number;
    lastPayment: string;
    riskReason: string;
  }>;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

function formatUsd(value: number): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function timestampOf(entry: LogEntry): number {
  return (entry.timestampUnix ?? Date.parse(entry.timestamp)) || 0;
}

function isActiveSubscriber(subscriber: Subscriber): boolean {
  return subscriber.status === "active";
}

export function buildAssistantContext({
  plans,
  subscribers,
  events,
  merchantWallet,
}: {
  plans: Plan[];
  subscribers: Subscriber[];
  events: LogEntry[];
  merchantWallet: string;
}): AssistantContext {
  const now = Date.now();
  const weekAgo = now - WEEK_MS;
  const monthAgo = now - MONTH_MS;

  const revenueExecuted = events.filter(
    (entry) => entry.type === "PaymentExecuted",
  );

  const revenueTotal = subscribers.reduce(
    (sum, subscriber) => sum + subscriber.totalPaid,
    0,
  );
  const revenueThisWeek = revenueExecuted
    .filter((entry) => timestampOf(entry) >= weekAgo)
    .reduce((sum, entry) => sum + entry.amountUsdc, 0);
  const revenueThisMonth = revenueExecuted
    .filter((entry) => timestampOf(entry) >= monthAgo)
    .reduce((sum, entry) => sum + entry.amountUsdc, 0);

  const churnEventsThisWeek = events
    .filter(
      (entry) =>
        timestampOf(entry) >= weekAgo &&
        (entry.type === "SubscriptionCancelled" ||
          entry.type === "SubscriptionExpired"),
    )
    .map((entry) => ({
      plan: entry.plan,
      type: entry.type,
      timestamp: entry.timestamp,
      subscriber: entry.subscriber,
    }));

  const totalSuccessfulPayments = subscribers.reduce(
    (sum, subscriber) => sum + subscriber.paymentCount,
    0,
  );
  const totalFailedPayments = subscribers.reduce(
    (sum, subscriber) =>
      sum + Math.max(subscriber.failedPaymentCount, subscriber.totalFailures),
    0,
  );
  const paymentSuccessRate =
    totalSuccessfulPayments + totalFailedPayments > 0
      ? (totalSuccessfulPayments /
          (totalSuccessfulPayments + totalFailedPayments)) *
        100
      : 0;

  const paymentFailureRate =
    totalSuccessfulPayments + totalFailedPayments > 0
      ? (totalFailedPayments /
          (totalSuccessfulPayments + totalFailedPayments)) *
        100
      : 0;

  const planMetrics = new Map<
    string,
    {
      name: string;
      status: Plan["status"];
      subscribers: number;
      revenue: number;
      churned: number;
      successCount: number;
      failureCount: number;
    }
  >();

  plans.forEach((plan) => {
    planMetrics.set(plan.pubkey, {
      name: plan.name,
      status: plan.status,
      subscribers: 0,
      revenue: 0,
      churned: 0,
      successCount: 0,
      failureCount: 0,
    });
  });

  subscribers.forEach((subscriber) => {
    const metric = planMetrics.get(subscriber.planPubkey);
    if (!metric) return;

    if (isActiveSubscriber(subscriber)) {
      metric.subscribers += 1;
    }

    if (subscriber.status === "cancelled" || subscriber.status === "expired") {
      metric.churned += 1;
    }

    metric.revenue += subscriber.totalPaid;
    metric.successCount += subscriber.paymentCount;
    metric.failureCount +=
      subscriber.failedPaymentCount || subscriber.totalFailures;
  });

  const plansSummary: AssistantContextPlan[] = plans.map((plan) => {
    const metric = planMetrics.get(plan.pubkey);
    const hasPlanPaymentData =
      !!metric && metric.successCount + metric.failureCount > 0;
    const churnRate =
      metric && metric.subscribers + metric.churned > 0
        ? (metric.churned / (metric.subscribers + metric.churned)) * 100
        : 0;
    const planSuccessRate = hasPlanPaymentData
      ? (metric.successCount / (metric.successCount + metric.failureCount)) *
        100
      : 0;

    return {
      name: plan.name,
      pubkey: plan.pubkey,
      status: plan.status,
      subscribers: metric?.subscribers ?? 0,
      revenue: metric?.revenue ?? 0,
      churnRate,
      paymentSuccessRate: planSuccessRate,
      paymentFailureRate: hasPlanPaymentData ? 100 - planSuccessRate : 0,
    };
  });

  const activeSubscribers = subscribers.filter(isActiveSubscriber).length;

  const atRiskSubscribers = subscribers
    .filter((subscriber) => subscriber.status === "active")
    .map((subscriber) => {
      const nextPaymentAt = subscriber.nextPaymentAt || 0;
      const failedPaymentCount = subscriber.failedPaymentCount || 0;
      const totalFailures = subscriber.totalFailures || 0;
      const lastPaidAt = subscriber.lastPaidAt || 0;
      const riskSignals: string[] = [];

      if (failedPaymentCount > 0 || totalFailures > 0) {
        riskSignals.push("recent failed payments");
      }

      if (nextPaymentAt > 0 && nextPaymentAt - now <= 3 * 24 * 60 * 60 * 1000) {
        riskSignals.push("next charge is due soon");
      }

      if (lastPaidAt > 0 && now - lastPaidAt > 30 * 24 * 60 * 60 * 1000) {
        riskSignals.push("long gap since last payment");
      }

      return {
        wallet: subscriber.wallet,
        plan: subscriber.plan,
        nextPayment: subscriber.nextPayment,
        failedPaymentCount,
        totalFailures,
        lastPayment: subscriber.lastPayment,
        riskReason:
          riskSignals.length > 0
            ? riskSignals.join(", ")
            : "normal billing cadence",
      };
    })
    .sort((a, b) => {
      const aScore = a.failedPaymentCount + a.totalFailures;
      const bScore = b.failedPaymentCount + b.totalFailures;
      return bScore - aScore;
    })
    .slice(0, 8);

  return {
    generatedAt: new Date(now).toISOString(),
    merchantWallet,
    totals: {
      activeSubscribers,
      planCount: plans.length,
      revenueTotal,
      revenueThisWeek,
      revenueThisMonth,
      churnEventsThisWeek: churnEventsThisWeek.length,
      paymentSuccessRate,
      paymentFailureRate,
    },
    churnEventsThisWeek,
    plans: plansSummary,
    atRiskSubscribers,
  };
}

export const assistantTools = [
  {
    type: "function" as const,
    function: {
      name: "create_plan",
      description:
        "Recommend or create a new subscription plan for the merchant after confirmation.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          description: { type: "string" },
          amountUsdc: { type: "number" },
          intervalDays: { type: "number" },
          trialDays: { type: "number" },
          maxSubscribers: { type: "number" },
          merchantReceiveAddress: { type: "string" },
        },
        required: [
          "name",
          "description",
          "amountUsdc",
          "intervalDays",
          "trialDays",
          "maxSubscribers",
        ],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "delete_plan",
      description:
        "Recommend or delete an archived plan for the merchant after confirmation.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          planPubkey: { type: "string" },
          planName: { type: "string" },
        },
        required: ["planPubkey"],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "launch_promo_code",
      description:
        "Create and launch a promotional discount code for subscribers. Requires merchant confirmation.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          code: { type: "string", description: "Promo code (e.g., SUMMER20)" },
          discountPercentage: {
            type: "number",
            description: "Discount percentage (0-100)",
          },
          targetPlanPubkey: {
            type: "string",
            description: "Plan pubkey to apply to, or empty for all plans",
          },
          expiresInDays: {
            type: "number",
            description: "How many days the code is valid",
          },
          maxRedemptions: {
            type: "number",
            description: "Max number of times code can be used",
          },
        },
        required: [
          "code",
          "discountPercentage",
          "expiresInDays",
          "maxRedemptions",
        ],
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "update_plan_price",
      description:
        "Adjust the price of an existing subscription plan. Requires merchant confirmation.",
      parameters: {
        type: "object",
        additionalProperties: false,
        properties: {
          planPubkey: { type: "string", description: "Plan to update" },
          planName: { type: "string", description: "Plan name for display" },
          newPriceUsdc: { type: "number", description: "New price in USDC" },
          reason: {
            type: "string",
            description:
              "Reason for price change (e.g., 'Reduce to increase adoption')",
          },
        },
        required: ["planPubkey", "newPriceUsdc"],
      },
    },
  },
];

export function cleanLlmOutput(text: string): string {
  // Remove thinking tags and their content
  return text.replace(/<think>[\s\S]*?<\/think>\n*/g, "").trim();
}

export function splitAssistantOutput(text: string): {
  content: string;
  thinking: string;
} {
  let remaining = text;
  let content = "";
  let thinking = "";

  while (remaining.length > 0) {
    const thinkStart = remaining.indexOf("<think>");

    if (thinkStart === -1) {
      content += remaining;
      break;
    }

    content += remaining.slice(0, thinkStart);
    const afterStart = remaining.slice(thinkStart + "<think>".length);
    const thinkEnd = afterStart.indexOf("</think>");

    if (thinkEnd === -1) {
      thinking += afterStart;
      break;
    }

    thinking += afterStart.slice(0, thinkEnd);
    remaining = afterStart.slice(thinkEnd + "</think>".length);
  }

  return {
    content: content.trim(),
    thinking: thinking.trim(),
  };
}

export function buildAssistantSystemPrompt(context: AssistantContext): string {
  return [
    "You are Recuro's local business analytics assistant for a Solana subscription merchant.",
    "Use only the context provided below and the current conversation.",
    "Never claim access to external systems, hidden databases, or third-party services.",
    "All reasoning, answers, and tool calls must stay local to the merchant's machine.",
    "When the user asks for analysis, answer with exact numbers from the context and explain the implication in plain language.",
    "If a metric is unavailable, say that it is unavailable instead of inventing it.",
    "Prefer short, direct answers with one recommendation and the key numbers that justify it.",
    "Do not mention hidden chain data you do not see in the context.",
    "Do NOT include <think> tags in your response - only provide clean, readable answers.",
    "Context JSON:",
    JSON.stringify(context, null, 2),
    "=== ACTION RULES (read carefully) ===",
    "When the user explicitly asks to create a plan, delete a plan, update a price, or launch a promo code, you MUST take action — never say you cannot do it.",
    "Preferred: call the matching tool (create_plan / delete_plan / update_plan_price / launch_promo_code).",
    "Fallback if tool calling is unavailable: output exactly one line starting with ACTION_JSON: followed by a compact JSON object, then optionally a short explanation.",
    "Interval keywords → days: daily=1, weekly=7, monthly=30, yearly=365.",
    "Defaults when not specified: description = plan name, trialDays = 0, maxSubscribers = 0.",
    'create_plan example: ACTION_JSON:{"tool":"create_plan","args":{"name":"test","description":"test","amountUsdc":30,"intervalDays":7,"trialDays":0,"maxSubscribers":0}}',
    'delete_plan example: ACTION_JSON:{"tool":"delete_plan","args":{"planPubkey":"<pubkey>","planName":"<name>"}}',
    'update_plan_price example: ACTION_JSON:{"tool":"update_plan_price","args":{"planPubkey":"<pubkey>","planName":"<name>","newPriceUsdc":25,"reason":"price adjustment"}}',
    'launch_promo_code example: ACTION_JSON:{"tool":"launch_promo_code","args":{"code":"SAVE20","discountPercentage":20,"expiresInDays":7,"maxRedemptions":100}}',
  ].join("\n\n");
}

export function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}
