/**
 * Frontend unit — r323 B1.1: the AI chat SSE streaming client.
 *
 * Layers under pin (frontend/src/lib/api.ts AI section + the page's
 * consumption in AiAssistantPage.tsx):
 *  · the PURE frame parser (createAiSseParser): token accumulation
 *    across ARBITRARY chunk boundaries, done/error frame decoding,
 *    keep-alive noise tolerance, the trailing-frame flush;
 *  · the wire client (streamAiChat) against a mocked fetch whose body
 *    is a real ReadableStream: deltas flow in order, the `done` frame
 *    resolves, a non-2xx surfaces the server's own Arabic envelope as
 *    AiStreamHttpError, and the caller's AbortController tears the
 *    stream down (the reader rejects with AbortError — cancellation,
 *    never an outage);
 *  · the PAGE: tokens render incrementally into the growing bubble,
 *    the done frame finalizes it (engine tag + feedback armed by the
 *    persisted messageId), the stop button keeps the partial text,
 *    and the daily-quota card renders from the server's own sentence.
 *
 * House pattern (AiAssistantPage-config.test.tsx): hooks mocked at the
 * useResources boundary via vi.hoisted, the REAL auth store seeded
 * with setState, MemoryRouter, scrollTo stubbed for jsdom. The SSE
 * transport is a real ReadableStream (Node ≥20 built-ins) — no
 * EventSource, matching the production fetch+reader consumer.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AiAssistantPage from '../../src/pages/student/AiAssistantPage';
import { useAuthStore, type AuthUser } from '../../src/stores/auth.store';
import {
  AiStreamHttpError,
  canStreamAi,
  createAiSseParser,
  isDailyQuotaMessage,
  streamAiChat,
  type AiSseEvent,
} from '../../src/lib/api';

// ─── fixtures ──────────────────────────────────────────────────────

const tokenFrame = (t: string): string => `event: token\ndata: ${JSON.stringify({ t })}\n\n`;

const DONE_PAYLOAD = {
  conversationId: 'conv-1',
  messageId: 'msg-1',
  reply: 'الإجابة الكاملة من الخادم',
  engine: 'openrouter',
  model: 'meta-llama/llama-3.3-70b-instruct:free',
  inputTokens: 18,
  outputTokens: 42,
  remaining: 24,
};

const doneFrame = (payload: Record<string, unknown> = DONE_PAYLOAD): string =>
  `event: done\ndata: ${JSON.stringify(payload)}\n\n`;

/** A ReadableStream body from string chunks — the production shape
 * (chunk boundaries are ARBITRARY: the parser must reassemble). */
function sseBody(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
}

/** A stream that emits `first`, then stalls forever (a slow reply)
 * until the test aborts — the abort error is INJECTED by the stub the
 * way a real fetch wires the caller's signal to the body stream. */
function stallingSseBody(first: string, signal: AbortSignal): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(first));
      signal.addEventListener('abort', () => {
        controller.error(new DOMException('This operation was aborted', 'AbortError'));
      });
      // never closes — the reader stays pending until the abort
    },
  });
}

/** The page-level STOP stub: a stalling SSE body wired to the signal
 * EACH fetch call actually receives — the production undici semantics
 * (the caller's abort tears the body down, the pending read rejects
 * with AbortError). The page owns its internal AbortController, so a
 * pre-bound test signal would never fire and the stream would pend
 * forever — exactly the mis-wiring that masked the composer reset. */
function stubFetchWithStallingBody(first: string): void {
  const encoder = new TextEncoder();
  vi.stubGlobal(
    'fetch',
    vi.fn(async (_url: string | URL | Request, reqInit?: RequestInit) => {
      const signal = reqInit?.signal;
      if (signal?.aborted) throw new DOMException('This operation was aborted', 'AbortError');
      const body = new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(encoder.encode(first));
          signal?.addEventListener('abort', () => {
            controller.error(new DOMException('This operation was aborted', 'AbortError'));
          });
          // never closes — the reader stays pending until the abort
        },
      });
      return new Response(body, {
        status: 200,
        headers: { 'Content-Type': 'text/event-stream; charset=utf-8' },
      });
    }),
  );
}

function stubFetchWithBody(body: ReadableStream<Uint8Array> | null, init?: { status?: number; contentType?: string; envelope?: unknown }): void {
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL | Request, reqInit?: RequestInit) => {
      // Faithful abort semantics: a signal already aborted (or aborted
      // while the response is in flight) rejects the way undici does —
      // the page's stop button must not depend on stub leniency.
      const signal = reqInit?.signal;
      if (signal?.aborted) throw new DOMException('This operation was aborted', 'AbortError');
      signal?.addEventListener('abort', () => undefined, { once: true });
      return init?.status && init.status !== 200
        ? new Response(JSON.stringify(init.envelope ?? {}), {
            status: init.status,
            headers: { 'Content-Type': 'application/json' },
          })
        : new Response(body, {
            status: 200,
            headers: { 'Content-Type': init?.contentType ?? 'text/event-stream; charset=utf-8' },
          });
    }),
  );
}

// ─── the pure frame parser ─────────────────────────────────────────

describe('createAiSseParser (pure) — r323 B1.1', () => {
  it('accumulates token deltas across arbitrary chunk boundaries, in order', () => {
    const events: AiSseEvent[] = [];
    const parser = createAiSseParser((ev) => events.push(ev));
    // One frame split mid-JSON across pushes; more frames riding the
    // same later chunks — the buffer must reassemble everything.
    parser.push('event: token\ndata: {"t":"مَ');
    parser.push('ن"}\n\nevent: to');
    parser.push('ken\ndata: {"t":" خلف"}\n\nevent: token\ndata: {"t":"ك"}\n\n');
    parser.end();
    const deltas = events.filter((e) => e.kind === 'token');
    expect(deltas.map((e) => (e.kind === 'token' ? e.delta : ''))).toEqual(['مَن', ' خلف', 'ك']);
  });

  it('decodes the done frame with the server FINAL turn intact', () => {
    const events: AiSseEvent[] = [];
    const parser = createAiSseParser((ev) => events.push(ev));
    parser.push(tokenFrame('جواب '));
    parser.push(doneFrame());
    parser.end();
    expect(events[0]).toEqual({ kind: 'token', delta: 'جواب ' });
    expect(events[1]).toEqual({ kind: 'done', final: DONE_PAYLOAD });
  });

  it('decodes the typed error frame (code + Arabic message + retryable)', () => {
    const events: AiSseEvent[] = [];
    const parser = createAiSseParser((ev) => events.push(ev));
    parser.push(`event: error\ndata: ${JSON.stringify({ code: 'PROVIDER_RATE_LIMITED', message: 'تجاوزنا حدّ الاستخدام المجاني مؤقتًا — انتظر دقيقة ثم أعد المحاولة', retryable: true })}\n\n`);
    parser.end();
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: 'error',
      error: { code: 'PROVIDER_RATE_LIMITED', retryable: true },
    });
  });

  it('tolerates keep-alive noise: comments, blank data lines, malformed JSON — never content', () => {
    const events: AiSseEvent[] = [];
    const parser = createAiSseParser((ev) => events.push(ev));
    parser.push(': keep-alive\n\n');
    parser.push('data: \n\n');
    parser.push('data: not-json{{\n\n');
    parser.push(tokenFrame('حقيقيّ'));
    parser.end();
    expect(events).toEqual([{ kind: 'token', delta: 'حقيقيّ' }]);
  });

  it('end() flushes a trailing frame that lacked the closing blank line', () => {
    const events: AiSseEvent[] = [];
    const parser = createAiSseParser((ev) => events.push(ev));
    parser.push(tokenFrame('آخر'));
    parser.push('event: token\ndata: {"t":" دفعة"}');
    parser.end();
    expect(events.map((e) => (e.kind === 'token' ? e.delta : ''))).toEqual(['آخر', ' دفعة']);
  });

  it('a token frame with a non-string t is skipped (never rendered as content)', () => {
    const events: AiSseEvent[] = [];
    const parser = createAiSseParser((ev) => events.push(ev));
    parser.push('event: token\ndata: {"t":42}\n\n');
    parser.end();
    expect(events).toEqual([]);
  });
});

// ─── the wire client (streamAiChat) ────────────────────────────────

describe('streamAiChat — mocked fetch + ReadableStream', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('streams deltas in order and RESOLVES with the done frame', async () => {
    stubFetchWithBody(sseBody([tokenFrame('أولًا '), tokenFrame('ثم '), doneFrame()]));
    const deltas: string[] = [];
    let events = 0;
    const final = await streamAiChat({
      message: 'سؤال',
      signal: new AbortController().signal,
      onToken: (d) => {
        deltas.push(d);
        events += 1;
      },
    });
    expect(deltas).toEqual(['أولًا ', 'ثم ']);
    expect(events).toBe(2);
    expect(final).toEqual(DONE_PAYLOAD);
  });

  it('rejects with AiStreamHttpError carrying the SERVER envelope on non-2xx (the daily-quota 429)', async () => {
    stubFetchWithBody(null, {
      status: 429,
      envelope: { error: { code: 'TOO_MANY_REQUESTS', message: 'وصلتَ حدَّ الأسئلة اليوميّ للمساعد الذكيّ (25 سؤالًا) — عُد غدًا أو تابع من محادثاتك السابقة.' } },
    });
    const err = await streamAiChat({
      message: 'سؤال',
      signal: new AbortController().signal,
      onToken: () => undefined,
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiStreamHttpError);
    expect((err as AiStreamHttpError).status).toBe(429);
    expect((err as AiStreamHttpError).code).toBe('TOO_MANY_REQUESTS');
    expect(isDailyQuotaMessage((err as AiStreamHttpError).serverMessage)).toBe(true);
  });

  it('the caller abort tears the stream down: the reader rejects with AbortError', async () => {
    const controller = new AbortController();
    stubFetchWithBody(stallingSseBody(tokenFrame('بداية الردّ'), controller.signal));
    const deltas: string[] = [];
    const pending = streamAiChat({
      message: 'سؤال',
      signal: controller.signal,
      onToken: (d) => deltas.push(d),
    });
    // Let the first token land, then press stop.
    await waitFor(() => expect(deltas).toEqual(['بداية الردّ']));
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });

  it('a stream that ends WITHOUT a done frame rejects honestly (never a truncated reply)', async () => {
    stubFetchWithBody(sseBody([tokenFrame('نصف جواب')]));
    const err = await streamAiChat({
      message: 'سؤال',
      signal: new AbortController().signal,
      onToken: () => undefined,
    }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(AiStreamHttpError);
    expect((err as AiStreamHttpError).code).toBe('STREAM_TRUNCATED');
  });

  it('the request is a POST to /ai/chat?stream=1 with the JSON body + Bearer auth conventions', async () => {
    stubFetchWithBody(sseBody([doneFrame()]));
    useAuthStore.setState({ accessToken: 'test-access-token' } as Partial<ReturnType<typeof useAuthStore.getState>>);
    await streamAiChat({
      conversationId: 'conv-9',
      message: 'سؤال',
      signal: new AbortController().signal,
      onToken: () => undefined,
    });
    const fetchMock = vi.mocked(globalThis.fetch);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(String(url)).toContain('/ai/chat?stream=1');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      Authorization: 'Bearer test-access-token',
    });
    expect(JSON.parse(String(init.body))).toEqual({ conversationId: 'conv-9', message: 'سؤال' });
    useAuthStore.setState({ accessToken: null } as Partial<ReturnType<typeof useAuthStore.getState>>);
  });
});

// ─── the page consumption ──────────────────────────────────────────

const mocks = vi.hoisted(() => ({
  chat: { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() },
  config: { data: undefined as undefined | { provider: string; model: string | null }, isPending: false, isError: false },
  gaps: { data: [], isPending: false, isError: false, refetch: () => undefined },
  conversations: {
    data: [] as Array<{ id: string; title: string | null; createdAt: string }>,
    isPending: false,
    isError: false,
    refetch: () => undefined,
  },
  delConversation: { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() },
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

describe('AiAssistantPage — SSE consumption (r323 B1.1)', () => {
  beforeEach(() => {
    useAuthStore.setState({ user: STUDENT });
    window.HTMLElement.prototype.scrollTo = () => undefined;
    mocks.chat = { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() };
    mocks.config = { data: { provider: 'openrouter', model: 'meta-llama/llama-3.3-70b-instruct:free' }, isPending: false, isError: false };
    mocks.conversations = { data: [], isPending: false, isError: false, refetch: () => undefined };
    mocks.delConversation = { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() };
    mocks.fetchMessages = vi.fn(async () => []);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
    vi.unstubAllGlobals();
  });

  it('streams into the bubble incrementally, then the done frame finalizes it (engine tag + feedback armed)', async () => {
    // The page-level smoke gate: the environment must actually offer
    // the streaming primitives (it does under vitest/jsdom — Node 20
    // built-ins); otherwise this test would pin the JSON fallback.
    expect(canStreamAi()).toBe(true);

    let releaseDone!: () => void;
    const doneGate = new Promise<void>((resolve) => {
      releaseDone = resolve;
    });
    const encoder = new TextEncoder();
    const body = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(encoder.encode(tokenFrame('جزء ')));
        controller.enqueue(encoder.encode(tokenFrame('أول ')));
        void doneGate.then(() => {
          controller.enqueue(encoder.encode(tokenFrame('ثالث')));
          controller.enqueue(encoder.encode(doneFrame()));
          controller.close();
        });
      },
    });
    stubFetchWithBody(body);

    renderPage();
    await send('سؤال البثّ');

    // Token accumulation IS the render: the partial reply appears
    // BEFORE the done frame ships (the deltas end with a space — trim).
    await screen.findByText((_, el) => el?.classList.contains('chat-bubble') === true && el.textContent?.trim() === 'جزء أول');
    // Nothing final yet — no engine tag, no feedback buttons.
    expect(screen.queryByText('meta-llama/llama-3.3-70b-instruct:free', { selector: '.font-mono' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'ردّ مفيد' })).toBeNull();

    releaseDone();
    // The done frame REPLACES the buffer with the server's own final
    // turn and arms the per-answer affordances.
    expect(await screen.findByText('الإجابة الكاملة من الخادم')).toBeInTheDocument();
    expect(screen.getByText('meta-llama/llama-3.3-70b-instruct:free', { selector: '.font-mono' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ردّ مفيد' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ليس ردًّا مفيدًا' })).toBeInTheDocument();
    // The quota telemetry rode the done frame (remaining 24). The
    // counter renders countAr's counted-noun sentence for 24 — the
    // 11+ form takes the singular accusative تمييز WITH the numeral
    // prefixed (the bare few-form would be wrong Arabic for 24).
    expect(screen.getByText('24 سؤالًا متبقّيًا اليوم')).toBeInTheDocument();
  });

  it('STOP keeps the partial text honestly (no engine tag, no feedback — nothing was persisted)', async () => {
    // The stalling body is wired to the signal the page's own fetch
    // call carries (see stubFetchWithStallingBody) — pressing stop
    // aborts the page's internal controller and the pending read must
    // reject the way a real fetch does.
    stubFetchWithStallingBody(tokenFrame('بداية الردّ فقط'));

    renderPage();
    await send('سؤال أُوقف');

    // The stop button owns the send slot while the stream is in flight.
    fireEvent.click(await screen.findByRole('button', { name: 'إيقاف التوليد' }));

    // The partial answer STAYS (it was really shown), but untagged and
    // un-rateable: the server persisted nothing for an aborted turn.
    await waitFor(() => expect(screen.getByText('بداية الردّ فقط')).toBeInTheDocument());
    expect(screen.queryByText('meta-llama/llama-3.3-70b-instruct:free', { selector: '.font-mono' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'ردّ مفيد' })).toBeNull();
    // The composer returns (the stop button is gone, send is back).
    await waitFor(() => expect(screen.getByRole('button', { name: 'إرسال' })).toBeInTheDocument());
  });

  it('the daily-quota 429 renders the «وصلتَ حدَّ اليوم» card with the SERVER copy — not an error row', async () => {
    stubFetchWithBody(null, {
      status: 429,
      envelope: { error: { code: 'TOO_MANY_REQUESTS', message: 'وصلتَ حدَّ الأسئلة اليوميّ للمساعد الذكيّ (25 سؤالًا) — عُد غدًا أو تابع من محادثاتك السابقة.' } },
    });

    renderPage();
    await send('سؤال بعد الحصّة');

    expect(await screen.findByText('وصلتَ حدَّ اليوم')).toBeInTheDocument();
    expect(screen.getByText(/وصلتَ حدَّ الأسئلة اليوميّ للمساعد الذكيّ \(25 سؤالًا\)/)).toBeInTheDocument();
    // A quota state is not a retryable failure — no error row, no retry.
    expect(screen.queryByRole('alert')).toBeNull();
    expect(screen.queryByRole('button', { name: 'أعد إرسال سؤالك' })).toBeNull();
  });

  it('a MID-STREAM typed error frame surfaces its Arabic message as a recoverable row', async () => {
    stubFetchWithBody(sseBody([
      tokenFrame('بداية حقيقية '),
      `event: error\ndata: ${JSON.stringify({ code: 'PROVIDER_FAILURE', message: 'تعذّر الوصول إلى نموذج المساعد الآن — حاول مرة أخرى', retryable: true })}\n\n`,
    ]));

    renderPage();
    await send('سؤال متعثّر');

    // The partial text stays AND the typed error row explains the stop.
    await screen.findByText('بداية حقيقية');
    expect(await screen.findByText('تعذّر الوصول إلى نموذج المساعد الآن — حاول مرة أخرى')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'أعد إرسال سؤالك' })).toBeInTheDocument();
  });

  it('a mid-stream failure AFTER the done frame is impossible to double-render (done wins)', async () => {
    stubFetchWithBody(sseBody([tokenFrame('س'), doneFrame({ ...DONE_PAYLOAD, remaining: 1 })]));
    renderPage();
    await send('سؤال سريع');
    expect(await screen.findByText('الإجابة الكاملة من الخادم')).toBeInTheDocument();
    expect(screen.getByText('سؤال واحد متبقٍّ اليوم')).toBeInTheDocument();
  });

  it('thumbs feedback POSTs the persisted messageId with rating ±1', async () => {
    stubFetchWithBody(sseBody([doneFrame()]));
    const postSpy = vi.fn(async () => ({ data: { data: { ok: true } } }));
    // The feedback call rides the shared axios instance — intercept it
    // at the instance level without dragging the whole interceptor
    // chain into the test (the spy replaces post only).
    const apiModule = await import('../../src/lib/api');
    vi.spyOn(apiModule.api, 'post').mockImplementation(postSpy as never);

    renderPage();
    await send('سؤال مُقيَّم');
    await screen.findByText('الإجابة الكاملة من الخادم');

    fireEvent.click(screen.getByRole('button', { name: 'ردّ مفيد' }));
    await waitFor(() => expect(postSpy).toHaveBeenCalledWith('/ai/feedback', { messageId: 'msg-1', rating: 1 }));
    expect(screen.getByRole('button', { name: 'ردّ مفيد' })).toHaveAttribute('aria-pressed', 'true');

    // Switching sides rewrites the SAME row (the server upserts).
    fireEvent.click(screen.getByRole('button', { name: 'ليس ردًّا مفيدًا' }));
    await waitFor(() => expect(postSpy).toHaveBeenLastCalledWith('/ai/feedback', { messageId: 'msg-1', rating: -1 }));
    expect(screen.getByRole('button', { name: 'ليس ردًّا مفيدًا' })).toHaveAttribute('aria-pressed', 'true');
    vi.restoreAllMocks();
  });

  it('the local-mode badge stays honest across a streamed local turn (engine=local, composer tag)', async () => {
    mocks.config = { data: { provider: 'local', model: null }, isPending: false, isError: false };
    stubFetchWithBody(sseBody([
      tokenFrame('ردّ الملحّن المحليّ '),
      doneFrame({
        conversationId: 'conv-local',
        messageId: 'msg-local',
        reply: 'ردّ الملحّن المحليّ الكامل',
        engine: 'local',
        model: 'gap-aware-composer',
        inputTokens: 0,
        outputTokens: 0,
      }),
    ]));
    renderPage();
    await send('سؤال محليّ');
    expect(await screen.findByText('ردّ الملحّن المحليّ الكامل')).toBeInTheDocument();
    // The per-turn tag names the COMPOSER — never an LLM claim.
    expect(screen.getByText('gap-aware-composer', { selector: '.font-mono' })).toBeInTheDocument();
    // And the boot-level chip stays the honest local label.
    expect(screen.getByText('مساعد محليّ')).toBeInTheDocument();
  });
});
