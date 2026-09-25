/**
 * useAnchorAria — keeps an anchored overlay's trigger reflecting the
 * open state (audit 11-e P2 polish: aria-expanded/aria-haspopup
 * consistency).
 *
 * ARIA authoring practices: the element that opens a menu/dialog must
 * carry `aria-haspopup` (the popup type) and `aria-expanded` (its open
 * state). Consumers that already declare them on the trigger keep full
 * ownership — React writes declarative props during commit, BEFORE
 * effects run, so an attribute that is already present on our first
 * look belongs to the consumer and is never touched (no fighting React
 * over the same attribute). Triggers without the attributes get them
 * synced by the platform, so the contract can't be forgotten.
 *
 * The attributes are removed again when the overlay unmounts, and only
 * if this hook added them.
 */
import { useEffect, type RefObject } from 'react';

export function useAnchorAria(
  open: boolean,
  anchorRef: RefObject<HTMLElement | null>,
  /** aria-haspopup value matching the panel's role ("menu" / "dialog"). */
  haspopup: 'menu' | 'dialog',
): void {
  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const ownsExpanded = !anchor.hasAttribute('aria-expanded');
    const ownsHaspopup = !anchor.hasAttribute('aria-haspopup');
    if (ownsExpanded) anchor.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (ownsHaspopup) anchor.setAttribute('aria-haspopup', haspopup);
    return () => {
      if (ownsExpanded) anchor.removeAttribute('aria-expanded');
      if (ownsHaspopup) anchor.removeAttribute('aria-haspopup');
    };
  }, [open, anchorRef, haspopup]);
}
