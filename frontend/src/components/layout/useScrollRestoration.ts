import { useEffect, useRef } from 'react';
import { useLocation, useNavigationType, type NavigationType } from 'react-router-dom';

const SCROLL_STORAGE_KEY_PREFIX = 'madarek.scroll:';

/**
 * useScrollRestoration — saves the content scroll position per history
 * entry, restores it on POP (browser back/forward), scrolls to top on
 * PUSH/REPLACE.
 *
 * Pass the ref of the scroll container (the element that actually
 * scrolls — typically `.content` inside the AppShell, NOT window).
 *
 * See FR-008 (narrowed): scroll-position restoration only.
 */
export function useScrollRestoration(scrollRef: React.RefObject<HTMLElement | null>): void {
  const location = useLocation();
  const navigationType: NavigationType = useNavigationType();
  const previousKey = useRef<string | null>(null);
  const previousScrollTop = useRef<number>(0);

  // Track the live scroll position so we can persist on key change.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    const onScroll = () => {
      previousScrollTop.current = node.scrollTop;
    };

    node.addEventListener('scroll', onScroll, { passive: true });
    return () => node.removeEventListener('scroll', onScroll);
  }, [scrollRef]);

  // Persist on navigate-away; restore or top-scroll on navigate-in.
  useEffect(() => {
    const node = scrollRef.current;
    if (!node) return;

    // Save the OUTGOING key's scroll position.
    if (previousKey.current && previousKey.current !== location.key) {
      sessionStorage.setItem(
        SCROLL_STORAGE_KEY_PREFIX + previousKey.current,
        String(previousScrollTop.current),
      );
    }

    // Decide what to do for the INCOMING key.
    if (navigationType === 'POP') {
      // Browser back/forward: restore.
      const stored = sessionStorage.getItem(SCROLL_STORAGE_KEY_PREFIX + location.key);
      const top = stored ? Number(stored) : 0;
      // Run after layout so the content is in place.
      requestAnimationFrame(() => {
        node.scrollTo({ top, behavior: 'instant' as ScrollBehavior });
      });
    } else {
      // PUSH/REPLACE: top of the new route.
      node.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    }

    previousKey.current = location.key;
    previousScrollTop.current = 0;
  }, [location.key, navigationType, scrollRef]);
}
