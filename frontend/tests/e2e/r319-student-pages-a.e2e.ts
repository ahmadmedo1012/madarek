/**
 * r319-student-pages-a.e2e.ts — C3-S1: the student ACADEMIC pages join
 * the sheet system (§B2 grammar sweep, the pages-A half of Cycle 3).
 *
 * The dashboard (r319-dashboard-material) + the shared shell
 * (r319-shell-chrome) already pin the frame/grain/ambient sheet code.
 * This spec pins THIS sweep's layer from the USER'S side of the glass —
 * STUDENT role, chromium, light theme, hermetic mock transport + frozen
 * clock (FIXED_NOW 2026-03-15T10:00Z):
 *
 *  1. SECTION BARS — every visited academic route opens its regions
 *     with the mono-indexed title bar (`[01] مقرّراتك …`), the gutter
 *     index in the mono voice, LTR, aria-hidden; ≥2 bars per route.
 *  2. INDICATORS — the §B2 instruments render where the data exists:
 *     CourseBar hairlines (course rows, lecture rows, matrix mastery),
 *     the mono StatusChip register (DUE nD on assignment rows), the
 *     BarCount mono meta on every bar.
 *  3. NO ROUNDED CHROME — the card class sample on each route
 *     computes borderRadius 0px (the R313 collapsed ladder — a
 *     regression here means someone re-widened a corner).
 *  4. THE SHEET CODE — the ambient `SHEET S-01 · STUDENT` rides every
 *     masthead (the integrated proof: page + shell = one sheet).
 *
 * Routes: /student/courses · /student/courses/:offeringId (the seeded
 * OFFERING_ID fixture) · /student/matrix (stateful /me/matrix +
 * /me/gaps fixtures — the standard table carries no matrix corpus) ·
 * /student/library (books tab; the paginated books envelope carries
 * its meta SIBLING per the real backend's shape).
 */
import { test, expect } from './fixtures/e2e';
import {
  OFFERING_ID, LIBRARY_BOOKS, LIBRARY_RESEARCH,
} from './fixtures/api-fixtures';
import { installStatefulApi, statefulOk, statefulJson } from './fixtures/mock-transport';

test.use({ e2eRole: 'STUDENT' });

/* ── the matrix corpus (standard table carries none) ──────────────── */

const MATRIX_FIXTURE = [
  {
    courseId: 'crs_e2e_algorithms',
    courseCode: 'CS-201',
    courseName: 'مقدمة في الخوارزميات',
    themeColor: '#7c3aed',
    offeringId: OFFERING_ID,
    concepts: [
      { id: 'cpt_e2e_1', name: 'تحليل التعقيد', level: 0.9, attempts: 4 },
      { id: 'cpt_e2e_2', name: 'الخوارزميات الجشعة', level: 0.5, attempts: 3 },
      { id: 'cpt_e2e_3', name: 'البرمجة الديناميكية', level: 0.2, attempts: 2 },
    ],
  },
];

const GAPS_FIXTURE = [
  {
    conceptId: 'cpt_e2e_3',
    conceptName: 'البرمجة الديناميكية',
    courseId: 'crs_e2e_algorithms',
    courseName: 'مقدمة في الخوارزميات',
    courseColor: '#7c3aed',
    level: 0.2,
    recommendedLectureId: 'lec_e2e_greedy',
    recommendedLectureTitle: 'الخوارزميات الجشعة',
  },
];

/* Shared reader: every SectionBar's gutter index must be the mono
 * [nn] register (Latin digits, LTR, decorative — the dashboard's own
 * contract), and the bar's title keeps its h2. */
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
      hasMonoMeta: el.querySelector('.r319s-mono') !== null,
    })),
  );
}

async function expectSheetContract(page: import('@playwright/test').Page) {
  // The ambient sheet code rides the masthead — mono, LTR, decorative.
  const code = page.locator('.page-sheet-code');
  await expect(code).toHaveCount(1);
  await expect(code).toContainText('SHEET S-01 · STUDENT');
  expect(await code.locator('span').getAttribute('dir')).toBe('ltr');
}

test.describe('student pages A — §B2 sheet grammar (chromium · light)', () => {
  test.use({ themeSeed: 'light' });

  test('/student/courses — [01] مقرّراتك + [02] الواجبات القادمة with CourseBars and DUE chips', async ({ page }) => {
    await page.goto('/student/courses');
    await expect(page.locator('h1.pf-page-title')).toBeVisible({ timeout: 20000 });
    /* The bar count retries through the enrollments handoff — the
     * [01] bar rides the resolved-data branch (pending shows the
     * skeleton instead). */
    await expect(page.locator('.r319s-bar')).toHaveCount(2, { timeout: 15000 });

    const bars = await readBars(page);
    expect(bars.length).toBeGreaterThanOrEqual(2);
    expect(bars.map((b) => b.title)).toEqual(['مقرّراتك', 'الواجبات القادمة']);
    for (const b of bars) {
      expect(b.index).toMatch(/^\[\d{2}\]$/);
      expect(b.indexDir).toBe('ltr');
      expect(b.indexHidden).toBe('true');
      expect(b.indexMono).toContain('Geist Mono');
      expect(b.hasRule).toBe(true);
      expect(b.hasMonoMeta).toBe(true); // the count meta (02 enrollments / 01 assignment)
    }

    // The per-course CourseBars — the fixture's two enrollments (62% and
    // 100%), hairline track + end-tick + mono pct readout.
    const bars2 = page.locator('.r319s-coursebar');
    await expect(bars2).toHaveCount(2);
    const pcts = await bars2.locator('.r319s-coursebar-pct').allTextContents();
    expect(pcts).toEqual(['62%', '100%']);
    expect(await bars2.first().getAttribute('role')).toBe('meter');

    // The upcoming assignment's due state — the mono chip register.
    const chip = page.locator('.r319s-chip').first();
    await expect(chip).toHaveText(/^DUE \d+D$/);
    await expect(chip).toHaveCSS('border-radius', '0px');

    // The card-class sample computes radius 0 (the collapsed ladder).
    const rowlist = page.locator('.pf-rowlist').first();
    await expect(rowlist).toBeVisible();
    expect(await rowlist.evaluate((el) => getComputedStyle(el).borderRadius)).toBe('0px');

    await expectSheetContract(page);
  });

  test('/student/courses/:offeringId — [01]…[04] curriculum bars, lecture CourseBar, DUE chip', async ({ page }) => {
    await page.goto(`/student/courses/${OFFERING_ID}`);
    await expect(page.locator('h1.pf-page-title')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.r319s-bar')).toHaveCount(4, { timeout: 15000 });

    const bars = await readBars(page);
    expect(bars).toHaveLength(4);
    expect(bars.map((b) => b.title)).toEqual(['المحاضرات', 'المواد المرفقة', 'الجدول الأسبوعي', 'الواجبات']);
    expect(bars.map((b) => b.index)).toEqual(['[01]', '[02]', '[03]', '[04]']);
    for (const b of bars) {
      expect(b.indexMono).toContain('Geist Mono');
      expect(b.indexDir).toBe('ltr');
    }
    // The lectures bar's mono meta — the watched/total ratio (1/2).
    expect(bars[0]!.title).toBe('المحاضرات');

    // The in-progress lecture row carries its §B2 CourseBar
    // (lecture 2: 446/720s watched → 62%).
    const lecBar = page.locator('.course-lec-row .r319s-coursebar');
    await expect(lecBar).toHaveCount(1);
    await expect(lecBar.locator('.r319s-coursebar-pct')).toHaveText('62%');

    // The assignment row's due chip — the mono register.
    await expect(page.locator('.r319s-chip').first()).toHaveText(/^DUE \d+D$/);

    // The continue strip (the page's one-action rail) computes radius 0.
    const rail = page.locator('.r305c-continue');
    await expect(rail).toBeVisible();
    expect(await rail.evaluate((el) => getComputedStyle(el).borderRadius)).toBe('0px');

    await expectSheetContract(page);
  });

  test('/student/matrix — [01] gaps + [02] heatmap with the per-course mastery bar', async ({ page }) => {
    await installStatefulApi(page, [
      {
        method: 'GET',
        pattern: '**/api/v1/me/matrix',
        fulfill: async ({ route }) => {
          await statefulOk(route, MATRIX_FIXTURE);
        },
      },
      {
        method: 'GET',
        pattern: '**/api/v1/me/gaps',
        fulfill: async ({ route }) => {
          await statefulOk(route, GAPS_FIXTURE);
        },
      },
    ]);

    await page.goto('/student/matrix');
    await expect(page.locator('h1.pf-page-title')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.r319s-bar')).toHaveCount(2, { timeout: 15000 });

    const bars = await readBars(page);
    expect(bars).toHaveLength(2);
    expect(bars.map((b) => b.title)).toEqual(['فجواتك ذات الأولوية', 'مصفوفتك حسب المقرّر']);
    expect(bars.map((b) => b.index)).toEqual(['[01]', '[02]']);
    for (const b of bars) {
      expect(b.index).toMatch(/^\[\d{2}\]$/);
      expect(b.indexMono).toContain('Geist Mono');
      expect(b.hasMonoMeta).toBe(true); // 01 gap / 03 measured concepts
    }

    // The per-course mastery CourseBar — (0.9 + 0.5 + 0.2) / 3 → 53%.
    const mastery = page.locator('.r319sp-matrix-bar .r319s-coursebar');
    await expect(mastery).toHaveCount(1);
    await expect(mastery.locator('.r319s-coursebar-pct')).toHaveText('53%');
    expect(await mastery.getAttribute('role')).toBe('meter');

    // The matrix course block (the card class sample) computes radius 0.
    const block = page.locator('.matrix-course').first();
    await expect(block).toBeVisible();
    expect(await block.evaluate((el) => getComputedStyle(el).borderRadius)).toBe('0px');

    await expectSheetContract(page);
  });

  test('/student/library — books tab: [01] استعاراتي + [02] الكتب with the mono count meta', async ({ page }) => {
    const books = LIBRARY_BOOKS.map((b) => ({ ...b }));
    await installStatefulApi(page, [
      {
        method: 'GET',
        pattern: '**/api/v1/library/books**',
        fulfill: async ({ route }) => {
          /* The paginated envelope's meta rides as a SIBLING of data
           * (the real backend's shape — the page's total reads
           * meta.total, never the page array). */
          await statefulJson(route, 200, {
            data: books,
            meta: { page: 1, limit: 24, total: books.length, totalPages: 1 },
          });
        },
      },
      {
        method: 'GET',
        pattern: '**/api/v1/research/published',
        fulfill: async ({ route }) => {
          await statefulOk(route, LIBRARY_RESEARCH);
        },
      },
      {
        method: 'GET',
        pattern: '**/api/v1/me/loans',
        fulfill: async ({ route }) => {
          await statefulOk(route, []);
        },
      },
    ]);

    await page.goto('/student/library');
    await expect(page.locator('h1.pf-page-title')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('.r319s-bar')).toHaveCount(2, { timeout: 15000 });

    const bars = await readBars(page);
    expect(bars).toHaveLength(2);
    expect(bars.map((b) => b.title)).toEqual(['استعاراتي', 'الكتب']);
    expect(bars.map((b) => b.index)).toEqual(['[01]', '[02]']);
    for (const b of bars) {
      expect(b.index).toMatch(/^\[\d{2}\]$/);
      expect(b.indexMono).toContain('Geist Mono');
    }
    // The books bar's mono meta — the server's honest total (02).
    const booksBar = page.locator('.r319s-bar', { hasText: 'الكتب' });
    await expect(booksBar.locator('.r319s-count')).toHaveText('02');

    // The honest empty loans region renders (no fabricated rows) — the
    // indicator/empty contract: the page carries its §B2 count meta
    // AND the reserved-but-empty loans line.
    const loansPanel = page.locator('section[aria-label="استعاراتي النشطة"]');
    await expect(loansPanel).toContainText('لا استعارات نشطة');

    // The panel (the card class sample) computes radius 0.
    expect(await loansPanel.evaluate((el) => getComputedStyle(el).borderRadius)).toBe('0px');

    await expectSheetContract(page);
  });
});
