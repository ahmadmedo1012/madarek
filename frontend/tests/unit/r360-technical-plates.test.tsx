/**
 * R360 — the working drawings (TechnicalPlate).
 *
 * The plate family inherits the r359 sheet contract: decorative chrome
 * by default (aria-hidden, never in the a11y tree), one SVG with the
 * named layers, promotion to a described role="img" only when a caller
 * supplies a label. Each variant must swap its instrument geometry
 * while the chrome (frame, grid, north, title block) stays identical.
 */
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TechnicalPlate } from '../../src/components/illustrations/technical/TechnicalPlate';

describe('R360 · TechnicalPlate', () => {
  it('is decorative by default — aria-hidden, one SVG, the family grammar classes', () => {
    const { container } = render(<TechnicalPlate />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('aria-hidden')).toBe('true');
    expect(root.getAttribute('focusable')).toBe('false');
    expect(container.querySelectorAll('svg')).toHaveLength(1);
    /* the family marker + the inherited sheet grammar (ink ladder and
     * cascade live on .technical-sheet — the plates add no ink CSS) */
    expect(root.classList.contains('technical-sheet')).toBe(true);
    expect(root.classList.contains('technical-plate')).toBe(true);
    expect(root.classList.contains('technical-plate--knowledge')).toBe(true);
    /* the shared chrome layers exist in every variant */
    expect(container.querySelector('.tp-frame')).not.toBeNull();
    expect(container.querySelector('.tp-grid')).not.toBeNull();
    expect(container.querySelector('.tp-construct')).not.toBeNull();
    expect(container.querySelector('.tp-envelope')).not.toBeNull();
    expect(container.querySelector('.tp-partition')).not.toBeNull();
    expect(container.querySelector('.tp-fixture')).not.toBeNull();
    expect(container.querySelector('.tp-dim')).not.toBeNull();
    expect(container.querySelector('.tp-note')).not.toBeNull();
    expect(container.querySelector('.tp-title')).not.toBeNull();
  });

  it('knowledge — the concept net: hull, edges, the isolate in signal ink', () => {
    const { container } = render(<TechnicalPlate variant="knowledge" />);
    expect(container.querySelector('.technical-plate--knowledge')).not.toBeNull();
    /* the surveyed hull of the field */
    expect(container.querySelector('.tp-envelope path')).not.toBeNull();
    /* 12 linked edges + 1 dashed weak link to the isolate */
    expect(container.querySelectorAll('.tp-partition line')).toHaveLength(13);
    /* two dimension chains: field width 234 + height 220 */
    expect(container.querySelectorAll('.tp-text--dim')).toHaveLength(2);
    /* the ONE signal marker */
    expect(container.querySelector('.tp-mark')).not.toBeNull();
  });

  it('progress — the mastery ladder: five steps off one baseline', () => {
    const { container } = render(<TechnicalPlate variant="progress" />);
    expect(container.querySelector('.technical-plate--progress')).not.toBeNull();
    /* the baseline + the five stepped rects */
    const envelope = container.querySelector('.tp-envelope') as SVGGElement;
    expect(envelope.querySelectorAll('rect')).toHaveLength(5);
    expect(envelope.querySelectorAll('line')).toHaveLength(1);
    /* three dimension chains: rise +9.6, step 48, span 256 */
    expect(container.querySelectorAll('.tp-text--dim')).toHaveLength(3);
    /* the current-level signal */
    expect(container.querySelector('.tp-mark')).not.toBeNull();
  });

  it('pathway — the route survey: the travelled line, stations, the goal flag', () => {
    const { container } = render(<TechnicalPlate variant="pathway" />);
    expect(container.querySelector('.technical-plate--pathway')).not.toBeNull();
    /* the route polyline in the envelope */
    expect(container.querySelector('.tp-envelope path')).not.toBeNull();
    /* four station crosses on the travelled line */
    expect(container.querySelectorAll('.tp-partition g')).toHaveLength(4);
    /* five waypoint labels ride the note layer (reading ink, not the
     * fixture ladder — the grammar gives fixture text no fill) */
    const note = container.querySelector('.tp-note') as SVGGElement;
    const labels = Array.from(note.querySelectorAll('text')).map((t) => t.textContent);
    expect(labels).toEqual(expect.arrayContaining(['W1', 'W2', 'W3', 'W4', 'W5']));
    /* two dimension chains: chord 258 + rise 178 */
    expect(container.querySelectorAll('.tp-text--dim')).toHaveLength(2);
    /* the goal is the ONE signal */
    expect(container.querySelector('.tp-mark')).not.toBeNull();
  });

  it('document — the analysed sheet: the A4 page, table grid, the ref pin', () => {
    const { container } = render(<TechnicalPlate variant="document" />);
    expect(container.querySelector('.technical-plate--document')).not.toBeNull();
    /* the page rect in the envelope */
    expect(container.querySelector('.tp-envelope rect')).not.toBeNull();
    /* the table: 1 frame + 3 row lines + 2 column lines */
    expect(container.querySelectorAll('.tp-partition line')).toHaveLength(5);
    /* two dimension chains: 210 × 297 — the sheet names its own A4 */
    const dims = Array.from(container.querySelectorAll('.tp-text--dim')).map(
      (t) => t.textContent,
    );
    expect(dims).toEqual(expect.arrayContaining(['210', '297']));
    /* the annotated line is the ONE signal */
    expect(container.querySelector('.tp-mark')).not.toBeNull();
  });

  it('promotes to a described image when a label is supplied', () => {
    render(<TechnicalPlate variant="progress" label="مقطع في مستويات الإتقان" />);
    const img = screen.getByRole('img');
    expect(img.getAttribute('aria-hidden')).toBeNull();
    expect(img.querySelector('title')?.textContent).toBe('لوحة رسم هندسية');
    expect(img.querySelector('desc')?.textContent).toBe('مقطع في مستويات الإتقان');
  });

  it('mounts every variant without the label ever leaking into the tree', () => {
    for (const variant of ['knowledge', 'progress', 'pathway', 'document'] as const) {
      const { container } = render(<TechnicalPlate variant={variant} />);
      const root = container.firstElementChild as HTMLElement;
      expect(root.getAttribute('aria-hidden')).toBe('true');
      expect(container.querySelector('title')).toBeNull();
      expect(container.querySelector('desc')).toBeNull();
    }
  });
});
