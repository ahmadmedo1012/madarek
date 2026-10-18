/**
 * r164f — DocumentViewerPage param-robustness tests.
 *
 * The viewer route (`/document/:filename?ns=&paper=&back=`) used to
 * treat an invalid filename param as a normal mount: pdf.js then
 * fetched a URL the server 400s and the reader surfaced an English
 * envelope error — or, for a filename-less render, a bare
 * «المستند غير محدّد» header with no way back. The r164f param gate
 * (isViewerFilenameParam, components/pdf/loadError.ts) shows the
 * honest «الملف غير موجود» state up front, with the back link, and
 * NEVER mounts the reader for a param that cannot be served.
 *
 * PdfViewer itself is mocked (the real module pulls pdfjs-dist + the
 * `?url` worker asset — this suite pins the PAGE's param contract, not
 * pdf.js; the reader's own behavior is pinned in PdfViewer.test.tsx).
 */
import { Suspense } from 'react';
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import DocumentViewerPage from '../../src/pages/DocumentViewerPage';

/** src values the mocked viewer received, in order. */
const viewerSrcLog = vi.hoisted(() => [] as string[]);

vi.mock('../../src/components/pdf/PdfViewer', async () => {
  const React = await import('react');
  return {
    default: (props: { src?: string }) => {
      viewerSrcLog.push(props.src ?? '');
      return React.createElement('div', { 'data-testid': 'pdf-viewer-stub' });
    },
  };
});

afterEach(() => {
  cleanup();
  viewerSrcLog.length = 0;
});

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Suspense fallback={null}>
        <Routes>
          <Route path="/document/:filename" element={<DocumentViewerPage />} />
        </Routes>
      </Suspense>
    </MemoryRouter>,
  );
}

describe('DocumentViewerPage — the filename param gate (r164f)', () => {
  it('a non-.pdf param (cuid / txt / exe) shows «الملف غير موجود» and never mounts the reader', () => {
    renderAt('/document/cmv7nja0p0010');

    expect(screen.getByText('الملف غير موجود')).toBeInTheDocument();
    expect(screen.getByText(/اسم الملف في الرابط لا يصلح لعرض PDF/)).toBeInTheDocument();
    // The reader (mocked) must never mount for an unservable param —
    // no pdfjs chunk, no fetch, no English envelope error.
    expect(screen.queryByTestId('pdf-viewer-stub')).toBeNull();
    expect(viewerSrcLog).toHaveLength(0);
  });

  it('a traversal-shaped param is refused the same way — the server would 400 it', () => {
    renderAt(`/document/${encodeURIComponent('../secret.pdf')}`);

    expect(screen.getByText('الملف غير موجود')).toBeInTheDocument();
    expect(screen.queryByTestId('pdf-viewer-stub')).toBeNull();
  });

  it('the back link survives on the refusal state (the way back to context)', () => {
    renderAt('/document/notes.txt?back=%2Fstudent%2Fresearch');

    const back = screen.getByRole('link', { name: 'العودة إلى الصفحة السابقة' });
    expect(back).toHaveAttribute('href', '/student/research');
  });

  it('the back link falls back to the library research tab when ?back= is absent/foreign', () => {
    renderAt('/document/notes.txt');

    expect(screen.getByRole('link', { name: 'العودة إلى الصفحة السابقة' })).toHaveAttribute(
      'href',
      '/student/library?tab=research',
    );
  });

  it('no filename at all → «المستند غير محدّد» with the way back (not a bare header)', () => {
    // Direct render (no route match): useParams returns nothing — the
    // /document/ path itself doesn't match the route in the app either.
    render(
      <MemoryRouter>
        <DocumentViewerPage />
      </MemoryRouter>,
    );

    expect(screen.getByText('المستند غير محدّد')).toBeInTheDocument();
    expect(screen.getByText(/الرابط لا يحمل اسم ملف/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'العودة إلى الصفحة السابقة' })).toBeInTheDocument();
  });
});

describe('DocumentViewerPage — a servable param mounts the reader with the right namespace', () => {
  it('a flat .pdf basename mounts the reader against the papers namespace', async () => {
    renderAt('/document/ck4r1x9.pdf?title=%D8%A8%D8%AD%D8%AB');

    expect(await screen.findByTestId('pdf-viewer-stub')).toBeInTheDocument();
    await waitFor(() => {
      expect(viewerSrcLog[0]).toBe('/api/v1/files/papers/ck4r1x9.pdf');
    });
  });

  it('the filename is encoded once — an Arabic basename stays fetchable', async () => {
    renderAt('/document/بحــث.pdf');

    expect(await screen.findByTestId('pdf-viewer-stub')).toBeInTheDocument();
    await waitFor(() => {
      expect(viewerSrcLog[0]).toBe(`/api/v1/files/papers/${encodeURIComponent('بحــث.pdf')}`);
    });
  });

  it('?ns=materials retargets the materials namespace; an unknown ns falls back to papers', async () => {
    renderAt('/document/m1.pdf?ns=materials');

    expect(await screen.findByTestId('pdf-viewer-stub')).toBeInTheDocument();
    await waitFor(() => {
      expect(viewerSrcLog[0]).toBe('/api/v1/files/materials/m1.pdf');
    });

    cleanup();
    viewerSrcLog.length = 0;

    renderAt('/document/m2.pdf?ns=arbitrary');
    expect(await screen.findByTestId('pdf-viewer-stub')).toBeInTheDocument();
    await waitFor(() => {
      expect(viewerSrcLog[0]).toBe('/api/v1/files/papers/m2.pdf');
    });
  });
});
