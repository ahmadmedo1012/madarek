/**
 * r166d (WS-F5) — per-turn engine attribution pins
 * (frontend/src/pages/student/AiAssistantPage.tsx).
 *
 * The boot-level badge (from /ai/config) states which engine is
 * answering NOW; the per-turn tag states which engine produced a
 * SPECIFIC reply — the two can differ across a mid-conversation
 * redeploy, and a turn's provenance must never be rewritten by a
 * later config flip. Pinned here:
 *  · an openai turn renders its REAL model string as a muted mono tag
 *    inside the assistant bubble (existing utility classes only);
 *  · a local turn names the composer honestly (gap-aware-composer);
 *  · a FAILED exchange renders no tag (nothing was produced);
 *  · an old-backend envelope (no engine/model fields) degrades to an
 *    untagged bubble — additive contract, no breakage;
 *  · the tag rides the message row, so a later config flip does not
 *    rewrite the provenance of earlier turns.
 *
 * Hooks are mocked at the useResources boundary (the
 * AiAssistantPage-config.test.ts house pattern).
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
  conversations: {
    data: [] as Array<{ id: string; title: string | null; createdAt: string }>,
    isPending: false,
    isError: false,
    refetch: () => undefined,
  },
  delConversation: { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() },
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
    fetchAiConversationMessages: () => Promise.resolve([]),
  };
});

const STUDENT: AuthUser = {
  id: 'u1', role: 'STUDENT', email: 's@test.dev',
  firstName: 'طالب', lastName: 'تجريبي', avatarInitials: 'تج',
};

const REPLY_OPENAI = {
  conversationId: 'c1',
  reply: 'جواب النموذج الحقيقيّ',
  engine: 'openai' as const,
  model: 'test-model-name',
};
const REPLY_LOCAL = {
  conversationId: 'c2',
  reply: 'جواب الملحّن المحليّ',
  engine: 'local' as const,
  model: 'gap-aware-composer',
};

beforeEach(() => {
  useAuthStore.setState({ user: STUDENT });
  window.HTMLElement.prototype.scrollTo = () => undefined;
  mocks.chat = { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() };
  mocks.conversations = { data: [], isPending: false, isError: false, refetch: () => undefined };
  mocks.delConversation = { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() };
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

async function send(message: string) {
  fireEvent.change(screen.getByLabelText('اكتب سؤالك للمساعد'), { target: { value: message } });
  fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
  await waitFor(() => {
    expect(mocks.chat.mutateAsync).toHaveBeenCalled();
  });
}

describe('AiAssistantPage — per-turn engine tag (r166d)', () => {
  it('an openai turn renders its real model string as a muted mono tag inside the bubble', async () => {
    mocks.config = { data: { provider: 'openai', model: 'test-model-name' }, isPending: false, isError: false };
    mocks.chat.mutateAsync.mockResolvedValue(REPLY_OPENAI);
    renderPage();

    await send('سؤالي');
    await screen.findByText('جواب النموذج الحقيقيّ');

    const tag = screen.getByText('test-model-name', { selector: '.font-mono' });
    expect(tag).toBeInTheDocument();
    // The tag rides INSIDE the assistant bubble (subtle, existing classes).
    expect(tag.className).toContain('font-mono');
    expect(tag.className).toContain('text-xxs');
    expect(tag.className).toContain('text-subtle');
    expect(tag.closest('.chat-bubble')).not.toBeNull();
  });

  it('a local turn names the composer honestly — gap-aware-composer, not a model claim', async () => {
    mocks.config = { data: { provider: 'local', model: null }, isPending: false, isError: false };
    mocks.chat.mutateAsync.mockResolvedValue(REPLY_LOCAL);
    renderPage();

    await send('سؤالي');
    await screen.findByText('جواب الملحّن المحليّ');

    expect(screen.getByText('gap-aware-composer', { selector: '.font-mono' })).toBeInTheDocument();
  });

  it('a failed exchange renders NO engine tag (nothing was produced to attribute)', async () => {
    mocks.config = { data: { provider: 'openai', model: 'm' }, isPending: false, isError: false };
    mocks.chat.mutateAsync.mockRejectedValue(new Error('تعذّر الوصول إلى نموذج المساعد الآن — حاول مرة أخرى'));
    renderPage();

    await send('سؤالي');
    await screen.findByRole('alert');

    // The error row exists, but no mono tag anywhere in the transcript.
    expect(document.querySelectorAll('.font-mono')).toHaveLength(0);
  });

  it('an old-backend envelope (no engine/model) degrades to an untagged bubble — additive contract', async () => {
    mocks.config = { data: { provider: 'local', model: null }, isPending: false, isError: false };
    mocks.chat.mutateAsync.mockResolvedValue({ conversationId: 'c3', reply: 'جواب قديم' });
    renderPage();

    await send('سؤالي');
    await screen.findByText('جواب قديم');

    expect(document.querySelectorAll('.font-mono')).toHaveLength(0);
  });

  it('the tag is per-TURN: a config flip after a reply never rewrites its provenance', async () => {
    // Boot says LOCAL; the reply arrives tagged openai (mid-deploy flip).
    mocks.config = { data: { provider: 'local', model: null }, isPending: false, isError: false };
    mocks.chat.mutateAsync.mockResolvedValue(REPLY_OPENAI);
    renderPage();

    await send('سؤالي');
    await screen.findByText('جواب النموذج الحقيقيّ');
    expect(screen.getByText('test-model-name', { selector: '.font-mono' })).toBeInTheDocument();

    // The config flips to local AFTER the turn — the earlier turn's tag
    // stays the model that actually produced it.
    mocks.config = { data: { provider: 'local', model: null }, isPending: false, isError: false };
    renderPage();
    expect(screen.getByText('test-model-name', { selector: '.font-mono' })).toBeInTheDocument();
  });
});
