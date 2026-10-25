/**
 * mobile-overflow.e2e.ts — zero horizontal overflow on narrow RTL
 * viewports (R305 Task 4).
 *
 * Viewports: 390×844 (iPhone-class), 360×800 (small Android), 320
 * (the floor). For every covered surface:
 *
 *   - `document.scrollingElement.scrollWidth <= innerWidth` — the
 *     guest surfaces (auth / 404 / colleges chrome) scroll the body;
 *   - the app shell's ONLY scroll container is `.content` (body never
 *     scrolls in the shell — layout.css), so its scrollWidth is the
 *     honest signal on shell pages;
 *   - key landmarks' bounding boxes must not poke past the viewport's
 *     right edge in RTL (the physical leading edge) — checked per
 *     surface with real selectors, hidden landmarks skipped.
 *
 * Each (surface × viewport) pair is its own test with its own
 * test.use scope (nested describe per viewport) — no cross-test state.
 */
import { test, expect } from './fixtures/qa';
import { expectNoHorizontalOverflow } from './fixtures/qa-checks';

const NARROW_VIEWPORTS = [
  { name: '390x844', width: 390, height: 844 },
  { name: '360x800', width: 360, height: 800 },
  { name: '320x800', width: 320, height: 800 },
] as const;

/** The auth card + its chrome are the guest funnel's landmarks. */
const AUTH_LANDMARKS = ['.auth-card', '.auth-top', '.auth-bottom'];
/** Guest colleges chrome: skip link, back link, page header, rows. */
const GUEST_COLLEGES_LANDMARKS = ['main#main', 'h1.pf-page-title', '.pf-rowlist'];
/** Shell pages: topbar title + bottom nav + the page header. */
const SHELL_LANDMARKS = ['.topbar-title', 'h1.pf-page-title', '.bottom-nav'];

test.describe('الزائر — فيض أفقي صفري', () => {
  for (const vp of NARROW_VIEWPORTS) {
    test.describe(`عرض ${vp.name}`, () => {
      test.use({ viewport: { width: vp.width, height: vp.height } });

      test('/auth بلا فيض ولا عنصر يتجاوز الحافة اليمنى (RTL)', async ({ page }) => {
        await page.goto('/auth');
        await expect(page.locator('h1.auth-form-title')).toHaveText('مرحبا بعودتك');
        await expectNoHorizontalOverflow(page, AUTH_LANDMARKS);
      });

      test('/404 بلا فيض', async ({ page }) => {
        await page.goto('/404');
        await expect(page.locator('.nf-title')).toHaveText('هذه الصفحة تغيّبت عن الحضور');
        await expectNoHorizontalOverflow(page, ['.nf-title']);
      });

      test('/colleges (قناة الزائر) بلا فيض', async ({ page }) => {
        await page.goto('/colleges');
        await expect(page.getByRole('group', { name: 'كلّيّات حرم المعرفة' })).toBeVisible();
        await expectNoHorizontalOverflow(page, GUEST_COLLEGES_LANDMARKS);
      });
    });
  }
});

test.describe('هيكل الطالب — فيض أفقي صفري', () => {
  for (const vp of NARROW_VIEWPORTS) {
    test.describe(`عرض ${vp.name}`, () => {
      test.use({ qaRole: 'STUDENT', viewport: { width: vp.width, height: vp.height } });

      test('/training بلا فيض داخل حاوية التمرير', async ({ page }) => {
        await page.goto('/training');
        await expect(page.getByRole('heading', { level: 1, name: 'التطوير الذاتي' })).toBeVisible();
        await expectNoHorizontalOverflow(page, SHELL_LANDMARKS);
      });

      test('/community بلا فيض داخل حاوية التمرير', async ({ page }) => {
        await page.goto('/community');
        await expect(page.getByRole('heading', { level: 1, name: 'المجتمع الجامعي' })).toBeVisible();
        await expectNoHorizontalOverflow(page, SHELL_LANDMARKS);
      });
    });
  }
});
