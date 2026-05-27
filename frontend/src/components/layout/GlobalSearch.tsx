/**
 * Global in-app search.
 *
 * Pattern (per UI/UX Pro Max guidelines):
 *  - Debounced fetch (300ms)
 *  - Autocomplete dropdown -- never reload the page
 *  - "No results" with helpful suggestions, never a blank screen
 *  - Keyboard nav: up/down to move, Enter to open, Esc to close
 *  - "/" focuses the input from anywhere on the page
 *  - AI-powered suggestion chips when focused but empty
 *  - Category filter pills
 *  - Recent searches stored in component state
 */
import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowRight, BookOpen, Presentation, FileText, Route } from 'lucide-react';
import { Icon } from '../Icon';
import { api, unwrap } from '../../lib/api';
import { useI18nStore } from '../../stores/i18n.store';

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

type CategoryKey = keyof SearchResults;

const SECTION_LABEL: Record<CategoryKey, string> = {
  courses: 'مقررات',
  lectures: 'محاضرات',
  papers: 'بحوث منشورة',
  tracks: 'مسارات تدريب',
};

const SECTION_LABEL_EN: Record<CategoryKey, string> = {
  courses: 'Courses',
  lectures: 'Lectures',
  papers: 'Papers',
  tracks: 'Training Tracks',
};

const CATEGORY_ICONS: Record<CategoryKey, typeof BookOpen> = {
  courses: BookOpen,
  lectures: Presentation,
  papers: FileText,
  tracks: Route,
};

const AI_SUGGESTIONS_AR = [
  'برمجة متقدمة',
  'ذكاء اصطناعي',
  'قواعد بيانات',
  'هندسة برمجيات',
  'شبكات حاسوب',
];

const AI_SUGGESTIONS_EN = [
  'Advanced Programming',
  'Artificial Intelligence',
  'Databases',
  'Software Engineering',
  'Computer Networks',
];

const MAX_RECENT = 5;

export function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [debounced, setDebounced] = useState('');
  const [open, setOpen] = useState(false);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeCategory, setActiveCategory] = useState<CategoryKey | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const stored = localStorage.getItem('madarek-recent-searches');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const locale = useI18nStore((s) => s.locale);

  const suggestions = locale === 'ar' ? AI_SUGGESTIONS_AR : AI_SUGGESTIONS_EN;
  const sectionLabels = locale === 'ar' ? SECTION_LABEL : SECTION_LABEL_EN;
  const categories: CategoryKey[] = ['courses', 'lectures', 'papers', 'tracks'];

  const addRecent = useCallback((term: string) => {
    setRecentSearches((prev) => {
      const filtered = prev.filter((s) => s !== term);
      const updated = [term, ...filtered].slice(0, MAX_RECENT);
      try {
        localStorage.setItem('madarek-recent-searches', JSON.stringify(updated));
      } catch { /* ignore */ }
      return updated;
    });
  }, []);

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
    const params = new URLSearchParams({ q: debounced });
    if (activeCategory) params.set('category', activeCategory);
    unwrap<SearchResults>(api.get(`/search/global?${params.toString()}`))
      .then((d) => { if (!cancelled) setResults(d); })
      .catch(() => { if (!cancelled) setResults(null); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debounced, activeCategory]);

  // Flatten for keyboard nav
  const flatHits = useMemo(() => {
    if (!results) return [];
    const filtered = activeCategory
      ? results[activeCategory]
      : [
          ...results.courses,
          ...results.lectures,
          ...results.papers,
          ...results.tracks,
        ];
    return filtered;
  }, [results, activeCategory]);

  useEffect(() => { setActiveIdx(0); }, [flatHits.length]);

  // Global "/" shortcut
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName ?? '')) {
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
    if (query.trim()) addRecent(query.trim());
    setOpen(false);
    setQuery('');
    setDebounced('');
    setResults(null);
    setActiveCategory(null);
    navigate(href);
  };

  const sections: CategoryKey[] = ['courses', 'lectures', 'papers', 'tracks'];
  const totalHits = flatHits.length;
  const showDropdown = open;
  const showResults = loading || debounced.length >= 2;
  const showSuggestions = !loading && debounced.length < 2;

  let runningIdx = 0;

  return (
    <div className="global-search" ref={containerRef}>
      <label className="topbar-search" onClick={() => setOpen(true)}>
        <span className="topbar-search-icon"><Icon icon={Search} size={14} /></span>
        <input
          ref={inputRef}
          type="text"
          placeholder={locale === 'ar' ? 'ابحث في المنصة (مقررات، محاضرات، بحوث، مسارات)…' : 'Search platform (courses, lectures, papers, tracks)...'}
          aria-label={locale === 'ar' ? 'بحث' : 'Search'}
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
            aria-label={locale === 'ar' ? 'مسح' : 'Clear'}
          >
            <Icon icon={X} size={12} />
          </button>
        )}
        {!query && <span className="topbar-search-shortcut">/</span>}
      </label>

      {showDropdown && (
        <div className="search-dropdown search-dropdown-animated" role="listbox" aria-label={locale === 'ar' ? 'نتائج البحث' : 'Search results'}>
          {/* Category filter pills */}
          <div className="search-category-pills">
            <button
              type="button"
              className={`search-category-pill${activeCategory === null ? ' active' : ''}`}
              onClick={() => setActiveCategory(null)}
            >
              {locale === 'ar' ? 'الكل' : 'All'}
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                className={`search-category-pill${activeCategory === cat ? ' active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                <Icon icon={CATEGORY_ICONS[cat]} size={12} />
                {sectionLabels[cat]}
              </button>
            ))}
          </div>

          {/* AI suggestions when empty */}
          {showSuggestions && (
            <div className="search-suggestions">
              {/* Recent searches */}
              {recentSearches.length > 0 && (
                <div className="search-recent">
                  <div className="search-section-label">
                    {locale === 'ar' ? 'عمليات بحث سابقة' : 'Recent Searches'}
                  </div>
                  <div className="search-chips">
                    {recentSearches.map((term) => (
                      <button
                        key={term}
                        type="button"
                        className="search-tip-pill"
                        onClick={() => { setQuery(term); }}
                      >
                        {term}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* AI suggestion chips */}
              <div className="search-ai-suggestions">
                <div className="search-section-label">
                  {locale === 'ar' ? 'اقتراحات ذكية' : 'Smart Suggestions'}
                </div>
                <div className="search-chips">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      className="search-tip-pill search-tip-pill--ai"
                      onClick={() => { setQuery(s); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Loading state */}
          {showResults && loading && (
            <div className="search-row search-loading">
              <span className="search-shimmer skeleton-shimmer" />
              <span className="search-shimmer skeleton-shimmer" />
              <span className="search-shimmer skeleton-shimmer" />
            </div>
          )}

          {/* No results */}
          {showResults && !loading && debounced.length >= 2 && totalHits === 0 && (
            <div className="search-empty">
              <div className="search-empty-title">
                {locale === 'ar' ? `لم نعثر على نتائج لـ "${debounced}"` : `No results found for "${debounced}"`}
              </div>
              <div className="search-empty-tips">
                {locale === 'ar' ? 'جرّب: ' : 'Try: '}
                <button type="button" className="search-tip-pill" onClick={() => setQuery('هندسة')}>هندسة</button>
                <button type="button" className="search-tip-pill" onClick={() => setQuery('بحث')}>بحث</button>
                <button type="button" className="search-tip-pill" onClick={() => setQuery('برمجة')}>برمجة</button>
                <button type="button" className="search-tip-pill" onClick={() => setQuery('مدارك')}>مدارك</button>
              </div>
              <div className="search-empty-hint">
                {locale === 'ar'
                  ? 'البحث يشمل المقرّرات والمحاضرات والبحوث المنشورة ومسارات التدريب.'
                  : 'Search covers courses, lectures, published papers, and training tracks.'}
              </div>
            </div>
          )}

          {/* Results sections */}
          {showResults && !loading && results && totalHits > 0 && (
            activeCategory ? (
              <div className="search-section">
                <div className="search-section-label">{sectionLabels[activeCategory]}</div>
                {flatHits.map((hit) => {
                  const idx = runningIdx++;
                  const isActive = idx === activeIdx;
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
                      <span className="search-row-icon" style={{ background: `${accent}1a`, color: accent }}>
                        {hit.iconEmoji ?? '🔎'}
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
            ) : (
              sections.map((section) => {
                const items = results[section];
                if (items.length === 0) return null;
                return (
                  <div key={section} className="search-section">
                    <div className="search-section-label">{sectionLabels[section]}</div>
                    {items.map((hit) => {
                      const idx = runningIdx++;
                      const isActive = idx === activeIdx;
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
                          <span className="search-row-icon" style={{ background: `${accent}1a`, color: accent }}>
                            {hit.iconEmoji ?? '🔎'}
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
              })
            )
          )}

          {showResults && !loading && totalHits > 0 && (
            <div className="search-footer">
              <span className="kbd">↑</span><span className="kbd">↓</span> {locale === 'ar' ? 'للتنقّل' : 'Navigate'}
              <span className="kbd">↵</span> {locale === 'ar' ? 'للفتح' : 'Open'}
              <span className="kbd">Esc</span> {locale === 'ar' ? 'للإغلاق' : 'Close'}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
