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
 */
import { describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Popover } from '../../src/components/overlays/Popover';

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

  it('does NOT lock body scroll (passive surface)', () => {
    document.body.style.overflow = 'auto';
    render(<Harness open onClose={() => {}} />);
    expect(document.body.style.overflow).toBe('auto');
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
