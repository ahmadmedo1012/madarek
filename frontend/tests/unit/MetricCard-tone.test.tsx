/**
 * MetricCard semantic tone pins (r166b — E2 #2/#3).
 *
 * The `color` prop has been part of MetricCard's API since the
 * primitives wave, but until r166b nothing consumed the emitted
 * `.metric.<color>` classes — every KPI row in the app painted
 * identical copper wells and the semantic coding was silently lost
 * (DOM-verified on /quality/exam-moderation: three tiles with
 * amber/green/red all measured bg #F4E4D2 / color #B57438).
 *
 * jsdom does not load stylesheets, so the class emission is asserted
 * through @testing-library while the CONSUMING rules are pinned by a
 * source scan of components.css (the same readStyle pattern as
 * token-snapshot.test.ts / NotificationDropdown-tone-a11y.test.tsx):
 * if either half of the contract regresses — the primitive stops
 * emitting the class, or the stylesheet drops the rule — this test
 * bites. The both-theme 3:1 math for each family pair is documented
 * inline in components.css (§ METRIC / KPI).
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Database } from 'lucide-react';

import { MetricCard } from '../../src/components/primitives';

const STYLES_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'src',
  'styles',
);
const componentsCss = readFileSync(path.join(STYLES_DIR, 'components.css'), 'utf-8');

/* The class must exist in BOTH halves of the contract: the primitive
 * emits it, the stylesheet consumes it. brand never emits a class
 * (index.tsx: `color !== 'brand'`) — the default copper well is the
 * `.metric` base rule, and its glyph rides the both-theme-safe
 * --accent-ink (light 8.62:1, was 1.76:1 — the r166b light-well fix). */
type SemanticTone = 'green' | 'amber' | 'red' | 'purple' | 'gold';
const TONE_CLASS_CONSUMERS: ReadonlyArray<[SemanticTone, RegExp]> = [
  ['green', /\.metric\.green\s*\{\s*--_metric-color:\s*var\(--success-ink\);/],
  ['amber', /\.metric\.amber\s*\{\s*--_metric-color:\s*var\(--warning-ink\);/],
  ['red', /\.metric\.red\s*\{\s*--_metric-color:\s*var\(--danger-ink\);/],
  ['purple', /\.metric\.purple\s*\{\s*--_metric-color:\s*var\(--c-lavender-deep\);/],
  ['gold', /\.metric\.gold\s*\{\s*--_metric-color:\s*var\(--gold-ink\);/],
];

describe('MetricCard — semantic tone classes (r166b)', () => {
  for (const [tone] of TONE_CLASS_CONSUMERS) {
    it(`emits the "${tone}" class on the plain <div> form`, () => {
      const { container } = render(
        <div><MetricCard icon={Database} label="مؤشّر" value="7" color={tone} /></div>,
      );
      const el = container.querySelector(`.metric.${tone}`);
      expect(el, `no .metric.${tone} element rendered`).not.toBeNull();
      expect(el!.tagName).toBe('DIV');
      // The icon well is the tone's consumer — it must render too.
      expect(el!.querySelector('.metric-icon')).not.toBeNull();
    });
  }

  it('emits the tone class on the navigable <Link> form (the class travels with the tile)', () => {
    const { container } = render(
      <MemoryRouter>
        <MetricCard icon={Database} label="مؤشر" value="7" color="amber" to="/admin/students" />
      </MemoryRouter>,
    );
    const link = container.querySelector('a.metric-link.amber');
    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('/admin/students');
  });

  it('emits the tone class on the <button> (onClick) form', () => {
    const { container } = render(
      <MetricCard icon={Database} label="مؤشر" value="7" color="red" onClick={() => {}} />,
    );
    expect(container.querySelector('button.metric.red')).not.toBeNull();
  });

  it('color="brand" emits NO tone class — the default copper well is the .metric base rule', () => {
    const { container } = render(
      <div><MetricCard icon={Database} label="مؤشر" value="7" color="brand" /></div>,
    );
    const el = container.querySelector('.metric');
    expect(el).not.toBeNull();
    expect(el!.className).toBe('metric');
  });

  it('omitting color emits no tone class either', () => {
    const { container } = render(
      <div><MetricCard icon={Database} label="مؤشّر" value="7" /></div>,
    );
    expect(container.querySelector('.metric')!.className).toBe('metric');
  });
});

describe('components.css — the tone rules exist and ride token pairs (the "dead CSS" regression pin)', () => {
  for (const [tone, rule] of TONE_CLASS_CONSUMERS) {
    it(`.metric.${tone} overrides the well custom properties`, () => {
      expect(componentsCss, `no consuming rule for .metric.${tone}`).toMatch(rule);
    });
  }

  it('the purple dark tier override exists (no status-* twin for lavender)', () => {
    expect(componentsCss).toMatch(
      /\[data-theme="dark"\]\s*\.metric\.purple\s*\{\s*--_metric-color:\s*var\(--c-lavender-ink\);/,
    );
  });

  it('the DEFAULT glyph consumes the both-theme-safe accent ink (light-well 3:1 fix)', () => {
    expect(componentsCss).toMatch(/\.metric\s*\{\s*[\s\S]*?--_metric-color:\s*var\(--accent-ink\);/);
  });
});
