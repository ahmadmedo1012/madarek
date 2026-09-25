/**
 * 18-F1 — Exam authoring surface pins (audits 15-d P1-4 / 15-a P1-8).
 *
 * The suite drives the REAL hooks against a URL-dispatching api mock (the
 * useResources-contracts pattern, extended to page level) — so the pins
 * cover the wire payloads, the QueryClient invalidation maps and the
 * rendered states in one pass.
 *
 * 1. Pure validation mirrors — createQuestionSchema superRefine
 *    (MCQ/TRUE_FALSE need choices + an integer correct index, SHORT a
 *    model answer, prompt 5..2000, points 1..20, tags ≤ 8 × ≤ 40 chars)
 *    and createTemplateSchema (title 3..200, duration 5..480,
 *    passingScore 0..100, 1..60 questions, closeAt strictly after openAt)
 *    + the picker's live points sum + the answer-key renderer.
 * 2. Status honesty — every ExamStatusFE value maps to an Arabic label;
 *    the publish affordance exists ONLY on APPROVED (the backend gate).
 * 3. Create-question modal — type-driven validation blocks the wire call,
 *    then the payload ships the exact backend body per type.
 * 4. Template builder — the question picker sums selected points live and
 *    the create payload carries questionIds + the picked scope.
 * 5. Moderation — the queue routes to the detail review; the template
 *    decision and the per-question suspend hit their endpoints.
 * 6. Hook contracts — the 18-F1 invalidation maps + the detail query's
 *    id gating.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import ExamAuthoringPage, {
  ExamTemplateDetailPage,
  EXAM_STATUS_LABEL,
  canViewTemplateAttempts,
  normalizeTags,
  validateQuestionDraft,
  buildCreateQuestionInput,
  validateTemplateDraft,
  selectedPointsTotal,
  answerKeySummary,
} from '../../src/pages/teacher/ExamAuthorPages';
import {
  useCreateQuestion, useCreateExamTemplate, usePublishExamTemplate,
  useModerateQuestion, useExamTemplate, useGradeExamAttempt,
  type QuestionRow, type ExamTemplateDetail, type ExamAttemptRow,
} from '../../src/hooks/useResources';
import { useAuthStore } from '../../src/stores/auth.store';
import type { AppRole } from '../../src/stores/auth.store';

/* ── api mock — URL dispatch over a mutable fixture state ─────── */

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('../../src/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mocks.get(...(args as [string])),
    post: (...args: unknown[]) => mocks.post(...(args as [string, unknown])),
  },
  unwrap: <T,>(p: Promise<{ data: T }>): Promise<T> => p.then((r) => r.data),
}));

/* ── Fixtures ─────────────────────────────────────────────────── */

const TEACHER = {
  id: 't1',
  email: 'salim@zu.edu.ly',
  firstName: 'سالم',
  lastName: 'الطاهر',
  role: 'TEACHER' as const,
};

function questionFixture(over: Partial<QuestionRow> = {}): QuestionRow {
  return {
    id: 'q1',
    type: 'MCQ',
    prompt: 'ما هو بروتوكول TCP؟',
    difficulty: 'MEDIUM',
    points: 5,
    category: { title: 'الشبكات', slug: 'net', iconEmoji: null },
    choices: ['خيار أ', 'خيار ب'],
    author: 'سالم الطاهر',
    tags: ['شبكات'],
    ...over,
  };
}

function templateRowFixture(over: Record<string, unknown> = {}) {
  return {
    id: 't1',
    title: 'اختبار الشبكات النصفي',
    kind: 'MIDTERM',
    status: 'PENDING_REVIEW',
    durationMin: 45,
    passingScore: 50,
    openAt: null,
    closeAt: null,
    offering: { id: 'off1', course: { name: 'شبكات الحاسوب', code: 'CS301', iconEmoji: null } },
    faculty: null,
    author: { firstName: 'سالم', lastName: 'الطاهر' },
    _count: { questions: 2, attempts: 0 },
    ...over,
  };
}

function detailFixture(over: Partial<ExamTemplateDetail> = {}): ExamTemplateDetail {
  return {
    id: 't1',
    title: 'اختبار الشبكات النصفي',
    description: 'يغطي المحاضرات 1–6',
    kind: 'MIDTERM',
    status: 'PENDING_REVIEW',
    durationMin: 45,
    passingScore: 50,
    randomized: true,
    moderationNote: 'يرجى مراجعة السؤال الثاني',
    openAt: null,
    closeAt: null,
    offeringId: 'off1',
    facultyId: null,
    authorId: 't1',
    createdAt: '2026-02-01T09:00:00.000Z',
    offering: { id: 'off1', teacherId: 't1', course: { name: 'شبكات الحاسوب', code: 'CS301' } },
    faculty: null,
    author: { firstName: 'سالم', lastName: 'الطاهر' },
    moderatedBy: null,
    questions: [
      {
        id: 'eq1',
        order: 1,
        pointsOverride: null,
        question: {
          id: 'q1',
          type: 'MCQ',
          prompt: 'ما هو بروتوكول TCP؟',
          choices: ['خيار أ', 'خيار ب'],
          correctAnswer: 1,
          difficulty: 'MEDIUM',
          points: 5,
          isApproved: true,
          moderationNote: null,
          tags: [],
          category: { title: 'الشبكات' },
        },
      },
      {
        id: 'eq2',
        order: 2,
        pointsOverride: 4,
        question: {
          id: 'q2',
          type: 'SHORT',
          prompt: 'عرّف عنوان IP',
          choices: null,
          correctAnswer: 'رقم يعرّف الجهاز في الشبكة',
          difficulty: 'EASY',
          points: 2,
          isApproved: false,
          moderationNote: 'الصياغة تحتاج توضيحاً',
          tags: [],
          category: { title: 'الشبكات' },
        },
      },
    ],
    _count: { attempts: 3 },
    ...over,
  };
}

function attemptFixture(over: Record<string, unknown> = {}): ExamAttemptRow {
  return {
    id: 'at1',
    studentId: 'st1',
    studentName: 'آمنة العبيدي',
    status: 'SUBMITTED',
    startedAt: '2026-06-01T09:00:00.000Z',
    submittedAt: '2026-06-01T09:40:00.000Z',
    score: 3,
    maxScore: 10,
    pendingReview: 2,
    pendingAnswers: [
      {
        answerId: 'a1',
        questionId: 'q9',
        prompt: 'اشرح الفرق بين TCP و UDP',
        type: 'ESSAY',
        points: 4,
        studentAnswer: 'شرح وافٍ للفرق بينهما',
      },
      {
        answerId: 'a2',
        questionId: 'q10',
        prompt: 'عدّد ثلاث خصائص للبروتوكول',
        type: 'ESSAY',
        points: 3,
        studentAnswer: null,
      },
    ],
    ...over,
  } as ExamAttemptRow;
}

function freshState() {
  return {
    perms: ['EXAMS_AUTHOR'] as string[],
    bank: [
      questionFixture(),
      questionFixture({ id: 'q2', type: 'TRUE_FALSE', prompt: 'بروتوكول UDP موثوق', points: 3, choices: ['صح', 'خطأ'], difficulty: 'EASY', tags: [] }),
      questionFixture({ id: 'q3', type: 'SHORT', prompt: 'عرّف عنوان IP', points: 2, choices: null, difficulty: 'HARD', tags: [] }),
    ] as QuestionRow[],
    categories: [{
      id: 'cat1', slug: 'net', title: 'الشبكات', description: null, iconEmoji: null,
      isShared: true, faculty: null, department: null, _count: { questions: 3 },
    }],
    templates: [
      templateRowFixture(),
      templateRowFixture({ id: 't2', title: 'اختبار قصير — البرمجة', kind: 'QUIZ', status: 'APPROVED' }),
      templateRowFixture({ id: 't3', title: 'اختبار نهائي — قواعد البيانات', kind: 'FINAL', status: 'PUBLISHED', _count: { questions: 6, attempts: 12 } }),
      templateRowFixture({ id: 't4', title: 'اختبار تدريبي — الأمن', kind: 'PRACTICE', status: 'REJECTED', offering: null, faculty: { name: 'تقنية المعلومات' } }),
    ],
    detail: detailFixture(),
    attempts: [
      attemptFixture(),
      attemptFixture({
        id: 'at2',
        studentId: 'st2',
        studentName: 'خالد المصراتي',
        status: 'GRADED',
        submittedAt: '2026-06-01T08:00:00.000Z',
        score: 9,
        pendingReview: 0,
        pendingAnswers: [],
      }),
      attemptFixture({
        id: 'at3',
        studentId: 'st3',
        studentName: 'سارة بن عامر',
        status: 'IN_PROGRESS',
        submittedAt: null,
        score: null,
        pendingReview: 1,
        pendingAnswers: [],
      }),
      attemptFixture({
        id: 'at4',
        studentId: 'st4',
        studentName: 'عمر الفيتوري',
        status: 'EXPIRED',
        submittedAt: null,
        score: null,
        pendingReview: 1,
        pendingAnswers: [],
      }),
    ] as ExamAttemptRow[],
    queue: [{
      id: 't1',
      title: 'اختبار الشبكات النصفي',
      kind: 'MIDTERM',
      durationMin: 45,
      createdAt: '2026-02-01T09:00:00.000Z',
      offering: { course: { name: 'شبكات الحاسوب' } },
      author: { firstName: 'سالم', lastName: 'الطاهر' },
      _count: { questions: 2 },
    }],
    offerings: [{
      id: 'off1',
      term: '2026-1',
      room: 'قاعة 12',
      capacity: 40,
      course: { id: 'c1', code: 'CS301', name: 'شبكات الحاسوب', iconEmoji: null, themeColor: null, credits: 3 },
      _count: { enrollments: 2, assignments: 1, lectures: 4, examTemplates: 0 },
      schedule: [],
    }],
    faculties: [{ id: 'f1', name: 'كلّيّة تقنية المعلومات', iconEmoji: null, city: 'الزاوية', departments: [] }],
  };
}

const state = freshState();

beforeEach(() => {
  Object.assign(state, freshState());
  mocks.get.mockReset();
  mocks.post.mockReset();
  mocks.post.mockResolvedValue({ data: { id: 'created', isApproved: false, status: 'PENDING_REVIEW' } });
  mocks.get.mockImplementation((url: string) => {
    if (url === '/me/permissions') {
      return Promise.resolve({ data: { role: 'TEACHER', capabilities: state.perms, roleDefaults: state.perms } });
    }
    if (url === '/question-bank/categories') return Promise.resolve({ data: state.categories });
    if (url.startsWith('/question-bank')) return Promise.resolve({ data: state.bank });
    if (url === '/exams/templates') return Promise.resolve({ data: state.templates });
    // MUST precede the generic /exams/templates/ branch — the detail
    // page fires both for the same id.
    if (url.startsWith('/exams/templates/') && url.endsWith('/attempts')) {
      return Promise.resolve({ data: state.attempts });
    }
    if (url.startsWith('/exams/templates/')) return Promise.resolve({ data: state.detail });
    if (url === '/exams/moderation-queue') return Promise.resolve({ data: state.queue });
    if (url === '/teacher/me/offerings') return Promise.resolve({ data: state.offerings });
    if (url === '/faculties') return Promise.resolve({ data: state.faculties });
    return Promise.resolve({ data: [] });
  });
  act(() => { useAuthStore.setState({ user: TEACHER }); });
});

function renderAt(initialEntry: string) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/teacher/exams" element={<ExamAuthoringPage />} />
          <Route path="/teacher/exams/:templateId" element={<ExamTemplateDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const postsTo = (url: string) => mocks.post.mock.calls.filter((c) => c[0] === url);

/* ── 1. Pure validation mirrors ───────────────────────────────── */

describe('validateQuestionDraft — createQuestionSchema mirror', () => {
  const base = {
    categoryId: 'cat1',
    type: 'MCQ' as const,
    prompt: 'ما هو بروتوكول TCP؟',
    choices: ['خيار أ', 'خيار ب'],
    correctIndex: 0,
    modelAnswer: '',
    rubric: '',
    points: '5',
    difficulty: 'MEDIUM' as const,
    tagsRaw: '',
  };

  it('accepts a complete MCQ draft', () => {
    expect(validateQuestionDraft(base)).toEqual({});
  });

  it('requires a category, a 5+ char prompt, and integer points 1..20', () => {
    const errors = validateQuestionDraft({
      ...base, categoryId: '', prompt: 'قصير', points: '21',
    });
    expect(errors.categoryId).toBeTruthy();
    expect(errors.prompt).toBeTruthy();
    expect(errors.points).toBeTruthy();
    expect(validateQuestionDraft({ ...base, points: '0' }).points).toBeTruthy();
    expect(validateQuestionDraft({ ...base, points: '2.5' }).points).toBeTruthy();
  });

  it('blocks an MCQ without a marked correct answer (the silent-wrong-grade trap)', () => {
    expect(validateQuestionDraft({ ...base, correctIndex: null }).correct).toBeTruthy();
    // An index pointing past the choices array is equally invalid.
    expect(validateQuestionDraft({ ...base, correctIndex: 5 }).correct).toBeTruthy();
    expect(validateQuestionDraft({ ...base, correctIndex: -1 }).correct).toBeTruthy();
  });

  it('blocks empty choices, <2 choices and TRUE_FALSE with ≠2 choices', () => {
    expect(validateQuestionDraft({ ...base, choices: ['ممتلئ', '  '] }).choices).toBeTruthy();
    expect(validateQuestionDraft({ ...base, choices: ['وحيد'], correctIndex: 0 }).choices).toBeTruthy();
    expect(
      validateQuestionDraft({ ...base, type: 'TRUE_FALSE', choices: ['صح', 'خطأ', 'ربما'], correctIndex: 0 }).choices,
    ).toBeTruthy();
  });

  it('requires the SHORT model answer (auto-grading depends on it)', () => {
    expect(
      validateQuestionDraft({ ...base, type: 'SHORT', correctIndex: null }).modelAnswer,
    ).toBeTruthy();
    expect(
      validateQuestionDraft({ ...base, type: 'SHORT', correctIndex: null, modelAnswer: 'بروتوكول نقل' }).modelAnswer,
    ).toBeUndefined();
  });

  it('caps tags at 8, each at 40 chars', () => {
    expect(validateQuestionDraft({ ...base, tagsRaw: 'a,b,c,d,e,f,g,h,i' }).tags).toBeTruthy();
    expect(validateQuestionDraft({ ...base, tagsRaw: `${'ط'.repeat(41)}` }).tags).toBeTruthy();
    expect(normalizeTags('شبكات، أمن، ، شبكات، ')).toEqual(['شبكات', 'أمن']);
  });
});

describe('buildCreateQuestionInput — the wire body per type', () => {
  it('ships choices + the integer correct index for MCQ/TRUE_FALSE', () => {
    expect(buildCreateQuestionInput({
      categoryId: 'cat1', type: 'MCQ', prompt: 'سؤال اختبار كامل', choices: ['أ', 'ب'],
      correctIndex: 1, modelAnswer: '', rubric: '', points: '3', difficulty: 'HARD', tagsRaw: 'شبكات',
    })).toEqual({
      categoryId: 'cat1', type: 'MCQ', prompt: 'سؤال اختبار كامل',
      choices: ['أ', 'ب'], correctAnswer: 1, difficulty: 'HARD', points: 3, tags: ['شبكات'],
    });
  });

  it('ships the model answer string for SHORT and omits the key for a rubric-less ESSAY', () => {
    expect(buildCreateQuestionInput({
      categoryId: 'cat1', type: 'SHORT', prompt: 'عرّف عنوان IP', choices: ['أ', 'ب'],
      correctIndex: 0, modelAnswer: 'رقم يعرّف الجهاز', rubric: '', points: '2', difficulty: 'EASY', tagsRaw: '',
    })).toMatchObject({ type: 'SHORT', correctAnswer: 'رقم يعرّف الجهاز' });
    expect(buildCreateQuestionInput({
      categoryId: 'cat1', type: 'ESSAY', prompt: 'ناقش طبقات الشبكة', choices: ['أ', 'ب'],
      correctIndex: 0, modelAnswer: '', rubric: '', points: '10', difficulty: 'HARD', tagsRaw: '',
    })).not.toHaveProperty('correctAnswer');
  });
});

describe('validateTemplateDraft — createTemplateSchema mirror', () => {
  const base = {
    title: 'اختبار الشبكات النصفي',
    kind: 'MIDTERM' as const,
    description: '',
    durationMin: '45',
    passingScore: '50',
    randomized: true,
    scope: 'offering' as const,
    offeringId: 'off1',
    facultyId: '',
    openAt: '',
    closeAt: '',
    questionIds: new Set(['q1', 'q2']),
  };

  it('accepts a complete draft', () => {
    expect(validateTemplateDraft(base)).toEqual({});
  });

  it('enforces title 3..200, duration 5..480, passingScore 0..100, scope target', () => {
    const errors = validateTemplateDraft({
      ...base, title: 'قص', durationMin: '4', passingScore: '101', offeringId: '',
    });
    expect(errors.title).toBeTruthy();
    expect(errors.durationMin).toBeTruthy();
    expect(errors.passingScore).toBeTruthy();
    expect(errors.scope).toBeTruthy();
  });

  it('requires 1..60 questions and closeAt strictly after openAt', () => {
    expect(validateTemplateDraft({ ...base, questionIds: new Set<string>() }).questionIds).toBeTruthy();
    const ids = Array.from({ length: 61 }, (_, i) => `q${i}`);
    expect(validateTemplateDraft({ ...base, questionIds: new Set(ids) }).questionIds).toBeTruthy();
    expect(
      validateTemplateDraft({ ...base, openAt: '2026-06-02T10:00', closeAt: '2026-06-01T10:00' }).window,
    ).toBeTruthy();
    expect(
      validateTemplateDraft({ ...base, openAt: '2026-06-01T10:00', closeAt: '2026-06-01T10:00' }).window,
    ).toBeTruthy();
    expect(
      validateTemplateDraft({ ...base, openAt: '2026-06-01T10:00', closeAt: '2026-06-02T10:00' }).window,
    ).toBeUndefined();
  });
});

describe('selectedPointsTotal + answerKeySummary', () => {
  it('sums only the picked questions (the builder live total)', () => {
    const bank = state.bank;
    expect(selectedPointsTotal(bank, new Set(['q1', 'q2']))).toBe(8);
    expect(selectedPointsTotal(bank, new Set<string>())).toBe(0);
  });

  it('renders the answer key per type and stays null when the key is withheld', () => {
    expect(answerKeySummary({ type: 'MCQ', choices: ['أ', 'ب'], correctAnswer: 1 })).toBe('الإجابة الصحيحة: ب');
    // Legacy numeric-string key (the backend grader's accepted form).
    expect(answerKeySummary({ type: 'MCQ', choices: ['أ', 'ب'], correctAnswer: '1' })).toBe('الإجابة الصحيحة: ب');
    expect(answerKeySummary({ type: 'SHORT', choices: null, correctAnswer: 'نص نموذجي' })).toBe('الإجابة النموذجية: نص نموذجي');
    expect(answerKeySummary({ type: 'ESSAY', choices: null, correctAnswer: 'اذكر ثلاث خصائص' })).toBe('معيار التصحيح: اذكر ثلاث خصائص');
    expect(answerKeySummary({ type: 'MCQ', choices: ['أ', 'ب'], correctAnswer: null })).toBeNull();
    expect(answerKeySummary({ type: 'MCQ', choices: ['أ', 'ب'], correctAnswer: true })).toBeNull();
    expect(answerKeySummary({ type: 'MCQ', choices: ['أ', 'ب'], correctAnswer: 9 })).toBeNull();
  });
});

describe('EXAM_STATUS_LABEL — every status mapped, no raw enums', () => {
  it('covers the full ExamStatusFE union (DRAFT/CLOSED included, never-written but mapped)', () => {
    expect(Object.keys(EXAM_STATUS_LABEL).sort()).toEqual(
      ['APPROVED', 'CLOSED', 'DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED'].sort(),
    );
    for (const label of Object.values(EXAM_STATUS_LABEL)) expect(label.length).toBeGreaterThan(1);
  });
});

/* ── 2. Hub — capability honesty ──────────────────────────────── */

describe('ExamAuthoringPage — capability gating', () => {
  it('renders the author tabs and the template rows for an EXAMS_AUTHOR holder', async () => {
    renderAt('/teacher/exams');
    expect(await screen.findByRole('tab', { name: 'قوالب اختباراتي' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'بنك الأسئلة' })).toBeInTheDocument();
    // Every row's status renders its Arabic label — never the raw enum.
    expect(await screen.findByText('بانتظار المراجعة')).toBeInTheDocument();
    expect(screen.getByText('منشور')).toBeInTheDocument();
    expect(screen.getByText('مرفوض')).toBeInTheDocument();
    expect(screen.getByText('معتمد')).toBeInTheDocument();
    expect(screen.queryByText('PENDING_REVIEW')).toBeNull();
    // A rejected row points the author at the moderation note surface.
    expect(screen.getByText(/رفضته الجودة/)).toBeInTheDocument();
  });

  it('shows the honest permission wall to a holder of neither capability', async () => {
    state.perms = [];
    renderAt('/teacher/exams');
    expect(await screen.findByText('صلاحية التأليف غير مفعَّلة لحسابك')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'بنك الأسئلة' })).toBeNull();
  });

  it('lands a pure EXAMS_MODERATE holder directly on the queue (no authoring tabs)', async () => {
    state.perms = ['EXAMS_MODERATE'];
    renderAt('/teacher/exams');
    expect(await screen.findByText('قوالب بانتظار المراجعة')).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'قوالب اختباراتي' })).toBeNull();
  });
});

/* ── 3. Publish gate ──────────────────────────────────────────── */

describe('publish gate — APPROVED-only, per the backend', () => {
  it('offers publish on the APPROVED row only, and the confirm posts the endpoint', async () => {
    renderAt('/teacher/exams');
    await screen.findByRole('tab', { name: 'قوالب اختباراتي' });
    // Exactly one publish button — the APPROVED row. PENDING/PUBLISHED/REJECTED rows carry none.
    const publishButtons = await screen.findAllByRole('button', { name: 'نشر' });
    expect(publishButtons).toHaveLength(1);

    fireEvent.click(publishButtons[0]!);
    fireEvent.click(await screen.findByRole('button', { name: 'نشر نهائي' }));

    await waitFor(() => {
      expect(postsTo('/exams/templates/t2/publish')).toHaveLength(1);
    });
    expect(postsTo('/exams/templates/t2/publish')[0]![1]).toEqual({});
  });

  it('hides publish on a PENDING_REVIEW detail page (the moderation gate)', async () => {
    state.perms = ['EXAMS_AUTHOR', 'EXAMS_MODERATE'];
    renderAt('/teacher/exams/t1');
    await screen.findByText('قرار المراجعة');
    expect(screen.queryByRole('button', { name: 'نشر' })).toBeNull();
  });

  it('offers publish on an APPROVED detail and posts through the confirm', async () => {
    state.detail = detailFixture({ id: 't9', status: 'APPROVED', moderationNote: null });
    renderAt('/teacher/exams/t9');
    fireEvent.click(await screen.findByRole('button', { name: 'نشر' }));
    fireEvent.click(await screen.findByRole('button', { name: 'نشر نهائي' }));
    await waitFor(() => {
      expect(postsTo('/exams/templates/t9/publish')).toHaveLength(1);
    });
  });
});

/* ── 4. Create-question modal ─────────────────────────────────── */

async function openCreateQuestionModal() {
  renderAt('/teacher/exams');
  fireEvent.click(await screen.findByRole('tab', { name: 'بنك الأسئلة' }));
  fireEvent.click(await screen.findByRole('button', { name: 'سؤال جديد' }));
  // Categories arrive async — wait for the option before filling. The
  // lookup is scoped to the dialog: the bank filter select behind the
  // modal carries an identically-named option.
  const dialog = await screen.findByRole('dialog', { name: 'سؤال جديد' });
  await within(dialog).findByRole('option', { name: 'الشبكات' });
  return dialog;
}

describe('CreateQuestionModal — validation before the wire', () => {
  it('blocks an MCQ without a marked correct answer, then ships the exact body', async () => {
    const dialog = await openCreateQuestionModal();

    fireEvent.change(within(dialog).getByLabelText('تصنيف السؤال'), { target: { value: 'cat1' } });
    fireEvent.change(within(dialog).getByLabelText('نص السؤال'), { target: { value: 'ما هو بروتوكول TCP؟' } });
    fireEvent.change(within(dialog).getByLabelText('نص الخيار 1'), { target: { value: 'بروتوكول نقل موثوق' } });
    fireEvent.change(within(dialog).getByLabelText('نص الخيار 2'), { target: { value: 'بروتوكول بريد' } });

    // No correct answer marked → the submit is blocked client-side.
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ السؤال' }));
    expect(await within(dialog).findByText('حدِّد الإجابة الصحيحة قبل الحفظ.')).toBeInTheDocument();
    expect(postsTo('/question-bank')).toHaveLength(0);

    // Mark choice 1 correct → the payload ships the backend's body.
    fireEvent.click(within(dialog).getByRole('radio', { name: 'تعيين الخيار 1 إجابةً صحيحة' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ السؤال' }));

    await waitFor(() => {
      expect(postsTo('/question-bank')).toHaveLength(1);
    });
    expect(postsTo('/question-bank')[0]![1]).toEqual({
      categoryId: 'cat1',
      type: 'MCQ',
      prompt: 'ما هو بروتوكول TCP؟',
      choices: ['بروتوكول نقل موثوق', 'بروتوكول بريد'],
      correctAnswer: 0,
      difficulty: 'MEDIUM',
      points: 1,
      tags: [],
    });
    // The moderation-pipeline honesty: the author is told where the question went.
    expect(await within(dialog).findByText(/أُرسل السؤال إلى مراجعة الجودة/)).toBeInTheDocument();
  });

  it('locks TRUE_FALSE to the صح/خطأ pair and sends the picked index', async () => {
    const dialog = await openCreateQuestionModal();

    fireEvent.change(within(dialog).getByLabelText('تصنيف السؤال'), { target: { value: 'cat1' } });
    fireEvent.change(within(dialog).getByLabelText('نوع السؤال'), { target: { value: 'TRUE_FALSE' } });
    fireEvent.change(within(dialog).getByLabelText('نص السؤال'), { target: { value: 'بروتوكول UDP موثوق' } });
    // The canonical pair arrives prefilled — no add/remove controls offered.
    expect((within(dialog).getByLabelText('نص الخيار 1') as HTMLInputElement).value).toBe('صح');
    expect((within(dialog).getByLabelText('نص الخيار 2') as HTMLInputElement).value).toBe('خطأ');
    expect(within(dialog).queryByRole('button', { name: 'إضافة خيار' })).toBeNull();

    fireEvent.click(within(dialog).getByRole('radio', { name: 'تعيين الخيار 2 إجابةً صحيحة' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ السؤال' }));

    await waitFor(() => {
      expect(postsTo('/question-bank')).toHaveLength(1);
    });
    expect(postsTo('/question-bank')[0]![1]).toMatchObject({
      type: 'TRUE_FALSE', choices: ['صح', 'خطأ'], correctAnswer: 1,
    });
  });

  it('requires the SHORT model answer before accepting', async () => {
    const dialog = await openCreateQuestionModal();

    fireEvent.change(within(dialog).getByLabelText('تصنيف السؤال'), { target: { value: 'cat1' } });
    fireEvent.change(within(dialog).getByLabelText('نوع السؤال'), { target: { value: 'SHORT' } });
    fireEvent.change(within(dialog).getByLabelText('نص السؤال'), { target: { value: 'عرّف عنوان IP' } });

    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ السؤال' }));
    expect(await within(dialog).findByText(/الإجابة القصيرة تحتاج إجابة نموذجية/)).toBeInTheDocument();
    expect(postsTo('/question-bank')).toHaveLength(0);

    fireEvent.change(within(dialog).getByLabelText('الإجابة النموذجية'), { target: { value: 'رقم يعرّف الجهاز في الشبكة' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ السؤال' }));
    await waitFor(() => {
      expect(postsTo('/question-bank')).toHaveLength(1);
    });
    expect(postsTo('/question-bank')[0]![1]).toMatchObject({ type: 'SHORT', correctAnswer: 'رقم يعرّف الجهاز في الشبكة' });
  });
});

/* ── 5. Template builder ──────────────────────────────────────── */

describe('TemplateBuilderModal — picker sum + payload', () => {
  it('sums the picked questions live and ships questionIds with the scope', async () => {
    renderAt('/teacher/exams');
    fireEvent.click(await screen.findByRole('button', { name: 'قالب اختبار جديد' }));

    // The picker lists the approved bank — pick two questions (5 + 3 points).
    const q1 = await screen.findByRole('checkbox', { name: /اختيار السؤال: ما هو بروتوكول TCP/ });
    const q2 = screen.getByRole('checkbox', { name: /اختيار السؤال: بروتوكول UDP موثوق/ });
    fireEvent.click(q1);
    fireEvent.click(q2);

    // The live summary: 2 of 60 selected · 8 points total.
    expect(await screen.findByText(/سؤالان مختاران من 60/)).toBeInTheDocument();
    expect(screen.getByText(/8 نقاط/)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('عنوان القالب'), { target: { value: 'اختبار قصير — الشبكات' } });
    fireEvent.change(await screen.findByLabelText('المقرّر'), { target: { value: 'off1' } });

    fireEvent.click(screen.getByRole('button', { name: 'إنشاء القالب' }));
    await waitFor(() => {
      expect(postsTo('/exams/templates')).toHaveLength(1);
    });
    expect(postsTo('/exams/templates')[0]![1]).toMatchObject({
      title: 'اختبار قصير — الشبكات',
      kind: 'QUIZ',
      durationMin: 45,
      passingScore: 50,
      randomized: true,
      questionIds: ['q1', 'q2'],
      offeringId: 'off1',
    });
    expect(await screen.findByText(/أُرسل القالب إلى مراجعة الجودة/)).toBeInTheDocument();
  });

  it('blocks submission while the close window precedes the open window', async () => {
    renderAt('/teacher/exams');
    fireEvent.click(await screen.findByRole('button', { name: 'قالب اختبار جديد' }));

    fireEvent.click(await screen.findByRole('checkbox', { name: /اختيار السؤال: ما هو بروتوكول TCP/ }));
    fireEvent.change(screen.getByLabelText('عنوان القالب'), { target: { value: 'اختبار الشبكات النصفي' } });
    fireEvent.change(await screen.findByLabelText('المقرّر'), { target: { value: 'off1' } });
    fireEvent.change(screen.getByLabelText('يفتح في (اختياري)'), { target: { value: '2026-06-02T10:00' } });
    fireEvent.change(screen.getByLabelText('يغلق في (اختياري)'), { target: { value: '2026-06-01T10:00' } });

    fireEvent.click(screen.getByRole('button', { name: 'إنشاء القالب' }));
    expect(await screen.findByText('موعد الإغلاق يجب أن يكون بعد موعد الفتح.')).toBeInTheDocument();
    expect(postsTo('/exams/templates')).toHaveLength(0);
  });
});

/* ── 6. Moderation review ─────────────────────────────────────── */

describe('moderation — queue routes to the review surface', () => {
  it('shows the queue to an EXAMS_MODERATE holder and links into the detail', async () => {
    state.perms = ['EXAMS_AUTHOR', 'EXAMS_MODERATE'];
    renderAt('/teacher/exams');

    fireEvent.click(await screen.findByRole('tab', { name: 'مراجعة الجودة' }));
    fireEvent.click(await screen.findByRole('link', { name: 'مراجعة' }));

    // The detail review renders: decision card, per-question state, the
    // author-visible answer key and the suspended question's note.
    expect(await screen.findByText('قرار المراجعة')).toBeInTheDocument();
    expect(screen.getByText('الإجابة الصحيحة: خيار ب')).toBeInTheDocument();
    expect(screen.getByText('موقوف')).toBeInTheDocument();
    expect(screen.getByText('الصياغة تحتاج توضيحاً')).toBeInTheDocument();
    expect(screen.getByText(/ملاحظة الجودة: يرجى مراجعة السؤال الثاني/)).toBeInTheDocument();
  });

  it('posts the template decision and the per-question suspend to their endpoints', async () => {
    state.perms = ['EXAMS_AUTHOR', 'EXAMS_MODERATE'];
    renderAt('/teacher/exams');

    fireEvent.click(await screen.findByRole('tab', { name: 'مراجعة الجودة' }));
    fireEvent.click(await screen.findByRole('link', { name: 'مراجعة' }));
    await screen.findByText('قرار المراجعة');

    // Template-level approve — the note rides along when written.
    fireEvent.change(screen.getByLabelText('ملاحظة المراجعة للمؤلف'), { target: { value: 'عمل جيد' } });
    fireEvent.click(screen.getByRole('button', { name: 'اعتماد القالب' }));
    await waitFor(() => {
      expect(postsTo('/exams/templates/t1/moderate')).toHaveLength(1);
    });
    expect(postsTo('/exams/templates/t1/moderate')[0]![1]).toMatchObject({ approve: true, note: 'عمل جيد' });

    // Question-level suspend — the suspended flag leaves the bank.
    fireEvent.click(screen.getByRole('button', { name: 'إيقاف السؤال' }));
    await waitFor(() => {
      expect(postsTo('/question-bank/q1/moderate')).toHaveLength(1);
    });
    expect(postsTo('/question-bank/q1/moderate')[0]![1]).toMatchObject({ approve: false });
  });

  it('hides every moderation affordance from a plain author', async () => {
    renderAt('/teacher/exams/t1');
    // The author still sees their template (notes included) — but no
    // decision card, no per-question controls, no publish (PENDING).
    expect(await screen.findByText('اختبار الشبكات النصفي')).toBeInTheDocument();
    expect(screen.getByText(/ملاحظة الجودة/)).toBeInTheDocument();
    expect(screen.queryByText('قرار المراجعة')).toBeNull();
    expect(screen.queryByRole('button', { name: 'إيقاف السؤال' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'اعتماد القالب' })).toBeNull();
  });
});

/* ── 7. Hook contracts — the 18-F1 invalidation maps ──────────── */

function makeClient() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const invalidate = vi.spyOn(qc, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  const invalidatedKeys = () =>
    invalidate.mock.calls.map((c) => (c[0] as { queryKey: readonly unknown[] }).queryKey);
  return { invalidatedKeys, wrapper };
}

describe('hook contracts (18-F1 write hooks)', () => {
  it('useCreateQuestion posts the body and refreshes the question-bank family', async () => {
    const { invalidatedKeys, wrapper } = makeClient();
    const { result } = renderHook(() => useCreateQuestion(), { wrapper });
    const input = {
      categoryId: 'cat1', type: 'MCQ' as const, prompt: 'سؤال جديد كامل',
      choices: ['أ', 'ب'], correctAnswer: 0, difficulty: 'MEDIUM' as const,
      points: 5, tags: [],
    };
    await act(async () => {
      await result.current.mutateAsync(input);
    });
    expect(mocks.post).toHaveBeenCalledWith('/question-bank', input);
    expect(invalidatedKeys()).toContainEqual(['question-bank']);
  });

  it('useCreateExamTemplate refreshes the exams family + the offerings counts', async () => {
    const { invalidatedKeys, wrapper } = makeClient();
    const { result } = renderHook(() => useCreateExamTemplate(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        title: 'قالب جديد', kind: 'QUIZ', durationMin: 30, passingScore: 50,
        randomized: true, questionIds: ['q1'],
      });
    });
    expect(mocks.post).toHaveBeenCalledWith('/exams/templates', expect.objectContaining({ questionIds: ['q1'] }));
    const keys = invalidatedKeys();
    expect(keys).toContainEqual(['exams']);
    expect(keys).toContainEqual(['teacher', 'offerings']);
  });

  it('usePublishExamTemplate posts the endpoint with an empty body and refreshes exams', async () => {
    const { invalidatedKeys, wrapper } = makeClient();
    const { result } = renderHook(() => usePublishExamTemplate(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync('t2');
    });
    expect(mocks.post).toHaveBeenCalledWith('/exams/templates/t2/publish', {});
    expect(invalidatedKeys()).toContainEqual(['exams']);
  });

  it('useModerateQuestion refreshes both the bank family and the exams family', async () => {
    const { invalidatedKeys, wrapper } = makeClient();
    const { result } = renderHook(() => useModerateQuestion(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({ id: 'q9', approve: false, note: 'غامض' });
    });
    expect(mocks.post).toHaveBeenCalledWith('/question-bank/q9/moderate', { approve: false, note: 'غامض' });
    const keys = invalidatedKeys();
    expect(keys).toContainEqual(['question-bank']);
    expect(keys).toContainEqual(['exams']);
  });

  it('useExamTemplate stays dormant without an id (no malformed fetch)', async () => {
    const { wrapper } = makeClient();
    const { result } = renderHook(() => useExamTemplate(undefined), { wrapper });
    expect(result.current.isPending).toBe(true);
    expect(mocks.get).not.toHaveBeenCalled();
  });
});

/* ── 8. Manual grading surface (18-F2) ───────────────────────── */

describe('canViewTemplateAttempts — the client authorization mirror', () => {
  const offeringTemplate = {
    authorId: 'someone-else',
    offeringId: 'off1',
    offering: { id: 'off1', teacherId: 't1', course: { name: 'شبكات الحاسوب', code: 'CS301' } },
  };
  const facultyTemplate = { authorId: 'a1', offeringId: null, offering: null };
  const viewer = (id: string, role: AppRole) => ({ id, role });

  it('the offering teacher, ADMIN and OWNER pass an offering-scoped template', () => {
    expect(canViewTemplateAttempts(offeringTemplate, viewer('t1', 'TEACHER'))).toBe(true);
    expect(canViewTemplateAttempts(offeringTemplate, viewer('admin1', 'ADMIN'))).toBe(true);
    expect(canViewTemplateAttempts(offeringTemplate, viewer('own1', 'OWNER'))).toBe(true);
  });

  it('another teacher, QUALITY and anonymous viewers never see the grading section', () => {
    expect(canViewTemplateAttempts(offeringTemplate, viewer('t2', 'TEACHER'))).toBe(false);
    expect(canViewTemplateAttempts(offeringTemplate, viewer('q1', 'QUALITY'))).toBe(false);
    expect(canViewTemplateAttempts(facultyTemplate, viewer('q1', 'QUALITY'))).toBe(false);
    expect(canViewTemplateAttempts(facultyTemplate, null)).toBe(false);
    expect(canViewTemplateAttempts(offeringTemplate, undefined)).toBe(false);
  });

  it('a keyless (faculty/general) template belongs to its author — OWNER oversight, not ADMIN', () => {
    // The backend's exact asymmetry: ADMIN oversight reaches offerings
    // through the caps check, never keyless templates.
    expect(canViewTemplateAttempts(facultyTemplate, viewer('a1', 'TEACHER'))).toBe(true);
    expect(canViewTemplateAttempts(facultyTemplate, viewer('own1', 'OWNER'))).toBe(true);
    expect(canViewTemplateAttempts(facultyTemplate, viewer('a2', 'TEACHER'))).toBe(false);
    expect(canViewTemplateAttempts(facultyTemplate, viewer('admin1', 'ADMIN'))).toBe(false);
  });
});

describe('attempts section — list states (the read half)', () => {
  it('renders the attempts with status chips, scores and the SUBMITTED emphasis', async () => {
    renderAt('/teacher/exams/t1');
    expect(await screen.findByText('التصحيح')).toBeInTheDocument();
    // Wait for the attempts rows (the card title renders while pending).
    await screen.findByText('آمنة العبيدي');

    // SUBMITTED row — the actionable one: chip + pending count + the only تصحيح button.
    expect(screen.getByText('آمنة العبيدي')).toBeInTheDocument();
    expect(screen.getByText('بانتظار التصحيح')).toBeInTheDocument();
    expect(screen.getByText('إجابتان بانتظار تقييمك')).toBeInTheDocument();
    // GRADED row — final score, no grade button.
    expect(screen.getByText('خالد المصراتي')).toBeInTheDocument();
    expect(screen.getByText('مُصحَّحة')).toBeInTheDocument();
    expect(screen.getByText('منتهية بانتهاء الوقت')).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'تصحيح' })).toHaveLength(1);
    // The machine-score-so-far pairs travel as LTR fractions.
    expect(screen.getByText('3 / 10')).toBeInTheDocument();
    expect(screen.getByText('9 / 10')).toBeInTheDocument();
  });

  it('filters down to awaiting-grading attempts only', async () => {
    renderAt('/teacher/exams/t1');
    await screen.findByText('آمنة العبيدي');

    fireEvent.click(screen.getByRole('checkbox', { name: 'بانتظار التصحيح فقط' }));
    expect(screen.getByText('آمنة العبيدي')).toBeInTheDocument();
    expect(screen.queryByText('خالد المصراتي')).toBeNull();
    expect(screen.queryByText('سارة بن عامر')).toBeNull();
    expect(screen.queryByText('عمر الفيتوري')).toBeNull();
  });

  it('renders the honest empty state when no attempt exists yet', async () => {
    state.attempts = [];
    renderAt('/teacher/exams/t1');
    expect(await screen.findByText('لا محاولات بعد')).toBeInTheDocument();
  });

  it('a failed attempts fetch renders the retryable error state', async () => {
    const original = mocks.get.getMockImplementation();
    mocks.get.mockImplementation((url: string) => {
      if (url.endsWith('/attempts')) return Promise.reject(new Error('network down'));
      return original!(url);
    });
    renderAt('/teacher/exams/t1');
    expect(await screen.findByText('تعذَّر تحميل المحاولات')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument();
  });

  it('hides the whole section from a QUALITY viewer — the backend door never passes', async () => {
    act(() => { useAuthStore.setState({ user: { ...TEACHER, id: 'q1', role: 'QUALITY' } }); });
    renderAt('/teacher/exams/t1');
    // The template itself still renders for the moderator…
    expect(await screen.findByText('اختبار الشبكات النصفي')).toBeInTheDocument();
    // …but the grading section is absent, not a wall of errors.
    expect(screen.queryByText('التصحيح')).toBeNull();
  });
});

describe('GradeAttemptModal — verdicts → payload → finalize', () => {
  async function openGradeModal(name = 'تصحيح محاولة — آمنة العبيدي') {
    renderAt('/teacher/exams/t1');
    fireEvent.click(await screen.findByRole('button', { name: 'تصحيح' }));
    return screen.findByRole('dialog', { name: `${name}` });
  }

  it('shows each parked answer and blocks the wire call until every verdict is set', async () => {
    const dialog = await openGradeModal();

    // Both parked answers: prompt + student answer (or the no-answer note).
    expect(within(dialog).getByText('اشرح الفرق بين TCP و UDP')).toBeInTheDocument();
    expect(within(dialog).getByText('شرح وافٍ للفرق بينهما')).toBeInTheDocument();
    expect(within(dialog).getByText('عدّد ثلاث خصائص للبروتوكول')).toBeInTheDocument();
    expect(within(dialog).getByText(/لم يكتب الطالب إجابة لهذا السؤال/)).toBeInTheDocument();
    // The machine score so far rides the header line.
    expect(within(dialog).getByText('3 / 10')).toBeInTheDocument();

    // Submit with no verdicts → the client mirror of reconcileManualGrades.
    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ التصحيح واعتماد الدرجة' }));
    expect(await within(dialog).findByText(/حدِّد حكمك — صحيحة أم خاطئة — لكل إجابة معلّقة/)).toBeInTheDocument();
    // Flush the microtasks a legitimate submit would need — the block is
    // semantic, not a timing artifact.
    await act(async () => { await Promise.resolve(); });
    expect(postsTo('/exams/attempts/at1/grade')).toHaveLength(0);

    // Verdicts: first correct (+ feedback), second wrong.
    const g1 = within(dialog).getByRole('group', { name: 'حكم إجابة السؤال 1' });
    const g2 = within(dialog).getByRole('group', { name: 'حكم إجابة السؤال 2' });
    fireEvent.click(within(g1).getByRole('button', { name: 'صحيحة' }));
    fireEvent.change(within(dialog).getByLabelText('ملاحظة على إجابة السؤال 1'), {
      target: { value: 'إجابة وافية' },
    });
    fireEvent.click(within(g2).getByRole('button', { name: 'خاطئة' }));
    expect(within(g1).getByRole('button', { name: 'صحيحة' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(g2).getByRole('button', { name: 'خاطئة' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(within(dialog).getByRole('button', { name: 'حفظ التصحيح واعتماد الدرجة' }));
    await waitFor(() => {
      expect(postsTo('/exams/attempts/at1/grade')).toHaveLength(1);
    });
    // The exact manualGradeSchema body: every pending answer once, in
    // order, feedback only when written.
    expect(postsTo('/exams/attempts/at1/grade')[0]![1]).toEqual({
      answers: [
        { answerId: 'a1', isCorrect: true, feedback: 'إجابة وافية' },
        { answerId: 'a2', isCorrect: false },
      ],
    });

    // Honest success — the finalized score the server computed.
    expect(await within(dialog).findByText(/اعتُمدت الدرجة النهائية/)).toBeInTheDocument();

    // Finalize invalidation: the ['exams'] family refetch reaches the
    // attempts list too (the second GET after the initial mount fetch).
    await waitFor(() => {
      expect(mocks.get.mock.calls.filter((c) => c[0] === '/exams/templates/t1/attempts').length).toBeGreaterThanOrEqual(2);
    });
  });

  it('guards a double submit while the finalize is in flight', async () => {
    let resolvePost!: (v: { data: unknown }) => void;
    mocks.post.mockImplementationOnce(
      () => new Promise((r) => { resolvePost = r; }),
    );
    const dialog = await openGradeModal();

    const g1 = within(dialog).getByRole('group', { name: 'حكم إجابة السؤال 1' });
    const g2 = within(dialog).getByRole('group', { name: 'حكم إجابة السؤال 2' });
    fireEvent.click(within(g1).getByRole('button', { name: 'صحيحة' }));
    fireEvent.click(within(g2).getByRole('button', { name: 'خاطئة' }));
    const submit = within(dialog).getByRole('button', { name: 'حفظ التصحيح واعتماد الدرجة' });
    fireEvent.click(submit);
    // The first click's POST rides a microtask — wait for it, then prove
    // the second click cannot ride twice (loading disables the control).
    await waitFor(() => {
      expect(postsTo('/exams/attempts/at1/grade')).toHaveLength(1);
    });
    fireEvent.click(submit);
    expect(postsTo('/exams/attempts/at1/grade')).toHaveLength(1);

    resolvePost({ data: { score: 7, maxScore: 10, status: 'GRADED', passed: true } });
    await within(dialog).findByText(/اعتُمدت الدرجة النهائية/);
  });

  it('finalizes a nothing-parked SUBMITTED attempt with an empty answers payload', async () => {
    state.attempts = [attemptFixture({ pendingReview: 0, pendingAnswers: [] })];
    const dialog = await openGradeModal();

    expect(within(dialog).getByText(/لا إجابات معلّقة في هذه المحاولة/)).toBeInTheDocument();
    fireEvent.click(within(dialog).getByRole('button', { name: 'اعتماد الدرجة النهائية' }));
    await waitFor(() => {
      expect(postsTo('/exams/attempts/at1/grade')).toHaveLength(1);
    });
    expect(postsTo('/exams/attempts/at1/grade')[0]![1]).toEqual({ answers: [] });
  });

  it('routes a dirty close through the discard confirm — the verdicts are the teacher\u2019s work', async () => {
    const dialog = await openGradeModal();

    const g1 = within(dialog).getByRole('group', { name: 'حكم إجابة السؤال 1' });
    fireEvent.click(within(g1).getByRole('button', { name: 'صحيحة' }));
    fireEvent.click(within(dialog).getByRole('button', { name: 'إلغاء' }));

    await screen.findByRole('dialog', { name: 'تعديلات غير محفوظة' });
    // The draft survives behind the confirm.
    expect(within(g1).getByRole('button', { name: 'صحيحة' })).toHaveAttribute('aria-pressed', 'true');

    fireEvent.click(screen.getByRole('button', { name: 'التخلّي عن التعديلات' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'تصحيح محاولة — آمنة العبيدي' })).toBeNull();
    });
  });

  it('useGradeExamAttempt posts the endpoint and invalidates the exams family', async () => {
    const { invalidatedKeys, wrapper } = makeClient();
    const { result } = renderHook(() => useGradeExamAttempt(), { wrapper });
    await act(async () => {
      await result.current.mutateAsync({
        attemptId: 'at1',
        answers: [{ answerId: 'a1', isCorrect: true, feedback: 'جيدة' }],
      });
    });
    expect(mocks.post).toHaveBeenCalledWith(
      '/exams/attempts/at1/grade',
      { answers: [{ answerId: 'a1', isCorrect: true, feedback: 'جيدة' }] },
    );
    expect(invalidatedKeys()).toContainEqual(['exams']);
  });
});
