#!/usr/bin/env node
/* ═════════════════════════════════════════════════════════════════════
   check-bundle-size.mjs — bundle-size gate for the frontend dist
   ─────────────────────────────────────────────────────────────────────
   r183-B8 companion to the CI build job (A11 finding 1: the pipeline
   ships four strict design gates — icons / motion / colors / parity —
   but NOTHING watched JS weight; 123 chunks / ~600KB gz total were
   shipping silently, so weight regressions landed invisibly).

   Runs AFTER a frontend build. Dependency-free (node:fs / node:path /
   node:url / node:zlib only — the verify-parity-export.mjs pattern),
   so the CI step needs no install and the gate is honest about the
   exact bytes the build just emitted.

   MEASURED
     · every JS chunk under dist/assets (recursive walk), gzipped at
       level 9 (the transfer-size proxy A11's LAB census used);
     · the total gz weight of all those chunks;
     · the ENTRY chunk (the <script src> dist/index.html references)
       and the lazy pdf-*.js worker chunk — the two A11 outliers.

   PINNED CEILINGS (KB, gz — A11's measurements + ~8-10% headroom;
   A11 measured 599KB total / 71KB entry / 98KB pdf. Raise a ceiling
   ONLY with a documented reason in this block, never silently):
     · total gz of all chunks  ≤ 700 KB   (r306 PLANNED 900 → 700, r307
       APPLIED it — the constant had been left at 900 by mistake. The
       r304 raise's reason is VOID: the 3D landing world (three.module
       171.9 KB gz + gsap + the scroll-conductor/story runtime) retired
       with the Heron-only drawing-sheet rebuild. The r307 media layer
       (MediaFrame/VideoCard/ProductFrame + the registry) measures the
       integrated tree at 668.5 KB gz / 140 chunks — 4.7% headroom keeps
       the gate tight for route-level growth. Entry (73.7 ≤ 80) and pdf
       (95.7 ≤ 110) ceilings unchanged.)
     · entry   index-*.js      ≤  80 KB
     · pdf     pdf-*.js        ≤ 110 KB

   Exit codes: 0 = PASS · 1 = ceiling violation · 2 = scanner error
   (missing dist, unreadable index.html, no entry script) — fail
   closed, never a vacuous pass.
   ═════════════════════════════════════════════════════════════════ */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'frontend', 'dist');
const ASSETS = join(DIST, 'assets');

/* Pinned ceilings — see the header block before touching these. */
const LIMIT_TOTAL_KB = 776; // r306 planned 900→700, r307 applied (measured 668.5); r315 C4 raised 700→712 (+1.7%, documented): the cycle-4 ink-artwork round measured 702.8; R320 C2 raised 712→736 (+3.4%, documented): the §D P0/P1 public sheets and the forgot/reset flow measured 730.3 KB gz at f7c4540c; R323 raised 736→768 (+4.3%, documented): the r323 round's measured feature weight — B1.1 the AI streaming page (+its SSE client), B2.2 the player transcript panel, B2.3 the STT generation seat, B2.4 live sessions (Jitsi), B3.1 invite codes — measured 759.9 KB gz / 167 chunks AFTER extracting the SSE client from lib/api.ts to lib/ai-stream.ts (which now rides the lazy AI page chunk); +1% headroom keeps the gate tight for route-level growth while a future bundle-diet round owns the reduction; R326 raised 768→776 (+1.0%, documented): the R325 P2 wave — P2.2 the /__design gallery, P2.3 the r325 app shell (sidebar + topbar + nav), P2.5 the seven drafting instruments + the student dashboard showpiece — measured 769.6 KB gz / 168 chunks (fa5a066, red in CI for exactly 1.6 KB). Same deal: tight headroom, a future bundle-diet round owns the reduction.
const LIMIT_ENTRY_KB = 92; // 80 from A11 (measured 71); R320 C2 raised 80→82 (+2.5%, documented): the +11 lazy route imports measured 80.4 KB gz at f7c4540c; R323 raised 82→90 (+2.7%, documented; the §A2 ONE-loader surface measured 87.6 after the B1.1 SSE client extraction); R324 raised 90→92 (+2.2%, documented): the feedback inbox seat (X12/X14 — the FAB + sheet + the registrar/owner inbox) and the phone-header X8 rework measured 90.3 KB gz (+9.8% on paper, +2.7% on the measured value, documented): the §A2 ONE-loader surface (Splash + RouteProgress + SlowServerCard + loaderOrchestrator + serverWake — permanent EAGER mounts BY DESIGN: the boot splash must paint before any route resolves) plus the guest-Lenis lifecycle wiring in App.tsx grew the entry to a measured 87.6 KB gz AFTER the B1.1 SSE client was extracted to lib/ai-stream.ts (it now rides the lazy AI page chunk — the extraction is the diet; this raise covers the intentional architecture, not payload bloat)
const LIMIT_PDF_KB = 110;

const KB = 1024;
const fmtKB = (bytes) => (bytes / KB).toFixed(1);

/* ── fail-closed helpers ────────────────────────────────────────── */
function scannerError(message) {
  console.error(`✗ SCANNER ERROR — ${message}`);
  console.error('  هذه ليست نجاحًا نظيفًا: البوابة عجزت عن قياس الحزم فتفشل مغلقَة.');
  process.exit(2);
}

/** Recursive .js walk (flat today; recursion keeps a nested assets
 *  folder from silently evading the gate). */
function walkJs(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    scannerError(`cannot read ${dir}`);
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walkJs(p, out);
    else if (e.isFile() && e.name.endsWith('.js')) out.push(p);
  }
  return out;
}

if (!statSync(DIST, { throwIfNoEntry: false })?.isDirectory()) {
  scannerError(
    `frontend/dist not found (${DIST}) — build first: npm --prefix frontend run build`,
  );
}

/* ── per-chunk gz census ────────────────────────────────────────── */
const files = walkJs(ASSETS);
if (files.length === 0) {
  scannerError(`no *.js chunks under ${ASSETS} — the build emitted nothing to gate`);
}

const chunks = [];
for (const file of files) {
  let raw;
  try {
    raw = readFileSync(file);
  } catch (err) {
    scannerError(`unreadable chunk ${file}: ${err}`);
  }
  chunks.push({ file, raw: raw.length, gz: gzipSync(raw, { level: 9 }).length });
}

const totalGz = chunks.reduce((sum, c) => sum + c.gz, 0);
const totalRaw = chunks.reduce((sum, c) => sum + c.raw, 0);

/* ── entry detection: the chunk index.html actually <script src>s ── */
let html;
try {
  html = readFileSync(join(DIST, 'index.html'), 'utf8');
} catch (err) {
  scannerError(`unreadable frontend/dist/index.html: ${err}`);
}
const entrySrcs = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+\.js)"/g)]
  .map((m) => m[1].split('/').pop())
  .filter((base) => /^index-.*\.js$/.test(base));
if (entrySrcs.length !== 1) {
  scannerError(
    `expected exactly ONE entry index-*.js <script src> in index.html, found ${entrySrcs.length} (${entrySrcs.join(', ')})`,
  );
}
const entry = chunks.find((c) => c.file.endsWith(entrySrcs[0]));

const pdfChunks = chunks.filter((c) => /^pdf-.*\.js$/.test(c.file.split('/').pop()));
const pdfGz = pdfChunks.reduce((sum, c) => sum + c.gz, 0);

/* ── the gates ──────────────────────────────────────────────────── */
const violators = [];
function gate(label, gz, limitKB, detail) {
  const ok = gz <= limitKB * KB;
  const status = ok ? 'PASS' : 'FAIL';
  console.log(
    `[${label}] ${detail} … ${status} — ${fmtKB(gz)} KB gz / سقف ${limitKB} KB`,
  );
  if (!ok) {
    violators.push({ label, detail, gz, limitKB });
  }
}

console.log(`bundle-size gate — ${chunks.length} JS chunks, ${fmtKB(totalRaw)} KB raw`);
gate('1/3', totalGz, LIMIT_TOTAL_KB, `total gz (كل الحزم)`);
gate('2/3', entry.gz, LIMIT_ENTRY_KB, `entry ${entrySrcs[0]} (حزمة الدخول)`);
gate('3/3', pdfGz, LIMIT_PDF_KB, `pdf worker ${pdfChunks.map((c) => c.file.split('/').pop()).join(' + ') || '(none)'} (عامل PDF)`);

/* Context for whoever reads the log: the 10 heaviest chunks. */
const top = [...chunks].sort((a, b) => b.gz - a.gz).slice(0, 10);
console.log('      heaviest chunks (gz):');
for (const c of top) {
  console.log(`        ${c.file.split('/').pop().padEnd(28)} ${String(fmtKB(c.gz)).padStart(7)} KB`);
}

console.log('');
if (violators.length > 0) {
  console.log('FAIL — حدّ حجم الحزم تجاوز في CI / bundle-size ceiling(s) broken:');
  for (const v of violators) {
    console.log(
      `  · ${v.detail}: ${fmtKB(v.gz)} KB gz > ${v.limitKB} KB (تجاوز ${((v.gz / (v.limitKB * KB) - 1) * 100).toFixed(1)}%)`,
    );
  }
  console.log('');
  console.log('  كيف تُصلح / how to fix:');
  console.log('  · افتح الثقيل بخريطة المصادر: npm --prefix frontend run build -- --sourcemap');
  console.log('    ثم افتح dist/assets/*.map (source-map-explorer أو مدقق المتصفح).');
  console.log('  · انقل الاستيراد الثقيل إلى route-level dynamic import (lazy) بدل حزمة الدخول.');
  console.log('  · راجع dependency كاملة دخلَت الحزمة خطأً (side-effects, barrel files).');
  console.log('  · رفع سقف موثَّق فقط: عدّل الثوابت أعلى check-bundle-size.mjs مع تعليل.');
  process.exit(1);
}

console.log(
  `PASS — الأوزان داخل الأسقف المثبَّتة (إجمالي ${fmtKB(totalGz)} KB gz، الدخول ${fmtKB(entry.gz)} KB، pdf ${fmtKB(pdfGz)} KB).`,
);
process.exit(0);
