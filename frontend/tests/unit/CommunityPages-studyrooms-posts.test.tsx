/**
 * r180-F3 — the community page's two new tabs (the CommunityPages.test
 * pattern: the resource hooks are mocked at the module boundary; only
 * the components under test render live).
 *
 *   «غرف الدراسة» — room cards (name/topic/owner/members/date), the
 *   per-isMember join/leave buttons, the «غرفتك» badge on the viewer's
 *   own room, and the header's «إنشاء غرفة» action + modal (zod
 *   required-name pin, the payload contract).
 *   «المنشورات»  — the SocialPage feed port on the community surface:
 *   composer, post cards with hashtags, the trending rail, and the
 *   like wiring.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAuthStore } from '../../src/stores/auth.store';

const h = vi.hoisted(() => ({
  /* r1 — someone else's room, the viewer is NOT a member → «انضمام».
   * r2 — the viewer's OWN room and a member → «مغادرة» + «غرفتك». */
  rooms: [
    {
      id: 'r1',
      name: 'مجموعة مراجعة الشبكات',
      topic: 'مراجعة فصل التوجيه قبل الاختبار',
      createdAt: '2026-10-01T09:00:00.000Z',
      owner: { id: 'u2', firstName: 'ليلى', lastName: 'بن عامر', avatarInitials: 'لع' },
      _count: { members: 4 },
      isMember: false,
    },
    {
      id: 'r2',
      name: 'غرفة الخوارزميات',
      topic: null,
      createdAt: '2026-10-02T09:00:00.000Z',
      owner: { id: 't1', firstName: 'أحمد', lastName: 'المهدي', avatarInitials: 'أم' },
      _count: { members: 7 },
      isMember: true,
    },
  ],
  roomsQuery: { data: [/* filled in beforeEach via h.rooms */] as unknown[], isPending: false, isError: false, error: null, refetch: vi.fn() },
  join: { mutate: vi.fn(), isPending: false, variables: undefined },
  leave: { mutate: vi.fn(), isPending: false, variables: undefined },
  createRoom: { mutateAsync: vi.fn(async () => ({})), isPending: false, isError: false },
  posts: {
    data: [
      {
        id: 'p1',
        body: 'منشور عن الشبكات',
        hashtags: ['شبكات'],
        imageUrl: null,
        createdAt: new Date(Date.now() - 3_600_000).toISOString(),
        author: { id: 'u1', firstName: 'خالد', lastName: 'المصراتي', avatarColor: null, avatarInitials: null },
        _count: { comments: 1, reactions: 3 },
        viewerReacted: false,
      },
      {
        id: 'p2',
        body: 'منشور عن الخوارزميات',
        hashtags: ['شبكات', 'خوارزميات'],
        imageUrl: null,
        createdAt: new Date(Date.now() - 1_800_000).toISOString(),
        author: { id: 'u2', firstName: 'ليلى', lastName: 'بن عامر', avatarColor: null, avatarInitials: null },
        _count: { comments: 0, reactions: 0 },
        viewerReacted: true,
      },
    ],
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  },
  createPost: { mutate: vi.fn(), isPending: false, isError: false },
  react: { mutate: vi.fn(), isPending: false, isError: false, variables: undefined },
}));

vi.mock('../../src/hooks/useResources', () => ({
  // The page's own hooks (the CommunityPages.test set):
  useAnnouncements: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useCompetitions: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useCampusEvents: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  useRsvpEvent: () => ({ mutate: vi.fn(), isPending: false, variables: undefined }),
  useCreateAnnouncement: () => ({ mutateAsync: vi.fn(async () => ({})), isPending: false, isError: false }),
  useCreateCampusEvent: () => ({ mutateAsync: vi.fn(async () => ({})), isPending: false, isError: false }),
  useFaculties: () => ({ data: [], isPending: false, isError: false }),
  useMyPermissions: () => ({ data: { capabilities: ['ANNOUNCE_FACULTY', 'EVENTS_RUN'] }, isPending: false, isError: false }),
  useTeacherOfferings: () => ({ data: [], isPending: false, isError: false }),
  // r180-F3: the two new panels' hooks:
  useStudyRooms: () => h.roomsQuery,
  useCreateStudyRoom: () => h.createRoom,
  useJoinStudyRoom: () => h.join,
  useLeaveStudyRoom: () => h.leave,
  usePosts: () => h.posts,
  useCreatePost: () => h.createPost,
  useReactToPost: () => h.react,
}));

import CommunityPage from '../../src/pages/community/CommunityPages';

/* The posts panel's inline un-like mutation calls useQueryClient (the
   SocialPage logic) — a client must wrap the tree (the
   MorePages-social.test pattern). */
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <CommunityPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  h.roomsQuery.data = h.rooms;
  h.join.mutate.mockClear();
  h.leave.mutate.mockClear();
  h.createRoom.mutateAsync.mockClear();
  h.react.mutate.mockClear();
  sessionStorage.clear();
  useAuthStore.setState({
    user: { id: 't1', email: 't1@mdrk.dev', firstName: 'أحمد', lastName: 'المهدي', role: 'TEACHER' },
  });
});

describe('CommunityPage — the two r180 tabs exist in the bar', () => {
  it('carries «غرف الدراسة» and «المنشورات» tabs (roving tabindex intact)', () => {
    renderPage();
    const roomsTab = screen.getByRole('tab', { name: /غرف الدراسة/ });
    const postsTab = screen.getByRole('tab', { name: /المنشورات/ });
    expect(roomsTab).toBeInTheDocument();
    expect(postsTab).toBeInTheDocument();
    expect(roomsTab).toHaveAttribute('aria-selected', 'false');
  });
});

describe('CommunityPage — «غرف الدراسة» tab', () => {
  it('renders the room cards: name, topic, owner, member count, and the per-isMember buttons', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /غرف الدراسة/ }));

    // r1 — someone else's room, not a member → «انضمام».
    const joinBtn = screen.getByRole('button', { name: 'انضمام إلى مجموعة مراجعة الشبكات' });
    expect(joinBtn).toBeInTheDocument();
    expect(screen.getByText('مراجعة فصل التوجيه قبل الاختبار')).toBeInTheDocument();
    expect(screen.getByText(/أنشأها ليلى بن عامر/)).toBeInTheDocument();
    expect(screen.getByText('4 أعضاء')).toBeInTheDocument();

    // r2 — the viewer's own room and a member → «مغادرة» + «غرفتك».
    expect(screen.getByRole('button', { name: 'مغادرة غرفة الخوارزميات — أنت مالكها' })).toBeInTheDocument();
    expect(screen.getByText('غرفتك')).toBeInTheDocument();
  });

  it('the header shows «إنشاء غرفة» on the rooms tab and it opens the modal', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /غرف الدراسة/ }));
    fireEvent.click(screen.getByRole('button', { name: /إنشاء غرفة/ }));
    expect(screen.getByRole('dialog', { name: 'غرفة دراسة جديدة' })).toBeInTheDocument();
    expect(screen.getByLabelText('اسم الغرفة')).toBeInTheDocument();
    expect(screen.getByLabelText('الموضوع (اختياري)')).toBeInTheDocument();
  });

  it('join/leave fire their mutations with { roomId, name } (the toast + invalidation live in the hooks)', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /غرف الدراسة/ }));
    fireEvent.click(screen.getByRole('button', { name: 'انضمام إلى مجموعة مراجعة الشبكات' }));
    expect(h.join.mutate).toHaveBeenCalledWith({ roomId: 'r1', name: 'مجموعة مراجعة الشبكات' });
    fireEvent.click(screen.getByRole('button', { name: 'مغادرة غرفة الخوارزميات — أنت مالكها' }));
    expect(h.leave.mutate).toHaveBeenCalledWith({ roomId: 'r2', name: 'غرفة الخوارزميات' });
  });

  it('create-room modal: a blank name is refused by zod; a valid name posts the payload contract', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /غرف الدراسة/ }));
    fireEvent.click(screen.getByRole('button', { name: /إنشاء غرفة/ }));

    // Blank submit → the required-name error, no mutation fired.
    fireEvent.click(screen.getByRole('button', { name: 'إنشاء الغرفة' }));
    await waitFor(() => expect(screen.getByText('اسم الغرفة مطلوب')).toBeInTheDocument());
    expect(h.createRoom.mutateAsync).not.toHaveBeenCalled();

    // Filled name, empty optional topic → { name, topic: undefined }.
    fireEvent.change(screen.getByLabelText('اسم الغرفة'), { target: { value: 'غرفة قواعد البيانات' } });
    fireEvent.click(screen.getByRole('button', { name: 'إنشاء الغرفة' }));
    await waitFor(() => expect(h.createRoom.mutateAsync).toHaveBeenCalledTimes(1));
    expect(h.createRoom.mutateAsync).toHaveBeenCalledWith({ name: 'غرفة قواعد البيانات', topic: undefined });
    // Success closes the modal (the invalidate + toast live in the hook).
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'غرفة دراسة جديدة' })).toBeNull());
  });
});

describe('CommunityPage — «المنشورات» tab (the SocialPage feed port)', () => {
  it('renders the composer, the post cards, the hashtags, and the trending rail', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /المنشورات/ }));

    expect(screen.getByLabelText('اكتب منشوراً جديداً')).toBeInTheDocument();
    expect(screen.getByText('منشور عن الشبكات')).toBeInTheDocument();
    expect(screen.getByText('خالد المصراتي')).toBeInTheDocument();
    // Hashtag chips + the derived trending rail (شبكات ×2, خوارزميات ×1).
    expect(screen.getAllByText('#شبكات').length).toBeGreaterThan(0);
    expect(screen.getByText('الأكثر تداولاً')).toBeInTheDocument();
    expect(within(screen.getByTitle('#شبكات')).getByText('#شبكات')).toBeInTheDocument();
  });

  it('the pressed heart seeds from viewerReacted and clicking the fresh heart sends the like', () => {
    renderPage();
    fireEvent.click(screen.getByRole('tab', { name: /المنشورات/ }));

    const pressed = within(screen.getByText('منشور عن الخوارزميات').closest('article') as HTMLElement)
      .getByRole('button', { name: 'إزالة الإعجاب' });
    expect(pressed).toHaveAttribute('aria-pressed', 'true');

    const fresh = within(screen.getByText('منشور عن الشبكات').closest('article') as HTMLElement)
      .getByRole('button', { name: 'أعجبني بهذا المنشور' });
    fireEvent.click(fresh);
    expect(h.react.mutate).toHaveBeenCalledWith(
      { postId: 'p1', kind: 'like' },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });
});
