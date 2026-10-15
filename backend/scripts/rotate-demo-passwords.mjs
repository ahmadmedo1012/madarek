#!/usr/bin/env node
/**
 * rotate-demo-passwords — authorized operator password rotation (r166c).
 *
 * Purpose: rotate ANY account's password from the operator side — the
 * documented owner-account recovery path (owner@zu.edu.ly has no
 * in-app admin reset) and the repeatable, auditable replacement for
 * hand-rolled SQL. The operator must already hold DATABASE_URL (the
 * secret IS the authorization) — the script adds the guard rails.
 *
 * Invocation pattern: exactly migrate-deploy.mjs's — a plain .mjs run
 * via `node` from the backend workspace (see backend/package.json
 * `rotate:password` + root `db:rotate-password`), importing @prisma/client
 * and argon2 the same way. Backend tooling precedent for both styles
 * exists (seed.ts via tsx, migrate-deploy.mjs via node); the node/.mjs
 * style is what this script follows so it runs wherever the deployment
 * tooling runs, with zero build step.
 *
 * Secrecy contract:
 *   - The new password NEVER appears as a literal argv value — only the
 *     NAME of an env var (--new-password-env NEW_PASSWORD). The script
 *     never logs it, never echoes it, and never trims it (trimming
 *     silently changes the stored secret — passwordSchema's own rule).
 *   - DATABASE_URL is only ever printed redacted (db-ops-lib redactUrl —
 *     the migrate-deploy pattern).
 *
 * Hash parameters — ONE source of truth:
 *   backend/src/lib/password.ts defines ARGON_OPTIONS (argon2id,
 *   19_456 KiB, timeCost 2, parallelism 1). A plain .mjs cannot import
 *   that TS module, so this script duplicates the values — and
 *   backend/tests/modules/db-ops.test.ts parses BOTH files and fails if
 *   either side drifts (the repo's cross-file pin idiom, same technique
 *   as the render.yaml↔ci.yml NODE_VERSION pin). If you change one,
 *   change both; the test will not let the pair silently diverge.
 *
 * Password policy: length 12–72 (the zod passwordSchema bounds — also
 * pinned by the same test). The common-password blocklist refine lives
 * at the DTO layer (auth.dto.ts); this script documents that boundary
 * instead of half-reimplementing it — the operator rotating is the
 * party choosing the secret; pick a strong one (e.g. `openssl rand
 * -base64 24`).
 *
 * Semantics — mirrors auth.service.ts changePassword (D3):
 *   - the hash update AND tokenVersion increment are ONE atomic
 *     conditional write (updateMany where tokenVersion = the value we
 *     read): a concurrent revocation makes count 0 → the rotation did
 *     NOT apply → refuse + tell the operator to re-run (never retry
 *     blindly);
 *   - bumping tokenVersion revokes EVERY session (all devices logged
 *     out — including the one that rotated; the app's own flow re-issues
 *     tokens for the current device, this operator flow does not);
 *   - a rotation also UNLOCKS the account: failedLoginCount → 0,
 *     lockedUntil → null (same write);
 *   - user must exist AND be isActive.
 *
 * Usage:
 *   export NEW_PASSWORD='…'   # operator exports; never a literal arg
 *   npm run db:rotate-password -- --email owner@zu.edu.ly --new-password-env NEW_PASSWORD --dry-run
 *   npm run db:rotate-password -- --email owner@zu.edu.ly --new-password-env NEW_PASSWORD --yes
 *
 * Guards: --yes is required for actual execution (dry-run otherwise);
 * NODE_ENV=production without --yes is refused outright; unknown email
 * and empty/missing env var are refused with bilingual errors.
 */

import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { parseOpsArgs, redactUrl, requireYesInProduction } from '../../scripts/db-ops-lib.mjs';

/**
 * argon2id parameters — MUST stay identical to backend/src/lib/password.ts
 * ARGON_OPTIONS (see the header: the unit test pins the pair).
 */
const ARGON_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456, // ~19 MiB
  timeCost: 2,
  parallelism: 1,
};

/** Password policy bounds — MUST stay identical to passwordSchema (zod, auth.dto.ts). */
const PASSWORD_MIN = 12;
const PASSWORD_MAX = 72;

const HELP = [
  'الاستخدام / usage:',
  '  export NEW_PASSWORD=…',
  '  npm run db:rotate-password -- --email <email> --new-password-env <ENV_VAR> [--dry-run | --yes]',
  '',
  'الوسائط / options:',
  '  --email <email>            (إلزامي) بريد الحساب المطلوب تدوير كلمة مروره — أي حساب',
  '                             (required) the account email — ANY account (this is the owner-recovery path)',
  '  --new-password-env <NAME>  (إلزامي) اسم متغير البيئة الحامل للكلمة الجديدة — لا تُمرَّر الكلمة كوسيط أبدًا',
  '                             (required) env var NAME holding the new password — never a literal arg',
  '  --dry-run                  معاينة بلا كتابة (يتصل قراءةً فقط للتحقق من الحساب)',
  '                             preview without writing (read-only lookup of the account)',
  '  --yes                      (إلزامي للتنفيذ الفعلي) تدوير حقيقي — يُسجِل الجميع خروجًا ويفتح القفل',
  '                             required for actual execution — revokes all sessions, also unlocks',
  '  -h, --help                 هذه المساعدة / this help',
  '',
  'مثال استعادة حساب المالك / owner recovery example:',
  "  export NEW_PASSWORD=\"$(openssl rand -base64 24)\"",
  '  npm run db:rotate-password -- --email owner@zu.edu.ly --new-password-env NEW_PASSWORD --yes',
].join('\n');

async function main() {
  const { values, flags, errors, help } = parseOpsArgs(process.argv.slice(2), {
    valueOpts: ['--email', '--new-password-env'],
    flagOpts: ['--dry-run', '--yes'],
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

  if (!values.email || !values.newPasswordEnv) {
    console.error('خطأ / error: --email و --new-password-env إلزاميان / both --email and --new-password-env are required.');
    console.error('شغّل --help للمساعدة / run with --help for usage');
    process.exitCode = 1;
    return;
  }

  // Guard: production without a conscious --yes is refused outright.
  const prodGuard = requireYesInProduction(process.env.NODE_ENV, flags.has('yes'));
  if (!prodGuard.ok) {
    console.error(prodGuard.error);
    process.exitCode = 1;
    return;
  }

  // Execution needs --yes; without it only --dry-run is allowed.
  const dryRun = flags.has('dryRun');
  if (!dryRun && !flags.has('yes')) {
    console.error('خطأ / error: التنفيذ الفعلي يتطلب --yes (أو استخدم --dry-run للمعاينة).');
    console.error('        actual execution requires --yes (use --dry-run to preview).');
    process.exitCode = 1;
    return;
  }

  // Resolve the new password from the env var — read RAW (never trimmed).
  const passwordRaw = process.env[values.newPasswordEnv];
  if (typeof passwordRaw !== 'string' || passwordRaw.length === 0) {
    console.error(
      `خطأ / error: متغير البيئة ${values.newPasswordEnv} غير مضبوط أو فارغ / env var ${values.newPasswordEnv} is unset or empty`,
    );
    console.error(`صدّر المتغير أولًا / export it first:  export ${values.newPasswordEnv}=…`);
    process.exitCode = 1;
    return;
  }
  if (passwordRaw.length < PASSWORD_MIN || passwordRaw.length > PASSWORD_MAX) {
    console.error(
      `خطأ / error: كلمة المرور يجب أن تكون بين ${PASSWORD_MIN} و ${PASSWORD_MAX} محرفًا (الطول الحالي مرفوض) — سياسة passwordSchema نفسها.`,
    );
    console.error(`        the password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters (passwordSchema bounds).`);
    process.exitCode = 1;
    return;
  }

  const email = values.email.trim().toLowerCase();

  const prisma = new PrismaClient({ log: ['error'] });
  try {
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      console.error(`خطأ / error: لا يوجد حساب بهذا البريد / no account with this email: ${email}`);
      process.exitCode = 1;
      return;
    }
    if (!user.isActive) {
      console.error(
        `خطأ / error: الحساب ${email} غير نشط (isActive=false) — التدوير للحسابات النشطة فقط. فعِّل الحساب أولًا عبر مسار الحاكمية.`,
      );
      console.error(`        account ${email} is deactivated (isActive=false); activate it through the governance flow first.`);
      process.exitCode = 1;
      return;
    }

    console.log('━━━ مدارك — تدوير كلمة مرور (مشغِّل مفوَّض) · authorized rotation ━━━');
    console.log(`القاعدة / database: ${redactUrl(process.env.DATABASE_URL ?? '')}`);
    console.log(`الحساب / account: ${email} · ${user.role} · isActive=${user.isActive}`);
    console.log(`الحالة قبل التدوير / state before: tokenVersion=${user.tokenVersion}, failedLoginCount=${user.failedLoginCount}, lockedUntil=${user.lockedUntil ? 'مضبوط/locked' : 'null'}`);

    if (dryRun) {
      console.log('');
      console.log('[dry-run] وضع المعاينة — لن تُكتب أي بيانات / nothing will be written');
      console.log('سيُنفَّذ تحديث ذرّي واحد / one atomic update would set:');
      console.log('   passwordHash     = argon2id(19456, 2, 1) — نفس معاملات src/lib/password.ts');
      console.log('   tokenVersion     = tokenVersion + 1   ← إبطال كل الجلسات / revokes all sessions');
      console.log('   failedLoginCount = 0                  ← فتح القفل / unlock');
      console.log('   lockedUntil      = null');
      console.log('');
      console.log('للتنفيذ: أضف --yes (بدون --dry-run).');
      return; // exit 0
    }

    // --yes path: hash with the password.ts parameters, then ONE atomic
    // conditional write (D3 mirror — a concurrent writer that moved
    // tokenVersion between our read and this write makes count 0 and the
    // rotation does NOT apply).
    const passwordHash = await argon2.hash(passwordRaw, ARGON_OPTIONS);
    const result = await prisma.user.updateMany({
      where: { id: user.id, tokenVersion: user.tokenVersion },
      data: {
        passwordHash,
        tokenVersion: { increment: 1 },
        failedLoginCount: 0,
        lockedUntil: null,
      },
    });
    if (result.count === 0) {
      console.error('');
      console.error('⛔ لم يُطبَّق التدوير: كاتب متزامن حرَّك tokenVersion بين القراءة والكتابة (تغيير كلمة/دور/حالة آخر).');
      console.error('   REFUSED: a concurrent writer moved tokenVersion — the rotation did NOT apply. أعد المحاولة.');
      process.exitCode = 1;
      return;
    }

    console.log('');
    console.log('✅ تم التدوير / rotation complete:');
    console.log(`   الحساب / account: ${email} (${user.role})`);
    console.log(`   tokenVersion: ${user.tokenVersion} → ${user.tokenVersion + 1} — كل الجلسات أُبطِلت (تسجيل خروج جميع الأجهزة)`);
    console.log('   failedLoginCount=0 · lockedUntil=null — الحساب مفتوح / unlocked');
    console.log(`   القاعدة / database: ${redactUrl(process.env.DATABASE_URL ?? '')}`);
    console.log('');
    console.log('الكلمة الجديدة لم تُطبع ولن تُطبع — سجّل دخولك بها الآن من التطبيق.');
    console.log('The new password was never printed; log in with it through the app now.');
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((err) => {
  // Never print a raw error object that could embed credentials.
  console.error(`خطأ غير متوقع / unexpected error: ${err?.message ?? String(err)}`);
  process.exitCode = 1;
});
