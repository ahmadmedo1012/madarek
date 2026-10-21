/**
 * R305-A7 (task 3-d) — the AI assistant's Heron transformation pins.
 *
 * The pass on AiAssistantPage.tsx is a marker + register change (the
 * technical ledger), and every pin here binds to THAT contract — never
 * to a styling accident:
 *
 *  1. SHEET/MARKER: `r305-research-pdf-ai.css` is imported directly
 *     AFTER `ai.css` (later import wins the @layer pages tie — the §0
 *     scoping contract), and the page root carries the `.r305rp`
 *     marker the sheet scopes under.
 *  2. ONE DEEP BAND: the surface head is the page's only
 *     `.r305rp-band--deep` region — the status head (title + engine/
 *     config chips + the persistent privacy line on the band itself).
 *  3. THE LEDGER: turns render role micro-labels («المساعد» / «أنت»)
 *     — identity never rides color alone — and the hairline row
 *     separation is bound in the sheet source.
 *  4. HONESTY REGRESSIONS (the confirmed-defect pins):
 *     · the error panel now discloses the backend envelope's own
 *       support code verbatim (UPPER_SNAKE, D17-3's support-chip
 *       contract) — and renders NOTHING for a codeless failure;
 *     · the composer input is a real multi-line TEXTAREA (was a
 *       single-line <input>) with the same 4000 server bound;
 *     · the pending state tells the truth about the non-streaming
 *       API and invents NO stop/cancel control (none exists);
 *     · no citation/attachment chrome exists (the API returns none).
 *  5. THE ONE SEND: composer input + send ride the single
 *     `.r305rp-next` accent rail; the send button is the emphasized
 *     `.btn accent` and stays disabled while empty or in-flight.
 *
 * House pattern (AiAssistantPage-config.test.tsx): hooks mocked at the
 * useResources boundary via vi.hoisted, the REAL auth store seeded
 * with setState, MemoryRouter, scrollTo stubbed for jsdom.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import AiAssistantPage, { apiErrorCode } from '../../src/pages/student/AiAssistantPage';
import { useAuthStore, type AuthUser } from '../../src/stores/auth.store';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const read = (p: string) => readFileSync(path.join(root, p), 'utf8');
const stripComments = (src: string) => src.replace(/\/\*[\s\S]*?\*\//g, '');

const mocks = vi.hoisted(() => ({
  chat: { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() },
  config: { data: undefined as undefined | { provider: string; model: string | null }, isPending: true, isError: false },
  gaps: { data: [] as unknown[], isPending: false, isError: false, refetch: () => undefined },
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
  window.HTMLElement.prototype.scrollTo = () => undefined;
  mocks.chat = { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() };
  mocks.gaps = { data: [], isPending: false, isError: false, refetch: () => undefined };
  mocks.conversations = { data: [], isPending: false, isError: false, refetch: () => undefined };
  mocks.delConversation = { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() };
  mocks.fetchMessages = vi.fn(async () => []);
  // Default under test: a REAL external provider answers.
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

// ─── 1 · the sheet/marker contract ────────────────────────────────

describe('R305-A7 — the sheet rides the module (§0 scoping contract)', () => {
  it('r305-research-pdf-ai.css is imported directly AFTER ai.css', () => {
    const page = read('src/pages/student/AiAssistantPage.tsx');
    const aiLine = page.indexOf("import '../../styles/ai.css'");
    const heronLine = page.indexOf("import '../../styles/r305-research-pdf-ai.css'");
    expect(aiLine).toBeGreaterThan(-1);
    expect(heronLine).toBeGreaterThan(aiLine);
  });

  it('the rendered page root carries the .r305rp marker', () => {
    const { container } = renderPage();
    expect(container.firstElementChild?.className).toContain('r305rp');
  });
});

// ─── 2 · the one deep band ────────────────────────────────────────

describe('R305-A7 — the status head is the ONLY deep band', () => {
  it('exactly one .r305rp-band--deep exists, and it is the surface head', () => {
    const { container } = renderPage();
    const bands = container.querySelectorAll('.r305rp-band--deep');
    expect(bands).toHaveLength(1);
    expect(bands[0]!.className).toContain('ai-surface-head');
    expect(bands[0]!.className).toContain('r305ai-head');
  });

  it('the band carries the engine chip, and the privacy line rides the band itself', () => {
    const { container } = renderPage();
    const band = container.querySelector('.r305rp-band--deep')!;
    // The persistent third-party disclosure lives INSIDE the band —
    // always visible in real-LLM mode, styled by the band-secondary ink.
    expect(band.textContent).toContain('إشعار الخصوصيّة');
    expect(band.querySelector('.r305rp-band-secondary')).not.toBeNull();
    // The engine chip names the provider label verbatim (the honest
    // /ai/config surface) — the boot-level model stays on the header badge.
    expect(band.textContent).toContain('نموذج خارجيّ');
    expect(screen.getByText('openrouter', { selector: '.r305ai-mono' })).toBeInTheDocument();
    // The header badge still names the configured route.
    expect(screen.getByText('openrouter/free')).toBeInTheDocument();
  });

  it('local mode: the chip says مساعد محليّ — no provider, no model claim', () => {
    mocks.config = { data: { provider: 'local', model: null }, isPending: false, isError: false };
    renderPage();
    expect(screen.getByText('مساعد محليّ')).toBeInTheDocument();
    expect(screen.queryByText('نموذج خارجيّ')).toBeNull();
  });

  it('unverifiable mode (pending config) keeps the honest LOCAL chip — same default as the greeting', () => {
    mocks.config = { data: undefined, isPending: true, isError: false };
    renderPage();
    expect(screen.getByText('مساعد محليّ')).toBeInTheDocument();
    expect(screen.queryByText('نموذج خارجيّ')).toBeNull();
  });
});

// ─── 3 · the ledger ───────────────────────────────────────────────

describe('R305-A7 — the conversation ledger', () => {
  it('every turn carries a role micro-label — المساعد for bot rows, أنت for user rows', async () => {
    mocks.chat.mutateAsync.mockResolvedValueOnce({ conversationId: 'c1', reply: 'جواب تجريبي' });
    const { container } = renderPage();
    fireEvent.change(screen.getByLabelText('اكتب سؤالك للمساعد'), { target: { value: 'سؤالي' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
    await screen.findByText('جواب تجريبي');

    const rows = container.querySelectorAll('.chat-msg');
    expect(rows.length).toBeGreaterThanOrEqual(3); // greeting + user + reply
    expect(container.textContent).toContain('أنت');
    const roles = [...container.querySelectorAll('.r305ai-role')].map((el) => el.textContent);
    expect(roles).toContain('المساعد');
    // The user turn's row carries the user class — the indent hook.
    expect(container.querySelector('.chat-msg.user')).not.toBeNull();
  });

  it('hairline row separation is bound in the sheet source (the ledger rule)', () => {
    const css = stripComments(read('src/styles/r305-research-pdf-ai.css'));
    expect(css).toMatch(/\.r305rp \.chat-msg \+ \.chat-msg\s*\{[^}]*border-block-start: 1px solid var\(--surface-divider\)/);
    // …and the marker scopes every §D restyle: every selector that
    // targets .chat-bubble in the sheet carries the .r305rp prefix.
    const selectors = [...css.matchAll(/([^{}]+)\{/g)].map((m) => m[1]!);
    const bubbleSelectors = selectors.filter((sel) => sel.includes('.chat-bubble'));
    expect(bubbleSelectors.length).toBeGreaterThan(0);
    expect(bubbleSelectors.every((sel) => sel.includes('.r305rp'))).toBe(true);
  });
});

// ─── 4 · honesty regressions ──────────────────────────────────────

describe('R305-A7 — error panels disclose the envelope support code', () => {
  it('apiErrorCode (pure): the envelope code passes verbatim; junk stays null', () => {
    const envelope = { response: { data: { error: { code: 'TOO_MANY_REQUESTS', message: 'طلبات كثيرة' } } } };
    expect(apiErrorCode(envelope)).toBe('TOO_MANY_REQUESTS');
    expect(apiErrorCode(new Error('Network Error'))).toBeNull();
    expect(apiErrorCode({ response: { data: { error: { code: 429 } } } })).toBeNull();
    expect(apiErrorCode(undefined)).toBeNull();
  });

  it('a rate-limited turn renders the Arabic message AND the real code chip', async () => {
    mocks.chat.mutateAsync.mockRejectedValueOnce({
      response: { data: { error: { code: 'TOO_MANY_REQUESTS', message: 'طلبات كثيرة — انتظر قليلاً ثم أعد المحاولة' } } },
    });
    const { container } = renderPage();
    fireEvent.change(screen.getByLabelText('اكتب سؤالك للمساعد'), { target: { value: 'سؤالي' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
    expect(await screen.findByText('طلبات كثيرة — انتظر قليلاً ثم أعد المحاولة')).toBeInTheDocument();
    // The support code is the envelope's OWN code, rendered verbatim.
    const code = screen.getByText('TOO_MANY_REQUESTS');
    expect(code.className).toContain('r305ai-err-code');
    expect(code.closest('.chat-error')).not.toBeNull();
    // And the real retry affordance is still there.
    expect(screen.getByRole('button', { name: 'أعد إرسال سؤالك' })).toBeInTheDocument();
  });

  it('a codeless failure renders NO code chip (nothing is invented)', async () => {
    mocks.chat.mutateAsync.mockRejectedValueOnce(new Error('Network Error'));
    const { container } = renderPage();
    fireEvent.change(screen.getByLabelText('اكتب سؤالك للمساعد'), { target: { value: 'سؤال شبكة' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
    expect(await screen.findByText('تعذَّر الاتصال بالمساعد الآن.')).toBeInTheDocument();
    expect(container.querySelector('.r305ai-err-code')).toBeNull();
  });
});

describe('R305-A7 — the composer tells the truth', () => {
  it('the input is a real TEXTAREA with the same 4000 server bound', () => {
    renderPage();
    const input = screen.getByLabelText('اكتب سؤالك للمساعد') as unknown as HTMLTextAreaElement;
    expect(input.tagName).toBe('TEXTAREA');
    expect(input.maxLength).toBe(4000);
  });

  it('Enter sends, Shift+Enter breaks the line (the multi-line contract)', async () => {
    mocks.chat.mutateAsync.mockResolvedValue({ conversationId: 'c1', reply: 'جواب' });
    renderPage();
    const input = screen.getByLabelText('اكتب سؤالك للمساعد');
    fireEvent.change(input, { target: { value: 'سؤال بالزر' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: false });
    await waitFor(() => expect(mocks.chat.mutateAsync).toHaveBeenCalledWith({ conversationId: undefined, message: 'سؤال بالزر' }));

    fireEvent.change(input, { target: { value: 'سطر أول' } });
    fireEvent.keyDown(input, { key: 'Enter', shiftKey: true });
    // Shift+Enter must NOT send.
    expect(mocks.chat.mutateAsync).toHaveBeenCalledTimes(1);
  });

  it('input + send ride the ONE .r305rp-next accent rail; send is .btn accent', () => {
    const { container } = renderPage();
    const rail = container.querySelector('.r305ai-input-rail')!;
    expect(rail.className).toContain('r305rp-next');
    const send = screen.getByRole('button', { name: 'إرسال' });
    expect(send.className).toContain('btn');
    expect(send.className).toContain('accent');
    expect(send.className).toContain('chat-send');
    // The single emphasized action of the page region.
    expect(container.querySelectorAll('.r305rp-next')).toHaveLength(1);
  });

  it('send stays disabled while empty or in-flight (honest button)', async () => {
    let resolveTurn!: (v: { conversationId: string; reply: string }) => void;
    mocks.chat.mutateAsync.mockImplementationOnce(
      () => new Promise((res) => { resolveTurn = res as typeof resolveTurn; }),
    );
    const { rerender } = renderPage();
    const send = screen.getByRole('button', { name: 'إرسال' });
    expect(send).toBeDisabled(); // empty draft
    fireEvent.change(screen.getByLabelText('اكتب سؤالك للمساعد'), { target: { value: 'سؤال' } });
    expect(screen.getByRole('button', { name: 'إرسال' })).not.toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
    await waitFor(() => expect(mocks.chat.mutateAsync).toHaveBeenCalled());
    // In-flight: the shared mutation flips to pending and re-renders.
    mocks.chat.isPending = true;
    rerender(
      <MemoryRouter>
        <AiAssistantPage />
      </MemoryRouter>,
    );
    expect(screen.getByRole('button', { name: 'إرسال' })).toBeDisabled();
    resolveTurn({ conversationId: 'c1', reply: 'جواب' });
  });
});

describe('R305-A7 — the pending state invents nothing', () => {
  it('the non-streaming truth: a status line tied to the request, NO stop/cancel control', () => {
    mocks.chat.isPending = true;
    const { container } = renderPage();
    // The truthful status (the API is a single JSON round-trip — no
    // streaming pretense, no fabricated progress).
    expect(screen.getByText('المساعد يجهّز الردّ…')).toBeInTheDocument();
    // No stop/cancel mechanism exists in the API — none may be faked.
    expect(screen.queryByText('إيقاف')).toBeNull();
    expect(screen.queryByText('إيقاف التوليد')).toBeNull();
    expect(screen.queryByRole('button', { name: /إيقاف|إلغاء التوليد|إيقاف التوليد/ })).toBeNull();
    // The log announces busy to AT while the request is real.
    expect(screen.getByRole('log')).toHaveAttribute('aria-busy', 'true');
    expect(container).toBeTruthy();
  });

  it('no citation/attachment chrome exists — the API returns none', async () => {
    mocks.chat.mutateAsync.mockResolvedValueOnce({ conversationId: 'c1', reply: 'جواب بلا مصادر' });
    const { container } = renderPage();
    fireEvent.change(screen.getByLabelText('اكتب سؤالك للمساعد'), { target: { value: 'سؤالي' } });
    fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
    await screen.findByText('جواب بلا مصادر');
    expect(container.querySelector('[class*="cite"]')).toBeNull();
    expect(container.querySelector('[class*="citation"]')).toBeNull();
    expect(container.querySelector('[class*="attachment"]')).toBeNull();
  });
});
