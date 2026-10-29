/**
 * consoleTape — r323 B3.6 — the last ~20 console errors, kept in a ring
 * so the feedback widget can ship them with a bug report (the registrar
 * sees WHAT broke, not just «ما يشتغل»). Installed ONCE (idempotent);
 * the pure push grammar lives in the backend's feedback/core and is
 * unit-tested there — this is the browser-side tape that feeds it.
 */
import { pushConsoleEntry, type ConsoleEntry } from './consoleRing';

let ring: ConsoleEntry[] = [];
let installed = false;

/** Capture the error's head: message first, then the first stack
 *  frames — the 500-char clip belongs to the shared ring grammar. */
function toText(args: unknown[]): string {
  const parts = args.map((a) => {
    if (typeof a === 'string') return a;
    if (a instanceof Error) return a.stack ? `${a.message}\n${a.stack.split('\n').slice(1, 4).join('\n')}` : a.message;
    try {
      return JSON.stringify(a) ?? '';
    } catch {
      return '[unserializable]';
    }
  });
  return parts.join(' ');
}

export function consoleTapeEntries(): ConsoleEntry[] {
  return ring;
}

export function consoleTapePush(args: unknown[]): void {
  ring = pushConsoleEntry(ring, toText(args));
}

/** Idempotent install: console.error + window error + unhandled
 *  rejection all feed the same ring. Never re-installs. */
export function installConsoleTape(): void {
  if (installed || typeof window === 'undefined') return;
  installed = true;
  const originalError = console.error.bind(console);
  console.error = (...args: unknown[]) => {
    consoleTapePush(args);
    originalError(...args);
  };
  window.addEventListener('error', (e) => consoleTapePush([e.message]));
  window.addEventListener('unhandledrejection', (e) =>
    consoleTapePush([`unhandled rejection: ${String((e as PromiseRejectionEvent).reason)}`]),
  );
}
