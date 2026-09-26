/**
 * Sheet primitive unit tests.
 *
 * Coverage:
 *   - renders only when open
 *   - portal mount + role/aria
 *   - Esc dismissal (default) and opt-out
 *   - overlay click dismissal (default) and opt-out
 *   - clicks inside the panel do NOT dismiss
 *   - side variants apply correct CSS classes
 *   - body scroll lock + release (the ref-counted scrollLock class,
 *     wave 12-14)
 */
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { Sheet } from '../../src/components/overlays/Sheet';
import { SCROLL_LOCK_BODY_CLASS } from '../../src/lib/scrollLock';

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)));

describe('Sheet', () => {
  it('renders nothing when open=false', () => {
    render(
      <Sheet open={false} onClose={() => {}} ariaLabel="Filters">
        <p>hidden</p>
      </Sheet>,
    );
    expect(screen.queryByText('hidden')).toBeNull();
  });

  it('renders with role=dialog and aria-label', () => {
    render(
      <Sheet open onClose={() => {}} ariaLabel="Filters">
        <p>visible</p>
      </Sheet>,
    );
    expect(screen.getByRole('dialog', { name: 'Filters' })).toBeInTheDocument();
  });

  it('defaults side="end" → applies sheet-panel-end class', () => {
    render(
      <Sheet open onClose={() => {}} ariaLabel="X">
        <p>x</p>
      </Sheet>,
    );
    const panel = screen.getByRole('dialog');
    expect(panel.className).toContain('sheet-panel-end');
  });

  it('side="bottom" → applies sheet-panel-bottom class', () => {
    render(
      <Sheet open onClose={() => {}} ariaLabel="X" side="bottom">
        <p>x</p>
      </Sheet>,
    );
    const panel = screen.getByRole('dialog');
    expect(panel.className).toContain('sheet-panel-bottom');
  });

  it('side="start" → applies sheet-panel-start class', () => {
    render(
      <Sheet open onClose={() => {}} ariaLabel="X" side="start">
        <p>x</p>
      </Sheet>,
    );
    const panel = screen.getByRole('dialog');
    expect(panel.className).toContain('sheet-panel-start');
  });

  it('Esc dismisses by default', () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} ariaLabel="X">
        <p>x</p>
      </Sheet>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Esc is suppressed when closeOnEscape=false', () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} ariaLabel="X" closeOnEscape={false}>
        <p>x</p>
      </Sheet>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('overlay click dismisses by default', () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} ariaLabel="X">
        <p>x</p>
      </Sheet>,
    );
    const overlay = screen.getByRole('dialog').parentElement!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicks inside the panel do NOT dismiss', () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} ariaLabel="X">
        <p data-testid="inside">x</p>
      </Sheet>,
    );
    fireEvent.click(screen.getByTestId('inside'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('focuses first focusable element on open', async () => {
    render(
      <Sheet open onClose={() => {}} ariaLabel="X">
        <button type="button">first</button>
        <button type="button">second</button>
      </Sheet>,
    );
    await flush();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'first' }));
  });

  it('locks body scroll while open and releases on close (ref-counted class)', () => {
    const { rerender } = render(
      <Sheet open onClose={() => {}} ariaLabel="X">
        <p>x</p>
      </Sheet>,
    );
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(true);
    rerender(
      <Sheet open={false} onClose={() => {}} ariaLabel="X">
        <p>x</p>
      </Sheet>,
    );
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(false);
  });
});

/* ── 5-C4 (A10 P2-2): the mobile package — slots, size control,
   grabber drag-to-dismiss, and the initial-focus hand-off. ─────── */
describe('Sheet package (5-C4 / A10 P2-2)', () => {
  it('renders the header/body/footer slots and its own close affordance', () => {
    render(
      <Sheet open onClose={() => {}} ariaLabel="X" title="التصفية" footer={<button type="button">تطبيق</button>}>
        <p data-testid="body-content">body</p>
      </Sheet>,
    );
    const panel = screen.getByRole('dialog');
    // Header: visible title + the sheet-owned close (a dismiss control).
    expect(panel.querySelector('.sheet-header .sheet-title')?.textContent).toBe('التصفية');
    const close = screen.getByRole('button', { name: 'إغلاق' });
    expect(close).toHaveAttribute('data-close-button');
    // Body: children land inside the scrolling region.
    const body = panel.querySelector('.sheet-body');
    expect(body).not.toBeNull();
    expect(body?.contains(screen.getByTestId('body-content'))).toBe(true);
    // Footer: docked action row.
    expect(panel.querySelector('.sheet-footer')?.contains(screen.getByRole('button', { name: 'تطبيق' }))).toBe(true);
  });

  it('a bare sheet (no title/footer) still scrolls its body region', () => {
    const { container } = render(
      <Sheet open onClose={() => {}} ariaLabel="X">
        <p>content</p>
      </Sheet>,
    );
    expect(container.ownerDocument.querySelector('.sheet-panel .sheet-body')).not.toBeNull();
    expect(container.ownerDocument.querySelector('.sheet-header')).toBeNull();
    expect(container.ownerDocument.querySelector('.sheet-footer')).toBeNull();
  });

  it('bottom sheets carry the grabber; side sheets do not', () => {
    const { unmount } = render(
      <Sheet open onClose={() => {}} ariaLabel="X" side="bottom">
        <p>x</p>
      </Sheet>,
    );
    expect(document.querySelector('.sheet-grabber')).not.toBeNull();
    unmount();
    render(
      <Sheet open onClose={() => {}} ariaLabel="X" side="end">
        <p>x</p>
      </Sheet>,
    );
    expect(document.querySelector('.sheet-grabber')).toBeNull();
  });

  it('size defaults per side and is overridable (data-size on the overlay)', () => {
    const view1 = render(
      <Sheet open onClose={() => {}} ariaLabel="X" side="end">
        <p>x</p>
      </Sheet>,
    );
    expect(document.querySelector('.sheet-overlay')).toHaveAttribute('data-size', 'full');
    view1.unmount();
    const view2 = render(
      <Sheet open onClose={() => {}} ariaLabel="X" side="bottom">
        <p>x</p>
      </Sheet>,
    );
    expect(document.querySelector('.sheet-overlay')).toHaveAttribute('data-size', 'fit');
    view2.unmount();
    render(
      <Sheet open onClose={() => {}} ariaLabel="X" side="bottom" size="full">
        <p>x</p>
      </Sheet>,
    );
    expect(document.querySelector('.sheet-overlay')).toHaveAttribute('data-size', 'full');
  });

  it('a touch drag past the threshold on the grabber dismisses; short and upward drags do not', () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} ariaLabel="X" side="bottom">
        <p>x</p>
      </Sheet>,
    );
    const grabber = document.querySelector('.sheet-grabber') as HTMLElement;
    // jsdom's pointer events drop the custom init props before React's
    // synthetic layer sees them — dispatch raw events with the props
    // assigned as own properties (React reads them off the native event).
    const pointer = (type: string, clientY: number) => {
      const ev = new Event(type, { bubbles: true });
      Object.assign(ev, { pointerType: 'touch', pointerId: 1, clientY });
      grabber.dispatchEvent(ev);
    };
    // Short downward drag (30px < 72px threshold) — snaps back, no close.
    pointer('pointerdown', 400);
    pointer('pointermove', 430);
    pointer('pointerup', 400);
    expect(onClose).not.toHaveBeenCalled();
    // Upward gesture — never a dismissal.
    pointer('pointerdown', 400);
    pointer('pointermove', 300);
    pointer('pointerup', 300);
    expect(onClose).not.toHaveBeenCalled();
    // Downward drag past the threshold — dismisses.
    pointer('pointerdown', 400);
    pointer('pointermove', 500);
    pointer('pointerup', 500);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  /* 5-C4 cascade fix: a filled CSS animation outranks inline styles,
     so the drag must suspend the entrance animation via data-dragging
     for the dragged transform to paint, spring a cancelled drag back
     under the release phase, and hand the dismissal to the exit
     keyframes from the finger position. */
  it('drag tracking suspends the entrance animation; a cancelled drag springs back without un-suspending', () => {
    const onClose = vi.fn();
    render(
      <Sheet open onClose={onClose} ariaLabel="X" side="bottom">
        <p>x</p>
      </Sheet>,
    );
    const grabber = document.querySelector('.sheet-grabber') as HTMLElement;
    const panel = document.querySelector('.sheet-panel') as HTMLElement;
    const pointer = (type: string, clientY: number) => {
      const ev = new Event(type, { bubbles: true });
      Object.assign(ev, { pointerType: 'touch', pointerId: 1, clientY });
      grabber.dispatchEvent(ev);
    };

    pointer('pointerdown', 400);
    expect(panel.dataset.dragging).toBe('true');
    expect(panel.dataset.dragPhase).toBe('active');

    pointer('pointermove', 450);
    expect(panel.style.transform).toBe('translateY(50px)');

    // Cancelled (short) — release phase + transform cleared; the drag
    // state PERSISTS (removing it would replay the entrance keyframes).
    pointer('pointerup', 450);
    expect(onClose).not.toHaveBeenCalled();
    expect(panel.dataset.dragPhase).toBe('release');
    expect(panel.dataset.dragging).toBe('true');
    expect(panel.style.transform).toBe('');

    // Dismissal drag — state cleared (exit keyframes own the panel),
    // transform kept so the exit interpolates from the finger.
    pointer('pointerdown', 400);
    pointer('pointermove', 500);
    pointer('pointerup', 500);
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(panel.hasAttribute('data-dragging')).toBe(false);
    expect(panel.style.transform).toBe('translateY(100px)');
  });

  it('initial focus skips the header close button and lands on the first body control (A10 P2-1)', async () => {
    render(
      <Sheet open onClose={() => {}} ariaLabel="X" side="bottom" title="التصفية">
        <button type="button" aria-pressed="true">الكل</button>
      </Sheet>,
    );
    await flush();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'الكل' }));
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'إغلاق' }));
  });
});
