/**
 * r324 — the SheetLoader wait-for-grant belt (the StrictMode deadlock
 * fix), pinned at the component level.
 *
 * The CI-only r308 replay failure: on a reload whose lazy landing
 * chunk lands inside the boot splash's exit fade (phase already
 * 'ready', the seat still 'splash'), the loader's decide-once effect
 * took the queued path — activateSheetLoader() returned false, the
 * phantom-splash bridge did not apply (phase !== 'boot') — and its
 * subscription rode the effect's own cleanup. React 18 StrictMode
 * (dev) mounts every effect → runs its cleanups → re-runs the
 * effects; the decidedRef guard skipped the re-run, so after the
 * teardown NOTHING listened for the grant. splashExited() promoted
 * the pending request into the void and `.sl` never rendered.
 *
 * This suite reproduces that exact choreography in jsdom:
 *   1. the orchestrator is driven into the deadlock window
 *      (boot → hydrating → ready, the splash seat still held);
 *   2. the loader mounts INSIDE <StrictMode> so React double-invokes
 *      the effects exactly the way the dev server does;
 *   3. the splash then exits — the grant must wake the loader and
 *      `.sl` must render. With the pre-fix code this times out into
 *      a silent no-render (the deadlock); the wait-for-grant belt
 *      re-arms the subscription and the entrance plays.
 */
import { StrictMode } from 'react';
import { act, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SheetLoader } from '../../src/components/landing/SheetLoader';
import { resetIntroDocumentGateForTests } from '../../src/lib/motion/introGate';
import {
  getSnapshot,
  markHydrating,
  markReady,
  resetLoaderOrchestratorForTests,
  splashExited,
} from '../../src/lib/loaderOrchestrator';

/* IS_REACT_ACT_ENVIRONMENT: the belt's setPlay(true) fires from the
 * orchestrator emit — every manual state-machine poke that can reach
 * a subscriber must ride act() or React never flushes the render. */
const actPoke = (fn: () => void) => {
  act(() => {
    fn();
  });
};

/* jsdom (non-visual) has no requestAnimationFrame — the loader's
 * staged draw-in and the exit choreography lean on it. A timer-backed
 * shim is enough for this suite: we only assert the mount, never the
 * animation beats. */
beforeEach(() => {
  resetLoaderOrchestratorForTests();
  /* introGate's document-lifetime guard is MODULE state — in the real
   * browser every reload builds a fresh module graph (the flag resets
   * naturally); one vitest worker shares the module, so reset it here
   * or the second case in this file reads "already played". */
  resetIntroDocumentGateForTests();
  /* jsdom reports a ≤2-core navigator (lowCores in introGate's R318
   * §C environment gate) — the e2e fixture stubs the core count up for
   * the same reason: this suite pins the SEAT choreography, not the
   * visitor-environment gate (introGate's own unit belt owns that). */
  try {
    Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
      configurable: true,
      get: () => 8,
    });
  } catch {
    /* non-configurable engine — degrade gracefully */
  }
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame !== 'function') {
    (window as unknown as Record<string, unknown>).requestAnimationFrame =
      (cb: FrameRequestCallback): number => window.setTimeout(() => cb(performance.now()), 0) as unknown as number;
    (window as unknown as Record<string, unknown>).cancelAnimationFrame =
      (handle: number): void => window.clearTimeout(handle as unknown as ReturnType<typeof setTimeout>);
  }
  try {
    sessionStorage.removeItem('madarek-intro-skip');
    sessionStorage.removeItem('madarek-intro-seen');
  } catch {
    /* the setup polyfill guarantees a working storage */
  }
});

describe('r324 — the wait-for-grant belt (StrictMode deadlock fix)', () => {
  it('plays when the grant lands after a StrictMode teardown (the queued path re-arms)', async () => {
    /* Drive the orchestrator into the deadlock window: the app booted
     * and hydrated (phase 'ready') while the splash still holds the
     * seat — exactly the reload choreography that deadlocked CI. */
    markHydrating();
    markReady();
    const beforeMount = getSnapshot();
    expect(beforeMount.phase).toBe('ready');
    expect(beforeMount.fullscreen).toBe('splash');

    const onDone = vi.fn();
    const onExitStart = vi.fn();
    const { container } = render(
      <StrictMode>
        <SheetLoader onDone={onDone} onExitStart={onExitStart} />
      </StrictMode>,
    );

    /* StrictMode has now double-invoked the effects (mount → cleanup →
     * remount). The decision queued the sheet request behind the
     * splash; the belt must be the listener that survived. */
    const queued = getSnapshot();
    expect(queued.fullscreen).toBe('splash');

    /* The splash finishes its exit — the pending sheet request is
     * promoted. With the pre-fix code this emit landed on a torn-down
     * subscription and `.sl` never mounted; the belt catches it. */
    actPoke(() => splashExited());

    await waitFor(
      () => {
        expect(container.querySelector('.sl')).not.toBeNull();
      },
      { timeout: 2000 },
    );
    expect(getSnapshot().fullscreen).toBe('sheet-loader');
  });

  it('still plays instantly when the seat is already free (the granted path is untouched)', async () => {
    /* phase ready + seat free: activateSheetLoader grants immediately —
     * the belt must not regress the direct path. */
    markHydrating();
    markReady();
    actPoke(() => splashExited());
    expect(getSnapshot().fullscreen).toBeNull();

    const { container } = render(
      <StrictMode>
        <SheetLoader onDone={vi.fn()} onExitStart={vi.fn()} />
      </StrictMode>,
    );

    await waitFor(
      () => {
        expect(container.querySelector('.sl')).not.toBeNull();
      },
      { timeout: 2000 },
    );
  });
});
