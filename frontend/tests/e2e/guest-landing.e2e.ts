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

  test('الدعوة الأساسية: «ابدأ الآن» تقود مباشرةً إلى إنشاء الحساب (r164-b)', async ({ page }) => {
    await page.goto('/');

    // r164-b: كل أزرار البدء الرئيسيّة تقود الزائر الجديد مباشرةً إلى
    // نموذج إنشاء الحساب — لا إلى بوابة الدخول (كان الوصل مكسورًا).
    await page.getByRole('link', { name: 'ابدأ الآن' }).first().click();
    await expect(page).toHaveURL(/\/auth\/register$/);
    // الخطوة الأولى في صفحة التسجيل: اختيار الدور «من أنت؟»
    await expect(page.getByRole('heading', { name: 'من أنت؟' })).toBeVisible();

    // والعائد بصحبة حسابٍ يجد باب الدخول من صفحة التسجيل (القمع بالاتجاهين).
    await page.getByRole('link', { name: /تسجيل الدخول/ }).first().click();
    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByRole('heading', { name: 'مرحباً بعودتك' })).toBeVisible();
  });
});
