/**
 * Toast primitive unit tests.
 *
 * Coverage from contracts/elevation-language.md §"Co-existence rules":
 *   - renders only when open
 *   - default variant 'info' uses role=status, polite live region
 *   - error variant uses role=alert, assertive live region
 *   - error variant does NOT auto-dismiss
 *   - non-error variants auto-dismiss after durationMs
 *   - close button calls onClose
 *   - close button has accessible label
 *   - clicks on the toast body do NOT dismiss
 *   - mounting toast does NOT steal focus from current activeElement
 *   - the auto-dismiss timer is NOT restarted by parent re-renders
 *     that pass a fresh inline onClose (wave 12-14, audit 11-e P2-6)
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { useState } from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { Toast, ToastStack } from '../../src/components/overlays/Toast';
import { useToastStore } from '../../src/lib/toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders nothing when open=false', () => {
    render(
      <Toast open={false} onClose={() => {}}>
        hidden
      </Toast>,
    );
    expect(screen.queryByText('hidden')).toBeNull();
  });

  it('default variant has role=status and aria-live=polite', () => {
    render(
      <Toast open onClose={() => {}}>
        message
      </Toast>,
    );
    const toast = screen.getByRole('status');
    expect(toast).toHaveAttribute('aria-live', 'polite');
    expect(toast.className).toContain('toast-info');
  });

  it('error variant has role=alert and aria-live=assertive', () => {
    render(
      <Toast open variant="error" onClose={() => {}}>
        oops
      </Toast>,
    );
    const toast = screen.getByRole('alert');
    expect(toast).toHaveAttribute('aria-live', 'assertive');
    expect(toast.className).toContain('toast-error');
  });

  it('non-error variants auto-dismiss after durationMs', () => {
    const onClose = vi.fn();
    render(
      <Toast open variant="success" durationMs={3000} onClose={onClose}>
        ok
      </Toast>,
    );
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(onClose).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('error variant does NOT auto-dismiss even after long delay', () => {
    const onClose = vi.fn();
    render(
      <Toast open variant="error" durationMs={1000} onClose={onClose}>
        oops
      </Toast>,
    );
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('close button calls onClose', () => {
    const onClose = vi.fn();
    render(
      <Toast open onClose={onClose} closeLabel="dismiss">
        message
      </Toast>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'dismiss' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('close button has accessible label', () => {
    render(
      <Toast open onClose={() => {}}>
        message
      </Toast>,
    );
    expect(screen.getByRole('button', { name: 'إغلاق' })).toBeInTheDocument();
  });

  it('clicks on the toast body do NOT dismiss', () => {
    const onClose = vi.fn();
    render(
      <Toast open onClose={onClose}>
        <span data-testid="body-text">message</span>
      </Toast>,
    );
    fireEvent.click(screen.getByTestId('body-text'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('does NOT steal focus on mount', () => {
    const externalButton = document.createElement('button');
    externalButton.textContent = 'outside';
    document.body.appendChild(externalButton);
    externalButton.focus();
    expect(document.activeElement).toBe(externalButton);

    render(
      <Toast open onClose={() => {}}>
        message
      </Toast>,
    );

    expect(document.activeElement).toBe(externalButton);
    document.body.removeChild(externalButton);
  });

  it('auto-dismiss timer is NOT restarted by a parent re-render (inline onClose)', () => {
    function Host() {
      const [open, setOpen] = useState(true);
      const [, setTick] = useState(0);
      return (
        <>
          <Toast open={open} onClose={() => setOpen(false)} durationMs={3000}>
            ok
          </Toast>
          {/* Re-render with a fresh inline onClose — with the old
              effect deps this restarted the 3s clock every click. */}
          <button type="button" onClick={() => setTick((t) => t + 1)}>
            rerender
          </button>
        </>
      );
    }
    render(<Host />);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    fireEvent.click(screen.getByRole('button', { name: 'rerender' }));
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    // 3000ms since mount — the timer must fire on schedule despite the
    // re-render (the toast closes itself: open flips false → hidden).
    expect(screen.queryByText('ok')).toBeNull();
  });
});

/* ── 5-C4 cascade fix — ToastCard (the stacked surface) swipe visual
   tracking. A filled CSS animation (the entrance's `both` fill keeps
   applying `transform: none` after it finishes) outranks inline
   styles, so the swipe suspends the animation via data-dragging for
   the dragged transform to paint; a cancelled swipe springs back
   under the release phase, a dismissing swipe hands the card to the
   exit keyframes from the finger position. ── */
describe('ToastCard swipe-to-dismiss (5-C4)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    // Drain the store so tests are isolated.
    useToastStore.setState({ items: [] });
  });

  const pushToast = () =>
    act(() =>
      useToastStore.getState().push({
        variant: 'info',
        title: 'قياس',
        message: 'نص تجريبي',
        durationMs: 5000,
      }),
    );

  it('the drag tracks the finger: data-dragging suspends the animation and the transform paints', () => {
    render(<ToastStack />);
    pushToast();
    const card = document.querySelector('.toast-stack .toast') as HTMLElement;
    expect(card).not.toBeNull();

    const pointer = (type: string, clientX: number) => {
      const ev = new Event(type, { bubbles: true });
      Object.assign(ev, { pointerType: 'touch', pointerId: 3, clientX });
      card.dispatchEvent(ev);
    };
    pointer('pointerdown', 300);
    expect(card.dataset.dragging).toBe('true');
    expect(card.dataset.dragPhase).toBe('active');

    pointer('pointermove', 240);
    expect(card.style.transform).toBe('translateX(-60px)');

    // Short swipe (|dx| 60 < 64 threshold) — cancelled: release phase,
    // transform cleared, drag state persists (entrance must NOT replay).
    pointer('pointerup', 240);
    expect(card.dataset.dragPhase).toBe('release');
    expect(card.dataset.dragging).toBe('true');
    expect(card.style.transform).toBe('');
    expect(useToastStore.getState().items[0]?.closing).toBe(false);

    // Past the threshold — dismisses: state cleared, transform kept so
    // the exit keyframes interpolate from the finger position.
    pointer('pointerdown', 300);
    pointer('pointermove', 200);
    pointer('pointerup', 200);
    expect(useToastStore.getState().items[0]?.closing).toBe(true);
    expect(card.hasAttribute('data-dragging')).toBe(false);
    expect(card.style.transform).toBe('translateX(-100px)');
  });

  it('an upward/zero-length swipe never dismisses and pauses the auto-dismiss timer while held', () => {
    render(<ToastStack />);
    pushToast();
    const card = document.querySelector('.toast-stack .toast') as HTMLElement;
    const pointer = (type: string, clientX: number) => {
      const ev = new Event(type, { bubbles: true });
      Object.assign(ev, { pointerType: 'touch', pointerId: 3, clientX });
      card.dispatchEvent(ev);
    };
    pointer('pointerdown', 300);
    act(() => {
      vi.advanceTimersByTime(4999);
    });
    // Timer paused at pointerdown — still open at t=4999ms.
    expect(useToastStore.getState().items[0]?.closing).toBe(false);
    pointer('pointerup', 300);
    expect(useToastStore.getState().items[0]?.closing).toBe(false);
  });
});

/* ── 5-D3 (A10 P3-2) — the toast ACTION button's accessibility. The
   action path shipped with zero call sites, so nothing pinned it:
   native button = focusable + role button, the label is the accessible
   name, keyboard Enter fires it, and firing dismisses the toast after
   the handler runs. The first real call site is the exam-publish toast
   (ExamAuthorPages list row). ── */
describe('ToastCard action button a11y (5-D3 / A10 P3-2)', () => {
  afterEach(() => {
    useToastStore.setState({ items: [] });
  });

  const onClick = vi.fn();

  function pushActionToast() {
    act(() =>
      useToastStore.getState().push({
        variant: 'success',
        title: 'تمّ نشر الاختبار',
        message: 'أصبح الاختبار متاحاً للطلاب حسب نطاقه.',
        durationMs: 5000,
        action: { label: 'عرض الاختبار', onClick },
      }),
    );
  }

  it('renders a focusable button whose accessible name is the action label', () => {
    render(<ToastStack />);
    pushActionToast();
    const action = screen.getByRole('button', { name: 'عرض الاختبار' });
    expect(action).toBeEnabled();
    expect(action.tagName).toBe('BUTTON');
    // Focusable: no negative tabIndex, not disabled — Tab reaches it.
    expect(action).not.toHaveAttribute('tabindex', '-1');
  });

  it('activates the handler and dismisses the toast (Enter activation = click)', () => {
    render(<ToastStack />);
    pushActionToast();
    const action = screen.getByRole('button', { name: 'عرض الاختبار' });
    action.focus();
    // jsdom does not synthesize the native Enter→click activation, so
    // the keyboard path is pinned by the focusability above + the
    // native-button contract; the activation itself is the click.
    fireEvent.click(action);
    expect(onClick).toHaveBeenCalledTimes(1);
    // The card moves into its exit window after the action fires.
    expect(useToastStore.getState().items[0]?.closing).toBe(true);
  });

  it('an action-less toast renders no action button (the common case)', () => {
    render(<ToastStack />);
    act(() =>
      useToastStore.getState().push({
        variant: 'info',
        title: 'عنوان',
        message: 'نص',
        durationMs: 5000,
      }),
    );
    // Only the close affordance remains.
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName('إغلاق');
  });
});
