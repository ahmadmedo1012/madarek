import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import {
  ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2,
  Download, Search, X,
} from 'lucide-react';
import { Icon } from '../Icon';
import { ErrorState } from '../primitives/States';
// pdfjs-dist v4 ships ESM. Use named imports so Vite/Rollup can tree-shake
// the rest of the public surface out of the bundle. Previously a namespace
// import (`import * as pdfjsLib`) pulled in everything pdfjs-dist exports
// (sizable), even though only GlobalWorkerOptions + getDocument + TextLayer
// are used here.
import { GlobalWorkerOptions, getDocument } from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

GlobalWorkerOptions.workerSrc = workerUrl;

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
  pdf: PDFDocumentProxy;
  numPages: number;
}

/**
 * Standard editable-surface guard for global keyboard shortcuts (audit 0-f
 * P1-5). Returns true when the event originated inside an input, textarea,
 * select, contenteditable host or [role=textbox] — the keystroke belongs to
 * the user's typing (search field, page picker, annotations composer…),
 * never to viewer shortcuts.
 */
function isEditableTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el || typeof el.closest !== 'function') return false;
  return !!el.closest(
    'input, textarea, select, [contenteditable="true"], [contenteditable=""], [role="textbox"]',
  );
}

/**
 * Shape-matched loading placeholder — a paper-shaped frame with a faint
 * text-line texture, mirroring the .pdf-page it stands in for (craft floor:
 * "never a bare spinner where a shape-matched skeleton fits").
 */
function PdfPageSkeleton({ label = 'جارٍ تحميل المستند…' }: { label?: string }) {
  return <div className="pdf-page-skeleton" role="status" aria-label={label} />;
}

export default function PdfViewer({ src, title, fill = true, controlRef, onPageChange, onDocumentLoaded }: PdfViewerProps) {
  const [doc, setDoc] = useState<DocState | null>(null);
  const [page, setPage] = useState(1);
  const [scale, setScale] = useState<number | 'fit-width'>('fit-width');
  const [error, setError] = useState<{ message: string; cause: unknown; kind?: 'password' } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isRendering, setIsRendering] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchHits, setSearchHits] = useState<{ page: number; text: string }[]>([]);
  const [searchIdx, setSearchIdx] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  /** Bumped by the error-state retry button — re-runs the load effect. */
  const [retryToken, setRetryToken] = useState(0);
  /** True while a search walk is visiting pages — without it, a
   *  300-page PDF looks frozen mid-search. */
  const [isSearching, setIsSearching] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textLayerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const fullscreenBtnRef = useRef<HTMLButtonElement>(null);
  const renderTaskRef = useRef<{ cancel: () => void; promise: Promise<void> } | null>(null);
  /** Content-box width of the canvas wrap, seeded by the ResizeObserver. */
  const containerWRef = useRef(0);
  /**
   * Monotonic search generation. Every document load, every new search
   * and every search close bumps it; an in-flight walk compares its
   * captured generation before each await and before each state write,
   * so a walk orphaned by a document switch or unmount can neither
   * plant page numbers from the wrong document nor surface as an
   * unhandled promise rejection (audit 11-f P1-3).
   */
  const searchGenRef = useRef(0);
  /**
   * The document currently on screen. Render errors are only honest for
   * this doc: after a src switch the destroyed predecessor rejects inside
   * the superseded render, and that stale catch must not plant an error
   * over the newly loading document (audit 11-f P2-9).
   */
  const docRef = useRef<DocState | null>(null);

  // ── Load document ────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    setDoc(null);
    docRef.current = null;
    // Kill any search walk from the previous document and drop its hits —
    // page numbers from document A must never navigate a viewer that is
    // now loading document B (audit 11-f P1-3).
    searchGenRef.current += 1;
    setSearchHits([]);
    setSearchIdx(0);
    setIsSearching(false);

    const task = getDocument({
      url: src,
      withCredentials: true, // include auth cookies for same-origin /files/*
      // Self-hosted assets (public/pdfjs/*) — no runtime dependency on unpkg.com
      cMapUrl: '/pdfjs/cmaps/',
      cMapPacked: true,
      standardFontDataUrl: '/pdfjs/standard_fonts/',
    });

    task.promise.then(
      (pdf) => {
        if (cancelled) { pdf.destroy(); return; }
        const next: DocState = { pdf, numPages: pdf.numPages };
        docRef.current = next;
        setDoc(next);
        setPage(1);
        // A superseded render of the previous document may have planted a
        // stale page error after this effect's initial reset — clear it
        // again so the fresh document starts clean (audit 11-f P2-9).
        setError(null);
        setLoading(false);
        onDocumentLoaded?.(pdf.numPages);
      },
      (err) => {
        if (cancelled) return;
        // Password-protected PDF: pdfjs rejects with PasswordException and
        // re-running the same no-credential load can never succeed — show
        // the honest message without a retry affordance (audit 11-f P2-8).
        if ((err as { name?: string } | null)?.name === 'PasswordException') {
          setError({ message: 'هذا المستند محمي بكلمة مرور', cause: err, kind: 'password' });
        } else {
          // Missing / corrupt PDF: surface an honest error state with retry
          // (orchestrator ruling #14) — the detail line comes from ErrorState.
          setError({ message: 'تعذّر تحميل المستند', cause: err });
        }
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
      // Orphan any search walk mid-flight on this document (src switch or
      // unmount) before destroying the doc underneath it.
      searchGenRef.current += 1;
      task.destroy();
    };
    // retryToken: the retry button re-runs this effect for the same src.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, retryToken]);

  const retry = useCallback(() => setRetryToken((t) => t + 1), []);

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
    // Snapshot the doc and DOM nodes up front: after the first await the
    // viewer may have moved on (src switch / unmount) and the refs can be
    // null again — a superseded render must not dereference them.
    const docSnapshot = doc;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!docSnapshot || !canvas || !container) return;
    setIsRendering(true);
    setError(null);
    try {
      const pageObj = await docSnapshot.pdf.getPage(page);

      // Resolve effective scale.
      const baseViewport = pageObj.getViewport({ scale: 1 });
      let effectiveScale: number;
      if (scale === 'fit-width') {
        // Observed content-box width (ResizeObserver-seeded, padding already
        // excluded — honest at every breakpoint). Fallback for the first
        // paint: clientWidth minus the --sp-4 × 2 canvas padding.
        const containerW = containerWRef.current
          || Math.max(0, container.clientWidth - 32);
        effectiveScale = Math.max(0.5, Math.min(3, containerW / baseViewport.width));
      } else {
        effectiveScale = scale;
      }

      const viewport = pageObj.getViewport({ scale: effectiveScale });
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
        // Ignore "Rendering cancelled" errors from rapid scale changes;
        // anything else (corrupt page content) becomes a retryable error.
        const e = err as { name?: string };
        if (e?.name !== 'RenderingCancelledException') {
          // Only honest for the document still on screen — see the catch
          // below (audit 11-f P2-9).
          if (docSnapshot === docRef.current) {
            setError({ message: 'تعذّر عرض هذه الصفحة', cause: err });
          }
        }
        return;
      }

      // Text layer (for selection + search highlight)
      if (textLayerRef.current) {
        textLayerRef.current.innerHTML = '';
        textLayerRef.current.style.width = `${viewport.width}px`;
        textLayerRef.current.style.height = `${viewport.height}px`;
        try {
          const textContent = await pageObj.getTextContent();
          // pdfjs-dist v4 exposes TextLayer as a named export at runtime,
          // but its type surface marks it optional in some build modes, so
          // the constructor is resolved with a runtime lookup + truthiness
          // check. Note this dynamic import does NOT shave anything off
          // the bundle — the module is already statically imported above
          // (getDocument), so this resolves to the same chunk; it is kept
          // only because it works and degrades cleanly (audit 11-f P2-11).
          const TextLayerCtor = (await import('pdfjs-dist')).TextLayer;
          if (TextLayerCtor) {
            const textLayer = new TextLayerCtor({
              textContentSource: textContent,
              container: textLayerRef.current,
              viewport,
            });
            await textLayer.render();
          }
        } catch {
          // Text-layer issues are non-fatal — selection/search degrade,
          // the rendered page still works.
        }
      }
    } catch (err) {
      // getPage() rejection — corrupt document past the load phase. Only
      // surface it for the document still on screen: a src switch destroys
      // the old doc, and its rejected renders must not plant an error over
      // the newly loading document (audit 11-f P2-9).
      if (docSnapshot === docRef.current) {
        setError({ message: 'تعذّر عرض هذه الصفحة', cause: err });
      }
    } finally {
      setIsRendering(false);
    }
  }, [doc, page, scale]);

  // Cancel the in-flight canvas render whenever the rendered page/scale/
  // document changes or the viewer unmounts — without this, a render keeps
  // painting into a detached canvas until the worker dies (audit 11-f
  // P2-9). The superseded render rejects with
  // RenderingCancelledException, which renderPage classifies and ignores.
  useEffect(() => {
    renderPage();
    return () => { renderTaskRef.current?.cancel(); };
  }, [renderPage]);

  // ── Fit-width recalculation ──────────────────────────────────────
  // The canvas wrap's width changes WITHOUT any window resize when the
  // annotations sidebar mounts/unmounts beside it (and on fullscreen entry),
  // so a window-resize listener alone leaves the canvas at a stale scale
  // until the next interaction (audit 0-f P2-20). ResizeObserver covers
  // window resizes, sidebar toggles and fullscreen alike; only genuine
  // width changes re-render (height-only scrollbar churn is ignored).
  useEffect(() => {
    if (scale !== 'fit-width') return;
    const el = containerRef.current;
    if (!el) return;
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(renderPage);
    };

    if (typeof ResizeObserver === 'undefined') {
      // Legacy fallback: window resize only (pre-RO browsers).
      const onResize = () => {
        containerWRef.current = Math.max(0, el.clientWidth - 32);
        schedule();
      };
      window.addEventListener('resize', onResize);
      return () => { window.removeEventListener('resize', onResize); cancelAnimationFrame(raf); };
    }

    let lastW = -1;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width ?? 0;
      if (w <= 0) return;
      containerWRef.current = w;
      if (lastW < 0) { lastW = w; return; } // first observation: seed only
      if (Math.abs(w - lastW) < 1) return;
      lastW = w;
      schedule();
    });
    ro.observe(el);
    return () => { ro.disconnect(); cancelAnimationFrame(raf); };
  }, [scale, renderPage]);

  // ── Zoom controls (declared before the keyboard shortcuts that use
  // them — the effect's dependency array reads these consts at render) ─
  const SCALES = useMemo(() => [0.5, 0.75, 1, 1.25, 1.5, 2, 3], []);
  const zoomIn = useCallback(() => {
    setScale((cur) => {
      const v = typeof cur === 'number' ? cur : 1;
      const next = SCALES.find((s) => s > v) ?? SCALES[SCALES.length - 1]!;
      return next;
    });
  }, [SCALES]);
  const zoomOut = useCallback(() => {
    setScale((cur) => {
      const v = typeof cur === 'number' ? cur : 1;
      const next = [...SCALES].reverse().find((s) => s < v) ?? SCALES[0]!;
      return next;
    });
  }, [SCALES]);

  // ── Search walk invalidation (declared before the keyboard shortcuts
  // that use them — the effect's dependency array reads these consts at
  // render, so TDZ rules apply) ─────────────────────────────
  /** Invalidate any in-flight search walk without touching the results
   *  UI — used when the search bar closes while a walk is still running. */
  const stopSearchWalk = useCallback(() => {
    searchGenRef.current += 1;
    setIsSearching(false);
  }, []);
  /** Close the search bar: kills any in-flight walk and clears the term
   *  and its hits together (the hits belong to the term). */
  const closeSearch = useCallback(() => {
    searchGenRef.current += 1;
    setIsSearching(false);
    setSearchOpen(false);
    setSearchHits([]);
    setSearchTerm('');
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────────────
  // Scope: the viewer owns its shortcuts only while the keystroke
  // originates inside the viewer (chrome/canvas) or while nothing more
  // specific has focus (body) — never while the user types in an editable
  // surface, and never while focus lives in another region such as the
  // annotations sidebar (audit 0-f P1-5).
  //
  // Arrow convention (RTL): the chrome's "previous" chevron points
  // inline-start (physically right in RTL) and "next" points inline-end
  // (left), matching every back/forward affordance in the app. The arrow
  // keys mirror the chevrons — ArrowRight = previous page, ArrowLeft =
  // next page under dir=rtl (the app default); PageUp/PageDown stay
  // physical (previous/next sheet). The live document direction is read
  // so an LTR embedding flips the mapping symmetrically.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isEditableTarget(e.target)) return;
      const targetEl = e.target as HTMLElement | null;
      const scopedToViewer =
        !targetEl ||
        targetEl === document.body ||
        targetEl === document.documentElement ||
        (viewerRef.current?.contains(targetEl) ?? false);
      if (!scopedToViewer) return;

      const rtl = document.documentElement.dir === 'rtl';
      const prevKey = rtl ? 'ArrowRight' : 'ArrowLeft';
      const nextKey = rtl ? 'ArrowLeft' : 'ArrowRight';

      if (e.key === nextKey || e.key === 'PageDown') {
        e.preventDefault();
        if (doc) setPage((p) => Math.min(doc.numPages, p + 1));
      } else if (e.key === prevKey || e.key === 'PageUp') {
        e.preventDefault();
        setPage((p) => Math.max(1, p - 1));
      } else if (e.key === '/') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
        // A walk can still be visiting pages while the bar is closed —
        // it must not jump the page from outside the visible search UI.
        stopSearchWalk();
      } else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        zoomIn();
      } else if (e.key === '-') {
        e.preventDefault();
        zoomOut();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [doc, zoomIn, zoomOut, stopSearchWalk]);

  // ── Search ───────────────────────────────────────────────────────
  // The walk visits every page asynchronously and is invalidated by the
  // searchGenRef generation counter (see its declaration). Every state
  // write is guarded by the captured generation and the whole walk is
  // wrapped in try/catch, so a destroyed document rejects quietly
  // instead of surfacing an unhandled promise rejection (audit 11-f P1-3).
  const runSearch = async () => {
    if (!doc || !searchTerm.trim()) {
      // Nothing to walk — cancel whatever is in flight and reset the UI.
      searchGenRef.current += 1;
      setSearchHits([]);
      setSearchIdx(0);
      setIsSearching(false);
      return;
    }
    const gen = ++searchGenRef.current; // supersedes any earlier walk
    const docSnapshot = doc;
    const term = searchTerm.trim().toLowerCase();
    const hits: { page: number; text: string }[] = [];
    setIsSearching(true);
    try {
      for (let n = 1; n <= docSnapshot.numPages; n++) {
        if (gen !== searchGenRef.current) return; // superseded — stop walking
        const p = await docSnapshot.pdf.getPage(n);
        const tc = await p.getTextContent();
        const text = tc.items.map((it) => ('str' in it ? it.str : '')).join(' ').toLowerCase();
        if (text.includes(term)) {
          const idx = text.indexOf(term);
          const snippet = text.slice(Math.max(0, idx - 30), idx + term.length + 30);
          hits.push({ page: n, text: snippet });
        }
      }
      if (gen !== searchGenRef.current) return; // superseded — drop results
      setSearchHits(hits);
      setSearchIdx(0);
      if (hits.length > 0 && hits[0]) setPage(hits[0].page);
    } catch {
      // The document was destroyed mid-walk (src switch / unmount): the
      // generation check already discarded this walk — swallow the destroy
      // rejection instead of surfacing an unhandled promise rejection. For
      // a genuine page failure on the live document, keep the hits found.
      if (gen !== searchGenRef.current) return;
      setSearchHits(hits);
      setSearchIdx(0);
    } finally {
      if (gen === searchGenRef.current) setIsSearching(false);
    }
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
  // fullscreenchange is the single source of truth for the toggle state:
  // requestFullscreen() can legitimately fail (iframe policy, iOS Safari),
  // and an optimistic flip would strand the toolbar showing the wrong
  // icon (audit 0-f craft review). On exit, focus returns to the toggle
  // button; on entry, focus lands inside the fullscreen surface so
  // keyboard users are not stranded outside it.
  const fullscreenSupported =
    typeof document !== 'undefined' &&
    typeof document.documentElement.requestFullscreen === 'function';

  const toggleFullscreen = () => {
    const el = viewerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => undefined);
    } else {
      el.requestFullscreen?.()
        .then(() => el.focus())
        .catch(() => undefined);
    }
  };
  useEffect(() => {
    const onChange = () => {
      const active = !!document.fullscreenElement;
      setIsFullscreen(active);
      if (!active) fullscreenBtnRef.current?.focus();
    };
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  const scaleLabel = scale === 'fit-width' ? 'ملاءمة' : `${Math.round(scale * 100)}%`;
  const numPages = doc?.numPages ?? 1;

  return (
    <div ref={viewerRef} tabIndex={-1} className={`pdf-viewer${fill ? ' fill' : ''}`}>
      {/* Toolbar */}
      <div className="pdf-toolbar">
        {title && <div className="pdf-title" title={title}>{title}</div>}
        <div className="pdf-toolbar-group" role="group" aria-label="التنقل بين الصفحات">
          <button type="button" className="pdf-btn" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} title="الصفحة السابقة" aria-label="الصفحة السابقة">
            <Icon icon={ChevronRight} size={16} />
          </button>
          <span className="pdf-pageinfo">
            <span className="pdf-pageinfo-word" aria-hidden="true">صفحة</span>
            <input
              type="number"
              value={page}
              min={1}
              max={numPages}
              onChange={(e) => {
                const n = Math.max(1, Math.min(numPages, +e.target.value || 1));
                setPage(n);
              }}
              aria-label={`رقم الصفحة، الحالية ${page} من ${numPages}`}
            />
            <span className="pdf-pageinfo-total" aria-hidden="true">من {doc?.numPages ?? '—'}</span>
          </span>
          <button type="button" className="pdf-btn" onClick={() => doc && setPage((p) => Math.min(doc.numPages, p + 1))} disabled={!doc || page >= numPages} title="الصفحة التالية" aria-label="الصفحة التالية">
            <Icon icon={ChevronLeft} size={16} />
          </button>
        </div>

        <div className="pdf-toolbar-group" role="group" aria-label="التكبير">
          <button type="button" className="pdf-btn" onClick={zoomOut} title="تصغير" aria-label="تصغير">
            <Icon icon={ZoomOut} size={16} />
          </button>
          <button
            type="button"
            className="pdf-scale-pill"
            onClick={() => setScale((s) => (s === 'fit-width' ? 1 : 'fit-width'))}
            aria-pressed={scale === 'fit-width'}
            title="ملاءمة العرض"
          >
            {scaleLabel}
          </button>
          <button type="button" className="pdf-btn" onClick={zoomIn} title="تكبير" aria-label="تكبير">
            <Icon icon={ZoomIn} size={16} />
          </button>
        </div>

        <div className="pdf-toolbar-group pdf-toolbar-actions">
          <button type="button" className={`pdf-btn${searchOpen ? ' on' : ''}`} onClick={() => setSearchOpen((v) => !v)} aria-pressed={searchOpen} title="بحث في المستند" aria-label="بحث في المستند">
            <Icon icon={Search} size={16} />
          </button>
          <a href={src} download className="pdf-btn" title="تحميل المستند" aria-label="تحميل المستند">
            <Icon icon={Download} size={16} />
          </a>
          {fullscreenSupported && (
            <button
              ref={fullscreenBtnRef}
              type="button"
              className="pdf-btn"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'الخروج من الشاشة الكاملة' : 'شاشة كاملة'}
              aria-label={isFullscreen ? 'الخروج من الشاشة الكاملة' : 'عرض بملء الشاشة'}
            >
              <Icon icon={isFullscreen ? Minimize2 : Maximize2} size={16} />
            </button>
          )}
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
            aria-label="البحث في المستند"
            onKeyDown={(e) => { if (e.key === 'Enter') runSearch(); }}
            autoFocus
          />
          {isSearching ? (
            <span className="pdf-searchbar-count" role="status" aria-live="polite">
              جارٍ البحث…
            </span>
          ) : searchHits.length > 0 && (
            <span className="pdf-searchbar-count font-mono" aria-live="polite">
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
          <button type="button" className="pdf-btn sm" onClick={closeSearch} aria-label="إغلاق البحث">
            <Icon icon={X} size={14} />
          </button>
        </div>
      )}

      {/* Document area */}
      <div className="pdf-canvas-wrap" ref={containerRef}>
        {loading && <PdfPageSkeleton />}
        {/* !loading gate: a superseded render of the previous document can
            plant a page error right as the next load starts — the skeleton
            and the error must never render together (audit 11-f P2-9).
            Password-protected PDFs hide the retry affordance: re-running
            the same no-credential load can never succeed (P2-8). */}
        {!loading && error && (
          <ErrorState
            message={error.message}
            error={error.cause}
            onRetry={error.kind === 'password' ? undefined : retry}
          />
        )}
        {!loading && !error && (
          <div
            className="pdf-page"
            dir="ltr"
            role="group"
            aria-label={`صفحة ${page} من ${numPages}`}
          >
            {/* The canvas is a raster of the same text the layer below it
                exposes — hide it from AT so the real, selectable text wins. */}
            <canvas ref={canvasRef} aria-hidden="true" />
            <div ref={textLayerRef} className="pdf-textLayer" />
          </div>
        )}
        {isRendering && !loading && !error && (
          <div className="pdf-rendering" role="status" aria-label="جارٍ عرض الصفحة…">
            <span className="spinner spinner-sm" aria-hidden="true" />
          </div>
        )}
        {/* Coarse-pointer hint: the browser's pinch gesture is the only
            touch zoom this viewer has (native pinch handling is a roadmap
            item, audit 0-f P3-38). Redundant for AT (nothing actionable) —
            hidden from it. */}
        <p className="pdf-touch-hint" aria-hidden="true">
          <Icon icon={ZoomIn} size={12} />
          قرّب بإصبعين لعرض التفاصيل
        </p>
      </div>
    </div>
  );
}
