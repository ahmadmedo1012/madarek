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
    // Use the LIGHT/LTR/1280 entry as the canonical FCP per route.
    if (cap.theme === 'light' && cap.dir === 'ltr' && cap.viewport === 1280) {
      map[cap.route] = cap.fcpMs;
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

  const findings = detectDrift(inventory, { fcpBaseline });
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
