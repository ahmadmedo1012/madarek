#!/usr/bin/env node
/** R313 parity-table generator — compares reference digest vs a Madarek digest (baseline or after). */
import fs from 'node:fs';
const [,, refPath, madPath, outPath, modeLabel] = process.argv;
const ref = JSON.parse(fs.readFileSync(refPath, 'utf8'));
const mad = JSON.parse(fs.readFileSync(madPath, 'utf8'));
const rows = [];
const add = (area, prop, h, m, status) => rows.push({ area, prop, h: String(h), m: String(m), status });
const norm = (v) => String(v ?? '—').replace(/\s+/g, ' ').trim();

// Paper & palette
add('D1 paper', 'page ground', ref.paper?.bodyBg || '#F6F6EE*', norm(mad.paper?.bodyBg), '');
add('D1 paper', 'html ground', norm(ref.paper?.htmlBg), norm(mad.paper?.htmlBg), '');
add('D1 paper', 'theme-color (light)', '#F6F6EE (canon)', norm(mad.paper?.themeColor), '');
for (const k of Object.keys(ref.palette || {})) add('palette', k, norm(ref.palette[k]), norm(mad.palette?.[k]), '');

// Geometry
for (const k of Object.keys(ref.pageHeight || {})) {
  const h = ref.pageHeight[k], m = mad.pageHeight?.[k];
  const st = (m == null) ? 'missing' : (Math.abs(h - m) / h <= 0.05 ? 'match(±5%)' : 'MISMATCH');
  add('D7 pageHeight', k, `${h}px`, m == null ? '—' : `${m}px`, st);
}
for (const k of Object.keys(ref.rootFontSize || {})) {
  add('D5 rootFontSize', k, norm(ref.rootFontSize[k]), norm(mad.rootFontSize?.[k]), String(ref.rootFontSize[k]) === String(mad.rootFontSize?.[k]) ? 'match' : 'MISMATCH');
}

// Sections
const refSec = (ref.sections || []).map(s => `${s.cls}:${s.height}/${s.pct}%`).join(' → ');
const madSec = (mad.sections || []).map(s => `${s.id || s.cls}:${s.height}/${(s.pct ?? (s.height / (mad.pageHeight?.['1440x900'] || 1)) * 100).toFixed(1)}%`).join(' → ');
add('D7 sections', 'order+heights@1440x900', refSec, madSec, 'MISMATCH (structure differs)');

// Radius / shadows
add('D2 radius', 'policy', `0 everywhere (${(ref.radius?.exceptions || []).length} exceptions)`, norm(mad.radius?.policy) + ` violations=${norm(mad.radius?.violationsCount)}`, '');
for (const e of ref.radius?.exceptions || []) add('D2 radius', 'ref exception', `${e.cls}=${e.value} (${e.what})`, 'n/a (reference-only)', 'documented');
add('D3 shadows', 'policy', `none (${(ref.shadows?.exceptions || []).length} exceptions)`, norm(mad.shadows?.policy) + ` violations=${norm(mad.shadows?.violationsCount)}`, '');
for (const e of ref.shadows?.exceptions || []) add('D3 shadows', 'ref exception', `${e.cls}=${e.value} (${e.what})`, 'n/a (reference-only)', 'documented');

// Header / typography / buttons
add('D8 header', 'height/inset/hideShow', `${ref.header?.height}px / ${ref.header?.insetTop}px / ${ref.header?.hideShow}`, `${mad.header?.height}px / — / ${mad.header?.hideShow}`, '');
for (const k of ['h1', 'h2', 'h3', 'body', 'microMono']) {
  const r = ref.typography?.[k] || {}; const m = mad.typography?.[k] || {};
  add('D5 typography', k, [r.px && `${r.px}px`, r.family, r.weight && `w${r.weight}`, r.transform].filter(Boolean).join(' '), [m.px && `${m.px}px`, m.family, m.weight && `w${m.weight}`, m.transform].filter(Boolean).join(' '), '');
}
for (const b of ref.buttons || []) add('D4 buttons', b.name, `${b.default?.['background-color'] || b.default?.bg || ''} ${b.default?.color || ''} r=${b.default?.['border-radius'] ?? 0} hover=${b.hoverSwap || ''}`.trim(), '(see WP-D)', '');
add('D4 inputs', 'border/focus', '1px #B3B3AF → focus #ED4C1F → filled #FA3600 (.45s)', norm(mad.inputs?.[0]?.default?.border) || '—', '');

// Behaviour
add('D10 loader', 'visible/logLines/exit/gating', `${ref.loader?.visibleMs}ms / ${ref.loader?.logLines} lines / exit ${ref.loader?.exitMs}ms ${ref.loader?.exitGeometry} / ${ref.loader?.gating}`, `${mad.loader?.visibleMs}ms / ${mad.loader?.logLines} lines / exit ${mad.loader?.exitMs}ms / ${mad.loader?.gating}`, '');
add('D11 routeTransition', 'duration/geometry', `${ref.routeTransition?.durationMs}ms ${ref.routeTransition?.geometry}`, `${mad.routeTransition?.durationMs}ms ${mad.routeTransition?.geometry}`, '');
add('D6 scroll', 'engine/params/tail', `${ref.scroll?.engine} ${JSON.stringify(ref.scroll?.params || {})} tail=${ref.scroll?.probeTailMs}ms`, `${mad.scroll?.engine} tail=${mad.scroll?.probeTailMs}ms`, '');
add('D12 cursor', 'present/params', `${ref.cursor?.present} ${ref.cursor?.square} reticle=${ref.cursor?.reticle}`, norm(mad.cursor?.present), '');
add('D15 cookie', 'banner', JSON.stringify(ref.cookieBanner || null), JSON.stringify(mad.cookieBanner || 'none'), '');

// Status column fill
for (const r of rows) if (r.status === '') r.status = (norm(r.h).toLowerCase() === norm(r.m).toLowerCase()) ? 'match' : 'MISMATCH';

const counts = { match: rows.filter(r => r.status.startsWith('match') || r.status === 'documented').length, mismatch: rows.filter(r => r.status.includes('MISMATCH')).length, missing: rows.filter(r => r.status === 'missing').length };
let md = `# R313 parity table — ${modeLabel || 'baseline'} vs reference\n\nGenerated: ${new Date().toISOString()}\n\n**Summary: ${counts.match} match/documented · ${counts.mismatch} mismatches · ${counts.missing} missing**\n\n`;
md += `*Reference = heronaiapp.com live census (audits/evidence/r313/reference/digest.json). Madarek = ${madPath}.*\n\n`;
md += `| Area | Property | Heron (reference) | Madarek (${modeLabel || 'current'}) | Status |\n|---|---|---|---|---|\n`;
for (const r of rows) md += `| ${r.area} | ${r.prop} | ${r.h} | ${r.m} | ${r.status} |\n`;
fs.writeFileSync(outPath, md);
console.log(`wrote ${outPath}: ${JSON.stringify(counts)}`);
