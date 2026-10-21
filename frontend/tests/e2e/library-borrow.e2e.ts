/**
 * library-borrow.e2e.ts — حلقة استعارة المكتبة (r165h).
 *
 * يثبّت مسار الاستعارة/الإرجاع الكامل على /student/library عبر نقل
 * وهمي STATEFUL يملك الحالة: استعارة الكتاب الوحيد النسخة → صفّ
 * الاستعارة يظهر بحالته «نشطة» وموعد إرجاعه + toast بموعد الإرجاع،
 * وتوفّر النسخة ينقلب («مستعار» + زرّ معطّل)، ثم الإرجاع → الصف
 * يختفي والتوافر يعود («متاح» + زرّ فعّال) — كل انتقال عبر إبطال
 * React Query وإعادة الجلب الحقيقيين، لا عبر إعادة تحميل الصفحة.
 */
import { test, expect } from './fixtures/e2e';
import { LIBRARY_BOOKS, LIBRARY_RESEARCH, loanRow } from './fixtures/api-fixtures';
import { installStatefulApi, statefulOk } from './fixtures/mock-transport';

test.use({ e2eRole: 'STUDENT' });

test.describe('المكتبة الإلكترونية — الاستعارة والإرجاع', () => {
  test('استعارة كتاب وحيد النسخة ثم إرجاعه: القرض يظهر ويزول والتوافر يتبدّل', async ({ page }) => {
    /* الحالة الوهمية: نسختا الكتب + قائمة القروض تبدأ فارغة. كل كتاب
     * READ يعكس ما كتبته الطفرات — والقروض تُجلب بكائن book مضمنًا
     * كما يفعل GET /me/loans الحقيقي. */
    const books = LIBRARY_BOOKS.map((b) => ({ ...b }));
    const loans: Array<Record<string, unknown>> = [];
    const borrowBodies: Array<{ bookId: string }> = [];

    await installStatefulApi(page, [
      {
        /* البحوث المنشورة تُجلب عند تحميل الصفحة (شارة عدّ تبويب البحوث). */
        method: 'GET',
        pattern: '**/api/v1/research/published',
        fulfill: async ({ route }) => {
          await statefulOk(route, LIBRARY_RESEARCH);
        },
      },
      {
        method: 'GET',
        pattern: '**/api/v1/library/books**',
        fulfill: async ({ route }) => {
          await statefulOk(route, books);
        },
      },
      {
        method: 'GET',
        pattern: '**/api/v1/me/loans',
        fulfill: async ({ route }) => {
          await statefulOk(route, loans);
        },
      },
      {
        method: 'POST',
        pattern: '**/api/v1/library/loans',
        fulfill: async ({ route }) => {
          const body = route.request().postDataJSON() as { bookId: string };
          borrowBodies.push(body);
          const book = books.find((b) => b.id === body.bookId);
          if (book) book.availableCopies -= 1;
          const loan = loanRow(body.bookId, 'ACTIVE', 0);
          loans.push({
            ...loan,
            book: book
              ? { id: book.id, title: book.title, author: book.author, category: book.category }
              : null,
          });
          await statefulOk(route, loan);
        },
      },
      {
        method: 'POST',
        pattern: '**/api/v1/library/loans/*/return',
        fulfill: async ({ route, url }) => {
          const loanId = url.pathname.match(/loans\/([^/]+)\/return$/)?.[1] ?? '';
          const loan = loans.find((l) => l.id === loanId);
          if (loan) {
            loan.status = 'RETURNED';
            loan.returnedAt = loanRow(String(loan.bookId), 'RETURNED', 0).returnedAt;
            const book = books.find((b) => b.id === loan.bookId);
            if (book) book.availableCopies += 1;
          }
          await statefulOk(route, loan ?? {});
        },
      },
    ]);

    await page.goto('/student/library');
    await expect(page).toHaveTitle('المكتبة الإلكترونية · مدارك');
    await expect(page.locator('h1.pf-page-title')).toHaveText('المكتبة الإلكترونية');

    /* تبويب البحوث يحمل عدّه من الحمولة (بحث واحد منشور). */
    await expect(page.locator('#lib-tab-research .tab-count')).toHaveText('1');

    /* بطاقة الكتاب الوحيد النسخة متاحة، وبطاقة الاستعارات فارغة بصدق. */
    const bookCard = page.locator('[aria-label="قائمة الكتب"] .pf-row', { hasText: 'البرمجة بلغة C' });
    await expect(bookCard).toContainText('د. عبد الرحمن الشريف');
    await expect(bookCard.locator('.r305rp-chip')).toContainText('متاح');
    const loansCard = page.locator('section[aria-label="استعاراتي النشطة"]');
    await expect(loansCard).toContainText('لا استعارات نشطة');

    /* الاستعارة — صفّ القرض يظهر «نشطة» بموعد إرجاعه، وtoast
     * «تمّت الاستعارة» ينقل موعد الإرجاع للطالب فورًا. */
    await bookCard.getByRole('button', { name: 'استعارة البرمجة بلغة C' }).click();
    const borrowToast = page.locator('.toast-success');
    await expect(borrowToast.locator('.toast-title')).toHaveText('تمّت الاستعارة');
    await expect(borrowToast.locator('.toast-desc')).toContainText('موعد إرجاع «البرمجة بلغة C»');
    const loanRowEl = loansCard.locator('.pf-row', { hasText: 'البرمجة بلغة C' });
    await expect(loanRowEl).toBeVisible();
    await expect(loanRowEl).toContainText('نشطة');
    await expect(loanRowEl).toContainText('موعد الإرجاع:');
    await expect(loansCard).not.toContainText('لا استعارات نشطة');

    /* النسخة الوحيدة انتهت: الشارة «مستعار» والزرّ معطّل. */
    await expect(bookCard.locator('.r305rp-chip')).toContainText('مستعار');
    await expect(bookCard.getByRole('button', { name: 'استعارة البرمجة بلغة C' })).toBeDisabled();

    /* الإرجاع — الصف يزول، والحالة الفارغة تعود، والتوافر يُستعاد.
     * (.last: نجاح الاستعارة ما زال معروضًا — إقالته الذاتية 5 ثوانٍ
     * لم تحن بعد، فالمُطابقة الصارمة على صنف التوست وحده سترى اثنين.) */
    await loanRowEl.getByRole('button', { name: 'إرجاع البرمجة بلغة C' }).click();
    await expect(page.locator('.toast-success').last().locator('.toast-title')).toHaveText('تمّ الإرجاع');
    await expect(loansCard).toContainText('لا استعارات نشطة');
    await expect(loansCard.locator('.pf-row', { hasText: 'البرمجة بلغة C' })).toHaveCount(0);
    await expect(bookCard.locator('.r305rp-chip')).toContainText('متاح');
    await expect(bookCard.getByRole('button', { name: 'استعارة البرمجة بلغة C' })).toBeEnabled();

    /* الشكل على السلك حرفيًا: { bookId } فقط — عقد borrowBookSchema. */
    expect(borrowBodies).toEqual([{ bookId: 'bok_e2e_c' }]);
  });
});
