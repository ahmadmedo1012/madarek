/**
 * ai-assistant.e2e.ts — رحلة المساعد الذكيّ (r166d, WS-F7).
 *
 * أول رحلة متصفح لمساعد الذكاء الاصطناعي: الطالب يفتح /student/ai،
 * الصفحة تُحمّل الإعداد الصادق (نمط محليّ من /ai/config: العنوان
 * الفرعي «مساعد تحليليّ محليّ» + شارة AI العامة — لا ادّعاء نموذج)،
 * ثم يرسل سؤاله عبر النقل الوهمي STATEFUL: فقّة سؤاله تظهر فورًا
 * (optimistic)، والردّ يهبط بفقّته مع بطاقة المحرّك لكلّ ردّ
 * (r166d: وسم محوّد خافت باسم الملحّن المحليّ gap-aware-composer —
 * الصدق في الاتجاهين)، والمحادثة الجديدة تدخل قائمة «محادثاتك» عبر
 * إبطال React Query الحقيقي، والشكل على السلك حرفيّ { message } فقط.
 */
import { test, expect } from './fixtures/e2e';
import type { Page } from '@playwright/test';
import { FIXED_NOW_ISO } from './fixtures/api-fixtures';
import { installStatefulApi, statefulOk } from './fixtures/mock-transport';

test.use({ e2eRole: 'STUDENT' });

test.describe('المساعد الذكيّ — رحلة محادثة كاملة', () => {
  test('الصفحة تُحمّل بالنمط المحليّ الصادق، والسؤال يجلب ردًّا موسومًا بمحرّكه، والمحادثة تدخل القائمة', async ({ page }) => {
    /* الحالة الوهمية: لا فجوات معرفيّة (لا بطاقات)، لا محادثات سابقة
     * (قائمة فارغة صادقة)، النمط محليّ من /ai/config، وكلّ POST /ai/chat
     * يُنشئ محادثة تنعكس في قراءة القائمة التالية (الإبطال الحقيقي). */
    const QUESTION = 'ما المفاهيم التي أحتاج إلى مراجعتها؟';
    const REPLY = 'لاحظت من بياناتك أنك بحاجة لتعزيز فهمك — راجع محاضرة الأسبوع الماضي.';
    const conversations: Array<{ id: string; title: string | null; createdAt: string }> = [];
    const chatBodies: Array<{ conversationId?: string; message: string }> = [];

    await installStatefulApi(page, [
      {
        method: 'GET',
        pattern: '**/api/v1/ai/config',
        fulfill: async ({ route }) => {
          await statefulOk(route, { provider: 'local', model: null });
        },
      },
      {
        method: 'GET',
        pattern: '**/api/v1/me/gaps',
        fulfill: async ({ route }) => {
          await statefulOk(route, []);
        },
      },
      {
        method: 'GET',
        pattern: '**/api/v1/ai/conversations',
        fulfill: async ({ route }) => {
          await statefulOk(route, conversations);
        },
      },
      {
        method: 'POST',
        /* r323 B1.1: the page's real transport is now the SSE grammar —
         * POST /ai/chat?stream=1 (fetch + ReadableStream). The glob
         * must therefore also catch the query string (query strings
         * count in page.route globs) and answer BOTH grammars: the
         * stream call gets token frames + the done frame (the final
         * persisted turn with ids + engine + model), the legacy JSON
         * envelope stays for the fallback path. Same wire body either
         * way: first turn is literally { message } only. */
        pattern: '**/api/v1/ai/chat*',
        fulfill: async ({ route, url }) => {
          chatBodies.push(route.request().postDataJSON() as { conversationId?: string; message: string });
          const conversation = { id: 'conv_e2e_ai_1', title: QUESTION.slice(0, 60), createdAt: FIXED_NOW_ISO };
          conversations.push(conversation);
          if (url.searchParams.get('stream') === '1') {
            const done = {
              conversationId: conversation.id,
              messageId: 'msg_e2e_ai_1',
              reply: REPLY,
              engine: 'local',
              model: 'gap-aware-composer',
            };
            const sse = [
              `event: token\ndata: ${JSON.stringify({ t: REPLY })}\n\n`,
              `event: done\ndata: ${JSON.stringify(done)}\n\n`,
            ].join('');
            await route.fulfill({
              status: 200,
              headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
              body: sse,
            });
            return;
          }
          await statefulOk(route, {
            conversationId: conversation.id,
            reply: REPLY,
            engine: 'local',
            model: 'gap-aware-composer',
          });
        },
      },
    ]);

    await page.goto('/student/ai');
    await expect(page).toHaveTitle('المساعد الذكي · مدارك');
    // (G re-pin — R287 precedent: the header rides the patterns contract
    // now, so the h1 carries the family's pf-page-title class.)
    await expect(page.locator('h1.pf-page-title')).toHaveText('المساعد الذكيّ');

    /* السطح الصادق للنمط المحليّ: العنوان الفرعي + شارة AI العامة
     * (لا اسم نموذج يُدَّعى)، وتحية الملحّن المحليّ. */
    await expect(
      page.getByText('مساعد محليّ'),
    ).toBeVisible();
    await expect(page.locator('.badge', { hasText: 'AI' })).toBeVisible();
    await expect(page.getByText(/أحلّل بيانات إتقانك محليّاً/)).toBeVisible();
    /* لا بطاقات فجوات (قائمة فارغة صادقة) ولا محادثات سابقة —
     * (G: الحالة الفارغة على عقد EmptyState؛ النص نفسه عنوان + وصف). */
    await expect(page.getByText('لا محادثات سابقة بعد')).toBeVisible();
    // R355 copy diet: the empty-state explainer line was cut — the label pin above carries the contract.

    /* الإرسال — فقّة السؤال تظهر فورًا، ثم الردّ بفقّته. */
    await page.getByLabel('اكتب سؤالك للمساعد').fill(QUESTION);
    await page.getByRole('button', { name: 'إرسال' }).click();
    await expect(page.locator('.chat-msg.user', { hasText: QUESTION })).toBeVisible();
    const replyBubble = page.locator('.chat-msg.bot .chat-bubble', { hasText: REPLY });
    await expect(replyBubble).toBeVisible();

    /* r166d: وسم المحرّك لكلّ ردّ — نص محوّد خافت داخل الفقّة يسمّي
     * الملحّن المحليّ بصدق (لا يدّعي نموذجًا لغويًّا). */
    await expect(replyBubble.locator('.font-mono')).toHaveText('gap-aware-composer');

    /* المحادثة الجديدة دخلت قائمة «محادثاتك» عبر الإبطال وإعادة
     * الجلب الحقيقيين (لا إعادة تحميل صفحة). */
    const convRow = page.locator('.ai-conv-row', { hasText: QUESTION });
    await expect(convRow).toBeVisible();
    // R319 override (c3-S2 §B2): the current-conversation marker rides the
    // mono StatusChip (CURRENT) — the brand Badge «الحالية» was retired.
    await expect(convRow.locator('.r319s-chip', { hasText: 'CURRENT' })).toBeVisible();

    /* الشكل على السلك حرفيًّا: أول دورٍ بلا conversationId — { message }
     * فقط، عقد chatSchema الصارم. */
    expect(chatBodies).toEqual([{ message: QUESTION }]);
  });
});

/* ═══════════════════════════════════════════════════════════════════
   2-a (Agent 4 · AI assistant surface) — ضمانات السطح على كل شاشة
   ─────────────────────────────────────────────────────────────────────
   خمسة عقود هندسية/أدائية للسطح، كل واحدة قابلة للقياس في المتصفح:

   1. المرسِل لا يغطّي آخر رسالة عند 390×320 (شاشة لوحة مفاتيح
      مفتوحة): بعد الإرسال يُثبَّت السجلّ على القاع — آخر رسالة
      فوق المرسِل، والمرسِل داخل الإطار.
   2. لا فيض أفقيّ للصفحة عند 320: سطر الكود الطويل يُمرَّر داخل
      كتلته (pre بـ dir=ltr) لا الصفحة.
   3. سجلّ من 60 رسالة: صفوف بعيدة عن النافذة تحمل
      content-visibility:auto (رخصة التصيير)، والقفزة إلى الأحدث
      تهبط بدقّة على آخر رسالة.
   4. عمود محادثات طويل لا يُمرِّر جسد الصفحة على الحاسوب:
      القائمة تُمرَّر داخل حدّها، والسطّاح (.content) لا يتجاوز
      إطاره — والسجلّ هو مُمرِّر السطح الوحيد.
   5. التمرير لأعلى أثناء وصول الردود لا يُقفَز: يبقى الإزاح،
      ورقاقة «الأحدث» تعيد إلى القاع بنقرة.
   ═══════════════════════════════════════════════════════════════════ */

/** المُركِّب المشترك: إعداد محليّ + فجوات فارغة + محادثات + ردّ SSE.
 * `replies` يعطي كلّ طلب POST ردًّا مميّزًا (الافتراضي: ردٌّ واحد
 * ثابت لكلّ الطلبات) — رحلة «لا قفز أثناء التمرير» تحتاج ردّين
 * مختلفين كي تُميّز الفقاعة الثانية بلا التباس محدِّد. */
async function installAiSurface(
  page: Page,
  opts: {
    reply?: string;
    replies?: string[];
    conversations?: Array<{ id: string; title: string | null; createdAt: string }>;
  } = {},
): Promise<void> {
  const fallbackReply = opts.reply ?? 'جواب تجريبيّ موجز.';
  let askIndex = 0;
  await installStatefulApi(page, [
    {
      method: 'GET',
      pattern: '**/api/v1/ai/config',
      fulfill: async ({ route }) => {
        await statefulOk(route, { provider: 'local', model: null });
      },
    },
    {
      method: 'GET',
      pattern: '**/api/v1/me/gaps',
      fulfill: async ({ route }) => {
        await statefulOk(route, []);
      },
    },
    {
      method: 'GET',
      pattern: '**/api/v1/ai/conversations',
      fulfill: async ({ route }) => {
        await statefulOk(route, opts.conversations ?? []);
      },
    },
    {
      method: 'POST',
      pattern: '**/api/v1/ai/chat*',
      fulfill: async ({ route, url }) => {
        const reply = opts.replies?.[askIndex] ?? fallbackReply;
        askIndex += 1;
        if (url.searchParams.get('stream') === '1') {
          const done = {
            conversationId: 'conv_2a',
            messageId: 'msg_2a',
            reply,
            engine: 'local',
            model: 'gap-aware-composer',
          };
          const sse = [
            `event: token\ndata: ${JSON.stringify({ t: reply })}\n\n`,
            `event: done\ndata: ${JSON.stringify(done)}\n\n`,
          ].join('');
          await route.fulfill({
            status: 200,
            headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
            body: sse,
          });
          return;
        }
        await statefulOk(route, { conversationId: 'conv_2a', reply, engine: 'local', model: 'gap-aware-composer' });
      },
    },
  ]);
}

/** إزاحة السجلّ عن القاع بالبكسل (0 = عند القاع تمامًا). */
async function distanceFromBottom(page: Page): Promise<number> {
  return page.evaluate(() => {
    const el = document.querySelector('.chat-area') as HTMLElement | null;
    return el ? Math.round(el.scrollHeight - el.clientHeight - el.scrollTop) : -1;
  });
}

test.describe('المساعد الذكيّ — ضمانات السطح (2-a)', () => {
  test('390×320 (لوحة مفاتيح مفتوحة): الإرسال يُثبِّت السجلّ — آخر رسالة فوق المرسِل والمرسِل داخل الإطار', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 320 });
    await installAiSurface(page, {
      reply: 'جواب من عدّة أسطر كي يُقاس التثبيت على القاع بدقّة: أول سطر يشرح الفكرة، وثاني سطر يعطي مثالًا، وثالث سطر يختم بالتوصية.',
    });
    await page.goto('/student/ai');
    await page.getByLabel('اكتب سؤالك للمساعد').fill('سؤال');
    await page.getByRole('button', { name: 'إرسال' }).click();

    /* التثبيت على القاع: الإزاحة عن القاع ≤ 2px بعد استقرار التمرير
     * (التحليق السلس يُستهلك خلال مهلة الاستطلاع). */
    await expect
      .poll(() => distanceFromBottom(page), { timeout: 5_000 })
      .toBeLessThanOrEqual(2);

    const geom = await page.evaluate(() => {
      const composer = document.querySelector('.ai-composer')!.getBoundingClientRect();
      const chat = document.querySelector('.chat-area')!.getBoundingClientRect();
      const msgs = document.querySelectorAll('.chat-area .chat-msg');
      const last = msgs[msgs.length - 1]!.getBoundingClientRect();
      return {
        composerTop: composer.top,
        composerBottom: composer.bottom,
        lastBottom: last.bottom,
        chatH: chat.height,
        vh: window.innerHeight,
      };
    });
    // المرسِل داخل الإطار بالكامل.
    expect(geom.composerTop).toBeGreaterThanOrEqual(-0.5);
    expect(geom.composerBottom).toBeLessThanOrEqual(geom.vh + 0.5);
    // آخر رسالة لا تنزل تحت حافة المرسِل (لا تغطية أبدًا).
    expect(geom.lastBottom).toBeLessThanOrEqual(geom.composerTop + 1);
    // نافذة السجلّ نفسها تبقى صالحة للقراءة عند هذا الارتفاع — أرضية
    // ≈96px (أربعة أسطر تقريبًا) لا شريطًا مقطوعًا: آخر رسالة «تُقرأ»
    // لا أن تكتفي بالظهور فوق حافة المرسِل.
    expect(geom.chatH).toBeGreaterThanOrEqual(96);
  });

  test('عرض 320: لا فيض أفقيّ للصفحة — سطر الكود الطويل يُمرَّر داخل كتلته LTR', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 800 });
    const longLine = 'const veryLongVariableName = computeSomethingExtremelyLong(argumentOne, argumentTwo, argumentThree, { nested: { deep: { deepest: "a very long string value that never wraps" } } });';
    await installAiSurface(page, {
      reply: `شرح مع كود وطويل:\n\`\`\`ts\n${longLine}\n\`\`\`\n- بند أوّل\n- بند ثانٍ\nاستدعِ \`fetch_user_with_a_very_long_identifier_name()\` ثم تحقّق.`,
    });
    await page.goto('/student/ai');
    await page.getByLabel('اكتب سؤالك للمساعد').fill('سؤال برمجيّ');
    await page.getByRole('button', { name: 'إرسال' }).click();
    await expect(page.locator('.chat-msg.bot .chat-bubble', { hasText: 'شرح مع كود' })).toBeVisible();

    const m = await page.evaluate(() => {
      const doc = document.scrollingElement as HTMLElement;
      const pre = document.querySelector('pre.r305ai-code') as HTMLElement | null;
      const chip = document.querySelector('.r305ai-code-inline') as HTMLElement | null;
      return {
        docScrollW: doc.scrollWidth,
        vw: window.innerWidth,
        pre: pre
          ? { dir: pre.getAttribute('dir'), scrollW: pre.scrollWidth, clientW: pre.clientWidth, right: pre.getBoundingClientRect().right }
          : null,
        chipDir: chip ? chip.getAttribute('dir') : null,
      };
    });
    // الصفحة لا تفيض أفقيًّا أبدًا.
    expect(m.docScrollW).toBeLessThanOrEqual(m.vw);
    // الكتلة: LTR، تُمرَّر داخل نفسها، ولا تتجاوز الإطار.
    expect(m.pre).not.toBeNull();
    expect(m.pre!.dir).toBe('ltr');
    expect(m.pre!.scrollW).toBeGreaterThan(m.pre!.clientW);
    expect(m.pre!.right).toBeLessThanOrEqual(m.vw + 0.5);
    // الشريحة السطرية أيضًا LTR.
    expect(m.chipDir).toBe('ltr');
  });

  test('سجلّ من 60 رسالة: content-visibility للصفوف البعيدة وقفزة «الأحدث» تهبط على آخر رسالة بدقّة', async ({ page }) => {
    const ROWS = Array.from({ length: 60 }, (_, i) => ({
      id: `m${i}`,
      role: (i % 2 === 0 ? 'USER' : 'ASSISTANT') as 'USER' | 'ASSISTANT',
      content:
        i % 2 === 0
          ? `سؤال رقم ${i + 1} عن مفاهيم المقرّر؟`
          : `جواب رقم ${i + 1}: شرح موجز لمفهوم مع إطار نصيّ معقول كي تحمل الصفوف ارتفاعات حقيقية عند القياس.`,
      createdAt: FIXED_NOW_ISO,
    }));
    await installAiSurface(page, {
      conversations: [{ id: 'c60', title: 'محادثة طويلة', createdAt: FIXED_NOW_ISO }],
    });
    /* The transcript fetch rides the REAL envelope contract
     * ({ data } via statefulOk — unwrap() reads res.data.data); a raw
     * array body would fail the unwrap and render the error row. */
    await page.route('**/api/v1/ai/conversations/c60/messages', async (route) => {
      await statefulOk(route, ROWS);
    });
    await page.goto('/student/ai');
    await page.getByRole('button', { name: 'فتح محادثة: محادثة طويلة' }).click();
    await expect(page.locator('.chat-area .chat-msg')).toHaveCount(60);
    /* The 60-row pin lands while the smooth settle (and the lazy
     * rows' real heights) is still in flight — wait for the bottom
     * BEFORE measuring the last row's geometry. */
    await expect
      .poll(() => distanceFromBottom(page), { timeout: 5_000 })
      .toBeLessThanOrEqual(2);

    const m = await page.evaluate(() => {
      const chat = document.querySelector('.chat-area') as HTMLElement;
      const rows = Array.from(chat.querySelectorAll('.chat-msg')) as HTMLElement[];
      const cv = rows.map((r) => getComputedStyle(r).contentVisibility);
      const last = rows[rows.length - 1]!.getBoundingClientRect();
      const chatRect = chat.getBoundingClientRect();
      return {
        scrolls: chat.scrollHeight > chat.clientHeight,
        cvAuto: cv.filter((v) => v === 'auto').length,
        cvAll: cv.every((v) => v === 'auto'),
        intrinsic: getComputedStyle(rows[10]!).containIntrinsicSize,
        lastBottom: last.bottom,
        chatBottom: chatRect.bottom,
      };
    });
    // السجلّ يُمرَّر، وكلّ صف يحمل رخصة التصيير (content-visibility:auto
    // + contain-intrinsic-size) — والصف الأخير، في النافذة الحيّة بعد
    // التثبيت، يقع كاملًا داخل إطار السجلّ (الدقّة التي تجعل القفزة
    // إلى الأحدث هبوطًا على الرسالة نفسها لا على تقديرها).
    expect(m.scrolls).toBe(true);
    expect(m.cvAll).toBe(true);
    expect(m.cvAuto).toBeGreaterThanOrEqual(30);
    expect(m.intrinsic).not.toBe('none');
    expect(m.lastBottom).toBeLessThanOrEqual(m.chatBottom + 2);

    // المستخدم فوق: الإزاحة صفر ورقاقة «الأحدث» تظهر.
    /* A real reader scrolls UP GRADUALLY — wheel ticks, not an instant
     * programmatic teleport. The instant jump is not just unrealistic:
     * it trips a native Chromium content-visibility compensation (the
     * top rows realize their real heights in the same layout pass; the
     * browser restores the offset to keep the anchor stable) that fires
     * NO scroll event and uses NO JS setter — the pin machinery can
     * neither see nor own it (measured: st=0 reverted to the bottom
     * within one rAF, zero SCROLL events, zero JS writes). Gradual
     * scrolls realize rows progressively and dispatch events normally,
     * which is the contract this spec protects: a reading user is
     * never yanked to the bottom while replies arrive. */
    await page.evaluate(async () => {
      const el = document.querySelector('.chat-area') as HTMLElement;
      const step = 36; // px per wheel-tick-equivalent
      while (el.scrollTop > 0) {
        el.scrollTop = Math.max(0, el.scrollTop - step);
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
    });

    const chip = page.locator('.ai-jump');
    await expect(chip).toBeVisible();

    // نقرة واحدة تُنزل بدقّة على آخر رسالة.
    await chip.click();
    await expect
      .poll(() => distanceFromBottom(page), { timeout: 5_000 })
      .toBeLessThanOrEqual(2);
    const lastBottom = await page.evaluate(() => {
      const rows = document.querySelectorAll('.chat-area .chat-msg');
      const chat = document.querySelector('.chat-area') as HTMLElement;
      return { last: rows[rows.length - 1]!.getBoundingClientRect().bottom, chat: chat.getBoundingClientRect().bottom };
    });
    expect(lastBottom.last).toBeLessThanOrEqual(lastBottom.chat + 2);
  });

  test('عمود محادثات طويل على الحاسوب: القائمة تُمرَّر داخل حدّها والصفحة لا تُمرَّر — والسجلّ مُمرِّر السطح الوحيد', async ({ page }) => {
    const convs = Array.from({ length: 14 }, (_, i) => ({
      id: `c${i}`,
      title: `محادثة رقم ${i + 1} بعنوان طويل نسبيًّا`,
      createdAt: FIXED_NOW_ISO,
    }));
    await installAiSurface(page, { conversations: convs });
    await page.goto('/student/ai');
    await expect(page.locator('.ai-conv-row').first()).toBeVisible();

    const m = await page.evaluate(() => {
      const content = document.querySelector('.content') as HTMLElement | null;
      const surface = document.querySelector('.ai-surface') as HTMLElement;
      const yScrollers: string[] = [];
      surface.querySelectorAll('*').forEach((el) => {
        /* Form controls (the composer's textarea carries the UA's
         * overflow-y:auto) are INPUT affordances, never layout
         * scrollers — the contract names competing SCROLL SURFACES. */
        if ((el as HTMLElement).matches('textarea, input, select, button')) return;
        const cs = getComputedStyle(el);
        if (cs.overflowY === 'auto' || cs.overflowY === 'scroll') yScrollers.push((el as HTMLElement).className);
      });
      const list = document.querySelector('.ai-conv-list') as HTMLElement | null;
      return {
        content: content ? { scrollH: content.scrollHeight, clientH: content.clientHeight } : null,
        yScrollers,
        list: list ? { scrollH: list.scrollHeight, clientH: list.clientHeight, overflowY: getComputedStyle(list).overflowY } : null,
      };
    });
    // جسد الصفحة (سطّاح التطبيق) لا يتجاوز إطاره على الحاسوب.
    expect(m.content).not.toBeNull();
    expect(m.content!.scrollH).toBeLessThanOrEqual(m.content!.clientH + 1);
    // القائمة الطويلة تملك مُمرِّرها الخاص داخل حدّها.
    expect(m.list).not.toBeNull();
    expect(m.list!.scrollH).toBeGreaterThan(m.list!.clientH);
    expect(m.list!.overflowY).toBe('auto');
    // داخل سطح المحادثة: السجلّ هو المُمرِّر الرأسيّ الوحيد.
    expect(m.yScrollers).toEqual(['chat-area']);
  });

  test('التمرير لأعلى أثناء وصول الردود لا يُقفَز — ورقاقة «الأحدث» تعيد إلى القاع', async ({ page }) => {
    await installAiSurface(page, {
      replies: ['جواب أوّل موجز.', 'جواب ثانٍ أطول قليلًا كي يُقاس الثبات بعد وصوله.'],
    });
    await page.goto('/student/ai');
    await page.getByLabel('اكتب سؤالك للمساعد').fill('السؤال الأول');
    await page.getByRole('button', { name: 'إرسال' }).click();
    await expect(page.locator('.chat-msg.bot .chat-bubble', { hasText: 'جواب أوّل' })).toBeVisible();
    await expect
      .poll(() => distanceFromBottom(page), { timeout: 5_000 })
      .toBeLessThanOrEqual(2);

    // المستخدم صعد ليقرأ — الإزاحة صفر، ثم ردّ ثانٍ يصل.
    /* A real reader scrolls UP GRADUALLY — wheel ticks, not an instant
     * programmatic teleport. The instant jump is not just unrealistic:
     * it trips a native Chromium content-visibility compensation (the
     * top rows realize their real heights in the same layout pass; the
     * browser restores the offset to keep the anchor stable) that fires
     * NO scroll event and uses NO JS setter — the pin machinery can
     * neither see nor own it (measured: st=0 reverted to the bottom
     * within one rAF, zero SCROLL events, zero JS writes). Gradual
     * scrolls realize rows progressively and dispatch events normally,
     * which is the contract this spec protects: a reading user is
     * never yanked to the bottom while replies arrive. */
    await page.evaluate(async () => {
      const el = document.querySelector('.chat-area') as HTMLElement;
      const step = 36; // px per wheel-tick-equivalent
      while (el.scrollTop > 0) {
        el.scrollTop = Math.max(0, el.scrollTop - step);
        await new Promise((r) => requestAnimationFrame(() => r(null)));
      }
    });
    await page.getByLabel('اكتب سؤالك للمساعد').fill('السؤال الثاني');
    await page.getByRole('button', { name: 'إرسال' }).click();
    // الردّ الثاني وصل (فقاعته في السجلّ) والمستخدم ما زال عند القمة.
    await expect(page.locator('.chat-msg.bot .chat-bubble', { hasText: 'جواب ثانٍ' })).toBeVisible();

    // لم يُقفَز: بقيت الإزاحة قرب القمة والرقاقة ظاهرة.
    const dist = await distanceFromBottom(page);
    expect(dist).toBeGreaterThan(80);
    await expect(page.locator('.ai-jump')).toBeVisible();

    // نقرة واحدة تعيد إلى الأحدث.
    await page.locator('.ai-jump').click();
    await expect
      .poll(() => distanceFromBottom(page), { timeout: 5_000 })
      .toBeLessThanOrEqual(2);
  });
});
