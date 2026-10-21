/**
 * Portable native-scroll conductor for a persistent multi-chapter WebGL
 * world — TypeScript port of the build-threejs-scroll-worlds skill's
 * references/scroll-conductor.js (kept contract-identical).
 *
 * It has no Three.js dependency. Give it semantic section elements and
 * render the returned exact/smoothed progress through your own
 * camera/world systems.
 *
 * Contract (SKILL.md «Map native scroll to deterministic state»):
 *  · native scrollY is the ONLY source of truth (never wheel deltas);
 *  · `exact` is the reproducible story state (0..N-1 fractional);
 *  · `smooth` is the cinematic render state (exponential damping);
 *  · reduced motion → smooth ≡ exact (snap, no drift);
 *  · the same scroll position always recreates the same state.
 */

export interface ConductorState {
  /** Exact fractional chapter progress (e.g. 2.35). */
  exact: number;
  /** Damped fractional chapter progress (render state). */
  smooth: number;
  /** Chapter index derived from exact progress. */
  index: number;
  /** Adjacent chapter index (=== index at rest). */
  next: number;
  /** Exact progress within the current segment (0..1). */
  localExact: number;
  /** Damped progress within the current segment (0..1). */
  localSmooth: number;
  /** Chapter index derived from smooth progress. */
  smoothIndex: number;
  /** Adjacent chapter for the smooth segment. */
  smoothNext: number;
  /** Last scroll direction: 1 down, -1 up, 0 idle. */
  direction: number;
  /** Measured scroll offsets of each section anchor. */
  anchors: number[];
}

export interface ScrollConductor {
  start: () => ScrollConductor;
  stop: () => void;
  destroy: () => void;
  measure: () => number[];
  read: () => void;
  getState: () => ConductorState;
  progressAt: (y: number) => number;
  goTo: (index: number, behavior?: ScrollBehavior) => void;
  setReducedMotion: (value: boolean) => void;
}

export interface ConductorOptions {
  sections: Element[] | NodeListOf<Element>;
  /** Exponential damping constant (default 5.2). */
  damping?: number;
  reducedMotion?: boolean;
  onUpdate?: (state: ConductorState) => void;
  onChapterChange?: (index: number, state: ConductorState) => void;
  getScrollY?: () => number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function createScrollConductor(options: ConductorOptions): ScrollConductor {
  const sections = Array.from(options.sections ?? []);
  if (!sections.length) throw new Error('createScrollConductor requires sections');

  const damping = Number.isFinite(options.damping) ? (options.damping as number) : 5.2;
  let reduce = Boolean(options.reducedMotion);
  const onUpdate = typeof options.onUpdate === 'function' ? options.onUpdate : () => {};
  const onChapterChange =
    typeof options.onChapterChange === 'function' ? options.onChapterChange : () => {};
  const getY =
    typeof options.getScrollY === 'function'
      ? options.getScrollY
      : () => window.scrollY || window.pageYOffset || 0;

  let anchors: number[] = [];
  let exact = 0;
  let smooth = 0;
  let direction = 0;
  let previousY = 0;
  let active = -1;
  let running = false;
  let frame = 0;
  let lastTime = 0;
  let dirty = true;
  let widthAtMeasure = 0;
  let resizeObserver: ResizeObserver | null = null;

  function maxScroll(): number {
    return Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
  }

  function measure(): number[] {
    const max = maxScroll();
    widthAtMeasure = window.innerWidth;
    anchors = sections.map((element, index) => {
      if (index === 0) return 0;
      if (index === sections.length - 1) return max;
      const el = element as HTMLElement;
      const value = el.offsetTop + el.offsetHeight * 0.5 - window.innerHeight * 0.5;
      return clamp(value, 0, max);
    });

    for (let index = 1; index < anchors.length; index += 1) {
      anchors[index] = Math.max(anchors[index] ?? 0, (anchors[index - 1] ?? 0) + 1);
    }

    dirty = true;
    return anchors.slice();
  }

  function progressAt(y: number): number {
    if (!anchors.length) measure();
    const clampedY = clamp(y, 0, maxScroll());
    if (clampedY <= (anchors[0] ?? 0)) return 0;

    for (let index = 0; index < anchors.length - 1; index += 1) {
      const next = anchors[index + 1] ?? clampedY;
      const prev = anchors[index] ?? 0;
      if (clampedY <= next) {
        const span = Math.max(1, next - prev);
        return index + clamp((clampedY - prev) / span, 0, 1);
      }
    }
    return anchors.length - 1;
  }

  function segment(progress: number) {
    const last = sections.length - 1;
    const index = clamp(Math.floor(progress), 0, last);
    const next = Math.min(last, index + 1);
    return {
      index,
      next,
      local: next === index ? 0 : clamp(progress - index, 0, 1),
    };
  }

  function state(): ConductorState {
    const exactSegment = segment(exact);
    const smoothSegment = segment(smooth);
    return {
      exact,
      smooth,
      index: exactSegment.index,
      next: exactSegment.next,
      localExact: exactSegment.local,
      smoothIndex: smoothSegment.index,
      smoothNext: smoothSegment.next,
      localSmooth: smoothSegment.local,
      direction,
      anchors,
    };
  }

  function readScroll() {
    const y = getY();
    const delta = y - previousY;
    if (Math.abs(delta) > 0.25) direction = delta > 0 ? 1 : -1;
    previousY = y;
    exact = progressAt(y);
    dirty = true;
  }

  function tick(now: number) {
    if (!running) return;
    const dt = lastTime ? Math.min((now - lastTime) / 1000, 1 / 30) : 1 / 60;
    lastTime = now;

    const previousSmooth = smooth;
    smooth = reduce ? exact : damp(smooth, exact, damping, dt);
    // Snap the settle: 0.2% of a chapter is visually at-rest, and lets
    // slow (software-GL) renderers stop the damp chase quickly.
    if (Math.abs(smooth - exact) < 0.002) smooth = exact;

    const nextState = state();
    if (nextState.index !== active) {
      active = nextState.index;
      onChapterChange(active, nextState);
    }

    if (dirty || smooth !== previousSmooth) {
      dirty = false;
      onUpdate(nextState);
    }

    frame = requestAnimationFrame(tick);
  }

  function onScroll() {
    readScroll();
  }

  function onResize() {
    const widthChanged = window.innerWidth !== widthAtMeasure;
    const coarse = window.matchMedia?.('(pointer: coarse)').matches;
    if (coarse && !widthChanged) return; // ignore touch URL-bar height noise
    measure();
    readScroll();
  }

  function onVisibility() {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
      lastTime = 0;
      return;
    }
    if (running && !frame) frame = requestAnimationFrame(tick);
    readScroll();
  }

  function start(): ScrollConductor {
    if (running) return api;
    running = true;
    measure();
    previousY = getY();
    exact = progressAt(previousY);
    smooth = reduce ? exact : exact;

    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onResize, { passive: true });
    window.addEventListener('orientationchange', onResize, { passive: true });
    window.addEventListener('pageshow', onResize);
    window.addEventListener('hashchange', onResize);
    document.addEventListener('visibilitychange', onVisibility);

    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        measure();
        readScroll();
      });
      sections.forEach((section) => resizeObserver!.observe(section));
    }

    active = -1;
    lastTime = 0;
    frame = requestAnimationFrame(tick);
    return api;
  }

  function stop() {
    if (!running) return;
    running = false;
    cancelAnimationFrame(frame);
    frame = 0;

    window.removeEventListener('scroll', onScroll);
    window.removeEventListener('resize', onResize);
    window.removeEventListener('orientationchange', onResize);
    window.removeEventListener('pageshow', onResize);
    window.removeEventListener('hashchange', onResize);
    document.removeEventListener('visibilitychange', onVisibility);
    resizeObserver?.disconnect();
    resizeObserver = null;
  }

  function setReducedMotion(value: boolean) {
    reduce = Boolean(value);
    if (reduce) smooth = exact;
    dirty = true;
  }

  function goTo(index: number, behavior?: ScrollBehavior) {
    const i = clamp(Math.round(index), 0, anchors.length - 1);
    window.scrollTo({
      top: anchors[i],
      behavior: reduce ? 'auto' : behavior || 'smooth',
    });
  }

  const api: ScrollConductor = {
    start,
    stop,
    destroy: stop,
    measure,
    read: readScroll,
    getState: state,
    progressAt,
    goTo,
    setReducedMotion,
  };

  return api;
}
