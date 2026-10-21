/**
 * R305-A7 (task 3-c) — the PDF reader as a first-class workspace.
 *
 * Regression pins for every defect the Heron audit confirmed, plus the
 * new scoping/wiring contract of the reader sheet:
 *
 *   1. SEARCH FOLDING — the reader's in-document search ignored the
 *      platform's Arabic normalizer (backend/src/modules/search/
 *      normalize.ts mirrored at lib/search.ts; AGENTS.md §6): a
 *      diacritized/hamza-variant query found nothing. Now both sides
 *      fold, with the contract's «ال» tolerance, and hits carry honest
 *      per-page occurrence counts.
 *   2. MATCH PLACEMENT — search jumped to a page but nothing marked
 *      WHERE the hit is (pdf.css's --highlight-* custom properties were
 *      dead). The matched slices of the text layer now get
 *      mark.r305pdf-hitmark wraps (findController-equivalent).
 *   3. LOAD PROGRESS — the skeleton had no tie to pdf.js's loading
 *      events; onProgress bytes now render a real percentage/KiB line
 *      and clear the moment the document lands (no fake success).
 *   4. PAGE ANNOUNCEMENTS — page flips via buttons/keys announce
 *      «صفحة X من Y» through an sr-only aria-live region.
 *   5. ESCAPE SCOPE — Escape closes EVERY viewer overlay (thumbnails
 *      rail, selection bar), not only the search bar.
 *   6. SELECTION → NOTE — selecting text inside the paper offers ONE
 *      emphasized verb that seeds the annotation composer with the
 *      quote (reviewer-gated); the persisted payload shape
 *      ({page, comment, color}) is untouched.
 *   7. HERON SCOPING — the page root carries `.r305rp` on EVERY
 *      rendered branch and imports r305-research-pdf-ai.css directly
 *      after pdf.css (source order inside @layer pages is the win).
 *
 * pdfjs-dist is mocked at the module boundary (the PdfViewer.test.tsx
 * pattern); useResources is mocked at the hook boundary (the
 * AnnotationsPanel.test.tsx pattern).
 */
import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent, act, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';
import PdfViewer from '../../src/components/pdf/PdfViewer';
import AnnotationsPanel from '../../src/components/pdf/AnnotationsPanel';
import DocumentViewerPage from '../../src/pages/DocumentViewerPage';
import { useAuthStore, type AuthUser } from '../../src/stores/auth.store';
import {
  foldWithIndex,
  matchTerms,
  scanPageItems,
  findFoldedRanges,
  applySearchMarks,
} from '../../src/components/pdf/searchFold';

/* ── pdfjs boundary (PdfViewer.test.tsx pattern) ──────────────────── */

const getDocumentMock = vi.hoisted(() => vi.fn());

vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: (...args: unknown[]) => getDocumentMock(...args),
  // A TextLayer double that actually populates the container — the
  // mark-painting pins need real spans to wrap.
  TextLayer: class {
    private src: { items: Array<{ str?: string }> };
    private container: HTMLElement;
    constructor(cfg: { textContentSource: { items: Array<{ str?: string }> }; container: HTMLElement }) {
      this.src = cfg.textContentSource;
      this.container = cfg.container;
    }
    async render() {
      for (const item of this.src.items) {
        const span = document.createElement('span');
        span.textContent = item.str ?? '';
        this.container.appendChild(span);
      }
    }
  },
}));

const useResourcesMocks = vi.hoisted(() => ({
  annotations: {
    data: [] as unknown[],
    isPending: false,
    isError: false,
    error: null,
    refetch: () => undefined,
  },
  create: { isPending: false, isError: false, error: null as unknown, mutate: (_input: unknown) => undefined },
  delete: { isPending: false, isError: false, error: null as unknown, mutate: (_id: unknown) => undefined },
}));

vi.mock('../../src/hooks/useResources', () => ({
  useAnnotations: () => useResourcesMocks.annotations,
  useCreateAnnotation: () => useResourcesMocks.create,
  useDeleteAnnotation: () => useResourcesMocks.delete,
}));

beforeAll(() => {
  // A minimal 2d context (the null of PdfViewer.test.tsx would kill the
  // render path before the text layer exists) — jsdom has no real
  // canvas, the stub only needs to be truthy and accept setTransform.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(
    () => ({ setTransform: vi.fn() }) as unknown as CanvasRenderingContext2D,
  );
  // jsdom ships no scrollIntoView — stub the browser API (not app code):
  // the thumbnail rail's active-follow effect calls it on the active
  // page button.
  const elProto = Element.prototype as Element & { scrollIntoView?: () => void };
  elProto.scrollIntoView = vi.fn();
});

afterAll(() => {
  vi.restoreAllMocks();
  delete (Element.prototype as Partial<Element> & { scrollIntoView?: () => void }).scrollIntoView;
});

afterEach(() => {
  cleanup();
  getDocumentMock.mockReset();
  useResourcesMocks.annotations = { data: [], isPending: false, isError: false, error: null, refetch: () => undefined };
  useResourcesMocks.create = { isPending: false, isError: false, error: null, mutate: () => undefined };
  useResourcesMocks.delete = { isPending: false, isError: false, error: null, mutate: () => undefined };
  act(() => { useAuthStore.setState({ user: null }); });
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

/** A fake page whose canvas render resolves and whose text is pageTexts[n-1]. */
function makeDoc(pageTexts: string[]) {
  return {
    numPages: pageTexts.length,
    getPage: vi.fn(async (n: number) => ({
      getViewport: () => ({ width: 612, height: 792 }),
      getTextContent: async () => ({ items: [{ str: pageTexts[n - 1] ?? '' }] }),
      // The render task double carries cancel — the viewer cancels
      // superseded renders (audit 11-f P2-9) before/after every flip.
      render: () => ({ promise: Promise.resolve(), cancel: () => {} }),
    })),
    destroy: vi.fn(),
  };
}

function taskFor(doc: unknown) {
  return { promise: Promise.resolve(doc), destroy: vi.fn() };
}

const TEACHER: AuthUser = {
  id: 't1',
  email: 'salim@zu.edu.ly',
  firstName: 'سالم',
  lastName: 'الطاهر',
  role: 'TEACHER',
};

/* ═══ 1 · searchFold — the folding layer ════════════════════════════ */

describe('searchFold — the canonical Arabic chain with provenance', () => {
  it('folds diacritics/tatweel/hamza variants and maps back to original indices', () => {
    const { folded, origOf } = foldWithIndex('الشَّبَكات');
    expect(folded).toBe('الشبكات');
    // Every folded character points at its original position.
    expect(origOf).toHaveLength(folded.length);
    expect(origOf[0]).toBe(0);
    // The ش (original index 2) survived; its folded index is 2.
    expect(origOf[2]).toBe(2);
    // The tatweel in «عـلــى» vanishes; folding «مُحَمَّد» lands on «محمد».
    expect(foldWithIndex('مُحَمَّد').folded).toBe('محمد');
    expect(foldWithIndex('عـلــى').folded).toBe('علي');
  });

  it('applies the search-contract «ال» tolerance with the counting floor', () => {
    expect(matchTerms(['الشبكات'])).toEqual(['شبكات']);
    // Below the 3-letter floor the strip would degrade the query into
    // matching every character — the reader keeps the query whole.
    expect(matchTerms(['الي'])).toEqual(['الي']);
    expect(matchTerms(['محمد'])).toEqual(['محمد']);
  });

  it('counts per-page occurrences and tolerates the article prefix on either side', () => {
    const scan = scanPageItems(
      [{ str: 'شبكات محلية' }, { str: 'وتوسيع الشبكات' }],
      ['الشبكات'],
    );
    expect(scan?.count).toBe(2);
    // Snippet comes from the ORIGINAL text around the first hit.
    expect(scan?.snippet).toContain('شبكات محلية');

    // The reverse direction: «كتاب» finds both spellings — the bare
    // form covers «الكتاب» AND «كتاب».
    expect(scanPageItems([{ str: 'الكتاب ثم كتاب آخر' }], ['كتاب'])?.count).toBe(2);

    // Multi-word queries count non-overlapping phrases across items.
    // Production folds the whole query then splits (runSearch →
    // normalizeArabicSearch → split) — the helper takes the FOLDED words,
    // so «أنواع» arrives as its folded «انواع» (أ→ا).
    expect(scanPageItems([{ str: 'أنواع' }, { str: 'الشبكات المحلية' }], ['انواع', 'الشبكات'])?.count).toBe(1);

    // No match → null (no hit row).
    expect(scanPageItems([{ str: 'لا شيء هنا' }], ['الشبكات'])).toBeNull();
  });

  it('returns original-coordinate ranges for the matched slices', () => {
    const ranges = findFoldedRanges('الشَّبَكات المحلية', ['الشبكات']);
    // The whole folded word in ORIGINAL coords: the original run carries
    // 3 diacritics the fold deletes — «الشَّبَكات» spans 10 UTF-16 units
    // (ا ل ش ّ َ ب َ ك ا ت), not 7. The folded match [0,7] maps back to
    // original [0,10) so the mark covers the full diacritized word.
    expect(ranges).toEqual([[0, 10]]);
    const text = 'الشَّبَكات المحلية';
    const [start, end] = ranges[0]!;
    expect(text.slice(start, end)).toBe('الشَّبَكات');
  });

  it('wraps, unwraps and re-wraps marks idempotently in a text layer', () => {
    const layer = document.createElement('div');
    const span = document.createElement('span');
    span.textContent = 'الشَّبَكات المحلية';
    layer.appendChild(span);

    applySearchMarks(layer, ['الشبكات'], false);
    const mark = layer.querySelector('mark.r305pdf-hitmark');
    expect(mark).not.toBeNull();
    expect(mark?.textContent).toBe('الشَّبَكات');
    expect(span.textContent).toBe('الشَّبَكات المحلية'); // text preserved

    // Re-apply with the current-hit tint — no duplicate marks.
    applySearchMarks(layer, ['الشبكات'], true);
    expect(layer.querySelectorAll('mark.r305pdf-hitmark')).toHaveLength(1);
    expect(layer.querySelector('mark.r305pdf-hitmark--current')).not.toBeNull();

    // Clearing the query unwraps everything back to the original run.
    applySearchMarks(layer, [], false);
    expect(layer.querySelectorAll('mark.r305pdf-hitmark')).toHaveLength(0);
    expect(layer.querySelector('span')?.textContent).toBe('الشَّبَكات المحلية');
  });
});

/* ═══ 2 · PdfViewer — the reader workspace behaviors ════════════════ */

describe('PdfViewer — honest load progress tied to pdf.js events', () => {
  it('renders the real percentage from onProgress and clears it on load', async () => {
    const doc = deferred<unknown>();
    const task: {
      promise: Promise<unknown>;
      destroy: () => void;
      onProgress?: (data: { loaded: number; total: number }) => void;
    } = { promise: doc.promise, destroy: vi.fn() };
    getDocumentMock.mockReturnValueOnce(task);

    render(<PdfViewer src="/papers/x.pdf" />);

    // Flush the memoized pdfjs import → start() runs → the loading task
    // (this same object) gets its onProgress armed. Reading task.onProgress
    // before that chain lands races the no-op optional call.
    await act(async () => { await new Promise((r) => setTimeout(r, 0)); });
    await act(async () => { task.onProgress?.({ loaded: 45, total: 100 }); });
    expect(await screen.findByText('جارٍ تحميل المستند… 45%')).toBeInTheDocument();

    // Unknown total → the transferred-KiB register (platform numerals).
    await act(async () => { task.onProgress?.({ loaded: 2048, total: 0 }); });
    expect(screen.getByText('جارٍ تحميل المستند… 2 كيلوبايت')).toBeInTheDocument();

    // The document lands — the progress line goes with it (no fake state).
    await act(async () => { doc.resolve(makeDoc(['صفحة'])); });
    await screen.findByText('من 1');
    expect(screen.queryByText(/جارٍ تحميل المستند/)).toBeNull();
  });
});

describe('PdfViewer — Arabic-normalized search with occurrence counts', () => {
  it('finds a diacritized page with an unfolded query and jumps to the hit', async () => {
    getDocumentMock.mockReturnValueOnce(taskFor(makeDoc(['مقدمة عامة', 'مُحَمَّد بن مصطفى'])));
    act(() => { useAuthStore.setState({ user: TEACHER }); });

    render(<PdfViewer src="/papers/net.pdf" />);
    await screen.findByText('من 2');

    fireEvent.click(screen.getByRole('button', { name: 'بحث في المستند' }));
    fireEvent.change(screen.getByLabelText('البحث في المستند'), { target: { value: 'محمد' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'بحث' })); });

    expect(await screen.findByText('1 / 1')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue(2);

    // The match is MARKED where it lives — the folded query wrapped the
    // original diacritized run.
    await waitFor(() => {
      const mark = document.querySelector('mark.r305pdf-hitmark');
      expect(mark?.textContent).toBe('مُحَمَّد');
    });
  });

  it('reports per-page occurrence counts as their own chip (dual form)', async () => {
    getDocumentMock.mockReturnValueOnce(taskFor(makeDoc(['شبكات أولى ثم شبكات ثانية'])));
    act(() => { useAuthStore.setState({ user: TEACHER }); });

    render(<PdfViewer src="/papers/net.pdf" />);
    await screen.findByText('من 1');

    fireEvent.click(screen.getByRole('button', { name: 'بحث في المستند' }));
    fireEvent.change(screen.getByLabelText('البحث في المستند'), { target: { value: 'الشبكات' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'بحث' })); });

    expect(await screen.findByText('1 / 1')).toBeInTheDocument();
    expect(screen.getByText('موضعان')).toBeInTheDocument();
  });

  it('does not let the «ال» strip degrade a sub-floor query into matching everything', async () => {
    getDocumentMock.mockReturnValueOnce(taskFor(makeDoc(['هذا النص لا يحمل الكلمة المطلوبة'])));
    act(() => { useAuthStore.setState({ user: TEACHER }); });

    render(<PdfViewer src="/papers/net.pdf" />);
    await screen.findByText('من 1');

    fireEvent.click(screen.getByRole('button', { name: 'بحث في المستند' }));
    fireEvent.change(screen.getByLabelText('البحث في المستند'), { target: { value: 'الي' } });
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'بحث' })); });

    // «الي» folded stays «الي» — «في هذا النص...» contains no «الي».
    await waitFor(() => {
      expect(screen.queryByText('1 / 1')).toBeNull();
      expect(screen.queryByText('موضع واحد')).toBeNull();
    });
  });
});

describe('PdfViewer — keyboard surface', () => {
  it('announces page changes through the sr-only live region', async () => {
    getDocumentMock.mockReturnValueOnce(taskFor(makeDoc(['أولى', 'ثانية'])));
    render(<PdfViewer src="/papers/x.pdf" />);
    await screen.findByText('من 2');

    expect(screen.getByText('صفحة 1 من 2')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'الصفحة التالية' }));
    await waitFor(() => {
      expect(screen.getByText('صفحة 2 من 2')).toBeInTheDocument();
    });
  });

  it('Escape closes the thumbnail rail (every overlay, not only search)', async () => {
    getDocumentMock.mockReturnValueOnce(taskFor(makeDoc(['أولى', 'ثانية'])));
    render(<PdfViewer src="/papers/x.pdf" />);
    await screen.findByText('من 2');

    fireEvent.click(screen.getByRole('button', { name: 'مصغّرات الصفحات' }));
    expect(screen.getByRole('navigation', { name: 'مصغّرات الصفحات' })).toBeInTheDocument();

    fireEvent.keyDown(document.body, { key: 'Escape' });
    expect(screen.queryByRole('navigation', { name: 'مصغّرات الصفحات' })).toBeNull();
  });
});

describe('PdfViewer — selection → contextual note (reviewer-gated)', () => {
  function stubSelection(text: string, anchor: Element | null) {
    return vi.spyOn(document, 'getSelection').mockReturnValue({
      isCollapsed: false,
      anchorNode: anchor,
      toString: () => text,
      // The submit clears the live selection — annotateSelection calls
      // removeAllRanges() on whatever getSelection() yields.
      removeAllRanges: () => {},
    } as unknown as Selection);
  }

  it('offers the note verb for a teacher selection and emits {text, page}', async () => {
    getDocumentMock.mockReturnValueOnce(taskFor(makeDoc(['نص للقراءة'])));
    const onAnnotateSelection = vi.fn();
    act(() => { useAuthStore.setState({ user: TEACHER }); });

    const view = render(<PdfViewer src="/papers/x.pdf" onAnnotateSelection={onAnnotateSelection} />);
    await screen.findByText('من 1');

    const restore = stubSelection('نص محدد من الورقة', view.container.querySelector('.pdf-textLayer'));
    try {
      await act(async () => { document.dispatchEvent(new Event('selectionchange')); });
      const btn = await screen.findByRole('button', { name: 'ملاحظة على التحديد' });
      expect(screen.getByText('نص محدد من الورقة')).toBeInTheDocument();

      await act(async () => { fireEvent.click(btn); });
      expect(onAnnotateSelection).toHaveBeenCalledWith({ text: 'نص محدد من الورقة', page: 1 });
      // The bar dismisses with the submission — one shot per selection.
      expect(screen.queryByRole('button', { name: 'ملاحظة على التحديد' })).toBeNull();
    } finally {
      restore.mockRestore();
    }
  });

  it('never offers the note verb to a non-reviewer (students read only)', async () => {
    getDocumentMock.mockReturnValueOnce(taskFor(makeDoc(['نص للقراءة'])));
    act(() => {
      useAuthStore.setState({
        user: { id: 's1', email: 's@zu.edu.ly', firstName: 'سالم', lastName: 'الطالب', role: 'STUDENT' },
      });
    });

    const view = render(<PdfViewer src="/papers/x.pdf" onAnnotateSelection={vi.fn()} />);
    await screen.findByText('من 1');

    const restore = stubSelection('نص محدد', view.container.querySelector('.pdf-textLayer'));
    try {
      await act(async () => { document.dispatchEvent(new Event('selectionchange')); });
      expect(screen.queryByRole('button', { name: 'ملاحظة على التحديد' })).toBeNull();
    } finally {
      restore.mockRestore();
    }
  });
});

/* ═══ 3 · AnnotationsPanel — the seedDraft composer handoff ════════ */

describe('AnnotationsPanel — selection quote seeds the composer', () => {
  function renderPanel(seedDraft?: { text: string; page: number; seq: number } | null) {
    return render(
      <AnnotationsPanel paperId="paper1" currentPage={1} numPages={10} onJumpToPage={vi.fn()} seedDraft={seedDraft} />,
    );
  }

  it('opens the composer anchored to the selection page with the quote inside the draft', () => {
    renderPanel({ text: 'نص محدد من الورقة', page: 4, seq: 1 });

    const textarea = screen.getByLabelText('نص الملاحظة') as HTMLTextAreaElement;
    expect(textarea.value).toContain('اقتباس: «نص محدد من الورقة»');
    expect(screen.getByLabelText('رقم الصفحة، من 10')).toHaveValue(4);
  });

  it('a newer selection (bigger seq) re-seeds on top of the previous draft', () => {
    const view = renderPanel({ text: 'الاقتباس الأول', page: 2, seq: 1 });
    view.rerender(
      <AnnotationsPanel
        paperId="paper1" currentPage={1} numPages={10} onJumpToPage={vi.fn()}
        seedDraft={{ text: 'الاقتباس الثاني', page: 6, seq: 2 }}
      />,
    );

    const textarea = screen.getByLabelText('نص الملاحظة') as HTMLTextAreaElement;
    expect(textarea.value).toContain('الاقتباس الثاني');
    expect(textarea.value).toContain('الاقتباس الأول');
    expect(screen.getByLabelText('رقم الصفحة، من 10')).toHaveValue(6);
  });

  it('absent seedDraft keeps the panel exactly as before (frozen default)', () => {
    renderPanel(null);
    expect(screen.queryByLabelText('نص الملاحظة')).toBeNull();
  });
});

/* ═══ 4 · DocumentViewerPage — Heron scoping + the wiring chain ════ */

describe('DocumentViewerPage — the r305rp marker rides every rendered root', () => {
  it('the refusal branch carries the marker (unstyled flash is a contract break)', () => {
    render(
      <MemoryRouter initialEntries={['/document/notes.txt']}>
        <Routes>
          <Route path="/document/:filename" element={<DocumentViewerPage />} />
        </Routes>
      </MemoryRouter>,
    );
    expect(document.querySelector('.document-viewer-page.r305rp')).not.toBeNull();
  });

  it('the served branch carries the marker and the sheet import follows pdf.css', async () => {
    getDocumentMock.mockReturnValueOnce(taskFor(makeDoc(['صفحة'])));
    render(
      <MemoryRouter initialEntries={['/document/paper.pdf?paper=p1']}>
        <Routes>
          <Route path="/document/:filename" element={<DocumentViewerPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText('من 1');
    expect(document.querySelector('.document-viewer-page.r305rp')).not.toBeNull();

    // Import wiring: the Heron sheet loads directly after pdf.css —
    // source order inside @layer pages is what wins the ties.
    const source = readFileSync(
      resolvePath(__dirname, '../../src/pages/DocumentViewerPage.tsx'),
      'utf8',
    );
    const pdfCss = source.indexOf("import '../styles/pdf.css';");
    const sheet = source.indexOf("import '../styles/r305-research-pdf-ai.css';");
    expect(pdfCss).toBeGreaterThan(-1);
    expect(sheet).toBeGreaterThan(pdfCss);

    // The sheet itself carries the a7-pdf section banner between the
    // sibling placeholders (the integration seam).
    const css = readFileSync(
      resolvePath(__dirname, '../../src/styles/r305-research-pdf-ai.css'),
      'utf8',
    );
    expect(css).toContain('a7-pdf appends here');
    expect(css.indexOf('a7-pdf appends here')).toBeLessThan(css.indexOf('a7-ai appends here'));
  });
});

describe('DocumentViewerPage — selection → composer, the full wiring chain', () => {
  it('a submitted selection seeds the annotations panel composer with the quote', async () => {
    getDocumentMock.mockReturnValueOnce(taskFor(makeDoc(['نص للقراءة والتحديد'])));
    act(() => { useAuthStore.setState({ user: TEACHER }); });

    const view = render(
      <MemoryRouter initialEntries={['/document/paper.pdf?paper=p111']}>
        <Routes>
          <Route path="/document/:filename" element={<DocumentViewerPage />} />
        </Routes>
      </MemoryRouter>,
    );
    await screen.findByText('من 1');

    const restore = vi.spyOn(document, 'getSelection').mockReturnValue({
      isCollapsed: false,
      anchorNode: document.querySelector('.pdf-textLayer'),
      toString: () => 'النص المحدد للتجربة',
      removeAllRanges: () => {}, // the submit clears the live selection
    } as unknown as Selection);
    try {
      await act(async () => { document.dispatchEvent(new Event('selectionchange')); });
      fireEvent.click(await screen.findByRole('button', { name: 'ملاحظة على التحديد' }));

      // The panel composer opened with the quote seeded (the mobile
      // Sheet path is the same state; desktop split shows it directly).
      const textarea = (await screen.findByLabelText('نص الملاحظة')) as HTMLTextAreaElement;
      expect(textarea.value).toContain('اقتباس: «النص المحدد للتجربة»');
      expect(view.container.querySelector('.document-viewer-page.r305rp')).not.toBeNull();
    } finally {
      restore.mockRestore();
    }
  });
});
