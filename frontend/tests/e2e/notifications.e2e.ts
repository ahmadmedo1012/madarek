/**
 * notifications.e2e.ts — جرس الإشعارات ولوحته (r164-k + r366 task 2-d).
 *
 * يثبّت: عدّاد غير المقروء من meta.unread (استطلاع limit=1)، فتح
 * اللوحة، صفوف الإشعارات مع الزمن النسبي على الساعة المجمّدة
 * («منذ ساعتين» — timeAgoAr)، وواجهة «تعليم الكل كمقروء»، ثم النقر
 * على صف يقود إلى صفحة /alerts للدور.
 *
 * r366 (task 2-d) — عقود التثبيت والعرض على الشاشات الضيقة والعريضة:
 *  · اللوحة لا تتقاطع أبداً مع الشريط العلوي (ترتكز تحته) عند 320
 *    و1440، وتظل داخل الإطار أفقياً.
 *  · عدّاد 99+: النص يُبتر ولا يفجّر التخطيط (زرّ الجرس يبقى 44px).
 *  · «تعليم الكل كمقروء» يمسح العدّاد فعلاً بعد إعادة الجلب.
 */
import { test, expect } from './fixtures/e2e';
import { installStatefulApi, statefulJson, statefulOk } from './fixtures/mock-transport';
import { NOTIFICATIONS } from './fixtures/api-fixtures';

test.use({ e2eRole: 'STUDENT' });

/** تسجّل جدول إشعارات حياً: read-all يصفّر unread عند إعادة الجلب. */
async function installNotifApi(page: import('@playwright/test').Page, unread = 2) {
  const state = { unread };
  await installStatefulApi(page, [
    {
      method: 'GET',
      pattern: '**/api/v1/notifications**',
      fulfill: async ({ route }) => {
        await statefulJson(route, 200, {
          data: NOTIFICATIONS.map((n) => ({ ...n, readAt: state.unread > 0 ? n.readAt : new Date(0).toISOString() })),
          meta: { page: 1, total: NOTIFICATIONS.length, totalPages: 1, limit: 50, unread: state.unread },
        });
      },
    },
    {
      method: 'POST',
      pattern: '**/api/v1/notifications/read-all**',
      fulfill: async ({ route }) => {
        state.unread = 0;
        await statefulOk(route, { updated: NOTIFICATIONS.length });
      },
    },
  ]);
  return state;
}

test.describe('الإشعارات', () => {
  test('الجرس يعرض عدّاد غير المقروء واللوحة تعرض الصفوف وتستقر في /alerts', async ({ page }) => {
    await page.goto('/student/dashboard');

    /* العدّاد قبل الفتح — arUnit(2, …) → «إشعاران غير مقروءان» */
    const bell = page.getByRole('button', { name: 'إشعاران غير مقروءان' });
    await expect(bell).toBeVisible();
    await expect(page.locator('.topbar-notif-badge')).toHaveText('2');

    /* الفتح — اللوحة نفسها سطح 012-spec (portal .notification-panel) */
    await bell.click();
    const panel = page.locator('.notification-panel');
    await expect(panel).toBeVisible();
    await expect(page.locator('.notif-panel-title')).toHaveText('الإشعارات');

    /* الصفوف — عنوان أول إشعار + زمنه النسبي من الساعة المجمّدة */
    const item = page.locator('.notif-item', { hasText: 'تم نشر درجة الواجب الثاني' });
    await expect(item).toBeVisible();
    await expect(item).toContainText('منذ ساعتين');

    /* واجهة الإجراء الجماعي (bulk) */
    await expect(page.getByRole('button', { name: 'تعليم الكل كمقروء' })).toBeVisible();

    /* النقر على الصف يقود إلى صفحة التنبيهات الكاملة للدور */
    await item.click();
    await expect(page).toHaveURL(/\/student\/alerts$/);
    // R304: AlertsPage rides the patterns header (same selector update
    // the ai-assistant/library migrations made).
    await expect(page.locator('h1.pf-page-title')).toBeVisible();
  });
});

/* ── r366 task 2-d — التثبيت والسعة ────────────────────────────── */

test.describe('الإشعارات — التثبيت والسعة', () => {
  /** يفتح اللوحة ويعيد صندوقيها وصندوق الشريط العلوي. */
  async function openPanel(page: import('@playwright/test').Page) {
    /* r366-final: locate by CLASS — the file's own documented lesson
     * (the 99+ test below): the bell's accessible name flips between
     * Arabic plural forms with the unread count («إشعار واحد غير
     * مقروء» never contains «إشعارات»), so a name regex is a
     * count-dependent locator. On CI the hermetic 501 transport's
     * error-state label raced the name form and the regex never
     * matched (45s timeout, both attempts; locally 6/6 — pure
     * scheduling). The class is the stable contract. */
    const bell = page.locator('button.topbar-notif');
    await bell.click();
    const panel = page.locator('.notification-panel');
    await expect(panel).toBeVisible();
    const panelBox = (await panel.boundingBox())!;
    const topbarBox = (await page.locator('.topbar').boundingBox())!;
    return { panelBox, topbarBox };
  }

  for (const vp of [
    { name: '320', width: 320, height: 700 },
    { name: '1440', width: 1440, height: 900 },
  ]) {
    test.describe(`إطار ${vp.name}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test(`اللوحة تحت الشريط العلوي وداخل الإطار عند ${vp.name}`, async ({ page }) => {
        await page.goto('/student/dashboard');

        const { panelBox, topbarBox } = await openPanel(page);

        /* لا تقاطع مع الشريط العلوي: أعلى اللوحة عند/تحت أسفل الشريط. */
        expect(panelBox.y).toBeGreaterThanOrEqual(topbarBox.y + topbarBox.height - 0.5);
        /* داخل الإطار أفقياً. */
        expect(panelBox.x).toBeGreaterThanOrEqual(-0.5);
        expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(vp.width + 0.5);
        /* لا تتجاوز أسفل الشاشة. */
        expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(vp.height + 0.5);
        /* سطح حقيقي: خلفية معتمة وحدود — لا لوح شفاف عائم. */
        const paint = await page.locator('.notification-panel').evaluate((el) => {
          const cs = getComputedStyle(el);
          return { bg: cs.backgroundColor, bd: cs.borderColor, pos: cs.position };
        });
        expect(paint.pos).toBe('fixed');
        expect(paint.bg).not.toBe('rgba(0, 0, 0, 0)');
        expect(paint.bd).not.toBe('rgba(0, 0, 0, 0)');
      });
    });
  }

  test.describe('إطار 320', () => {
    test.use({ viewport: { width: 320, height: 700 } });

    test('عدّاد 99+: النص مبتور والزر لا ينفجر', async ({ page }) => {
      await installNotifApi(page, 150);
      await page.goto('/student/dashboard');

      /* العدّاد يُعرض 99+ (سقف العرض) داخل زر الجرس دون تضخيمه.
       * r366: the bell is located by CLASS — its accessible name flips
       * between Arabic plural forms with the count («150 إشعار غير
       * مقروء» never contains «إشعارات»), so a name regex is a
       * count-dependent locator. */
      const bell = page.locator('button.topbar-notif');
      await expect(bell).toBeVisible();
      const badge = page.locator('.topbar-notif-badge');
      await expect(badge).toHaveText('99+');

      const bellBox = (await bell.boundingBox())!;
      expect(bellBox.width).toBeLessThanOrEqual(48);
      expect(bellBox.height).toBeLessThanOrEqual(48);

      const badgeBox = (await badge.boundingBox())!;
      expect(badgeBox.width).toBeLessThanOrEqual(bellBox.width);
      /* الشارة ملتصقة بزرّها — لا تنزل تحت الشريط. */
      expect(badgeBox.y).toBeGreaterThanOrEqual(bellBox.y - 1);
      expect(badgeBox.y + badgeBox.height).toBeLessThanOrEqual(bellBox.y + bellBox.height + 1);
    });

    test('«تعليم الكل كمقروء» يمسح العدّاد بعد إعادة الجلب', async ({ page }) => {
      await installNotifApi(page, 2);
      await page.goto('/student/dashboard');

      await expect(page.locator('.topbar-notif-badge')).toHaveText('2');
      await page.getByRole('button', { name: 'إشعاران غير مقروءان' }).click();
      await expect(page.locator('.notification-panel')).toBeVisible();

      await page.getByRole('button', { name: 'تعليم الكل كمقروء' }).click();

      /* العدّاد يختفي (unread صفر) وزرّ الكل يختفي معه. */
      await expect(page.locator('.topbar-notif-badge')).toHaveCount(0);
      await expect(page.getByRole('button', { name: 'تعليم الكل كمقروء' })).toHaveCount(0);
    });

    test('صف غير مقروء يحمل نقطة الحالة — لا نقطة بلا هندسة', async ({ page }) => {
      await page.goto('/student/dashboard');

      await page.getByRole('button', { name: 'إشعاران غير مقروءان' }).click();
      await expect(page.locator('.notification-panel')).toBeVisible();

      const dot = page.locator('.notif-item.unread .notif-item-dot').first();
      await expect(dot).toBeVisible();
      const dotBox = (await dot.boundingBox())!;
      expect(dotBox.width).toBeGreaterThanOrEqual(6);
      expect(dotBox.height).toBeGreaterThanOrEqual(6);
    });
  });
});

