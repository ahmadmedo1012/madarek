import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2,
  Download, Search, X, Loader2,
} from 'lucide-react';
import { Icon } from '../Icon';
// pdfjs-dist v4 ships ESM. We import the API surface from the main entry,
// then point the worker URL at the bundler-resolved worker module URL via
// the standard Vite ?url import. This produces a same-origin worker that
// works in dev + prod without a separate copy step.
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface PdfViewerProps {
  /** PDF source: relative path (e.g. /api/v1/files/papers/x.pdf) or absolute URL. */
  src: string;
  /** Optional document title shown in the toolbar. */
  title?: string;
  /** When true, the viewer fills its parent. When false, uses an internal max-height. */
  fill?: boolean;
  /** External handle to navigate the viewer (parent calls .jumpToPage). */
  controlRef?: React.MutableRefObject<{ jumpToPage: (n: number) => void } | null>;
  /** Called whenever current page changes — parent can mirror this. */
  onPageChange?: (page: number) => void;
  /** Called once the document is loaded — parent gets total pages. */
  onDocumentLoaded?: (numPages: number) => void;
}

interface DocState {
  pdf: pdfjsLib.PDFDocumentProxy;
  numPages: number;
}

export default function PdfViewer({ src, title, fill = true, controlRef, onPageChange, onDocumentLoaded }: PdfViewerProps) {
  const [doc, setDoc] = useState<DocState | null>(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState<number | 'fit-width'>('fit-width');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchHits, setSearchHits] = useState<{ page: number; text: string }[]>([]);
  const [searchIdx, setSearchIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const renderTaskRef = useRef<pdfjsLib.RenderTask | null>(null);

  // ── Load document ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDoc(null);

    const task = pdfjsLib.getDocument({
      url: src,
      withCredentials: true, // include auth cookies for same-origin /files/*
      cMapUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@4.10.38/standard_fonts/',
    });

    task.promise.then(
      (pdf) => {
        if (cancelled) { pdf.destroy(); return; }
        setDoc({ pdf, numPages: pdf.numPages });
        setPage(1);
        setLoading(false);
        onDocumentLoaded?.(pdf.numPages);
      },
      (err) => {
        if (cancelled) return;
        console.error('PDF load failed', err);
        setError('تعذّر تحميل المستند. تحقّق من الرابط أو حاول لاحقاً.');
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      task.destroy();
    };
  }, [src]);

  // Notify parent on page change
  useEffect(() => { onPageChange?.(page); }, [page, onPageChange]);

  // Expose imperative jump-to-page for the parent (annotations panel).
  useEffect(() => {
    if (!controlRef) return;
    controlRef.current = {
      jumpToPage: (n: number) => {
        const max = doc?.numPages ?? 1;
        setPage(Math.max(1, Math.min(max, n)));
      },
    };
    return () => { if (controlRef) controlRef.current = null; };
  }, [controlRef, doc]);

  // ── Render current page ──────────────────────────────────────────
  const renderPage = useCallback(async () => {
    if (!doc || !canvasRef.current || !containerRef.current) return;
    const pageObj = await doc.pdf.getPage(page);

    // Resolve effective scale.
    const baseViewport = pageObj.getViewport({ scale: 1 });
    let effectiveScale: number;
    if (scale === 'fit-width') {
      const containerW = containerRef.current.clientWidth - 32; // padding
      effectiveScale = Math.max(0.5, Math.min(3, containerW / baseViewport.width));
    } else {
      effectiveScale = scale;
    }

    const viewport = pageObj.getViewport({ scale: effectiveScale });
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // HiDPI support
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * dpr);
    canvas.height = Math.floor(viewport.height * dpr);
    canvas.style.width = `${viewport.width}px`;
    canvas.style.height = `${viewport.height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Cancel any in-flight render
    renderTaskRef.current?.cancel();
    const task = pageObj.render({ canvasContext: ctx, viewport });
    renderTaskRef.current = task;
    try {
      await task.promise;
    } catch (err) {
      // Ignore "Rendering cancelled" errors from rapid scale changes.
      const e = err as { name?: string; message?: string };
      if (e?.name !== 'RenderingCancelledException') console.warn(err);
      return;
    }

    // Text layer (for selection + search highlight)
    if (textLayerRef.current) {
      textLayerRef.current.innerHTML = '';
      textLayerRef.current.style.width = `${viewport.width}px`;
      textLayerRef.current.style.height = `${viewport.height}px`;
      try {
        const textContent = await pageObj.getTextContent();
        const TextLayer = (pdfjsLib as unknown as { TextLayer?: typeof pdfjsLib.TextLayer }).TextLayer;
        if (TextLayer) {
          const textLayer = new TextLayer({
            textContentSource: textContent,
            container: textLayerRef.current,
            viewport,
          });
          await textLayer.render();
        }
      } catch (err) {
        // Text-layer issues are non-fatal — viewer still works.
        console.warn('text layer render failed', err);
      }
    }
  }, [doc, page, scale]);

  useEffect(() => { renderPage(); }, [renderPage]);

  // Re-render on resize when in fit-width mode
  useEffect(() => {
    if (scale !== 'fit-width') return;
    let raf = 0;
    const onResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(renderPage);
    };
    window.addEventListener('resize', onResize);
    return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(raf); };
  }, [scale, renderPage]);

  // ── Keyboard shortcuts ───────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        if (doc) setPage((p) => Math.min(doc.numPages, p + 1));
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        setPage((p) => Math.max(1, p - 1));
      } else if (e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
      } else if (e.key === '+' || e.key === '=') {
        zoomIn();
      } else if (e.key === '-') {
        zoomOut();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  // ── Zoom controls ────────────────────────────────────────────────
  const SCALES = useMemo(() => [0.5, 0.75, 1, 1.25, 1.5, 2, 3], []);
  const zoomIn = () => {
    setScale((cur) => {
      const v = typeof cur === 'number' ? cur : 1;
      const next = SCALES.find((s) => s > v) ?? SCALES[SCALES.length - 1]!;
      return next;
    });
  };
  const zoomOut = () => {
    setScale((cur) => {
      const v = typeof cur === 'number' ? cur : 1;
      const next = [...SCALES].reverse().find((s) => s < v) ?? SCALES[0]!;
      return next;
    });
  };

  // ── Search ───────────────────────────────────────────────────────
  const runSearch = async () => {
    if (!doc || !searchTerm.trim()) { setSearchHits([]); return; }
    const term = searchTerm.trim().toLowerCase();
    const hits: { page: number; text: string }[] = [];
    for (let n = 1; n <= doc.numPages; n++) {
      const p = await doc.pdf.getPage(n);
      const tc = await p.getTextContent();
      const text = tc.items.map((it) => ('str' in it ? it.str : '')).join(' ').toLowerCase();
      if (text.includes(term)) {
        const idx = text.indexOf(term);
        const snippet = text.slice(Math.max(0, idx - 30), idx + term.length + 30);
        hits.push({ page: n, text: snippet });
      }
    }
    setSearchHits(hits);
    setSearchIdx(0);
    if (hits.length > 0 && hits[0]) setPage(hits[0].page);
  };

  const nextHit = () => {
    if (!searchHits.length) return;
    const next = (searchIdx + 1) % searchHits.length;
    setSearchIdx(next);
    const hit = searchHits[next];
    if (hit) setPage(hit.page);
  };
  const prevHit = () => {
    if (!searchHits.length) return;
    const next = (searchIdx - 1 + searchHits.length) % searchHits.length;
    setSearchIdx(next);
    const hit = searchHits[next];
    if (hit) setPage(hit.page);
  };

  // ── Fullscreen ───────────────────────────────────────────────────
  const toggleFullscreen = () => {
    const el = containerRef.current?.parentElement;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().catch(() => undefined);
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => undefined);
      setIsFullscreen(false);
    }
  };
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const scaleLabel = scale === 'fit-width' ? 'ملاءمة' : `${Math.round(scale * 100)}%`;

  return (
    <div className={`pdf-viewer${fill ? ' fill' : ''}`}>
      {/* Toolbar */}
      <div className="pdf-toolbar">
        {title && <div className="pdf-title" title={title}>{title}</div>}
        <div className="pdf-toolbar-group">
          <button type="button" className="pdf-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} title="الصفحة السابقة" aria-label="الصفحة السابقة">
            <Icon icon={ChevronRight} size={16} />
          </button>
          <span className="pdf-pageinfo">
            <input
              type="number"
              value={page}
              min={1}
              max={doc?.numPages ?? 1}
              onChange={(e) => {
                const n = Math.max(1, Math.min(doc?.numPages ?? 1, +e.target.value || 1));
                setPage(n);
              }}
              aria-label="رقم الصفحة"
            />
            <span className="pdf-pageinfo-total"> / {doc?.numPages ?? '—'}</span>
          </span>
          <button type="button" className="pdf-btn" onClick={() => doc && setPage((p) => Math.min(doc.numPages, p + 1))} disabled={!doc || page >= doc.numPages} title="الصفحة التالية" aria-label="الصفحة التالية">
            <Icon icon={ChevronLeft} size={16} />
          </button>
        </div>

        <div className="pdf-toolbar-group">
          <button type="button" className="pdf-btn" onClick={zoomOut} title="تصغير" aria-label="تصغير">
            <Icon icon={ZoomOut} size={16} />
          </button>
          <button
            type="button"
            className="pdf-scale-pill"
            onClick={() => setScale((s) => (s === 'fit-width' ? 1 : 'fit-width'))}
            title="ملاءمة العرض"
          >
            {scaleLabel}
          </button>
          <button type="button" className="pdf-btn" onClick={zoomIn} title="تكبير" aria-label="تكبير">
            <Icon icon={ZoomIn} size={16} />
          </button>
        </div>

        <div className="pdf-toolbar-group" style={{ marginInlineStart: 'auto' }}>
          <button type="button" className={`pdf-btn${searchOpen ? ' on' : ''}`} onClick={() => setSearchOpen((v) => !v)} title="بحث" aria-label="بحث">
            <Icon icon={Search} size={16} />
          </button>
          <a href={src} download className="pdf-btn" title="تحميل" aria-label="تحميل المستند">
            <Icon icon={Download} size={16} />
          </a>
          <button type="button" className="pdf-btn" onClick={toggleFullscreen} title={isFullscreen ? 'الخروج من الشاشة الكاملة' : 'شاشة كاملة'} aria-label="شاشة كاملة">
            <Icon icon={isFullscreen ? Minimize2 : Maximize2} size={16} />
          </button>
        </div>
      </div>

      {/* Search bar */}
      {searchOpen && (
        <div className="pdf-searchbar" role="search">
          <Icon icon={Search} size={14} className="pdf-searchbar-icon" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث في المستند…"
            onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
            autoFocus
          />
          {searchHits.length > 0 && (
            <span className="pdf-searchbar-count font-mono">
              {searchIdx + 1} / {searchHits.length}
            </span>
          )}
          <button type="button" className="pdf-btn sm" onClick={prevHit} disabled={!searchHits.length} aria-label="النتيجة السابقة">
            <Icon icon={ChevronRight} size={14} />
          </button>
          <button type="button" className="pdf-btn sm" onClick={nextHit} disabled={!searchHits.length} aria-label="النتيجة التالية">
            <Icon icon={ChevronLeft} size={14} />
          </button>
          <button type="button" className="pdf-btn sm" onClick={runSearch}>
            بحث
          </button>
          <button type="button" className="pdf-btn sm" onClick={() => { setSearchOpen(false); setSearchHits([]); setSearchTerm(''); }} aria-label="إغلاق">
            <Icon icon={X} size={14} />
          </button>
        </div>
      )}

      {/* Document area */}
      <div className="pdf-canvas-wrap" ref={containerRef}>
        {loading && (
          <div className="pdf-status">
            <Icon icon={Loader2} size={24} className="spin" />
            <span>جاري تحميل المستند…</span>
          </div>
        )}
        {error && (
          <div className="pdf-status pdf-status-error">
            <span>{error}</span>
          </div>
        )}
        {!loading && !error && (
          <div className="pdf-page" dir="ltr">
            <canvas ref={canvasRef} />
            <div ref={textLayerRef} className="pdf-textLayer" />
          </div>
        )}
      </div>
    </div>
  );
}
