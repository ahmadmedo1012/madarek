#!/usr/bin/env node
/**
 * db-verify — automated post-restore verification (r167).
 *
 * Runs the docs/12-deployment §3 checklist items 1–4 as REAL queries
 * against a restore target and prints a measured PASS/WARN/FAIL verdict.
 * The r167 exercise proved the restore works but the checklist was only
 * printed, never run — and its first operator following it verbatim hit
 * a false failure (prisma_migrations vs the real _prisma_migrations).
 * This script closes both gaps: the checks run, and they pin the real
 * table names.
 *
 * Usage:
 *   STAGE_DIRECT="postgresql://…" npm run db:verify -- --url-env STAGE_DIRECT
 *   npm run db:verify -- --url-env STAGE_DIRECT --help
 *
 * Contract (same family as db-backup/db-restore):
 *   - Target URL arrives via an env NAME (--url-env) — never a literal
 *     argv value, never printed (only redacted).
 *   - --url-env is REQUIRED: an implicit DATABASE_URL default could
 *     silently point verification at the wrong database.
 *   - Read-only: SELECTs only. No guard can make this destructive, but
 *     the URL discipline keeps the family consistent.
 *   - Exit 0 = verification ran and no hard failure; exit 1 = usage
 *     error, missing psql, query failure, or a FAIL verdict.
 *
 * Dependency-free by design (db-ops-lib rule): every import is a node:
 * builtin, so this runs on a bare checkout.
 */
import { spawnSync } from 'node:child_process';
import {
  parseOpsArgs,
  resolveEnvUrl,
  validatePgUrl,
  findBinary,
  missingBinaryMessage,
  redactUrl,
  VERIFY_QUERIES,
  summarizeVerify,
} from './db-ops-lib.mjs';

const SCRIPT = 'db-verify';

function printHelp() {
  console.log(`مدارك — تحقّق ما بعد الاستعادة · Madarek ${SCRIPT}
شغّل فحوص قائمة 12-deployment §3 (العناصر 1–4) كاستعلامات حقيقية واطبع
حكمًا مقيسًا PASS/WARN/FAIL.

Usage:
  STAGE_DIRECT="<url>" npm run ${SCRIPT} -- --url-env STAGE_DIRECT

Options:
  --url-env <name>   (required) اسم متغير البيئة الذي يحمل سلسلة هدف
                     الاستعادة — بالاسم لا بالقيمة؛ القيمة لا تُطبع أبدًا.
  --help             هذه الرسالة.

Read-only — SELECTs فقط؛ لا يكتب أي شيء في أي قاعدة.`);
}

function fail(message) {
  console.error(`⛔ ${message}`);
  process.exitCode = 1;
}

// ─── main ───────────────────────────────────────────────────────────
const args = parseOpsArgs(process.argv.slice(2), { valueOpts: ['--url-env'], flagOpts: [] });

if (args.flags.help) {
  printHelp();
  process.exit(0);
}

const urlEnvName = args.values.urlEnv;
if (!urlEnvName) {
  fail('--url-env إلزامي — لا قراءة ضمنية لـ DATABASE_URL هنا / --url-env is required — no implicit DATABASE_URL default');
  fail('مثال: STAGE_DIRECT="<url>" npm run db:verify -- --url-env STAGE_DIRECT');
  process.exit(1);
}

const targetUrl = resolveEnvUrl(process.env, urlEnvName);
if (!targetUrl.ok) {
  fail(targetUrl.error);
  process.exit(1);
}

const urlCheck = validatePgUrl(targetUrl.url);
if (!urlCheck.ok) {
  fail(urlCheck.error);
  process.exit(1);
}

const psql = findBinary('psql');
if (!psql) {
  console.error(missingBinaryMessage('psql'));
  process.exit(1);
}

console.log(`━━━ مدارك — تحقّق ما بعد الاستعادة · Madarek ${SCRIPT} ━━━`);
console.log(`الهدف / target (${urlEnvName}): ${redactUrl(targetUrl.url)}`);
console.log('');

// ─── run the query set (read-only) ──────────────────────────────────
const results = {};
let queryFailure = false;

for (const q of VERIFY_QUERIES) {
  const run = spawnSync(psql, [targetUrl.url, '-qtA', '-F', ' | ', '-c', q.sql], {
    encoding: 'utf8',
    timeout: 30_000,
  });
  if (run.error || run.status !== 0) {
    const stderr = String(run.stderr || run.error?.message || '').trim().split('\n').slice(-2).join(' ');
    console.error(`❌ فشل استعلام «${q.label}» / query failed: ${stderr}`);
    queryFailure = true;
    continue;
  }
  const rows = String(run.stdout || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  results[q.key] = rows;
  console.log(`✔ ${q.label}:`);
  for (const row of rows.slice(0, 8)) console.log(`    ${row}`);
  if (rows.length > 8) console.log(`    … (+${rows.length - 8})`);
}

if (queryFailure) {
  fail('فشل استعلام واحد على الأقل — تحقّق من الاتصال/المخطط قبل الاعتماد على هذه النسخة / at least one query failed — check connectivity/schema before trusting this restore');
  process.exit(1);
}

// ─── fold measurements into the pure verdict ────────────────────────
const tables = Number.parseInt(String(results.tables?.[0] ?? '0'), 10) || 0;
const migrations = Number.parseInt(String(results.migrations?.[0] ?? '0'), 10) || 0;
const counts = String(results.counts?.[0] ?? ' |  | ').split(' | ');
const users = Number.parseInt(counts[0] ?? '0', 10) || 0;
const enrollments = Number.parseInt(counts[1] ?? '0', 10) || 0;
const notifications = Number.parseInt(counts[2] ?? '0', 10) || 0;
const ownerCount = (results.roles ?? []).filter((row) => row.startsWith('OWNER')).length;

const verdict = summarizeVerify({ tables, migrations, users, ownerCount });

console.log('');
console.log(`عدّادات الصفوف / row counts: مستخدمون ${users} · تسجيلات ${enrollments} · إشعارات ${notifications}`);
console.log('');
console.log('── الحكم / verdict ──');
for (const finding of verdict.findings) console.log(`  ${verdict.level === 'FAIL' ? '⛔' : verdict.level === 'WARN' ? '⚠️' : '✅'} ${finding}`);
console.log('');
if (verdict.level === 'FAIL') {
  console.log('⛔ FAIL — الاستعادة غير سليمة؛ لا تعتمد عليها / the restore is unsound; do not rely on it');
  process.exit(1);
}
if (verdict.level === 'WARN') {
  console.log('⚠️ WARN — الاستعادة تعمل مع ملاحظات أعلاه / restore works with the notes above');
} else {
  console.log('✅ PASS — الاستعادة سليمة (استعلامات قراءة فقط) / restore is sound (read-only checks)');
}
console.log('الخطوات الحيّة المتبقية (لا تُؤتمت هنا): اربط التطبيق بالفرع وتحقّق حيًا (§3 خطوة 5) ثم سجّل النتيجة في docs/runbooks/restore-exercise-log.md');
