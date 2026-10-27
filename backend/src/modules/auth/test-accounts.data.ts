/**
 * R320 §C — the test-account table: ONE easy account per job.
 *
 * The project is in development; convenience wins. This table replaces
 * the five hard-to-type pre-R320 demo accounts with a memorable set:
 * `<job>@test.ly` / `12345678`, one account per DISTINCT job (including
 * the academic positions and the scoped registrar).
 *
 * SINGLE SOURCE OF TRUTH — architecture note (why the physical home is
 * this file, inside backend/src): the backend's compiled build (tsc -p,
 * rootDir ./src — the Render deploy contract pins dist/index.js) cannot
 * compile source files outside backend/src (TS6059; verified empirically
 * — relaxing rootDir would restructure dist/ and break the deploy start
 * path). The repo-root `shared/testAccounts.ts` re-exports this module
 * so every consumer — frontend (`@shared/testAccounts` vite alias),
 * Playwright/vitest harnesses (relative import), backend seed + boot —
 * imports ONE canonical table. Edit the table HERE.
 *
 * THE @test.ly DOMAIN IS THE DEMO MARKER: the schema has no isDemo
 * column (schema changes are forbidden this cycle), so «email ends with
 * @test.ly» is the documented, load-bearing marker for "this is a
 * demonstration account" — consumed by the demo lockout policy
 * (lockout.ts lockDurationFor) and safe to use in any exclusion logic.
 *
 * Password policy note: `12345678` is on the REGISTER blocklist
 * (password-policy.ts) — deliberately. Test accounts are provisioned by
 * the seeder (hashPassword directly), never through the register
 * schema, and the LOGIN schema only requires a non-empty password, so
 * the easy value works everywhere a demo login is typed while the
 * register/change-password flows still refuse it for real users.
 *
 * Skipped job (honest): «طالب قيد الاعتماد» (pending@test.ly) — the
 * schema has NO pending/approval user state (User.isActive is a plain
 * boolean; registration is instant-active; the only PENDING_* enums are
 * exam/workflow statuses). When an approval workflow lands, add the row
 * here.
 */

export type TestAccountRole = 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY' | 'OWNER';

/** Academic leadership appointment (TeacherProfile.position). */
export type TestAccountPosition = 'DEAN' | 'ASSOCIATE_DEAN' | 'DEPARTMENT_HEAD';

/** Panel grouping: التعليم = teaching/learning jobs · الحوكمة = governance jobs · النظام = platform. R321 §A7 — the retired office label was still alive here (the R320 rename missed its own grouping bucket): the group word is «الحوكمة», one term per concept, consistent in code/tests/docs. */
export type TestAccountGroup = 'التعليم' | 'الحوكمة' | 'النظام';

export interface TestAccount {
  /** Arabic job label — the login panel's row label (data, not a role label). */
  job: string;
  email: string;
  password: string;
  role: TestAccountRole;
  /** DEAN/ASSOCIATE_DEAN/DEPARTMENT_HEAD — TEACHER accounts carrying a position. */
  position?: TestAccountPosition;
  /** ADMIN accounts scoped to one faculty (scopeFacultyId) instead of university-wide. */
  scoped?: true;
  group: TestAccountGroup;
  note?: string;
}

/** The password EVERY test account uses (one easy value). */
export const TEST_PASSWORD = '12345678';

/** The demo marker — an email on this domain IS a demonstration account. */
export const TEST_ACCOUNTS_DOMAIN = '@test.ly';

export const TEST_ACCOUNTS: readonly TestAccount[] = [
  { job: 'طالب', email: 'student@test.ly', password: TEST_PASSWORD, role: 'STUDENT', group: 'التعليم' },
  {
    job: 'طالب ثانٍ (للرسائل/المجتمع)',
    email: 'student2@test.ly',
    password: TEST_PASSWORD,
    role: 'STUDENT',
    group: 'التعليم',
    note: 'مؤسسة الأندلس — لإثبات العزل بين المؤسسات وللرسائل والمجتمع',
  },
  { job: 'أستاذ', email: 'teacher@test.ly', password: TEST_PASSWORD, role: 'TEACHER', group: 'التعليم' },
  {
    job: 'رئيس قسم',
    email: 'head@test.ly',
    password: TEST_PASSWORD,
    role: 'TEACHER',
    position: 'DEPARTMENT_HEAD',
    group: 'التعليم',
  },
  {
    job: 'عميد',
    email: 'dean@test.ly',
    password: TEST_PASSWORD,
    role: 'TEACHER',
    position: 'DEAN',
    group: 'التعليم',
  },
  {
    job: 'نائب عميد',
    email: 'vicedean@test.ly',
    password: TEST_PASSWORD,
    role: 'TEACHER',
    position: 'ASSOCIATE_DEAN',
    group: 'التعليم',
  },
  { job: 'المسجل العام', email: 'registrar@test.ly', password: TEST_PASSWORD, role: 'ADMIN', group: 'الحوكمة' },
  {
    job: 'مسجل كلية (نطاق كلية)',
    email: 'faculty@test.ly',
    password: TEST_PASSWORD,
    role: 'ADMIN',
    scoped: true,
    group: 'الحوكمة',
    note: 'ADMIN محصور بنطاق الكلية عبر scopeFacultyId',
  },
  { job: 'أخصائي جودة', email: 'quality@test.ly', password: TEST_PASSWORD, role: 'QUALITY', group: 'الحوكمة' },
  { job: 'مالك المنصة', email: 'owner@test.ly', password: TEST_PASSWORD, role: 'OWNER', group: 'النظام' },
];

/** Display order of the panel groups. */
export const TEST_ACCOUNT_GROUPS: readonly TestAccountGroup[] = ['التعليم', 'الحوكمة', 'النظام'];

/** Case/whitespace-tolerant membership test for the demo domain. */
export function isTestAccountEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith(TEST_ACCOUNTS_DOMAIN);
}

/** Look up an account by its Arabic job label (stable data key). */
export function testAccountForJob(job: string): TestAccount | undefined {
  return TEST_ACCOUNTS.find((a) => a.job === job);
}
