/**
 * 18-F2 — SocialPage reaction pins: the viewer's own like state.
 *
 * 18-G made GET /posts carry `viewerReacted` (the viewer has any like/save
 * row on the post); 18-F2 seeds the heart's initial state from it — the
 * old session-local `useState(new Set())` un-liked the UI on every reload
 * while the server reaction persisted (audit 15-d P2-13-reaction).
 *
 * The hooks are mocked at the module boundary (the CommunityPages.test
 * pattern — SocialPage is one export of a 1,300-line page file); only the
 * hooks its render path actually calls carry live state.
 *
 * 5-C5 additions:
 *   - The pressed heart is a real un-like toggle now (5-B1's
 *     DELETE /posts/:id/react hand-off) — «إزالة الإعجاب» fires the
 *     DELETE with { kind: 'like' } and optimistically un-presses.
 *     lib/api is mocked so the inline mutation resolves in jsdom.
 *   - Composer draft persistence (A12 P3-3): the draft survives a
 *     remount via sessionStorage, and the counter row says so.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SocialPage } from '../../src/pages/student/MorePages';
import { useAuthStore } from '../../src/stores/auth.store';
import { formatNum } from '../../src/utils/numbers';

const h = vi.hoisted(() => ({
  posts: {
    data: [
      {
        id: 'p1',
        body: 'منشور تفاعلت معه سابقاً',
        hashtags: [],
        imageUrl: null,
        createdAt: new Date(Date.now() - 3_600_000).toISOString(),
        author: { id: 'u1', firstName: 'خالد', lastName: 'المصراتي', avatarColor: null, avatarInitials: null },
        _count: { comments: 1, reactions: 3 },
        viewerReacted: true,
      },
      {
        id: 'p2',
        body: 'منشور لم أتفاعل معه',
        hashtags: [],
        imageUrl: null,
        createdAt: new Date(Date.now() - 1_800_000).toISOString(),
        author: { id: 'u2', firstName: 'ليلى', lastName: 'بن عامر', avatarColor: null, avatarInitials: null },
        _count: { comments: 0, reactions: 0 },
        viewerReacted: false,
      },
    ],
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  },
  createPost: { mutate: vi.fn(), isPending: false, isError: false },
  react: { mutate: vi.fn(), isPending: false, isError: false, variables: undefined },
  /* 5-C5: the un-like rides the real DELETE route — api.delete is mocked
   * so SocialPage's inline mutation resolves against jsdom. */
  apiDelete: vi.fn(async () => ({ data: { data: { ok: true } } })),
}));

vi.mock('../../src/hooks/useResources', () => ({
  // SocialPage's live hooks:
  usePosts: () => h.posts,
  useCreatePost: () => h.createPost,
  useReactToPost: () => h.react,
  // The rest of MorePages' named imports — stubbed at the module
  // boundary; only the component under test renders in this file.
  useMyAchievements: () => ({ data: [], isPending: false, isError: false }),
  useLeaderboard: () => ({ data: [], isPending: false, isError: false }),
  useMySkills: () => ({ data: [], isPending: false, isError: false }),
  useStudentResults: () => ({ data: null, isPending: false, isError: false }),
  useMyEnrollments: () => ({ data: [], isPending: false, isError: false }),
  useNotifications: () => ({ data: [], isPending: false, isError: false }),
  useArExperiences: () => ({ data: [], isPending: false, isError: false }),
  useStudentMaterials: () => ({ data: [], isPending: false, isError: false }),
  useFaculties: () => ({ data: [], isPending: false, isError: false }),
  useStudentDashboard: () => ({ data: null, isPending: false, isError: false }),
  useTrainingMe: () => ({ data: null, isPending: false, isError: false }),
}));

vi.mock('../../src/lib/api', () => ({
  api: {
    delete: h.apiDelete,
    post: vi.fn(),
    get: vi.fn(),
  },
  unwrap: (promise: Promise<{ data: { data: unknown } }>) =>
    promise.then((res) => res.data.data),
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
});

function renderPage() {
  return render(
    <QueryClientProvider client={queryClient}>
      <SocialPage />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  h.react.mutate.mockClear();
  h.apiDelete.mockClear();
  sessionStorage.clear();
  act(() => {
    useAuthStore.setState({
      user: {
        id: 'st1',
        email: 'amna@zu.edu.ly',
        firstName: 'آمنة',
        lastName: 'العبيدي',
        role: 'STUDENT',
      },
    });
  });
});

function articleOf(body: string) {
  return screen.getByText(body).closest('article') as HTMLElement;
}

describe('SocialPage — viewerReacted (the honest heart state)', () => {
  it('starts the heart PRESSED on a post the viewer already reacted to (server truth)', () => {
    renderPage();

    /* 5-C5 (5-B1 hand-off): the pressed label names the ACTION again —
       «إزالة الإعجاب» — because DELETE /posts/:id/react actually
       performs it now (the 22-c aria-disabled state-name was the honest
       label only while no un-like route existed). */
    const reacted = within(articleOf('منشور تفاعلت معه سابقاً')).getByRole('button', {
      name: 'إزالة الإعجاب',
    });
    expect(reacted).toHaveAttribute('aria-pressed', 'true');
    expect(reacted).not.toHaveAttribute('aria-disabled');

    // The un-reacted post stays pressable.
    const fresh = within(articleOf('منشور لم أتفاعل معه')).getByRole('button', {
      name: 'أعجبني بهذا المنشور',
    });
    expect(fresh).toHaveAttribute('aria-pressed', 'false');
    expect(fresh).not.toHaveAttribute('aria-disabled');
  });

  it('does NOT double-count the server reaction into the displayed count', () => {
    renderPage();
    // 3 reactions already include the viewer's like — the optimistic +1
    // is reserved for THIS session's clicks only. formatNum drives the
    // rendered digits, so the pin reads exactly what the UI renders.
    expect(within(articleOf('منشور تفاعلت معه سابقاً')).getByText(formatNum(3))).toBeInTheDocument();
    expect(within(articleOf('منشور لم أتفاعل معه')).getByText(formatNum(0))).toBeInTheDocument();
  });

  it('clicking like on an un-reacted post sends the reaction', () => {
    renderPage();
    const fresh = within(articleOf('منشور لم أتفاعل معه')).getByRole('button', {
      name: 'أعجبني بهذا المنشور',
    });
    fireEvent.click(fresh);
    expect(h.react.mutate).toHaveBeenCalledTimes(1);
    expect(h.react.mutate).toHaveBeenCalledWith(
      { postId: 'p2', kind: 'like' },
      expect.objectContaining({ onError: expect.any(Function) }),
    );
  });

  it('clicking the PRESSED heart un-likes — DELETE /posts/:id/react with { kind: "like" } (5-B1 hand-off)', async () => {
    renderPage();
    const pressed = within(articleOf('منشور تفاعلت معه سابقاً')).getByRole('button', {
      name: 'إزالة الإعجاب',
    });
    fireEvent.click(pressed);
    // Optimistic un-press + −1 land immediately (rollback only on error).
    expect(pressed).toHaveAttribute('aria-pressed', 'false');
    expect(within(articleOf('منشور تفاعلت معه سابقاً')).getByText(formatNum(2))).toBeInTheDocument();
    // The mutationFn itself runs on a microtask — wait for the route call.
    await waitFor(() => expect(h.apiDelete).toHaveBeenCalledTimes(1));
    expect(h.apiDelete).toHaveBeenCalledWith('/posts/p1/react', { data: { kind: 'like' } });
  });

  it('an un-reacted heart cannot be un-liked (the guard reads the effective state)', () => {
    renderPage();
    fireEvent.click(within(articleOf('منشور لم أتفاعل معه')).getByRole('button', { name: 'أعجبني بهذا المنشور' }));
    expect(h.apiDelete).not.toHaveBeenCalled();
  });
});

describe('SocialPage — composer draft persistence (A12 P3-3)', () => {
  it('the draft survives a remount via sessionStorage and announces it', () => {
    const { unmount } = renderPage();
    const composer = screen.getByLabelText('اكتب منشوراً جديداً');
    fireEvent.change(composer, { target: { value: 'مسودة اختبار 5-C5' } });
    // The counter row says the draft is being kept.
    expect(screen.getByText('مسودة محفوظة تلقائيّاً')).toBeInTheDocument();
    unmount();

    // A remount (reload or SPA nav-back) restores the draft — the audit
    // measured it lost on BOTH paths before.
    renderPage();
    expect((screen.getByLabelText('اكتب منشوراً جديداً') as HTMLTextAreaElement).value).toBe('مسودة اختبار 5-C5');
  });

  it('an empty composer shows no saved-draft note', () => {
    renderPage();
    expect(screen.queryByText('مسودة محفوظة تلقائيّاً')).toBeNull();
  });
});
