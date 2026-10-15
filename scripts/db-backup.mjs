#!/usr/bin/env node
/**
 * db-backup — operator-side PostgreSQL backup via pg_dump (r166c).
 *
 * Wraps the runbook canon (docs/12-deployment.md §«النسخ الاحتياطي
 * والاستعادة»): `pg_dump --format=custom --no-owner --no-privileges`
 * into a repeatable script with the safety posture of
 * scripts/smoke-deploy.mjs: dependency-free (node: builtins only),
 * bilingual operator guidance, URL redaction in ALL output, exit 0/1.
 *
 * The SOURCE connection URL is read from an env var (default
 * DATABASE_URL, or any name via --url-env <NAME>) — a URL passed by
 * name is never a literal argv value, and every printed URL is
 * credential-redacted (scripts/db-ops-lib.mjs::redactUrl).
 *
 * Usage:
 *   npm run db:backup                                       # DATABASE_URL → backups/madarek-<ts>.dump
 *   npm run db:backup -- --url-env PG_DIRECT                # named env var (e.g. the direct/pooler-stripped URL)
 *   npm run db:backup -- --out backups/pre-migration.dump   # explicit path
 *   npm run db:backup -- --label pre-migration              # suffix in the default name
 *   npm run db:backup -- --dry-run                          # print the EXACT command (URL redacted), run nothing
 *
 * This script is an OWNER/ops tool — intentionally NOT part of CI
 * (CI never touches a live database). It does not schedule anything
 * and does not upload the dump anywhere: off-site storage is the
 * owner's documented responsibility (docs/12 §4).
 */

import { spawnSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import path from 'node:path';
import {
  buildBackupCommand,
  defaultBackupPath,
  displayCommand,
  findBinary,
  humanSize,
  missingBinaryMessage,
  parseOpsArgs,
  redactUrl,
  resolveEnvUrl,
  sha256File,
  validatePgUrl,
} from './db-ops-lib.mjs';

const PG_DUMP = 'pg_dump';

const HELP = [
  'الاستخدام / usage:',
  '  npm run db:backup [-- --url-env <ENV_VAR>] [-- --out <file>] [-- --label <label>] [-- --dry-run]',
  '',
  'الوسائط / options:',
  '  --url-env <ENV_VAR>  اسم متغير البيئة الحامل لسلسلة اتصال المصدر (الافتراضي DATABASE_URL)',
  '                       name of the env var holding the SOURCE connection URL (default DATABASE_URL)',
  '  --out <file>         مسار ملف النسخة (الافتراضي backups/madarek-<timestamp>.dump)',
  '                       output dump path (default backups/madarek-<timestamp>.dump)',
  '  --label <label>      وسم يُدمج في اسم الملف الافتراضي (safe slug)',
  '                       label folded into the default file name',
  '  --dry-run            اطبع الأمر الدقيق فقط (السلسلة مُقنَّعة) بلا تنفيذ',
  '                       print the exact command (URL redacted); nothing runs',
  '  -h, --help           هذه المساعدة / this help',
  '',
  'أمثلة / examples:',
  "  PG_DIRECT='postgresql://…' npm run db:backup -- --url-env PG_DIRECT --label pre-migration",
  '  npm run db:backup -- --dry-run',
].join('\n');

async function main() {
  const { values, flags, errors, help } = parseOpsArgs(process.argv.slice(2), {
    valueOpts: ['--url-env', '--out', '--label'],
    flagOpts: ['--dry-run'],
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

  // 1) Resolve the SOURCE URL from the env var (by NAME, never literal).
  const urlEnvName = values.urlEnv ?? 'DATABASE_URL';
  const resolved = resolveEnvUrl(process.env, urlEnvName);
  if (!resolved.ok) {
    console.error(`خطأ / error: ${resolved.error}`);
    console.error(
      `صدّر المتغير أولًا / export it first:  export ${urlEnvName}='postgresql://user:pass@host/db?sslmode=require'`,
    );
    process.exitCode = 1;
    return;
  }
  const sourceUrl = resolved.url;

  const validation = validatePgUrl(sourceUrl);
  if (!validation.ok) {
    console.error(`خطأ / error: ${validation.error}`);
    process.exitCode = 1;
    return;
  }

  // 2) The pg_dump binary must exist BEFORE anything else runs.
  const binary = findBinary(PG_DUMP);
  if (!binary) {
    console.error(missingBinaryMessage(PG_DUMP));
    process.exitCode = 1;
    return;
  }

  const outFile = values.out ?? defaultBackupPath(new Date(), values.label ?? '');
  const argv = buildBackupCommand({ binary: PG_DUMP, url: sourceUrl, outFile });

  console.log('━━━ مدارك — نسخة احتياطية · Madarek db-backup ━━━');
  console.log(`المصدر / source (${urlEnvName}): ${redactUrl(sourceUrl)}`);
  console.log(`المخرج / output: ${outFile}`);

  // 3) Dry-run: the exact command with the REDACTED url — nothing runs.
  if (flags.has('dryRun')) {
    console.log('');
    console.log('[dry-run] وضع التجربة — لن يُنفَّذ شيء / nothing will execute');
    console.log(`الأمر الدقيق / exact command:`);
    console.log(`  ${displayCommand(argv)}`);
    console.log('');
    console.log(`عند التنفيذ الفعلي يُطبع حجم الملف وبصمة sha256 / a real run prints size + sha256.`);
    return; // exit 0
  }

  // 4) Execute. backups/ is created on demand (gitignored — dumps never commit).
  mkdirSync(path.dirname(outFile) === '' ? '.' : path.dirname(outFile), { recursive: true });

  console.log('');
  const result = spawnSync(PG_DUMP, argv.slice(1), { stdio: ['ignore', 'inherit', 'inherit'] });
  if (result.error || result.status !== 0) {
    console.error('');
    console.error('❌ فشل pg_dump — راجع مخرجات الأداة أعلاه / pg_dump failed; see the tool output above.');
    if (result.error) console.error(`   ${result.error.message}`);
    process.exitCode = 1;
    return;
  }

  // 5) Evidence line: size + sha256 (fill these into the restore-exercise log).
  const stats = statSync(outFile);
  const sha = await sha256File(outFile).catch(() => '<un-readable>');
  console.log('');
  console.log('✅ تمت النسخة / backup complete:');
  console.log(`   الملف / file:    ${outFile} (${humanSize(stats.size)})`);
  console.log(`   sha256:          ${sha}`);
  console.log('   انقل الملف خارج جهاز الخدمة — النسخة على نفس القاعدة ليست نسخة / move it off-site (docs/12 §3 step 1).');
}

main().catch((err) => {
  // Never print a raw error object that could embed credentials.
  console.error(`خطأ غير متوقع / unexpected error: ${err?.message ?? String(err)}`);
  process.exitCode = 1;
});
