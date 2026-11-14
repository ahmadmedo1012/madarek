#!/usr/bin/env node
/**
 * gen-permissions-doc.mjs — R353 E3: render docs/PERMISSIONS.md from
 * shared/permissions-matrix.ts (the auditable contract). Run via
 * `node scripts/gates/gen-permissions-doc.mjs` (no deps — the matrix
 * is parsed from source with the same regex discipline as the
 * roleLabels belt test, so backend/frontend runners never import each
 * other's graphs).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..', '..');
const src = readFileSync(path.join(root, 'shared', 'permissions-matrix.ts'), 'utf8');

/** Extract rows via a permissive JSON-ish scan of the literal array. */
function parseRows(source) {
  const rows = [];
  const arrayBody = source.match(/export const PERMISSIONS_MATRIX[^=]*=\s*\[([\s\S]*?)\n\]\s*as const;/)?.[1] ?? '';
  const rowRe = /\{\s*resource:\s*'([^']*)',\s*resourceAr:\s*'([^']*)',\s*action:\s*'([^']*)',\s*seats:\s*\[([^\]]*)\],\s*scope:\s*'([^']*)'(?:,\s*note:\s*'((?:[^'\\]|\\.)*)')?\s*\}/g;
  for (const m of arrayBody.matchAll(rowRe)) {
    rows.push({
      resource: m[1], resourceAr: m[2], action: m[3],
      seats: [...m[4].matchAll(/'([^']*)'/g)].map((x) => x[1]),
      scope: m[5], note: m[6]?.replace(/\\'/g, "'") ?? null,
    });
  }
  return rows;
}

/** Extract the seat labels map. */
function parseSeatLabels(source) {
  const labels = {};
  const body = source.match(/export const SEAT_LABELS_AR[^{]*\{([\s\S]*?)\n\};/)?.[1] ?? '';
  for (const m of body.matchAll(/^\s*(?:'([^']+)'|([A-Z_]+)):\s*'([^']*)'/gm)) labels[m[1] ?? m[2]] = m[3];
  return labels;
}

const rows = parseRows(src);
const labels = parseSeatLabels(src);
if (rows.length < 20) { console.error(`parsed only ${rows.length} rows — refusing to write`); process.exit(1); }

const ACTION_AR = { view: 'اطلاع', create: 'إنشاء', edit: 'تعديل', delete: 'حذف', approve: 'اعتماد', grade: 'تقييم', assign: 'إسناد' };
const SCOPE_AR = { enrolled: 'المسجَّل فيه فقط', own: 'ما يملكه فقط', department: 'قسمه', faculty: 'كليته', institution: 'المؤسسة', platform: 'المنصة كلها' };

// group by resource
const byResource = new Map();
for (const r of rows) {
  if (!byResource.has(r.resource)) byResource.set(r.resource, []);
  byResource.get(r.resource).push(r);
}

let md = `# PERMISSIONS — the matrix (R353 E3)

Generated from \`shared/permissions-matrix.ts\` by \`scripts/gates/gen-permissions-doc.mjs\` — edit the TABLE, never this file. The seats follow docs/ROLES-LIBYA.md. The enforcement points: backend \`requireRole\` / \`requireCapability\` / ownership asserts (\`backend/src/lib/permissions.ts\`); the menus: \`frontend/src/lib/nav.ts\`. The matrix test keeps table ↔ reality honest.

## The seats

| Seat | Arabic label | AuthN role | Office / position |
|---|---|---|---|
| STUDENT | ${labels.STUDENT} | STUDENT | — |
| TEACHER | ${labels.TEACHER} | TEACHER | — (all faculty ranks are profile data) |
| TEACHER+DEAN | ${labels['TEACHER+DEAN']} | TEACHER | عميد الكلية (position + positionFacultyId) |
| TEACHER+ASSOCIATE_DEAN | ${labels['TEACHER+ASSOCIATE_DEAN']} | TEACHER | وكيل الكلية |
| TEACHER+DEPARTMENT_HEAD | ${labels['TEACHER+DEPARTMENT_HEAD']} | TEACHER | رئيس القسم |
| ADMIN+REGISTRAR_GENERAL | ${labels['ADMIN+REGISTRAR_GENERAL']} | ADMIN | المسجل العام (unscoped) |
| ADMIN+COLLEGE_REGISTRAR | ${labels['ADMIN+COLLEGE_REGISTRAR']} | ADMIN | مسجل الكلية (scopeFacultyId) |
| QUALITY+EXAMS_CONTROLLER | ${labels['QUALITY+EXAMS_CONTROLLER']} | QUALITY | قسم الدراسة والامتحانات (owns EXAMS_MODERATE) |
| QUALITY+QUALITY_OFFICER | ${labels['QUALITY+QUALITY_OFFICER']} | QUALITY | مكتب الجودة (no exam moderation) |
| OWNER | ${labels.OWNER} | OWNER | platform owner |

## The matrix (${rows.length} rules)

`;
for (const [resource, list] of byResource) {
  const ar = list[0].resourceAr;
  md += `### ${resource} — ${ar}\n\n| Action | Seats | Scope | Note |\n|---|---|---|---|\n`;
  for (const r of list) {
    const seats = r.seats.length ? r.seats.map((s) => labels[s] ?? s).join(' · ') : '_none (by design)_';
    md += `| ${ACTION_AR[r.action] ?? r.action} (${r.action}) | ${seats} | ${SCOPE_AR[r.scope] ?? r.scope} | ${r.note ? r.note.replace(/\|/g, '\\|') : '—'} |\n`;
  }
  md += '\n';
}
md += `_Regenerated ${new Date().toISOString().slice(0, 10)} · ${rows.length} rules · ${byResource.size} resources._\n`;

writeFileSync(path.join(root, 'docs', 'PERMISSIONS.md'), md);
console.log(`docs/PERMISSIONS.md written: ${rows.length} rules, ${byResource.size} resources`);
