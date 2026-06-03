/**
 * Surface drift detector unit tests.
 *
 * Drives detectDrift() against synthetic inventory shapes — the
 * pure function exists so we can test every drift kind without
 * spinning up Playwright.
 */
import { describe, expect, it } from 'vitest';
import { detectDrift, groupByKind, type DriftFinding } from '../../tests/audit/drift';
import type {
  SurfaceCapture,
  SurfaceInventory,
} from '../../tests/audit/inventory-types';

function emptyCapture(overrides: Partial<SurfaceCapture> = {}): SurfaceCapture {
  return {
    route: '/',
    viewport: 1280,
    theme: 'light',
    dir: 'ltr',
    illustrations: [],
    overlays: [],
    roleAccent: null,
    collegeAccent: null,
    collegeAccentFallback: false,
    motionTreatments: [],
    computedColors: [],
    cls: 0,
    fcpMs: 1000,
    bytesTransferred: 100_000,
    ...overrides,
  };
}

function inventory(captures: SurfaceCapture[]): SurfaceInventory {
  return {
    generatedAt: '2026-06-03T00:00:00.000Z',
    captures,
  };
}

describe('detectDrift', () => {
  it('returns no findings for a clean inventory', () => {
    const findings = detectDrift(inventory([emptyCapture()]));
    expect(findings).toEqual([]);
  });

  it('flags an unregistered illustration as off-family', () => {
    const findings = detectDrift(
      inventory([
        emptyCapture({
          illustrations: [
            { name: '<unknown>', decorative: true, altResolved: null, sizeBytesGz: 100 },
          ],
        }),
      ]),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.kind).toBe('off-family-illustration');
  });

  it('flags an oversized illustration', () => {
    const findings = detectDrift(
      inventory([
        emptyCapture({
          illustrations: [
            {
              name: 'homepage-hero',
              decorative: true,
              altResolved: null,
              sizeBytesGz: 12_000,
            },
          ],
        }),
      ]),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.kind).toBe('illustration-too-large');
  });

  it('accepts overlays whose elevToken includes a known --elev marker', () => {
    const findings = detectDrift(
      inventory([
        emptyCapture({
          overlays: [
            {
              type: 'modal',
              elevToken: 'box-shadow: var(--elev-4)',
              glass: true,
              zIndex: 400,
            },
          ],
        }),
      ]),
    );
    expect(findings).toEqual([]);
  });

  it('flags an overlay with an ad-hoc shadow', () => {
    const findings = detectDrift(
      inventory([
        emptyCapture({
          overlays: [
            {
              type: 'modal',
              elevToken: '0 99px 99px hotpink',
              glass: false,
              zIndex: 400,
            },
          ],
        }),
      ]),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.kind).toBe('ad-hoc-shadow');
  });

  it('flags ad-hoc motion durations', () => {
    const findings = detectDrift(
      inventory([
        emptyCapture({
          motionTreatments: [{ selector: '.x', durationMs: 137, easing: 'ease' }],
        }),
      ]),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.kind).toBe('ad-hoc-motion-duration');
  });

  it('accepts canonical motion durations from the foundation', () => {
    const findings = detectDrift(
      inventory([
        emptyCapture({
          motionTreatments: [
            { selector: '.x', durationMs: 240, easing: 'ease' },
            { selector: '.y', durationMs: 360, easing: 'ease' },
          ],
        }),
      ]),
    );
    expect(findings).toEqual([]);
  });

  it('flags body text below 4.5 contrast ratio', () => {
    const findings = detectDrift(
      inventory([
        emptyCapture({
          computedColors: [
            {
              selector: '.body-text',
              background: 'white',
              color: 'gray',
              contrastRatio: 3.2,
            },
          ],
        }),
      ]),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.kind).toBe('contrast-regression');
  });

  it('uses 7.0 minimum for numeric KPI selectors', () => {
    const findings = detectDrift(
      inventory([
        emptyCapture({
          computedColors: [
            {
              selector: '.metric-value',
              background: 'white',
              color: 'gray',
              contrastRatio: 5.5,
            },
          ],
        }),
      ]),
    );
    expect(findings).toHaveLength(1);
    expect(findings[0]!.kind).toBe('contrast-regression');
    expect(findings[0]!.detail).toContain('< 7');
  });

  it('flags CLS over the budget', () => {
    const findings = detectDrift(inventory([emptyCapture({ cls: 0.12 })]));
    expect(findings.some((f) => f.kind === 'cls-regression')).toBe(true);
  });

  it('flags FCP regression beyond 5% of baseline', () => {
    const findings = detectDrift(
      inventory([emptyCapture({ route: '/x', fcpMs: 1100 })]),
      { fcpBaseline: { '/x': 1000 } },
    );
    expect(findings.some((f) => f.kind === 'fcp-regression')).toBe(true);
  });

  it('does not flag FCP within 5% of baseline', () => {
    const findings = detectDrift(
      inventory([emptyCapture({ route: '/x', fcpMs: 1040 })]),
      { fcpBaseline: { '/x': 1000 } },
    );
    expect(findings.filter((f) => f.kind === 'fcp-regression')).toEqual([]);
  });

  it('flags bundle size over the per-route budget', () => {
    const findings = detectDrift(
      inventory([emptyCapture({ route: '/heavy', bytesTransferred: 999_999 })]),
      {
        budget: {
          routes: { '/heavy': 100_000 },
          defaultBytes: 800_000,
          fcpRegressionRatio: 1.05,
          textContrastMin: 4.5,
          numericContrastMin: 7.0,
          illustrationMaxBytesGz: 8_192,
          clsMax: 0.05,
        },
      },
    );
    expect(findings.some((f) => f.kind === 'bundle-regression')).toBe(true);
  });

  it('surfaces off-token-color findings encoded as `off-token:` selectors', () => {
    const findings = detectDrift(
      inventory([
        emptyCapture({
          computedColors: [
            {
              selector: 'off-token: .my-button background',
              background: '#ff00ff',
              color: '#000000',
              contrastRatio: 21,
            },
          ],
        }),
      ]),
    );
    expect(findings.some((f) => f.kind === 'off-token-color')).toBe(true);
  });
});

describe('groupByKind', () => {
  it('returns an entry for every drift kind', () => {
    const finding: DriftFinding = {
      kind: 'cls-regression',
      route: '/',
      theme: 'light',
      dir: 'ltr',
      viewport: 1280,
      detail: 'x',
    };
    const grouped = groupByKind([finding]);
    expect(Object.keys(grouped)).toEqual([
      'off-token-color',
      'off-family-illustration',
      'illustration-too-large',
      'ad-hoc-shadow',
      'ad-hoc-motion-duration',
      'contrast-regression',
      'cls-regression',
      'fcp-regression',
      'bundle-regression',
    ]);
    expect(grouped['cls-regression']).toHaveLength(1);
  });
});
