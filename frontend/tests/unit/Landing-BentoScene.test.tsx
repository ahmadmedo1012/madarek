/**
 * BentoScene — coded-metadata mosaic tests (immersive wave 2, imm-3-bento).
 *
 * Contract under test:
 *   - the section keeps its exact wave-1.5 copy (title + five tiles):
 *     the restyle layers voice + composition, never content;
 *   - every tile carries its ( ن-٠x ) mono code, in series order, as a
 *     decorative artifact (aria-hidden) so screen readers hear titles,
 *     not codes;
 *   - each code sits after the sticker and above the title;
 *   - the anchor targets survive (#research / #exams / #labs /
 *     #achievements — megamenu, footer, and the journey rail's exams
 *     stage all link here);
 *   - section + list semantics with Arabic aria labels;
 *   - the band color families and the mosaic placement wiring stay put;
 *   - reduced-motion: nothing hides behind an entrance — every string
 *     is on screen either way (jsdom asserts presence/visibility).
 */
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { BentoScene } from '../../src/components/landing/BentoScene';

const TILE_TITLES = [
  'البحوث والمكتبة',
  'الجدول الدراسي',
  'الاختبارات الإلكترونية',
  'المعامل الافتراضية',
  'الإنجازات والشارات',
] as const;

const TILE_DESCRIPTIONS = [
  'فهرس بحثيّ بفحص نزاهة علمية تلقائي (انتحال + AI) ومراجعة معلَّمة على الـPDF. آلاف الكتب الأكاديمية للاستعارة الفورية.',
  'جدول أسبوعيّ ذكيّ يجمع المحاضرات، التسليمات، الاختبارات، والاجتماعات، بمُذكِّرات تلقائية وروابط مباشرة لكل بند.',
  'MCQ · صح/خطأ · إجابة قصيرة · مقالة. تصحيح تلقائي للموضوعي.',
  'Cisco Packet Tracer، Arduino Sim، وتجارب AR/VR للتطبيق العملي.',
  'نقاط ومستويات وشارات، لتشجيع الالتزام دون فرضه.',
] as const;

/** The full coded series, in tile order. */
const CODE_SERIES = [
  '( ن-٠١ )',
  '( ن-٠٢ )',
  '( ن-٠٣ )',
  '( ن-٠٤ )',
  '( ن-٠٥ )',
] as const;

/** Band family per tile, in tile order (landing.css .band-*). */
const BAND_SERIES = [
  'band-mint',
  'band-yellow',
  'band-sky',
  'band-rose',
  'band-copper',
] as const;

/** Area wiring class per tile, in tile order (landing-bento.css). */
const AREA_SERIES = [
  'bento-research',
  'bento-schedule',
  'bento-exams',
  'bento-labs',
  'bento-achievements',
] as const;

describe('BentoScene — copy (exact, wave-1.5 preserved)', () => {
  it('renders the section title and all five tile titles', () => {
    render(<BentoScene />);
    expect(
      screen.getByRole('heading', { level: 2, name: 'من المحاضرة إلى الشهادة' }),
    ).toBeVisible();
    TILE_TITLES.forEach((title) => {
      expect(screen.getByRole('heading', { level: 3, name: title })).toBeVisible();
    });
  });

  it('renders every tile description verbatim (labs keeps its bdi Latin runs)', () => {
    render(<BentoScene />);
    const copy = document.querySelector('.landing-bento')?.textContent ?? '';
    TILE_DESCRIPTIONS.forEach((desc) => {
      expect(copy).toContain(desc);
    });
  });
});

describe('BentoScene — coded metadata voice', () => {
  it('carries the ( ن-٠١ )…( ن-٠٥ ) series, in tile order', () => {
    render(<BentoScene />);
    const codes = screen
      .getAllByText(/^\( ن-٠[١-٥] \)$/)
      .map((el) => el.textContent);
    expect(codes).toEqual([...CODE_SERIES]);
  });

  it('marks every code decorative (aria-hidden) in the mono metric role', () => {
    render(<BentoScene />);
    document
      .querySelectorAll<HTMLElement>('.landing-bento-card .bento-meta')
      .forEach((meta, i) => {
        expect(meta.getAttribute('aria-hidden')).toBe('true');
        expect(meta.className).toBe('bento-meta');
        expect(meta.textContent).toBe(CODE_SERIES[i]);
      });
  });

  it('places each code after the sticker and above the title', () => {
    render(<BentoScene />);
    const tiles = document.querySelectorAll('.landing-bento-grid > li');
    expect(tiles).toHaveLength(5);
    tiles.forEach((tile) => {
      const sticker = tile.querySelector('.sticker');
      const meta = tile.querySelector('.bento-meta');
      const title = tile.querySelector('.landing-bento-title');
      const desc = tile.querySelector('.landing-bento-desc');
      expect(sticker && meta && title && desc).toBeTruthy();
      // DOM order is the reading order: sticker → code → title → desc.
      expect(tile.children[0]).toBe(sticker);
      expect(tile.children[1]).toBe(meta);
      expect(tile.children[2]).toBe(title);
      expect(tile.children[3]).toBe(desc);
    });
  });
});

describe('BentoScene — anchors and semantics', () => {
  it('keeps the four anchor targets (megamenu / footer / journey rail)', () => {
    render(<BentoScene />);
    ['research', 'exams', 'labs', 'achievements'].forEach((id) => {
      const el = document.getElementById(id);
      expect(el).toBeTruthy();
      // the anchor lands on the tile itself, which stays a card
      expect(el?.className).toContain('landing-bento-card');
    });
  });

  it('exposes a named region and one named list of five tiles', () => {
    render(<BentoScene />);
    const region = screen.getByRole('region', { name: 'من المحاضرة إلى الشهادة' });
    expect(region.className).toContain('landing-bento-scene');
    const list = within(region).getByRole('list', { name: 'قدرات المنصّة الدراسية' });
    expect(within(list).getAllByRole('listitem')).toHaveLength(5);
  });

  it('preserves the band color families and the mosaic placement wiring', () => {
    render(<BentoScene />);
    AREA_SERIES.forEach((area, i) => {
      const tile = document.querySelector(`.${area}`);
      expect(tile).toBeTruthy();
      expect(tile?.className).toContain('landing-bento-card');
      expect(tile?.className).toContain(BAND_SERIES[i]);
    });
  });
});

describe('BentoScene — reduced motion', () => {
  it('keeps every string on screen with no hidden-behind-entrance state', () => {
    // The OS asks for reduced motion: SectionAccent must fire to its
    // final state immediately — content is present either way.
    Object.defineProperty(window, 'matchMedia', {
      configurable: true,
      writable: true,
      value: (query: string) => ({
        matches: query === '(prefers-reduced-motion: reduce)',
        media: query,
        onchange: null,
        addEventListener: () => {},
        removeEventListener: () => {},
        addListener: () => {},
        removeListener: () => {},
        dispatchEvent: () => false,
      }),
    });
    render(<BentoScene />);

    expect(
      screen.getByRole('heading', { level: 2, name: 'من المحاضرة إلى الشهادة' }),
    ).toBeVisible();
    TILE_TITLES.forEach((title) => {
      expect(screen.getByRole('heading', { level: 3, name: title })).toBeVisible();
    });
    // every description paragraph is attached and visible (jsdom: no
    // display:none / hidden attr — the entrance never gated content)
    const descs = document.querySelectorAll('.landing-bento-desc');
    expect(descs).toHaveLength(5);
    descs.forEach((p) => expect(p).toBeVisible());
    const copy = document.querySelector('.landing-bento')?.textContent ?? '';
    TILE_DESCRIPTIONS.forEach((desc) => {
      expect(copy).toContain(desc);
    });
    expect(screen.getAllByText(/^\( ن-٠[١-٥] \)$/)).toHaveLength(5);
  });
});
