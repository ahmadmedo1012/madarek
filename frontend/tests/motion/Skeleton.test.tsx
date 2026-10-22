/**
 * motion/Skeleton — the aria contract (r157, audit 6A11 #5).
 *
 * The bars are SILENT by default (aria-hidden — decorative layout
 * scaffolding, matching the States.tsx skeleton family whose bars are
 * aria-hidden inside an explicit aria-busy wrapper). The busy semantics
 * (role=status + aria-busy) are OPT-IN via `aria-label`, landing on the
 * element for single bars or on the rows wrapper for repeated rows.
 *
 * Also pins the honest barrel inventory: SkeletonGroup is gone (zero
 * consumers ever rendered it — rg-verified; its dead CSS in motion.css
 * belongs to the CSS-foundations wave).
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from '../../src/components/motion/Skeleton';
import * as motionInventory from '../../src/components/motion';

describe('Skeleton', () => {
  it('renders the requested variant', () => {
    const { container } = render(<Skeleton variant="kpi" />);
    const el = container.querySelector('.skeleton');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('data-variant')).toBe('kpi');
  });

  it('repeats text rows', () => {
    const { container } = render(<Skeleton variant="text" rows={3} />);
    const rows = container.querySelectorAll('.skeleton');
    expect(rows.length).toBe(3);
  });

  it('applies width / height overrides', () => {
    const { container } = render(<Skeleton variant="card" width="60%" height="200px" />);
    const el = container.querySelector('.skeleton') as HTMLElement;
    expect(el.style.width).toBe('60%');
    expect(el.style.height).toBe('200px');
  });

  it('is silent by default — aria-hidden, no role, no aria-busy', () => {
    const { container } = render(<Skeleton variant="card" />);
    const el = container.querySelector('.skeleton');
    expect(el).toHaveAttribute('aria-hidden', 'true');
    expect(el?.getAttribute('role')).toBeNull();
    expect(el?.getAttribute('aria-busy')).toBeNull();
    expect(el?.getAttribute('aria-label')).toBeNull();
  });

  it('repeated rows are silent by default — wrapper and bars', () => {
    const { container } = render(<Skeleton variant="text" rows={3} />);
    const wrapper = container.firstElementChild;
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveAttribute('aria-hidden', 'true');
    expect(wrapper?.getAttribute('role')).toBeNull();
    expect(wrapper?.getAttribute('aria-busy')).toBeNull();
    for (const bar of container.querySelectorAll('.skeleton')) {
      expect(bar).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('aria-label opts into the busy contract on a single bar', () => {
    render(<Skeleton variant="card" aria-label="جارٍ تحميل البطاقات" />);
    const el = screen.getByRole('status');
    expect(el).toHaveAttribute('aria-busy', 'true');
    expect(el).toHaveAttribute('aria-label', 'جارٍ تحميل البطاقات');
    expect(el.getAttribute('aria-hidden')).toBeNull();
  });

  it('aria-label opts into the busy contract on the ROWS wrapper — bars stay hidden', () => {
    const { container } = render(
      <Skeleton variant="text" rows={3} aria-label="جارٍ تحميل المقال" />,
    );
    const wrapper = container.querySelector('[role="status"]');
    expect(wrapper).not.toBeNull();
    expect(wrapper).toHaveAttribute('aria-busy', 'true');
    expect(wrapper).toHaveAttribute('aria-label', 'جارٍ تحميل المقال');
    expect(wrapper!.querySelectorAll('.skeleton')).toHaveLength(3);
    for (const bar of container.querySelectorAll('.skeleton')) {
      expect(bar).toHaveAttribute('aria-hidden', 'true');
    }
  });
});

describe('motion barrel inventory (r157)', () => {
  it('exports the live primitives — and no longer SkeletonGroup', () => {
    // Runtime keys only (the SkeletonVariant type export vanishes at
    // runtime under verbatimModuleSyntax-style re-exports).
    // SkeletonGroup's absence is pinned by the exact key list — the
    // module type no longer exports it (compile-time guaranteed too).
    // r305-A2: CursorManager joins the live inventory (the global cursor
    // layer, mounted once in App.tsx) — SkeletonGroup stays absent.
    // R312 (§R D7): GuestReveal joins — the guest surfaces' route
    // transition (the keyed remount on the three guest boundaries).
    expect(Object.keys(motionInventory).sort()).toEqual(
      ['CursorManager', 'GuestReveal', 'PageTransition', 'Reveal', 'RevealGroup', 'Skeleton', 'useReducedMotion'].sort(),
    );
  });
});
