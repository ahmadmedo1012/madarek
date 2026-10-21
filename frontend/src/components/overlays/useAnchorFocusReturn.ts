/**
 * useAnchorFocusReturn — closes the anchored-overlay focus loop on EVERY
 * keyboard-relevant close path (r305 Heron overlay grammar).
 *
 * The anchored primitives (Dropdown / Popover / NotificationPanel) have
 * always restored focus to their trigger on the keyboard exits they own
 * themselves (Escape, and Tab for Dropdown). But a close driven from
 * INSIDE the panel — a menuitem activation, a panel action button —
 * dropped focus on the floor: the activating control unmounted with the
 * panel and focus fell to <body>, so the next Tab walked the page from
 * the top and screen readers lost their place in the chrome.
 *
 * The contract: when the overlay closes while focus is still inside the
 * panel, focus returns to the trigger — the same outcome the Escape
 * path already produces, now guaranteed for every close path:
 *
 *   - Esc / Tab dismiss   → the primitive's own key handler focuses the
 *     anchor first; by the time this effect runs the anchor is focused,
 *     `panel.contains(activeElement)` is false → no-op (no double move).
 *   - outside click       → focus already followed the pointer (or sits
 *     on <body>) → outside the panel → no-op. Forcing the anchor back
 *     here would fight the click the user just made.
 *   - item/action activation, consumer close with focus inside →
 *     RESTORE to the trigger (this hook's reason to exist).
 *
 * Runs at the open→false transition while the panel is still mounted
 * (the exit window), so `panelRef.current` is real and the check is
 * honest. Idempotent under StrictMode's double-invoked effects.
 */
import { useEffect, type RefObject } from 'react';

export function useAnchorFocusReturn(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  panelRef: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    if (open) return;
    const panel = panelRef.current;
    const anchor = anchorRef.current;
    if (!panel || !anchor) return;
    const active = document.activeElement;
    if (active instanceof Node && panel.contains(active)) anchor.focus();
  }, [open, anchorRef, panelRef]);
}
