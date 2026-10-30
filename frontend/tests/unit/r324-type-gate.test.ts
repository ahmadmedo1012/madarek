/**
 * r324 P3 — the type-census gate (unit seat).
 *
 * The brief's census runs headless over every route × 3 viewports
 * (Playwright — scripts/r324/type-probe.mjs carries that evidence);
 * THIS gate pins the same contract at the CSS level so a regression
 * fails `npm test` without a browser: every H1/H2/H3 display rule in
 * the public sheets must ride the ONE ladder (fs-d1/fs-d2/fs-d3/fs-st
 * or their --fs-h1/h2/h3 aliases) at weight ≤ 600 — never the
 * display-md/lg bolt-ons or --fw-bold that made /404 read 63.5px at
 * 390 (X9).
 *
 * Scope = the sheet stylesheets that own public H1s:
 *   auth.css (.nf-title, .auth-form-title) · legal.css (.lg-title) ·
 *   campus.css (.cu-title). App-density headers (the dashboards'
 *   28/24/16px ladder) live in the r319-student masthead and are
 *   pinned by PageHeader's tests — noted, not re-swept here.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/** The display-ladder tokens (the ONLY allowed H1/H2/H3 font sizes). */
const LADDER_TOKENS = [
  '--fs-d1', '--fs-d2', '--fs-d3', '--fs-st',
  '--fs-h1', '--fs-h2', '--fs-h3', // the Heron aliases (same rungs)
  '--type-display-size-md', '--type-headline-size-lg', '--type-headline-size-md', '--type-headline-size-sm',
];

describe('r324 P3 — the ONE display ladder on public H1s (X9)', () => {
  const cases = [
    { file: 'src/styles/auth.css', sel: '.nf-title', kind: 'h1 (error sheets)' },
    { file: 'src/styles/auth.css', sel: '.auth-form-title', kind: 'h1 (auth doors)' },
    { file: 'src/styles/legal.css', sel: '.lg-title', kind: 'h1 (the nine public sheets)' },
    { file: 'src/styles/campus.css', sel: '.cu-title', kind: 'h1 (colleges/capabilities)' },
  ];

  for (const { file, sel, kind } of cases) {
    it(`${sel} (${kind}) rides the ladder at weight ≤ 600`, () => {
      const src = strip(readFileSync(path.join(HERE, '..', '..', file), 'utf8'));
      const rule = src.match(new RegExp(`${sel.replace(/\./g, '\\.')}\\s*\\{[^}]*\\}`, 'm'));
      expect(rule, `${sel} rule exists in ${file}`).toBeTruthy();
      const body = rule![0];
      const fsLine = body.match(/font-size:\s*([^;]+);/);
      expect(fsLine, `${sel} declares font-size`).toBeTruthy();
      const value = fsLine![1] ?? '';
      expect(
        LADDER_TOKENS.some((t: string) => value.includes(t)),
        `${sel} font-size must be a ladder token — found "${value}"`,
      ).toBe(true);
      const fwLine = body.match(/font-weight:\s*([^;]+);/);
      expect(fwLine, `${sel} declares font-weight`).toBeTruthy();
      const fw = fwLine![1] ?? '';
      expect(
        /var\(--fw-semibold\)|var\(--fw-medium\)|\b500\b|\b600\b/.test(fw),
        `${sel} font-weight must be 500/600 (or the token) — found "${fw}"`,
      ).toBe(true);
    });
  }

  it('the token sheet still defines the d-ladder (the rungs the sheets ride)', () => {
    const tokens = strip(readFileSync(path.join(HERE, '..', '..', 'src/styles/tokens.css'), 'utf8'));
    for (const t of ['--fs-d1', '--fs-d2', '--fs-d3']) {
      expect(tokens.includes(`${t}:`), `${t} exists`).toBe(true);
    }
  });

  it('the phone floors hold: d1 clamps to 31.74px at 390 (the ladder contract)', () => {
    const tokens = strip(readFileSync(path.join(HERE, '..', '..', 'src/styles/tokens.css'), 'utf8'));
    const m = tokens.match(/--fs-d1:\s*clamp\(([^)]+)\)/);
    expect(m).toBeTruthy();
    expect(m![1]).toContain('31.74px'); // the @390 floor
    expect(m![1]).toContain('5.6rem'); // the @1440 cap (46.67px)
  });
});
