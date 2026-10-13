import { lazy, Suspense, useRef, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Icon } from '../components/Icon';
import { apiBaseURL } from '../lib/api';
import '../styles/pdf.css'; // pdf viewer + annotations surfaces (D11 css split, 12-15)

// Code-split: PdfViewer + pdfjs-dist + worker land in their own chunk.
const PdfViewer = lazy(() => import('../components/pdf/PdfViewer'));
const AnnotationsPanel = lazy(() => import('../components/pdf/AnnotationsPanel'));

/**
 * Suspense fallback for the lazy viewer chunk — paper-frame shaped (the
 * .pdf-page-skeleton rules live in pdf.css, which is loaded globally;
 * duplicating the small markup here keeps the pdfjs chunk out of the
 * critical path).
 */
function ViewerFallback() {
  return (
    <div className="pdf-viewer fill" aria-busy="true">
      <div className="pdf-canvas-wrap">
        <div className="pdf-page-skeleton" role="status" aria-label="جارٍ تحضير عارض المستندات…" />
      </div>
    </div>
  );
}

/** A13 P2-5: `?back=` flows unvalidated into the back-link `to`, so a
 *  crafted URL (`/document/x.pdf?back=https://evil.example.com`) put an
 *  off-app href in the DOM — middle-click / open-in-new-tab left the
 *  app and the link was shareable. Same guard as AuthPage's
 *  `readFromPath`: only in-app pathnames are honored (a leading `//`
 *  is protocol-relative → off-app); anything else falls back to the
 *  library research tab. */
function safeBackPath(raw: string | null): string {
  return raw !== null && raw.startsWith('/') && !raw.startsWith('//')
    ? raw
    : '/student/library?tab=research';
}

export default function DocumentViewerPage() {
  const params = useParams<{ filename: string }>();
  const [search] = useSearchParams();
  const title = search.get('title') ?? undefined;
  const back = safeBackPath(search.get('back'));
  const paperId = search.get('paper') ?? undefined;

  const controlRef = useRef<{ jumpToPage: (n: number) => void } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(1);

  if (!params.filename) {
    return (
      <div className="page">
        <header className="page-header">
          <h1 className="page-title">المستند غير محدّد</h1>
        </header>
      </div>
    );
  }

  /* r155b: العنوان يُبنى من apiBaseURL (lib/api) — الثابت الصريح
   * '/api/v1' كان يتجاهل VITE_API_BASE_URL (نمط LecturePlayerPage
   * في نداء keepalive نفسه). */
  const src = `${apiBaseURL}/files/papers/${encodeURIComponent(params.filename)}`;

  return (
    // r152i (A3): the height moved to pdf.css (.document-viewer-page)
    // — the inline calc(100vh) hid content behind the iOS URL bar and
    // forced the print block to fight an inline style with !important.
    <div className="page document-viewer-page">
      <header className="page-header" style={{ marginBottom: 'var(--sp-3)' }}>
        <div className="page-title-block">
          {/* document-viewer-back: app chrome — hidden by the viewer-page
              print rules (pdf.css); the document title stays on paper.
              r149 (R3-A1 #10): ينضم لعائلة ‎.back-link الكنونية (كان رابطًا
              خامًا 12px بلا أرضية لمس ولا hover — الصفحة التفصيلية الوحيدة
              خارج اللغة). */}
          <Link to={back} className="back-link document-viewer-back">
            <Icon icon={ChevronRight} size={14} />
            رجوع
          </Link>
          <h1 className="page-title" style={{ marginTop: 4 }}>{title ?? 'مستند'}</h1>
        </div>
      </header>

      <div className="document-viewer-layout">
        <div className="document-viewer-main">
          <Suspense fallback={<ViewerFallback />}>
            <PdfViewer
              src={src}
              title={title}
              fill
              controlRef={controlRef}
              onPageChange={setCurrentPage}
              onDocumentLoaded={setNumPages}
            />
          </Suspense>
        </div>

        {paperId && (
          <Suspense fallback={null}>
            <AnnotationsPanel
              paperId={paperId}
              currentPage={currentPage}
              numPages={numPages}
              onJumpToPage={(n) => controlRef.current?.jumpToPage(n)}
            />
          </Suspense>
        )}
      </div>
    </div>
  );
}
