/**
 * bottomStack.test.ts — Y6 (R325) — the bottom-stack manager's math and
 * registration lifecycle, in jsdom isolation (no ResizeObserver here —
 * the manager degrades to measure-on-register, which is exactly the
 * surface these suites exercise; the live tracking is pinned by the
 * Playwright probe, tests/r325/bottom-stack.spec.ts).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BOTTOM_STACK_SEAM_PX,
  computeStackOffsets,
  getBottomStackTotal,
  registerBottomLayer,
  resetBottomStackForTests,
  unregisterBottomLayer,
} from '../../src/lib/bottomStack';

beforeEach(() => {
  resetBottomStackForTests();
  document.documentElement.style.removeProperty('--app-bottom-stack');
});

describe('computeStackOffsets — the pure stack math', () => {
  it('a lone layer sits at offset 0 (its natural seat is untouched)', () => {
    const { offsets, total } = computeStackOffsets({ consent: 44 });
    expect(offsets.consent).toBe(0);
    expect(total).toBe(44);
  });

  it('the toast stack lifts above the consent gate by the gate height + seam', () => {
    const { offsets } = computeStackOffsets({ consent: 44, toast: 90 });
    expect(offsets.consent).toBe(0);
    expect(offsets.toast).toBe(44 + BOTTOM_STACK_SEAM_PX);
  });

  it('the full pile: consent → toast → fab, each above the previous', () => {
    const { offsets, total } = computeStackOffsets({ consent: 48, toast: 90, fab: 40 });
    expect(offsets.consent).toBe(0);
    expect(offsets.toast).toBe(48 + BOTTOM_STACK_SEAM_PX);
    expect(offsets.fab).toBe(48 + BOTTOM_STACK_SEAM_PX + 90 + BOTTOM_STACK_SEAM_PX);
    expect(total).toBe(offsets.fab + 40);
  });

  it('an absent middle layer never contributes its seam', () => {
    const { offsets } = computeStackOffsets({ consent: 48, fab: 40 });
    expect(offsets.fab).toBe(48 + BOTTOM_STACK_SEAM_PX);
  });

  it('an empty stack totals 0', () => {
    expect(computeStackOffsets({}).total).toBe(0);
    expect(computeStackOffsets({ toast: 0 }).total).toBe(0);
  });

  it('the mission arrow holds whatever the heights (consent < toast < fab seats)', () => {
    const { offsets } = computeStackOffsets({ consent: 140, toast: 200, fab: 60 });
    expect(offsets.consent).toBeLessThan(offsets.toast);
    expect(offsets.toast).toBeLessThan(offsets.fab);
  });
});

describe('registration — the live layer bookkeeping', () => {
  /** A minimal HTMLElement stand-in: measured height + a style record. */
  function fakeElement(height: number) {
    const styleProps = new Map<string, string>();
    return {
      getBoundingClientRect: () => ({ height, x: 0, y: 0, width: 100, top: 0, bottom: height }),
      style: {
        setProperty: (k: string, v: string) => void styleProps.set(k, v),
        removeProperty: (k: string) => styleProps.delete(k),
        getPropertyValue: (k: string) => styleProps.get(k) ?? '',
      },
    } as unknown as HTMLElement;
  }

  it('registers the consent gate at the base seat and writes its 0px offset', () => {
    const banner = fakeElement(48);
    registerBottomLayer('consent', banner);
    expect(banner.style.getPropertyValue('--app-bottom-stack')).toBe('0px');
  });

  it('a toast registered above the gate reads the gate height + seam inline', () => {
    const banner = fakeElement(48);
    const stack = fakeElement(90);
    registerBottomLayer('consent', banner);
    registerBottomLayer('toast', stack);
    expect(stack.style.getPropertyValue('--app-bottom-stack')).toBe(`${48 + BOTTOM_STACK_SEAM_PX}px`);
    // :root carries the pile total (top of the FAB-less stack)
    expect(document.documentElement.style.getPropertyValue('--app-bottom-stack')).toBe(
      `${48 + BOTTOM_STACK_SEAM_PX + 90}px`,
    );
  });

  it('unregistering the gate drops the stack back to its natural seat', () => {
    const banner = fakeElement(48);
    const stack = fakeElement(90);
    registerBottomLayer('consent', banner);
    registerBottomLayer('toast', stack);
    unregisterBottomLayer('consent');
    expect(stack.style.getPropertyValue('--app-bottom-stack')).toBe('0px');
    expect(getBottomStackTotal()).toBe(90);
  });

  it('binding null marks the layer absent without throwing', () => {
    registerBottomLayer('fab', null);
    expect(getBottomStackTotal()).toBe(0);
  });

  it('re-registering the same id replaces the element (no double count)', () => {
    const first = fakeElement(40);
    const second = fakeElement(44);
    registerBottomLayer('consent', first);
    registerBottomLayer('consent', second);
    expect(getBottomStackTotal()).toBe(44);
  });

  it('the manager is idempotent under re-registration storms (StrictMode)', () => {
    const stack = fakeElement(90);
    registerBottomLayer('toast', stack);
    registerBottomLayer('toast', stack);
    registerBottomLayer('toast', stack);
    expect(document.documentElement.style.getPropertyValue('--app-bottom-stack')).toBe('90px');
  });

  it('re-measures when asked through a changed box (the RO fallback path)', () => {
    const el = fakeElement(48);
    registerBottomLayer('consent', el);
    // the consent bar EXPANDS on the phone (R323 A3·3) — the next
    // recompute (any registration change) must see the new box
    (el as unknown as { getBoundingClientRect: () => unknown }).getBoundingClientRect = () => ({
      height: 140, x: 0, y: 0, width: 100, top: 0, bottom: 140,
    });
    const stack = fakeElement(90);
    registerBottomLayer('toast', stack);
    expect(stack.style.getPropertyValue('--app-bottom-stack')).toBe(`${140 + BOTTOM_STACK_SEAM_PX}px`);
  });

  it('root style writes survive a fresh documentElement style (jsdom sane)', () => {
    const setSpy = vi.spyOn(document.documentElement.style, 'setProperty');
    registerBottomLayer('fab', fakeElement(40));
    expect(setSpy).toHaveBeenCalledWith('--app-bottom-stack', '40px');
    setSpy.mockRestore();
  });
});
