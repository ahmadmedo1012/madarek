/**
 * features/ai/stream — the SSE chat streaming client (R334 3-f).
 *
 * The backend serves POST /ai/chat in TWO grammars (backend/src/http/routes/
 * ai.routes.ts r323 B1.1): the historical JSON envelope and — with
 * `?stream=1` + `Accept: text/event-stream` — a Server-Sent Events stream
 * of typed frames:
 *   event: token  data: {"t":"…"}     one reply delta
 *   event: done   data: {final turn}  ids + engine/model + citations + quota
 *   event: error  data: {code,message,retryable}
 *
 * The web consumes this with fetch + ReadableStream (frontend/src/lib/
 * ai-stream.ts). RN's fetch has NO ReadableStream body — but RN's
 * XMLHttpRequest DOES emit incremental `responseText` (the exact primitive
 * react-native-sse is built on), so this client mirrors the web contract
 * over XHR: same frames, same error semantics, same abort (stop button).
 * No new dependency.
 *
 * Honesty notes (mirror the web client verbatim):
 *   · the `done` frame's reply REPLACES the accumulated buffer (a transport
 *     drop can never truncate the persisted answer on screen);
 *   · a client abort ends the stream with NOTHING persisted server-side
 *     (the turn's writes only run after a complete reply);
 *   · a mid-stream `error` frame rejects with the FRAME's own Arabic
 *     message + code — never the generic truncation copy;
 *   · a stream that ends without `done` is an honest STREAM_TRUNCATED
 *     failure, never a truncated buffer dressed as a reply.
 */

import { API_BASE } from "@/api/client";
import { useSession } from "@/auth/session";

/** The `done` frame — the FINAL turn as the server persisted it. */
export interface AiStreamDone {
  conversationId: string;
  messageId: string;
  reply: string;
  engine?: string;
  model?: string;
  inputTokens?: number;
  outputTokens?: number;
  /** Per-user daily ask quota left AFTER this turn (omitted = unknown). */
  remaining?: number;
  /** r323 B1.2 — the retrieval citations for this turn (empty = none). */
  citations?: AiCitation[];
}

/** One knowledge citation (backend KnowledgeCitation, denormalized). */
export interface AiCitation {
  index: number;
  title: string;
  locator?: string | null;
  url?: string | null;
  snippet?: string;
}

/** The `error` frame — a typed failure AFTER the SSE headers shipped. */
export interface AiStreamErrorPayload {
  code: string;
  message: string;
  retryable: boolean;
}

/** One decoded SSE event. */
export type AiSseEvent =
  | { kind: "token"; delta: string }
  | { kind: "done"; final: AiStreamDone }
  | { kind: "error"; error: AiStreamErrorPayload };

/**
 * The pure incremental SSE frame parser (mirrors the web's — chunk
 * boundaries mean NOTHING; frames split on a blank line and a `data:` line
 * may straddle two reads). Tolerates keep-alive noise (comments,
 * `event:`-less frames, malformed payloads are skipped — never surfaced as
 * content). `end()` flushes a trailing frame that lacked the closing blank
 * line. Pure + exported for the colocated unit net.
 */
export function createAiSseParser(onEvent: (ev: AiSseEvent) => void): {
  push: (chunk: string) => void;
  end: () => void;
} {
  let buffer = "";
  const dispatch = (frame: string): void => {
    const lines = frame.split("\n");
    let eventName = "message";
    const dataLines: string[] = [];
    for (const raw of lines) {
      const line = raw.replace(/\r$/, "");
      if (line.startsWith("event:")) eventName = line.slice("event:".length).trim();
      else if (line.startsWith("data:")) dataLines.push(line.slice("data:".length).trim());
      // `: comment` and unknown fields are ignored (SSE grammar).
    }
    if (dataLines.length === 0) return; // comment-only / keep-alive frame
    const payload = dataLines.join("\n");
    let parsed: unknown;
    try {
      parsed = JSON.parse(payload);
    } catch {
      return; // malformed keep-alive noise — skipped, never content
    }
    if (eventName === "token") {
      const t = (parsed as { t?: unknown })?.t;
      if (typeof t === "string" && t.length > 0) onEvent({ kind: "token", delta: t });
      return;
    }
    if (eventName === "done") {
      onEvent({ kind: "done", final: parsed as AiStreamDone });
      return;
    }
    if (eventName === "error") {
      const p = parsed as Partial<AiStreamErrorPayload>;
      onEvent({
        kind: "error",
        error: {
          code: typeof p.code === "string" ? p.code : "PROVIDER_FAILURE",
          message: typeof p.message === "string" ? p.message : "تعذَّر توليد الردّ — أعد المحاولة",
          retryable: p.retryable !== false,
        },
      });
    }
  };
  return {
    push(chunk: string): void {
      buffer += chunk;
      // SSE frame terminators: \n\n, \r\n\r\n, or a bare \r\r (spec
      // accepts all three; the backend emits \n\n — the others are
      // defensive for proxies that rewrite line endings).
      let boundary = findFrameBoundary(buffer);
      while (boundary !== -1) {
        dispatch(buffer.slice(0, boundary.index));
        buffer = buffer.slice(boundary.index + boundary.length);
        boundary = findFrameBoundary(buffer);
      }
    },
    end(): void {
      if (buffer.trim().length > 0) dispatch(buffer);
      buffer = "";
    },
  };
}

/** The first SSE frame terminator (blank line) in `buffer`, if any. */
function findFrameBoundary(buffer: string): { index: number; length: number } | -1 {
  const candidates = [buffer.indexOf("\n\n"), buffer.indexOf("\r\n\r\n"), buffer.indexOf("\r\r")].filter(
    (i) => i !== -1,
  );
  if (candidates.length === 0) return -1;
  const index = Math.min(...candidates);
  const length =
    buffer.startsWith("\r\n\r\n", index) ? 4 : buffer.startsWith("\r\r", index) ? 2 : 2;
  return { index, length };
}

/** Capability probe — XHR + AbortController (both present on RN and web). */
export function canStreamAi(): boolean {
  return typeof XMLHttpRequest === "function" && typeof AbortController === "function";
}

/** Did this rejection come from the caller's stop button? */
export function isStreamAbortError(err: unknown): boolean {
  return (err as { name?: string } | null)?.name === "AbortError";
}

/** No-data stall ceiling — refreshed on EVERY incremental read. */
const STALL_TIMEOUT_MS = 45_000;

const TRUNCATED_AR = "انقطع الردّ قبل اكتماله — أعد المحاولة.";
const STREAM_EMPTY_AR = "تعذّر الاتصال بالمساعد الآن.";

export interface AiStreamRequest {
  conversationId?: string;
  message: string;
  signal: AbortSignal;
  /** Every token delta, the moment it arrives. */
  onToken: (delta: string) => void;
  /** The typed error frame (a mid-stream provider failure). */
  onError?: (error: AiStreamErrorPayload) => void;
}

/**
 * POST /ai/chat?stream=1 over XHR and consume the SSE reply. Resolves with
 * the `done` frame or rejects with an `ApiError`-shaped error (code +
 * Arabic message + status — feed it to `humanizeError`); the caller's stop
 * button rejects with an `AbortError`-shaped error (`isStreamAbortError`).
 */
export function streamAiChat(req: AiStreamRequest): Promise<AiStreamDone> {
  return new Promise<AiStreamDone>((resolve, reject) => {
    const session = useSession.getState();
    const xhr = new XMLHttpRequest();
    let settled = false;
    let consumed = 0;
    let sawTokens = false;
    let frameError: AiStreamErrorPayload | null = null;
    let stalled = false;
    let stallTimer: ReturnType<typeof setTimeout> | null = null;

    const settle = (fn: () => void) => {
      if (settled) return;
      settled = true;
      if (stallTimer) clearTimeout(stallTimer);
      fn();
    };

    const armStall = () => {
      if (stallTimer) clearTimeout(stallTimer);
      stallTimer = setTimeout(() => {
        stalled = true;
        try {
          xhr.abort();
        } catch {
          settle(() => reject(makeError("TIMEOUT", "انتهت مهلة الردّ — الخادم بطيء، أعد المحاولة", 0)));
        }
      }, STALL_TIMEOUT_MS);
    };

    const rejectHttp = (status: number, code: string, message: string) =>
      settle(() => reject(makeError(code, message, status)));

    const parser = createAiSseParser((ev) => {
      if (ev.kind === "token") {
        sawTokens = true;
        req.onToken(ev.delta);
      } else if (ev.kind === "error") {
        frameError = ev.error;
        req.onError?.(ev.error);
      } else {
        // done — the turn is complete; the server ends the stream right
        // after. Resolve immediately (an xhr.abort() below just races it).
        settle(() => {
          try {
            xhr.abort();
          } catch {
            // already dead — the frame is already in hand
          }
          resolve(ev.final);
        });
      }
    });

    const feed = () => {
      const text = typeof xhr.responseText === "string" ? xhr.responseText : "";
      if (text.length > consumed) {
        parser.push(text.slice(consumed));
        consumed = text.length;
        armStall();
      }
    };

    const finish = () => {
      feed();
      parser.end();
      if (settled) return;
      const status = xhr.status || 0;
      if (status >= 200 && status < 300) {
        if (frameError) {
          rejectHttp(status, frameError.code, frameError.message);
          return;
        }
        // No `done` frame. Honest fallback: a proxy/gateway may have
        // stripped the query and answered the JSON grammar — if the whole
        // body is a JSON envelope carrying a reply, that IS the turn.
        const body = (typeof xhr.responseText === "string" ? xhr.responseText : "").trim();
        const json = tryParseJson(body);
        const envelopeReply = readJsonReply(json);
        if (!sawTokens && envelopeReply) {
          settle(() => resolve(envelopeReply));
          return;
        }
        rejectHttp(status, "STREAM_TRUNCATED", TRUNCATED_AR);
        return;
      }
      const envelope = readErrorEnvelope(tryParseJson(typeof xhr.responseText === "string" ? xhr.responseText : ""));
      rejectHttp(
        status,
        envelope?.code ?? `HTTP_${status}`,
        envelope?.message ?? STREAM_EMPTY_AR,
      );
    };

    xhr.onprogress = () => {
      if (!settled) feed();
    };
    xhr.onreadystatechange = () => {
      if (settled) return;
      // readyState 3 (LOADING) is where RN delivers incremental text.
      if (xhr.readyState === 3) feed();
    };
    xhr.onload = () => finish();
    // RN fires onabort for xhr.abort(); onerror for transport failures.
    xhr.onabort = () => {
      if (settled) return;
      if (req.signal.aborted) {
        settle(() => reject(makeAbortError()));
      } else if (stalled) {
        settle(() => reject(makeError("TIMEOUT", "انتهت مهلة الردّ — الخادم بطيء، أعد المحاولة", 0)));
      } else {
        settle(() => reject(makeError("NETWORK", "تعذّر الاتصال بالخادم — تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.", 0)));
      }
    };
    xhr.onerror = () => {
      if (settled) return;
      settle(() => reject(makeError("NETWORK", "تعذّر الاتصال بالخادم — تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.", 0)));
    };

    req.signal.addEventListener(
      "abort",
      () => {
        if (settled) return;
        stalled = false; // the user's stop is a cancellation, never a stall
        try {
          xhr.abort();
        } catch {
          settle(() => reject(makeAbortError()));
        }
      },
      { once: true },
    );

    armStall();
    try {
      xhr.open("POST", `${API_BASE}/ai/chat?stream=1`, true);
      xhr.setRequestHeader("Content-Type", "application/json");
      xhr.setRequestHeader("Accept", "text/event-stream");
      if (session.accessToken) xhr.setRequestHeader("Authorization", `Bearer ${session.accessToken}`);
      if (session.refreshCookie) xhr.setRequestHeader("Cookie", `mdrk_refresh=${session.refreshCookie}`);
      xhr.send(JSON.stringify({ conversationId: req.conversationId, message: req.message }));
    } catch (err) {
      settle(() => reject(makeError("NETWORK", "تعذّر الاتصال بالخادم — تحقّق من اتصالك بالإنترنت ثم أعد المحاولة.", 0, err)));
    }
  });
}

/* ── error shapes (ApiError-compatible: code + Arabic message + status) ── */

export interface AiStreamFailure extends Error {
  code: string;
  status: number;
}

function makeError(code: string, message: string, status: number, cause?: unknown): AiStreamFailure {
  const err = new Error(message) as AiStreamFailure;
  err.name = "AiStreamError";
  err.code = code;
  err.status = status;
  if (cause !== undefined) (err as { cause?: unknown }).cause = cause;
  return err;
}

function makeAbortError(): Error {
  const err = new Error("aborted");
  err.name = "AbortError";
  return err;
}

function tryParseJson(text: string): unknown {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** `{ data: { reply } }` (mobile envelope) or a bare `{ reply }` object. */
function readJsonReply(json: unknown): AiStreamDone | null {
  if (json === null || typeof json !== "object") return null;
  const obj = json as { data?: unknown; reply?: unknown; conversationId?: unknown; messageId?: unknown };
  const inner =
    obj.data !== null && typeof obj.data === "object" ? (obj.data as Record<string, unknown>) : obj;
  const reply = (inner as { reply?: unknown }).reply;
  const conversationId = (inner as { conversationId?: unknown }).conversationId;
  const messageId = (inner as { messageId?: unknown }).messageId;
  if (typeof reply !== "string" || typeof conversationId !== "string" || typeof messageId !== "string") {
    return null;
  }
  return inner as unknown as AiStreamDone;
}

/** The backend's `{ error: { code, message } }` envelope, when present. */
function readErrorEnvelope(json: unknown): { code?: string; message?: string } | null {
  if (json === null || typeof json !== "object") return null;
  const err = (json as { error?: unknown }).error;
  if (err === null || err === undefined || typeof err !== "object") return null;
  return err as { code?: string; message?: string };
}
