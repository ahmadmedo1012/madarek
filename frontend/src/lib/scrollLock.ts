/**
 * scrollLock — the single, ref-counted writer of the body scroll lock
 * (audit 11-e P2-12).
 *
 * Problem it solves: two independent writers touched
 * `document.body.style.overflow` (useFocusTrap's save/restore and the
 * Sidebar drawer's unconditional write). A drawer cycle while a modal
 * was open silently dropped the modal's lock — the background scrolled
 * behind the dialog.
 *
 * Contract:
 *   - Holders are identified by a stable key (overlay primitives pass
 *     their overlayStack id), so the count is idempotent per holder —
 *     double-acquire can't leak, StrictMode's mount→cleanup→mount
 *     effect cycle nets out, and a crashed release can't over-release
 *     someone else's lock.
 *   - The lock manifests as ONE body class; the matching CSS rule is
 *     injected once (this module's only DOM write besides the class
 *     itself). A class — not an inline style — on purpose: inline
 *     writes from legacy writers (the Sidebar drawer until it migrates)
 *     compose safely with a class (they clobber only their own inline
 *     value) but would clobber a coordinated inline writer.
 *   - `body.style.overflow` is never touched here.
 *
 * Migration hand-off (Sidebar drawer, layout/Sidebar.tsx):
 *
 *   import { acquireScrollLock, releaseScrollLock } from '@/lib/scrollLock';
 *   useEffect(() => {
 *     if (!sidebarOpen) return;
 *     acquireScrollLock('sidebar-drawer');
 *     return () => releaseScrollLock('sidebar-drawer');
 *   }, [sidebarOpen]);
 *
 * Until then the legacy inline write is harmless: it locks/unlocks
 * independently and cannot remove this module's class.
 */

/** The single body class that carries the lock. */
export const SCROLL_LOCK_BODY_CLASS = 'mdrk-scroll-locked';

/** Id of the injected one-rule stylesheet (installed once, kept inert). */
const STYLE_RULE_ID = 'mdrk-scroll-lock-rule';

/** Currently-holding keys. Never exported. */
const holders = new Set<string>();

function ensureLockRule(): void {
  if (typeof document === 'undefined') return;
  if (document.getElementById(STYLE_RULE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_RULE_ID;
  // The lock's entire CSS surface — one rule, one class.
  style.textContent = `body.${SCROLL_LOCK_BODY_CLASS}{overflow:hidden;}`;
  document.head?.appendChild(style);
}

function syncBodyClass(): void {
  if (typeof document === 'undefined') return;
  document.body.classList.toggle(SCROLL_LOCK_BODY_CLASS, holders.size > 0);
}

/** Registers `holder` as keeping the body scroll locked. Idempotent per
 *  holder; the class is applied while at least one holder remains. */
export function acquireScrollLock(holder: string): void {
  const isNew = !holders.has(holder);
  holders.add(holder);
  if (!isNew) return;
  ensureLockRule();
  syncBodyClass();
}

/** Releases `holder`'s claim. Unknown keys are a no-op; the class is
 *  removed only when the last holder is gone. */
export function releaseScrollLock(holder: string): void {
  if (!holders.delete(holder)) return;
  syncBodyClass();
}

/** True while at least one holder keeps the body locked. */
export function isScrollLocked(): boolean {
  return holders.size > 0;
}
