/**
 * Backend unit test — deployment reliability pins (r164-l).
 *
 * DB-free source-scan pins (the ai-provider technique — the file is the
 * contract). These are the deployment's OWN invariants, so a future edit
 * that unpins or drifts them fails HERE instead of failing silently in
 * production:
 *
 *  1. render.yaml pins NODE_VERSION — and the pin equals CI's
 *     env.NODE_VERSION exactly (a pin that drifts from CI recreates the
 *     "works in CI, breaks on Render" gap the pin exists to close).
 *  2. The pinned major satisfies the repo engines range (>=20 <25) —
 *     Node 22 is the LTS line in support (Node 20 reached EOL April
 *     2026; the ci.yml header says the same).
 *  3. The documented deployment invariants stay put: healthCheckPath
 *     /api/v1/health, TZ=UTC, `npm ci --include=dev` build (Render sets
 *     NODE_ENV=production BEFORE install — without --include=dev the
 *     devDependencies needed by the build are skipped).
 *  4. The root package.json wires the post-deploy smoke script
 *     (`npm run smoke` → scripts/smoke-deploy.mjs).
 *  5. The smoke script stays dependency-free — every import must be a
 *     node: builtin (it runs in ops contexts where node_modules may be
 *     absent, like a bare checkout on a laptop).
 */
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const renderSource = readFileSync(new URL('../../../render.yaml', import.meta.url), 'utf8');
const ciSource = readFileSync(
  new URL('../../../.github/workflows/ci.yml', import.meta.url),
  'utf8',
);
const rootPackage = JSON.parse(
  readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'),
) as { engines?: { node?: string }; scripts?: Record<string, string> };
const smokeSource = readFileSync(
  new URL('../../../scripts/smoke-deploy.mjs', import.meta.url),
  'utf8',
);

// ─── NODE_VERSION pin ─────────────────────────────────────────────

describe('render.yaml NODE_VERSION pin (r164-l)', () => {
  const renderPin = renderSource.match(/key:\s*NODE_VERSION\s*\n\s*value:\s*'?(\d+)'?/);

  it('pins NODE_VERSION (docs/16 row closed in r164-l)', () => {
    expect(renderPin).not.toBeNull();
  });

  it("the pin equals CI's env.NODE_VERSION exactly — no CI/production drift", () => {
    const ciPin = ciSource.match(/NODE_VERSION:\s*'(\d+)'/);
    expect(ciPin).not.toBeNull();
    expect(renderPin?.[1]).toBe(ciPin?.[1]);
  });

  it("the pinned major sits inside the repo's engines range (>=20 <25)", () => {
    const major = Number(renderPin?.[1]);
    const engines = rootPackage.engines?.node ?? '';
    // The range is documented as '>=20 <25' — parse the two bounds rather
    // than trust a literal, so an engines bump must consciously revisit
    // this pin (and render.yaml) together.
    const min = Number(engines.match(/>=\s*(\d+)/)?.[1] ?? NaN);
    const max = Number(engines.match(/<\s*(\d+)/)?.[1] ?? NaN);
    expect(Number.isFinite(min)).toBe(true);
    expect(Number.isFinite(max)).toBe(true);
    expect(major).toBeGreaterThanOrEqual(min);
    expect(major).toBeLessThan(max);
  });
});

// ─── Documented deployment invariants (regression pins) ───────────

describe('render.yaml deployment invariants', () => {
  it('health check path stays /api/v1/health (app.ts mounts it there)', () => {
    expect(renderSource).toContain('healthCheckPath: /api/v1/health');
  });

  it('runtime clock stays pinned to UTC (attendance day-key model)', () => {
    expect(renderSource).toMatch(/key:\s*TZ\s*\n\s*value:\s*UTC/);
  });

  it('build keeps npm ci --include=dev (NODE_ENV=production is set before install)', () => {
    expect(renderSource).toContain('npm ci --include=dev');
  });
});

// ─── Post-deploy smoke script ─────────────────────────────────────

describe('smoke script wiring (r164-l)', () => {
  it("root package.json wires `npm run smoke` to scripts/smoke-deploy.mjs", () => {
    expect(rootPackage.scripts?.smoke).toBe('node scripts/smoke-deploy.mjs');
  });

  it('is dependency-free — every import is a node: builtin', () => {
    // The script must run on a bare node (ops laptop, cron box) where no
    // node_modules exist. It intentionally uses only globals (fetch,
    // AbortController, URL, process, console) — so zero imports is the
    // expected state; any import that DOES appear must be a node: builtin.
    const imports = [
      ...smokeSource.matchAll(/^\s*import\s+.*?from\s+'([^']+)'/gm),
    ]
      .map((m) => m[1])
      .filter((s): s is string => typeof s === 'string');
    for (const specifier of imports) {
      expect(specifier.startsWith('node:')).toBe(true);
    }
    // Same rule for require() — no sneaking a dependency in that way.
    const requires = [...smokeSource.matchAll(/require\(\s*['"]([^'"]+)['"]\s*\)/g)]
      .map((m) => m[1])
      .filter((s): s is string => typeof s === 'string');
    for (const specifier of requires) {
      expect(specifier.startsWith('node:')).toBe(true);
    }
  });

  it('defaults to the production origin and never embeds credentials', () => {
    expect(smokeSource).toContain('https://madarek.onrender.com');
    // Credentials arrive via SMOKE_* env vars only — no literals.
    expect(smokeSource).not.toMatch(/SMOKE_PASSWORD\s*=\s*['"][^'"]+['"]/);
    expect(smokeSource).not.toMatch(/Bearer\s+['"][A-Za-z0-9._-]{8,}['"]/);
  });
});
