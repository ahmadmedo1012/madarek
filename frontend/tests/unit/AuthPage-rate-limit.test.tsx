/**
 * Wave 23-a — AuthPage rate-limit copy honesty (audit 4-A13 P2-1).
 *
 * One generic banner used to answer every `login.isError`, so a 429
 * lockout told the student to «تحقَّق من البريد وكلمة المرور» —
 * actively misleading during the 10/15-min window (the shared IP
 * bucket is easy to trip). The banner must now name the lockout and
 * surface the honest Arabic message the backend already sends.
 *
 * Verified by code path, NOT by burning the real limiter: the 429
 * state is injected exactly the way the backend would deliver it
 * (`{ error: { code: 'TOO_MANY_REQUESTS', message } }` on an
 * AxiosError-shaped object).
 *
 * r157 F5 extension: the REST of the banner contract via authErrorView
 * (lib/authErrors.ts) — when the backend DID answer, ITS Arabic message
 * shows verbatim: 401 «البريد الإلكتروني أو كلمة المرور غير صحيحة»
 * (backend/src/lib/errors.ts:42), 403 «هذا الحساب معطّل — تواصل مع
 * إدارة الجامعة» (auth.service.ts:291). The authored generic survives
 * only for network silence (no `error.response`) and for Latin-only
 * transport prose the Arabic guard (apiErrorDetail, 15-j P0-1)
 * rejects.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AxiosError } from 'axios';

type LoginState = {
  mutateAsync: () => Promise<never>;
  isPending: boolean;
  isError: boolean;
  error: unknown;
};

const loginState = vi.hoisted(() => ({ current: {} as LoginState }));

vi.mock('../../src/hooks/useAuth', () => ({
  useLogin: () => loginState.current,
  // r178: AuthPage also mounts the institution-selection mutation —
  // these tests exercise the login error paths, so the selector stays
  // a quiet idle stub (never fired without a multi-membership login).
  useSelectInstitution: () => ({
    mutateAsync: vi.fn(),
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import AuthPage from '../../src/pages/AuthPage';

function axError(status: number, code?: string, message?: string): AxiosError<{ error?: { code?: string; message?: string } }> {
  return {
    name: 'AxiosError',
    message: 'Request failed',
    isAxiosError: true,
    config: {},
    response: { status, data: { error: { code, message } } },
  } as unknown as AxiosError<{ error?: { code?: string; message?: string } }>;
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AuthPage />
    </MemoryRouter>,
  );
}

describe('AuthPage — 429 lockout copy (4-A13 P2-1)', () => {
  beforeEach(() => {
    loginState.current = {
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    };
  });

  it('a 429 surfaces the backend lockout message, never credential advice', () => {
    loginState.current.isError = true;
    loginState.current.error = axError(
      429,
      'TOO_MANY_REQUESTS',
      'محاولات دخول كثيرة — انتظر قليلاً ثم أعد المحاولة',
    );
    renderPage();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('محاولات دخول كثيرة — انتظر قليلاً ثم أعد المحاولة');
    // The misleading credential advice must NOT appear in lockout state.
    expect(alert).not.toHaveTextContent('تحقَّق من البريد وكلمة المرور');
  });

  it('the TOO_MANY_REQUESTS code alone (e.g. a 429 proxied through a gateway) is enough', () => {
    loginState.current.isError = true;
    loginState.current.error = axError(502, 'TOO_MANY_REQUESTS', 'محاولات دخول كثيرة — انتظر قليلاً ثم أعد المحاولة');
    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent('محاولات دخول كثيرة');
  });

  it('falls back to authored Arabic when the 429 carries no message body', () => {
    loginState.current.isError = true;
    loginState.current.error = axError(429);
    renderPage();

    expect(screen.getByRole('alert')).toHaveTextContent('محاولات دخول كثيرة — انتظر قليلاً');
    expect(screen.getByRole('alert')).not.toHaveTextContent('تحقَّق من البريد وكلمة المرور');
  });

  it('a 401 (wrong password) surfaces the backend\'s own Arabic message verbatim (D17-3)', () => {
    loginState.current.isError = true;
    loginState.current.error = axError(
      401,
      'INVALID_CREDENTIALS',
      // The real default from backend/src/lib/errors.ts:42 — the
      // server's own words, not a rewritten generic.
      'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    );
    renderPage();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('البريد الإلكتروني أو كلمة المرور غير صحيحة');
    // The generic refusal no longer masks the server's answer.
    expect(alert).not.toHaveTextContent('تعذَّر تسجيل الدخول');
    expect(alert).not.toHaveTextContent('تحقَّق من البريد وكلمة المرور');
  });

  it('a 403 (disabled account) surfaces the backend\'s own Arabic message verbatim', () => {
    loginState.current.isError = true;
    // The exact sentence auth.service.ts:291 rejects with.
    loginState.current.error = axError(403, 'FORBIDDEN', 'هذا الحساب معطّل — تواصل مع إدارة الجامعة');
    renderPage();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('هذا الحساب معطّل — تواصل مع إدارة الجامعة');
    expect(alert).not.toHaveTextContent('تعذَّر تسجيل الدخول');
    expect(alert).not.toHaveTextContent('تحقَّق من البريد وكلمة المرور');
  });

  it('a network failure (no response) keeps the authored generic — nothing to quote', () => {
    loginState.current.isError = true;
    loginState.current.error = {
      name: 'AxiosError',
      message: 'Network Error',
      isAxiosError: true,
      config: {},
    } as unknown as AxiosError;
    renderPage();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('تعذَّر تسجيل الدخول');
    expect(alert).toHaveTextContent('اتصالك بالشبكة');
    // The raw Latin transport prose never reaches the RTL UI.
    expect(alert).not.toHaveTextContent('Network Error');
  });

  it('a Latin-only "message" from the transport is guarded out — generic wins (15-j P0-1)', () => {
    loginState.current.isError = true;
    loginState.current.error = axError(401, 'INVALID_CREDENTIALS', 'Request failed with status code 401');
    renderPage();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('تعذَّر تسجيل الدخول');
    expect(alert).not.toHaveTextContent('Request failed with status code 401');
    // Not a rate limit — the credential-generic grammar is correct here.
    expect(alert).not.toHaveTextContent('محاولات دخول كثيرة');
  });

  it('no error state renders no banner', () => {
    renderPage();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
