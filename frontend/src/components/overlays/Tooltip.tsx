/**
 * Tooltip — passive hover/focus overlay primitive.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/elevation-language.md.
 * Tokens: --elev-2 + --r-sm + --z-tooltip (250), NO glass.
 *
 * Wraps a single child. The tooltip appears above the child on hover or
 * keyboard focus and disappears on blur or pointerleave.
 *
 * Wave 7-a (audit 0-c P1-6/P3): hover-intent delay (~300ms open,
 * instant close), an ::after caret aimed at the anchor (arrow offset
 * computed in px so clamping never detaches it), viewport clamping in
 * both axes, and Escape closes.
 *
 * Per the contract:
 *   - Tooltips DO NOT trap focus.
 *   - Tooltips DO NOT lock body scroll.
 *   - Tooltips appear at z-index 250 (above popovers, below sheets).
 */
import {
  cloneElement,
  isValidElement,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

export interface TooltipProps {
  /** The trigger element. Must be a single element that accepts a ref. */
  children: ReactElement<{
    onMouseEnter?: (e: React.MouseEvent) => void;
    onMouseLeave?: (e: React.MouseEvent) => void;
    onFocus?: (e: React.FocusEvent) => void;
    onBlur?: (e: React.FocusEvent) => void;
    'aria-describedby'?: string;
  }>;
  /** The tooltip content. */
  content: ReactNode;
  /** Hover-intent delay before showing, ms. Default 300 (focus shows instantly). */
  showDelayMs?: number;
}

interface Position {
  top: number;
  left: number;
  /** True when the tip flipped below the anchor (no room above). */
  below: boolean;
  /** Caret offset from the tip's left edge — aims at the anchor. */
  arrowX: number;
}

const VIEWPORT_PAD = 8;
const ARROW_MIN_INSET = 12;

function readPosition(anchor: HTMLElement, tip: HTMLElement | null): Position {
  const r = anchor.getBoundingClientRect();
  const tw = tip?.offsetWidth ?? 0;
  const th = tip?.offsetHeight ?? 0;
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Prefer above; flip below when there is no room above but there is
  // below. If neither fits, clamp — the tip stays fully in view.
  let top = r.top - th - 8;
  let below = false;
  if (top < VIEWPORT_PAD && r.bottom + 8 + th <= vh - VIEWPORT_PAD) {
    top = r.bottom + 8;
    below = true;
  }
  top = Math.min(Math.max(top, VIEWPORT_PAD), Math.max(VIEWPORT_PAD, vh - th - VIEWPORT_PAD));

  // Center on the anchor, then clamp inside the viewport.
  let left = r.left + r.width / 2 - tw / 2;
  left = Math.max(VIEWPORT_PAD, Math.min(vw - tw - VIEWPORT_PAD, left));

  // Caret aims at the anchor's center, clamped inside the tip so it
  // never detaches from the bubble when the bubble itself is clamped.
  const anchorCx = r.left + r.width / 2;
  const arrowX = Math.max(ARROW_MIN_INSET, Math.min((tw || 0) - ARROW_MIN_INSET, anchorCx - left));

  return { top, below, left, arrowX };
}

export function Tooltip({ children, content, showDelayMs = 300 }: TooltipProps) {
  const tooltipId = useId();
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<Position | null>(null);
  const anchorRef = useRef<HTMLElement | null>(null);
  const tipRef = useRef<HTMLDivElement | null>(null);
  const timerRef = useRef<number | null>(null);

  const show = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => setOpen(true), showDelayMs);
  };
  const hide = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setOpen(false);
  }, []);

  // Position once the tip is mounted (it must exist to be measured —
  // a two-phase mount keeps the metrics real on first open), then
  // reposition on resize/scroll. All passes run before paint.
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      if (anchorRef.current) setPos(readPosition(anchorRef.current, tipRef.current));
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

  // Escape closes (instant — no exit animation for tooltips).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hide();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, hide]);

  if (!isValidElement(children)) return children as unknown as ReactElement;

  const child = children;
  const trigger = cloneElement(child, {
    ref: (node: HTMLElement | null) => {
      anchorRef.current = node;
      const ref = (child as unknown as { ref?: unknown }).ref;
      if (typeof ref === 'function') ref(node);
      else if (ref && typeof ref === 'object')
        (ref as { current: HTMLElement | null }).current = node;
    },
    'aria-describedby': open ? tooltipId : child.props['aria-describedby'],
    onMouseEnter: (e: React.MouseEvent) => {
      child.props.onMouseEnter?.(e);
      show();
    },
    onMouseLeave: (e: React.MouseEvent) => {
      child.props.onMouseLeave?.(e);
      hide();
    },
    onFocus: (e: React.FocusEvent) => {
      child.props.onFocus?.(e);
      setOpen(true);
    },
    onBlur: (e: React.FocusEvent) => {
      child.props.onBlur?.(e);
      hide();
    },
  } as Partial<{
    ref: (node: HTMLElement | null) => void;
    'aria-describedby': string | undefined;
    onMouseEnter: (e: React.MouseEvent) => void;
    onMouseLeave: (e: React.MouseEvent) => void;
    onFocus: (e: React.FocusEvent) => void;
    onBlur: (e: React.FocusEvent) => void;
  }>);

  const style: CSSProperties = pos
    ? ({
        top: pos.top,
        left: pos.left,
        // Physical px — the caret offset is derived from physical
        // viewport geometry, not logical flow.
        '--tip-arrow-x': `${pos.arrowX}px`,
      } as CSSProperties)
    : { visibility: 'hidden' };

  const portal =
    open && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={tipRef}
            id={tooltipId}
            role="tooltip"
            className="tooltip"
            data-side={pos?.below ? 'below' : 'above'}
            style={style}
          >
            {content}
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {trigger}
      {portal}
    </>
  );
}
