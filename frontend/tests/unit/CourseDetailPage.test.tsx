/**
 * r164d (course flow) — CourseDetailPage as the Coursera/edX course
 * home: ONE unmistakable «التالي» CTA in the hero progress panel that
 * jumps straight to the first unfinished lecture (watch open OR
 * checkpoints pending — the pure selection lives in
 * hooks/resources/learning.ts and is pinned separately in
 * courseNextLecture.test.ts), per-row checkpoint-pending badges, and
 * honest material targets (materialHref — viewer / external /
 * unavailable).
 *
 * The payload is a shape-matched OfferingFull mock at the useResources
 * module boundary; the pure selectors stay REAL (importOriginal) so
 * the page is exercised against the actual selection rules.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import CourseDetailPage from '../../src/pages/student/CourseDetailPage';

const mocks = vi.hoisted(() => ({
  offering: null as Record<string, unknown> | null,
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    useOfferingFull: () => ({
      data: mocks.offering,
      isPending: !mocks.offering,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
  };
});

const iso = '2026-01-01T00:00:00.000Z';

const lecture = (over: Record<string, unknown>) => ({
  id: 'l1',
  offeringId: 'off1',
  title: 'محاضرة',
  description: null,
  ordinal: 1,
  durationSec: 600,
  videoUrl: 'https://cdn.example.com/l.mp4',
  posterUrl: null,
  createdAt: iso,
  _count: { chapters: 0, checkpoints: 0 },
  watchEvents: [] as Array<{ watchedSec: number; totalSec: number; completed: boolean }>,
  answeredCheckpoints: 0,
  ...over,
});

const baseOffering = () => ({
  id: 'off1',
  term: 'الخريف',
  room: 'قاعة أ',
  course: {
    id: 'c1',
    name: 'شبكات الحاسوب',
    code: 'CS301',
    iconEmoji: null,
    themeColor: null,
    description: null,
    credits: 3,
    department: { id: 'd1', name: 'علوم الحاسوب', faculty: { id: 'f1', name: 'تقنية المعلومات' } },
  },
  teacher: { id: 't1', firstName: 'أحمد', lastName: 'الألفي', avatarInitials: null, avatarColor: null },
  schedule: [],
  materials: [],
  assignments: [],
  lectures: [],
  _count: { enrollments: 30 },
});

function renderCourse() {
  return render(
    <MemoryRouter initialEntries={['/student/courses/off1']}>
      <Routes>
        <Route path="/student/courses/:offeringId" element={<CourseDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('CourseDetailPage — hero progress + «التالي» CTA (r164d)', () => {
  beforeEach(() => {
    mocks.offering = null;
  });

  it('CTA jumps to the FIRST unfinished lecture; overall progress + completed count read honestly', () => {
    mocks.offering = baseOffering();
    (mocks.offering as { lectures: unknown[] }).lectures = [
      // finished: watch complete AND both checkpoints answered.
      lecture({
        id: 'l1', ordinal: 1, title: 'المقدمة',
        watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }],
        _count: { chapters: 2, checkpoints: 2 }, answeredCheckpoints: 2,
      }),
      // watched to the end but 1 of 3 checkpoints unanswered → THE next step.
      lecture({
        id: 'l2', ordinal: 2, title: 'الطبقة الناقلة',
        watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }],
        _count: { chapters: 0, checkpoints: 3 }, answeredCheckpoints: 1,
      }),
      // never opened.
      lecture({ id: 'l3', ordinal: 3, title: 'التحكم بالازدحام', answeredCheckpoints: 0 }),
    ];
    renderCourse();

    // The CTA names the checkpoint-pending lecture, not the unwatched one.
    const cta = screen.getByRole('link', { name: /التالي/ });
    expect(cta).toHaveAttribute('href', '/student/lectures/l2');
    // The pending-checkpoint context rides the note under the CTA.
    expect(screen.getByText(/تبقى نقاط تفاعل لم تُجب/)).toBeInTheDocument();
    // Overall progress panel: completed count of the WATCH loop.
    expect(screen.getByText('محاضرتان مكتملتان من 3')).toBeInTheDocument();
  });

  it('CTA notes the next lecture title when the reason is watch-progress, not checkpoints', () => {
    mocks.offering = baseOffering();
    (mocks.offering as { lectures: unknown[] }).lectures = [
      lecture({ id: 'l1', ordinal: 1, title: 'المقدمة', watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }] }),
      lecture({ id: 'l2', ordinal: 2, title: 'الطبقة الناقلة' }),
    ];
    renderCourse();

    const cta = screen.getByRole('link', { name: /التالي/ });
    expect(cta).toHaveAttribute('href', '/student/lectures/l2');
    // The next lecture's title rides the note under the CTA (and its
    // row below — the same lecture, two scent points).
    expect(screen.getAllByText('الطبقة الناقلة')).toHaveLength(2);
    expect(screen.queryByText(/تبقى نقاط تفاعل/)).toBeNull();
  });

  it('all lectures finished → NO CTA; the honest done badge replaces it', () => {
    mocks.offering = baseOffering();
    (mocks.offering as { lectures: unknown[] }).lectures = [
      lecture({ id: 'l1', ordinal: 1, watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }] }),
      lecture({
        id: 'l2', ordinal: 2,
        watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }],
        _count: { chapters: 0, checkpoints: 2 }, answeredCheckpoints: 2,
      }),
    ];
    renderCourse();

    expect(screen.queryByRole('link', { name: /التالي/ })).toBeNull();
    expect(screen.getByText('أنهيت محاضرات المقرّر')).toBeInTheDocument();
  });

  it('empty curriculum → no CTA and no done badge (the lectures card owns the empty state)', () => {
    mocks.offering = baseOffering();
    renderCourse();

    expect(screen.queryByRole('link', { name: /التالي/ })).toBeNull();
    expect(screen.queryByText('أنهيت محاضرات المقرّر')).toBeNull();
  });
});

describe('CourseDetailPage — per-lecture checkpoint-pending badge (r164d)', () => {
  beforeEach(() => {
    mocks.offering = null;
  });

  it('a completed-watch lecture with open checkpoints wears the amber badge; closed ones do not', () => {
    mocks.offering = baseOffering();
    (mocks.offering as { lectures: unknown[] }).lectures = [
      lecture({
        id: 'l1', ordinal: 1, title: 'المقدمة',
        watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }],
        _count: { chapters: 2, checkpoints: 2 }, answeredCheckpoints: 2,
      }),
      lecture({
        id: 'l2', ordinal: 2, title: 'الطبقة الناقلة',
        watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }],
        _count: { chapters: 0, checkpoints: 3 }, answeredCheckpoints: 1,
      }),
    ];
    renderCourse();

    const badges = screen.getAllByText('نقاط تفاعل متبقية');
    expect(badges).toHaveLength(1);
    // The pending badge rides the SAME row as the lecture it belongs to.
    expect(badges[0]!.closest('a')?.getAttribute('href')).toBe('/student/lectures/l2');
    // Both lectures completed the WATCH loop → both keep the plain
    // completion badge; only l2 additionally wears the pending badge.
    expect(screen.getAllByText('مكتملة')).toHaveLength(2);
  });

  it('the pending lecture is the highlighted «تابع من هنا» row (selection shared with the CTA)', () => {
    mocks.offering = baseOffering();
    (mocks.offering as { lectures: unknown[] }).lectures = [
      lecture({ id: 'l1', ordinal: 1, title: 'المقدمة', watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }] }),
      lecture({
        id: 'l2', ordinal: 2, title: 'الطبقة الناقلة',
        watchEvents: [{ watchedSec: 600, totalSec: 600, completed: true }],
        _count: { chapters: 0, checkpoints: 2 }, answeredCheckpoints: 0,
      }),
    ];
    renderCourse();

    const nextRow = screen.getByText('تابع من هنا').closest('a');
    expect(nextRow?.getAttribute('href')).toBe('/student/lectures/l2');
  });
});

describe('CourseDetailPage — honest material targets (materialHref, r164d)', () => {
  beforeEach(() => {
    mocks.offering = null;
  });

  it('internal materials-namespace PDF → in-app document viewer; real https → new tab; reserved host → no link', () => {
    mocks.offering = baseOffering();
    (mocks.offering as { materials: unknown[] }).materials = [
      {
        id: 'm1', name: 'ملخص المحاضرة', type: 'PDF',
        // The materials file namespace — the old inline regex sent this
        // to a dead raw relative href; the viewer route serves it with
        // the Bearer token.
        url: '/api/v1/files/materials/handout.pdf',
        sizeBytes: '1024', createdAt: iso,
      },
      {
        id: 'm2', name: 'مرجع خارجي', type: 'DOC',
        url: 'https://example.com/external.doc',
        sizeBytes: '2048', createdAt: iso,
      },
      {
        id: 'm3', name: 'عرض قديم', type: 'PPT',
        url: 'https://seed.example.invalid/deck.pptx',
        sizeBytes: '4096', createdAt: iso,
      },
    ];
    renderCourse();

    const viewer = screen.getByRole('link', { name: /ملخص المحاضرة/ });
    expect(viewer.getAttribute('href')).toContain('/document/handout.pdf');
    expect(viewer.getAttribute('href')).toContain('ns=materials');

    const external = screen.getByRole('link', { name: /مرجع خارجي/ });
    expect(external).toHaveAttribute('href', 'https://example.com/external.doc');
    expect(external).toHaveAttribute('target', '_blank');

    // Reserved RFC 2606 host — honest non-link, never a dead anchor.
    expect(screen.queryByRole('link', { name: /عرض قديم/ })).toBeNull();
    expect(screen.getByText('عرض قديم')).toBeInTheDocument();
    expect(screen.getByText('غير متوفر بعد')).toBeInTheDocument();
  });
});
