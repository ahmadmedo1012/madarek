/**
 * online-exams.e2e.ts — قائمة الاختبارات الإلكترونية (r164-k).
 *
 * الحالتان الجوهريتان للقائمة (صفحة /student/online-exams):
 *   - محمّلة: قسم «متاح الآن» ببطاقة اختبار مفتوح (نافذة مفتوحة) +
 *     قسم «اختبارات أجريتها» بمحاولة مصحّحة (شارة النتيجة)؛
 *   - فارغة: الحالة الفارغة الصادقة عبر override لـ GET /exams/me.
 */
import { test, expect } from './fixtures/e2e';

test.use({ e2eRole: 'STUDENT' });

test.describe('الاختبارات الإلكترونية — القائمة', () => {
  test('المحمّلة: اختبار متاح بنافذته + محاولة مصحّحة في السجل', async ({ page }) => {
    await page.goto('/student/online-exams');
    // (R321 re-pin — R287 precedent: the online-exams LIST joined the
    // patterns contract (PageFrame + patterns/PageHeader), so the h1
    // carries the family's pf-page-title class now, not page-title —
    // and toContainText: the decorative aria-hidden [01] page-index
    // span rides inside the h1.)
    await expect(page.locator('h1.pf-page-title')).toContainText('الاختبارات');

    /* القسم المتاح — بطاقة الاختبار القصير */
    const quizCard = page.locator('.oex-row', { hasText: 'اختبار قصير — الوحدة الثالثة' });
    await expect(quizCard).toContainText('اختبار قصير · مقدمة في الخوارزميات');
    await expect(quizCard).toContainText('15 دقيقة');
    // 22-c counted nouns — 3–10 takes the plural form «أسئلة».
    await expect(quizCard).toContainText('8 أسئلة');
    await expect(quizCard).toContainText('درجة النجاح');
    // نافذة مفتوحة (examWindowState على ساعة مجمّدة) → يعرض موعد الإغلاق.
    await expect(quizCard).toContainText('يغلق');

    /* السجل — المحاولة المصحّحة بشارة النتيجة */
    const historyCard = page.locator('.oex-row', { hasText: 'اختبار نصفي — الخوارزميات' });
    await expect(historyCard).toContainText('82 / 100');
    await expect(historyCard).toContainText('ناجح');
    // نافذة منتهية → الشارة الصادقة «أغلق باب التسليم».
    await expect(historyCard).toContainText('أغلق باب التسليم');
  });

  test.describe('بحوض فارغ', () => {
    // override خاص بهذا الاختبار فقط: قائمة فارغة من «الخلفية».
    test.use({
      apiOverrides: [
        { method: 'GET', path: '/exams/me', json: { data: [] } },
      ],
    });

    test('الحالة الفارغة الصادقة — لا تُقرأ النتيجة الفارغة كخطأ', async ({ page }) => {
      await page.goto('/student/online-exams');
      await expect(
        page.getByText('لا اختبارات متاحة'),
      ).toBeVisible();
    });
  });
});

/* ── r366 brief 2-c — the TAKER as a finished product (320→1440) ──
 * Four sharp geometry/craft assertions, each documented failing (or, for
 * the overflow belt, already-clean) on the pre-fix tree:
 *   1. the sticky timer bar never covers a question card it scrolls to
 *      (390×320 · light + dark) — the rem-constant scroll-margin could
 *      not track the painted bar height (measured overlap: q.top 156 <
 *      bar.bottom 236 at 390×320; 137 < 228 at 320×568; 376 < 377 at
 *      320×568 @200% text);
 *   2. the question palette collapses behind a toggle on phone and
 *      OPENS AS A SHEET (390) — the always-on 44px dot row made the bar
 *      ~180px tall on a 320px viewport;
 *   3. the autosave chip is the calm «يُحفَظ تلقائيًا / تم الحفظ» pair
 *      with RESERVED height — the footer used to mount on first save
 *      and grow the card (~24px layout shift mid-answer);
 *   4. no horizontal page scroll at 320 and at 200% text scale.
 * The taker flow rides the fixture corpus: start → answer → submit are
 * all mocked (mock-transport.ts), the clock is frozen, the countdown
 * restores from expiresAt (iso(+15min) — no flaky 00:00). */
test.describe('الاختبارات الإلكترونية — أداء الاختبار', () => {
  test.use({ e2eRole: 'STUDENT' });

  async function startAttempt(page: import('@playwright/test').Page) {
    await page.goto('/student/online-exams');
    await page.locator('.oex-row', { hasText: 'اختبار قصير — الوحدة الثالثة' }).click();
    await page.getByRole('button', { name: 'بدء الاختبار' }).click();
    await page.locator('.oex-bar').waitFor();
  }

  /** Rect-geometry probe shared by the overlap assertions. r366 fix:
   * `target` names the card the jump LANDED ON — the bar contract is
   * about the card you jumped to (a card scrolled above the frame is
   * simply above, not "covered"). Without it the last-jump assertion
   * flagged the FIRST card parked off-screen above. */
  async function takerGeometry(page: import('@playwright/test').Page, target?: string) {
    return page.evaluate((id) => {
      const bar = document.querySelector('.oex-bar')!.getBoundingClientRect();
      const all = [...document.querySelectorAll('.oex-q')] as HTMLElement[];
      const cards = all.map((c) => c.getBoundingClientRect());
      const el = id ? all.find((c) => c.id === `exam-q-${id}`) : null;
      const targetRect = el ? el.getBoundingClientRect() : null;
      const scroller = document.querySelector('.content') as HTMLElement;
      const doc = document.documentElement;
      return {
        barBottom: bar.bottom,
        firstCardTop: Math.min(...cards.map((c) => c.top)),
        cardUnderBar: targetRect
          ? targetRect.top < bar.bottom - 0.5
          : cards.some((c) => c.top < bar.bottom - 0.5),
        contentOverflow: scroller.scrollWidth - scroller.clientWidth,
        docOverflow: doc.scrollWidth - doc.clientWidth,
      };
    }, target);
  }

  for (const theme of ['light', 'dark'] as const) {
    test.describe(`ثيم ${theme}`, () => {
      test.use({ themeSeed: theme });

      test('المؤقّت الثابت لا يغطي بطاقة السؤال عند 390×320', async ({ page }) => {
        test.info().annotations.push({ type: 'theme', description: theme });
        await page.setViewportSize({ width: 390, height: 320 });
        await startAttempt(page);
        // The product's own jump mechanism (jumpToQuestion rides
        // scrollIntoView + the card's scroll-margin): land on every
        // question and demand its card fully clears the sticky bar.
        for (const qid of ['q_e2e_1', 'q_e2e_2']) {
          await page.evaluate((id) => {
            document.getElementById(`exam-q-${id}`)?.scrollIntoView({ block: 'start' });
          }, qid);
          await page.waitForTimeout(250);
          const g = await takerGeometry(page, qid);
          expect(g.cardUnderBar, `السؤال ${qid} تحت شريط المؤقّت`).toBe(false);
        }
      });
    });
  }

  test('خريطة الأسئلة ورقة تُفتح من مفتاح على 390', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await startAttempt(page);
    // Phone: the palette rides behind one toggle (the bar stays compact),
    // not as an always-on 44px dot row.
    const toggle = page.getByRole('button', { name: 'خريطة الأسئلة' });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.oex-qmap')).toBeHidden();
    // Opens as a sheet docked under the bar.
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.oex-qmap')).toBeVisible();
    // A dot jump lands the question clear of the bar and closes the sheet.
    await page.locator('.oex-qmap-dot').nth(1).click();
    await expect(page.locator('.oex-qmap')).toBeHidden();
    const g = await takerGeometry(page, 'q_e2e_2');
    expect(g.cardUnderBar).toBe(false);
  });

  test('رقاقة الحفظ التلقائي هادئة ولا تُزيح البطاقة', async ({ page }) => {
    await startAttempt(page);
    const card = page.locator('#exam-q-q_e2e_1');
    const before = await card.boundingBox();
    // Answer question 1 → the autosave chip must appear inside an
    // already-reserved footer: same card box, calm one-phrase copy.
    await page.locator('#exam-q-q_e2e_1 label.oex-choice').nth(1).click();
    const chip = page.locator('#exam-q-q_e2e_1 .oex-q-state');
    await expect(chip).toHaveText(/^(يُحفَظ تلقائيًا|تم الحفظ)$/);
    await expect(page.locator('#exam-q-q_e2e_1 .oex-q-state.saved, #exam-q-q_e2e_1 .oex-q-state.saving')).toBeVisible();
    await expect(chip).toHaveText('تم الحفظ');
    const after = await card.boundingBox();
    /* Calm = no VISIBLE shift: precision 0 (±0.5px) — precision 1
     * (±0.05px) failed on a 0.45px sub-pixel re-raster on CI
     * (byte-identical layout; font hinting rounds differently on
     * the runner's rasterizer). A half-pixel is not a layout
     * regression; the reserved footer guarantees whole pixels. */
    expect(after!.height).toBeCloseTo(before!.height, 0);
    expect(after!.y).toBeCloseTo(before!.y, 0);
  });

  test('لا تمرير أفقي عند 320 وعند تكبير النص 200٪', async ({ page }) => {
    // 320 — the narrow band, default text scale.
    await page.setViewportSize({ width: 320, height: 568 });
    await startAttempt(page);
    let g = await takerGeometry(page);
    expect(g.contentOverflow).toBeLessThanOrEqual(1);
    expect(g.docOverflow).toBeLessThanOrEqual(1);
    // 200% text scale (WCAG 1.4.4 resize path): the fluid rem root
    // doubles, every rem-based seat grows — the page must not scroll
    // sideways and the bar must still clear the cards it jumps to.
    await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; });
    await page.waitForTimeout(250);
    g = await takerGeometry(page);
    expect(g.contentOverflow).toBeLessThanOrEqual(1);
    expect(g.docOverflow).toBeLessThanOrEqual(1);
    await page.evaluate(() => {
      document.getElementById('exam-q-q_e2e_2')?.scrollIntoView({ block: 'start' });
    });
    await page.waitForTimeout(250);
    g = await takerGeometry(page, 'q_e2e_2');
    expect(g.cardUnderBar, 'بطاقة تحت شريط المؤقّت عند 200٪').toBe(false);
  });
});
