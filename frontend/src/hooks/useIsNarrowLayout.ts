import { useEffect, useState } from 'react';

/**
 * useIsNarrowLayout — does the viewport sit inside the phone band?
 *
 * True when the media query `(max-width: Npx)` matches. SSR-safe (no
 * window → false) and listener-backed (a desktop→phone resize flips the
 * answer live, so conditionally-rendered mobile chrome appears without
 * a reload).
 *
 * Extracted (r157/F8) from LibraryPage's local copy — the same
 * breakpoint-gated render switch (pill bar vs Sheet on LibraryPage,
 * 640px) is a platform idiom, not a library page private. Callers pass
 * their own band; 640 is the house phone band default.
 *
 * NOTE: ProfilePage still carries its own local copy — migrating it is
 * deliberately NOT done here (its owner's wave-3 item; this extraction
 * must not change two pages in one diff).
 */
export function useIsNarrowLayout(maxWidthPx = 640): boolean {
  const [narrow, setNarrow] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return window.matchMedia(`(max-width: ${maxWidthPx}px)`).matches;
  });
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(`(max-width: ${maxWidthPx}px)`);
    const onChange = (e: MediaQueryListEvent) => setNarrow(e.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [maxWidthPx]);
  return narrow;
}
