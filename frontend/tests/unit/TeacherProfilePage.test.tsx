/**
 * r157 (W2-F9 / 6A9) — TeacherProfilePage pins.
 *
 * 1-3. the three profile cards' subtitles ride countAr grammar — the old
 *      `${n} شهادة` / `${n} منشور` / `${n} جائزة` templates broke at 0
 *      («0 شهادة») and at 2; the zero cases now name the reality
 *      («لم تُضف شهادة» / «لم تُضف منشورات» / «لم تُضف جائزة»).
 * 4-5. cancelEdit routes through the shared useDiscardGuard (the same
 *      confirm the curriculum builders and both grading modals use):
 *      a dirty cancel confirms first, «متابعة التحرير» keeps the draft,
 *      «التخلّي عن التعديلات» actually discards it. The hook is defined
 *      BEFORE the pending/error early returns (hook-order stability —
 *      pinned by the fact that the page renders at all after the guard
 *      wiring, with a resolved profile).
 *
 * Hooks are mocked at the useResources boundary (the TeacherPages
 * pattern); useDiscardGuard itself is the REAL shared hook.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import TeacherProfilePage from '../../src/pages/teacher/TeacherProfilePage';
import { useAuthStore } from '../../src/stores/auth.store';

const mocks = vi.hoisted(() => ({
  profile: {
    data: null as unknown,
    isPending: false,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  update: { mutateAsync: vi.fn(), isPending: false, isError: false, error: null as unknown },
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    useMyTeacherProfile: () => mocks.profile,
    useUpdateTeacherProfile: () => mocks.update,
  };
});

function teacherProfile(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    userId: 't1',
    name: 'سالم الطاهر',
    firstName: 'سالم',
    lastName: 'الطاهر',
    email: 'salim@zu.edu.ly',
    avatarColor: null,
    avatarInitials: 'سط',
    specialty: 'هندسة البرمجيات',
    rank: 'PROFESSOR',
    bio: 'أستاذ هندسة برمجيات مهتم بالتحقق الشكلي.',
    degreeLevel: 'PHD',
    yearsExperience: 14,
    certifications: [
      { title: 'شهادة AWS Solutions Architect', issuer: 'Amazon', year: 2024 },
      { title: 'شهادة PMP', issuer: 'PMI', year: 2022 },
      { title: 'مدقق نظم جودة', issuer: 'ISO', year: 2021 },
    ],
    publications: [],
    awards: [],
    profileImageUrl: null,
    officeLocation: 'مبنى الكلية — مكتب 305',
    officeHours: 'الأحد والثلاثاء 10-12',
    websiteUrl: null,
    subjectKeywords: ['التحقق الشكلي'],
    verifiedAt: '2025-01-15T09:00:00.000Z',
    department: 'علوم الحاسوب',
    faculty: 'كلية الهندسة وتقنية المعلومات',
    courses: [],
    workload: { courseCount: 2, totalCredits: 6, totalEnrolled: 40 },
    ...over,
  };
}

function renderPage() {
  return render(
    <MemoryRouter>
      <TeacherProfilePage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  mocks.profile = { data: null, isPending: false, isError: false, error: null, refetch: vi.fn() };
  mocks.update = { mutateAsync: vi.fn(), isPending: false, isError: false, error: null };
});

afterEach(() => {
  cleanup();
  act(() => { useAuthStore.setState({ user: null }); });
});

describe('TeacherProfilePage — countAr card subtitles (r157 / 6A9)', () => {
  it('3 certifications → the plural form «3 شهادات» (the old template said «3 شهادة»)', () => {
    mocks.profile.data = teacherProfile();
    renderPage();

    expect(screen.getByText('3 شهادات')).toBeInTheDocument();
  });

  it('zero publications → the honest zero subtitle «لم تُضف منشورات»', () => {
    mocks.profile.data = teacherProfile();
    renderPage();

    expect(screen.getByText('لم تُضف منشورات')).toBeInTheDocument();
    expect(screen.queryByText('0 منشور')).toBeNull();
  });

  it('zero awards → the honest zero subtitle «لم تُضف جائزة»', () => {
    mocks.profile.data = teacherProfile();
    renderPage();

    expect(screen.getByText('لم تُضف جائزة')).toBeInTheDocument();
    expect(screen.queryByText('0 جائزة')).toBeNull();
  });
});

describe('TeacherProfilePage — cancelEdit discard guard (r157 / 6A9)', () => {
  it('a dirty cancel routes through the «تعديلات غير محفوظة» confirm; «متابعة التحرير» keeps the draft', () => {
    mocks.profile.data = teacherProfile();
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'تعديل البيانات الشخصية' }));
    const bio = screen.getByLabelText('نبذة') as HTMLTextAreaElement;
    fireEvent.change(bio, { target: { value: 'مسودة تعديل جديدة لم تُحفظ بعد.' } });

    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    // The shared confirm appears — the draft is no longer silently dropped.
    expect(screen.getByRole('dialog', { name: 'تعديلات غير محفوظة' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'متابعة التحرير' }));
    expect(screen.queryByRole('dialog', { name: 'تعديلات غير محفوظة' })).toBeNull();
    // Edit mode is still open with the draft intact.
    expect(screen.getByLabelText('نبذة')).toHaveValue('مسودة تعديل جديدة لم تُحفظ بعد.');
  });

  it('«التخلّي عن التعديلات» actually discards — edit mode closes, the saved profile value returns', async () => {
    mocks.profile.data = teacherProfile();
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'تعديل البيانات الشخصية' }));
    fireEvent.change(screen.getByLabelText('نبذة'), { target: { value: 'مسودة ستُتخلّى.' } });

    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    fireEvent.click(screen.getByRole('button', { name: 'التخلّي عن التعديلات' }));

    // Edit mode is gone: the header button is back and the ORIGINAL bio
    // (not the draft) renders.
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'تعديل البيانات الشخصية' })).toBeInTheDocument();
    });
    expect(screen.getByText('أستاذ هندسة برمجيات مهتم بالتحقق الشكلي.')).toBeInTheDocument();
    expect(screen.queryByLabelText('نبذة')).toBeNull();
  });
});
