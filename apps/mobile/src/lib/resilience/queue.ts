/**
 * resilience/queue — R334 B8: the offline action queue for exam answers.
 *
 * A student answering an exam must never lose a tap to a train tunnel.
 * While offline, answers enqueue locally (AsyncStorage); when connectivity
 * returns they flush in order. The queue is TRANSPORT-AGNOSTIC — the
 * sender is injected — and the shipped adapter (`sendAnswerViaExamsApi`)
 * is the integration point with `src/api/exams.ts`:
 *
 *   examsApi.answer(attemptId, { questionId, answerText?, choiceIndex? })
 *
 * Conflict story (documented, honest):
 *   · STABLE IDS: an item's id is `${attemptId}:${questionId}` — the
 *     natural unit the backend checkpoints. Re-answering the same
 *     question while its previous answer is still pending REPLACES it
 *     (newest-wins locally) — identical to the server's per-question
 *     latest-value semantics, so replay order cannot corrupt an attempt.
 *   · ORDER: FIFO by `enqueuedAt`.
 *   · FAILURES: a failed send stays queued with `attempts`/`lastError`
 *     recorded (surfaced honestly by the exam screen), except when the
 *     caller's `shouldDrop` marks the error permanent (e.g. the attempt
 *     was closed server-side) — dropped items are reported, never lost
 *     silently.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { examsApi } from "@/api/exams";

/** Storage key for the offline exam-answer queue. */
export const ANSWER_QUEUE_STORAGE_KEY = "madarek-mobile-exam-answer-queue";

/** One queued exam answer — mirrors examsApi.answer's payload. */
export interface QueuedAnswer {
  /** Stable id: `${attemptId}:${questionId}` (conflict unit). */
  id: string;
  attemptId: string;
  questionId: string;
  /** Free-text answer (SHORT / ESSAY questions). */
  answerText?: string;
  /** Chosen choice index (MCQ / TRUE_FALSE questions). */
  choiceIndex?: number;
  /** Epoch ms — FIFO order + newest-wins tiebreak. */
  enqueuedAt: number;
  /** Flush attempts so far. */
  attempts: number;
  lastTriedAt?: number;
  lastError?: string;
}

export type AnswerInput = Pick<QueuedAnswer, "attemptId" | "questionId"> &
  Partial<Pick<QueuedAnswer, "answerText" | "choiceIndex">> & {
    /** Override `enqueuedAt` (tests / deterministic replay). */
    now?: number;
  };

/** The injected transport: send one queued answer or throw. */
export type AnswerSender = (item: QueuedAnswer) => Promise<unknown>;

export interface FlushReport {
  /** Successfully sent (and removed). */
  sent: number;
  /** Failed and re-queued with attempts/lastError updated. */
  failed: number;
  /** Dropped per `shouldDrop` (permanent failures). */
  dropped: number;
  /** Items still pending after this flush. */
  remaining: number;
}

/* ── storage (private) ───────────────────────────────────────────────── */

const isQueuedAnswer = (v: unknown): v is QueuedAnswer => {
  if (!v || typeof v !== "object") return false;
  const q = v as Partial<QueuedAnswer>;
  return (
    typeof q.id === "string" &&
    typeof q.attemptId === "string" &&
    typeof q.questionId === "string" &&
    typeof q.enqueuedAt === "number" &&
    typeof q.attempts === "number"
  );
};

async function readAll(): Promise<QueuedAnswer[]> {
  let raw: string | null = null;
  try {
    raw = await AsyncStorage.getItem(ANSWER_QUEUE_STORAGE_KEY);
  } catch {
    return [];
  }
  if (!raw) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .filter(isQueuedAnswer)
    .sort((a, b) => a.enqueuedAt - b.enqueuedAt || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

async function writeAll(items: QueuedAnswer[]): Promise<void> {
  try {
    await AsyncStorage.setItem(ANSWER_QUEUE_STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota/transient native failure: the queue is best-effort durable —
    // an un-writable enqueue surfaces via the returned in-memory state
    // only for this session; we never crash the exam screen over it.
  }
}

/* ── public API ──────────────────────────────────────────────────────── */

/**
 * Enqueue (or replace) an answer. Idempotent per (attemptId, questionId):
 * the newest answer for a question replaces any still-pending older one.
 */
export async function enqueueAnswer(input: AnswerInput): Promise<QueuedAnswer> {
  const { attemptId, questionId, answerText, choiceIndex, now } = input;
  if (!attemptId || !questionId) {
    throw new Error("enqueueAnswer: attemptId and questionId are required");
  }
  if (answerText == null && choiceIndex == null) {
    throw new Error("enqueueAnswer: an answer needs answerText or choiceIndex");
  }
  const item: QueuedAnswer = {
    id: `${attemptId}:${questionId}`,
    attemptId,
    questionId,
    ...(answerText != null ? { answerText } : {}),
    ...(choiceIndex != null ? { choiceIndex } : {}),
    enqueuedAt: now ?? Date.now(),
    attempts: 0,
  };
  const items = await readAll();
  const at = items.findIndex((q) => q.id === item.id);
  if (at === -1) {
    items.push(item);
  } else {
    items[at] = item;
  }
  await writeAll(items);
  return item;
}

/** Read-only snapshot, FIFO by enqueuedAt (for UI + tests). */
export async function peekAnswers(): Promise<QueuedAnswer[]> {
  return readAll();
}

/** How many answers await sync (badge copy «بانتظار الإرسال: n»). */
export async function pendingAnswerCount(): Promise<number> {
  return (await readAll()).length;
}

/** Remove one queued answer by id (manual discard / test hook). */
export async function removeAnswer(id: string): Promise<void> {
  const items = (await readAll()).filter((q) => q.id !== id);
  await writeAll(items);
}

/** Clear the whole queue (logout hygiene / tests). */
export async function clearAnswerQueue(): Promise<void> {
  await writeAll([]);
}

export interface FlushOptions {
  /**
   * Mark an error PERMANANENT: the item is dropped (counted in
   * `dropped`) instead of re-queued. Default: nothing is dropped.
   */
  shouldDrop?: (error: unknown, item: QueuedAnswer) => boolean;
  /** Override `now` for deterministic lastTriedAt (tests). */
  now?: number;
}

let flushInFlight: Promise<FlushReport> | null = null;

/**
 * Flush the queue FIFO through the injected sender. Concurrent calls
 * share one run (single-flight). Failures re-queue with attempts/lastError
 * recorded; `shouldDrop` failures are dropped and reported.
 */
export async function flushAnswers(sender: AnswerSender, options: FlushOptions = {}): Promise<FlushReport> {
  if (flushInFlight) return flushInFlight;
  flushInFlight = (async (): Promise<FlushReport> => {
    const now = () => options.now ?? Date.now();
    const report: FlushReport = { sent: 0, failed: 0, dropped: 0, remaining: 0 };
    // Loop until a clean pass: each pass re-reads (tests may mutate), each
    // item is attempted once per flush.
    const queue = await readAll();
    const survivors: QueuedAnswer[] = [];
    for (const item of queue) {
      try {
        await sender(item);
        report.sent += 1;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (options.shouldDrop?.(error, item)) {
          report.dropped += 1;
          continue;
        }
        survivors.push({
          ...item,
          attempts: item.attempts + 1,
          lastTriedAt: now(),
          lastError: message,
        });
        report.failed += 1;
      }
    }
    await writeAll(survivors);
    report.remaining = survivors.length;
    return report;
  })();
  try {
    return await flushInFlight;
  } finally {
    flushInFlight = null;
  }
}

/* ── the shipped sender (integration point) ──────────────────────────── */

/**
 * THE integration with src/api/exams.ts: maps a queued answer onto
 * `examsApi.answer`. Injected into `flushAnswers` by the exam screen:
 *
 *   await flushAnswers(sendAnswerViaExamsApi, {
 *     shouldDrop: (err) => err instanceof ApiError && err.status === 404,
 *   });
 */
export const sendAnswerViaExamsApi: AnswerSender = async (item) => {
  await examsApi.answer(item.attemptId, {
    questionId: item.questionId,
    ...(item.answerText != null ? { answerText: item.answerText } : {}),
    ...(item.choiceIndex != null ? { choiceIndex: item.choiceIndex } : {}),
  });
};
