import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CityName, FilterState } from '../pages/colleges/filter-colleges';
import { CAMPUS_ORDER } from '../pages/colleges/filter-colleges';

/**
 * useUrlQueryState — two-way binding between the URL search params
 * and the gallery's FilterState.
 *
 * See specs/004-colleges-gallery/contracts/gallery-state.md
 *
 * Reads are constant-time via useSearchParams().
 * Search-input writes are debounced 100 ms before they hit the URL
 * to avoid history-spam on every keystroke.
 */

const DEBOUNCE_MS = 100;

function isCityName(v: string | null): v is CityName {
  return v !== null && (CAMPUS_ORDER as ReadonlyArray<string>).indexOf(v) >= 0;
}

export function useUrlQueryState(): {
  state: FilterState;
  setQuery: (q: string) => void;
  setCampus: (c: CityName | null) => void;
  clear: () => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  // The "live" search value (what the input shows) is local;
  // the URL is the eventually-consistent debounced source of truth.
  const urlQuery = searchParams.get('q') ?? '';
  const urlCampusRaw = searchParams.get('campus');
  const urlCampus: CityName | null = isCityName(urlCampusRaw) ? urlCampusRaw : null;

  const [liveQuery, setLiveQuery] = useState<string>(urlQuery);

  // Keep liveQuery in sync if the URL changes outside our control
  // (e.g., browser back/forward).
  const lastUrlQueryRef = useRef(urlQuery);
  useEffect(() => {
    if (urlQuery !== lastUrlQueryRef.current) {
      lastUrlQueryRef.current = urlQuery;
      setLiveQuery(urlQuery);
    }
  }, [urlQuery]);

  // Debounce the URL write for the search query.
  useEffect(() => {
    if (liveQuery === urlQuery) return;
    const timer = setTimeout(() => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (liveQuery.trim() === '') next.delete('q');
        else next.set('q', liveQuery);
        return next;
      });
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [liveQuery, urlQuery, setSearchParams]);

  const setQuery = useCallback((q: string) => {
    setLiveQuery(q);
  }, []);

  const setCampus = useCallback(
    (c: CityName | null) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (c === null) next.delete('campus');
        else next.set('campus', c);
        return next;
      });
    },
    [setSearchParams],
  );

  const clear = useCallback(() => {
    setLiveQuery('');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('q');
      next.delete('campus');
      return next;
    });
  }, [setSearchParams]);

  const state = useMemo<FilterState>(
    () => ({ query: liveQuery, campus: urlCampus }),
    [liveQuery, urlCampus],
  );

  return { state, setQuery, setCampus, clear };
}
