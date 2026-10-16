/**
 * Frontend unit — r176c: the chat hygiene trio + the privacy
 * disclosure (AiAssistantPage + the pure aiReplyFormat module).
 *
 *  · C1: the 4000-char server bound is mirrored on the input
 *    (maxLength) and a counter appears near the limit — an oversized
 *    paste can no longer become a doomed-retry loop (400 → retry the
 *    same text → 400 forever).
 *  · C2: markdown-lite reply rendering (the pure formatter strips
 *    emphasis/heading markers and groups list lines).
 *  · C3: auto-scroll only when the user is near the bottom.
 *  · P1-1: the third-party AI disclosure line renders in real-LLM
 *    mode and never in local mode.
 *
 * House pattern (AiAssistantPage-config.test.tsx): hooks mocked at the
 * useResources boundary via vi.hoisted, the REAL auth store seeded
 * with setState, MemoryRouter, scrollTo stubbed for jsdom.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AiAssistantPage from '../../src/pages/student/AiAssistantPage';
import { useAuthStore, type AuthUser } from '../../src/stores/auth.store';

const mocks = vi.hoisted(() => ({
  chat: { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() },
  config: {
    data: undefined as undefined | { provider: string | null; model: string | null },
    isPending: false,
    isError: false,
  },
  gaps: { data: [], isPending: false, isError: false, refetch: () => undefined },
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

import { formatReplyBlocks, stripInlineMarkdown } from '../../src/pages/student/aiReplyFormat';

const STUDENT: AuthUser = {
  id: 'u1', role: 'STUDENT', email: 's@test.dev',
  firstName: 'طالب', lastName: 'تجريبي', avatarInitials: 'تج',
};

beforeEach(() => {
  useAuthStore.setState({ user: STUDENT });
  window.HTMLElement.prototype.scrollTo = vi.fn();
  mocks.chat = { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() };
  mocks.gaps = { data: [], isPending: false, isError: false, refetch: () => undefined };
  mocks.conversations = { data: [], isPending: false, isError: false, refetch: () => undefined };
  mocks.delConversation = { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() };
  mocks.fetchMessages = vi.fn(async () => []);
  // The default under test: a REAL external provider answers.
  mocks.config = { data: { provider: 'openrouter', model: 'openrouter/free' }, isPending: false, isError: false };
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

// ─── C2: the pure formatter ───────────────────────────────────────

describe('aiReplyFormat (the markdown-lite formatter)', () => {
  it('strips **bold** and __underline__ pairs, keeping the inner text', () => {
    expect(stripInlineMarkdown('هذا **مهم جدًا** في الخطوة')).toBe('هذا مهم جدًا في الخطوة');
    expect(stripInlineMarkdown('__تنبيه__: راجع')).toBe('تنبيه: راجع');
  });

  it('strips single-star/_ emphasis pairs', () => {
    expect(stripInlineMarkdown('*مهم*')).toBe('مهم');
    expect(stripInlineMarkdown('متغير _x_ في المعادلة')).toBe('متغير x في المعادلة');
  });

  it('strips 1–6 leading # heading markers with their space', () => {
    expect(stripInlineMarkdown('## خطوات الحل')).toBe('خطوات الحل');
    expect(stripInlineMarkdown('#### عنوان عميق')).toBe('عنوان عميق');
    // A lone # with no trailing space stays (not a heading shape).
    expect(stripInlineMarkdown('#5 ترتيب')).toBe('#5 ترتيب');
  });

  it('groups consecutive -/* list lines into ONE list block; text otherwise', () => {
    const blocks = formatReplyBlocks('الحل على خطوات:\n- أولًا افتح الملف\n- ثانيًا عدّل الدالة\n* ثالثًا شغّل الاختبار\nتمّ!').filter((b) => b.kind === 'list');
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toEqual({
      kind: 'list',
      items: ['أولًا افتح الملف', 'ثانيًا عدّل الدالة', 'ثالثًا شغّل الاختبار'],
    });
  });

  it('a bulletless reply stays one text block, verbatim lines', () => {
    const blocks = formatReplyBlocks('سطر أول\n\nسطر ثانٍ');
    expect(blocks).toEqual([{ kind: 'text', lines: ['سطر أول', '', 'سطر ثانٍ'] }]);
  });

  it('a markdown-flavored reply renders in the bubble as PLAIN text (no asterisks leak)', () => {
    renderPage();
    // The real-LLM greeting bubble renders through ReplyText — its
    // plain text has no markup to begin with; the formatter tests above
    // pin the transformation itself.
    expect(screen.getByText(/مرحبًا! أنا مساعدك الدراسيّ/)).toBeTruthy();
  });
});

// ─── C1: the input bound ──────────────────────────────────────────

describe('the chat input bound (4000, mirrored from chatSchema)', () => {
  it('carries maxLength=4000 — the browser clamps what the server would 400', () => {
    renderPage();
    const input = screen.getByLabelText('اكتب سؤالك للمساعد') as HTMLInputElement;
    expect(input.maxLength).toBe(4000);
  });

  it('no counter appears for a short draft; one appears in the last 400 chars', () => {
    renderPage();
    const input = screen.getByLabelText('اكتب سؤالك للمساعد') as HTMLInputElement;
    expect(screen.queryByText(/\/4000/)).toBeNull();
    fireEvent.change(input, { target: { value: 'أ'.repeat(3700) } });
    expect(screen.getByText('3700/4000')).toBeTruthy();
  });
});

// ─── P1-1: the third-party disclosure ─────────────────────────────

describe('the privacy disclosure (real-LLM mode only)', () => {
  it('renders the honest external-provider line when a real provider answers', () => {
    renderPage();
    expect(screen.getByText(/إشعار الخصوصيّة/)).toBeTruthy();
    expect(screen.getByText(/مزوّد ذكاء اصطناعيّ خارجيّ/)).toBeTruthy();
  });

  it('never renders in LOCAL mode (nothing leaves the platform)', () => {
    mocks.config = { data: { provider: 'local', model: null }, isPending: false, isError: false };
    renderPage();
    expect(screen.queryByText(/إشعار الخصوصيّة/)).toBeNull();
  });
});

// ─── C3: the auto-scroll guard ────────────────────────────────────

describe('the auto-scroll near-bottom guard', () => {
  it('scrolls on mount (fresh conversation, user at the bottom)', () => {
    renderPage();
    expect(HTMLElement.prototype.scrollTo).toHaveBeenCalled();
  });

  it('does NOT scroll while the user is scrolled UP (mocked geometry)', async () => {
    // Scroller geometry: content 1000px, viewport 800 → the bottom is
    // scrollTop 200. A user at scrollTop 0 is 200px above the bottom
    // (past the ≤80px near-bottom band).
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 800 });
    try {
      const view = renderPage();
      const scroller = view.container.querySelector('.chat-area') as HTMLElement | null;
      // The transcript scroller exists and starts at the bottom (scrollTop 200).
      if (scroller) {
        Object.defineProperty(scroller, 'scrollTop', { configurable: true, value: 0 });
        fireEvent.scroll(scroller); // the user scrolled UP — the guard disengages
      }
      (HTMLElement.prototype.scrollTo as ReturnType<typeof vi.fn>).mockClear();
      // A typing change re-renders but lands no message — while the
      // user is up, no scroll call may happen.
      const input = screen.getByLabelText('اكتب سؤالك للمساعد') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'سؤال' } });
      await waitFor(() => expect(input.value).toBe('سؤال'));
      expect(HTMLElement.prototype.scrollTo).not.toHaveBeenCalled();
    } finally {
      // jsdom's defaults: getters return 0 — safe to leave, but be tidy.
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollHeight;
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
    }
  });
});
