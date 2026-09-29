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
 * Plus the wave 12-13 fixes:
 *   7. delete failures close the dialog and surface via toast + banner
 *      (audit 11-f P1-2 — previously the error rendered behind the
 *      modal overlay)
 *   8. dirty forms require a discard-confirm on close (unsaved-edits
 *      guard) and Esc is owned by the topmost dialog
 *   9. removing a checkpoint option keeps the correct-answer mark honest
 *      (audit 11-f P1-7 — shift / reset-with-nudge)
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { CurriculumAuthoringPanel } from '../../src/components/curriculum/CurriculumAuthoringPanel';
import { TeacherOfferingDetailPage } from '../../src/pages/teacher/TeacherIntelligencePage';
import { useAuthStore } from '../../src/stores/auth.store';
import { useToastStore } from '../../src/lib/toast';
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
  useToastStore.setState({ items: [] });
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
    // _count badges — 5-B6 (A7 P2-4): counted nouns (the old raw
    // «2 فصل / 1 سؤال» is gone); the zero-count row says «لا فصول».
    expect(screen.getByText('فصلان')).toBeInTheDocument();
    expect(screen.getByText('سؤال واحد')).toBeInTheDocument();
    expect(screen.getByText('لا فصول')).toBeInTheDocument();
    expect(screen.getByText('لا أسئلة')).toBeInTheDocument();
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

  it('counts the panel subtitle with proper counted nouns (5-B6 / A7 P2-4)', async () => {
    renderPanel();
    // 2 lectures · 2 chapters (lec2) · 1 checkpoint (lec2) — the old
    // raw «2 محاضرة · 2 فصل · 1 سؤال تفاعلي» is gone.
    expect(
      await screen.findByText('محاضرتان · فصلان · سؤال تفاعلي واحد'),
    ).toBeInTheDocument();
  });
});

/* ── 5-B6 (audit 5-A7 P2-3): lecture reorder ─────────────────── */
describe('LectureAuthoringList — up/down reorder (5-B6 / A7 P2-3)', () => {
  it('disables the up button on the first row and down on the last', async () => {
    renderPanel();
    await screen.findByText('المحاضرة الأولى: مدخل الشبكات');

    expect(
      screen.getByRole('button', { name: 'انقل المحاضرة الأولى: مدخل الشبكات لأعلى القائمة' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'انقل المحاضرة الثانية: عنونة IP لأسفل القائمة' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'انقل المحاضرة الأولى: مدخل الشبكات لأسفل القائمة' }),
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'انقل المحاضرة الثانية: عنونة IP لأعلى القائمة' }),
    ).toBeEnabled();
  });

  it('swaps ordinals with the neighbor through two PATCHes', async () => {
    const { api } = await import('../../src/lib/api');
    renderPanel();
    await screen.findByText('المحاضرة الأولى: مدخل الشبكات');

    fireEvent.click(
      screen.getByRole('button', { name: 'انقل المحاضرة الأولى: مدخل الشبكات لأسفل القائمة' }),
    );

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledTimes(2);
    });
    // The pair swap: lec1 takes lec2's ordinal, then lec2 takes lec1's
    expect(api.patch).toHaveBeenNthCalledWith(1, '/lectures/lec1', { ordinal: 2 });
    expect(api.patch).toHaveBeenNthCalledWith(2, '/lectures/lec2', { ordinal: 1 });
  });

  it('reports a failed swap as an error toast and unlocks the buttons', async () => {
    const { api } = await import('../../src/lib/api');
    vi.mocked(api.patch).mockRejectedValueOnce({
      response: { data: { error: { message: 'انتهت صلاحية الجلسة' } } },
    });
    renderPanel();
    await screen.findByText('المحاضرة الأولى: مدخل الشبكات');

    const down = screen.getByRole('button', { name: 'انقل المحاضرة الأولى: مدخل الشبكات لأسفل القائمة' });
    fireEvent.click(down);

    const toasts = await waitFor(() => {
      const items = useToastStore.getState().items;
      expect(items).toHaveLength(1);
      return items;
    });
    expect(toasts[0]).toMatchObject({
      variant: 'error',
      title: 'تعذّر إعادة الترتيب',
      message: 'انتهت صلاحية الجلسة',
    });
    // movingId cleared — the pair is usable again after the failure
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'انقل المحاضرة الأولى: مدخل الشبكات لأسفل القائمة' })).toBeEnabled();
    });
  });
});

/* ── 5-D3 (5-B6 hand-off #2): chapter reorder ────────────────── */
describe('ChapterList — up/down reorder (5-D3 / 5-B6 hand-off #2)', () => {
  // Two chapters on the selected lecture (out of ordinal order — the
  // list must re-sort locally, the panel's lecture-list pattern).
  const TWO_CHAPTERS = {
    ...LECTURE_DETAIL,
    chapters: [
      { id: 'chB', lectureId: 'lec1', title: 'الفصل الثاني: التوجيه', startSec: 320, endSec: 900, ordinal: 2, conceptId: null, concept: null },
      { id: 'chA', lectureId: 'lec1', title: 'الفصل الأول: المقدمة', startSec: 0, endSec: 320, ordinal: 1, conceptId: null, concept: null },
    ],
  };

  beforeEach(() => {
    FIXTURES['/lectures/lec1'] = TWO_CHAPTERS;
  });

  async function openStructure() {
    renderPanel();
    fireEvent.click(await screen.findByText('المحاضرة الأولى: مدخل الشبكات'));
    await screen.findByText('الفصل الأول: المقدمة');
  }

  it('renders rows re-sorted by ordinal and disables the move pair at the list ends', async () => {
    await openStructure();

    // ordinal order regardless of the fixture's array order
    const first = screen.getByText('الفصل الأول: المقدمة').closest('div');
    const second = screen.getByText('الفصل الثاني: التوجيه').closest('div');
    expect(first).not.toBeNull();
    expect(second).not.toBeNull();
    expect(
      (first!.compareDocumentPosition(second!) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
    ).toBe(true);

    expect(
      screen.getByRole('button', { name: 'انقل الفصل الأول: المقدمة لأعلى القائمة' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'انقل الفصل الثاني: التوجيه لأسفل القائمة' }),
    ).toBeDisabled();
    expect(
      screen.getByRole('button', { name: 'انقل الفصل الأول: المقدمة لأسفل القائمة' }),
    ).toBeEnabled();
    expect(
      screen.getByRole('button', { name: 'انقل الفصل الثاني: التوجيه لأعلى القائمة' }),
    ).toBeEnabled();
  });

  it('swaps ordinals with the neighbor through two PATCHes', async () => {
    const { api } = await import('../../src/lib/api');
    // The lecture-reorder suite above shares this module-level mock —
    // count only THIS swap's calls.
    vi.mocked(api.patch).mockClear();
    await openStructure();

    fireEvent.click(
      screen.getByRole('button', { name: 'انقل الفصل الأول: المقدمة لأسفل القائمة' }),
    );

    await waitFor(() => {
      expect(api.patch).toHaveBeenCalledTimes(2);
    });
    // The pair swap: chA takes chB's ordinal, then chB takes chA's
    expect(api.patch).toHaveBeenNthCalledWith(1, '/chapters/chA', { ordinal: 2 });
    expect(api.patch).toHaveBeenNthCalledWith(2, '/chapters/chB', { ordinal: 1 });
  });

  it('reports a failed swap as an error toast and unlocks the pair', async () => {
    const { api } = await import('../../src/lib/api');
    vi.mocked(api.patch).mockRejectedValueOnce({
      response: { data: { error: { message: 'انتهت صلاحية الجلسة' } } },
    });
    await openStructure();

    fireEvent.click(
      screen.getByRole('button', { name: 'انقل الفصل الأول: المقدمة لأسفل القائمة' }),
    );

    const toasts = await waitFor(() => {
      const items = useToastStore.getState().items;
      expect(items).toHaveLength(1);
      return items;
    });
    expect(toasts[0]).toMatchObject({
      variant: 'error',
      title: 'تعذّر إعادة الترتيب',
      message: 'انتهت صلاحية الجلسة',
    });
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'انقل الفصل الأول: المقدمة لأسفل القائمة' }),
      ).toBeEnabled();
    });
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

  it('on failure: closes the dialog, reports via error toast, keeps the inline banner (11-f P1-2)', async () => {
    const { api } = await import('../../src/lib/api');
    vi.mocked(api.delete).mockRejectedValueOnce({
      response: { data: { error: { message: 'لا يمكن حذف محاضرة عليها سجل مشاهدات' } } },
    });
    renderPanel();

    fireEvent.click(await screen.findByRole('button', { name: 'حذف المحاضرة الأولى: مدخل الشبكات' }));
    fireEvent.click(await screen.findByRole('button', { name: 'حذف نهائي' }));

    // The dialog must close on failure — the old bug kept it open while
    // the Arabic error rendered invisibly behind the overlay.
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'حذف المحاضرة' })).toBeNull();
    });

    // Error toasts ride the toast channel (z-index above any modal) and
    // never auto-dismiss.
    const toasts = useToastStore.getState().items;
    expect(toasts).toHaveLength(1);
    expect(toasts[0]).toMatchObject({
      variant: 'error',
      title: 'تعذّر حذف المحاضرة',
      message: 'لا يمكن حذف محاضرة عليها سجل مشاهدات',
    });

    // The context-anchored list banner persists underneath.
    expect(await screen.findByText('لا يمكن حذف محاضرة عليها سجل مشاهدات')).toBeInTheDocument();
  });
});

describe('Authoring forms — dirty-close discard guard (12-13)', () => {
  it('closes a clean form directly, but a dirty form requires an explicit discard', async () => {
    renderPanel();

    // Clean form: ✕ closes immediately, no blocking confirm.
    fireEvent.click(screen.getByRole('button', { name: 'محاضرة جديدة' }));
    await screen.findByRole('dialog', { name: 'محاضرة جديدة' });
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'محاضرة جديدة' })).toBeNull();
    });
    expect(screen.queryByRole('dialog', { name: 'تعديلات غير محفوظة' })).toBeNull();

    // Dirty form: ✕ routes into the discard confirm, draft intact.
    fireEvent.click(screen.getByRole('button', { name: 'محاضرة جديدة' }));
    await screen.findByRole('dialog', { name: 'محاضرة جديدة' });
    fireEvent.change(screen.getByLabelText('عنوان المحاضرة'), { target: { value: 'مسودة محاضرة' } });
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));

    await screen.findByRole('dialog', { name: 'تعديلات غير محفوظة' });
    expect(screen.getByLabelText('عنوان المحاضرة')).toHaveValue('مسودة محاضرة');

    // Esc while the discard-confirm is stacked cancels the discard only —
    // the form modal (Esc locked underneath) stays open.
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'تعديلات غير محفوظة' })).toBeNull();
    });
    expect(screen.getByRole('dialog', { name: 'محاضرة جديدة' })).toBeInTheDocument();

    // Explicit discard closes the form.
    fireEvent.click(screen.getByRole('button', { name: 'إغلاق' }));
    await screen.findByRole('dialog', { name: 'تعديلات غير محفوظة' });
    fireEvent.click(screen.getByRole('button', { name: 'التخلّي عن التعديلات' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: 'محاضرة جديدة' })).toBeNull();
    });
  });

  it('arms a beforeunload guard only while the form is dirty', async () => {
    renderPanel();

    // Spy records the dispatched events; defaultPrevented is read AFTER
    // dispatch so listener registration order never matters.
    const events: Event[] = [];
    const spy = (e: Event) => {
      events.push(e);
    };
    window.addEventListener('beforeunload', spy);
    try {
      fireEvent.click(screen.getByRole('button', { name: 'محاضرة جديدة' }));
      await screen.findByRole('dialog', { name: 'محاضرة جديدة' });

      // Clean draft — no guard armed yet, nothing cancels the unload.
      window.dispatchEvent(new Event('beforeunload', { cancelable: true }));
      expect(events).toHaveLength(1);
      expect(events[0]!.defaultPrevented).toBe(false);

      // Dirty draft — the guard cancels the unload (native browser prompt).
      fireEvent.change(screen.getByLabelText('عنوان المحاضرة'), { target: { value: 'مسودة' } });
      window.dispatchEvent(new Event('beforeunload', { cancelable: true }));
      expect(events).toHaveLength(2);
      expect(events[1]!.defaultPrevented).toBe(true);
    } finally {
      window.removeEventListener('beforeunload', spy);
    }
  });
});

describe('CheckpointBuilder — option removal keeps the correct mark honest (11-f P1-7)', () => {
  it('shifts the mark when an earlier option is removed; resets it with a nudge when the marked one goes', async () => {
    renderPanel();

    fireEvent.click(await screen.findByText('المحاضرة الأولى: مدخل الشبكات'));
    fireEvent.click(await screen.findByRole('button', { name: 'إضافة سؤال تفاعلي' }));
    await screen.findByRole('dialog', { name: 'سؤال تفاعلي جديد' });

    // Four options; mark the fourth as the correct answer.
    fireEvent.click(screen.getByRole('button', { name: 'إضافة خيار' }));
    fireEvent.click(screen.getByRole('button', { name: 'إضافة خيار' }));
    fireEvent.click(screen.getByRole('radio', { name: 'تعيين الخيار 4 إجابةً صحيحة' }));
    expect(screen.getByRole('radio', { name: 'تعيين الخيار 4 إجابةً صحيحة' })).toBeChecked();

    // Removing option 1 shifts the mark onto old option 4 (now الخيار 3) —
    // the OLD behavior silently kept the mark at index 3 or re-pointed it
    // at whatever shifted into view.
    fireEvent.click(screen.getByRole('button', { name: 'إزالة الخيار 1' }));
    expect(screen.getByRole('radio', { name: 'تعيين الخيار 3 إجابةً صحيحة' })).toBeChecked();
    expect(screen.queryByRole('radio', { name: 'تعيين الخيار 4 إجابةً صحيحة' })).toBeNull();

    // Removing the MARKED option resets the mark and shows the re-pick
    // nudge instead of silently pointing at a neighbor.
    fireEvent.click(screen.getByRole('button', { name: 'إزالة الخيار 3' }));
    expect(
      screen.getByText('حُذِف الخيار المحدَّد كإجابة صحيحة — حدِّد الإجابة الصحيحة من جديد'),
    ).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'تعيين الخيار 1 إجابةً صحيحة' })).not.toBeChecked();
    expect(screen.getByRole('radio', { name: 'تعيين الخيار 2 إجابةً صحيحة' })).not.toBeChecked();

    // Actively re-picking clears the nudge (field re-validation is async —
    // the zod resolver resolves on a microtask, hence waitFor).
    fireEvent.click(screen.getByRole('radio', { name: 'تعيين الخيار 2 إجابةً صحيحة' }));
    await waitFor(() => {
      expect(screen.getByRole('radio', { name: 'تعيين الخيار 2 إجابةً صحيحة' })).toBeChecked();
      expect(
        screen.queryByText('حُذِف الخيار المحدَّد كإجابة صحيحة — حدِّد الإجابة الصحيحة من جديد'),
      ).toBeNull();
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
