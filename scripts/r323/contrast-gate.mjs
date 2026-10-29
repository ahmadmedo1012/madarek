#!/usr/bin/env node
/**
 * r323/contrast-gate.mjs — A5 §2 — the state-contrast sweep GATE.
 *
 * Sweeps `/__design` (the component specimen) plus the public surfaces
 * (`/`, `/auth`, `/404`) at 1440×900 and 390×844, light AND dark, with
 * CDP `CSS.forcePseudoState` forcing each of
 *   :hover · :active · :focus-visible
 * over every interactive element (button, a, input, select, textarea,
 * [role=tab], [role=button], [role=switch], summary — skipping
 * aria-hidden and off-viewport trees).
 *
 * Per element × state it asserts:
 *   · text contrast ≥ 4.5:1 (≥ 3:1 for large text ≥ 24px / 18.66px bold)
 *     against the EFFECTIVE background (ancestor walk — paired
 *     --_bg/--_fg surfaces resolved honestly, alpha composited),
 *   · the glyph is non-empty: real text (or aria-label / aria-labelledby
 *     / sr-only label) and a non-collapsed box — the old vanishing-text
 *     bug class.
 *
 * Emits audits/evidence/r323/contrast-gate.json · exit 1 on breach.
 * Usage: node scripts/r323/contrast-gate.mjs [--port 4325]
 *        [--urls /__design,/] [--max-per-page 260]
 */
import { chromium } from 'playwright-core';
import { spawn, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf('--' + k); return i >= 0 ? args[i + 1] : d; };
const BASE = opt('base-url', 'http://127.0.0.1:4325');
const PORT = opt('port', '4325');
const URLS = (opt('urls', '/__design,/,/auth,/404')).split(',').map((s) => s.trim());
const MAX_PER_PAGE = Number(opt('max-per-page', 260));

const EXE = (() => {
  const base = path.join(process.env.HOME || '', '.cache/ms-playwright');
  try {
    const dirs = fs.readdirSync(base).filter((d) => /^chromium-\d+$/.test(d)).sort();
    for (const d of dirs.reverse()) {
      const p = path.join(base, d, 'chrome-linux64/chrome');
      if (fs.existsSync(p)) return p;
    }
  } catch { /* fall through */ }
  return undefined;
})();

let server, serverKilled = false;
async function startServer() {
  server = spawn('npx', ['vite', 'preview', '--host', '127.0.0.1', '--port', PORT, '--strictPort'], {
    cwd: path.join(ROOT, 'frontend'), stdio: 'ignore', env: process.env,
  });
  for (let i = 0; i < 100; i++) {
    try { const r = await fetch(`${BASE}/`, { signal: AbortSignal.timeout(700) }); if (r.ok) return true; } catch {}
    await new Promise((r) => setTimeout(r, 300));
  }
  return false;
}
function killServer() {
  if (serverKilled) return; serverKilled = true;
  try { if (server) server.kill('SIGKILL'); } catch {}
  try { spawn('pkill', ['-f', 'vite preview']); } catch {}
}

/* in-page: tag interactives with data-cg-idx and return the count. */
const TAG_FN = `(() => {
  const st = document.createElement('style');
  st.id = 'r323-cg-freeze';
  st.textContent = '*, *::before, *::after { transition: none !important; animation-duration: 0.001ms !important; animation-iteration-count: 1 !important; }';
  document.head.appendChild(st);
  const sel = 'button, a, input, select, textarea, [role="tab"], [role="button"], [role="switch"], summary';
  const els = [...document.querySelectorAll(sel)].filter((el) => {
    if (el.closest('[aria-hidden="true"]')) return false;
    const cs = getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  });
  els.forEach((el, i) => el.setAttribute('data-cg-idx', String(i)));
  return els.length;
})()`;

/* in-page: the sweep itself (helpers + runner in one context). */
const SWEEP_FN = `
(() => {
  function parse(c) {
    const m = c.match(/rgba?\\(([\\d.]+),\\s*([\\d.]+),\\s*([\\d.]+)(?:,\\s*([\\d.]+))?\\)/);
    if (!m) return null;
    return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
  }
  function blend(fg, bg) {
    return {
      r: fg.r * fg.a + bg.r * (1 - fg.a),
      g: fg.g * fg.a + bg.g * (1 - fg.a),
      b: fg.b * fg.a + bg.b * (1 - fg.a),
    };
  }
  function lum(c) {
    const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
  }
  function contrast(fgRaw, bgRaw) {
    const fg = parse(fgRaw), bg = parse(bgRaw);
    if (!fg || !bg) return null;
    const effFg = fg.a < 1 ? blend(fg, bg) : fg;
    const L1 = lum(effFg), L2 = lum(bg);
    return Math.round(((Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05)) * 100) / 100;
  }
  function effectiveBg(el) {
    /* the wipe pattern paints the hover ground on ::before/::after —
       an inset-0 opaque pseudo slab IS the effective background. */
    for (const pseudo of ['::before', '::after']) {
      try {
        const ps = getComputedStyle(el, pseudo);
        const p = parse(ps.backgroundColor);
        if (!p || p.a < 0.85 || ps.position !== 'absolute') continue;
        /* the wipe rests OFF the element (translateY(101%)) — only a
           pseudo currently covering counts: identity transform (or
           none), full opacity, zero-sized inset on both axes. */
        const tf = ps.transform;
        const identity = tf === 'none' || tf === 'matrix(1, 0, 0, 1, 0, 0)';
        const vis = (parseFloat(ps.opacity) || 0) > 0.85 && identity;
        const inset0 = (ps.insetInlineEnd === '0px' || ps.right === '0px')
          && (ps.insetInlineStart === '0px' || ps.left === '0px');
        const fullBlock = (ps.insetBlockStart === '0px' && ps.insetBlockEnd === '0px')
          || (ps.top === '0px' && ps.bottom === '0px');
        if (vis && inset0 && fullBlock) return ps.backgroundColor;
      } catch (e) { /* pseudo unsupported */ }
    }
    let n = el;
    while (n && n !== document.documentElement) {
      const p = parse(getComputedStyle(n).backgroundColor);
      if (p && p.a > 0.85) return getComputedStyle(n).backgroundColor;
      n = n.parentElement;
    }
    return getComputedStyle(document.body).backgroundColor || 'rgb(255,255,255)';
  }
  function glyphInfo(el) {
    const rect = el.getBoundingClientRect();
    const tag = el.tagName.toLowerCase();
    const type = (el.getAttribute('type') || '').toLowerCase();
    const isField = tag === 'input' || tag === 'select' || tag === 'textarea';
    let direct = (el.textContent || '').trim();
    if (isField) direct = ''; /* fields have no text content by nature */
    let label = el.getAttribute('aria-label') || el.getAttribute('title') || '';
    /* wrapping <label> names the control */
    if (!label) {
      const wrap = el.closest('label');
      if (wrap && wrap !== el) label = (wrap.textContent || '').trim();
    }
    /* <label for=id> names it too */
    if (!label && el.id) {
      const lb = document.querySelector('label[for="' + CSS.escape(el.id) + '"]');
      if (lb) label = (lb.textContent || '').trim();
    }
    let viaLabelledBy = '';
    const lb = el.getAttribute('aria-labelledby');
    if (lb) {
      for (const id of lb.split(/\\s+/)) {
        const t = document.getElementById(id);
        if (t) viaLabelledBy += ' ' + (t.textContent || '');
      }
      viaLabelledBy = viaLabelledBy.trim();
    }
    const sr = el.querySelector('.visually-hidden, .sr-only');
    const srText = sr ? (sr.textContent || '').trim() : '';
    return {
      hasGlyph: !!(direct || label || viaLabelledBy || srText),
      visibleBox: rect.width > 0 && rect.height > 0,
      text: (direct || label || viaLabelledBy || srText).slice(0, 40),
    };
  }
  return (async (limit) => {
    const settle = (el) => new Promise((res) => {
      let dur = '0s';
      try { dur = getComputedStyle(el).transitionDuration; } catch (e) { /* detached */ }
      const frozen = /(^|,\s*)0s(\s*,|$)/.test(dur);
      const wait = frozen ? 40 : 520; /* the .btn system transitions 0.4s */
      requestAnimationFrame(() => setTimeout(res, wait));
    });
    const sel = 'button, a, input, select, textarea, [role="tab"], [role="button"], [role="switch"], summary';
    const els = [...document.querySelectorAll(sel)]
      .filter((el) => el.hasAttribute('data-cg-idx') && Number(el.getAttribute('data-cg-idx')) < limit)
      .filter((el) => {
        if (el.disabled || el.getAttribute('aria-disabled') === 'true') return false;
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        return cs.visibility !== 'hidden' && cs.display !== 'none'
          && r.width > 0 && r.height > 0 && r.top < innerHeight + 600 && r.bottom > -600;
      });
    const out = [];
    for (const el of els) {
      const idx = Number(el.getAttribute('data-cg-idx'));
      const cls = (el.getAttribute('class') || '').trim().split(/\\s+/).slice(0, 2).join('.');
      const desc = el.tagName.toLowerCase() + (cls ? '.' + cls : '')
        + ' «' + glyphInfo(el).text.slice(0, 16) + '»';
      const rect = el.getBoundingClientRect();
      const cs0 = getComputedStyle(el);
      const tag = el.tagName.toLowerCase();
      const type = (el.getAttribute('type') || '').toLowerCase();
      const fs = parseFloat(cs0.fontSize);
      const fw = parseInt(cs0.fontWeight, 10) || 400;
      const large = fs >= 24 || (fs >= 18.66 && fw >= 700);
      const min = large ? 3 : 4.5;
      /* checkbox/radio are graphical objects (3:1 non-text) — text
         contrast does not apply; the accent swatch is the glyph. */
      const isCheckish = tag === 'input' && (type === 'checkbox' || type === 'radio');
      for (const state of [null, 'hover', 'active', 'focus-visible']) {
        let fg = null, bg = null, ratio = null;
        try {
          if (state) { await window.__forceRaw(idx, [state]); await settle(el); }
          fg = getComputedStyle(el).color;
          bg = effectiveBg(el);
          ratio = contrast(fg, bg);
        } finally {
          if (state) { await window.__forceRaw(idx, []); await settle(el); }
        }
        const glyph = glyphInfo(el);
        if (!isCheckish && ratio != null && ratio < min) {
          out.push({ el: desc, state: state || 'default', ratio, min, fg, bg, glyph: glyph.text });
        }
        if (!glyph.hasGlyph || !glyph.visibleBox) {
          out.push({ el: desc, state: state || 'default', ratio, min, fg, bg, glyph: glyph.text, emptyGlyph: true });
        }
      }
    }
    return out;
  })(${MAX_PER_PAGE});
})()
`;

const failures = [];
const results = [];
let browser;
try {
  if (!(await startServer())) { console.error('[contrast] FATAL: preview server failed'); process.exit(1); }
  console.log(`[contrast] preview up on ${BASE}`);
  browser = await chromium.launch({ executablePath: EXE, args: ['--disable-dev-shm-usage'] });

  for (const vp of [{ name: '1440', width: 1440, height: 900 }, { name: '390', width: 390, height: 844 }]) {
    for (const theme of ['light', 'dark']) {
      for (const route of URLS) {
        const ctx = await browser.newContext({
          viewport: { width: vp.width, height: vp.height },
          deviceScaleFactor: 1, locale: 'ar',
        });
        /* the REAL persistence path: the app's theme store reads
           localStorage['madarek-theme'] (zustand persist v2) — colorScheme
           emulation never flips it (default mode is 'light'). */
        await ctx.addInitScript((t) => {
          localStorage.setItem('madarek-theme', JSON.stringify({
            state: { mode: t, modeUpdatedAt: 1 }, version: 2,
          }));
        }, theme);
        /* SETTLED states: TAG_FN injects the freeze post-load in the
           page's main world (author-!important beats every author
           transition), so each forced pseudo reads its final values. */
        const page = await ctx.newPage();
        /* force bridge — bound BEFORE navigation so it exists in-page */
        const pending = new Map(); /* idx → states, drained by CDP writer */
        let cdpReady = false;
        let client = null, rootNodeId = null;
        const nodeMap = new Map();
        async function setupCdp() {
          client = await ctx.newCDPSession(page);
          await client.send('DOM.enable');
          await client.send('CSS.enable');
          const doc = await client.send('DOM.getDocument');
          rootNodeId = doc.root.nodeId;
          cdpReady = true;
        }
        await page.exposeFunction('__forceRaw', async (idx, states) => {
          if (!cdpReady) return;
          try {
            let nodeId = nodeMap.get(idx);
            if (!nodeId) {
              const q = await client.send('DOM.querySelector', {
                nodeId: rootNodeId, selector: `[data-cg-idx="${idx}"]`,
              });
              if (!q.nodeId) return;
              nodeId = q.nodeId; nodeMap.set(idx, nodeId);
            }
            await client.send('CSS.forcePseudoState', { nodeId, forcedPseudoClasses: states });
          } catch { /* detached node — ignore */ }
        });
        await page.goto(BASE + route, { waitUntil: 'load', timeout: 45000 });
        await page.waitForTimeout(900);
        await setupCdp();
        const count = await page.evaluate(TAG_FN);
        const sweep = await page.evaluate(SWEEP_FN);
        const scoped = sweep.map((f) => ({ ...f, route, viewport: vp.name, theme }));
        results.push(...scoped);
        console.log(`[contrast] ${vp.name} ${theme.padEnd(5)} ${route.padEnd(11)} — ${count} interactives · ${scoped.length} findings`);
        await ctx.close();
      }
    }
  }

  for (const f of results) {
    if (f.emptyGlyph) failures.push(`EMPTY-GLYPH [${f.viewport}/${f.theme}] ${f.route} ${f.el} (${f.state})`);
    else failures.push(`CONTRAST ${f.ratio}:1 < ${f.min}:1 [${f.viewport}/${f.theme}] ${f.route} ${f.el} (${f.state}) fg=${f.fg} bg=${f.bg}`);
  }

  const out = {
    meta: {
      gate: 'r323 contrast-gate (A5 §2)',
      urls: URLS, viewports: ['1440', '390'], themes: ['light', 'dark'],
      states: ['default', 'hover', 'active', 'focus-visible'],
      maxPerPage: MAX_PER_PAGE,
      generatedAt: new Date().toISOString(),
    },
    head: (() => { try { return execFileSync('git', ['-C', ROOT, 'rev-parse', '--short', 'HEAD']).toString().trim(); } catch { return null; } })(),
    swept: results.length,
    findings: results,
    failures,
    verdict: failures.length === 0 ? 'PASS' : 'FAIL',
  };
  const outDir = path.join(ROOT, 'audits/evidence/r323');
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, 'contrast-gate.json'), JSON.stringify(out, null, 2));
  console.log(`\n[contrast] verdict: ${out.verdict} — ${failures.length} findings over ${results.length} samples → audits/evidence/r323/contrast-gate.json`);
  for (const f of failures.slice(0, 40)) console.log('  ✗ ' + f);
  if (failures.length > 40) console.log(`  … and ${failures.length - 40} more`);
} finally {
  try { if (browser) await browser.close(); } catch {}
  killServer();
}
process.exit(failures.length ? 1 : 0);
