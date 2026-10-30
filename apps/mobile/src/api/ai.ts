/** AI academic assistant (honest provider disclosure — /ai/config). */
import { get, post, del } from "./client";
import type { AiChatResponse, AiMessage } from "./types";

export const aiApi = {
  config: () => get<{ provider: string; model?: string | null }>("/ai/config"),
  chat: (payload: { conversationId?: string; message: string }) => post<AiChatResponse & { engine?: string; model?: string }>("/ai/chat", payload),
  conversations: () => get<{ id: string; title?: string | null; updatedAt?: string }[]>("/ai/conversations"),
  messages: (conversationId: string) => get<AiMessage[]>(`/ai/conversations/${conversationId}/messages`),
  deleteConversation: (conversationId: string) => del<void>(`/ai/conversations/${conversationId}`),
  feedback: (messageId: string, rating: 1 | -1) => post<unknown>("/ai/feedback", { messageId, rating }),
};

/** Quota message the backend sends on 429 (mirrors the web detection). */
export const AI_QUOTA_MARKER = "وصلتَ حدَّ الأسئلة اليوميّ";
