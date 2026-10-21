/**
 * Portable GSAP ScrollTrigger conductor for the persistent multi-chapter
 * landing world — the R304 rewrite of the r303 native-scroll conductor.
 *
 * R304 contract (build-threejs-scroll-worlds × cinematic-scroll-storytelling):
 *  · GSAP + ScrollTrigger are the AUTHORITATIVE choreography system: one
 *    master ScrollTrigger reads native scroll (the ONLY scroll source of
 *    truth — never wheel deltas, no Lenis, no custom loop);
 *  · `gsap.ticker` is the single rAF heartbeat: conductor damping, DOM
 *    publishing and world rendering all hang off it — one loop, no drift;
 *  · `exact` is the reproducible story state (0..N-1 fractional chapter
 *    progress across the measured `[data-cam]` anchors);
 *  · `smooth` is the cinematic render state (exponential damping,
 *    framerate-independent);
 *  · reduced motion → smooth ≡ exact (snap, no chase);
 *  · the same scroll position always recreates the same state — forward,
 *    backward, after a fast jump, after reload.
 *
 * No Three.js dependency. The world (`MadarekWorld.tsx`) subscribes and
 * renders; the DOM bus (`landing-story/story-dom.ts`) subscribes and
 * publishes; both consume the same frames — there is nothing left to
 * synchronize.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { STORY_CHAPTERS } from './landing-story/types';
import type { StoryChapterId, StoryFrame } from './landing-story/types';

gsap.registerPlugin(ScrollTrigger);
/* Touch URL-bar height noise must not refresh-trigger layout shifts mid-read. */
ScrollTrigger.config({ ignoreMobileResize: true });

export interface ScrollConductorOptions {
  /** Ordered `data-cam` chapter anchors (first = top of story). */
  sections: HTMLElement[] | NodeListOf<HTMLElement>;
  /** Scroll-span trigger; defaults to document.body. */
  root?: HTMLElement | null;
  /** Exponential damping constant (default 5.2 — the skill's value). */
  damping?: number;
  reducedMotion?: boolean;
}

export type FrameListener = (frame: StoryFrame) => void;

export interface ScrollConductor {
  start: () => void;
  destroy: () => void;
  /** Re-measure anchors + ScrollTrigger.refresh (fonts, images, resize). */
  refresh: () => void;
  setReducedMotion: (value: boolean) => void;
  getState: () => StoryFrame;
  /** Per-publish frames (render ticks). Returns an unsubscribe fn. */
  subscribe: (fn: FrameListener) => () => void;
  /** Chapter-boundary crossings (exact progress). Returns unsubscribe fn. */
  onChapterChange: (fn: FrameListener) => () => void;
  scrollToChapter: (index: number | StoryChapterId, behavior?: ScrollBehavior) => void;
  progressAt: (y: number) => number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createScrollConductor(options: ScrollConductorOptions): ScrollConductor {
  const sections = Array.from(options.sections ?? []);
  if (!sections.length) throw new Error('createScrollConductor requires sections');

  const chapterCount = sections.length;
  const last = chapterCount - 1;
  const damping = Number.isFinite(options.damping) ? (options.damping as number) : 5.2;

  let reduce = Boolean(options.reducedMotion);
  let anchors: number[] = [];
  let exact = 0;
  let smooth = 0;
  let direction: 1 | -1 | 0 = 0;
  let previousY = 0;
  let running = false;
  let dirty = true;
  let destroyed = false;

  const frameListeners = new Set<FrameListener>();
  const chapterListeners = new Set<FrameListener>();
  let activeChapterIndex = -1;

  function maxScroll(): number {
    return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }

  function measure(): number[] {
    const max = maxScroll();
    const y = window.scrollY || 0;
    anchors = sections.map((element, index) => {
      if (index === 0) return 0;
      if (index === last) return max;
      // Document-absolute center crossing — immune to offsetParent traps.
      const top = element.getBoundingClientRect().top + y;
      return clamp(top + element.offsetHeight * 0.5 - window.innerHeight * 0.5, 0, max);
    });
    for (let i = 1; i < anchors.length; i += 1) {
      anchors[i] = Math.max(anchors[i] ?? 0, (anchors[i - 1] ?? 0) + 1);
    }
    return anchors.slice();
  }

  function progressAt(y: number): number {
    if (!anchors.length) measure();
    const clampedY = clamp(y, 0, maxScroll());
    if (clampedY <= (anchors[0] ?? 0)) return 0;
    for (let i = 0; i < last; i += 1) {
      const next = anchors[i + 1] ?? clampedY;
      const prev = anchors[i] ?? 0;
      if (clampedY <= next) {
        const span = Math.max(1, next - prev);
        return i + clamp((clampedY - prev) / span, 0, 1);
      }
    }
    return last;
  }

  function readTheme(): 'light' | 'dark' {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function buildFrame(): StoryFrame {
    const index = clamp(Math.floor(exact), 0, last);
    const next = Math.min(last, index + 1);
    const local = next === index ? 0 : clamp(exact - index, 0, 1);
    return {
      exact,
      smooth,
      storyProgress: last === 0 ? 0 : clamp(exact / last, 0, 1),
      chapter: STORY_CHAPTERS[index] ?? 'hero',
      chapterIndex: index,
      chapterProgress: local,
      direction,
      reducedMotion: reduce,
      theme: readTheme(),
    };
  }

  function publish(): void {
    const frame = buildFrame();
    frameListeners.forEach((fn) => fn(frame));
    if (frame.chapterIndex !== activeChapterIndex) {
      activeChapterIndex = frame.chapterIndex;
      chapterListeners.forEach((fn) => fn(frame));
    }
  }

  function readScroll(): void {
    const y = window.scrollY || window.pageYOffset || 0;
    const delta = y - previousY;
    if (Math.abs(delta) > 0.25) direction = delta > 0 ? 1 : -1;
    previousY = y;
    exact = progressAt(y);
    dirty = true;
  }

  /* ── The single heartbeat: gsap.ticker ────────────────────────────── */
  const tick = (_time: number, deltaTime: number) => {
    if (!running) return;
    // gsap.ticker passes deltaTime in MILLISECONDS. The damp is a
    // converging filter — allow generous dt so low-fps devices stay
    // framerate-independent instead of slowing to a crawl.
    const dt = Math.min(Math.max(deltaTime / 1000, 1 / 240), 0.25);
    const previousSmooth = smooth;
    smooth = reduce
      ? exact
      : smooth + (exact - smooth) * (1 - Math.exp(-damping * dt));
    // 0.2% of a chapter is visually at-rest — stop the chase (and lets
    // slow rasterizers settle instead of rendering micro-deltas forever).
    if (Math.abs(smooth - exact) < 0.002) smooth = exact;

    if (dirty || smooth !== previousSmooth) {
      dirty = false;
      publish();
    }
  };

  /* ── ScrollTrigger — the authoritative scroll reader ──────────────── */
  let masterST: ScrollTrigger | null = null;

  const onSTRefresh = () => {
    measure();
    readScroll();
  };

  const onVisibility = () => {
    if (document.hidden) return;
    // Returning to the tab: scroll may have moved (restore, anchor jump).
    readScroll();
  };

  const rmQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  const onRMChange = (event: MediaQueryListEvent) => {
    setReducedMotion(event.matches);
  };

  let resizeTimer = 0;
  let resizeObserver: ResizeObserver | null = null;
  const onSectionResize = () => {
    if (!running || destroyed) return;
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      if (running && !destroyed) ScrollTrigger.refresh();
    }, 180);
  };

  function setReducedMotion(value: boolean): void {
    reduce = Boolean(value);
    if (reduce) smooth = exact;
    dirty = true;
    publish();
  }

  function refresh(): void {
    if (destroyed) return;
    ScrollTrigger.refresh();
    measure();
    readScroll();
  }

  function scrollToChapter(
    index: number | StoryChapterId,
    behavior?: ScrollBehavior,
  ): void {
    if (!anchors.length) measure();
    const i =
      typeof index === 'number'
        ? clamp(Math.round(index), 0, last)
        : Math.max(0, sections.findIndex((el) => el.getAttribute('data-cam') === index));
    window.scrollTo({
      top: anchors[i] ?? 0,
      behavior: reduce ? 'auto' : behavior || 'smooth',
    });
  }

  function subscribe(fn: FrameListener): () => void {
    frameListeners.add(fn);
    return () => frameListeners.delete(fn);
  }

  function onChapterChange(fn: FrameListener): () => void {
    chapterListeners.add(fn);
    return () => chapterListeners.delete(fn);
  }

  function start(): void {
    if (running || destroyed) return;
    running = true;

    measure();
    previousY = window.scrollY || 0;
    exact = progressAt(previousY);
    smooth = exact;
    direction = 0;
    activeChapterIndex = -1;
    dirty = true;

    masterST = ScrollTrigger.create({
      trigger: options.root ?? document.body,
      start: 'top top',
      end: 'bottom bottom',
      onUpdate: readScroll,
    });
    ScrollTrigger.addEventListener('refresh', onSTRefresh);

    document.addEventListener('visibilitychange', onVisibility);
    if (typeof rmQuery.addEventListener === 'function') {
      rmQuery.addEventListener('change', onRMChange);
    }
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(onSectionResize);
      sections.forEach((section) => resizeObserver!.observe(section));
    }

    gsap.ticker.add(tick);
    // Publish before the first rAF so consumers never see an empty frame.
    publish();
  }

  function destroy(): void {
    if (destroyed) return;
    destroyed = true;
    running = false;

    gsap.ticker.remove(tick);
    if (masterST) {
      masterST.kill();
      masterST = null;
    }
    ScrollTrigger.removeEventListener('refresh', onSTRefresh);
    document.removeEventListener('visibilitychange', onVisibility);
    if (typeof rmQuery.removeEventListener === 'function') {
      rmQuery.removeEventListener('change', onRMChange);
    }
    window.clearTimeout(resizeTimer);
    resizeObserver?.disconnect();
    resizeObserver = null;
    frameListeners.clear();
    chapterListeners.clear();
  }

  return {
    start,
    destroy,
    refresh,
    setReducedMotion,
    getState: buildFrame,
    subscribe,
    onChapterChange,
    scrollToChapter,
    progressAt,
  };
}
