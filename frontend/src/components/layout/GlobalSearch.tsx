/**
 * Global in-app search + the ⌘K command-palette body.
 *
 * Pattern:
 *  - Debounced query key (300ms) on the shared TanStack cache — identical
 *    re-searches are served without refetching, and the AbortController
 *    TanStack hands the queryFn rides on the raw GET, so a superseded
 *    keystroke's request is aborted instead of racing the newer term
 *    (15-e P1-3 + 15-d P2-8; clearing the query simply disables the
 *    query, so the loading state can never stick the way the old manual
 *    effect's cancelled-flag path could)
 *  - Autocomplete dropdown — never reload the page
 *  - "No results" with helpful suggestions; a failed fetch renders a
 *    retryable error row, never a fake "no results"
 *  - Combobox ARIA (15-g P1-1): input role="combobox" + aria-expanded /
 *    aria-controls / aria-activedescendant, listbox → group → option
 *    roles with stable ids, and a visually-hidden live region announcing
 *    the Arabic result count once loading settles
 *  - Keyboard nav: ↑/↓ to move, Enter to open, Esc to close
 *  - "/" focuses the input from anywhere on the page — except on the
 *    ≤920px band where the pill is display:none: there the chord opens
 *    the command palette, the mobile search surface (4-A2 P1-3).
 *    ⌘K/Ctrl+K opens the command palette shell-wide (AppShell owns the
 *    chord — wave 21-a wiring of 4-A2 P2-8).
 */
import { useEffect, useId, useRef, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, X, ArrowLeft, Sun, Moon, CornerDownLeft } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Icon } from '../Icon';
import { EmojiIcon } from '../EmojiIcon';
import { api, unwrap } from '../../lib/api';
import { matchesQueryTokens } from '../../lib/search';
import { useAuthStore } from '../../stores/auth.store';
import { useThemeStore, resolveTheme } from '../../stores/theme.store';
import { NAV_BY_ROLE } from '../../lib/nav';

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

/* SR option-count announcement, Arabic counted-noun rules: 0 → none,
   1 → singular, 2 → dual, 3–10 → plural, 11+ → singular again.
   Latin digits per the platform's ar-LY numeral convention. Both
   surfaces (pill + palette) list actions and results in ONE listbox,
   so both count «خيارات» (5-B5, A4 P2-4 — the pill used to count
   «نتائج» only, silently ignoring its own action rows). */
function optionsCountAr(n: number): string {
  if (n === 0) return 'لا توجد خيارات';
  if (n === 1) return 'خيار واحد';
  if (n === 2) return 'خياران';
  if (n <= 10) return `${n} خيارات`;
  return `${n} خياراً`;
}

export function GlobalSearch({ onOpenCommandPalette }: { onOpenCommandPalette?: () => void } = {}) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();
  const role = useAuthStore((s) => s.user?.role);

  // Debounce the query
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  /* Live on the shared query cache (15-d P2-8): the debounced term is
     the query key, the ≥2-char gate enables it, and the AbortController
     TanStack passes the queryFn rides on the raw GET (15-e P1-3) — a
     superseded request is aborted instead of burning the socket, and
     clearing the query disables the query outright, so `loading` can
     never stick. Cache freshness + the retry policy come from the
     shared client defaults; a failed fetch renders a retryable error
     row, never a fake "no results". */
  const enabled = debounced.length >= 2;
  const { data, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ['search', 'global', debounced],
    enabled,
    queryFn: ({ signal }) =>
      unwrap<SearchResults>(
        api.get(`/search/global?q=${encodeURIComponent(debounced)}`, { signal }),
      ),
  });
  /* isPending covers the one-render gap between a key change and the
     fetch actually starting (status pending, fetchStatus idle) — without
     it the empty-state branch would flash for a frame before the
     shimmer. The manual effect had the same gap; the query layer lets
     us close it. */
  const loading = enabled && (isFetching || isPending);
  const results = data ?? null;

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

  /* 5-B5 (A4 P2-4): the pill answers with the SAME quick-action source
     the palette uses (NAV_BY_ROLE). Queries the live index can't answer
     («اختبار»/«محاضرة» — no people/competitions rows server-side) used
     to dead-end here while ⌘K answered with nav actions; both surfaces
     now speak with one voice. 5-C4 (A10 P2-4): the filter runs the
     word-level matcher — multiword queries match word-order-free
     (same predicate as the palette below; one matcher, three
     surfaces). */
  const navActions = useMemo(() => {
    if (!role || !debounced) return [];
    return NAV_BY_ROLE[role]
      .flatMap((g) => g.items)
      .filter((item) => matchesQueryTokens(item.label, debounced));
  }, [role, debounced]);

  /* One flat keyboard order across both sources — actions first, then
     live results (the palette's order, so ↑/↓ behave identically in
     both surfaces). */
  const flatOptions = useMemo(
    () => [
      ...navActions.map((item) => ({ kind: 'action' as const, to: item.to })),
      ...flatHits.map((hit) => ({ kind: 'hit' as const, href: hit.href })),
    ],
    [navActions, flatHits],
  );

  useEffect(() => { setActiveIdx(0); }, [flatOptions.length]);

  // ≤920px band: the pill is display:none (layout.css) — a focus() on
  // the hidden input is a no-op, so the "/" chord must route to the
  // command palette instead (4-A2 P1-3). matchMedia keeps this in sync
  // across resizes; jsdom's stub returns matches:false so unit tests
  // keep exercising the desktop path.
  const [mobileBand, setMobileBand] = useState(
    () =>
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(max-width: 920px)').matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 920px)');
    const onChange = () => setMobileBand(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  // Global shortcut: "/" focuses the search from anywhere (except text
  // fields). On the ≤920px band — where the pill isn't rendered — it
  // opens the command palette, the mobile search surface. ⌘K/Ctrl+K no
  // longer lives here: the chord opens the command palette and is owned
  // shell-wide by AppShell (wave 21-a), so the two listeners can never
  // fight over one press. Both paths stay inert while a focus-trapped
  // overlay is open (see the guard above) — the chord must not yank
  // focus behind a scrim.
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
        if (mobileBand) {
          onOpenCommandPalette?.();
          return;
        }
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileBand, onOpenCommandPalette]);

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
      /* 5-B5 (A4 P2-3): clear the term too — Escape used to leave the
         stale query behind, so the next "/" refocus reopened the
         dropdown with the old results and fresh typing concatenated
         onto the old term (measured «هندسةاختبار»). */
      setQuery('');
      setDebounced('');
      inputRef.current?.blur();
      return;
    }
    if (!flatOptions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % flatOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + flatOptions.length) % flatOptions.length);
    } else if (e.key === 'Enter' && flatOptions[activeIdx]) {
      e.preventDefault();
      const opt = flatOptions[activeIdx]!;
      goTo(opt.kind === 'action' ? opt.to : opt.href);
    }
  };

  const goTo = (href: string) => {
    setOpen(false);
    setQuery('');
    setDebounced('');
    navigate(href);
  };

  const sections: Array<keyof SearchResults> = ['courses', 'lectures', 'papers', 'tracks'];
  const totalHits = flatHits.length;
  const totalOptions = flatOptions.length;
  const showDropdown = open && (loading || enabled);
  /* aria-activedescendant must resolve to a live option — only when the
     listbox is rendered and the active row exists. */
  const activeOptionId =
    showDropdown && flatOptions[activeIdx] ? `${listboxId}-opt-${activeIdx}` : undefined;

  /* SR announcement (15-g P1-1): the combined option count — actions
     and results share ONE listbox now, so the palette's counted-noun
     grammar («خيارات») applies here too (5-B5, A4 P2-4 consistency). */
  const announcement =
    !enabled || loading
      ? ''
      : isError && !results
        ? 'تعذَّر إتمام البحث'
        : optionsCountAr(totalOptions);

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
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded={showDropdown}
          aria-controls={showDropdown ? listboxId : undefined}
          aria-activedescendant={activeOptionId}
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

      {/* Results-count live region — mounted unconditionally so a
          settled announcement is never clipped by the dropdown's own
          mount/unmount (it would unmount before SRs read it). */}
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {showDropdown && (
        <div
          className="search-dropdown"
          role="listbox"
          id={listboxId}
          aria-label="نتائج البحث"
        >
          {loading && (
            <div className="search-row search-loading" role="presentation">
              <span className="search-shimmer" />
              <span className="search-shimmer" />
              <span className="search-shimmer" />
            </div>
          )}

          {/* Fetch failure ≠ "no results" (15-d P2-8) — a retryable
              error row; stale cached hits (refetch failed on a term
              already in the cache) stay rendered below instead. */}
          {!loading && isError && !results && (
            <div className="search-empty" role="presentation">
              <div className="search-empty-title">تعذَّر إتمام البحث</div>
              <div className="search-empty-tips">
                <button type="button" className="search-tip-pill" onClick={() => refetch()}>
                  إعادة المحاولة
                </button>
              </div>
              <div className="search-empty-hint">تحقّق من اتصالك ثم أعد المحاولة.</div>
            </div>
          )}

          {/* 5-B5 (A4 P2-4): quick actions first — the palette's order. */}
          {!loading && navActions.length > 0 && (
            <div
              className="search-section"
              role="group"
              aria-labelledby={`${listboxId}-sec-actions`}
            >
              <div className="search-section-label" id={`${listboxId}-sec-actions`}>إجراءات سريعة</div>
              {navActions.map((item, idx) => {
                const isActive = idx === activeIdx;
                return (
                  <button
                    key={`act-${item.to}`}
                    id={`${listboxId}-opt-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={`search-row${isActive ? ' active' : ''}`}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => goTo(item.to)}
                  >
                    <span className="search-row-icon">
                      <Icon icon={item.icon} size={16} />
                    </span>
                    <span className="search-row-body">
                      <span className="search-row-title">{item.label}</span>
                    </span>
                    <Icon icon={ArrowLeft} size={12} className="search-row-arrow" />
                  </button>
                );
              })}
            </div>
          )}

          {!loading && !isError && enabled && totalOptions === 0 && (
            <div className="search-empty" role="presentation">
              <div className="search-empty-title">لم نعثر على نتائج لـ«{debounced}»</div>
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
            const sectionLabelId = `${listboxId}-sec-${section}`;
            return (
              <div
                key={section}
                className="search-section"
                role="group"
                aria-labelledby={sectionLabelId}
              >
                <div className="search-section-label" id={sectionLabelId}>{SECTION_LABEL[section]}</div>
                {items.map((hit) => {
                  const idx = navActions.length + runningIdx++;
                  const isActive = idx === activeIdx;
                  /* wave 2-b (0-c P2-9): `${accent}1a` produced invalid CSS
                     whenever themeColor was null (`var(--accent)1a`). A
                     color-mix tint is valid for both hex and var() accents. */
                  const accent = hit.themeColor ?? 'var(--accent)';
                  return (
                    <button
                      key={hit.id}
                      id={`${listboxId}-opt-${idx}`}
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
                      <Icon icon={ArrowLeft} size={12} className="search-row-arrow" />
                    </button>
                  );
                })}
              </div>
            );
          })}

          {!loading && !isError && totalOptions > 0 && (
            <div className="search-footer" role="presentation">
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

/* ───────────────────────────────────────────────────────────────
   COMMAND PALETTE BODY (wave 21-a — audits 4-A2 P2-8 + P1-3)
   ───────────────────────────────────────────────────────────────
   The content of the ⌘K surface, mounted by AppShell inside the
   <CommandPalette> primitive (focus trap + scroll lock + Esc are the
   primitive's). Two federated sources in ONE listbox:

     1. Quick actions — the very nav items the sidebar renders
        (lib/nav.ts NAV_BY_ROLE, so the palette and the sidebar can
        never drift) plus a theme toggle. Filtered by the query,
        capped at a curated few while the box is empty.
     2. Live global-search results — the SAME ['search','global',term]
        query key GlobalSearch uses, so the two surfaces share one
        cache entry per term: opening the palette on a term the pill
        already fetched is served without a second GET. That is the
        "no duplicated state" contract — only the input text is local.

   Combobox ARIA mirrors GlobalSearch (the pattern A2 verified-good):
   role=combobox + aria-expanded/controls/activedescendant over one
   listbox of labelled groups, ↑/↓/Enter keyboard loop, and a polite
   counted-noun live region announcing the combined option count.
   Opens for every role; fully keyboard-operable; rows carry a 44px
   touch floor (layout.css, hover:none band). */
const PALETTE_ACTIONS_EMPTY_CAP = 7;

interface PaletteAction {
  id: string;
  label: string;
  icon: LucideIcon;
  run: () => void;
}

export function CommandPaletteBody({ onClose }: { onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  const role = useAuthStore((s) => s.user?.role);
  const themeMode = useThemeStore((s) => s.mode);
  const setThemeMode = useThemeStore((s) => s.setMode);
  const resolvedTheme = resolveTheme(themeMode);

  // Debounce — same cadence as the pill so the shared cache key only
  // sees settled terms.
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Identical query to GlobalSearch — the shared queryClient cache is
  // the dedupe layer between the two surfaces.
  const enabled = debounced.length >= 2;
  const { data, isPending, isFetching, isError, refetch } = useQuery({
    queryKey: ['search', 'global', debounced],
    enabled,
    queryFn: ({ signal }) =>
      unwrap<SearchResults>(
        api.get(`/search/global?q=${encodeURIComponent(debounced)}`, { signal }),
      ),
  });
  const loading = enabled && (isFetching || isPending);
  const results = data ?? null;

  const goTo = (href: string) => {
    onClose();
    navigate(href);
    /* 5-B5 (A4 §7): release focus from the input NOW. The palette
       unmounts asynchronously (exit window) — without this, the input
       keeps focus through the navigation commit and only releases it
       to <body> at the final unmount, AFTER the shell's pathname-keyed
       focus rescue already checked. Blurring here makes the orphan
       visible in time, so the shell lands focus on the new page's
       topbar title. */
    inputRef.current?.blur();
  };

  // Quick actions: the role's nav destinations + the theme toggle.
  const actions = useMemo<PaletteAction[]>(() => {
    const navItems = role
      ? NAV_BY_ROLE[role].flatMap((g) => g.items).map((item) => ({
          id: `nav:${item.to}`,
          label: item.label,
          icon: item.icon,
          run: () => goTo(item.to),
        }))
      : [];
    const theme: PaletteAction = {
      id: 'action:theme',
      label: resolvedTheme === 'dark' ? 'التبديل إلى الوضع الفاتح' : 'التبديل إلى الوضع الداكن',
      icon: resolvedTheme === 'dark' ? Sun : Moon,
      run: () => {
        setThemeMode(resolvedTheme === 'dark' ? 'light' : 'dark');
        onClose();
      },
    };
    const all = [...navItems, theme];
    const q = debounced; // settled term — matching on the raw keystroke flickers
    if (!q) return all.slice(0, PALETTE_ACTIONS_EMPTY_CAP);
    /* 5-B5 (A4 P2-6): raw includes() missed hamza/diacritic variants —
       «الاختبارات» never found «الاختبارات الإلكترونية» if the user's
       keyboard produced أ/إ variants. The shared normalizer (lib/search.ts)
       makes the palette's action filter answer exactly like the backend
       search route (and now the pill's — one matcher, three surfaces).
       5-C4 (A10 P2-4): multiword goes through the word-level matcher —
       word order no longer decides («الاختبارات بنك» → بنك الأسئلة
       والاختبارات), 4+-letter words tolerate one edit («الطالب» →
       «الطلاب»), and the colloquial «امتحان*» folds to the product
       vocabulary «اختبار*» (nav.ts D17-1). */
    return all.filter((a) => matchesQueryTokens(a.label, q));
    // eslint-disable-next-line react-hooks/exhaustive-deps -- goTo closes over navigate only
  }, [role, debounced, resolvedTheme, setThemeMode, onClose, navigate]);

  const flatHits = useMemo(() => {
    if (!results) return [];
    return [
      ...results.courses,
      ...results.lectures,
      ...results.papers,
      ...results.tracks,
    ];
  }, [results]);

  // One flat keyboard order across both sources.
  const flatOptions = useMemo(() => [...actions, ...flatHits], [actions, flatHits]);
  useEffect(() => { setActiveIdx(0); }, [flatOptions.length]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!flatOptions.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % flatOptions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + flatOptions.length) % flatOptions.length);
    } else if (e.key === 'Enter') {
      const item = flatOptions[activeIdx];
      if (item) {
        e.preventDefault();
        if ('href' in item) goTo(item.href);
        else item.run();
      }
    }
  };

  /* aria-activedescendant must resolve to a live option. */
  const activeOptionId =
    flatOptions[activeIdx] != null ? `${listboxId}-opt-${activeIdx}` : undefined;

  /* Polite count announcement — actions + results settle together. */
  const announcement = loading ? '' : optionsCountAr(flatOptions.length);

  const sections: Array<keyof SearchResults> = ['courses', 'lectures', 'papers', 'tracks'];
  const showEmpty =
    !loading && !isError && actions.length === 0 && (!enabled || flatHits.length === 0);

  let runningIdx = 0;

  return (
    <div className="cmd-body">
      <div className="cmd-input-row">
        <span className="cmd-input-icon"><Icon icon={Search} size={16} /></span>
        <input
          ref={inputRef}
          type="text"
          className="cmd-input"
          placeholder="ابحث أو نفّذ أمراً…"
          aria-label="الأوامر والبحث"
          role="combobox"
          aria-haspopup="listbox"
          aria-expanded="true"
          aria-controls={listboxId}
          aria-activedescendant={activeOptionId}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          spellCheck={false}
        />
        <span className="cmd-input-esc"><span className="kbd">Esc</span></span>
      </div>

      <div className="cmd-list" role="listbox" id={listboxId} aria-label="الأوامر والنتائج">
        {loading && (
          <div className="search-row search-loading" role="presentation">
            <span className="search-shimmer" />
            <span className="search-shimmer" />
            <span className="search-shimmer" />
          </div>
        )}

        {!loading && isError && !results && (
          <div className="search-empty" role="presentation">
            <div className="search-empty-title">تعذَّر إتمام البحث</div>
            <div className="search-empty-tips">
              <button type="button" className="search-tip-pill" onClick={() => refetch()}>
                إعادة المحاولة
              </button>
            </div>
            <div className="search-empty-hint">تحقّق من اتصالك ثم أعد المحاولة.</div>
          </div>
        )}

        {actions.length > 0 && (
          <div className="search-section" role="group" aria-labelledby={`${listboxId}-sec-actions`}>
            <div className="search-section-label" id={`${listboxId}-sec-actions`}>إجراءات سريعة</div>
            {actions.map((action, idx) => {
              const isActive = idx === activeIdx;
              return (
                <button
                  key={action.id}
                  id={`${listboxId}-opt-${idx}`}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  className={`search-row cmd-row${isActive ? ' active' : ''}`}
                  onMouseEnter={() => setActiveIdx(idx)}
                  onClick={() => action.run()}
                >
                  <span className="search-row-icon cmd-row-icon">
                    <Icon icon={action.icon} size={15} />
                  </span>
                  <span className="search-row-body">
                    <span className="search-row-title">{action.label}</span>
                  </span>
                  <Icon icon={CornerDownLeft} size={12} className="search-row-arrow" />
                </button>
              );
            })}
          </div>
        )}

        {!loading && results && sections.map((section) => {
          const items = results[section];
          if (items.length === 0) return null;
          const sectionLabelId = `${listboxId}-sec-${section}`;
          return (
            <div key={section} className="search-section" role="group" aria-labelledby={sectionLabelId}>
              <div className="search-section-label" id={sectionLabelId}>{SECTION_LABEL[section]}</div>
              {items.map((hit) => {
                const idx = actions.length + runningIdx++;
                const isActive = idx === activeIdx;
                const accent = hit.themeColor ?? 'var(--accent)';
                return (
                  <button
                    key={hit.id}
                    id={`${listboxId}-opt-${idx}`}
                    type="button"
                    role="option"
                    aria-selected={isActive}
                    className={`search-row cmd-row${isActive ? ' active' : ''}`}
                    onMouseEnter={() => setActiveIdx(idx)}
                    onClick={() => goTo(hit.href)}
                  >
                    <span
                      className="search-row-icon cmd-row-icon"
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
                    <Icon icon={ArrowLeft} size={12} className="search-row-arrow" />
                  </button>
                );
              })}
            </div>
          );
        })}

        {showEmpty && (
          <div className="search-empty" role="presentation">
            <div className="search-empty-title">
              {debounced ? `لم نعثر على أوامر تطابق «${debounced}»` : 'لا توجد أوامر متاحة'}
            </div>
            <div className="search-empty-hint">
              جرّب كلمة من اسم المقرّر أو وجهة من القائمة الجانبية.
            </div>
          </div>
        )}
      </div>

      <div className="cmd-foot" role="presentation">
        <span className="kbd">↑</span><span className="kbd">↓</span> للتنقّل
        <span className="kbd">↵</span> للتنفيذ
        <span className="kbd">Esc</span> للإغلاق
      </div>

      {/* Combined-count live region — mounted unconditionally so a
          settled announcement is never clipped by the palette unmount. */}
      <div className="visually-hidden" role="status" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>
    </div>
  );
}
