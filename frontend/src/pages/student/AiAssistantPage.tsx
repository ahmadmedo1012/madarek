import { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  AlertCircle,
  ArrowLeft,
  Brain,
  RefreshCw,
  Plus,
  Trash2,
  UserRound,
  /* r323 B1.1 — streaming + per-answer affordances */
  Square,
  Copy,
  Check,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
  Clock3,
} from 'lucide-react';
import { Card, Badge, AlertRow } from '../../components/primitives';
import { Skeleton } from '../../components/primitives/States';
/* R319 (c3-S2) — the §B2 kit: the mono-indexed section title bar, the
 * hatched empty cell + the mono status chip (the pages-B sweep). */
import { SectionBar, BarCount, StatusChip, EmptyCell } from '../../components/student';
/* G النهائية: الترويسة على عقد patterns — السطح محادثة موطّنة داخل
   إطار العائلة نفسه (PageFrame/PageHeader) لا ودجات دردشة عامة. */
import { PageFrame, PageHeader } from '../../components/patterns';
import { useReducedMotion } from '../../components/motion';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth.store';
import {
  useAiChat,
  useAiConfig,
  useGaps,
  useAiConversations,
  useDeleteAiConversation,
  fetchAiConversationMessages,
  type AiMessageRow,
} from '../../hooks/useResources';
import { apiErrorMessage, formatRelativeAr, countAr } from '../../lib/format';
/* r323 B1.1 — the SSE streaming client (the AI section of lib/api):
 * fetch + ReadableStream consumption, the pure frame parser, the typed
 * pre-stream HTTP error, the per-answer feedback call, and the daily
 * quota phrase matcher. The JSON mutation (useAiChat) STAYS as the
 * fallback transport — same endpoint, same engine, honestly labeled. */
import {
  AiStreamHttpError,
  canStreamAi,
  isDailyQuotaMessage,
  sendAiFeedback,
  streamAiChat,
} from '../../lib/api';
import { queryClient } from '../../lib/queryClient';
import { formatReplyBlocks } from './aiReplyFormat';
import '../../styles/ai.css'; /* r261: سطح المحادثة المركّز — البنية الجديدة فقط (.ai-layout/.ai-surface/.ai-gaps/.ai-composer) */
import '../../styles/r305-research-pdf-ai.css'; /* R305-A7 «Heron»: لغة العائلة التقنيّة — يُستورد مباشرة بعد ai.css (عقد §0) */
/* R319 (c3-S2): the sheet system — the §B2 component anatomy + the
 * academic family's harmonics (the same pair every converted student
 * page rides; the r305rp deep band + the copper input rail keep their
 * own pinned registers). */
import '../../styles/r319-student.css';
import '../../styles/r319-student-pages.css';

interface ChatMsg {
  role: 'bot' | 'user';
  text: string;
  /** Failed exchange — renders as a recoverable error row with retry. */
  error?: boolean;
  /** The user text to re-send when retrying a failed exchange. */
  retryText?: string;
  /** r305-A7: the backend envelope's own support code (UPPER_SNAKE,
   * e.g. TOO_MANY_REQUESTS) — rendered verbatim when present. Nothing
   * is invented: a codeless failure stays codeless. */
  code?: string;
  /* r166d (WS-F5) — per-turn engine attribution from the chat envelope.
   * Present only on turns received AFTER this change (a conversation
   * loaded from the server carries no per-message engine data — those
   * bubbles stay honestly untagged). Undefined on failures (nothing
   * was produced) and on old-backend payloads. r175: `engine` is the
   * honest provider label (string — openrouter is a real value now,
   * not `openai` merely because the transport is OpenAI-compatible);
   * `model` is the per-RESPONSE attribution the backend derived from
   * the provider's own `model` field. */
  engine?: string;
  model?: string;
  /* r323 B1.1 — streaming + per-answer state:
   *  · `streaming` marks the bubble tokens are arriving into (the
   *    cursor rides it; it finalizes into a plain bubble on done, a
   *    partial bubble on stop, and never persists — the server only
   *    writes a turn after a COMPLETE reply exists);
   *  · `messageId` is the persisted assistant row's id (the SSE `done`
   *    frame / the JSON envelope's additive field) — the key the
   *    thumbs up/down feedback targets; absent = no feedback buttons;
   *  · `rating` is the optimistic thumbs state (±1, the server's
   *    SMALLINT contract; reverted honestly if the write fails). */
  streaming?: boolean;
  messageId?: string;
  rating?: 1 | -1;
}

/* Role-aware first questions. The student set rides the mastery-aware
 * contract (both engines see the student's mastery rows); the other
 * set matches what the generic assistant actually covers — teaching,
 * assessment and course organization — instead of asking a teacher
 * «ما المفاهيم التي أحتاج إلى مراجعتها؟» (a mastery question their role
 * has no data for). */
const STUDENT_SUGGESTIONS = [
  'ما المفاهيم التي أحتاج إلى مراجعتها؟',
  'اقترح لي خطّة مذاكرة لفجواتي المعرفيّة',
  'كيف أحسّن درجتي في أضعف مفاهيمي؟',
  'ما خطوتي الدراسيّة التالية؟',
  'راجع معي المفاهيم التي أتعثّر فيها',
];
const OTHER_SUGGESTIONS = [
  'اقترح طريقة لتقييم فهم الطلاب بعد كل محاضرة',
  'كيف أنظّم مقرّري عبر الأسابيع بدفعة زمنية واضحة؟',
  'اقترح أنشطة تفاعلية تزيد مشاركة الطلاب في المحاضرة',
  'كيف أصوغ أسئلة اختبار تقيس الفهم لا الحفظ؟',
];

/* P4: the two engines' copy. The page NEVER claims an LLM while the
 * template composer replies (or vice versa) — /ai/config decides.
 * Unknown (pending/error) renders the LOCAL copy: the honest default
 * when the mode is unverifiable. */
const LOCAL_GREETING_STUDENT =
  'مرحبًا! أنا مساعدك الدراسيّ. أحلّل بيانات إتقانك محليّاً (بلا نموذج لغويّ خارجيّ) لأقترح خطوات مذاكرة تركّز على فجواتك المعرفيّة. كيف أساعدك؟';
const LOCAL_GREETING_OTHER =
  'مرحبًا! أنا مساعد تحليليّ محليّ (بلا نموذج لغويّ خارجيّ). لا أملك بيانات إتقان للمقرّرات التي تدرّسها، فإجاباتي عامّة. كيف أساعدك؟';
const REAL_GREETING_STUDENT =
  'مرحبًا! أنا مساعدك الدراسيّ المدعوم بنموذج لغويّ حقيقيّ عبر مزوّد خارجيّ. أرى بيانات إتقانك ومقرّراتك المسجَّلة في المنصّة لتركّز إجاباتي على فجواتك المعرفيّة. كيف أساعدك؟';
const REAL_GREETING_OTHER =
  'مرحبًا! أنا مساعدك المدعوم بنموذج لغويّ حقيقيّ عبر مزوّد خارجيّ. لا أملك بيانات إتقان، لكن أستطيع مساعدتك في أسئلة التدريس والتقييم وتنظيم المقرّرات. كيف أساعدك؟';

/* r176c (privacy disclosure, P1-1 from the r176-B audit): a REAL
 * provider processes the conversation OFF-platform — mastery facts
 * and message content cross to a third-party AI service. The student
 * deserves one honest line that says so, visible on every render of
 * the real-engine mode (the greeting is replaced after the first
 * turn; this line is persistent). Factual only: names the flow, makes
 * no claims about the provider's downstream handling. */
const PRIVACY_DISCLOSURE =
  'إشعار الخصوصيّة: تُرسَل رسائلك وبيانات إتقانك إلى مزوّد ذكاء اصطناعيّ خارجيّ (المسمّى في الشارة أعلاه) لتوليد الردّ.';

/* r323 B1.1 — the daily-quota card («وصلتَ حدَّ اليوم»). The card's
 * body prefers the SERVER's own Arabic rejection verbatim (the honest
 * cause, including the exact limit number); this fallback covers the
 * preemptive render (the `done` frame said remaining = 0 — no
 * rejection has happened yet, so there is no server sentence to show).
 * The card is a STATE, not a dead end: the composer stays enabled (the
 * server, not the client, owns the limit — it lifts at the UTC
 * boundary, and the standing rate limiter is still the real gate). */
const DAILY_QUOTA_FALLBACK_NOTE =
  'انتهت حصّتك اليوميّة من أسئلة المساعد الذكيّ — عُد غدًا أو تابع من محادثاتك السابقة.';
/* The streamed-turn quota sentinel: the `done` frame's `remaining` is
 * omitted entirely when the quota store was unavailable (0 could then
 * mean «unknown», never «exhausted» — no invented card). */
const QUOTA_UNKNOWN = -1;

/**
 * r164g — map stored conversation rows to the transcript shape.
 * USER→user, ASSISTANT→bot; SYSTEM rows are dropped defensively (none
 * are written today, and a stored system row is not a chat turn).
 * An empty result degrades to the welcome bubble so a loaded
 * conversation can never render a blank chat area. Pure (DB-free pin
 * target; the greeting is injected so tests stay config-independent).
 */
export function transcriptFromRows(rows: readonly AiMessageRow[], greeting: string): ChatMsg[] {
  const mapped = rows
    .filter((r) => r.role !== 'SYSTEM')
    .map((r): ChatMsg => ({ role: r.role === 'USER' ? 'user' : 'bot', text: r.content }));
  return mapped.length > 0 ? mapped : [{ role: 'bot', text: greeting }];
}

/**
 * r305-A7 — the backend error envelope's own support code, verbatim.
 * The envelope shape mirrors apiErrorDetailRaw (lib/format): the code
 * is UPPER_SNAKE English by D17-3 and is MEANT for a support chip.
 * Pure, local, and honest: absent code → null → nothing rendered.
 */
export function apiErrorCode(error: unknown): string | null {
  const code = (error as { response?: { data?: { error?: { code?: unknown } } } })
    ?.response?.data?.error?.code;
  return typeof code === 'string' && code.length > 0 && code.length < 64 ? code : null;
}

/** Render text with newlines preserved (chat replies use \n).
 * r176c: assistant replies ride the markdown-lite formatter — plain
 * lines verbatim (emphasis/heading markers stripped), consecutive
 * `-`/`*` list lines as one RTL list. User text renders VERBATIM
 * (typed by a human, no markup to strip). r305-A7: line/list chrome
 * moved to §D classes — no TSX inline spacing. */
function Multiline({ children }: { children: string }) {
  return (
    <>
      {children.split('\n').map((line, i) => (
        <p key={i} className={line ? 'r305ai-line' : 'r305ai-line r305ai-line--breath'}>
          {line}
        </p>
      ))}
    </>
  );
}

/** The assistant bubble's formatter-rendered content (r176c). */
function ReplyText({ text }: { text: string }) {
  return (
    <>
      {formatReplyBlocks(text).map((block, i) =>
        block.kind === 'list' ? (
          <ul key={i} className="r305ai-list">
            {block.items.map((item, j) => (
              <li key={j}>{item}</li>
            ))}
          </ul>
        ) : (
          block.lines.map((line, j) => (
            <p key={`${i}-${j}`} className={line ? 'r305ai-line' : 'r305ai-line r305ai-line--breath'}>
              {line}
            </p>
          ))
        ),
      )}
    </>
  );
}

/** A conversation switch in flight / failed (r164g). The failed id is
 * kept so the retry affordance can re-attempt the SAME conversation. */
type ConvLoad =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'error'; id: string; message: string };

/** Role micro-label — the ledger's identity line (label + tick; the
 * role is NEVER carried by color alone). */
function RoleLabel({ who }: { who: 'bot' | 'user' }) {
  return (
    <span className="r305ai-role">
      <Icon icon={who === 'bot' ? Bot : UserRound} size={12} />
      {who === 'bot' ? 'المساعد' : 'أنت'}
    </span>
  );
}

export default function AiAssistantPage() {
  const user = useAuthStore((s) => s.user);
  const chat = useAiChat();
  const gaps = useGaps();
  const conversations = useAiConversations();
  const delConversation = useDeleteAiConversation();
  /* P4: which engine answers — drives the badge, the subtitle, and the
   * greeting (the initial bot message renders derived, so the copy
   * flips the moment the config resolves — no flash, no state surgery).
   * r175: any non-local, non-null label is a REAL external LLM
   * (openai/openrouter/groq/hostname) — the label itself stays honest,
   * so the check is «ليس محليًا» rather than a two-member union. */
  const aiConfig = useAiConfig();
  const isRealLlm = aiConfig.data?.provider != null && aiConfig.data.provider !== 'local';
  const reducedMotion = useReducedMotion();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const isStudent = user?.role === 'STUDENT';
  const greeting = isRealLlm
    ? isStudent
      ? REAL_GREETING_STUDENT
      : REAL_GREETING_OTHER
    : isStudent
      ? LOCAL_GREETING_STUDENT
      : LOCAL_GREETING_OTHER;
  const suggestions = isStudent ? STUDENT_SUGGESTIONS : OTHER_SUGGESTIONS;
  const [messages, setMessages] = useState<ChatMsg[]>([{ role: 'bot', text: greeting }]);
  /* The transcript's initial greeting renders DERIVED from the config
   * (the state row is a placeholder instance): once the user sends
   * anything, the state-owned transcript takes over for good. */
  const transcript: ChatMsg[] =
    messages.length === 1 && messages[0]!.role === 'bot' && !messages[0]!.error
      ? [{ role: 'bot', text: greeting }]
      : messages;
  const [input, setInput] = useState('');
  const [convLoad, setConvLoad] = useState<ConvLoad>({ phase: 'idle' });
  /* Two-step delete confirm — clearing a conversation is destructive
   * (its whole exchange is gone); the first click only asks. */
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  /* r323 B1.1 — the SSE streaming state machine. 'connecting' = the
   * request is in flight (no token yet — the typing dots own the
   * moment); 'writing' = deltas are landing in the streaming bubble.
   * The AbortController rides a ref (the stop button cancels without a
   * re-render of its own). */
  const [streamPhase, setStreamPhase] = useState<'idle' | 'connecting' | 'writing'>('idle');
  const abortRef = useRef<AbortController | null>(null);
  /* The daily-quota card state: the server's own rejection message
   * when one arrived, else the honest fallback copy. null = no card. */
  const [quotaLimited, setQuotaLimited] = useState<string | null>(null);
  /* The last known per-user remaining-ask count (the `done` frame's
   * quota telemetry). QUOTA_UNKNOWN = the server said nothing — no
   * number is ever invented. Surfaced nowhere yet; the card renders
   * when the count REACHES 0. */
  const [quotaRemaining, setQuotaRemaining] = useState<number>(QUOTA_UNKNOWN);
  /* Transient «تم النسخ» state for the per-answer copy affordance. */
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const copiedTimer = useRef<number | null>(null);
  useEffect(
    () => () => {
      // Unmount (or a new conversation): cancel an in-flight stream and
      // the copy-flash timer — no setState on a dead component.
      abortRef.current?.abort();
      if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
    },
    [],
  );

  /* Pending honesty (r164g): everything that could strand or duplicate
   * an in-flight exchange is disabled while a reply or a conversation
   * switch is pending — the input, the chips, the suggestions, and
   * every conversation row. r323 B1.1: an in-flight STREAM counts —
   * the composer locks and the send slot turns into the stop button. */
  const busy = chat.isPending || convLoad.phase === 'loading' || streamPhase !== 'idle';

  /* r305-A7 a11y — the busy-window focus restore: the pending turn
   * disables the composer, the quick chips and the conversation rows,
   * and disabling the FOCUSED control drops focus to <body> (browser
   * behavior) — a keyboard user mid-conversation lands nowhere and Tab
   * restarts from the page top, on EVERY message. Track the last
   * focused element (focusin — capture must happen BEFORE the disable
   * commit) and hand focus back when the window closes, but only if
   * focus is genuinely stranded (never steal a focus the user moved
   * elsewhere). */
  const lastFocusedRef = useRef<HTMLElement | null>(null);
  useEffect(() => {
    const track = () => {
      const el = document.activeElement;
      if (el instanceof HTMLElement && el !== document.body) lastFocusedRef.current = el;
    };
    document.addEventListener('focusin', track);
    return () => document.removeEventListener('focusin', track);
  }, []);
  useEffect(() => {
    if (busy) return;
    const memo = lastFocusedRef.current;
    if (!memo || !memo.isConnected) return;
    const active = document.activeElement;
    if (active === null || active === document.body) {
      memo.focus();
      lastFocusedRef.current = null;
    }
  }, [busy]);

  /* r176c (C3): auto-scroll only when the user is AT (or near ≤80px)
   * the bottom. A student who scrolled up to reread a definition must
   * not be yanked down when the reply lands. The ref (not state — no
   * re-render needed) tracks near-bottom from onScroll; the effect
   * consults it BEFORE scrolling. */
  const autoScroll = useRef(true);
  const handleScroll = () => {
    const el = scroller.current;
    if (!el) return;
    autoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 80;
  };

  useEffect(() => {
    if (!autoScroll.current) return;
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      // Smooth scrolling is motion too — respect the reduced-motion preference.
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [messages, chat.isPending, reducedMotion]);

  /* ── r323 B1.1 — the reply delivery dispatcher ─────────────────────
   *
   * The SAME user turn rides whichever transport the environment
   * supports, against the SAME endpoint (POST /ai/chat):
   *  · STREAM (default in every real browser): `?stream=1` SSE —
   *    tokens render the moment they arrive, the stop button cancels,
   *    and the `done` frame (the server's own final turn) replaces the
   *    client buffer so a transport drop can never truncate the answer.
   *  · JSON (no streaming primitives / 401): the historical mutation —
   *    it re-enters the axios instance and KEEPS the 401-refresh
   *    interceptor the raw fetch path lacks.
   * The fallback rules are honesty-bounded, not error-swallowing:
   * a PRE-STREAM failure (fetch never reached the server, or the auth
   * gate rejected before anything was consumed) falls back; a REAL
   * rejection (spent daily quota, rate limiter, provider outage) is
   * rendered — re-asking would double-consume the daily quota and
   * could stitch two answers into one lie. */

  /** Push the empty bubble the tokens stream into. Called only once
   * the SSE response HEADERS arrived — a pre-flight failure leaves
   * nothing on screen to clean up before the JSON fallback. */
  const openStreamingBubble = (streamed: { value: boolean }): void => {
    if (streamed.value) return;
    streamed.value = true;
    setStreamPhase('writing');
    setMessages((m) => [...m, { role: 'bot', text: '', streaming: true }]);
  };

  const appendToken = (delta: string): void => {
    setMessages((m) => {
      const next = [...m];
      const last = next.length - 1;
      if (last >= 0 && next[last]?.streaming) {
        next[last] = { ...next[last]!, text: next[last]!.text + delta };
      }
      return next;
    });
  };

  const deliverStreamed = async (t: string): Promise<void> => {
    const controller = new AbortController();
    abortRef.current = controller;
    setStreamPhase('connecting');
    const streamed = { value: false };
    try {
      const done = await streamAiChat({
        conversationId,
        message: t,
        signal: controller.signal,
        onToken: (delta) => {
          openStreamingBubble(streamed);
          appendToken(delta);
        },
      });
      // done: the SERVER's final turn replaces whatever the client
      // buffer accumulated (honest by construction — the persisted
      // answer is exactly what renders). An empty-token stream that
      // somehow completed still gets its bubble here.
      openStreamingBubble(streamed);
      setMessages((m) => {
        const next = [...m];
        const last = next.length - 1;
        if (last >= 0 && next[last]?.streaming) {
          next[last] = {
            role: 'bot',
            text: done.reply,
            engine: done.engine,
            model: done.model,
            messageId: done.messageId,
          };
        } else {
          next.push({
            role: 'bot',
            text: done.reply,
            engine: done.engine,
            model: done.model,
            messageId: done.messageId,
          });
        }
        return next;
      });
      setConversationId(done.conversationId);
      // Quota telemetry from the done frame (omitted = unknown — no
      // invented number, no invented card). remaining === 0 renders
      // the «وصلتَ حدَّ اليوم» card preemptively: the NEXT ask will
      // be rejected, and the card says so before the failure does.
      if (typeof done.remaining === 'number') {
        setQuotaRemaining(done.remaining);
        setQuotaLimited(done.remaining <= 0 ? DAILY_QUOTA_FALLBACK_NOTE : null);
      }
      // A streamed turn may have CREATED a conversation — the sidebar
      // refreshes exactly like the JSON mutation's onSuccess does
      // (the module-singleton client; the page renders without a
      // QueryClientProvider in the unit-test harness).
      void queryClient.invalidateQueries({ queryKey: ['ai', 'conversations'] });
    } catch (err) {
      if (controller.signal.aborted) {
        // STOP pressed — a cancellation, not an outage. The server
        // persisted nothing for an aborted turn: the partial text (if
        // any arrived) stays as an honest untagged bubble with no
        // feedback affordances; an empty one disappears entirely.
        setMessages((m) =>
          m.flatMap((msg, i) => {
            if (i === m.length - 1 && msg.streaming) {
              return msg.text.trim().length > 0 ? [{ role: 'bot' as const, text: msg.text }] : [];
            }
            return [msg];
          }),
        );
        return;
      }
      if (err instanceof AiStreamHttpError) {
        // The server spoke: its envelope code + Arabic message win
        // verbatim. The daily-quota 429 renders the «وصلتَ حدَّ اليوم»
        // card (the one 429 that is a state, not a retryable row).
        if (isDailyQuotaMessage(err.serverMessage)) {
          setQuotaLimited(err.serverMessage);
          return;
        }
        setMessages((m) => [
          ...m,
          {
            role: 'bot',
            text: err.serverMessage,
            error: true,
            retryText: t,
            code: err.code,
          },
        ]);
        return;
      }
      // Pre-stream transport failure (fetch never reached the server —
      // e.g. offline): rethrow to the dispatcher's JSON fallback.
      throw err;
    } finally {
      abortRef.current = null;
      setStreamPhase('idle');
    }
  };

  /** The JSON grammar — the historical path, byte-for-byte (the
   * optimistic-bubble contract, the retry affordance shape, and the
   * exact mutation-argument shape the unit tests pin ride on it). */
  const deliverJson = async (t: string): Promise<void> => {
    try {
      const res = await chat.mutateAsync({ conversationId, message: t });
      setConversationId(res.conversationId);
      // r166d: the turn's engine attribution rides the message row so
      // the bubble can name WHICH engine produced it — the boot-level
      // badge can flip across a redeploy; the per-turn tag cannot lie.
      // r323 B1.1: the envelope's additive `messageId` (the persisted
      // assistant row) arms the per-answer feedback on JSON turns too;
      // an older backend payload simply omits it (no buttons, no lie).
      setMessages((m) => [
        ...m,
        {
          role: 'bot',
          text: res.reply,
          engine: res.engine,
          model: res.model,
          messageId: (res as { messageId?: string }).messageId,
        },
      ]);
    } catch (err) {
      // Recoverable failure: the exchange stays in the log with a retry
      // affordance instead of pretending nothing happened. The server's
      // own Arabic message wins when it has one (rate limit, honest
      // provider outage) — a fixed generic bubble would hide the real
      // cause (r164g; apiErrorMessage's Arabic guard keeps Latin
      // transport prose out of the RTL log). r305-A7: the envelope's
      // own support code rides the row verbatim when present.
      // r323 B1.1: the DAILY-quota 429 (the server's own «وصلتَ حدَّ
      // الأسئلة اليوميّ» sentence) is a state, not a dead error row —
      // it renders the quota card. The standing rate limiter's 429s
      // keep the recoverable row (a retry after the window is honest).
      const serverMsg = apiErrorMessage(err, '');
      if (serverMsg && isDailyQuotaMessage(serverMsg)) {
        setQuotaLimited(serverMsg);
        return;
      }
      setMessages((m) => [
        ...m,
        {
          role: 'bot',
          text: serverMsg || 'تعذَّر الاتصال بالمساعد الآن.',
          error: true,
          retryText: t,
          code: apiErrorCode(err) ?? undefined,
        },
      ]);
    }
  };

  const deliver = async (t: string): Promise<void> => {
    if (canStreamAi()) {
      try {
        await deliverStreamed(t);
        return;
      } catch (err) {
        // ONLY a never-reached-server failure lands here (see the
        // dispatcher header): fall back to the JSON grammar — the
        // mutation re-enters axios and keeps the refresh interceptor.
        if (err instanceof AiStreamHttpError && err.status === 401) {
          await deliverJson(t);
          return;
        }
        if (err instanceof AiStreamHttpError) {
          // Belt-and-braces: a typed rejection that escaped the stream
          // handler still renders honestly (never a silent retry).
          if (isDailyQuotaMessage(err.serverMessage)) {
            setQuotaLimited(err.serverMessage);
          } else {
            setMessages((m) => [
              ...m,
              { role: 'bot', text: err.serverMessage, error: true, retryText: t, code: err.code },
            ]);
          }
          return;
        }
        // Anything else = pre-flight (network) — JSON fallback below.
      }
    }
    await deliverJson(t);
  };

  const send = async (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || busy) return;
    // Optimistic user bubble: the turn is visible the moment it is sent.
    setMessages((m) => [...m, { role: 'user', text: t }]);
    setInput('');
    await deliver(t);
  };

  /* Retry a failed exchange IN PLACE (r164g): the user's question is
   * already in the log, so the failed row is removed and the same
   * prompt re-delivered — no duplicate question bubble, no stale
   * error row, and the server never wrote the failed turn (its writes
   * are one transaction that only runs after a reply exists). */
  const retryExchange = (index: number) => {
    const failed = messages[index];
    if (!failed?.error || !failed.retryText || chat.isPending) return;
    setMessages((m) => m.filter((_, i) => i !== index));
    void deliver(failed.retryText);
  };

  /* ── r323 B1.1 — the per-answer affordances ───────────────────────── */

  /** STOP: cancel the in-flight SSE stream. The reader throws
   * AbortError; deliverStreamed keeps the partial text (or drops the
   * empty bubble) and the server persists nothing — a cancellation,
   * never an outage row. */
  const stopStreaming = () => {
    abortRef.current?.abort();
  };

  /** Copy one assistant answer to the clipboard, with the transient
   * «تم النسخ» flash. An unavailable/failed clipboard no-ops honestly
   * (no fake success state). */
  const copyAnswer = (index: number, text: string) => {
    const clip = navigator.clipboard;
    if (!clip) return;
    clip
      .writeText(text)
      .then(() => {
        setCopiedIdx(index);
        if (copiedTimer.current !== null) window.clearTimeout(copiedTimer.current);
        copiedTimer.current = window.setTimeout(() => {
          setCopiedIdx((cur) => (cur === index ? null : cur));
          copiedTimer.current = null;
        }, 2000);
      })
      .catch(() => undefined);
  };

  /** Thumbs up/down on a PERSISTED answer (messageId). The optimistic
   * rating flips immediately; a failed write reverts — no fake ✓. The
   * backend upserts the (messageId, userId) pair, so re-clicking (or
   * switching sides) honestly rewrites the one row. */
  const rateAnswer = (index: number, messageId: string, rating: 1 | -1) => {
    setMessages((m) => m.map((msg, j) => (j === index ? { ...msg, rating } : msg)));
    sendAiFeedback(messageId, rating).catch(() => {
      setMessages((m) => m.map((msg, j) => (j === index ? { ...msg, rating: undefined } : msg)));
    });
  };

  /** Regenerate the LAST answer: the question is re-delivered as a new
   * turn in the SAME conversation (the previous attempt stays in the
   * stored history as context — the model legitimately sees it) while
   * the local log swaps the old answer out for the fresh one. The
   * re-ask consumes quota like any ask — the honest cost of a second
   * attempt. */
  const regenerateAnswer = (botIndex: number) => {
    if (busy) return;
    let question: string | undefined;
    for (let i = botIndex - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === 'user') {
        question = messages[i]!.text;
        break;
      }
    }
    if (!question) return;
    setMessages((m) => m.slice(0, botIndex));
    void deliver(question);
  };

  const openConversation = async (id: string) => {
    if (busy || id === conversationId) return;
    setConfirmDeleteId(null);
    setConvLoad({ phase: 'loading' });
    try {
      const rows = await fetchAiConversationMessages(id);
      setConversationId(id);
      setMessages(transcriptFromRows(rows, greeting));
      setConvLoad({ phase: 'idle' });
    } catch (err) {
      // The transcript stays as-is; the affordance to re-open rides
      // the same id so retry retries the same conversation.
      setConvLoad({ phase: 'error', id, message: apiErrorMessage(err, 'تعذَّر فتح المحادثة.') });
    }
  };

  const startNewConversation = () => {
    if (busy) return;
    setConversationId(undefined);
    setMessages([{ role: 'bot', text: greeting }]);
    setConvLoad({ phase: 'idle' });
    setConfirmDeleteId(null);
  };

  const deleteConversation = async (id: string) => {
    try {
      await delConversation.mutateAsync(id);
      setConfirmDeleteId(null);
      if (id === conversationId) {
        // The open transcript no longer exists server-side — reset to
        // a fresh conversation instead of a dead log.
        setConversationId(undefined);
        setMessages([{ role: 'bot', text: greeting }]);
        setConvLoad({ phase: 'idle' });
      }
    } catch {
      // delConversation.isError renders the honest row; close the
      // confirm step either way so the row is operable again.
      setConfirmDeleteId(null);
    }
  };

  const askAboutGap = (conceptName: string) => {
    void send(`اشرح لي مفهوم "${conceptName}" — لاحظت أنّ لديّ فجوة فيه.`);
  };

  const convList = conversations.data ?? [];

  /* r323 B1.1 — the transcript's action-row context. The greeting-only
   * placeholder (the derived initial bubble) carries no affordances —
   * there is no turn behind it yet. The LAST completed answer owns the
   * regenerate affordance (only one answer can be re-asked at a time;
   * older answers keep copy/feedback). */
  const greetingOnly = messages.length === 1 && messages[0]!.role === 'bot' && !messages[0]!.error;
  let lastAnswerIndex = -1;
  transcript.forEach((m, i) => {
    if (m.role === 'bot' && !m.error && !m.streaming && m.text.trim().length > 0) lastAnswerIndex = i;
  });

  return (
    <div className="r305rp r319s-page">
      <PageFrame>
        {/* G: ترويسة patterns — نفس بنية ترويسات العائلة كلها؛ وصف الوضع
            الصادق يبقى نصًّا فرعيًّا والشارة في خانة الإجراءات. */}
        <PageHeader
          title="المساعد الذكيّ"
          description={
            isRealLlm
              ? 'مساعدك الدراسيّ مدعوم بنموذج لغويّ حقيقيّ يرى بيانات إتقانك ويعطي إجابات مخصّصة لك.'
              : 'يحلّل بيانات إتقانك محليّاً ويقترح خطوة مذاكرة تالية — مساعد تحليليّ محليّ، لا نموذج لغويّ خارجيّ.'
          }
          /* The badge names the real model when one answers — an LLM
             badge on template replies (or the reverse) would be a lie. */
          actions={<Badge color="gold" icon={Sparkles}>{isRealLlm && aiConfig.data?.model ? aiConfig.data.model : 'AI'}</Badge>}
        />

        {/* r261 (4E، اتجاه Superlist): شريط الفجوات — سياق المصادر يسبق
            السطح بلا غلاف Card: سطر تعريف هادئ ثم بطاقات الفجوات في صفّ.
            بيانات حقيقية من /me/gaps؛ هيكل صادق: هيكل مطابق أثناء التحميل,
            ملاحظة خطأ مدمجة عند الفشل، وغياب تامّ بلا فجوات. */}
        {gaps.isPending ? (
          <div className="ai-gaps" aria-busy="true" aria-live="polite">
            {/* R319 (c3-S2): the gaps strip's heading joins the §B2
                title-bar register — [01] with the honest gap count as
                mono meta once resolved; the old hint line survives as
                the quiet note under the bar (honest copy, verbatim). */}
            <SectionBar index="01" title="بناءً على أدائك" />
            <p className="r319sp-sec-note">مفاهيم تحتاج إلى توضيح — اضغط على أيٍّ منها لطرح سؤال مباشر على المساعد</p>
            <div className="ai-gaps-row">
              {[0, 1, 2].map((i) => (
                <div key={i} className="ai-gap-card" aria-hidden>
                  <Skeleton width="60%" height={10} />
                  <Skeleton width="80%" height={14} />
                  <Skeleton width="45%" height={10} />
                </div>
              ))}
            </div>
          </div>
        ) : gaps.isError ? (
          <AlertRow
            color="red"
            icon={AlertCircle}
            title="تعذَّر تحليل فجواتك المعرفيّة"
            description="لن تظهر بطاقات المفاهيم المقترحة، لكن يمكنك مواصلة المحادثة مع المساعد بشكل طبيعي."
            actions={
              <button type="button" className="btn ghost sm" onClick={() => gaps.refetch()}>
                <Icon icon={RefreshCw} size={13} />
                إعادة المحاولة
              </button>
            }
          />
        ) : gaps.data && gaps.data.length > 0 ? (
          <div className="ai-gaps">
            {/* R319 (c3-S2): the resolved strip's bar carries the honest
                measured-gaps count (countAr for assistive tech). */}
            <SectionBar
              index="01"
              title="بناءً على أدائك"
              meta={(
                <BarCount
                  n={gaps.data.length}
                  srLabel={countAr(gaps.data.length, ['فجوة واحدة ذات أولويّة', 'فجوتان ذاتا أولويّة', 'فجوات ذات أولويّة', 'فجوةً ذات أولويّة'])}
                />
              )}
            />
            <p className="r319sp-sec-note">مفاهيم تحتاج إلى توضيح — اضغط على أيٍّ منها لطرح سؤال مباشر على المساعد</p>
            <div className="ai-gaps-row">
              {gaps.data.slice(0, 3).map((g) => (
                <button
                  key={g.conceptId}
                  type="button"
                  className="ai-gap-card"
                  onClick={() => askAboutGap(g.conceptName)}
                  disabled={busy}
                >
                  <div className="ai-gap-head">
                    <Icon icon={AlertCircle} size={14} className="ai-gap-warn" />
                    <span className="text-xxs text-subtle">{g.courseName}</span>
                    {/* 21-c (A5 P1-2): the mastery % is the card's whole
                        point — the mono numeral keeps the technical
                        register; the % is data, never a state color. */}
                    <span className="ai-gap-pct">{Math.round(g.level * 100)}%</span>
                  </div>
                  <div className="ai-gap-name">{g.conceptName}</div>
                  <div className="ai-gap-cta">
                    اسأل المساعد عن هذا المفهوم
                    {/* In RTL, "continue" points left — the literal → glyph
                        mirrored the wrong way (audit 0-d P2). */}
                    <Icon icon={ArrowLeft} size={12} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {/* r261: سطح المحادثة المركّز — اللوحة هي الصفحة: رأس شريط يحمل
            سياق الوعي، السجلّ يملأ المسافة، والمرسِل يلتصق بأسفل اللوحة
            (جوال أولًا). role=log + aria-live كما هي — العقد الاختبارية
            (.chat-area وأسماء الأزرار) لم تتغيّر. */}
        <div className="ai-layout">
          <section className="ai-surface" aria-label="محادثتك مع المساعد">
            {/* r305-A7: رأس السجلّ هو النطاق العميق الوحيد (منطقة الحالة):
                العنوان + رقائق الإفصاح (المحرّك/الوعي) + سطر الخصوصية
                الدائم — كل الإفصاحات في مكان واحد صادق. */}
            <div className="ai-surface-head r305rp-band--deep r305ai-head">
              <div className="r305ai-head-main">
                <span className="ai-surface-title r305ai-head-title"><Icon icon={Bot} size={16} />محادثتك مع المساعد</span>
                <div className="r305ai-head-chips">
                  {/* Engine/config chip — the /ai/config surface itself.
                      Real provider → the dot turns copper and the chip
                      names the provider LABEL verbatim; local/unverified
                      → the honest local label (same default as the
                      greeting copy). The boot-level model stays on the
                      header badge; per-turn truth rides the reply tags. */}
                  {isRealLlm ? (
                    <span className="r305rp-chip r305rp-chip--accent r305ai-chip-deep">
                      <span className="r305rp-chip-dot" />
                      نموذج خارجيّ
                      <span className="r305ai-mono">{aiConfig.data?.provider}</span>
                    </span>
                  ) : (
                    <span className="r305rp-chip r305ai-chip-deep">
                      <span className="r305rp-chip-dot" />
                      مساعد محليّ
                    </span>
                  )}
                  {/* r164g context honesty: mastery context IS sent for
                   * students (r160 prompt composition) in BOTH engine modes —
                   * the local composer reads the same mastery rows. The chip
                   * states exactly that awareness and nothing more; roles with
                   * no mastery rows see no chip (nothing is invented). */
                  isStudent ? (
                    <span className="r305rp-chip r305rp-chip--icon r305ai-chip-deep">
                      <Icon icon={Brain} size={12} />
                      واعٍ بمستوى إتقانك
                    </span>
                  ) : null}
                </div>
              </div>
              {/* r176c: the persistent privacy disclosure — the real engine
                  processes messages off-platform; one honest line, always
                  visible in real-LLM mode (the greeting alone would vanish
                  after the first turn). */}
              {isRealLlm && (
                <p className="r305rp-band-secondary r305ai-head-privacy">
                  {PRIVACY_DISCLOSURE}
                </p>
              )}
            </div>
            {/* role=log + aria-live: screen readers hear every reply and
                error as the conversation grows (audit 0-d P1).
                tabIndex (r152a A6 P2-2): the scroller has no focusable
                children and the input lives outside it — without a tab
                stop, keyboard-only users could never arrow-scroll the
                transcript. The universal :focus-visible ring applies. */}
            <div className="chat-area" ref={scroller}
                onScroll={handleScroll} role="log" tabIndex={0} aria-live="polite" aria-label="سجلّ المحادثة مع المساعد" aria-busy={busy}>
              {convLoad.phase === 'loading' ? (
                <div aria-busy="true" aria-live="polite" className="flex-col gap-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="chat-msg bot" aria-hidden>
                      <RoleLabel who="bot" />
                      <div className="chat-bubble ai-bubble-skeleton">
                        <Skeleton width={i === 1 ? '90%' : '60%'} height={12} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <>
                  {transcript.map((m, i) => (
                    <div key={i} className={`chat-msg ${m.role}`}>
                      <RoleLabel who={m.role} />
                      {m.error ? (
                        <div className="chat-error" role="alert">
                          <span>{m.text}</span>
                          {/* The envelope's own support code, verbatim —
                              never invented, never translated. */}
                          {m.code && (
                            <span className="r305ai-err-meta">
                              <span>رمز الدعم:</span>
                              <span className="r305ai-err-code">{m.code}</span>
                            </span>
                          )}
                          {m.retryText && !chat.isPending && (
                            <button
                              type="button"
                              className="chat-retry"
                              onClick={() => retryExchange(i)}
                            >
                              <Icon icon={RefreshCw} size={12} />
                              أعد إرسال سؤالك
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="chat-bubble">
                          {m.role === 'bot' ? <ReplyText text={m.text} /> : <Multiline>{m.text}</Multiline>}
                          {/* r323 B1.1: the streaming caret — tokens are
                              still landing in THIS bubble (aria-hidden;
                              the transcript's aria-live carries the text). */}
                          {m.streaming && <span className="ai-stream-cursor" aria-hidden />}
                          {/* r166d per-turn engine tag — muted mono under the
                              reply text, existing utility classes only (no new
                              CSS). Honest in both directions: a real provider
                              turn names its model, a composer turn names the
                              composer; untagged = no data for that turn. */}
                          {m.engine && (
                            <div className="font-mono text-xxs text-subtle ai-engine-tag">
                              {m.model ?? m.engine}
                            </div>
                          )}
                          {/* r323 B1.1 — the per-answer affordances row
                              (copy / thumbs / regenerate). Only COMPLETED
                              answers get it (a streaming bubble and the
                              greeting placeholder own none), feedback needs
                              the persisted row's id, and regenerate belongs
                              to the last answer alone. */}
                          {m.role === 'bot' && !greetingOnly && !m.streaming && m.text.trim().length > 0 && (
                            <div className="ai-msg-actions">
                              <button
                                type="button"
                                className="ai-msg-action"
                                onClick={() => copyAnswer(i, m.text)}
                                aria-label="نسخ الردّ"
                                title="نسخ الردّ"
                              >
                                <Icon icon={copiedIdx === i ? Check : Copy} size={13} />
                                {copiedIdx === i && <span className="ai-msg-action-note">تم النسخ</span>}
                              </button>
                              {m.messageId && (
                                <>
                                  <button
                                    type="button"
                                    className="ai-msg-action"
                                    onClick={() => rateAnswer(i, m.messageId!, 1)}
                                    aria-label="ردّ مفيد"
                                    aria-pressed={m.rating === 1 || undefined}
                                    title="ردّ مفيد"
                                  >
                                    <Icon icon={ThumbsUp} size={13} />
                                  </button>
                                  <button
                                    type="button"
                                    className="ai-msg-action"
                                    onClick={() => rateAnswer(i, m.messageId!, -1)}
                                    aria-label="ليس ردًّا مفيدًا"
                                    aria-pressed={m.rating === -1 || undefined}
                                    title="ليس ردًّا مفيدًا"
                                  >
                                    <Icon icon={ThumbsDown} size={13} />
                                  </button>
                                </>
                              )}
                              {i === lastAnswerIndex && (
                                <button
                                  type="button"
                                  className="ai-msg-action"
                                  onClick={() => regenerateAnswer(i)}
                                  aria-label="إعادة توليد الردّ"
                                  title="إعادة توليد الردّ"
                                  disabled={busy}
                                >
                                  <Icon icon={RotateCcw} size={13} />
                                  إعادة توليد
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                  {convLoad.phase === 'error' && (
                    <div className="chat-msg bot">
                      <RoleLabel who="bot" />
                      <div className="chat-error" role="alert">
                        <span>{convLoad.message}</span>
                        <button
                          type="button"
                          className="chat-retry"
                          onClick={() => void openConversation(convLoad.id)}
                        >
                          <Icon icon={RefreshCw} size={12} />
                          أعد فتح المحادثة
                        </button>
                      </div>
                    </div>
                  )}
                  {(chat.isPending || streamPhase === 'connecting') && (
                    <div className="chat-msg bot">
                      <RoleLabel who="bot" />
                      {/* Pre-stream honesty: the JSON request is a single
                          round-trip and the SSE request has produced no
                          token yet — the status says what is true (the
                          reply is being prepared), never a streaming
                          pretense. Once tokens flow, the growing bubble
                          itself is the indicator. */}
                      <div className="chat-typing r305ai-status">
                        <span className="chat-typing-dot" />
                        <span className="chat-typing-dot" />
                        <span className="chat-typing-dot" />
                        <span className="r305ai-status-text">المساعد يجهّز الردّ…</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* المرسِل — رقائق سريعة + صفّ الإدخال + العدّاد، ملتصقة بأسفل
                اللوحة (r261). r305-A7: صفّ الإدخال داخل سكة الإجراء
                الوحيدة (.r305rp-next) والإرسال هو الزر المُشديد الوحيد. */}
            <div className="ai-composer">
              {/* r323 B1.1 — the daily-quota card («وصلتَ حدَّ اليوم»): the
                  honest state when the DB-backed per-user daily ask quota
                  is spent. The server's own rejection copy wins when one
                  arrived; the composer stays enabled (the server owns the
                  limit — it lifts at the UTC boundary, and the standing
                  per-minute rate limiter remains the real gate). */}
              {quotaLimited && (
                <div className="ai-quota-card" role="status">
                  <Icon icon={Clock3} size={16} className="ai-quota-icon" />
                  <div className="ai-quota-body">
                    <p className="ai-quota-title">وصلتَ حدَّ اليوم</p>
                    <p className="ai-quota-note">{quotaLimited}</p>
                  </div>
                </div>
              )}
              {/* Quick-action chips above the input — Stitch signature.
                  r168b honesty gate: the local composer's REAL paths are
                  concept-explain and worst-gap surfacing (backend
                  composeReply — ai.routes.ts). «لخّص الفصل الأخير» and
                  «اختبار قصير» promise summarize/quiz generation the local
                  engine cannot deliver; they render ONLY when a real
                  provider is configured. Local/unknown mode keeps the two
                  chips the composer genuinely honors (concept-explain →
                  worst-gap answer; «أسوأ فجواتي» → the mastery-gap reply). */}
              <div className="ai-quick-actions">
                {isRealLlm ? (
                  <>
                    <button type="button" className="ai-quick-chip" onClick={() => void send('لخّص لي الفصل الأخير من المقرّر')} disabled={busy}>
                      لخّص الفصل الأخير
                    </button>
                    <button type="button" className="ai-quick-chip" onClick={() => void send('اشرح لي مفهوماً صعباً واجهته اليوم')} disabled={busy}>
                      اشرح مفهوماً
                    </button>
                    <button type="button" className="ai-quick-chip" onClick={() => void send('أنشئ لي اختباراً قصيراً (5 أسئلة)')} disabled={busy}>
                      اختبار قصير
                    </button>
                    <button type="button" className="ai-quick-chip" onClick={() => void send('اقترح موارد دراسيّة إضافيّة')} disabled={busy}>
                      موارد إضافيّة
                    </button>
                  </>
                ) : (
                  <>
                    <button type="button" className="ai-quick-chip" onClick={() => void send('اشرح لي مفهوماً صعباً واجهته اليوم')} disabled={busy}>
                      اشرح مفهوماً
                    </button>
                    <button type="button" className="ai-quick-chip" onClick={() => void send('ما المفاهيم التي أحتاج إلى مراجعتها؟')} disabled={busy}>
                      أسوأ فجواتي
                    </button>
                  </>
                )}
              </div>

              {/* The single emphasized region: input + send on the copper
                  rail (.r305rp-next). Send is disabled while empty or
                  in-flight — an honest button, never a fake action. */}
              <div className="chat-input-row r305rp-next r305ai-input-rail">
                <textarea
                  className="chat-input"
                  placeholder="اكتب سؤالك…"
                  aria-label="اكتب سؤالك للمساعد"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    // Enter sends; Shift+Enter breaks the line; IME
                    // composition is never hijacked.
                    if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  disabled={busy}
                  maxLength={4000}
                  rows={1}
                />
                {streamPhase !== 'idle' ? (
                  /* r323 B1.1 — while the SSE stream is in flight the
                     send slot IS the stop button (one control, one
                     moment): cancelling keeps the partial text and
                     persists nothing server-side. */
                  <button
                    type="button"
                    className="btn accent chat-send ai-stop"
                    onClick={stopStreaming}
                    aria-label="إيقاف التوليد"
                    title="إيقاف التوليد"
                  >
                    <Icon icon={Square} size={14} />
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn accent chat-send"
                    onClick={() => void send()}
                    disabled={!input.trim() || busy}
                    aria-disabled={busy || undefined}
                    aria-label="إرسال"
                  >
                    <Icon icon={Send} size={15} />
                  </button>
                )}
              </div>
              {input.length > 3600 && (
                <p className="text-xxs text-subtle ai-counter">
                  {input.length}/4000
                </p>
              )}
              {/* r323 B1.1 — the honest remaining-ask counter from the
                  `done` frame's quota telemetry (omitted = unknown — the
                  line only renders when the server actually said a
                  number). Hides while the quota card is up (the card is
                  the state then). */}
              {!quotaLimited && quotaRemaining !== QUOTA_UNKNOWN && (
                <p className="text-xxs text-subtle ai-counter ai-quota-remaining">
                  {countAr(quotaRemaining, [
                    'سؤال واحد متبقٍّ اليوم',
                    'سؤالان متبقّيان اليوم',
                    'أسئلة متبقّية اليوم',
                    'سؤالًا متبقّيًا اليوم',
                  ])}
                </p>
              )}
            </div>
          </section>

          {/* r164g — conversation management: list/switch/clear with the
              current-conversation indicator and a two-step delete confirm
              (clearing an exchange is irreversible — no accidental loss).
              r261: العمود الجانبي يهبط أسفل السطح على الجوال (ai-layout). */}
          <aside className="ai-side">
            {/* R319 (c3-S2): the sidebar's headings join the §B2 title-bar
                register — [02] محادثاتك (the honest conversation count as
                mono meta; the new-conversation door rides the bar's action
                slot) and [03] أسئلة مقترحة. The Card bodies keep their
                hairline regions. */}
            <SectionBar
              index="02"
              title="محادثاتك"
              meta={
                !conversations.isPending && !conversations.isError && convList.length > 0 ? (
                  <BarCount
                    n={convList.length}
                    srLabel={countAr(convList.length, ['محادثة واحدة سابقة', 'محادثتان سابقتان', 'محادثات سابقة', 'محادثةً سابقة'])}
                  />
                ) : undefined
              }
              action={(
                <button type="button" className="btn ghost sm" onClick={startNewConversation} disabled={busy}>
                  <Icon icon={Plus} size={13} />
                  محادثة جديدة
                </button>
              )}
            />
            <Card>
              {conversations.isPending ? (
                <div className="flex-col gap-2" aria-busy="true" aria-live="polite">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="list-row" aria-hidden>
                      <div className="list-row-body">
                        <Skeleton width="70%" height={12} />
                        <Skeleton width="35%" height={10} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : conversations.isError ? (
                <AlertRow
                  color="red"
                  icon={AlertCircle}
                  title="تعذَّر تحميل محادثاتك"
                  description="يمكنك مواصلة محادثتك الحالية بشكل طبيعي، وستظهر القائمة عند إعادة المحاولة."
                  actions={
                    <button type="button" className="btn ghost sm" onClick={() => conversations.refetch()}>
                      <Icon icon={RefreshCw} size={13} />
                      إعادة المحاولة
                    </button>
                  }
                />
              ) : convList.length === 0 ? (
                /* R319 (c3-S2): the empty log is the sheet's reserved-but-
                   empty region — the hatched EmptyCell (the old EmptyState's
                   copy, kept honest and verbatim). */
                <EmptyCell
                  label="لا توجد محادثات سابقة بعد"
                  note="ابدأ بأول سؤال وستظهر محادثاتك هنا."
                />
              ) : (
                <div className="flex-col">
                  {delConversation.isError && (
                    <div className="ai-conv-error-pad">
                      <AlertRow
                        color="red"
                        icon={AlertCircle}
                        title="تعذَّر حذف المحادثة"
                        description={apiErrorMessage(delConversation.error, 'لم تُحذف المحادثة — حاول مرة أخرى.')}
                      />
                    </div>
                  )}
                  {convList.map((c) => {
                    const current = c.id === conversationId;
                    const title = c.title ?? 'محادثة';
                    const confirming = confirmDeleteId === c.id;
                    return (
                      <div key={c.id} className="list-row ai-conv-row" aria-current={current ? 'true' : undefined}>
                        <button
                          type="button"
                          className="list-row-body ai-conv-open"
                          onClick={() => void openConversation(c.id)}
                          disabled={busy}
                          aria-label={`فتح محادثة: ${title}`}
                        >
                          <span className="list-row-title ai-conv-title">{title}</span>
                          <span className="list-row-sub">{formatRelativeAr(c.createdAt)}</span>
                        </button>
                        {confirming ? (
                          <div className="ai-conv-actions">
                            <button
                              type="button"
                              className="btn danger sm"
                              onClick={() => void deleteConversation(c.id)}
                              disabled={delConversation.isPending}
                              aria-disabled={delConversation.isPending || undefined}
                              title="سيُحذف سجلّ هذه المحادثة نهائيًا"
                            >
                              <Icon icon={Trash2} size={13} />
                              تأكيد الحذف
                            </button>
                            <button
                              type="button"
                              className="btn ghost sm"
                              onClick={() => setConfirmDeleteId(null)}
                              disabled={delConversation.isPending}
                            >
                              إلغاء
                            </button>
                          </div>
                        ) : (
                          <div className="ai-conv-actions">
                            {/* R319 (c3-S2): the open-conversation marker
                                rides the §B2 mono chip register — square
                                hairline ink, never a color-only Badge. */}
                            {current && <StatusChip label="CURRENT" />}
                            <button
                              type="button"
                              className="btn ghost sm"
                              onClick={() => setConfirmDeleteId(c.id)}
                              disabled={busy || delConversation.isPending}
                              aria-label={`حذف محادثة: ${title}`}
                              title="حذف هذه المحادثة نهائيًا"
                            >
                              <Icon icon={Trash2} size={13} />
                              حذف
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </Card>

            <SectionBar
              index="03"
              title="أسئلة مقترحة"
              meta={<BarCount n={suggestions.length} srLabel={countAr(suggestions.length, ['سؤال مقترح واحد', 'سؤالان مقترحان', 'أسئلة مقترحة', 'سؤالاً مقترحاً'])} />}
            />
            <Card>
              <div className="flex-col gap-2">
                {suggestions.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => void send(q)}
                    className="list-row"
                    disabled={busy}
                  >
                    <Icon icon={Sparkles} size={14} />
                    <span className="list-row-body text-sm ai-suggestion-text">{q}</span>
                  </button>
                ))}
              </div>
            </Card>
          </aside>
        </div>
      </PageFrame>
    </div>
  );
}
