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
 * unit-testable and SSR-safe.
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

export const overlayStack: OverlayStackApi = Object.freeze({
  register(id: string, kind: string): void {
    const existing = indexOfId(id);
    if (existing !== -1) stack.splice(existing, 1);
    stack.push({ id, kind });
  },

  unregister(id: string): void {
    const existing = indexOfId(id);
    if (existing !== -1) stack.splice(existing, 1);
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
