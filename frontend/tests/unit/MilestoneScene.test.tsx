/**
 * MilestoneScene tests (audit 11-e P2-8, wave 13-16).
 *
 * The scene is driven through the REAL pieces it composes in
 * production — the real useMilestone hook (useMe mocked at the
 * boundary), the real onboarding store gate, and the real Modal —
 * because the fix under test is exactly their interplay:
 *   - the Modal now owns its close (open={presenting}), so dismissal
 *     plays the wave-7a exit window (data-closing → delayed unmount)
 *     instead of an instant unmount
 *   - the celebrated content survives the exit window (the dismissed
 *     scene is remembered until the card leaves the DOM)
 *   - the auto-dismiss hold does not restart on unrelated parent
 *     re-renders (useMilestone's dismissPending is referentially
 *     stable)
 *   - the queue-behind-onboarding contract (§5) still holds: a
 *     milestone arriving mid-tour presents only after the flow closes
 *
 * Fake timers drive the hold + exit-safety-net deadlines; jsdom has
 * no CSS so the exit window resolves to the fallback duration
 * (240ms token fallback + 80ms slack — see useDelayedUnmount).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render, fireEvent } from '@testing-library/react';

let fired: string[] = [];
vi.mock('../../src/hooks/useAuth', () => ({
  useMe: () => ({ data: { id: 'u1', firedMilestones: fired } }),
}));

import { MilestoneScene } from '../../src/components/onboarding/MilestoneScene';
import { useOnboardingStore } from '../../src/stores/onboarding.store';

const HOLD_MS = 1000;
/** Exit safety net in jsdom: 240ms token fallback + 80ms slack. */
const EXIT_WINDOW_MS = 240 + 80;

function Host({ holdMs = HOLD_MS }: { holdMs?: number }) {
  return <MilestoneScene holdMs={holdMs} />;
}

const overlay = (): HTMLElement | null =>
  document.querySelector('.modal-overlay');
const resetStore = () =>
  useOnboardingStore.setState({ isOpen: false, currentFrame: 0, isReplay: false });

beforeEach(() => {
  vi.useFakeTimers();
  fired = [];
  resetStore();
});

afterEach(() => {
  vi.useRealTimers();
});

function presentMilestone() {
  const view = render(<Host />);
  fired = ['first-assignment-complete'];
  view.rerender(<Host />);
  return view;
}

describe('MilestoneScene — presentation', () => {
  it('renders nothing until a new milestone fires', () => {
    render(<Host />);
    expect(overlay()).toBeNull();
  });

  it('presents the celebration copy keyed by the milestone id', () => {
    presentMilestone();
    expect(document.querySelector('[data-milestone="first-assignment-complete"]')).not.toBeNull();
    expect(document.querySelector('.onboarding-flow-headline')?.textContent)
      .toBe('مبروك أوّل واجب!');
    expect(overlay()?.getAttribute('data-closing')).toBeNull();
  });
});

describe('MilestoneScene — Modal owns the close (P2-8)', () => {
  it('auto-dismissal plays the exit window before unmounting', () => {
    presentMilestone();

    // Hold elapses → dismissal fires…
    act(() => { vi.advanceTimersByTime(HOLD_MS); });

    // …but the card is still mounted, flagged closing, with its
    // content intact — NOT the instant unmount of the old design.
    const el = overlay();
    expect(el).not.toBeNull();
    expect(el?.getAttribute('data-closing')).toBe('true');
    expect(document.querySelector('.onboarding-flow-headline')?.textContent)
      .toBe('مبروك أوّل واجب!');

    // Safety net elapses → the card finally leaves the DOM.
    act(() => { vi.advanceTimersByTime(EXIT_WINDOW_MS + 50); });
    expect(overlay()).toBeNull();
  });

  it('CTA dismissal plays the same exit window', () => {
    presentMilestone();
    fireEvent.click(document.querySelector('.onboarding-flow-actions button')!);

    expect(overlay()).not.toBeNull();
    expect(overlay()?.getAttribute('data-closing')).toBe('true');
    act(() => { vi.advanceTimersByTime(EXIT_WINDOW_MS + 50); });
    expect(overlay()).toBeNull();
  });

  it('Escape dismissal plays the same exit window', () => {
    presentMilestone();
    act(() => {
      fireEvent.keyDown(document, { key: 'Escape' });
    });

    expect(overlay()?.getAttribute('data-closing')).toBe('true');
    act(() => { vi.advanceTimersByTime(EXIT_WINDOW_MS + 50); });
    expect(overlay()).toBeNull();
  });
});

describe('MilestoneScene — hold stability (P2-8)', () => {
  it('does not restart the auto-dismiss hold on unrelated re-renders', () => {
    const view = presentMilestone();

    // 300ms into the 1000ms hold, the parent re-renders (in
    // production: AppShell scroll state, notification polls, …).
    act(() => { vi.advanceTimersByTime(300); });
    view.rerender(<Host />);

    // The ORIGINAL deadline still governs: at 1000ms since arming the
    // scene dismisses (a restarted timer would still have 300ms left).
    act(() => { vi.advanceTimersByTime(700); });
    expect(overlay()?.getAttribute('data-closing')).toBe('true');
    act(() => { vi.advanceTimersByTime(EXIT_WINDOW_MS + 50); });
    expect(overlay()).toBeNull();
  });
});

describe('MilestoneScene — queue behind onboarding (contract §5)', () => {
  it('waits while the tour owns the modal layer, then presents', () => {
    act(() => { useOnboardingStore.getState().start(); });
    const view = render(<Host />);

    // New milestone arrives mid-tour → stays pending, no second modal.
    fired = ['first-course-complete'];
    view.rerender(<Host />);
    expect(overlay()).toBeNull();

    // Tour closes → the gate opens and the scene presents.
    act(() => { useOnboardingStore.getState().dismiss(); });
    expect(document.querySelector('[data-milestone="first-course-complete"]')).not.toBeNull();
    expect(overlay()?.getAttribute('data-closing')).toBeNull();
  });
});
