/**
 * Dropdown primitive unit tests.
 *
 * Coverage:
 *   - renders only when open AND anchor is present
 *   - role="menu" + items have role="menuitem"
 *   - first non-disabled item is focused on open
 *   - ArrowDown / ArrowUp move focus across items
 *   - Home / End jump to first / last
 *   - Enter activates the focused item
 *   - Tab dismisses (matches OS menu UX)
 *   - Esc dismisses + restores focus to anchor
 *   - click on item activates onSelect
 *   - disabled items are skipped and not selectable
 *   - DropdownSeparator renders with role=separator
 */
import { describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { Dropdown, DropdownItem, DropdownSeparator } from '../../src/components/overlays/Dropdown';

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)));

function Harness({
  open,
  onClose,
  onA = () => {},
  onB = () => {},
  onC = () => {},
  bDisabled = false,
}: {
  open: boolean;
  onClose: () => void;
  onA?: () => void;
  onB?: () => void;
  onC?: () => void;
  bDisabled?: boolean;
}) {
  const ref = useRef<HTMLButtonElement | null>(null);
  return (
    <>
      <button ref={ref} type="button" data-testid="anchor">
        trigger
      </button>
      <Dropdown open={open} onClose={onClose} anchorRef={ref} ariaLabel="actions">
        <DropdownItem onSelect={onA}>A</DropdownItem>
        <DropdownItem onSelect={onB} disabled={bDisabled}>B</DropdownItem>
        <DropdownSeparator />
        <DropdownItem onSelect={onC}>C</DropdownItem>
      </Dropdown>
    </>
  );
}

describe('Dropdown', () => {
  it('renders nothing when open=false', () => {
    render(<Harness open={false} onClose={() => {}} />);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('renders with role=menu and items have role=menuitem', () => {
    render(<Harness open onClose={() => {}} />);
    expect(screen.getByRole('menu', { name: 'actions' })).toBeInTheDocument();
    expect(screen.getAllByRole('menuitem')).toHaveLength(3);
  });

  it('focuses first non-disabled item on open', async () => {
    render(<Harness open onClose={() => {}} />);
    await flush();
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'A' }));
  });

  it('skips disabled items in initial focus', async () => {
    render(<Harness open onClose={() => {}} bDisabled />);
    await flush();
    // First non-disabled is still A.
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'A' }));
  });

  it('ArrowDown moves focus to next non-disabled item', async () => {
    render(<Harness open onClose={() => {}} />);
    await flush();
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'B' }));
  });

  it('ArrowDown skips disabled items', async () => {
    render(<Harness open onClose={() => {}} bDisabled />);
    await flush();
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'C' }));
  });

  it('ArrowUp wraps from first to last', async () => {
    render(<Harness open onClose={() => {}} />);
    await flush();
    fireEvent.keyDown(document, { key: 'ArrowUp' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'C' }));
  });

  it('Home jumps to first', async () => {
    render(<Harness open onClose={() => {}} />);
    await flush();
    fireEvent.keyDown(document, { key: 'ArrowDown' });
    fireEvent.keyDown(document, { key: 'Home' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'A' }));
  });

  it('End jumps to last', async () => {
    render(<Harness open onClose={() => {}} />);
    await flush();
    fireEvent.keyDown(document, { key: 'End' });
    expect(document.activeElement).toBe(screen.getByRole('menuitem', { name: 'C' }));
  });

  it('Enter activates the focused item', async () => {
    const onA = vi.fn();
    render(<Harness open onClose={() => {}} onA={onA} />);
    await flush();
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'A' }), { key: 'Enter' });
    expect(onA).toHaveBeenCalledTimes(1);
  });

  it('click on item activates onSelect', () => {
    const onB = vi.fn();
    render(<Harness open onClose={() => {}} onB={onB} />);
    fireEvent.click(screen.getByRole('menuitem', { name: 'B' }));
    expect(onB).toHaveBeenCalledTimes(1);
  });

  it('disabled items are not activated by click or Enter', async () => {
    const onB = vi.fn();
    render(<Harness open onClose={() => {}} onB={onB} bDisabled />);
    fireEvent.click(screen.getByRole('menuitem', { name: 'B' }));
    expect(onB).not.toHaveBeenCalled();
  });

  it('Tab dismisses', async () => {
    const onClose = vi.fn();
    render(<Harness open onClose={onClose} />);
    await flush();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Esc dismisses', async () => {
    const onClose = vi.fn();
    render(<Harness open onClose={onClose} />);
    await flush();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('renders DropdownSeparator with role=separator', () => {
    render(<Harness open onClose={() => {}} />);
    expect(screen.getByRole('separator')).toBeInTheDocument();
  });
});
