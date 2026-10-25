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
import { SheetCodeContext, sheetCodeForRole } from '../../src/lib/sheet-code';

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

/* ═══ R319 (C2-G2) — the Heron title bar: index / sheetCode / ambient context ═══ */

describe('PageHeader — the sheet identity devices (R319 C2-G2)', () => {
  it('sheetCodeForRole maps every role to its sheet register code', () => {
    expect(sheetCodeForRole('STUDENT')).toBe('S-01 · STUDENT');
    expect(sheetCodeForRole('TEACHER')).toBe('T-01 · TEACHER');
    expect(sheetCodeForRole('ADMIN')).toBe('A-01 · ADMIN');
    expect(sheetCodeForRole('QUALITY')).toBe('Q-01 · QUALITY');
    expect(sheetCodeForRole('OWNER')).toBe('O-01 · OWNER');
  });

  it('renders no code line and no index by default (zero-breaking additive props)', () => {
    const { container } = render(<PageHeader title="الجدول" />);
    expect(container.querySelector('.page-sheet-code')).toBeNull();
    expect(container.querySelector('.page-index')).toBeNull();
  });

  it('renders the sheetCode prop as the SHEET identity line (dir=ltr, decorative)', () => {
    const { container } = render(<PageHeader title="الجدول" sheetCode="S-01 · STUDENT" />);
    const line = container.querySelector('.page-sheet-code');
    expect(line?.textContent).toBe('SHEET S-01 · STUDENT');
    expect(line?.getAttribute('aria-hidden')).toBe('true');
    expect(line?.querySelector('span')?.getAttribute('dir')).toBe('ltr');
  });

  it("an explicit '' sheetCode opts the line out even under an ambient provider", () => {
    const { container } = render(
      <SheetCodeContext.Provider value="S-01 · STUDENT">
        <PageHeader title="الجدول" sheetCode="" />
      </SheetCodeContext.Provider>,
    );
    expect(container.querySelector('.page-sheet-code')).toBeNull();
  });

  it('consumes the AMBIENT SheetCodeContext when the prop is absent (AppShell wiring)', () => {
    const { container } = render(
      <SheetCodeContext.Provider value="T-01 · TEACHER">
        <PageHeader title="بنك الأسئلة" />
      </SheetCodeContext.Provider>,
    );
    expect(container.querySelector('.page-sheet-code')?.textContent).toBe('SHEET T-01 · TEACHER');
  });

  it('renders the index as the mono [01] gutter label INSIDE the h1, aria-hidden (the name stays the title)', () => {
    render(<PageHeader title="المصفوفة التعليمية" index="01" />);
    const h1 = screen.getByRole('heading', { level: 1, name: 'المصفوفة التعليمية' });
    expect(h1.querySelector('.page-index')?.textContent).toBe('[01]');
    expect(h1.querySelector('.page-index')?.getAttribute('aria-hidden')).toBe('true');
    expect(h1.querySelector('.page-index')?.getAttribute('dir')).toBe('ltr');
  });
});
