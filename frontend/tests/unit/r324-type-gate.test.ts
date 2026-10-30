/**
 * r324 P3 — the type-census gate (unit seat) · EXTENDED r325 (defect Y4).
 *
 * The brief's census runs headless over every route × 3 viewports
 * (Playwright — scripts/r324/type-probe.mjs carries that evidence);
 * THIS gate pins the same contract at the CSS level so a regression
 * fails `npm test` without a browser.
 *
 * Was (r324): four public H1 seat rules pinned to a ladder token.
 * The hole Y4 exposed: the census passed while legal section bars read
 * 47.6px @390 at weight 700, page headers grew to 55.6px @390, and
 * mono labels sat at 8.3–10px — because only H1s on a public subset
 * were asserted and the unclamped --fs-h1/h2 rem aliases (which GROW
 * on the fluid root below 1440) passed as "same rungs" at desktop.
 *
 * NOW (the Y4 extension — every heading level, every seat, every band):
 *   1. EVERY h1–h4 element rule + EVERY classed heading seat rule in
 *      src/styles (the probe's HEADING_SEATS list) is swept;
 *   2. font-weight resolves ≤ 600 at every band (§R324: 500/600 ONLY —
 *      numerals inside gauges are the one exception, allowlisted);
 *   3. font-size RESOLVES within 1.3× of a sanctioned rung at 1440,
 *      768 AND 390 (the fluid-root growth the unclamped aliases caused
 *      is exactly what "same rung at desktop" hid);
 *   4. every H1 seat resolves ≤ 32px at 390 — the enabler of the
 *      «H1 ≤ 3 lines at 390» contract (the probe measures the lines
 *      live; this pins the size ceiling that makes 3 lines possible);
 *   5. the mono micro-label rungs (--fs-mono-*) resolve ≥ 11px at all
 *      three bands (the app-density mono rung 11–12).
 *
 * The `type-gate: allow` marker stays the reviewed-literal escape hatch
 * (established r321): a literal may pass ONLY with the marker + reason.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const STYLES = path.join(HERE, '..', '..', 'src', 'styles');
const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/* ── the ONE ladder (§R324) ────────────────────────────────────────── */

/** The fluid rem root (tokens.css §R313 — measured on the reference). */
const ROOT_PX: Record<number, number> = { 1440: 8.3333, 768: 9.209, 390: 9.924 };
const BANDS = [1440, 768, 390] as const;

/** App-density rungs (static px): H1 28/24 · H2 20 · H3 16 · body-lg 15. */
const APP_RUNGS = [28, 24, 20, 16, 15];
const TOL = 1.3;
const MONO_FLOOR = 11;
/** The H1 ≤ 3 lines @390 enabler: no H1 seat may resolve above this. */
const H1_CEILING_AT_390 = 32;

/* ── token resolution (the clamp/max/var grammar of tokens.css) ────── */

/** Collect the custom-property declarations of a stylesheet (+ @media
 *  blocks — band-conditional re-pins are part of the ladder). */
function collectVars(src: string, prefix = ''): Map<string, string> {
  const vars = new Map<string, string>();
  const re = /--([\w-]+)\s*:\s*([^;{}]+);/g;
  for (const m of src.matchAll(re)) vars.set(prefix + '--' + m[1]!, m[2]!.trim());
  return vars;
}

const tokenSrc = strip(readFileSync(path.join(STYLES, 'tokens.css'), 'utf8'));
const paritySrc = strip(readFileSync(path.join(STYLES, 'unified-parity.css'), 'utf8'));
const TOKENS = new Map([...collectVars(paritySrc), ...collectVars(tokenSrc)]);

/** Resolve a font-size expression to px at a band. Supports: Npx, Nrem,
 *  Nvw, var(--x), max(a,b), clamp(a,b,c) — the grammar the ladder uses. */
function resolveFs(expr: string, band: number, depth = 0): number | null {
  if (depth > 8) return null;
  const root = ROOT_PX[band]!;
  let e = expr.trim().replace(/!important$/, '').trim();
  const varRef = e.match(/^var\(\s*(--[\w-]+)\s*(?:,\s*([^)]+))?\)$/);
  if (varRef) {
    const val = TOKENS.get(varRef[1]!);
    if (val === undefined) {
      if (varRef[2] !== undefined) return resolveFs(varRef[2], band, depth + 1);
      return null;
    }
    return resolveFs(val, band, depth + 1);
  }
  const px = e.match(/^(-?[\d.]+)px$/);
  if (px) return parseFloat(px[1]!);
  const rem = e.match(/^(-?[\d.]+)rem$/);
  if (rem) return parseFloat(rem[1]!) * root;
  const vw = e.match(/^(-?[\d.]+)vw$/);
  if (vw) return (parseFloat(vw[1]!) * band) / 100;
  const max = e.match(/^max\(([^,]+),\s*([^)]+)\)$/);
  if (max) {
    const a = resolveFs(max[1]!, band, depth + 1);
    const b = resolveFs(max[2]!, band, depth + 1);
    return a !== null && b !== null ? Math.max(a, b) : null;
  }
  const clamp = e.match(/^clamp\(([^,]+),\s*([^,]+),\s*([^)]+)\)$/);
  if (clamp) {
    const lo = resolveFs(clamp[1]!, band, depth + 1);
    const mid = resolveFs(clamp[2]!, band, depth + 1);
    const hi = resolveFs(clamp[3]!, band, depth + 1);
    if (lo === null || mid === null || hi === null) return null;
    return Math.min(hi, Math.max(lo, mid));
  }
  const calc = e.match(/^calc\((.+)\)$/);
  if (calc) {
    // only the sum grammar the ladder actually uses: "a + b" / "2 * a"
    const inner = calc[1]!.replace(/\s/g, '');
    const parts = inner.split('+').map((p) => resolveFs(p, band, depth + 1));
    return parts.every((p) => p !== null) ? (parts as number[]).reduce((s, v) => s + v, 0) : null;
  }
  return null;
}

/** The sanctioned rungs AT a band: the display rungs resolved live
 *  (exactly like the probe's probe-element measurement) + the static
 *  app-density rungs. */
function rungsAt(band: number): number[] {
  const resolved = ['--fs-d1', '--fs-d2', '--fs-d3', '--fs-st']
    .map((t) => resolveFs(`var(${t})`, band))
    .filter((v): v is number => v !== null);
  return [...resolved, ...APP_RUNGS];
}
const fsOk = (fs: number, band: number) =>
  rungsAt(band).some((r) => fs >= r / TOL && fs <= r * TOL);

/* ── the weight law ────────────────────────────────────────────────── */

const FW_TOKENS: Record<string, number> = {
  '--fw-regular': 400, '--fw-medium': 500, '--fw-semibold': 600,
  '--fw-bold': 700, '--fw-black': 700,
};
function resolveFw(expr: string, depth = 0): number | null {
  if (depth > 8) return null;
  const varRef = expr.trim().match(/^var\(\s*(--[\w-]+)\s*\)$/);
  if (varRef) {
    const key = varRef[1]!;
    const fw = FW_TOKENS[key];
    if (fw !== undefined) return fw;
    const next = TOKENS.get(key); // type roles re-key onto the fw tokens
    return next ? resolveFw(next, depth + 1) : null;
  }
  const n = expr.trim().match(/^(\d+)$/);
  return n ? Number(n[1]!) : null;
}

/* ── the sweep: every heading rule in every stylesheet ─────────────── */

/** The classed heading seats (mirrors scripts/r324/type-probe.mjs's
 *  HEADING_SEATS — the census's subject, pinned here at the CSS level). */
const HEADING_SEATS = [
  'pf-page-title', 'page-title', 'lg-title', 'lg-bar', 'lg-faq-q', 'cu-title',
  'nf-title', 'auth-form-title', 'card-title', 'vision-h2', 'vision-hero-title',
  'r319s-bar-title', 'lecture-meta-title', 'r321x-cover-title', 'oex-result-title',
  'hr-section-head', 'pf-section-title', 'college-city-name', 'college-hero-name',
  'comp-hero-title', 'guest-cta-title', 'vc-title', 'onboarding-flow-headline',
  'cal-month', 'teacher-name', 'doc-reader-title', 'r305s-kicker-title',
  'r305rp-kicker-title', 'r305rp-rev-masthead-title', 'tpg-queue-title',
  'modal-title', 'state-title', 'owner-confirm-title',
  // the r325 Y4 finds (element-level h2s / display lines the first sweep
  // missed — TodayList panels, the labs hero, the dash deep band, the
  // retired dash section voice):
  'pf-today-title', 'lab-hero-title', 'dash-section-title', 'dash-resume-course-name',
  // the r325 Y4 weight-law finds (div/h3-rendered section/panel/card
  // titles that rode 700 outside every h* sweep):
  'section-title', 'notif-panel-title', 'search-empty-title', 'cert-title',
  'momentum-title', 'lecture-panel-title', 'lib-cover-title',
];

/** H1 seats (the ≤ 3 lines @390 contract). */
const H1_SEATS = ['pf-page-title', 'page-title', 'lg-title', 'cu-title', 'nf-title', 'auth-form-title'];

/** Numerals inside gauges — the ONE weight-law exception (§R324).
 *  Everything else at 700 fails the gate. */
const NUMERAL_SEATS = ['stat-value', 'admin-stat-value', 'metric', 'kpi-value', 'res-step-num', 'gap-pct', 'scan-value', 'metric-value'];

interface HeadingRule { file: string; sel: string; body: string; }

function cssFiles(): string[] {
  const all = readdirSync(STYLES).filter((f) => f.endsWith('.css')).sort();
  // unified-parity + shared-design-system re-declare the token layer but
  // no page headings of their own beyond the mirrors — still swept.
  return all.map((f) => path.join(STYLES, f));
}

/** A rule with its cascade context: the @media condition it sits in
 *  (null = unconditional) — the phone-band overrides ARE part of the
 *  ladder (r321's 3.2rem @767 seat) and the gate must read them. */
interface CssRule { media: string | null; sel: string; body: string; order: number; }

function walkRules(src: string, media: string | null, out: CssRule[], counter: { n: number }): void {
  // ONE sequential pass — @media/@layer spans recurse in DOCUMENT ORDER
  // (the file order IS the cascade order the band-winner reads).
  let s = src;
  for (;;) {
    const at = /@(media|layer)([^{]*)\{/.exec(s);
    const rule = /(?<=[\{\};]|^)\s*([^\{\}@]+?)\s*\{/.exec(s);
    if (at && (!rule || at.index <= rule.index)) {
      let depth = 1;
      let i = at.index + at[0].length;
      while (depth > 0 && i < s.length) {
        if (s[i] === '{') depth++;
        else if (s[i] === '}') depth--;
        i++;
      }
      walkRules(s.slice(at.index + at[0].length, i - 1), at[1] === 'media' ? at[2]!.trim() : media, out, counter);
      s = s.slice(i);
    } else if (rule) {
      const open = rule.index + rule[0].length - 1;
      const close = s.indexOf('}', open);
      if (close === -1) break; // truncated fragment — nothing more to read
      out.push({ media, sel: rule[1]!.trim().replace(/\s+/g, ' '), body: s.slice(open + 1, close), order: counter.n++ });
      s = s.slice(close + 1);
    } else break;
  }
}

/** Does an @media prelude apply at a band? (max-width/min-width only —
 *  the grammar the sheets use). */
function mediaApplies(media: string | null, band: number): boolean {
  if (!media) return true;
  const max = media.match(/max-width\s*:\s*([\d.]+)px/);
  if (max) return band <= parseFloat(max[1]!);
  const min = media.match(/min-width\s*:\s*([\d.]+)px/);
  if (min) return band >= parseFloat(min[1]!);
  return true; // unknown conditions apply (never hide a rule from the gate)
}

function isHeadingSelector(sel: string): boolean {
  if (/(^|[\s,+>~(])h[1-4]([\s,.:#\[{)]|$)/.test(sel)) return true;
  return HEADING_SEATS.some((seat) => new RegExp(`\\.${seat}([\\s,.:#\\[{)]|$)`).test(sel));
}

function gather(): (HeadingRule & { media: string | null; order: number })[] {
  const rules: (HeadingRule & { media: string | null; order: number })[] = [];
  const counter = { n: 0 };
  for (const file of cssFiles()) {
    const src = strip(readFileSync(file, 'utf8'));
    const walked: CssRule[] = [];
    walkRules(src, null, walked, counter);
    for (const { media, sel, body, order } of walked) {
      if (!isHeadingSelector(sel)) continue;
      if (!/font-(size|weight)\s*:/.test(body)) continue;
      rules.push({ file: path.basename(file), sel, body, media, order });
    }
  }
  return rules;
}

const RULES = gather();
const hasAllow = (body: string) => /type-gate:\s*allow/.test(body);
const isNumeralSeat = (sel: string) => NUMERAL_SEATS.some((s) => sel.includes(s));

/* ── 1+2 · every heading rule: weight ≤ 600, fs on a rung × 3 bands ── */

describe('r325 Y4 — the type census gate (every heading level × every seat × every band)', () => {
  it('the sweep actually reaches the fleet (no silent empty sweep)', () => {
    expect(RULES.length).toBeGreaterThanOrEqual(50);
    const files = new Set(RULES.map((r) => r.file));
    for (const f of ['legal.css', 'base.css', 'components.css', 'patterns.css', 'colleges.css', 'r319-student.css']) {
      expect(files.has(f), `the sweep covers ${f}`).toBe(true);
    }
  });

  for (const { file, sel, body } of RULES) {
    const where = `${file} :: ${sel.replace(/\s+/g, ' ').slice(0, 72)}`;

    if (/font-weight\s*:/.test(body)) {
      it(`weight ≤ 600 — ${where}`, () => {
        if (isNumeralSeat(sel)) return; // gauge numerals — the one exception
        const raw = (body.match(/font-weight\s*:\s*([^;]+);/) ?? [])[1] ?? '';
        const fw = resolveFw(raw);
        // Unresolvable non-allowlisted expressions fail loudly (honest gate).
        expect(fw, `font-weight "${raw.trim()}" must be a weight literal or --fw-* token${hasAllow(body) ? ' (type-gate: allow — reviewed)' : ''}`).not.toBeNull();
        if (hasAllow(body)) {
          expect(fw ?? 0, 'allow-marked literals stay ≤ 600 too unless the marker documents otherwise').toBeLessThanOrEqual(600);
          return;
        }
        expect(fw as number, `§R324 — weights 500/600 ONLY, found ${raw.trim()}`).toBeLessThanOrEqual(600);
      });
    }

  }

  // font-size rides a rung ×3 bands — evaluated per (file × selector)
  // group with the @media overrides applied (the winner at each band),
  // exactly the cascade the browser runs.
  const groups = new Map<string, typeof RULES>();
  for (const r of RULES) {
    const key = `${r.file} :: ${r.sel}`;
    if (!/font-size\s*:/.test(r.body)) continue;
    if (!groups.has(key)) groups.set(key, [] as unknown as typeof RULES);
    (groups.get(key) as unknown as typeof RULES).push(r);
  }
  for (const [key, grp] of groups) {
    it(`font-size rides a rung ×3 bands — ${key.slice(0, 84)}`, () => {
      for (const band of BANDS) {
        const applicable = grp.filter((r) => mediaApplies(r.media, band));
        expect(applicable.length, `some font-size rule for ${key} applies at @${band}`).toBeGreaterThan(0);
        const winner = applicable[applicable.length - 1]!; // last in file order
        const raw = ((winner.body.match(/font-size\s*:\s*([^;]+);/) ?? [])[1] ?? '').trim();
        if (hasAllow(winner.body)) continue; // reviewed literal (documented in the rule)
        const px = resolveFs(raw, band);
        expect(px, `"${raw}" resolves at @${band} (root ${ROOT_PX[band]}px)`).not.toBeNull();
        expect(
          fsOk(px as number, band),
          `@${band}: ${raw} → ${(px as number).toFixed(1)}px is off every rung (${rungsAt(band).map((r) => r.toFixed(1)).join('/')}px ±1.3×)`,
        ).toBe(true);
      }
    });
  }

  /* ── 3 · the H1 ≤ 3 lines @390 enabler ─────────────────────────── */
  describe('the H1 ≤ 3 lines at 390 contract (the probe measures lines; this pins the size ceiling)', () => {
    for (const seat of H1_SEATS) {
      it(`H1 seat .${seat} resolves ≤ ${H1_CEILING_AT_390}px at 390`, () => {
        const seatRe = new RegExp(`\\.${seat}([\\s,.:#\\[{)]|$)`);
        const rules = RULES.filter((r) => seatRe.test(r.sel) && /font-size\s*:/.test(r.body));
        expect(rules.length, `.${seat} declares font-size somewhere`).toBeGreaterThan(0);
        // the winner at 390 per (file × selector) group — the cascade's
        // last media-applicable font-size rule (phone overrides win)
        const groups = new Map<string, typeof rules>();
        for (const r of rules) {
          const key = `${r.file} :: ${r.sel}`;
          if (!groups.has(key)) groups.set(key, [] as unknown as typeof rules);
          (groups.get(key) as unknown as typeof rules).push(r);
        }
        for (const [key, grp] of groups) {
          const applicable = grp.filter((r) => mediaApplies(r.media, 390));
          expect(applicable.length, `${key} applies at 390`).toBeGreaterThan(0);
          const winner = applicable[applicable.length - 1]!;
          const raw = ((winner.body.match(/font-size\s*:\s*([^;]+);/) ?? [])[1] ?? '').trim();
          const px = resolveFs(raw, 390);
          expect(px, `${key} font-size "${raw.trim()}" resolves at 390`).not.toBeNull();
          expect(px as number, `${key} must hold the 3-line ceiling at 390 (was the 55.6px alias blowup)`).toBeLessThanOrEqual(H1_CEILING_AT_390);
        }
      });
    }

    it('the d1 clamp still floors at 31.74px @390 (the ladder contract)', () => {
      const m = tokenSrc.match(/--fs-d1:\s*clamp\(([^)]+)\)/);
      expect(m).toBeTruthy();
      expect(m![1]).toContain('31.74px');
      expect(m![1]).toContain('5.6rem');
    });
  });

  /* ── 4 · the mono micro-label rung (≥ 11px) ────────────────────── */
  describe('the mono micro-label rung — ≥ 11px at every band (§R324 app density)', () => {
    for (const t of ['--fs-mono-md', '--fs-mono-sm', '--fs-mono-xs']) {
      it(`${t} resolves ≥ ${MONO_FLOOR}px at 1440/768/390`, () => {
        for (const src of [tokenSrc, paritySrc]) {
          const m = src.match(new RegExp(`${t}:\\s*([^;]+);`));
          expect(m, `${t} exists`).toBeTruthy();
          for (const band of BANDS) {
            const px = resolveFs(m![1]!, band);
            expect(px, `${t} resolves at @${band}`).not.toBeNull();
            expect(px as number, `${t} @${band} = ${(px as number).toFixed(1)}px must be ≥ ${MONO_FLOOR}px (the mono rung)`).toBeGreaterThanOrEqual(MONO_FLOOR);
          }
        }
      });
    }
  });

  /* ── 5 · the census harness coverage (routes × levels) ─────────── */
  describe('the headless census harness stays whole (the evidence producer)', () => {
    const probeSrc = readFileSync(path.join(HERE, '..', '..', '..', 'scripts', 'r324', 'type-probe.mjs'), 'utf8');

    it('the probe sweeps every role: public + student + teacher + admin + quality + owner', () => {
      for (const seg of ['/student/', '/teacher/', '/admin/', '/quality/', '/owner/']) {
        expect(probeSrc.includes(seg), `the probe route table reaches ${seg} routes`).toBe(true);
      }
      for (const pub of ['/legal/privacy', '/help', '/auth', '/404', '/colleges']) {
        expect(probeSrc.includes(pub), `the probe route table reaches ${pub}`).toBe(true);
      }
    });

    it('the probe asserts the four hard laws (weight, rung tolerance, H1 lines, mono floor)', () => {
      expect(probeSrc).toContain('> 600');
      expect(probeSrc).toContain('1.3');
      expect(probeSrc).toContain('lines > 3');
      expect(probeSrc).toContain('MONO_FLOOR');
    });

    it('the probe seat list and this gate agree (no seat sweeps one gate misses)', () => {
      const m = probeSrc.match(/HEADING_SEATS = '([^']+)'/);
      expect(m, 'probe HEADING_SEATS exists').toBeTruthy();
      const probeSeats = (m![1] ?? '').split(',').map((s) => s.trim().replace(/^\./, '').split(' ')[0] ?? '').filter(Boolean);
      for (const seat of probeSeats) {
        expect(HEADING_SEATS, `seat "${seat}" is pinned by the unit gate too`).toContain(seat);
      }
      expect(probeSeats.length).toBeGreaterThanOrEqual(30);
    });
  });
});
