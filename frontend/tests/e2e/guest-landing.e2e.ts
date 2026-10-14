/**
 * guest-landing.e2e.ts — رحلة الزائر على صفحة الهبوط (r164-k).
 *
 * Hermetic: لا خلفية — نقل وهمي (mock-transport) + خادم Vite للتطبيق
 * الحقيقي. الصفحة عامة فلا بذرة جلسة.
 */
import { test, expect } from './fixtures/e2e';

test.describe('الصفحة العامة للزوار', () => {
  test('الهبوط يعرض مشهد مدارك: العنوان الجوهري وهوية الجامعة', async ({ page }) => {
    await page.goto('/');

    // العنوان الرئيسي — «… وتبدأ نقطة وتصبح مدارًا»
    await expect(page.locator('.ln-hero-title')).toContainText('مدارًا');
    // هوية الجامعة في الشريط العلوي
    await expect(page.locator('.landing-header-cta')).toBeVisible();
    await expect(page.getByText('جامعة الزاوية').first()).toBeVisible();
    // RTL بالهيكل — التطبيق عربي بالكامل (قفل index.html)
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('الدعوة الأساسية: «ابدأ الآن» تقود إلى البوابة ثم إلى إنشاء الحساب', async ({ page }) => {
    await page.goto('/');

    // CTA الرأسي في الهيدر يقود إلى بوابة الدخول (App.tsx GuestRoute).
    await page.getByRole('link', { name: 'ابدأ الآن' }).first().click();
    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByRole('heading', { name: 'مرحباً بعودتك' })).toBeVisible();

    // من بوابة الدخول إلى إنشاء الحساب — الرابط الصريح في أسفل الاستمارة.
    await page.getByRole('link', { name: 'أنشئ حسابك الآن' }).click();
    await expect(page).toHaveURL(/\/auth\/register$/);
    // الخطوة الأولى في صفحة التسجيل: اختيار الدور «من أنت؟»
    await expect(page.getByRole('heading', { name: 'من أنت؟' })).toBeVisible();
  });
});
