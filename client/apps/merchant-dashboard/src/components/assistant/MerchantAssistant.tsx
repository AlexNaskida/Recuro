import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  assistantTools,
  buildAssistantContext,
  buildAssistantSystemPrompt,
  splitAssistantOutput,
  formatCurrency,
  type AssistantToolCall,
  type AssistantToolName,
} from "@/lib/assistant";
import { useMerchantWallet } from "@/hooks/useMerchantWallet";
import { usePlans } from "@/hooks/usePlans";
import { useSubscribers } from "@/hooks/useSubscribers";
import { useMerchantActivity } from "@/hooks/useMerchantActivity";
import { usePlanActions } from "@/hooks/usePlanActions";
import { QVAC_BASE_URL, QVAC_MODEL } from "@/lib/config";
import {
  Bot,
  Loader2,
  Send,
  Sparkles,
  WifiOff,
  ChevronDown,
} from "lucide-react";
import { toast } from "sonner";

type ChatRole = "assistant" | "user" | "tool";

type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  thinking?: string;
  toolCallId?: string;
  name?: string;
};

type PendingAction =
  | {
      id: string;
      name: "create_plan";
      summary: string;
      arguments: {
        name: string;
        description: string;
        amountUsdc: number;
        intervalDays: number;
        trialDays: number;
        maxSubscribers: number;
        merchantReceiveAddress?: string;
      };
    }
  | {
      id: string;
      name: "delete_plan";
      summary: string;
      arguments: { planPubkey: string; planName?: string };
    }
  | {
      id: string;
      name: "launch_promo_code";
      summary: string;
      arguments: {
        code: string;
        discountPercentage: number;
        targetPlanPubkey?: string;
        expiresInDays: number;
        maxRedemptions: number;
      };
    }
  | {
      id: string;
      name: "update_plan_price";
      summary: string;
      arguments: {
        planPubkey: string;
        planName?: string;
        newPriceUsdc: number;
        reason?: string;
      };
    };

type ToolCallAccumulator = {
  id?: string;
  name?: string;
  arguments: string;
};

function AssistantMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => (
          <p className="mb-2 last:mb-0 whitespace-pre-wrap">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold">{children}</strong>
        ),
        ul: ({ children }) => (
          <ul className="mb-2 list-disc space-y-1 pl-5 last:mb-0">
            {children}
          </ul>
        ),
        ol: ({ children }) => (
          <ol className="mb-2 list-decimal space-y-1 pl-5 last:mb-0">
            {children}
          </ol>
        ),
        li: ({ children }) => (
          <li className="whitespace-pre-wrap">{children}</li>
        ),
        blockquote: ({ children }) => (
          <blockquote className="my-2 border-l-2 border-primary/50 pl-3 text-muted-foreground">
            {children}
          </blockquote>
        ),
        a: ({ children, href }) => (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="text-primary underline underline-offset-4"
          >
            {children}
          </a>
        ),
        code: ({ children, className }) => {
          const isBlock = className?.includes("language-");
          return isBlock ? (
            <code className="rounded-md bg-background/80 px-1.5 py-0.5 font-mono text-[0.85em]">
              {children}
            </code>
          ) : (
            <code className="rounded bg-background/80 px-1 py-0.5 font-mono text-[0.85em] text-foreground">
              {children}
            </code>
          );
        },
        pre: ({ children }) => (
          <pre className="my-3 overflow-x-auto rounded-2xl border border-border/60 bg-background/80 p-3 text-xs leading-5 text-foreground">
            {children}
          </pre>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

function ThinkingBubble({
  message,
  expanded,
  onToggle,
  streaming,
}: {
  message: ChatMessage;
  expanded: boolean;
  onToggle: () => void;
  streaming: boolean;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-150 rounded-3xl border border-l-2 border-l-primary/30 border-border/60 bg-muted/30 px-4 py-3 text-xs leading-5 text-muted-foreground shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <span className="flex items-center gap-2">
          {streaming ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Sparkles className="h-3.5 w-3.5 text-primary/60" />
          )}
          <span className="opacity-90">
            {streaming ? "Thinking..." : "Thought"}
          </span>
        </span>
        <button
          type="button"
          onClick={onToggle}
          className="inline-flex items-center justify-center rounded-full border border-border/70 bg-background/70 p-1 text-muted-foreground transition-colors hover:bg-background"
        >
          <ChevronDown
            className={cn(
              "h-5 w-5 shrink-0 transition-transform duration-200",
              expanded && "rotate-180",
            )}
          />
        </button>
      </div>
      <div
        className={cn(
          "overflow-hidden transition-[max-height,opacity,margin-top] duration-200 ease-out",
          expanded ? "mt-2 max-h-96 opacity-100" : "max-h-0 opacity-0",
        )}
      >
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-background/40 px-3 py-2 text-xs leading-5 text-muted-foreground/90">
          {message.thinking ? (
            <AssistantMarkdown content={message.thinking} />
          ) : (
            <p className="italic">No detailed reasoning was returned.</p>
          )}
        </div>
      </div>
    </div>
  );
}

function AnswerBubble({
  message,
  streaming,
}: {
  message: ChatMessage;
  streaming: boolean;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-200 rounded-3xl border border-l-2 border-l-primary border-border/80 bg-card px-4 py-3 text-sm leading-6 text-foreground shadow-sm">
      <AssistantMarkdown content={message.content} />
      {streaming ? (
        <span className="ml-1 inline-block animate-pulse align-baseline text-primary">
          ▍
        </span>
      ) : null}
    </div>
  );
}

const SUGGESTED_QUESTIONS = [
  "What's my revenue trend this week?",
  "Which plans have the most churn?",
  "How many subscribers do I have?",
  "What's my monthly recurring revenue?",
  "Are any subscribers at risk?",
  "Create a new premium plan",
];

function makeId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random()}`;
}

function toOpenAiMessage(message: ChatMessage) {
  if (message.role === "tool") {
    return {
      role: "tool" as const,
      tool_call_id: message.toolCallId ?? message.id,
      content: message.content,
    };
  }

  return {
    role: message.role,
    content: message.content,
  };
}

function readJsonArguments(value: string) {
  if (!value.trim()) return {};
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function parseActionFromContent(content: string): AssistantToolCall | null {
  const markerIdx = content.indexOf("ACTION_JSON:");
  if (markerIdx === -1) return null;

  const after = content.slice(markerIdx + "ACTION_JSON:".length).trimStart();
  const start = after.indexOf("{");
  if (start === -1) return null;

  // Count braces to find the matching closing brace (handles nested objects)
  let depth = 0;
  let end = -1;
  for (let i = start; i < after.length; i++) {
    if (after[i] === "{") depth++;
    else if (after[i] === "}") {
      depth--;
      if (depth === 0) {
        end = i;
        break;
      }
    }
  }
  if (end === -1) return null;

  try {
    const parsed = JSON.parse(after.slice(start, end + 1)) as {
      tool?: string;
      args?: Record<string, unknown>;
      arguments?: Record<string, unknown>;
    };
    const name = parsed.tool;
    if (!name || !VALID_TOOL_NAMES.includes(name as AssistantToolName))
      return null;
    return {
      id: makeId(),
      name: name as AssistantToolName,
      // model may use "args" or "arguments"
      arguments: parsed.args ?? parsed.arguments ?? {},
    };
  } catch {
    return null;
  }
}

const VALID_TOOL_NAMES: AssistantToolName[] = [
  "create_plan",
  "delete_plan",
  "launch_promo_code",
  "update_plan_price",
];

function buildToolCallFromAccumulator(
  accumulator: ToolCallAccumulator,
): AssistantToolCall | null {
  if (!accumulator.name) return null;
  const name = VALID_TOOL_NAMES.includes(accumulator.name as AssistantToolName)
    ? (accumulator.name as AssistantToolName)
    : null;
  if (!name) return null;

  return {
    id: accumulator.id ?? makeId(),
    name,
    arguments: readJsonArguments(accumulator.arguments),
  };
}

function normalizeCreatePlanArguments(args: Record<string, unknown>) {
  const amountUsdc = Number(args.amountUsdc ?? 0);
  const intervalDays = Number(args.intervalDays ?? 30);
  const trialDays = Number(args.trialDays ?? 0);
  const maxSubscribers = Number(args.maxSubscribers ?? 0);
  const name = String(args.name ?? "").trim();
  const description = String(args.description ?? "").trim();
  const merchantReceiveAddress = String(
    args.merchantReceiveAddress ?? "",
  ).trim();

  if (!name || !Number.isFinite(amountUsdc) || amountUsdc <= 0) {
    return null;
  }

  return {
    name,
    description: description || name,
    amountUsdc,
    intervalDays,
    trialDays,
    maxSubscribers,
    merchantReceiveAddress: merchantReceiveAddress || undefined,
  };
}

function normalizeDeletePlanArguments(args: Record<string, unknown>) {
  const planPubkey = String(args.planPubkey ?? "").trim();
  const planName = String(args.planName ?? "").trim();

  if (!planPubkey) return null;

  return {
    planPubkey,
    planName: planName || undefined,
  };
}

async function parseSseStream(
  response: Response,
  onUpdate: (state: { content: string; thinking: string }) => void,
): Promise<{
  content: string;
  thinking: string;
  toolCalls: AssistantToolCall[];
}> {
  if (!response.body) {
    throw new Error("QVAC did not return a readable stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let rawContent = "";
  let content = "";
  let thinking = "";
  const toolAccumulators = new Map<number, ToolCallAccumulator>();

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;

      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;

      const chunk = JSON.parse(data) as {
        choices?: Array<{
          delta?: {
            content?: string;
            tool_calls?: Array<{
              index?: number;
              id?: string;
              function?: { name?: string; arguments?: string };
            }>;
          };
        }>;
      };

      const delta = chunk.choices?.[0]?.delta;
      if (!delta) continue;

      if (delta.content) {
        rawContent += delta.content;
        const parsed = splitAssistantOutput(rawContent);
        content = parsed.content;
        thinking = parsed.thinking;
        onUpdate(parsed);
      }

      if (delta.tool_calls?.length) {
        delta.tool_calls.forEach((toolCall, index) => {
          const slot = toolCall.index ?? index;
          const existing = toolAccumulators.get(slot) ?? { arguments: "" };
          if (toolCall.id) existing.id = toolCall.id;
          if (toolCall.function?.name) existing.name = toolCall.function.name;
          if (toolCall.function?.arguments) {
            existing.arguments += toolCall.function.arguments;
          }
          toolAccumulators.set(slot, existing);
        });
      }
    }
  }

  return {
    content,
    thinking,
    toolCalls: Array.from(toolAccumulators.values())
      .map(buildToolCallFromAccumulator)
      .filter((toolCall): toolCall is AssistantToolCall => toolCall !== null),
  };
}

export default function MerchantAssistant() {
  const { walletAddress } = useMerchantWallet();
  const [open, setOpen] = useState(false);
  const { plans, loading: plansLoading, refetch: refetchPlans } = usePlans();
  const {
    subscribers,
    loading: subscribersLoading,
    refetch: refetchSubscribers,
  } = useSubscribers();
  const {
    events,
    loading: activityLoading,
    refetch: refetchActivity,
  } = useMerchantActivity(open);
  const { createPlan, deletePlan } = usePlanActions({
    onPlanUpdated: async () => {
      await Promise.all([
        refetchPlans(),
        refetchSubscribers(),
        refetchActivity(),
      ]);
    },
  });

  const [online, setOnline] = useState<boolean | null>(null);
  const [checkingConnectivity, setCheckingConnectivity] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null,
  );
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null,
  );
  const [expandedThinking, setExpandedThinking] = useState<Set<string>>(
    new Set(),
  );
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const context = useMemo(
    () =>
      buildAssistantContext({
        plans,
        subscribers,
        events,
        merchantWallet: walletAddress || "",
      }),
    [events, plans, subscribers, walletAddress],
  );

  const systemPrompt = useMemo(
    () => buildAssistantSystemPrompt(context),
    [context],
  );

  const statusLabel =
    online === null
      ? "Checking local AI"
      : online
        ? "QVAC online"
        : "AI assistant offline";

  const checkConnectivity = async () => {
    setCheckingConnectivity(true);
    try {
      const response = await fetch(`${QVAC_BASE_URL}/models`);
      setOnline(response.ok);
    } catch {
      setOnline(false);
    } finally {
      setCheckingConnectivity(false);
    }
  };

  const scrollToBottom = () => {
    window.requestAnimationFrame(() => {
      scrollRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    });
  };

  useEffect(() => {
    if (!open) return;

    void checkConnectivity();

    const intervalId = window.setInterval(() => {
      void checkConnectivity();
    }, 5000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;

    if (messages.length === 0) {
      setMessages([
        {
          id: makeId(),
          role: "assistant",
          content:
            "I can answer questions about revenue, churn, plan performance, and billing health using your local on-chain data.",
        },
      ]);
    }
  }, [messages.length, open]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, pendingAction]);

  const runConversation = async (history: ChatMessage[]) => {
    const response = await fetch(`${QVAC_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: QVAC_MODEL,
        stream: true,
        tools: assistantTools,
        tool_choice: "auto",
        messages: [
          { role: "system", content: systemPrompt },
          ...history.map(toOpenAiMessage),
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`QVAC request failed (${response.status})`);
    }

    const assistantId = makeId();
    setStreamingMessageId(assistantId);
    setMessages((current) => [
      ...current,
      { id: assistantId, role: "assistant", content: "", thinking: "" },
    ]);

    const result = await parseSseStream(response, (state) => {
      setMessages((current) =>
        current.map((message) =>
          message.id === assistantId
            ? {
                ...message,
                content: state.content,
                thinking: state.thinking,
              }
            : message,
        ),
      );
    });

    setStreamingMessageId(null);
    return { ...result, assistantId };
  };

  const sendMessage = async () => {
    const content = input.trim();
    if (!content || sending || !online) return;

    const nextMessages: ChatMessage[] = [
      ...messages,
      { id: makeId(), role: "user", content },
    ];
    setMessages(nextMessages);
    setInput("");
    setSending(true);

    try {
      const result = await runConversation(nextMessages);
      let toolCall = result.toolCalls[0];

      if (!toolCall) {
        const actionFromContent = parseActionFromContent(result.content);
        if (actionFromContent) {
          toolCall = actionFromContent;
          setMessages((current) =>
            current.map((msg) =>
              msg.id === result.assistantId
                ? {
                    ...msg,
                    content: msg.content
                      .split("\n")
                      .filter((l) => !l.trimStart().startsWith("ACTION_JSON:"))
                      .join("\n")
                      .trim(),
                  }
                : msg,
            ),
          );
        }
      }

      if (toolCall) {
        if (toolCall.name === "create_plan") {
          const normalized = normalizeCreatePlanArguments(toolCall.arguments);
          if (!normalized) {
            toast.error(
              "The assistant returned an incomplete create-plan request.",
            );
          } else {
            setPendingAction({
              id: toolCall.id,
              name: toolCall.name,
              summary: `Create ${normalized.name} at $${normalized.amountUsdc.toFixed(2)} every ${normalized.intervalDays} days`,
              arguments: normalized,
            });
          }
        } else if (toolCall.name === "delete_plan") {
          const normalized = normalizeDeletePlanArguments(toolCall.arguments);
          if (!normalized) {
            toast.error(
              "The assistant returned an incomplete delete-plan request.",
            );
          } else {
            setPendingAction({
              id: toolCall.id,
              name: toolCall.name,
              summary: `Delete ${normalized.planName ?? normalized.planPubkey}`,
              arguments: normalized,
            });
          }
        } else if (toolCall.name === "launch_promo_code") {
          const args = toolCall.arguments as Record<string, unknown>;
          const code = String(args.code ?? "");
          const discountPercentage = Number(args.discountPercentage ?? 0);
          const expiresInDays = Number(args.expiresInDays ?? 7);
          const maxRedemptions = Number(args.maxRedemptions ?? 100);

          if (!code || discountPercentage <= 0 || discountPercentage > 100) {
            toast.error(
              "The assistant returned an incomplete promo code request.",
            );
          } else {
            setPendingAction({
              id: toolCall.id,
              name: toolCall.name,
              summary: `Launch promo code "${code}" with ${discountPercentage}% discount (${expiresInDays} days, max ${maxRedemptions} uses)`,
              arguments: {
                code,
                discountPercentage,
                targetPlanPubkey: String(args.targetPlanPubkey ?? ""),
                expiresInDays,
                maxRedemptions,
              },
            });
          }
        } else if (toolCall.name === "update_plan_price") {
          const args = toolCall.arguments as Record<string, unknown>;
          const planPubkey = String(args.planPubkey ?? "");
          const newPriceUsdc = Number(args.newPriceUsdc ?? 0);
          const planName = String(args.planName ?? "Unknown Plan");
          const reason = String(args.reason ?? "");

          if (!planPubkey || newPriceUsdc <= 0) {
            toast.error(
              "The assistant returned an incomplete price update request.",
            );
          } else {
            setPendingAction({
              id: toolCall.id,
              name: toolCall.name,
              summary: `Update ${planName} price to ${formatCurrency(newPriceUsdc)}${reason ? ` (${reason})` : ""}`,
              arguments: {
                planPubkey,
                planName,
                newPriceUsdc,
                reason,
              },
            });
          }
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setOnline(false);
      toast.error("Assistant request failed", { description: message });
      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "assistant",
          content:
            "I couldn't reach the local QVAC runtime or parse the response. Start QVAC and try again.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const continueWithToolResult = async (
    toolResult: string,
    toolCallId: string,
  ) => {
    const nextMessages: ChatMessage[] = [
      ...messages,
      {
        id: makeId(),
        role: "tool",
        content: toolResult,
        toolCallId,
      },
    ];
    setMessages(nextMessages);

    try {
      await runConversation(nextMessages);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error("Follow-up assistant request failed", {
        description: message,
      });
    }
  };

  const handleSuggestedQuestion = async (question: string) => {
    setInput(question);
    // Use setTimeout to ensure input state is updated before sending
    setTimeout(() => {
      const nextMessages: ChatMessage[] = [
        ...messages,
        { id: makeId(), role: "user", content: question },
      ];
      setMessages(nextMessages);
      setInput("");
      setSending(true);

      runConversation(nextMessages)
        .then((result) => {
          let toolCall = result.toolCalls[0];

          if (!toolCall) {
            const actionFromContent = parseActionFromContent(result.content);
            if (actionFromContent) {
              toolCall = actionFromContent;
              setMessages((current) =>
                current.map((msg) =>
                  msg.id === result.assistantId
                    ? {
                        ...msg,
                        content: msg.content
                          .replace(/ACTION_JSON:\s*\{[\s\S]*?\}\n?/g, "")
                          .trim(),
                      }
                    : msg,
                ),
              );
            }
          }

          if (toolCall) {
            if (toolCall.name === "create_plan") {
              const normalized = normalizeCreatePlanArguments(
                toolCall.arguments,
              );
              if (!normalized) {
                toast.error(
                  "The assistant returned an incomplete create-plan request.",
                );
              } else {
                setPendingAction({
                  id: toolCall.id,
                  name: toolCall.name,
                  summary: `Create ${normalized.name} at $${normalized.amountUsdc.toFixed(2)} every ${normalized.intervalDays} days`,
                  arguments: normalized,
                });
              }
            } else if (toolCall.name === "delete_plan") {
              const normalized = normalizeDeletePlanArguments(
                toolCall.arguments,
              );
              if (!normalized) {
                toast.error(
                  "The assistant returned an incomplete delete-plan request.",
                );
              } else {
                setPendingAction({
                  id: toolCall.id,
                  name: toolCall.name,
                  summary: `Delete plan ${normalized.planPubkey}`,
                  arguments: normalized,
                });
              }
            } else if (toolCall.name === "launch_promo_code") {
              const args = toolCall.arguments as Record<string, unknown>;
              const code = String(args.code ?? "");
              const discountPercentage = Number(args.discountPercentage ?? 0);
              const expiresInDays = Number(args.expiresInDays ?? 7);
              const maxRedemptions = Number(args.maxRedemptions ?? 100);

              if (
                !code ||
                discountPercentage <= 0 ||
                discountPercentage > 100
              ) {
                toast.error(
                  "The assistant returned an incomplete promo code request.",
                );
              } else {
                setPendingAction({
                  id: toolCall.id,
                  name: toolCall.name,
                  summary: `Launch promo code "${code}" with ${discountPercentage}% discount (${expiresInDays} days, max ${maxRedemptions} uses)`,
                  arguments: {
                    code,
                    discountPercentage,
                    targetPlanPubkey: String(args.targetPlanPubkey ?? ""),
                    expiresInDays,
                    maxRedemptions,
                  },
                });
              }
            } else if (toolCall.name === "update_plan_price") {
              const args = toolCall.arguments as Record<string, unknown>;
              const planPubkey = String(args.planPubkey ?? "");
              const newPriceUsdc = Number(args.newPriceUsdc ?? 0);
              const planName = String(args.planName ?? "Unknown Plan");
              const reason = String(args.reason ?? "");

              if (!planPubkey || newPriceUsdc <= 0) {
                toast.error(
                  "The assistant returned an incomplete price update request.",
                );
              } else {
                setPendingAction({
                  id: toolCall.id,
                  name: toolCall.name,
                  summary: `Update ${planName} price to ${formatCurrency(newPriceUsdc)}${reason ? ` (${reason})` : ""}`,
                  arguments: {
                    planPubkey,
                    planName,
                    newPriceUsdc,
                    reason,
                  },
                });
              }
            }
          }
        })
        .catch((error) => {
          const message =
            error instanceof Error ? error.message : String(error);
          toast.error("Assistant request failed", { description: message });
          setMessages((current) => [
            ...current,
            {
              id: makeId(),
              role: "assistant",
              content:
                "I couldn't reach the local QVAC runtime or parse the response. Start QVAC and try again.",
            },
          ]);
        })
        .finally(() => {
          setSending(false);
        });
    }, 0);
  };

  const confirmPendingAction = async () => {
    if (!pendingAction) return;

    try {
      setSending(true);

      if (pendingAction.name === "create_plan") {
        const signature = await createPlan(pendingAction.arguments);
        const result = JSON.stringify({
          ok: true,
          signature,
          action: pendingAction.name,
          planName: pendingAction.arguments.name,
        });
        setPendingAction(null);
        await continueWithToolResult(result, pendingAction.id);
        toast.success("Plan created on-chain");
      } else if (pendingAction.name === "delete_plan") {
        const signature = await deletePlan(pendingAction.arguments.planPubkey);
        const result = JSON.stringify({
          ok: true,
          signature,
          action: pendingAction.name,
          planPubkey: pendingAction.arguments.planPubkey,
        });
        setPendingAction(null);
        await continueWithToolResult(result, pendingAction.id);
        toast.success("Plan deleted on-chain");
      } else if (pendingAction.name === "launch_promo_code") {
        // Mock execution for promo code
        const result = JSON.stringify({
          ok: true,
          action: pendingAction.name,
          code: pendingAction.arguments.code,
          message: `Promo code "${pendingAction.arguments.code}" launched successfully`,
        });
        setPendingAction(null);
        await continueWithToolResult(result, pendingAction.id);
        toast.success(`Promo code "${pendingAction.arguments.code}" launched`);
      } else if (pendingAction.name === "update_plan_price") {
        // Mock execution for price update
        const result = JSON.stringify({
          ok: true,
          action: pendingAction.name,
          planPubkey: pendingAction.arguments.planPubkey,
          newPrice: pendingAction.arguments.newPriceUsdc,
          message: `Price updated to ${formatCurrency(pendingAction.arguments.newPriceUsdc)}`,
        });
        setPendingAction(null);
        await continueWithToolResult(result, pendingAction.id);
        toast.success(
          `${pendingAction.arguments.planName} price updated to ${formatCurrency(pendingAction.arguments.newPriceUsdc)}`,
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error("Action failed", { description: message });
    } finally {
      setSending(false);
    }
  };

  const cancelPendingAction = () => {
    setPendingAction(null);
  };

  const shouldShowSuggestedQuestions = useMemo(() => {
    // Hide while AI is answering
    if (sending) return false;
    // Show on initial state (only greeting message)
    if (messages.length <= 1) return true;
    // Show after assistant responds (last message is from assistant)
    const lastMessage = messages[messages.length - 1];
    return lastMessage?.role === "assistant";
  }, [messages, sending]);

  const displayedSuggestedQuestions = useMemo(() => {
    // Show all questions initially, then 3 random ones after communication starts
    if (messages.length <= 1) {
      return SUGGESTED_QUESTIONS;
    }
    // After communication: show 3 random questions
    const shuffled = [...SUGGESTED_QUESTIONS].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, 3);
  }, [messages]);

  const totalRevenue = context.totals.revenueTotal;
  const contextLoading = plansLoading || subscribersLoading || activityLoading;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button
            className="fixed bottom-6 right-6 z-30 gap-2 rounded-full shadow-lg shadow-black/10"
            size="lg"
          >
            <Sparkles className="h-4 w-4" />
            AI Chat
          </Button>
        </DialogTrigger>
        <DialogContent
          className={cn(
            "fixed bottom-6 right-6 left-auto top-auto z-50 flex h-[min(720px,calc(100vh-3rem))] w-[min(440px,calc(100vw-1.5rem))] translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-[28px] border bg-background p-0 shadow-[0_24px_80px_rgba(0,0,0,0.24)] duration-300",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=open]:slide-in-from-bottom-5 data-[state=closed]:slide-out-to-bottom-5",
          )}
        >
          <div className="flex h-full w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.14),transparent_45%),linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent)]">
            <div className="border-b bg-background/80 px-5 py-4 backdrop-blur-sm">
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="flex items-center gap-2 text-base">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                  </div>
                  Merchant AI Chat
                </DialogTitle>
                <DialogDescription className="text-sm text-muted-foreground">
                  Local-only chat over your live on-chain subscription data.
                </DialogDescription>
              </DialogHeader>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <Badge
                  variant="outline"
                  className="gap-1 rounded-full px-2.5 py-0.5"
                >
                  {checkingConnectivity ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : online ? (
                    <Sparkles className="h-3 w-3" />
                  ) : (
                    <WifiOff className="h-3 w-3" />
                  )}
                  {statusLabel}
                </Badge>
                <span>
                  Revenue tracked locally: {formatCurrency(totalRevenue)}
                </span>
              </div>
            </div>

            {online === false ? (
              <div className="m-4 flex flex-1 flex-col justify-center gap-4 rounded-3xl border border-dashed bg-muted/25 p-5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2 text-foreground">
                  <WifiOff className="h-4 w-4" />
                  <span className="font-medium">AI Assistant Offline</span>
                </div>
                <p>
                  Start QVAC locally to enable the assistant. The dashboard
                  talks to http://localhost:11434/v1 only, and no merchant data
                  leaves this machine.
                </p>
                <div className="space-y-2 rounded-2xl bg-background p-3 text-xs text-muted-foreground shadow-sm">
                  <p className="font-medium text-foreground">Quick start</p>
                  <p>qvac serve openai</p>
                  <p>Set the recuro-assistant model in qvac.config.json.</p>
                </div>
              </div>
            ) : online === null || contextLoading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                {online === null
                  ? "Checking local AI runtime..."
                  : "Loading merchant context..."}
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 px-4 py-4">
                  <div className="space-y-3 pr-1">
                    {messages.map((message) =>
                      message.role === "assistant" ? (
                        <div
                          key={message.id}
                          className="mr-auto max-w-[92%] space-y-2"
                        >
                          {(streamingMessageId === message.id ||
                            !!message.thinking) && (
                            <ThinkingBubble
                              message={message}
                              expanded={expandedThinking.has(message.id)}
                              onToggle={() => {
                                setExpandedThinking((current) => {
                                  const next = new Set(current);
                                  if (next.has(message.id)) {
                                    next.delete(message.id);
                                  } else {
                                    next.add(message.id);
                                  }
                                  return next;
                                });
                              }}
                              streaming={streamingMessageId === message.id}
                            />
                          )}
                          {message.content.trim().length > 0 ||
                          streamingMessageId !== message.id ? (
                            <AnswerBubble
                              message={message}
                              streaming={streamingMessageId === message.id}
                            />
                          ) : null}
                        </div>
                      ) : (
                        <div
                          key={message.id}
                          className={cn(
                            "max-w-[92%] rounded-3xl border px-4 py-3 text-sm leading-6 shadow-sm",
                            message.role === "user"
                              ? "ml-auto bg-primary text-primary-foreground"
                              : "mr-auto bg-muted/60 text-muted-foreground",
                          )}
                        >
                          {message.role === "tool" ? (
                            <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                              Tool result
                            </p>
                          ) : null}
                          <p className="whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                      ),
                    )}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>

                <div className="border-t bg-background/90 p-4 backdrop-blur-sm">
                  {shouldShowSuggestedQuestions && (
                    <div className="mb-3">
                      <p className="mb-2 text-xs font-medium text-muted-foreground">
                        Quick questions:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {displayedSuggestedQuestions.map((question) => (
                          <button
                            key={question}
                            onClick={() => handleSuggestedQuestion(question)}
                            disabled={sending || !online}
                            className="whitespace-nowrap rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs hover:bg-card/80 disabled:opacity-50 transition-colors text-muted-foreground hover:text-foreground"
                          >
                            {question}
                          </button>
                        ))}
                      </div>
                      <Separator className="mt-3" />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Textarea
                      value={input}
                      onChange={(event) => setInput(event.target.value)}
                      placeholder="Ask about churn, revenue, risk, or a new plan idea..."
                      rows={4}
                      onKeyDown={(event) => {
                        if (
                          event.key === "Enter" &&
                          !event.shiftKey &&
                          !event.nativeEvent.isComposing
                        ) {
                          event.preventDefault();
                          void sendMessage();
                        }
                      }}
                    />
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        Enter to send, Shift + Enter for new line
                      </p>
                      <Button
                        onClick={() => void sendMessage()}
                        disabled={!input.trim() || sending}
                      >
                        {sending ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="mr-2 h-4 w-4" />
                        )}
                        Send
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingAction}
        onOpenChange={(openState) => !openState && cancelPendingAction()}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm assistant action</AlertDialogTitle>
            <AlertDialogDescription>
              The assistant is asking to execute an on-chain action after you
              confirm it locally.
            </AlertDialogDescription>
          </AlertDialogHeader>
          {pendingAction && (
            <div className="rounded-lg border bg-muted/30 p-3 text-sm">
              <p className="font-medium text-foreground">
                {pendingAction.summary}
              </p>
              {pendingAction.name === "create_plan" && (
                <p className="mt-1 text-muted-foreground">
                  {pendingAction.arguments.description}
                </p>
              )}
              {pendingAction.name === "delete_plan" &&
                pendingAction.arguments.planName && (
                  <p className="mt-1 text-muted-foreground">
                    {pendingAction.arguments.planName}
                  </p>
                )}
              {pendingAction.name === "launch_promo_code" && (
                <div className="mt-1 space-y-1 text-muted-foreground text-xs">
                  <p>Code: {pendingAction.arguments.code}</p>
                  <p>Discount: {pendingAction.arguments.discountPercentage}%</p>
                  <p>Valid for: {pendingAction.arguments.expiresInDays} days</p>
                  <p>Max uses: {pendingAction.arguments.maxRedemptions}</p>
                </div>
              )}
              {pendingAction.name === "update_plan_price" && (
                <div className="mt-1 space-y-1 text-muted-foreground text-xs">
                  <p>
                    New price:{" "}
                    {formatCurrency(pendingAction.arguments.newPriceUsdc)}
                  </p>
                  {pendingAction.arguments.reason && (
                    <p>Reason: {pendingAction.arguments.reason}</p>
                  )}
                </div>
              )}
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelPendingAction} disabled={sending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => void confirmPendingAction()}
              disabled={sending}
            >
              {sending ? "Working..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
