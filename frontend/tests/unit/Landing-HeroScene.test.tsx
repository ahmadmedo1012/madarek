/**
 * HeroScene — wave-2 immersive hero unit tests.
 *
 * The contract under test (immersive-redesign plan §6, scene 1):
 *   - all hero copy renders: eyebrow, exact title words, subtitle,
 *     the three CTAs, mockup + Oasis badge + micro-taglines;
 *   - #top anchor, CTA hrefs/behaviors and the colleges trigger
 *     (aria-haspopup/aria-expanded + count badge + open callback);
 *   - the live scene layer: canvas wrapper decorative (aria-hidden),
 *     static orbit fallback rings + glow always present — jsdom has
 *     no 2D context, so every render here IS the canvas-failure
 *     path and the hero must still read as «مدارك تتوسّع»;
 *   - title treatment: word masks (whole Arabic words, never chars),
 *     the <em> accent word, the single copper period (aria-hidden);
 *   - the label-roll structure on the primary CTA (two stacked
 *     labels, duplicate hidden from AT);
 *   - reduced motion: identical content, nothing held hostage.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { HeroScene } from '../../src/components/landing/HeroScene';

const COLLEGES_COUNT = 25;

function installMatchMedia(matchesFor: (query: string) => boolean): void {
  window.matchMedia = ((query: string) => ({
    matches: matchesFor(query),
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
}

function renderHero(props?: {
  collegesOpen?: boolean;
  onOpenColleges?: () => void;
}) {
  const onOpenColleges = props?.onOpenColleges ?? vi.fn();
  const view = render(
    <MemoryRouter>
      <HeroScene
        collegesCount={COLLEGES_COUNT}
        collegesOpen={props?.collegesOpen ?? false}
        onOpenColleges={onOpenColleges}
      />
    </MemoryRouter>,
  );
  return { ...view, onOpenColleges };
}

beforeEach(() => {
  installMatchMedia(() => false);
});

describe('HeroScene — copy & anchors', () => {
  it('renders the eyebrow, subtitle and micro-tagline copy', () => {
    renderHero();
    const eyebrow = document.querySelector('.landing-hero-eyebrow');
    expect(eyebrow).not.toBeNull();
    expect(eyebrow?.textContent).toContain('جديد');
    expect(eyebrow?.textContent).toContain('المساعد الأكاديمي');
    expect(eyebrow?.textContent).toContain('Oasis');
    expect(eyebrow?.textContent).toContain('متاح الآن');

    expect(
      screen.getByText(
        'مساحة عمل أكاديمية واحدة تُمكّن الطالب والأستاذ والإدارة وضمان الجودة من إدارة المحاضرات، البحوث، الاختبارات والتقييم، بهدوء وسهولة.',
      ),
    ).toBeInTheDocument();
    expect(screen.getByText('بإيميلك الجامعي')).toBeInTheDocument();
    expect(screen.getByText('دعم RTL كامل')).toBeInTheDocument();
    expect(screen.getByText('اعتماد رسميّ')).toBeInTheDocument();
  });

  it('keeps the #top anchor on the hero section', () => {
    renderHero();
    const top = document.getElementById('top');
    expect(top).not.toBeNull();
    expect(top?.tagName).toBe('SECTION');
    expect(top?.classList.contains('landing-hero')).toBe(true);
    expect(top?.classList.contains('landing-hero-diagonal')).toBe(true);
  });

  it('renders the dashboard mockup with its Oasis badge', () => {
    renderHero();
    const shot = screen.getByAltText(/لوحة تحكّم الطالب في مدارك/);
    expect(shot).toHaveAttribute('src', '/landing-dashboard.webp');
    expect(screen.getByText('Oasis')).toBeInTheDocument();
    expect(screen.getByText('يحضِّر ملخَّص الفصل…')).toBeInTheDocument();
  });
});

describe('HeroScene — CTAs', () => {
  it('renders the three CTAs with their targets', () => {
    renderHero();
    const primary = screen.getByRole('link', { name: 'أنشئ حسابك الجامعي' });
    expect(primary).toHaveAttribute('href', '/auth');
    expect(primary.classList.contains('primary')).toBe(true);

    const tour = screen.getByRole('link', { name: 'شاهد كيف تعمل' });
    expect(tour).toHaveAttribute('href', '#features');
  });

  it('exposes the colleges trigger with popup semantics, badge and callback', () => {
    const onOpenColleges = vi.fn();
    const { rerender } = renderHero({ onOpenColleges });
    const trigger = screen.getByRole('button', { name: /تصفّح الكلّيّات/ });
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    // the count badge rides inside the trigger
    expect(trigger.textContent).toContain(String(COLLEGES_COUNT));

    fireEvent.click(trigger);
    expect(onOpenColleges).toHaveBeenCalledTimes(1);

    rerender(
      <MemoryRouter>
        <HeroScene
          collegesCount={COLLEGES_COUNT}
          collegesOpen
          onOpenColleges={onOpenColleges}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole('button', { name: /تصفّح الكلّيّات/ }),
    ).toHaveAttribute('aria-expanded', 'true');
  });

  it('builds the label-roll structure on the primary CTA only', () => {
    renderHero();
    const rolling = screen.getByRole('link', { name: 'أنشئ حسابك الجامعي' });
    expect(rolling.hasAttribute('data-labelroll')).toBe(true);

    const labels = rolling.querySelectorAll('.labelroll-text');
    expect(labels).toHaveLength(2);
    const visible = rolling.querySelector('.labelroll-text:not([aria-hidden])');
    const duplicate = rolling.querySelector('.labelroll-text[aria-hidden="true"]');
    expect(visible).not.toBeNull();
    expect(duplicate).not.toBeNull();
    expect(visible?.textContent).toBe(duplicate?.textContent);

    // the other CTAs stay plain labels
    expect(
      screen.getByRole('link', { name: 'شاهد كيف تعمل' }).hasAttribute('data-labelroll'),
    ).toBe(false);
    expect(
      screen.getByRole('button', { name: /تصفّح الكلّيّات/ }).hasAttribute('data-labelroll'),
    ).toBe(false);
  });
});

describe('HeroScene — title treatment', () => {
  it('masks whole Arabic words — never characters', () => {
    renderHero();
    const inners = Array.from(
      document.querySelectorAll('.landing-title [data-mask-word-inner]'),
    );
    expect(inners.map((el) => el.textContent)).toEqual([
      'منصّة',
      'التعليم',
      'الذكيّ',
      'لجامعة',
      'الزّاوية',
      '.',
    ]);
    // every WORD mask holds a multi-glyph word — Arabic shaping survives
    const words = inners.slice(0, 5).map((el) => el.textContent ?? '');
    for (const word of words) {
      expect(word.length).toBeGreaterThan(3);
    }
  });

  it('keeps the exact title copy with the em accent and copper period', () => {
    renderHero();
    const title = screen.getByRole('heading', { level: 1 });
    expect(title.classList.contains('landing-title')).toBe(true);
    for (const word of ['منصّة', 'التعليم', 'الذكيّ', 'لجامعة', 'الزّاوية']) {
      expect(title.textContent).toContain(word);
    }
    // the accent word lives inside the <em> (upright black accent ink)
    expect(screen.getByText('الذكيّ').closest('em')).not.toBeNull();
    // the single accent-glyph moment: one copper period, aria-hidden
    const period = title.querySelector('.landing-title-period');
    expect(period).not.toBeNull();
    expect(period?.getAttribute('aria-hidden')).toBe('true');
    expect(period?.textContent).toBe('.');
    // it rides the same mask contract as the words
    expect(period?.hasAttribute('data-mask-word')).toBe(true);
  });
});

describe('HeroScene — live scene layer', () => {
  it('mounts the constellation canvas as a decorative layer', () => {
    renderHero();
    const constellation = document.querySelector('[data-constellation]');
    expect(constellation).not.toBeNull();
    expect(constellation?.getAttribute('aria-hidden')).toBe('true');
    expect(constellation?.querySelector('canvas')).not.toBeNull();
    // it lives inside the hero's scene layer, which is aria-hidden as a whole
    const scene = constellation?.closest('.hero-scene');
    expect(scene?.getAttribute('aria-hidden')).toBe('true');
  });

  it('always paints the orbit fallback: glow + three ring outlines', () => {
    // jsdom's canvas has no 2D context — this IS the failure path.
    renderHero();
    const scene = document.querySelector('.hero-scene');
    expect(scene?.querySelector('.hero-scene-glow')).not.toBeNull();
    const rings = scene?.querySelectorAll('.hero-orbit');
    expect(rings).toHaveLength(3);
    // every ring is inside the decorative aria-hidden tree
    for (const ring of rings ?? []) {
      expect(ring.closest('[aria-hidden="true"]')).not.toBeNull();
    }
  });
});

describe('HeroScene — reduced motion', () => {
  it('renders the full hero content with animations off', () => {
    installMatchMedia((query) => query.includes('reduce'));
    renderHero();
    // the copy is fully present — no reveal holds it hostage
    for (const word of ['منصّة', 'التعليم', 'الذكيّ', 'لجامعة', 'الزّاوية']) {
      expect(screen.getByText(word)).toBeInTheDocument();
    }
    expect(
      screen.getByRole('link', { name: 'أنشئ حسابك الجامعي' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'شاهد كيف تعمل' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /تصفّح الكلّيّات/ })).toBeInTheDocument();
    expect(screen.getByText('بإيميلك الجامعي')).toBeInTheDocument();
  });
});
