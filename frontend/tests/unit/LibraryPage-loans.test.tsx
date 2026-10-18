/**
 * r155b — LibraryPage borrow/return wiring.
 *
 * The backend shipped the full loan lifecycle (POST /library/loans,
 * POST /library/loans/:id/return, GET /me/loans — catalog.routes.ts)
 * while the page rendered loan KPIs with zero affordance. These pins
 * hold the new contract:
 *   1. «استعارة» renders per card and honors availability — enabled
 *      with copies left, disabled + honest title/aria when none.
 *   2. Clicking borrow fires the mutation with the book id; the
 *      server's due date lands in the success toast, and a 409's
 *      Arabic message surfaces verbatim through the error toast.
 *   3. The active-loans card lists open loans (title + due date +
 *      «إرجاع») and the empty state names the feature instead of
 *      hiding it.
 *   4. ?tab=research deep-links the research tab (the parameter the
 *      document viewer's back fallback always sent) and the paper
 *      links now carry back=/student/library?tab=research.
 *
 * Hooks are mocked at the useResources boundary + lib/toast is mocked
 * so the toast copy itself is assertable (house patterns).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import LibraryPage from '../../src/pages/student/LibraryPage';
import { toast } from '../../src/lib/toast';
import { formatDateAr } from '../../src/lib/format';

const mocks = vi.hoisted(() => ({
  books: [] as Array<Record<string, unknown>>,
  loans: [] as Array<Record<string, unknown>>,
  research: [] as Array<Record<string, unknown>>,
  borrow: { mutateAsync: vi.fn(), isPending: false },
  returnLoan: { mutateAsync: vi.fn(), isPending: false },
}));

vi.mock('../../src/hooks/useResources', () => ({
  // r184: the books query is a PAGINATED ENVELOPE ({data, meta}) —
  // the stub derives meta from the mocked rows so card rendering,
  // the KPI total, and the pager presence all stay consistent.
  useBooks: () => ({
    data: {
      data: mocks.books,
      meta: {
        page: 1,
        limit: 24,
        total: mocks.books.length,
        totalPages: Math.max(1, Math.ceil(mocks.books.length / 24)),
      },
    },
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  usePublishedResearch: () => ({ data: mocks.research, isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useResearchSearch: () => ({ data: undefined, isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useMyLoans: () => ({ data: mocks.loans, isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useBorrowBook: () => mocks.borrow,
  useReturnLoan: () => mocks.returnLoan,
}));

vi.mock('../../src/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warning: vi.fn(), dismiss: vi.fn() },
}));

// كل التواريخ نسبية إلى وقت التشغيل الفعلي — لا ساعة مزيّفة (waitFor
// يحتاج مؤقّتات حقيقيّة)، والمواعيد بعشرات الأيّام لا تتقارب بين
// التثبيت والتنفيذ.
const nowMs = () => Date.now();

function bookFixture(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'bk-1',
    title: 'أساسيات الشبكات',
    author: 'د. سالم الطاهر',
    category: 'net',
    rating: '4.6',
    totalCopies: 3,
    availableCopies: 2,
    ...over,
  };
}

function loanFixture(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'ln-1',
    bookId: 'bk-1',
    status: 'ACTIVE',
    borrowedAt: new Date(nowMs() - 3 * 86_400_000).toISOString(),
    dueAt: new Date(nowMs() + 10 * 86_400_000).toISOString(),
    returnedAt: null,
    book: { id: 'bk-1', title: 'أساسيات الشبكات', author: 'د. سالم الطاهر', category: 'net' },
    ...over,
  };
}

function renderPage(initialEntry = '/student/library') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LibraryPage />
    </MemoryRouter>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LibraryPage — borrow affordance per availability', () => {
  beforeEach(() => {
    mocks.books = [
      bookFixture(),
      bookFixture({ id: 'bk-2', title: 'أمن المعلومات', category: 'sec', availableCopies: 0, rating: null }),
    ];
    mocks.loans = [];
  });

  it('renders «استعارة» enabled for a book with available copies', () => {
    renderPage();

    const btn = screen.getByRole('button', { name: 'استعارة أساسيات الشبكات' });
    expect(btn).toBeEnabled();
  });

  it('disables the borrow button when no copies remain — with the honest title/aria naming why', () => {
    renderPage();

    const btn = screen.getByRole('button', {
      name: 'استعارة أمن المعلومات — لا توجد نسخ متاحة حالياً',
    });
    expect(btn).toBeDisabled();
    expect(btn).toHaveAttribute('title', 'لا توجد نسخ متاحة للاستعارة حالياً');
  });

  it('clicking borrow fires the mutation with the book id and toasts the server due date', async () => {
    const dueAt = new Date(nowMs() + 14 * 86_400_000).toISOString();
    mocks.borrow.mutateAsync.mockResolvedValueOnce({
      id: 'ln-9', bookId: 'bk-1', status: 'ACTIVE',
      borrowedAt: new Date().toISOString(), dueAt, returnedAt: null,
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'استعارة أساسيات الشبكات' }));

    expect(mocks.borrow.mutateAsync).toHaveBeenCalledWith('bk-1');
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
    // The 14-day due date the backend just assigned is told to the student.
    expect(toast.success).toHaveBeenCalledWith(
      expect.stringContaining(formatDateAr(dueAt)),
      expect.objectContaining({ title: 'تمّت الاستعارة' }),
    );
  });

  it('a failed borrow surfaces the Arabic 409 message from the server via the error toast', async () => {
    mocks.borrow.mutateAsync.mockRejectedValueOnce({
      response: { data: { error: { code: 'CONFLICT', message: 'استعرت هذا الكتاب مسبقاً ولم تُعده بعد' } } },
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'استعارة أساسيات الشبكات' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    expect(toast.error).toHaveBeenCalledWith('استعرت هذا الكتاب مسبقاً ولم تُعده بعد');
  });
});

describe('LibraryPage — active loans list + return action', () => {
  beforeEach(() => {
    mocks.books = [bookFixture()];
    mocks.loans = [
      loanFixture(),
      // A RETURNED row must not render in the open-loans card.
      loanFixture({
        id: 'ln-2', status: 'RETURNED',
        returnedAt: new Date(nowMs() - 86_400_000).toISOString(),
      }),
    ];
  });

  it('lists open loans with the due date and a per-row «إرجاع» action', () => {
    renderPage();

    expect(screen.getByText('استعاراتي النشطة')).toBeInTheDocument();
    // The title shows three times by design (r186): the jacket
    // (aria-hidden, visual identity) + the grid card body + the
    // loan row. Before r186 it was twice — card + loan row.
    expect(screen.getAllByText('أساسيات الشبكات')).toHaveLength(3);
    const due = new Date(nowMs() + 10 * 86_400_000).toISOString();
    expect(screen.getByText(formatDateAr(due))).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إرجاع أساسيات الشبكات' })).toBeEnabled();
    // Exactly one loan row — the RETURNED one stays out.
    expect(screen.getAllByRole('button', { name: 'إرجاع أساسيات الشبكات' })).toHaveLength(1);
  });

  it('clicking «إرجاع» fires the return mutation with the loan id', async () => {
    mocks.returnLoan.mutateAsync.mockResolvedValueOnce({
      id: 'ln-1', bookId: 'bk-1', status: 'RETURNED',
      borrowedAt: new Date(nowMs() - 3 * 86_400_000).toISOString(),
      dueAt: new Date(nowMs() + 10 * 86_400_000).toISOString(),
      returnedAt: new Date().toISOString(),
    });
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'إرجاع أساسيات الشبكات' }));

    expect(mocks.returnLoan.mutateAsync).toHaveBeenCalledWith('ln-1');
    await waitFor(() => expect(toast.success).toHaveBeenCalledTimes(1));
  });

  it('a failed return surfaces the Arabic error message honestly', async () => {
    mocks.returnLoan.mutateAsync.mockRejectedValueOnce(new Error('network'));
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'إرجاع أساسيات الشبكات' }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledTimes(1));
    // Non-API failure → the caller's Arabic fallback, never Latin prose.
    expect(toast.error).toHaveBeenCalledWith(
      'تعذَّر الإرجاع — تحقّق من اتصالك وحاول مرة أخرى.',
    );
  });

  it('shows the honest empty state when there are no open loans', () => {
    mocks.loans = [];
    renderPage();

    expect(screen.getByText('لا استعارات نشطة')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /إرجاع/ })).toBeNull();
  });
});

describe('LibraryPage — ?tab=research deep link (r155b)', () => {
  beforeEach(() => {
    mocks.books = [bookFixture()];
    mocks.loans = [];
    mocks.research = [
      {
        id: 'pp-1',
        title: 'تحليل أداء الشبكات اللاسلكيّة',
        abstract: null,
        fileUrl: 'https://files.example.com/uploads/paper-42.pdf',
        status: 'PUBLISHED',
        plagiarismPct: null,
        aiContentPct: null,
        grade: 18,
        uploadedAt: new Date(nowMs() - 20 * 86_400_000).toISOString(),
        publishedAt: new Date(nowMs() - 2 * 86_400_000).toISOString(),
        student: { id: 'st-1', firstName: 'آمنة', lastName: 'العبيدي' },
        offering: null,
      },
    ];
  });

  it('opens on the research tab when ?tab=research arrives (the viewer back fallback)', () => {
    renderPage('/student/library?tab=research');

    expect(screen.getByRole('tab', { name: /بحوث الطلاب/ })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'الكتب' })).toHaveAttribute('aria-selected', 'false');
    // The books-only loans card stays on the books panel.
    expect(screen.queryByText('استعاراتي النشطة')).toBeNull();
  });

  it('falls back to the books tab for an unknown ?tab value', () => {
    renderPage('/student/library?tab=unknown');

    expect(screen.getByRole('tab', { name: 'الكتب' })).toHaveAttribute('aria-selected', 'true');
  });

  it('the paper link preserves the research-tab context in its back param', () => {
    renderPage('/student/library?tab=research');

    const link = screen.getByRole('link', { name: /اقرأ البحث كاملاً/ });
    // Returning from the viewer lands back on the SAME tab the reader
    // came from — the old link dropped the param and the page ignored it.
    expect(link.getAttribute('href')).toContain('back=%2Fstudent%2Flibrary%3Ftab%3Dresearch');
  });
});
