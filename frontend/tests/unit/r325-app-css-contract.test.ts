/**
 * R325 — app grammar CSS contract (P2.1 · DESIGN.md §R325).
 *
 * Sibling of r305-shell-css-contract.test.ts (same scanner grammar,
 * one sheet): reads `src/styles/r325-app.css` as TEXT and pins
 *
 *  1. zero raw hex/rgb()/hsl() colors — every --app-* colour is a
 *     var() alias into tokens.css or a color-mix() on currentColor
 *     (mirrors scripts/check-colors.sh; Ink parity by construction)
 *  2. zero raw font-size / border-radius / spacing literals outside a
 *     documented gate: allow marker (mirrors check-raw-css.sh)
 *  3. zero raw motion durations in transition/animation values and no
 *     named easings / cubic-bezier literals (mirrors
 *     check-motion-tokens.sh)
 *  4. the one authored animation (pat-hatch-sweep) has its
 *     same-sheet prefers-reduced-motion kill
 *  5. no physical directional spacing — logical properties only
 *  6. the §R325 pins themselves: the shell trio (264/72/56), the
 *     ladder-riding gutters, the form error pair, the seven role
 *     identity patterns, the app motion register — and the RM block
 *     that collapses it to instant
 *  7. layer hygiene: the sheet is UNLAYERED (the r305/r319 house
 *     contract) and carries no !important of its own.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SHEET = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'src',
  'styles',
  'r325-app.css',
);
const raw = readFileSync(SHEET, 'utf-8');
const rawLines = raw.split('\n');
const stripped = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => '\n'.repeat((m.match(/\n/g) ?? []).length));
const lines = stripped.split('\n');

// ── 1–2. color + raw-css gates ──────────────────────────────────────
describe('r325 app grammar CSS contract — token gates', () => {
  it('has zero raw color literals (var()/color-mix(currentColor)/transparent only)', () => {
    const HEX_COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/;
    const FUNC_COLOR = /\b(?:rgba?|hsla?)\(/;
    const findings: string[] = [];
    lines.forEach((text, idx) => {
      if (!HEX_COLOR.test(text) && !FUNC_COLOR.test(text)) return;
      if ((rawLines[idx] ?? '').includes('color-gate: allow')) return;
      findings.push(`r325-app.css:${idx + 1} — ${text.trim()}`);
    });
    expect(findings, `raw color literals:\n${findings.join('\n')}`).toEqual([]);
  });

  it('font-size declarations ride tokens only', () => {
    const findings = lines.filter(
      (l) => /(^|[,{\s])font-size\s*:/.test(l) && !/var\(|inherit/.test(l),
    );
    expect(findings, findings.join('\n')).toEqual([]);
  });

  it('border-radius is 0 or var() only — the radius-0 grammar', () => {
    const findings = lines.filter((l) => {
      if (!/(^|[,{\s])border-[a-z-]*radius\s*:/.test(l)) return false;
      const value = l.split(':')[1] ?? '';
      return !/^(\s*0\s*;?|\s*var\(.*\)\s*;?)$/.test(value);
    });
    expect(findings, findings.join('\n')).toEqual([]);
  });

  it('spacing declarations ride the --sp/--space ladders only', () => {
    const SPACING = /(^|[,{\s])(padding|margin|gap|row-gap|column-gap)(-[a-z]+)?\s*:/;
    const PX = /(?<![\w.#-])(-?\d+(?:\.\d+)?)px(?![\w-])/;
    const findings: string[] = [];
    lines.forEach((l, idx) => {
      if (!SPACING.test(l)) return;
      for (const m of l.matchAll(new RegExp(PX.source, 'g'))) {
        if (parseFloat(m[1]!) === 0) continue; // zero has no rung
        findings.push(`r325-app.css:${idx + 1} — ${l.trim()}`);
        break;
      }
    });
    expect(findings, `raw spacing literals:\n${findings.join('\n')}`).toEqual([]);
  });
});

// ── 3–4. motion gates ───────────────────────────────────────────────
describe('r325 app grammar CSS contract — motion gates', () => {
  it('transition/animation durations ride tokens only (zero kills exempt)', () => {
    const DURATION_VAR = /var\(--(?:t-(?:micro|fast|base|slow|slower|cinema)|motion-duration-[a-z-]+|app-t-[a-z-]+)\)/;
    const TIME = /(?<![\w.])(\d+(?:\.\d+)?)(ms|s)(?![\w])/;
    const findings: string[] = [];
    lines.forEach((l, idx) => {
      const m = /(^|[,{\s])(transition|animation)(-[a-z-]+)?\s*:/.exec(l);
      if (!m) return;
      for (const t of l.matchAll(new RegExp(TIME.source, 'g'))) {
        const ms = parseFloat(t[1]!) * (t[2] === 's' ? 1000 : 1);
        if (ms <= 1) continue; // 0s/0ms kills
        if (DURATION_VAR.test(l)) continue; // tokenized value elsewhere on the line
        findings.push(`r325-app.css:${idx + 1} — ${l.trim()} (raw ${t[0]})`);
      }
    });
    expect(findings, `raw motion durations:\n${findings.join('\n')}`).toEqual([]);
  });

  it('no named easings, no cubic-bezier literals, no transition: all', () => {
    expect(stripped).not.toMatch(/cubic-bezier\(/);
    expect(stripped).not.toMatch(/(transition|animation)[a-zA-Z-]*\s*:[^;]*\ball\b/);
    const findings = lines.filter((l) =>
      /(?<![-\w])(ease-in-out|ease-in|ease-out|linear)(?![\w-])/.test(l),
    );
    expect(findings, findings.join('\n')).toEqual([]);
  });

  it('the authored sweep has its same-sheet prefers-reduced-motion kill', () => {
    expect(stripped).toMatch(/animation:\s*pat-hatch-sweep\s+var\(--motion-duration-skeleton\)/);
    const rm = /@media[^{]*prefers-reduced-motion\s*:\s*reduce[^{]*\{/;
    const at = rm.exec(stripped);
    expect(at, 'RM block present').toBeTruthy();
    const start = at!.index + at![0].length;
    let depth = 1;
    let j = start;
    while (j < stripped.length && depth > 0) {
      if (stripped[j] === '{') depth += 1;
      else if (stripped[j] === '}') depth -= 1;
      j += 1;
    }
    const body = stripped.slice(start, j - 1);
    expect(body).toMatch(/\.pat-skeleton::after\s*\{/);
    expect(body).toMatch(/animation:\s*none/);
  });
});

// ── 5–7. logical properties, §R325 pins, layer hygiene ──────────────
describe('r325 app grammar CSS contract — §R325 pins', () => {
  it('never declares physical padding-left/right or margin-left/right', () => {
    const BANNED = /(padding|margin)-(left|right)\s*:/;
    const findings = lines.filter((l) => BANNED.test(l));
    expect(findings, findings.join('\n')).toEqual([]);
  });

  it('pins the shell trio — sidebar 264 / rail 72 / topbar 56', () => {
    expect(stripped).toMatch(/--app-sidebar-w:\s*264px/);
    expect(stripped).toMatch(/--app-sidebar-rail:\s*72px/);
    expect(stripped).toMatch(/--app-topbar-h:\s*56px/);
  });

  it('rides the ladders — gutters are --sp rungs, content max is the canonical seat', () => {
    expect(stripped).toMatch(/--app-gutter:\s*var\(--sp-6\)/);
    expect(stripped).toMatch(/--app-gutter-phone:\s*var\(--sp-4\)/);
    expect(stripped).toMatch(/--app-content-max:\s*var\(--content-max-w\)/);
    expect(stripped).toMatch(/--app-grid-cols:\s*var\(--grid-cols\)/);
  });

  it('every --app-* colour resolves through the §2 pairs — zero app-local hex', () => {
    // The ink/line/signal seats must be var() aliases, not literals.
    for (const token of [
      '--app-bg', '--app-surface', '--app-ink', '--app-ink-2', '--app-ink-3',
      '--app-line', '--app-line-soft', '--app-signal', '--app-signal-ink',
      '--app-signal-wash', '--app-backdrop', '--app-input-line',
      '--app-input-focus', '--app-input-error-line', '--app-input-error-ink',
    ]) {
      expect(stripped).toMatch(new RegExp(`${token.replace(/-/g, '\\-')}:\\s*var\\(--`));
    }
  });

  it('pins the form error pair (signal rule + signal-ink text)', () => {
    expect(stripped).toMatch(/--app-input-error-line:\s*var\(--accent\)/);
    expect(stripped).toMatch(/--app-input-error-ink:\s*var\(--accent-ink\)/);
  });

  it('ships the seven role identity patterns (no new colours)', () => {
    for (const key of ['student', 'faculty', 'department-head', 'dean', 'admin', 'quality', 'owner']) {
      expect(stripped).toMatch(new RegExp(`--app-role-pat-${key}:`));
    }
    // Six ride ink patterns; the owner alone carries the signal.
    expect(stripped).toMatch(/--app-role-pat-owner:[^;]*--app-signal/);
  });

  it('pins the app motion register + its RM collapse to instant', () => {
    expect(stripped).toMatch(/--app-t-hover:\s*120ms/);
    expect(stripped).toMatch(/--app-t-page:\s*320ms/);
    const rmAt = stripped.indexOf('prefers-reduced-motion');
    const rmBody = stripped.slice(rmAt);
    expect(rmBody).toMatch(/--app-t-hover:\s*0ms/);
    expect(rmBody).toMatch(/--app-t-page:\s*0ms/);
  });

  it('the sheet is unlayered and carries no !important (the house contract)', () => {
    expect(stripped).not.toMatch(/@layer\b/);
    expect(stripped).not.toMatch(/!important/);
  });

  it('names the three state primitives + the skeleton the grammar pins', () => {
    for (const cls of ['.pat-hatch', '.pat-dots', '.pat-cross', '.pat-skeleton']) {
      expect(stripped).toMatch(new RegExp(`${cls.replace(/-/g, '\\-')}\\s*\\{`));
    }
  });
});
