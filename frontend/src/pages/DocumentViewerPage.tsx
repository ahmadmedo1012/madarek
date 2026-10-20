import { lazy, Suspense, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { ChevronRight, FileQuestion, MessageSquare } from 'lucide-react';
import { Icon } from '../components/Icon';
import { EmptyState } from '../components/primitives/States';
import { Sheet } from '../components/overlays';
import { useIsNarrowLayout } from '../hooks/useIsNarrowLayout';
import { apiBaseURL } from '../lib/api';
import { ROLE_HOME } from '../lib/nav';
import { useAuthStore, type AppRole } from '../stores/auth.store';
import { isViewerFilenameParam } from '../components/pdf/loadError';
import '../styles/pdf.css';
import '../styles/research.css';

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
 *  is protocol-relative → off-app). r176e (D-02): the FALLBACK is now
 *  role-aware — the old student-only default silently guard-bounced
 *  TEACHER/ADMIN/QUALITY/OWNER (global-search paper hits carry no
 *  ?back=) to their dashboards instead of a meaningful exit. Teachers
 *  land on their own library research tab; oversight roles land on
 *  their ROLE_HOME (single-sourced from lib/nav.ts). */
function safeBackPath(raw: string | null, role: AppRole): string {
  if (raw !== null && raw.startsWith('/') && !raw.startsWith('//')) return raw;
  if (role === 'STUDENT') return '/student/library?tab=research';
  if (role === 'TEACHER') return '/teacher/library?tab=research';
  return ROLE_HOME[role];
}

/* P3: the file namespace the viewer fetches from. 'papers' is the
 * legacy default (research PDFs, /files/papers/:filename); 'materials'
 * rides the ?ns= param materialHref sets for uploaded course PDFs
 * (/files/materials/:filename — auth-gated for enrolled/teacher/
 * oversight). An unknown/absent value falls back to 'papers' so a
 * crafted ?ns= can never retarget the fetch at an arbitrary path
 * segment. */
type FileNamespace = 'papers' | 'materials';
function fileNamespace(raw: string | null): FileNamespace {
  return raw === 'materials' ? 'materials' : 'papers';
}

export default function DocumentViewerPage() {
  const params = useParams<{ filename: string }>();
  const [search] = useSearchParams();
  const title = search.get('title') ?? undefined;
  const role = useAuthStore((s) => s.user?.role) ?? 'STUDENT';
  const back = safeBackPath(search.get('back'), role as AppRole);
  const paperId = search.get('paper') ?? undefined;
  const ns = fileNamespace(search.get('ns'));

  const controlRef = useRef<{ jumpToPage: (n: number) => void } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(1);

  /* r199 (4B reader): the split surface belongs to the desktop shell;
   * at the mobile shell boundary the annotations move into a bottom
   * Sheet behind one floating trigger — the reader keeps the full
   * viewport for the paper itself. */
  const isNarrow = useIsNarrowLayout(920);
  const [notesOpen, setNotesOpen] = useState(false);

  const jumpAndClose = (n: number) => {
    controlRef.current?.jumpToPage(n);
    setNotesOpen(false);
  };

  const annotationsPanel = paperId ? (
    <Suspense fallback={null}>
      <AnnotationsPanel
        paperId={paperId}
        currentPage={currentPage}
        numPages={numPages}
        onJumpToPage={isNarrow ? jumpAndClose : (n) => controlRef.current?.jumpToPage(n)}
      />
    </Suspense>
  ) : null;

  if (!params.filename || !isViewerFilenameParam(params.filename)) {
    /* r164f: the honest param gate — the client mirror of the serving
     * route's isSafePaperFilename (files.routes.ts). An absent or
     * non-.pdf / traversal-shaped segment can NEVER be served (the API
     * answers 400), so the page shows «الملف غير موجود» up front with
     * the way back, instead of mounting pdf.js to surface an English
     * envelope error inside the reader. The header back-link is the way
     * back to the caller's context (بحوثي / المقرر / المراجعة). */
    const missing = !params.filename;
    return (
      <div className="page document-viewer-page">
        <header className="doc-reader-head">
          <Link to={back} className="back-link document-viewer-back">
            <Icon icon={ChevronRight} size={14} />
            العودة إلى الصفحة السابقة
          </Link>
          <h1 className="doc-reader-title">{title ?? 'مستند'}</h1>
        </header>
        <div className="doc-reader">
          <div className="doc-reader-main">
            <EmptyState
              icon={FileQuestion}
              title={missing ? 'المستند غير محدّد' : 'الملف غير موجود'}
              description={missing
                ? 'الرابط لا يحمل اسم ملف — افتح المستند من صفحة بحوثك أو من المقرر.'
                : 'اسم الملف في الرابط لا يصلح لعرض PDF — افتح المستند من صفحة بحوثك أو من المقرر.'}
            />
          </div>
        </div>
      </div>
    );
  }

  /* r155b: العنوان يُبنى من apiBaseURL (lib/api) — الثابت الصريح
   * '/api/v1' كان يتجاهل VITE_API_BASE_URL (نمط LecturePlayerPage
   * في نداء keepalive نفسه). P3: المقطع الثاني هو النطاق (ns). */
  const src = `${apiBaseURL}/files/${ns}/${encodeURIComponent(params.filename)}`;

  return (
    // r152i (A3): the height moved to pdf.css (.document-viewer-page)
    // — the inline calc(100vh) hid content behind the iOS URL bar and
    // forced the print block to fight an inline style with !important.
    <div className="page document-viewer-page">
      {/* Reader head — quiet chrome: one back affordance + the paper's
          title; the reading surface owns the rest of the viewport. */}
      <header className="doc-reader-head">
        <Link to={back} className="back-link document-viewer-back">
          <Icon icon={ChevronRight} size={14} />
          العودة إلى الصفحة السابقة
        </Link>
        <h1 className="doc-reader-title">{title ?? 'مستند'}</h1>
      </header>

      <div className="doc-reader">
        <div className="doc-reader-main">
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

        {/* Desktop split: annotations ride beside the document (the
            panel owns its own scroll). */}
        {!isNarrow && (
          <div className="doc-reader-side">{annotationsPanel}</div>
        )}
      </div>

      {/* Mobile recomposition: full-screen reader + annotations in a
          bottom Sheet behind one thumb-reachable trigger. The trigger
          renders only when the paper supports annotations (paperId).
          The FAB portals to <body>: the shell's page-transition wrapper
          is transformed, which would turn position:fixed into
          viewport-relative-to-that-wrapper and clip the button. */}
      {isNarrow && paperId && createPortal(
        <button
          type="button"
          className="doc-notes-fab"
          onClick={() => setNotesOpen(true)}
          aria-haspopup="dialog"
          aria-expanded={notesOpen}
        >
          <Icon icon={MessageSquare} size={16} />
          الملاحظات
        </button>,
        document.body,
      )}
      {isNarrow && paperId && (
        <Sheet
          open={notesOpen}
          onClose={() => setNotesOpen(false)}
          side="bottom"
          ariaLabel="ملاحظات البحث"
          title="ملاحظات البحث"
        >
          <div className="rs-notes-sheet-body">{annotationsPanel}</div>
        </Sheet>
      )}
    </div>
  );
}
