/**
 * useOnboardingState hook unit tests.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
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

import { useOnboardingState } from '../../src/hooks/useOnboardingState';
import { api } from '../../src/lib/api';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

describe('useOnboardingState', () => {
  beforeEach(() => {
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
