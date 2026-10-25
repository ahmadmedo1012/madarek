#!/usr/bin/env node
/**
 * gate.mjs — R319 §E — THE EXTENDED DEFECT GATE (extends gate:r318,
 * never replaces it — scripts/r318/defect-gate.mjs stays the landing
 * gate; this one owns the AUTHENTICATED product + state-contrast).
 *
 * Checks (one orchestrator, five families):
 *
 *   E8  state-contrast — every interactive element (a, button,
 *       [role=button|tab|menuitem|option], input, select, summary,
 *       label) on every route × viewport × theme with EACH state
 *       FORCED via CDP CSS.forcePseudoState (rest, :hover, :active,
 *       :focus, :focus-visible, :focus-within). Effective fg vs
 *       effective backdrop (opaque-ancestor walk, alpha compositing
 *       — the same gate-lib.mjs math as gate:r318). WCAG 4.5:1 <24px
 *       text, 3:1 ≥24px text AND icon-only elements (svg-only
 *       content). Mobile cells (≤920px) run hasTouch+isMobile with
 *       Emulation.setEmulatedMedia hover:none/pointer:coarse and get
 *       TWO passes — shell at rest AND drawer open (the B1 defect
 *       lives in the drawer rows' forced :hover); desktop cells run
 *       hover fine, one pass. Decorative aria-hidden subtrees are
 *       exempt (the r318 WCAG 1.4.3 pattern).
 *
 *   E9  paired — spawns `node scripts/r319/paired-state-lint.mjs`
 *       (Agent A c1-A). Missing script → SKIPPED-with-reason — the
 *       gate NEVER crashes on a missing sibling check.
 *
 *   E10 leaks — authed routes: body.innerText vs leak patterns
 *       — the regexes are IMPORTED from the runtime layer
 *       (frontend/src/utils/display-text.ts, esbuild-bundled below)
 *       exactly as leak-rules.md prescribes: "the gate should IMPORT
 *       the same regexes, never re-type them". Hard fails: raw
 *       revision codes (REVISION_CODE_RE), /\btest\b/i,
 *       undefined/null/NaN, the seed placeholder institution shapes
 *       «قسم اختبار»/«كلية اختبار» (PLACEHOLDER_INSTITUTION_RE on
 *       innerText segments — «اختبار» alone is LEGAL, «قاعة الاختبار»
 *       is a real room), and the forbidden RLM date shape
 *       \d{2}\u200F/\d{2} (leak-rules §4 — the photographed «01/15»
 *       defect; mono index labels exempt). Written-reason allowlist
 *       scripts/r319/leak-allowlist.json. WARN rows (not yet hard
 *       fails): Arabic-Indic/Persian digits in visible text (the
 *       platform convention is Latin — leak-rules §1), and
 *         NEEDS-bdi mixed runs (percent/code/clock/date shapes —
 *         leak-rules §5) without a bdi/[dir] isolate ancestor;
 *         bidi-safe prose counts («السنة 3») are deliberately NOT
 *         flagged. Hard-fail comes when Agent C's util lands
 *         everywhere.
 *
 *   E11 shell — authed @390 touch: bottom bar opaque (bg alpha 1),
 *       no text visible through the bar (text behind + translucent
 *       bar = visible through; an opaque bar cannot show anything
 *       through), content padding reserve (the measured tail padding
 *       — max of .content/.content-inner/.page, the elements the
 *       reserve actually lives on — ≥ bar height + safe-area + 8, OR
 *       the bottom-clearance proof: at full scroll no text leaf sits
 *       under the dock), drawer rows not clipped (scroller fits or
 *       scrolls + last .nav-group label fully inside after
 *       scrollIntoView), scrim on-palette (alpha ∈ [0.5, 0.95], NOT
 *       the old #8e8e8a grey rgb(142,142,138)).
 *
 *   E12 material — per authed route: 7px sheet frame present,
 *       grain layer rendered, ≥1 mono index label (computed
 *       font-family resolves to the mono var), ≥1 indicator
 *       (progress/gauge/chip/meter), NO round avatar (borderRadius
 *       0), no rounded chrome (radius-allowlist.json excepted; >50
 *       offending sigs → WARN — the sweep is Cycle-2+ work).
 *
 * Ratchet: --baseline scripts/r319/gate-baseline.json. First run
 * writes it; later runs exit 1 ONLY on regressions (a FAIL row's
 * number worse than baseline, or a FAIL row the baseline never
 * saw). FAIL rows matching the baseline numbers are the ratchet —
 * open board tickets, exit 0. --update-baseline re-seats. --quick
 * and full runs share the key space (route|viewport|theme|check):
 * after widening scope, re-seat the baseline once.
 *
 * CLI:
 *   node scripts/r319/gate.mjs [--viewports 390,768,1440]
 *     [--routes landing,student-dashboard,teacher-dashboard,admin-dashboard,quality-dashboard,owner-dashboard]
 *     [--only state-contrast,leaks,shell,material,paired] [--quick]
 *     [--base-url http://…] [--port 4215] [--max-elements 400]
 *     [--out audits/evidence/r319/gate.md]
 *     [--baseline scripts/r319/gate-baseline.json] [--update-baseline]
 *
 * Exit 0 green / 0 with ratchet FAILs / 1 on REGRESSIONS / 2 harness
 * fatal. Evidence: markdown + JSON twin alongside. The gate spawns
 * its OWN vite dev server (--port, strictPort) and kills it after —
 * it never touches 5173 or any other agent's port.
 */
import { spawn, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { setTimeout as sleep } from 'node:timers/promises';
import esbuild from 'esbuild';
import { chromium } from 'playwright-core';
import {
  compositeOver,
  contrastRatio,
  parseColor,
  requiredRatio,
  resolveBackdrop,
} from '../r318/gate-lib.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const HERE = path.dirname(fileURLToPath(import.meta.url));
const VIEWPORT_H = { 390: 844, 768: 1024, 1440: 900 };
const DEFAULT_VIEWPORTS = '390,768,1440';
const QUICK_VIEWPORTS = '390,1440';
const DEFAULT_ROUTES = 'landing,student-dashboard,teacher-dashboard,admin-dashboard,quality-dashboard,owner-dashboard';
const QUICK_ROUTES = 'landing,student-dashboard';
const THEMES = ['light', 'dark'];
const STATES = ['rest', 'hover', 'active', 'focus', 'focus-visible', 'focus-within'];
const SETTLE_MS = 320;            // transition settle belt (reducedMotion=reduce makes most instant)
const STATE_BUDGET_MS = 2000;     // §E-8 perf budget per state batch
const OLD_SCRIM_GREY = 'rgb(142, 142, 138)'; // #8e8e8a — the retired flat scrim
const CHROME_RADIUS_WARN_FLOOR = 50;
const SHELL_VIEWPORT = 390;       // §E-11: shell geometry rides the 390 touch context

/* FAIL rows map to R319 board tickets — printed with every failing row. */
const TICKETS = {
  'state-contrast': 'B1/B2 (paired state tokens + dashboard ink)',
  'leaks/hard': 'B2 seed leaks (C1-C utils)',
  'leaks/rlm-date': 'B2 forbidden date shape (C1-C arDate)',
  'leaks/numerals': 'B2 mixed numerals (C1-C utils — WARN until then)',
  'leaks/bidi': 'B2 bidi isolation (C1-C utils — WARN until then)',
  'shell/bar-opaque': 'B2 (bottom bar rebuild — c1-A)',
  'shell/bar-bleed': 'B2 (translucent bar: text visible through)',
  'shell/padding-reserve': 'B2 (bottom bar rebuild — c1-A)',
  'shell/drawer-clip': 'B1b (drawer rebuild — c1-A)',
  'shell/scrim-palette': 'B1b (scrim ink@55-60% — c1-A)',
  'material/frame': 'B2 (sheet chrome lands C2)',
  'material/grain': 'B2 (sheet chrome lands C2)',
  'material/mono-index': 'B2 (mono index labels land C2)',
  'material/indicator': 'B2 (indicators land C2)',
  'material/avatar-square': 'B2 (square avatar — c1-A/C2)',
  'material/chrome-radius': 'B2 (radius-0 chrome — C2+, WARN while >50)',
  paired: 'B1 (paired-state lint — c1-A)',
};

const ROUTES = {
  landing: { path: '/', role: null },
  'student-dashboard': { path: '/student/dashboard', role: 'STUDENT' },
  'teacher-dashboard': { path: '/teacher/dashboard', role: 'TEACHER' },
  'admin-dashboard': { path: '/admin/dashboard', role: 'ADMIN' },
  'quality-dashboard': { path: '/quality/dashboard', role: 'QUALITY' },
  'owner-dashboard': { path: '/owner/dashboard', role: 'OWNER' },
};

/* ── CLI ────────────────────────────────────────────────────────────── */
function parseArgs(argv) {
  const opt = {
    viewports: DEFAULT_VIEWPORTS,
    routes: DEFAULT_ROUTES,
    only: new Set(),
    quick: false,
    baseUrl: null,
    port: 4215,
    maxElements: 400,
    out: 'audits/evidence/r319/gate.md',
    baseline: path.relative(ROOT, path.join(HERE, 'gate-baseline.json')),
    updateBaseline: false,
  };
  const next = (i, dflt) => {
    const v = argv[i + 1];
    return v && !v.startsWith('--') ? v : dflt;
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    const inline = a.includes('=') ? a.slice(a.indexOf('=') + 1) : undefined;
    if (a === '--quick') opt.quick = true;
    else if (a.startsWith('--viewports')) { opt.viewports = inline ?? next(i, opt.viewports); i += inline ? 0 : 1; }
    else if (a.startsWith('--routes')) { opt.routes = inline ?? next(i, opt.routes); i += inline ? 0 : 1; }
    else if (a.startsWith('--only')) { const v = inline ?? next(i, ''); (v || '').split(',').map((s) => s.trim()).filter(Boolean).forEach((s) => opt.only.add(s)); i += inline ? 0 : 1; }
    else if (a.startsWith('--base-url')) { opt.baseUrl = inline ?? next(i, opt.baseUrl); i += inline ? 0 : 1; }
    else if (a.startsWith('--port')) { opt.port = parseInt(inline ?? next(i, String(opt.port)), 10); i += inline ? 0 : 1; }
    else if (a.startsWith('--max-elements')) { opt.maxElements = parseInt(inline ?? next(i, '400'), 10); i += inline ? 0 : 1; }
    else if (a.startsWith('--out')) { opt.out = inline ?? next(i, opt.out); i += inline ? 0 : 1; }
    else if (a.startsWith('--baseline')) { opt.baseline = inline ?? next(i, opt.baseline); i += inline ? 0 : 1; }
    else if (a === '--update-baseline') opt.updateBaseline = true;
  }
  if (opt.quick) {
    if (opt.viewports === DEFAULT_VIEWPORTS) opt.viewports = QUICK_VIEWPORTS;
    if (opt.routes === DEFAULT_ROUTES) opt.routes = QUICK_ROUTES;
    opt.maxElements = 60;
  }
  return opt;
}

/* ── hermetic transport (the REAL e2e fixtures, esbuild-bundled) ────── */
/* The gate reuses tests/e2e/fixtures/mock-transport.ts + api-fixtures.ts
 * verbatim (installMockApi + seedSession — the same primitives the e2e
 * fixture wires), so the gate and the journey suite can never drift.
 * Plain node cannot import the TS sources directly (extensionless
 * relative imports), so the gate bundles the two fixture files with the
 * repo's own esbuild into a content-hashed tmp cache; the media/ sibling
 * satisfies the module-top readFileSync('media/lecture.mp4').
 * display-text.ts (Agent C's runtime leak layer) rides the SAME bundle
 * so §E-10 scans with the exported REVISION_CODE_RE /
 * PLACEHOLDER_INSTITUTION_RE — imported, never re-typed (leak-rules.md). */
async function ensureTransport() {
  const srcDir = path.join(ROOT, 'frontend/tests/e2e/fixtures');
  const sources = ['mock-transport.ts', 'api-fixtures.ts'].map((f) => path.join(srcDir, f));
  const displayText = path.join(ROOT, 'frontend/src/utils/display-text.ts');
  const hash = crypto
    .createHash('sha1')
    .update([...sources, displayText].map((f) => fs.readFileSync(f)).join(''))
    .digest('hex')
    .slice(0, 12);
  const dir = path.join(os.tmpdir(), `r319-gate-${hash}`);
  const out = path.join(dir, 'transport.mjs');
  if (!fs.existsSync(out)) {
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(path.join(dir, 'media'), { recursive: true });
    fs.copyFileSync(path.join(srcDir, 'media/lecture.mp4'), path.join(dir, 'media/lecture.mp4'));
    esbuild.buildSync({
      stdin: {
        contents: `
          export { installMockApi, seedSession, standardRoutes, STUDENT_USER, TEACHER_USER } from ${JSON.stringify(sources[0])};
          export { ADMIN_USER, OWNER_USER, QUALITY_USER, FIXED_NOW_ISO } from ${JSON.stringify(sources[1])};
          export { REVISION_CODE_RE, PLACEHOLDER_INSTITUTION_RE } from ${JSON.stringify(displayText)};
        `,
        resolveDir: srcDir,
        loader: 'ts',
      },
      bundle: true,
      format: 'esm',
      platform: 'node',
      outfile: out,
      logLevel: 'silent',
    });
  }
  return import(`${pathToFileURL(out).href}?v=${hash}`);
}

/* ── vite dev server (spawned on the gate's OWN port, killed after) ── */
function spawnVite(port) {
  const bin = path.join(ROOT, 'node_modules/.bin/vite');
  return spawn(bin, ['--port', String(port), '--strictPort', '--host', '127.0.0.1'], {
    cwd: path.join(ROOT, 'frontend'),
    stdio: ['ignore', 'ignore', 'ignore'],
    detached: true,
  });
}

async function waitReady(baseUrl, timeoutMs = 90000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) {
    try {
      const r = await fetch(`${baseUrl}/`);
      if (r.ok) return true;
    } catch { /* booting */ }
    await sleep(400);
  }
  return false;
}

function killTree(child) {
  if (!child || child.exitCode != null) return;
  try { process.kill(-child.pid, 'SIGTERM'); } catch { /* already gone */ }
  setTimeout(() => { try { process.kill(-child.pid, 'SIGKILL'); } catch { /* already gone */ } }, 900).unref();
}

/* ── in-page collectors (serialized by SOURCE — self-contained) ─────── */
const RAF2 = () => new Promise((res) => requestAnimationFrame(() => requestAnimationFrame(res)));

/* §E-8 marking: cap + dedupe by selector signature + visibility +
 * decorative/aria-hidden exemption (the r318 WCAG 1.4.3 pattern).
 * Takes ONE object arg — Playwright's evaluate passes a single arg. */
const MARK_PASS = ({ cap, scopeSelector }) => {
  const INTERACTIVE = 'a, button, [role="button"], [role="tab"], [role="menuitem"], [role="option"], input, select, summary, label';
  const isShown = (el) => {
    try { if (!el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false; }
    catch { const cs0 = getComputedStyle(el); if (cs0.display === 'none' || cs0.visibility === 'hidden') return false; }
    let q = el;
    while (q && q.nodeType === 1) { if (parseFloat(getComputedStyle(q).opacity) < 0.05) return false; q = q.parentElement; }
    return true;
  };
  const candidates = [];
  if (scopeSelector) { for (const r of document.querySelectorAll(scopeSelector)) candidates.push(...r.querySelectorAll(INTERACTIVE)); }
  else candidates.push(...document.querySelectorAll(INTERACTIVE));
  const seen = new Set();
  const marked = [];
  const docH = document.documentElement.scrollHeight;
  const vw = window.innerWidth;
  for (const el of candidates) {
    if (marked.length >= cap) break;
    if (el.closest('[aria-hidden="true"]')) continue; // decorative subtree (r318 exemption shape)
    if (!isShown(el)) continue;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) continue;
    if (r.left >= vw || r.right <= 0 || r.bottom <= 0 || r.top > docH) continue; // offscreen
    const sig = el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].join('.') : '');
    if (seen.has(sig)) continue; // dedupe by selector — same classes, same styling
    seen.add(sig);
    el.setAttribute('data-gate-idx', String(marked.length));
    marked.push(sig);
  }
  return { totalCandidates: candidates.length, marked: marked.length, sigs: marked };
};

const CLEAR_MARKS = () => {
  document.querySelectorAll('[data-gate-idx]').forEach((el) => el.removeAttribute('data-gate-idx'));
};

const COLLECT_STATE = () => {
  const isOpaque = (s) => {
    const v = (s || '').trim();
    return /^rgb\(/.test(v) || /^rgba\([^)]*,\s*1\)$/.test(v) || /^color\(srgb [^/]+\)$/.test(v) || /^color\(srgb [^/]*\/\s*1\)$/.test(v) || /^#([0-9a-f]{6}|[0-9a-f]{8})$/i.test(v);
  };
  /* Own-element ::before/::after backdrops — the state-wipe pattern
   * (.btn / .fo-nav-link): a z-index:-1 pseudo slides an OPAQUE slab
   * under the label on hover/focus-visible while the label color
   * swaps in lockstep. The ancestor walk cannot see pseudos, so the
   * honest fix is to read the pseudo's computed style here: when it
   * paints (absolute + non-transparent bg + transform NOT slid away)
   * it is the layer DIRECTLY under the text — chain[0], ahead of the
   * element's own background (negative-z children paint above the
   * element bg, below in-flow content). */
  const pseudoBackdrop = (el, pseudo, rect) => {
    try {
      const cs = getComputedStyle(el, pseudo);
      if (!cs || cs.content === 'none' || cs.content === 'normal') return null;
      if (cs.position !== 'absolute' && cs.position !== 'fixed') return null;
      const bg = cs.backgroundColor;
      if (!bg || /^(rgba\(0, 0, 0, 0\)|transparent)$/.test(bg.trim())) return null;
      // Only a NEGATIVE z-index pseudo paints BELOW the in-flow text
      // (z auto/0/+ paints above it — an overlay, never a backdrop).
      const z = parseInt(cs.zIndex, 10);
      if (Number.isNaN(z) || z >= 0) return null;
      const tr = cs.transform;
      if (tr && tr !== 'none') {
        const m = /matrix\(([^)]+)\)/.exec(tr);
        if (!m) return null; // 3d/unknown — do not guess
        const parts = m[1].split(',').map(Number);
        const sx = Math.abs(parts[0] || 0);
        const sy = Math.abs(parts[3] || 0);
        const tx = Math.abs(parts[4] || 0);
        const ty = Math.abs(parts[5] || 0);
        if (sx < 0.01 || sy < 0.01) return null; // scale-wipe collapsed (scale(0,0)) — nothing paints
        if (ty > rect.height * 0.5 || tx > rect.width * 0.5) return null; // slab slid away (translateY(-101%))
      }
      return bg;
    } catch { return null; }
  };
  const out = [];
  for (const el of document.querySelectorAll('[data-gate-idx]')) {
    try {
      const cs = getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const chain = [];
      let grad = false;
      const ownPseudo = pseudoBackdrop(el, '::before', rect) || pseudoBackdrop(el, '::after', rect);
      if (ownPseudo) chain.push(ownPseudo);
      let q = el;
      while (q && q.nodeType === 1 && chain.length < 40) {
        const c = getComputedStyle(q);
        if (c.backgroundImage.includes('gradient')) grad = true;
        chain.push(c.backgroundColor);
        if (isOpaque(c.backgroundColor)) break;
        q = q.parentElement;
      }
      out.push({
        idx: el.getAttribute('data-gate-idx'),
        sig: el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].join('.') : ''),
        fg: cs.color,
        fs: cs.fontSize,
        iconOnly: !!el.querySelector('svg') && !(el.textContent || '').trim(),
        chain,
        grad,
      });
    } catch { /* element died mid-sweep */ }
  }
  return out;
};

const COLLECT_LEAKS = () => {
  const lines = (document.body.innerText || '').split('\n').map((s) => s.trim()).filter(Boolean);
  const numeralSamples = [];
  const bidiSamples = [];
  const rlmDateSamples = [];
  let numeralCount = 0;
  let bidiCount = 0;
  let rlmDateCount = 0;
  /* leak-rules.md §1: Latin is the ONE numeral convention — ANY
   * Arabic-Indic (٠-٩) or Persian (۰-۹) digit in visible text is a
   * leak (WARN until the hard fail is armed). */
  const AR_INDIC = /[\u0660-\u0669\u06F0-\u06F9]/;
  const AR_SCRIPT = /[\u0591-\u07FF]/;
  /* leak-rules.md §5 — ONLY the NEEDS-bdi shapes: bidi-safe prose
   * counts («السنة 3», «بعد 3 أيام») are deliberately NOT flagged. */
  const BIDI_SHAPES = [
    /\d+\s*%/,                                                   // percent runs «36%»
    /[A-Za-z]+\s*-?\s*\d+|\d+\s*-?\s*[A-Za-z]+/,              // code-ish runs «A2», «CS-201», «SE301»
    /\d{1,2}:\d{2}/,                                            // clocks «19:00»
    /\d{1,2}\s+(?:يناير|فبراير|مارس|أبريل|مايو|يونيو|يوليو|أغسطس|سبتمبر|أكتوبر|نوفمبر|ديسمبر)/, // date phrases «1 فبراير»
  ];
  /* leak-rules.md §4: the forbidden {day:'2-digit',month:'2-digit'}
   * shape renders «01\u200F/02» — 2-digit day + INVISIBLE RLM + slash
   * + 2-digit month. The allowed mono index «15/3» (numeric, unpadded)
   * can never match. Mono-labelled index runs are exempt anyway. */
  const RLM_DATE = /\d{2}\u200F\/\d{2}/;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, { acceptNode: (n) => ((n.nodeValue || '').trim() ? 1 : 2) });
  let n;
  while ((n = walker.nextNode())) {
    const el = n.parentElement;
    if (!el || el.closest('svg') || /^(script|style|noscript)$/.test(el.tagName)) continue;
    const t = (n.nodeValue || '').trim();
    if (AR_INDIC.test(t)) {
      numeralCount += 1;
      if (numeralSamples.length < 8) numeralSamples.push(t.slice(0, 60));
    }
    if (AR_SCRIPT.test(t) && BIDI_SHAPES.some((re) => re.test(t))) {
      const iso = el.closest('bdi, [dir]');
      const isolated = !!(iso && (getComputedStyle(iso).unicodeBidi || '').includes('isolate'));
      if (!isolated) {
        bidiCount += 1;
        if (bidiSamples.length < 8) bidiSamples.push(t.slice(0, 60));
      }
    }
    if (RLM_DATE.test(t) && !el.closest('[class*="mono"]')) {
      rlmDateCount += 1;
      if (rlmDateSamples.length < 8) rlmDateSamples.push(t.slice(0, 60));
    }
  }
  return { lines, numeralCount, numeralSamples, bidiCount, bidiSamples, rlmDateCount, rlmDateSamples };
};

const COLLECT_SHELL = (scrollRatio) => {
  const isShown = (el) => {
    try { return el.checkVisibility({ opacityProperty: true, visibilityProperty: true }); }
    catch { const cs0 = getComputedStyle(el); return cs0.display !== 'none' && cs0.visibility !== 'hidden'; }
  };
  const content = document.querySelector('.content');
  if (content && scrollRatio > 0) {
    const max = content.scrollHeight - content.clientHeight;
    content.scrollTop = scrollRatio >= 1 ? max : Math.round(max * scrollRatio);
  }
  const bar = document.querySelector('.bottom-nav');
  if (!bar || !isShown(bar)) return { bar: null };
  const barRect = bar.getBoundingClientRect();
  const probe = document.createElement('div');
  probe.style.cssText = 'position:fixed;visibility:hidden;padding-bottom:env(safe-area-inset-bottom)';
  document.body.appendChild(probe);
  const safeArea = parseFloat(getComputedStyle(probe).paddingBottom) || 0;
  probe.remove();
  const leaves = [];
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
  let n;
  while ((n = walker.nextNode())) {
    if (bar.contains(n)) continue;
    let hasText = false;
    for (const c of n.childNodes) { if (c.nodeType === 3 && (c.nodeValue || '').trim()) { hasText = true; break; } }
    if (!hasText || n.closest('svg')) continue;
    if (n.closest('.sr-only')) continue; // screen-reader-only text — no visible pixels
    if (!isShown(n)) continue;
    const r = n.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) continue; // degenerate slivers (clip-hidden labels) are not readable text
    const ix = Math.min(r.right, barRect.right) - Math.max(r.left, barRect.left);
    const iy = Math.min(r.bottom, barRect.bottom) - Math.max(r.top, barRect.top);
    if (ix > 0 && iy > 0) leaves.push({ sig: n.tagName.toLowerCase() + '.' + [...n.classList].slice(0, 2).join('.'), text: (n.textContent || '').trim().slice(0, 24), area: +(ix * iy).toFixed(0) });
  }
  leaves.sort((a, b) => b.area - a.area);
  /* The content padding reserve does NOT live on .content (that is the
   * scroller) — base.css puts the mobile dock reserve on .content-inner
   * (calc(--sp-13 128px + safe-area) @≤920) and polish.css on .page
   * (64px + safe-area + rung). Measure every owner and take the max. */
  const padOwners = [
    ['content', content],
    ['content-inner', document.querySelector('.content-inner')],
    ['page', document.querySelector('.page')],
  ].filter(([, el]) => !!el);
  const pads = {};
  for (const [name, el] of padOwners) pads[name] = parseFloat(getComputedStyle(el).paddingBottom) || 0;
  const contentPadBottom = padOwners.length ? Math.max(...Object.values(pads)) : null;
  return {
    bar: {
      bg: getComputedStyle(bar).backgroundColor,
      height: +barRect.height.toFixed(1),
      top: +barRect.top.toFixed(1),
    },
    safeArea: +safeArea.toFixed(1),
    pads,
    contentPadBottom,
    behindBar: leaves.slice(0, 6),
    behindBarCount: leaves.length,
  };
};

const COLLECT_DRAWER = () => {
  const sidebar = document.querySelector('nav.sidebar');
  const nav = document.querySelector('.sidebar-nav');
  const backdrop = document.querySelector('.sidebar-backdrop.show');
  if (!sidebar) return { sidebar: null };
  const visibleLabels = [...document.querySelectorAll('.nav-section-label')].filter((l) => {
    const cs = getComputedStyle(l);
    return cs.display !== 'none' && cs.visibility !== 'hidden';
  });
  const last = visibleLabels[visibleLabels.length - 1] || null;
  if (last) last.scrollIntoView({ block: 'end' });
  const sRect = sidebar.getBoundingClientRect();
  const lRect = last ? last.getBoundingClientRect() : null;
  return {
    sidebar: true,
    nav: nav ? { scrollHeight: nav.scrollHeight, clientHeight: nav.clientHeight, overflowY: getComputedStyle(nav).overflowY } : null,
    backdropBg: backdrop ? getComputedStyle(backdrop).backgroundColor : null,
    labelCount: visibleLabels.length,
    lastLabel: last ? (last.textContent || '').trim() : null,
    lastLabelInside: !!(lRect && lRect.top >= sRect.top - 1 && lRect.bottom <= sRect.bottom + 1 && lRect.left >= sRect.left - 1 && lRect.right <= sRect.right + 1),
    lastLabelBottom: lRect ? +lRect.bottom.toFixed(1) : null,
    sidebarBottom: +sRect.bottom.toFixed(1),
  };
};

const COLLECT_MATERIAL = () => {
  const isShown = (el) => {
    try { return el.checkVisibility({ opacityProperty: true, visibilityProperty: true }); }
    catch { const cs0 = getComputedStyle(el); return cs0.display !== 'none' && cs0.visibility !== 'hidden'; }
  };
  let frame = null;
  for (const el of document.querySelectorAll('.sheet-frame, .auth-frame')) {
    const cs = getComputedStyle(el);
    const inset = [cs.top, cs.right, cs.bottom, cs.left].map((v) => parseFloat(v) || 0);
    frame = { cls: String(el.className), position: cs.position, inset, ok: cs.position === 'fixed' && inset.every((v) => Math.abs(v - 7) <= 1) };
    break;
  }
  const grainEl = document.querySelector('body.mdrk-grain, [class*="grain"]');
  const grain = grainEl ? (grainEl === document.body ? 'body.mdrk-grain' : String(grainEl.className || grainEl.tagName)) : null;
  let monoCount = 0;
  let monoSample = null;
  for (const el of [...document.querySelectorAll('[class*="mono"], [class*="index"], [class*="kicker"], .nav-section-label, .r305s-eyebrow')].slice(0, 200)) {
    if (!isShown(el)) continue;
    if ((getComputedStyle(el).fontFamily || '').includes('Geist Mono')) {
      monoCount += 1;
      if (!monoSample) monoSample = String(el.className).slice(0, 40);
    }
  }
  const indicators = [...document.querySelectorAll('[class*="progress"], [class*="gauge"], [class*="chip"], meter, [role="meter"]')].filter(isShown);
  const avatars = [...document.querySelectorAll('.avatar')].filter(isShown);
  const roundAvatars = avatars.filter((el) => {
    const br = getComputedStyle(el).borderRadius;
    return !(br === '0px' || parseFloat(br) === 0);
  });
  const roundedChrome = [];
  let chromeSwept = 0;
  for (const el of [...document.querySelectorAll('button, .btn, .card, .nav-item, .bottom-nav-item')].slice(0, 250)) {
    if (!isShown(el)) continue;
    chromeSwept += 1;
    const br = getComputedStyle(el).borderRadius;
    if (br !== '0px' && parseFloat(br) > 0) {
      roundedChrome.push(el.tagName.toLowerCase() + (el.classList.length ? '.' + [...el.classList].slice(0, 2).join('.') : ''));
    }
  }
  return {
    frame,
    grain,
    monoCount,
    monoSample,
    indicatorCount: indicators.length,
    indicatorSample: indicators.slice(0, 3).map((e) => String(e.className).slice(0, 36)).join(' | '),
    avatarTotal: avatars.length,
    roundAvatarCount: roundAvatars.length,
    roundAvatarSample: roundAvatars[0] ? getComputedStyle(roundAvatars[0]).borderRadius : null,
    chromeSwept,
    roundedChromeCount: roundedChrome.length,
    roundedChromeTop: [...new Set(roundedChrome)].slice(0, 10),
  };
};

/* ── E8: state-contrast sweep ───────────────────────────────────────── */
async function forceAll(cdp, nodeIds, state) {
  let ok = 0;
  for (const id of nodeIds) {
    if (!id) continue;
    try {
      await cdp.send('CSS.forcePseudoState', { nodeId: id, forcedPseudoClasses: state ? [state] : [] });
      ok += 1;
    } catch { /* node went stale mid-sweep — skip */ }
  }
  return ok;
}

async function resolveNodeIds(cdp, count) {
  const { root } = await cdp.send('DOM.getDocument');
  const ids = [];
  for (let i = 0; i < count; i += 1) {
    try {
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: `[data-gate-idx="${i}"]` });
      ids.push(nodeId);
    } catch { ids.push(0); }
  }
  return ids;
}

async function sweepPass(page, cdp, { cap, scope, passLabel }) {
  const mark = await page.evaluate(MARK_PASS, { cap, scopeSelector: scope });
  if (!mark.marked) {
    return { passLabel, status: 'NA', reason: 'no interactive elements in scope', candidates: mark.totalCandidates, failCount: 0, measured: 0, unknownSkipped: 0, gradientWarn: 0, samples: [], budgetOverruns: 0 };
  }
  /* Node IDs are resolved ONCE — the marked nodes are stable across the
   * forced states (nothing re-renders between CSS.forcePseudoState
   * batches), so re-resolving per state was pure CDP chatter. */
  const nodeIds = await resolveNodeIds(cdp, mark.marked);
  const states = [];
  const batches = [];
  for (const state of STATES) {
    const t0 = Date.now();
    const forced = state === 'rest' ? nodeIds.length : await forceAll(cdp, nodeIds, state);
    await page.evaluate(RAF2);
    await sleep(SETTLE_MS);
    const rows = await page.evaluate(COLLECT_STATE);
    if (state !== 'rest' && forced > 0) await forceAll(cdp, nodeIds, null);
    batches.push({ state, ms: Date.now() - t0 });
    states.push({ state, rows, forced, unforced: state !== 'rest' && forced === 0 });
  }
  await page.evaluate(CLEAR_MARKS);

  // node-side math — gate-lib (the same arithmetic as gate:r318)
  const fails = [];
  let unknown = 0;
  let measured = 0;
  let gradientWarn = 0;
  for (const { state, rows, unforced } of states) {
    if (unforced) {
      // the protocol refused EVERY force call for this state — the rows
      // below are REST styles: never a silent pass, count them unknown.
      unknown += rows.length;
      continue;
    }
    for (const row of rows) {
      measured += 1;
      if (row.grad) gradientWarn += 1; // measured anyway (r318 convention), flagged for the report
      const fg = parseColor(row.fg);
      const bg = resolveBackdrop(row.chain);
      if (!fg || !bg) { unknown += 1; continue; }
      const fs = parseFloat(row.fs) || 16;
      const effFg = fg.a < 1 ? compositeOver(fg, bg) : fg;
      const ratio = contrastRatio(effFg, bg);
      const need = row.iconOnly ? 3 : requiredRatio(fs);
      if (ratio < need - 1e-9) {
        fails.push({ state, ratio: +ratio.toFixed(2), need, fs, iconOnly: row.iconOnly, sig: row.sig.slice(0, 44) });
      }
    }
  }
  fails.sort((a, b) => a.ratio - b.ratio);
  return {
    passLabel,
    status: fails.length ? 'FAIL' : 'PASS',
    failCount: fails.length,
    measured,
    unknownSkipped: unknown,
    gradientWarn,
    unforcedStates: states.filter((s) => s.unforced).map((s) => s.state),
    perState: states.map((s) => ({ state: s.state, fails: fails.filter((f) => f.state === s.state).length, measured: s.unforced ? 0 : s.rows.length, unknown: s.unforced ? s.rows.length : 0 })),
    budgetOverruns: batches.filter((b) => b.ms > STATE_BUDGET_MS).length,
    samples: fails.slice(0, 8).map((f) => `${f.state} «${f.sig}» ${f.ratio}:1 < ${f.need}:1${f.iconOnly ? ' (icon-only)' : ''}`),
  };
}

/* ── E9: paired-token lint ──────────────────────────────────────────── */
function checkPaired() {
  const script = path.join(HERE, 'paired-state-lint.mjs');
  if (!fs.existsSync(script)) {
    return {
      status: 'SKIPPED',
      reason: 'scripts/r319/paired-state-lint.mjs not present in this checkout (c1-A landed it on main — a worktree without it is stale)',
      metric: 0,
      exitCode: null,
    };
  }
  const res = spawnSync('node', [script], { encoding: 'utf8', timeout: 120000, cwd: ROOT });
  const tail = `${res.stdout || ''}\n${res.stderr || ''}`.trim().split('\n').filter(Boolean).slice(-3).join(' ⏎ ');
  return {
    status: res.status === 0 ? 'PASS' : 'FAIL',
    exitCode: res.status,
    tail: tail.slice(0, 200),
    metric: res.status === 0 ? 0 : 1,
  };
}

/* ── E10: leak scan ───────────────────────────────────────────────── */
/* Line patterns: the two data-shape regexes are IMPORTED from the
 * runtime layer (display-text.ts via the transport bundle) — the
 * placeholder shapes are evaluated on innerText SEGMENTS so the
 * anchored PLACEHOLDER_INSTITUTION_RE can do its job while the bare
 * word «اختبار» (a real word) stays legal. */
function buildLeakPatterns(REs) {
  const revRe = new RegExp(REs.REVISION_CODE_RE.source); // de-globalled — .exec() without lastIndex surprises
  const segments = (line) => line.split(/[·•—–|]/).map((s) => s.trim()).filter(Boolean);
  return [
    { name: 'raw-rev-code', match: (line) => revRe.exec(line)?.[0] },
    { name: 'test-word', match: (line) => /\btest\b/i.exec(line)?.[0] },
    { name: 'js-leak', match: (line) => /\bundefined\b|\bnull\b|\bNaN\b/.exec(line)?.[0] },
    {
      name: 'seed-placeholder',
      match: (line) => {
        const seg = segments(line).find((s) => REs.PLACEHOLDER_INSTITUTION_RE.test(s) && s !== 'اختبار');
        return seg; // «قسم اختبار» / «كلية اختبار» — the seed placeholder NAME shapes
      },
    },
  ];
}

async function checkLeaks(page, allowlist, REs) {
  const fact = await page.evaluate(COLLECT_LEAKS);
  const patterns = buildLeakPatterns(REs);
  const allow = (line) => {
    for (const e of allowlist) {
      if (e.contains && line.includes(e.contains)) return e.reason || 'allowlisted';
    }
    return null;
  };
  const fails = [];
  let allowlisted = 0;
  const seenFail = new Set();
  for (const line of fact.lines) {
    for (const p of patterns) {
      const m = p.match(line);
      if (!m) continue;
      const reason = allow(line);
      if (reason) { allowlisted += 1; break; }
      const key = `${p.name}:${line.slice(0, 48)}`;
      if (seenFail.has(key)) break;
      seenFail.add(key);
      fails.push({ pattern: p.name, match: m, line: line.slice(0, 72) });
      break;
    }
  }
  /* leak-rules.md §4 — the forbidden RLM date shape, collected at node
   * level (mono index labels are the sanctioned exception). */
  for (const sample of fact.rlmDateSamples) {
    fails.push({ pattern: 'rlm-date', match: sample.slice(0, 12), line: sample });
  }
  return {
    status: fails.length ? 'FAIL' : 'PASS',
    failCount: fails.length,
    metric: fails.length,
    allowlisted,
    lines: fact.lines.length,
    rlmDateCount: fact.rlmDateCount,
    samples: fails.slice(0, 6).map((f) => `${f.pattern} «${f.match}» …${f.line}…`),
    numerals: { status: fact.numeralCount ? 'WARN' : 'PASS', count: fact.numeralCount, metric: fact.numeralCount, samples: fact.numeralSamples.slice(0, 4) },
    bidi: { status: fact.bidiCount ? 'WARN' : 'PASS', count: fact.bidiCount, metric: fact.bidiCount, samples: fact.bidiSamples.slice(0, 4) },
  };
}

/* ── E11: shell geometry (opens the drawer, LEAVES it open for E8-B) ── */
async function openDrawer(page) {
  /* The burger is addressed by its aria-label first (Topbar.tsx:
   * «فتح القائمة» — the label flips to «إغلاق القائمة» when open, and
   * this runs only on a closed drawer); the class is the fallback. */
  let trigger = page.locator('button[aria-label="فتح القائمة"]');
  if (!(await trigger.isVisible().catch(() => false))) {
    trigger = page.locator('.topbar-mobile-toggle');
    if (!(await trigger.isVisible().catch(() => false))) return false;
  }
  await trigger.first().click();
  await page.waitForSelector('nav.sidebar', { state: 'visible', timeout: 6000 }).catch(() => null);
  await sleep(450); // slide-in settle
  return true;
}

async function closeDrawer(page) {
  const close = page.locator('.sidebar-mobile-close');
  if (await close.isVisible().catch(() => false)) {
    await close.click().catch(() => null);
  } else {
    await page.keyboard.press('Escape').catch(() => null);
  }
  await sleep(350);
}

async function checkShell(page) {
  const rows = {};
  const atRest = await page.evaluate(COLLECT_SHELL, 0);
  if (!atRest.bar) {
    return { rows: { 'bar-opaque': { status: 'NA', reason: 'no .bottom-nav on this route/viewport', metric: 0 } }, drawerOpen: false };
  }
  const barColor = parseColor(atRest.bar.bg);
  rows['bar-opaque'] = {
    status: barColor && barColor.a === 1 ? 'PASS' : 'FAIL',
    alpha: barColor ? +barColor.a.toFixed(3) : null,
    bg: atRest.bar.bg,
    barHeight: atRest.bar.height,
    metric: barColor && barColor.a === 1 ? 0 : 1,
    sample: barColor && barColor.a === 1 ? '' : `bg ${atRest.bar.bg} — translucent bar`,
  };
  const mid = await page.evaluate(COLLECT_SHELL, 0.5);
  const bottom = await page.evaluate(COLLECT_SHELL, 1);
  const behind = Math.max(atRest.behindBarCount, mid.behindBarCount);
  const worstBehind = (mid.behindBarCount >= atRest.behindBarCount ? mid : atRest).behindBar;
  const visibleThrough = behind > 0 && !(barColor && barColor.a === 1);
  rows['bar-bleed'] = {
    status: visibleThrough ? 'FAIL' : 'PASS',
    behindBarCount: behind,
    barAlpha: barColor ? +barColor.a.toFixed(2) : null,
    metric: visibleThrough ? behind : 0,
    sample: visibleThrough
      ? `${behind} text nodes behind translucent bar — worst ${worstBehind && worstBehind[0] ? `«${worstBehind[0].text}» ${worstBehind[0].area}px²` : ''}`
      : (behind > 0 ? `${behind} behind bar, bar opaque — nothing visible through` : 'no content behind bar'),
  };
  const need = atRest.bar.height + atRest.safeArea + 8;
  const pad = atRest.contentPadBottom;
  /* PASS on the padding contract OR the bottom-clearance proof (at full
   * scroll no text leaf sits under the dock — the spirit of the reserve,
   * robust to whichever element carries it). */
  const padOk = pad != null && pad >= need - 0.5;
  const cleared = bottom.behindBarCount === 0;
  rows['padding-reserve'] = {
    status: padOk || cleared ? 'PASS' : 'FAIL',
    padBottom: pad,
    pads: atRest.pads,
    need: +need.toFixed(1),
    bottomClear: cleared,
    bottomBehind: bottom.behindBarCount,
    metric: padOk || cleared ? 0 : 1,
    sample: `pad ${pad != null ? `${pad}px (${Object.entries(atRest.pads).map(([k, v]) => `${k}:${v}`).join('/')})` : '—'} vs need ${need.toFixed(0)}px (bar ${atRest.bar.height} + safe ${atRest.safeArea} + 8) · bottom-scroll ${cleared ? 'clear' : `${bottom.behindBarCount} under dock`}`,
  };
  const opened = await openDrawer(page);
  if (!opened) {
    rows['drawer-clip'] = { status: 'NA', reason: 'no drawer trigger on this route', metric: 0 };
    rows['scrim-palette'] = { status: 'NA', reason: 'no drawer trigger on this route', metric: 0 };
    return { rows, drawerOpen: false };
  }
  const drawer = await page.evaluate(COLLECT_DRAWER);
  if (!drawer.sidebar) {
    rows['drawer-clip'] = { status: 'FAIL', metric: 1, reason: 'drawer did not open', sample: 'drawer did not open' };
    rows['scrim-palette'] = { status: 'NA', reason: 'drawer did not open', metric: 0 };
    return { rows, drawerOpen: false };
  }
  const scrollOk = drawer.nav
    ? (drawer.nav.scrollHeight <= drawer.nav.clientHeight + 1 || ['auto', 'scroll'].includes(drawer.nav.overflowY))
    : false;
  const clipOk = drawer.lastLabelInside;
  rows['drawer-clip'] = {
    status: scrollOk && clipOk ? 'PASS' : 'FAIL',
    scrollFits: drawer.nav ? `${drawer.nav.scrollHeight}≤${drawer.nav.clientHeight + 1}` : 'n/a',
    overflowY: drawer.nav ? drawer.nav.overflowY : null,
    lastLabel: drawer.lastLabel,
    lastLabelInside: clipOk,
    metric: (scrollOk ? 0 : 1) + (clipOk ? 0 : 1),
    sample: scrollOk && clipOk ? '' : `scroll ${scrollOk ? 'ok' : 'CLIPPED'} · last label «${drawer.lastLabel}» ${clipOk ? 'inside' : `outside (bottom ${drawer.lastLabelBottom} > panel ${drawer.sidebarBottom})`}`,
  };
  const scrim = parseColor(drawer.backdropBg);
  const isOldGrey = drawer.backdropBg === OLD_SCRIM_GREY || (scrim && scrim.r === 142 && scrim.g === 142 && scrim.b === 138);
  const scrimOk = scrim && scrim.a >= 0.5 && scrim.a <= 0.95 && !isOldGrey;
  rows['scrim-palette'] = {
    status: scrimOk ? 'PASS' : 'FAIL',
    bg: drawer.backdropBg,
    alpha: scrim ? +scrim.a.toFixed(2) : null,
    oldGrey: !!isOldGrey,
    metric: scrimOk ? 0 : 1,
    sample: scrimOk ? '' : `bg ${drawer.backdropBg} α ${scrim ? scrim.a.toFixed(2) : '?'} — need ink-derive α∈[0.5,0.95], NOT #8e8e8a`,
  };
  return { rows, drawerOpen: true };
}

/* ── E12: material presence ─────────────────────────────────────────── */
async function checkMaterial(page, radiusAllow) {
  const m = await page.evaluate(COLLECT_MATERIAL);
  const rows = {};
  rows['frame'] = {
    status: m.frame && m.frame.ok ? 'PASS' : 'FAIL',
    metric: m.frame && m.frame.ok ? 0 : 1,
    count: m.frame ? 1 : 0,
    sample: m.frame ? `.${String(m.frame.cls).split(' ')[0]} ${m.frame.position} inset ${JSON.stringify(m.frame.inset)} — need fixed 7px` : 'no .sheet-frame/.auth-frame on this route',
  };
  rows['grain'] = {
    status: m.grain ? 'PASS' : 'FAIL',
    metric: m.grain ? 0 : 1,
    count: m.grain ? 1 : 0,
    sample: m.grain ? `${m.grain}` : 'no grain layer (no body.mdrk-grain / [class*=grain])',
  };
  rows['mono-index'] = {
    status: m.monoCount > 0 ? 'PASS' : 'FAIL',
    count: m.monoCount,
    metric: m.monoCount > 0 ? 0 : 1,
    sample: m.monoCount > 0 ? `${m.monoCount} mono labels (e.g. ${m.monoSample})` : 'no sampled element resolves to the mono var',
  };
  rows['indicator'] = {
    status: m.indicatorCount > 0 ? 'PASS' : 'FAIL',
    count: m.indicatorCount,
    metric: m.indicatorCount > 0 ? 0 : 1,
    sample: m.indicatorCount > 0 ? m.indicatorSample : 'no progress/gauge/chip/meter element',
  };
  rows['avatar-square'] = m.avatarTotal === 0
    ? { status: 'NA', reason: 'no .avatar on this route', metric: 0 }
    : {
        status: m.roundAvatarCount === 0 ? 'PASS' : 'FAIL',
        avatars: m.avatarTotal,
        round: m.roundAvatarCount,
        metric: m.roundAvatarCount,
        sample: m.roundAvatarCount ? `${m.roundAvatarCount}/${m.avatarTotal} round (radius ${m.roundAvatarSample}) — need 0` : '',
      };
  const allowed = (sig) => {
    for (const e of radiusAllow) {
      if (e.classContains && sig.includes(e.classContains)) return e.reason || 'allowlisted';
      if (e.tag && sig.startsWith(String(e.tag).toLowerCase())) return e.reason || 'allowlisted';
    }
    return null;
  };
  const offenders = m.roundedChromeTop.filter((sig) => !allowed(sig));
  rows['chrome-radius'] = {
    status: offenders.length === 0 ? 'PASS' : (offenders.length > CHROME_RADIUS_WARN_FLOOR ? 'WARN' : 'FAIL'),
    offenders: offenders.length,
    swept: m.chromeSwept,
    metric: offenders.length,
    sample: offenders.length ? `${offenders.length} rounded chrome sigs (e.g. ${offenders.slice(0, 3).join(', ')})` : '',
  };
  return rows;
}

/* ── cell runner ────────────────────────────────────────────────────── */
async function openRoute(ctx, baseUrl, routeDef) {
  const page = await ctx.newPage();
  await page.goto(`${baseUrl}${routeDef.path}`, { waitUntil: 'networkidle', timeout: 45000 }).catch(async () => {
    await page.waitForTimeout(1500);
  });
  if (routeDef.role) {
    await page.waitForSelector('header.topbar', { timeout: 15000 }).catch(() => null);
  } else {
    await page.waitForTimeout(1000); // banner/intro entrance settle
    await page.waitForSelector('.jt', { timeout: 6000 }).catch(() => null);
  }
  await page.waitForTimeout(700); // react-query settle
  return page;
}

function naRow(reason) { return { status: 'NA', reason, metric: 0 }; }

async function runCell(browser, transport, opt, leakAllow, radiusAllow, { routeName, width, theme }) {
  const routeDef = ROUTES[routeName];
  const height = VIEWPORT_H[width] || 900;
  const cell = { route: routeName, viewport: width, theme, authed: !!routeDef.role, checks: {} };
  const touch = width <= 920;
  const ctx = await browser.newContext({
    viewport: { width, height },
    ...(touch ? { hasTouch: true, isMobile: true } : {}),
    reducedMotion: 'reduce', // deterministic state forcing (transitions instant)
    locale: 'ar',
  });
  await ctx.addInitScript(() => { try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { /* storage off */ } });
  const user = routeDef.role ? transport[`${routeDef.role}_USER`] : null;
  if (user) {
    await transport.seedSession(ctx, user, { theme });
  } else if (theme) {
    await ctx.addInitScript(([t]) => {
      try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: t, modeUpdatedAt: 0 }, version: 2 })); } catch { /* storage off */ }
    }, [theme]);
  }
  // belt & braces (the r318 recipe): <html data-theme> right from frame 0
  await ctx.addInitScript(([t]) => { try { document.documentElement.dataset.theme = t; } catch { /* no DOM */ } }, [theme]);
  await transport.installMockApi(ctx, { sessionUser: user });

  try {
    const page = await openRoute(ctx, opt.baseUrl, routeDef);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('DOM.enable');
    await cdp.send('CSS.enable');
    await cdp.send('Emulation.setEmulatedMedia', {
      features: touch
        ? [{ name: 'hover', value: 'none' }, { name: 'pointer', value: 'coarse' }]
        : [{ name: 'hover', value: 'hover' }, { name: 'pointer', value: 'fine' }],
    });
    await sleep(300);

    /* E10 leaks — natural state FIRST (before any drawer/state forcing) */
    if (opt.only.has('leaks')) {
      if (cell.authed) {
        /* Self-test mode (MADAREK_GATE_SELFTEST=1): inject render-level
         * leak canaries BEFORE the scan — the detector must FAIL every
         * family it owns (positive control; the display-layer sanitizer
         * cannot clean a node the harness itself rendered). Run against
         * a SCRATCH --baseline/--out so the real ratchet stays clean. */
        if (process.env.MADAREK_GATE_SELFTEST === '1') {
          await page.evaluate(() => {
            const d = document.createElement('div');
            d.setAttribute('data-gate-selftest', '1');
            /* one BLOCK per canary so innerText keeps them as separate
             * lines (a single text node would collapse to one line and
             * only the first-matching pattern would fire) */
            d.innerHTML = '<div>كلية اختبار</div><div>قسم اختبار r180</div><div>٣٦% null 01\u200F/02</div>';
            document.body.appendChild(d);
          });
        }
        const leak = await checkLeaks(page, leakAllow, transport);
        cell.checks['leaks/hard'] = leak;
        cell.checks['leaks/numerals'] = leak.numerals;
        cell.checks['leaks/bidi'] = leak.bidi;
      } else {
        cell.checks['leaks/hard'] = naRow('public route — the authenticated leak scan is scoped to role dashboards');
        cell.checks['leaks/numerals'] = naRow('public route');
        cell.checks['leaks/bidi'] = naRow('public route');
      }
    }

    /* E12 material — natural state */
    if (opt.only.has('material')) {
      if (cell.authed) {
        const rows = await checkMaterial(page, radiusAllow);
        for (const [k, v] of Object.entries(rows)) cell.checks[`material/${k}`] = v;
      } else {
        for (const k of ['frame', 'grain', 'mono-index', 'indicator', 'avatar-square', 'chrome-radius']) {
          cell.checks[`material/${k}`] = naRow('public route — material presence is an authenticated-surface contract');
        }
      }
    }

    /* E8 pass A — shell at rest (drawer closed on mobile) */
    const e8Passes = [];
    if (opt.only.has('state-contrast')) {
      e8Passes.push(await sweepPass(page, cdp, { cap: opt.maxElements, scope: null, passLabel: 'shell' }));
    }

    /* E11 shell geometry @390 touch (authed) — opens the drawer and
       leaves it open so E8's drawer pass can sweep it. */
    let drawerOpen = false;
    if (opt.only.has('shell')) {
      if (cell.authed && width === SHELL_VIEWPORT) {
        const shell = await checkShell(page);
        for (const [k, v] of Object.entries(shell.rows)) cell.checks[`shell/${k}`] = v;
        drawerOpen = shell.drawerOpen;
      } else {
        for (const k of ['bar-opaque', 'bar-bleed', 'padding-reserve', 'drawer-clip', 'scrim-palette']) {
          cell.checks[`shell/${k}`] = naRow(cell.authed ? 'shell geometry measured @390 touch context only (§E-11)' : 'public route — no app shell');
        }
      }
    }

    /* E8 pass B — drawer open (the B1 defect: forced :hover on drawer rows) */
    if (opt.only.has('state-contrast') && cell.authed && width <= 920) {
      if (!drawerOpen) drawerOpen = await openDrawer(page);
      if (drawerOpen) {
        e8Passes.push(await sweepPass(page, cdp, { cap: opt.maxElements, scope: 'nav.sidebar', passLabel: 'drawer-open' }));
      }
    }

    if (opt.only.has('state-contrast')) {
      const fails = e8Passes.reduce((n, p) => n + (p.failCount || 0), 0);
      const okPasses = e8Passes.filter((p) => p.status !== 'NA');
      cell.checks['state-contrast'] = {
        status: okPasses.some((p) => p.status === 'FAIL') ? 'FAIL' : (okPasses.length ? 'PASS' : 'NA'),
        failCount: fails,
        metric: fails,
        passes: e8Passes.map((p) => ({ pass: p.passLabel, status: p.status, failCount: p.failCount || 0, measured: p.measured || 0, unknown: p.unknownSkipped || 0, ...(p.unforcedStates?.length ? { unforced: p.unforcedStates } : {}) })),
        gradientWarn: e8Passes.reduce((n, p) => n + (p.gradientWarn || 0), 0),
        unknown: e8Passes.reduce((n, p) => n + (p.unknownSkipped || 0), 0),
        samples: e8Passes.flatMap((p) => (p.samples || []).map((s) => `[${p.passLabel}] ${s}`)).slice(0, 8),
        budgetOverruns: e8Passes.reduce((n, p) => n + (p.budgetOverruns || 0), 0),
      };
    }

    if (drawerOpen) await closeDrawer(page);
    await page.close();
  } catch (err) {
    cell.error = String(err && err.message ? err.message : err).slice(0, 200);
  } finally {
    await ctx.close();
  }
  return cell;
}

/* ── report + baseline ratchet ──────────────────────────────────────── */
function rowKey(route, width, theme, check) { return `${route}|${width}|${theme}|${check}`; }

function metricOf(check) {
  if (typeof check.metric === 'number') return check.metric;
  if (typeof check.failCount === 'number') return check.failCount;
  if (typeof check.count === 'number') return check.count;
  return check.status === 'PASS' || check.status === 'NA' || check.status === 'SKIPPED' ? 0 : 1;
}

function sampleOf(check) {
  if (check.status === 'SKIPPED' || check.status === 'NA') return check.reason || '—';
  if (check.samples && check.samples.length) return check.samples[0];
  if (check.sample) return check.sample;
  return '—';
}

function shellNumber(name, c) {
  switch (name) {
    case 'shell/bar-opaque': return c.alpha != null ? `alpha ${c.alpha}` : '—';
    case 'shell/bar-bleed': return `${c.behindBarCount} behind · α ${c.barAlpha}`;
    case 'shell/padding-reserve': return `pad ${c.padBottom} ≥ ${c.need}${c.bottomClear === false ? ` · ${c.bottomBehind} under dock @bottom` : ' · bottom-clear'}`;
    case 'shell/drawer-clip': return `${c.scrollFits ?? '—'} · last label ${c.lastLabelInside ? 'inside' : 'OUTSIDE'}`;
    case 'shell/scrim-palette': return c.alpha != null ? `α ${c.alpha}${c.oldGrey ? ' · OLD GREY' : ''}` : '—';
    default: return '—';
  }
}

function materialNumber(name, c) {
  switch (name) {
    case 'material/frame': return c.metric ? 'absent' : 'present';
    case 'material/grain': return c.metric ? 'absent' : 'present';
    case 'material/mono-index': return `${c.count ?? 0} mono`;
    case 'material/indicator': return `${c.count ?? 0} indicators`;
    case 'material/avatar-square': return c.avatars != null ? `${c.round}/${c.avatars} round` : '—';
    case 'material/chrome-radius': return `${c.offenders} rounded (${c.swept} swept)`;
    default: return '—';
  }
}

function buildRowList(cells, paired) {
  const rows = [];
  for (const cell of cells) {
    for (const [name, c] of Object.entries(cell.checks)) {
      rows.push({
        key: rowKey(cell.route, cell.viewport, cell.theme, name),
        route: cell.route, viewport: cell.viewport, theme: cell.theme, check: name,
        status: c.status, metric: metricOf(c), sample: String(sampleOf(c)).slice(0, 200),
      });
    }
  }
  if (paired && paired.status !== 'NA') {
    rows.push({ key: '|—|—|paired', route: '—', viewport: '—', theme: '—', check: 'paired', status: paired.status, metric: paired.metric ?? 1, sample: String(paired.reason || paired.tail || '').slice(0, 200) });
  }
  return rows;
}

function compareBaseline(opt, rowList) {
  const baselinePath = path.resolve(ROOT, opt.baseline);
  const exists = fs.existsSync(baselinePath);
  const info = { mode: '', regressions: [], regressionKeys: new Set() };
  if (!exists || opt.updateBaseline) {
    const rows = {};
    for (const r of rowList) rows[r.key] = { status: r.status, metric: r.metric };
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(baselinePath, `${JSON.stringify({ generated: new Date().toISOString(), note: 'R319 gate ratchet baseline — FAIL rows here are the ACCEPTED ratchet (open board tickets); re-seat with --update-baseline. Keys are route|viewport|theme|check; --quick and full runs share this key space — re-seat after widening scope.', rows }, null, 1)}\n`);
    info.mode = (opt.updateBaseline ? 'RE-SEATED (--update-baseline)' : 'WRITTEN (first run)') + ' from this run';
    return info;
  }
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const prev = baseline.rows ?? {};
  for (const r of rowList) {
    if (r.status !== 'FAIL') continue; // WARN regressions are reported, never blocking (yet)
    const p = prev[r.key];
    if (!p) {
      info.regressions.push({ key: r.key, status: r.status, metric: r.metric, prevMetric: null, note: 'NEW failing row (absent from baseline)' });
      info.regressionKeys.add(r.key);
    } else if (r.metric > p.metric) {
      info.regressions.push({ key: r.key, status: r.status, metric: r.metric, prevMetric: p.metric, note: 'worse number' });
      info.regressionKeys.add(r.key);
    }
  }
  info.mode = `compared against ${path.basename(opt.baseline)} written ${baseline.generated ?? '?'}`;
  return info;
}

function writeReport(opt, cells, paired, rowList, baselineInfo, startedAt) {
  const outPath = path.resolve(ROOT, opt.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  const L = [];
  L.push(`# R319 extended gate — ${new Date(startedAt).toISOString()}`, '');
  L.push(`Base \`${opt.baseUrl}\` · Routes ${opt.routes} · Viewports ${opt.viewports} · Themes ${THEMES.join(',')} · Mode ${opt.quick ? 'quick' : 'full'} · Max elements ${opt.maxElements} · Only ${[...opt.only].join(',') || 'all'}`, '');
  L.push('E8 state-contrast (CDP-forced hover/active/focus/focus-visible/focus-within) · E9 paired lint · E10 leaks · E11 shell geometry (@390 touch, authed) · E12 material presence (authed). Hermetic: the REAL e2e mock transport serves every /api/ call — no backend needed.', '');
  L.push('| route | viewport | theme | check | result | number | worst sample / failing selectors |');
  L.push('|---|---|---|---|---|---|---|');
  for (const cell of cells) {
    for (const [name, c] of Object.entries(cell.checks)) {
      const ticket = TICKETS[name];
      const reg = baselineInfo.regressionKeys.has(rowKey(cell.route, cell.viewport, cell.theme, name)) ? ' **↗REGRESSION**' : '';
      const badge = c.status === 'FAIL' && ticket ? ` → ${ticket}` : '';
      let number = '—';
      if (c.status === 'NA' || c.status === 'SKIPPED') number = '—';
      else if (name === 'state-contrast') number = c.passes ? `${c.failCount} fails · ${c.passes.map((p) => `${p.pass}:${p.failCount}/${p.measured}`).join(' · ')}${c.gradientWarn ? ` · ${c.gradientWarn} gradient-flagged` : ''}${c.unknown ? ` · ${c.unknown} unknown` : ''}` : String(c.failCount);
      else if (name === 'leaks/hard') number = `${c.failCount} leaks · ${c.allowlisted} allowlisted · ${c.lines} lines${c.rlmDateCount ? ` · ${c.rlmDateCount} rlm-dates` : ''}`;
      else if (name === 'leaks/numerals' || name === 'leaks/bidi') number = `${c.count} nodes`;
      else if (name.startsWith('shell/')) number = shellNumber(name, c);
      else if (name.startsWith('material/')) number = materialNumber(name, c);
      L.push(`| ${cell.route} | ${cell.viewport} | ${cell.theme} | ${name} | ${c.status}${badge}${reg} | ${number} | ${String(sampleOf(c)).slice(0, 120).replace(/\|/g, '\\|')} |`);
    }
    if (cell.error) L.push(`| ${cell.route} | ${cell.viewport} | ${cell.theme} | (cell) | **ERROR** | — | ${cell.error.replace(/\|/g, '\\|')} |`);
  }
  if (paired && paired.status !== 'NA') {
    const reg = baselineInfo.regressionKeys.has('|—|—|paired') ? ' **↗REGRESSION**' : '';
    const ticket = TICKETS.paired;
    L.push(`| — | — | — | paired | ${paired.status}${paired.status === 'FAIL' ? ` → ${ticket}` : ''}${reg} | exit ${paired.exitCode ?? '—'} | ${String(paired.reason || paired.tail || '—').slice(0, 120).replace(/\|/g, '\\|')} |`);
  }
  L.push('', '## Ratchet (baseline)', '');
  L.push(`- baseline: \`${opt.baseline}\` — ${baselineInfo.mode}`);
  for (const r of baselineInfo.regressions) L.push(`- ↗ REGRESSION ${r.key}: ${r.status} (metric ${r.metric} > baseline ${r.prevMetric ?? '—'}) — ${r.note}`);
  if (!baselineInfo.regressions.length) L.push('- no regressions vs baseline (ratchet holds)');
  const failRows = rowList.filter((r) => r.status === 'FAIL');
  const warnRows = rowList.filter((r) => r.status === 'WARN');
  const errorCells = cells.filter((c) => c.error).length;
  L.push('', `**${failRows.length} FAIL · ${warnRows.length} WARN · ${errorCells} cell error(s) · ${baselineInfo.regressions.length} regression(s) → exit ${errorCells || baselineInfo.regressions.length ? (baselineInfo.regressions.length ? 1 : 2) : 0}** (ratchet FAILs at baseline numbers map to open board tickets; only regressions — or harness errors — block).`, '');
  fs.writeFileSync(outPath, L.join('\n'));
  fs.writeFileSync(outPath.replace(/\.md$/, '.json'), `${JSON.stringify({ generated: new Date().toISOString(), baseUrl: opt.baseUrl, routes: opt.routes, viewports: opt.viewports, quick: opt.quick, maxElements: opt.maxElements, cells, paired, rows: rowList, summary: { fails: failRows.length, warns: warnRows.length, regressions: baselineInfo.regressions.length, errorCells, exit: baselineInfo.regressions.length ? 1 : 0 } }, null, 1)}\n`);
  return { failRows, warnRows };
}

/* ── main ───────────────────────────────────────────────────────────── */
async function main() {
  const opt = parseArgs(process.argv.slice(2));
  const KNOWN = ['state-contrast', 'leaks', 'shell', 'material', 'paired'];
  if (opt.only.size) {
    for (const k of [...opt.only]) {
      if (!KNOWN.includes(k)) throw new Error(`unknown --only member: ${k} (known: ${KNOWN.join(',')})`);
    }
  } else KNOWN.forEach((k) => opt.only.add(k));
  opt.viewports = opt.viewports.split(',').map((v) => parseInt(v, 10)).filter(Boolean);
  opt.routes = opt.routes.split(',').map((r) => r.trim()).filter((r) => ROUTES[r]);
  if (!opt.routes.length) throw new Error(`no known routes in --routes (known: ${Object.keys(ROUTES).join(',')})`);

  const leakAllowPath = path.join(HERE, 'leak-allowlist.json');
  const radiusAllowPath = path.join(HERE, 'radius-allowlist.json');
  const leakAllow = fs.existsSync(leakAllowPath) ? (JSON.parse(fs.readFileSync(leakAllowPath, 'utf8')).allow ?? []) : [];
  const radiusAllow = fs.existsSync(radiusAllowPath) ? (JSON.parse(fs.readFileSync(radiusAllowPath, 'utf8')).allow ?? []) : [];

  const t0 = Date.now();
  process.stderr.write(`[gate:r319] routes=${opt.routes.join(',')} viewports=${opt.viewports.join(',')} only=${[...opt.only].join(',') || 'all'} quick=${opt.quick}\n`);

  const transport = await ensureTransport();
  process.stderr.write('[gate:r319] hermetic transport ready (mock-transport.ts + api-fixtures.ts bundled)\n');

  let vite = null;
  if (!opt.baseUrl) {
    opt.baseUrl = `http://127.0.0.1:${opt.port}`;
    vite = spawnVite(opt.port);
    if (!(await waitReady(opt.baseUrl))) {
      killTree(vite);
      process.stderr.write(`[gate:r319] fatal: vite did not come up on :${opt.port}\n`);
      process.exitCode = 2;
      return;
    }
    process.stderr.write(`[gate:r319] vite up on :${opt.port} (pid ${vite.pid})\n`);
  }

  const paired = opt.only.has('paired') ? checkPaired() : null;

  const cells = [];
  let browser = null;
  try {
    browser = await chromium.launch();
    for (const routeName of opt.routes) {
      for (const theme of THEMES) {
        for (const width of opt.viewports) {
          process.stderr.write(`[gate:r319] cell ${routeName} ${width}×${VIEWPORT_H[width] || 900} ${theme} …\n`);
          cells.push(await runCell(browser, transport, opt, leakAllow, radiusAllow, { routeName, width, theme }));
        }
      }
    }
  } finally {
    if (browser) await browser.close();
    killTree(vite);
  }

  const rowList = buildRowList(cells, paired);
  const baselineInfo = compareBaseline(opt, rowList);
  const report = writeReport(opt, cells, paired, rowList, baselineInfo, t0);
  const errorCells = cells.filter((c) => c.error).length;
  const secs = ((Date.now() - t0) / 1000).toFixed(0);
  process.stderr.write(`[gate:r319] ${report.failRows.length} FAIL · ${report.warnRows.length} WARN · ${errorCells} cell error(s) · ${baselineInfo.regressions.length} regression(s) in ${secs}s → ${opt.out} (+.json)\n`);
  process.exitCode = baselineInfo.regressions.length ? 1 : (errorCells ? 2 : 0);
}

main().catch((err) => {
  process.stderr.write(`[gate:r319] fatal: ${err && err.stack ? err.stack : err}\n`);
  process.exitCode = 2;
});
