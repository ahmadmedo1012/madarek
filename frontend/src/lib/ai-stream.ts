/* ── r323 B1.1: the AI chat SSE streaming client ──────────────────────
 *
 * EXTRACTED from lib/api.ts (r323 CI bundle-diet): the streaming
 * client is consumed ONLY by the lazy AiAssistantPage route chunk —
 * keeping it inside lib/api.ts dragged the whole SSE grammar (types,
 * the error class, the parser, the fetch loop) into the ENTRY bundle
 * on every first paint, guests and landing included. It now rides the
 * AI page's own lazy chunk. The wire loop still mirrors the axios
 * instance's auth conventions: Bearer access token, refresh cookie via
 * credentials, the same /api/v1 base.
 *
 * The backend serves POST /ai/chat in TWO grammars (same auth, same
 * rate limiter, same quota guard): the historical JSON envelope and —
 * with `?stream=1` — a Server-Sent Events stream of typed frames:
 *   event: token  data: {"t":"…"}       (one reply delta)
 *   event: done   data: {final turn}    (ids + engine/model + quota)
 *   event: error  data: {code,message,retryable}
 *
 * SSE needs a POST body, so EventSource is out — this client uses
 * fetch + ReadableStream. The FRAME PARSER is a pure, exported factory
 * so unit tests pin token accumulation / done / error / abort without
 * a server; the wire loop is the only impure piece. */

import { api, apiBaseURL, unwrap } from './api';
import { useAuthStore } from '../stores/auth.store';

/** The `done` frame — the FINAL turn as the server persisted it. The
 * server's `reply` replaces the client's accumulated buffer (a
 * transport drop can never truncate the answer on screen). `remaining`
 * is the per-user daily ask quota left AFTER this turn — omitted by
 * the server when the quota store was unavailable (never invented). */
export interface AiStreamDone {
  conversationId: string;
  messageId: string;
  reply: string;
  engine?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  remaining?: number;
}

/** The `error` frame — a typed failure AFTER the SSE headers shipped
 * (provider outage mid-stream, plumbing failure). `retryable` mirrors
 * the backend's failure classification. */
export interface AiStreamErrorPayload {
  code: string;
  message: string;
  retryable: boolean;
}

/** One decoded SSE event — the union the page's handlers switch on. */
export type AiSseEvent =
  | { kind: 'token'; delta: string }
  | { kind: 'done'; final: AiStreamDone }
  | { kind: 'error'; error: AiStreamErrorPayload };

/** A non-2xx on the SSE attempt (auth, rate limiter, spent daily
 * quota, honest provider failure before streaming began) — or a
 * mid-stream typed `error` frame surfaced at stream end. The status
 * plus the backend's own envelope code/message ride it verbatim. */
export class AiStreamHttpError extends Error {
  readonly status: number;
  readonly code: string;
  readonly serverMessage: string;
  /** The frame's own retryable flag when one carried it; a pre-stream
   * HTTP rejection defaults to retryable (the standing rate limiter
   * window and free-tier 429s genuinely recover). */
  readonly retryable: boolean;
  constructor(status: number, code: string, serverMessage: string, retryable = true) {
    super(`AI stream HTTP ${status}: ${code}`);
    this.name = 'AiStreamHttpError';
    this.status = status;
    this.code = code;
    this.serverMessage = serverMessage;
    this.retryable = retryable;
  }
}

/**
 * The pure incremental SSE frame parser. Feed it decoder output as it
 * arrives (chunk boundaries mean NOTHING — frames split on a blank
 * line, and a `data:` line may straddle two reads); it emits decoded
 * `AiSseEvent`s through the handler the moment a frame completes.
 * Tolerates the keep-alive noise compatible servers emit (comment
 * lines, `event:`-less frames, unparseable data payloads are skipped —
 * never surfaced as content). `end()` flushes a trailing frame that
 * lacked the closing blank line.
 */
export function createAiSseParser(onEvent: (ev: AiSseEvent) => void): {
  push: (chunk: string) => void;
  end: () => void;
} {
  let buffer = '';
  const dispatch = (frame: string): void => {
    const lines = frame.split('\n');
    let eventName = 'message';
    const dataLines: string[] = [];
    for (const raw of lines) {
      const line = raw.replace(/\r$/, '');
      if (line.startsWith('event:')) eventName = line.slice('event:'.length).trim();
      else if (line.startsWith('data:')) dataLines.push(line.slice('data:'.length).trim());
      // `: comment` and unknown fields are ignored (SSE grammar).
    }
    if (dataLines.length === 0) return; // comment-only / keep-alive frame
    const payload = dataLines.join('\n');
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return; // malformed keep-alive noise — skipped, never content
    }
    if (eventName === 'token') {
      const t = (parsed as { t?: unknown })?.t;
      if (typeof t === 'string' && t.length > 0) onEvent({ kind: 'token', delta: t });
      return;
    }
    if (eventName === 'done') {
      onEvent({ kind: 'done', final: parsed as AiStreamDone });
      return;
    }
    if (eventName === 'error') {
      const p = parsed as Partial<AiStreamErrorPayload>;
      onEvent({
        kind: 'error',
        error: {
          code: typeof p.code === 'string' ? p.code : 'PROVIDER_FAILURE',
          message: typeof p.message === 'string' ? p.message : 'تعذَّر توليد الردّ — أعد المحاولة',
          retryable: p.retryable !== false,
        },
      });
    }
  };
  return {
    push(chunk: string): void {
      buffer += chunk;
      let boundary = buffer.indexOf('\n\n');
      while (boundary !== -1) {
        dispatch(buffer.slice(0, boundary));
        buffer = buffer.slice(boundary + 2);
        boundary = buffer.indexOf('\n\n');
      }
    },
    end(): void {
      if (buffer.trim().length > 0) dispatch(buffer);
      buffer = '';
    },
  };
}

/** Capability probe — streaming needs fetch + ReadableStream (and an
 * abortable fetch). A browser without them (or a test environment that
 * stubs fetch away) degrades the page to the JSON grammar honestly:
 * same endpoint, same engine, no streaming pretense. */
export function canStreamAi(): boolean {
  return (
    typeof fetch === 'function' &&
    typeof AbortController === 'function' &&
    typeof ReadableStream !== 'undefined' &&
    typeof TextDecoder === 'function'
  );
}

export interface AiStreamRequest {
  conversationId?: string;
  message: string;
  signal: AbortSignal;
  /** Every token delta, the moment it decodes. */
  onToken: (delta: string) => void;
  /** The typed error frame (a mid-stream provider failure). */
  onError?: (error: AiStreamErrorPayload) => void;
}

/**
 * POST /ai/chat?stream=1 and consume the SSE reply. Resolves with the
 * `done` frame (the server's final turn) or throws:
 *  · `AiStreamHttpError` — non-2xx BEFORE streaming (the daily-quota
 *    429 and the rate limiter surface here with the server's own
 *    Arabic message + envelope code);
 *  · the native `AbortError` — the caller's stop button (partial
 *    text stays wherever the caller kept it; the server persists
 *    nothing for an aborted turn).
 * A mid-stream `error` FRAME does not throw — it dispatches through
 * `onError` and the function still resolves (the frame IS the reply).
 * Auth mirrors the axios instance: Bearer token + refresh cookie.
 */
export async function streamAiChat(req: AiStreamRequest): Promise<AiStreamDone> {
  const token = useAuthStore.getState().accessToken;
  const res = await fetch(`${apiBaseURL}/ai/chat?stream=1`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ conversationId: req.conversationId, message: req.message }),
    signal: req.signal,
  });
  if (req.signal.aborted) {
    // The stop raced the response headers: whatever arrived is dead on
    // arrival — cancel the body and reject the way fetch itself would.
    void res.body?.cancel().catch(() => undefined);
    throw new DOMException('This operation was aborted', 'AbortError');
  }
  if (!res.ok) {
    // The JSON error envelope (AppError) when the server sent one —
    // the server's Arabic message wins verbatim.
    const envelope = (await res.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
    } | null;
    throw new AiStreamHttpError(
      res.status,
      envelope?.error?.code ?? `HTTP_${res.status}`,
      envelope?.error?.message ?? 'تعذَّر الاتصال بالمساعد الآن.',
    );
  }
  if (!res.body) {
    throw new AiStreamHttpError(res.status, 'STREAM_EMPTY', 'تعذَّر الاتصال بالمساعد الآن.');
  }

  return new Promise<AiStreamDone>((resolve, reject) => {
    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let settled = false;
    // The typed `error` frame (a mid-stream provider failure): the
    // server ends the stream WITHOUT a done frame after it, so the
    // rejection below carries the FRAME's own classified Arabic
    // message + code — never the generic truncation copy.
    let frameError: AiStreamErrorPayload | null = null;
    const parser = createAiSseParser((ev) => {
      if (ev.kind === 'token') req.onToken(ev.delta);
      else if (ev.kind === 'error') {
        frameError = ev.error;
        req.onError?.(ev.error);
      } else if (!settled) {
        settled = true;
        // The turn is complete — stop reading (the server ends the
        // stream right after `done`; a cancel just races it politely).
        void reader.cancel().catch(() => undefined);
        resolve(ev.final);
      }
    });

    (async () => {
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done || settled) break;
          parser.push(decoder.decode(value, { stream: true }));
        }
        if (settled) return;
        parser.end();
        settled = true;
        if (frameError) {
          const fe = frameError as AiStreamErrorPayload;
          reject(new AiStreamHttpError(res.status, fe.code, fe.message, fe.retryable));
          return;
        }
        // The stream ended without a `done` frame: the turn never
        // completed server-side (mid-stream drop). An honest failure —
        // never resolve with a truncated buffer dressed as a reply.
        reject(new AiStreamHttpError(res.status, 'STREAM_TRUNCATED', 'انقطع الردّ قبل اكتماله — أعد المحاولة.'));
      } catch (err) {
        if (settled) return;
        settled = true;
        // The caller's abort surfaces as a DOMException named
        // AbortError — rethrown so the caller's `signal.aborted`
        // check owns the interpretation (cancellation ≠ outage).
        reject(err);
      }
    })();
  });
}

/** POST /ai/feedback — one thumbs up/down per user per answer (the
 * (messageId, userId) pair upserts; the last rating wins). Rating is
 * strictly ±1 (the backend's SMALLINT column contract). */
export function sendAiFeedback(messageId: string, rating: 1 | -1): Promise<{ ok: boolean }> {
  return unwrap<{ ok: boolean }>(api.post('/ai/feedback', { messageId, rating }));
}

/** The backend's own Arabic daily-quota rejection (ai.routes.ts
 * dailyQuotaMessage) — the ONE 429 the page renders as the
 * «وصلتَ حدّ اليوم» card instead of a generic error row. Matched on
 * the server-controlled phrase (the rate limiter's 429s use different
 * copy and keep the recoverable error row). Exported pure — test-pinned. */
export function isDailyQuotaMessage(message: string): boolean {
  return message.includes('وصلتَ حدَّ الأسئلة اليوميّ');
}
