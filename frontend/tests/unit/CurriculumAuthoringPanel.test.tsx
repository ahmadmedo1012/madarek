/**
 * WS-F7 — curriculum authoring panel render tests.
 *
 * The panel (components/curriculum/CurriculumAuthoringPanel) is the
 * "إدارة المنهج" surface of /teacher/intelligence/:offeringId. These
 * tests render it against mocked queries (same lib/api mock pattern as
 * QualityDashboard.test.tsx) and verify:
 *   1. lecture rows, re-sorted by ordinal, with duration formatted m:ss
 *   2. selecting a lecture loads its structure — chapters show the
 *      start–end window, checkpoints show trigger + options count
 *   3. the create-lecture modal opens and rejects an empty draft with
 *      the Arabic validation messages (zod rules, client-side)
 *   4. the checkpoint builder surfaces per-option errors on empty submit
 *   5. destructive actions go through the shared ConfirmDialog
 *   6. the page-level tab is gated by role (TEACHER sees it, QUALITY
 *      does not)
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CurriculumAuthoringPanel } from '../../src/components/curriculum/CurriculumAuthoringPanel';
import { TeacherOfferingDetailPage } from '../../src/pages/teacher/TeacherIntelligencePage';
import { useAuthStore } from '../../src/stores/auth.store';
import type { AuthUser } from '../../src/stores/auth.store';

/* ── lib/api mock (query + mutation surfaces) ──────────────────── */

const FIXTURES: Record<string, unknown> = {};

vi.mock('../../src/lib/api', () => ({
  api: {
    get: (url: string) => {
      const data = FIXTURES[url];
      if (data === undefined) return Promise.reject(new Error(`unexpected GET ${url}`));
      return Promise.resolve({ data: { data } });
    },
    post: vi.fn(() => Promise.resolve({ data: { data: { ok: true } } })),
    patch: vi.fn(() => Promise.resolve({ data: { data: { ok: true } } })),
    delete: vi.fn(() => Promise.resolve({ data: { data: { ok: true } } })),
  },
  unwrap: (p: Promise<{ data: { data: unknown } }>) => p.then((r) => r.data.data),
}));

/* ── fixtures ──────────────────────────────────────────────────── */

const LECTURES = [
  // deliberately out of ordinal order — the panel must re-sort
  {
    id: 'lec2',
    offeringId: 'off1',
    title: 'المحاضرة الثانية: عنونة IP',
    description: null,
    ordinal: 2,
    durationSec: 3300,
    videoUrl: 'https://cdn.example.com/lec2.mp4',
    posterUrl: null,
    createdAt: '2026-01-02T00:00:00.000Z',
    _count: { chapters: 2, checkpoints: 1 },
  },
  {
    id: 'lec1',
    offeringId: 'off1',
    title: 'المحاضرة الأولى: مدخل الشبكات',
    description: 'نظرة عامة',
    ordinal: 1,
    durationSec: 0, // unset → "مدة غير محددة"
    videoUrl: '/api/v1/files/papers/lec1.mp4',
    posterUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    _count: { chapters: 0, checkpoints: 0 },
  },
];

const LECTURE_DETAIL = {
  ...LECTURES[1],
  chapters: [
    {
      id: 'ch1',
      lectureId: 'lec1',
      title: 'المقدمة',
      startSec: 0,
      endSec: 320,
      ordinal: 1,
      conceptId: null,
      concept: null,
    },
  ],
  checkpoints: [
    {
      id: 'cp1',
      lectureId: 'lec1',
      triggerSec: 125,
      question: 'ما هي وحدة قياس البيانات الأساسية؟',
      options: ['البايت', 'البت'],
      conceptId: null,
    },
  ],
  offering: {
    id: 'off1',
    course: { id: 'c1', name: 'شبكات الحاسوب', code: 'CS301', themeColor: null },
    teacher: { id: 't1', firstName: 'سالم', lastName: 'الطاهر' },
  },
};

const TEACHER_USER: AuthUser = {
  id: 't1',
  email: 'salim@zu.edu.ly',
  firstName: 'سالم',
  lastName: 'الطاهر',
  role: 'TEACHER',
};

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <CurriculumAuthoringPanel offeringId="off1" />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  FIXTURES['/offerings/off1/lectures'] = LECTURES;
  FIXTURES['/lectures/lec1'] = LECTURE_DETAIL;
});

afterEach(() => {
  useAuthStore.setState({ user: null });
});

/* ── panel ─────────────────────────────────────────────────────── */

describe('CurriculumAuthoringPanel — lecture list', () => {
  it('renders rows re-sorted by ordinal with formatted durations and counts', async () => {
    renderPanel();

    // ordinal 1 first even though the fixture lists ordinal 2 first
    const firstTitle = await screen.findByText('المحاضرة الأولى: مدخل الشبكات');
    const firstRow = firstTitle.closest('button');
    const secondRow = screen.getByText('المحاضرة الثانية: عنونة IP').closest('button');
    expect(firstRow).not.toBeNull();
    expect(secondRow).not.toBeNull();
    expect(
      (firstRow!.compareDocumentPosition(secondRow!) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
    ).toBe(true);

    // 3300s → 55:00; 0 → مدة غير محددة
    expect(screen.getByText('55:00')).toBeInTheDocument();
    expect(screen.getByText('مدة غير محددة')).toBeInTheDocument();
    // _count badges
    expect(screen.getByText('2 فصل')).toBeInTheDocument();
    expect(screen.getByText('1 سؤال')).toBeInTheDocument();
  });

  it('renders a video link per lecture', async () => {
    renderPanel();
    await screen.findByText('المحاضرة الثانية: عنونة IP');
    const external = screen.getByRole('link', { name: 'فتح فيديو المحاضرة الثانية: عنونة IP' });
    expect(external).toHaveAttribute('href', 'https://cdn.example.com/lec2.mp4');
    expect(external).toHaveAttribute('target', '_blank');
  });

  it('shows the empty state when the offering has no lectures', async () => {
    FIXTURES['/offerings/off1/lectures'] = [];
    renderPanel();
    expect(await screen.findByText('لا توجد محاضرات بعد')).toBeInTheDocument();
  });
});

describe('CurriculumAuthoringPanel — lecture structure (chapters + checkpoints)', () => {
  it('loads the structure on selection and renders m:ss windows and triggers', async () => {
    renderPanel();

    fireEvent.click(await screen.findByText('المحاضرة الأولى: مدخل الشبكات'));

    expect(await screen.findByText('هيكل المحاضرة: المحاضرة الأولى: مدخل الشبكات')).toBeInTheDocument();

    // chapter window 0 → 0:00, 320 → 5:20 (renders once the detail loads)
    expect(await screen.findByText('المقدمة')).toBeInTheDocument();
    expect(screen.getByText('0:00 – 5:20')).toBeInTheDocument();

    // checkpoint: trigger 125s → 2:05 + options count
    expect(screen.getByText('ما هي وحدة قياس البيانات الأساسية؟')).toBeInTheDocument();
    expect(screen.getByText('2:05')).toBeInTheDocument();
    expect(screen.getByText('2 خيارات')).toBeInTheDocument();
  });
});

describe('CurriculumAuthoringPanel — create lecture modal', () => {
  it('opens from the add button and rejects an empty draft with Arabic messages', async () => {
    renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'محاضرة جديدة' }));

    expect(await screen.findByRole('dialog', { name: 'محاضرة جديدة' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'إضافة المحاضرة' }));

    expect(await screen.findByText('عنوان المحاضرة مطلوب')).toBeInTheDocument();
    expect(screen.getByText('رابط الفيديو مطلوب')).toBeInTheDocument();
  });
});

describe('CheckpointBuilder — checkpoint form validation', () => {
  it('surfaces per-option and question errors on empty submit', async () => {
    renderPanel();

    // open the lecture structure, then the checkpoint builder
    fireEvent.click(await screen.findByText('المحاضرة الأولى: مدخل الشبكات'));
    fireEvent.click(await screen.findByRole('button', { name: 'إضافة سؤال تفاعلي' }));

    const dialog = await screen.findByRole('dialog', { name: 'سؤال تفاعلي جديد' });
    expect(dialog).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'إضافة السؤال' }));

    expect(await screen.findByText('نص السؤال مطلوب')).toBeInTheDocument();
    expect(screen.getByText('الوقت مطلوب')).toBeInTheDocument();
    // both default option rows are empty → two per-option errors
    expect(screen.getAllByText('نص الخيار مطلوب')).toHaveLength(2);
  });
});

describe('Lecture deletion — ConfirmDialog gating', () => {
  it('requires explicit confirmation before calling the API', async () => {
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: 'حذف المحاضرة الأولى: مدخل الشبكات' }));

    const dialog = await screen.findByRole('dialog', { name: 'حذف المحاضرة' });
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/سيتم حذف "المحاضرة الأولى: مدخل الشبكات"/)).toBeInTheDocument();
    // cancel keeps everything intact — no DELETE call yet in either case
    const { api } = await import('../../src/lib/api');
    expect(api.delete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'حذف المحاضرة' })).toBeNull();
    });
  });
});

/* ── page-level role gate ──────────────────────────────────────── */

const OFFERINGS = [
  {
    id: 'off1',
    term: '2026-ربيع',
    room: 'قاعة أ',
    capacity: 60,
    course: { id: 'c1', code: 'CS301', name: 'شبكات الحاسوب', iconEmoji: '🌐', themeColor: null, credits: 3 },
    _count: { enrollments: 12, assignments: 1, lectures: 2, examTemplates: 0 },
    schedule: [],
  },
];

function renderDetailPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/teacher/intelligence/off1']}>
        <Routes>
          <Route path="/teacher/intelligence/:offeringId" element={<TeacherOfferingDetailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe('TeacherOfferingDetailPage — إدارة المنهج tab role gate', () => {
  beforeEach(() => {
    FIXTURES['/offerings/off1/lectures'] = LECTURES;
    FIXTURES['/lectures/lec1'] = LECTURE_DETAIL;
    FIXTURES['/teacher/me/offerings'] = OFFERINGS;
    FIXTURES['/teacher/offerings/off1/students'] = [];
    FIXTURES['/teacher/offerings/off1/analytics'] = {
      enrolled: 12,
      totalSessions: 8,
      overallAttendance: 84,
      avgGrade: 72,
      passRate: 88,
      assignmentCount: 1,
      examCount: 0,
    };
  });

  it('shows the tab and the panel for a TEACHER', async () => {
    useAuthStore.setState({ user: TEACHER_USER, isHydrated: true });
    renderDetailPage();

    const tab = await screen.findByRole('button', { name: 'إدارة المنهج' });
    fireEvent.click(tab);

    expect(await screen.findByText('المحاضرة الأولى: مدخل الشبكات')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'محاضرة جديدة' })).toBeInTheDocument();
  });

  it('hides the tab for a QUALITY viewer', async () => {
    useAuthStore.setState({ user: { ...TEACHER_USER, role: 'QUALITY' }, isHydrated: true });
    renderDetailPage();

    await screen.findByText('شبكات الحاسوب'); // page rendered
    expect(screen.queryByRole('button', { name: 'إدارة المنهج' })).toBeNull();
  });
});
