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
 *   - body overflow lock + restore
 */
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { Sheet } from '../../src/components/overlays/Sheet';

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

  it('locks body overflow while open and restores on close', () => {
    document.body.style.overflow = '';
    const { rerender } = render(
      <Sheet open onClose={() => {}} ariaLabel="X">
        <p>x</p>
      </Sheet>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    rerender(
      <Sheet open={false} onClose={() => {}} ariaLabel="X">
        <p>x</p>
      </Sheet>,
    );
    expect(document.body.style.overflow).toBe('');
  });
});
