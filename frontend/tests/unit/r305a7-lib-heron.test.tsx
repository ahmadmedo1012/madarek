/**
 * R305-A7 (task 3-a) — LibraryPage «Heron» scoping + honesty pins.
 *
 * The scoped sheet (r305-research-pdf-ai.css) styles every rule under
 * the `.r305rp` page-root marker, so a page that forgets the marker
 * renders unstyled — and a page that carries it on only SOME of its
 * branches flashes an unstyled state on every load/error. These pins
 * hold the library page to the contract:
 *
 *   1. MARKER PRESENCE — the books tab (default), the research tab
 *      (deep link), and the open mobile filter Sheet all leave exactly
 *      ONE `.r305rp` root mounted.
 *   2. THE HERO CONTRACT — the research tab's archive summary is the
 *      page's ONE deep band (books tab: none), with the metric-label
 *      register instead of the old StatLine.
 *   3. STATE NEVER COLOR ALONE — book availability and loan-state
 *      chips pair the tone dot with the Arabic label.
 *   4. EMPTY ≠ ERROR ≠ LOADING — the loans empty is the technical
 *      .r305rp-empty surface; the loading skeleton keeps aria-busy.
 *   5. REGRESSION (search-empty honesty) — the research empty state
 *      names the search that ACTUALLY ran: a no-hits answer only once
 *      the debounced server search resolved empty; an unfinished
 *      (pre-debounce) query never mislabels an empty archive as a
 *      failed search (the old markup keyed the variant off the raw q).
 *   6. ROW DISCIPLINE — long Arabic titles with mixed Latin/numerals
 *      render whole inside the clamped title element; the sheet pins
 *      min-inline-size/line-clamp (source-level).
 *   7. IMPORT WIRING — the page loads the Heron sheet directly after
 *      its family sheet (source order inside @layer pages is what lets
 *      it win the equal-specificity ties).
 *
 * Harness: the same hook-mock boundary the neighboring library tests
 * established (useResources at the module boundary).
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import LibraryPage from '../../src/pages/student/LibraryPage';

const mocks = vi.hoisted(() => ({
  books: [] as Array<Record<string, unknown>>,
  loans: [] as Array<Record<string, unknown>>,
  research: [] as Array<Record<string, unknown>>,
  search: { data: undefined as { data: Array<Record<string, unknown>> } | undefined, isPending: false, isError: false, error: null as unknown, refetch: vi.fn() },
  booksQuery: { isPending: false, isError: false, error: null as unknown, refetch: vi.fn() },
  loansQuery: { isPending: false, isError: false, error: null as unknown, refetch: vi.fn() },
}));

vi.mock('../../src/hooks/useResources', () => ({
  useBooks: () => ({
    data: {
      data: mocks.books,
      meta: { page: 1, limit: 24, total: mocks.books.length, totalPages: Math.max(1, Math.ceil(mocks.books.length / 24)) },
    },
    ...mocks.booksQuery,
  }),
  usePublishedResearch: () => ({ data: mocks.research, isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useResearchSearch: () => mocks.search,
  useMyLoans: () => ({ data: mocks.loans, ...mocks.loansQuery }),
  useBorrowBook: () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false }),
  useReturnLoan: () => ({ mutateAsync: vi.fn(), mutate: vi.fn(), isPending: false }),
}));

function renderLibrary(initialEntry = '/student/library') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <LibraryPage />
    </MemoryRouter>,
  );
}

/** matchMedia stub with a controllable narrow result (640px floor). */
function setNarrowViewport(narrow: boolean): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: narrow && query.includes('max-width: 640px'),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
}

function bookFixture(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 'bk-1',
    title: 'أساسيات الشبكات',
    author: 'د. سالم الطاهر',
    category: 'net',
    rating: null,
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
    borrowedAt: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    dueAt: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    returnedAt: null,
    book: { id: 'bk-1', title: 'أساسيات الشبكات', author: 'د. سالم الطاهر', category: 'net' },
    ...over,
  };
}

const PAGE_SRC = resolvePath(__dirname, '../../src/pages/student/LibraryPage.tsx');
const SHEET_SRC = resolvePath(__dirname, '../../src/styles/r305-research-pdf-ai.css');

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.books = [];
  mocks.loans = [];
  mocks.research = [];
  mocks.search = { data: undefined, isPending: false, isError: false, error: null, refetch: vi.fn() };
  mocks.booksQuery = { isPending: false, isError: false, error: null as unknown, refetch: vi.fn() };
  mocks.loansQuery = { isPending: false, isError: false, error: null as unknown, refetch: vi.fn() };
});

/* ══════════════════════════════════════════════════════════════════
   1. Marker presence — every branch
   ══════════════════════════════════════════════════════════════════ */

describe('LibraryPage — the .r305rp marker (R305-A7)', () => {
  it('the books tab (default) mounts exactly ONE marker root around the patterns frame', () => {
    mocks.books = [bookFixture()];
    renderLibrary();

    const roots = document.querySelectorAll('.r305rp');
    expect(roots.length).toBe(1);
    expect(roots[0]!.querySelector('.pf-page')).not.toBeNull();
    expect(
      roots[0]!.querySelector('h1')?.textContent,
    ).toBe('المكتبة الإلكترونية');
  });

  it('the research tab (?tab=research deep link) carries the marker too', () => {
    mocks.research = [];
    renderLibrary('/student/library?tab=research');

    expect(document.querySelectorAll('.r305rp').length).toBe(1);
    expect(screen.getByRole('tab', { name: /بحوث الطلاب/ })).toHaveAttribute('aria-selected', 'true');
  });

  it('the open mobile filter Sheet (a portal OUTSIDE the marker) never mints a second root', async () => {
    setNarrowViewport(true);
    mocks.books = [bookFixture()];
    renderLibrary();

    fireEvent.click(screen.getByRole('button', { name: /^تصفية/ }));
    await screen.findByRole('dialog', { name: 'تصفية الكتب' });

    expect(document.querySelectorAll('.r305rp').length).toBe(1);
  });

  it('a books query error branch keeps the marker (a failed fetch never unstyles the page)', () => {
    mocks.booksQuery = { isPending: false, isError: true, error: new Error('forced'), refetch: vi.fn() };
    renderLibrary();

    expect(document.querySelectorAll('.r305rp').length).toBe(1);
    expect(screen.getByRole('button', { name: /إعادة المحاولة/ })).toBeInTheDocument();
  });
});

/* ══════════════════════════════════════════════════════════════════
   2. The hero contract — ONE deep band, on the research tab only
   ══════════════════════════════════════════════════════════════════ */

describe('LibraryPage — the deep summary band (R305-A7)', () => {
  it('the books tab carries NO deep band', () => {
    mocks.books = [bookFixture()];
    renderLibrary();

    expect(document.querySelector('.r305rp-band--deep')).toBeNull();
  });

  it("the research tab's archive summary is the deep band, in the metric register", () => {
    mocks.research = [
      {
        id: 'pp-1', title: 'بحث أول', abstract: null, fileUrl: null, status: 'PUBLISHED',
        grade: 18, plagiarismPct: null, aiContentPct: null,
        uploadedAt: new Date().toISOString(), publishedAt: new Date().toISOString(),
        student: { id: 'st-1', firstName: 'آمنة', lastName: 'العبيدي' },
        offering: null,
      },
    ];
    renderLibrary('/student/library?tab=research');

    const band = document.querySelector('.r305rp-band--deep');
    expect(band).not.toBeNull();
    // The four archive facts, label-over-value in the mono register.
    for (const label of ['بحوث منشورة', 'مؤلفون طلابيون', 'متوسط التقييم', 'منشورة هذا العام']) {
      expect(band!.textContent).toContain(label);
    }
    expect(band!.querySelectorAll('.r305rp-metric')).toHaveLength(4);
    expect(band!.querySelector('.r305rp-eyebrow')?.textContent).toContain('ملخص الأرشيف');
  });
});

/* ══════════════════════════════════════════════════════════════════
   3. State never color alone — chips pair dot + Arabic label
   ══════════════════════════════════════════════════════════════════ */

describe('LibraryPage — status chips (R305-A7)', () => {
  it('the availability chip pairs the tone dot with «متاح»', () => {
    mocks.books = [bookFixture()];
    renderLibrary();

    const chip = screen.getByText('متاح').closest('.r305rp-chip')!;
    expect(chip).not.toBeNull();
    expect(chip.querySelector('.r305rp-chip-dot')).not.toBeNull();
    expect(chip.className).toContain('r305rp-chip--success');
  });

  it('the loan-state chip pairs the dot with «نشطة»', () => {
    mocks.books = [bookFixture()];
    mocks.loans = [loanFixture()];
    renderLibrary();

    const chip = screen.getByText('نشطة').closest('.r305rp-chip')!;
    expect(chip.querySelector('.r305rp-chip-dot')).not.toBeNull();
    expect(chip.className).toContain('r305rp-chip--success');
  });

  it('an overdue loan reads «متأخر الإرجاع» on the danger chip — label, not just tone', () => {
    mocks.books = [bookFixture()];
    mocks.loans = [loanFixture({
      status: 'OVERDUE',
      dueAt: new Date(Date.now() - 2 * 86_400_000).toISOString(),
    })];
    renderLibrary();

    const chip = screen.getByText('متأخر الإرجاع').closest('.r305rp-chip')!;
    expect(chip.className).toContain('r305rp-chip--danger');
    expect(chip.querySelector('.r305rp-chip-dot')).not.toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════
   4. Empty ≠ error ≠ loading — the technical loans empty
   ══════════════════════════════════════════════════════════════════ */

describe('LibraryPage — the technical empty/loading surfaces (R305-A7)', () => {
  it('no open loans renders the .r305rp-empty surface with the honest line', () => {
    renderLibrary();

    const empty = document.querySelector('.r305rp-empty');
    expect(empty).not.toBeNull();
    expect(empty!.querySelector('.r305rp-eyebrow')?.textContent).toContain('الحالة');
    expect(screen.getByText('لا استعارات نشطة')).toBeInTheDocument();
  });

  it('pending loans render the shape-matched skeleton with aria-busy (never the empty line)', () => {
    mocks.loansQuery = { isPending: true, isError: false, error: null, refetch: vi.fn() };
    renderLibrary();

    expect(document.querySelector('[aria-busy="true"]')).not.toBeNull();
    expect(screen.queryByText('لا استعارات نشطة')).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════
   5. REGRESSION — the research empty state names the search that ran
   ══════════════════════════════════════════════════════════════════ */

describe('LibraryPage — research empty honesty (R305-A7 regression)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('a pre-debounce query never mislabels an empty archive as a failed search', () => {
    renderLibrary('/student/library?tab=research');
    expect(screen.getByText('لا توجد بحوث منشورة بعد')).toBeInTheDocument();

    // Typing has NOT yet fired the server search (250ms debounce).
    fireEvent.change(screen.getByPlaceholderText('ابحث في عنوان البحث، الملخص، أو محتوى البحث الكامل…'), {
      target: { value: 'شبكات' },
    });
    expect(screen.getByText('لا توجد بحوث منشورة بعد')).toBeInTheDocument();
    expect(screen.queryByText('لا توجد نتائج للبحث')).toBeNull();
  });

  it('a resolved empty search answers «لا توجد نتائج للبحث» quoting the SEARCHED term', () => {
    renderLibrary('/student/library?tab=research');
    // The search is mocked to resolve empty BEFORE the debounce fires —
    // then the settle re-render reads it synchronously (fake timers:
    // no waitFor, everything asserts inside act).
    mocks.search = { data: { data: [] }, isPending: false, isError: false, error: null, refetch: vi.fn() };
    fireEvent.change(screen.getByPlaceholderText('ابحث في عنوان البحث، الملخص، أو محتوى البحث الكامل…'), {
      target: { value: 'شبكات' },
    });
    act(() => {
      vi.advanceTimersByTime(250);
    });

    // The search resolved empty → the honest no-hits variant, quoting
    // the debounced term (the one the server actually saw).
    expect(screen.getByText('لا توجد نتائج للبحث')).toBeInTheDocument();
    expect(screen.getByText(/«شبكات»/)).toBeInTheDocument();
    expect(screen.queryByText('لا توجد بحوث منشورة بعد')).toBeNull();
  });
});

/* ══════════════════════════════════════════════════════════════════
   6. Row discipline — long Arabic titles + mixed scripts/numerals
   ══════════════════════════════════════════════════════════════════ */

describe('LibraryPage — long-title row discipline (R305-A7)', () => {
  it('a very long mixed Arabic/Latin/numeral title renders WHOLE inside one title element', () => {
    const longTitle =
      'تحليل أداء الشبكات العصبية العميقة Deep Neural Networks في أنظمة إدارة قواعد البيانات الموزعة DBMS Scale Testing عام 2026 — دراسة تجريبية على العناقيد المحلية والموزعة Part 1/3';
    mocks.books = [bookFixture({ id: 'bk-long', title: longTitle })];
    renderLibrary();

    const titles = screen.getAllByText(longTitle);
    expect(titles.length).toBeGreaterThanOrEqual(1);
    // The row's title element carries the FULL string (no truncation,
    // no duplication) — the CSS clamps the VISUAL lines, not the data.
    expect(titles[0]!.className).toContain('pf-row-title');
    // The sheet pins the min-inline-size + line-clamp discipline.
    const sheet = readFileSync(SHEET_SRC, 'utf8');
    expect(sheet).toMatch(/\.r305rp \.pf-row-title\s*\{[^}]*-webkit-line-clamp/s);
    expect(sheet).toMatch(/\.r305rp \.pf-row-title\s*\{[^}]*min-inline-size:\s*0/s);
  });
});

/* ══════════════════════════════════════════════════════════════════
   7. Import wiring — the Heron sheet loads after the family sheet
   ══════════════════════════════════════════════════════════════════ */

describe('LibraryPage — Heron sheet import wiring (R305-A7)', () => {
  it('r305-research-pdf-ai.css is imported DIRECTLY after research.css', () => {
    const src = readFileSync(PAGE_SRC, 'utf8');
    const researchIdx = src.indexOf("import '../../styles/research.css';");
    const heronIdx = src.indexOf("import '../../styles/r305-research-pdf-ai.css';");
    expect(researchIdx).toBeGreaterThan(-1);
    expect(heronIdx).toBeGreaterThan(researchIdx);
  });
});
