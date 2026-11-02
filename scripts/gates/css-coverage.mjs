#!/usr/bin/env node
/**
 * css-coverage.mjs — R331 A-CSS · dead-rule candidate census.
 *
 * Navigates the route list at 390/768/1440 (light + dark themes) against
 * an ALREADY-RUNNING dev server (CSS_COVERAGE_URL, default
 * http://localhost:5173 — start it yourself: `npm run dev -- --port
 * 5173`), then probes every rule in every loaded sheet
 * (document.styleSheets) and records which selectors actually MATCH an
 * element on which routes. In dev, Vite tags each injected <style> with
 * data-vite-dev-id → per-FILE attribution for free.
 *
 * OUTPUT
 *   docs/redesign/r331/css-coverage.json          — committed summary
 *   /home/z/heron-lab/css-coverage-full.json      — full selector map
 *     (override with CSS_COVERAGE_FULL; kept out of tree per repo
 *     hygiene — the committed file stays small; deadCandidatesSample
 *     is capped at 500, the full list rides the heron-lab copy)
 *
 * Dead candidate = a selector from a style rule in a LOADED sheet that
 * matched zero elements on zero routes (union over viewports + themes).
 * Heuristics (documented, conservative):
 *   · pseudo-elements stripped before matching (.a::before → .a);
 *   · interaction pseudo-classes stripped (:hover/:active/:focus/
 *     :focus-visible/:focus-within) — they never match headless-cold;
 *   · media/layer/supports/container blocks are walked REGARDLESS of
 *     match: a print rule's selector can still match on screen — media
 *     changes applicability, not selector matching;
 *   · only sheets that actually loaded count: a rule in a
 *     never-imported sheet is invisible to this harness (cross-check
 *     the import scan in css-pass1.md — unified-parity.css /
 *     shared-design-system.css have zero importers).
 *
 * USAGE (from frontend/):
 *   npx vite --port 5173 &
 *   npm run gate:css-coverage        # = npx tsx ../scripts/gates/css-coverage.mjs
 *
 * RESUME: the sweep is checkpointed after every route to
 * `${CSS_COVERAGE_FULL}.ckpt.json`; a re-run resumes where the last
 * one died (this box's 4GiB cgroup has OOM-killed long sweeps — the
 * harness is deliberately restartable, css-shots-style). Set
 * CSS_COVERAGE_FRESH=1 to discard the checkpoint and start over.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

import { installMockApi } from '../../frontend/tests/e2e/fixtures/mock-transport.ts';
import { ROLE_USERS } from '../../frontend/tests/e2e/fixtures/api-fixtures.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const BASE = (process.env.CSS_COVERAGE_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
const FULL_OUT = process.env.CSS_COVERAGE_FULL ?? '/home/z/heron-lab/css-coverage-full.json';
const SUMMARY_OUT = resolve(HERE, '../../docs/redesign/r331/css-coverage.json');
const CKPT_OUT = FULL_OUT.replace(/\.json$/, '') + '.ckpt.json';

const ROUTES = [
  '/', '/login', '/register', '/about', '/help', '/contact',
  '/campus', '/colleges', '/competitions', '/app', '/legal/privacy', '/404',
];
const VIEWPORTS = [390, 768, 1440];
const THEMES = ['light', 'dark'];
const SETTLE_MS = Number(process.env.CSS_COVERAGE_SETTLE ?? 1500);

/* Route sweeps per guarding role — WITHOUT these, every selector in a
 * sheet that only loads behind an auth guard counts "dead" merely
 * because its routes were never visited. Each family gets at least
 * one representative route so its sheet loads and its live selectors
 * are exonerated; only what stays unmatched across ALL sweeps is a
 * real dead candidate. */
const ROUTE_SETS = [
  { role: 'guest', routes: ROUTES, themes: THEMES },
  {
    role: 'STUDENT',
    routes: [
      '/student/dashboard', '/student/courses', '/student/online-exams',
      '/student/alerts', '/student/calendar', '/student/messages',
      '/student/research', '/student/mooc', '/student/webinars',
      '/student/map', '/student/gamification', '/student/skills',
      '/settings', '/training', '/community', '/achievements', '/vision',
    ],
    themes: THEMES,
  },
  { role: 'TEACHER', routes: ['/teacher/dashboard', '/teacher/exams', '/teacher/profile'], themes: ['light'] },
  { role: 'ADMIN', routes: ['/admin/dashboard', '/admin/students'], themes: ['light'] },
  { role: 'QUALITY', routes: ['/quality/dashboard'], themes: ['light'] },
  { role: 'OWNER', routes: ['/owner/dashboard', '/owner/institutions'], themes: ['light'] },
];

/* ── browser plumbing (shares css-shots' rev-mismatch fallback) ────── */
function resolveChromiumExecutable() {
  if (process.env.CSS_SHOTS_CHROMIUM) return process.env.CSS_SHOTS_CHROMIUM;
  const cache = resolve(process.env.HOME ?? '', '.cache/ms-playwright');
  try {
    const dirs = readdirSync(cache)
      .filter((d) => /^chromium(_headless_shell)?-\d+$/.test(d))
      .sort((a, b) => Number(b.match(/\d+$/)[0]) - Number(a.match(/\d+$/)[0]));
    for (const d of dirs) {
      for (const exe of ['chrome-headless-shell-linux64/chrome-headless-shell', 'chrome-linux64/chrome', 'chrome-linux/chrome']) {
        const p = resolve(cache, d, exe);
        if (existsSync(p)) return p;
      }
    }
  } catch { /* unreadable → default */ }
  return undefined;
}

/* One in-page pass: every style-rule selector with its owning file and
 * whether it matched. Grouping rules (layer/media/supports/container)
 * are descended unconditionally. */
const PROBE = () => {
  const STRIP = /::[a-zA-Z-]+|:(hover|active|focus|focus-visible|focus-within)\b/g;
  const rows = []; // { file, sel, matched }
  const walk = (rules, file) => {
    for (const rule of rules) {
      try {
        if (rule.cssRules && !(rule instanceof CSSStyleRule)) {
          walk(rule.cssRules, file); // @layer / @media / @supports / @container / keyframes groups
          continue;
        }
        if (rule.selectorText) {
          for (const raw of rule.selectorText.split(',')) {
            const sel = raw.trim();
            if (!sel) continue;
            const probe = sel.replace(STRIP, '').trim();
            let matched = false;
            if (probe) {
              try { matched = document.querySelector(probe) !== null; } catch { /* exotic selector */ }
            }
            rows.push({ file, sel, matched });
          }
        }
      } catch { /* opaque rule */ }
    }
  };
  for (const sheet of document.styleSheets) {
    const node = sheet.ownerNode;
    const file =
      node?.dataset?.viteDevId ??
      (node?.href ? node.href.replace(/^.*\/src\//, 'src/') : 'inline-or-external');
    try { walk(sheet.cssRules, file); } catch { /* cross-origin sheet */ }
  }
  return rows;
};

/* ── run ─────────────────────────────────────────────────────────── */
mkdirSync(dirname(FULL_OUT), { recursive: true });

/** sel → { routes:Set, files:Set, matched:bool } · file → {rules,selectors} */
const selMap = new Map();
const fileStats = new Map();
const routeStats = [];
const done = new Set(); // "role|theme|route" marks of completed probes

/* Restore the checkpoint (if any) so a killed sweep resumes, not restarts. */
if (!process.env.CSS_COVERAGE_FRESH && existsSync(CKPT_OUT)) {
  try {
    const ckpt = JSON.parse(readFileSync(CKPT_OUT, 'utf8'));
    for (const [sel, e] of ckpt.selMap) {
      selMap.set(sel, { matched: e.matched, routes: new Set(e.routes), files: new Set(e.files) });
    }
    for (const [file, st] of ckpt.fileStats) fileStats.set(file, st);
    routeStats.push(...ckpt.routeStats);
    for (const m of ckpt.done) done.add(m);
    console.log(`css-coverage: resuming from ${CKPT_OUT} (${done.size} routes already probed)`);
  } catch (err) {
    console.warn(`css-coverage: checkpoint unreadable (${err}) — starting fresh`);
  }
}

const saveCheckpoint = () =>
  writeFileSync(CKPT_OUT, JSON.stringify({
    version: 1,
    done: [...done],
    selMap: [...selMap].map(([sel, e]) => [sel, { matched: e.matched, routes: [...e.routes], files: [...e.files] }]),
    fileStats: [...fileStats],
    routeStats,
  }));

const browser = await chromium.launch(resolveChromiumExecutable() ? { executablePath: resolveChromiumExecutable() } : {});

try {
  for (const set of ROUTE_SETS) {
    const sessionUser = set.role === 'guest' ? null : ROLE_USERS[set.role];
    for (const theme of set.themes) {
      const context = await browser.newContext({
        baseURL: BASE,
        viewport: { width: 1440, height: 844 },
        colorScheme: theme,
        locale: 'ar',
      });
      await installMockApi(context, { sessionUser });
      await context.addInitScript(
        ([mode, user]) => {
          try {
            localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode, modeUpdatedAt: Date.now() }, version: 2 }));
            sessionStorage.setItem('madarek-intro-skip', '1');
          } catch { /* storage unavailable */ }
          if (user) {
            try {
              localStorage.setItem('mdrk-auth', JSON.stringify({ state: { user, accessToken: 'css-coverage-mock-token' }, version: 0 }));
            } catch { /* ditto */ }
          }
        },
        [theme, sessionUser],
      );
      for (const route of set.routes) {
        const mark = `${set.role}|${theme}|${route}`;
        if (done.has(mark)) continue; // resumed: already probed + counted
        const perVp = [];
        for (const vp of VIEWPORTS) {
          const page = await context.newPage();
          let seen = 0;
          let matched = 0;
          try {
            await page.setViewportSize({ width: vp, height: 844 });
            await page.goto(route, { waitUntil: 'networkidle', timeout: 45_000 });
            await page.evaluate(() => document.fonts.ready);
            await page.waitForTimeout(SETTLE_MS);
            const rows = await page.evaluate(PROBE);
            for (const { file, sel, matched: m } of rows) {
              seen++;
              if (m) matched++;
              let e = selMap.get(sel);
              if (!e) { e = { routes: new Set(), files: new Set(), matched: false }; selMap.set(sel, e); }
              if (m) { e.matched = true; e.routes.add(route); }
              e.files.add(file);
            }
            if (vp === VIEWPORTS[VIEWPORTS.length - 1]) {
              // file-stats snapshot from the widest viewport of this theme
              for (const { file } of rows) {
                fileStats.set(file, fileStats.get(file) ?? { rules: 0, selectors: 0 });
              }
            }
            perVp.push(matched);
          } catch (err) {
            perVp.push(-1);
            console.error(`FAIL ${route} @${vp}/${theme}: ${err}`);
          } finally {
            await page.close().catch(() => {});
          }
        }
        routeStats.push({ role: set.role, route, theme, matchedSelectorsPerViewport: perVp, rendered: perVp.some((n) => n > 0) });
        done.add(mark);
        saveCheckpoint();
        console.log(`probe ${route} [${set.role}/${theme}] → ${perVp.join('/')} matched selectors`);
      }
      await context.close().catch(() => {});
    }
  }
} finally {
  await browser.close();
}

/* per-file rule/selector counts need a dedicated pass: rows gave
 * selector granularity, count rules via a tiny recount per file from
 * the full map (selectors are unique keys; rules ≈ selector lists per
 * rule — we approximate by unique selector count per file). */
for (const [sel, e] of selMap) {
  for (const file of e.files) {
    const fs = fileStats.get(file);
    if (fs) fs.selectors++;
  }
}

/* ── aggregate ───────────────────────────────────────────────────── */
/* Repo-relative, query-free file labels: stylesheets surface in dev as
 * <style data-vite-dev-id="/abs/path/src/styles/x.css(?query)"> or as
 * <link href>; normalize both to frontend-relative `src/...` paths so the
 * committed JSON carries no machine-specific absolutes. */
const normFile = (f) => f.split('?')[0].replace(/^.*?\/frontend\//, '');

const allSelectors = [...selMap.keys()].sort();
const deadCandidates = allSelectors.filter((s) => !selMap.get(s).matched);

const perFile = [...fileStats.entries()]
  .map(([file, st]) => {
    const dead = deadCandidates.filter((s) => selMap.get(s).files.has(file));
    const matchedSel = st.selectors - dead.length;
    return {
      file: normFile(file),
      selectors: st.selectors,
      matchedSelectors: matchedSel,
      deadCandidates: dead.length,
      matchRate: st.selectors ? +((matchedSel / st.selectors) * 100).toFixed(1) : 0,
    };
  })
  .sort((a, b) => b.selectors - a.selectors);

const summary = {
  generatedAt: new Date().toISOString(),
  base: BASE,
  routeSets: ROUTE_SETS.map((s) => ({ role: s.role, routes: s.routes, themes: s.themes })),
  viewports: VIEWPORTS,
  themes: THEMES,
  totals: {
    sheetsSeen: fileStats.size,
    selectorsTested: allSelectors.length,
    selectorsMatched: allSelectors.length - deadCandidates.length,
    deadCandidates: deadCandidates.length,
  },
  routeStats,
  perFile,
  deadCandidatesSample: deadCandidates.slice(0, 500),
  notes: [
    'Dead candidate = matched zero elements on zero routes (union of 390/768/1440 × light/dark).',
    'Pseudo-elements and interaction pseudo-classes are stripped before matching.',
    'Only sheets LOADED on these routes are measured; never-imported sheets (unified-parity.css, shared-design-system.css — zero importers) are invisible to this harness.',
    'Full selector→routes/files map: ' + FULL_OUT,
  ],
};

writeFileSync(SUMMARY_OUT, JSON.stringify(summary, null, 2));
writeFileSync(FULL_OUT, JSON.stringify({
  generatedAt: summary.generatedAt,
  selectors: allSelectors.map((sel) => ({
    sel,
    matched: selMap.get(sel).matched,
    routes: [...selMap.get(sel).routes],
    files: [...selMap.get(sel).files].map(normFile),
  })),
}));
/* Sweep complete + outputs written → the checkpoint is obsolete. */
try { unlinkSync(CKPT_OUT); } catch { /* already gone */ }

console.log(`\ncss-coverage: ${summary.totals.selectorsTested} unique selectors across ${summary.totals.sheetsSeen} loaded sheets`);
console.log(`  matched on ≥1 route: ${summary.totals.selectorsMatched}`);
console.log(`  DEAD candidates:     ${summary.totals.deadCandidates}`);
console.log(`  summary → ${SUMMARY_OUT} (${(JSON.stringify(summary).length / 1024).toFixed(1)}KB raw)`);
console.log(`  full map → ${FULL_OUT}`);
