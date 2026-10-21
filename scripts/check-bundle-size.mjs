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
     · total gz of all chunks  ≤ 900 KB   (r304 FINAL: 650 → 900 with
       reason — the integration of the nine completed R304 workstreams
       legitimately grows the product: the procedural ribbon artwork +
       the landing story runtime ride the landing chunk, and the
       student / teacher-quality / research-library / admin-owner
       workstreams add their route-level chunks. Measured on the
       integrated tree: 882.4 KB gz / 142 chunks. three.module (171.9
       KB gz) has been a r303+ cost and is NOT the regression. Entry
       (71.4 ≤ 80) and pdf (95.7 ≤ 110) ceilings unchanged — the
       growth is route-level code the gates want visible, not hidden.)
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
const LIMIT_TOTAL_KB = 900; // r304 FINAL: 650→900, documented reason above
const LIMIT_ENTRY_KB = 80;
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
