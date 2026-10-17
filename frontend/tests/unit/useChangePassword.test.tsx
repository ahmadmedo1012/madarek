/**
 * r180-F4 — useChangePassword contract pins.
 *
 * 1. The mutation posts { currentPassword, newPassword } to
 *    /auth/change-password and, on success, persists the RE-ISSUED
 *    session (setSession with the new accessToken + the payload's
 *    institution context) — the backend route rotates this device's
 *    tokens after the tokenVersion bump, so the honest client
 *    behavior is "stay logged in", never a forced logout.
 * 2. A 401 INVALID_CREDENTIALS rejection leaves the session untouched
 *    (setSession never runs) and maps to the wrong-current-password
 *    classification the profile card renders inline.
 * 3. changePasswordPolicy mirrors the register policy (r170g): 12–72
 *    chars + the common-password blocklist, with the register form's
 *    own Arabic messages.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import type { Mock } from 'vitest';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

vi.mock('../../src/lib/api', () => {
  const post = vi.fn(async () => ({ data: {} }));
  return {
    api: {
      post,
      get: vi.fn(async () => ({ data: [] })),
      patch: vi.fn(async () => ({ data: {} })),
      delete: vi.fn(async () => ({ data: {} })),
    },
    unwrap: <T,>(p: Promise<{ data: T }>): Promise<T> => p.then((r) => r.data),
    // Faithful to the real extractSessionExtras: honest defaults when
    // the payload carries no context fields.
    extractSessionExtras: (user: Record<string, unknown>) => ({
      memberships: (user.memberships as unknown[]) ?? [],
      currentInstitution: (user.currentInstitution as unknown) ?? null,
      membershipRole: (user.membershipRole as unknown) ?? null,
    }),
  };
});

import {
  useChangePassword,
  changePasswordPolicy,
  isWrongCurrentPassword,
  changePasswordErrorMessage,
} from '../../src/hooks/useChangePassword';
import { useAuthStore } from '../../src/stores/auth.store';
import { api } from '../../src/lib/api';

const post = api.post as unknown as Mock;

const SESSION_USER = {
  id: 'user-1',
  email: 'student@zu.edu.ly',
  firstName: 'طالب',
  lastName: 'تجريبي',
  role: 'STUDENT' as const,
  memberships: [],
  currentInstitution: {
    id: 'inst-zawia-showcase',
    name: 'جامعة الزاوية',
    slug: 'zawia-showcase',
  },
  membershipRole: 'STUDENT' as const,
};

function makeClient() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return { wrapper };
}

beforeEach(() => {
  vi.clearAllMocks();
  post.mockResolvedValue({ data: { user: SESSION_USER, accessToken: 'fresh-token' } });
  // A logged-in session on the OLD token — what the bump must replace,
  // never clear. (No extras → the store's honest context-less defaults.)
  useAuthStore.getState().setSession(
    { id: 'user-1', email: 'student@zu.edu.ly', firstName: 'طالب', lastName: 'تجريبي', role: 'STUDENT' },
    'old-token',
  );
});

describe('useChangePassword — the re-issued session (r180-F4)', () => {
  it('posts the exact body to /auth/change-password', async () => {
    const { wrapper } = makeClient();
    const { result } = renderHook(() => useChangePassword(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ currentPassword: 'old-secret', newPassword: 'a-long-new-secret' });
    });
    expect(post).toHaveBeenCalledTimes(1);
    expect(post).toHaveBeenCalledWith('/auth/change-password', {
      currentPassword: 'old-secret',
      newPassword: 'a-long-new-secret',
    });
  });

  it('on success the session SURVIVES on the re-issued token (no forced logout)', async () => {
    const { wrapper } = makeClient();
    const { result } = renderHook(() => useChangePassword(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ currentPassword: 'old-secret', newPassword: 'a-long-new-secret' });
    });
    const state = useAuthStore.getState();
    // The bump killed every OTHER device; THIS device was handed a
    // fresh session — the store must carry it, not a logout.
    expect(state.accessToken).toBe('fresh-token');
    expect(state.user?.id).toBe('user-1');
    // The institution context rides the payload (the route re-resolves
    // it the same way refresh does).
    expect(state.currentInstitution?.slug).toBe('zawia-showcase');
    expect(state.membershipRole).toBe('STUDENT');
    // renderHook's proxy needs a settled re-render to observe the
    // terminal flag (the store assertions above are the contract;
    // this pin just guards against a silent regression to idle).
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('a rejected change never touches the live session', async () => {
    post.mockRejectedValueOnce({
      response: {
        status: 401,
        data: { error: { code: 'INVALID_CREDENTIALS', message: 'كلمة المرور الحالية غير صحيحة' } },
      },
    });
    const { wrapper } = makeClient();
    const { result } = renderHook(() => useChangePassword(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ currentPassword: 'wrong', newPassword: 'a-long-new-secret' })
        .catch(() => undefined);
    });
    expect(useAuthStore.getState().accessToken).toBe('old-token');
    await waitFor(() => expect(result.current.isError).toBe(true));
  });
});

describe('isWrongCurrentPassword — the 401 classification', () => {
  it('matches 401 INVALID_CREDENTIALS', () => {
    expect(isWrongCurrentPassword({
      response: {
        status: 401,
        data: { error: { code: 'INVALID_CREDENTIALS', message: 'كلمة المرور الحالية غير صحيحة' } },
      },
    })).toBe(true);
  });

  it('rejects other 401s (e.g. a dead session), other statuses and network faults', () => {
    expect(isWrongCurrentPassword({
      response: { status: 401, data: { error: { code: 'UNAUTHENTICATED', message: '…' } } },
    })).toBe(false);
    expect(isWrongCurrentPassword({
      response: { status: 429, data: { error: { code: 'TOO_MANY_REQUESTS', message: '…' } } },
    })).toBe(false);
    expect(isWrongCurrentPassword({ message: 'Network Error' })).toBe(false);
    expect(isWrongCurrentPassword(null)).toBe(false);
  });
});

describe('changePasswordErrorMessage — honest Arabic surfacing', () => {
  it('renders the backend Arabic message verbatim (wrong current password)', () => {
    expect(changePasswordErrorMessage({
      response: {
        status: 401,
        data: { error: { code: 'INVALID_CREDENTIALS', message: 'كلمة المرور الحالية غير صحيحة' } },
      },
    })).toBe('كلمة المرور الحالية غير صحيحة');
  });

  it('renders the limiter Arabic line for a 429', () => {
    expect(changePasswordErrorMessage({
      response: {
        status: 429,
        data: { error: { code: 'TOO_MANY_REQUESTS', message: 'محاولات كثيرة لتغيير كلمة المرور — انتظر قليلاً ثم أعد المحاولة' } },
      },
    })).toBe('محاولات كثيرة لتغيير كلمة المرور — انتظر قليلاً ثم أعد المحاولة');
  });

  it('falls back to the Arabic connection copy when there is no response', () => {
    expect(changePasswordErrorMessage({ message: 'Network Error' }))
      .toBe('تعذَّر تغيير كلمة المرور — تحقّق من اتصالك ثم أعد المحاولة.');
  });
});

describe('changePasswordPolicy — the register-policy mirror (r170g parity)', () => {
  it('accepts a 12+ non-common password', () => {
    expect(changePasswordPolicy.safeParse('S7r#kx92LmQp').success).toBe(true);
  });

  it('rejects an 8–11-char secret with the register form length copy', () => {
    const out = changePasswordPolicy.safeParse('shortpass1');
    expect(out.success).toBe(false);
    if (!out.success) {
      expect(out.error.issues[0]?.message).toBe('12 حرفًا على الأقل');
    }
  });

  it('rejects a blocklisted password with the register form copy', () => {
    // 12 chars — long enough to reach the refine, and on the FE
    // blocklist mirror (lib/commonPasswords.ts).
    const out = changePasswordPolicy.safeParse('password1234');
    expect(out.success).toBe(false);
    if (!out.success) {
      expect(out.error.issues[0]?.message).toBe('كلمة المرور شائعة جدًا — اختر واحدة أقل توقّعًا');
    }
  });

  it('rejects past the 72-char argon2 cap with Arabic copy (never an English zod default)', () => {
    const out = changePasswordPolicy.safeParse('x'.repeat(73));
    expect(out.success).toBe(false);
    if (!out.success) {
      expect(out.error.issues[0]?.message).toBe('72 حرفًا كحدّ أقصى');
    }
  });
});
