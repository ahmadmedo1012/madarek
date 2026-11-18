/**
 * 2-b (Agent 4 wave 1) — the document-viewer surface, pinned hermetically.
 *
 * The reader route (`/document/:filename`) is exercised against the real
 * Vite-served SPA with the mock transport. Two document regimes:
 *
 *   · ERROR REGIME (default) — the mock transport answers the pdf.js
 *     fetch with 501 (no fixture), so the routed page truthfully shows
 *     the classified load-error surface while the TOOLBAR still renders
 *     (it is doc-independent chrome). This pins the hermetic contract.
 *
 *   · LOADED REGIME — a REAL 14-page PDF (backend/storage/papers/
 *     sample.pdf, the seeded research fixture) is served through a
 *     page-level stateful route, so the toolbar's live contracts
 *     (page navigation, zoom, search fold, thumbnails) and the SPLIT
 *     GEOMETRY (canvas + annotations rail inside the viewport-locked
 *     page) are asserted against a genuine pdf.js render, not a stub.
 *
 * Layout guarantees pinned here (320 → 1440, RTL):
 *   a. the toolbar wraps with no horizontal overflow at 320 and every
 *      control clears the 44px touch floor;
 *   b. prev/next are reachable on a phone and the page indicator
 *      collapses to its compact form (the «صفحة» word folds away);
 *   c. the annotations rail sits BESIDE the canvas on desktop (never
 *      stacked under it, never past the locked viewport) and moves into
 *      the bottom Sheet behind a floating trigger on phones — the
 *      canvas is never squeezed;
 *   d. the search fold's results list scrolls INSIDE the viewer
 *      surface (bounded height + its own overflow), and an empty walk
 *      says so in one line;
 *   f. print/download affordances stay reachable.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect } from './fixtures/e2e';
import { installStatefulApi, statefulOk, type StatefulMockRoute } from './fixtures/mock-transport';

/* The seeded research fixture — a real 14-page PDF with an extractable
 * text layer (page 1: "Trace-based Just-in-Time Type Specialization…"),
 * so fit-width rendering, page walking and the search fold all run
 * through the genuine pdf.js pipeline. */
const SAMPLE_PDF = readFileSync(
  resolve(dirname(fileURLToPath(import.meta.url)), '../../../backend/storage/papers/sample.pdf'),
);

const PAPER_ID = 'ppr_e2e_viewer';

/** One annotation on page 2 — the rail/sheet render a real row. */
const NOTE = {
  id: 'ann_e2e_viewer_1',
  paperId: PAPER_ID,
  page: 2,
  comment: 'راجع توثيق المصادر في هذه الصفحة.',
  color: '#B57438',
  createdAt: '2025-11-01T09:00:00.000Z',
  author: {
    id: 'usr_e2e_teacher',
    firstName: 'ليلى',
    lastName: 'الفيتوري',
    role: 'TEACHER',
    avatarColor: '#8b5cf6',
    avatarInitials: 'لف',
  },
};

/** Serve the real PDF (+ optionally the annotations list) on the page. */
// R366-final: parameter index [0] — installStatefulApi's FIRST param is
// the Page (the [1] misindex typed `page` as the routes array and broke
// every call site's typecheck).
async function serveViewerDoc(page: Parameters<typeof installStatefulApi>[0], withNotes: boolean) {
  const routes: StatefulMockRoute[] = [
    {
      method: 'GET',
      pattern: '**/api/v1/files/papers/sample.pdf',
      fulfill: async ({ route }) => {
        await route.fulfill({ status: 200, contentType: 'application/pdf', body: SAMPLE_PDF });
      },
    },
  ];
  if (withNotes) {
    routes.push({
      method: 'GET',
      pattern: `**/api/v1/research/${PAPER_ID}/annotations`,
      fulfill: async ({ route }) => statefulOk(route, [NOTE]),
    });
  }
  await installStatefulApi(page, routes);
}

/** Box intersection test (1px tolerance for borders/rounding). */
function intersects(a: { x: number; y: number; width: number; height: number }, b: typeof a): boolean {
  return (
    a.x < b.x + b.width - 1 &&
    b.x < a.x + a.width - 1 &&
    a.y < b.y + b.height - 1 &&
    b.y < a.y + a.height - 1
  );
}

/* ═══ 1 · the hermetic error regime ═════════════════════════════════ */

test.describe('the load-error surface (hermetic default)', () => {
  test.use({ e2eRole: 'STUDENT' });

  test('الخطأ المصنَّف مع شريط الأدوات وطريق العودة وتنزيل الملف', async ({ page }) => {
    await page.goto('/document/missing.pdf?title=' + encodeURIComponent('ورقة مفقودة'));

    // The toolbar is doc-independent chrome — it renders on the error
    // surface too, with the download affordance still present (f).
    const toolbar = page.locator('.pdf-toolbar');
    await expect(toolbar).toBeVisible();
    await expect(page.getByRole('button', { name: 'تحميل المستند' })).toBeVisible();

    // The classified Arabic error (501 → the generic retryable branch)
    // with exactly ONE action: the retry.
    await expect(page.getByText('تعذّر تحميل المستند')).toBeVisible();
    await expect(page.getByRole('button', { name: 'إعادة المحاولة' })).toBeVisible();

    // The dead-end reader names its way back.
    await expect(page.getByRole('link', { name: 'العودة إلى المكتبة' })).toBeVisible();

    // The page does not horizontally overflow (light check).
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });
});

/* ═══ 2 · the loaded regime — desktop geometry ══════════════════════ */

test.describe('the split reading surface (desktop 1280)', () => {
  test.use({ e2eRole: 'TEACHER', viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await serveViewerDoc(page, true);
  });

  test('القارئ ولوحة الملاحظات جنبًا إلى جنب داخل الشاشة المقفلة', async ({ page }) => {
    await page.goto(`/document/sample.pdf?paper=${PAPER_ID}&title=` + encodeURIComponent('ورقة تجريبية'));
    await expect(page.locator('.pdf-pageinfo-total')).toContainText('14', { timeout: 30_000 });
    await expect(page.locator('.annotations-panel')).toBeVisible();

    // The split surface is a real flex row (the stacked defect measured
    // display: block with the rail UNDER the viewer).
    const display = await page.locator('.doc-reader').evaluate((el) => getComputedStyle(el).display);
    expect(display).toBe('flex');

    const main = (await page.locator('.doc-reader-main').boundingBox())!;
    const side = (await page.locator('.doc-reader-side').boundingBox())!;
    expect(main).toBeTruthy();
    expect(side).toBeTruthy();

    // Beside, never under: the boxes are horizontally separated (RTL
    // puts the rail on the inline-end/left edge).
    expect(intersects(main, side)).toBe(false);

    // The whole rail is INSIDE the viewport-locked page — the stacked
    // defect pushed it past the 800px fold.
    expect(side.y + side.height).toBeLessThanOrEqual(800);
    expect(main.y + main.height).toBeLessThanOrEqual(800);

    // The toolbar and the rail are different territories — never
    // overlapping boxes at any width.
    const toolbar = (await page.locator('.pdf-toolbar').boundingBox())!;
    expect(intersects(toolbar, side)).toBe(false);

    // The notes list owns its own scroll (a long thread never
    // stretches the workspace).
    const listOverflow = await page
      .locator('.annotations-list')
      .evaluate((el) => getComputedStyle(el).overflowY);
    expect(listOverflow).toBe('auto');

    // The rendered page indicator reflects the real document.
    await expect(page.getByRole('spinbutton')).toHaveValue('1');
  });

  test('التنقل بين الصفحات والتكبير وطبع/تنزيل في متناول اليد', async ({ page }) => {
    await page.goto(`/document/sample.pdf?paper=${PAPER_ID}`);
    await expect(page.locator('.pdf-pageinfo-total')).toContainText('14', { timeout: 30_000 });

    const prev = page.getByRole('button', { name: 'الصفحة السابقة' });
    const next = page.getByRole('button', { name: 'الصفحة التالية' });
    await expect(prev).toBeDisabled();
    await expect(next).toBeEnabled();

    await next.click();
    await expect(page.getByRole('spinbutton')).toHaveValue('2');
    await expect(prev).toBeEnabled();

    // Direct page entry through the compact input.
    await page.getByRole('spinbutton').fill('5');
    await expect(page.getByRole('spinbutton')).toHaveValue('5');

    // Zoom: fit-width pill flips to an explicit percentage and back.
    const pill = page.locator('.pdf-scale-pill');
    await expect(pill).toHaveText('ملاءمة');
    await page.getByRole('button', { name: 'تكبير' }).click();
    await expect(pill).toContainText('%');
    await page.getByRole('button', { name: 'تصغير' }).click();
    await expect(pill).toHaveText('ملاءمة');

    // Print/download affordances remain (f).
    await expect(page.getByRole('button', { name: 'تحميل المستند' })).toBeVisible();
    await expect(page.getByRole('button', { name: /الشاشة الكاملة|ملء الشاشة/ })).toBeVisible();
  });
});

/* ═══ 3 · the search fold ═══════════════════════════════════════════ */

test.describe('the search fold (desktop 1280)', () => {
  test.use({ e2eRole: 'STUDENT', viewport: { width: 1280, height: 800 } });

  test.beforeEach(async ({ page }) => {
    await serveViewerDoc(page, false);
  });

  test('قائمة النتائج تعرض الصفحات وتنفّر داخل السطح', async ({ page }) => {
    await page.goto('/document/sample.pdf');
    await expect(page.locator('.pdf-pageinfo-total')).toContainText('14', { timeout: 30_000 });

    await page.getByRole('button', { name: 'بحث في المستند' }).click();
    await page.getByLabel('البحث في المستند').fill('trace');
    await page.getByRole('button', { name: 'بحث', exact: true }).click();

    // The results list renders one row per hit page.
    const results = page.locator('.pdf-search-results');
    await expect(results).toBeVisible({ timeout: 20_000 });
    const rows = await results.locator('li').count();
    expect(rows).toBeGreaterThanOrEqual(1);

    // It scrolls INSIDE the surface: its own overflow + a bounded box
    // that never escapes the viewer.
    const overflowY = await results.evaluate((el) => getComputedStyle(el).overflowY);
    expect(overflowY).toBe('auto');
    const viewer = (await page.locator('.pdf-viewer').boundingBox())!;
    const listBox = (await results.boundingBox())!;
    expect(listBox.y + listBox.height).toBeLessThanOrEqual(viewer.y + viewer.height + 1);

    // Clicking a result jumps to its page (page 1 holds "Trace-based…").
    await results.locator('li button').first().click();
    await expect(page.getByRole('spinbutton')).toHaveValue('1');
    await expect(page.locator('.pdf-search-results li button').first()).toHaveAttribute(
      'aria-current',
      'true',
    );
  });

  test('البحث بلا نتائج يقول ذلك في سطر واحد', async ({ page }) => {
    await page.goto('/document/sample.pdf');
    await expect(page.locator('.pdf-pageinfo-total')).toContainText('14', { timeout: 30_000 });

    await page.getByRole('button', { name: 'بحث في المستند' }).click();
    await page.getByLabel('البحث في المستند').fill('zzqq-not-a-word');
    await page.getByRole('button', { name: 'بحث', exact: true }).click();

    await expect(page.getByText('لا نتائج')).toBeVisible({ timeout: 20_000 });
    // No fake counter for an empty walk.
    await expect(page.locator('.pdf-searchbar-count')).toBeHidden();
  });
});

/* ═══ 4 · the phone band (320) ══════════════════════════════════════ */

test.describe('the phone band (320×568)', () => {
  test.use({ e2eRole: 'TEACHER', viewport: { width: 320, height: 568 } });

  test.beforeEach(async ({ page }) => {
    await serveViewerDoc(page, true);
  });

  test('الشريط يلتفّ بلا فيض و44px لكل عنصر والمؤشر يتصاغر', async ({ page }) => {
    await page.goto(`/document/sample.pdf?paper=${PAPER_ID}`);
    await expect(page.locator('.pdf-pageinfo-total')).toContainText('14', { timeout: 30_000 });

    // No horizontal overflow — page, viewer or toolbar.
    const docOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(docOverflow).toBeLessThanOrEqual(1);
    const toolbarOverflow = await page
      .locator('.pdf-toolbar')
      .evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(toolbarOverflow).toBeLessThanOrEqual(1);

    // Every toolbar control clears the 44px touch floor.
    const boxes = await page
      .locator('.pdf-toolbar .pdf-btn, .pdf-toolbar .pdf-scale-pill')
      .evaluateAll((els) =>
        els.map((el) => ({
          w: el.getBoundingClientRect().width,
          h: el.getBoundingClientRect().height,
        })),
      );
    expect(boxes.length).toBeGreaterThanOrEqual(6);
    for (const b of boxes) {
      expect(b.w).toBeGreaterThanOrEqual(44);
      expect(b.h).toBeGreaterThanOrEqual(44);
    }

    // The page indicator collapses to its compact form — the «صفحة»
    // word folds away — and never overlaps the zoom cluster.
    const wordDisplay = await page
      .locator('.pdf-pageinfo-word')
      .evaluate((el) => getComputedStyle(el).display);
    expect(wordDisplay).toBe('none');
    const pageinfo = (await page.locator('.pdf-pageinfo').boundingBox())!;
    const zoom = (await page.locator('.pdf-toolbar-group[aria-label="التكبير"]').boundingBox())!;
    expect(pageinfo).toBeTruthy();
    expect(zoom).toBeTruthy();
    expect(intersects(pageinfo, zoom)).toBe(false);

    // Prev/next stay reachable inside the phone viewport.
    const next = (await page.getByRole('button', { name: 'الصفحة التالية' }).boundingBox())!;
    expect(next.y).toBeGreaterThanOrEqual(0);
    expect(next.y + next.height).toBeLessThanOrEqual(568);
  });

  test('الملاحظات في ورقة سفلية خلف زر عائم — اللوحة لا تزاحم الورقة', async ({ page }) => {
    await page.goto(`/document/sample.pdf?paper=${PAPER_ID}`);
    await expect(page.locator('.pdf-pageinfo-total')).toContainText('14', { timeout: 30_000 });

    // The rail is NOT in the DOM on the phone — the Sheet owns it.
    await expect(page.locator('.doc-reader-side')).toHaveCount(0);

    // The floating trigger: fixed, 44px+, inside the viewport.
    const fab = page.locator('.doc-notes-fab');
    await expect(fab).toBeVisible();
    const fabPosition = await fab.evaluate((el) => getComputedStyle(el).position);
    expect(fabPosition).toBe('fixed');
    const fabBox = (await fab.boundingBox())!;
    expect(fabBox.width).toBeGreaterThanOrEqual(44);
    expect(fabBox.height).toBeGreaterThanOrEqual(44);
    expect(fabBox.y + fabBox.height).toBeLessThanOrEqual(568);

    // Opening the sheet never squeezes the canvas (an overlay, not a
    // column): the viewer keeps its width.
    const viewerBefore = (await page.locator('.pdf-viewer').boundingBox())!;
    await fab.click();
    const sheet = page.getByRole('dialog', { name: 'ملاحظات البحث' });
    await expect(sheet).toBeVisible();
    await expect(sheet.locator('.annotations-panel')).toBeVisible();
    await expect(page.getByText(NOTE.comment)).toBeVisible();
    const viewerAfter = (await page.locator('.pdf-viewer').boundingBox())!;
    expect(Math.abs(viewerAfter.width - viewerBefore.width)).toBeLessThanOrEqual(1);
  });
});
