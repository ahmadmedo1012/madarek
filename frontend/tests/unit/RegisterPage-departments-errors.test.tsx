/**
 * r157 F5 — RegisterPage department honesty + server-error contract.
 *
 * The live catalog ships faculties with ZERO departments (21 of 25 at
 * audit time). The old form rendered a dead select that promised a
 * choice which did not exist, kept a stale departmentId across faculty
 * changes, and answered every failed submit with one generic banner —
 * including a 409 whose honest answer is «سجِّل الدخول».
 *
 * Pins (8):
 *   1. empty state      — zero-department faculty renders the honest
 *                         NO_DEPARTMENTS box, not a dead select;
 *   2. honest block     — that state cannot submit (no mutation call,
 *                         no misleading «اختر القسم», the summary counts
 *                         the blocked field);
 *   3. working select   — a faculty WITH departments keeps the select
 *                         (and the year select now mirrors the backend
 *                         max(8) contract, auth.dto.ts:42);
 *   4. reset            — departmentId returns to «اختر…» when the
 *                         faculty changes;
 *   5. persistence      — faculty switching never wipes typed identity;
 *   6. 409 link         — CONFLICT shows the backend's Arabic message
 *                         verbatim + <Link to="/auth">سجِّل الدخول</Link>;
 *   7. 400 verbatim     — other server answers show verbatim, no link;
 *   8. network generic  — no response → the authored generic, no link.
 *
 * The error states are injected exactly the way the backend delivers
 * them (AxiosError-shaped `{ error: { code, message } }`) — same
 * convention as AuthPage-rate-limit.test.tsx.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import type { AxiosError } from 'axios';

type RegisterState = {
  mutateAsync: () => Promise<never>;
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
        departments: [
          { id: 'dep-1', name: 'علوم الحاسوب' },
          { id: 'dep-2', name: 'نظم المعلومات' },
        ],
      },
      {
        // The honest-empty case: a real faculty with zero departments
        // (mirrors the live كلية الآداب situation the audit found).
        id: 'fac-2',
        name: 'كلية الآداب',
        iconEmoji: '📚',
        city: 'الزاوية',
        departments: [],
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

import RegisterPage from '../../src/pages/RegisterPage';

function axError(status: number, code?: string, message?: string): AxiosError<{ error?: { code?: string; message?: string } }> {
  return {
    name: 'AxiosError',
    message: 'Request failed',
    isAxiosError: true,
    config: {},
    response: { status, data: { error: { code, message } } },
  } as unknown as AxiosError<{ error?: { code?: string; message?: string } }>;
}

const NO_DEPARTMENTS_TEXT =
  // R320 override: «تواصل مع إدارة الجامعة» → «تواصل مع المسجل العام» (§B rename).
  'لا توجد أقسام مسجّلة في هذه الكلّيّة بعد — اختر كلّيّة أخرى أو تواصل مع المسجل العام.';

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

const chooseStudent = () => fireEvent.click(screen.getByRole('button', { name: /طالب/ }));

function fillValidStudent(facultyId: string) {
  fireEvent.change(screen.getByLabelText('الاسم الأول'), { target: { value: 'سالم' } });
  fireEvent.change(screen.getByLabelText('اللقب'), { target: { value: 'الفيتوري' } });
  fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), { target: { value: 'salem@zu.edu.ly' } });
  fireEvent.change(screen.getByLabelText('كلمة المرور (12 حرفًا على الأقل)'), { target: { value: 'Salam-Zawiya-2026' } });
  fireEvent.change(screen.getByLabelText('رقم القيد الجامعي'), { target: { value: '2024-CS-1234' } });
  fireEvent.change(screen.getByLabelText('الكلّيّة'), { target: { value: facultyId } });
}

describe('RegisterPage — department honesty (r157 F5)', () => {
  beforeEach(() => {
    registerState.current = {
      mutateAsync: vi.fn(async () => ({ user: { role: 'STUDENT' } })) as unknown as RegisterState['mutateAsync'],
      isPending: false,
      error: null,
      reset: vi.fn(),
    };
  });

  it('a zero-department faculty renders the honest empty state, not a dead select', () => {
    renderPage();
    chooseStudent();
    fireEvent.change(screen.getByLabelText('الكلّيّة'), { target: { value: 'fac-2' } });

    // The dashed honest box replaces the select…
    const empty = screen.getByText(NO_DEPARTMENTS_TEXT);
    expect(empty).toHaveClass('auth-dept-empty');
    // …so there is no control labeled «القسم» left to promise options.
    expect(screen.queryByLabelText('القسم')).toBeNull();
  });

  it('the zero-department state blocks submission honestly (no mutation, no «اختر القسم»)', async () => {
    renderPage();
    chooseStudent();
    fillValidStudent('fac-2');

    fireEvent.click(screen.getByRole('button', { name: 'إنشاء الحساب' }));

    // The ONE polite summary counts the blocked field… (r170-e: the
    // password strength hint is a second role="status" region — target
    // the summary by its text, not by the role alone.)
    await waitFor(() => {
      expect(screen.getByText(/مشكلة/)).toHaveAttribute('role', 'status');
    });
    // …the submission never left the page…
    expect(registerState.current.mutateAsync).not.toHaveBeenCalled();
    // …and the misleading «اختر القسم» (a control that doesn't exist in
    // this state) is never demanded — the empty box IS the explanation.
    expect(screen.queryByText('اختر القسم')).toBeNull();
    expect(screen.getByText(NO_DEPARTMENTS_TEXT)).toBeInTheDocument();
  });

  it('a faculty WITH departments keeps the working select; the year select mirrors the backend max(8)', () => {
    renderPage();
    chooseStudent();
    fireEvent.change(screen.getByLabelText('الكلّيّة'), { target: { value: 'fac-1' } });

    const dept = screen.getByLabelText('القسم') as HTMLSelectElement;
    expect(Array.from(dept.options).map((o) => o.textContent))
      .toEqual(['اختر…', 'علوم الحاسوب', 'نظم المعلومات']);

    // auth.dto.ts:42 — year max(8); the FE options must not stop at 7
    // while the backend would accept an 8th-year student.
    const year = screen.getByLabelText('السنة الدراسية') as HTMLSelectElement;
    expect(Array.from(year.options)).toHaveLength(8);
    expect(year.options[7]!.value).toBe('8');
  });

  it('departmentId resets to «اختر…» when the faculty changes', () => {
    renderPage();
    chooseStudent();
    fillValidStudent('fac-1');
    fireEvent.change(screen.getByLabelText('القسم'), { target: { value: 'dep-1' } });
    expect((screen.getByLabelText('القسم') as HTMLSelectElement).value).toBe('dep-1');

    // Switch to the empty faculty (select is replaced by the honest box)…
    fireEvent.change(screen.getByLabelText('الكلّيّة'), { target: { value: 'fac-2' } });
    expect(screen.queryByLabelText('القسم')).toBeNull();

    // …and back: the stale dep-1 must NOT survive — the select is at
    // «اختر…» again (the old code silently kept a cross-faculty id).
    fireEvent.change(screen.getByLabelText('الكلّيّة'), { target: { value: 'fac-1' } });
    expect((screen.getByLabelText('القسم') as HTMLSelectElement).value).toBe('');
    expect(Array.from((screen.getByLabelText('القسم') as HTMLSelectElement).selectedOptions)[0]!.textContent)
      .toBe('اختر…');
  });

  it('faculty switching never wipes the typed identity (persistence across the reset)', () => {
    renderPage();
    chooseStudent();
    fillValidStudent('fac-1');
    fireEvent.change(screen.getByLabelText('القسم'), { target: { value: 'dep-1' } });

    fireEvent.change(screen.getByLabelText('الكلّيّة'), { target: { value: 'fac-2' } });
    fireEvent.change(screen.getByLabelText('الكلّيّة'), { target: { value: 'fac-1' } });

    expect((screen.getByLabelText('الاسم الأول') as HTMLInputElement).value).toBe('سالم');
    expect((screen.getByLabelText('اللقب') as HTMLInputElement).value).toBe('الفيتوري');
    expect((screen.getByLabelText('البريد الإلكتروني') as HTMLInputElement).value).toBe('salem@zu.edu.ly');
    expect((screen.getByLabelText('رقم القيد الجامعي') as HTMLInputElement).value).toBe('2024-CS-1234');
    expect((screen.getByLabelText('الكلّيّة') as HTMLSelectElement).value).toBe('fac-1');
  });
});

describe('RegisterPage — server-error contract (r157 F5 / D17-3)', () => {
  beforeEach(() => {
    registerState.current = {
      mutateAsync: vi.fn() as unknown as RegisterState['mutateAsync'],
      isPending: false,
      error: null,
      reset: vi.fn(),
    };
  });

  it('a 409 CONFLICT shows the backend message verbatim + «سجِّل الدخول» link to /auth', () => {
    registerState.current.error = axError(409, 'CONFLICT', 'البريد الإلكتروني مسجّل مسبقاً');
    renderPage();
    chooseStudent();

    // The backend's own Arabic words, not a generic refusal…
    expect(screen.getByRole('alert')).toHaveTextContent('البريد الإلكتروني مسجّل مسبقاً');
    expect(screen.getByRole('alert')).not.toHaveTextContent('تعذَّر إنشاء الحساب');
    // …and the conflict drives the login link.
    const login = screen.getByRole('link', { name: 'سجِّل الدخول' });
    expect(login).toHaveClass('auth-error-link');
    expect(login).toHaveAttribute('href', '/auth');
  });

  it('a 400 with an Arabic message shows verbatim — and no login link (not a conflict)', () => {
    registerState.current.error = axError(400, 'VALIDATION_ERROR', 'طلب غير صالح — تحقّق من البيانات المُرسلة');
    renderPage();
    chooseStudent();

    expect(screen.getByRole('alert')).toHaveTextContent('طلب غير صالح — تحقّق من البيانات المُرسلة');
    expect(screen.queryByRole('link', { name: 'سجِّل الدخول' })).toBeNull();
  });

  it('a network failure (no response) falls back to the authored generic — no link, no verbatim', () => {
    registerState.current.error = {
      name: 'AxiosError',
      message: 'Network Error',
      isAxiosError: true,
      config: {},
    } as unknown as AxiosError;
    renderPage();
    chooseStudent();

    const banner = screen.getByRole('alert');
    expect(banner).toHaveTextContent('تعذَّر إنشاء الحساب');
    expect(banner).toHaveTextContent('اتصالك بالشبكة');
    // The raw Latin transport prose never renders in the RTL UI.
    expect(banner).not.toHaveTextContent('Network Error');
    expect(screen.queryByRole('link', { name: 'سجِّل الدخول' })).toBeNull();
  });
});
