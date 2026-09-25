/**
 * Popover primitive unit tests.
 *
 * Coverage:
 *   - renders only when open AND anchor is present
 *   - portal mount + role + aria-label
 *   - role can be overridden to "menu"
 *   - Esc dismisses (default) + opt-out
 *   - click outside dismisses (default) + opt-out
 *   - clicks INSIDE the popover do NOT dismiss
 *   - clicks on the anchor itself do NOT dismiss (toggle pattern)
 *   - does NOT lock body scroll (passive surface)
 *   - does NOT trap focus
 *   - Esc returns focus to the trigger (wave 12-14, P2-11)
 *   - the trigger's aria-expanded/aria-haspopup are synced when the
 *     consumer does not declare them (wave 12-14)
 */
import { describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Popover } from '../../src/components/overlays/Popover';
import { SCROLL_LOCK_BODY_CLASS } from '../../src/lib/scrollLock';

function Harness({
  open,
  onClose,
  closeOnEscape,
  closeOnOutsideClick,
  role,
  ariaLabel = 'X',
}: {
  open: boolean;
  onClose: () => void;
  closeOnEscape?: boolean;
  closeOnOutsideClick?: boolean;
  role?: 'dialog' | 'menu';
  ariaLabel?: string;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <button ref={ref} type="button" data-testid="anchor">
        trigger
      </button>
      <Popover
        open={open}
        onClose={onClose}
        anchorRef={ref}
        closeOnEscape={closeOnEscape}
        closeOnOutsideClick={closeOnOutsideClick}
        role={role}
        ariaLabel={ariaLabel}
      >
        <p data-testid="inside">menu content</p>
      </Popover>
    </>
  );
}

describe('Popover', () => {
  it('renders nothing when open=false', () => {
    render(<Harness open={false} onClose={() => {}} />);
    expect(screen.queryByText('menu content')).toBeNull();
  });

  it('renders into a portal with role=dialog by default', () => {
    render(<Harness open onClose={() => {}} />);
    expect(screen.getByRole('dialog', { name: 'X' })).toBeInTheDocument();
  });

  it('role can be overridden to "menu"', () => {
    render(<Harness open onClose={() => {}} role="menu" />);
    expect(screen.getByRole('menu')).toBeInTheDocument();
  });

  it('Esc dismisses by default', () => {
    const onClose = vi.fn();
    render(<Harness open onClose={onClose} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Esc is suppressed when closeOnEscape=false', () => {
    const onClose = vi.fn();
    render(<Harness open onClose={onClose} closeOnEscape={false} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('clicking outside both popover and anchor dismisses by default', () => {
    const onClose = vi.fn();
    const outside = document.createElement('div');
    outside.setAttribute('data-testid', 'outside');
    document.body.appendChild(outside);
    render(<Harness open onClose={onClose} />);
    fireEvent.mouseDown(outside);
    expect(onClose).toHaveBeenCalledTimes(1);
    document.body.removeChild(outside);
  });

  it('outside click is suppressed when closeOnOutsideClick=false', () => {
    const onClose = vi.fn();
    const outside = document.createElement('div');
    document.body.appendChild(outside);
    render(<Harness open onClose={onClose} closeOnOutsideClick={false} />);
    fireEvent.mouseDown(outside);
    expect(onClose).not.toHaveBeenCalled();
    document.body.removeChild(outside);
  });

  it('clicks inside the popover do NOT dismiss', () => {
    const onClose = vi.fn();
    render(<Harness open onClose={onClose} />);
    fireEvent.mouseDown(screen.getByTestId('inside'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('clicks on the anchor itself do NOT dismiss (toggle pattern)', () => {
    const onClose = vi.fn();
    render(<Harness open onClose={onClose} />);
    fireEvent.mouseDown(screen.getByTestId('anchor'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('Esc dismisses and returns focus to the trigger', () => {
    const onClose = vi.fn();
    render(<Harness open onClose={onClose} />);
    const anchor = screen.getByTestId('anchor');
    anchor.focus();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(document.activeElement).toBe(anchor);
  });

  it('does NOT lock body scroll (passive surface)', () => {
    document.body.style.overflow = 'auto';
    render(<Harness open onClose={() => {}} />);
    expect(document.body.style.overflow).toBe('auto');
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(false);
  });

  it('syncs aria-expanded/aria-haspopup onto a trigger that does not declare them', () => {
    render(<Harness open onClose={() => {}} />);
    const anchor = screen.getByTestId('anchor');
    expect(anchor).toHaveAttribute('aria-expanded', 'true');
    expect(anchor).toHaveAttribute('aria-haspopup', 'dialog');
  });

  it('leaves the trigger alone when the consumer declares aria-expanded itself', () => {
    function OwnedHarness({ open }: { open: boolean }) {
      const ref = useRef<HTMLButtonElement | null>(null);
      return (
        <>
          {/* React writes these declaratively during commit — the
              platform must never fight it (attribute already present
              on the effect's first look ⇒ consumer-owned). */}
          <button ref={ref} type="button" data-testid="owned" aria-expanded={open} aria-haspopup="dialog">
            trigger
          </button>
          <Popover open={open} onClose={() => {}} anchorRef={ref} ariaLabel="X">
            <p>content</p>
          </Popover>
        </>
      );
    }
    const { rerender } = render(<OwnedHarness open={false} />);
    const anchor = screen.getByTestId('owned');
    expect(anchor).toHaveAttribute('aria-expanded', 'false');
    rerender(<OwnedHarness open />);
    expect(anchor).toHaveAttribute('aria-expanded', 'true');
  });

  it('does NOT steal focus on mount', () => {
    const externalButton = document.createElement('button');
    externalButton.textContent = 'outside';
    document.body.appendChild(externalButton);
    externalButton.focus();
    expect(document.activeElement).toBe(externalButton);

    render(<Harness open onClose={() => {}} />);

    expect(document.activeElement).toBe(externalButton);
    document.body.removeChild(externalButton);
  });
});
