/**
 * r165f — RegisterPage password blocklist mirror (schema + field).
 *
 * The backend rejects the most-abused credentials
 * (auth.dto.ts passwordSchema → password-policy.ts isCommonPassword),
 * but the FE schema used to stop at min(8)/max(72): a blocklist
 * password (password123…) filled every field green, submitted, and
 * came back as the field-less «تحقّق من البيانات المُدخلة» — the
 * visitor retried the SAME secret in a loop at the public funnel's
 * most important form.
 *
 * Pins:
 *   1. schema — the register password schema (registerPasswordSchema,
 *      shared by BOTH role forms) rejects blocklist passwords with the
 *      exact Arabic message, case-insensitively;
 *   2. schema — strong passwords pass, and the pre-existing length
 *      rules keep their own messages (the refine never masks them);
 *   3. field  — the message renders as a field-level error exactly like
 *      the other password rule errors (auth-field-error span, no alert
 *      banner) and submission never leaves the page;
 *   4. field  — a strong password still submits (no false block).
 *
 * Same mock conventions as RegisterPage-steps / -departments-errors.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

type RegisterState = {
  mutateAsync: ReturnType<typeof vi.fn>;
  isPending: boolean;
  error: unknown;
  reset: () => void;
};

const registerState = vi.hoisted(() => ({ current: {} as RegisterState }));

vi.mock('../../src/hooks/useAuth', () => ({
  useRegister: () => registerState.current,
}));

vi.mock('../../src/hooks/useResources', () => ({
  useFaculties: () => ({
    data: [
      {
        id: 'fac-1',
        name: 'كلية تقنية المعلومات',
        iconEmoji: '💻',
        city: 'الزاوية',
        departments: [{ id: 'dep-1', name: 'علوم الحاسوب' }],
      },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

vi.mock('../../src/hooks/useInstitutions', () => ({
  // r178: one seeded institution — the page auto-selects it (single
  // institution), so the faculty/department flows below proceed
  // exactly as pre-r178.
  useInstitutions: () => ({
    data: [
      {
        id: 'inst-zawia',
        name: 'جامعة الزاوية',
        nameEn: 'University of Zawia',
        slug: 'zawia-showcase',
      },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

import RegisterPage, { registerPasswordSchema } from '../../src/pages/RegisterPage';
import { isCommonPassword } from '../../src/lib/commonPasswords';

const COMMON_PASSWORD_MESSAGE = 'كلمة المرور شائعة جدًا — اختر واحدة أقل توقّعًا';

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

const chooseStudent = () => fireEvent.click(screen.getByRole('button', { name: /طالب/ }));

function fillStudent(password: string) {
  fireEvent.change(screen.getByLabelText('الاسم الأول'), { target: { value: 'سالم' } });
  fireEvent.change(screen.getByLabelText('اللقب'), { target: { value: 'الفيتوري' } });
  fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), { target: { value: 'salem@zu.edu.ly' } });
  fireEvent.change(screen.getByLabelText('كلمة المرور (12 حرفًا على الأقل)'), { target: { value: password } });
  fireEvent.change(screen.getByLabelText('رقم القيد الجامعي'), { target: { value: '2024-CS-1234' } });
  fireEvent.change(screen.getByLabelText('الكلّيّة'), { target: { value: 'fac-1' } });
  fireEvent.change(screen.getByLabelText('القسم'), { target: { value: 'dep-1' } });
}

// ── 1+2. Schema contract (registerPasswordSchema, shared by both forms) ──
describe('RegisterPage — registerPasswordSchema blocklist mirror (r165f)', () => {
  // r170g: the floor moved to 12 — fixtures stay ≥12 chars so the
  // blocklist refine (not the length rule) still produces the message
  // under test (shorter blocklist strings now fail length first).
  // password1234/administrator are the blocklist's only ≥12-char
  // entries — the others (password123, letmein123…) are now pinned on
  // the length branch by the boundary test below.
  it.each(['password1234', 'administrator'])(
    'rejects the blocklist password «%s» with the exact Arabic message',
    (password) => {
      const result = registerPasswordSchema.safeParse(password);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0]?.message).toBe(COMMON_PASSWORD_MESSAGE);
      }
    },
  );

  it('matches the backend list case-insensitively (PaSsWoRd1234 === password1234)', () => {
    // Same predicate semantics as backend password-policy.ts.
    expect(isCommonPassword('PaSsWoRd1234')).toBe(true);
    expect(isCommonPassword('Password12345')).toBe(false); // not in the list
    expect(registerPasswordSchema.safeParse('PaSsWoRd1234').success).toBe(false);
  });

  // R320 override: the old literal here was the retired demo password —
  // the register floor is what this pins; the easy TEST account password
  // (12345678, shared/testAccounts) is deliberately NOT register-grade.
  it('accepts strong 12+ char passphrases', () => {
    expect(registerPasswordSchema.safeParse('Salam-Zawiya-2026').success).toBe(true);
    expect(registerPasswordSchema.safeParse('A-Truly-Long-Passphrase-2026').success).toBe(true);
  });

  it('keeps the length rules and their messages (refine never masks them; r170g floor=12)', () => {
    const short = registerPasswordSchema.safeParse('Ab1!xyz');
    expect(short.success).toBe(false);
    if (!short.success) {
      expect(short.error.issues[0]?.message).toBe('12 حرفًا على الأقل');
      expect(short.error.issues.some((i) => i.message === COMMON_PASSWORD_MESSAGE)).toBe(false);
    }
    // The new boundary: 11 chars (the old accepted floor) is rejected
    // on length alone — FE/BE parity (auth.dto.ts .min(12)).
    const eleven = registerPasswordSchema.safeParse('Aa1!Aa1!Aa1');
    expect(eleven.success).toBe(false);
    if (!eleven.success) {
      expect(eleven.error.issues[0]?.message).toBe('12 حرفًا على الأقل');
      expect(eleven.error.issues.some((i) => i.message === COMMON_PASSWORD_MESSAGE)).toBe(false);
    }
    expect(registerPasswordSchema.safeParse('a'.repeat(73)).success).toBe(false);
  });
});

// ── 3+4. Field-level rendering (student form) ──────────────────────────
describe('RegisterPage — blocklist password surfaces as a field error (r165f)', () => {
  beforeEach(() => {
    registerState.current = {
      mutateAsync: vi.fn(async () => ({ user: { role: 'STUDENT' } })),
      isPending: false,
      error: null,
      reset: vi.fn(),
    };
  });

  it('renders the Arabic message as a field-level error and blocks submission (no server call)', async () => {
    renderPage();
    chooseStudent();
    fillStudent('password1234');

    fireEvent.click(screen.getByRole('button', { name: 'إنشاء الحساب' }));

    // Field-level error, rendered exactly like the other password rule
    // errors (the Field scaffold's auth-field-error span)…
    const fieldError = await waitFor(() => screen.getByText(COMMON_PASSWORD_MESSAGE));
    expect(fieldError).toHaveClass('auth-field-error');
    // …the failed password input is flagged invalid…
    const pwInput = screen.getByLabelText('كلمة المرور (12 حرفًا على الأقل)');
    expect(pwInput).toHaveAttribute('aria-invalid', 'true');
    // …the submission never left the page (the old defect: FE-valid →
    // server 400 with the field-less generic banner)…
    expect(registerState.current.mutateAsync).not.toHaveBeenCalled();
    // …and no server error banner exists to show «تحقّق من البيانات المُدخلة».
    expect(screen.queryByText('تحقّق من البيانات المُدخلة')).toBeNull();
  });

  it('a strong password still submits — the mirror adds no false blocks', async () => {
    renderPage();
    chooseStudent();
    fillStudent('Salam-Zawiya-2026');

    fireEvent.click(screen.getByRole('button', { name: 'إنشاء الحساب' }));

    await waitFor(() => {
      expect(registerState.current.mutateAsync).toHaveBeenCalledTimes(1);
    });
    expect(screen.queryByText(COMMON_PASSWORD_MESSAGE)).toBeNull();
  });
});
