import { useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';

/**
 * useLandingMotion — the landing page's motion backbone.
 *
 * · Lenis smooth-scroll on NATIVE scroll (position:sticky keeps working,
 *   keyboard paging keeps working). `respectReducedMotion: true` — under
 *   prefers-reduced-motion Lenis never smooths and we bail out entirely.
 * · Syncs Lenis → ScrollTrigger (official pattern: scroll event →
 *   ScrollTrigger.update, gsap.ticker drives lenis.raf, lagSmoothing off).
 * · In-landing anchor links (#colleges …) route through lenis.scrollTo
 *   with header offset so they land precisely where the eye expects.
 * · Full teardown on unmount (route change → native scroll restored).
 */
export function useLandingMotion(rootSelector = '.landing'): void {
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduced) return; // native scrolling, zero smoothing

    const lenis = new Lenis({
      duration: 1.05,
      easing: (t: number) => 1 - 2 ** (-10 * t), // expo-out — the landing voice
      smoothWheel: true,
      touchMultiplier: 1.4,
      respectReducedMotion: true,
    });

    gsap.registerPlugin(ScrollTrigger);

    const onScroll = () => ScrollTrigger.update();
    lenis.on('scroll', onScroll);

    const raf = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(raf);
    gsap.ticker.lagSmoothing(0);

    /* Anchor links inside the landing → buttery scrollTo. */
    const onClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement | null)?.closest?.('a[href^="#"]');
      if (!anchor) return;
      const href = anchor.getAttribute('href');
      if (!href || href === '#') return;
      const target = document.querySelector(href);
      if (!target || !target.closest(rootSelector)) return;
      e.preventDefault();
      lenis.scrollTo(target as HTMLElement, { offset: -76, duration: 1.35 });
    };
    document.addEventListener('click', onClick);

    return () => {
      document.removeEventListener('click', onClick);
      gsap.ticker.remove(raf);
      gsap.ticker.lagSmoothing(0);
      lenis.off('scroll', onScroll);
      lenis.destroy();
      ScrollTrigger.getAll().forEach((st) => st.kill());
    };
  }, [rootSelector]);
}
