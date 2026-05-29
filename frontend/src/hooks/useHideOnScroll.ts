import { useEffect, useState } from 'react';

/**
 * useHideOnScroll — returns true when the user is scrolling DOWN inside the
 * main `.content` scroll container, so the mobile bottom-nav can slide away
 * to give more reading space, and reappear on scroll up / near top.
 *
 * Watches `.content` (the app's scroll container) rather than window, since
 * the shell scrolls an inner element, not the document.
 */
export function useHideOnScroll(threshold = 8): boolean {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const el = document.querySelector('.content');
    if (!el) return;
    let last = el.scrollTop;
    let raf = 0;

    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const y = el.scrollTop;
        const delta = y - last;
        if (y < 40) {
          setHidden(false);            // always show near the top
        } else if (Math.abs(delta) > threshold) {
          setHidden(delta > 0);        // hide on down, show on up
        }
        last = y;
      });
    };

    el.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [threshold]);

  return hidden;
}
