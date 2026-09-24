/**
 * Toast platform tests — the lib/toast.ts store + the <ToastStack />
 * region (wave 7-a; the standalone <Toast /> primitive keeps its own
 * contract suite in Toast.test.tsx).
 *
 * Store:
 *   - variant helpers push items with Arabic default titles
 *   - dismiss marks closing (idempotent); remove unmounts
 *   - the stack caps visible toasts (oldest start exiting)
 *
 * ToastStack:
 *   - renders nothing while the store is empty
 *   - success/info/warning → role=status + polite; error → role=alert
 *     + assertive (contract pin)
 *   - non-error toasts auto-dismiss after durationMs, then unmount
 *     after the exit window (animationend fallback timer)
 *   - error toasts NEVER auto-dismiss
 *   - close button dismisses; action button fires + dismisses
 *   - hover pauses the auto-dismiss timer; leave resumes the remainder
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import { ToastStack } from '../../src/components/overlays/Toast';
import { toast, useToastStore } from '../../src/lib/toast';

/** jsdom resolves no custom properties → the exit fallback is the
 * token fallback (160ms) + slack (80ms) = 240ms. */
const EXIT_FALLBACK_MS = 240;

describe('toast store', () => {
  beforeEach(() => {
    useToastStore.setState({ items: [] });
  });

  it('success/error helpers push items with Arabic default titles', () => {
    toast.success('تم الحفظ');
    toast.error('تعذّر الحفظ');
    const items = useToastStore.getState().items;
    expect(items).toHaveLength(2);
    expect(items[0]).toMatchObject({ variant: 'success', title: 'تمّ بنجاح', message: 'تم الحفظ' });
    expect(items[1]).toMatchObject({ variant: 'error', title: 'حدث خطأ', message: 'تعذّر الحفظ' });
  });

  it('info/warning helpers map to their variants', () => {
    toast.info('معلومة');
    toast.warning('تنبيه');
    const items = useToastStore.getState().items;
    expect(items[0]!.variant).toBe('info');
    expect(items[1]!.variant).toBe('warning');
  });

  it('dismiss marks closing exactly once; remove unmounts', () => {
    const id = toast.success('x');
    toast.dismiss(id);
    toast.dismiss(id); // idempotent
    expect(useToastStore.getState().items[0]!.closing).toBe(true);
    useToastStore.getState().remove(id);
    expect(useToastStore.getState().items).toHaveLength(0);
  });

  it('caps the stack — oldest toasts start exiting beyond the cap', () => {
    for (let i = 0; i < 6; i += 1) toast.info(`t${i}`);
    const items = useToastStore.getState().items;
    expect(items).toHaveLength(6);
    // Oldest two are closing; the newest four stay open.
    expect(items.map((t) => t.closing)).toEqual([true, true, false, false, false, false]);
  });

  it('honours custom titles, durations and actions', () => {
    toast.success('msg', { title: 'مخصص', durationMs: 1000, action: { label: 'عرض', onClick: () => {} } });
    expect(useToastStore.getState().items[0]).toMatchObject({
      title: 'مخصص',
      durationMs: 1000,
      action: { label: 'عرض' },
    });
  });
});

describe('ToastStack', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useToastStore.setState({ items: [] });
  });
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it('renders nothing while the store is empty', () => {
    const { container } = render(<ToastStack />);
    expect(container.firstChild).toBeNull();
    expect(document.querySelector('.toast-stack')).toBeNull();
  });

  it('renders a success toast with role=status and polite live region', () => {
    render(<ToastStack />);
    act(() => {
      toast.success('تم الحفظ');
    });
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-live', 'polite');
    expect(el.className).toContain('toast-success');
    expect(el).toHaveTextContent('تمّ بنجاح');
    expect(el).toHaveTextContent('تم الحفظ');
  });

  it('renders an error toast with role=alert and assertive live region', () => {
    render(<ToastStack />);
    act(() => {
      toast.error('تعذّر');
    });
    const el = screen.getByRole('alert');
    expect(el).toHaveAttribute('aria-live', 'assertive');
    expect(el.className).toContain('toast-error');
  });

  it('auto-dismisses non-error toasts after durationMs, then unmounts', () => {
    render(<ToastStack />);
    act(() => {
      toast.success('ok', { durationMs: 3000 });
    });
    act(() => {
      vi.advanceTimersByTime(2999);
    });
    expect(screen.getByRole('status')).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(1);
    });
    // Dismissed → exit window (data-closing) → still rendered…
    expect(screen.getByRole('status')).toHaveAttribute('data-closing', 'true');
    act(() => {
      vi.advanceTimersByTime(EXIT_FALLBACK_MS);
    });
    // …then actually unmounted.
    expect(screen.queryByRole('status')).toBeNull();
    expect(useToastStore.getState().items).toHaveLength(0);
  });

  it('error toasts never auto-dismiss', () => {
    render(<ToastStack />);
    act(() => {
      toast.error('stays');
    });
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    const el = screen.getByRole('alert');
    expect(el).not.toHaveAttribute('data-closing');
  });

  it('close button dismisses the toast', () => {
    render(<ToastStack />);
    act(() => {
      toast.error('manual');
    });
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));
    expect(screen.getByRole('alert')).toHaveAttribute('data-closing', 'true');
    act(() => {
      vi.advanceTimersByTime(EXIT_FALLBACK_MS);
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('action button fires its handler and dismisses', () => {
    const onClick = vi.fn();
    render(<ToastStack />);
    act(() => {
      toast.success('saved', { action: { label: 'عرض البحث', onClick } });
    });
    fireEvent.click(screen.getByRole('button', { name: 'عرض البحث' }));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('status')).toHaveAttribute('data-closing', 'true');
  });

  it('stacks concurrent toasts instead of overlapping them', () => {
    render(<ToastStack />);
    act(() => {
      toast.info('one');
      toast.info('two');
    });
    const stack = document.querySelector('.toast-stack');
    expect(stack).not.toBeNull();
    expect(stack!.children).toHaveLength(2);
  });

  it('pauses the auto-dismiss timer on hover and resumes the remainder', () => {
    render(<ToastStack />);
    act(() => {
      toast.success('paused', { durationMs: 2000 });
    });
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    fireEvent.pointerEnter(screen.getByRole('status'));
    act(() => {
      vi.advanceTimersByTime(5000); // paused — must survive past the deadline
    });
    expect(screen.getByRole('status')).not.toHaveAttribute('data-closing');
    fireEvent.pointerLeave(screen.getByRole('status'));
    act(() => {
      vi.advanceTimersByTime(999); // remainder was 1000ms
    });
    expect(screen.getByRole('status')).not.toHaveAttribute('data-closing');
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(screen.getByRole('status')).toHaveAttribute('data-closing', 'true');
  });
});
