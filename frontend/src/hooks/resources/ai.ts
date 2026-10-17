// ai.ts — r153c domain split of ../useResources.ts (AI assistant domain.)
// VERBATIM move: every query key, staleTime, enabled condition,
// placeholderData and invalidation is byte-identical to the
// original sections; the public surface is frozen by the barrel.
// r164g additions (conversations management): list/delete hooks, the
// transcript fetch helper, and the chat mutation's list refresh.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/api';
import { useInstitutionScope } from '../../stores/auth.store';
import { withInstitutionScope } from '../../lib/queryClient';

// ── AI ─────────────────────────────────────────────────────────
export function useAiChat() {
  // r164g: a successful turn may have CREATED a conversation (first
  // message) or appended to one — the conversations sidebar must see
  // it. One targeted invalidation, only on success (a failed turn
  // wrote nothing server-side; the FE keeps the exchange in the log).
  //
  // r166d (WS-F5): the turn's envelope also carries per-turn engine
  // attribution (engine + model) — optional here so an older backend
  // payload (or a race with a mid-deploy flip) degrades to an untagged
  // bubble instead of breaking the chat. r175: `engine` is the honest
  // provider label (openrouter/openai/local/hostname) — string, not a
  // two-member union, because the transport mode is OpenAI-compatible
  // for many vendors.
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: { conversationId?: string; message: string }) =>
      unwrap<{ conversationId: string; reply: string; engine?: string; model?: string }>(
        api.post('/ai/chat', input),
      ),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ai', 'conversations'] });
    },
  });
}

/* P4: the honest-surface config — GET /ai/config says which engine is
 * answering so the page badge/subtitle never claims an LLM while a
 * template composer replies (or vice versa). Cached for 5 minutes:
 * the provider is boot-frozen server-side, so re-asking per render is
 * pure noise; a stale window only delays a redeploy's mode flip.
 * r175: `provider` is the honest LABEL — 'local', 'openai',
 * 'openrouter', or a compatible host's name (string, not a union):
 * routing via openrouter.ai is OpenRouter, not OpenAI. */
export interface AiConfig {
  provider: string;
  model: string | null;
}

export function useAiConfig() {
  return useQuery({
    queryKey: ['ai', 'config'],
    queryFn: () => unwrap<AiConfig>(api.get('/ai/config')),
    staleTime: 5 * 60_000,
    retry: 1,
  });
}

/* ── r164g: conversations management ─────────────────────────── */

/** A conversation row (GET /ai/conversations — take 50, newest first). */
export interface AiConversation {
  id: string;
  title: string | null;
  createdAt: string;
}

/** A stored message row (GET /ai/conversations/:id/messages). */
export interface AiMessageRow {
  id: string;
  role: 'USER' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  createdAt: string;
}

/** The caller's conversations in the CURRENT institution context
 * (newest first, server-capped at 50). r179 (phase-5): the key carries
 * the institution scope — a switch re-keys the sidebar to the new
 * institution's history instead of flashing the old one; the backend
 * filters by the verified context regardless. */
export function useAiConversations() {
  const inst = useInstitutionScope();
  return useQuery({
    queryKey: withInstitutionScope(['ai', 'conversations'], inst),
    queryFn: () => unwrap<AiConversation[]>(api.get('/ai/conversations')),
  });
}

/**
 * Fetch one conversation's transcript (chronological, newest-200
 * window the server enforces). Deliberately an imperative helper,
 * NOT a query: the transcript it feeds is session state (optimistic
 * turns, failed rows) — a cache entry would fight the live log.
 */
export function fetchAiConversationMessages(id: string): Promise<AiMessageRow[]> {
  return unwrap<AiMessageRow[]>(api.get(`/ai/conversations/${id}/messages`));
}

/** Delete one of the caller's conversations (messages cascade
 * server-side). Refreshes the conversations family on success. */
export function useDeleteAiConversation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => unwrap<{ ok: boolean }>(api.delete(`/ai/conversations/${id}`)),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['ai', 'conversations'] });
    },
  });
}
