#!/usr/bin/env node
/* r304 one-off: sync the parity pair to the design-tokens rewrite.
 * Reuses the verifier's exact parse/resolve logic by importing it as
 * text and evaluating — no drift between the sync and the gate. */
import { readFileSync, writeFileSync } from 'node:fs';

const ROOT = new URL('.', import.meta.url).pathname;
const verifierPath = ROOT + 'verify-parity-export.mjs';
let src = readFileSync(verifierPath, 'utf8');

/* ── load the verifier's helpers up to "Gate 3" without executing gates ── */
const cut = src.indexOf('/* ── Gate 3');
const head = src.slice(0, cut)
  .replace(/const canonBlocks[\s\S]*$/, '')
  .replace(/^#!.*$/m, '');
/* The head defines: PATHS, read, stripComments, parseDecls, walkBlocks,
   parseCss, selectorTier, buildThemeMap, readBalanced, resolveValue, norm. */
const helpers = head
  .slice(head.indexOf('const ROOT'))
  .replace(/\nconst maps[\s\S]*$/, '')
  .replaceAll('import.meta.url', JSON.stringify(new URL('verify-parity-export.mjs', import.meta.url).href));
const fnLib = new Function('join', 'dirname', 'fileURLToPath', 'readFileSync', helpers + `
  return { PATHS, read, parseCss, buildThemeMap, resolveValue, norm };`);
import { join as _join, dirname as _dirname } from 'node:path';
import { fileURLToPath as _f2p } from 'node:url';
import { readFileSync as _rfs } from 'node:fs';
const { PATHS, read, parseCss, buildThemeMap, resolveValue, norm } = fnLib(_join, _dirname, _f2p, _rfs);

/* ── CHECKS ── */
const checksSrc = src.slice(src.indexOf('const CHECKS = ['));
const checksLiteral = checksSrc.slice(checksSrc.indexOf('['), checksSrc.indexOf('\n];') + 3);
const CHECKS = new Function(`return ${checksLiteral};`)();

const canonCss = read(PATHS.canonical);
const parityCss = read(PATHS.parity);
const canonBlocks = parseCss(canonCss);
const parityBlocks = parseCss(parityCss);
const maps = {
  canonical: { light: buildThemeMap(canonBlocks, 'light'), dark: buildThemeMap(canonBlocks, 'dark') },
  parity: { light: buildThemeMap(parityBlocks, 'light'), dark: buildThemeMap(parityBlocks, 'dark') },
};

/* ── locate declaration spans in a css text for (token, tier) ── */
function findDeclSpans(css, token, theme) {
  const attr = '[data-theme="dark"]';
  const text = css.replace(/\/\*[\s\S]*?\*\//g, (m) => ' '.repeat(m.length));
  const spans = [];
  /* recursive scan: classify each leaf block by its ancestor chain */
  const walk = (i, selStart, ancestors) => {
    while (i < text.length) {
      const ch = text[i];
      if (ch === '{') {
        const sel = text.slice(selStart, i).trim();
        let depth = 1; let j = i + 1;
        while (j < text.length && depth > 0) {
          if (text[j] === '{') depth++;
          else if (text[j] === '}') depth--;
          j++;
        }
        const body = text.slice(i + 1, j - 1);
        const isAt = sel.startsWith('@');
        const isKeyframes = sel.startsWith('@keyframes');
        if (isKeyframes) { i = j; selStart = j; continue; }
        if (isAt && !sel.startsWith('@media')) {
          /* @layer/@supports — recurse transparently */
          walk(i + 1, i + 1, ancestors);
        } else if (isAt && sel.startsWith('@media')) {
          walk(i + 1, i + 1, ancestors.concat(sel));
        } else {
          /* leaf or nested? check whether body contains a '{' at top level */
          let hasNested = false; let d = 0;
          for (let k = 0; k < body.length; k++) {
            if (body[k] === '{') { d++; hasNested = true; break; }
            if (body[k] === '}') break;
          }
          if (hasNested) {
            walk(i + 1, i + 1, ancestors.concat(sel));
          } else {
            /* leaf block — match tier */
            const parts = sel.split(',').map((x) => x.trim()).filter(Boolean);
            let tier = 0;
            for (const p of parts) {
              const inMedia = ancestors.some((a) => a.startsWith('@media'));
              if (inMedia) continue;
              if (theme === 'light') {
                if (p === ':root' || p === '[data-theme="light"]' || p === ':root[data-theme="light"]') tier = 1;
              } else {
                if (p === attr || p === `:root${attr}`) tier = 1;
              }
            }
            if (tier === 1) {
              const bStart = i + 1;
              let off = 0;
              for (const part of body.split(';')) {
                const partStart = bStart + off;
                off += part.length + 1;
                /* name must be the part's LEADING custom property, and the
                 * match must sit before any var() reference in the part */
                const t = part.trim();
                const colon = t.indexOf(':');
                if (colon === -1) continue;
                const name = t.slice(0, colon).trim();
                if (name !== token) continue;
                const lead = part.indexOf(name);
                if (part.slice(lead, part.indexOf(':')).includes('var(')) continue;
                spans.push({ start: partStart + lead, end: partStart + part.length + 1, value: t.slice(colon + 1).trim() });
              }
            }
          }
        }
        i = j; selStart = j;
      } else if (ch === '}' || ch === ';') { i++; selStart = i; }
      else i++;
    }
  };
  walk(0, 0, []);
  return spans;
}

const pinEdits = [];
const exportEdits = [];
const inserts = [];

for (const [theme, token, pinned, note] of CHECKS) {
  const mapKey = theme === 'root' ? 'light' : theme;
  const canonRaw = maps.canonical[mapKey].get(token) ?? '';
  const canon = resolveValue(canonRaw, maps.canonical[mapKey]);
  const canonN = canon === null ? null : norm(canon);
  if (canonN === null) { console.log(`SKIP (canonical unresolved) ${theme} ${token}`); continue; }

  if (pinned !== null && norm(pinned) !== canonN) {
    pinEdits.push({ token, theme, from: pinned, to: canon.trim() });
  }
  const parityRaw = maps.parity[mapKey].get(token);
  const parity = parityRaw === undefined ? null : resolveValue(parityRaw, maps.parity[mapKey]);
  if (parity === null || norm(parity) !== canonN) {
    exportEdits.push({ token, theme, to: canon.trim(), had: parityRaw !== undefined });
  }
}

/* ── apply pin edits (string replace of the pinned literal inside its row) ── */
let newVerifier = src;
for (const e of pinEdits) {
  const needle = `'${e.token}', '${e.from}'`;
  if (!newVerifier.includes(needle)) {
    /* multi-line row forms: ['theme',\n    '--token',\n    'value', */
    const re = new RegExp(`'${e.token.replace(/-/g, '\\-')}',\\s*'${e.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`);
    if (!re.test(newVerifier)) { console.log(`PIN NOT FOUND: ${e.theme} ${e.token} ${e.from}`); continue; }
    newVerifier = newVerifier.replace(re, `'${e.token}', '${e.to.replace(/'/g, "\\'")}'`);
  } else {
    newVerifier = newVerifier.replace(needle, `'${e.token}', '${e.to.replace(/'/g, "\\'")}'`);
  }
}

/* ── apply export edits: rewrite the LAST decl of (token,tier) to the
      canonical RAW value (raw is resolvable within the export because the
      canonical chain resolves inside tokens.css tiers whose variables the
      export also defines; the undefined-var audit will catch any miss) ── */
let newParity = parityCss;
const applyTheme = (theme) => (theme === 'root' ? 'light' : theme);
const done = new Set();
for (const e of exportEdits) {
  const mk = applyTheme(e.theme);
  if (e.had) {
    const spans = findDeclSpans(newParity, e.token, mk);
    if (!spans.length) { inserts.push(e); continue; }
    const last = spans[spans.length - 1];
    newParity = newParity.slice(0, last.start) + `${e.token}: ${e.to};` + newParity.slice(last.end);
    done.add(`${e.theme}:${e.token}`);
  } else inserts.push(e);
}

/* inserts: append into the export's :root or dark primary block */
function insertIntoBlock(css, theme, decls) {
  /* find the first :root (theme=light) or [data-theme="dark"] leaf block */
  const text = css;
  const marker = theme === 'dark' ? '[data-theme="dark"]' : ':root';
  let idx = 0;
  for (;;) {
    idx = text.indexOf(marker, idx + 1);
    if (idx === -1) return css;
    const open = text.indexOf('{', idx);
    /* close block */
    let depth = 1; let j = open + 1;
    while (j < text.length && depth > 0) {
      if (text[j] === '{') depth++;
      else if (text[j] === '}') depth--;
      j++;
    }
    const sel = text.slice(idx - 8, idx).trim();
    if (sel.startsWith('@')) continue;
    const insert = '\n' + decls.map((d) => `  ${d.token}: ${d.to};`).join('\n') + '\n';
    return text.slice(0, j - 1) + insert + text.slice(j - 1);
  }
}
if (inserts.length) {
  const lightIns = inserts.filter((e) => applyTheme(e.theme) === 'light');
  const darkIns = inserts.filter((e) => applyTheme(e.theme) === 'dark');
  if (lightIns.length) newParity = insertIntoBlock(newParity, 'light', lightIns);
  if (darkIns.length) newParity = insertIntoBlock(newParity, 'dark', darkIns);
}

writeFileSync(verifierPath, newVerifier);
writeFileSync(PATHS.parity, newParity);
console.log(`pins updated: ${pinEdits.length} · export values rewritten: ${done.size} · inserted: ${inserts.length}`);
for (const e of inserts) console.log(`  + ${e.theme} ${e.token} = ${e.to.slice(0, 60)}`);
