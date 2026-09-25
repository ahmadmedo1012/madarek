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
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
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

beforeEach(() => {
  h.react.mutate.mockClear();
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
    render(<SocialPage />);

    /* 22-c (A5 P2-2): the pressed label names the STATE («أعجبك هذا
       المنشور») + aria-disabled — it no longer promises an un-like
       the handler refuses to perform (was «إزالة الإعجاب»). */
    const reacted = within(articleOf('منشور تفاعلت معه سابقاً')).getByRole('button', {
      name: 'أعجبك هذا المنشور',
    });
    expect(reacted).toHaveAttribute('aria-pressed', 'true');
    expect(reacted).toHaveAttribute('aria-disabled', 'true');

    // The un-reacted post stays pressable.
    const fresh = within(articleOf('منشور لم أتفاعل معه')).getByRole('button', {
      name: 'أعجبني بهذا المنشور',
    });
    expect(fresh).toHaveAttribute('aria-pressed', 'false');
    expect(fresh).not.toHaveAttribute('aria-disabled');
  });

  it('does NOT double-count the server reaction into the displayed count', () => {
    render(<SocialPage />);
    // 3 reactions already include the viewer's like — the optimistic +1
    // is reserved for THIS session's clicks only. formatNum drives the
    // rendered digits, so the pin reads exactly what the UI renders.
    expect(within(articleOf('منشور تفاعلت معه سابقاً')).getByText(formatNum(3))).toBeInTheDocument();
    expect(within(articleOf('منشور لم أتفاعل معه')).getByText(formatNum(0))).toBeInTheDocument();
  });

  it('clicking like on an un-reacted post sends the reaction', () => {
    render(<SocialPage />);
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

  it('a server-reacted post cannot be liked again (the guard reads server truth)', () => {
    render(<SocialPage />);
    fireEvent.click(within(articleOf('منشور تفاعلت معه سابقاً')).getByRole('button', { name: 'أعجبك هذا المنشور' }));
    expect(h.react.mutate).not.toHaveBeenCalled();
  });
});
