/**
 * promote-baseline — replaces the committed baseline with the
 * most-recent inventory. Run only when intentionally accepting
 * a design change (and through code review).
 *
 * Usage (from frontend/):
 *   npm run audit:baseline
 *
 * Exit codes:
 *   0 — baseline updated
 *   2 — inventory missing (run test:audit first)
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const inventoryPath = resolve(here, 'surface-inventory.json');
const baselinePath = resolve(here, 'surface-baseline.json');

if (!existsSync(inventoryPath)) {
  console.error(`✗ inventory not found at ${inventoryPath}`);
  console.error('  Run: npm run test:audit');
  process.exit(2);
}

const text = readFileSync(inventoryPath, 'utf8');
writeFileSync(baselinePath, text);
console.log(`✓ baseline updated from ${inventoryPath}`);
