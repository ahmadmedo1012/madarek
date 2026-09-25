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

  it('a plain 401 (wrong password) keeps the honest generic banner', () => {
    loginState.current.isError = true;
    loginState.current.error = axError(401, 'INVALID_CREDENTIALS', 'بيانات الدخول غير صحيحة');
    renderPage();

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('تعذَّر تسجيل الدخول');
    expect(alert).toHaveTextContent('تحقَّق من البريد وكلمة المرور');
  });

  it('no error state renders no banner', () => {
    renderPage();
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
