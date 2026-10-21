/**
 * r305-shell-heron.e2e.ts — قبول قشرة «المِنْجَر» (R305-A4) في المتصفح الحيّ.
 *
 * المراجعة التكاملية المستقلّة: مصفوفة (دور × عرض × سمة) على النقل
 * الوهمي (بلا خلفية ولا قاعدة بيانات)، وتُثبّت:
 *
 *  1. لا فيض أفقي على مستوى المستند (documentElement.scrollWidth ≤
 *     innerWidth) — سُلَّم التمرير المتعمَّد ≤640 داخل .table-wrap
 *     وحده مسموح، وهو لا يرفع عرض المستند أصلًا.
 *  2. حالتا القشرة: ≥921 شريط جانبي دائم + ترويسة؛ ≤920 برغر + شريط
 *     سفلي + درجٌ بستارة يفتح ويُغلق (نقرة الستارة وEscape مع إعادة
 *     التركيز إلى البرغر).
 *  3. سكة الحاسوب المطموسة/الموسّعة: html[data-sidebar-collapsed]،
 *     عرض 64⇄256، aria-label في المطموس، Ctrl+B، الثبات عبر إعادة
 *     التحميل (zustand persist mdrk-ui).
 *  4. صدق المسار النشط: ‏.nav-item.on واحدة بالضبط بعنوانها في الشريط
 *     والترويسة وdocument.title (nav.ts مصدرًا واحدًا) + استعادة
 *     التمرير عند الرجوع (مراقب POP المحدود ~1s).
 *  5. لغة الطبقات العلوية: قائمة المستخدم (Escape يعيد التركيز)، لوحة
 *     الأوامر ⌘K (فتح/كتابة تُصفّي/Escape)، وCtrl+B بلا أثر واللوحة
 *     مفتوحة (تعطيل الأوتار عبر overlayStack).
 *  6. ثبات السمة عبر مبدّل الشريط الجانبي + البقاء بعد إعادة التحميل.
 *  7. المرور بلوحة المفاتيح فقط: رابط التخطي أول وقفة، Enter يقفز إلى
 *     #main، عناصر التنقل قابلة للوصول، حلقة :focus-visible ظاهرة.
 *  8. الحركة المخفّضة: الدرج يُفتح ويُغلق فورًا (حزام 0.01ms) وصفر
 *     أنيميشن جارٍ على القشرة.
 *
 * لقطات الإثبات (16 إطارًا) تُكتب في audits/evidence/r305-shell/ مع
 * README.md عربيًا يشرح ما يثبته كل إطار.
 *
 * فجوة موثّقة بصدق: دور OWNER مقصود خارج التركيبة (عرف المستودع —
 * جولات OWNER مسحُ تدقيق فقط، والتركيبة e2eRole لا تُقدّمه).
 */
import { test, expect } from './fixtures/e2e';
import { type Page } from '@playwright/test';
import fs from 'node:fs';
import path from 'node:path';

/* ─── مجلد الإثبات ─────────────────────────────────────────────── */
const EVIDENCE_DIR = path.resolve(process.cwd(), '..', 'audits', 'evidence', 'r305-shell');

async function snap(page: Page, name: string): Promise<void> {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  await page.screenshot({ path: path.join(EVIDENCE_DIR, name) });
}

/* ─── فحص الفيض الأفقي (بوابة المستند) ──────────────────────────── */
async function assertNoHorizontalOverflow(page: Page, label: string): Promise<void> {
  const result = await page.evaluate(() => {
    const doc = document.documentElement;
    const vw = window.innerWidth;
    const offenders: string[] = [];
    for (const el of Array.from(document.querySelectorAll('body *'))) {
      const r = el.getBoundingClientRect();
      if (r.right <= vw + 1 && r.left >= -1) continue;
      if (el.closest('.table-wrap')) continue; // سُلَّم التمرير المتعمَّد داخل الجداول مسموح
      const cs = getComputedStyle(el);
      // كروم ثابت التثبيت (الدرج المغلق بـtransform، الستارة، الحبة
      // العائمة) مثبّت على إطار العرض بلا مساهمة في فيض المستند.
      if (cs.position === 'fixed' || cs.position === 'sticky') continue;
      if (el.closest('nav.sidebar') && cs.transform !== 'none') continue;
      offenders.push(
        `${el.tagName.toLowerCase()}.${String(el.className).split(' ').slice(0, 2).join('.')}` +
          ` L=${Math.round(r.left)} R=${Math.round(r.right)}`,
      );
    }
    return { scrollWidth: doc.scrollWidth, innerWidth: vw, offenders: offenders.slice(0, 8) };
  });
  const detail = result.offenders.length ? ` — offenders: ${result.offenders.join(' | ')}` : '';
  expect(
    result.scrollWidth,
    `${label}: documentElement.scrollWidth (${result.scrollWidth}) ≤ innerWidth (${result.innerWidth})${detail}`,
  ).toBeLessThanOrEqual(result.innerWidth);
}

/* ─── مساعدات القشرة ───────────────────────────────────────────── */
const SIDEBAR_W_EXPANDED = 256;
const SIDEBAR_W_COLLAPSED = 64;

async function sidebarWidth(page: Page): Promise<number> {
  const box = await page.locator('nav.sidebar').boundingBox();
  return Math.round(box?.width ?? -1);
}

async function isCollapsed(page: Page): Promise<boolean> {
  return page.evaluate(() => document.documentElement.hasAttribute('data-sidebar-collapsed'));
}

const BURGER = '.topbar-mobile-toggle';
const USER_TRIGGER = '.topbar-user-trigger';

/* ═══════════════════════════════════════════════════════════════
   المصفوفة — الطالب على كل العروض × النمطين (لا فيض + صدق الحالتين)
   ═══════════════════════════════════════════════════════════════ */
const STUDENT_WIDTHS = [320, 360, 390, 768, 1440] as const;
const STAFF_MATRIX = [
  { role: 'TEACHER', home: '/teacher/dashboard' },
  { role: 'ADMIN', home: '/admin/dashboard' },
  { role: 'QUALITY', home: '/quality/dashboard' },
] as const;
const STAFF_VIEWPORTS = [390, 1440] as const;
const THEMES = ['light', 'dark'] as const;

for (const width of STUDENT_WIDTHS) {
  for (const theme of THEMES) {
    const band = width <= 920 ? 'درج' : 'شريط دائم';
    test.describe(`STUDENT ${width}px ${theme} (${band})`, () => {
      test.use({
        e2eRole: 'STUDENT',
        themeSeed: theme,
        viewport: { width, height: 844 },
      });

      test(`لا فيض أفقي + حالة القشرة الصادقة (${band})`, async ({ page }) => {
        await page.goto('/student/dashboard');
        await expect(page.locator('h1.pf-page-title')).toBeVisible();
        await assertNoHorizontalOverflow(page, `STUDENT ${width}/${theme}`);

        const sidebar = page.locator('nav.sidebar');
        if (width >= 921) {
          // القشرة المكتتبية: شريط دائم + ترويسة؛ بلا برغر ولا شريط سفلي.
          await expect(sidebar).toBeVisible();
          await expect(page.locator('header.topbar')).toBeVisible();
          await expect(page.locator(BURGER)).toBeHidden();
          await expect(page.getByRole('navigation', { name: 'التنقّل السريع' })).toBeHidden();
        } else {
          // شريط الجوال: برغر + شريط سفلي ظاهران، الدرج مُغلق حاضرًا.
          await expect(page.locator(BURGER)).toBeVisible();
          const quickNav = page.getByRole('navigation', { name: 'التنقّل السريع' });
          await expect(quickNav).toBeVisible();
          await expect(sidebar).toBeHidden();

          // فتح الدرج: برغر → درج + ستارة (لقطتا الإثبات في النمط الداكن).
          await page.locator(BURGER).click();
          await expect(sidebar).toBeVisible();
          await expect(page.locator('.sidebar-backdrop.show')).toBeAttached();
          if (theme === 'dark') {
            if (width === 390) {
              await page.waitForTimeout(450); // slide 380ms — الإطار الحاسم مستقر
              await snap(page, `student-390-dark-drawer-open.png`);
              // الإطار الثاني (الشريط السفلي) يُلتقط قبل فتح الدرج أدناه.
            }
          }

          // إغلاق بنقرة الستارة (RTL: الدرج يرسو يمينًا — انقر أقصى اليسار).
          await page.locator('.sidebar-backdrop.show').click({ position: { x: 24, y: 400 } });
          await expect(sidebar).toBeHidden();

          // إغلاق بـEscape مع إعادة التركيز إلى البرغر.
          await page.locator(BURGER).click();
          await expect(sidebar).toBeVisible();
          await page.keyboard.press('Escape');
          await expect(sidebar).toBeHidden();
          await expect(page.locator(BURGER)).toBeFocused();
        }

        // إطار «الشريط السفلي» الداكن 390 — قبل أي فتح للدرج (بعد الفحوص).
        if (width === 390 && theme === 'dark') {
          await snap(page, `student-390-dark-bottom-nav.png`);
        }
      });
    });
  }
}

/* ═══════════════════════════════════════════════════════════════
   المصفوفة — الأدوار العاملة {390, 1440} × {فاتح، داكن}
   ═══════════════════════════════════════════════════════════════ */
for (const { role, home } of STAFF_MATRIX) {
  for (const width of STAFF_VIEWPORTS) {
    for (const theme of THEMES) {
      test.describe(`${role} ${width}px ${theme}`, () => {
        test.use({
          e2eRole: role,
          themeSeed: theme,
          viewport: { width, height: 844 },
        });

        test(`لا فيض أفقي + حالة القشرة الصادقة`, async ({ page }) => {
          await page.goto(home);
          await expect(page.locator('header.topbar')).toBeVisible();
          await assertNoHorizontalOverflow(page, `${role} ${width}/${theme}`);

          const sidebar = page.locator('nav.sidebar');
          if (width >= 921) {
            await expect(sidebar).toBeVisible();
            await expect(page.locator(BURGER)).toBeHidden();

            // لقطات 1440 لكل دور: الموسّع (فاتح) والمطموس (داكن).
            if (theme === 'light') {
              await page.locator('.sidebar-collapse-btn').click(); // الافتراضي مطموس → وسّع
              await expect(sidebar).toBeVisible();
              await page.waitForTimeout(300); // انتقال المسار الهيكلي
              await snap(page, `${role.toLowerCase()}-1440-light-expanded.png`);
            } else {
              // الافتراضي المُ persisted مطموس — الإطار الداكن يثبته كما هو.
              expect(await isCollapsed(page)).toBe(true);
              await snap(page, `${role.toLowerCase()}-1440-dark-collapsed.png`);
            }
          } else {
            await expect(page.locator(BURGER)).toBeVisible();
            await expect(page.getByRole('navigation', { name: 'التنقّل السريع' })).toBeVisible();
            await expect(sidebar).toBeHidden();

            // لقطات 390 الداكنة: الشريط السفلي ثم الدرج المفتوح.
            if (theme === 'dark') {
              await snap(page, `${role.toLowerCase()}-390-dark-bottom-nav.png`);
              await page.locator(BURGER).click();
              await expect(sidebar).toBeVisible();
              await expect(page.locator('.sidebar-backdrop.show')).toBeAttached();
              await page.waitForTimeout(450);
              await snap(page, `${role.toLowerCase()}-390-dark-drawer-open.png`);
              await page.keyboard.press('Escape');
              await expect(sidebar).toBeHidden();
              await expect(page.locator(BURGER)).toBeFocused();
            }
          }
        });
      });
    }
  }
}

/* ═══════════════════════════════════════════════════════════════
   سكة الحاسوب الموسّعة/المطموسة — الطالب 1440
   ═══════════════════════════════════════════════════════════════ */
test.describe('السكّة المطموسة (الحاسوب ≥921)', () => {
  test.use({ e2eRole: 'STUDENT', themeSeed: 'light', viewport: { width: 1440, height: 844 } });

  test('الزر يبدّل data-sidebar-collapsed وعرض 256⇄64 وaria-label وCtrl+B والثبات', async ({ page }) => {
    await page.goto('/student/dashboard');
    await expect(page.locator('h1.pf-page-title')).toBeVisible();

    // الافتراض المُ persisted: مطموس (64px) من أول إطار (useLayoutEffect).
    expect(await isCollapsed(page)).toBe(true);
    expect(await sidebarWidth(page)).toBe(SIDEBAR_W_COLLAPSED);

    // في المطموس: كل رابط يحمل aria-label (اسم محفوظ والعنوان المرئي مخفي).
    const firstItem = page.locator('.nav-item').first();
    const collapsedAria = await firstItem.getAttribute('aria-label');
    expect(collapsedAria, 'المطموس: aria-label على الروابط').toBeTruthy();

    // الزر يوسّع: تزول السمة ويعود العرض 256 وتُرفع aria-label.
    // (انتقال المسار الهيكلي المُصرّح به يحرّك المسار — انتظر استقراره.)
    await page.locator('.sidebar-collapse-btn').click();
    expect(await isCollapsed(page)).toBe(false);
    await expect
      .poll(sidebarWidth.bind(null, page), { timeout: 3000, message: 'السكّة تستقر موسّعة (256px)' })
      .toBe(SIDEBAR_W_EXPANDED);
    await expect(firstItem).not.toHaveAttribute('aria-label');

    // الثبات: التوسعة تبقى بعد إعادة التحميل (mdrk-ui persist).
    await page.reload();
    await expect(page.locator('h1.pf-page-title')).toBeVisible();
    expect(await isCollapsed(page)).toBe(false);
    expect(await sidebarWidth(page)).toBe(SIDEBAR_W_EXPANDED);

    // Ctrl+B يُرجع الطيّ — ثم يبقى مطموسًا بعد إعادة التحميل أيضًا.
    await page.keyboard.press('Control+b');
    expect(await isCollapsed(page)).toBe(true);
    await expect
      .poll(sidebarWidth.bind(null, page), { timeout: 3000, message: 'السكّة تستقر مطموسة (64px)' })
      .toBe(SIDEBAR_W_COLLAPSED);
    await page.reload();
    await expect(page.locator('h1.pf-page-title')).toBeVisible();
    expect(await isCollapsed(page)).toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════
   صدق المسار النشط + استعادة التمرير عند الرجوع — الطالب 1440
   ═══════════════════════════════════════════════════════════════ */
test.describe('المسار النشط واستعادة التمرير', () => {
  /* شاشة قصيرة الارتفاع عمدًا: لوحة الطالب شبكة مضغوطة عند 1440×844
     (سُلّم تمرير ~193px فقط) — عند 600px يصبح السُّلّم معنويًا (~400px)
     ويبقى النطاق ≥921 (سكة دائمة). */
  test.use({ e2eRole: 'STUDENT', themeSeed: 'light', viewport: { width: 1280, height: 600 } });

  test('علامة نشطة واحدة بعنوانها في الشريط والترويسة والتبويب، والرجوع يستعيد التمرير', async ({ page }) => {
    // 1) التحميل المباشر على وجهة الدور: علامة واحدة بالضبط.
    await page.goto('/student/courses');
    await expect(page.locator('h1.pf-page-title')).toBeVisible();

    const active = page.locator('.nav-item.on');
    await expect(active).toHaveCount(1);
    await expect(active).toContainText('مقرّراتي الدراسية');

    // الترويسة (والتبويب) يتحدثان بلغة nav.ts نفسها — لا انجراف.
    await expect(page.locator('.topbar-title')).toContainText('مقرّراتي الدراسية');
    await expect(page).toHaveTitle('مقرّراتي الدراسية · مدارك');

    // 2) الرجوع يستعيد التمرير على صفحة طويلة (مراقب POP المحدود ~1s).
    await page.goto('/student/dashboard');
    await expect(page.locator('h1.pf-page-title')).toBeVisible();
    // اكتمال ارتفاع الصفحة شرط الفحص الحقيقي (بيانات mock بعد Suspense).
    await expect
      .poll(() => page.evaluate(() => {
        const el = document.querySelector<HTMLElement>('.content');
        return el ? el.scrollHeight - el.clientHeight : 0;
      }), { timeout: 6000, message: 'لوحة الطالب صفحة طويلة فعليًا' })
      .toBeGreaterThan(250);

    const y = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('.content');
      if (!el) return 0;
      const max = el.scrollHeight - el.clientHeight;
      const target = Math.min(600, Math.max(0, max));
      el.scrollTop = target;
      return target;
    });
    expect(y, 'لوحة الطالب تتسع لتمرير معنوي').toBeGreaterThan(250);
    await page.waitForTimeout(150); // حدث scroll يُسجَّل في previousScrollTop

    await page.getByRole('link', { name: 'مقرّراتي الدراسية' }).click();
    await expect(page).toHaveURL(/\/student\/courses$/);
    await expect(page.locator('h1.pf-page-title')).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/\/student\/dashboard$/);
    // المراقب المحدود يعيد التطبيق حتى ~60 إطارًا — امنحه نافذته.
    await page.waitForFunction(
      (expected) => {
        const el = document.querySelector<HTMLElement>('.content');
        return el != null && Math.abs(el.scrollTop - (expected as number)) < 60;
      },
      y,
      { timeout: 2500 },
    );
    const restored = await page.evaluate(() => document.querySelector<HTMLElement>('.content')?.scrollTop ?? -1);
    expect(Math.abs(restored - y), `التمرير استُعيد (${restored} ≈ ${y})`).toBeLessThanOrEqual(60);
  });
});

/* ═══════════════════════════════════════════════════════════════
   لغة الطبقات العلوية — الطالب 1440 (فاتح)
   ═══════════════════════════════════════════════════════════════ */
test.describe('الطبقات العلوية: قائمة المستخدم ولوحة الأوامر', () => {
  test.use({ e2eRole: 'STUDENT', themeSeed: 'light', viewport: { width: 1440, height: 844 } });

  test('قائمة المستخدم: Escape يغلق ويعيد التركيز إلى المُطلِق', async ({ page }) => {
    await page.goto('/student/dashboard');
    await expect(page.locator('h1.pf-page-title')).toBeVisible();

    await page.locator(USER_TRIGGER).click();
    const menu = page.getByRole('menu', { name: 'قائمة حساب المستخدم' });
    await expect(menu).toBeVisible();
    await expect(page.locator(USER_TRIGGER)).toHaveAttribute('aria-expanded', 'true');
    await snap(page, `student-1440-light-user-menu-open.png`);

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(page.locator(USER_TRIGGER)).toBeFocused();
    await expect(page.locator(USER_TRIGGER)).toHaveAttribute('aria-expanded', 'false');
  });

  test('لوحة الأوامر ⌘K: فتح/تصفية بالكتابة/Escape، وCtrl+B مُعطَّل واللوحة مفتوحة', async ({ page }) => {
    await page.goto('/student/dashboard');
    await expect(page.locator('h1.pf-page-title')).toBeVisible();

    const collapsedBefore = await isCollapsed(page);
    await page.keyboard.press('Control+K');
    const input = page.getByRole('combobox', { name: 'الأوامر والبحث' });
    await expect(input).toBeVisible();
    await expect(input).toBeFocused();

    // الكتابة تُصفّي: قسم المقررات يظهر بنتيجة النقل الوهمي.
    await input.fill('خوارزم');
    const coursesSection = page.locator('.search-section', { hasText: 'مقررات' });
    await expect(coursesSection).toBeVisible();
    await expect(coursesSection.getByRole('option', { name: /مقدمة في الخوارزميات/ })).toBeVisible();
    await snap(page, `student-1440-light-palette-open.png`);

    // تعطيل الأوتار: Ctrl+B واللوحة مفتوحة لا يطوي السكّة ولا يغلق اللوحة.
    await page.keyboard.press('Control+b');
    await expect(input).toBeVisible(); // اللوحة ما تزال مفتوحة
    expect(await isCollapsed(page)).toBe(collapsedBefore);

    await page.keyboard.press('Escape');
    await expect(input).toBeHidden();
  });
});

/* ═══════════════════════════════════════════════════════════════
   ثبات السمة عبر مبدّل الشريط الجانبي — الطالب 1440
   ═══════════════════════════════════════════════════════════════ */
test.describe('ثبات السمة', () => {
  test.use({ e2eRole: 'STUDENT', themeSeed: 'dark', viewport: { width: 1440, height: 844 } });

  test('داكن مُبذور → مبدّل الشريط يقلبه فاتحًا ويبقى بعد إعادة التحميل', async ({ page }) => {
    await page.goto('/student/dashboard');
    await expect(page.locator('h1.pf-page-title')).toBeVisible();
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // وسّع السكّة أولًا: مجموعة السمة في التذييل تُقصّص في سكة 64px.
    await page.locator('.sidebar-collapse-btn').click();
    const themeGroup = page.getByRole('group', { name: 'السمة' });
    await expect(themeGroup).toBeVisible();
    await themeGroup.getByRole('button', { name: 'فاتح', exact: true }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');

    await page.reload();
    await expect(page.locator('h1.pf-page-title')).toBeVisible();
    await expect(html).toHaveAttribute('data-theme', 'light');
  });
});

/* ═══════════════════════════════════════════════════════════════
   المرور بلوحة المفاتيح فقط — الطالب 1440
   ═══════════════════════════════════════════════════════════════ */
test.describe('المرور بلوحة المفاتيح', () => {
  test.use({ e2eRole: 'STUDENT', themeSeed: 'light', viewport: { width: 1440, height: 844 } });

  test('رابط التخطي أول وقفة، Enter يقفز إلى #main، والتنقل يصل بحلقة تركيز ظاهرة', async ({ page }) => {
    await page.goto('/student/dashboard');
    await expect(page.locator('h1.pf-page-title')).toBeVisible();

    // أول Tab من الإقلاع البارد = رابط التخطي (التركيب الأول لا يُنقذ التركيز).
    await page.keyboard.press('Tab');
    await expect(page.locator('a.skip-link')).toBeFocused();

    // Enter يقفز إلى #main.
    await page.keyboard.press('Enter');
    await expect
      .poll(() => page.evaluate(() => {
        const active = document.activeElement;
        return active != null && (active.id === 'main' || active.contains(document.getElementById('main')));
      }), { timeout: 3000 })
      .toBe(true);

    // عناصر التنقل قابلة للوصول بالتبويب، وحلقة :focus-visible ظاهرة.
    await page.reload();
    await expect(page.locator('h1.pf-page-title')).toBeVisible();
    await page.keyboard.press('Tab'); // رابط التخطي
    await page.keyboard.press('Tab'); // زر طيّ السكّة
    await page.keyboard.press('Tab'); // أول عنصر تنقّل
    await expect
      .poll(() => page.evaluate(() => {
        const active = document.activeElement as HTMLElement | null;
        return active != null && active.closest('nav.sidebar') != null && active.classList.contains('nav-item');
      }), { timeout: 3000 })
      .toBe(true);
    const ringVisible = await page.evaluate(() =>
      document.activeElement != null &&
      document.activeElement.matches(':focus-visible') &&
      getComputedStyle(document.activeElement).outlineStyle !== 'none',
    );
    expect(ringVisible, 'حلقة :focus-visible على عنصر تنقّل').toBe(true);
  });
});

/* ═══════════════════════════════════════════════════════════════
   الحركة المخفّضة — الطالب 390 (درج فوري، صفر أنيميشن جارٍ)
   ═══════════════════════════════════════════════════════════════ */
test.describe('الحركة المخفّضة', () => {
  test.use({
    e2eRole: 'STUDENT',
    themeSeed: 'dark',
    viewport: { width: 390, height: 844 },
    reducedMotion: 'reduce',
  });

  test('الدرج فوري بلا انتقال ولا أنيميشن جارٍ على القشرة', async ({ page }) => {
    await page.goto('/student/dashboard');
    await expect(page.locator('h1.pf-page-title')).toBeVisible();

    // حزام 0.01ms يطوي انتقال الدرج إلى فوري.
    const drawerDuration = await page.evaluate(() => {
      const el = document.querySelector<HTMLElement>('nav.sidebar');
      return el ? getComputedStyle(el).transitionDuration : 'missing';
    });
    expect(parseFloat(drawerDuration), 'انتقال الدرج تحت RM ≈ 0').toBeLessThan(5);

    await page.locator(BURGER).click();
    await expect(page.locator('nav.sidebar')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('nav.sidebar')).toBeHidden();

    // صفر أنيميشن «غير مطفأ» — ساعة الصفحة مجمّدة (FIXED_NOW) فلا يتقدّم
    // زمن الحركة أصلًا، لذا المقياس الصادق ليس playState (يبقى running
    // للأبد تحت الساعة المجمّدة) بل مدة الحركة المحسوبة نفسها: كل ما
    // يجري يجب أن يكون 0.01ms بمكرّر منتهٍ (حزام الحركة المخفّضة).
    const unfrozen = await page.evaluate(() =>
      document.getAnimations()
        .filter((a) => a.playState === 'running')
        .filter((a) => {
          const t = a.effect?.getComputedTiming();
          return !t || (t.duration as number) > 1 || t.iterations === Infinity;
        })
        .map((a) => {
          const el = (a.effect as unknown as { target?: Element } | null)?.target;
          if (!el) return a.constructor.name;
          const cs = getComputedStyle(el);
          return `${el.tagName.toLowerCase()}.${String(el.className).slice(0, 40)} anim=${cs.animationName} dur=${cs.animationDuration} iter=${cs.animationIterationCount}`;
        }),
    );
    expect(unfrozen, 'لا أنيميشن غير مطفأ (بقية الحزام 0.01ms) تحت RM').toEqual([]);
  });
});
