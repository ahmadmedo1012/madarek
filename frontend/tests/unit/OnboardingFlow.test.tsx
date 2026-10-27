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
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
    // Modal now plays a short exit animation before unmounting
    // (wave 7-a useDelayedUnmount) — await the designed unmount.
    await waitFor(() => {
      expect(document.querySelector('.onboarding-flow')).toBeNull();
    });
    await waitFor(() => {
      expect(api.post).toHaveBeenCalledTimes(1);
    });
    expect(api.post).toHaveBeenCalledWith('/me/onboarding/complete');
  });

  it('skipping a first-run tour closes the flow and persists completion', async () => {
    renderFlow();
    act(() => { useOnboardingStore.getState().start(); });
    fireEvent.click(screen.getByRole('button', { name: 'تخطّي' }));
    await waitFor(() => {
      expect(document.querySelector('.onboarding-flow')).toBeNull();
    });
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
    await waitFor(() => {
      expect(document.querySelector('.onboarding-flow')).toBeNull();
    });
    // Wait a tick to confirm no fetch happens.
    await new Promise((r) => setTimeout(r, 50));
    expect(api.post).not.toHaveBeenCalled();
  });
});

describe('OnboardingFlow frame announcements (r157 F5)', () => {
  beforeEach(() => {
    resetStore();
  });

  it('announces «الإطار N من 4» from a PERSISTENT live region — the keyed remount must not recreate it', () => {
    renderFlow();
    act(() => { useOnboardingStore.getState().start(); });

    const region = document.querySelector('.onboarding-flow .sr-only[role="status"]') as HTMLElement;
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute('aria-live', 'polite');

    // The announcement mirrors the frame copy (headline + body), with
    // latin digits — built from the DOM's own text so the pin can't
    // drift from the component's copy.
    const expectAnnounces = (frameNo: number) => {
      const headline = document.querySelector('.onboarding-flow-headline')!.textContent;
      const body = document.querySelector('.onboarding-flow-body')!.textContent;
      expect(region.textContent).toBe(`الإطار ${frameNo} من 4: ${headline}. ${body}`);
    };
    expectAnnounces(1);

    // Advance a frame: the keyed frame body remounts (slide animation),
    // but the live region must be the SAME node — a region recreated
    // per frame announces nothing.
    fireEvent.click(screen.getByRole('button', { name: 'التالي' }));
    const regionAfter = document.querySelector('.onboarding-flow .sr-only[role="status"]') as HTMLElement;
    expect(regionAfter).toBe(region);
    expectAnnounces(2);

    // And back — still the same node, frame 1 again.
    fireEvent.click(screen.getByRole('button', { name: 'السابق' }));
    expect(document.querySelector('.onboarding-flow .sr-only[role="status"]')).toBe(region);
    expectAnnounces(1);
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

/* ── R320 cycle-3 — the tour veil (production finding, admin @390) ──
 *
 * Measured on production: pf-page-title t=113 vs the centred tour
 * card t=121 → the generic 40 % ink veil let the display-size H1 poke
 * through as an 8 px sliver of giant glyphs above the card, which two
 * independent VLM reviews read as "heavily clipped stubs". The tour is
 * a full-bleed takeover moment: its overlay carries the Heron
 * menu-scrim language (R319 §B1) — paper/ink at 92 % via
 * --glass-bg-strong — so the page behind recedes to an 8 % ghost.
 * Belt: the scoped rule exists in r305-shell.css §7 AND the token
 * stays the 0.92 menu scrim in BOTH themes (a drift to a lighter veil
 * re-opens the defect). */
describe('R320 cycle-3 — the onboarding tour veil (Heron menu scrim)', () => {
  const SHELL_CSS = readFileSync(
    path.resolve(__dirname, '../../src/styles/r305-shell.css'),
    'utf-8',
  );
  const TOKENS_CSS = readFileSync(
    path.resolve(__dirname, '../../src/styles/tokens.css'),
    'utf-8',
  );

  it('scopes the paper/ink 92% scrim to the tour overlay only', () => {
    // NO .has-shell prefix — the modal portal renders at BODY level,
    // outside the shell container (measured on production: the first
    // attempt a9e071a3 carried the prefix and NEVER matched — the rule
    // was in the built CSS yet the computed veil stayed 40 % ink).
    expect(SHELL_CSS).toMatch(
      /(^|[^.\w-])\.modal-overlay:has\(\.onboarding-flow\)\s*\{\s*background:\s*var\(--glass-bg-strong\);?\s*\}/,
    );
    // The dead prefixed twin must not come back.
    expect(SHELL_CSS).not.toMatch(/\.has-shell \.modal-overlay:has\(\.onboarding-flow\)/);
    // And it must NOT leak onto every modal — data dialogs keep the
    // context-keeping --overlay-veil (the frozen components.css rule).
    expect(SHELL_CSS).not.toMatch(/\.modal-overlay\s*\{[^}]*glass-bg-strong/);
  });

  it('keeps --glass-bg-strong the 0.92 menu scrim in BOTH themes', () => {
    const values = TOKENS_CSS.match(/--glass-bg-strong:\s*([^;]+);/g) ?? [];
    expect(values).toHaveLength(2); // light + dark
    for (const v of values) expect(v).toMatch(/0\.92/);
  });
});
