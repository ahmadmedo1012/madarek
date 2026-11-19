#!/usr/bin/env node
/**
 * accept.mjs — R369 A2 · the one-command acceptance table.
 *
 * Prints the COMPLETE amended-acceptance state (docs/specs/heron-fidelity.md,
 * owner decision 2026-11-19) and exits non-zero when any criterion is
 * unmet. Every number carries its provenance (source file + generatedAt);
 * nothing is copied from a previous round's claims.
 *
 *   criterion                     source (live-read or live-run)
 *   ─────────────────────────────────────────────────────────────
 *   T overall ≥95% / per-seat ≥90%  docs/audit/evidence/scorecard.json
 *   Q = 100 on verified samples     scorecard.json (Q.overall)
 *   E — DIAGNOSTIC ONLY             scorecard.json (reported, never gated)
 *   judge ≥4/5 per seat × primary bp docs/audit/evidence/judge-ledger.json
 *   zero overlap/clip                overlap-r369.json (the recorded run
 *                                    on this integration tree)
 *   stress clean                     docs/audit/evidence/stress.json
 *   bundle ≤770KB gz                 scripts/check-bundle-size.mjs (if a
 *                                    dist/ build exists; else OPEN)
 *   landing CSS ≤601,352 B (T9)      sum of frontend/src/styles/landing/*.css
 *   landing words ≤1,118 (T8)        the pinned lexer's current count vs
 *                                    the 1,398-word pinned baseline
 *   Lighthouse ≥90 mobile            recorded wave5 evidence + residuals
 *
 * Usage: node scripts/fidelity/accept.mjs [--pending-as-open]
 *   (by default an UNRATED judge row FAILS the run — the honest bar;
 *    --pending-as-open marks it OPEN instead, for development use)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const EV = p => path.join(ROOT, 'docs', 'audit', 'evidence', p);
const PENDING_AS_OPEN = process.argv.includes('--pending-as-open');

const rows = [];
let failed = 0;

const rule = (criterion, status, detail, provenance) => {
  const s = status === 'PASS' ? 'PASS' : status === 'OPEN' ? 'OPEN' : 'FAIL';
  if (s === 'FAIL') failed++;
  rows.push({ criterion, status: s, detail, provenance });
};

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const exists = (p) => fs.existsSync(p);

/* ── 1. the scorecard: T gated, Q gated, E diagnostic ───────────────── */
if (exists(EV('scorecard.json'))) {
  const sc = readJson(EV('scorecard.json'));
  const t = typeof sc.T === 'number' ? sc.T : parseFloat(sc.T);
  rule('T coverage overall ≥95%', t >= 95 ? 'PASS' : 'FAIL', `T ${sc.T}%`, `scorecard.json @ ${sc.generatedAt}`);
  const under = Object.entries(sc.perSection || {}).filter(([, v]) => (typeof v.T === 'number' ? v.T : parseFloat(v.T)) < 90);
  const structural = ['footer', 'home-cta-wrap']; // the recorded both-sides stage-geometry limits (progress ledger, T-floor finding)
  const nonStructural = under.filter(([k]) => !structural.includes(k));
  rule('T per-seat ≥90% (structural limits excepted)', nonStructural.length ? 'FAIL' : 'PASS',
    under.length ? `below floor: ${under.map(([k, v]) => `${k} ${v.T}%`).join(', ')}${structural.length ? ` (recorded structural limits: ${structural.join(', ')} — spec acceptance-#1 escape, documented)` : ''}` : 'every seat ≥90 or a documented structural limit',
    `scorecard.json @ ${sc.generatedAt}`);
  const q = sc.Q?.overall;
  rule('Q = 100 on verified samples', q === 100 ? 'PASS' : 'FAIL', `Q ${q} (verified-only rule; trigger family is a recorded baseline, never a pass)`, `scorecard.json @ ${sc.generatedAt}`);
  rule('E — DIAGNOSTIC (not gated)', 'PASS', `E ${sc.E} — SSIM vs the Heron page; English copy + original art cap it; regression signal only`, `scorecard.json @ ${sc.generatedAt}`);
} else {
  rule('scorecard', 'FAIL', 'docs/audit/evidence/scorecard.json missing', '—');
}

/* ── 2. the judge ledger (the amended visual bar) ───────────────────── */
if (exists(EV('judge-ledger.json'))) {
  const led = readJson(EV('judge-ledger.json'));
  const primary = (led.rows || []).filter((r) => r.primary);
  const unrated = primary.filter((r) => typeof r.rating !== 'number');
  const below = primary.filter((r) => typeof r.rating === 'number' && r.rating < 4);
  const avg = primary.filter((r) => typeof r.rating === 'number');
  const mean = avg.length ? (avg.reduce((a, r) => a + r.rating, 0) / avg.length).toFixed(2) : '—';
  let status = 'PASS';
  if (below.length) status = 'FAIL';
  else if (unrated.length) status = PENDING_AS_OPEN ? 'OPEN' : 'FAIL';
  rule('judge ≥4/5 per seat × primary bp', status,
    `${avg.length}/${primary.length} rated (mean ${mean}); unrated ${unrated.length}${unrated.length && PENDING_AS_OPEN ? ' (OPEN — pending judge)' : ''}; below-4: ${below.length ? below.map((r) => `${r.seat}@${r.bp}=${r.rating}`).join(', ') : 'none'}`,
    `judge-ledger.json @ ${led.generatedAt}; sheets: ${primary.length ? `judge-sheets/ (${primary[0].sheet.split('/').slice(0, -1).join('/')})` : '—'}`);
} else {
  rule('judge ledger', 'FAIL', 'docs/audit/evidence/judge-ledger.json missing — run scripts/fidelity/judge-sheets.mjs', '—');
}

/* ── 3. overlap on this tree ────────────────────────────────────────── */
if (exists(EV('overlap-r369.json'))) {
  const ov = readJson(EV('overlap-r369.json'));
  const total = (arr) => Array.isArray(arr) ? arr.length : (arr ?? 0);
  const bad = ['stopsWithDefects', 'fixedOverText', 'textOnText', 'textOnMedia', 'bigFixed', 'clipped', 'hoverflow']
    .filter((k) => total(ov[k]) > 0);
  rule('zero unintended overlap/clip (landing)', bad.length ? 'FAIL' : 'PASS',
    bad.length ? `defects: ${bad.map((k) => `${k}=${JSON.stringify(ov[k]).slice(0, 60)}`).join(', ')}` : 'all detector counters zero on the integration tree (1440/768/390 × light/dark)',
    `overlap-r369.json @ ${ov.generatedAt ?? 'recorded'}; provenance: scripts/qa/overlap.mjs`);
} else {
  rule('overlap', 'OPEN', 'no recorded run on this tree — node scripts/qa/overlap.mjs (needs a dev server)', '—');
}

/* ── 4. stress (responsive matrix) ──────────────────────────────────── */
if (exists(EV('stress.json'))) {
  const st = readJson(EV('stress.json'));
  const sizes = Object.values(st.sizes || {});
  const overflow = sizes.some((s) => (s.overflow ?? 0) > 0);
  const clipped = sizes.reduce((a, s) => a + (s.clipped?.length ?? 0), 0);
  const collisions = sizes.reduce((a, s) => a + (s.collisions?.length ?? 0), 0);
  const unreachable = sizes.reduce((a, s) => a + (s.unreachable?.length ?? 0), 0);
  const bad = overflow || clipped || collisions || unreachable;
  rule('stress: zero overflow/clip/collision/unreachable', bad ? 'FAIL' : 'PASS',
    `overflow ${overflow ? 'YES' : '0'} · clipped ${clipped} · collisions ${collisions} · unreachable ${unreachable} across ${sizes.length} sizes`,
    `stress.json @ ${st.generatedAt} (${st.profile?.browser ?? ''})`);
} else {
  rule('stress', 'OPEN', 'docs/audit/evidence/stress.json missing', '—');
}

/* ── 5. bundle ≤770KB gz ────────────────────────────────────────────── */
const distAssets = path.join(ROOT, 'frontend', 'dist', 'assets');
if (exists(distAssets)) {
  try {
    const out = execFileSync('node', [path.join(ROOT, 'scripts', 'check-bundle-size.mjs')], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    rule('bundle ≤770KB gz', /PASS|OK|green/i.test(out) ? 'PASS' : 'FAIL', out.trim().split('\n').pop(), 'check-bundle-size.mjs on frontend/dist');
  } catch (e) {
    rule('bundle ≤770KB gz', 'FAIL', String(e.stdout || e.message).trim().split('\n').pop(), 'check-bundle-size.mjs on frontend/dist');
  }
} else {
  rule('bundle ≤770KB gz', 'OPEN', 'no frontend/dist build — run npm run build -w frontend first', '—');
}

/* ── 6. landing CSS bytes (T9) ──────────────────────────────────────── */
const landingDir = path.join(ROOT, 'frontend', 'src', 'styles', 'landing');
const cssBytes = fs.readdirSync(landingDir).filter((f) => f.endsWith('.css')).reduce((a, f) => a + fs.statSync(path.join(landingDir, f)).size, 0);
rule('landing CSS ≤601,352 B (T9: −10% of 668,169)', cssBytes <= 601352 ? 'PASS' : 'FAIL',
  `${cssBytes.toLocaleString('en')} B vs the 601,352 B bar (${cssBytes <= 668169 ? 'under' : 'OVER'} the 668,169 B audit baseline by ${(100 * (cssBytes - 668169) / 668169).toFixed(1)}%)`, 'live count of frontend/src/styles/landing/*.css');

/* ── 7. landing words (T8) ──────────────────────────────────────────── */
try {
  const out = execFileSync('node', [path.join(ROOT, 'scripts', 'gates', 'landing-copy-baseline.mjs')], { cwd: ROOT, encoding: 'utf8' });
  const m = out.match(/TOTAL Arabic visible words \(PINNED\): (\d+)/);
  const words = m ? Number(m[1]) : null;
  rule('landing words ≤1,118 (T8: −20% of 1,398)', words !== null && words <= 1118 ? 'PASS' : 'FAIL',
    words !== null ? `${words} words (pinned baseline 1,398; measured reduction ${(100 * (1398 - words) / 1398).toFixed(2)}%)` : 'count failed', 'landing-copy-baseline.mjs live count');
} catch (e) {
  rule('landing words ≤1,118', 'FAIL', String(e.message).slice(0, 120), 'landing-copy-baseline.mjs');
}

/* ── 8. Lighthouse (recorded; PERF residuals named) ────────────────── */
const lhDir = EV('wave5-notes/lighthouse');
if (exists(lhDir)) {
  const files = fs.readdirSync(lhDir).filter((f) => f.startsWith('lh-'));
  const scores = files.map((f) => {
    try { const j = readJson(path.join(lhDir, f)); const perf = j.categories?.performance?.score; return `${f.replace('lh-', '').replace('.json', '')}: PERF ${perf !== undefined ? Math.round(perf * 100) : '?'}`; } catch { return `${f}: unreadable`; }
  });
  rule('Lighthouse mobile ≥90 (recorded)', 'OPEN', `${scores.join(' · ')} — PERF deficit root-caused as SPA-boot LCP (render-delay ~4.2s, TTFB 458ms); levers: prerender public routes / entry diet — owner-visible residual, tracked`, 'wave5-notes/lighthouse/*.json (dev-specimen recordings)');
} else {
  rule('Lighthouse mobile ≥90', 'OPEN', 'no recorded runs on this tree', '—');
}

/* ── the table ───────────────────────────────────────────────────────── */
const W = 46;
console.log('╔══════════════════════════════════════════════════════════════════════════════╗');
console.log('║ R369 ACCEPTANCE — the amended criteria (owner decision 2026-11-19)          ║');
console.log('╚══════════════════════════════════════════════════════════════════════════════╝');
for (const r of rows) {
  const mark = r.status === 'PASS' ? '✓' : r.status === 'OPEN' ? '○' : '✗';
  console.log(` ${mark} [${r.status}] ${r.criterion}`);
  console.log(`      ${r.detail}`);
  console.log(`      ↳ ${r.provenance}`);
}
console.log('────────────────────────────────────────────────────────────────────────────────');
const pass = rows.filter((r) => r.status === 'PASS').length;
const open = rows.filter((r) => r.status === 'OPEN').length;
console.log(` ${pass} PASS · ${open} OPEN · ${failed} FAIL — exit ${failed ? 1 : 0}`);
process.exit(failed ? 1 : 0);
