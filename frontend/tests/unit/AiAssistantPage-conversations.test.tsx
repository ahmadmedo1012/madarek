/**
 * r164g — AiAssistantPage conversation-management + failed-turn pins.
 *
 * The page-level contracts this file pins:
 *  · Failed-turn recovery: a provider/transport failure renders the
 *    SERVER's own Arabic message in a recoverable error bubble (the
 *    honest rate-limit / provider-outage copy the backend sends), and
 *    the retry affordance re-delivers the SAME prompt in place — no
 *    duplicate question bubble, no stale error row (the server never
 *    wrote the failed turn: its writes are one post-reply transaction).
 *  · Pending honesty: input/chips/suggestions/conversation rows
 *    disable while a reply or a switch is pending; the retry affordance
 *    hides (the typing indicator owns the moment); the log is aria-busy.
 *  · Conversation management: list (titles + relative dates), switch
 *    (loads the stored transcript, marks the row current, next send
 *    targets it), new conversation (greeting reset, undefined id),
 *    delete with a TWO-STEP confirm (no accidental loss) — and deleting
 *    the current conversation resets the log honestly.
 *  · Role-aware suggestions: non-students get the teaching/assessment
 *    starters, not the mastery questions their role has no data for.
 *
 * The pure transcript mapper (transcriptFromRows) is pinned directly —
 * the DB-free house pattern. Hooks are mocked at the useResources
 * boundary (config-test idiom); jsdom's scrollTo is stubbed.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AiAssistantPage, { transcriptFromRows } from '../../src/pages/student/AiAssistantPage';
import { useAuthStore, type AuthUser } from '../../src/stores/auth.store';
import type { AiMessageRow } from '../../src/hooks/useResources';

const mocks = vi.hoisted(() => ({
  chat: { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() },
  config: { data: undefined as undefined | { provider: 'local' | 'openai'; model: string | null }, isPending: true, isError: false },
  gaps: { data: [] as unknown[], isPending: false, isError: false, refetch: () => undefined },
  conversations: {
    data: [] as Array<{ id: string; title: string | null; createdAt: string }>,
    isPending: false,
    isError: false,
    refetch: () => undefined,
  },
  delConversation: { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() },
  fetchMessages: vi.fn(async (_id: string) => [] as AiMessageRow[]),
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

/* 3 hours ago — far enough from any rounding boundary that the shared
 * formatRelativeAr renders the stable «منذ 3 ساعات» under jsdom. */
const H3_AGO = new Date(Date.now() - 3 * 3_600_000).toISOString();

const CONV1 = { id: 'c1', title: 'عنوان أول محادثة', createdAt: H3_AGO };
const CONV2 = { id: 'c2', title: null, createdAt: H3_AGO };

/** The backend's 429 envelope — an Arabic message that must win over
 * the generic bubble (the honest cause, not a masked one). */
const RATE_LIMITED = {
  response: { data: { error: { code: 'TOO_MANY_REQUESTS', message: 'طلبات كثيرة — انتظر قليلاً ثم أعد المحاولة' } } },
};
/** Latin transport prose — apiErrorMessage's Arabic guard must reject
 * it so the RTL log renders the Arabic fallback instead. */
const NETWORK_ERROR = new Error('Network Error');

const ROWS: AiMessageRow[] = [
  { id: 'm1', role: 'USER', content: 'سؤال قديم', createdAt: H3_AGO },
  { id: 'm2', role: 'ASSISTANT', content: 'جواب قديم', createdAt: H3_AGO },
];

beforeEach(() => {
  useAuthStore.setState({ user: STUDENT });
  window.HTMLElement.prototype.scrollTo = () => undefined;
  mocks.chat = { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() };
  mocks.config = { data: { provider: 'local', model: null }, isPending: false, isError: false };
  mocks.gaps = { data: [], isPending: false, isError: false, refetch: () => undefined };
  mocks.conversations = { data: [], isPending: false, isError: false, refetch: () => undefined };
  mocks.delConversation = { isPending: false, isError: false, error: null as unknown, mutateAsync: vi.fn() };
  mocks.fetchMessages = vi.fn(async (_id: string) => []);
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

async function send(text: string) {
  fireEvent.change(screen.getByLabelText('اكتب سؤالك للمساعد'), { target: { value: text } });
  fireEvent.click(screen.getByRole('button', { name: 'إرسال' }));
}

describe('AiAssistantPage — failed-turn recovery (r164g)', () => {
  it('renders the SERVER\'s Arabic message in the error bubble (rate limit), with a retry affordance', async () => {
    mocks.chat.mutateAsync.mockRejectedValueOnce(RATE_LIMITED);
    renderPage();
    await send('سؤالي');
    expect(await screen.findByText('طلبات كثيرة — انتظر قليلاً ثم أعد المحاولة')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'أعد إرسال سؤالك' })).toBeInTheDocument();
    // The question stays in the log — no silent loss.
    expect(screen.getByText('سؤالي')).toBeInTheDocument();
  });

  it('a Latin transport error falls back to the generic Arabic copy (never leaks English prose)', async () => {
    mocks.chat.mutateAsync.mockRejectedValueOnce(NETWORK_ERROR);
    renderPage();
    await send('سؤال شبكة');
    expect(await screen.findByText('تعذَّر الاتصال بالمساعد الآن.')).toBeInTheDocument();
    expect(screen.queryByText('Network Error')).toBeNull();
  });

  it('retry re-delivers the SAME prompt in place: no duplicate question, no stale error row', async () => {
    mocks.chat.mutateAsync
      .mockRejectedValueOnce(RATE_LIMITED)
      .mockResolvedValueOnce({ conversationId: 'c1', reply: 'الجواب بعد المحاولة' });
    renderPage();
    await send('سؤالي');
    await screen.findByText('طلبات كثيرة — انتظر قليلاً ثم أعد المحاولة');

    fireEvent.click(screen.getByRole('button', { name: 'أعد إرسال سؤالك' }));
    expect(await screen.findByText('الجواب بعد المحاولة')).toBeInTheDocument();

    // The failed row is gone and the question appears exactly ONCE.
    expect(screen.queryByText('طلبات كثيرة — انتظر قليلاً ثم أعد المحاولة')).toBeNull();
    expect(screen.queryByRole('button', { name: 'أعد إرسال سؤالك' })).toBeNull();
    expect(screen.getAllByText('سؤالي')).toHaveLength(1);
    // The retry went to the server with the same prompt.
    expect(mocks.chat.mutateAsync).toHaveBeenCalledTimes(2);
    expect(mocks.chat.mutateAsync).toHaveBeenNthCalledWith(2, { conversationId: undefined, message: 'سؤالي' });
  });

  it('a retry that fails again re-pins the error row — still exactly one question bubble', async () => {
    mocks.chat.mutateAsync
      .mockRejectedValueOnce(RATE_LIMITED)
      .mockRejectedValueOnce(RATE_LIMITED);
    renderPage();
    await send('سؤال متعثّر');
    await screen.findByText('طلبات كثيرة — انتظر قليلاً ثم أعد المحاولة');
    fireEvent.click(screen.getByRole('button', { name: 'أعد إرسال سؤالك' }));
    await screen.findByText('طلبات كثيرة — انتظر قليلاً ثم أعد المحاولة');
    expect(screen.getAllByText('سؤال متعثّر')).toHaveLength(1);
    // One live error row (the first was removed in place).
    expect(screen.getAllByText(/طلبات كثيرة/)).toHaveLength(1);
  });
});

describe('AiAssistantPage — pending-state honesty (r164g)', () => {
  it('while a reply is pending: input/chips/suggestions/rows disable, retry hides, the log is aria-busy', async () => {
    mocks.conversations = { data: [CONV1], isPending: false, isError: false, refetch: () => undefined };
    mocks.chat.mutateAsync.mockRejectedValueOnce(NETWORK_ERROR);
    const { rerender } = renderPage();
    await send('سؤال معلّق');
    await screen.findByText('تعذَّر الاتصال بالمساعد الآن.');
    expect(screen.getByRole('button', { name: 'أعد إرسال سؤالك' })).toBeInTheDocument();

    // Flip the shared chat mock to pending and re-render the same tree.
    mocks.chat.isPending = true;
    rerender(
      <MemoryRouter>
        <AiAssistantPage />
      </MemoryRouter>,
    );

    expect(screen.getByLabelText('اكتب سؤالك للمساعد')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'إرسال' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'محادثة جديدة' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'فتح محادثة: عنوان أول محادثة' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'حذف محادثة: عنوان أول محادثة' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'لخّص الفصل الأخير' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'ما المفاهيم التي أحتاج إلى مراجعتها؟' })).toBeDisabled();
    // The typing indicator owns the pending moment — retry hides.
    expect(screen.queryByRole('button', { name: 'أعد إرسال سؤالك' })).toBeNull();
    expect(screen.getByText('المساعد يجهّز الردّ…')).toBeInTheDocument();
    expect(screen.getByRole('log')).toHaveAttribute('aria-busy', 'true');
  });
});

describe('AiAssistantPage — conversation management (r164g)', () => {
  it('lists conversations with titles (null title degrades honestly) and relative dates; none current initially', () => {
    mocks.conversations = { data: [CONV1, CONV2], isPending: false, isError: false, refetch: () => undefined };
    renderPage();
    expect(screen.getByText('عنوان أول محادثة')).toBeInTheDocument();
    expect(screen.getByText('محادثة')).toBeInTheDocument(); // CONV2: title null → honest fallback
    expect(screen.getAllByText('منذ 3 ساعات')).toHaveLength(2);
    // No current-conversation indicator before any switch.
    expect(screen.queryByText('الحالية')).toBeNull();
    expect(document.querySelector('.ai-conv-row[aria-current="true"]')).toBeNull();
  });

  it('switching loads the stored transcript, marks the row current, and the next send targets it', async () => {
    mocks.conversations = { data: [CONV1], isPending: false, isError: false, refetch: () => undefined };
    renderPage();

    // While loading, the transcript is replaced (no stale content
    // pretending to be the conversation).
    let resolveRows!: (rows: AiMessageRow[]) => void;
    mocks.fetchMessages.mockImplementationOnce(
      () => new Promise<AiMessageRow[]>((res) => { resolveRows = res; }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'فتح محادثة: عنوان أول محادثة' }));
    await waitFor(() => expect(screen.queryByText(/أحلّل بيانات إتقانك محليّاً/)).toBeNull());
    resolveRows(ROWS);

    expect(await screen.findByText('سؤال قديم')).toBeInTheDocument();
    expect(screen.getByText('جواب قديم')).toBeInTheDocument();
    // Current-conversation indicator: badge + aria-current on the row.
    expect(screen.getByText('الحالية')).toBeInTheDocument();
    expect(document.querySelector('.ai-conv-row[aria-current="true"]')).not.toBeNull();

    // The next send continues THE SAME conversation.
    await send('سؤال متابعة');
    await waitFor(() => {
      expect(mocks.chat.mutateAsync).toHaveBeenCalledWith({ conversationId: 'c1', message: 'سؤال متابعة' });
    });
  });

  it('a switch failure renders the honest error + «أعد فتح المحادثة» retry, and retry recovers', async () => {
    mocks.conversations = { data: [CONV1], isPending: false, isError: false, refetch: () => undefined };
    mocks.fetchMessages
      .mockRejectedValueOnce({ response: { data: { error: { message: 'انقطع الاتصال بالخادم' } } } })
      .mockResolvedValueOnce(ROWS);
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'فتح محادثة: عنوان أول محادثة' }));
    expect(await screen.findByText('انقطع الاتصال بالخادم')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'أعد فتح المحادثة' })).toBeInTheDocument();
    // The welcome bubble is untouched — the chat is not dead.
    expect(screen.getByText(/أحلّل بيانات إتقانك محليّاً/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'أعد فتح المحادثة' }));
    expect(await screen.findByText('سؤال قديم')).toBeInTheDocument();
    expect(screen.queryByText('انقطع الاتصال بالخادم')).toBeNull();
  });

  it('«محادثة جديدة» resets to the greeting and the next send starts a FRESH conversation', async () => {
    mocks.conversations = { data: [CONV1], isPending: false, isError: false, refetch: () => undefined };
    mocks.fetchMessages.mockResolvedValueOnce(ROWS);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'فتح محادثة: عنوان أول محادثة' }));
    await screen.findByText('سؤال قديم');

    fireEvent.click(screen.getByRole('button', { name: 'محادثة جديدة' }));
    expect(await screen.findByText(/أحلّل بيانات إتقانك محليّاً/)).toBeInTheDocument();
    expect(screen.queryByText('سؤال قديم')).toBeNull();
    // The row is no longer current.
    expect(screen.queryByText('الحالية')).toBeNull();

    mocks.chat.mutateAsync.mockResolvedValueOnce({ conversationId: 'c9', reply: 'جواب جديد' });
    await send('أول سؤال جديد');
    await waitFor(() => {
      expect(mocks.chat.mutateAsync).toHaveBeenCalledWith({ conversationId: undefined, message: 'أول سؤال جديد' });
    });
  });

  it('delete is a TWO-STEP confirm — the first click only asks; cancel reverts', async () => {
    mocks.conversations = { data: [CONV1], isPending: false, isError: false, refetch: () => undefined };
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'حذف محادثة: عنوان أول محادثة' }));
    expect(screen.getByRole('button', { name: 'تأكيد الحذف' })).toBeInTheDocument();
    expect(mocks.delConversation.mutateAsync).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    expect(screen.queryByRole('button', { name: 'تأكيد الحذف' })).toBeNull();
    expect(screen.getByRole('button', { name: 'حذف محادثة: عنوان أول محادثة' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'حذف محادثة: عنوان أول محادثة' }));
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الحذف' }));
    await waitFor(() => expect(mocks.delConversation.mutateAsync).toHaveBeenCalledWith('c1'));
  });

  it('deleting the CURRENT conversation resets the log honestly; another row\'s delete leaves it alone', async () => {
    mocks.conversations = { data: [CONV1, CONV2], isPending: false, isError: false, refetch: () => undefined };
    mocks.fetchMessages.mockResolvedValue(ROWS);
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'فتح محادثة: عنوان أول محادثة' }));
    await screen.findByText('سؤال قديم');

    // Delete an UNRELATED conversation first: the open transcript stays.
    fireEvent.click(screen.getByRole('button', { name: 'حذف محادثة: محادثة' }));
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الحذف' }));
    await waitFor(() => expect(mocks.delConversation.mutateAsync).toHaveBeenCalledWith('c2'));
    expect(screen.getByText('سؤال قديم')).toBeInTheDocument();

    // Now delete the CURRENT one: the log resets to a fresh greeting.
    fireEvent.click(screen.getByRole('button', { name: 'حذف محادثة: عنوان أول محادثة' }));
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الحذف' }));
    await waitFor(() => expect(mocks.delConversation.mutateAsync).toHaveBeenCalledWith('c1'));
    expect(await screen.findByText(/أحلّل بيانات إتقانك محليّاً/)).toBeInTheDocument();
    expect(screen.queryByText('سؤال قديم')).toBeNull();

    mocks.chat.mutateAsync.mockResolvedValueOnce({ conversationId: 'c9', reply: 'جواب' });
    await send('بعد الحذف');
    await waitFor(() => {
      expect(mocks.chat.mutateAsync).toHaveBeenCalledWith({ conversationId: undefined, message: 'بعد الحذف' });
    });
  });

  it('a failed delete surfaces the honest error row without killing the list', async () => {
    mocks.conversations = { data: [CONV1], isPending: false, isError: false, refetch: () => undefined };
    const rejection = { response: { data: { error: { message: 'لا يمكن إتمام الحذف الآن' } } } };
    mocks.delConversation.mutateAsync.mockRejectedValueOnce(rejection);
    const { rerender } = renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'حذف محادثة: عنوان أول محادثة' }));
    fireEvent.click(screen.getByRole('button', { name: 'تأكيد الحذف' }));
    await waitFor(() => expect(mocks.delConversation.mutateAsync).toHaveBeenCalledWith('c1'));
    // react-query would flip the shared mutation state to failed —
    // mirror it and re-render the same tree.
    mocks.delConversation.isError = true;
    mocks.delConversation.error = rejection;
    rerender(
      <MemoryRouter>
        <AiAssistantPage />
      </MemoryRouter>,
    );
    expect(screen.getByText('تعذَّر حذف المحادثة')).toBeInTheDocument();
    expect(screen.getByText('لا يمكن إتمام الحذف الآن')).toBeInTheDocument();
    // The row is operable again after the failure.
    expect(screen.getByRole('button', { name: 'حذف محادثة: عنوان أول محادثة' })).toBeInTheDocument();
  });

  it('an empty list renders the honest empty note; a list error renders retry', () => {
    renderPage();
    expect(screen.getByText(/لا توجد محادثات سابقة بعد/)).toBeInTheDocument();

    cleanup();
    mocks.conversations = { data: [], isPending: false, isError: true, refetch: () => undefined };
    renderPage();
    expect(screen.getByText('تعذَّر تحميل محادثاتك')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إعادة المحاولة' })).toBeInTheDocument();
  });
});

describe('AiAssistantPage — role-aware suggestions (r164g)', () => {
  it('a teacher sees teaching/assessment starters, not the mastery questions their role has no data for', () => {
    mocks.conversations = { data: [CONV1], isPending: false, isError: false, refetch: () => undefined };
    useAuthStore.setState({ user: { ...STUDENT, role: 'TEACHER' as const } });
    renderPage();
    expect(screen.getByText('اقترح طريقة لتقييم فهم الطلاب بعد كل محاضرة')).toBeInTheDocument();
    expect(screen.queryByText('ما المفاهيم التي أحتاج إلى مراجعتها؟')).toBeNull();
    // No mastery-awareness chip either — nothing is invented.
    expect(screen.queryByText('واعٍ بمستوى إتقانك')).toBeNull();
  });
});

describe('transcriptFromRows (pure)', () => {
  it('maps USER→user and ASSISTANT→bot, preserving order', () => {
    const out = transcriptFromRows(ROWS, 'ترحيب');
    expect(out).toEqual([
      { role: 'user', text: 'سؤال قديم' },
      { role: 'bot', text: 'جواب قديم' },
    ]);
  });

  it('drops SYSTEM rows defensively — a stored system row is not a chat turn', () => {
    const rows: AiMessageRow[] = [
      { id: 's1', role: 'SYSTEM', content: 'prompt', createdAt: H3_AGO },
      { id: 'm1', role: 'USER', content: 'سؤال', createdAt: H3_AGO },
    ];
    expect(transcriptFromRows(rows, 'ترحيب')).toEqual([{ role: 'user', text: 'سؤال' }]);
  });

  it('an empty result degrades to the welcome bubble — never a blank chat area', () => {
    expect(transcriptFromRows([], 'ترحيب')).toEqual([{ role: 'bot', text: 'ترحيب' }]);
  });
});
