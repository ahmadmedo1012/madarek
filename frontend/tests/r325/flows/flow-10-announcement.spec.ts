/**
 * flow-10-announcement.spec.ts — FLOWS.md F10, the
 * community/competition ANNOUNCEMENT half (r325 P4a).
 *
 * F10 = «messaging / community / competitions / announcements». The
 * messaging + public shells are pinned by tests/e2e/notifications.e2e.ts
 * + guest-landing.e2e.ts; THIS spec adds the missing half against the
 * LIVE stack with real clicks:
 *
 *   · registrar /admin/community → «إعلان جديد» → the composer
 *     (ANNOUNCE_PLATFORM default scope) → «نشر الإعلان» → the card in
 *     the الإعلانات feed;
 *   · teacher /competitions → «مسابقة جديدة» (COMPETITIONS_RUN) → the
 *     create modal → «إنشاء» → the OPEN competition card;
 *   · student /community reads BOTH — the announcement in الإعلانات
 *     and the competition in المسابقات (the shared feeds the B3.3
 *     announcement-scope note fires for).
 *
 * Titles carry a run tag; no SETUP API at all — the writes ARE the proof.
 */
import { expect, test } from '@playwright/test';

import { flowPage, flowShot, localDateTimeInput, runTag } from './fixtures/live';

test('F10 · registrar broadcasts a platform announcement → a student reads it', async ({ browser }) => {
  test.setTimeout(150_000);
  const tag = runTag();
  const title = `إعلان e2e ${tag}`;

  // ── REGISTRAR: publish through the composer.
  {
    const { page, close } = await flowPage(browser, 'ADMIN');
    try {
      await page.goto('/admin/community');
      await expect(page).not.toHaveURL(/\/auth/);
      await expect(page.locator('h1').first()).toContainText('المجتمع الجامعي');
      await expect(page.getByRole('tab', { name: 'الإعلانات' })).toHaveAttribute('aria-selected', 'true');

      await page.getByRole('button', { name: 'إعلان جديد' }).click();
      const modal = page.getByRole('dialog', { name: 'إعلان جديد' });
      await expect(modal).toBeVisible();
      // ADMIN carries ANNOUNCE_PLATFORM — the scope defaults to it.
      await expect(modal.getByLabel('النطاق')).toContainText('على مستوى المنصّة');
      await modal.getByLabel('العنوان').fill(title);
      await modal.getByLabel('نصّ الإعلان').fill('بثّ آلي من مواصلة F10 — الإعلان الرسمي يظهر لكل المستخدمين.');
      await modal.getByRole('button', { name: 'نشر الإعلان' }).click();
      await expect(modal).toBeHidden({ timeout: 20_000 });

      // The feed carries the fresh card (pinned-off state, live list).
      await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });
      await flowShot(page, 'flow-10-announcement-published');
    } finally {
      await close();
    }
  }

  // ── STUDENT: the same feed reads the announcement.
  {
    const { page, close } = await flowPage(browser, 'STUDENT');
    try {
      await page.goto('/community');
      await expect(page.locator('h1').first()).toContainText('المجتمع الجامعي');
      await expect(page.getByText(title).first()).toBeVisible({ timeout: 30_000 });
      // And the student never sees the composer (no ANNOUNCE_*).
      await expect(page.getByRole('button', { name: 'إعلان جديد' })).toHaveCount(0);
      await flowShot(page, 'flow-10-announcement-student');
    } finally {
      await close();
    }
  }
});

test('F10 · teacher opens a competition → a student finds it in the community', async ({ browser }) => {
  test.setTimeout(150_000);
  const tag = runTag();
  const title = `مسابقة e2e ${tag}`;

  // ── TEACHER: create through the modal (COMPETITIONS_RUN).
  {
    const { page, close } = await flowPage(browser, 'TEACHER');
    try {
      await page.goto('/competitions');
      await expect(page).not.toHaveURL(/\/auth/);
      await page.getByRole('button', { name: 'مسابقة جديدة' }).click();
      const modal = page.getByRole('dialog', { name: 'مسابقة جديدة' });
      await expect(modal).toBeVisible();
      await modal.getByLabel('العنوان').fill(title);
      await modal.getByLabel('الوصف').fill('تحدٍّ آلي من مواصلة F10 — تُفتح المسابقة لكل الطلاب المشاركين.');
      await modal.getByLabel('الموعد النهائي').fill(localDateTimeInput(new Date(Date.now() + 7 * 86400_000)));
      await modal.getByRole('button', { name: 'إنشاء', exact: true }).click();
      await expect(modal).toBeHidden({ timeout: 20_000 });

      // The list carries the OPEN competition card.
      await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });
      await flowShot(page, 'flow-10-competition-created');
    } finally {
      await close();
    }
  }

  // ── STUDENT: the community competitions tab reads the same feed.
  {
    const { page, close } = await flowPage(browser, 'STUDENT');
    try {
      await page.goto('/community');
      await page.getByRole('tab', { name: 'المسابقات' }).click();
      await expect(page.getByText(title).first()).toBeVisible({ timeout: 30_000 });
      await flowShot(page, 'flow-10-competition-student');
    } finally {
      await close();
    }
  }
});
