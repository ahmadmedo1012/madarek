/**
 * Unit tests — RegisterPage step flow (audits 4-A13 P2-2 + P2-3).
 *
 * The step panel is keyed (the slide animation needs the remount),
 * which used to have two casualties at the exact moment the screen
 * changed:
 *   - P2-3: every form lived INSIDE the remounted subtree, so
 *     picking the wrong role (or stepping away and back) destroyed
 *     everything typed — a student retyped the whole form;
 *   - P2-2: the clicked role-card button unmounted with the panel
 *     and focus fell to <body>, leaving keyboard/SR users stranded.
 *
 * The forms are now hoisted to page level and focus moves to the
 * incoming step's heading (tabIndex={-1}). These tests pin both.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../../src/hooks/useAuth', () => ({
  useRegister: () => ({
    mutateAsync: vi.fn(async () => ({ user: { role: 'STUDENT' } })),
    isPending: false,
    isError: false,
  }),
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
        id: 'fac-2',
        name: 'كلية الآداب',
        iconEmoji: '📚',
        city: 'الزاوية',
        departments: [{ id: 'dep-3', name: 'قسم اللغة العربية' }],
      },
    ],
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  }),
}));

import RegisterPage from '../../src/pages/RegisterPage';

function renderPage() {
  return render(
    <MemoryRouter>
      <RegisterPage />
    </MemoryRouter>,
  );
}

const chooseStudent = () => fireEvent.click(screen.getByRole('button', { name: /طالب/ }));
const backToRoles = () =>
  fireEvent.click(screen.getByRole('button', { name: 'تغيير نوع الحساب' }));

describe('RegisterPage — step persistence (audit 4-A13 P2-3)', () => {
  beforeEach(() => {
    document.body.focus();
  });

  it('keeps typed student data across back → forward (the old flow wiped it)', () => {
    renderPage();
    chooseStudent();

    // Fill a representative slice: free text, LTR email, and selects.
    fireEvent.change(screen.getByLabelText('الاسم الأول'), { target: { value: 'سالم' } });
    fireEvent.change(screen.getByLabelText('اللقب'), { target: { value: 'الفيتوري' } });
    fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), {
      target: { value: 'salem@zu.edu.ly' },
    });
    fireEvent.change(screen.getByLabelText('رقم القيد الجامعي'), {
      target: { value: '2024-CS-1234' },
    });
    fireEvent.change(screen.getByLabelText('الكلّيّة'), { target: { value: 'fac-1' } });
    fireEvent.change(screen.getByLabelText('القسم'), { target: { value: 'dep-1' } });

    // Step back to the role picker — the panel remounts (keyed slide)…
    backToRoles();
    expect(screen.getByRole('heading', { level: 1, name: 'من أنت؟' })).toBeInTheDocument();

    // …and forward again — everything typed must survive.
    chooseStudent();
    expect((screen.getByLabelText('الاسم الأول') as HTMLInputElement).value).toBe('سالم');
    expect((screen.getByLabelText('اللقب') as HTMLInputElement).value).toBe('الفيتوري');
    expect((screen.getByLabelText('البريد الإلكتروني') as HTMLInputElement).value).toBe(
      'salem@zu.edu.ly',
    );
    expect((screen.getByLabelText('رقم القيد الجامعي') as HTMLInputElement).value).toBe(
      '2024-CS-1234',
    );
    expect((screen.getByLabelText('الكلّيّة') as HTMLSelectElement).value).toBe('fac-1');
    expect((screen.getByLabelText('القسم') as HTMLSelectElement).value).toBe('dep-1');
  });

  it('keeps the two roles\' forms independent (teacher data survives its own round-trip)', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /عضو هيئة تدريس/ }));
    fireEvent.change(screen.getByLabelText('الاسم الأول'), { target: { value: 'أمل' } });
    fireEvent.change(screen.getByLabelText('التخصص العلمي'), {
      target: { value: 'قواعد بيانات' },
    });

    backToRoles();
    fireEvent.click(screen.getByRole('button', { name: /عضو هيئة تدريس/ }));
    expect((screen.getByLabelText('الاسم الأول') as HTMLInputElement).value).toBe('أمل');
    expect((screen.getByLabelText('التخصص العلمي') as HTMLInputElement).value).toBe('قواعد بيانات');
  });
});

describe('RegisterPage — focus continuity (audit 4-A13 P2-2)', () => {
  beforeEach(() => {
    document.body.focus();
  });

  it('moves focus to the step-2 heading when a role is chosen (was: <body>)', () => {
    renderPage();
    expect(document.activeElement).toBe(document.body);

    chooseStudent();
    const heading = screen.getByRole('heading', { level: 1, name: 'تسجيل طالب جديد' });
    expect(document.activeElement).toBe(heading);
    // The heading is programmatically focusable but absent from tab order.
    expect(heading).toHaveAttribute('tabindex', '-1');
  });

  it('moves focus back to the step-1 heading when returning to the role picker', () => {
    renderPage();
    chooseStudent();
    backToRoles();

    const heading = screen.getByRole('heading', { level: 1, name: 'من أنت؟' });
    expect(document.activeElement).toBe(heading);
  });

  it('does not steal focus on the initial page load (fresh visit keeps browser default)', () => {
    renderPage();
    expect(document.activeElement).toBe(document.body);
    expect(
      screen.getByRole('heading', { level: 1, name: 'من أنت؟' }),
    ).not.toBe(document.activeElement);
  });
});

describe('RegisterPage — faculties lookup now reachable anonymously (audit 4-A13 P0-1, FE side)', () => {
  it('renders the faculty select with options from the (public) lookup', () => {
    renderPage();
    chooseStudent();

    const select = screen.getByLabelText('الكلّيّة') as HTMLSelectElement;
    const options = Array.from(select.options).map((o) => o.textContent);
    expect(options).toEqual(['اختر…', 'كلية تقنية المعلومات', 'كلية الآداب']);
  });
});
