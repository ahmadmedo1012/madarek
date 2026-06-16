/**
 * Lightbox primitive unit tests.
 *
 * Coverage:
 *   - renders only when open
 *   - portal mount + role=dialog + aria-modal + aria-label
 *   - focuses first focusable on open (close button by default)
 *   - Esc dismisses (default) + opt-out
 *   - overlay click dismisses (default) + opt-out
 *   - clicks inside the content do NOT dismiss
 *   - close button calls onClose
 *   - close button has accessible label
 *   - body overflow lock + restore
 */
import { describe, expect, it, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import { Lightbox } from '../../src/components/overlays/Lightbox';

const flush = () => act(() => new Promise((r) => setTimeout(r, 0)));

describe('Lightbox', () => {
  it('renders nothing when open=false', () => {
    render(
      <Lightbox open={false} onClose={() => {}} ariaLabel="Image">
        <img alt="" src="" />
      </Lightbox>,
    );
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('renders with role=dialog and aria-label', () => {
    render(
      <Lightbox open onClose={() => {}} ariaLabel="Image">
        <img alt="" src="" data-testid="img" />
      </Lightbox>,
    );
    expect(screen.getByRole('dialog', { name: 'Image' })).toBeInTheDocument();
    expect(screen.getByTestId('img')).toBeInTheDocument();
  });

  it('focuses the close button on open (first focusable)', async () => {
    render(
      <Lightbox open onClose={() => {}} ariaLabel="Image" closeLabel="dismiss">
        <img alt="" src="" />
      </Lightbox>,
    );
    await flush();
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'dismiss' }),
    );
  });

  it('Esc dismisses by default', () => {
    const onClose = vi.fn();
    render(
      <Lightbox open onClose={onClose} ariaLabel="X">
        <p>x</p>
      </Lightbox>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('Esc is suppressed when closeOnEscape=false', () => {
    const onClose = vi.fn();
    render(
      <Lightbox open onClose={onClose} ariaLabel="X" closeOnEscape={false}>
        <p>x</p>
      </Lightbox>,
    );
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
  });

  it('overlay click dismisses by default', () => {
    const onClose = vi.fn();
    render(
      <Lightbox open onClose={onClose} ariaLabel="X">
        <p>x</p>
      </Lightbox>,
    );
    const overlay = screen.getByRole('dialog').parentElement!;
    fireEvent.click(overlay);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('overlay click is suppressed when closeOnOverlayClick=false', () => {
    const onClose = vi.fn();
    render(
      <Lightbox open onClose={onClose} ariaLabel="X" closeOnOverlayClick={false}>
        <p>x</p>
      </Lightbox>,
    );
    const overlay = screen.getByRole('dialog').parentElement!;
    fireEvent.click(overlay);
    expect(onClose).not.toHaveBeenCalled();
  });

  it('clicks inside the content do NOT dismiss', () => {
    const onClose = vi.fn();
    render(
      <Lightbox open onClose={onClose} ariaLabel="X">
        <p data-testid="inside">x</p>
      </Lightbox>,
    );
    fireEvent.click(screen.getByTestId('inside'));
    expect(onClose).not.toHaveBeenCalled();
  });

  it('close button calls onClose', () => {
    const onClose = vi.fn();
    render(
      <Lightbox open onClose={onClose} ariaLabel="X" closeLabel="dismiss">
        <p>x</p>
      </Lightbox>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'dismiss' }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('locks body overflow while open and restores on close', () => {
    document.body.style.overflow = '';
    const { rerender } = render(
      <Lightbox open onClose={() => {}} ariaLabel="X">
        <p>x</p>
      </Lightbox>,
    );
    expect(document.body.style.overflow).toBe('hidden');
    rerender(
      <Lightbox open={false} onClose={() => {}} ariaLabel="X">
        <p>x</p>
      </Lightbox>,
    );
    expect(document.body.style.overflow).toBe('');
  });
});
