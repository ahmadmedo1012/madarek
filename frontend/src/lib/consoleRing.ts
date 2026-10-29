/**
 * consoleRing — r323 B3.6 — the pure ring grammar the console tape and
 * the feedback widget share with the backend's feedback/core (same
 * caps, same clip — pinned by unit tests on BOTH sides; a drift here
 * fails the FE test, the BE test, or both).
 */

export interface ConsoleEntry {
  /** ms epoch — stamped by the tape, trusted from the client anyway. */
  t: number;
  text: string;
}

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
