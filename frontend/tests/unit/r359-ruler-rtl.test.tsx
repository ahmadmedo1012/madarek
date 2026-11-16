/**
 * R359 — the RulerGauge RTL seal.
 *
 * The positioned numeral element must inherit the sheet's direction so
 * `inset-inline-start` resolves on the same axis as the tick marks; only
 * the inner <bdi> may carry dir="ltr" (digit isolation). Before R359 the
 * dir="ltr" sat on the positioned element, so the 100 reading resolved
 * `left: 100%` + translateX(100%) and was clipped by the hero's edge.
 */
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RulerGauge } from '../../src/components/patterns/indicators';

describe('R359 · RulerGauge numerals — RTL anchoring', () => {
  it('keeps positioning on an RTL-inheriting wrapper and isolates digits inside', () => {
    const { container } = render(<RulerGauge value={42} ariaLabel="إنجاز المقرر" />);
    const numerals = Array.from(container.querySelectorAll('.ind-ruler-num'));
    expect(numerals).toHaveLength(5);
    for (const n of numerals) {
      expect(n.getAttribute('dir')).not.toBe('ltr');
      expect(n.querySelector('bdi[dir="ltr"]')).not.toBeNull();
    }
    expect(numerals.map((n) => n.textContent)).toEqual(['0', '25', '50', '75', '100']);
  });

  it('positions 100 on the inline-start axis (transform folds it inward)', () => {
    const { container } = render(<RulerGauge value={100} />);
    const last = container.querySelectorAll<HTMLElement>('.ind-ruler-num')[4];
    const style = last.getAttribute('style') ?? '';
    expect(style).toContain('inset-inline-start: 100%');
    expect(style).toContain('transform: translateX(100%)');
  });
});
