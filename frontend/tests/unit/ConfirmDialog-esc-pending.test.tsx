/**
 * ConfirmDialog — the in-flight Esc lock (r157, audit 6A11 #1).
 *
 * While an async confirm runs, the dialog can be dismissed through NONE
 * of its three paths: both footer buttons stay disabled, the overlay
 * click is gated (closeOnOverlayClick={!loading}), and Esc is gated the
 * same way (closeOnEscape={!loading}). The Esc gate leans on the
 * overlay-stack contract — even with Esc-dismiss disabled, the topmost
 * layer still OWNS the key, so a stacked pending ConfirmDialog also
 * shields the modal beneath it from the same press. Every path re-arms
 * when the mutation settles.
 */
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { ConfirmDialog } from '../../src/components/owner/ConfirmDialog';
import { Modal } from '../../src/components/overlays/Modal';

/** Deferred promise — the confirm stays in flight until the test
 *  resolves it, modelling a slow mutation. */
function deferred() {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

const esc = () => fireEvent.keyDown(document, { key: 'Escape' });

describe('ConfirmDialog — Esc lock while a confirm is pending', () => {
  it('Esc cancels when idle (the re-armed baseline)', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="حذف العنصر"
        message="لا يمكن التراجع."
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    esc();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('Esc is inert while an async confirm is in flight', () => {
    const { promise } = deferred();
    const onConfirm = vi.fn(() => promise);
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="حذف العنصر"
        message="لا يمكن التراجع."
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    );

    // Fire the confirm — the mutation is now pending.
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد' }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    // Busy affordance: the confirm swaps to the busy label…
    expect(screen.getByRole('button', { name: 'جارٍ…' })).toBeDisabled();
    // …and the cancel button is locked too (path 1 of 3).
    expect(screen.getByRole('button', { name: 'إلغاء' })).toBeDisabled();

    // Path 3 (Esc) is inert while the request is in flight.
    esc();
    expect(onCancel).not.toHaveBeenCalled();

    // Path 2 (overlay click) is inert for the same window.
    const overlay = screen.getByRole('dialog', { name: 'حذف العنصر' }).parentElement!;
    fireEvent.click(overlay);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('Esc re-arms after the mutation settles', async () => {
    const { promise, resolve } = deferred();
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        open
        title="حذف العنصر"
        message="لا يمكن التراجع."
        onConfirm={() => promise}
        onCancel={onCancel}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'تأكيد' }));
    esc();
    expect(onCancel).not.toHaveBeenCalled();

    // The mutation settles → loading flips back to false.
    await act(async () => {
      resolve();
      await promise;
    });
    // The busy label is gone — the dialog is idle again.
    expect(screen.queryByRole('button', { name: 'جارٍ…' })).toBeNull();

    // Esc is re-armed: the press now cancels.
    esc();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('a pending ConfirmDialog shields the modal beneath it from Esc', () => {
    const { promise } = deferred();
    const onCancelBase = vi.fn();
    const onCancelConfirm = vi.fn();
    render(
      <>
        <Modal open onClose={onCancelBase} ariaLabel="النموذج الأساسي">
          <p>النموذج الأساسي</p>
        </Modal>
        <ConfirmDialog
          open
          title="حذف العنصر"
          message="لا يمكن التراجع."
          onConfirm={() => promise}
          onCancel={onCancelConfirm}
        />
      </>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'تأكيد' }));
    // One Escape: the topmost layer (the pending confirm) owns the key,
    // declines to close, and consumes it — the base form modal must not
    // be dismissed by the same press (one press, one layer).
    esc();
    expect(onCancelConfirm).not.toHaveBeenCalled();
    expect(onCancelBase).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'النموذج الأساسي' })).toBeInTheDocument();
  });
});
