import { useEffect } from 'react';

/**
 * usePageTitle — per-route document title for the browser tab, history
 * entries, and screen-reader announcements (immersive-redesign wave 3;
 * live-site audit imm-2 P1: static title on every route).
 *
 * Arabic title pattern: «<سياق> · مدارك» — the platform name as the
 * constant suffix (house convention, mirrors the index.html default
 * title's ordering) so every route title stays scannable and
 * consistent in tabs, history lists, and bookmarks.
 *
 * Restores the previous title on unmount (route changes chain cleanly
 * without stale contexts leaking across pages). SSR-safe no-op.
 */
const SITE_NAME = 'مدارك';

export function usePageTitle(context?: string): void {
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previous = document.title;
    document.title = context && context.length > 0 ? `${context} · ${SITE_NAME}` : SITE_NAME;
    return () => {
      document.title = previous;
    };
  }, [context]);
}
