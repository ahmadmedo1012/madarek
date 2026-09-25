/**
 * 16-E7 — community page pin tests.
 *
 * Covers the wave-16 batch E7 fixes on CommunityPages.tsx:
 *   - EventCard RSVP trio: the «لن أحضر» (NO) button sends the third
 *     RsvpStatus value the backend already accepts (15-a P1-1).
 *   - CompetitionCard deadline chip: an OPEN competition with <24 h left
 *     renders the ends-in-hours label, never the «مغلقة» badge (15-h P1-4).
 *   - Announcement create modal: the OFFERING scope option + taught-
 *     offerings target select for teachers (15-a P1-2).
 *   - Discard guard: Esc on a dirty long-form modal stacks the
 *     «تعديلات غير محفوظة» confirm instead of dropping the draft, and a
 *     pristine modal still closes instantly (15-e P2-3).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { useAuthStore } from '../../src/stores/auth.store';

const h = vi.hoisted(() => {
  const now = Date.now();
  return {
    rsvpMutate: vi.fn(),
    /* 5.5 h ahead — the card floors full hours at render, so the label
       is robustly «تنتهي بعد 5 ساعات» for any render within ~30 min. */
    competition: {
      id: 'comp1',
      title: 'تحدي الذكاء الاصطناعي',
      description: 'مسابقة في تطبيقات الذكاء الاصطناعي مفتوحة لجميع الطلاب.',
      category: 'برمجة',
      prize: 'شهادة تقدير',
      deadline: new Date(now + 5.5 * 3600_000).toISOString(),
      status: 'OPEN' as const,
      iconEmoji: '🏆',
      themeColor: null,
      organizer: { firstName: 'سالم', lastName: 'الطاهر', role: 'TEACHER' },
      _count: { entries: 12 },
    },
    event: {
      id: 'ev1',
      title: 'ملتقى الابتكار الطلابي',
      description: 'لقاء مفتوح لعرض المشاريع الطلابية ومناقشتها.',
      location: 'مدرَج الكلّيّة',
      startsAt: new Date(now + 48 * 3600_000).toISOString(),
      endsAt: new Date(now + 50 * 3600_000).toISOString(),
      capacity: 100,
      iconEmoji: '📅',
      themeColor: null,
      organizer: { firstName: 'سالم', lastName: 'الطاهر', role: 'TEACHER' },
      _count: { rsvps: 43 },
    },
    offerings: [
      {
        id: 'off1',
        term: '2026-1',
        room: null,
        capacity: 60,
        course: { id: 'cs101', code: 'CS101', name: 'مقدمة في الحاسوب', iconEmoji: null, themeColor: null, credits: 3 },
        _count: { enrollments: 40, assignments: 2, lectures: 10, examTemplates: 1 },
        schedule: [],
      },
    ],
  };
});

vi.mock('../../src/hooks/useResources', () => ({
  useAnnouncements: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useCompetitions: () => ({ data: [h.competition], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useCampusEvents: () => ({ data: [h.event], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useRsvpEvent: () => ({ mutate: h.rsvpMutate, isPending: false, variables: undefined }),
  useCreateAnnouncement: () => ({ mutateAsync: vi.fn(async () => ({})), isPending: false, isError: false }),
  useCreateCampusEvent: () => ({ mutateAsync: vi.fn(async () => ({})), isPending: false, isError: false }),
  useFaculties: () => ({ data: [], isPending: false, isError: false }),
  useMyPermissions: () => ({ data: { capabilities: ['ANNOUNCE_FACULTY', 'EVENTS_RUN'] }, isPending: false, isError: false }),
  useTeacherOfferings: () => ({ data: h.offerings, isPending: false, isError: false }),
}));

import CommunityPage from '../../src/pages/community/CommunityPages';

function renderPage() {
  return render(
    <MemoryRouter>
      <CommunityPage />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  h.rsvpMutate.mockClear();
  useAuthStore.setState({
    user: { id: 't1', email: 't1@mdrk.dev', firstName: 'أحمد', lastName: 'المهدي', role: 'TEACHER' },
  });
});

describe('CommunityPage — EventCard RSVP trio (15-a P1-1)', () => {
  it('renders all three RSVP options, including «لن أحضر»', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /الفعاليات/ }));
    expect(screen.getByRole('button', { name: 'سأحضر' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ربما' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'لن أحضر' })).toBeInTheDocument();
  });

  it('sends status NO when «لن أحضر» is pressed', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /الفعاليات/ }));
    fireEvent.click(screen.getByRole('button', { name: 'لن أحضر' }));
    expect(h.rsvpMutate).toHaveBeenCalledTimes(1);
    expect(h.rsvpMutate).toHaveBeenCalledWith(
      { eventId: 'ev1', status: 'NO' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });
});

describe('CommunityPage — CompetitionCard deadline chip (15-h P1-4)', () => {
  it('an OPEN competition with hours left shows the ends-in-hours label, never «مغلقة»', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /المسابقات/ }));
    expect(screen.getByText('تنتهي بعد 5 ساعات')).toBeInTheDocument();
    expect(screen.queryByText('مغلقة')).toBeNull();
  });
});

describe('CommunityPage — announcement OFFERING scope (15-a P1-2)', () => {
  it('offers the «مقرر» scope to a teacher and lists their taught offerings as targets', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /إعلان جديد/ }));
    const scopeSelect = screen.getByLabelText('النطاق');
    expect(within(scopeSelect).getByRole('option', { name: 'مقرر' })).toBeInTheDocument();
    fireEvent.change(scopeSelect, { target: { value: 'OFFERING' } });
    const target = screen.getByLabelText('المقرر');
    expect(within(target).getByRole('option', { name: 'مقدمة في الحاسوب (CS101)' })).toBeInTheDocument();
  });
});

describe('CommunityPage — discard guard on the announcement modal (15-e P2-3)', () => {
  it('Esc on a dirty draft stacks the discard confirm instead of closing', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /إعلان جديد/ }));
    fireEvent.change(screen.getByLabelText('العنوان'), { target: { value: 'إعلان هامّ' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    // The discard confirm stacks on top; the create form stays open.
    expect(screen.getByRole('dialog', { name: 'تعديلات غير محفوظة' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'إعلان جديد' })).toBeInTheDocument();
    // Cancelling the discard returns to editing with the draft intact.
    fireEvent.click(screen.getByRole('button', { name: 'متابعة التحرير' }));
    expect(screen.queryByRole('dialog', { name: 'تعديلات غير محفوظة' })).toBeNull();
    expect(screen.getByRole('dialog', { name: 'إعلان جديد' })).toBeInTheDocument();
    expect((screen.getByLabelText('العنوان') as HTMLInputElement).value).toBe('إعلان هامّ');
  });

  it('still closes instantly on Esc when the form is pristine', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /إعلان جديد/ }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog', { name: 'إعلان جديد' })).toBeNull();
  });
});
