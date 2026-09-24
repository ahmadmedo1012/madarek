/**
 * Onboarding state tests — the shared zustand store + the
 * useOnboardingState adapter layered on top of it.
 *
 * The original architecture kept isOpen/currentFrame/isReplay in
 * component-local useState across three independent hook instances
 * (AppShell auto-start, Sidebar replay, OnboardingFlow renderer), so
 * the renderer's isOpen never flipped and the flow could never open
 * (audit 0-f P0-2). These tests pin the rebuilt contract:
 *   - the store is the single source of truth
 *     (start/dismiss/complete/next/prev/goTo),
 *   - every hook instance observes the same open/frame state,
 *   - completion persists via POST /me/onboarding/complete unless the
 *     open was a replay,
 *   - milestone scenes queue while onboarding owns the modal layer
 *     (contract onboarding-milestone.md §5).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { act, render, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../../src/lib/api', () => {
  const post = vi.fn(async () => ({ data: { onboardingCompletedAt: '2026-06-03T00:00:00.000Z' } }));
  return {
    api: { post },
    unwrap: <T,>(p: Promise<{ data: T }>): Promise<T> =>
      p.then((r) => r.data),
  };
});

const mockMe = vi.fn();
vi.mock('../../src/hooks/useAuth', () => ({
  useMe: () => mockMe(),
}));

// MilestoneScene consumes useMilestone; the queueing test drives the
// pending scene through this mutable stub (referenced lazily so the
// vi.mock hoisting stays safe).
const milestoneMock: { pendingScene: string | null; dismissPending: Mock } = {
  pendingScene: null,
  dismissPending: vi.fn(),
};
vi.mock('../../src/hooks/useMilestone', () => ({
  useMilestone: () => milestoneMock,
}));

import { useOnboardingState } from '../../src/hooks/useOnboardingState';
import { useOnboardingStore, selectCanShowMilestone } from '../../src/stores/onboarding.store';
import { MilestoneScene } from '../../src/components/onboarding/MilestoneScene';
import { api } from '../../src/lib/api';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

const resetStore = () =>
  useOnboardingStore.setState({ isOpen: false, currentFrame: 0, isReplay: false });

/* ── The store (single source of truth) ─────────────────────────── */

describe('onboarding.store', () => {
  beforeEach(() => {
    resetStore();
    (api.post as unknown as { mockClear: () => void }).mockClear();
    mockMe.mockReset();
  });

  it('starts closed; start() opens at frame 0 as a first run', () => {
    const s = useOnboardingStore.getState();
    expect(s.isOpen).toBe(false);
    expect(s.currentFrame).toBe(0);
    expect(s.isReplay).toBe(false);
    act(() => { s.start(); });
    const after = useOnboardingStore.getState();
    expect(after.isOpen).toBe(true);
    expect(after.currentFrame).toBe(0);
    expect(after.isReplay).toBe(false);
  });

  it('start({ replay: true }) marks the session as a replay', () => {
    act(() => { useOnboardingStore.getState().start({ replay: true }); });
    const s = useOnboardingStore.getState();
    expect(s.isOpen).toBe(true);
    expect(s.isReplay).toBe(true);
  });

  it('next()/prev() navigate and clamp to 0..3', () => {
    act(() => {
      useOnboardingStore.getState().start();
      useOnboardingStore.getState().next();
      useOnboardingStore.getState().next();
    });
    expect(useOnboardingStore.getState().currentFrame).toBe(2);
    act(() => { useOnboardingStore.getState().prev(); });
    expect(useOnboardingStore.getState().currentFrame).toBe(1);
    act(() => {
      useOnboardingStore.getState().next();
      useOnboardingStore.getState().next();
      useOnboardingStore.getState().next(); // clamped at 3
    });
    expect(useOnboardingStore.getState().currentFrame).toBe(3);
    act(() => { useOnboardingStore.getState().prev(); useOnboardingStore.getState().prev(); useOnboardingStore.getState().prev(); useOnboardingStore.getState().prev(); });
    expect(useOnboardingStore.getState().currentFrame).toBe(0);
  });

  it('goTo() jumps to a frame and clamps out-of-range values', () => {
    act(() => { useOnboardingStore.getState().start(); });
    act(() => { useOnboardingStore.getState().goTo(3); });
    expect(useOnboardingStore.getState().currentFrame).toBe(3);
    act(() => { useOnboardingStore.getState().goTo(99); });
    expect(useOnboardingStore.getState().currentFrame).toBe(3);
    act(() => { useOnboardingStore.getState().goTo(-4); });
    expect(useOnboardingStore.getState().currentFrame).toBe(0);
  });

  it('dismiss() and complete() close the flow and reset frame + replay flag', () => {
    act(() => {
      useOnboardingStore.getState().start({ replay: true });
      useOnboardingStore.getState().goTo(2);
    });
    act(() => { useOnboardingStore.getState().dismiss(); });
    expect(useOnboardingStore.getState()).toMatchObject({ isOpen: false, currentFrame: 0, isReplay: false });

    act(() => {
      useOnboardingStore.getState().start();
      useOnboardingStore.getState().goTo(3);
    });
    act(() => { useOnboardingStore.getState().complete(); });
    expect(useOnboardingStore.getState()).toMatchObject({ isOpen: false, currentFrame: 0, isReplay: false });
  });
});

/* ── The hook adapter (store + me-derived flags + persistence) ──── */

describe('useOnboardingState', () => {
  beforeEach(() => {
    resetStore();
    (api.post as unknown as { mockClear: () => void }).mockClear();
    mockMe.mockReset();
  });

  it('shouldAutoStart=true when me exists and onboardingCompletedAt is null', () => {
    mockMe.mockReturnValue({
      data: { id: 'u1', onboardingCompletedAt: null },
    });
    const { result } = renderHook(() => useOnboardingState(), { wrapper });
    expect(result.current.shouldAutoStart).toBe(true);
  });

  it('shouldAutoStart=false when onboardingCompletedAt is set', () => {
    mockMe.mockReturnValue({
      data: { id: 'u1', onboardingCompletedAt: '2026-01-01T00:00:00.000Z' },
    });
    const { result } = renderHook(() => useOnboardingState(), { wrapper });
    expect(result.current.shouldAutoStart).toBe(false);
  });

  it('shouldAutoStart=false for unauthenticated visitors', () => {
    mockMe.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useOnboardingState(), { wrapper });
    expect(result.current.shouldAutoStart).toBe(false);
  });

  it('open() flips isOpen and resets to frame 0', () => {
    mockMe.mockReturnValue({
      data: { id: 'u1', onboardingCompletedAt: null },
    });
    const { result } = renderHook(() => useOnboardingState(), { wrapper });
    expect(result.current.isOpen).toBe(false);
    act(() => {
      result.current.open();
    });
    expect(result.current.isOpen).toBe(true);
    expect(result.current.currentFrame).toBe(0);
    expect(result.current.isReplay).toBe(false);
  });

  it('open({ replay: true }) sets the replay flag', () => {
    mockMe.mockReturnValue({
      data: { id: 'u1', onboardingCompletedAt: '2026-01-01T00:00:00.000Z' },
    });
    const { result } = renderHook(() => useOnboardingState(), { wrapper });
    act(() => {
      result.current.open({ replay: true });
    });
    expect(result.current.isReplay).toBe(true);
  });

  it('open() in one instance is observed by every other instance (shared store)', () => {
    // The P0-2 regression: AppShell/Sidebar call open() on their own
    // hook instance; <OnboardingFlow /> reads another instance. With
    // component-local state the renderer never saw the open.
    mockMe.mockReturnValue({
      data: { id: 'u1', onboardingCompletedAt: null },
    });
    const trigger = renderHook(() => useOnboardingState(), { wrapper });
    const renderer = renderHook(() => useOnboardingState(), { wrapper });
    act(() => {
      trigger.result.current.open();
    });
    expect(renderer.result.current.isOpen).toBe(true);
    act(() => {
      renderer.result.current.goTo(2);
    });
    expect(trigger.result.current.currentFrame).toBe(2);
  });

  it('next() advances the frame index up to 3', () => {
    mockMe.mockReturnValue({
      data: { id: 'u1', onboardingCompletedAt: null },
    });
    const { result } = renderHook(() => useOnboardingState(), { wrapper });
    act(() => {
      result.current.open();
    });
    expect(result.current.currentFrame).toBe(0);
    act(() => {
      result.current.next();
    });
    expect(result.current.currentFrame).toBe(1);
    act(() => {
      result.current.next();
      result.current.next();
    });
    expect(result.current.currentFrame).toBe(3);
    act(() => {
      result.current.next();
    });
    // Clamped at 3.
    expect(result.current.currentFrame).toBe(3);
  });

  it('prev() steps back, clamped at 0', () => {
    mockMe.mockReturnValue({
      data: { id: 'u1', onboardingCompletedAt: null },
    });
    const { result } = renderHook(() => useOnboardingState(), { wrapper });
    act(() => {
      result.current.open();
      result.current.next();
      result.current.next();
    });
    expect(result.current.currentFrame).toBe(2);
    act(() => {
      result.current.prev();
    });
    expect(result.current.currentFrame).toBe(1);
    act(() => {
      result.current.prev();
      result.current.prev();
    });
    expect(result.current.currentFrame).toBe(0);
    act(() => {
      result.current.prev();
    });
    // Clamped at 0.
    expect(result.current.currentFrame).toBe(0);
  });

  it('skip() in non-replay mode calls the backend', async () => {
    mockMe.mockReturnValue({
      data: { id: 'u1', onboardingCompletedAt: null },
    });
    const { result } = renderHook(() => useOnboardingState(), { wrapper });
    act(() => {
      result.current.open();
    });
    act(() => {
      result.current.skip();
    });
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(1);
    });
    expect(api.post).toHaveBeenCalledWith('/me/onboarding/complete');
  });

  it('finish() in non-replay mode calls the backend', async () => {
    mockMe.mockReturnValue({
      data: { id: 'u1', onboardingCompletedAt: null },
    });
    const { result } = renderHook(() => useOnboardingState(), { wrapper });
    act(() => {
      result.current.open();
      result.current.next();
      result.current.next();
      result.current.next();
    });
    act(() => {
      result.current.finish();
    });
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(1);
    });
  });

  it('replay mode does NOT call the backend on close', async () => {
    mockMe.mockReturnValue({
      data: { id: 'u1', onboardingCompletedAt: '2026-01-01T00:00:00.000Z' },
    });
    const { result } = renderHook(() => useOnboardingState(), { wrapper });
    act(() => {
      result.current.open({ replay: true });
    });
    act(() => {
      result.current.skip();
    });
    // Wait one tick to confirm no fetch happens.
    await new Promise((r) => setTimeout(r, 50));
    expect(api.post).not.toHaveBeenCalled();
  });

  it('closing resets currentFrame to 0', () => {
    mockMe.mockReturnValue({
      data: { id: 'u1', onboardingCompletedAt: null },
    });
    const { result } = renderHook(() => useOnboardingState(), { wrapper });
    act(() => {
      result.current.open();
      result.current.next();
      result.current.next();
    });
    expect(result.current.currentFrame).toBe(2);
    act(() => {
      result.current.skip();
    });
    expect(result.current.isOpen).toBe(false);
    expect(result.current.currentFrame).toBe(0);
  });
});

/* ── Milestone queueing behind the onboarding flow (contract §5) ── */

describe('milestone gate', () => {
  beforeEach(() => {
    resetStore();
    milestoneMock.pendingScene = null;
    milestoneMock.dismissPending.mockClear();
  });

  it('selectCanShowMilestone is false while onboarding is open, true after close', () => {
    expect(selectCanShowMilestone(useOnboardingStore.getState())).toBe(true);
    act(() => { useOnboardingStore.getState().start(); });
    expect(selectCanShowMilestone(useOnboardingStore.getState())).toBe(false);
    act(() => { useOnboardingStore.getState().dismiss(); });
    expect(selectCanShowMilestone(useOnboardingStore.getState())).toBe(true);
    act(() => { useOnboardingStore.getState().start(); });
    act(() => { useOnboardingStore.getState().complete(); });
    expect(selectCanShowMilestone(useOnboardingStore.getState())).toBe(true);
  });

  it('MilestoneScene queues a pending milestone behind the open flow', () => {
    milestoneMock.pendingScene = 'first-assignment-complete';
    act(() => { useOnboardingStore.getState().start(); });
    // holdMs is deliberately long: the auto-dismiss timer must not
    // fire while the scene is queued.
    render(<MilestoneScene holdMs={60_000} />);
    // Onboarding owns the modal layer → the milestone stays queued.
    expect(document.querySelector('.modal-overlay')).toBeNull();
    expect(document.querySelector('[data-milestone]')).toBeNull();
    // The flow closes → the queued milestone presents immediately.
    act(() => { useOnboardingStore.getState().complete(); });
    const scene = document.querySelector('[data-milestone="first-assignment-complete"]');
    expect(scene).not.toBeNull();
    expect(milestoneMock.dismissPending).not.toHaveBeenCalled();
  });

  it('MilestoneScene presents immediately when onboarding is not open', () => {
    milestoneMock.pendingScene = 'first-course-complete';
    render(<MilestoneScene holdMs={60_000} />);
    expect(document.querySelector('[data-milestone="first-course-complete"]')).not.toBeNull();
  });
});
