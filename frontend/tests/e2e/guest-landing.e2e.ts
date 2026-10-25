/**
 * guest-landing.e2e.ts — رحلة الزائر على صفحة الهبوط (r164-k).
 *
 * Hermetic: لا خلفية — نقل وهمي (mock-transport) + خادم Vite للتطبيق
 * الحقيقي. الصفحة عامة فلا بذرة جلسة.
 */
import { test, expect } from './fixtures/e2e';

test.describe('الصفحة العامة للزوار', () => {
  test('الهبوط يعرض مشهد مدارك: العنوان الجوهري وهوية المنصّة المستقلّة (r188)', async ({ page }) => {
    await page.goto('/');

    // العنوان الرئيسي — إعادة تثبيت R315 (B1·A.2): الهيرو صار عنوان
    // العرض ذا السطرين «رحلة تعلم واحدة / من المحاضرة إلى الإتقان»
    // (بلا تشكيل على سلّم --fs-h1)؛ التثبيت القديم «كلُّ معرفةٍ…» كان
    // لعنوان جُهّز قبل r306. وهوية «مدارك» نفسها في خلية العلامة بالترويسة.
    await expect(page.locator('.fo-hero-title')).toContainText('رحلة تعلم واحدة');
    await expect(page.locator('.fo-hero-title')).toContainText('من المحاضرة إلى الإتقان');
    await expect(page.getByRole('banner').locator('.fo-brand-name')).toContainText('مدارك');
    // هوية المنصّة في الترويسة (r188: لا جامعة حقيقية — الاستقلالية؛ r191: العبارة المحذوفة صُنعت في ليبيا لم تعد اسم المنتج)
    await expect(page.locator('.fo-header-actions')).toBeVisible();
    await expect(page.getByText('منصّة التعليم الذكي').first()).toBeVisible();
    // بيان الاستقلالية يسمّي المؤسّسة التجريبية الاصطناعية بالاسم
    await expect(page.getByText('جامعة مدارك التجريبية').first()).toBeVisible();
    // دفتر الصدق بعد r191: القسم يسمّي مصدر أرقامه (ما يعمل اليوم بدل ما يُشحن اليوم)
    await expect(page.getByText('ما يعمل اليوم').first()).toBeVisible();
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
    // R315 (K-I): عنوان بوابة الدخول صار «مرحبا بعودتك» — بلا تشكيل
    // (قانون العرض الخالي من الحركات؛ كان «مرحباً بعودتك»).
    await expect(page.getByRole('heading', { name: 'مرحبا بعودتك' })).toBeVisible();
  });
});
