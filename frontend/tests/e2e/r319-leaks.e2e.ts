/**
 * R319 C1-C — §B2 data-leak line, pinned at the hermetic journey level.
 *
 * The owner's real-iPhone screenshot (student dashboard) carried, in one
 * header line: «مساء النور، J — كلية تقنية المعلومات · قسم اختبار ·
 * السنة 8 · r180» — a seed test-department and a raw revision code
 * rendered as identity — plus «01/15 وينتهي 09/10» (numeric slash dates
 * with an invisible RLM inside an Arabic sentence) and «36% من الفصل»
 * (un-isolated digits+symbol in Arabic prose).
 *
 * This spec pins the durable fixes on the REAL rendered page (mock
 * transport, frozen clock):
 *  1. the header identity line carries no raw codes, no placeholder
 *     test names («قسم اختبار»/«كلية اختبار»), no stringified junk —
 *     while the honest segments (faculty, department, year) survive;
 *  2. the meta line renders REAL ar-LY term dates (Arabic month names +
 *     Latin digits — pinned against the fixture's FIXED_NOW-derived
 *     term: startsAt iso(-24·42) → 2026-02-01, endsAt iso(+24·70) →
 *     2026-05-24), the percentage in the ONE numeral system (Latin),
 *     and no numeric-slash date shape (the «01‏/02» RLM defect);
 *  3. a POISONED /me/dashboard (departmentName 'قسم اختبار r180' — the
 *     exact seed junk from the screenshot) sanitizes to NOTHING: the
 *     rendered header omits both «قسم اختبار» and «r180», keeps the
 *     clean segments, and never leaves a dangling «·».
 */
import { test, expect } from './fixtures/e2e';
import { STUDENT_DASHBOARD } from './fixtures/api-fixtures';

/** The §E-10 leak shapes the rendered header must never match. */
const LEAK_RE = /\br\d{2,3}\b|قسم اختبار|كلية اختبار|undefined/;

test.use({ e2eRole: 'STUDENT' });

test.describe('R319 — سطر التسريب في لوحة الطالب (leak-proof header)', () => {
  test('the identity line leaks no codes / placeholder names / junk — and keeps the honest segments', async ({ page }) => {
    await page.goto('/student/dashboard');

    const desc = page.locator('.pf-page-desc').first();
    // Readiness: the resolved description greets the seeded student
    // (the pending mirror says «جارٍ تحضير لوحتك…»).
    await expect(desc).toContainText('أحمد');
    const text = await desc.innerText();
    expect(text, `header must not leak — got: ${text}`).not.toMatch(LEAK_RE);

    // The honest identity survives sanitization: real faculty,
    // department and year from the standard fixture payload.
    await expect(desc).toContainText('كلية الهندسة');
    await expect(desc).toContainText('قسم علوم الحاسوب');
    await expect(desc).toContainText('السنة 3');
  });

  test('the meta line renders real ar-LY term dates + one numeral system', async ({ page }) => {
    await page.goto('/student/dashboard');

    const meta = page.locator('.pf-page-meta').first();
    await expect(meta).toBeVisible();
    // FIXED_NOW 2026-03-15T10:00Z → startsAt 2026-02-01, endsAt
    // 2026-05-24: real Intl.DateTimeFormat('ar-LY') day + long month.
    await expect(meta).toContainText('1 فبراير');
    await expect(meta).toContainText('24 مايو');
    /* R319 override (c2-G1): the semester's «45% من الفصل» prose moved
     * from the masthead meta into the [01] section's RulerGauge — the
     * same datum as the instrument's quiet mono meta (§B2). The pin
     * follows the datum to its new home. */
    const rulerMeta = page.locator('.r319s-ruler-meta').first();
    await expect(rulerMeta).toContainText('45%');
    await expect(rulerMeta).toContainText('من الفصل مضى');

    const text = await meta.innerText();
    const rulerText = await rulerMeta.innerText();
    // Never Arabic-Indic / Persian digits in visible text.
    expect(text, `meta must stay Latin-digit — got: ${text}`).not.toMatch(/[\u0660-\u0669\u06F0-\u06F9]/);
    expect(rulerText, `ruler meta must stay Latin-digit — got: ${rulerText}`).not.toMatch(/[\u0660-\u0669\u06F0-\u06F9]/);
    // The numeric-slash date shape («01‏/02» with its invisible RLM)
    // is gone — real dates only.
    expect(text).not.toMatch(/\d\u200F\s*\/\s*\d/);
  });
});

test.describe('R319 — the poisoned /me/dashboard proves the sanitizer kills the seed junk', () => {
  test.use({
    e2eRole: 'STUDENT',
    apiOverrides: [{
      method: 'GET',
      path: '/me/dashboard',
      /* The photographed junk as one poisoned payload: the placeholder
       * test department carrying a raw revision code. */
      json: {
        data: {
          ...STUDENT_DASHBOARD,
          profile: {
            ...STUDENT_DASHBOARD.profile,
            departmentName: 'قسم اختبار r180',
          },
        },
      },
    }],
  });

  test('«قسم اختبار r180» omits BOTH — no dangling separator, clean segments stay', async ({ page }) => {
    await page.goto('/student/dashboard');

    const desc = page.locator('.pf-page-desc').first();
    // Readiness: the clean faculty segment renders (the poisoned
    // department drops out entirely).
    await expect(desc).toContainText('كلية الهندسة');

    const text = await desc.innerText();
    // The sanitizer killed the placeholder name AND the code…
    expect(text, `poisoned header must not leak — got: ${text}`).not.toMatch(LEAK_RE);
    expect(text).not.toContain('قسم اختبار');
    expect(text).not.toContain('r180');
    // …while the honest segments survive the poisoned payload.
    expect(text).toContain('السنة 3');
    // And no dangling «·» where the dropped segment used to sit
    // (listwise join — never a doubled or edge separator).
    expect(text).not.toMatch(/·\s*·/);
    expect(text).not.toMatch(/·\s*$/);

    // The rest of the poisoned page stays leak-free too: the meta line
    // still renders the real ar-LY term dates.
    const meta = page.locator('.pf-page-meta').first();
    await expect(meta).toContainText('1 فبراير');
    await expect(meta).toContainText('24 مايو');
  });
});
