#!/usr/bin/env node
/**
 * judge-sheets.mjs — R369 A2 · the paired-sheet judge pipeline.
 *
 * Builds the deterministic judging surface for the AMENDED acceptance
 * (docs/specs/heron-fidelity.md, owner decision 2026-11-19): for each
 * of the ten landing seats × breakpoint × valid state, a triptych
 * [ Heron reference | ours | overlay ] composed from the COMMITTED
 * conformance capture (docs/audit/evidence/capture.json + the crops
 * under docs/audit/evidence/primary/{reference,local}/ — local-only
 * paths under the evidence policy), then one CONTACT SHEET per
 * seat × breakpoint (states stacked, labelled, palette-compressed).
 *
 * Output policy (the evidence law):
 *   · ALL sheets land in docs/audit/evidence/.local/judge/ (gitignored).
 *   · The PRIMARY breakpoint set (390 · 768 · 1440) is copied to the
 *     tracked docs/audit/evidence/judge-sheets/ ONLY while the total
 *     stays ≤ the committed budget (1.5 MB); the tool exits 1 if the
 *     primary set cannot fit at acceptable quality.
 *   · The rating ledger docs/audit/evidence/judge-ledger.json is
 *     (re)written with one row per seat × bp — rating null until a
 *     judge fills it. scripts/fidelity/accept.mjs enforces ≥4/5 on
 *     the primary rows.
 *
 * Usage: node scripts/fidelity/judge-sheets.mjs
 *   [--bps 390,768,1440]     primary set (default 390,768,1440)
 *   [--all-bps 390,768,1024,1440,1920]  what gets built into .local/
 *   [--budget-kb 1536]       committed budget
 *   [--rebuild]              regenerate even if outputs exist
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const sharp = require('sharp');

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..', '..');
const EV = path.join(ROOT, 'docs', 'audit', 'evidence');
const LOCAL_OUT = path.join(EV, '.local', 'judge');
const TRACKED_OUT = path.join(EV, 'judge-sheets');
const LEDGER = path.join(EV, 'judge-ledger.json');
const BUDGET_KB_DEFAULT = 1536;

const arg = (name, dflt) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : dflt;
};
const PRIMARY = (arg('bps', '390,768,1440')).split(',').map((s) => s.trim());
const ALL_BPS = (arg('all-bps', '390,768,1024,1440,1920')).split(',').map((s) => s.trim());
const BUDGET_KB = Number(arg('budget-kb', String(BUDGET_KB_DEFAULT)));
const REBUILD = process.argv.includes('--rebuild');

/* ── the seat registry (the conformance instrument's own keys) ─────── */
const SEAT_AR = {
  'home-hero-wrap': 'البطل',
  'home-intro-wrap': 'المقدمة',
  'home-problem-wrap': 'المشكلة',
  'home-why-wrap': ' ' + 'السبب',
  'home-platform-wrap': 'المنصة',
  'home-map-wrap': 'الرحلة',
  'home-usecase-wrap': 'الأدوار',
  'home-cta-wrap': 'الدعوة',
  footer: 'التذييل',
  chrome: 'الإطار',
};

const rel = (absPath) => absPath.replace(/^\/home\/z\/madarek\//, ROOT + path.sep).replace(/^\/home\/z\/madarek$/, ROOT);

const load = async (p) => sharp(rel(p)).png();

/* One triptych row: [ref | ours | overlay], scaled to panel width. */
async function triptych(refFile, ourFile, panelW, label) {
  const ref = await load(refFile);
  const our = await load(ourFile);
  const rm = await ref.metadata();
  const om = await our.metadata();
  const h = Math.min(rm.height, om.height);
  const refB = await ref.extract({ left: 0, top: 0, width: Math.min(rm.width, panelW), height: h }).resize(panelW, h, { fit: 'fill' }).png().toBuffer();
  const ourB = await our.extract({ left: 0, top: 0, width: Math.min(om.width, panelW), height: h }).resize(panelW, h, { fit: 'fill' }).png().toBuffer();
  const overB = await sharp(refB).composite([{ input: ourB, blend: 'over', opacity: 0.5 }]).png().toBuffer();
  const labelBar = Buffer.from(
    `<svg width="${panelW * 3}" height="26" xmlns="http://www.w3.org/2000/svg">` +
      `<rect width="100%" height="100%" fill="#111"/>` +
      `<text x="12" y="18" font-family="monospace" font-size="14" fill="#fff">${label}</text>` +
      `<text x="${panelW + 12}" y="18" font-family="monospace" font-size="14" fill="#fff">HERON</text>` +
      `<text x="${panelW * 2 + 12}" y="18" font-family="monospace" font-size="14" fill="#fff">OURS · OVERLAY</text>` +
      `</svg>`,
  );
  const row = await sharp({ create: { width: panelW * 3, height: h, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .composite([{ input: refB, left: 0, top: 0 }, { input: ourB, left: panelW, top: 0 }, { input: overB, left: panelW * 2, top: 0 }])
    .png()
    .toBuffer();
  return sharp({ create: { width: panelW * 3, height: h + 26, channels: 3, background: { r: 255, g: 255, b: 255 } } })
    .composite([{ input: labelBar, left: 0, top: 0 }, { input: row, left: 0, top: 26 }])
    .png()
    .toBuffer();
}

async function contactSheet(parts) {
  const metas = await Promise.all(parts.map((b) => sharp(b).metadata()));
  const width = Math.max(...metas.map((m) => m.width));
  const gap = 10;
  let y = 0;
  const comps = [];
  for (let i = 0; i < parts.length; i++) {
    comps.push({ input: parts[i], left: 0, top: y });
    y += metas[i].height + gap;
  }
  return sharp({ create: { width, height: y, channels: 3, background: { r: 255, g: 255, b: 255 } } }).composite(comps).png({ palette: true, quality: 90, compressionLevel: 9 }).toBuffer();
}

const STATE_AR = { entry: 'دخول', mid30: 'منتصف-٣٠', mid60: 'منتصف-٦٠', exit: 'خروج', end: 'خاتمة' };

/* Budget-fit pass: scale a full sheet to the attempt's panel width and
 * height cap, palette-quantize at the attempt's quality. */
async function fit(fullPath, { panelW, quality, maxH }) {
  const img = sharp(fullPath);
  const m = await img.metadata();
  const scale = Math.min(panelW / m.width, maxH / m.height, 1);
  return img
    .resize(Math.max(1, Math.round(m.width * scale)), Math.max(1, Math.round(m.height * scale)), { fit: 'fill' })
    .png({ palette: true, quality, compressionLevel: 9 })
    .toBuffer();
}

async function main() {
  const capture = JSON.parse(fs.readFileSync(path.join(EV, 'capture.json'), 'utf8'));
  fs.mkdirSync(LOCAL_OUT, { recursive: true });
  fs.mkdirSync(TRACKED_OUT, { recursive: true });

  const ledger = [];
  const built = [];

  for (const row of capture.rows) {
    const seat = row.key;
    const bp = String(row.bp);
    if (!ALL_BPS.includes(bp)) continue;
    const parts = [];
    const states = [];
    const ours = row.local?.states ?? {};
    const refs = row.reference?.states ?? {};
    for (const st of ['entry', 'mid30', 'mid60', 'exit', 'end']) {
      const L = ours[st];
      const R = refs[st];
      if (!L?.ok || !R?.ok || !L.file || !R.file) continue;
      if (!fs.existsSync(rel(L.file)) || !fs.existsSync(rel(R.file))) continue;
      states.push(st);
      const panelW = 520;
      const label = `${seat} · ${bp}px · ${st} (${STATE_AR[st] ?? st}) · ${SEAT_AR[seat] ?? ''}`;
      parts.push(await triptych(R.file, L.file, panelW, label));
    }
    if (!parts.length) continue;
    const sheet = await contactSheet(parts);
    const name = `${seat}.${bp}.png`;
    /* the FULL sheet (the .local archive copy) + the fitted committed copy */
    fs.writeFileSync(path.join(LOCAL_OUT, `${seat}.${bp}.full.png`), sheet);
    built.push({ seat, bp, states, name, kb: Math.round(sheet.length / 102.4) / 10 });
    const isPrimary = PRIMARY.includes(bp);
    ledger.push({
      seat, bp, primary: isPrimary, states,
      sheet: isPrimary ? `docs/audit/evidence/judge-sheets/${name}` : `docs/audit/evidence/.local/judge/${name}`,
      rating: null, defects: [], reviewer: null, date: null,
    });
  }

  /* the primary set rides the repo under the budget; the rest stay local.
   * Budget-first: progressively tighter quantization (palette quality,
   * then narrower panels) until the committed set fits — the judge
   * surface scales, the judged pixels never change. */
  const primaryRows = ledger.filter((r) => r.primary);
  let committed = Infinity;
  const attempts = [
    { panelW: 520, quality: 90, maxH: 2600 },
    { panelW: 460, quality: 85, maxH: 2200 },
    { panelW: 420, quality: 80, maxH: 2000 },
    { panelW: 380, quality: 75, maxH: 1800 },
    { panelW: 340, quality: 70, maxH: 1600 },
  ];
  let used = null;
  for (const attempt of attempts) {
    committed = 0;
    for (const r of primaryRows) {
      const name = r.sheet.split('/').pop();
      const buf = await fit(path.join(LOCAL_OUT, `${r.seat}.${r.bp}.full.png`), attempt);
      fs.writeFileSync(path.join(LOCAL_OUT, name), buf);
      fs.writeFileSync(path.join(TRACKED_OUT, name), buf);
      committed += buf.length;
      r.kb = Math.round(buf.length / 102.4) / 10;
    }
    if (committed <= BUDGET_KB * 1024) { used = attempt; break; }
  }
  if (!used) {
    console.error(`judge-sheets: primary set cannot fit ${BUDGET_KB}KB even at ${JSON.stringify(attempts[attempts.length - 1])} — narrow --bps or raise --budget-kb (owner decision)`);
    process.exit(1);
  }

  fs.writeFileSync(LEDGER, JSON.stringify({ generatedAt: new Date().toISOString(), primary: PRIMARY, budgetKb: BUDGET_KB, rows: ledger }, null, 2) + '\n');

  const totalKb = built.reduce((a, b) => a + b.kb, 0);
  console.log(`judge-sheets: ${built.length} sheets built (${totalKb.toFixed(0)}KB) under .local/judge/; ${primaryRows.length} primary sheets committed ${(committed / 1024).toFixed(0)}KB ≤ ${BUDGET_KB}KB; ledger rows: ${ledger.length} (rating null — the judge fills them).`);
  console.log(`judge-sheets: per-seat state coverage:`);
  for (const b of built) console.log(`  ${b.name}  ${b.kb}KB  [${b.states.join(',')}]`);
}

main().catch((e) => { console.error('judge-sheets:', e.message); process.exit(1); });
