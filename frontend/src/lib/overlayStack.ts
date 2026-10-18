/**
 * overlayStack — the module-scoped registry of OPEN overlay layers
 * (audit 11-e P1-2).
 *
 * Problem it solves: every overlay primitive listens for Escape on
 * `document`, and `stopPropagation()` cannot stop OTHER listeners on the
 * SAME node — so one Escape dismissed every stacked overlay at once
 * (Modal + Dropdown, Modal over Modal, a locked authoring dialog over
 * the flow that opened it…).
 *
 * Contract:
 *   - An overlay registers itself when it opens and unregisters when it
 *     closes (useOverlayRegistration does this for the primitives).
 *   - Only the TOPMOST entry answers Escape; it also calls
 *     `stopImmediatePropagation()` so overlays below and document-level
 *     shortcuts (⌘K, "/", Ctrl+B…) cannot react to a key the top layer
 *     owns. This holds even when the top layer declines to close
 *     (`closeOnEscape=false`): the key is still aimed at it.
 *   - Registration order mirrors open order (effects), so the stack is
 *     exactly the visual layering of the open overlays.
 *
 * Global-shortcut guard (audit 11-e P1-6) — from any document-level
 * chord listener:
 *
 *   import { overlayStack } from '@/lib/overlayStack';
 *   // …inside the keydown handler, before focusing anything:
 *   if (!overlayStack.isEmpty()) return; // an overlay owns the keyboard
 *
 * DOM fallback for consumers that cannot import this module:
 *   document.querySelector('[aria-modal="true"]') !== null.
 *
 * Pure module state — no DOM access, no React — so it is trivially
 * unit-testable and SSR-safe. (The r183-B7 history side-channel below
 * is the one deliberate exception: it is feature-gated on
 * `window.history` existing, so SSR and jsdom-without-DOM degrade to
 * the pure registry.)
 *
 * ── History integration (r183-B7, A4 finding 2) ─────────────────────
 *
 * Transient overlays used to be URL-blind: a hardware/browser Back
 * with the drawer or ⌘K palette open navigated the page UNDER the
 * overlay — the drawer stayed open over the previous page with body
 * scroll locked (A4 live-measured inside the SPA). The platform
 * decision: while any overlay is open, Back must CLOSE the topmost
 * overlay instead of navigating.
 *
 * Mechanism (one push per blocking layer, one global popstate
 * listener):
 *   - register() of a blocking layer pushes a marker entry on top of
 *     the history stack — `pushState({ ...history.state,
 *     madarekOverlay: id }, '')` — no URL change, and the router's
 *     own state (usr/key/idx) is preserved inside the marker entry.
 *   - unregister() (UI close: X, Esc, outside click) consumes that
 *     entry via `history.back()` when the CURRENT entry still carries
 *     OUR id — the back keeps the same URL, so it is invisible; a
 *     suppress flag makes the popstate it fires a no-op. When the
 *     current entry is NOT ours (the layer closed because something
 *     navigated above the marker — drawer link click, palette
 *     result), no back happens: those consumers replace/navigate on
 *     the marker entry itself (Sidebar `replace`, palette goTo), so
 *     nothing strands.
 *   - ONE popstate listener (armed on the first blocking register,
 *     never removed): if the stack is empty it is a normal SPA
 *     navigation — ignore; if an overlay is open, the back consumed
 *     one entry, so the topmost layer must go — it is dismissed with
 *     a synthetic Escape keydown on `document`, which reuses the
 *     platform's whole Esc choreography (only the topmost layer
 *     answers, layers that decline closeOnEscape keep the key, focus
 *     returns to the opener). Net: first Back closes the overlay at
 *     the same URL, second Back navigates.
 *
 * Which layers participate: only the blocking layers — the ones that
 * trap focus and lock body scroll ('modal' | 'sheet' |
 * 'command-palette' | 'lightbox' | 'sidebar-drawer'). Anchored
 * micro-layers (dropdown / popover / notification-panel) do not lock
 * scroll, so a back under them is not the locked-scroll trap this
 * fixes — and their menu items often navigate, which would strand
 * marker entries.
 */

export interface OverlayStackEntry {
  /** Unique per-overlay-instance id (a React useId string). */
  id: string;
  /**
   * What kind of layer registered — observability for debugging and for
   * future consumers that need to know WHAT is open. Known kinds:
   * 'modal' | 'sheet' | 'command-palette' | 'lightbox' | 'dropdown' |
   * 'popover' | 'notification-panel' (shell drawers may add their own,
   * e.g. 'sidebar-drawer'). Free-form on purpose: layers outside this
   * module's owners must not need to edit it.
   */
  kind: string;
}

export interface OverlayStackApi {
  /** Pushes the overlay on top. Re-registering a known id moves it to
   *  the top instead of duplicating it (idempotent under StrictMode's
   *  double-invoked effects). */
  register(id: string, kind: string): void;
  /** Removes the overlay wherever it sits — layers may close out of
   *  order. Unknown ids are a no-op. */
  unregister(id: string): void;
  /** True when `id` is the topmost open layer. */
  isTop(id: string): boolean;
  /** True when no overlay is open (the P1-6 shortcut guard). */
  isEmpty(): boolean;
  /** Number of open layers. */
  count(): number;
  /** The topmost entry, or null when empty. */
  top(): OverlayStackEntry | null;
}

/** Open overlays, bottom-first. Never exported directly. */
const stack: OverlayStackEntry[] = [];

function indexOfId(id: string): number {
  for (let i = 0; i < stack.length; i += 1) {
    if (stack[i]!.id === id) return i;
  }
  return -1;
}

/* ── History side-channel state (r183-B7 — see the header) ────────── */

/** The state field that marks a history entry as pushed by an overlay. */
export const OVERLAY_HISTORY_MARKER = 'madarekOverlay';

/** Only blocking layers (focus-trap + scroll-lock) own a history entry.
 *  See the header for why anchored micro-layers stay out. */
const HISTORY_PARTICIPATING_KINDS: ReadonlySet<string> = new Set([
  'modal',
  'sheet',
  'command-palette',
  'lightbox',
  'sidebar-drawer',
]);

/** True while the browser is usable (SSR + old-jsdom degrade to the
 *  pure registry — no history writes, no listener). */
function hasHistory(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.history != null &&
    typeof window.history.pushState === 'function'
  );
}

/** The current history state as a record, or null. */
function stateRecord(): Record<string, unknown> | null {
  if (!hasHistory()) return null;
  const s = window.history.state;
  return s != null && typeof s === 'object' ? (s as Record<string, unknown>) : null;
}

/** True when the CURRENT history entry carries `id`'s marker. */
function ownsCurrentEntry(id: string): boolean {
  return stateRecord()?.[OVERLAY_HISTORY_MARKER] === id;
}

/** Pending popstate events caused by OUR `history.back()` calls — the
 *  listener must ignore exactly that many pops (loop guard). */
let suppressedPops = 0;

/** True once the single global popstate listener is attached. */
let popstateArmed = false;

/** The back-press translation: with an overlay open, one popstate must
 *  dismiss exactly one layer — the topmost — the same way a real
 *  Escape press would. Dispatched on `document` so every primitive's
 *  existing topmost-only Esc handler answers it (capture listeners on
 *  document fire for events dispatched at document too). */
function dismissTopmostOverlay(): void {
  if (typeof document === 'undefined') return;
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
}

function onPopstate(): void {
  if (suppressedPops > 0) {
    // Our own consume-back landed — the overlay is already closed.
    suppressedPops -= 1;
    return;
  }
  if (stack.length === 0) return; // normal SPA back/forward — not ours
  dismissTopmostOverlay();
}

function ensurePopstateListener(): void {
  if (popstateArmed || !hasHistory()) return;
  popstateArmed = true;
  window.addEventListener('popstate', onPopstate);
}

/** Pushes this layer's marker entry (no URL change; the router's own
 *  state is carried inside so a back onto it stays a no-op for the
 *  router). */
function pushOverlayEntry(id: string, kind: string): void {
  if (!HISTORY_PARTICIPATING_KINDS.has(kind) || !hasHistory()) return;
  ensurePopstateListener();
  // Same-URL push: Back from this entry lands on the page entry below
  // with an unchanged URL — the "first Back closes, second navigates"
  // contract. The previous state is spread so react-router's
  // usr/key/idx survive inside the marker entry.
  const prev = stateRecord();
  window.history.pushState(
    { ...prev, [OVERLAY_HISTORY_MARKER]: id },
    '',
  );
}

/** Consumes this layer's marker entry when it is still the CURRENT
 *  one (UI close): an invisible same-URL back. When the current entry
 *  is not ours, a navigation already happened above the marker — the
 *  drawer/palette consumers replace on the marker itself, so there is
 *  nothing to consume. */
function consumeOverlayEntry(id: string): void {
  if (!hasHistory()) return;
  if (!ownsCurrentEntry(id)) return;
  suppressedPops += 1;
  window.history.back();
}

export const overlayStack: OverlayStackApi = Object.freeze({
  register(id: string, kind: string): void {
    const existing = indexOfId(id);
    if (existing !== -1) stack.splice(existing, 1);
    stack.push({ id, kind });
    pushOverlayEntry(id, kind);
  },

  unregister(id: string): void {
    const existing = indexOfId(id);
    if (existing !== -1) stack.splice(existing, 1);
    consumeOverlayEntry(id);
  },

  isTop(id: string): boolean {
    return stack.length > 0 && stack[stack.length - 1]!.id === id;
  },

  isEmpty(): boolean {
    return stack.length === 0;
  },

  count(): number {
    return stack.length;
  },

  top(): OverlayStackEntry | null {
    return stack.length > 0 ? stack[stack.length - 1]! : null;
  },
});
