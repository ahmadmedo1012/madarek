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
import { Toast } from '../../src/components/overlays/Toast';

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
