#!/usr/bin/env node
/**
 * provision-owner — operator-owned global OWNER provisioning (r187).
 *
 * Purpose: create ONE genuine platform-owner account for the requesting
 * operator, through the operator-side path the platform already trusts:
 * the operator holds DATABASE_URL (the secret IS the authorization — the
 * same contract as rotate-demo-passwords.mjs, r166c). The web surface
 * stays invitation-only by design: no public endpoint may grant OWNER.
 *
 * What it does (one transaction):
 *   1. refuses when the email already exists (OWNER → use
 *      rotate-demo-passwords.mjs to (re)set that account's credential;
 *      any other role → refused outright: no silent privilege
 *      escalation of an existing identity);
 *   2. creates the account: role=OWNER, isActive=true, argon2id hash
 *      with the EXACT src/lib/password.ts parameters, themePreference
 *      SYSTEM, no institution membership (platform ownership — the
 *      seed's owner model);
 *   3. writes an AuditLog row (action OWNER_PROVISION, resourceType
 *      User, metadata.source='operator-script') so the platform's own
 *      trail records how the account came to exist;
 *   4. optionally (--suspend-demo-owner) suspends the seeded demo
 *      owner (owner@zu.edu.ly) in the SAME transaction —
 *      isActive=false + tokenVersion bump (kills its live sessions) —
 *      closing the public-credential exposure (the demo password is
 *      published in the public repo; production is a public URL).
 *      Skipped silently when the demo owner is the SAME email being
 *      provisioned or doesn't exist. The last-ACTIVE-owner guard is
 *      honored: the new owner is created first, so the platform never
 *      ends the transaction with zero active owners.
 *
 * Credential delivery (no email infra exists for this deployment):
 *   · --password-env NAME → the operator chose the secret (12–72,
 *     passwordSchema bounds) — NEVER printed;
 *   · otherwise the script GENERATES a 24-byte random secret
 *     (crypto, ~32 base64 chars) and prints it exactly ONCE, at the
 *     end, between explicit markers — the one-time-credential
 *     convention (store it, then rotate from inside the app). It is
 *     never logged anywhere else and never written to the database
 *     in clear form.
 *
 * Secrecy contract (mirrors rotate-demo-passwords.mjs):
 *   - DATABASE_URL only ever printed redacted (db-ops-lib redactUrl);
 *   - the chosen/generated password never appears in any log line
 *     except the single delivery block at the end of a real run;
 *   - NODE_ENV=production without --yes is refused outright.
 *
 * Hash parameters — ONE source of truth:
 *   backend/src/lib/password.ts ARGON_OPTIONS (argon2id, 19_456 KiB,
 *   timeCost 2, parallelism 1). This .mjs duplicates the values the
 *   same way rotate-demo-passwords.mjs does — and
 *   backend/tests/modules/db-ops.test.ts parses BOTH files and fails
 *   if either side drifts (the repo's cross-file pin idiom). If you
 *   change one, change all three; the test will not let them
 *   silently diverge.
 *
 * Idempotence: re-running with the same email is SAFE and
 * non-duplicating — the exists-check refuses with the exact next
 * step (rotate, not re-provision). No account is ever modified by
 * this script except the demo-owner suspension (explicit flag).
 *
 * Usage:
 *   node scripts/provision-owner.mjs --email you@example.com --dry-run
 *   node scripts/provision-owner.mjs --email you@example.com --yes \
 *          [--first-name الاسم] [--last-name اللقب] \
 *          [--password-env NEW_PASSWORD] [--suspend-demo-owner]
 *
 * (Run from the backend workspace — see backend/package.json
 *  `provision:owner` and the root `db:provision-owner`.)
 */

import { randomBytes } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { parseOpsArgs, redactUrl, requireYesInProduction } from '../../scripts/db-ops-lib.mjs';

/** argon2id parameters — MUST stay identical to backend/src/lib/password.ts
 * ARGON_OPTIONS and rotate-demo-passwords.mjs (the pin test reads all three). */
const ARGON_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 19_456, // ~19 MiB
  timeCost: 2,
  parallelism: 1,
};

/** Password policy bounds — MUST stay identical to passwordSchema (zod,
 * auth.dto.ts) — same pin as rotate-demo-passwords.mjs. */
const PASSWORD_MIN = 12;
const PASSWORD_MAX = 72;

/** The seeded demo owner (seed.ts) — the public-credential exposure this
 * script can close with --suspend-demo-owner once a real owner exists. */
const DEMO_OWNER_EMAIL = 'owner@zu.edu.ly';

/** Seed palette for avatarColor (seed.ts) — UserAvatar's ink gate reads
 * it live, any of the five is AA-safe with the gated ink. */
const AVATAR_COLORS = ['#4F8EF7', '#3DD68C', '#9B6FE8', '#D4A537', '#6B7280'];

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const HELP = [
  'الاستخدام / usage:',
  '  node scripts/provision-owner.mjs --email <email> [--first-name <n>] [--last-name <n>]',
  '                                [--password-env <ENV_VAR>] [--suspend-demo-owner] [--dry-run | --yes]',
  '',
  'الوسائط / options:',
  '  --email <email>          (إلزامي) بريد المشغّل — حساب OWNER عالمي جديد بهذه الهوية',
  '                           (required) the operator\'s email — the new global OWNER identity',
  '  --first-name <name>      الاسم الأول (افتراضي: المشغّل) / first name (default: المشغّل)',
  '  --last-name <name>       اللقب (افتراضي: مدارك) / last name (default: مدارك)',
  '  --password-env <NAME>    اسم متغير بيئة يحمل كلمة مرور اخترتها أنت (لا تُطبع أبدًا)',
  '                           env var NAME holding YOUR chosen password (never printed)',
  '                           — بدونها: يولّد السكربت سرًّا عشوائيًّا لمرة واحدة ويطبعه مرة واحدة',
  '                           without it: the script generates a one-time random secret and prints it once',
  '  --suspend-demo-owner     مع إنشاء الحساب: تعليق حساب المالك التجريبي (owner@zu.edu.ly)',
  '                           يُنشأ الحساب الجديد أولًا فلا تنتهي المعاملة بصفر مالكين نشطين',
  '                           also suspend the seeded demo owner (created first — never zero active owners)',
  '  --dry-run                معاينة بلا كتابة / preview without writing',
  '  --yes                    (إلزامي للتنفيذ الفعلي) / required for actual execution',
  '  -h, --help               هذه المساعدة / this help',
  '',
  'مثال / example:',
  '  node scripts/provision-owner.mjs --email you@example.com --yes --suspend-demo-owner',
].join('\n');

function pickAvatarColor(email) {
  let h = 0;
  for (const ch of email) h = (h * 31 + ch.codePointAt(0)) >>> 0;
  return AVATAR_COLORS[h % AVATAR_COLORS.length];
}

function initialsOf(first, last) {
  return `${(first[0] ?? '').trim()}${(last[0] ?? '').trim()}` || 'م';
}

async function main() {
  const { values, flags, errors, help } = parseOpsArgs(process.argv.slice(2), {
    valueOpts: ['--email', '--first-name', '--last-name', '--password-env'],
    flagOpts: ['--dry-run', '--yes', '--suspend-demo-owner'],
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

  if (!values.email) {
    console.error('خطأ / error: --email إلزامي / --email is required.');
    console.error('شغّل --help للمساعدة / run with --help for usage');
    process.exitCode = 1;
    return;
  }
  const email = values.email.trim().toLowerCase();
  if (!EMAIL_SHAPE.test(email)) {
    console.error(`خطأ / error: شكل البريد غير مقبول / invalid email shape: ${email}`);
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

  const dryRun = flags.has('dryRun');
  if (!dryRun && !flags.has('yes')) {
    console.error('خطأ / error: التنفيذ الفعلي يتطلب --yes (أو استخدم --dry-run للمعاينة).');
    console.error('        actual execution requires --yes (use --dry-run to preview).');
    process.exitCode = 1;
    return;
  }

  // The secret: operator-chosen (env) or generated (one-time).
  const suspendDemoOwner = flags.has('suspendDemoOwner');
  let passwordRaw;
  let passwordFromEnv = false;
  if (values.passwordEnv) {
    passwordRaw = process.env[values.passwordEnv];
    if (typeof passwordRaw !== 'string' || passwordRaw.length === 0) {
      console.error(
        `خطأ / error: متغير البيئة ${values.passwordEnv} غير مضبوط أو فارغ / env var ${values.passwordEnv} is unset or empty`,
      );
      process.exitCode = 1;
      return;
    }
    if (passwordRaw.length < PASSWORD_MIN || passwordRaw.length > PASSWORD_MAX) {
      console.error(
        `خطأ / error: كلمة المرور يجب أن تكون بين ${PASSWORD_MIN} و ${PASSWORD_MAX} محرفًا — سياسة passwordSchema نفسها.`,
      );
      console.error(`        the password must be ${PASSWORD_MIN}–${PASSWORD_MAX} characters.`);
      process.exitCode = 1;
      return;
    }
    passwordFromEnv = true;
  } else {
    // 24 random bytes → ~32 base64 chars: comfortably inside 12–72 and
    // unpredictable. Read RAW (never trimmed — trimming changes secrets).
    passwordRaw = randomBytes(24).toString('base64');
  }

  const firstName = (values.firstName ?? 'المشغّل').trim() || 'المشغّل';
  const lastName = (values.lastName ?? 'مدارك').trim() || 'مدارك';

  const prisma = new PrismaClient({ log: ['error'] });
  try {
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      if (existing.role === 'OWNER') {
        console.error(`خطأ / error: ${email} هو مالك بالفعل (OWNER) — الحساب موجود.`);
        console.error(`        this email is ALREADY an OWNER. لا تُنشئ حسابًا مكررًا.`);
        console.error('لإعادة ضبط بيانات دخوله استخدم المسار الموثّق / to (re)set its credential use:');
        console.error('  npm run db:rotate-password -- --email ' + email + ' --new-password-env NEW_PASSWORD --yes');
      } else {
        console.error(`خطأ / error: ${email} موجود بدور ${existing.role} — يُمنع ترقية هوية قائمة بصمت (تصعيد امتيازات).`);
        console.error(`        this email exists with role ${existing.role} — no silent privilege escalation.`);
        console.error('استخدم بريدًا جديدًا للمشغّل / use a fresh operator email.');
      }
      process.exitCode = 1;
      return;
    }

    console.log('━━━ مدارك — تجهيز حساب مالك المشغّل (operator provisioning) ━━━');
    console.log(`القاعدة / database: ${redactUrl(process.env.DATABASE_URL ?? '')}`);
    console.log(`الهوية الجديدة / new identity: ${email} · OWNER · نشط/active`);
    console.log(`الاسم / name: ${firstName} ${lastName}`);
    if (suspendDemoOwner) {
      if (email === DEMO_OWNER_EMAIL) {
        console.log('ملاحظة: --suspend-demo-owner مع نفس بريد العرض — سيُتجاهل التعليق (لا تعليق ذاتي).');
      } else {
        console.log(`مع التنفيذ: تعليق حساب المالك التجريبي ${DEMO_OWNER_EMAIL} (isActive=false + إبطال جلساته).`);
      }
    }

    if (dryRun) {
      console.log('');
      console.log('[dry-run] وضع المعاينة — لن تُكتب أي بيانات / nothing will be written');
      console.log('سيُنشأ / would create:');
      console.log(`   User { email: ${email}, role: OWNER, isActive: true,`);
      console.log('         passwordHash: argon2id(19456, 2, 1) — نفس معاملات src/lib/password.ts,');
      console.log(`         firstName: ${firstName}, lastName: ${lastName} }`);
      console.log('   AuditLog { action: OWNER_PROVISION, resourceType: User, source: operator-script }');
      if (suspendDemoOwner && email !== DEMO_OWNER_EMAIL) {
        console.log(`   User(${DEMO_OWNER_EMAIL}) { isActive: false, tokenVersion +1 }`);
      }
      console.log(passwordFromEnv
        ? '   كلمة المرور: من متغير البيئة (لن تُطبع) / password: from env var (never printed)'
        : '   كلمة المرور: ستُولَّد عشوائيًّا وتُطبع مرة واحدة في النهاية / a random secret will be generated and printed ONCE');
      console.log('');
      console.log('للتنفيذ: أضف --yes (بدون --dry-run).');
      return; // exit 0
    }

    // --yes path: create the owner, the audit row, and (optionally) the
    // demo-owner suspension in ONE transaction — the platform never
    // observes a state where the demo owner died before the new one
    // existed.
    const passwordHash = await argon2.hash(passwordRaw, ARGON_OPTIONS);
    const avatarColor = pickAvatarColor(email);
    const created = await prisma.$transaction(async (tx) => {
      // Re-check inside the transaction: a concurrent provisioning of the
      // same email must not slip past the guard above.
      const race = await tx.user.findUnique({ where: { email }, select: { id: true } });
      if (race) throw new Error('RACE: email appeared between the guard and the transaction');

      const user = await tx.user.create({
        data: {
          email,
          passwordHash,
          role: 'OWNER',
          firstName,
          lastName,
          avatarColor,
          avatarInitials: initialsOf(firstName, lastName),
          isActive: true,
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'OWNER_PROVISION',
          resourceType: 'User',
          resourceId: user.id,
          userId: user.id,
          metadata: {
            source: 'operator-script',
            email,
            suspendedDemoOwner: suspendDemoOwner && email !== DEMO_OWNER_EMAIL,
          },
        },
      });
      if (suspendDemoOwner && email !== DEMO_OWNER_EMAIL) {
        // Created-first ordering guarantees ≥1 active owner survives the
        // transaction. tokenVersion bump kills the demo owner's live
        // sessions in the same atomic step as the suspension.
        await tx.user.update({
          where: { email: DEMO_OWNER_EMAIL },
          data: { isActive: false, tokenVersion: { increment: 1 } },
        });
      }
      return user;
    });

    console.log('');
    console.log('✅ أُنشئ حساب المالك / owner account created:');
    console.log(`   البريد / email: ${created.email} (id: ${created.id})`);
    console.log(`   الدور / role: OWNER · نشط / active · بلا عضوية مؤسسة (ملك عالمي)`);
    console.log('   سجل تدقيق / audit: OWNER_PROVISION (source: operator-script)');
    if (suspendDemoOwner && email !== DEMO_OWNER_EMAIL) {
      console.log(`   عُلِّق حساب المالك التجريبي / demo owner suspended: ${DEMO_OWNER_EMAIL} (isActive=false، جلساته أُبطلت)`);
    }

    if (passwordFromEnv) {
      console.log('');
      console.log('كلمة المرور من متغير البيئة — لم تُطبع ولن تُطبع. سجّل الدخول بها الآن.');
      console.log('The env-var password was never printed; log in with it now.');
    } else {
      // The ONE delivery block — the only place the generated secret is
      // ever printed. Operator-only channel (the terminal running this).
      console.log('');
      console.log('╔══════════════════════════════════════════════════════════════╗');
      console.log('║ سرّ لمرة واحدة — ONE-TIME CREDENTIAL (يُعرض الآن فقط)          ║');
      console.log('╠══════════════════════════════════════════════════════════════╣');
      console.log(`║  البريد / login:  ${email}`);
      console.log(`║  كلمة المرور / password:  ${passwordRaw}`);
      console.log('╚══════════════════════════════════════════════════════════════╝');
      console.log('احفظه الآن ثم دوّره من داخل التطبيق (الإعدادات ← تغيير كلمة المرور).');
      console.log('Store it now, then rotate it from inside the app (settings → change password).');
    }
  } finally {
    await prisma.$disconnect().catch(() => {});
  }
}

main().catch((err) => {
  // Never print a raw error object that could embed credentials.
  console.error(`خطأ غير متوقع / unexpected error: ${err?.message ?? String(err)}`);
  process.exitCode = 1;
});
