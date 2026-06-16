/**
 * Shared focus-trap utility — used by every overlay primitive that
 * requires focus containment (Modal, Sheet, CommandPalette, Lightbox).
 *
 * Per specs/012-design-graphics-uplift/contracts/elevation-language.md
 * §"Co-existence rules": Popover and Dropdown do NOT trap focus;
 * Modal/Sheet/CommandPalette/Lightbox DO.
 */
import { useEffect } from 'react';

export const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), ' +
  'select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface FocusTrapOpts {
  open: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
  closeOnEscape: boolean;
  onClose: () => void;
}

export function useFocusTrap({ open, containerRef, closeOnEscape, onClose }: FocusTrapOpts) {
  // Body scroll lock + initial focus + focus-restore.
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const previousActive = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => {
      const first = containerRef.current?.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      first?.focus();
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.body.style.overflow = previousOverflow;
      previousActive?.focus?.();
    };
  }, [open, containerRef]);

  // Esc + Tab cycle.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (closeOnEscape && e.key === 'Escape') {
        e.stopPropagation();
        onClose();
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
  }, [open, closeOnEscape, onClose, containerRef]);
}
