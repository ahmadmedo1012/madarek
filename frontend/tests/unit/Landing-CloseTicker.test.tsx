/**
 * Landing-CloseTicker — wave-2 scene tests (task imm-3-close).
 *
 * Two acts:
 *   - TickerScene: the Arabic facts marquee — section semantics, all
 *     eight real facts, the aria-hidden seamless-loop duplicate, and
 *     content present without animations (reduced-motion contract).
 *   - CloseScene: the giant-wordmark close — the #close anchor the
 *     journey rail's graduation stamp targets, the aria-hidden
 *     decorative wordmark above the semantic h2, both CTAs (label-roll
 *     structure, correct hrefs), and the ministry meta line.
 *
 * jsdom renders no CSS, so animation state is asserted structurally:
 * the duplicate exists for the loop (hidden by CSS under reduced
 * motion) and every real string is plain text in the tree either way.
 */
import { describe, expect, it } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { TickerScene } from '../../src/components/landing/TickerScene';
import { CloseScene } from '../../src/components/landing/CloseScene';

/** The university's real facts, verbatim (logos strip / facts row /
 *  campus caption on the page) — the test pins the full set. */
const FACTS = [
  'جامعة الزاوية',
  'وزارة التعليم العالي والبحث العلمي',
  '٢٥ كلّيّة أكاديميّة',
  '٤ مدن وفروع',
  'منذ 1988',
  'قطاع ضمان الجودة',
  'مكتب البحوث',
  'عمادة الطلاب',
];

describe('TickerScene', () => {
  it('renders a labelled section with one list of the eight real facts', () => {
    render(<TickerScene />);
    const region = screen.getByRole('region', { name: 'حقائق الجامعة' });
    expect(region.tagName).toBe('SECTION');
    // the accessible list is the primary copy (the duplicate is
    // aria-hidden and therefore outside the role query)
    const list = within(region).getByRole('list');
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(FACTS.length);
    FACTS.forEach((fact) => {
      expect(within(list).getByText(fact)).toBeTruthy();
    });
  });

  it('duplicates the track exactly once for the seamless loop, aria-hidden', () => {
    const { container } = render(<TickerScene />);
    const lists = container.querySelectorAll('ul');
    expect(lists).toHaveLength(2);
    // the duplicate is removed from the a11y tree…
    expect(lists[1]).toHaveAttribute('aria-hidden', 'true');
    // …and carries identical ink (the 50% loop math depends on it)
    expect(lists[1].textContent).toBe(lists[0].textContent);
  });

  it('keeps every fact readable without animations (reduced-motion contract)', () => {
    render(<TickerScene />);
    // with the loop stopped (or never started) the primary list still
    // carries all eight facts as plain, un-cut text
    FACTS.forEach((fact) => {
      expect(screen.getAllByText(fact).length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe('CloseScene', () => {
  it('keeps the #close anchor the journey rail graduation stamp targets', () => {
    render(
      <MemoryRouter>
        <CloseScene />
      </MemoryRouter>,
    );
    const el = document.getElementById('close');
    expect(el).toBeTruthy();
    expect(el?.tagName).toBe('SECTION');
    // the dark band grounds + band-scoped focus ring still apply
    expect(el?.classList.contains('band')).toBe(true);
    expect(el?.classList.contains('band-dark')).toBe(true);
  });

  it('renders the giant wordmark as decorative, the h2 as the real heading', () => {
    const { container } = render(
      <MemoryRouter>
        <CloseScene />
      </MemoryRouter>,
    );
    const wordmark = container.querySelector('.close-wordmark');
    expect(wordmark).toBeTruthy();
    expect(wordmark?.getAttribute('aria-hidden')).toBe('true');
    expect(wordmark?.textContent).toBe('مدارك');
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading.textContent).toContain('منصّتك الأكاديميّة');
    expect(heading.textContent).toContain('انتظارك');
  });

  it('keeps the lede and both CTAs with the label-roll structure', () => {
    render(
      <MemoryRouter>
        <CloseScene />
      </MemoryRouter>,
    );
    expect(
      screen.getByText(
        'سجِّل دخولك ببريدك الجامعيّ أو رقم قيدك للوصول إلى مقرَّراتك ومتابعة تقدُّمك الأكاديمي.',
      ),
    ).toBeTruthy();
    const primary = screen.getByRole('link', { name: 'تسجيل الدخول' });
    expect(primary.getAttribute('href')).toBe('/auth');
    const ghost = screen.getByRole('link', { name: 'اكتشف المنصة' });
    expect(ghost.getAttribute('href')).toBe('#features');
    // label roll: two stacked spans per button, the rolling copy is
    // aria-hidden so the accessible name reads once
    const rolls = document.querySelectorAll('.labelroll');
    expect(rolls).toHaveLength(2);
    rolls.forEach((roll) => {
      expect(roll.querySelectorAll(':scope > span')).toHaveLength(2);
    });
    const flips = document.querySelectorAll('.labelroll-flip');
    expect(flips).toHaveLength(2);
    flips.forEach((flip) => {
      expect(flip.getAttribute('aria-hidden')).toBe('true');
    });
  });

  it('keeps the quiet ministry meta line with the current year', () => {
    render(
      <MemoryRouter>
        <CloseScene />
      </MemoryRouter>,
    );
    const meta = document.querySelector('.close-meta');
    expect(meta?.textContent).toContain('وزارة التعليم العالي والبحث العلمي');
    expect(meta?.textContent).toContain('جامعة الزاوية');
    expect(meta?.textContent).toContain(String(new Date().getFullYear()));
  });

  it('renders the close content without animations (reduced-motion contract)', () => {
    render(
      <MemoryRouter>
        <CloseScene />
      </MemoryRouter>,
    );
    // animations off must never hide the act: wordmark, heading, both
    // CTAs and the meta line are all plain content in the tree
    expect(document.querySelector('.close-wordmark')?.textContent).toBe('مدارك');
    expect(screen.getByRole('heading', { level: 2 }).textContent).toContain('انتظارك');
    expect(screen.getByRole('link', { name: 'تسجيل الدخول' })).toBeTruthy();
    expect(screen.getByRole('link', { name: 'اكتشف المنصة' })).toBeTruthy();
    expect(document.querySelector('.close-meta')).toBeTruthy();
  });
});
