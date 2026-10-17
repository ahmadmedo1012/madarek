/**
 * useAuth session-boundary tests (audit P0-1): login / register /
 * logout must clear the TanStack cache so a previous account's cached
 * queries never render for the next one (shared lab machines).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { AxiosResponse } from 'axios';

vi.mock('../../src/lib/api', () => ({
  api: { post: vi.fn(), get: vi.fn(), put: vi.fn() },
  unwrap: vi.fn(),
  // r178: useLogin/useRegister split the payload's institution context
  // through this helper before setSession — mirror the real defaulting
  // logic so the store assertions below see the honest defaults.
  extractSessionExtras: (user: {
    memberships?: unknown[];
    currentInstitution?: unknown;
    membershipRole?: unknown;
  }) => ({
    memberships: user.memberships ?? [],
    currentInstitution: user.currentInstitution ?? null,
    membershipRole: user.membershipRole ?? null,
  }),
}));

import { useLogin, useRegister, useLogout, useMe } from '../../src/hooks/useAuth';
import { useAuthStore, type AuthUser } from '../../src/stores/auth.store';
import { api, unwrap } from '../../src/lib/api';

const postMock = vi.mocked(api.post);
const unwrapMock = vi.mocked(unwrap);

const USER_A: AuthUser = {
  id: 'user-a',
  email: 'a@zu.edu.ly',
  firstName: 'أحمد',
  lastName: 'المبروك',
  role: 'STUDENT',
};
const USER_B: AuthUser = {
  id: 'user-b',
  email: 'b@zu.edu.ly',
  firstName: 'براء',
  lastName: 'الطاهر',
  role: 'TEACHER',
};

function makeWrapper(qc: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

/** A QueryClient holding a previous account's cached queries. */
function seededClient(): QueryClient {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  qc.setQueryData(['auth', 'me'], { id: USER_A.id, role: USER_A.role });
  qc.setQueryData(['me', 'dashboard'], { grade: 97 });
  qc.setQueryData(['notifications'], [{ id: 'n1' }]);
  return qc;
}

beforeEach(() => {
  vi.clearAllMocks();
  postMock.mockResolvedValue({ data: {} } as unknown as AxiosResponse);
  useAuthStore.setState({
    user: null,
    accessToken: null,
    memberships: [],
    currentInstitution: null,
    membershipRole: null,
  });
  localStorage.removeItem('mdrk-auth');
});

describe('useLogin — session boundary', () => {
  it('clears the previous account’s cached queries before establishing the new session', async () => {
    unwrapMock.mockResolvedValue({ user: USER_B, accessToken: 'tok-b' });
    const qc = seededClient();

    const { result } = renderHook(() => useLogin(), { wrapper: makeWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync({ email: USER_B.email, password: 'Madarek2026!' });
    });

    expect(qc.getQueryData(['auth', 'me'])).toBeUndefined();
    expect(qc.getQueryData(['me', 'dashboard'])).toBeUndefined();
    expect(qc.getQueryData(['notifications'])).toBeUndefined();
    expect(useAuthStore.getState().user?.id).toBe('user-b');
    expect(useAuthStore.getState().accessToken).toBe('tok-b');
  });
});

describe('useRegister — session boundary', () => {
  it('clears the cached queries before establishing the new session', async () => {
    unwrapMock.mockResolvedValue({ user: USER_B, accessToken: 'tok-reg' });
    const qc = seededClient();

    const { result } = renderHook(() => useRegister(), { wrapper: makeWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync({
        email: USER_B.email,
        password: 'Madarek2026!',
        firstName: USER_B.firstName,
        lastName: USER_B.lastName,
        role: 'TEACHER',
        institutionId: 'inst-zawia-showcase', // r178: required for both public roles
      });
    });

    expect(qc.getQueryData(['auth', 'me'])).toBeUndefined();
    expect(qc.getQueryData(['notifications'])).toBeUndefined();
    expect(useAuthStore.getState().user?.id).toBe('user-b');
    expect(useAuthStore.getState().accessToken).toBe('tok-reg');
  });
});

describe('useLogout — session boundary (pinned)', () => {
  it('clears the store and the query cache on settle, even when the call fails', async () => {
    postMock.mockRejectedValue(new Error('network down'));
    const qc = seededClient();
    useAuthStore.getState().setSession(USER_A, 'tok-a');

    const { result } = renderHook(() => useLogout(), { wrapper: makeWrapper(qc) });
    await act(async () => {
      await result.current.mutateAsync().catch(() => undefined); // fire-and-forget in the app
    });

    expect(useAuthStore.getState().user).toBeNull();
    expect(qc.getQueryData(['auth', 'me'])).toBeUndefined();
    expect(qc.getQueryData(['me', 'dashboard'])).toBeUndefined();
  });
});

describe('useMe — institution context sync (r178)', () => {
  it('applies the me payload’s context fields WITHOUT touching the user/token pair', async () => {
    useAuthStore.getState().setSession(USER_A, 'tok-me');
    unwrapMock.mockResolvedValue({
      ...USER_A,
      memberships: [
        {
          institutionId: 'inst-alandalus-demo',
          name: 'مؤسسة الأندلس التعليمية',
          nameEn: 'Al-Andalus Education Institute',
          slug: 'alandalus-demo',
          role: 'ADMIN',
          isActive: true,
        },
      ],
      currentInstitution: {
        id: 'inst-alandalus-demo',
        name: 'مؤسسة الأندلس التعليمية',
        nameEn: 'Al-Andalus Education Institute',
        slug: 'alandalus-demo',
      },
      membershipRole: 'ADMIN',
    });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper(qc) });
    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true));

    // The context lands in the store (the shell’s chip source)…
    const state = useAuthStore.getState();
    expect(state.memberships).toHaveLength(1);
    expect(state.currentInstitution?.slug).toBe('alandalus-demo');
    expect(state.membershipRole).toBe('ADMIN');
    // …while the me read carries no token — the session pair stays as-is.
    expect(state.user?.id).toBe('user-a');
    expect(state.accessToken).toBe('tok-me');
  });

  it('resets the context when the me payload carries none (honest defaults)', async () => {
    // A contextual session first…
    useAuthStore.getState().setSession(USER_A, 'tok-me', {
      memberships: [
        {
          institutionId: 'inst-zawia-showcase',
          name: 'جامعة الزاوية',
          nameEn: 'University of Zawia',
          slug: 'zawia-showcase',
          role: 'STUDENT',
          isActive: true,
        },
      ],
      currentInstitution: {
        id: 'inst-zawia-showcase',
        name: 'جامعة الزاوية',
        nameEn: 'University of Zawia',
        slug: 'zawia-showcase',
      },
      membershipRole: 'STUDENT',
    });
    // …then a me read whose membership was revoked server-side: the
    // payload lists zero active memberships and no context — the chip
    // must not outlive its evidence.
    unwrapMock.mockResolvedValue({ ...USER_A });
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    const { result } = renderHook(() => useMe(), { wrapper: makeWrapper(qc) });
    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true));

    const state = useAuthStore.getState();
    expect(state.memberships).toEqual([]);
    expect(state.currentInstitution).toBeNull();
    expect(state.membershipRole).toBeNull();
  });
});
