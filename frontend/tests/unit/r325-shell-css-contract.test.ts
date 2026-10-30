/**
 * R325 — shell CSS contract (P2.3 · DESIGN.md §R325).
 *
 * Sibling of r325-app-css-contract.test.ts (P2.1's token pins) and
 * r305-shell-css-contract.test.ts (the R305 Heron shell pins): reads
 * `src/styles/r325-shell.css` (the P2.3 shell layer) plus the
 * tokens.css layout block as TEXT and pins
 *
 *  1. the §R325.a trio MIGRATION — tokens.css's --sidebar-w /
 *     --sidebar-w-collapsed / --topbar-h alias the --app-* seats (the
 *     256/64/60 literals retired); r325-shell.css re-declares no
 *     dimension of its own;
 *  2. the ACTIVE NAV grammar — the ink fill-wipe layer (.nav-fill:
 *     scaleX 0→1 at --t-fast, --app-ink ground, .on pair flipping the
 *     label to --app-bg in lockstep) and the orange tick re-keyed to
 *     --app-signal at the --app-t-hover register;
 *  3. the §R325.m role identity seat — all seven --app-role-pat-*
 *     patterns consumed, one [data-role] rule each;
 *  4. the §R325.b 44px target floor on the top bar cluster + the
 *     theme toggle's chrome recipe;
 *  5. the §R325.a phone band — the bottom nav on --app-bg with the
 *     --app-signal marker and the pop off --motion-duration-page;
 *  6. the §R325.k page register — the shell's route entrance rides
 *     --app-t-page (320ms ≤ 350), the drawer z-run at
 *     --z-menu-drawer;
 *  7. token gates mirrored from the sibling contracts (zero raw
 *     colors / durations / raw font sizes, logical properties only)
 *     + the RM kill for the fill-wipe transition;
 *  8. layer hygiene: unlayered, no !important (the house contract).
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STYLES = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'src',
  'styles',
);
const read = (name: string) => readFileSync(path.join(STYLES, name), 'utf-8');
const strip = (text: string) =>
  text.replace(/\/\*[\s\S]*?\*\//g, (m) => '\n'.repeat((m.match(/\n/g) ?? []).length));

const shell = strip(read('r325-shell.css'));
const shellRaw = read('r325-shell.css');
const shellLines = shell.split('\n');
const rawShellLines = shellRaw.split('\n');
const tokens = strip(read('tokens.css'));

// ── 1. the §R325.a trio migration ───────────────────────────────────
describe('r325 shell CSS contract — the §R325.a trio migration (tokens.css)', () => {
  it('aliases the shell chrome onto the --app-* seats (the 256/64/60 literals retired)', () => {
    expect(tokens).toMatch(/--sidebar-w:\s*var\(--app-sidebar-w,\s*264px\)/);
    expect(tokens).toMatch(/--sidebar-w-collapsed:\s*var\(--app-sidebar-rail,\s*72px\)/);
    expect(tokens).toMatch(/--topbar-h:\s*var\(--app-topbar-h,\s*56px\)/);
    // The retired literals never return as values.
    expect(tokens).not.toMatch(/--sidebar-w:\s*256px/);
    expect(tokens).not.toMatch(/--sidebar-w-collapsed:\s*64px/);
    expect(tokens).not.toMatch(/--topbar-h:\s*60px/);
  });

  it('re-declares no shell dimension in the P2.3 layer — one migration, one home', () => {
    expect(shell).not.toMatch(/--sidebar-w\s*:/);
    expect(shell).not.toMatch(/--topbar-h\s*:/);
    expect(shell).not.toMatch(/grid-template-columns\s*:/);
  });
});

// ── 2. the active nav grammar ───────────────────────────────────────
describe('r325 shell CSS contract — the active nav (tick + ink fill-wipe)', () => {
  it('the fill layer sweeps via scaleX at the dialogs rung, ink ground, seam origin', () => {
    expect(shell).toMatch(/\.nav-item \.nav-fill\s*\{[^}]*position:\s*absolute/);
    expect(shell).toMatch(/\.nav-item \.nav-fill\s*\{[^}]*z-index:\s*-1/);
    expect(shell).toMatch(/\.nav-item \.nav-fill\s*\{[^}]*background:\s*var\(--app-ink\)/);
    expect(shell).toMatch(/\.nav-item \.nav-fill\s*\{[^}]*transform:\s*scaleX\(0\)/);
    expect(shell).toMatch(
      /\.nav-item \.nav-fill\s*\{[^}]*transition:\s*transform var\(--t-fast\) var\(--ease\)/,
    );
    expect(shell).toMatch(/\.nav-item\.on \.nav-fill\s*\{[^}]*transform:\s*scaleX\(1\)/);
    // The containment that keeps the -1 layer inside the row.
    expect(shell).toMatch(/\.nav-item\s*\{[^}]*isolation:\s*isolate/);
  });

  it('the active pair flips the label/icon to the app-bg ground in lockstep', () => {
    expect(shell).toMatch(/\.nav-item\.on\s*\{[^}]*--_fg:\s*var\(--app-bg\)/);
    expect(shell).toMatch(/\.nav-item\.on\s*\{[^}]*--_icon-fg:\s*var\(--app-bg\)/);
  });

  it('the tick is the --app-signal at the --app-t-hover register', () => {
    expect(shell).toMatch(
      /\.nav-item\.on::before\s*\{[^}]*background:\s*var\(--app-signal\)/,
    );
    expect(shell).toMatch(
      /\.nav-item\.on::before\s*\{[^}]*animation-duration:\s*var\(--app-t-hover\)/,
    );
  });

  it('the fill wipe dies under reduced motion (instant state)', () => {
    const rm = /@media[^{]*prefers-reduced-motion\s*:\s*reduce[^{]*\{/;
    const at = rm.exec(shell);
    expect(at, 'RM block present').toBeTruthy();
    const body = shell.slice(at!.index + at![0].length);
    expect(body).toMatch(/\.nav-item \.nav-fill\s*\{[^}]*transition:\s*none/);
  });
});

// ── 3–6. the §R325 seats ────────────────────────────────────────────
describe('r325 shell CSS contract — §R325.m/.b/.a/.k seats', () => {
  it('the role identity seat consumes all seven --app-role-pat-* patterns', () => {
    for (const key of ['student', 'faculty', 'department-head', 'dean', 'admin', 'quality', 'owner']) {
      expect(shell).toMatch(
        new RegExp(`\\.sidebar-role-id\\[data-role="${key}"\\] \\.sidebar-role-pat\\s*\\{[^}]*background-image:\\s*var\\(--app-role-pat-${key}\\)`),
      );
    }
    // The code rides the mono micro-label register, dir handled in markup.
    expect(shell).toMatch(
      /\.sidebar-role-code\s*\{[^}]*font-size:\s*var\(--fs-mono-md\)/,
    );
  });

  it('nav group headers ride the mono micro-label rung', () => {
    expect(shell).toMatch(
      /\.nav-section-label\s*\{[^}]*font-size:\s*var\(--fs-mono-md\)/,
    );
  });

  it('the top bar cluster clears the 44px target floor (§R325.b)', () => {
    expect(shell).toMatch(/\.topbar-notif\s*\{[^}]*min-block-size:\s*44px/);
    expect(shell).toMatch(/\.topbar-user-trigger\s*\{[^}]*min-block-size:\s*44px/);
    expect(shell).toMatch(/\.topbar-search input\s*\{[^}]*block-size:\s*44px/);
    expect(shell).toMatch(/\.topbar-theme\s*\{[^}]*min-block-size:\s*44px/);
    // The theme toggle is square chrome: radius 0, flat rest.
    expect(shell).toMatch(/\.topbar-theme\s*\{[^}]*border-radius:\s*0/);
  });

  it('the phone bottom nav: --app-bg ground, --app-signal marker, --app-t-page pop', () => {
    expect(shell).toMatch(/\.bottom-nav\s*\{[^}]*background:\s*var\(--app-bg\)/);
    expect(shell).toMatch(
      /\.bottom-nav-item\[aria-current="page"\]::before,[\s\S]{0,80}?\.bottom-nav-item\.active::before\s*\{[^}]*background:\s*var\(--app-signal\)/,
    );
    expect(shell).toMatch(
      /\.bottom-nav-item\.active \.bottom-nav-icon\s*\{[^}]*animation-duration:\s*var\(--app-t-page\)/,
    );
  });

  it('the shell route entrance rides --app-t-page (320ms ≤ 350)', () => {
    expect(shell).toMatch(
      /\.has-shell \.content-inner > \*\s*\{[^}]*animation-duration:\s*var\(--app-t-page\)/,
    );
  });

  it('the drawer z-run is --z-menu-drawer with the backdrop one rung under', () => {
    expect(shell).toMatch(/\.sidebar\s*\{[^}]*z-index:\s*var\(--z-menu-drawer\)/);
    expect(shell).toMatch(
      /\.sidebar-backdrop\s*\{[^}]*z-index:\s*calc\(var\(--z-menu-drawer\) - 1\)/,
    );
  });
});

// ── 7. token gates (mirrored from the sibling contracts) ────────────
describe('r325 shell CSS contract — token gates', () => {
  it('has zero raw color literals', () => {
    const HEX_COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/;
    const FUNC_COLOR = /\b(?:rgba?|hsla?)\(/;
    const findings: string[] = [];
    shellLines.forEach((text, idx) => {
      if (!HEX_COLOR.test(text) && !FUNC_COLOR.test(text)) return;
      if ((rawShellLines[idx] ?? '').includes('color-gate: allow')) return;
      findings.push(`r325-shell.css:${idx + 1} — ${text.trim()}`);
    });
    expect(findings, findings.join('\n')).toEqual([]);
  });

  it('font-size declarations ride tokens only', () => {
    const findings = shellLines.filter(
      (l) => /(^|[,{\s])font-size\s*:/.test(l) && !/var\(|inherit/.test(l),
    );
    expect(findings, findings.join('\n')).toEqual([]);
  });

  it('transition/animation durations ride tokens only (zero kills exempt)', () => {
    const DURATION_VAR = /var\(--(?:t-(?:micro|fast|base|slow|slower|cinema)|motion-duration-[a-z-]+|app-t-[a-z-]+)\)/;
    const TIME = /(?<![\w.])(\d+(?:\.\d+)?)(ms|s)(?![\w])/;
    const findings: string[] = [];
    shellLines.forEach((l, idx) => {
      const m = /(^|[,{\s])(transition|animation)(-[a-z-]+)?\s*:/.exec(l);
      if (!m) return;
      for (const t of l.matchAll(new RegExp(TIME.source, 'g'))) {
        const ms = parseFloat(t[1]!) * (t[2] === 's' ? 1000 : 1);
        if (ms <= 1) continue;
        if (DURATION_VAR.test(l)) continue;
        findings.push(`r325-shell.css:${idx + 1} — ${l.trim()} (raw ${t[0]})`);
      }
    });
    expect(findings, findings.join('\n')).toEqual([]);
  });

  it('never declares physical padding-left/right or margin-left/right', () => {
    const findings = shellLines.filter((l) => /(padding|margin)-(left|right)\s*:/.test(l));
    expect(findings, findings.join('\n')).toEqual([]);
  });
});

// ── 8. layer hygiene ────────────────────────────────────────────────
describe('r325 shell CSS contract — layer hygiene', () => {
  it('the sheet is unlayered and carries no !important (the house contract)', () => {
    expect(shell).not.toMatch(/@layer\b/);
    expect(shell).not.toMatch(/!important/);
  });
});
