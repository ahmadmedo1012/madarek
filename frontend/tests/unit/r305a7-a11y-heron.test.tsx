/**
 * R305-A7 (task 4) — the a11y gate's cross-cutting regression pins.
 *
 * Every pin here binds to a defect the accessibility review CONFIRMED
 * and fixed (task 4, agent a11y-reviewer) — jsdom-assertable attributes,
 * roles, labels and focus behavior only (no computed-style/contrast
 * claims — those are browser-verification items for the parent):
 *
 *   1. VIEWER FOCUS RESTORE — Escape/dismiss of an overlay that OWNS
 *      focus (thumbnail rail, selection→note bar) hands focus back
 *      before the unmount, the r152a A6 P3-4 contract the search bar
 *      already honored. Was: keyboard focus stranded on <body>.
 *   2. ASSISTANT FOCUS RESTORE — the busy window (pending turn /
 *      conversation switch) disables the focused control; the page
 *      restores focus when the window closes, and never steals focus
 *      the user has already moved elsewhere.
 *   3. IN-FLIGHT SUBMITS carry the platform's disabled + aria-disabled
 *      pairing (Button-primitive convention): borrow, return, scan,
 *      upload, annotation save/delete, chat send.
 *   4. LIBRARY COUNT — the toolbar's result count is a polite live
 *      region (the debounced answer announces; it used to be silent).
 *   5. LIST SEMANTICS — the annotations panel's notes and the review
 *      workspace's margin-notes thread render as real lists
 *      (role=list + listitem) — and the role stays OFF in the
 *      pending/error/empty branches (no non-listitem children).
 *   6. OFF-APP LINK — the publications «فتح» link discloses its new
 *      window to assistive tech (G201).
 *
 * Harness: hooks mocked at the useResources boundary (the house
 * pattern); pdfjs-dist mocked (the PdfViewer.test.tsx pattern); the
 * REAL auth store seeded via setState.
 */
import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import PdfViewer from '../../src/components/pdf/PdfViewer';
import AnnotationsPanel from '../../src/components/pdf/AnnotationsPanel';
import LibraryPage from '../../src/pages/student/LibraryPage';
import StudentResearchPage from '../../src/pages/student/ResearchPage';
import AiAssistantPage from '../../src/pages/student/AiAssistantPage';
import ResearchReviewPage from '../../src/pages/teacher/ResearchReviewPage';
import { useAuthStore, type AuthUser } from '../../src/stores/auth.store';

/* ── shared hook mocks (the union every page in this file needs) ──── */

const mocks = vi.hoisted(() => ({
  // library
  books: { data: { data: [] as unknown[], meta: { page: 1, limit: 24, total: 0, totalPages: 1 } }, isPending: false, isError: false, error: null, refetch: () => undefined },
  published: { data: [] as unknown[], isPending: false, isError: false, error: null, refetch: () => undefined },
  researchSearch: { data: undefined as undefined, isPending: false, isError: false, error: null, refetch: () => undefined },
  loans: { data: [] as unknown[], isPending: false, isError: false, error: null, refetch: () => undefined },
  borrow: { mutateAsync: vi.fn(), isPending: false },
  returnLoan: { mutateAsync: vi.fn(), isPending: false },
  // student research
  my: { data: [] as unknown[], isPending: false, isError: false, error: null as unknown, refetch: () => undefined },
  enrollments: { data: [] as unknown[], isPending: false, isError: false, error: null as unknown, refetch: () => undefined },
  upload: { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() },
  uploadFile: { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() },
  scan: { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() },
  // assistant
  chat: { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() },
  aiConfig: { data: { provider: 'openrouter', model: 'openrouter/free' }, isPending: false, isError: false },
  gaps: { data: [] as unknown[], isPending: false, isError: false, refetch: () => undefined },
  conversations: { data: [] as Array<{ id: string; title: string | null; createdAt: string }>, isPending: false, isError: false, refetch: () => undefined },
  delConversation: { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() },
  fetchMessages: vi.fn(async (_id: string) => []),
  // teacher review (+ AnnotationsPanel's own three)
  queue: { data: [] as unknown[], isPending: false, isError: false, error: null, refetch: () => undefined },
  grade: { isPending: false, mutateAsync: vi.fn() },
  publish: { isPending: false, mutateAsync: vi.fn() },
  profile: { data: null as unknown, isPending: false, isError: false, error: null, refetch: () => undefined },
  annotations: { data: [] as unknown[], isPending: false, isError: false, error: null, refetch: () => undefined },
  createAnnotation: { isPending: false, isError: false, error: null as unknown, mutate: vi.fn() },
  deleteAnnotation: { isPending: false, isError: false, error: null as unknown, mutate: vi.fn() },
}));

vi.mock('../../src/hooks/useResources', () => ({
  useBooks: () => mocks.books,
  usePublishedResearch: () => mocks.published,
  useResearchSearch: () => mocks.researchSearch,
  useMyLoans: () => mocks.loans,
  useBorrowBook: () => mocks.borrow,
  useReturnLoan: () => mocks.returnLoan,
  useMyResearch: () => mocks.my,
  useMyEnrollments: () => mocks.enrollments,
  useUploadPaper: () => mocks.upload,
  useUploadPaperFile: () => mocks.uploadFile,
  useScanPaper: () => mocks.scan,
  useAiChat: () => mocks.chat,
  useAiConfig: () => mocks.aiConfig,
  useGaps: () => mocks.gaps,
  useAiConversations: () => mocks.conversations,
  useDeleteAiConversation: () => mocks.delConversation,
  fetchAiConversationMessages: (id: string) => mocks.fetchMessages(id),
  useResearchQueue: () => mocks.queue,
  useGradePaper: () => mocks.grade,
  usePublishPaper: () => mocks.publish,
  useMyTeacherProfile: () => mocks.profile,
  useAnnotations: () => mocks.annotations,
  useCreateAnnotation: () => mocks.createAnnotation,
  useDeleteAnnotation: () => mocks.deleteAnnotation,
}));

/* ── pdfjs boundary (PdfViewer.test.tsx pattern) ──────────────────── */

const getDocumentMock = vi.hoisted(() => vi.fn());

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: (...args: unknown[]) => getDocumentMock(...args),
  TextLayer: class {
    async render() { return undefined; }
  },
}));

function makeDoc(pageTexts: string[]) {
  return {
    numPages: pageTexts.length,
    getPage: vi.fn(async (n: number) => ({
      getViewport: () => ({ width: 612, height: 792 }),
      getTextContent: async () => ({ items: [{ str: pageTexts[n - 1] ?? '' }] }),
      render: () => ({ promise: Promise.resolve(), cancel: () => {} }),
    })),
    destroy: vi.fn(),
  };
}

function taskFor(doc: unknown) {
  return { promise: Promise.resolve(doc), destroy: vi.fn() };
}

/* ── fixtures ─────────────────────────────────────────────────────── */

const TEACHER: AuthUser = {
  id: 't1', role: 'TEACHER', email: 't@zu.edu.ly',
  firstName: 'سالم', lastName: 'الطاهر',
};
const STUDENT: AuthUser = {
  id: 's1', role: 'STUDENT', email: 's@zu.edu.ly',
  firstName: 'آمنة', lastName: 'العبيدي',
};

function bookFixture(over: Record<string, unknown> = {}) {
  return {
    id: 'b1', title: 'كتاب الشبكات', author: 'مؤلف تجريبي', category: 'prog',
    availableCopies: 2, totalCopies: 5, rating: null, themeColor: null,
    ...over,
  };
}

function loanFixture(over: Record<string, unknown> = {}) {
  const now = Date.now();
  return {
    id: 'l1', status: 'ACTIVE',
    borrowedAt: new Date(now - 5 * 86_400_000).toISOString(),
    dueAt: new Date(now + 9 * 86_400_000).toISOString(),
    book: bookFixture(),
    ...over,
  };
}

function paperFixture(over: Record<string, unknown> = {}) {
  return {
    id: 'p1', title: 'تحليل أداء قواعد البيانات الموزعة', abstract: null,
    fileUrl: null, status: 'UPLOADED', plagiarismPct: null, aiContentPct: null,
    grade: null, feedback: null,
    uploadedAt: new Date(Date.now() - 86_400_000).toISOString(),
    scannedAt: null, gradedAt: null, publishedAt: null,
    student: { id: 'st1', firstName: 'آمنة', lastName: 'العبيدي', avatarInitials: null, avatarColor: null },
    reviewer: null,
    offering: { id: 'off1', course: { name: 'هندسة البرمجيات', code: 'SE301' } },
    ...over,
  };
}

function annotationFixture(over: Record<string, unknown> = {}) {
  return {
    id: 'a1', page: 3, comment: 'ملاحظة على المقدمة', color: '#B57438',
    createdAt: new Date(Date.now() - 3_600_000).toISOString(),
    author: { id: 't1', firstName: 'سالم', lastName: 'الطاهر', role: 'TEACHER', avatarInitials: 'سط', avatarColor: null },
    ...over,
  };
}

function reviewNoteFixture(over: Record<string, unknown> = {}) {
  return {
    id: 'n1', page: 2, comment: 'ثبّت المرجع في الصفحة الأولى.',
    createdAt: new Date(Date.now() - 7_200_000).toISOString(),
    author: { id: 't1', firstName: 'سالم', lastName: 'الطاهر' },
    ...over,
  };
}

/* ── render helpers ───────────────────────────────────────────────── */

const page = (node: React.ReactNode) => <MemoryRouter>{node}</MemoryRouter>;

beforeAll(() => {
  // jsdom has no canvas — a null 2d context keeps the render path
  // graceful (PdfViewer.test.tsx pattern); the viewer pins only need
  // the LOADED state (toolbar + thumbnails), not painted pages.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => null,
  );
  // jsdom ships no scrollIntoView (the thumbnails' active-follow).
  const elProto = Element.prototype as Element & { scrollIntoView?: () => void };
  elProto.scrollIntoView = vi.fn();
  // jsdom ships no scrollTo (the assistant's auto-scroll effect).
  window.HTMLElement.prototype.scrollTo = () => undefined;
});

afterAll(() => {
  vi.restoreAllMocks();
  delete (Element.prototype as Partial<Element> & { scrollIntoView?: () => void }).scrollIntoView;
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  getDocumentMock.mockReset();
  act(() => { useAuthStore.setState({ user: null }); });
});

/* ═══ 1 · PdfViewer — Escape/dismiss hands focus back ═══════════════ */

describe('PdfViewer — overlay close never strands keyboard focus (r152a contract, extended)', () => {
  it('Escape with focus INSIDE the thumbnail rail restores focus to the rail toggle', async () => {
    getDocumentMock.mockReturnValueOnce(taskFor(makeDoc(['أولى', 'ثانية'])));
    render(<PdfViewer src="/papers/x.pdf" />);
    await screen.findByText('من 2');

    const toggle = screen.getByRole('button', { name: 'مصغّرات الصفحات' });
    fireEvent.click(toggle);
    const rail = screen.getByRole('navigation', { name: 'مصغّرات الصفحات' });
    const thumb = screen.getByRole('button', { name: 'الانتقال إلى الصفحة 1' });

    thumb.focus(); // a keyboard user tabbed into the rail
    expect(document.activeElement).toBe(thumb);

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('navigation', { name: 'مصغّرات الصفحات' })).toBeNull();
    // The focus did NOT fall to <body> — it is back on the toggle.
    expect(document.activeElement).toBe(toggle);
    void rail;
  });

  it('Escape with focus INSIDE the selection bar restores focus to the viewer surface', async () => {
    getDocumentMock.mockReturnValueOnce(taskFor(makeDoc(['نص للقراءة'])));
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    const view = render(<PdfViewer src="/papers/x.pdf" onAnnotateSelection={vi.fn()} />);
    await screen.findByText('من 1');

    const restore = vi.spyOn(document, 'getSelection').mockReturnValue({
      isCollapsed: false,
      anchorNode: view.container.querySelector('.pdf-textLayer'),
      toString: () => 'نص محدد للقراءة',
      removeAllRanges: () => {},
    } as unknown as Selection);
    try {
      await act(async () => { document.dispatchEvent(new Event('selectionchange')); });
      const dismiss = await screen.findByRole('button', { name: 'تجاهل التحديد' });

      dismiss.focus();
      expect(document.activeElement).toBe(dismiss);

      fireEvent.keyDown(document.body, { key: 'Escape' });
      expect(screen.queryByRole('button', { name: 'تجاهل التحديد' })).toBeNull();
      // The bar unmounted with focus already parked on the viewer.
      const viewer = view.container.querySelector('.pdf-viewer');
      expect(document.activeElement).toBe(viewer);
    } finally {
      restore.mockRestore();
    }
  });

  it('the dismiss BUTTON (keyboard submit, not only Escape) restores focus too', async () => {
    getDocumentMock.mockReturnValueOnce(taskFor(makeDoc(['نص للقراءة'])));
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    const view = render(<PdfViewer src="/papers/x.pdf" onAnnotateSelection={vi.fn()} />);
    await screen.findByText('من 1');

    const restore = vi.spyOn(document, 'getSelection').mockReturnValue({
      isCollapsed: false,
      anchorNode: view.container.querySelector('.pdf-textLayer'),
      toString: () => 'نص محدد للقراءة',
      removeAllRanges: () => {},
    } as unknown as Selection);
    try {
      await act(async () => { document.dispatchEvent(new Event('selectionchange')); });
      const dismiss = await screen.findByRole('button', { name: 'تجاهل التحديد' });
      dismiss.focus();
      fireEvent.click(dismiss);
      expect(screen.queryByRole('button', { name: 'تجاهل التحديد' })).toBeNull();
      expect(document.activeElement).toBe(view.container.querySelector('.pdf-viewer'));
    } finally {
      restore.mockRestore();
    }
  });
});

/* ═══ 2 · AiAssistantPage — the busy-window focus restore ═══════════ */

describe('AiAssistantPage — the busy window never strands the keyboard user', () => {
  it('a completed turn hands focus back to the composer textarea', async () => {
    const view = render(page(<AiAssistantPage />));
    const textarea = screen.getByLabelText('اكتب سؤالك للمساعد') as HTMLTextAreaElement;
    textarea.focus();
    expect(document.activeElement).toBe(textarea);

    // jsdom cannot express the real browser strand (disabling the
    // focused control drops focus to <body> — but jsdom neither
    // auto-drops it nor honors blur() on a disabled element), so the
    // pin simulates the strand: focus is on <body> while the window is
    // busy. The contract under test is the RESTORE on window close.
    textarea.blur();
    expect(document.activeElement).toBe(document.body);

    // The turn goes in flight → the composer disables (the honest state).
    mocks.chat = { isPending: true, isError: false, error: null, mutateAsync: vi.fn() };
    view.rerender(page(<AiAssistantPage />));
    await waitFor(() => expect(textarea.disabled).toBe(true));
    expect(document.activeElement).toBe(document.body);

    // The reply lands → the composer re-enables → focus is RESTORED.
    mocks.chat = { isPending: false, isError: false, error: null, mutateAsync: vi.fn() };
    view.rerender(page(<AiAssistantPage />));
    await waitFor(() => expect(textarea.disabled).toBe(false));
    expect(document.activeElement).toBe(textarea);
  });

  it('focus the user MOVED during the busy window is never stolen back', async () => {
    const view = render(page(<AiAssistantPage />));
    const textarea = screen.getByLabelText('اكتب سؤالك للمساعد') as HTMLTextAreaElement;
    textarea.focus();

    mocks.chat = { isPending: true, isError: false, error: null, mutateAsync: vi.fn() };
    view.rerender(page(<AiAssistantPage />));
    await waitFor(() => expect(textarea.disabled).toBe(true));

    // During the window the user focus-moved to the (still focusable)
    // transcript scroller — the restore must respect that choice.
    const log = screen.getByRole('log', { name: 'سجلّ المحادثة مع المساعد' });
    log.focus();

    mocks.chat = { isPending: false, isError: false, error: null, mutateAsync: vi.fn() };
    view.rerender(page(<AiAssistantPage />));
    await waitFor(() => expect(textarea.disabled).toBe(false));
    expect(document.activeElement).toBe(log);
  });

  it('the in-flight send carries disabled + aria-disabled (the platform pairing)', async () => {
    const view = render(page(<AiAssistantPage />));
    const send = screen.getByRole('button', { name: 'إرسال' }) as HTMLButtonElement;
    // Idle: disabled only because the input is empty — no aria-disabled.
    expect(send.disabled).toBe(true);
    expect(send).not.toHaveAttribute('aria-disabled');

    fireEvent.change(screen.getByLabelText('اكتب سؤالك للمساعد'), { target: { value: 'سؤال تجريبي' } });
    expect(send.disabled).toBe(false);

    // The turn goes in flight → the pairing appears.
    mocks.chat = { isPending: true, isError: false, error: null, mutateAsync: vi.fn() };
    view.rerender(page(<AiAssistantPage />));
    await waitFor(() => expect(send.disabled).toBe(true));
    expect(send).toHaveAttribute('aria-disabled', 'true');
  });
});

/* ═══ 3 · LibraryPage — the live count + in-flight pairing ══════════ */

describe('LibraryPage — async state announces (count live region + aria-disabled)', () => {
  it('the toolbar result count is a polite live region', () => {
    render(page(<LibraryPage />));
    const count = document.querySelector('.rs-count');
    expect(count).not.toBeNull();
    expect(count).toHaveAttribute('aria-live', 'polite');
  });

  it('an in-flight borrow carries disabled + aria-disabled', () => {
    mocks.books = {
      data: { data: [bookFixture()], meta: { page: 1, limit: 24, total: 1, totalPages: 1 } },
      isPending: false, isError: false, error: null, refetch: () => undefined,
    };
    mocks.borrow = { mutateAsync: vi.fn(), isPending: true };
    render(page(<LibraryPage />));

    const btn = screen.getByRole('button', { name: 'استعارة كتاب الشبكات' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn).toHaveAttribute('aria-disabled', 'true');
  });

  it('an in-flight return carries disabled + aria-disabled', () => {
    mocks.loans = { data: [loanFixture()], isPending: false, isError: false, error: null, refetch: () => undefined };
    mocks.returnLoan = { mutateAsync: vi.fn(), isPending: true };
    render(page(<LibraryPage />));

    const btn = screen.getByRole('button', { name: 'إرجاع كتاب الشبكات' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn).toHaveAttribute('aria-disabled', 'true');
  });
});

/* ═══ 4 · StudentResearchPage — in-flight scan + upload submit ══════ */

describe('StudentResearchPage — in-flight submits carry the platform pairing', () => {
  it('the scan start goes disabled + aria-disabled with its pending voice while in flight', async () => {
    mocks.my = { data: [paperFixture()], isPending: false, isError: false, error: null, refetch: () => undefined };
    // A start request that stays in flight — the honest window the
    // pairing must cover (the button stays MOUNTED, never vanishes).
    mocks.scan = { isPending: false, isError: false, error: null, mutateAsync: vi.fn(() => new Promise(() => {})) };
    render(page(<StudentResearchPage />));

    const idle = screen.getByRole('button', { name: 'ابدأ الفحص الآن' });
    expect(idle).not.toHaveAttribute('aria-disabled');

    fireEvent.click(idle);
    const btn = await screen.findByRole('button', { name: 'جارٍ بدء الفحص…' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    expect(btn).toHaveAttribute('aria-disabled', 'true');
  });

  it('an idle scan button does NOT fake the in-flight state', () => {
    mocks.my = { data: [paperFixture()], isPending: false, isError: false, error: null, refetch: () => undefined };
    render(page(<StudentResearchPage />));

    const btn = screen.getByRole('button', { name: 'ابدأ الفحص الآن' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(false);
    expect(btn).not.toHaveAttribute('aria-disabled');
  });

  it('the upload modal\'s submit is disabled + aria-disabled while the upload is pending', () => {
    mocks.my = { data: [paperFixture()], isPending: false, isError: false, error: null, refetch: () => undefined };
    mocks.upload = { isPending: true, isError: false, error: null, mutateAsync: vi.fn() };
    render(page(<StudentResearchPage />));

    fireEvent.click(screen.getByRole('button', { name: 'رفع بحث جديد' }));
    const title = screen.getByPlaceholderText('مثال: تطبيق أنماط التصميم في تطبيقات الويب');
    fireEvent.change(title, { target: { value: 'عنوان صالح للتجربة' } });

    const submit = screen.getByRole('button', { name: 'جارٍ الرفع…' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(submit).toHaveAttribute('aria-disabled', 'true');
  });
});

/* ═══ 5 · AnnotationsPanel — list semantics + in-flight save ════════ */

describe('AnnotationsPanel — the notes are a real list (and the role stays honest)', () => {
  it('rendered notes form role=list with role=listitem articles', () => {
    act(() => { useAuthStore.setState({ user: STUDENT }); });
    mocks.annotations = { data: [annotationFixture(), annotationFixture({ id: 'a2', page: 5 })], isPending: false, isError: false, error: null, refetch: () => undefined };
    render(<AnnotationsPanel paperId="p1" currentPage={1} numPages={10} onJumpToPage={vi.fn()} />);

    const list = document.querySelector('.annotations-list');
    expect(list).toHaveAttribute('role', 'list');
    const items = list!.querySelectorAll('.annotation-item');
    expect(items).toHaveLength(2);
    for (const item of items) expect(item).toHaveAttribute('role', 'listitem');
  });

  it('the pending skeleton branch carries NO list role (no fake listitems)', () => {
    mocks.annotations = { data: [], isPending: true, isError: false, error: null, refetch: () => undefined };
    render(<AnnotationsPanel paperId="p1" currentPage={1} numPages={10} onJumpToPage={vi.fn()} />);
    expect(document.querySelector('.annotations-list')).not.toHaveAttribute('role');
  });

  it('an inline delete failure drops the list role (the error row is not a listitem)', () => {
    act(() => { useAuthStore.setState({ user: STUDENT }); });
    mocks.annotations = { data: [annotationFixture()], isPending: false, isError: false, error: null, refetch: () => undefined };
    mocks.deleteAnnotation = { isPending: false, isError: true, error: new Error('forced'), mutate: vi.fn() };
    render(<AnnotationsPanel paperId="p1" currentPage={1} numPages={10} onJumpToPage={vi.fn()} />);
    expect(document.querySelector('.annotations-list')).not.toHaveAttribute('role');
  });

  it('an in-flight save carries disabled + aria-disabled', () => {
    act(() => { useAuthStore.setState({ user: TEACHER }); });
    mocks.createAnnotation = { isPending: true, isError: false, error: null, mutate: vi.fn() };
    render(<AnnotationsPanel paperId="p1" currentPage={1} numPages={10} onJumpToPage={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'إضافة ملاحظة' }));
    fireEvent.change(screen.getByLabelText('نص الملاحظة'), { target: { value: 'ملاحظة تجريبية' } });

    const save = screen.getByRole('button', { name: 'جارٍ…' }) as HTMLButtonElement;
    expect(save.disabled).toBe(true);
    expect(save).toHaveAttribute('aria-disabled', 'true');
  });
});

/* ═══ 6 · ResearchReviewPage — notes list + the off-app disclosure ══ */

describe('ResearchReviewPage — the margin-notes thread and the external link', () => {
  it('the margin-notes thread renders as role=list with role=listitem rows', async () => {
    mocks.queue = { data: [paperFixture({ status: 'CHECKS_PASSED' })], isPending: false, isError: false, error: null, refetch: () => undefined };
    mocks.annotations = {
      data: [reviewNoteFixture(), reviewNoteFixture({ id: 'n2', comment: 'الملخص يحتاج ضبطاً.' })],
      isPending: false, isError: false, error: null, refetch: () => undefined,
    };
    render(page(<ResearchReviewPage />));

    // Desktop preselection needs matchMedia ≥921 — select explicitly
    // (the queue row's accessible name is «title — status»).
    fireEvent.click(screen.getByRole('button', { name: 'تحليل أداء قواعد البيانات الموزعة — بانتظار التقييم' }));
    await screen.findByRole('heading', { name: /ملاحظات على البحث/ });

    const notes = document.querySelector('.rs-work-notes');
    expect(notes).not.toBeNull();
    expect(notes).toHaveAttribute('role', 'list');
    const rows = notes!.querySelectorAll('.annotation-row');
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row).toHaveAttribute('role', 'listitem');
  });

  it('the publications «فتح» link discloses its new window to assistive tech', async () => {
    mocks.profile = {
      data: {
        publications: [{ title: 'ورقة محكّمة', year: 2025, venue: 'مجلة علمية', url: 'https://example.com/paper' }],
        certifications: [], awards: [], yearsExperience: 4,
      },
      isPending: false, isError: false, error: null, refetch: () => undefined,
    };
    render(page(<ResearchReviewPage />));

    fireEvent.click(screen.getByRole('tab', { name: 'منشوراتي' }));
    const link = await screen.findByRole('link', { name: 'فتح — يفتح في نافذة جديدة' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noreferrer');
    // The visible label stays the single verb; the disclosure rides the
    // accessible name only.
    expect(link.textContent).toBe('فتح');
  });
});
