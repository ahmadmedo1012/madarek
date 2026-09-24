import { lazy, Suspense, useRef, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Icon } from '../components/Icon';

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
        <div className="pdf-page-skeleton" role="status" aria-label="جاري تحضير عارض المستندات…" />
      </div>
    </div>
  );
}

export default function DocumentViewerPage() {
  const params = useParams<{ filename: string }>();
  const [search] = useSearchParams();
  const title = search.get('title') ?? undefined;
  const back = search.get('back') ?? '/student/library?tab=research';
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

  const src = `/api/v1/files/papers/${encodeURIComponent(params.filename)}`;

  return (
    <div className="page document-viewer-page" style={{ height: 'calc(100vh - var(--topbar-h))', paddingBottom: 0 }}>
      <header className="page-header" style={{ marginBottom: 'var(--sp-3)' }}>
        <div className="page-title-block">
          {/* document-viewer-back: app chrome — hidden by the viewer-page
              print rules (pdf.css); the document title stays on paper. */}
          <Link
            to={back}
            className="document-viewer-back text-xs text-subtle"
            style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}
          >
            <Icon icon={ChevronRight} size={12} />
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
