/**
 * JourneyRail — «سجلّ الرحلة» unit tests (5-B2 landing signature move).
 *
 * The rail is navigation + scroll state: the contract under test is
 *   - seven real academic stages, in journey order, as anchor links,
 *   - one-way stamping (a trace — scrolling back up never un-stamps),
 *   - the playhead (aria-current="location") tracks the current stage,
 *   - the last stop is the GraduationCap and completing the journey
 *     reports is-complete on the nav,
 *   - missing sections must never crash the sampler.
 *
 * jsdom reports every rect as 0×0 at (0,0), so each stage's section
 * gets a per-test getBoundingClientRect mock standing in for scroll
 * position; scroll events are flushed through requestAnimationFrame.
 */
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { JourneyRail, JOURNEY_STAGES } from '../../src/components/motion/JourneyRail';

const ZERO_RECT = {
  bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0, x: 0, y: 0,
  toJSON: () => ({}),
} as DOMRect;

/** Mount one fake section per stage; `topFor` stands in for scroll position. */
function mountStages(topFor: (id: string) => number): () => void {
  const created: HTMLElement[] = [];
  for (const stage of JOURNEY_STAGES) {
    const el = document.createElement('section');
    el.id = stage.id;
    const top = topFor(stage.id);
    el.getBoundingClientRect = () => ({ ...ZERO_RECT, top }) as DOMRect;
    document.body.appendChild(el);
    created.push(el);
  }
  return () => created.forEach((el) => el.remove());
}

async function flushScroll() {
  await act(async () => {
    window.dispatchEvent(new Event('scroll'));
    // the rail samples inside requestAnimationFrame — jsdom implements
    // rAF on the macrotask queue, so two microtask turns cover it
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
  });
}

let rafSpy: ReturnType<typeof vi.spyOn> | null = null;

beforeEach(() => {
  rafSpy = vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb: FrameRequestCallback) => {
    cb(0);
    return 0;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
});

afterEach(() => {
  rafSpy?.mockRestore();
  vi.restoreAllMocks();
  document.querySelectorAll('section[id]').forEach((el) => el.remove());
});

describe('JourneyRail', () => {
  it('renders the seven academic stages as anchor links, in journey order', () => {
    render(<JourneyRail />);
    const nav = screen.getByRole('navigation', { name: 'مراحل الرحلة الجامعية' });
    expect(nav).toBeTruthy();
    const links = screen.getAllByRole('link');
    expect(links).toHaveLength(JOURNEY_STAGES.length);
    expect(links.map((a) => a.getAttribute('href'))).toEqual(
      JOURNEY_STAGES.map((s) => `#${s.id}`),
    );
    // the visible journey copy is the real stage sequence
    expect(links.map((a) => a.textContent)).toEqual(
      ['التسجيل', 'الكليّات', 'المحاضرات', 'الاختبارات', 'البحوث', 'المجتمع', 'التخرّج'],
    );
  });

  it('stamps stages as their sections arrive and keeps them stamped on the way back up', async () => {
    const cleanup = mountStages((id) => (id === 'top' ? 0 : 5000));
    const { container } = render(<JourneyRail />);
    const stops = () => container.querySelectorAll<HTMLAnchorElement>('.journey-rail a');

    // at the top of the page only التسجيل (the hero) is stamped + current
    await flushScroll();
    expect(stops()[0].className).toContain('is-stamped');
    expect(stops()[0].className).toContain('is-current');
    expect(stops()[1].className).not.toContain('is-stamped');

    // scroll down: campus arrives (top inside the stamp line)
    const campus = document.getElementById('campus')!;
    campus.getBoundingClientRect = () => ({ ...ZERO_RECT, top: 100 }) as DOMRect;
    await flushScroll();
    expect(stops()[1].className).toContain('is-stamped');
    expect(stops()[1].className).toContain('is-current');
    expect(stops()[6].className).not.toContain('is-stamped');

    // scroll back to the top: stamps persist, the playhead returns home
    campus.getBoundingClientRect = () => ({ ...ZERO_RECT, top: 5000 }) as DOMRect;
    await flushScroll();
    expect(stops()[0].className).toContain('is-current');
    expect(stops()[1].className).toContain('is-stamped'); // the trace holds
    cleanup();
  });

  it('marks the current stage with aria-current="location"', async () => {
    const cleanup = mountStages((id) => (id === 'top' || id === 'campus' ? 0 : 5000));
    render(<JourneyRail />);
    await flushScroll();
    const current = screen.getAllByRole('link').find((a) => a.getAttribute('aria-current'));
    expect(current?.textContent).toBe('الكليّات');
    expect(current?.getAttribute('aria-current')).toBe('location');
    cleanup();
  });

  it('completes with the graduation cap when the close act is reached', async () => {
    const cleanup = mountStages(() => 0); // everything on screen
    const { container } = render(<JourneyRail />);
    await flushScroll();
    const nav = container.querySelector('.journey-rail')!;
    expect(nav.className).toContain('is-complete');
    const stops = container.querySelectorAll<HTMLAnchorElement>('.journey-rail a');
    stops.forEach((a) => expect(a.className).toContain('is-stamped'));
    // the last stop is the graduation-cap chip
    const cap = stops[stops.length - 1];
    expect(cap.className).toContain('is-cap-stop');
    expect(cap.querySelector('.journey-rail-dot svg')).toBeTruthy();
    // the track is fully drawn (fill = 1 spans first → last centre)
    const fill = container.querySelector<HTMLElement>('.journey-rail-fill')!;
    expect(fill.style.getPropertyValue('--rail-fill')).toBe('1');
    cleanup();
  });

  it('never crashes when a mapped section is missing from the document', async () => {
    render(<JourneyRail />);
    await flushScroll(); // no sections mounted at all
    expect(screen.getAllByRole('link')).toHaveLength(JOURNEY_STAGES.length);
  });
});
