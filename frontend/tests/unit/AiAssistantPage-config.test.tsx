/**
 * P4 — AiAssistantPage honest-surface pins (the /ai/config contract).
 *
 * The page must state WHICH engine is answering — a template composer
 * is NOT an LLM, and an LLM badge on template replies (or the local
 * copy next to a real model) would be a lie:
 *  · local mode (the default): the composer greeting + the «مساعد
 *    تحليليّ محليّ، لا نموذج لغويّ خارجيّ» subtitle + a plain AI badge.
 *  · openai mode: the LLM greeting + subtitle, and the badge names the
 *    real model string.
 *  · pending/error: the LOCAL copy renders (the honest default when
 *    the mode is unverifiable — never a claim).
 *  · the user's own turns never regress when the greeting re-derives:
 *    once a message exists, the state-owned transcript takes over.
 *
 * Hooks are mocked at the useResources boundary (house pattern); the
 * auth store is seeded per-role like TeacherPages tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AiAssistantPage from '../../src/pages/student/AiAssistantPage';
import { useAuthStore, type AuthUser } from '../../src/stores/auth.store';

const mocks = vi.hoisted(() => ({
  chat: { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() },
  config: { data: undefined as undefined | { provider: 'local' | 'openai'; model: string | null }, isPending: true, isError: false },
  gaps: { data: [], isPending: false, isError: false, refetch: () => undefined },
  // r164g: the conversations surface the page now consumes (all mocked
  // at the useResources boundary so jsdom never needs a QueryClient).
  conversations: {
    data: [] as Array<{ id: string; title: string | null; createdAt: string }>,
    isPending: false,
    isError: false,
    refetch: () => undefined,
  },
  delConversation: { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() },
  fetchMessages: vi.fn(async (_id: string) => [] as Array<{ id: string; role: 'USER' | 'ASSISTANT' | 'SYSTEM'; content: string; createdAt: string }>),
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    useAiChat: () => mocks.chat,
    useAiConfig: () => mocks.config,
    useGaps: () => mocks.gaps,
    useAiConversations: () => mocks.conversations,
    useDeleteAiConversation: () => mocks.delConversation,
    fetchAiConversationMessages: (id: string) => mocks.fetchMessages(id),
  };
});

const STUDENT: AuthUser = {
  id: 'u1', role: 'STUDENT', email: 's@test.dev',
  firstName: 'طالب', lastName: 'تجريبي', avatarInitials: 'تج',
};

beforeEach(() => {
  useAuthStore.setState({ user: STUDENT });
  // jsdom ships no Element#scrollTo — the page's transcript auto-scroll
  // is real browser behavior; stub it (the ScrollProgress-test idiom of
  // shaping only what jsdom lacks).
  window.HTMLElement.prototype.scrollTo = () => undefined;
  mocks.chat = { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() };
  mocks.gaps = { data: [], isPending: false, isError: false, refetch: () => undefined };
  mocks.conversations = { data: [], isPending: false, isError: false, refetch: () => undefined };
  mocks.delConversation = { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() };
  mocks.fetchMessages = vi.fn(async () => []);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <AiAssistantPage />
    </MemoryRouter>,
  );
}

describe('AiAssistantPage — the honest-surface config (P4)', () => {
  it('local mode: the composer greeting + local subtitle + plain AI badge', () => {
    mocks.config = { data: { provider: 'local', model: null }, isPending: false, isError: false };
    renderPage();

    expect(screen.getByText(/أحلّل بيانات إتقانك محليّاً/)).toBeInTheDocument();
    expect(
      screen.getByText('يحلّل بيانات إتقانك محليّاً ويقترح خطوة مذاكرة تالية — مساعد تحليليّ محليّ، لا نموذج لغويّ خارجيّ.'),
    ).toBeInTheDocument();
    // The badge stays generic — no model name to claim.
    expect(screen.getByText('AI')).toBeInTheDocument();
    expect(screen.queryByText(/نموذج لغويّ حقيقيّ/)).toBeNull();
  });

  it('openai mode: the LLM greeting + LLM subtitle, and the badge names the real model', () => {
    mocks.config = { data: { provider: 'openai', model: 'test-model-name' }, isPending: false, isError: false };
    renderPage();

    expect(screen.getByText(/المدعوم بنموذج لغويّ حقيقيّ/)).toBeInTheDocument();
    expect(screen.getByText(/مساعدك الدراسيّ مدعوم بنموذج لغويّ حقيقيّ يرى بيانات إتقانك/)).toBeInTheDocument();
    expect(screen.getByText('test-model-name')).toBeInTheDocument();
    expect(screen.queryByText('AI')).toBeNull();
  });

  it('unknown (pending) renders the LOCAL copy — never claims an LLM it cannot verify', () => {
    mocks.config = { data: undefined, isPending: true, isError: false };
    renderPage();
    expect(screen.getByText(/أحلّل بيانات إتقانك محليّاً/)).toBeInTheDocument();
    expect(screen.queryByText(/نموذج لغويّ حقيقيّ/)).toBeNull();
  });

  it('config error also renders the LOCAL copy (honest default)', () => {
    mocks.config = { data: undefined, isPending: false, isError: true };
    renderPage();
    expect(screen.getByText(/أحلّل بيانات إتقانك محليّاً/)).toBeInTheDocument();
  });

  it('the greeting DERIVES with the config — no flash, no state surgery (flips after resolve)', async () => {
    // Start pending, then resolve to openai AFTER mount.
    mocks.config = { data: undefined, isPending: true, isError: false };
    renderPage();
    expect(screen.getByText(/أحلّل بيانات إتقانك محليّاً/)).toBeInTheDocument();

    // The derived transcript flips the greeting the moment the config lands
    // — but only while the user hasn't sent anything.
    mocks.config = { data: { provider: 'openai', model: 'm1' }, isPending: false, isError: false };
    renderPage();
    expect(screen.getByText(/المدعوم بنموذج لغويّ حقيقيّ/)).toBeInTheDocument();
  });

  it('once the user sends a message, the transcript is state-owned — a config flip cannot rewrite history', async () => {
    mocks.config = { data: { provider: 'local', model: null }, isPending: false, isError: false };
    mocks.chat.mutateAsync.mockResolvedValue({ conversationId: 'c1', reply: 'جواب' });
    renderPage();

    fireEvent.change(screen.getByLabelText('اكتب سؤالك للمساعد'), { target: { value: 'سؤالي' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));

    await waitFor(() => {
      expect(mocks.chat.mutateAsync).toHaveBeenCalledWith({ conversationId: undefined, message: 'سؤالي' });
    });
    await screen.findByText('جواب');

    // The user turn + the reply are in the log; the greeting stays the
    // local one it rendered with (no retroactive rewrite).
    expect(screen.getByText('سؤالي')).toBeInTheDocument();
    expect(screen.getByText(/أحلّل بيانات إتقانك محليّاً/)).toBeInTheDocument();
  });

  it('a non-student gets the non-student greeting in BOTH modes (no mastery data either way)', () => {
    useAuthStore.setState({ user: { ...STUDENT, role: 'TEACHER' as const } });
    mocks.config = { data: { provider: 'openai', model: 'm' }, isPending: false, isError: false };
    renderPage();
    expect(screen.getByText(/مساعدك المدعوم بنموذج لغويّ حقيقيّ/)).toBeInTheDocument();
    expect(screen.queryByText(/أرى بيانات إتقانك/)).toBeNull();
  });

  it('r164g context honesty: the «واعٍ بمستوى إتقانك» chip rides the STUDENT contract only', () => {
    // Students: mastery context IS composed into the prompt (r160) —
    // the awareness is real, so the chip states it.
    mocks.config = { data: { provider: 'local', model: null }, isPending: false, isError: false };
    renderPage();
    expect(screen.getByText('واعٍ بمستوى إتقانك')).toBeInTheDocument();

    cleanup();
    // Teachers/other roles: no mastery rows exist, the generic prompt
    // carries none — no chip (inventing awareness would be a lie).
    useAuthStore.setState({ user: { ...STUDENT, role: 'TEACHER' as const } });
    renderPage();
    expect(screen.queryByText('واعٍ بمستوى إتقانك')).toBeNull();
  });
});
