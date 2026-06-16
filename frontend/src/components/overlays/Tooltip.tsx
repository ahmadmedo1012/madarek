/**
 * Tooltip — passive hover/focus overlay primitive.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/elevation-language.md.
 * Tokens: --elev-2 + --r-sm + --z-tooltip (250), NO glass.
 *
 * Wraps a single child. The tooltip appears above the child on hover or
 * keyboard focus and disappears on blur or pointerleave.
 *
 * Per the contract:
 *   - Tooltips DO NOT trap focus.
 *   - Tooltips DO NOT lock body scroll.
 *   - Tooltips appear at z-index 250 (above popovers, below sheets).
 */
import {
  cloneElement,
  isValidElement,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
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
  /** Delay before showing on hover, ms. Default 200. */
  showDelayMs?: number;
}

interface Position {
  top: number;
  left: number;
}

function readPosition(anchor: HTMLElement, tip: HTMLElement | null): Position {
  const r = anchor.getBoundingClientRect();
  const tw = tip?.offsetWidth ?? 0;
  const th = tip?.offsetHeight ?? 0;
  let top = r.top - th - 8;
  if (top < 4) top = r.bottom + 8;
  let left = r.left + r.width / 2 - tw / 2;
  left = Math.max(8, Math.min(window.innerWidth - tw - 8, left));
  return { top, left };
}

export function Tooltip({ children, content, showDelayMs = 200 }: TooltipProps) {
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
  const hide = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setOpen(false);
  };

  useLayoutEffect(() => {
    if (!open || !anchorRef.current) return;
    setPos(readPosition(anchorRef.current, tipRef.current));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const update = () => {
      if (anchorRef.current) setPos(readPosition(anchorRef.current, tipRef.current));
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [open]);

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

  const portal =
    open && pos && typeof document !== 'undefined'
      ? createPortal(
          <div
            ref={tipRef}
            id={tooltipId}
            role="tooltip"
            className="tooltip"
            style={{ top: pos.top, left: pos.left }}
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
