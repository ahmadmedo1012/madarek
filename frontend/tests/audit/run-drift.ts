/**
 * run-drift — CLI entry that loads the most-recent surface inventory
 * and the committed baseline, then runs the pure drift detector.
 *
 * Exit codes:
 *   0 — no drift, CI passes
 *   1 — drift found, CI fails (full report printed to stdout)
 *   2 — inventory file missing or unreadable (run test:audit first)
 *
 * Usage (from frontend/):
 *   npm run test:audit:drift
 *
 * Per specs/012-design-graphics-uplift/contracts/audit-script.md.
 */
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { detectDrift, groupByKind, type DriftFinding } from './drift';
import { DEFAULT_BUDGET } from './inventory-types';
import type { SurfaceInventory } from './inventory-types';

const here = fileURLToPath(new URL('.', import.meta.url));
const inventoryPath = resolve(here, 'surface-inventory.json');
const baselinePath = resolve(here, 'surface-baseline.json');

function readInventory(path: string): SurfaceInventory | null {
  if (!existsSync(path)) return null;
  try {
    const text = readFileSync(path, 'utf8');
    const json = JSON.parse(text) as SurfaceInventory;
    if (!Array.isArray(json.captures)) return null;
    return json;
  } catch {
    return null;
  }
}

function buildFcpBaseline(baseline: SurfaceInventory | null): Record<string, number> {
  if (!baseline) return {};
  const map: Record<string, number> = {};
  for (const cap of baseline.captures) {
    // Use the LIGHT/RTL/1280 entry as the canonical FCP per route —
    // the app is RTL-only, so DIRS sweeps a single 'rtl' direction.
    if (cap.theme === 'light' && cap.dir === 'rtl' && cap.viewport === 1280) {
      map[cap.route] = cap.fcpMs;
    }
  }
  return map;
}

/**
 * r291 (§10 repair): route → matched color-sample count, taken from the
 * same canonical LIGHT/RTL/1280 entry. The drift detector uses it as a
 * per-route coverage floor — a new capture that matches fewer samples
 * than its baseline had flags coverage-regression instead of passing
 * vacuously over an empty array. Captures WITHOUT colorProbe (a
 * pre-r291 baseline) are exempt inside drift.ts, so the committed
 * r286 baseline — with its 48 empty captures — contributes a floor of
 * 0 and the absolute floor (body + h1) governs until the next
 * baseline promotion re-captures with the probe.
 */
function buildColorCoverageBaseline(
  baseline: SurfaceInventory | null,
): Record<string, number> {
  if (!baseline) return {};
  const map: Record<string, number> = {};
  for (const cap of baseline.captures) {
    if (cap.theme === 'light' && cap.dir === 'rtl' && cap.viewport === 1280) {
      map[cap.route] = cap.colorProbe ? cap.colorProbe.matched.length : 0;
    }
  }
  return map;
}

function groupRoute(findings: DriftFinding[]): Record<string, DriftFinding[]> {
  const out: Record<string, DriftFinding[]> = {};
  for (const f of findings) {
    out[f.route] = out[f.route] ?? [];
    out[f.route]!.push(f);
  }
  return out;
}

function main(): number {
  const inventory = readInventory(inventoryPath);
  if (!inventory) {
    console.error(`✗ inventory not found at ${inventoryPath}`);
    console.error('  Run: npm run test:audit');
    return 2;
  }
  const baseline = readInventory(baselinePath);
  const fcpBaseline = buildFcpBaseline(baseline);
  const colorCoverageBaseline = buildColorCoverageBaseline(baseline);

  /* r164 integration: FCP is the one budget axis that is inherently
   * hardware-dependent — a baseline captured on one machine cannot
   * gate a 5% ratio on a different CI runner. AUDIT_FCP_RATIO lets CI
   * run with explicit, documented headroom (deterministic findings —
   * colors, motion, contrast, CLS, bytes, illustrations — stay at the
   * strict defaults everywhere). */
  const budget = { ...DEFAULT_BUDGET };
  if (process.env.AUDIT_FCP_RATIO) {
    const ratio = Number.parseFloat(process.env.AUDIT_FCP_RATIO);
    if (Number.isFinite(ratio) && ratio >= 1) budget.fcpRegressionRatio = ratio;
  }

  const findings = detectDrift(inventory, { fcpBaseline, colorCoverageBaseline, budget });
  if (findings.length === 0) {
    console.log(
      `✓ surface drift: clean across ${inventory.captures.length} captures`,
    );
    return 0;
  }

  const grouped = groupByKind(findings);
  console.error(`✗ surface drift detected — ${findings.length} findings\n`);
  for (const [kind, fs] of Object.entries(grouped)) {
    if (fs.length === 0) continue;
    console.error(`  ${kind} × ${fs.length}`);
    for (const f of fs.slice(0, 5)) {
      console.error(`    [${f.route} | ${f.theme} | ${f.dir} | ${f.viewport}] ${f.detail}`);
    }
    if (fs.length > 5) console.error(`    … and ${fs.length - 5} more`);
  }

  console.error('\n  By route:');
  const byRoute = groupRoute(findings);
  for (const [route, fs] of Object.entries(byRoute)) {
    console.error(`    ${route} — ${fs.length}`);
  }
  return 1;
}

process.exit(main());
