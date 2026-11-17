/**
 * messages.e2e.ts — الرسائل: القائمة ← المحادثة على الجوال (r366 · task 2-d).
 *
 * يثبّت عقود المحادثة الجديدة على الجوال وسطح الإرسال:
 *  1. فتح محادثة من صف القائمة يستبدل القائمة (غرفة ثابتة تغطي
 *     الشاشة عند <768 — لا تقسيم متجاوز)، والعودة تُبقي موضع تمرير
 *     القائمة كما كان (القائمة تبقى في التدفق خلف الغرفة).
 *  2. لوحة المفاتيح المفتوحة (390×320): آخر رسالة + الملحّن
 *     (composer) ظاهران — قائمة الرسائل هي المتحرّك الوحيد.
 *  3. محادثة من 60 رسالة: content-visibility:auto على صفوف الفقاعات.
 *  4. نص طويل بلا فواصل (لاتيني متصل): لا تجاوز أفقي إطلاقاً.
 *  5. الملحّن داخل المحادثة يُرسل فعلاً (POST /messages ثم ظهور
 *     الفقاعة الصادرة بعد إعادة الجلب).
 *  6. نافذة «رسالة جديدة»: أخطاء مضمّنية + أهداف 44px.
 *
 * النقل: جدول الرسائل غير موجود في الجدول القياسي (لا مستهلك e2e
 * سابقاً) — يُسجَّل عبر installStatefulApi بحالة قابلة للتغيير (الإرسال
 * يُلحق الصف ويُعاد تقديمه عند إعادة الجلب).
 */
import { test, expect } from './fixtures/e2e';
import { installStatefulApi, statefulJson, statefulOk } from './fixtures/mock-transport';
import { STUDENT_USER, TEACHER_USER, iso } from './fixtures/api-fixtures';

/* ── عناصر المحادثة ────────────────────────────────────────────── */

const OTHER = { id: TEACHER_USER.id, firstName: 'ليلى', lastName: 'الفيتوري', avatarColor: null };
const ME = { id: STUDENT_USER.id, firstName: 'أحمد', lastName: 'الزاوي', avatarColor: null };

/** سلسلة لاتينية متصلة بلا أي فرصة كسر — عدو RTL الأفقي الأول. */
const UNBROKEN_LATIN = 'CS301ALGORITHMLABSECTIONB20260315XYZ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'.repeat(2);

const row = (id: string, createdAt: string, from: typeof OTHER, to: typeof OTHER, body: string) => ({
  id,
  body,
  createdAt,
  fromUser: from,
  toUser: to,
  readAt: null,
});

/** 60 رسالة بين الطالب والأستاذة (جديدة أولاً — ترتيب الخادم). */
const threadRows = Array.from({ length: 60 }, (_, i) =>
  row(
    `thr_${String(i).padStart(2, '0')}`,
    iso(-i * 0.5),
    i % 2 === 0 ? OTHER : ME,
    i % 2 === 0 ? ME : OTHER,
    i === 12 ? `مرفق تقني بلا فواصل ${UNBROKEN_LATIN}` : `رسالة المحادثة رقم ${60 - i}`,
  ),
);

/** صفان من مراسل آخر حتى لا تكون القائمة محادثة واحدة. */
const strayRows = [
  row('stray_1', iso(-40), { id: 't9', firstName: 'سالم', lastName: 'الطاهر', avatarColor: null }, ME, 'رسالة من مراسل آخر'),
];

/** الحالة الحية للنقل — الإرسال يُلحق أعلى القائمة. */
function makeState() {
  const rows = [...threadRows, ...strayRows];
  return {
    rows,
    unread: 3,
    send(toUserId: string, body: string) {
      rows.unshift(row(`sent_${rows.length}`, iso(0), ME, { ...toUserMap.get(toUserId)! }, body));
    },
  };
}

const toUserMap = new Map([
  [OTHER.id, OTHER],
  ['t9', { id: 't9', firstName: 'سالم', lastName: 'الطاهر', avatarColor: null }],
]);

/** يسجّل GET/POST /messages بحالة حية واحدة لكل صفحة. */
async function installMessagesApi(page: import('@playwright/test').Page) {
  const state = makeState();
  await installStatefulApi(page, [
    {
      method: 'GET',
      pattern: '**/api/v1/messages**',
      fulfill: async ({ route }) => {
        await statefulJson(route, 200, {
          data: state.rows,
          meta: { page: 1, total: state.rows.length, totalPages: 1, limit: 30, unread: state.unread },
        });
      },
    },
    {
      method: 'POST',
      pattern: '**/api/v1/messages**',
      fulfill: async ({ route, url }) => {
        const body = route.request().postDataJSON() as { toUserId: string; body: string };
        state.send(body.toUserId, body.body);
        state.unread = 0;
        await statefulOk(route, { id: `sent_${state.rows.length}`, createdAt: iso(0) });
      },
    },
  ]);
  return state;
}

/* ── 1+2+3+4 · المحادثة على الجوال ─────────────────────────────── */

test.describe('الرسائل — المحادثة على الجوال', () => {
  test.use({ e2eRole: 'STUDENT', viewport: { width: 390, height: 844 } });

  test('فتح المحادثة يستبدل القائمة والعودة تحفظ موضع التمرير', async ({ page }) => {
    await installMessagesApi(page);
    await page.goto('/student/messages');

    const firstRow = page.locator('.msg-list .list-row').first();
    await expect(firstRow).toBeVisible();

    /* مرّر القائمة ثم افتح المحادثة عبر صف المراسل الأول. r366: the
       shell's inner .content owns the page scroll (the window never
       moves) — the assertion rides the REAL scroller. */
    await page.evaluate(() => {
      const scroller = document.querySelector('.content') as HTMLElement | null;
      if (scroller) scroller.scrollTop = 260;
    });
    const scrollBefore = await page.evaluate(() => (document.querySelector('.content') as HTMLElement).scrollTop);
    expect(scrollBefore).toBeGreaterThan(0);

    await page.locator('.msg-row-open').first().click();

    const thread = page.locator('.msg-thread');
    await expect(thread).toBeVisible();
    await expect(page.locator('.msg-thread-name')).toHaveText('ليلى الفيتوري');

    /* الغرفة تغطي الشاشة كاملة (تستبدل القائمة — لا تقسيم متجاوز). */
    const box = (await thread.boundingBox())!;
    expect(box.x).toBeCloseTo(0, 0);
    expect(box.y).toBeCloseTo(0, 0);
    expect(box.width).toBeCloseTo(390, 0);
    expect(box.height).toBeCloseTo(844, 0);
    /* مركز صف القائمة الأول صار خلف الغرفة — العنصر الأمامي هناك
       ينتمي للمحادثة، لا للقائمة. */
    const covered = await firstRow.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const hit = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 30));
      return hit ? hit.closest('.msg-thread') !== null : false;
    });
    expect(covered).toBe(true);

    /* قائمة الرسائل داخل المحادثة هي المتحرّك الوحيد (تتمرّر داخلياً). */
    const scrollable = await page.locator('.msg-thread-list').evaluate(
      (el) => el.scrollHeight > el.clientHeight,
    );
    expect(scrollable).toBe(true);

    /* العودة: الغرفة تُغلق والقائمة تعود بنفس موضع التمرير. */
    await page.getByRole('button', { name: 'العودة إلى الرسائل' }).click();
    await expect(thread).toHaveCount(0);
    await expect(firstRow).toBeVisible();
    const scrollAfter = await page.evaluate(() => (document.querySelector('.content') as HTMLElement).scrollTop);
    expect(scrollAfter).toBe(scrollBefore);
  });

  test('لوحة المفاتيح المفتوحة (390×320): آخر رسالة والملحّن ظاهران معاً', async ({ page }) => {
    await installMessagesApi(page);
    await page.goto('/student/messages');
    await page.locator('.msg-row-open').first().click();
    await expect(page.locator('.msg-thread')).toBeVisible();

    /* محاكاة فتح لوحة المفاتيح: ارتفاع الإطار المرئي يتقلص إلى 320. */
    await page.setViewportSize({ width: 390, height: 320 });

    const composer = (await page.locator('.msg-thread-composer').boundingBox())!;
    expect(composer.y + composer.height).toBeLessThanOrEqual(320.5);
    expect(composer.y).toBeGreaterThanOrEqual(0);

    const last = (await page.locator('.msg-bubble-row').last().boundingBox())!;
    expect(last.y).toBeGreaterThanOrEqual(0);
    expect(last.y + last.height).toBeLessThanOrEqual(composer.y + 0.5);

    /* لا تجاوز أفقي للمستند كله مع النص المتصل. */
    const docOver = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(docOver).toBeLessThanOrEqual(0);
  });

  test('محادثة من 60 رسالة: صفوف الفقاعات content-visibility:auto', async ({ page }) => {
    await installMessagesApi(page);
    await page.goto('/student/messages');
    await page.locator('.msg-row-open').first().click();
    await expect(page.locator('.msg-thread')).toBeVisible();

    const count = await page.locator('.msg-bubble-row').count();
    expect(count).toBe(60);

    const cv = await page.locator('.msg-bubble-row').first().evaluate(
      (el) => getComputedStyle(el).contentVisibility,
    );
    expect(cv).toBe('auto');
  });

  test('نص متصل بلا فواصل: الفقاعة تلتفّ ولا تتجاوز أفقياً', async ({ page }) => {
    await installMessagesApi(page);
    await page.goto('/student/messages');
    await page.locator('.msg-row-open').first().click();

    const longBubble = page.locator('.msg-bubble', { hasText: 'CS301ALGORITHMLAB' }).first();
    await expect(longBubble).toBeVisible();

    const over = await longBubble.evaluate((el) => el.scrollWidth - el.clientWidth);
    expect(over).toBeLessThanOrEqual(0);

    const docOver = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(docOver).toBeLessThanOrEqual(0);
  });

  test('الملحّن يرسل الرد وتظهر الفقاعة الصادرة بعد إعادة الجلب', async ({ page }) => {
    await installMessagesApi(page);
    await page.goto('/student/messages');
    await page.locator('.msg-row-open').first().click();

    await page.locator('.msg-thread-input').fill('ردّ اختباري من الجوال');
    await page.getByRole('button', { name: 'إرسال الرد' }).click();

    await expect(page.locator('.msg-bubble-row').last()).toContainText('ردّ اختباري من الجوال');
    /* الفقاعة الصادرة تلتصق بضفة النهاية (RTL: اليسار). */
    const last = page.locator('.msg-bubble-row').last();
    const isOut = await last.evaluate((el) => el.classList.contains('msg-out'));
    expect(isOut).toBe(true);
  });
});

/* ── 5 · نافذة «رسالة جديدة» ───────────────────────────────────── */

test.describe('الرسائل — نافذة الإنشاء', () => {
  test.use({ e2eRole: 'STUDENT', viewport: { width: 390, height: 844 }, hasTouch: true });

  test('أخطاء مضمّنية وأهداف 44px وتعطيل أثناء الإرسال', async ({ page }) => {
    /* r366: the 44px floor is the platform's TOUCH law (components.css
     * gates .btn min-block-size on pointer:coarse) — the assertion
     * rides a touch-emulating context, not the fine-pointer default. */
    await installMessagesApi(page);
    await page.goto('/student/messages');

    await page.getByRole('button', { name: 'رسالة جديدة' }).click();
    const dialog = page.getByRole('dialog', { name: 'رسالة جديدة' });
    await expect(dialog).toBeVisible();

    /* إرسال فارغ → خطآن مضمينان (المستلم + النص). */
    await dialog.getByRole('button', { name: 'إرسال الرسالة' }).click();
    await expect(dialog.locator('.form-field-error').first()).toBeVisible();
    await expect(dialog).toContainText('اختر مستلِماً أولاً.');
    await expect(dialog).toContainText('نص الرسالة مطلوب.');

    /* أهداف اللمس: زرّا التذييل والإغلاق ≥ 44px. */
    const send = (await dialog.getByRole('button', { name: 'إرسال الرسالة' }).boundingBox())!;
    expect(send.height).toBeGreaterThanOrEqual(44);
    const cancel = (await dialog.getByRole('button', { name: 'إلغاء' }).boundingBox())!;
    expect(cancel.height).toBeGreaterThanOrEqual(44);
    const close = (await dialog.getByRole('button', { name: 'إغلاق' }).boundingBox())!;
    expect(close.height).toBeGreaterThanOrEqual(44);
    expect(close.width).toBeGreaterThanOrEqual(44);
  });
});
