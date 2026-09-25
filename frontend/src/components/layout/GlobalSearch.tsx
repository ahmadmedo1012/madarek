/**
 * Global in-app search.
 *
 * Pattern (per UI/UX Pro Max guidelines):
 *  - Debounced fetch (300ms)
 *  - Autocomplete dropdown — never reload the page
 *  - "No results" with helpful suggestions, never a blank screen
 *  - Keyboard nav: ↑/↓ to move, Enter to open, Esc to close
 *  - "/" focuses the input from anywhere on the page
 */
import { useEffect, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight, type LucideIcon } from 'lucide-react';
import { Icon } from '../Icon';
import { EmojiIcon } from '../EmojiIcon';
import { api, unwrap } from '../../lib/api';

/* ── Focus-trapped overlay guard (11-e P1-6) ─────────────────────
   ⌘K and "/" must never steal focus while a modal / sheet /
   lightbox / command palette is open: their focus traps guard Tab
   and Escape, not programmatic focus moves, so the input would
   land behind the modal scrim and this dropdown would render
   underneath it.

   Two signals, OR'd so either can veto:
   1. The overlay-stack platform (lib/overlayStack, batch 12-14) —
      any registered open layer (incl. anchored dropdowns) owns the
      keyboard. Resolved through an eager import.meta.glob so this
      build stays valid whether or not that parallel batch has
      merged: an absent file compiles to an empty record and the
      DOM fallback below carries the guard alone. Verified: the
      glob resolves to the same module singleton a static import
      would (registry identity is preserved).
   2. DOM fallback: any live [aria-modal="true"] dialog — the marker
      every focus-trapped overlay renders, and the only signal that
      also covers the exit-animation window after a modal starts
      closing but is still mounted. */

type OverlayStackModule = { overlayStack: { isEmpty(): boolean } };

declare global {
  interface ImportMeta {
    /** Only the import.meta.glob member this file consumes — declared
     *  locally because the project's tsconfig does not reference
     *  vite/client (src/vite-env.d.ts hand-rolls ImportMeta). Both
     *  overloads mirror vite/client's shapes: lazy globs map to a
     *  loader, eager globs ({ eager: true }) inline the module. */
    glob<M = Record<string, unknown>>(pattern: string): Record<string, () => Promise<M>>;
    glob<M = Record<string, unknown>>(pattern: string, options: { eager: true }): Record<string, M>;
  }
}

const overlayStackModules = import.meta.glob<OverlayStackModule>('../../lib/overlayStack.ts', { eager: true });
const overlayStack = overlayStackModules['../../lib/overlayStack.ts']?.overlayStack ?? null;

function focusTrappedOverlayOpen(): boolean {
  if (overlayStack && !overlayStack.isEmpty()) return true;
  return document.querySelector('[aria-modal="true"]') !== null;
}

interface SearchHit {
  id: string;
  title: string;
  subtitle: string;
  iconEmoji?: string | null;
  themeColor?: string | null;
  href: string;
}
interface SearchResults {
  courses: SearchHit[];
  lectures: SearchHit[];
  papers: SearchHit[];
  tracks: SearchHit[];
}

const SECTION_LABEL: Record<keyof SearchResults, string> = {
  courses: 'مقررات',
  lectures: 'محاضرات',
  papers: 'بحوث منشورة',
  tracks: 'مسارات تدريب',
};

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Debounce the query
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch results
  useEffect(() => {
    if (debounced.length < 2) {
      setResults(null);
      return;
    }
    let cancelled = false;
    setLoading(true);
    unwrap<SearchResults>(api.get(`/search/global?q=${encodeURIComponent(debounced)}`))
      .then((d) => { if (!cancelled) setResults(d); })
      .catch(() => { if (!cancelled) setResults(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debounced]);

  // Flatten for keyboard nav
  const flatHits = useMemo(() => {
    if (!results) return [];
    return [
      ...results.courses,
      ...results.lectures,
      ...results.papers,
      ...results.tracks,
    ];
  }, [results]);

  useEffect(() => { setActiveIdx(0); }, [flatHits.length]);

  // Global shortcuts: "/" focuses the search from anywhere (except
  // text fields), ⌘K / Ctrl+K focuses it unconditionally (chords don't
  // type characters, and some browsers reserve Ctrl+K — claim it).
  // Both are inert while a focus-trapped overlay is open (see the
  // guard above) — the chord must not yank focus behind a scrim.
  // The inTextField guard mirrors Sidebar's Ctrl+B handler:
  // contentEditable hosts are text fields too (0-c P2-12 partial).
  const isMac =
    typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.userAgent);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (focusTrappedOverlayOpen()) return;
      const target = e.target as HTMLElement | null;
      const inTextField =
        ['INPUT', 'TEXTAREA'].includes(target?.tagName ?? '') ||
        target?.isContentEditable === true;
      if (e.key === '/' && !inTextField) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
        return;
      }
      if ((e.metaKey || e.ctrlKey) && !e.altKey && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!flatHits.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % flatHits.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + flatHits.length) % flatHits.length);
    } else if (e.key === 'Enter' && flatHits[activeIdx]) {
      e.preventDefault();
      goTo(flatHits[activeIdx]!.href);
    }
  };

  const goTo = (href: string) => {
    setOpen(false);
    setQuery('');
    setDebounced('');
    setResults(null);
    navigate(href);
  };

  const sections: Array<keyof SearchResults> = ['courses', 'lectures', 'papers', 'tracks'];
  const totalHits = flatHits.length;
  const showDropdown = open && (loading || debounced.length >= 2);

  let runningIdx = 0;

  return (
    <div className="global-search" ref={containerRef}>
      <label
        className={`topbar-search${query ? ' has-clear' : ' has-shortcut'}`}
        onClick={() => setOpen(true)}
      >
        <span className="topbar-search-icon"><Icon icon={Search} size={14} /></span>
        <input
          ref={inputRef}
          type="text"
          placeholder="ابحث في المنصة (مقررات، محاضرات، بحوث، مسارات)…"
          aria-label="بحث"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            className="topbar-search-clear"
            onClick={(e) => { e.preventDefault(); setQuery(''); inputRef.current?.focus(); }}
            aria-label="مسح"
          >
            <Icon icon={X} size={12} />
          </button>
        )}
        {!query && (
          <span className="topbar-search-shortcut">
            {/* bdi isolates the Latin/symbol run (⌘ first, then K) while
                letting the span keep the RTL context — a dir="ltr" on the
                span itself would flip its inset-inline-end anchor to the
                wrong physical side. */}
            <bdi>{isMac ? '⌘K' : 'Ctrl+K'}</bdi>
          </span>
        )}
      </label>

      {showDropdown && (
        <div className="search-dropdown" role="listbox" aria-label="نتائج البحث">
          {loading && (
            <div className="search-row search-loading">
              <span className="search-shimmer" />
              <span className="search-shimmer" />
              <span className="search-shimmer" />
            </div>
          )}

          {!loading && debounced.length >= 2 && totalHits === 0 && (
            <div className="search-empty">
              <div className="search-empty-title">لم نعثر على نتائج لـ "{debounced}"</div>
              <div className="search-empty-tips">
                جرّب: <button type="button" className="search-tip-pill" onClick={() => setQuery('هندسة')}>هندسة</button>
                <button type="button" className="search-tip-pill" onClick={() => setQuery('بحث')}>بحث</button>
                <button type="button" className="search-tip-pill" onClick={() => setQuery('برمجة')}>برمجة</button>
                <button type="button" className="search-tip-pill" onClick={() => setQuery('الزاوية')}>الزاوية</button>
              </div>
              <div className="search-empty-hint">
                البحث يشمل المقرّرات والمحاضرات والبحوث المنشورة ومسارات التدريب.
              </div>
            </div>
          )}

          {!loading && results && totalHits > 0 && sections.map((section) => {
            const items = results[section];
            if (items.length === 0) return null;
            return (
              <div key={section} className="search-section">
                <div className="search-section-label">{SECTION_LABEL[section]}</div>
                {items.map((hit) => {
                  const idx = runningIdx++;
                  const isActive = idx === activeIdx;
                  /* wave 2-b (0-c P2-9): `${accent}1a` produced invalid CSS
                     whenever themeColor was null (`var(--accent)1a`). A
                     color-mix tint is valid for both hex and var() accents. */
                  const accent = hit.themeColor ?? 'var(--accent)';
                  return (
                    <button
                      key={hit.id}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={`search-row${isActive ? ' active' : ''}`}
                      onMouseEnter={() => setActiveIdx(idx)}
                      onClick={() => goTo(hit.href)}
                    >
                      <span
                        className="search-row-icon"
                        style={{
                          background: `color-mix(in srgb, ${accent} 10%, transparent)`,
                          color: accent,
                        }}
                      >
                        <EmojiIcon emoji={hit.iconEmoji} size={16} fallback={Search} />
                      </span>
                      <span className="search-row-body">
                        <span className="search-row-title">{hit.title}</span>
                        <span className="search-row-sub">{hit.subtitle}</span>
                      </span>
                      <Icon icon={ArrowRight} size={12} className="search-row-arrow" />
                    </button>
                  );
                })}
              </div>
            );
          })}

          {!loading && totalHits > 0 && (
            <div className="search-footer">
              <span className="kbd">↑</span><span className="kbd">↓</span> للتنقّل
              <span className="kbd">↵</span> للفتح
              <span className="kbd">Esc</span> للإغلاق
            </div>
          )}
        </div>
      )}
    </div>
  );
}
