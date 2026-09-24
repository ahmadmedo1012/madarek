/**
 * OnboardingFlow tests — the renderer wired to the REAL shared store.
 *
 * The previous suite mocked useOnboardingState entirely, which is how
 * the production wiring bug stayed invisible: each hook instance held
 * its own component-local state, so the renderer's isOpen never
 * flipped when AppShell/Sidebar called open() (audit 0-f P0-2).
 * These tests render the real flow and drive the shared onboarding
 * store — the exact path production takes — while useMe stays mocked
 * for the role-keyed final frame (WS-F6).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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

const meState: { data: { id: string; role: string } | null } = { data: null };
vi.mock('../../src/hooks/useAuth', () => ({
  useMe: () => meState,
}));

import { OnboardingFlow } from '../../src/components/onboarding/OnboardingFlow';
import { useOnboardingStore } from '../../src/stores/onboarding.store';
import { api } from '../../src/lib/api';

function wrapper({ children }: { children: ReactNode }) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

function renderFlow() {
  return render(<OnboardingFlow />, { wrapper });
}

const resetStore = () =>
  useOnboardingStore.setState({ isOpen: false, currentFrame: 0, isReplay: false });

const flowEl = (): HTMLElement => document.querySelector('.onboarding-flow')!;
const roleIntro = (): HTMLElement =>
  document.querySelector('[data-illustration="onboarding-role-intro"]')!;
const teacherStand = 'line[x1="100"][y1="138"]'; // chalkboard stand
const studentDesk = 'rect[x="48"][y="138"]'; // open-book desk

describe('OnboardingFlow — shared-store wiring', () => {
  beforeEach(() => {
    resetStore();
    (api.post as unknown as { mockClear: () => void }).mockClear();
    meState.data = null;
  });

  it('renders nothing until the shared store opens the flow', () => {
    renderFlow();
    expect(document.querySelector('.modal-overlay')).toBeNull();
    // The Sidebar replay trigger writes the same store…
    act(() => { useOnboardingStore.getState().start({ replay: true }); });
    // …and the renderer reacts — the wiring that was dead in production.
    expect(flowEl()).not.toBeNull();
    expect(flowEl().getAttribute('data-frame')).toBe('0');
  });

  it('Back/Next buttons drive the shared store frame', () => {
    renderFlow();
    act(() => { useOnboardingStore.getState().start(); });
    expect(flowEl().getAttribute('data-frame')).toBe('0');
    fireEvent.click(screen.getByRole('button', { name: 'التالي' }));
    expect(useOnboardingStore.getState().currentFrame).toBe(1);
    expect(flowEl().getAttribute('data-frame')).toBe('1');
    fireEvent.click(screen.getByRole('button', { name: 'السابق' }));
    expect(useOnboardingStore.getState().currentFrame).toBe(0);
  });

  it('finishing on the last frame closes the flow and persists completion', async () => {
    renderFlow();
    act(() => {
      const s = useOnboardingStore.getState();
      s.start();
      s.goTo(3);
    });
    expect(flowEl().getAttribute('data-frame')).toBe('3');
    fireEvent.click(screen.getByRole('button', { name: 'لنبدأ' }));
    expect(document.querySelector('.onboarding-flow')).toBeNull();
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(1);
    });
    expect(api.post).toHaveBeenCalledWith('/me/onboarding/complete');
  });

  it('skipping a first-run tour closes the flow and persists completion', async () => {
    renderFlow();
    act(() => { useOnboardingStore.getState().start(); });
    fireEvent.click(screen.getByRole('button', { name: 'تخطّي' }));
    expect(document.querySelector('.onboarding-flow')).toBeNull();
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledWith('/me/onboarding/complete');
    });
  });

  it('a replay tour never hits the completion endpoint', async () => {
    renderFlow();
    act(() => {
      const s = useOnboardingStore.getState();
      s.start({ replay: true });
      s.goTo(3);
    });
    fireEvent.click(screen.getByRole('button', { name: 'لنبدأ' }));
    expect(document.querySelector('.onboarding-flow')).toBeNull();
    // Wait a tick to confirm no fetch happens.
    await new Promise((r) => setTimeout(r, 50));
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('OnboardingFlow role frame', () => {
  beforeEach(() => {
    resetStore();
    (api.post as unknown as { mockClear: () => void }).mockClear();
  });

  it('renders the TEACHER motif for a teacher on frame 4', () => {
    meState.data = { id: 'u1', role: 'TEACHER' };
    renderFlow();
    act(() => {
      const s = useOnboardingStore.getState();
      s.start();
      s.goTo(3);
    });
    expect(roleIntro()).not.toBeNull();
    expect(roleIntro().querySelector(teacherStand)).not.toBeNull();
    expect(roleIntro().querySelector(studentDesk)).toBeNull();
    // Role copy keyed off the same value.
    expect(document.querySelector('.onboarding-flow-headline')!.textContent)
      .toBe('مرحباً بك أستاذنا');
  });

  it('renders the STUDENT motif when the profile is still loading', () => {
    meState.data = null;
    renderFlow();
    act(() => {
      const s = useOnboardingStore.getState();
      s.start();
      s.goTo(3);
    });
    expect(roleIntro().querySelector(studentDesk)).not.toBeNull();
    expect(roleIntro().querySelector(teacherStand)).toBeNull();
  });
});
