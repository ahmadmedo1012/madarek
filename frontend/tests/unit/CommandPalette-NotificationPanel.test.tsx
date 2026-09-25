/**
 * CommandPalette + NotificationPanel unit tests.
 *
 * Wave 12-14 additions: the scroll lock is the ref-counted class
 * (CommandPalette), Escape returns focus to the bell trigger
 * (NotificationPanel, P2-11) and the panel never locks body scroll.
 */
import { describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette } from '../../src/components/overlays/CommandPalette';
import { NotificationPanel } from '../../src/components/overlays/NotificationPanel';
import { SCROLL_LOCK_BODY_CLASS } from '../../src/lib/scrollLock';

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)));

describe('CommandPalette', () => {
  it('renders nothing when open=false', () => {
    render(
      <CommandPalette open={false} onClose={() => {}} ariaLabel="Search">
        <input placeholder="search" />
      </CommandPalette>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders into a portal with role=dialog and aria-label', () => {
    render(
      <CommandPalette open onClose={() => {}} ariaLabel="Search">
        <input placeholder="search" />
      </CommandPalette>,
    );
    expect(screen.getByRole('dialog', { name: 'Search' })).toBeInTheDocument();
  });

  it('focuses the first focusable element on open (the search input)', async () => {
    render(
      <CommandPalette open onClose={() => {}} ariaLabel="X">
        <input placeholder="search" />
        <button type="button">b</button>
      </CommandPalette>,
    );
    await flush();
    expect(document.activeElement).toBe(screen.getByPlaceholderText('search'));
  });

  it('Esc dismisses by default', () => {
    const onClose = vi.fn();
    render(
      <CommandPalette open onClose={onClose} ariaLabel="X">
        <input />
      </CommandPalette>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('overlay click dismisses by default', () => {
    const onClose = vi.fn();
    render(
      <CommandPalette open onClose={onClose} ariaLabel="X">
        <input />
      </CommandPalette>,
    );
    const overlay = screen.getByRole('dialog').parentElement!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicks inside the card do NOT dismiss', () => {
    const onClose = vi.fn();
    render(
      <CommandPalette open onClose={onClose} ariaLabel="X">
        <input data-testid="inside" />
      </CommandPalette>,
    );
    fireEvent.click(screen.getByTestId('inside'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('locks body scroll while open and releases on close (ref-counted class)', () => {
    const { rerender } = render(
      <CommandPalette open onClose={() => {}} ariaLabel="X">
        <input />
      </CommandPalette>,
    );
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(true);
    rerender(
      <CommandPalette open={false} onClose={() => {}} ariaLabel="X">
        <input />
      </CommandPalette>,
    );
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(false);
  });

  /* ── Exit animation wiring (wave 21-a — 4-A2 P2-8) ──────────────
     The dormant data-closing CSS (components.css wave 7-a) needed the
     delayed unmount on the component side: the overlay must stay
     mounted through the exit window, then leave on animationend (or
     the token-driven safety timeout). */

  it('keeps the overlay mounted through the exit window with data-closing, then unmounts on animationend', () => {
    const { rerender } = render(
      <CommandPalette open onClose={() => {}} ariaLabel="X">
        <input />
      </CommandPalette>,
    );
    rerender(
      <CommandPalette open={false} onClose={() => {}} ariaLabel="X">
        <input />
      </CommandPalette>,
    );
    // Still mounted for the exit animation, marked for the CSS pair.
    const overlay = document.querySelector('.cmd-palette-overlay') as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(overlay).toHaveAttribute('data-closing', 'true');
    // The card's own animationend BUBBLES to the overlay handler —
    // it must not end the exit window (target = card ≠ overlay).
    const card = document.querySelector('.cmd-palette-card') as HTMLElement;
    fireEvent.animationEnd(card);
    expect(document.querySelector('.cmd-palette-overlay')).not.toBeNull();
    // The overlay's own animationend ends it.
    fireEvent.animationEnd(overlay);
    expect(document.querySelector('.cmd-palette-overlay')).toBeNull();
  });

  it('unmounts via the safety timeout when animationend never fires (jsdom/reduced-motion belt)', () => {
    vi.useFakeTimers();
    try {
      const { rerender } = render(
        <CommandPalette open onClose={() => {}} ariaLabel="X">
          <input />
        </CommandPalette>,
      );
      rerender(
        <CommandPalette open={false} onClose={() => {}} ariaLabel="X">
          <input />
        </CommandPalette>,
      );
      expect(document.querySelector('.cmd-palette-overlay')).not.toBeNull();
      // readMotionDurationMs falls back to 160ms in jsdom + 80ms slack.
      act(() => {
        vi.advanceTimersByTime(300);
      });
      expect(document.querySelector('.cmd-palette-overlay')).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});

function PanelHarness({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <button ref={ref} type="button" data-testid="bell">
        bell
      </button>
      <NotificationPanel open={open} onClose={onClose} anchorRef={ref} ariaLabel="إشعارات">
        <p data-testid="content">your inbox</p>
      </NotificationPanel>
    </>
  );
}

describe('NotificationPanel', () => {
  it('renders nothing when open=false', () => {
    render(<PanelHarness open={false} onClose={() => {}} />);
    expect(screen.queryByText('your inbox')).toBeNull();
  });

  it('renders with role=dialog and aria-label', () => {
    render(<PanelHarness open onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'إشعارات' })).toBeInTheDocument();
  });

  it('Esc dismisses by default', () => {
    const onClose = vi.fn();
    render(<PanelHarness open onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicks outside both panel and anchor dismiss', () => {
    const onClose = vi.fn();
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    render(<PanelHarness open onClose={onClose} />);
    fireEvent.mouseDown(outside);
    expect(onClose).toHaveBeenCalledTimes(1);
    document.body.removeChild(outside);
  });

  it('clicks on the anchor itself do NOT dismiss (toggle pattern)', () => {
    const onClose = vi.fn();
    render(<PanelHarness open onClose={onClose} />);
    fireEvent.mouseDown(screen.getByTestId('bell'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('clicks inside the panel do NOT dismiss', () => {
    const onClose = vi.fn();
    render(<PanelHarness open onClose={onClose} />);
    fireEvent.mouseDown(screen.getByTestId('content'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Esc dismisses and returns focus to the bell trigger', () => {
    const onClose = vi.fn();
    render(<PanelHarness open onClose={onClose} />);
    const bell = screen.getByTestId('bell');
    bell.focus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(bell);
  });

  it('does NOT lock body scroll', () => {
    document.body.style.overflow = 'auto';
    render(<PanelHarness open onClose={() => {}} />);
    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(false);
  });

  it('does NOT steal focus on mount', () => {
    const externalButton = document.createElement('button');
    externalButton.textContent = 'outside';
    document.body.appendChild(externalButton);
    externalButton.focus();
    render(<PanelHarness open onClose={() => {}} />);
    expect(document.activeElement).toBe(externalButton);
    document.body.removeChild(externalButton);
  });
});
