/**
 * Landing — KnowledgeJourney scene tests (immersive wave 2, imm-3-journey).
 *
 * Covers the rebuilt «رحلة معرفة تتوسّع» act: the scene head (coded
 * meta + masked title + lede), the six scroll-scrubbed timeline stages,
 * the megamenu anchor contract (#features #matrix #ai #flipped — and
 * NO #research, which stays in BentoScene), the byte-kept flipped band,
 * and reduced-motion readability. Geometry is stubbed per test the same
 * way as ImmersiveMotion.test.tsx (jsdom has no layout).
 */
import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { act, render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { KnowledgeJourney } from '../../src/components/landing/KnowledgeJourney';

/* ─── shared harness (same contract as ImmersiveMotion.test.tsx) ──── */

const STAGE_TITLES = [
  'المصفوفة التعليمية',
  'المساعد الأكاديمي',
  'تحليلات أكاديمية',
  'مكتبة وبحوث',
  'منظومة موحَّدة',
  'جودة مؤسسية',
] as const;

const STAGE_CODES = [
  '( م-٠١ )',
  '( م-٠٢ )',
  '( م-٠٣ )',
  '( م-٠٤ )',
  '( م-٠٥ )',
  '( م-٠٦ )',
] as const;

let rectState = { top: 400, height: 600 };

const flushRaf = async () => {
  await act(async () => {
    // jsdom rAF resolves on a ~16ms timer; a chain of short waits lets
    // the schedule→tick→reschedule loop run several smoothing frames.
    for (let i = 0; i < 6; i += 1) {
      await new Promise((r) => setTimeout(r, 25));
    }
  });
};

const fireScroll = () => {
  window.dispatchEvent(new Event('scroll'));
};

const renderScene = () =>
  render(
    <MemoryRouter>
      <KnowledgeJourney />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.restoreAllMocks();
  // Reinstall the working matchMedia default (tests/setup.ts installs
  // it via vi.fn — restoreAllMocks above resets that implementation).
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  });
  // Deterministic geometry: every element reports the same rect, so
  // the scrub hook's progress is a pure function of rectState.
  rectState = { top: 400, height: 600 };
  Element.prototype.getBoundingClientRect = vi.fn(() => ({
    top: rectState.top, bottom: rectState.top + rectState.height,
    left: 0, right: 800, width: 800, height: rectState.height,
    x: 0, y: rectState.top, toJSON: () => ({}),
  })) as unknown as typeof Element.prototype.getBoundingClientRect;
  Object.defineProperty(window, 'innerHeight', {
    configurable: true, writable: true, value: 800,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

/* ─── scene head ───────────────────────────────────────────────────── */

describe('KnowledgeJourney — scene head', () => {
  it('renders the coded meta line, the masked display title, and the lede', () => {
    renderScene();
    // coded metadata voice (principle #4)
    expect(screen.getByText('( ر-٠١ · مسار التعلّم )')).toBeInTheDocument();
    // the h2 keeps its <em> accent word while the words ride masks
    const heading = screen.getByRole('heading', {
      level: 2,
      name: 'رحلة معرفة تتوسّع',
    });
    expect(heading.querySelector('em')).not.toBeNull();
    expect(heading.querySelectorAll('[data-mask-word]')).toHaveLength(3);
    // one-sentence lede: first lecture → mastery, no numbers
    expect(
      screen.getByText(/حتى إتقان المقرّر، ترافقك مدارك/),
    ).toBeInTheDocument();
  });

  it('names the section as a landmark from its heading', () => {
    renderScene();
    expect(
      screen.getByRole('region', { name: 'رحلة معرفة تتوسّع' }),
    ).toBeInTheDocument();
  });

  it('carries exactly one icon moment — the compass sticker', () => {
    const { container } = renderScene();
    const stickers = container.querySelectorAll('.journey-sticker');
    expect(stickers).toHaveLength(1);
    expect(stickers[0]?.querySelector('svg')).not.toBeNull();
  });
});

/* ─── the timeline ─────────────────────────────────────────────────── */

describe('KnowledgeJourney — learning-path timeline', () => {
  it('renders the six stages in order with codes and verbatim descriptions', () => {
    renderScene();
    const list = screen.getByRole('list', { name: 'مراحل رحلة التعلُّم' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(6);
    STAGE_TITLES.forEach((title, i) => {
      expect(within(items[i]).getByText(title)).toBeInTheDocument();
      expect(within(items[i]).getByText(STAGE_CODES[i])).toBeInTheDocument();
    });
    // stage descriptions are the old feature cards' copy, verbatim
    expect(
      within(items[0]).getByText(/تكشف الفجوات وتربطها تلقائياً/),
    ).toBeInTheDocument();
    expect(
      within(items[5]).getByText(/تقارير شاملة بصياغة رسمية/),
    ).toBeInTheDocument();
  });

  it('keeps the mono codes decorative for assistive tech', () => {
    const { container } = renderScene();
    const code = container.querySelector('.sequential-code');
    expect(code?.getAttribute('aria-hidden')).toBe('true');
  });

  it('lights stages progressively as the scene scrubs the viewport', async () => {
    rectState = { top: 800, height: 600 }; // just below the fold → progress 0
    renderScene();
    await flushRaf();
    // at rest the journey is already in motion: stage one lit + active
    expect(document.querySelectorAll('[data-lit="true"]')).toHaveLength(1);
    const first = document.querySelector('[data-active="true"]');
    expect(first?.textContent).toContain('المصفوفة التعليمية');
    expect(first?.getAttribute('aria-current')).toBe('step');

    rectState = { top: 200, height: 600 }; // mid travel
    fireScroll();
    await flushRaf();
    const lit = document.querySelectorAll('[data-lit="true"]');
    expect(lit.length).toBeGreaterThanOrEqual(2);
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1);

    rectState = { top: -1500, height: 600 }; // fully passed
    fireScroll();
    await flushRaf();
    await flushRaf();
    expect(document.querySelectorAll('[data-lit="true"]')).toHaveLength(6);
    expect(document.querySelector('[data-active="true"]')?.textContent)
      .toContain('جودة مؤسسية');
  });
});

/* ─── the anchor contract ──────────────────────────────────────────── */

describe('KnowledgeJourney — anchor contract', () => {
  it('owns #features, #matrix, #ai and #flipped (in that order)', () => {
    const { container } = renderScene();
    const sectionIds = Array.from(
      container.querySelectorAll('section'),
    ).map((s) => s.id);
    expect(sectionIds).toEqual(['features', 'flipped']);

    const features = container.querySelector('section#features');
    const matrix = container.querySelector('#matrix');
    const ai = container.querySelector('#ai');
    expect(features).not.toBeNull();
    expect(matrix).not.toBeNull();
    expect(ai).not.toBeNull();
    // the megamenu targets resolve to visible spots INSIDE the scene
    expect(features?.contains(matrix)).toBe(true);
    expect(features?.contains(ai)).toBe(true);
  });

  it('does not create #research — that anchor stays in BentoScene', () => {
    const { container } = renderScene();
    expect(container.querySelector('#research')).toBeNull();
  });
});

/* ─── the flipped band (stage-one demo, kept intact) ───────────────── */

describe('KnowledgeJourney — flipped-classroom band', () => {
  it('keeps the band copy, the lecture checklist, and the CTA', () => {
    renderScene();
    expect(
      screen.getByRole('heading', { name: /محاضرات مسجَّلة تتفاعل مع الطالب/ }),
    ).toBeInTheDocument();
    expect(screen.getByText('مقدمة في خوارزميات الفرز')).toBeInTheDocument();
    expect(screen.getByText('قيد المتابعة')).toBeInTheDocument();
    expect(screen.getByText('اختبار قصير، أسبوع 4')).toBeInTheDocument();
    const cta = screen.getByRole('link', { name: /ابدأ الآن/ });
    expect(cta.getAttribute('href')).toBe('/auth');
  });
});

/* ─── reduced motion ───────────────────────────────────────────────── */

describe('KnowledgeJourney — reduced motion', () => {
  it('shows the full scene with discrete step states (nothing held hostage)', async () => {
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: query.includes('reduce'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
    rectState = { top: 200, height: 600 };
    renderScene();
    await flushRaf();

    // every stage's text is present and queryable — no hidden state
    for (const title of STAGE_TITLES) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getByText('( ر-٠١ · مسار التعلّم )')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: /ابدأ الآن/ }),
    ).toBeInTheDocument();

    // the scrub quantizes: discrete states, exactly one active stage
    const lit = document.querySelectorAll('[data-lit="true"]');
    expect(lit.length).toBeGreaterThanOrEqual(1);
    expect(document.querySelectorAll('[aria-current="step"]')).toHaveLength(1);
  });
});
