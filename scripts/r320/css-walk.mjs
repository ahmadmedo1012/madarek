/**
 * css-walk.mjs — the shared CSS source walker for the R320 lints
 * (duplicate-selector-lint.mjs + hover-guard-lint.mjs).
 *
 * Adapted from scripts/r319/paired-state-lint.mjs's walker (the c1-A
 * CSSOM-walking approach — comments stripped newline-preserving so
 * line pins stay exact, quotes respected, one manual scan) and
 * EXTENDED to record what the R320 rules need:
 *
 *   · the full @media chain (preludes, in order) around every rule —
 *     the hover guard asks "is there a (hover: hover) anywhere in
 *     the chain?" and the duplicate lint keys by the equivalent
 *     media context (the @supports chain is recorded separately and
 *     joins the duplicate key too — a supports condition is as much
 *     a context as a media one);
 *   · the @layer chain (recorded, shown in reports, NOT part of the
 *     duplicate key — intentional cross-layer cascade overrides are
 *     an allowlist reason, not an auto-pass);
 *   · @keyframes/@font-face/@property bodies are SKIPPED (frame
 *     steps like `0%` are not selectors; a font-face `font-family`
 *     is not a declaration conflict);
 *   · native-nested rules (a style-rule frame inside a style-rule
 *     frame) are skipped but counted — the repo's sheets are flat.
 *
 * Plain node, zero deps. Nothing here executes; import the pieces.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** Strip /* … *​/ comments, preserving line count (exact line pins). */
export function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, (m) => '\n'.repeat((m.match(/\n/g) ?? []).length));
}

/** Normalize a media prelude for equivalence: lowercase + no whitespace. */
export function normMedia(prelude) {
  return (prelude || '').replace(/\s+/g, '').toLowerCase();
}

/** Normalize a declaration value: collapse whitespace, case-insensitive
 * (CSS values are case-insensitive outside custom-property names and
 * strings — a missed rare conflict is the safe direction for a FAIL
 * gate, a false conflict is not). */
export function normValue(value) {
  return (value || '').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Normalize one compound selector segment (comma-split by the caller). */
export function normSelector(seg) {
  return (seg || '').replace(/\s+/g, ' ').trim();
}

/** Split a selector prelude on TOP-LEVEL commas only — commas inside
 * `:is(…)`/`:where(…)`/`:not(…)`/attribute selectors stay in their
 * segment (`a:is(:hover, :focus)` is ONE selector, not three broken
 * halves — broken halves would mint false duplicate keys when two
 * different functional lists share a prefix). */
export function splitSelectorList(prelude) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of prelude || '') {
    if (ch === '(' || ch === '[') depth += 1;
    else if (ch === ')' || ch === ']') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) { out.push(cur); cur = ''; continue; }
    cur += ch;
  }
  out.push(cur);
  return out.map(normSelector).filter(Boolean);
}

/** Does a media chain contain a `hover: hover` feature?
 * (`any-hover: hover` is NOT a guard — it says SOME input can hover,
 * not the primary one; the B1 defect lives exactly there.) */
export function chainHasHoverGuard(mediaChain) {
  return mediaChain.some((p) => /\(\s*hover\s*:\s*hover\s*\)/i.test(p));
}

/**
 * Walk one stylesheet's text. Returns:
 *   { rules: Rule[], nested: number }
 * Rule = { selector, segs: string[], decls: [{prop, value, line}],
 *          mediaChain: string[], layerChain: string[], line }
 * Rules inside @keyframes/@font-face/@property frames are dropped.
 */
export function walkRules(text) {
  const rules = [];
  const stack = []; // { prelude, kind, decls, startLine }
  let nested = 0;
  let buf = '';
  let line = 1;
  let quote = null;

  let declBuf = '';
  let declStart = null;

  const frameKind = (prelude) => {
    if (/^@media/i.test(prelude)) return 'media';
    if (/^@layer/i.test(prelude)) return 'layer';
    if (/^@supports/i.test(prelude)) return 'supports';
    if (/^@(keyframes|-webkit-keyframes)/i.test(prelude)) return 'keyframes';
    if (/^@font-face/i.test(prelude)) return 'font-face';
    if (prelude.startsWith('@')) return 'other-at';
    return 'style';
  };

  const inStyleRule = () => {
    const top = stack[stack.length - 1];
    return top && top.kind === 'style';
  };

  const flushDecl = () => {
    const chunk = declBuf.trim();
    const top = stack[stack.length - 1];
    if (chunk && top && top.kind === 'style') {
      const colon = chunk.indexOf(':');
      if (colon > 0) {
        top.decls.push({
          prop: chunk.slice(0, colon).trim(),
          value: chunk.slice(colon + 1).trim(),
          line: declStart ?? line,
        });
      }
    }
    declBuf = '';
    declStart = null;
  };

  let i = 0;
  const n = text.length;
  while (i < n) {
    const ch = text[i];
    if (ch === '\n') line += 1;

    if (quote) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === quote) quote = null;
      if (inStyleRule()) {
        if (declStart === null) declStart = line;
        declBuf += ch;
      } else {
        buf += ch; // quoted attribute values stay in the selector text
      }
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") {
      quote = ch;
      if (inStyleRule()) {
        if (declStart === null) declStart = line;
        declBuf += ch;
      } else {
        buf += ch;
      }
      i += 1;
      continue;
    }
    if (ch === '{') {
      const prelude = buf.trim();
      const kind = frameKind(prelude);
      const frame = { prelude, kind, decls: [], startLine: line };
      stack.push(frame);
      if (kind === 'style') {
        // Frames that are NOT selector contexts: keyframe steps
        // (`from`/`0%` are not selectors), font-face, property. Rules
        // under them are dropped entirely.
        const blocked = stack.some((f) => f.kind === 'keyframes' || f.kind === 'font-face' || f.kind === 'other-at');
        // Native nesting: a style rule inside a style rule — skip the
        // inner one (the repo's sheets are flat; counted, never parsed).
        const nestedRule = stack.slice(0, -1).some((f) => f.kind === 'style' || f.kind === 'nested');
        if (blocked) {
          frame.kind = 'blocked';
        } else if (nestedRule) {
          frame.kind = 'nested';
          nested += 1;
        } else {
          rules.push({
            selector: prelude,
            segs: splitSelectorList(prelude),
            decls: frame.decls,
            mediaChain: stack.filter((f) => f.kind === 'media').map((f) => f.prelude),
            supportsChain: stack.filter((f) => f.kind === 'supports').map((f) => f.prelude),
            layerChain: stack.filter((f) => f.kind === 'layer').map((f) => f.prelude),
            line: frame.startLine,
          });
        }
      }
      buf = '';
      declBuf = '';
      declStart = null;
      i += 1;
      continue;
    }
    if (ch === '}') {
      flushDecl();
      stack.pop();
      buf = '';
      declBuf = '';
      declStart = null;
      i += 1;
      continue;
    }
    if (ch === ';') {
      if (inStyleRule()) flushDecl();
      else { buf = ''; declBuf = ''; declStart = null; } // @import / one-line at-rules
      i += 1;
      continue;
    }
    if (inStyleRule() || (stack[stack.length - 1] && stack[stack.length - 1].kind === 'nested')) {
      if (declStart === null && !/\s/.test(ch)) declStart = line;
      declBuf += ch;
    } else {
      buf += ch;
    }
    i += 1;
  }
  return { rules, nested };
}

/**
 * Every CSS file under a root dir (recursive, sorted, relative paths).
 */
export function cssFiles(rootDir) {
  const out = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.css')) out.push(full);
    }
  };
  walk(rootDir);
  return out.sort();
}

/** Read + strip + walk one file. */
export function walkFile(absPath) {
  const raw = readFileSync(absPath, 'utf-8');
  return walkRules(stripComments(raw));
}

/**
 * The CSS import graph of frontend/src: scan every .ts/.tsx/.mts/.js
 * module for `import("…foo.css")` / `import '…foo.css'` statements and
 * return the set of CSS BASENAMES actually reachable from code. A
 * stylesheet whose basename never appears is never loaded by the app —
 * its rules can never compose with an app sheet at runtime (the B1
 * bug class needs TWO LOADED files). Used by the duplicate lint to
 * exempt the parity EXPORT artifacts (unified-parity.css /
 * shared-design-system.css — deliberately not in main.tsx's chain).
 */
export function importedCssBasenames(srcDir) {
  const imported = new Set();
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === 'node_modules') continue;
        walk(full);
      } else if (/\.(ts|tsx|mts|js|mjs|jsx)$/.test(entry.name)) {
        const text = readFileSync(full, 'utf-8');
        for (const m of text.matchAll(/['"]([^'"]+\.css)['"]/g)) {
          const base = m[1].split('/').pop();
          if (base) imported.add(base);
        }
      }
    }
  };
  walk(srcDir);
  return imported;
}
