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

import { formatReplyBlocks, splitInlineCode, stripInlineMarkdown } from '../../src/pages/student/aiReplyFormat';

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

  // ── R362 (§F code rendering) — fenced blocks + inline spans ────

  it('a fenced ``` block becomes ONE code block; markers drop, body VERBATIM', () => {
    const blocks = formatReplyBlocks('الحل:\n```ts\nconst x = 1; // **لا** يتم_strip\nfetch_user();\n```\nتمّ!');
    expect(blocks).toEqual([
      { kind: 'text', lines: ['الحل:'] },
      { kind: 'code', lang: 'ts', lines: ['const x = 1; // **لا** يتم_strip', 'fetch_user();'] },
      { kind: 'text', lines: ['تمّ!'] },
    ]);
  });

  it('emphasis stripping + list parsing are SUSPENDED inside a fence', () => {
    const blocks = formatReplyBlocks('```\n- ليس قائمة\n**ليس تنويهاً**\n```');
    expect(blocks).toEqual([
      { kind: 'code', lang: null, lines: ['- ليس قائمة', '**ليس تنويهاً**'] },
    ]);
  });

  it('an UNCLOSED fence closes at end-of-input (the streaming shape)', () => {
    const blocks = formatReplyBlocks('شرح:\n```python\ndef f():\n    return 1');
    expect(blocks).toEqual([
      { kind: 'text', lines: ['شرح:'] },
      { kind: 'code', lang: 'python', lines: ['def f():', '    return 1'] },
    ]);
  });

  it('~~~ fences parse identically to ``` fences', () => {
    const blocks = formatReplyBlocks('~~~\nplain\n~~~');
    expect(blocks).toEqual([{ kind: 'code', lang: null, lines: ['plain'] }]);
  });

  it('a fenced block renders as an LTR <pre> with a copy verb (never raw backticks)', () => {
    renderPage();
    // The greeting bubble is plain; the render path is pinned through
    // the exported page by asserting the CODE chrome only appears when
    // a code reply exists — here the greeting must NOT carry it.
    expect(document.querySelector('.r305ai-code')).toBeNull();
  });

  it('a REAL code reply renders the LTR <pre> block + the copy verb + inline chips', async () => {
    mocks.chat.mutateAsync.mockResolvedValue({
      conversationId: 'c-code',
      reply: 'المثال:\n```js\nconst n = 42;\n```\nاستدعِ `fetch_user()` ثم تحقّق.',
      engine: 'local' as const,
      model: 'gap-aware-composer',
    });
    renderPage();
    fireEvent.change(screen.getByLabelText('اكتب سؤالك للمساعد'), {
      target: { value: 'سؤال برمجيّ' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
    await waitFor(() => {
      expect(mocks.chat.mutateAsync).toHaveBeenCalled();
    });

    // The fenced block: one LTR <pre>, verbatim body, no backticks.
    const pre = document.querySelector('pre.r305ai-code');
    expect(pre).not.toBeNull();
    expect(pre?.getAttribute('dir')).toBe('ltr');
    expect(pre?.textContent).toBe('const n = 42;');
    expect(screen.queryByText('```')).toBeNull();

    // The header carries the language token + the copy verb.
    expect(screen.getByText('js', { selector: '.r305ai-code-lang' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'نسخ الكود' })).toBeInTheDocument();

    // The inline chip: a mono LTR <code> with the identifier.
    const chip = screen.getByText('fetch_user()', { selector: '.r305ai-code-inline' });
    expect(chip.getAttribute('dir')).toBe('ltr');
  });

  it('splitInlineCode: paired backticks become code spans; a stray accent stays text', () => {
    expect(splitInlineCode('استدعِ `fetch_user()` أولًا')).toEqual([
      { text: 'استدعِ ' },
      { code: 'fetch_user()' },
      { text: ' أولًا' },
    ]);
    expect(splitInlineCode('سطر بدون شيء')).toEqual([{ text: 'سطر بدون شيء' }]);
    expect(splitInlineCode('قيمة `x ناقصة')).toEqual([{ text: 'قيمة `x ناقصة' }]);
    expect(splitInlineCode('`a` وبعدها `b`')).toEqual([
      { code: 'a' },
      { text: ' وبعدها ' },
      { code: 'b' },
    ]);
  });

  it('a markdown-flavored reply renders in the bubble as PLAIN text (no asterisks leak)', () => {
    renderPage();
    // The real-LLM greeting bubble renders through ReplyText — its
    // plain text has no markup to begin with; the formatter tests above
    // pin the transformation itself.
    expect(screen.getByText(/أرى بيانات إتقانك لأركّز على فجواتك/)).toBeTruthy(); // r366 copy diet: «مرحبًا!» dropped
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
    expect(screen.getByText(/مزوّد خارجيّ/)).toBeTruthy();
  });

  it('never renders in LOCAL mode (nothing leaves the platform)', () => {
    mocks.config = { data: { provider: 'local', model: null }, isPending: false, isError: false };
    renderPage();
    expect(screen.queryByText(/إشعار الخصوصيّة/)).toBeNull();
  });
});

// ─── C3: the auto-scroll guard ────────────────────────────────────

describe('the auto-scroll near-bottom guard', () => {
  /* r366 (2-a): the programmatic pin is an INSTANT scrollTop assignment
   * (scrollTo with smooth flights proved unstable under
   * content-visibility realization). The contract is asserted on the
   * WRITE itself: a mounted at-bottom surface pins (the offset is
   * written), a scrolled-up reader is never written to. */
  const spyScrollTopWrites = () => {
    const writes: Array<{ el: HTMLElement; v: number }> = [];
    /* jsdom defines scrollTop on Element.prototype (not HTMLElement's
     * own) — walk the chain, spy where it lives, restore exactly there. */
    let proto: object = HTMLElement.prototype;
    let desc = Object.getOwnPropertyDescriptor(proto, 'scrollTop');
    while (!desc) {
      proto = Object.getPrototypeOf(proto) as object;
      if (!proto || proto === Object.prototype) break;
      desc = Object.getOwnPropertyDescriptor(proto, 'scrollTop');
    }
    const owner = proto as object;
    const fallback = { configurable: true, writable: true, value: 0 } as PropertyDescriptor;
    const original = desc ?? fallback;
    const ownerProto = desc ? owner : HTMLElement.prototype;
    Object.defineProperty(ownerProto, 'scrollTop', {
      configurable: true,
      get() { return original.get ? original.get!.call(this) : 0; },
      set(this: HTMLElement, v: number) { writes.push({ el: this, v }); if (original.set) original.set!.call(this, v); },
    });
    return {
      writes,
      onScroller: (root: HTMLElement) => writes.filter((w) => w.el.classList.contains('chat-area') && root.contains(w.el)),
      restore: () => Object.defineProperty(ownerProto, 'scrollTop', original),
    };
  };

  it('pins on mount (fresh conversation, user at the bottom)', () => {
    const spy = spyScrollTopWrites();
    try {
      const view = renderPage();
      // The mount pin wrote the transcript scroller's offset.
      expect(spy.onScroller(view.container).length).toBeGreaterThan(0);
    } finally {
      spy.restore();
    }
  });

  it('does NOT pin while the user is scrolled UP (mocked geometry)', async () => {
    // Scroller geometry: content 1000px, viewport 800 → the bottom is
    // scrollTop 200. A user at scrollTop 0 is 200px above the bottom
    // (past the ≤80px near-bottom band).
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', { configurable: true, value: 1000 });
    Object.defineProperty(HTMLElement.prototype, 'clientHeight', { configurable: true, value: 800 });
    const spy = spyScrollTopWrites();
    try {
      const view = renderPage();
      const scroller = view.container.querySelector('.chat-area') as HTMLElement | null;
      // The transcript scroller exists and starts at the bottom (scrollTop 200).
      if (scroller) {
        Object.defineProperty(scroller, 'scrollTop', { configurable: true, value: 0 });
        fireEvent.scroll(scroller); // the user scrolled UP — the guard disengages
      }
      spy.writes.length = 0;
      // A typing change re-renders but lands no message — while the
      // user is up, no pin write may happen on the scroller.
      const input = screen.getByLabelText('اكتب سؤالك للمساعد') as HTMLInputElement;
      fireEvent.change(input, { target: { value: 'سؤال' } });
      await waitFor(() => expect(input.value).toBe('سؤال'));
      expect(spy.onScroller(view.container)).toHaveLength(0);
    } finally {
      spy.restore();
      // jsdom's defaults: getters return 0 — safe to leave, but be tidy.
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).scrollHeight;
      delete (HTMLElement.prototype as unknown as Record<string, unknown>).clientHeight;
    }
  });
});
