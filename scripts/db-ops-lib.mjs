/**
 * db-ops-lib — PURE logic shared by the operator DB scripts (r166c).
 *
 * Dependency-free by design (smoke-deploy.mjs rule): every import is a
 * node: builtin, so `db:backup` / `db:restore` run on a bare checkout
 * with no node_modules — the operator's laptop, a cron box, or a Render
 * shell. The unit tests (backend/tests/modules/db-ops.test.ts) import
 * THIS module directly, which is why every guard lives here instead of
 * inline in the scripts: the tests pin the logic without ever spawning
 * pg_dump/pg_restore.
 *
 * Contents (all pure / side-effect-free except sha256File, which only
 * reads a local file):
 *   - redactUrl:            credential-safe URL display (the SAME
 *                           semantics as backend/scripts/migrate-deploy.mjs
 *                           — copied deliberately so the two scripts render
 *                           identically; the r166c test pins the behavior).
 *   - parseOpsArgs:         one arg parser for all operator scripts
 *                           (flags + `--opt value` / `--opt=value`).
 *   - resolveEnvUrl:        URL-from-env resolution with the empty/missing
 *                           refusal (secrets arrive via env only — never
 *                           as literal argv, never printed).
 *   - validatePgUrl:        postgres:// / postgresql:// protocol guard.
 *   - sameDatabase:         normalized "same DB" comparison (protocol
 *                           aliases, default port 5432, host, db, creds).
 *   - liveRestoreGuard:     the refuse-live-restore wall (db-restore).
 *   - requireYesInProduction: the NODE_ENV=production → --yes wall
 *                           (rotate-demo-passwords).
 *   - findBinary / missingBinaryMessage: PATH scan + bilingual install
 *                           hints (no process spawn — injectable exists()
 *                           predicate keeps it unit-testable).
 *   - buildBackupCommand / buildRestoreCommand: the EXACT argv arrays
 *                           (runbook canon: --format=custom --no-owner
 *                           --no-privileges; restore via --dbname).
 *   - displayCommand:       shell-safe rendering with every postgres URL
 *                           redacted — what --dry-run prints.
 *   - defaultBackupPath / timestampSlug / slugifyLabel: backups/
 *                           madarek-<ts>[-label].dump naming.
 *   - sha256File / humanSize: post-backup evidence line.
 */

import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { existsSync } from 'node:fs';
import path from 'node:path';

// ─── URL redaction (migrate-deploy semantics) ───────────────────────

export function redactUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    if (url.password) url.password = '***';
    if (url.username) url.username = '***';
    return url.toString();
  } catch {
    return '<invalid-url>';
  }
}

/** Is this string a postgres connection URL? (used to redact argv slots). */
export function isPgUrl(raw) {
  if (typeof raw !== 'string') return false;
  try {
    return /^postgres(?:ql)?:$/.test(new URL(raw).protocol);
  } catch {
    return false;
  }
}

export function validatePgUrl(rawUrl) {
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return { ok: false, error: 'سلسلة الاتصال ليست URL صالحًا / not a valid connection URL' };
  }
  if (!/^postgres(?:ql)?:$/.test(parsed.protocol)) {
    return {
      ok: false,
      error: `بروتوكول غير مدعوم "${parsed.protocol}" — المتوقع postgresql:// أو postgres:// / unsupported protocol, expected postgresql:// or postgres://`,
    };
  }
  return { ok: true, url: parsed };
}

// ─── Arg parsing (one parser, all operator scripts) ─────────────────

/**
 * parseOpsArgs(argv, { valueOpts, flagOpts })
 *   valueOpts: ['--url-env', '--out', ...] — options that take a value
 *              (both `--opt value` and `--opt=value` forms accepted).
 *   flagOpts:  ['--dry-run', ...] — boolean flags.
 * Returns { values: {urlEnv, out, ...}, flags: Set<'dry-run'|...>,
 *           errors: string[], help: boolean } — keys are camelCase
 * (dashes stripped). NEVER throws; errors accumulate so --help can
 * print them all at once.
 */
export function parseOpsArgs(argv, { valueOpts = [], flagOpts = [] } = {}) {
  const values = {};
  const flags = new Set();
  const errors = [];

  const camel = (name) => name.replace(/^--/, '').replace(/-([a-z])/g, (_m, c) => c.toUpperCase());
  const knownValue = new Set(valueOpts);
  const knownFlag = new Set(flagOpts);

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '-h' || a === '--help') {
      flags.add('help');
      continue;
    }
    // --opt=value form
    const eq = a.match(/^(--[a-z-]+)=(.*)$/);
    if (eq) {
      const [full, name, value] = eq;
      if (knownValue.has(name)) {
        values[camel(name)] = value;
        continue;
      }
      if (knownFlag.has(name)) {
        errors.push(`العلم ${name} لا يأخذ قيمة بهذا الشكل — استخدم ${name} وحده / flag ${name} takes no =value; pass it alone`);
        continue;
      }
      errors.push(`وسيط غير معروف / unknown argument: ${full}`);
      continue;
    }
    if (knownFlag.has(a)) {
      flags.add(camel(a));
      continue;
    }
    if (knownValue.has(a)) {
      if (i + 1 >= argv.length || argv[i + 1].startsWith('--')) {
        errors.push(`قيمة ناقصة لـ ${a} / ${a} requires a value`);
        continue;
      }
      values[camel(a)] = argv[++i];
      continue;
    }
    errors.push(`وسيط غير معروف / unknown argument: ${a}`);
  }
  return { values, flags, errors, help: flags.has('help') };
}

// ─── URL-from-env resolution ────────────────────────────────────────

/** Secrets arrive via env vars ONLY — never literal argv, never printed. */
export function resolveEnvUrl(envObj, varName) {
  if (typeof varName !== 'string' || varName.trim() === '') {
    return { ok: false, error: 'اسم متغير البيئة مفقود / env var name missing' };
  }
  const raw = envObj[varName];
  if (typeof raw !== 'string' || raw.trim() === '') {
    return {
      ok: false,
      error: `متغير البيئة ${varName} غير مضبوط أو فارغ / env var ${varName} is unset or empty`,
    };
  }
  return { ok: true, url: raw.trim() };
}

// ─── Live-restore guard ─────────────────────────────────────────────

/** Normalized same-database comparison (protocol aliases, default port). */
export function sameDatabase(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  let ua;
  let ub;
  try {
    ua = new URL(a.trim());
    ub = new URL(b.trim());
  } catch {
    return false;
  }
  const norm = (proto) => (proto === 'postgres:' ? 'postgresql:' : proto);
  const port = (u) => (u.port === '' ? '5432' : u.port);
  return (
    norm(ua.protocol) === norm(ub.protocol) &&
    ua.username === ub.username &&
    ua.password === ub.password &&
    ua.hostname === ub.hostname &&
    port(ua) === port(ub) &&
    ua.pathname === ub.pathname
  );
}

/**
 * The refuse-live-restore wall: if the resolved TARGET equals the live
 * DATABASE_URL, refuse unless --confirm-live-restore was passed.
 * When no live URL is configured (env unset), there is nothing to
 * protect — the guard passes.
 */
export function liveRestoreGuard({ targetUrl, liveUrl, confirmLiveRestore = false }) {
  const live = typeof liveUrl === 'string' ? liveUrl.trim() : '';
  if (live === '') return { ok: true };
  if (!sameDatabase(targetUrl, live)) return { ok: true };
  if (confirmLiveRestore) {
    return { ok: true, warned: true };
  }
  return {
    ok: false,
    error: [
      '⛔ رفض الاستعادة: هدف الاستعادة هو نفس قاعدة الإنتاج (DATABASE_URL).',
      '   pg_restore فوق قاعدة حيّة يستبدل بيانات المستخدمين — ممنوع افتراضيًا.',
      '   REFUSED: the restore target IS the live DATABASE_URL. Restoring over',
      '   the live database destroys user data — refused by default.',
      '',
      '   المسار الآمن / the safe path:',
      '   1. أنشئ فرعًا جديدًا في Neon (أو قاعدة تجريبية) واستعِد إليه.',
      '   2. تحقق من الفرع (قائمة التحقق أدناه / docs/12 §3).',
      '   3. إن أردت فعلًا الكتابة فوق الإنتاج — قرار واعٍ موثَّق — أعد التشغيل',
      `      مع العلم --confirm-live-restore.`,
    ].join('\n'),
  };
}

// ─── Production --yes wall (rotate script) ──────────────────────────

export function requireYesInProduction(nodeEnv, yesFlag) {
  if (nodeEnv === 'production' && !yesFlag) {
    return {
      ok: false,
      error: [
        '⛔ NODE_ENV=production ولم يُمرَّر --yes.',
        '   تدوير كلمة مرور على قاعدة الإنتاج فعلٌ مدمر للجلسات (يسجّل الجميع',
        '   خروجًا) — لا يُنفَّذ إلا بقرار واعٍ مع --yes.',
        '   REFUSED: NODE_ENV=production without --yes. A production password',
        '   rotation logs every session out; re-run with --yes to confirm.',
      ].join('\n'),
    };
  }
  return { ok: true };
}

// ─── Binary discovery + missing-binary guidance ─────────────────────

/**
 * PATH scan (no process spawn). `exists` is injectable so unit tests
 * exercise the scan with a fake filesystem map instead of spawning.
 */
export function findBinary(name, { pathEnv = process.env.PATH ?? '', exists = existsSync } = {}) {
  if (typeof name !== 'string' || name === '') return null;
  if (name.includes('/')) return exists(name) ? name : null;
  for (const dir of pathEnv.split(path.delimiter)) {
    if (!dir) continue;
    const candidate = path.join(dir, name);
    if (exists(candidate)) return candidate;
  }
  return null;
}

export function missingBinaryMessage(tool) {
  return [
    `❌ الأداة غير مثبَّتة: ${tool} — النسخ/الاستعادة يحتاجان أدوات PostgreSQL على هذا الجهاز.`,
    `   missing binary: ${tool} (PostgreSQL client tools).`,
    '',
    '   التثبيت / how to install:',
    '     macOS (Homebrew):      brew install postgresql@16        # أو libpq',
    '     Debian/Ubuntu (apt):   sudo apt-get install postgresql-client',
    '     Alpine (apk):          apk add postgresql-client',
    '     Windows/أي نظام:       https://www.postgresql.org/download/',
    '',
    '   ملاحظة: السكربت نفسه لا يثبّت أي أداة ولا يتصل بشيء قبل توفرها.',
    '   The script never downloads binaries and never runs before the tool exists.',
  ].join('\n');
}

// ─── Command builders (runbook canon — docs/12 §2) ──────────────────

/** pg_dump custom-format dump (the documented backup canon). */
export function buildBackupCommand({ binary, url, outFile }) {
  return [binary, '--format=custom', '--no-owner', '--no-privileges', '--file', outFile, url];
}

/** pg_restore into a target database (never over the live DB unguarded). */
export function buildRestoreCommand({ binary, url, dumpFile }) {
  return [binary, '--no-owner', '--no-privileges', '--dbname', url, dumpFile];
}

/** Shell-safe display line; every postgres URL slot is redacted. */
export function displayCommand(argv) {
  return argv
    .map((arg) => {
      if (isPgUrl(arg)) return redactUrl(arg);
      if (arg === '' || /[^A-Za-z0-9_@%+=:,./-]/.test(arg)) {
        return `'${arg.replaceAll("'", `'\\''`)}'`;
      }
      return arg;
    })
    .join(' ');
}

// ─── Backup naming ──────────────────────────────────────────────────

export function timestampSlug(now = new Date()) {
  const p = (n, w = 2) => String(n).padStart(w, '0');
  return (
    `${now.getUTCFullYear()}${p(now.getUTCMonth() + 1)}${p(now.getUTCDate())}` +
    `T${p(now.getUTCHours())}${p(now.getUTCMinutes())}${p(now.getUTCSeconds())}Z`
  );
}

export function slugifyLabel(label) {
  if (typeof label !== 'string') return '';
  return label
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

/** Default dump path: backups/madarek-<timestamp>[-<label>].dump */
export function defaultBackupPath(now = new Date(), label = '') {
  const slug = slugifyLabel(label);
  return `backups/madarek-${timestampSlug(now)}${slug ? `-${slug}` : ''}.dump`;
}

// ─── Post-backup evidence ───────────────────────────────────────────

/** Streaming sha256 of a local file (never loads the whole dump). */
export async function sha256File(file) {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(file);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

export function humanSize(bytes) {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value >= 10 || unit === 0 ? Math.round(value) : value.toFixed(1)} ${units[unit]}`;
}

// ─── Post-restore verification (r167 db:verify) ─────────────────────

/**
 * The EXACT query set db-verify runs against a restore target, in order.
 * Mirrors docs/12-deployment §3 checklist items 1–4 so the printed
 * checklist and the automated check can never drift apart again (the
 * r167 exercise caught the checklist naming prisma_migrations while the
 * real table is _prisma_migrations — these queries pin the real name).
 */
export const VERIFY_QUERIES = [
  {
    key: 'tables',
    sql: "SELECT count(*)::int AS n FROM pg_tables WHERE schemaname = 'public';",
    label: 'جداول المخطط / schema tables',
  },
  {
    key: 'migrations',
    // _prisma_migrations — Prisma's actual table (leading underscore).
    sql: 'SELECT count(*)::int AS n FROM _prisma_migrations;',
    label: 'عدد الترحيلات / migration count',
  },
  {
    key: 'last_migration',
    sql: 'SELECT migration_name, finished_at::text FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 3;',
    label: 'آخر الترحيلات / latest migrations',
  },
  {
    key: 'roles',
    sql: 'SELECT role::text AS role, count(*)::int AS n FROM "User" GROUP BY role ORDER BY n DESC;',
    label: 'توزيع الأدوار / role distribution',
  },
  {
    key: 'counts',
    sql: 'SELECT (SELECT count(*)::int FROM "User") AS users, (SELECT count(*)::int FROM "Enrollment") AS enrollments, (SELECT count(*)::int FROM "Notification") AS notifications;',
    label: 'عدّادات الصفوف / row counts',
  },
];

/**
 * Pure verdict from the measured values. HARD failures mean "this is not
 * a sane Madarek restore" (broken pg_restore, wrong DB, empty target);
 * WARNs mean "restore ran but deserves the operator's eyes".
 */
export function summarizeVerify({ tables, migrations, users, ownerCount }) {
  const findings = [];
  let level = 'PASS';

  if (tables < 50) {
    level = 'FAIL';
    findings.push(`جداول المخطط ${tables} فقط (< 50) — الاستعادة غير مكتملة / schema tables ${tables} (< 50) — incomplete restore`);
  } else if (tables < 70) {
    if (level === 'PASS') level = 'WARN';
    findings.push(`جداول المخطط ${tables} — أقل من المتوقع ~77، راجع مخرج pg_restore / schema tables ${tables} — below the expected ~77, review pg_restore output`);
  } else {
    findings.push(`جداول المخطط: ${tables} ✅ / schema tables: ${tables} ✅`);
  }

  if (migrations <= 0) {
    level = 'FAIL';
    findings.push('جدول _prisma_migrations فارغ أو غائب — المخطط ليس مخطط مدارك / _prisma_migrations empty or missing — not a Madarek schema');
  } else {
    findings.push(`الترحيلات المسجَّلة: ${migrations} ✅ / recorded migrations: ${migrations} ✅`);
  }

  if (users <= 0) {
    level = 'FAIL';
    findings.push('لا مستخدمين إطلاقًا — لم تُستعد أي بيانات / zero users — no data restored');
  } else {
    findings.push(`المستخدمون: ${users} ✅ / users: ${users} ✅`);
  }

  if (ownerCount < 1) {
    if (level === 'PASS') level = 'WARN';
    findings.push('لا حساب OWNER — لن يمكنك التحقق من رحلة المالك على هذه النسخة / no OWNER account — owner-journey verification impossible on this copy');
  } else {
    findings.push(`حسابات OWNER: ${ownerCount} ✅ / OWNER accounts: ${ownerCount} ✅`);
  }

  if (findings.length === 0) findings.push('كل الفحوص ضمن المتوقع / all checks within expectations');
  return { level, findings };
}
