/**
 * console-network-health.e2e.ts — zero JS errors, zero unexpected
 * failed requests, full image-alt audit across every QA-covered route
 * (R305 Task 4).
 *
 * For each surface (guest + authenticated):
 *   - `pageerror` events are collected from BEFORE the first goto —
 *     the test fails on ANY uncaught JS exception;
 *   - every response with status >= 400 is collected; the ONLY allowed
 *     failures are the intentionally-fulfilled mock answers the route
 *     legitimately produces (the guest /auth/me 401 probe + the
 *     refresh 401 the api client may cascade) — anything else fails
 *     loudly;
 *   - every <img> must declare an alt attribute (descriptive or
 *     alt="" decorative); a content image with a non-empty alt that
 *     failed to decode (naturalWidth === 0) fails too.
 *
 * Content gate per route: the assertion runs only AFTER the route's
 * primary Arabic content is visible, so the health window covers the
 * real page life (cold load → data → render), not an empty frame.
 */
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures/qa';
import { collectPageHealth, expectImagesAudited, type ExpectedFailure } from './fixtures/qa-checks';

/** Guest surfaces probe /auth/me and receive the honest 401. */
const GUEST_EXPECTED: ExpectedFailure[] = [
  { status: 401, urlIncludes: '/auth/me', reason: 'the guest auth probe is answered 401 by design' },
  { status: 401, urlIncludes: '/auth/refresh', reason: 'a cascading refresh probe is answered 401 by design' },
];

interface HealthRoute {
  path: string;
  /** Arabic content that proves the page actually rendered. */
  ready: (page: Page) => Promise<void>;
}

const GUEST_ROUTES: HealthRoute[] = [
  {
    path: '/auth',
    ready: async (page) => {
      await expect(page.locator('h1.auth-form-title')).toHaveText('مرحباً بعودتك');
    },
  },
  {
    path: '/auth/register',
    ready: async (page) => {
      await expect(page.locator('h1.auth-form-title')).toHaveText('من أنت؟');
    },
  },
  {
    path: '/404',
    ready: async (page) => {
      await expect(page.locator('.nf-title')).toHaveText('هذه الصفحة تغيّبت عن الحضور');
    },
  },
  {
    path: '/colleges',
    ready: async (page) => {
      await expect(page.getByRole('group', { name: 'كلّيّات حرم المعرفة' })).toBeVisible();
    },
  },
  {
    path: '/colleges/leaderboard',
    ready: async (page) => {
      await expect(page.getByRole('heading', { level: 1, name: 'منافسة الكلّيّات' })).toBeVisible();
    },
  },
];

const STUDENT_ROUTES: HealthRoute[] = [
  {
    path: '/training',
    ready: async (page) => {
      await expect(page.getByRole('heading', { level: 1, name: 'التطوير الذاتي' })).toBeVisible();
    },
  },
  {
    path: '/achievements',
    ready: async (page) => {
      await expect(page.getByRole('heading', { level: 1, name: 'الإنجازات' })).toBeVisible();
    },
  },
  {
    path: '/community',
    ready: async (page) => {
      await expect(page.getByRole('heading', { level: 1, name: 'المجتمع الجامعي' })).toBeVisible();
      await expect(page.getByText('افتتاح التسجيل للفصل الجديد')).toBeVisible();
    },
  },
  {
    path: '/competitions',
    ready: async (page) => {
      await expect(page.getByRole('heading', { level: 1, name: 'المسابقات الأكاديمية' })).toBeVisible();
    },
  },
  {
    path: '/vision',
    ready: async (page) => {
      await expect(page.getByRole('heading', { level: 1 })).toContainText('ابتكاراً قادماً');
    },
  },
];

test.describe('صحة الصفحات — الزائر', () => {
  for (const route of GUEST_ROUTES) {
    test(`${route.path} بلا أخطاء JS ولا طلب فاشل غير مقصود`, async ({ page }) => {
      const health = collectPageHealth(page);
      await page.goto(route.path);
      await route.ready(page);
      await health.assertClean(GUEST_EXPECTED);
      await expectImagesAudited(page);
    });
  }
});

test.describe('صحة الصفحات — الطالب', () => {
  test.use({ qaRole: 'STUDENT' });

  for (const route of STUDENT_ROUTES) {
    test(`${route.path} بلا أخطاء JS ولا طلب فاشل غير مقصود`, async ({ page }) => {
      const health = collectPageHealth(page);
      await page.goto(route.path);
      await route.ready(page);

      // A second client-side navigation exercises the shell's SPA path
      // too (focus-rescue + document.title effects run there).
      await page.goto('/training');
      await expect(page.getByRole('heading', { level: 1, name: 'التطوير الذاتي' })).toBeVisible();

      await health.assertClean([]);
      await expectImagesAudited(page);
    });
  }
});
