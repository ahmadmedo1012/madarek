/**
 * r319-student-pages-b.e2e.ts — C3-S2: the student PERSONAL pages join
 * the sheet system (§B2 grammar sweep, the pages-B half of Cycle 3).
 *
 * The pages-A spec (r319-student-pages-a) pinned the academic family;
 * this one pins the personal half from the USER'S side of the glass —
 * STUDENT role, chromium, light theme, hermetic mock transport + frozen
 * clock (FIXED_NOW 2026-03-15T10:00Z — a SUNDAY, so the schedule's
 * week rotation anchors on today and the WeekStrip inks cell 0):
 *
 *  1. SECTION BARS — every visited route opens its regions with the
 *     mono-indexed title bar (`[01] …`), the gutter index mono/LTR/
 *     aria-hidden, ≥2 bars per route except /student/messages (the
 *     inbox is ONE log section — its [01] is pinned, honestly, with
 *     nothing fabricated beside it).
 *  2. INDICATORS — the §B2 instruments render where the data exists:
 *     the WeekStrip (schedule: today inked, dates 15–21), BarCount
 *     mono metas, the TODAY/UNREAD/LINKED mono chips, the hatched
 *     EmptyCell (profile links tab's UNLINKED rows ride chips — the
 *     empty cell itself is pinned on the AI sidebar corpus).
 *  3. NO ROUNDED CHROME — the card/chip class sample on each route
 *     computes borderRadius 0px (the R313 collapsed ladder).
 *  4. THE SHEET CODE — the ambient `SHEET S-01 · STUDENT` rides every
 *     masthead (the integrated proof: page + shell = one sheet).
 *
 * Routes: /student/profile · /student/messages (stateful /messages
 * envelope with unread meta — the standard table carries no messages)
 * · /student/ai (stateful /me/gaps + /ai/conversations — the standard
 * table carries neither) · /student/schedule (the standard enrollments'
 * two schedule slots: Sunday + Tuesday).
 */
import { test, expect } from './fixtures/e2e';
import { installStatefulApi, statefulJson } from './fixtures/mock-transport';

test.use({ e2eRole: 'STUDENT' });

/* Shared reader — the §B2 bar's own contract (mono index, LTR,
 * decorative) + the ambient sheet-code line. */
async function readBars(page: import('@playwright/test').Page) {
  return page.locator('.r319s-bar').evaluateAll((els) =>
    els.map((el) => ({
      title: el.querySelector('.r319s-bar-title')?.textContent ?? '',
      index: (el.querySelector('.r319s-bar-index')?.textContent ?? '').trim(),
      indexDir: el.querySelector('.r319s-bar-index')?.getAttribute('dir'),
      indexHidden: el.querySelector('.r319s-bar-index')?.getAttribute('aria-hidden'),
      indexMono: el.querySelector('.r319s-bar-index')
        ? getComputedStyle(el.querySelector('.r319s-bar-index')!).fontFamily
        : '',
      hasRule: el.querySelector('.r319s-bar-rule') !== null,
    })),
  );
}

async function expectSheetContract(page: import('@playwright/test').Page) {
  const code = page.locator('.page-sheet-code');
  await expect(code).toHaveCount(1);
  await expect(code).toContainText('SHEET S-01 · STUDENT');
  expect(await code.locator('span').getAttribute('dir')).toBe('ltr');
}

test.describe('student pages B — §B2 sheet grammar (chromium · light)', () => {
  test.use({ themeSeed: 'light' });

  test('/student/profile — [01]+[04] SectionBars, UNLINKED mono chips, radius-0 cards', async ({ page }) => {
    await page.goto('/student/profile');
    await expect(page.locator('h1.pf-page-title')).toBeVisible({ timeout: 20000 });
    /* The default academic tab shows [01]; the account-level password
     * block below the tabs closes the sheet as [04]. */
    await expect(page.locator('.r319s-bar')).toHaveCount(2, { timeout: 15000 });

    const bars = await readBars(page);
    expect(bars.map((b) => b.title)).toEqual(['المعلومات الأكاديمية', 'تغيير كلمة المرور']);
    expect(bars.map((b) => b.index)).toEqual(['[01]', '[04]']);
    for (const b of bars) {
      expect(b.indexDir).toBe('ltr');
      expect(b.indexHidden).toBe('true');
      expect(b.indexMono).toContain('Geist Mono');
      expect(b.hasRule).toBe(true);
    }

    /* The links tab — the §B2 indicator contract: the three unlinked
     * accounts ride the mono chip register + the bar's linked/total
     * mono ratio meta (0/3 — real localStorage data, nothing linked). */
    await page.getByRole('tab', { name: 'الحسابات البحثية' }).click();
    await expect(page.locator('.r319s-bar').first()).toContainText('الحسابات الأكاديمية');
    const chips = page.locator('.r319s-chip', { hasText: 'UNLINKED' });
    await expect(chips).toHaveCount(3);
    expect(await chips.first().getAttribute('dir')).toBe('ltr');
    const linksBar = page.locator('.r319s-bar', { hasText: 'الحسابات الأكاديمية' });
    await expect(linksBar.locator('.r319s-mono')).toHaveText('0/3');

    // The account card (the card class sample) computes radius 0.
    const card = page.locator('.card').first();
    await expect(card).toBeVisible();
    expect(await card.evaluate((el) => getComputedStyle(el).borderRadius)).toBe('0px');

    await expectSheetContract(page);
  });

  test('/student/messages — [01] سجلّ الرسائل bar, mono total + UNREAD chips', async ({ page }) => {
    /* The standard table carries no messages — the inbox's real wire
     * shape (paginated envelope, meta SIBLING of data, unread count)
     * rides the stateful transport. One unread incoming row (from the
     * teacher, to the student) + one sent row. */
    const ME = 'usr_e2e_student';
    await installStatefulApi(page, [
      {
        method: 'GET',
        pattern: '**/api/v1/messages**',
        fulfill: async ({ route }) => {
          await statefulJson(route, 200, {
            data: [
              {
                id: 'msg_e2e_1',
                body: 'تذكير: تسليم الواجب الثالث غداً.',
                createdAt: '2026-03-15T08:30:00.000Z',
                readAt: null,
                fromUser: { id: 'usr_e2e_teacher', firstName: 'ليلى', lastName: 'الفيتوري', avatarColor: null },
                toUser: { id: ME, firstName: 'أحمد', lastName: 'الزاوي', avatarColor: null },
              },
              {
                id: 'msg_e2e_2',
                body: 'شكراً على التوضيح.',
                createdAt: '2026-03-14T14:00:00.000Z',
                readAt: '2026-03-14T15:00:00.000Z',
                fromUser: { id: ME, firstName: 'أحمد', lastName: 'الزاوي', avatarColor: null },
                toUser: { id: 'usr_e2e_teacher', firstName: 'ليلى', lastName: 'الفيتوري', avatarColor: null },
              },
            ],
            meta: { page: 1, limit: 30, total: 2, totalPages: 1, unread: 1 },
          });
        },
      },
    ]);

    await page.goto('/student/messages');
    await expect(page.locator('h1')).toBeVisible({ timeout: 20000 });
    /* The inbox is ONE log section — its [01] bar (honest: nothing is
     * fabricated beside the log). */
    await expect(page.locator('.r319s-bar')).toHaveCount(1, { timeout: 15000 });

    const bars = await readBars(page);
    expect(bars[0]!.title).toBe('سجلّ الرسائل');
    expect(bars[0]!.index).toBe('[01]');
    expect(bars[0]!.indexMono).toContain('Geist Mono');
    expect(bars[0]!.indexDir).toBe('ltr');

    /* The bar's mono meta — the honest total (02) + the UNREAD 1
     * summary chip (the same register the rows ride). */
    const meta = page.locator('.r319s-bar-meta');
    await expect(meta.locator('.r319s-count')).toHaveText('02');
    await expect(meta.locator('.r319s-chip')).toHaveText('UNREAD 1');

    /* The unread incoming row carries its §B2 mono chip; the sent row
     * never does. */
    const rowChips = page.locator('.list-row .r319s-chip');
    await expect(rowChips).toHaveCount(1);
    await expect(rowChips).toHaveText('UNREAD');

    // The mono chip (the class sample) computes radius 0.
    expect(await rowChips.first().evaluate((el) => getComputedStyle(el).borderRadius)).toBe('0px');

    await expectSheetContract(page);
  });

  test('/student/ai — [01] gaps + [02] conversations + [03] suggestions bars', async ({ page }) => {
    await installStatefulApi(page, [
      {
        method: 'GET',
        pattern: '**/api/v1/me/gaps',
        fulfill: async ({ route }) => {
          await statefulJson(route, 200, {
            data: [
              {
                conceptId: 'cpt_e2e_dp',
                conceptName: 'البرمجة الديناميكية',
                courseId: 'crs_e2e_algorithms',
                courseName: 'مقدمة في الخوارزميات',
                courseColor: '#7c3aed',
                level: 0.2,
                recommendedLectureId: 'lec_e2e_greedy',
                recommendedLectureTitle: 'الخوارزميات الجشعة',
              },
              {
                conceptId: 'cpt_e2e_greedy',
                conceptName: 'الخوارزميات الجشعة',
                courseId: 'crs_e2e_algorithms',
                courseName: 'مقدمة في الخوارزميات',
                courseColor: '#7c3aed',
                level: 0.5,
                recommendedLectureId: 'lec_e2e_greedy',
                recommendedLectureTitle: 'الخوارزميات الجشعة',
              },
            ],
          });
        },
      },
      {
        method: 'GET',
        pattern: '**/api/v1/ai/conversations',
        fulfill: async ({ route }) => {
          await statefulJson(route, 200, {
            data: [
              { id: 'conv_e2e_1', title: 'تحليل التعقيد', createdAt: '2026-03-14T09:00:00.000Z' },
              { id: 'conv_e2e_2', title: 'مراجعة الجشع', createdAt: '2026-03-13T18:00:00.000Z' },
            ],
          });
        },
      },
    ]);

    await page.goto('/student/ai');
    await expect(page.locator('h1.pf-page-title')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.r319s-bar')).toHaveCount(3, { timeout: 15000 });

    const bars = await readBars(page);
    expect(bars.map((b) => b.title)).toEqual(['بناءً على أدائك', 'محادثاتك', 'أسئلة مقترحة']);
    expect(bars.map((b) => b.index)).toEqual(['[01]', '[02]', '[03]']);
    for (const b of bars) {
      expect(b.index).toMatch(/^\[\d{2}\]$/);
      expect(b.indexMono).toContain('Geist Mono');
      expect(b.indexDir).toBe('ltr');
      expect(b.indexHidden).toBe('true');
    }

    /* The honest counts as the bars' mono meta — 02 measured gaps /
     * 02 stored conversations / 05 authored suggestions. R320 CI fix:
     * the counts are DATA-BOUND (gaps + conversations arrive via the
     * mock transport after mount), and the one-shot read raced them on
     * cold runners — the f84e6025 green run failed this exact line on
     * attempt 1 and passed on retry, and the 2026-10-27 run lost the
     * retry too. The auto-retrying toHaveCount(3) gate makes the read
     * deterministic (same discipline as the h1/bar waits above). */
    const countLoc = page.locator('.r319s-bar .r319s-count');
    await expect(countLoc).toHaveCount(3, { timeout: 15000 });
    const counts = await countLoc.allTextContents();
    expect(counts).toEqual(['02', '02', '05']);

    // The gap card (the card class sample) computes radius 0.
    const gapCard = page.locator('.ai-gap-card').first();
    await expect(gapCard).toBeVisible();
    expect(await gapCard.evaluate((el) => getComputedStyle(el).borderRadius)).toBe('0px');

    await expectSheetContract(page);
  });

  test('/student/schedule — WeekStrip + [01] الأحد (TODAY) + [02] الثلاثاء day bars', async ({ page }) => {
    await page.goto('/student/schedule');
    await expect(page.locator('h1.pf-page-title')).toBeVisible({ timeout: 20000 });

    /* The §B2 week strip — the page's genuine today context: 7 cells,
     * today (FIXED_NOW 2026-03-15, a Sunday) inked with its mono date. */
    const strip = page.locator('.r319s-weekstrip');
    await expect(strip).toBeVisible({ timeout: 15000 });
    await expect(strip.locator('.r319s-weekcell')).toHaveCount(7);
    const todayCell = strip.locator('.r319s-weekcell--today');
    await expect(todayCell).toHaveCount(1);
    await expect(todayCell).toHaveAttribute('aria-current', 'date');
    await expect(todayCell.locator('.r319s-weekcell-date')).toHaveText('15');

    /* The standard enrollments' two slots (Sunday 09:00 + Tuesday
     * 11:00) — today-first rotation: [01] الأحد (TODAY chip, 01 slot),
     * [02] الثلاثاء (01 slot). */
    await expect(page.locator('.r319s-bar')).toHaveCount(2, { timeout: 15000 });
    const bars = await readBars(page);
    expect(bars.map((b) => b.title)).toEqual(['الأحد', 'الثلاثاء']);
    expect(bars.map((b) => b.index)).toEqual(['[01]', '[02]']);
    for (const b of bars) {
      expect(b.indexMono).toContain('Geist Mono');
      expect(b.indexDir).toBe('ltr');
    }
    const counts = await page.locator('.r319s-bar .r319s-count').allTextContents();
    expect(counts).toEqual(['01', '01']);

    // Today's marker — the §B2 mono chip register.
    await expect(page.locator('.r319s-chip', { hasText: 'TODAY' })).toHaveCount(1);

    // The day's RowList (the card class sample) computes radius 0.
    const rowlist = page.locator('.pf-rowlist').first();
    await expect(rowlist).toBeVisible();
    expect(await rowlist.evaluate((el) => getComputedStyle(el).borderRadius)).toBe('0px');

    await expectSheetContract(page);
  });
});
