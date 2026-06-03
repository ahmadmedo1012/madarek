/**
 * Surface drift detector — pure function over a SurfaceInventory.
 *
 * Per specs/012-design-graphics-uplift/contracts/audit-script.md
 * §"Drift detection rules". Given a fresh inventory + a baseline +
 * a budget table, returns the set of drift findings. CI consumes
 * this and fails when the array is non-empty.
 *
 * The logic is deliberately split out as a pure function so unit
 * tests can drive it without spinning up Playwright. The Playwright
 * harness in surface-inventory.spec.ts produces the inventory; the
 * harness in surface-drift.spec.ts loads the inventory and the
 * baseline and runs `detectDrift` against them.
 */
import type {
  BudgetTable,
  SurfaceCapture,
  SurfaceInventory,
} from './inventory-types';
import {
  KNOWN_ELEV_MARKERS,
  KNOWN_DURATIONS_MS,
  DEFAULT_BUDGET,
} from './inventory-types';

export type DriftKind =
  | 'off-token-color'
  | 'off-family-illustration'
  | 'illustration-too-large'
  | 'ad-hoc-shadow'
  | 'ad-hoc-motion-duration'
  | 'contrast-regression'
  | 'cls-regression'
  | 'fcp-regression'
  | 'bundle-regression';

export interface DriftFinding {
  kind: DriftKind;
  route: string;
  theme: SurfaceCapture['theme'];
  dir: SurfaceCapture['dir'];
  viewport: SurfaceCapture['viewport'];
  detail: string;
}

export interface DetectDriftOpts {
  /** Budget table; defaults to DEFAULT_BUDGET. */
  budget?: BudgetTable;
  /** Map of route → baseline FCP. Optional; FCP-regression only fires when present. */
  fcpBaseline?: Record<string, number>;
}

const elevTokenIsKnown = (value: string): boolean =>
  KNOWN_ELEV_MARKERS.some((marker) => value.includes(marker));

const durationIsKnown = (ms: number): boolean =>
  KNOWN_DURATIONS_MS.includes(ms);

/**
 * Pure: returns the array of drift findings discovered in the
 * supplied inventory. Empty array means CI passes.
 */
export function detectDrift(
  inventory: SurfaceInventory,
  opts: DetectDriftOpts = {},
): DriftFinding[] {
  const budget = opts.budget ?? DEFAULT_BUDGET;
  const baseline = opts.fcpBaseline ?? {};
  const findings: DriftFinding[] = [];

  for (const cap of inventory.captures) {
    const ctx = {
      route: cap.route,
      theme: cap.theme,
      dir: cap.dir,
      viewport: cap.viewport,
    };

    // 1. off-family illustration
    for (const ill of cap.illustrations) {
      if (ill.name === '<unknown>') {
        findings.push({
          kind: 'off-family-illustration',
          ...ctx,
          detail: `unregistered illustration on ${cap.route}`,
        });
      }
      // 3. illustration size cap
      if (ill.sizeBytesGz > budget.illustrationMaxBytesGz) {
        findings.push({
          kind: 'illustration-too-large',
          ...ctx,
          detail: `${ill.name}: ${ill.sizeBytesGz}B > ${budget.illustrationMaxBytesGz}B`,
        });
      }
    }

    // 4. ad-hoc shadow on overlays
    for (const ov of cap.overlays) {
      if (!elevTokenIsKnown(ov.elevToken)) {
        findings.push({
          kind: 'ad-hoc-shadow',
          ...ctx,
          detail: `${ov.type} uses unknown elevation: ${ov.elevToken}`,
        });
      }
    }

    // 5. ad-hoc motion duration
    for (const m of cap.motionTreatments) {
      if (!durationIsKnown(m.durationMs)) {
        findings.push({
          kind: 'ad-hoc-motion-duration',
          ...ctx,
          detail: `${m.selector}: ${m.durationMs}ms`,
        });
      }
    }

    // 6. contrast regression — body text + numeric KPIs
    for (const c of cap.computedColors) {
      const isNumeric = /\bmetric-value|\bkpi-value|\bnumeric\b/.test(c.selector);
      const min = isNumeric ? budget.numericContrastMin : budget.textContrastMin;
      if (c.contrastRatio < min) {
        findings.push({
          kind: 'contrast-regression',
          ...ctx,
          detail: `${c.selector}: ${c.contrastRatio.toFixed(2)} < ${min}`,
        });
      }
    }

    // 7. CLS regression
    if (cap.cls > budget.clsMax) {
      findings.push({
        kind: 'cls-regression',
        ...ctx,
        detail: `CLS ${cap.cls.toFixed(3)} > ${budget.clsMax}`,
      });
    }

    // 8. FCP regression vs baseline
    const baselineFcp = baseline[cap.route];
    if (baselineFcp !== undefined) {
      const ratio = cap.fcpMs / baselineFcp;
      if (ratio > budget.fcpRegressionRatio) {
        findings.push({
          kind: 'fcp-regression',
          ...ctx,
          detail: `FCP ${cap.fcpMs}ms vs baseline ${baselineFcp}ms (${(ratio * 100 - 100).toFixed(1)}% over)`,
        });
      }
    }

    // 9. bundle regression
    const bytesBudget = budget.routes[cap.route] ?? budget.defaultBytes;
    if (cap.bytesTransferred > bytesBudget) {
      findings.push({
        kind: 'bundle-regression',
        ...ctx,
        detail: `${cap.bytesTransferred}B transferred > ${bytesBudget}B budget`,
      });
    }

    // (off-token-color is detected by the harness when sampling
    //  computed colors against the known token palette; the harness
    //  marks any non-token-derived hex as a sentinel selector
    //  beginning with 'off-token:' which we surface verbatim.)
    for (const c of cap.computedColors) {
      if (c.selector.startsWith('off-token:')) {
        findings.push({
          kind: 'off-token-color',
          ...ctx,
          detail: c.selector,
        });
      }
    }
  }

  return findings;
}

/** Group findings by kind for report-style output. */
export function groupByKind(findings: DriftFinding[]): Record<DriftKind, DriftFinding[]> {
  const init: Record<DriftKind, DriftFinding[]> = {
    'off-token-color': [],
    'off-family-illustration': [],
    'illustration-too-large': [],
    'ad-hoc-shadow': [],
    'ad-hoc-motion-duration': [],
    'contrast-regression': [],
    'cls-regression': [],
    'fcp-regression': [],
    'bundle-regression': [],
  };
  for (const f of findings) init[f.kind].push(f);
  return init;
}
