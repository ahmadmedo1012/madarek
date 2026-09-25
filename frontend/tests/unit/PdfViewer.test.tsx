/**
 * 12-12 — PdfViewer behavior tests (audit 11-f batch B / P2-14).
 *
 * Pins the load/search lifecycle contracts that previously had zero
 * coverage:
 *   1. password-protected PDFs get the friendly message and NO retry
 *      affordance — re-running the same no-credential load cannot
 *      succeed (audit 11-f P2-8),
 *   2. corrupt PDFs keep the generic retryable error, and the retry
 *      button really re-runs the load,
 *   3. search collects hits across pages and jumps to the first hit,
 *   4. a document switch mid-search discards the stale walk — no stale
 *      hits, no page jump into the wrong document (audit 11-f P1-3),
 *   5. an unmount mid-search swallows the destroy rejection instead of
 *      surfacing an unhandled promise rejection (audit 11-f P1-3).
 *
 * pdfjs-dist is fully mocked (getDocument + TextLayer + the `?url`
 * worker import), and the canvas 2d context is stubbed to null so the
 * render path early-returns — each test drives only the behavior it
 * asserts (load, search walk, error classification).
 */
import { describe, expect, it, vi, beforeAll, afterAll, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import PdfViewer from '../../src/components/pdf/PdfViewer';

const getDocumentMock = vi.hoisted(() => vi.fn());
// NOTE: the factory must not use class FIELDS (only methods) — vitest's
// mock hoisting rewrites factory references, and a field initializer
// trips the rewritten import bindings with a TDZ error.
vi.mock('pdfjs-dist', () => ({
  GlobalWorkerOptions: { workerSrc: '' },
  getDocument: (...args: unknown[]) => getDocumentMock(...args),
  TextLayer: class {
    async render() { return undefined; }
  },
}));

/** Manual promise — lets a test park the component mid-async-operation. */
function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

/** A fake PDFDocumentProxy whose page n carries pageTexts[n-1]. */
function makeDoc(pageTexts: string[]) {
  return {
    numPages: pageTexts.length,
    getPage: vi.fn(async (n: number) => ({
      getViewport: () => ({ width: 612, height: 792 }),
      getTextContent: async () => ({ items: [{ str: pageTexts[n - 1] ?? '' }] }),
    })),
    destroy: vi.fn(),
  };
}

/** A fake PDFDocumentLoadingTask resolved with `doc`. */
function taskFor(doc: unknown) {
  return { promise: Promise.resolve(doc), destroy: vi.fn() };
}

beforeAll(() => {
  // jsdom has no canvas implementation — renderPage gracefully early-
  // returns on a null 2d context, keeping these tests on the load and
  // search paths only.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
});

afterAll(() => {
  vi.restoreAllMocks();
});

afterEach(() => {
  getDocumentMock.mockReset();
});

async function openSearchAndType(term: string) {
  fireEvent.click(screen.getByRole('button', { name: 'بحث في المستند' }));
  fireEvent.change(screen.getByLabelText('البحث في المستند'), { target: { value: term } });
}

describe('PdfViewer — document load errors', () => {
  it('shows the password message without a retry button for password-protected PDFs', async () => {
    getDocumentMock.mockReturnValueOnce({
      promise: Promise.reject({ name: 'PasswordException', message: 'No password given' }),
      destroy: vi.fn(),
    });

    render(<PdfViewer src="/papers/locked.pdf" />);

    expect(await screen.findByText('هذا المستند محمي بكلمة مرور')).toBeInTheDocument();
    // Retry re-runs the same no-credential load — it must not be offered.
    expect(screen.queryByRole('button', { name: 'إعادة المحاولة' })).toBeNull();
  });

  it('keeps the retryable generic error for corrupt PDFs and retries the load', async () => {
    getDocumentMock
      .mockReturnValueOnce({
        promise: Promise.reject(new Error('Invalid PDF structure')),
        destroy: vi.fn(),
      })
      .mockReturnValueOnce(taskFor(makeDoc(['صفحة أولى'])));

    render(<PdfViewer src="/papers/broken.pdf" />);

    expect(await screen.findByText('تعذّر تحميل المستند')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إعادة المحاولة' }));

    // The retry re-runs the load effect — the second task resolves and
    // the toolbar reflects the loaded document's page count.
    expect(await screen.findByText('من 1')).toBeInTheDocument();
    expect(getDocumentMock).toHaveBeenCalledTimes(2);
  });
});

describe('PdfViewer — search', () => {
  it('collects hits across pages and jumps to the first hit', async () => {
    getDocumentMock.mockReturnValueOnce(
      taskFor(makeDoc(['مقدمة عامة في المنهج', 'أنواع الشبكات المحلية'])),
    );

    render(<PdfViewer src="/papers/net.pdf" />);
    await screen.findByText('من 2');

    await openSearchAndType('الشبكات');
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'بحث' }));
    });

    expect(await screen.findByText('1 / 1')).toBeInTheDocument();
    expect(screen.getByRole('spinbutton')).toHaveValue(2);
  });

  it('discards a stale walk when the document switches mid-search (no stale hits, no jump)', async () => {
    // Document A: the walk parks on page 1's text extraction (deferred)
    // while the src changes underneath it. Page 2 holds a real hit.
    const page1Text = deferred<{ items: Array<{ str: string }> }>();
    const docA = {
      numPages: 2,
      getPage: vi.fn(async (n: number) => ({
        getViewport: () => ({ width: 612, height: 792 }),
        getTextContent: () =>
          n === 1
            ? page1Text.promise
            : Promise.resolve({ items: [{ str: 'الشبكات المحلية' }] }),
      })),
      destroy: vi.fn(),
    };
    const docB = makeDoc(['صفحة جديدة تماماً']);
    const loadB = deferred<unknown>();
    getDocumentMock
      .mockReturnValueOnce(taskFor(docA))
      .mockReturnValueOnce({ promise: loadB.promise, destroy: vi.fn() });

    const view = render(<PdfViewer src="/papers/a.pdf" />);
    await view.findByText('من 2');

    // Start the search — it walks page 1 and parks on the deferred text.
    await openSearchAndType('الشبكات');
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'بحث' }));
    });
    expect(view.getByText('جارٍ البحث…')).toBeInTheDocument();

    // Switch documents while the walk is parked.
    view.rerender(<PdfViewer src="/papers/b.pdf" />);

    // The stale walk wakes up holding a hit for the OLD document…
    await act(async () => {
      await page1Text.resolve({ items: [{ str: 'مقدمة عن الشبكات المختلفة' }] });
      await new Promise((r) => setTimeout(r, 0));
    });
    // …and the new document lands.
    await act(async () => {
      await loadB.resolve(docB);
    });
    await view.findByText('من 1');

    // The stale hit must not survive: no count, no search-in-progress
    // chip, and the viewer stays on page 1 of the NEW document.
    expect(view.queryByText('1 / 1')).toBeNull();
    expect(view.queryByText('جارٍ البحث…')).toBeNull();
    expect(view.getByRole('spinbutton')).toHaveValue(1);
  });

  it('swallows the destroy rejection when unmounted mid-search (no unhandled rejection)', async () => {
    const page1Text = deferred<{ items: Array<{ str: string }> }>();
    const docA = {
      numPages: 2,
      getPage: vi.fn(async () => ({
        getViewport: () => ({ width: 612, height: 792 }),
        getTextContent: () => page1Text.promise,
      })),
      destroy: vi.fn(),
    };
    getDocumentMock.mockReturnValueOnce(taskFor(docA));

    const view = render(<PdfViewer src="/papers/a.pdf" />);
    await view.findByText('من 2');

    await openSearchAndType('الشبكات');
    await act(async () => {
      fireEvent.click(view.getByRole('button', { name: 'بحث' }));
    });

    // Unmount — the load effect destroys the document underneath the
    // parked walk.
    view.unmount();

    // The destroyed document rejects the in-flight text extraction.
    // runSearch must absorb it; an unhandled rejection would both fire
    // this listener and fail the vitest run.
    const unhandled = vi.fn();
    process.on('unhandledRejection', unhandled);
    try {
      await act(async () => {
        page1Text.reject(new Error('Worker was destroyed'));
        await new Promise((r) => setTimeout(r, 0));
      });
      expect(unhandled).not.toHaveBeenCalled();
    } finally {
      process.off('unhandledRejection', unhandled);
    }
  });
});
