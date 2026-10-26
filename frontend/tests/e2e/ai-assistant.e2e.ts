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
        pattern: '**/api/v1/ai/chat',
        fulfill: async ({ route }) => {
          chatBodies.push(route.request().postDataJSON() as { conversationId?: string; message: string });
          const conversation = { id: 'conv_e2e_ai_1', title: QUESTION.slice(0, 60), createdAt: FIXED_NOW_ISO };
          conversations.push(conversation);
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
      page.getByText('يحلّل بيانات إتقانك محليّاً ويقترح خطوة مذاكرة تالية — مساعد تحليليّ محليّ، لا نموذج لغويّ خارجيّ.'),
    ).toBeVisible();
    await expect(page.locator('.badge', { hasText: 'AI' })).toBeVisible();
    await expect(page.getByText(/أحلّل بيانات إتقانك محليّاً/)).toBeVisible();
    /* لا بطاقات فجوات (قائمة فارغة صادقة) ولا محادثات سابقة —
     * (G: الحالة الفارغة على عقد EmptyState؛ النص نفسه عنوان + وصف). */
    await expect(page.getByText('لا توجد محادثات سابقة بعد')).toBeVisible();
    await expect(page.getByText('ابدأ بأول سؤال وستظهر محادثاتك هنا.')).toBeVisible();

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
