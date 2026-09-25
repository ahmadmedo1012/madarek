/**
 * Shared focus-trap utility — used by every overlay primitive that
 * requires focus containment (Modal, Sheet, CommandPalette, Lightbox).
 *
 * Per specs/012-design-graphics-uplift/contracts/elevation-language.md
 * §"Co-existence rules": Popover and Dropdown do NOT trap focus;
 * Modal/Sheet/CommandPalette/Lightbox DO.
 *
 * Wave 12-14 (audit 11-e P1-2/P2-12):
 *   - The overlay registers in lib/overlayStack.ts while open; Escape
 *     is answered ONLY by the topmost layer, which also calls
 *     stopImmediatePropagation() so overlays below and document-level
 *     shortcuts cannot react to a key the top layer owns. This holds
 *     even when Esc-dismiss is disabled (closeOnEscape=false): the top
 *     layer still owns the key — it just declines to close.
 *   - The body scroll lock goes through the ref-counted single writer
 *     in lib/scrollLock.ts (one body class, keyed by the overlay id),
 *     so stacked overlays and other lock holders compose instead of
 *     clobbering each other's inline overflow writes.
 */
import { useEffect } from 'react';
import { overlayStack } from '../../lib/overlayStack';
import { acquireScrollLock, releaseScrollLock } from '../../lib/scrollLock';
import { useOverlayRegistration } from './useOverlayRegistration';

export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface FocusTrapOpts {
  open: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
  closeOnEscape: boolean;
  onClose: () => void;
  /** Overlay-stack kind (see lib/overlayStack.ts) identifying this layer. */
  overlayKind: string;
}

export function useFocusTrap({
  open,
  containerRef,
  closeOnEscape,
  onClose,
  overlayKind,
}: FocusTrapOpts) {
  const overlayId = useOverlayRegistration(open, overlayKind);

  // Body scroll lock (ref-counted) + initial focus + focus-restore.
  useEffect(() => {
    if (!open) return;
    acquireScrollLock(overlayId);
    const previousActive = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      const first = containerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      first?.focus();
    }, 0);
    return () => {
      window.clearTimeout(t);
      releaseScrollLock(overlayId);
      previousActive?.focus?.();
    };
  }, [open, containerRef, overlayId]);

  // Esc + Tab cycle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Stacked overlays: only the topmost layer answers (P1-2) —
        // one Escape dismisses ONE layer. The key is consumed even when
        // this layer has Esc-dismiss disabled: overlays below it and
        // global shortcuts must not act on a key aimed at the top.
        if (!overlayStack.isTop(overlayId)) return;
        e.stopImmediatePropagation();
        if (closeOnEscape) onClose();
        return;
      }
      if (e.key !== 'Tab' || !containerRef.current) return;
      const nodes = containerRef.current.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
      if (nodes.length === 0) {
        e.preventDefault();
        return;
      }
      const first = nodes[0]!;
      const last = nodes[nodes.length - 1]!;
      const active = document.activeElement;
      if (e.shiftKey && active === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey, true);
    return () => document.removeEventListener('keydown', onKey, true);
  }, [open, closeOnEscape, onClose, containerRef, overlayId]);
}
