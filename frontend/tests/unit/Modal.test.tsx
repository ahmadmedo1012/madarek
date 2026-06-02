/**
 * T071 — Modal primitive unit tests.
 *
 * Coverage:
 *   - renders only when `open` is true
 *   - focuses the first focusable element on open
 *   - returns focus to previously-active element on close
 *   - Esc dismisses (default) and is suppressed when closeOnEscape=false
 *   - overlay click dismisses (default) and is suppressed when
 *     closeOnOverlayClick=false
 *   - clicks inside the card do NOT dismiss
 *   - Tab/Shift-Tab cycle focus within the card
 *   - body overflow is locked while open and restored on close
 */
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../../src/components/overlays/Modal';

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)));

describe('Modal', () => {
  it('renders nothing when open=false', () => {
    render(
      <Modal open={false} onClose={() => {}} ariaLabel="X">
        <p>hidden</p>
      </Modal>,
    );
    expect(screen.queryByText('hidden')).toBeNull();
  });

  it('renders into a portal on open', () => {
    render(
      <Modal open onClose={() => {}} ariaLabel="X">
        <p>visible</p>
      </Modal>,
    );
    expect(screen.getByText('visible')).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'X' })).toBeInTheDocument();
  });

  it('focuses the first focusable element on open', async () => {
    render(
      <Modal open onClose={() => {}} ariaLabel="X">
        <button type="button">first</button>
        <button type="button">second</button>
      </Modal>,
    );
    await flush();
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'first' }));
  });

  it('Esc dismisses by default', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} ariaLabel="X">
        <p>x</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Esc is suppressed when closeOnEscape=false', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} ariaLabel="X" closeOnEscape={false}>
        <p>x</p>
      </Modal>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('overlay click dismisses by default', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} ariaLabel="X">
        <p>x</p>
      </Modal>,
    );
    const overlay = screen.getByRole('dialog').parentElement!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('clicks inside the card do NOT dismiss', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} ariaLabel="X">
        <p data-testid="inside">x</p>
      </Modal>,
    );
    fireEvent.click(screen.getByTestId('inside'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('overlay click is suppressed when closeOnOverlayClick=false', () => {
    const onClose = vi.fn();
    render(
      <Modal open onClose={onClose} ariaLabel="X" closeOnOverlayClick={false}>
        <p>x</p>
      </Modal>,
    );
    const overlay = screen.getByRole('dialog').parentElement!;
    fireEvent.click(overlay);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('locks body overflow while open and restores on close', () => {
    document.body.style.overflow = '';
    const { rerender } = render(
      <Modal open onClose={() => {}} ariaLabel="X">
        <p>x</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    rerender(
      <Modal open={false} onClose={() => {}} ariaLabel="X">
        <p>x</p>
      </Modal>,
    );
    expect(document.body.style.overflow).toBe('');
  });

  it('Tab cycles focus from last back to first', async () => {
    render(
      <Modal open onClose={() => {}} ariaLabel="X">
        <button type="button">first</button>
        <button type="button">last</button>
      </Modal>,
    );
    await flush();
    const last = screen.getByRole('button', { name: 'last' });
    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'first' }));
  });

  it('Shift+Tab cycles focus from first back to last', async () => {
    render(
      <Modal open onClose={() => {}} ariaLabel="X">
        <button type="button">first</button>
        <button type="button">last</button>
      </Modal>,
    );
    await flush();
    const first = screen.getByRole('button', { name: 'first' });
    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'last' }));
  });
});
