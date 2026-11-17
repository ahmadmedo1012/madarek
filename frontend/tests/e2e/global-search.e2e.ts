/**
 * global-search.e2e.ts — لوحة الأوامر والبحث الشامل ⌘K (r164-k).
 *
 * الوتر مملوك من AppShell (⌘K/Ctrl+K يفتح اللوحة على كل الأدوار).
 * الرحلة: فتح → كتابة → انتظار debounce (300ms) + GET /search/discover
 * → أقسام النتائج الحقيقية → اختيار نتيجة يغلق اللوحة ويستقر في
 * وجهة href نفسها.
 */
import { test, expect } from './fixtures/e2e';
import { OFFERING_ID, DISCOVER_RESULTS } from './fixtures/api-fixtures';
import { installStatefulApi, statefulOk } from './fixtures/mock-transport';

test.use({ e2eRole: 'STUDENT' });

test.describe('لوحة الأوامر والبحث الشامل', () => {
  test('Ctrl+K يفتح اللوحة، والبحث يعرض نتائج مقرّر، والاختيار يستقر في وجهته', async ({ page }) => {
    await page.goto('/student/dashboard');

    /* الفتح بالوتر */
    await page.keyboard.press('Control+K');
    const input = page.getByRole('combobox', { name: 'الأوامر والبحث' });
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();

    /* إجراءات سريعة تظهر قبل كتابة أي شيء (وجهات الدور) */
    await expect(page.getByText('إجراءات سريعة')).toBeVisible();

    /* كتابة استعلام عربي → debounce → نتائج /search/discover */
    await input.fill('خوارزم');
    const coursesSection = page.locator('.search-section', { hasText: 'مقررات' });
    await expect(coursesSection).toBeVisible();

    const hit = coursesSection.getByRole('option', { name: /مقدمة في الخوارزميات/ });
    await expect(hit).toBeVisible();
    await expect(hit).toContainText('CS-201');

    /* الاختيار: يغلق اللوحة ويستقر في تفاصيل المقرّر.
       r183-B6 (A4 P3-4) — the tab names the THING, not the pattern:
       useEntityPageTitle hands the course's name up, so the title is
       the entity name. (The old generic-pattern pin raced the
       entity-name write — CI's slower machines exposed it.) */
    await hit.click();
    await expect(page).toHaveURL(new RegExp(`/student/courses/${OFFERING_ID}$`));
    await expect(page).toHaveTitle('مقدمة في الخوارزميات · مدارك');
    // اللوحة أُغلقت بالتنقّل (goTo يستدعي onClose).
    await expect(page.getByRole('combobox', { name: 'الأوامر والبحث' })).toHaveCount(0);
  });
});

/* ═══ r366 (2-f): the palette as a product — the four missing ═══
 * contracts: the debounce gate + the role-filtered request, the
 * no-result suggestions, the recents rail, and the phone band's
 * full-screen sheet with its visible exit. */

test.describe('لوحة الأوامر — عقود r366', () => {
  test('بوابة الحدّ الأدنى وطلب الدور: حرف واحد لا يسأل، والمستقرّ يسأل مرة بفئات الطالب', async ({ page }) => {
    const discoverCalls: string[] = [];
    let discoverUrl = '';
    await installStatefulApi(page, [
      {
        method: 'GET',
        pattern: '**/api/v1/search/discover**',
        fulfill: async ({ route }) => {
          discoverUrl = route.request().url();
          discoverCalls.push(new URL(discoverUrl).searchParams.get('q') ?? '');
          await statefulOk(route, DISCOVER_RESULTS);
        },
      },
    ]);
    await page.goto('/student/dashboard');

    await page.keyboard.press('Control+K');
    const input = page.getByRole('combobox', { name: 'الأوامر والبحث' });
    await expect(input).toBeVisible();

    /* حرف واحد: تحت بوابة الحدّ الأدنى (≥2) — لا طلب إطلاقاً. */
    await input.fill('خ');
    await page.waitForTimeout(600);
    expect(discoverCalls).toHaveLength(0);

    /* المستقرّ: طلب واحد للكلمة النهائية فقط (المُلغى لا يسابق). */
    await input.fill('خوارزميات');
    await expect(page.locator('.search-section', { hasText: 'مقررات' })).toBeVisible();
    await page.waitForTimeout(500);
    expect(discoverCalls).toEqual(['خوارزميات']);

    /* فلتر الدور: طلب الطالب لا يشمل الطلاب/الأساتذة/بنك الأسئلة. */
    const cats = new URL(discoverUrl).searchParams.get('categories') ?? '';
    expect(cats).not.toContain('students');
    expect(cats).not.toContain('teachers');
    expect(cats).not.toContain('questions');
    expect(cats).toContain('courses');
  });

  test('لا نتائج: الرسالة الصادقة + حبّات الاقتراح تعيد الملء', async ({ page }) => {
    /* النقل القياسي يعيد نتائج لكل استعلام — هذا الاختبار يسأل عن
       الفراغ الصادق، فيسجّل مساره الخاص: فئات خالية. */
    await installStatefulApi(page, [
      {
        method: 'GET',
        pattern: '**/api/v1/search/discover**',
        fulfill: async ({ route }) => {
          await statefulOk(route, { query: '', categories: {}, tookMs: 1 });
        },
      },
    ]);
    await page.goto('/student/dashboard');
    await page.keyboard.press('Control+K');
    const input = page.getByRole('combobox', { name: 'الأوامر والبحث' });
    await expect(input).toBeVisible();

    await input.fill('zxqالكلمةالغيرموجودة');
    await expect(page.getByText('لم نعثر على أوامر تطابق «zxqالكلمةالغيرموجودة»')).toBeVisible();

    /* حبّة اقتراح تعيد ملء الاستعلام (لا صفحة خطأ، لا طريق مسدود). */
    const pill = page.getByRole('button', { name: 'برمجة' });
    await expect(pill).toBeVisible();
    await pill.click();
    await expect(input).toHaveValue('برمجة');
  });

  test('الأخيرة: إجراء مُنفَّذ يعود أعلى القائمة في الجولة التالية', async ({ page }) => {
    await page.goto('/student/dashboard');
    await page.keyboard.press('Control+K');
    const input = page.getByRole('combobox', { name: 'الأوامر والبحث' });
    await expect(input).toBeVisible();

    /* إجراء سريع عبر لوحة المفاتيح: أول خيار + Enter ينفّذ ويغلق. */
    await input.press('ArrowDown');
    await input.press('Enter');
    await expect(page.getByRole('combobox', { name: 'الأوامر والبحث' })).toHaveCount(0);

    /* الجولة التالية: قسم «الأخيرة» يتصدر قبل «إجراءات سريعة». */
    await page.keyboard.press('Control+K');
    await expect(input).toBeVisible();
    const recents = page.locator('.search-section', { hasText: 'الأخيرة' }).first();
    await expect(recents).toBeVisible();
    const actions = page.locator('.search-section', { hasText: 'إجراءات سريعة' }).first();
    await expect(actions).toBeVisible();
    expect((await recents.boundingBox())!.y).toBeLessThan((await actions.boundingBox())!.y);
    /* ولا صف يكرر نفسه بين القسمين. */
    const recentTitles = await recents.locator('.search-row-title').allTextContents();
    const actionTitles = await actions.locator('.search-row-title').allTextContents();
    for (const t of recentTitles) expect(actionTitles).not.toContain(t);
  });

  test.describe('ورقة الهاتف — ملء الشاشة', () => {
    test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

    test('الزر يفتح ورقة كاملة الحافة مع مخرج مرئي، والإغلاق يعمل', async ({ page }) => {
      await page.goto('/student/dashboard');

      await page.getByRole('button', { name: 'البحث والأوامر' }).click();
      const card = page.locator('.cmd-palette-card');
      await expect(card).toBeVisible();

      /* الورقة: ملء الشاشة تماماً — حافة إلى حافة، بلا قوس، بلا إطار.
         (الاستقرار أولاً: مدخل madarek-pop يطير من translateY(-4px) —
         القياس يهبط بعد نهاية الدخول لا أثناءه.) */
      await expect.poll(async () => Math.round((await card.boundingBox())!.y)).toBe(0);
      const box = (await card.boundingBox())!;
      expect(Math.round(box.x)).toBe(0);
      expect(Math.round(box.y)).toBe(0);
      expect(Math.round(box.width)).toBe(390);
      expect(Math.round(box.height)).toBe(844);
      expect(await card.evaluate((el) => getComputedStyle(el).borderRadius)).toBe('0px');

      /* المخرج المرئي حاضر وتلميحة Esc مخفيّة (لا لوحة مفاتيح). */
      const close = page.getByRole('button', { name: 'إغلاق البحث' });
      await expect(close).toBeVisible();
      expect((await close.boundingBox())!.height).toBeGreaterThanOrEqual(44);
      await expect(page.locator('.cmd-input-esc')).toBeHidden();

      /* البحث يعمل داخل الورقة: النتائج تظهر والقائمة تُمرَّر داخلياً. */
      const input = page.getByRole('combobox', { name: 'الأوامر والبحث' });
      await expect(input).toBeFocused();
      await input.fill('خوارزم');
      await expect(page.locator('.search-section', { hasText: 'مقررات' })).toBeVisible();

      /* نقرة الإغلاق تُخفي الورقة. */
      await close.click();
      await expect(page.locator('.cmd-palette-card')).toHaveCount(0);
    });
  });
});
