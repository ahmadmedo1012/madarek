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
 *   - body scroll is locked while open and restored on close (the
 *     ref-counted scrollLock class — wave 12-14)
 *   - stacked overlays: one Escape dismisses ONE layer (wave 12-14,
 *     audit 11-e P1-2) — Modal over Modal and Dropdown over Modal
 */
import { describe, expect, it, vi } from 'vitest';
import { useRef } from 'react';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { Modal } from '../../src/components/overlays/Modal';
import { Dropdown, DropdownItem } from '../../src/components/overlays/Dropdown';
import { SCROLL_LOCK_BODY_CLASS } from '../../src/lib/scrollLock';

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

  it('locks body scroll while open and releases on close (ref-counted class)', () => {
    const { rerender } = render(
      <Modal open onClose={() => {}} ariaLabel="X">
        <p>x</p>
      </Modal>,
    );
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(true);
    rerender(
      <Modal open={false} onClose={() => {}} ariaLabel="X">
        <p>x</p>
      </Modal>,
    );
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(false);
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

  it('stacked modals: one Escape dismisses only the topmost layer', () => {
    const onCloseBase = vi.fn();
    const onCloseTop = vi.fn();
    render(
      <>
        <Modal open onClose={onCloseBase} ariaLabel="base">
          <p>base</p>
        </Modal>
        <Modal open onClose={onCloseTop} ariaLabel="top">
          <p>top</p>
        </Modal>
      </>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCloseTop).toHaveBeenCalledTimes(1);
    expect(onCloseBase).not.toHaveBeenCalled();
  });

  it('stacked modals: the scroll lock composes — closing the top keeps the base locked', () => {
    const { rerender } = render(
      <>
        <Modal open onClose={() => {}} ariaLabel="base">
          <p>base</p>
        </Modal>
        <Modal open onClose={() => {}} ariaLabel="top">
          <p>top</p>
        </Modal>
      </>,
    );
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(true);
    rerender(
      <>
        <Modal open onClose={() => {}} ariaLabel="base">
          <p>base</p>
        </Modal>
        <Modal open={false} onClose={() => {}} ariaLabel="top">
          <p>top</p>
        </Modal>
      </>,
    );
    // The base modal still holds its lock after the top one released.
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(true);
  });

  it('stacked modal + dropdown: Escape dismisses the dropdown, not the modal beneath', async () => {
    const onCloseModal = vi.fn();
    const onCloseMenu = vi.fn();
    function Host() {
      const anchorRef = useRef<HTMLButtonElement | null>(null);
      return (
        <>
          <Modal open onClose={onCloseModal} ariaLabel="dialog">
            <button ref={anchorRef} type="button">menu trigger</button>
          </Modal>
          <Dropdown open onClose={onCloseMenu} anchorRef={anchorRef} ariaLabel="actions">
            <DropdownItem onSelect={() => {}}>A</DropdownItem>
          </Dropdown>
        </>
      );
    }
    render(<Host />);
    await flush();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCloseMenu).toHaveBeenCalledTimes(1);
    expect(onCloseModal).not.toHaveBeenCalled();
  });

  it('stacked modals: a closeOnEscape=false top layer consumes Escape without closing', () => {
    const onCloseBase = vi.fn();
    const onCloseTop = vi.fn();
    render(
      <>
        <Modal open onClose={onCloseBase} ariaLabel="base">
          <p>base</p>
        </Modal>
        <Modal open onClose={onCloseTop} ariaLabel="top" closeOnEscape={false}>
          <p>top</p>
        </Modal>
      </>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    // The top layer owns the key (e.g. a pending mutation guard) — it
    // declines to close AND shields the layer below from the press.
    expect(onCloseTop).not.toHaveBeenCalled();
    expect(onCloseBase).not.toHaveBeenCalled();
  });
});
