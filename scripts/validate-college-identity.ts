#!/usr/bin/env tsx
/**
 * validate-college-identity.ts
 *
 * Cross-references frontend/src/data/colleges.config.ts entries against:
 *  - canonical college slugs
 *  - asset existence on disk (hero image, motif)
 *  - lucide-react icon validity
 *  - WCAG AA contrast against the platform surface
 *
 * Skeleton (Phase 1). Full implementation lands in Phase 8 (T065).
 * Until profiles exist, exits 0 with "no profiles yet".
 */
import { resolve } from 'node:path';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const REPO_ROOT = resolve(__dirname, '..');
const CONFIG = resolve(REPO_ROOT, 'frontend/src/data/colleges.config.ts');

async function main(): Promise<number> {
  if (!existsSync(CONFIG)) {
    console.error(`[validate:colleges] missing config at ${CONFIG}`);
    return 1;
  }

  // Phase 1 skeleton: presence-only. Phase 8 swaps to full validation.
  // We import via a dynamic URL so the script works whether invoked via
  // tsx (TypeScript) or compiled output.
  let module: { colleges: unknown[] };
  try {
    module = (await import(pathToFileURL(CONFIG).href)) as { colleges: unknown[] };
  } catch (err) {
    console.error('[validate:colleges] failed to load config:', err);
    return 1;
  }

  const colleges = Array.isArray(module.colleges) ? module.colleges : [];
  if (colleges.length === 0) {
    console.log('[validate:colleges] no profiles yet — skeleton check passed.');
    return 0;
  }

  // Phase 8 will replace this branch with the full validator.
  console.log(`[validate:colleges] ${colleges.length} profile(s) found — full validation pending Phase 8.`);
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error('[validate:colleges] uncaught:', err);
    process.exit(1);
  },
);
