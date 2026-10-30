/**
 * r319-dashboard-material.e2e.ts — C2-G1: the student dashboard joins
 * the sheet system (§B2 — the page's own material).
 *
 * G2's shell landed the frame + grain + the ambient `SHEET S-01 ·
 * STUDENT` title line on every authenticated route (r319-shell-chrome
 * pins those). This spec pins THIS page's §B2 layer from the USER'S
 * side of the glass — STUDENT role, chromium, light AND dark, hermetic
 * mock transport + frozen clock (FIXED_NOW 2026-03-15T10:00Z, a
 * Sunday):
 *
 *  1. SECTION BARS — every titled section opens with the mono-indexed
 *     title bar `[01] الفصل الدراسي … [05] أسبوعك القادم` — the
 *     [nn] gutter index in the mono voice, LTR, aria-hidden.
 *  2. THE SEMESTER RULER — RulerGauge: one tick per week of the
 *     fixture's term (startsAt −42d / endsAt +70d → 16 weeks, day 42
 *     → W07/16), the `W\d{2}/\d{2}` mono head, the 45% quiet mono
 *     meta, the role="meter" contract.
 *  3. COURSE BARS — per-course hairlines with the END-TICK + mono
 *     code/pct, and the AVG summary bar in the KPI (momentum) band.
 *  4. STATUS CHIPS — square (radius 0) mono Latin chips on agenda
 *     rows: today's class → [CLASS], the +3-day assignment → [DUE 3D].
 *  5. THE WEEK STRIP — 7 Sunday-first cells, exactly TODAY inked
 *     (2026-03-15 → cell 0, dates 15–21, aria-current="date").
 *  6. THE SHEET CODE — G2's ambient `SHEET S-01 · STUDENT` rides the
 *     masthead (the integrated proof: page + shell = one sheet).
 *  7. THE HATCHED EMPTY — an overridden empty bucket renders the
 *     EmptyCell (45° hatch + honest label + its ONE action), never
 *     bare «لا شيء بعد» prose.
 */
import { test, expect } from './fixtures/e2e';

const THEMES = ['light', 'dark'] as const;

test.use({ e2eRole: 'STUDENT' });

for (const theme of THEMES) {
  test.describe(`dashboard §B2 sheet material — ${theme}`, () => {
    test.use({ themeSeed: theme });

    test('every titled section opens with a mono-indexed SectionBar', async ({ page }) => {
      await page.goto('/student/dashboard');
      await expect(page.locator('h1.pf-page-title')).toBeVisible({ timeout: 20000 });

      // The five titled sections (the momentum strip stays the R305
      // labeled-rule metadata band by design — not a numbered section).
      const bars = page.locator('.r319s-bar');
      await expect(bars).toHaveCount(5);
      const titles = await bars.locator('.r319s-bar-title').allTextContents();
      expect(titles).toEqual(['الفصل الدراسي', 'اليوم', 'مقرّراتك', 'فجوات يُنصح بسدّها', 'أسبوعك القادم']);

      // The gutter index: [nn] Latin mono, LTR, decorative.
      const indexes = await bars.locator('.r319s-bar-index').evaluateAll((els) =>
        els.map((el) => ({
          text: (el.textContent || '').trim(),
          dir: el.getAttribute('dir'),
          hidden: el.getAttribute('aria-hidden'),
          mono: getComputedStyle(el).fontFamily,
        })),
      );
      expect(indexes.length).toBeGreaterThanOrEqual(2);
      for (const idx of indexes) {
        expect(idx.text).toMatch(/^\[\d{2}\]$/);
        expect(idx.dir).toBe('ltr');
        expect(idx.hidden).toBe('true');
        expect(idx.mono).toContain('Geist Mono');
      }
      // The hairline rule completes every bar.
      await expect(bars.locator('.r319s-bar-rule')).toHaveCount(5);
    });

    test('the semester ruler: W07/16 mono head, one tick per week, the 45% quiet meta', async ({ page }) => {
      await page.goto('/student/dashboard');
      await expect(page.locator('.r319s-ruler')).toBeVisible({ timeout: 20000 });

      const ruler = page.locator('.r319s-ruler');
      // The fixture term (startsAt −42d, endsAt +70d) spans 112 days =
      // 16 whole weeks; day 42 → week 7.
      await expect(ruler.locator('.r319s-ruler-head')).toHaveText(/^W\d{2}\/\d{2}$/);
      await expect(ruler.locator('.r319s-ruler-head')).toHaveText('W07/16');
      await expect(ruler.locator('.r319s-ruler-tick')).toHaveCount(16);
      // The API's percentage as quiet mono meta (replaces the old
      // «X% من الفصل مضى» prose line).
      await expect(ruler.locator('.r319s-ruler-meta')).toContainText('45%');
      await expect(ruler.locator('.r319s-ruler-meta')).toContainText('من الفصل مضى');
      // The meter contract for assistive tech.
      await expect(ruler).toHaveAttribute('role', 'meter');
      await expect(ruler).toHaveAttribute('aria-valuetext', 'W07/16 · 45%');
      // The orange fill reaches exactly the term's progress.
      const fill = await ruler.locator('.r319s-ruler-fill').evaluate((el) => el.style.inlineSize);
      expect(fill).toBe('45%');
    });

    test('course bars: per-course hairline + end-tick + the AVG KPI summary bar', async ({ page }) => {
      await page.goto('/student/dashboard');
      await expect(page.locator('h1.pf-page-title')).toBeVisible({ timeout: 20000 });

      // 2 enrolled courses + the momentum band's AVG bar.
      const bars = page.locator('.r319s-coursebar');
      await expect(bars).toHaveCount(3);
      await expect(bars.filter({ hasText: 'CS-201' })).toHaveCount(1);
      await expect(bars.filter({ hasText: 'CS-310' })).toHaveCount(1);
      await expect(bars.filter({ hasText: 'AVG' })).toHaveCount(1);
      // Every bar carries the end-tick (the reading) + mono pct.
      await expect(bars.locator('.r319s-coursebar-tick')).toHaveCount(3);
      const pcts = (await bars.locator('.r319s-coursebar-pct').allTextContents()).sort();
      expect(pcts).toEqual(['100%', '58%', '62%']);
      // The meter contract.
      const meters = await bars.evaluateAll((els) => els.map((el) => el.getAttribute('role')));
      expect(meters.every((r) => r === 'meter')).toBe(true);
    });

    test('status chips: square mono Latin chips on the agenda rows', async ({ page }) => {
      await page.goto('/student/dashboard');
      await expect(page.locator('h1.pf-page-title')).toBeVisible({ timeout: 20000 });

      const chips = page.locator('.r319s-chip');
      await expect(chips.first()).toBeVisible();
      expect(await chips.count()).toBeGreaterThanOrEqual(2);
      // Today's class row → its quiet CLASS chip in the TodayList.
      await expect(page.locator('.pf-today-item .r319s-chip', { hasText: 'CLASS' })).toBeVisible();
      // The +3-day assignment → the honest deadline chip in the week ledger.
      await expect(page.locator('.week-item .r319s-chip', { hasText: 'DUE 3D' })).toBeVisible();
      // Square (radius 0), the mono voice, LTR isolation.
      const style = await chips.first().evaluate((el) => ({
        radius: getComputedStyle(el).borderRadius,
        mono: getComputedStyle(el).fontFamily,
        dir: el.getAttribute('dir'),
      }));
      expect(style.radius).toBe('0px');
      expect(style.mono).toContain('Geist Mono');
      expect(style.dir).toBe('ltr');
    });

    test('the week strip: 7 Sunday-first cells, exactly today inked', async ({ page }) => {
      await page.goto('/student/dashboard');
      await expect(page.locator('.r319s-weekstrip')).toBeVisible({ timeout: 20000 });

      const strip = page.locator('.r319s-weekstrip');
      const cells = strip.locator('.r319s-weekcell');
      await expect(cells).toHaveCount(7);
      // FIXED_NOW 2026-03-15 is a Sunday → cell 0 (الأحد, inline-start
      // in the RTL row) is the inked one.
      await expect(strip.locator('.r319s-weekcell--today')).toHaveCount(1);
      await expect(cells.nth(0)).toHaveClass(/r319s-weekcell--today/);
      await expect(cells.nth(0)).toHaveAttribute('aria-current', 'date');
      // Dates 15–21, Latin mono (the one-numeral convention).
      const dates = await strip.locator('.r319s-weekcell-date').allTextContents();
      expect(dates).toEqual(['15', '16', '17', '18', '19', '20', '21']);
      // The inked cell inverts its ground (ink fill, paper label) —
      // theme-reactive by construction.
      const grounds = await cells.evaluateAll((els) =>
        els.map((el) => getComputedStyle(el).backgroundColor),
      );
      expect(grounds[0]).not.toBe(grounds[1]);
    });

    test("the ambient sheet code is retired from the masthead (r324 X10 — the innerText jargon sweep)", async ({ page }) => {
      await page.goto('/student/dashboard');
      await expect(page.locator('h1.pf-page-title')).toBeVisible({ timeout: 20000 });

      /* r324 X10 re-pin: SHEET S-01 · STUDENT left the DOM by owner
       * order (the drafting-chrome identity lines retired; the unit
       * gates r324-text-gate.test.tsx + PageHeader.test.tsx pin it).
       * The e2e now pins the retirement on the real page — a regression
       * that resurrects the corner code fails HERE, not just in units. */
      const line = page.locator('.page-sheet-code');
      await expect(line).toHaveCount(0);
      await expect(page.locator('h1.pf-page-title')).not.toContainText('SHEET');
    });
  });
}

test.describe('the hatched empty bucket', () => {
  /* The standard corpus ships full buckets — override ONE (the
   * enrollments list) to the honest empty and pin the §B2 EmptyCell:
   * the 45° hatch cell + the honest label + its ONE action. */
  test.use({
    e2eRole: 'STUDENT',
    themeSeed: 'light',
    apiOverrides: [{
      method: 'GET',
      path: '/enrollments/me',
      json: { data: [] },
    }],
  });

  test('an empty bucket renders the hatched EmptyCell + its one action', async ({ page }) => {
    await page.goto('/student/dashboard');
    await expect(page.locator('h1.pf-page-title')).toBeVisible({ timeout: 20000 });

    const empty = page.locator('.r319s-empty');
    await expect(empty).toHaveCount(1);
    await expect(empty).toContainText('لا مقرّرات بعد');
    // The ONE action — a quiet ghost link to the catalog.
    await expect(empty.locator('.r319s-empty-action a')).toHaveAttribute('href', '/student/catalog');
    // The hatch cell: the 45° repeating hairline (never bare text).
    const hatch = empty.locator('.r319s-empty-hatch');
    await expect(hatch).toHaveAttribute('aria-hidden', 'true');
    const bg = await hatch.evaluate((el) => getComputedStyle(el).backgroundImage);
    expect(bg).toContain('repeating-linear-gradient');
    // The dashed reserved-region rule on the cell itself.
    const border = await empty.evaluate((el) => getComputedStyle(el).borderStyle);
    expect(border).toContain('dashed');
  });
});
