#!/usr/bin/env node
/**
 * db-restore — operator-side PostgreSQL restore via pg_restore (r166c).
 *
 * Wraps the runbook canon (docs/12-deployment.md §«النسخ الاحتياطي
 * والاستعادة»): `pg_restore --no-owner --no-privileges --dbname=…`
 * with the same safety posture as scripts/smoke-deploy.mjs:
 * dependency-free (node: builtins only), bilingual, URL redaction in
 * ALL output, exit 0/1.
 *
 * Safety contract (the parts that differ from db-backup on purpose):
 *   1. The TARGET is an EXPLICIT act: --url-env <ENV_VAR> is REQUIRED —
 *      the script never falls back to DATABASE_URL for the target.
 *   2. HARD GUARD: if the resolved target equals process.env.DATABASE_URL
 *      (the live database), the script REFUSES unless
 *      --confirm-live-restore is passed. Restoring over the live DB is
 *      a documented, conscious decision — never an accident.
 *   3. After a successful restore it prints the docs/12 §3 verification
 *      checklist (row counts, migrations table) — an unrestored-looking
 *      restore is not done.
 *
 * Usage:
 *   STAGE_DIRECT='postgresql://…' npm run db:restore -- --url-env STAGE_DIRECT --file backups/madarek-….dump
 *   npm run db:restore -- --url-env STAGE_DIRECT --file <dump> --dry-run
 *   # (restore over the live DB — refused by default:)
 *   npm run db:restore -- --url-env DATABASE_URL --file <dump> --confirm-live-restore
 *
 * OWNER/ops tool — NOT part of CI. The dump file is read locally; the
 * target URL is read from the named env var (never literal argv, never
 * printed unredacted).
 */

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import {
  buildRestoreCommand,
  displayCommand,
  findBinary,
  liveRestoreGuard,
  missingBinaryMessage,
  parseOpsArgs,
  redactUrl,
  resolveEnvUrl,
  validatePgUrl,
} from './db-ops-lib.mjs';

const PG_RESTORE = 'pg_restore';

const HELP = [
  'الاستخدام / usage:',
  '  npm run db:restore -- --url-env <ENV_VAR> --file <dump> [--dry-run] [--confirm-live-restore]',
  '',
  'الوسائط / options:',
  '  --url-env <ENV_VAR>  (إلزامي) اسم متغير البيئة الحامل لسلسلة اتصال الهدف — لا يُقرأ DATABASE_URL ضمنيًا أبدًا',
  '                       (required) env var holding the TARGET connection URL — DATABASE_URL is never implicit',
  '  --file <dump>        (إلزامي) ملف النسخة (مخرجات db-backup) — ملف .dump بصيغة custom',
  '                       (required) the dump file (db-backup output, custom format)',
  '  --dry-run            اطبع الأمر الدقيق فقط (السلسلة مُقنَّعة) بلا تنفيذ — الحارس يعمل حتى هنا',
  '                       print the exact command (URL redacted); the live guard still runs',
  '  --confirm-live-restore  تجاوز واعٍ وموثَّق لحارس «الهدف = قاعدة الإنتاج» — للطوارئ فقط',
  '                       conscious override of the live-DB guard (emergencies only)',
  '  -h, --help           هذه المساعدة / this help',
  '',
  'أمثلة / examples:',
  "  STAGE_DIRECT='postgresql://…' npm run db:restore -- --url-env STAGE_DIRECT --file backups/madarek-20261015T090000Z.dump",
  '  npm run db:restore -- --url-env STAGE_DIRECT --file backups/x.dump --dry-run',
].join('\n');

async function main() {
  const { values, flags, errors, help } = parseOpsArgs(process.argv.slice(2), {
    valueOpts: ['--url-env', '--file'],
    flagOpts: ['--dry-run', '--confirm-live-restore'],
  });

  if (help) {
    console.log(HELP);
    if (errors.length > 0) {
      console.log('\nأخطاء / errors:');
      for (const e of errors) console.log(`  - ${e}`);
    }
    process.exitCode = errors.length > 0 ? 1 : 0;
    return;
  }
  if (errors.length > 0) {
    for (const e of errors) console.error(`خطأ / error: ${e}`);
    console.error('شغّل --help للمساعدة / run with --help for usage');
    process.exitCode = 1;
    return;
  }

  // 1) The TARGET env var name is REQUIRED — a restore is never implicit.
  if (!values.urlEnv) {
    console.error('خطأ / error: --url-env <ENV_VAR> إلزامي — الاستعادة إلى هدف صريح قرار واعٍ، لا قراءة ضمنية لـ DATABASE_URL.');
    console.error('        --url-env <ENV_VAR> is required: the restore target must be an explicit act, never DATABASE_URL by default.');
    process.exitCode = 1;
    return;
  }
  if (!values.file) {
    console.error('خطأ / error: --file <dump> إلزامي / --file <dump> is required.');
    process.exitCode = 1;
    return;
  }

  const resolved = resolveEnvUrl(process.env, values.urlEnv);
  if (!resolved.ok) {
    console.error(`خطأ / error: ${resolved.error}`);
    console.error(`صدّر المتغير أولًا / export it first:  export ${values.urlEnv}='postgresql://user:pass@host/db?sslmode=require'`);
    process.exitCode = 1;
    return;
  }
  const targetUrl = resolved.url;

  const validation = validatePgUrl(targetUrl);
  if (!validation.ok) {
    console.error(`خطأ / error: ${validation.error}`);
    process.exitCode = 1;
    return;
  }

  // 2) HARD GUARD — runs in dry-run too: printing "the command that would
  //    restore over production" is exactly the moment to warn.
  const guard = liveRestoreGuard({
    targetUrl,
    liveUrl: process.env.DATABASE_URL,
    confirmLiveRestore: flags.has('confirmLiveRestore'),
  });
  if (!guard.ok) {
    console.error('');
    console.error(guard.error);
    console.error('');
    process.exitCode = 1;
    return;
  }
  if (guard.warned) {
    console.warn('⚠️  --confirm-live-restore مُفعَّل: الاستعادة ستجري فوق قاعدة الإنتاج (DATABASE_URL).');
    console.warn('   Live-restore override active — restoring over the LIVE database. أُوثِّق القرار.');
    console.warn('');
  }

  // r169a (ops D2): with DATABASE_URL unset in this shell, the live-guard
  // has no reference to compare against and passes silently — an operator
  // who relies on backend/.env (which this script family does NOT load)
  // could restore over production with the wall armed but inert. Dry-run
  // stays quiet (it writes nothing); a REAL restore now says so loudly.
  const liveUrl = typeof process.env.DATABASE_URL === 'string' ? process.env.DATABASE_URL.trim() : '';
  if (liveUrl === '' && !flags.has('dryRun')) {
    console.warn('⚠️  DATABASE_URL غير مضبوط في هذه الجلسة — حارس «لا تستعِد فوق قاعدة حيّة» بلا مرجع يقارنه، فهو خامل الآن.');
    console.warn('   DATABASE_URL is unset in this shell — the live-restore guard has nothing to compare');
    console.warn('   against and is currently INERT. If the target might be your live production DB,');
    console.warn(`   export DATABASE_URL first so the guard can protect it:  export DATABASE_URL='<live-url>'`);
    console.warn('');
  }

  // 3) The dump file must exist (dry-run reveals this early too).
  if (!existsSync(values.file)) {
    console.error(`خطأ / error: ملف النسخة غير موجود / dump file not found: ${values.file}`);
    process.exitCode = 1;
    return;
  }

  // 4) The pg_restore binary must exist.
  const binary = findBinary(PG_RESTORE);
  if (!binary) {
    console.error(missingBinaryMessage(PG_RESTORE));
    process.exitCode = 1;
    return;
  }

  const argv = buildRestoreCommand({ binary: PG_RESTORE, url: targetUrl, dumpFile: values.file });

  console.log('━━━ مدارك — استعادة نسخة · Madarek db-restore ━━━');
  console.log(`الهدف / target (${values.urlEnv}): ${redactUrl(targetUrl)}`);
  console.log(`الملف / file: ${values.file}`);

  // 5) Dry-run: the exact command with the REDACTED url — nothing runs.
  if (flags.has('dryRun')) {
    console.log('');
    console.log('[dry-run] وضع التجربة — لن يُنفَّذ شيء / nothing will execute');
    console.log(`الأمر الدقيق / exact command:`);
    console.log(`  ${displayCommand(argv)}`);
    console.log('');
    console.log('بعد الاستعادة الفعلية اتبع قائمة التحقق / after a real run follow the checklist below (docs/12 §3).');
    return; // exit 0
  }

  // 6) Execute.
  console.log('');
  const result = spawnSync(PG_RESTORE, argv.slice(1), { stdio: ['ignore', 'inherit', 'inherit'] });
  if (result.error || result.status !== 0) {
    console.error('');
    console.error('❌ فشل pg_restore — راجع مخرجات الأداة أعلاه / pg_restore failed; see the tool output above.');
    if (result.error) console.error(`   ${result.error.message}`);
    process.exitCode = 1;
    return;
  }

  // 7) Suggest the docs/12 §3 verification checklist (unverified ≠ restored).
  console.log('');
  console.log('✅ انتهى pg_restore — لكن الاستعادة لا تكتمل قبل التحقق / pg_restore finished — verify before trusting:');
  console.log('   1. psql "<الهدف>" -c \'\\dt\' — قائمة جداول المخطط كاملة (~76 جدولًا).');
  console.log("      psql \"$STAGE_DIRECT\" -c '\\dt'");
  console.log('   2. آخر ثلاثة ترحيلات مطابقة للإنتاج:');
  console.log("      psql \"$STAGE_DIRECT\" -c 'SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 3;'");
  console.log('   3. توزيع الأدوار والعدّادات:');
  console.log('      psql "$STAGE_DIRECT" -c \'SELECT role, count(*) FROM "User" GROUP BY role ORDER BY count(*) DESC;\'');
  console.log('   4. اربط التطبيق بالفرع تحققًا حيًا ثم شغّل npm run smoke (docs/12 §3 خطوة 5-6).');
  console.log('');
  console.log('   سجّل النتيجة في docs/runbooks/restore-exercise-log.md لتصبح توثيقًا مُثبتًا.');
  console.log('   Record the outcome in the restore-exercise log (fill-in template).');
}

main().catch((err) => {
  // Never print a raw error object that could embed credentials.
  console.error(`خطأ غير متوقع / unexpected error: ${err?.message ?? String(err)}`);
  process.exitCode = 1;
});
