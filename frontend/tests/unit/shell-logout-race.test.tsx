/**
 * Shell logout race (r157, 6A4-4) — the frame-log regression guard.
 *
 * Both the Sidebar and the Topbar logout handlers used to navigate
 * away on CLICK (`logout.mutate(); navigate(...)`) — the redirect beat
 * the async POST /auth/logout, so the router rendered the next frame
 * while the auth store still held the session (a dashboard re-render
 * mid-flight / the auth page shown to a signed-in user), and a FAILED
 * logout call still navigated with a fully-authed store.
 *
 * The unified contract: `mutate(undefined, { onSettled: () =>
 * navigate('/auth', { replace: true }) })` — react-query v5 runs the
 * hook-level onSettled (useAuth.ts: clear() + qc.clear(), verified in
 * query-core mutation.js — :114 hook onSettled precedes the :115
 * success dispatch, :137 precedes the :145 error dispatch) BEFORE the
 * per-mutate onSettled, so the navigation fires strictly AFTER the
 * auth store is empty, on BOTH the success and the error path.
 *
 * The FlashProbe below logs a frame {pathname, user} on every ROUTER
 * frame (navigation commit), sampling the auth store at that instant.
 * Post-click, the set of distinct frames must be exactly
 * [{pathname: '/auth', user: null}] — if the ordering ever flips (a
 * query upgrade, a refactor), the /auth frame samples a still-set
 * store (auth-page-while-signed-in, the old click-time navigate bug),
 * and a broken redirect paints the dashboard instead. Either way this
 * suite fails loudly.
 *
 * Scope note (deliberate): between the store clear and the navigate
 * there is a store-driven re-render on the OLD route (React's
 * useSyncExternalStore sync flush) — that is not a router frame and
 * the probe does not count it; the guarantee this pin owns is "when
 * the router paints the post-logout route, the store is already
 * empty", which is exactly what the store-sampling assertion reads.
 *
 * useAuth.ts itself is REAL here (only lib/api is mocked) — the
 * callback ordering under test is the real react-query 5.62.7 one.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { useEffect } from 'react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../src/lib/api', () => ({
  api: { post: vi.fn(), get: vi.fn() },
  unwrap: vi.fn(),
}));

import { Sidebar } from '../../src/components/layout/Sidebar';
import { useAuthStore, type AuthUser } from '../../src/stores/auth.store';
import { api, unwrap } from '../../src/lib/api';

const postMock = vi.mocked(api.post);
const unwrapMock = vi.mocked(unwrap);

const STUDENT: AuthUser = {
  id: 'u-logout-race',
  email: 'student@zu.edu.ly',
  firstName: 'سالم',
  lastName: 'الزوي',
  role: 'STUDENT',
};

/* ── the frame log ───────────────────────────────────────────────── */
type Frame = { pathname: string; user: string | null };
const frames: Frame[] = [];

/** Logs a frame on every ROUTER frame (navigation commit) and samples
 *  the auth store at that moment — the flash probe. A store-driven
 *  re-render inside the same route is not a router frame; what this
 *  pin cares about is the state of the store at the instant the
 *  router paints the post-logout route. */
function FlashProbe() {
  const { pathname } = useLocation();
  useEffect(() => {
    frames.push({ pathname, user: useAuthStore.getState().user?.id ?? null });
  }, [pathname]);
  return null;
}

function renderShell() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={['/student/dashboard']}>
        <FlashProbe />
        <Routes>
          <Route path="/auth" element={<div>سطح تسجيل الدخول</div>} />
          <Route
            path="/student/dashboard"
            element={
              <>
                <Sidebar />
                <div>سطح لوحة التحكم</div>
              </>
            }
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

async function clickLogoutAndAwaitLanding() {
  const logout = screen.getByRole('button', { name: 'تسجيل الخروج' });
  const clickIndex = frames.length;
  fireEvent.click(logout);
  // Wait for the full settle: store cleared AND navigation landed.
  await waitFor(() => expect(useAuthStore.getState().user).toBeNull());
  await waitFor(() => expect(screen.getByText('سطح تسجيل الدخول')).toBeTruthy());
  return frames.slice(clickIndex);
}

/** Post-click router frames must be EXACTLY [{/auth, user:null}] —
 *  the router paints /auth precisely once, and at that instant the
 *  store must already be empty (the old click-time navigate() painted
 *  /auth with user still set; a broken redirect would paint the
 *  dashboard instead). */
function expectSingleAuthFrame(postClick: Frame[]) {
  expect(postClick.length).toBeGreaterThan(0);
  const distinct = Array.from(new Set(postClick.map((f) => JSON.stringify(f))));
  expect(distinct).toEqual([JSON.stringify({ pathname: '/auth', user: null })]);
}

beforeEach(() => {
  vi.clearAllMocks();
  unwrapMock.mockResolvedValue({});
  postMock.mockResolvedValue({ data: {} });
  frames.length = 0;
  act(() => {
    useAuthStore.setState({ user: STUDENT, accessToken: 'tok-logout-race', isHydrated: true });
  });
});

describe('Sidebar logout — redirect strictly after the store clears (r157, 6A4-4)', () => {
  it('success path: no dashboard flash and no auth-page-while-signed-in frame', async () => {
    renderShell();
    // Pre-click, the probe sees the authed dashboard frame.
    expect(frames).toContainEqual({ pathname: '/student/dashboard', user: STUDENT.id });

    const postClick = await clickLogoutAndAwaitLanding();
    expectSingleAuthFrame(postClick);

    // The landing frame itself is /auth with an empty store.
    expect(useAuthStore.getState().accessToken).toBeNull();
    expect(screen.queryByText('سطح لوحة التحكم')).toBeNull();
  });

  it('error path: a failed POST /auth/logout still clears first and redirects after', async () => {
    postMock.mockRejectedValue(new Error('network down'));
    renderShell();

    const postClick = await clickLogoutAndAwaitLanding();
    expectSingleAuthFrame(postClick);
    expect(useAuthStore.getState().user).toBeNull();
  });
});
