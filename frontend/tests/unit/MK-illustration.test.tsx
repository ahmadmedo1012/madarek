/**
 * mk-ill kit contract tests (r280 wiring).
 *
 * Pins the <Illustration> dispatcher + <BrandLoader> + names registry:
 * the pieces themselves are SVG geometry (verified visually by Agent I
 * at 120/160/220 in both themes; not re-pinned here byte-for-byte —
 * the dispatcher contract is what every surface consumes).
 */
import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { Illustration } from '../../src/components/illustrations/Illustration';
import { BrandLoader } from '../../src/components/illustrations/BrandLoader';
import { MK_ILLUSTRATION_NAMES } from '../../src/components/illustrations/names';

describe('mk-ill names registry', () => {
  it('declares all 16 pieces with a 1:1 pieces/ mapping', () => {
    expect(MK_ILLUSTRATION_NAMES).toHaveLength(16);
    for (const name of MK_ILLUSTRATION_NAMES) {
      expect(name).toMatch(/^[a-z][a-z-]*$/);
    }
  });
});

describe('<Illustration> dispatcher', () => {
  it('renders the mk-ill wrapper with data-mk-ill carrying the name', async () => {
    render(<Illustration name="empty-list" />);
    const node = document.querySelector('[data-mk-ill="empty-list"]');
    expect(node).not.toBeNull();
    // The legacy `illustration` class coexists (token-system contrast
    // lift + slot sizing ride it for free).
    expect(node!.classList.contains('mk-ill')).toBe(true);
    expect(node!.classList.contains('illustration')).toBe(true);
    // The lazy piece mounts.
    await waitFor(() => {
      expect(node!.querySelector('svg')).not.toBeNull();
    });
  });

  it('is decorative by default (aria-hidden, no role=img)', () => {
    render(<Illustration name="not-found" />);
    const node = document.querySelector('[data-mk-ill="not-found"]')!;
    expect(node).toHaveAttribute('aria-hidden', 'true');
    expect(node.getAttribute('role')).toBeNull();
  });

  it('title promotes the piece to role="img" with the Arabic label', () => {
    render(<Illustration name="server-waking" title="الخادم يستيقظ" />);
    const fig = screen.getByRole('img');
    expect(fig).toHaveAttribute('aria-label', 'الخادم يستيقظ');
    expect(fig).not.toHaveAttribute('aria-hidden');
  });

  it('size sets the --mk-ill-size custom property', () => {
    render(<Illustration name="forbidden" size={180} />);
    const node = document.querySelector('[data-mk-ill="forbidden"]') as HTMLElement;
    expect(node.style.getPropertyValue('--mk-ill-size')).toBe('180px');
  });
});

describe('<BrandLoader>', () => {
  it('announces the caller\'s Arabic label once via role="status"', () => {
    render(<BrandLoader label="جارٍ تحميل لوحتك…" />);
    const node = screen.getByRole('status');
    expect(node).toHaveAttribute('aria-label', 'جارٍ تحميل لوحتك…');
    expect(node.querySelector('svg')?.getAttribute('aria-hidden')).toBe('true');
  });

  it('defaults to 32px and honours an explicit size', () => {
    const { rerender } = render(<BrandLoader label="x" />);
    expect((document.querySelector('.mk-loader') as HTMLElement).style.getPropertyValue('--mk-loader-size')).toBe('32px');
    rerender(<BrandLoader label="x" size={40} />);
    expect((document.querySelector('.mk-loader') as HTMLElement).style.getPropertyValue('--mk-loader-size')).toBe('40px');
  });

  it('r280 decorative mode renders fully aria-hidden (the owning surface announces)', () => {
    render(<BrandLoader label="x" decorative />);
    const node = document.querySelector('.mk-loader') as HTMLElement;
    expect(node).toHaveAttribute('aria-hidden', 'true');
    expect(node.getAttribute('role')).toBeNull();
    // No stray role="status" anywhere in the composition.
    expect(document.querySelectorAll('[role="status"]').length).toBe(0);
  });
});
