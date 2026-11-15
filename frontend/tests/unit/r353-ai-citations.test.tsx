/**
 * Frontend unit — R353 C3: web citations parity (the «المصادر» block).
 *
 * The SSE `done` frame and the JSON envelope have carried `citations`
 * since r323 B1.2 (mobile renders them — apps/mobile Assistant.tsx);
 * the WEB client's AiStreamDone type lacked the field and the page
 * dropped it. This suite pins the closed gap:
 *  · the TYPE contract: AiStreamDone.citations (mirror of the mobile
 *    shape) rides the done frame through the pure parser;
 *  · the pure rendering rulings: citationLabel («العنوان (الموقع)»)
 *    and citationHref (in-app route / absolute http(s) / plain text);
 *  · the PAGE: a grounded streamed turn renders a quiet numbered
 *    «المصادر» list (internal links open in-app, external in a new
 *    tab, url-less sources stay text); a turn without citations (or
 *    the local composer's fallback) renders NOTHING;
 *  · the JSON grammar carries the same citations (the network-failure
 *    fallback path renders them too).
 *
 * House pattern (r323-ai-stream.test.tsx): hooks mocked at the
 * useResources boundary via vi.hoisted, the REAL auth store seeded
 * with setState, MemoryRouter, scrollTo stubbed for jsdom, the SSE
 * body a real ReadableStream.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AiAssistantPage, { citationHref, citationLabel } from '../../src/pages/student/AiAssistantPage';
import { useAuthStore, type AuthUser } from '../../src/stores/auth.store';
import { createAiSseParser, type AiSseEvent } from '../../src/lib/ai-stream';
import type { AiCitation } from '../../src/lib/ai-stream';

// ─── fixtures ──────────────────────────────────────────────────────

const CITES: AiCitation[] = [
  {
    index: 1,
    title: 'محاضرة الأشجار المتوازنة',
    locator: 'الدقيقة 14:20',
    url: '/student/lectures?lecture=lec-1&t=860',
    snippet: '…شرح دوران الأشجار…',
  },
  {
    index: 2,
    title: 'بنية المعطيات — وصف المقرّر',
    locator: null,
    url: 'https://example.edu/course-desc',
    snippet: '…',
  },
  {
    index: 3,
    title: 'مصدر بلا رابط',
    locator: 'الفصل الثاني',
    url: null,
    snippet: '…',
  },
];

const tokenFrame = (t: string): string => `event: token\ndata: ${JSON.stringify({ t })}\n\n`;

const doneFrame = (payload: Record<string, unknown>): string =>
  `event: done\ndata: ${JSON.stringify(payload)}\n\n`;

function sseBody(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

/** The production fetch stub: SSE body in, page's own requests out. */
function stubFetchWithBody(body: ReadableStream<Uint8Array> | null) {
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => {
      if (body === null) throw new TypeError('fetch failed'); // pre-stream network failure
      return new Response(body, { status: 200, headers: { 'content-type': 'text/event-stream' } });
    }),
  );
}

// ─── the pure type + rendering rulings ─────────────────────────────

describe('AiStreamDone.citations — the type contract (mobile parity)', () => {
  it("the done frame's citations ride the parser verbatim", () => {
    const events: AiSseEvent[] = [];
    const parser = createAiSseParser((ev) => events.push(ev));
    parser.push(
      doneFrame({
        conversationId: 'c1',
        messageId: 'm1',
        reply: 'ردّ',
        citations: CITES,
      }),
    );
    parser.end();
    expect(events).toHaveLength(1);
    const done = events[0]!;
    if (done.kind !== 'done') throw new Error('expected done');
    expect(done.final.citations).toEqual(CITES);
    expect(done.final.citations?.[0]?.url).toBe('/student/lectures?lecture=lec-1&t=860');
  });
});

describe('citationLabel / citationHref (the mobile-mirrored rulings)', () => {
  it('the label is «العنوان (الموقع)»; no locator → the bare title; no title → «مصدر»', () => {
    expect(citationLabel(CITES[0]!)).toBe('محاضرة الأشجار المتوازنة (الدقيقة 14:20)');
    expect(citationLabel(CITES[1]!)).toBe('بنية المعطيات — وصف المقرّر');
    // The mobile pin verbatim (logic.test.ts): a whitespace locator is
    // NO locator — a title-less source is the bare «مصدر». A REAL
    // locator rides even a title-less source (base stays «مصدر»).
    expect(citationLabel({ index: 9, title: '  ', locator: ' ' })).toBe('مصدر');
    expect(citationLabel({ index: 9, title: '  ', locator: 'x' })).toBe('مصدر (x)');
  });

  it('openable = in-app route or absolute http(s); anything else is text', () => {
    expect(citationHref(CITES[0]!)).toBe('/student/lectures?lecture=lec-1&t=860');
    expect(citationHref(CITES[1]!)).toBe('https://example.edu/course-desc');
    expect(citationHref(CITES[2]!)).toBeNull();
    expect(citationHref({ index: 4, title: 't', url: 'javascript:alert(1)' })).toBeNull();
    expect(citationHref({ index: 5, title: 't', url: '' })).toBeNull();
  });
});

// ─── the page consumption ──────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  chat: { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() },
  config: {
    data: undefined as undefined | { provider: string; model: string | null },
    isPending: false,
    isError: false,
  },
  gaps: { data: [] as unknown[], isPending: false, refetch: () => undefined },
  conversations: {
    data: [] as Array<{ id: string; title: string | null; createdAt: string }>,
    isPending: false,
    refetch: () => undefined,
  },
  delConversation: { isPending: false, error: null as unknown, mutateAsync: vi.fn() },
  fetchMessages: vi.fn(async (_id: string) => []),
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

function renderPage() {
  return render(
    <MemoryRouter>
      <AiAssistantPage />
    </MemoryRouter>,
  );
}

async function send(text: string) {
  fireEvent.change(screen.getByLabelText('اكتب سؤالك للمساعد'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
}

describe('AiAssistantPage — the «المصادر» block (R353 C3)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: STUDENT });
    window.HTMLElement.prototype.scrollTo = vi.fn();
    mocks.chat = { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() };
    mocks.config = { data: { provider: 'groq', model: 'llama-3.3-70b-versatile' }, isPending: false, isError: false };
    mocks.conversations = { data: [], isPending: false, refetch: () => undefined };
    mocks.delConversation = { isPending: false, error: null as unknown, mutateAsync: vi.fn() };
    mocks.fetchMessages = vi.fn(async (_id: string) => []);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('a grounded streamed turn renders the numbered «المصادر»: in-app Link, external anchor, plain text', async () => {
    stubFetchWithBody(sseBody([
      tokenFrame('ردّ '),
      doneFrame({
        conversationId: 'conv-1',
        messageId: 'msg-1',
        reply: 'الردّ الكامل المؤسَّس',
        engine: 'groq',
        model: 'llama-3.3-70b-versatile',
        citations: CITES,
      }),
    ]));

    renderPage();
    await send('سؤال عن الأشجار');

    expect(await screen.findByText('الردّ الكامل المؤسَّس')).toBeInTheDocument();
    // The quiet block label.
    expect(screen.getByText('المصادر')).toBeInTheDocument();
    // Numbered list items: 3 sources, ordered.
    const items = screen.getAllByRole('listitem');
    expect(items).toHaveLength(3);
    // In-app route → a react-router link (href carries the app path).
    const internal = screen.getByRole('link', { name: 'محاضرة الأشجار المتوازنة (الدقيقة 14:20)' });
    expect(internal).toHaveAttribute('href', '/student/lectures?lecture=lec-1&t=860');
    // Absolute http(s) → external anchor, new tab.
    const external = screen.getByRole('link', { name: 'بنية المعطيات — وصف المقرّر' });
    expect(external).toHaveAttribute('target', '_blank');
    // Url-less source → plain text, NOT a link.
    const plain = screen.getByText('مصدر بلا رابط (الفصل الثاني)');
    expect(plain.tagName).not.toBe('A');
  });

  it('a turn WITHOUT citations renders NO sources block (no clutter, no invented sources)', async () => {
    stubFetchWithBody(sseBody([
      doneFrame({
        conversationId: 'conv-2',
        messageId: 'msg-2',
        reply: 'ردّ بلا مصادر مسترجعة',
        engine: 'groq',
        model: 'llama-3.3-70b-versatile',
      }),
    ]));

    renderPage();
    await send('سؤال عام');

    expect(await screen.findByText('ردّ بلا مصادر مسترجعة')).toBeInTheDocument();
    expect(screen.queryByText('المصادر')).toBeNull();
    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });

  it("the local composer's fallback turn never cites (it never read the sources)", async () => {
    stubFetchWithBody(sseBody([
      doneFrame({
        conversationId: 'conv-3',
        messageId: 'msg-3',
        reply: 'ردّ الملحّن المحلي',
        engine: 'local',
        model: 'gap-aware-composer',
        citations: [],
      }),
    ]));

    renderPage();
    await send('سؤال محلي');

    expect(await screen.findByText('ردّ الملحّن المحلي')).toBeInTheDocument();
    expect(screen.queryByText('المصادر')).toBeNull();
  });

  it('the JSON grammar carries the same citations (the network-failure fallback renders them)', async () => {
    // The pre-stream fetch fails (offline) → the dispatcher falls back
    // to the JSON mutation (the documented deliver() fallback path).
    stubFetchWithBody(null);
    mocks.chat.mutateAsync.mockResolvedValue({
      conversationId: 'conv-4',
      reply: 'ردّ المسار الاحتياطيّ',
      engine: 'groq',
      model: 'llama-3.3-70b-versatile',
      messageId: 'msg-4',
      citations: [CITES[0]!],
    });

    renderPage();
    await send('سؤال بعد انقطاع الشبكة');

    expect(await screen.findByText('ردّ المسار الاحتياطيّ')).toBeInTheDocument();
    expect(screen.getByText('المصادر')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'محاضرة الأشجار المتوازنة (الدقيقة 14:20)' }),
    ).toHaveAttribute('href', '/student/lectures?lecture=lec-1&t=860');
    await waitFor(() => expect(mocks.chat.mutateAsync).toHaveBeenCalled());
  });
});
