/**
 * CommandPalette + NotificationPanel unit tests.
 */
import { describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { CommandPalette } from '../../src/components/overlays/CommandPalette';
import { NotificationPanel } from '../../src/components/overlays/NotificationPanel';

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

  it('locks body overflow while open and restores on close', () => {
    document.body.style.overflow = '';
    const { rerender } = render(
      <CommandPalette open onClose={() => {}} ariaLabel="X">
        <input />
      </CommandPalette>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    rerender(
      <CommandPalette open={false} onClose={() => {}} ariaLabel="X">
        <input />
      </CommandPalette>,
    );
    expect(document.body.style.overflow).toBe('');
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

  it('does NOT lock body scroll', () => {
    document.body.style.overflow = 'auto';
    render(<PanelHarness open onClose={() => {}} />);
    expect(document.body.style.overflow).toBe('auto');
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
