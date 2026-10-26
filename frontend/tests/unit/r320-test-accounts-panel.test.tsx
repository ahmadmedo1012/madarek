/**
 * R320 §C — the test-account login panel (AuthPage).
 *
 * The panel replaces the five per-role demo chips with the SHARED
 * test-account table (one easy account per job, `@test.ly` /
 * `12345678` — imported from the repo-root `@shared/testAccounts`
 * re-export; the physical table is
 * backend/src/modules/auth/test-accounts.data.ts). These tests pin the
 * panel's three contracts:
 *
 *   1. RENDER — every job in the table, grouped التعليم / الإدارة /
 *      النظام, email + password VISIBLE (published test credentials).
 *   2. FILL → SUBMIT — «تعبئة» fills BOTH form fields (never submits);
 *      the SAME row's button then reads «دخول» and the second tap
 *      submits the form with those credentials.
 *   3. GATE — VITE_SHOW_TEST_ACCOUNTS=0 hides the panel AND its reopen
 *      chip (default: absent var = SHOW).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { TEST_ACCOUNTS, TEST_ACCOUNT_GROUPS } from '@shared/testAccounts';

type LoginState = {
  mutateAsync: (values: { email: string; password: string }) => Promise<never>;
  isPending: boolean;
  isError: boolean;
  error: unknown;
};

const loginState = vi.hoisted(() => ({ current: {} as LoginState }));

vi.mock('../../src/hooks/useAuth', () => ({
  useLogin: () => loginState.current,
  useSelectInstitution: () => ({
    mutateAsync: vi.fn(),
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    error: null,
  }),
}));

import AuthPage from '../../src/pages/AuthPage';

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <MemoryRouter>
      <QueryClientProvider client={qc}>
        <AuthPage />
      </QueryClientProvider>
    </MemoryRouter>,
  );
}

/** Open the collapsed panel via the quiet reopen chip (r157 F5). */
function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: 'عرض الحسابات التجريبية' }));
}

describe('R320 §C — the test-account login panel', () => {
  beforeEach(() => {
    loginState.current = {
      mutateAsync: vi.fn(),
      isPending: false,
      isError: false,
      error: null,
    };
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('renders EVERY job from the shared table, grouped, with email + password visible', () => {
    renderPage();
    openPanel();

    // One group header per group, in the table's order.
    for (const group of TEST_ACCOUNT_GROUPS) {
      expect(screen.getByText(group)).toHaveClass('auth-demo-group-label');
    }

    // Every job row: the job label + the email, each exactly once; the
    // password is VISIBLE by design (published test credentials) — one
    // visible copy per account (they all share the easy value).
    const rows = screen.getAllByRole('button', { name: /^تعبئة حساب / });
    expect(rows).toHaveLength(TEST_ACCOUNTS.length);
    for (const account of TEST_ACCOUNTS) {
      expect(screen.getByText(account.job)).toBeInTheDocument();
      expect(screen.getByText(account.email)).toBeInTheDocument();
    }
    expect(screen.getAllByText(TEST_ACCOUNTS[0]!.password)).toHaveLength(TEST_ACCOUNTS.length);
  });

  it('«تعبئة» fills BOTH fields and never submits; the same row flips to «دخول»', async () => {
    renderPage();
    openPanel();

    const email = screen.getByLabelText('البريد الإلكتروني أو رقم القيد') as HTMLInputElement;
    const password = screen.getByLabelText('كلمة المرور') as HTMLInputElement;
    const student = TEST_ACCOUNTS.find((a) => a.email === 'student@test.ly')!;

    fireEvent.click(screen.getByRole('button', { name: 'تعبئة حساب طالب' }));
    await waitFor(() => {
      expect(email.value).toBe(student.email);
      expect(password.value).toBe(student.password);
    });
    // One-click FILL only — the visitor submits the form themselves.
    expect(loginState.current.mutateAsync).not.toHaveBeenCalled();

    // The filled row's button flips to «دخول» (other rows stay «تعبئة»).
    expect(screen.getByRole('button', { name: 'دخول بحساب طالب' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'تعبئة حساب أستاذ' })).toBeInTheDocument();
  });

  it('the second tap («دخول») submits the form with the filled credentials', async () => {
    renderPage();
    openPanel();

    fireEvent.click(screen.getByRole('button', { name: 'تعبئة حساب المسجل العام' }));
    await waitFor(() => {
      expect(
        (screen.getByLabelText('البريد الإلكتروني أو رقم القيد') as HTMLInputElement).value,
      ).toBe('registrar@test.ly');
    });

    fireEvent.click(screen.getByRole('button', { name: 'دخول بحساب المسجل العام' }));
    await waitFor(() => {
      expect(loginState.current.mutateAsync).toHaveBeenCalledWith({
        email: 'registrar@test.ly',
        password: '12345678',
      });
    });
  });

  it('VITE_SHOW_TEST_ACCOUNTS=0 hides the panel AND its reopen chip', () => {
    vi.stubEnv('VITE_SHOW_TEST_ACCOUNTS', '0');
    renderPage();

    expect(screen.queryByRole('button', { name: 'عرض الحسابات التجريبية' })).toBeNull();
    expect(screen.queryByText('حسابات تجريبية — بيئة التطوير')).toBeNull();
    expect(screen.queryAllByRole('button', { name: /^تعبئة حساب / })).toHaveLength(0);
  });

  it('the panel starts collapsed (r157 F5) and is dismissible', () => {
    renderPage();

    // Dev convenience, never the first thing a visitor reads.
    expect(screen.queryByText('حسابات تجريبية — بيئة التطوير')).toBeNull();
    expect(screen.getByRole('button', { name: 'عرض الحسابات التجريبية' })).toHaveClass(
      'auth-demo-hint-reopen',
    );

    openPanel();
    expect(screen.getByText('حسابات تجريبية — بيئة التطوير')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'إخفاء لوحة الحسابات التجريبية' }));
    expect(screen.queryByText('حسابات تجريبية — بيئة التطوير')).toBeNull();
  });
});
