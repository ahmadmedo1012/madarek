/**
 * r170b — the author dead-end closure on the template detail surface
 * (frontend/src/pages/teacher/ExamAuthorPages.tsx):
 *
 *  1. PENDING_REVIEW detail (r169-C1's exact finding): the author now
 *     sees تعديل (opens the safe-fields modal → PATCH
 *     /exams/templates/:id with the merged body), استنساخ, and a
 *     VISIBLE gated publish whose reason names the state honestly
 *     («بانتظار مراجعة الجودة…») instead of the button vanishing.
 *  2. The clone button deep-posts to /exams/templates/:id/clone and
 *     navigates to the new draft's detail route.
 *  3. A PUBLISHED template offers clone (the iterate path) but NOT
 *     تعديل — the backend locks published rows (409) and a dead edit
 *     control is worse than none.
 *  4. The edit modal validates client-side before the wire (same
 *     bounds the builder pins) and an APPROVED/REJECTED source warns
 *     that saving resets the moderation verdict.
 *
 * The pure mirrors (canEditTemplate / canCloneTemplate /
 * publishGateReason / validateEditTemplateDraft / buildUpdateTemplateInput /
 * isoToLocalInputValue) are pinned directly — the ExamAuthorPages suite
 * convention (every exported helper has a unit home).
 *
 * useResources is stubbed wholesale (the page's hooks); the r170b
 * mutations ride the page module over lib/api, so THAT is the spy.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act } from 'react';
import { ExamTemplateDetailPage } from '../../src/pages/teacher/ExamAuthorPages';
import {
  canEditTemplate, canCloneTemplate, publishGateReason,
  validateEditTemplateDraft, buildUpdateTemplateInput, isoToLocalInputValue,
} from '../../src/pages/teacher/ExamAuthorPages';
import { useAuthStore } from '../../src/stores/auth.store';
import type { AuthUser } from '../../src/stores/auth.store';
import type { ExamTemplateDetail } from '../../src/hooks/useResources';

const mocks = vi.hoisted(() => ({
  apiPatch: vi.fn(),
  apiPost: vi.fn(),
  template: null as ExamTemplateDetail | null,
  perms: { data: { capabilities: ['EXAMS_AUTHOR'] }, isPending: false, isError: false, error: null, refetch: vi.fn() },
}));

vi.mock('../../src/hooks/useResources', () => ({
  useMyPermissions: () => mocks.perms,
  useExamTemplate: () => ({
    data: mocks.template,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useExamTemplates: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useQuestionBank: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useQuestionCategories: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useExamModerationQueue: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useTeacherOfferings: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useFaculties: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useExamAttempts: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  usePublishExamTemplate: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }),
  useCloneExamTemplate: undefined, // never imported from the barrel (page-local)
  useModerateExam: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }),
  useCreateQuestion: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }),
  useCreateExamTemplate: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }),
  useModerateQuestion: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }),
  useGradeExamAttempt: () => ({ mutateAsync: vi.fn(), isPending: false, isError: false, error: null }),
  apiErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

vi.mock('../../src/lib/api', () => ({
  // The r170b mutations call api.patch / api.post directly — these are
  // the spies the wire assertions read.
  api: {
    patch: (...args: unknown[]) => mocks.apiPatch(...(args as [string, unknown])),
    post: (...args: unknown[]) => mocks.apiPost(...(args as [string, unknown])),
    get: vi.fn(),
  },
  unwrap: <T,>(p: Promise<{ data: { data: T } }>): Promise<T> => p.then((r) => r.data.data),
}));

vi.mock('../../src/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() },
}));

const TEACHER: AuthUser = {
  id: 'teacher-r170b',
  email: 'teacher@zu.edu.ly',
  firstName: 'سالم',
  lastName: 'الطاهر',
  role: 'TEACHER',
};

/** A PENDING_REVIEW faculty template authored by the teacher — the
 *  r169-C1 sweep's exact scenario (cmv9q69p4 shape). */
const pendingDetail = (): ExamTemplateDetail => ({
  id: 'tpl-pending-1',
  title: 'اختبار موحد — أساسيات هندسة البرمجيات',
  description: 'وصف تجريبي',
  kind: 'MIDTERM',
  status: 'PENDING_REVIEW',
  durationMin: 60,
  passingScore: 60,
  randomized: true,
  moderationNote: null,
  openAt: null,
  closeAt: null,
  offeringId: null,
  facultyId: 'faculty-1',
  authorId: TEACHER.id,
  createdAt: '2026-10-10T08:00:00.000Z',
  offering: null,
  faculty: { name: 'تقنية المعلومات' },
  author: { firstName: 'سالم', lastName: 'الطاهر' },
  moderatedBy: null,
  questions: [
    {
      id: 'eq-1',
      order: 1,
      pointsOverride: null,
      question: {
        id: 'question-1',
        type: 'MCQ',
        prompt: 'ما هو البروتوكول المسؤول عن نقل الحزم؟',
        choices: ['TCP', 'UDP', 'ICMP', 'ARP'],
        correctAnswer: 0,
        difficulty: 'MEDIUM',
        points: 2,
        isApproved: true,
        moderationNote: null,
        tags: [],
        category: { title: 'الشبكات' },
      },
    },
  ],
  _count: { attempts: 0 },
});

const publishedDetail = (): ExamTemplateDetail => ({
  ...pendingDetail(),
  id: 'tpl-published-1',
  title: 'اختبار قصير — قواعد البيانات',
  status: 'PUBLISHED',
  moderationNote: 'تمت الموافقة — أسئلة متوازنة',
});

/** Records the router location so clone-navigation is assertable. */
let currentPath = '';
function LocationProbe() {
  const location = useLocation();
  currentPath = location.pathname;
  return null;
}

function renderDetail(templateId: string) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[`/teacher/exams/${templateId}`]}>
        <Routes>
          {/* The probe rides the SAME route pattern so a navigation to
              the clone's id re-renders it (a catch-all would never match
              a second template id). */}
          <Route
            path="/teacher/exams/:templateId"
            element={<><LocationProbe /><ExamTemplateDetailPage /></>}
          />
          <Route path="*" element={<LocationProbe />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  act(() => { useAuthStore.setState({ user: TEACHER }); });
  mocks.template = pendingDetail();
  mocks.perms = { data: { capabilities: ['EXAMS_AUTHOR'] }, isPending: false, isError: false, error: null, refetch: vi.fn() };
  currentPath = '';
});

// ── Pure mirrors ─────────────────────────────────────────────────────

describe('canEditTemplate (client mirror of the edit gate)', () => {
  const viewer = { id: TEACHER.id, role: 'TEACHER' as const };
  it('the author edits every non-locked state', () => {
    for (const status of ['DRAFT', 'PENDING_REVIEW', 'APPROVED', 'REJECTED'] as const) {
      expect(canEditTemplate({ authorId: TEACHER.id, status }, viewer)).toBe(true);
    }
  });
  it('PUBLISHED/CLOSED are locked even for the author', () => {
    expect(canEditTemplate({ authorId: TEACHER.id, status: 'PUBLISHED' }, viewer)).toBe(false);
    expect(canEditTemplate({ authorId: TEACHER.id, status: 'CLOSED' }, viewer)).toBe(false);
  });
  it('a non-author teacher never edits; ADMIN/OWNER oversight does', () => {
    expect(canEditTemplate({ authorId: 'other', status: 'PENDING_REVIEW' }, viewer)).toBe(false);
    expect(canEditTemplate({ authorId: 'other', status: 'PENDING_REVIEW' }, { id: 'a1', role: 'ADMIN' })).toBe(true);
    expect(canEditTemplate({ authorId: 'other', status: 'PENDING_REVIEW' }, { id: 'o1', role: 'OWNER' })).toBe(true);
  });
});

describe('canCloneTemplate (client mirror of the clone reach)', () => {
  it('author / ADMIN / OWNER clone; QUALITY only with EXAMS_MODERATE; non-authors never', () => {
    expect(canCloneTemplate({ authorId: TEACHER.id }, { id: TEACHER.id, role: 'TEACHER' }, false)).toBe(true);
    expect(canCloneTemplate({ authorId: 'other' }, { id: 'a1', role: 'ADMIN' }, false)).toBe(true);
    expect(canCloneTemplate({ authorId: 'other' }, { id: 'o1', role: 'OWNER' }, false)).toBe(true);
    expect(canCloneTemplate({ authorId: 'other' }, { id: 'q1', role: 'QUALITY' }, true)).toBe(true);
    expect(canCloneTemplate({ authorId: 'other' }, { id: 'q1', role: 'QUALITY' }, false)).toBe(false);
    expect(canCloneTemplate({ authorId: 'other' }, { id: 't2', role: 'TEACHER' }, true)).toBe(false);
  });
});

describe('publishGateReason (per-status honesty)', () => {
  it('APPROVED → null (the button is live)', () => {
    expect(publishGateReason({ status: 'APPROVED', moderationNote: null })).toBeNull();
  });
  it('PENDING_REVIEW names the quality gate', () => {
    expect(publishGateReason({ status: 'PENDING_REVIEW' })).toContain('بانتظار مراجعة الجودة');
  });
  it('REJECTED names the rejection (with and without a note)', () => {
    expect(publishGateReason({ status: 'REJECTED', moderationNote: 'ضع مستوى الأسئلة' })).toContain('رفضته الجودة');
    expect(publishGateReason({ status: 'REJECTED', moderationNote: null })).toContain('رفضته الجودة');
  });
  it('PUBLISHED / CLOSED / DRAFT each get their own fact', () => {
    expect(publishGateReason({ status: 'PUBLISHED' })).toContain('منشور بالفعل');
    expect(publishGateReason({ status: 'CLOSED' })).toContain('مُغلق');
    expect(publishGateReason({ status: 'DRAFT' })).toContain('مسودة');
  });
});

describe('isoToLocalInputValue (ISO → datetime-local seed)', () => {
  it('renders the stored instant in local time; null/invalid → empty', () => {
    expect(isoToLocalInputValue(null)).toBe('');
    expect(isoToLocalInputValue('not-a-date')).toBe('');
    // TZ=UTC in the vitest env → local == UTC.
    expect(isoToLocalInputValue('2026-11-01T09:05:00.000Z')).toBe('2026-11-01T09:05');
  });
});

describe('validateEditTemplateDraft + buildUpdateTemplateInput', () => {
  const valid = {
    title: 'عنوان سليم',
    description: 'وصف',
    durationMin: '45',
    passingScore: '50',
    randomized: true,
    openAt: '',
    closeAt: '',
  };
  it('a valid draft passes and builds a full wire body with cleared window', () => {
    expect(validateEditTemplateDraft(valid)).toEqual({});
    expect(buildUpdateTemplateInput(valid)).toEqual({
      title: 'عنوان سليم',
      description: 'وصف',
      durationMin: 45,
      passingScore: 50,
      randomized: true,
      openAt: null,
      closeAt: null,
    });
  });
  it('short titles / out-of-bounds numbers / inverted windows each fail with their own message', () => {
    expect(validateEditTemplateDraft({ ...valid, title: 'قص' }).title).toBeTruthy();
    expect(validateEditTemplateDraft({ ...valid, durationMin: '4' }).durationMin).toBeTruthy();
    expect(validateEditTemplateDraft({ ...valid, passingScore: '101' }).passingScore).toBeTruthy();
    expect(validateEditTemplateDraft({ ...valid, openAt: '2026-11-02T10:00', closeAt: '2026-11-02T09:00' }).window).toBeTruthy();
  });
  it('a picked window ships as ISO', () => {
    const input = buildUpdateTemplateInput({ ...valid, openAt: '2026-11-01T09:00', closeAt: '2026-11-01T11:00' });
    expect(input.openAt).toBe('2026-11-01T09:00:00.000Z');
    expect(input.closeAt).toBe('2026-11-01T11:00:00.000Z');
  });
});

// ── The detail surface ───────────────────────────────────────────────

describe('ExamTemplateDetailPage — r170b author actions', () => {
  it('PENDING_REVIEW (r169-C1): edit + clone render and the gated publish explains itself', async () => {
    renderDetail('tpl-pending-1');

    expect(await screen.findByRole('heading', { level: 1, name: /اختبار موحد/ })).toBeTruthy();
    const edit = screen.getByRole('button', { name: /تعديل/ });
    expect(edit).toBeTruthy();
    expect(screen.getByRole('button', { name: /استنساخ/ })).toBeTruthy();

    // The publish button is VISIBLE and disabled, with the honest reason.
    const publish = screen.getByRole('button', { name: /^نشر$/ });
    expect(publish).toBeDisabled();
    expect(screen.getByText(/بانتظار مراجعة الجودة/)).toBeTruthy();
  });

  it('the edit modal PATCHes the merged body on save', async () => {
    renderDetail('tpl-pending-1');
    fireEvent.click(await screen.findByRole('button', { name: /تعديل/ }));

    const title = await screen.findByLabelText('عنوان القالب');
    fireEvent.change(title, { target: { value: 'اختبار موحد — النسخة الثانية' } });
    fireEvent.change(screen.getByLabelText(/المدة \(بالدقائق\)/), { target: { value: '90' } });

    mocks.apiPatch.mockResolvedValue({ data: { data: { id: 'tpl-pending-1', status: 'PENDING_REVIEW' } } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التعديل' }));

    await waitFor(() => {
      expect(mocks.apiPatch).toHaveBeenCalledWith('/exams/templates/tpl-pending-1', {
        title: 'اختبار موحد — النسخة الثانية',
        description: 'وصف تجريبي',
        durationMin: 90,
        passingScore: 60,
        randomized: true,
        openAt: null,
        closeAt: null,
      });
    });
  });

  it('the edit modal blocks an invalid save client-side (no wire call)', async () => {
    renderDetail('tpl-pending-1');
    fireEvent.click(await screen.findByRole('button', { name: /تعديل/ }));

    fireEvent.change(await screen.findByLabelText('عنوان القالب'), { target: { value: 'قص' } });
    fireEvent.click(screen.getByRole('button', { name: 'حفظ التعديل' }));

    expect(await screen.findByText('العنوان قصير — 3 أحرف على الأقل.')).toBeTruthy();
    expect(mocks.apiPatch).not.toHaveBeenCalled();
  });

  it('an APPROVED source warns in the modal that saving resets the moderation verdict', async () => {
    mocks.template = { ...pendingDetail(), status: 'APPROVED' };
    renderDetail('tpl-pending-1');
    fireEvent.click(await screen.findByRole('button', { name: /تعديل/ }));

    expect(await screen.findByText(/يُلغي الاعتماد الحالي ويعيد القالب إلى مراجعة الجودة/)).toBeTruthy();
  });

  it('the clone button posts and navigates to the new draft', async () => {
    renderDetail('tpl-pending-1');
    mocks.apiPost.mockResolvedValue({
      data: { data: { id: 'tpl-clone-9', title: 'نسخة من اختبار موحد — أساسيات هندسة البرمجيات', status: 'PENDING_REVIEW' } },
    });

    fireEvent.click(await screen.findByRole('button', { name: /استنساخ/ }));

    await waitFor(() => {
      expect(mocks.apiPost).toHaveBeenCalledWith('/exams/templates/tpl-pending-1/clone', {});
    });
    // Navigation landed on the clone's own detail route.
    await waitFor(() => expect(currentPath).toBe('/teacher/exams/tpl-clone-9'));
  });

  it('PUBLISHED (the iterate path): clone renders, تعديل does not, and the publish note says it is live', async () => {
    mocks.template = publishedDetail();
    renderDetail('tpl-published-1');

    await screen.findByRole('heading', { level: 1, name: /قواعد البيانات/ });
    expect(screen.queryByRole('button', { name: /تعديل/ })).toBeNull();
    expect(screen.getByRole('button', { name: /استنساخ/ })).toBeTruthy();
    expect(screen.getByText(/هذا الاختبار منشور بالفعل/)).toBeTruthy();
  });

  it('a REJECTED template still offers تعديل (the fix-and-resubmit loop) and names the rejection', async () => {
    mocks.template = { ...pendingDetail(), status: 'REJECTED', moderationNote: 'المدة غير كافية' };
    renderDetail('tpl-pending-1');

    expect(await screen.findByRole('button', { name: /تعديل/ })).toBeTruthy();
    expect(screen.getByText(/ملاحظة الجودة: المدة غير كافية/)).toBeTruthy();
    expect(screen.getByText(/رفضته الجودة/)).toBeTruthy();
  });
});
