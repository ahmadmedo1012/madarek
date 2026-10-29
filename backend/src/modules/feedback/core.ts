/**
 * r323 B3.6 — the pilot feedback loop (pure layer).
 *
 * The floating «أبلغ عن مشكلة / اقتراح» must be honest about what it
 * carries: a bounded note, a bounded console ring (the LAST errors,
 * newest last, each text clipped), an optional screenshot that is a
 * real downscaled data URL — and a status grammar the inbox cannot
 * break. Pure so every guard is unit-tested without a DB.
 */

export interface ConsoleEntry {
  /** ms epoch — stamped by the tape, trusted from the client anyway. */
  t: number;
  text: string;
}

/** Console ring: the last 20 errors, each text clipped to 500 chars —
 *  a stack trace's value is its head, not its 200-frame tail. */
export const CONSOLE_RING_MAX = 20;
export const CONSOLE_TEXT_MAX = 500;

export function pushConsoleEntry(ring: ConsoleEntry[], raw: unknown, now: number = Date.now()): ConsoleEntry[] {
  const text =
    typeof raw === 'string'
      ? raw
      : raw instanceof Error
        ? `${raw.message}`
        : (() => {
            try {
              return JSON.stringify(raw) ?? '';
            } catch {
              return '[unserializable]';
            }
          })();
  const next = [...ring, { t: now, text: text.slice(0, CONSOLE_TEXT_MAX) }];
  return next.length > CONSOLE_RING_MAX ? next.slice(next.length - CONSOLE_RING_MAX) : next;
}

/** The screenshot guard: a real image data URL, JPEG/PNG only, ≤ 600 KB
 *  of base64 (the client downscales before sending — this is the
 *  server's honest ceiling, not an invitation). */
export const SCREENSHOT_MAX_CHARS = 600_000;

export function screenshotOk(v: unknown): boolean {
  if (typeof v !== 'string' || v.length === 0) return false;
  if (v.length > SCREENSHOT_MAX_CHARS) return false;
  return /^data:image\/(png|jpeg);base64,[A-Za-z0-9+/=]+$/.test(v);
}

export type FeedbackStatus = 'open' | 'triage' | 'fixed' | 'dismissed';

/** The inbox's status grammar: open → triage|fixed|dismissed, triage →
 *  fixed|dismissed, fixed/dismissed terminal (a wrong-clicked «fixed»
 *  is refiled as a new report — the audit trail stays honest). */
export function canTransitionStatus(from: FeedbackStatus, to: FeedbackStatus): boolean {
  if (from === 'open') return to === 'triage' || to === 'fixed' || to === 'dismissed';
  if (from === 'triage') return to === 'fixed' || to === 'dismissed';
  return false;
}
