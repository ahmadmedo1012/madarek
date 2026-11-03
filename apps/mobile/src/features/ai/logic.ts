/**
 * features/ai/logic — the pure Assistant logic (R334 3-f).
 *
 * Everything here is dependency-free and unit-pinned (logic.test.ts):
 * the role-aware suggestion pool + rotation, the chat-turn state machine
 * (streaming → done / stopped / error, retry), quota classification, and
 * the citation chip model. The component owns I/O only.
 */

import type { AiCitation } from "./stream";

/* ── roles ────────────────────────────────────────────────────────────── */

/** Roles that get the chat assistant (web parity: /student/ai + /teacher/ai). */
export type AssistantRole = "student" | "teacher";

export const ROLE_KICKER: Record<AssistantRole, string> = {
  student: "الدراسة",
  teacher: "التدريس",
};

export const ROLE_WELCOME_TITLE: Record<AssistantRole, string> = {
  student: "اسأل عن مقرّرك",
  teacher: "مساعدك في التدريس",
};

export const ROLE_WELCOME_BODY: Record<AssistantRole, string> = {
  student:
    "اسأل عن مفهوم من المنهج، أو اطلب تلخيصًا، أو تدرب على سؤال — يجيب ضمن نطاق مؤسّستك.",
  teacher:
    "اطلب شرحًا لمفهوم، أو أسئلة تدريب لمقرّرك، أو صياغة ملاحظات — يجيب ضمن نطاق مؤسّستك.",
};

/* ── suggestions ──────────────────────────────────────────────────────── */

export interface Suggestion {
  id: string;
  /** The chip label the student reads. */
  label: string;
  /** The prompt the chip sends. */
  prompt: string;
}

const SUGGESTION_POOL: Record<AssistantRole, Suggestion[]> = {
  student: [
    { id: "s-explain", label: "اشرح لي مفهومًا", prompt: "اشرح لي مفهومًا أساسيًا من مقرّراتي بأسلوب مبسّط." },
    { id: "s-quiz", label: "درّبني بسؤال", prompt: "اطرح عليّ سؤال تدريب من المنهج ثم صحّح إجابتي." },
    { id: "s-summary", label: "لخّص لي محاضرة", prompt: "لخّص لي أهم نقاط آخر محاضرة في مقرّراتي." },
    { id: "s-plan", label: "خطة مراجعة", prompt: "اقترح لي خطة مراجعة قصيرة لهذا الأسبوع." },
    { id: "s-gap", label: "ما فجواتي؟", prompt: "ما المفاهيم التي أحتاج إلى تقويتها؟" },
    { id: "s-quizgen", label: "أسئلة اختيارية", prompt: "أنشئ لي خمسة أسئلة اختيار من متعدد للمراجعة." },
  ],
  teacher: [
    { id: "t-quiz", label: "أسئلة لمقرّري", prompt: "اقترح لي أسئلة اختبار قصير لمقرّري الحالي." },
    { id: "t-explain", label: "شرح مبسّط", prompt: "أعطني شرحًا مبسّطًا لمفهوم صعب أوصلته للطلاب اليوم." },
    { id: "t-notes", label: "صياغة ملاحظات", prompt: "ساعدني في صياغة ملاحظات محاضرة قصيرة ومركّزة." },
    { id: "t-feedback", label: "تغذية راجعة", prompt: "كيف أكتب تغذية راجعة بنّاءة لطالب متعثر؟" },
    { id: "t-ideas", label: "أفكار أنشطة", prompt: "اقترح نشاطًا تفاعليًا قصيرًا للمحاضرة القادمة." },
    { id: "t-review", label: "مراجعة منهج", prompt: "راجع معي ترتيب موضوعات المقرر لهذا الفصل." },
  ],
};

/**
 * Pick `count` suggestions for a role, rotating by `offset` so every new
 * conversation offers fresh chips (deterministic — no Math.random, so the
 * unit net and React Compiler both stay happy).
 */
export function pickSuggestions(role: AssistantRole, offset = 0, count = 4): Suggestion[] {
  const pool = SUGGESTION_POOL[role];
  const out: Suggestion[] = [];
  const start = ((offset % pool.length) + pool.length) % pool.length;
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    out.push(pool[(start + i) % pool.length]);
  }
  return out;
}

/* ── the chat turn state machine ─────────────────────────────────────── */

export type TurnRole = "user" | "assistant";
export type TurnStatus = "streaming" | "done" | "stopped" | "error";

export interface ChatTurn {
  key: string;
  role: TurnRole;
  content: string;
  /** assistant only — user turns are always "done". */
  status: TurnStatus;
  /** Arabic, humanized — rendered inside the failed bubble. */
  error?: string;
  /** The persisted message id (assistant turns, once done). */
  messageId?: string;
  engine?: string;
  model?: string;
  citations?: AiCitation[];
}

let turnSeq = 0;
/** Stable unique key for a turn (pure counter + role prefix). */
export function nextTurnKey(role: TurnRole): string {
  turnSeq += 1;
  return `${role}-${turnSeq}`;
}

/**
 * Append the user's message + the streaming assistant placeholder after it.
 * `assistantKey` comes from the caller so the send flow can address the
 * streaming turn the moment it begins (no effect-race on a ref).
 */
export function beginTurn(messages: ChatTurn[], userText: string, assistantKey: string): ChatTurn[] {
  return [
    ...messages,
    { key: nextTurnKey("user"), role: "user", content: userText, status: "done" },
    { key: assistantKey, role: "assistant", content: "", status: "streaming" },
  ];
}

function mapTurn(messages: ChatTurn[], key: string, fn: (t: ChatTurn) => ChatTurn): ChatTurn[] {
  return messages.map((t) => (t.key === key ? fn(t) : t));
}

/** Grow the streaming bubble with one token delta. */
export function appendDelta(messages: ChatTurn[], key: string, delta: string): ChatTurn[] {
  return mapTurn(messages, key, (t) =>
    t.role === "assistant" && t.status === "streaming" ? { ...t, content: t.content + delta } : t,
  );
}

/** The `done` frame landed — the server's final text replaces the buffer. */
export function completeTurn(
  messages: ChatTurn[],
  key: string,
  final: { reply: string; messageId: string; engine?: string; model?: string; citations?: AiCitation[] },
): ChatTurn[] {
  return mapTurn(messages, key, (t) =>
    t.role === "assistant"
      ? {
          ...t,
          content: final.reply,
          status: "done",
          error: undefined,
          messageId: final.messageId,
          engine: final.engine,
          model: final.model,
          citations: final.citations ?? [],
        }
      : t,
  );
}

/** The stop button — keep the partial text, mark the turn stopped. */
export function stopTurn(messages: ChatTurn[], key: string): ChatTurn[] {
  return mapTurn(messages, key, (t) =>
    t.role === "assistant" && t.status === "streaming" ? { ...t, status: "stopped" } : t,
  );
}

/** A failed turn — the bubble keeps its user question and shows the error. */
export function failTurn(messages: ChatTurn[], key: string, errorAr: string): ChatTurn[] {
  return mapTurn(messages, key, (t) =>
    t.role === "assistant" ? { ...t, status: "error", error: errorAr } : t,
  );
}

/**
 * Retry target: the user prompt of the LAST turn whose assistant bubble is
 * in the "error" state (a stopped turn is not a failure — nothing to fix).
 */
export function retryTarget(messages: ChatTurn[]): { key: string; prompt: string } | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const t = messages[i];
    if (t.role === "assistant" && t.status === "error") {
      const userTurn = messages[i - 1];
      return userTurn && userTurn.role === "user" ? { key: t.key, prompt: userTurn.content } : null;
    }
  }
  return null;
}

/** Drop the failed assistant turn AND its user question (retry re-asks it). */
export function dropFailedTurn(messages: ChatTurn[], key: string): ChatTurn[] {
  const idx = messages.findIndex((t) => t.key === key);
  if (idx === -1) return messages;
  const userBefore = messages[idx - 1];
  const start = userBefore && userBefore.role === "user" && userBefore.status === "done" ? idx - 1 : idx;
  return messages.filter((_, i) => i !== idx && i !== start);
}

/** No turn may be in flight — the composer's send gate. */
export function canSend(messages: ChatTurn[]): boolean {
  return !messages.some((t) => t.status === "streaming");
}

/** The key of the currently streaming assistant turn, if any. */
export function streamingKey(messages: ChatTurn[]): string | null {
  const t = messages.find((x) => x.status === "streaming");
  return t ? t.key : null;
}

/* ── quota ────────────────────────────────────────────────────────────── */

/** The backend's Arabic daily-quota marker (mirrors AI_QUOTA_MARKER). */
export const QUOTA_MARKER = "وصلتَ حدَّ الأسئلة اليوميّ";

/** 429 with the quota marker (or a bare 429) → the «وصلت حدّ اليوم» card. */
export function isQuotaError(err: unknown): boolean {
  const e = err as { status?: unknown; message?: unknown } | null;
  if (e && typeof e === "object") {
    if (e.status === 429) return true;
    if (typeof e.message === "string" && e.message.includes(QUOTA_MARKER)) return true;
  }
  return false;
}

/* ── citations ────────────────────────────────────────────────────────── */

/** The chip label: «١ العنوان (الموقع)» — bounded, one line. */
export function citationChipLabel(c: AiCitation): string {
  const base = c.title.trim() || "مصدر";
  return c.locator && c.locator.trim() ? `${base} (${c.locator.trim()})` : base;
}

/** Openable citations only — a chip without a URL is informational. */
export function isCitationOpenable(c: AiCitation): boolean {
  return typeof c.url === "string" && c.url.startsWith("http");
}
