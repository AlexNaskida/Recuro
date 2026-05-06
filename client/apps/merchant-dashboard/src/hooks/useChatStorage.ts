import { useCallback, useState } from "react";
import type { ChatMessage } from "@/lib/assistant";

const INDEX_KEY = "recuro_chat_index";
const CHAT_PREFIX = "recuro_chat_";
const MAX_CHATS = 40;

export type ChatMeta = {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
};

function readIndex(): ChatMeta[] {
  try {
    return JSON.parse(localStorage.getItem(INDEX_KEY) ?? "[]") as ChatMeta[];
  } catch {
    return [];
  }
}

function writeIndex(index: ChatMeta[]): void {
  try {
    localStorage.setItem(INDEX_KEY, JSON.stringify(index));
  } catch {}
}

function readMessages(chatId: string): ChatMessage[] {
  try {
    return JSON.parse(
      localStorage.getItem(`${CHAT_PREFIX}${chatId}`) ?? "[]",
    ) as ChatMessage[];
  } catch {
    return [];
  }
}

function writeMessages(chatId: string, messages: ChatMessage[]): void {
  try {
    localStorage.setItem(`${CHAT_PREFIX}${chatId}`, JSON.stringify(messages));
  } catch {}
}

function eraseMessages(chatId: string): void {
  try {
    localStorage.removeItem(`${CHAT_PREFIX}${chatId}`);
  } catch {}
}

export function titleFromMessage(content: string): string {
  const clean = content.trim().replace(/\s+/g, " ");
  return clean.length > 42 ? `${clean.slice(0, 42)}…` : clean;
}

export function formatChatDate(ts: number): string {
  const d = new Date(ts);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  if (isToday) return "Today";
  if (isYesterday) return "Yesterday";
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function useChatStorage() {
  const [index, setIndex] = useState<ChatMeta[]>(readIndex);

  const createChat = useCallback((): { id: string } => {
    const id = crypto.randomUUID();
    const meta: ChatMeta = {
      id,
      title: "New chat",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setIndex((prev) => {
      const next = [meta, ...prev].slice(0, MAX_CHATS);
      writeIndex(next);
      return next;
    });
    writeMessages(id, []);
    return { id };
  }, []);

  const persistMessages = useCallback(
    (chatId: string, messages: ChatMessage[], title?: string) => {
      writeMessages(chatId, messages);
      setIndex((prev) => {
        const next = prev
          .map((entry) =>
            entry.id === chatId
              ? {
                  ...entry,
                  ...(title ? { title } : {}),
                  updatedAt: Date.now(),
                }
              : entry,
          )
          .sort((a, b) => b.updatedAt - a.updatedAt);
        writeIndex(next);
        return next;
      });
    },
    [],
  );

  const loadMessages = useCallback((chatId: string): ChatMessage[] => {
    return readMessages(chatId);
  }, []);

  const deleteChat = useCallback((chatId: string) => {
    eraseMessages(chatId);
    setIndex((prev) => {
      const next = prev.filter((e) => e.id !== chatId);
      writeIndex(next);
      return next;
    });
  }, []);

  return { index, createChat, persistMessages, loadMessages, deleteChat };
}
