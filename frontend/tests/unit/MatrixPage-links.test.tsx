/**
 * r164d (course flow) — MatrixPage's mastery gaps link DIRECTLY to the
 * lecture that teaches the concept:
 *   1. The gap rows («سدّ الفجوة») — pre-existing, pinned here so the
 *      target can't silently die.
 *   2. The heatmap's weak/poor CELLS (this round's fix) — they were
 *      dead tiles the student could see but never act on; they now
 *      route through the SAME gaps payload (recommendedLectureId).
 *   3. Strong / good / untouched cells stay informational non-links
 *      (no remediation target exists for them — honest, not dead).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MatrixPage from '../../src/pages/student/MatrixPage';

const mocks = vi.hoisted(() => ({
  matrix: [] as Array<Record<string, unknown>>,
  gaps: [] as Array<Record<string, unknown>>,
}));

vi.mock('../../src/hooks/useResources', () => ({
  useMatrix: () => ({
    data: mocks.matrix,
    isPending: !mocks.matrix,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useGaps: () => ({
    data: mocks.gaps,
    isPending: !mocks.gaps,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

const concept = (over: Record<string, unknown>) => ({
  id: 'k0',
  name: 'مفهوم',
  level: 0,
  attempts: 0,
  ...over,
});

const matrixCourse = (concepts: Array<Record<string, unknown>>) => ({
  courseId: 'c1',
  courseCode: 'CS301',
  courseName: 'شبكات الحاسوب',
  themeColor: null,
  offeringId: 'off1',
  concepts,
});

function renderMatrix() {
  return render(
    <MemoryRouter>
      <MatrixPage />
    </MemoryRouter>,
  );
}

describe('MatrixPage — gap rows link to the recommended lecture', () => {
  beforeEach(() => {
    mocks.matrix = [];
    mocks.gaps = [];
  });

  it("a gap row's «سدّ الفجوة» button targets the recommended lecture", () => {
    mocks.gaps = [{
      conceptId: 'k-weak',
      conceptName: 'التحكم بالازدحام',
      courseId: 'c1',
      courseName: 'شبكات الحاسوب',
      courseColor: null,
      level: 0.45,
      recommendedLectureId: 'lec9',
      recommendedLectureTitle: 'محاضرة التحكم',
    }];
    renderMatrix();

    const cta = screen.getByRole('link', { name: /سدّ الفجوة/ });
    expect(cta).toHaveAttribute('href', '/student/lectures/lec9');
  });

  it('a gap with no recommendation shows «لا توصية» — honest, never a dead link', () => {
    mocks.gaps = [{
      conceptId: 'k-none',
      conceptName: 'مفهوم بلا فصول',
      courseId: 'c1',
      courseName: 'شبكات الحاسوب',
      courseColor: null,
      level: 0.3,
      recommendedLectureId: null,
      recommendedLectureTitle: null,
    }];
    renderMatrix();

    expect(screen.queryByRole('link', { name: /سدّ الفجوة/ })).toBeNull();
    expect(screen.getByText('لا توصية')).toBeInTheDocument();
  });
});

describe('MatrixPage — heatmap cells link gaps to lectures (r164d)', () => {
  beforeEach(() => {
    mocks.matrix = [];
    mocks.gaps = [];
  });

  it('weak and poor cells with a recommendation are LINKS to the lecture', () => {
    mocks.matrix = [matrixCourse([
      concept({ id: 'k-weak', name: 'التحكم بالازدحام', level: 0.5, attempts: 4 }),
      concept({ id: 'k-poor', name: 'توجيه المسار', level: 0.2, attempts: 2 }),
    ])];
    mocks.gaps = [
      {
        conceptId: 'k-weak', conceptName: 'التحكم بالازدحام', courseId: 'c1',
        courseName: 'شبكات الحاسوب', courseColor: null, level: 0.5,
        recommendedLectureId: 'lec-weak', recommendedLectureTitle: 'محاضرة الازدحام',
      },
      {
        conceptId: 'k-poor', conceptName: 'توجيه المسار', courseId: 'c1',
        courseName: 'شبكات الحاسوب', courseColor: null, level: 0.2,
        recommendedLectureId: 'lec-poor', recommendedLectureTitle: 'محاضرة التوجيه',
      },
    ];
    renderMatrix();

    /* r299 (final C): the concept now rides TWO links that must agree —
       the gaps ROW (the whole row is the link, RowItem to) and the
       heatmap CELL. Every link the concept names targets the SAME
       recommended lecture. */
    const weakLinks = screen.getAllByRole('link', { name: /التحكم بالازدحام/ });
    expect(weakLinks.length).toBe(2);
    for (const link of weakLinks) {
      expect(link).toHaveAttribute('href', '/student/lectures/lec-weak');
    }
    // …and one of them is the heatmap cell itself.
    expect(document.querySelector('a.matrix-cell.lvl-weak')).toHaveAttribute(
      'href', '/student/lectures/lec-weak',
    );

    const poorLinks = screen.getAllByRole('link', { name: /توجيه المسار/ });
    expect(poorLinks.length).toBe(2);
    for (const link of poorLinks) {
      expect(link).toHaveAttribute('href', '/student/lectures/lec-poor');
    }
    expect(document.querySelector('a.matrix-cell.lvl-poor')).toHaveAttribute(
      'href', '/student/lectures/lec-poor',
    );
  });

  it('strong / good / untouched cells stay informational — NOT links (no target exists)', () => {
    mocks.matrix = [matrixCourse([
      concept({ id: 'k-strong', name: 'مقابض الإرسال', level: 0.95, attempts: 5 }),
      concept({ id: 'k-good', name: 'نوافذ الانزلاق', level: 0.7, attempts: 3 }),
      concept({ id: 'k-untouched', name: 'خوارزمية الجوار', level: 0, attempts: 0 }),
      // a gap-level cell with NO recommendation in the gaps payload —
      // honest non-link, same rule as the «لا توصية» row.
      concept({ id: 'k-norec', name: 'ضبط المؤقتات', level: 0.3, attempts: 1 }),
    ])];
    mocks.gaps = [];
    renderMatrix();

    for (const name of ['مقابض الإرسال', 'نوافذ الانزلاق', 'خوارزمية الجوار', 'ضبط المؤقتات']) {
      expect(screen.queryByRole('link', { name: new RegExp(name) })).toBeNull();
      // …but the tile still renders its mastery state.
      expect(screen.getByText(name)).toBeInTheDocument();
    }
  });

  it("the course header's «افتح المقرّر» link goes to the offering", () => {
    mocks.matrix = [matrixCourse([
      concept({ id: 'k-strong', name: 'مقابض الإرسال', level: 0.9, attempts: 5 }),
    ])];
    renderMatrix();

    expect(screen.getByRole('link', { name: /افتح المقرّر/ })).toHaveAttribute(
      'href',
      '/student/courses/off1',
    );
  });
});
