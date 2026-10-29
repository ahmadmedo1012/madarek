/**
 * r164-a — PageHeader primitive contracts.
 *
 * The page-opening header was hand-rolled ~86 times across 44 page
 * files (and TWO private PageHeader copies already existed —
 * TeacherPages ×19 / AdminPages ×8 call sites). The primitive is the
 * promoted shared form of that markup. These pins hold it to the exact
 * structure the CSS family styles (base.css §PAGE + polish.css
 * §page-header rhythm), so adoption stays a byte-identical fold and
 * future drift (a wrapper div, a div title, a renamed class) fails
 * here instead of silently degrading every page at once.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PageHeader } from '../../src/components/primitives';

// r324 X10 — the sheetCode/SheetCodeContext devices are RETIRED with
// the `SHEET S-01 · …` identity lines (coordinates/revision tags are
// not content). This file's former R319 sheet-code describe block is
// replaced by the retirement pins at the bottom.

describe('PageHeader — the page-opening header primitive (r164-a)', () => {
  it('renders the title as the route\'s single semantic h1', () => {
    render(<PageHeader title="الجدول الدراسي" />);
    const h1 = screen.getByRole('heading', { level: 1, name: 'الجدول الدراسي' });
    expect(h1).toHaveClass('page-title');
  });

  it('renders the subtitle when given, and nothing when omitted', () => {
    const { container, rerender } = render(
      <PageHeader title="النتائج والتقييمات" subtitle="جارٍ جمع درجاتك…" />,
    );
    expect(container.querySelector('.page-subtitle')?.textContent).toBe('جارٍ جمع درجاتك…');
    rerender(<PageHeader title="النتائج والتقييمات" />);
    expect(container.querySelector('.page-subtitle')).toBeNull();
  });

  it('keeps the CSS family contract: header > title-block > h1 + p — no wrappers', () => {
    const { container } = render(<PageHeader title="المهارات" subtitle="رصد" />);
    const header = container.querySelector('header.page-header');
    expect(header).not.toBeNull();
    const block = container.querySelector('.page-title-block');
    expect(block?.parentElement).toBe(header);
    // The title block's children are exactly the h1 and the subtitle p.
    expect(block?.children).toHaveLength(2);
    expect(block?.children[0]?.tagName).toBe('H1');
    expect(block?.children[0]).toHaveClass('page-title');
    expect(block?.children[1]?.tagName).toBe('P');
    expect(block?.children[1]).toHaveClass('page-subtitle');
  });

  it('renders actions as a DIRECT flex child of the header — no wrapper node', () => {
    const { container } = render(
      <PageHeader title="الإنجازات والنقاط" actions={<span data-testid="xp-badge">٤٥ نقطة</span>} />,
    );
    const header = container.querySelector('header.page-header')!;
    // Direct children: the title block + the action node itself (the
    // .page-header flex row does the layout — the .page-actions wrapper
    // class was deleted in the 13-17 dead-selector sweep for having
    // zero consumers, and must not come back).
    expect(header.children).toHaveLength(2);
    expect(header.children[1]).toBe(screen.getByTestId('xp-badge'));
  });

  it('renders multiple action children verbatim (a fragment unfolds into the flex row)', () => {
    const { container } = render(
      <PageHeader
        title="المجتمع الجامعي"
        actions={
          <>
            <button type="button">إعلان جديد</button>
            <a href="/competitions">صفحة المسابقات</a>
          </>
        }
      />,
    );
    const header = container.querySelector('header.page-header')!;
    expect(header.children).toHaveLength(3); // title-block + button + anchor
    expect(header.children[1]?.tagName).toBe('BUTTON');
    expect(header.children[2]?.tagName).toBe('A');
  });

  it('drops actions entirely when the expression is false (conditional actions)', () => {
    const { container } = render(<PageHeader title="المسابقات" actions={false} />);
    const header = container.querySelector('header.page-header')!;
    expect(header.children).toHaveLength(1);
  });

  it('accepts node content for both title and subtitle', () => {
    const { container } = render(
      <PageHeader title={<span>جامعة الزاوية</span>} subtitle={<span>مؤسّسة تعليميّة</span>} />,
    );
    expect(screen.getByRole('heading', { level: 1, name: 'جامعة الزاوية' })).toBeInTheDocument();
    expect(container.querySelector('.page-subtitle')?.textContent).toBe('مؤسّسة تعليميّة');
  });
});

/* ═══ r324 X10 — the sheet-identity retirement ══════════════════════ */

describe('PageHeader — the sheet-identity devices are retired (r324 X10)', () => {
  it('renders no sheet-code line by default — the SHEET line is gone from innerText', () => {
    const { container } = render(<PageHeader title="الجدول" />);
    expect(container.querySelector('.page-sheet-code')).toBeNull();
    expect(container.querySelector('.page-index')).toBeNull();
    expect(document.body.textContent).not.toContain('SHEET');
  });

  it('renders the index as the mono [01] gutter label INSIDE the h1, aria-hidden (the name stays the title)', () => {
    render(<PageHeader title="المصفوفة التعليمية" index="01" />);
    const h1 = screen.getByRole('heading', { level: 1, name: 'المصفوفة التعليمية' });
    expect(h1.querySelector('.page-index')?.textContent).toBe('[01]');
    expect(h1.querySelector('.page-index')?.getAttribute('aria-hidden')).toBe('true');
    expect(h1.querySelector('.page-index')?.getAttribute('dir')).toBe('ltr');
  });
});
