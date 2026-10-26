/**
 * r178 — RegisterPage institution step tests.
 *
 * The register form gained the FIRST link of the academic chain: the
 * institution select (المؤسسة التعليمية) must render BEFORE the faculty
 * select, the faculties lookup is scoped to the chosen institution's
 * slug (GET /catalog/faculties?institutionSlug=…) and held until a
 * choice exists, a single-institution deployment preselects itself,
 * and the submit payload carries the institutionId the backend now
 * requires for both public roles.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mocks = vi.hoisted(() => ({
  institutions: {
    data: [
      {
        id: 'inst-zawia-showcase',
        name: 'جامعة الزاوية',
        nameEn: 'University of Zawia',
        slug: 'zawia-showcase',
      },
      {
        id: 'inst-alandalus-demo',
        name: 'مؤسسة الأندلس التعليمية',
        nameEn: 'Al-Andalus Education Institute',
        slug: 'alandalus-demo',
      },
    ] as Array<{ id: string; name: string; nameEn?: string | null; slug: string }>,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  },
  /** Every (institutionSlug, enabled) pair the faculties hook saw. */
  facultiesCalls: [] as Array<{ slug?: string; enabled: boolean }>,
  /** The register mutation's payload capture. */
  registerCalls: [] as Array<Record<string, unknown>>,
}));

vi.mock('../../src/hooks/useInstitutions', () => ({
  useInstitutions: () => mocks.institutions,
}));

vi.mock('../../src/hooks/useResources', () => ({
  useFaculties: (institutionSlug?: string, opts?: { enabled?: boolean }) => {
    mocks.facultiesCalls.push({ slug: institutionSlug, enabled: opts?.enabled ?? true });
    return {
      data: [
        {
          id: 'fac-1',
          name: 'كلية تقنية المعلومات',
          iconEmoji: '💻',
          city: 'طرابلس',
          departments: [{ id: 'dep-1', name: 'علوم الحاسوب' }],
        },
      ],
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    };
  },
}));

vi.mock('../../src/hooks/useAuth', () => ({
  useRegister: () => ({
    mutateAsync: async (payload: Record<string, unknown>) => {
      mocks.registerCalls.push(payload);
      return { user: { role: payload.role } };
    },
    isPending: false,
    isError: false,
    reset: vi.fn(),
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

const institutionSelect = () => screen.getByLabelText('المؤسسة التعليمية') as HTMLSelectElement;
const facultySelect = () => screen.getByLabelText('الكلّيّة') as HTMLSelectElement;

beforeEach(() => {
  document.body.focus();
  mocks.facultiesCalls.length = 0;
  mocks.registerCalls.length = 0;
});

afterEach(() => {
  cleanup();
  // Restore the default two-institution listing between tests.
  mocks.institutions.data = [
    {
      id: 'inst-zawia-showcase',
      name: 'جامعة الزاوية',
      nameEn: 'University of Zawia',
      slug: 'zawia-showcase',
    },
    {
      id: 'inst-alandalus-demo',
      name: 'مؤسسة الأندلس التعليمية',
      nameEn: 'Al-Andalus Education Institute',
      slug: 'alandalus-demo',
    },
  ];
});

describe('RegisterPage — institution step (r178)', () => {
  it('renders the institution select BEFORE the faculty select, listing the active institutions', () => {
    renderPage();
    chooseStudent();

    const options = Array.from(institutionSelect().options).map((o) => o.textContent);
    expect(options).toEqual(['اختر…', 'جامعة الزاوية', 'مؤسسة الأندلس التعليمية']);

    // The institution is the FIRST link of the academic chain — its
    // control must precede the faculty select in the DOM (RTL reading
    // order follows DOM order).
    const instField = institutionSelect();
    const facField = facultySelect();
    expect(
      instField.compareDocumentPosition(facField) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it('holds the faculties lookup until an institution is chosen (no cross-institution faculties)', () => {
    renderPage();
    chooseStudent();

    // The query is disabled with no slug — the form must not offer
    // faculties belonging to an institution the visitor never picked.
    expect(mocks.facultiesCalls.at(-1)).toMatchObject({ slug: undefined, enabled: false });
    expect(facultySelect()).toBeDisabled();
  });

  it('scopes the faculties lookup to the chosen institution slug and enables the faculty select', () => {
    renderPage();
    chooseStudent();

    fireEvent.change(institutionSelect(), { target: { value: 'inst-zawia-showcase' } });

    expect(mocks.facultiesCalls.at(-1)).toMatchObject({
      slug: 'zawia-showcase',
      enabled: true,
    });
    expect(facultySelect()).not.toBeDisabled();
    const options = Array.from(facultySelect().options).map((o) => o.textContent);
    expect(options).toEqual(['اختر…', 'كلية تقنية المعلومات']);
  });

  it('preselects the single institution of a single-institution deployment', () => {
    mocks.institutions.data = [
      {
        id: 'inst-alandalus-demo',
        name: 'مؤسسة الأندلس التعليمية',
        nameEn: 'Al-Andalus Education Institute',
        slug: 'alandalus-demo',
      },
    ];
    renderPage();
    chooseStudent();

    expect(institutionSelect().value).toBe('inst-alandalus-demo');
    // The faculties lookup fires scoped to the auto-selected institution.
    expect(mocks.facultiesCalls.at(-1)).toMatchObject({
      slug: 'alandalus-demo',
      enabled: true,
    });
    expect(facultySelect()).not.toBeDisabled();
  });

  it('submits institutionId with the register payload (the backend requires it)', async () => {
    renderPage();
    chooseStudent();

    fireEvent.change(screen.getByLabelText('الاسم الأول'), { target: { value: 'سالم' } });
    fireEvent.change(screen.getByLabelText('اللقب'), { target: { value: 'الفيتوري' } });
    fireEvent.change(screen.getByLabelText('البريد الإلكتروني'), {
      target: { value: 'salem@zu.edu.ly' },
    });
    fireEvent.change(screen.getByLabelText('كلمة المرور (12 حرفًا على الأقل)'), {
      target: { value: 'Salam-Zawiya-2026' },
    });
    fireEvent.change(screen.getByLabelText('رقم القيد الجامعي'), {
      target: { value: '2024-CS-1234' },
    });
    fireEvent.change(institutionSelect(), { target: { value: 'inst-zawia-showcase' } });
    fireEvent.change(facultySelect(), { target: { value: 'fac-1' } });
    fireEvent.change(screen.getByLabelText('القسم'), { target: { value: 'dep-1' } });

    fireEvent.click(screen.getByRole('button', { name: 'إنشاء الحساب' }));

    await vi.waitFor(() => {
      expect(mocks.registerCalls).toHaveLength(1);
    });
    expect(mocks.registerCalls[0]).toMatchObject({
      role: 'STUDENT',
      institutionId: 'inst-zawia-showcase',
      facultyId: 'fac-1',
      departmentId: 'dep-1',
    });
  });
});
