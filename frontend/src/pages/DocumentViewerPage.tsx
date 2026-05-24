import { lazy, Suspense, useRef, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Icon } from '../components/Icon';

// Code-split: PdfViewer + pdfjs-dist + worker land in their own chunk.
const PdfViewer = lazy(() => import('../components/pdf/PdfViewer'));
const AnnotationsPanel = lazy(() => import('../components/pdf/AnnotationsPanel'));

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
        <div className="page-header">
          <h1 className="page-title">المستند غير محدّد</h1>
        </div>
      </div>
    );
  }

  const src = `/api/v1/files/papers/${encodeURIComponent(params.filename)}`;

  return (
    <div className="page" style={{ height: 'calc(100vh - var(--topbar-h))', paddingBottom: 0 }}>
      <div className="page-header" style={{ marginBottom: 'var(--sp-3)' }}>
        <div className="page-title-block">
          <Link to={back} className="text-xs text-subtle" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
            <Icon icon={ChevronRight} size={12} />
            رجوع
          </Link>
          <h1 className="page-title" style={{ marginTop: 4 }}>{title ?? 'مستند'}</h1>
        </div>
      </div>

      <div className="document-viewer-layout">
        <div className="document-viewer-main">
          <Suspense
            fallback={
              <div className="card" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
                <span className="text-sm text-muted">جاري تحضير عارض المستندات…</span>
              </div>
            }
          >
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
