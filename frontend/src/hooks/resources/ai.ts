// ai.ts — r153c domain split of ../useResources.ts (AI assistant domain.)
// VERBATIM move: every query key, staleTime, enabled condition,
// placeholderData and invalidation is byte-identical to the
// original sections; the public surface is frozen by the barrel.

import { useMutation, useQuery } from '@tanstack/react-query';
import { api, unwrap } from '../../lib/api';

// ── AI ─────────────────────────────────────────────────────────
export function useAiChat() {
  return useMutation({
    mutationFn: (input: { conversationId?: string; message: string }) =>
      unwrap<{ conversationId: string; reply: string }>(api.post('/ai/chat', input)),
  });
}

/* P4: the honest-surface config — GET /ai/config says which engine is
 * answering so the page badge/subtitle never claims an LLM while a
 * template composer replies (or vice versa). Cached for 5 minutes:
 * the provider is boot-frozen server-side, so re-asking per render is
 * pure noise; a stale window only delays a redeploy's mode flip. */
export interface AiConfig {
  provider: 'local' | 'openai';
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
