/**
 * loading-error-states.e2e.ts — route loading + error behavior for the
 * data-driven shared surfaces (R305 Task 4).
 *
 * The transport's `delayMs` extension makes the PENDING window
 * observable deterministically: the specs assert the app's REAL
 * loading language (shape-matched skeletons, aria-busy) while the
 * request is in flight, then the resolved content. Error responses
 * (500 + the real error envelope) must render the page-owned Arabic
 * error copy + the retry affordance — never a fake empty state.
 *
 * React Query retries 5xx exactly once (shouldRetryQuery), so error
 * states settle after the single retry — web-first assertions poll.
 */
import { test, expect } from './fixtures/qa';
import { fail } from './fixtures/qa-transport';

test.describe('/training — حالة التحميل ثم المحتوى', () => {
  test.use({
    qaRole: 'STUDENT',
    qaOverrides: [{ method: 'GET', path: '/training/catalog', delayMs: 900 }],
  });

  test('الهيكل المطابق يظهر أثناء البطء ثم يستبدل بصفوف حقيقية', async ({ page }) => {
    await page.goto('/training');
    await expect(page.getByRole('heading', { level: 1, name: 'التطوير الذاتي' })).toBeVisible();

    // While the catalog request is in flight: the shape-matched list
    // skeleton (ListSkeleton renders an aria-busy container). The page
    // can legitimately mount two busy regions at once (stat grid +
    // row list) — assert the FIRST, and use counts (never strict
    // single-element matching) for the rest.
    const skeleton = page.locator('[aria-busy="true"]');
    await expect(skeleton.first()).toBeVisible();

    // The delayed fulfilment lands → real rows replace the skeleton.
    await expect(page.locator('.pf-rowlist')).toContainText('إتقان البحث العلمي');
    await expect(skeleton).toHaveCount(0);
  });
});

test.describe('/training — حالة الخطأ', () => {
  test.use({
    qaRole: 'STUDENT',
    qaOverrides: [{
      method: 'GET',
      path: '/training/catalog',
      status: 500,
      json: fail('INTERNAL_SERVER_ERROR', 'خطأ في الخادم الداخلي'),
    }],
  });

  test('500 يعرض رسالة الصفحة العربية الصريحة وزر إعادة المحاولة', async ({ page }) => {
    await page.goto('/training');
    await expect(page.getByRole('heading', { level: 1, name: 'التطوير الذاتي' })).toBeVisible();

    const errorState = page.locator('.state-error');
    await expect(errorState).toBeVisible();
    await expect(errorState).toHaveAttribute('role', 'alert');
    // The PAGE-owned Arabic copy (not a code, not an empty state).
    await expect(errorState.locator('.state-title')).toHaveText('تعذَّر تحميل المسارات التدريبية');
    // The server's Arabic answer echoes as the detail line.
    await expect(errorState.locator('.state-desc')).toContainText('خطأ في الخادم الداخلي');
    await expect(errorState.getByRole('button', { name: 'إعادة المحاولة' })).toBeVisible();
  });
});

test.describe('/community — حالة التحميل ثم المحتوى', () => {
  test.use({
    qaRole: 'STUDENT',
    qaOverrides: [{ method: 'GET', path: '/announcements/feed', delayMs: 900 }],
  });

  test('لوحة الإعلانات تُهيكل أثناء البطء ثم تعرض الإعلان الحقيقي', async ({ page }) => {
    await page.goto('/community');
    await expect(page.getByRole('heading', { level: 1, name: 'المجتمع الجامعي' })).toBeVisible();

    // Same two-busy-region caveat as /training: assert the first.
    const skeleton = page.locator('[aria-busy="true"]');
    await expect(skeleton.first()).toBeVisible();

    await expect(page.getByText('افتتاح التسجيل للفصل الجديد')).toBeVisible();
    await expect(skeleton).toHaveCount(0);
  });
});

test.describe('/community — حالة الخطأ', () => {
  test.use({
    qaRole: 'STUDENT',
    qaOverrides: [{
      method: 'GET',
      path: '/announcements/feed',
      status: 500,
      json: fail('INTERNAL_SERVER_ERROR', 'تعذَّر إتمام الطلب من الخادم'),
    }],
  });

  test('500 يعرض رسالة القسم العربية وزر إعادة المحاولة', async ({ page }) => {
    await page.goto('/community');
    await expect(page.getByRole('heading', { level: 1, name: 'المجتمع الجامعي' })).toBeVisible();

    const errorState = page.locator('.state-error');
    await expect(errorState).toBeVisible();
    await expect(errorState).toHaveAttribute('role', 'alert');
    await expect(errorState.locator('.state-title')).toHaveText('تعذَّر تحميل الإعلانات');
    await expect(errorState.getByRole('button', { name: 'إعادة المحاولة' })).toBeVisible();
  });
});
