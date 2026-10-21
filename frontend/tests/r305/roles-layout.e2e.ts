/**
 * roles-layout.e2e.ts — guest vs authenticated layout basics (R305 Task 4).
 *
 * What it pins, route by route, against the REAL SPA (mock transport,
 * no backend/DB):
 *
 *   GUEST surfaces (App.tsx guard groups — the source of truth):
 *     /auth + /auth/register ride <GuestRoute/> (no shell chrome);
 *     /404 is unguarded; /colleges* ride CollegesLayout — authed users
 *     get the full AppShell, guests get the chrome-less container with
 *     its OWN skip link + back link (the r154a public funnel).
 *
 *   AUTHENTICATED (seeded student session): /training, /achievements,
 *     /community render inside the AppShell (skip link, main landmark,
 *     shell grid) with their primary Arabic content.
 *
 *   GUARD BOUNCES (current behavior, pinned honestly): /training,
 *     /competitions, /vision are ProtectedRoute for guests → bounce to
 *     /auth; an authed user on /auth is bounced back by GuestRoute →
 *     the student role home (/student/dashboard).
 *
 * Every assertion is on real rendered Arabic content (house rule) —
 * never an HTTP status.
 */
import { test, expect } from './fixtures/qa';

test.describe('الزائر — الأسطح العامة', () => {
  test('بوابة الدخول /auth: بطاقة تسجيل الدخول بمحتواها العربي', async ({ page }) => {
    await page.goto('/auth');
    await expect(page.locator('h1.auth-form-title')).toHaveText('مرحباً بعودتك');
    await expect(page.locator('.auth-form-sub')).toContainText('سجِّل دخولك للوصول إلى مقرَّراتك');
    await expect(page.locator('label[for="auth-email"]')).toHaveText('البريد الإلكتروني أو رقم القيد');
    await expect(page.locator('label[for="auth-password"]')).toHaveText('كلمة المرور');
    await expect(page.getByRole('button', { name: 'تسجيل الدخول' })).toBeVisible();
    // The auth chrome carries its own banner/contentinfo landmarks.
    await expect(page.getByRole('link', { name: 'الصفحة الرئيسية' })).toBeVisible();
    await expect(page.locator('.auth-bottom')).toContainText('منصّة تعليم ذكية مستقلّة');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ar');
  });

  test('صفحة التسجيل /auth/register: خطوة «من أنت؟»', async ({ page }) => {
    await page.goto('/auth/register');
    await expect(page.locator('h1.auth-form-title')).toHaveText('من أنت؟');
    await expect(page.locator('.auth-form-sub')).toContainText('اختر نوع الحساب');
  });

  test('صفحة 404 المصمّمة على المسار الصريح', async ({ page }) => {
    await page.goto('/404');
    await expect(page.locator('.nf-title')).toHaveText('هذه الصفحة تغيّبت عن الحضور');
  });

  test('معرض الكلّيّات للزائر: قناة بلا هيكل بمخطّطها الخاص (skip link + عودة)', async ({ page }) => {
    await page.goto('/colleges');
    // CollegesLayout guest chrome (App.tsx — the r154a public funnel).
    await expect(page.locator('a.skip-link')).toHaveText('تخطَّ إلى المحتوى');
    await expect(page.getByRole('link', { name: 'العودة إلى الصفحة الرئيسية' })).toBeVisible();
    await expect(page.locator('main#main')).toBeVisible();
    // The public gallery renders REAL payload rows (mock /colleges),
    // grouped per city — the mock rows all ride «الزاوية».
    await expect(page.locator('h1.pf-page-title')).toContainText('جامعة مدارك التجريبية');
    const zawiaGroup = page.getByRole('group', { name: 'كلّيّات حرم المعرفة' });
    await expect(zawiaGroup).toBeVisible();
    await expect(zawiaGroup).toContainText('كلية الهندسة');
    await expect(zawiaGroup).toContainText('كلية العلوم');
  });

  test('لوحة منافسة الكلّيّات للزائر: جدول المتصدّرين ببيانات حقيقية', async ({ page }) => {
    await page.goto('/colleges/leaderboard');
    await expect(page.getByRole('heading', { level: 1, name: 'منافسة الكلّيّات' })).toBeVisible();
    await expect(page.getByText('لوحة المتصدّرين')).toBeVisible();
    await expect(page.locator('table.leaderboard-table')).toContainText('كلية الهندسة');
    await expect(page.locator('table.leaderboard-table')).toContainText('كلية العلوم');
  });
});

test.describe('الطالب المسجَّل — أسطح الهيكل', () => {
  test.use({ qaRole: 'STUDENT' });

  test('/training داخل الهيكل: ترويسة المسارات + صفّ حقيقي + علامات الهيكل', async ({ page }) => {
    await page.goto('/training');
    // Shell landmarks (AppShell): skip link + main + the scroll region.
    await expect(page.locator('a.skip-link')).toHaveText('تخطَّ إلى المحتوى الرئيسي');
    await expect(page.locator('main#main')).toBeVisible();
    await expect(page.getByRole('region', { name: 'المحتوى الرئيسي' })).toBeVisible();
    // Primary content — the patterns PageHeader + a real track row.
    await expect(page.getByRole('heading', { level: 1, name: 'التطوير الذاتي' })).toBeVisible();
    await expect(page.locator('.pf-rowlist')).toContainText('إتقان البحث العلمي');
    await expect(page.locator('.pf-rowlist')).toContainText('مهارات الدراسة الفعّالة');
    // The honest KPI strip from the mock /training/me payload.
    await expect(page.locator('[aria-label="ملخّص إنجازاتك"]')).toBeVisible();
  });

  test('/achievements داخل الهيكل: تبويب الأوسمة ووسام حقيقي', async ({ page }) => {
    await page.goto('/achievements');
    await expect(page.getByRole('heading', { level: 1, name: 'الإنجازات' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'الأوسمة' })).toBeVisible();
    await expect(page.getByText('الخطوة الأولى')).toBeVisible();
    await expect(page.locator('[aria-label="ملخّص نقاطك"]')).toBeVisible();
  });

  test('/community داخل الهيكل: تبويبات المجتمع وإعلان حقيقي', async ({ page }) => {
    await page.goto('/community');
    await expect(page.getByRole('heading', { level: 1, name: 'المجتمع الجامعي' })).toBeVisible();
    await expect(page.getByRole('tablist', { name: 'أقسام المجتمع الجامعي' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'الإعلانات' })).toBeVisible();
    // The announcements panel renders the mock feed row.
    await expect(page.getByText('افتتاح التسجيل للفصل الجديد')).toBeVisible();
  });

  test('الأسطح المشتركة المحمية: /competitions و /vision تُعرض للطالب داخل الهيكل', async ({ page }) => {
    await page.goto('/competitions');
    await expect(page.getByRole('heading', { level: 1, name: 'المسابقات الأكاديمية' })).toBeVisible();
    await expect(page.locator('.pf-rowlist')).toContainText('مسابقة المقالة العلمية');

    await page.goto('/vision');
    // Static roadmap data (lib/vision) — the authored statement is the h1.
    await expect(page.getByRole('heading', { level: 1 })).toContainText('ابتكاراً قادماً');
    await expect(page.getByText('المسار التقني للمنصة')).toBeVisible();
  });
});

test.describe('حواجز المسارات (السلوك الحالي)', () => {
  test('زائر على /training يُعاد إلى بوابة الدخول', async ({ page }) => {
    await page.goto('/training');
    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.locator('h1.auth-form-title')).toHaveText('مرحباً بعودتك');
  });

  test('زائر على /competitions و /vision يُعاد إلى بوابة الدخول (محميّة — ليست عامة)', async ({ page }) => {
    await page.goto('/competitions');
    await expect(page).toHaveURL(/\/auth$/);
    await page.goto('/vision');
    await expect(page).toHaveURL(/\/auth$/);
  });
});

test.describe('المستخدم المسجَّل على بوابة الدخول (GuestRoute)', () => {
  test.use({ qaRole: 'STUDENT' });

  test('يُعاد إلى لوحة دوره — لا نموذج دخول مزدوج', async ({ page }) => {
    await page.goto('/auth');
    // ROLE_HOME.STUDENT — lib/nav.ts is the single bounce source.
    await expect(page).toHaveURL(/\/student\/dashboard$/);
  });
});
