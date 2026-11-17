/**
 * calendar.e2e.ts — التقويم الأكاديمي على الشاشات الضيقة (r366 · task 2-d).
 *
 * يثبّت عقود التقويم عند 360/320 (فاتح + داكن):
 *  1. لا تجاوز أفقي عند 360: المستند وكل أجزاء الأداة داخل الإطار.
 *  2. مبدّل شهر/أسبوع قابل للوصول عند 320 — والأسبوع يعرض رقائق
 *     مواعيد من سطر واحد مع ellipsis + title.
 *  3. رأس الأيام يتحرك مع الشبكة (لا يلتصق بالشريط العلوي).
 *  4. علامة اليوم ظاهرة في الوضعين: لون + شكل (رقع مربّع مملوء).
 */
import { test, expect } from './fixtures/e2e';

test.use({ e2eRole: 'STUDENT' });

/** قياس التجاوز الأفقي للمستند (px). */
async function docOverflowX(page: import('@playwright/test').Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

/** صندوق عنصر داخل إطار العرض أفقياً تماماً. */
async function withinViewportX(
  page: import('@playwright/test').Page,
  selector: string,
): Promise<boolean> {
  return page.locator(selector).first().evaluate((el) => {
    const r = el.getBoundingClientRect();
    return r.left >= -0.5 && r.right <= window.innerWidth + 0.5;
  });
}

/* ── 1 · 360: لا تجاوز ─────────────────────────────────────────── */

test.describe('التقويم — 360 بكسل', () => {
  test.use({ viewport: { width: 360, height: 740 } });

  test('لا تجاوز أفقي: المستند والرأس والشبكة والمفتاح داخل الإطار', async ({ page }) => {
    await page.goto('/student/calendar');
    await expect(page.locator('.cal-grid .cal-cell').first()).toBeVisible();

    expect(await docOverflowX(page)).toBeLessThanOrEqual(0);

    for (const sel of ['.cal-head', '.cal-legend', '.cal-dow-row', '.cal-grid', '.cal-detail']) {
      expect(await withinViewportX(page, sel)).toBe(true);
    }

    /* خلايا الشبكة قابلة للاستخدام: كل خلية ≥ 36px عرضاً (7 أعمدة
       متساوية داخل 360) وقابلة للنقر. */
    const cell = (await page.locator('.cal-grid .cal-cell').first().boundingBox())!;
    expect(cell.width).toBeGreaterThanOrEqual(36);
  });

  test('رأس الأيام يتحرك مع الشبكة — لا التصاق بالشريط العلوي', async ({ page }) => {
    await page.goto('/student/calendar');
    const dow = page.locator('.cal-dow-row');
    await expect(dow).toBeVisible();

    const position = await dow.evaluate((el) => getComputedStyle(el).position);
    expect(position).not.toBe('sticky');
    expect(position).not.toBe('fixed');

    const before = (await dow.boundingBox())!;
    /* r366: the shell's inner .content owns the page scroll (the window
       never moves) — scroll the REAL scroller, exactly like the messages
       suite's list-position contract. */
    await page.evaluate(() => {
      const scroller = document.querySelector('.content') as HTMLElement | null;
      if (scroller) scroller.scrollTop = 400;
      else window.scrollTo(0, 400);
    });
    const after = (await dow.boundingBox())!;
    /* تحرّك مع الصفحة (نفس مسافة التمرير) بدل التثبّت تحت الشريط. */
    expect(before.y - after.y).toBeGreaterThan(300);
  });
});

/* ── 2 · 320: مبدّل الشهر/الأسبوع + رقائق المواعيد ─────────────── */

test.describe('التقويم — مبدّل الشهر/الأسبوع عند 320', () => {
  test.use({ viewport: { width: 320, height: 700 } });

  test('المبدّل قابل للوصول والأسبوع يعرض رقائق سطر واحد', async ({ page }) => {
    await page.goto('/student/calendar');
    await expect(page.locator('.cal-grid .cal-cell').first()).toBeVisible();

    /* الشهر الافتراضي: 42 خلية. */
    expect(await page.locator('.cal-grid .cal-cell').count()).toBe(42);

    const weekBtn = page.getByRole('button', { name: 'أسبوع' });
    await expect(weekBtn).toBeVisible();
    await weekBtn.click();

    /* الأسبوع: 7 خلايا + رقائق المواعيد لليوم (حصة الأحد 09:00). */
    const cells = page.locator('.cal-grid .cal-cell');
    await expect(cells).toHaveCount(7);
    const chips = page.locator('.cal-cell-chip');
    await expect(chips.first()).toBeVisible();
    expect(await chips.count()).toBeGreaterThanOrEqual(1);

    /* الرقاقة: سطر واحد + ellipsis + title بالعنوان الكامل. */
    const chip = chips.first();
    const chipCss = await chip.evaluate((el) => {
      const cs = getComputedStyle(el);
      return { ws: cs.whiteSpace, to: cs.textOverflow, title: el.getAttribute('title') };
    });
    expect(chipCss.ws).toBe('nowrap');
    expect(chipCss.to).toBe('ellipsis');
    expect(chipCss.title).toBeTruthy();

    const chipBox = (await chip.boundingBox())!;
    expect(chipBox.height).toBeLessThanOrEqual(30);

    /* لا تجاوز عند 320 في وضع الأسبوع أيضاً. */
    expect(await docOverflowX(page)).toBeLessThanOrEqual(0);

    /* العودة إلى الشهر تعيد الـ42 خلية. */
    await page.getByRole('button', { name: 'شهر' }).click();
    await expect(page.locator('.cal-grid .cal-cell')).toHaveCount(42);
  });

  test('التنقل الشهري متاح عند 320', async ({ page }) => {
    await page.goto('/student/calendar');
    await expect(page.locator('.cal-grid .cal-cell').first()).toBeVisible();

    const monthTitle = await page.locator('.cal-month').textContent();
    await page.getByRole('button', { name: 'الشهر التالي' }).click();
    await expect(page.locator('.cal-month')).not.toHaveText(monthTitle!);
  });
});

/* ── 3 · علامة اليوم في الوضعين ────────────────────────────────── */

for (const theme of ['light', 'dark'] as const) {
  test.describe(`علامة اليوم — ${theme}`, () => {
    test.use({ viewport: { width: 390, height: 780 }, themeSeed: theme });

    test('خلية اليوم: غسل لوني + حد + رقعة رقمية مربّعة مملوءة', async ({ page }) => {
      await page.goto('/student/calendar');

      const today = page.locator('.cal-cell[data-today="true"]');
      await expect(today).toHaveCount(1);

      const cellPaint = await today.evaluate((el) => {
        const cs = getComputedStyle(el);
        return { bg: cs.backgroundColor, bd: cs.borderColor, r: cs.borderRadius };
      });
      expect(cellPaint.bg).not.toBe('rgba(0, 0, 0, 0)');
      expect(cellPaint.bd).not.toBe('rgba(0, 0, 0, 0)');
      /* الشكل: رقع مربّعة (سلّم نصف القطر صفر). */
      expect(cellPaint.r).toBe('0px');

      const numPaint = await today.locator('.cal-day-num').evaluate((el) => {
        const cs = getComputedStyle(el);
        return { bg: cs.backgroundColor, fg: cs.color, r: cs.borderRadius };
      });
      expect(numPaint.bg).not.toBe('rgba(0, 0, 0, 0)');
      expect(numPaint.fg).not.toBe(numPaint.bg);
      expect(numPaint.r).toBe('0px');
    });
  });
}
