import { useEffect, useMemo, useRef, useState } from "react";
import {
  useChatStorage,
  titleFromMessage,
  formatChatDate,
} from "@/hooks/useChatStorage";
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
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import QvacOnboardingModal from "@/components/QvacOnboardingModal";
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
  type ChatMessage,
  type ChatRole,
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
  History,
  Plus,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

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
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-150 w-full max-w-full overflow-hidden break-words rounded-3xl border border-l-2 border-l-primary/30 border-border/60 bg-muted/30 px-4 py-3 text-xs leading-5 text-muted-foreground shadow-sm [overflow-wrap:anywhere]">
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
        <div className="max-h-72 overflow-y-auto pr-1">
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
  displayContent,
}: {
  message: ChatMessage;
  streaming: boolean;
  displayContent?: string;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-200 w-full max-w-full overflow-hidden break-words rounded-3xl border border-l-2 border-l-primary border-border/80 bg-card px-4 py-3 text-sm leading-6 text-foreground shadow-sm [overflow-wrap:anywhere]">
      <AssistantMarkdown content={displayContent ?? message.content} />
      {streaming ? (
        <span className="ml-0.5 inline-block h-[1em] w-0.5 animate-blink bg-primary align-middle" />
      ) : null}
    </div>
  );
}

const GREETING: ChatMessage = {
  id: "greeting",
  role: "assistant",
  content:
    "I can answer questions about revenue, churn, plan performance, and billing health using your local on-chain data.",
};

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
  // Try <tool_call> XML tags first (used by some Ollama models)
  const toolCallMatch = content.match(/<tool_call>([\s\S]*?)<\/tool_call>/);
  if (toolCallMatch) {
    try {
      const parsed = JSON.parse(toolCallMatch[1].trim()) as {
        name?: string;
        arguments?: Record<string, unknown>;
      };
      const name = parsed.name;
      if (name && VALID_TOOL_NAMES.includes(name as AssistantToolName)) {
        return {
          id: makeId(),
          name: name as AssistantToolName,
          arguments: parsed.arguments ?? {},
        };
      }
    } catch {
      /* empty */
    }
  }

  // Fall back to ACTION_JSON: marker
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
  const [onboardingOpen, setOnboardingOpen] = useState(false);
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

  const storage = useChatStorage();

  const [online, setOnline] = useState<boolean | null>(null);
  const [checkingConnectivity, setCheckingConnectivity] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [view, setView] = useState<"chat" | "history">("chat");
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
  const initializedRef = useRef(false);

  // Typewriter effect
  const twTargetRef = useRef("");
  const twPosRef = useRef(0);
  const twIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const twMsgIdRef = useRef<string | null>(null);
  const [twText, setTwText] = useState("");

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
    online === null ? "Connecting" : online ? "Online" : "Coming soon";

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
    if (!open) {
      initializedRef.current = false;
      return;
    }
    if (initializedRef.current) return;
    initializedRef.current = true;

    if (storage.index.length > 0) {
      const latest = storage.index[0];
      const msgs = storage.loadMessages(latest.id);
      setCurrentChatId(latest.id);
      setMessages(msgs.length > 0 ? msgs : [GREETING]);
    } else {
      const { id } = storage.createChat();
      setCurrentChatId(id);
      setMessages([GREETING]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!currentChatId || messages.length === 0) return;
    const firstUserMsg = messages.find((m) => m.role === "user");
    const title = firstUserMsg
      ? titleFromMessage(firstUserMsg.content)
      : undefined;
    storage.persistMessages(currentChatId, messages, title);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, currentChatId]);

  // Keep typewriter target in sync with the streaming message content
  useEffect(() => {
    if (!streamingMessageId) return;
    const msg = messages.find((m) => m.id === streamingMessageId);
    if (msg && twMsgIdRef.current === streamingMessageId) {
      twTargetRef.current = msg.content;
    }
  }, [messages, streamingMessageId]);

  // Start/stop typewriter interval when streaming state changes
  useEffect(() => {
    if (streamingMessageId) {
      twMsgIdRef.current = streamingMessageId;
      twTargetRef.current = "";
      twPosRef.current = 0;
      setTwText("");

      const id = setInterval(() => {
        const target = twTargetRef.current;
        const pos = twPosRef.current;
        if (pos < target.length) {
          twPosRef.current = pos + 1;
          setTwText(target.slice(0, pos + 1));
        }
      }, 20);

      twIntervalRef.current = id;
      return () => clearInterval(id);
    } else {
      // Stream ended - stop interval and snap to full content
      if (twIntervalRef.current) {
        clearInterval(twIntervalRef.current);
        twIntervalRef.current = null;
      }
      setTwText(twTargetRef.current);
      twPosRef.current = twTargetRef.current.length;
    }
  }, [streamingMessageId]);

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
        const actionFromContent =
          parseActionFromContent(result.content) ??
          parseActionFromContent(result.thinking);
        if (actionFromContent) toolCall = actionFromContent;
      }

      const hasActionJson = result.content.includes("ACTION_JSON:");
      const hasToolCallTag = /<tool_call>/.test(result.content);
      if (hasActionJson || hasToolCallTag) {
        setMessages((current) =>
          current.map((msg) => {
            if (msg.id !== result.assistantId) return msg;
            let cleaned = msg.content;
            let extra = "";
            if (hasActionJson) {
              const actionLines = cleaned
                .split("\n")
                .filter((l) => l.trimStart().startsWith("ACTION_JSON:"))
                .join("\n");
              cleaned = cleaned
                .split("\n")
                .filter((l) => !l.trimStart().startsWith("ACTION_JSON:"))
                .join("\n")
                .trim();
              extra += actionLines;
            }
            if (hasToolCallTag) {
              cleaned = cleaned
                .replace(/<tool_call>[\s\S]*?<\/tool_call>/g, "")
                .trim();
            }
            return {
              ...msg,
              content: cleaned,
              thinking: msg.thinking
                ? extra
                  ? `${msg.thinking}\n\n${extra}`
                  : msg.thinking
                : extra || msg.thinking,
            };
          }),
        );
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
            "The assistant isn't available right now. Please try again in a moment.",
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
            const actionFromContent =
              parseActionFromContent(result.content) ??
              parseActionFromContent(result.thinking);
            if (actionFromContent) toolCall = actionFromContent;
          }

          if (result.content.includes("ACTION_JSON:")) {
            setMessages((current) =>
              current.map((msg) =>
                msg.id === result.assistantId
                  ? {
                      ...msg,
                      content: msg.content
                        .split("\n")
                        .filter(
                          (l) => !l.trimStart().startsWith("ACTION_JSON:"),
                        )
                        .join("\n")
                        .trim(),
                    }
                  : msg,
              ),
            );
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
                "The assistant isn't available right now. Please try again in a moment.",
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

  const cancelPendingAction = async () => {
    if (!pendingAction) return;
    const result = JSON.stringify({
      ok: false,
      cancelled: true,
      action: pendingAction.name,
    });
    const id = pendingAction.id;
    setPendingAction(null);
    setSending(true);
    try {
      await continueWithToolResult(result, id);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error("Failed to get cancel response", { description: message });
    } finally {
      setSending(false);
    }
  };

  const createNewChat = () => {
    const { id } = storage.createChat();
    setCurrentChatId(id);
    setMessages([GREETING]);
    setView("chat");
    setInput("");
  };

  const switchToChat = (chatId: string) => {
    const msgs = storage.loadMessages(chatId);
    setCurrentChatId(chatId);
    setMessages(msgs.length > 0 ? msgs : [GREETING]);
    setView("chat");
    setInput("");
  };

  const deleteChatItem = (chatId: string) => {
    storage.deleteChat(chatId);
    if (currentChatId === chatId) {
      createNewChat();
    }
  };

  const shouldShowSuggestedQuestions =
    !sending &&
    !streamingMessageId &&
    (messages.length <= 1 ||
      messages[messages.length - 1]?.role === "assistant");

  // Stable suggested questions - only re-shuffle once per completed AI turn
  const [displayedSuggestedQuestions, setDisplayedSuggestedQuestions] =
    useState<string[]>(SUGGESTED_QUESTIONS);

  useEffect(() => {
    if (streamingMessageId) return; // don't update mid-stream
    if (messages.length <= 1) {
      setDisplayedSuggestedQuestions(SUGGESTED_QUESTIONS);
      return;
    }
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant") {
      const shuffled = [...SUGGESTED_QUESTIONS].sort(() => Math.random() - 0.5);
      setDisplayedSuggestedQuestions(shuffled.slice(0, 3));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streamingMessageId, messages.length]);

  const totalRevenue = context.totals.revenueTotal;
  const contextLoading = plansLoading || subscribersLoading || activityLoading;

  const handleChatToggle = () => {
    const savedKey = localStorage.getItem("recuro_qvac_holepunch_key");
    if (!savedKey) {
      setOnboardingOpen(true);
      return;
    }

    setOpen(true);
  };

  return (
    <>
      <QvacOnboardingModal
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        onComplete={() => setOpen(true)}
      />
      <Dialog open={open} onOpenChange={setOpen}>
        <Button
          className="fixed bottom-6 right-6 z-30 gap-2 rounded-full shadow-lg shadow-black/10"
          size="lg"
          onClick={handleChatToggle}
        >
          <Sparkles className="h-4 w-4" />
          AI Chat
        </Button>
        <DialogContent
          className={cn(
            "fixed bottom-6 right-6 left-auto top-auto z-50 flex h-[min(720px,calc(100vh-3rem))] w-[min(440px,calc(100vw-1.5rem))] translate-x-0 translate-y-0 gap-0 overflow-hidden rounded-[28px] border bg-background p-0 shadow-[0_24px_80px_rgba(0,0,0,0.24)] duration-300",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=open]:slide-in-from-bottom-5 data-[state=closed]:slide-out-to-bottom-5",
          )}
        >
          <div className="flex h-full w-full flex-col overflow-hidden bg-[radial-gradient(circle_at_top,rgba(120,119,198,0.14),transparent_45%),linear-gradient(to_bottom,rgba(255,255,255,0.02),transparent)]">
            <div className="border-b bg-background/80 px-5 py-4 backdrop-blur-sm">
              <DialogHeader className="space-y-2 text-left">
                <DialogTitle className="flex items-center gap-2 pr-8 text-base">
                  <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Bot className="h-4 w-4" />
                    {online ? (
                      <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full border-2 border-background bg-emerald-500" />
                      </span>
                    ) : null}
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
                <div className="ml-auto flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={createNewChat}
                    className="inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    title="New chat"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setView(view === "history" ? "chat" : "history")
                    }
                    className={cn(
                      "inline-flex items-center justify-center rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                      view === "history" && "bg-muted text-foreground",
                    )}
                    title="Chat history"
                  >
                    <History className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>

            {view === "history" ? (
              <div className="flex flex-1 flex-col overflow-hidden">
                <ScrollArea className="flex-1">
                  <div className="space-y-0.5 p-2">
                    {storage.index.length === 0 ? (
                      <p className="py-8 text-center text-sm text-muted-foreground">
                        No saved chats
                      </p>
                    ) : (
                      storage.index.map((chat) => (
                        <div
                          key={chat.id}
                          className={cn(
                            "group flex items-center gap-2 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/50",
                            currentChatId === chat.id && "bg-muted/50",
                          )}
                        >
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => switchToChat(chat.id)}
                          >
                            <p className="truncate text-sm">{chat.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatChatDate(chat.updatedAt)}
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteChatItem(chat.id)}
                            className="rounded p-1 opacity-0 transition-all hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            ) : online === false ? (
              <div className="m-4 flex flex-1 flex-col items-center justify-center gap-5 rounded-3xl border border-dashed bg-muted/20 p-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="space-y-2">
                  <p className="text-base font-semibold text-foreground">
                    AI Assistant — coming soon
                  </p>
                  <p className="text-sm text-muted-foreground">
                    We&apos;re putting the finishing touches on the merchant AI
                    assistant. It will live right here as soon as it&apos;s
                    ready.
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="rounded-full px-3 py-0.5 text-xs"
                >
                  In development
                </Badge>
              </div>
            ) : online === null || contextLoading ? (
              <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
                {online === null
                  ? "Preparing your assistant…"
                  : "Loading your merchant data…"}
              </div>
            ) : (
              <>
                <ScrollArea className="flex-1 overflow-x-hidden px-4 py-4">
                  <div className="w-full space-y-3 pr-1">
                    {messages.map((message) =>
                      message.role === "assistant" ? (
                        <div
                          key={message.id}
                          className="mr-auto min-w-0 max-w-[92%] space-y-2"
                        >
                          {!!message.thinking && (
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
                          streamingMessageId === message.id ? (
                            <AnswerBubble
                              message={message}
                              streaming={streamingMessageId === message.id}
                              displayContent={
                                streamingMessageId === message.id
                                  ? twText
                                  : undefined
                              }
                            />
                          ) : null}
                        </div>
                      ) : message.role === "user" ? (
                        <div
                          key={message.id}
                          className="ml-auto max-w-[92%] rounded-3xl border bg-primary px-4 py-3 text-sm leading-6 text-primary-foreground shadow-sm"
                        >
                          <p className="whitespace-pre-wrap">
                            {message.content}
                          </p>
                        </div>
                      ) : null,
                    )}
                    <div ref={scrollRef} />
                  </div>
                </ScrollArea>

                {shouldShowSuggestedQuestions && (
                  <div className="px-4 pb-2 pt-1">
                    <div className="flex gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                      {displayedSuggestedQuestions.map((question) => (
                        <button
                          key={question}
                          onClick={() => handleSuggestedQuestion(question)}
                          disabled={sending || !online}
                          className="shrink-0 whitespace-nowrap rounded-full border border-border bg-card/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-card/80 hover:text-foreground disabled:opacity-50"
                        >
                          {question}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                <div className="border-t bg-background/90 p-4 backdrop-blur-sm">
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
        onOpenChange={(openState) => !openState && void cancelPendingAction()}
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
            <AlertDialogCancel
              onClick={() => void cancelPendingAction()}
              disabled={sending}
            >
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
