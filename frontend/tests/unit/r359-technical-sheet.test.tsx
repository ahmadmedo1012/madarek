/**
 * R359 — the app-side technical plate.
 *
 * The plate is decorative chrome by default: it must never enter the
 * accessibility tree on the auth pages (the form is the content). When a
 * caller passes a `label`, it becomes a described role="img" instead.
 * The geometry contract is one SVG with the eight named layers, and the
 * elevation variant must swap the plan envelope for the section.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  TechnicalSheet,
  type TechnicalSheetProps,
  type TechnicalSheetVariant,
} from '../../src/components/illustrations/technical/TechnicalSheet';

/* The variant census — a Record keyed by the union forces every new
 * variant to register here (the compiler rejects a missing key), so a
 * sheet cut can never join the family untested. */
const VARIANT_CENSUS: Record<TechnicalSheetVariant, true> = {
  plan: true,
  elevation: true,
};
const VARIANTS = Object.keys(VARIANT_CENSUS) as TechnicalSheetVariant[];

describe('R359 · TechnicalSheet', () => {
  it('is decorative by default — aria-hidden, one SVG, named layers', () => {
    const { container } = render(<TechnicalSheet />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelector('.tp-grid')).not.toBeNull();
    expect(container.querySelector('.tp-construct')).not.toBeNull();
    expect(container.querySelector('.tp-envelope')).not.toBeNull();
    expect(container.querySelector('.tp-partition')).not.toBeNull();
    expect(container.querySelector('.tp-fixture')).not.toBeNull();
    expect(container.querySelector('.tp-dim')).not.toBeNull();
    expect(container.querySelector('.tp-note')).not.toBeNull();
    expect(container.querySelector('.tp-title')).not.toBeNull();
  });

  it.each(VARIANTS)('%s — mounts the shared chrome exactly once', (variant) => {
    const props: TechnicalSheetProps = { variant };
    const { container } = render(<TechnicalSheet {...props} />);
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    expect(container.querySelectorAll('.tp-frame')).toHaveLength(1);
    expect(container.querySelectorAll('.tp-grid')).toHaveLength(1);
    expect(container.querySelectorAll('.tp-north')).toHaveLength(1);
    expect(container.querySelectorAll('.tp-note')).toHaveLength(1);
    expect(container.querySelectorAll('.tp-title')).toHaveLength(1);
    expect(container.querySelector(`.technical-sheet--${variant}`)).not.toBeNull();
  });

  it('renders the plan cut + dimension chain in the plan variant', () => {
    const { container } = render(<TechnicalSheet variant="plan" />);
    expect(container.querySelector('.technical-sheet--plan')).not.toBeNull();
    expect(container.querySelector('.tp-cut')).not.toBeNull();
    // three dimension chains: width 240, depth 260, corridor 40
    expect(container.querySelectorAll('.tp-text--dim')).toHaveLength(3);
  });

  it('swaps to the section geometry in the elevation variant', () => {
    const { container } = render(<TechnicalSheet variant="elevation" />);
    expect(container.querySelector('.technical-sheet--elevation')).not.toBeNull();
    expect(container.querySelector('.tp-stipple')).not.toBeNull();
    expect(container.querySelector('.technical-sheet--plan')).toBeNull();
  });

  it('promotes to a described image when a label is supplied', () => {
    render(<TechnicalSheet label="مقطع في الطابق التعليمي" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('aria-hidden')).toBeNull();
    expect(img.querySelector('title')?.textContent).toBe('لوحة رسم هندسية');
    expect(img.querySelector('desc')?.textContent).toBe('مقطع في الطابق التعليمي');
  });
});
