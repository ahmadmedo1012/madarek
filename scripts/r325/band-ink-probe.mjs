/* P2.6 — band-ink legibility probe: for each flagged route, query the
 * elements that ride the INVERTED deep band (the paper pole in Ink) and
 * read their COMPUTED color vs the band's computed background → contrast
 * ratio per element. Text under 4.5 (small) / 3.0 (large ≥24px or
 * ≥18.7px bold) is a REAL defect; the band surface itself is by design. */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { sessionForEmail, ROLE_EMAIL, authStorageJson } from './capture-routes.mjs';

const BASE = 'http://localhost:5211';
const ROOT = path.resolve(import.meta.dirname, '../..');
const OUT = path.join(ROOT, 'audits/evidence/r325/ink-app');
const EXE = path.join(process.env.HOME || '', '.cache/ms-playwright/chromium_headless_shell-1200/chrome-headless-shell-linux64/chrome-headless-shell');
const VP_SIZES = { 1440: { width: 1440, height: 900 }, 768: { width: 768, height: 1024 }, 390: { width: 390, height: 844 } };

/* per route: the selectors that live ON the deep band (from the
 * elementFromPoint probe) — the flagged boxes' text carriers */
const ROUTES = [
  { role: 'student', slug: 'ai', bp: ['1440', '768', '390'], path: '/student/ai',
    sel: ['.r305ai-head', '.ai-surface-title', '.r305rp-chip', '.r305ai-chip-deep', '.r305rp-band-secondary', '.r305rp-eyebrow'] },
  { role: 'student', slug: 'dashboard', bp: ['1440', '768', '390'], path: '/student/dashboard',
    sel: ['.dash-resume-card', '.dash-resume-eyebrow', '.dash-resume-lecture', '.dash-resume-main', '.dash-resume-course-name', '.momentum-center', '.dash-resume-time'] },
  { role: 'student', slug: 'forbidden-owner-users', bp: ['1440', '768', '390'], path: '/owner/users',
    sel: ['.dash-resume-card', '.dash-resume-eyebrow', '.dash-resume-lecture'] },
  { role: 'student', slug: 'gamification', bp: ['1440', '768', '390'], path: '/student/gamification',
    sel: ['.r305s-band--deep', '.r305g-level', '.r305g-level-title', '.r305g-level-main', '.r305g-level-foot', '.r305a-strip .stat-label', '.r305a-strip .stat-value'] },
  { role: 'student', slug: 'lecture-player', bp: ['1440', '768', '390'], path: '/student/lectures/cmvv0q0uj00fv78snnq41bqs9',
    sel: ['.lecture-meta', '.lecture-meta-title', '.lecture-meta-sub', '.lecture-meta-badges', '.lecture-meta-title .page-index', '.r305s-band-secondary'] },
  { role: 'student', slug: 'profile', bp: ['1440', '768', '390'], path: '/student/profile',
    sel: ['.r305p-hero', '.r305p-hero-name', '.r305p-hero-mail', '.r305p-hero-meter-head', '.r305s-eyebrow'] },
  { role: 'student', slug: 'research', bp: ['1440', '768', '390'], path: '/student/research',
    sel: ['.r305rp-res-band', '.r305rp-eyebrow', '.r305rp-band-secondary', '.r305rp-res-metric-hint', '.r305rp-metric-label', '.r305rp-metric'] },
  { role: 'student', slug: 'results', bp: ['1440', '768', '390'], path: '/student/results',
    sel: ['.results-summary', '.pf-stat-label', '.pf-stat-hint', '.pf-stat', '.pf-statline'] },
  { role: 'student', slug: 'university', bp: ['1440', '768'], path: '/student/university',
    sel: ['.r305s-band--deep', '.r305u-fact-label', '.r305u-fact-value'] },
  { role: 'teacher', slug: 'ai', bp: ['1440', '768', '390'], path: '/teacher/ai',
    sel: ['.r305rp-band--deep', '.r305rp-eyebrow', '.r305rp-band-secondary', '.r305rp-metric-label'] },
];

const browser = await chromium.launch({ executablePath: EXE, args: ['--disable-dev-shm-usage'] });
fs.mkdirSync(OUT, { recursive: true });
const report = [];

for (const r of ROUTES) {
  for (const bp of r.bp) {
    const ctx = await browser.newContext({ viewport: VP_SIZES[bp], deviceScaleFactor: 1, locale: 'ar', colorScheme: 'dark', serviceWorkers: 'block' });
    await ctx.addInitScript(() => { try { sessionStorage.setItem('madarek-intro-skip', '1'); } catch { } });
    await ctx.addInitScript(() => { try { localStorage.setItem('madarek-theme', JSON.stringify({ state: { mode: 'dark', modeUpdatedAt: 1 }, version: 2 })); } catch { } });
    const session = await sessionForEmail(ROLE_EMAIL[r.role]);
    await ctx.addInitScript(({ auth }) => { try { localStorage.setItem('mdrk-auth', auth); } catch { } }, { auth: authStorageJson(session) });
    const page = await ctx.newPage();
    const entry = { route: `${r.role}/${r.slug}`, bp, path: r.path, els: [] };
    try {
      await page.goto(BASE + r.path, { waitUntil: 'load', timeout: 30_000 });
      await page.waitForTimeout(2500);
      await page.evaluate(() => document.fonts?.ready?.catch?.(() => { }));
      await page.waitForTimeout(300);
      entry.els = await page.evaluate((sels) => {
        const lum = (r, g, b) => { const f = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
        const parse = (s) => { const m = s.match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); return m ? { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] } : null; };
        const cr = (l1, l2) => { const a = Math.max(l1, l2), b = Math.min(l1, l2); return (a + 0.05) / (b + 0.05); };
        const out = [];
        for (const sel of sels) {
          const el = document.querySelector(sel);
          if (!el) { out.push({ sel, missing: true }); continue; }
          const cs = getComputedStyle(el);
          const col = parse(cs.color);
          /* the element's own opaque bg, else walk up */
          let w = el; let bg = null; let carrier = null;
          while (w && w !== document.documentElement) {
            const c = parse(getComputedStyle(w).backgroundColor);
            if (c && c.a >= 0.85) { bg = c; carrier = w; break; }
            w = w.parentElement;
          }
          if (!bg) bg = { r: 40, g: 40, b: 40, a: 1 };
          const fs_ = parseFloat(cs.fontSize);
          const fw = parseInt(cs.fontWeight) || 400;
          const large = fs_ >= 24 || (fs_ >= 18.66 && fw >= 700);
          const floor = large ? 3.0 : 4.5;
          out.push({
            sel,
            bg: `${bg.r},${bg.g},${bg.b}`,
            bgLum: +lum(bg.r, bg.g, bg.b).toFixed(3),
            color: cs.color,
            colLum: col ? +lum(col.r, col.g, col.b).toFixed(3) : null,
            cr: col ? +cr(lum(col.r, col.g, col.b), lum(bg.r, bg.g, bg.b)).toFixed(2) : null,
            fontSize: cs.fontSize, fontWeight: cs.fontWeight, floor,
            carrier: carrier ? carrier.tagName + '.' + String(carrier.className).slice(0, 60) : '',
          });
        }
        return out;
      }, r.sel);
    } catch (e) { entry.error = String(e?.message ?? e).slice(0, 200); }
    report.push(entry);
    const fails = entry.els.filter((e) => e.cr != null && e.cr < e.floor);
    process.stdout.write(`  ${r.role}/${r.slug}@${bp} checked=${entry.els.filter((e) => !e.missing).length} belowFloor=${fails.length}${fails.length ? ' → ' + fails.map((f) => f.sel + ' ' + f.cr).join(', ') : ''}\n`);
    await Promise.race([ctx.close(), new Promise((r2) => setTimeout(r2, 4000))]);
  }
}
await Promise.race([browser.close(), new Promise((r2) => setTimeout(r2, 4000))]);
const out = path.join(OUT, 'band-ink-probe.json');
fs.writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), report }, null, 1));
console.log(`→ ${out}`);
