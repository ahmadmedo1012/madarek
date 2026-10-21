/**
 * r305 — Heron shell CSS contract (Task 2-d).
 *
 * Reads the shell sheets (layout.css + r305-shell.css) as TEXT and
 * asserts the design-gate contract the Heron Shell Contract binds this
 * round to:
 *
 *  1. zero raw hex/rgb()/hsl() colors outside documented
 *     `color-gate: allow` lines          (mirrors scripts/check-colors.sh)
 *  2. zero raw font-size / border-radius / spacing px literals outside
 *     documented type/radius/spacing-gate allow lines — including the
 *     r185 marker grammar (reason ≥ 2 words, ≥ 8 chars, not vague)
 *     and the var()-fallback / calc() argument scope
 *                                      (mirrors scripts/check-raw-css.sh)
 *  3. zero raw motion durations in transition/animation values —
 *     delay slots and zero-ish kills exempt
 *                                      (mirrors scripts/check-motion-tokens.sh)
 *  4. every `animation:` authored in either sheet has an explicit
 *     `prefers-reduced-motion: reduce` kill in the SAME sheet
 *  5. no new physical directional spacing — padding-left/right and
 *     margin-left/right are findings in both sheets (logical
 *     properties only)
 *  6. layer hygiene: r305-shell.css is UNLAYERED (the house precedent
 *     that gives the Heron layer the last word without !important)
 *     and carries no !important of its own
 *  7. the A4 «كل مسار له علامة جانبية واحدة» vocabulary holds: the
 *     retired `.nav-item[aria-current]` twin never returns, and the
 *     one-active-marker contract's ::after stand-down is present.
 *  8. the 2-a/2-b markup hooks are styled on the grammar's registers:
 *     accordion nav groups (seam/toggle/reveal on token ladders), the
 *     topbar kicker (quiet chrome voice, hairline join, hidden on the
 *     drawer band), the institution context-lost urgency pair, the
 *     role-line clamp — and the conservation pass holds (collapse-btn
 *     hover is a surface step, the scope chip's hairline is neutral).
 *  9. restraint meta-contract: the Heron layer itself never paints
 *     the copper signal (it only retires others' spending) and never
 *     retimes the overlay exit choreography (2-c's --motion-duration-
 *     short + --motion-ease-accelerate uniformity stays untouched).
 *
 * The declaration walk is a faithful TS port of check-raw-css.sh's
 * structural scanner: comments stripped newline-preserving, then a
 * string/paren/brace-aware walk that collects complete declarations
 * (multiline included) with exact source line attribution — markers
 * are read from the RAW source span so prose in comments can never
 * false-positive a literal and a marker can never exempt the wrong
 * declaration.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const STYLES_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'src',
  'styles',
);

const SHEETS = ['layout.css', 'r305-shell.css'] as const;
const readSheet = (name: string) => readFileSync(path.join(STYLES_DIR, name), 'utf-8');
const rawByName = new Map(SHEETS.map((name) => [name, readSheet(name)]));

// ── scanners (port of the python gate internals) ───────────────────

/** Newline-preserving comment removal — line pins stay exact. */
function stripComments(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => '\n'.repeat((m.match(/\n/g) ?? []).length));
}

interface Decl {
  prop: string;
  value: string;
  start: number; // 1-based source line, first line of the declaration
  end: number; // 1-based source line, last line of the declaration
  selector: string; // innermost non-at-rule prelude the decl sits in
  inReducedMotion: boolean; // inside an @media … prefers-reduced-motion: reduce block
  mediaPrelude: string | null; // nearest enclosing @media prelude, if any
}

function parseDeclarations(text: string): Decl[] {
  const decls: Decl[] = [];
  const stack: Array<{ prelude: string }> = [];
  let depth = 0;
  let paren = 0;
  let quote: string | null = null;
  let buf = '';
  let bufStart: number | null = null;
  let line = 1;

  const selectorContext = () => {
    for (let i = stack.length - 1; i >= 0; i--) {
      const prelude = stack[i]!.prelude.trim();
      if (prelude && !prelude.startsWith('@')) return prelude;
    }
    return '(root)';
  };
  const mediaContext = () => {
    for (let i = stack.length - 1; i >= 0; i--) {
      const prelude = stack[i]!.prelude.trim();
      if (prelude.startsWith('@media')) return prelude;
    }
    return null;
  };
  const inReducedMotionContext = () => {
    for (let i = stack.length - 1; i >= 0; i--) {
      if (/prefers-reduced-motion\s*:\s*reduce/.test(stack[i]!.prelude)) return true;
    }
    return false;
  };

  const flush = (endLine: number) => {
    if (bufStart !== null) {
      const chunk = buf.trim();
      const colon = chunk.indexOf(':');
      if (chunk && colon > 0) {
        decls.push({
          prop: chunk.slice(0, colon).trim(),
          value: chunk.slice(colon + 1).trim(),
          start: bufStart,
          end: endLine,
          selector: selectorContext(),
          inReducedMotion: inReducedMotionContext(),
          mediaPrelude: mediaContext(),
        });
      }
    }
    buf = '';
    bufStart = null;
  };

  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i]!;
    if (ch === '\n') line += 1;
    if (quote) {
      if (ch === '\\') {
        buf += ch;
        i += 1;
        if (i < n) {
          buf += text[i]!;
          if (text[i] === '\n') line += 1;
        }
        i += 1;
        continue;
      }
      if (ch === quote) quote = null;
      if (depth >= 1) {
        if (bufStart === null) bufStart = line;
        buf += ch;
      }
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      if (depth >= 1 && bufStart === null) bufStart = line;
      if (depth >= 1) buf += ch;
      i += 1;
      continue;
    }
    if (paren > 0) {
      if (ch === '(') paren += 1;
      else if (ch === ')') paren -= 1;
      if (depth >= 1) {
        if (bufStart === null) bufStart = line;
        buf += ch;
      }
      i += 1;
      continue;
    }
    if (ch === '(') {
      paren = 1;
      if (depth >= 1) {
        if (bufStart === null) bufStart = line;
        buf += ch;
      }
      i += 1;
      continue;
    }
    if (ch === '{') {
      // the buffered prelude is the selector / at-rule prelude
      stack.push({ prelude: buf });
      depth += 1;
      paren = 0;
      buf = '';
      bufStart = null;
      i += 1;
      continue;
    }
    if (ch === '}') {
      depth -= 1;
      expect(depth, 'unbalanced braces (negative depth)').toBeGreaterThanOrEqual(0);
      paren = 0;
      flush(line); // last declaration may omit ';'
      stack.pop();
      i += 1;
      continue;
    }
    if (ch === ';') {
      if (depth >= 1) flush(line);
      else {
        buf = ''; // @import/@charset at depth 0
        bufStart = null;
      }
      i += 1;
      continue;
    }
    if (depth >= 1) {
      if (bufStart === null && !/\s/.test(ch)) bufStart = line;
      buf += ch;
    }
    i += 1;
  }
  expect(depth, 'unbalanced braces at EOF').toBe(0);
  flush(line);
  return decls;
}

/** Every raw px literal in a value — var() fallbacks and function
 *  arguments included, quoted strings skipped, identifier-adjacent
 *  matches (e.g. a `--x-12px` custom property name) skipped. */
function findPxLiterals(value: string): Array<{ text: string; signed: number }> {
  const out: Array<{ text: string; signed: number }> = [];
  let i = 0;
  const n = value.length;
  while (i < n) {
    const ch = value[i]!;
    if (ch === '"' || ch === "'") {
      let j = i + 1;
      while (j < n && value[j] !== ch) {
        if (value[j] === '\\') j += 1;
        j += 1;
      }
      i = j + 1;
      continue;
    }
    const m = /^(-?)(\d+(?:\.\d+)?)px\b/.exec(value.slice(i));
    if (m && (i === 0 || !/[A-Za-z0-9_.-]/.test(value[i - 1]!))) {
      const signed = (m[1] === '-' ? -1 : 1) * parseFloat(m[2]!);
      out.push({ text: m[0], signed });
      i += m[0].length;
      continue;
    }
    i += 1;
  }
  return out;
}

const SPACING_PROPS = new Set([
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'padding-block', 'padding-block-start', 'padding-block-end',
  'padding-inline', 'padding-inline-start', 'padding-inline-end',
  'margin', 'margin-top', 'margin-right', 'margin-bottom', 'margin-left',
  'margin-block', 'margin-block-start', 'margin-block-end',
  'margin-inline', 'margin-inline-start', 'margin-inline-end',
  'gap', 'row-gap', 'column-gap',
]);
const isSpacingProp = (prop: string) =>
  SPACING_PROPS.has(prop) || [...SPACING_PROPS].some((p) => prop.endsWith(`-${p}`));

const ALLOW_SPACING = /spacing-gate\s*:\s*allow\b\s*(?:[—-]\s*([^*]*))?/;
const VAGUE_REASONS = new Set([
  'legacy', 'existing', 'historic', 'historical', 'old', 'todo', 'wip',
  'temp', 'temporary', 'as-is', 'ok', 'fine', 'n/a', 'none', 'later',
  'fixme', 'xxx', 'tbd', 'unspecified', 'keep', 'skip',
]);

/** (state, reason) for the spacing allow marker across the
 *  declaration's raw source span — the r185 grammar: the reason must
 *  be ≥ 8 chars, ≥ 2 words, and not a vague word. */
function spacingMarkerState(rawLines: string[], start: number, end: number): {
  state: 'none' | 'valid' | 'invalid';
  reason: string;
} {
  const span = rawLines.slice(start - 1, end).join('\n');
  const m = ALLOW_SPACING.exec(span);
  if (!m) return { state: 'none', reason: '' };
  const reason = (m[1] ?? '').trim().replace(/\*+$/, '').trim();
  const words = reason.split(/\s+/).filter(Boolean);
  if (reason.length < 8 || words.length < 2 || VAGUE_REASONS.has(reason.toLowerCase())) {
    return { state: 'invalid', reason: reason || '<empty>' };
  }
  return { state: 'valid', reason };
}

const PX_IN_VALUE = /\d+(?:\.\d+)?px/;
const HEX_COLOR = /#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})\b/;
const FUNC_COLOR = /\b(?:rgba?|hsla?)\(/;
const RAW_DURATION = /(\d+(?:\.\d+)?)(ms|s)\b/;
const RADIUS_PROP = /^border(?:-[a-z]+(?:-[a-z]+)?)?-radius$/;
const RADIUS_FINE = new Set(['0', '50%', 'inherit', 'none']);

interface ParsedSheet {
  name: string;
  raw: string;
  rawLines: string[];
  stripped: string;
  decls: Decl[];
}

const parsed: ParsedSheet[] = SHEETS.map((name) => {
  const raw = rawByName.get(name)!;
  const rawLines = raw.split('\n');
  const stripped = stripComments(raw);
  return { name, raw, rawLines, stripped, decls: parseDeclarations(stripped) };
});

// ── 1. color gate ───────────────────────────────────────────────────
describe('r305 shell CSS contract — color gate', () => {
  it('has zero raw hex/rgb()/hsl() literals outside documented color-gate: allow lines', () => {
    const findings: string[] = [];
    for (const sheet of parsed) {
      const lines = sheet.stripped.split('\n');
      lines.forEach((text, idx) => {
        if (!HEX_COLOR.test(text) && !FUNC_COLOR.test(text)) return;
        const rawLine = sheet.rawLines[idx] ?? '';
        if (rawLine.includes('color-gate: allow')) return;
        findings.push(`${sheet.name}:${idx + 1} — ${text.trim()}`);
      });
    }
    expect(findings, `raw color literals:\n${findings.join('\n')}`).toEqual([]);
  });
});

// ── 2. type / radius / spacing gates ────────────────────────────────
describe('r305 shell CSS contract — raw-css gates (type · radius · spacing)', () => {
  it('font-size carries only tokens/inherit or a documented type-gate: allow', () => {
    const findings: string[] = [];
    for (const sheet of parsed) {
      for (const d of sheet.decls) {
        if (d.prop !== 'font-size') continue;
        if (!PX_IN_VALUE.test(d.value)) continue;
        if (/var\(/.test(d.value) || d.value === 'inherit') continue;
        const span = sheet.rawLines.slice(d.start - 1, d.end).join('\n');
        if (/type-gate:\s*allow\b/.test(span)) continue;
        findings.push(`${sheet.name}:${d.start} — font-size: ${d.value}`);
      }
    }
    expect(findings, `raw font-size literals:\n${findings.join('\n')}`).toEqual([]);
  });

  it('border-*-radius carries only 0/50%/inherit/none, var(), or a radius-gate: allow', () => {
    const findings: string[] = [];
    for (const sheet of parsed) {
      for (const d of sheet.decls) {
        if (!RADIUS_PROP.test(d.prop)) continue;
        if (!PX_IN_VALUE.test(d.value)) continue;
        if (RADIUS_FINE.has(d.value) || /var\(/.test(d.value)) continue;
        const span = sheet.rawLines.slice(d.start - 1, d.end).join('\n');
        if (/radius-gate:\s*allow\b/.test(span)) continue;
        findings.push(`${sheet.name}:${d.start} — ${d.prop}: ${d.value}`);
      }
    }
    expect(findings, `raw radius literals:\n${findings.join('\n')}`).toEqual([]);
  });

  it('spacing carries only ladder tokens, zeros/relative units, or a reasoned spacing-gate: allow', () => {
    const findings: string[] = [];
    const malformed: string[] = [];
    for (const sheet of parsed) {
      for (const d of sheet.decls) {
        if (!isSpacingProp(d.prop)) continue;
        const lits = findPxLiterals(d.value);
        if (lits.length === 0) continue;
        const { state, reason } = spacingMarkerState(sheet.rawLines, d.start, d.end);
        if (state === 'invalid') {
          malformed.push(`${sheet.name}:${d.start} — marker reason «${reason}» (vague/short)`);
          continue;
        }
        if (state === 'valid') continue;
        for (const lit of lits) {
          if (lit.signed === 0) continue; // zero has no rung
          findings.push(
            `${sheet.name}:${d.start} — ${d.prop}: ${d.value} (raw ${lit.text})`,
          );
        }
      }
    }
    expect(malformed, `malformed spacing-gate markers:\n${malformed.join('\n')}`).toEqual([]);
    expect(findings, `raw spacing literals:\n${findings.join('\n')}`).toEqual([]);
  });
});

// ── 3. motion gate ──────────────────────────────────────────────────
describe('r305 shell CSS contract — motion gate', () => {
  it('transition/animation values carry only token durations (delay slots + zero kills exempt)', () => {
    const findings: string[] = [];
    const DELAY_PROPS = new Set(['animation-delay', 'transition-delay']);
    for (const sheet of parsed) {
      for (const d of sheet.decls) {
        if (
          !['transition', 'transition-duration', 'animation', 'animation-duration', 'transition-property', 'animation-name'].includes(d.prop)
        ) continue;
        if (DELAY_PROPS.has(d.prop)) continue; // delay slots are exempt by policy
        for (const m of d.value.matchAll(new RegExp(RAW_DURATION.source, 'g'))) {
          const value = parseFloat(m[1]!) * (m[2] === 's' ? 1000 : 1);
          if (value <= 1) continue; // 0s / 0ms / 0.01ms — kills motion, doesn't author it
          findings.push(`${sheet.name}:${d.start} — ${d.prop}: ${d.value} (raw ${m[0]})`);
        }
      }
    }
    expect(findings, `raw motion durations:\n${findings.join('\n')}`).toEqual([]);
  });

  it('every animation authored in these sheets has a same-sheet prefers-reduced-motion kill', () => {
    const findings: string[] = [];
    for (const sheet of parsed) {
      // Collect RM block bodies (brace-matched) from the stripped text.
      const rmBodies: string[] = [];
      const rm = /@media[^{]*prefers-reduced-motion\s*:\s*reduce[^{]*\{/g;
      while (rm.exec(sheet.stripped) !== null) {
        let depth = 1;
        let j = rm.lastIndex;
        while (j < sheet.stripped.length && depth > 0) {
          if (sheet.stripped[j] === '{') depth += 1;
          else if (sheet.stripped[j] === '}') depth -= 1;
          j += 1;
        }
        rmBodies.push(sheet.stripped.slice(rm.lastIndex, j - 1));
        rm.lastIndex = j;
      }
      for (const d of sheet.decls) {
        if (!/^animation(-name)?$/.test(d.prop)) continue;
        if (d.inReducedMotion) continue; // authored inside a kill block
        const name = d.value.split(/\s+/)[0] ?? '';
        if (name === 'none') continue; // a kill, not an authoring
        // The RM kill may target the base selector while the animation
        // rides a directional variant ([dir="ltr"] .search-shimmer) —
        // the !important kill in the same sheet covers it by cascade,
        // so attribute-qualifier prefixes are normalized away.
        const normalizedSelector = d.selector.replace(/\[dir="?[a-z]+"?\]\s*/gi, '');
        const killed = rmBodies.some(
          (body) =>
            body.includes(normalizedSelector) &&
            /animation\s*:\s*none|animation-name\s*:\s*none/.test(body),
        );
        expect(
          killed,
          `${sheet.name}:${d.start} — «${d.selector}» authors an animation (${d.value}) with no same-sheet prefers-reduced-motion kill`,
        ).toBe(true);
        if (!killed) findings.push(`${sheet.name}:${d.start} — ${d.selector}: ${d.value}`);
      }
    }
    expect(findings).toEqual([]);
  });
});

// ── 4. logical properties ───────────────────────────────────────────
describe('r305 shell CSS contract — logical properties', () => {
  it('never declares physical padding-left/right or margin-left/right', () => {
    const findings: string[] = [];
    const BANNED = new Set(['padding-left', 'padding-right', 'margin-left', 'margin-right']);
    for (const sheet of parsed) {
      for (const d of sheet.decls) {
        if (!BANNED.has(d.prop)) continue;
        findings.push(`${sheet.name}:${d.start} — ${d.prop}: ${d.value}`);
      }
    }
    expect(findings, `physical directional spacing:\n${findings.join('\n')}`).toEqual([]);
  });
});

// ── 5. layer hygiene + A4 vocabulary ────────────────────────────────
describe('r305 shell CSS contract — layer hygiene & A4 vocabulary', () => {
  const shell = parsed.find((s) => s.name === 'r305-shell.css')!;

  it('r305-shell.css is unlayered — the Heron layer wins the cascade without !important', () => {
    expect(shell.stripped).not.toMatch(/@layer\b/);
    expect(shell.stripped).not.toMatch(/!important/);
  });

  it('the retired .nav-item[aria-current] active twin never returns', () => {
    for (const sheet of parsed) {
      expect(sheet.stripped).not.toMatch(/\.nav-item\[aria-current/i);
    }
  });

  it('the one-active-marker stand-down (nav rail dot ::after) is present', () => {
    // A4: one bar + one surface step + one icon tint — the polish v16
    // ::after dot stays retired by the Heron layer.
    expect(shell.stripped).toMatch(/\.nav-item\.on::after\s*\{[^}]*content:\s*none/);
  });
});

// ── 6. the 2-a/2-b markup hooks ─────────────────────────────────────
describe('r305 shell CSS contract — 2-a/2-b hook grammar', () => {
  const shell = parsed.find((s) => s.name === 'r305-shell.css')!;
  const layout = parsed.find((s) => s.name === 'layout.css')!;

  it('accordion nav groups: the firmer seam, the toggle press register, the desktop-only reveal', () => {
    // The hooks 2-a ships on .nav-group (selectors only — aria-expanded
    // stays the a11y truth).
    expect(shell.stripped).toMatch(/\[data-collapsible="true"\]/);
    expect(shell.stripped).toMatch(/\[data-group-open="true"\]/);
    // Operable sections earn the standard rule hairline above them.
    expect(shell.stripped).toMatch(
      /\.nav-group \+ \.nav-group\[data-collapsible="true"\]\s*\{[^}]*border-block-start-color:\s*var\(--rule\)/,
    );
    // The toggle is a <button>: press rides the button register even
    // though its base look is inline-styled (transform is not).
    expect(shell.stripped).toMatch(
      /\[data-collapsible="true"\] \.nav-group-toggle:active\s*\{[^}]*transform:\s*scale\(var\(--press-scale\)\)/,
    );
    // The reveal mounts rows on the entrance register: ≤8px via the
    // token, medium duration, decelerate — desktop band only, with
    // `backwards` fill so v13's row press survives the entrance.
    expect(shell.stripped).toMatch(
      /@media \(min-width: 921px\)\s*\{[^@]*madarek-group-reveal\s+var\(--motion-duration-medium\)\s*\n\s*var\(--motion-ease-decelerate\) backwards/,
    );
    expect(shell.raw).toMatch(
      /@keyframes madarek-group-reveal\s*\{[\s\S]{0,200}?translateY\(var\(--motion-distance-small\)\)/,
    );
    // The stagger ladder is the token ladder (step per row, capped).
    expect(shell.stripped).toMatch(/animation-delay:\s*calc\(var\(--motion-stagger-step\)/);
    expect(shell.stripped).toMatch(
      /animation-delay:\s*calc\(var\(--motion-stagger-cap\) \* var\(--motion-stagger-step\)\)/,
    );
  });

  it('the topbar kicker: quiet chrome voice, hairline join, hidden on the drawer band', () => {
    expect(shell.stripped).toMatch(
      /\.topbar-kicker\s*\{[^}]*font-family:\s*var\(--font-sans\)[^}]*border-inline-end:\s*1px solid var\(--rule\)/,
    );
    // Disciplined typography: sans + the token ladder — never mono.
    expect(shell.stripped).not.toMatch(/\.topbar-kicker\s*\{[^}]*font-mono/);
    // ≤920px hides it like .topbar-scope (2-b's coordination note).
    expect(shell.stripped).toMatch(
      /@media \(max-width: 920px\)\s*\{\s*\.topbar-kicker\s*\{\s*display:\s*none;?\s*\}\s*\}/,
    );
  });

  it('the institution context-lost signal rides the urgency family as a rest+hover pair', () => {
    expect(shell.stripped).toMatch(
      /\.topbar-inst-trigger\[data-context-lost="true"\]\s*\{[^}]*background:\s*var\(--danger-soft\)[^}]*color:\s*var\(--danger-ink\)/,
    );
    expect(shell.stripped).toMatch(
      /\[data-context-lost="true"\]:hover\s*\{[^}]*color-mix\(in srgb, var\(--danger-soft\) 72%, var\(--danger\)\)/,
    );
  });

  it('the role line clamps (2-a title hook)', () => {
    expect(shell.stripped).toMatch(
      /\.sidebar-user-role\s*\{[^}]*text-overflow:\s*ellipsis/,
    );
  });

  it('the conservation pass holds: collapse-btn hover is a surface step, the scope chip hairline is neutral', () => {
    // Grammar §3: hover never previews the copper signal.
    expect(layout.stripped).toMatch(
      /\.sidebar-collapse-btn:hover\s*\{[^}]*border-color:\s*var\(--border-strong\)[^}]*color:\s*var\(--text\)/,
    );
    expect(layout.stripped).not.toMatch(/\.sidebar-collapse-btn:hover\s*\{[^}]*var\(--accent\)/);
    // The passive scope chip is context, not signal.
    expect(layout.stripped).toMatch(/\.topbar-scope\s*\{[^}]*border:\s*1px solid var\(--rule\)/);
    expect(layout.stripped).not.toMatch(/\.topbar-scope\s*\{[^}]*var\(--accent\)/);
  });
});

// ── 7. restraint meta-contract ──────────────────────────────────────
describe('r305 shell CSS contract — restraint meta-contract', () => {
  const shell = parsed.find((s) => s.name === 'r305-shell.css')!;

  it('the Heron layer itself never paints the copper signal — it only retires others’ spending', () => {
    // The restrained-signal grammar's five copper sites are all owned
    // by the owning sheets (marker/focus/CTA/urgency/⌘K). This layer's
    // job is retirement and register-unification: if a refinement here
    // ever needs --accent, that is a contract change — make it loudly.
    expect(shell.stripped).not.toMatch(/--accent\b/);
  });

  it('the overlay exit choreography (2-c) is never retimed here', () => {
    // Exit uniformity = --motion-duration-short + --motion-ease-
    // accelerate on every data-closing surface; the useDelayedUnmount
    // safety net reads the matching token. The Heron layer authors no
    // overlay exit rules at all — keep it that way.
    expect(shell.stripped).not.toMatch(/data-closing/);
    expect(shell.stripped).not.toMatch(/--motion-ease-accelerate/);
  });
});
