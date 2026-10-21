/**
 * landing-story/story-dom.ts — the DOM side of the progress bus.
 *
 * Publishes the conductor's story state to every consumer that should not
 * need a JS subscription:
 *
 *  · `--story-progress` / `--chapter-progress` (0..1) on <html> — pure CSS
 *    choreography fuel (calc(), opacity, transform…);
 *  · `data-story-chapter="<id>"` on <html> — global attribute state;
 *  · `data-story-active` on each `[data-cam]` section and on any
 *    `[data-story-chapter="<id>"]` element whose chapter is current;
 *  · the typed `madarek:story-progress` CustomEvent on `window`
 *    (rAF-batched, dispatched on chapter change and on meaningful
 *    progress movement);
 *  · `data-story-visible` toggling for `[data-story-reveal]` and
 *    `[data-story-media]` elements via their own ScrollTriggers —
 *    reversible, once-per-element opt-in via `data-story-reveal="once"`.
 *
 * The DOM story NEVER depends on WebGL: this module runs from the same
 * conductor whether or not the canvas came up.
 */
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import type { ScrollConductor } from '../scroll-conductor';
import { STORY_CHAPTERS } from './types';
import type { StoryChapterId, StoryFrame } from './types';

export interface StoryDom {
  destroy: () => void;
}

function readTheme(): 'light' | 'dark' {
  return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
}

export function createStoryDom(conductor: ScrollConductor): StoryDom {
  const root = document.documentElement;
  const camSections = Array.from(
    document.querySelectorAll<HTMLElement>('[data-cam]'),
  );
  // `:not(html)` — the root itself carries data-story-chapter once this
  // module runs; re-creation (StrictMode double-mount) must not re-adopt it.
  const chapterTagged = Array.from(
    document.querySelectorAll<HTMLElement>('[data-story-chapter]:not(html)'),
  );

  const reduceAtStart = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── Per-element reveal triggers (the Agent-3 hooks) ─────────────── */
  const revealTriggers: ScrollTrigger[] = [];
  const wireAttribute = (selector: string, attribute: string, start: string) => {
    const elements = Array.from(document.querySelectorAll<HTMLElement>(selector));
    elements.forEach((el) => {
      const once = (el.getAttribute(attribute) ?? '').split(/\s+/).includes('once');
      if (reduceAtStart) {
        // Reduced motion: the DOM story is fully present, no scroll-gating.
        el.setAttribute('data-story-visible', '');
        return;
      }
      const st = ScrollTrigger.create({
        trigger: el,
        start,
        end: 'bottom 10%',
        onEnter: () => el.setAttribute('data-story-visible', ''),
        onEnterBack: () => el.setAttribute('data-story-visible', ''),
        ...(once
          ? {}
          : {
              onLeave: () => el.removeAttribute('data-story-visible'),
              onLeaveBack: () => el.removeAttribute('data-story-visible'),
            }),
      });
      revealTriggers.push(st);
      // Elements already at/inside their start on load: claim visibility
      // now instead of waiting for the first crossing.
      if (st.progress > 0 || st.isActive) {
        el.setAttribute('data-story-visible', '');
      }
    });
  };
  wireAttribute('[data-story-reveal]', 'data-story-reveal', 'top 86%');
  wireAttribute('[data-story-media]', 'data-story-media', 'top 95%');

  /* ── Continuous publishers ───────────────────────────────────────── */
  let lastChapter: StoryChapterId | '' = '';
  let lastProgressKey = -1;
  let lastChapterProgressKey = -1;
  let lastTheme = readTheme();

  const applyChapter = (frame: StoryFrame) => {
    if (frame.chapter === lastChapter) return;
    lastChapter = frame.chapter;
    if (root.getAttribute('data-story-chapter') !== frame.chapter) {
      root.setAttribute('data-story-chapter', frame.chapter);
    }
    camSections.forEach((section) => {
      const id = section.getAttribute('data-cam');
      if (id === frame.chapter) section.setAttribute('data-story-active', '');
      else section.removeAttribute('data-story-active');
    });
    chapterTagged.forEach((el) => {
      if (el.getAttribute('data-story-chapter') === frame.chapter) {
        el.setAttribute('data-story-active', '');
      } else {
        el.removeAttribute('data-story-active');
      }
    });
  };

  const applyProgress = (frame: StoryFrame) => {
    const storyKey = Math.round(frame.storyProgress * 1000);
    if (storyKey !== lastProgressKey) {
      lastProgressKey = storyKey;
      root.style.setProperty('--story-progress', (storyKey / 1000).toFixed(3));
    }
    const chapterKey = Math.round(frame.chapterProgress * 1000);
    if (chapterKey !== lastChapterProgressKey) {
      lastChapterProgressKey = chapterKey;
      root.style.setProperty('--chapter-progress', (chapterKey / 1000).toFixed(3));
    }
  };

  const dispatch = (frame: StoryFrame) => {
    window.dispatchEvent(
      new CustomEvent<StoryFrame>('madarek:story-progress', { detail: { ...frame } }),
    );
  };

  const unsubscribeFrame = conductor.subscribe((frame) => {
    applyProgress(frame);
    const chapterChanged = frame.chapter !== lastChapter;
    applyChapter(frame);
    if (chapterChanged || lastTheme !== frame.theme) {
      lastTheme = frame.theme;
      dispatch(frame);
    }
  });

  // Initial state — publish before the first scroll lands.
  const initial = conductor.getState();
  applyChapter(initial);
  applyProgress(initial);

  /* ── Theme re-broadcast (layout-affecting consumers re-read tokens) ── */
  const themeObserver = new MutationObserver(() => {
    const theme = readTheme();
    if (theme === lastTheme) return;
    lastTheme = theme;
    root.setAttribute('data-story-chapter', lastChapter || STORY_CHAPTERS[0]!);
    dispatch(conductor.getState());
  });
  themeObserver.observe(root, { attributes: true, attributeFilter: ['data-theme'] });

  const destroy = () => {
    unsubscribeFrame();
    themeObserver.disconnect();
    revealTriggers.forEach((st) => st.kill());
    revealTriggers.length = 0;
  };

  return { destroy };
}
