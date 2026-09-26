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

/** Field controls — the primary content of a form dialog. */
const FIELD_CONTROL_SELECTOR =
  'input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled])';

/** Dismiss affordances (X buttons) — skipped by the initial-focus pass.
 * The primitive-rendered ones carry data-close-button; every hand-rolled
 * close in the app names itself «إغلاق …» ("close …") via aria-label,
 * which this predicate recognizes too. The close button is never removed
 * from the Tab cycle — it just stops being the first thing announced. */
function isDismissControl(el: HTMLElement): boolean {
  if (el.dataset.closeButton !== undefined) return true;
  const name = (el.getAttribute('aria-label') ?? '').trim();
  return name === 'إغلاق' || name.startsWith('إغلاق ') || name.toLowerCase() === 'close';
}

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
  //
  // Initial-focus policy (A10 P2-1): the first thing a keyboard/SR user
  // hears inside a blocking overlay used to be the header's close (X)
  // button — one stray Enter dismissed the layer (data-loss-free only
  // where a discard guard exists). Priority order now:
  //   1. the first field control (input/select/textarea) — a form
  //      dialog opens on the first thing to fill;
  //   2. the first focusable that is NOT a dismiss affordance — a
  //      button-only dialog (e.g. ConfirmDialog) opens on its leading
  //      (safe) action, as measured live in the audit's verified-good
  //      list;
  //   3. the dialog surface itself (tabIndex -1 on the card) — a
  //      view-only overlay opens on its context; the close button is
  //      the first Tab stop (and Esc always works).
  useEffect(() => {
    if (!open) return;
    acquireScrollLock(overlayId);
    const previousActive = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      const root = containerRef.current;
      if (!root) return;
      const control = root.querySelector<HTMLElement>(FIELD_CONTROL_SELECTOR);
      if (control) {
        control.focus();
        return;
      }
      const content = Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).find(
        (el) => !isDismissControl(el),
      );
      if (content) {
        content.focus();
        return;
      }
      root.focus();
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
      // 15-g P2-2 — body-focus leak: clicking non-focusable chrome
      // inside an open overlay (a paragraph, the card surface) blurs
      // focus to <body>, and the boundary checks below never match, so
      // Tab escapes the scrim and walks the app BEHIND the overlay.
      // Reclaim instead: pull focus back to the leading edge the key
      // press is heading toward. Scoped to the topmost layer via the
      // overlay stack so a focus-trapped overlay never steals a Tab
      // aimed at an anchored layer opened above it (dropdown /
      // notification panel — those own Tab-dismiss themselves).
      if (
        overlayStack.isTop(overlayId) &&
        (!(active instanceof Node) || !containerRef.current.contains(active))
      ) {
        e.preventDefault();
        (e.shiftKey ? last : first).focus();
        return;
      }
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
