/**
 * r357-e4-day-in-life.e2e.ts — E4: one seat, one honest day.
 *
 * The R356/R357 seat table (test-accounts.data.ts) has 11 documented
 * seats; this spec walks ONE representative day per seat through the
 * REAL SPA (mocked API — the hermetic law): land on the seat's home,
 * see the seat's signature surface, and never an error state. Deep
 * interactions already ride their own specs (quality-moderation,
 * online-exams, courses-journey…); E4 is the per-seat SMOKE that
 * proves the seat can live its day at all.
 *
 * Seat → role mapping (the platform's roles are
 * STUDENT/TEACHER/ADMIN/QUALITY/OWNER — the job titles are TEACHER-
 * role seats whose scope differences are backend-side; the SPA day is
 * shared, stated honestly here):
 *   المسجل العام / مسجل الكلية      → ADMIN
 *   رئيس قسم / عميد / أستاذ           → TEACHER
 *   مراقب الامتحانات / موظف الجودة   → QUALITY
 *   طالب / طالب المدرسة               → STUDENT
 * OWNER stays audit-sweep-only (the fixtures' standing ruling) — E4
 * notes it, no journey. معيد is NOT a platform seat today (no TA role
 * exists) — the owner's uncertain-seats table owns that decision.
 */
import { test, expect } from './fixtures/e2e';

/* ── ADMIN: المسجل العام + مسجل الكلية ──────────────────────────── */

test.describe('E4 — المسجل العام (ADMIN)', () => {
  test.use({ e2eRole: 'ADMIN' });

  test('لوحة المسجل ثم دليل الأشخاص — يوم كامل بلا أخطاء', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByText(/تعذّر|خطأ غير متوقّع/).first()).toBeHidden();
    await page.goto('/admin/people');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByText(/تعذّر/).first()).toBeHidden();
  });
});

test.describe('E4 — مسجل الكلية (ADMIN، النطاق على الخادم)', () => {
  test.use({ e2eRole: 'ADMIN' });

  test('اللوحة ثم إدارة المستخدمين بنطاق الكليّة', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await page.goto('/admin/users');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByText(/تعذّر/).first()).toBeHidden();
  });
});

/* ── TEACHER: أستاذ + رئيس قسم + عميد ───────────────────────────── */

test.describe('E4 — أستاذ (TEACHER)', () => {
  test.use({ e2eRole: 'TEACHER' });

  test('لوحة الأستاذ ثم الحضور والغياب', async ({ page }) => {
    await page.goto('/teacher/dashboard');
    await expect(page.getByRole('heading', { name: 'لوحة الأستاذ' })).toBeVisible();
    await page.goto('/teacher/attendance');
    await expect(page.getByRole('heading', { name: 'الحضور والغياب' }).first()).toBeVisible();
  });
});

test.describe('E4 — رئيس قسم (TEACHER)', () => {
  test.use({ e2eRole: 'TEACHER' });

  test('اللوحة ثم الذكاء الأكاديميّ (متابعة القسم)', async ({ page }) => {
    await page.goto('/teacher/dashboard');
    await expect(page.getByRole('heading', { name: 'لوحة الأستاذ' })).toBeVisible();
    await page.goto('/teacher/intelligence');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByText(/تعذّر/).first()).toBeHidden();
  });
});

test.describe('E4 — عميد (TEACHER)', () => {
  test.use({ e2eRole: 'TEACHER' });

  test('اللوحة ثم مجتمع الكليّة', async ({ page }) => {
    await page.goto('/teacher/dashboard');
    await expect(page.getByRole('heading', { name: 'لوحة الأستاذ' })).toBeVisible();
    await page.goto('/teacher/community');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByText(/تعذّر/).first()).toBeHidden();
  });
});

/* ── QUALITY: مراقب الامتحانات + موظف الجودة ────────────────────── */

test.describe('E4 — مراقب الامتحانات (QUALITY)', () => {
  test.use({ e2eRole: 'QUALITY' });

  test('طابور مراجعة الاختبارات', async ({ page }) => {
    await page.goto('/quality/exam-moderation');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByText(/تعذّر/).first()).toBeHidden();
  });
});

test.describe('E4 — موظف الجودة (QUALITY)', () => {
  test.use({ e2eRole: 'QUALITY' });

  test('لوحة الجودة', async ({ page }) => {
    await page.goto('/quality/dashboard');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByText(/تعذّر/).first()).toBeHidden();
  });
});

/* ── STUDENT: طالب الجامعة + طالب المدرسة ───────────────────────── */

test.describe('E4 — طالب (STUDENT)', () => {
  test.use({ e2eRole: 'STUDENT' });

  test('اللوحة ثم المقرّرات', async ({ page }) => {
    await page.goto('/student/dashboard');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await page.goto('/student/courses');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByText(/تعذّر/).first()).toBeHidden();
  });
});

test.describe('E4 — طالب المدرسة — الأندلس (STUDENT، نفس اليوم بنمط المدرسة)', () => {
  test.use({ e2eRole: 'STUDENT' });

  test('اللوحة تعيش يوم الطالب المدرسيّ', async ({ page }) => {
    await page.goto('/student/dashboard');
    await expect(page.getByRole('heading', { level: 1 }).first()).toBeVisible();
    await expect(page.getByText(/تعذّر/).first()).toBeHidden();
  });
});
