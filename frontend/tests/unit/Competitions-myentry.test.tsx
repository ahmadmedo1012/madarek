/**
 * r157 (w2-F6) — competitions myEntry + URL-synced status filter pins.
 *
 * Three regressions pinned:
 *   1. myEntry matches by userId ONLY. The former first+last-name
 *      fallback matched the first third-party entry sharing the
 *      viewer's name and prefilled «تعديل مشاركتي» with a
 *      stranger's submission (proof: the edit modal's prefill).
 *   2. A guest (null user) gets NO entry even when third-party
 *      entries exist. The truthy userId guard blocks the
 *      undefined === undefined match a naive `e.userId === user?.id`
 *      would make on rows that ship no userId.
 *   3. The index status filter reflects ?status= from the URL on
 *      load — a filtered view is deep-linkable.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { useAuthStore } from '../../src/stores/auth.store';

const h = vi.hoisted(() => {
  const now = Date.now();
  /* The stranger shares the viewer's exact first+last name, is listed
   * FIRST, and ships NO userId (third-party rows never do) — the
   * perfect bait for both wrong matchers. */
  const strangerEntry = {
    id: 'en-stranger',
    title: 'مشاركة الغريب',
    body: 'نصّ مشاركة غريب مطابق للاسم ومختلف عن مشاركتي.',
    fileUrl: null,
    submittedAt: new Date(now - 3600_000).toISOString(),
    score: null,
    user: { firstName: 'أحمد', lastName: 'المهدي', avatarColor: null, avatarInitials: null },
  };
  const ownEntry = {
    id: 'en-own',
    title: 'مشاركتي أنا',
    body: 'نصّ مشاركتي الحقيقي المربوط بمعرّفي.',
    fileUrl: null,
    submittedAt: new Date(now - 7200_000).toISOString(),
    score: null,
    userId: 'u1',
    user: { firstName: 'أحمد', lastName: 'المهدي', avatarColor: null, avatarInitials: null },
  };
  return {
    /* OPEN + future deadline → canEnter, so the hero CTA is the
     * myEntry-dependent pair («تعديل مشاركتي» vs «شارك الآن»). */
    detail: {
      id: 'comp-detail',
      title: 'تحدي الذكاء الاصطناعي',
      description: 'مسابقة في تطبيقات الذكاء الاصطناعي مفتوحة لجميع الطلاب.',
      category: 'برمجة',
      prize: null,
      deadline: new Date(now + 3 * 86400000).toISOString(),
      status: 'OPEN' as const,
      iconEmoji: '🏆',
      themeColor: null,
      organizer: { firstName: 'سالم', lastName: 'الطاهر', role: 'TEACHER' },
      organizerId: 'organizer9',
      entries: [strangerEntry, ownEntry],
    },
    indexOpen: {
      id: 'comp-open',
      title: 'مسابقة الابتكار المفتوحة',
      description: 'مسابقة مفتوحة للجميع هذا الفصل.',
      category: 'ابتكار',
      prize: null,
      deadline: new Date(now + 5 * 86400000).toISOString(),
      status: 'OPEN' as const,
      iconEmoji: '💡',
      themeColor: null,
      organizer: { firstName: 'سالم', lastName: 'الطاهر', role: 'TEACHER' },
      _count: { entries: 4 },
    },
    indexJudged: {
      id: 'comp-judged',
      title: 'مسابقة البحوث المحكّمة',
      description: 'مسابقة انتهى تحكيمها ونُشرت نتائجها.',
      category: 'بحث',
      prize: null,
      deadline: new Date(now - 9 * 86400000).toISOString(),
      status: 'JUDGED' as const,
      iconEmoji: '🔬',
      themeColor: null,
      organizer: { firstName: 'سالم', lastName: 'الطاهر', role: 'TEACHER' },
      _count: { entries: 7 },
    },
  };
});

vi.mock('../../src/hooks/useResources', () => ({
  useCompetitions: () => ({ data: [h.indexOpen, h.indexJudged], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useMyPermissions: () => ({ data: { capabilities: [] }, isPending: false, isError: false }),
  useCreateCompetition: () => ({ mutateAsync: vi.fn(async () => ({})), isPending: false, isError: false }),
  useCompetition: () => ({ data: h.detail, isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useEnterCompetition: () => ({ mutateAsync: vi.fn(async () => ({})), isPending: false, isError: false }),
  useCloseCompetition: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
  useScoreCompetitionEntry: () => ({ mutate: vi.fn(), isPending: false, isError: false, isSuccess: false }),
  useJudgeCompetition: () => ({ mutate: vi.fn(), isPending: false, isError: false }),
}));

import { CompetitionsIndexPage, CompetitionDetailPage } from '../../src/pages/competitions/CompetitionsPages';

function renderDetail() {
  return render(
    <MemoryRouter initialEntries={['/competitions/comp-detail']}>
      <Routes>
        <Route path="/competitions/:id" element={<CompetitionDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

function renderIndexAt(initial: string) {
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <Routes>
        <Route path="/competitions" element={<CompetitionsIndexPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

const viewer = { id: 'u1', email: 'u1@mdrk.dev', firstName: 'أحمد', lastName: 'المهدي', role: 'STUDENT' as const };

describe('CompetitionDetailPage — myEntry identity (r157 w2-F6)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: viewer });
  });

  it('matches myEntry by userId only — the same-name stranger (listed first, no userId) never wins the prefill', () => {
    renderDetail();
    // myEntry resolves via the own row's userId 'u1' → edit CTA.
    const cta = screen.getByRole('button', { name: /تعديل مشاركتي/ });
    fireEvent.click(cta);
    // Prefill proof: the edit modal carries the userId-matched entry's
    // content, never the stranger's.
    expect((screen.getByLabelText('عنوان المشاركة') as HTMLInputElement).value).toBe('مشاركتي أنا');
    expect((screen.getByLabelText('الوصف / المحتوى') as HTMLTextAreaElement).value).toBe('نصّ مشاركتي الحقيقي المربوط بمعرّفي.');
  });

  it('a guest (null user) gets no entry even when third-party entries exist — the truthy userId guard blocks undefined === undefined', () => {
    useAuthStore.setState({ user: null });
    renderDetail();
    // A naive `e.userId === user?.id` would match the stranger row
    // (undefined === undefined) and flip the CTA to «تعديل مشاركتي».
    expect(screen.getByRole('button', { name: /شارك الآن/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /تعديل مشاركتي/ })).toBeNull();
  });
});

describe('CompetitionsIndexPage — URL-synced status filter (r157 w2-F6)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: viewer });
  });

  it('reflects ?status= from the URL on load — only that status renders, its pill is pressed', () => {
    renderIndexAt('/competitions?status=JUDGED');
    expect(screen.getByText('مسابقة البحوث المحكّمة')).toBeInTheDocument();
    expect(screen.queryByText('مسابقة الابتكار المفتوحة')).toBeNull();
    expect(screen.getByRole('button', { name: 'تمّ التحكيم' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'الكل' })).toHaveAttribute('aria-pressed', 'false');
  });
});
