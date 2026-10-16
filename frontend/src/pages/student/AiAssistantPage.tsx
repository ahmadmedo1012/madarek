import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, AlertCircle, ArrowLeft, Brain, RefreshCw, Plus, Trash2, MessageSquare } from 'lucide-react';
import { Card, Badge, UserAvatar, AlertRow } from '../../components/primitives';
import { Skeleton } from '../../components/primitives/States';
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
import { apiErrorMessage, formatRelativeAr } from '../../lib/format';

interface ChatMsg {
  role: 'bot' | 'user';
  text: string;
  /** Failed exchange — renders as a recoverable error row with retry. */
  error?: boolean;
  /** The user text to re-send when retrying a failed exchange. */
  retryText?: string;
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
  'مرحبًا! أنا مساعدك الدراسيّ المدعوم بنموذج لغويّ حقيقيّ. أرى بيانات إتقانك في المنصّة لتركّز إجاباتي على فجواتك المعرفيّة. كيف أساعدك؟';
const REAL_GREETING_OTHER =
  'مرحبًا! أنا مساعدك المدعوم بنموذج لغويّ حقيقيّ. لا أملك بيانات إتقان للمقرّرات التي تدرّسها، لكن أستطيع مساعدتك في أسئلة التدريس والتقييم وتنظيم المقرّرات. كيف أساعدك؟';

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

/** Render text with newlines preserved (chat replies use \n). */
function Multiline({ children }: { children: string }) {
  return (
    <>
      {children.split('\n').map((line, i) => (
        <p key={i} style={{ margin: 0, minHeight: line ? undefined : '0.5em' }}>
          {line}
        </p>
      ))}
    </>
  );
}

/** A conversation switch in flight / failed (r164g). The failed id is
 * kept so the retry affordance can re-attempt the SAME conversation. */
type ConvLoad =
  | { phase: 'idle' }
  | { phase: 'loading' }
  | { phase: 'error'; id: string; message: string };

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

  /* Pending honesty (r164g): everything that could strand or duplicate
   * an in-flight exchange is disabled while a reply or a conversation
   * switch is pending — the input, the chips, the suggestions, and
   * every conversation row. */
  const busy = chat.isPending || convLoad.phase === 'loading';

  useEffect(() => {
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      // Smooth scrolling is motion too — respect the reduced-motion preference.
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [messages, chat.isPending, reducedMotion]);

  const deliver = async (t: string) => {
    try {
      const res = await chat.mutateAsync({ conversationId, message: t });
      setConversationId(res.conversationId);
      // r166d: the turn's engine attribution rides the message row so
      // the bubble can name WHICH engine produced it — the boot-level
      // badge can flip across a redeploy; the per-turn tag cannot lie.
      setMessages((m) => [...m, { role: 'bot', text: res.reply, engine: res.engine, model: res.model }]);
    } catch (err) {
      // Recoverable failure: the exchange stays in the log with a retry
      // affordance instead of pretending nothing happened. The server's
      // own Arabic message wins when it has one (rate limit, honest
      // provider outage) — a fixed generic bubble would hide the real
      // cause (r164g; apiErrorMessage's Arabic guard keeps Latin
      // transport prose out of the RTL log).
      setMessages((m) => [
        ...m,
        { role: 'bot', text: apiErrorMessage(err, 'تعذَّر الاتصال بالمساعد الآن.'), error: true, retryText: t },
      ]);
    }
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

  const initials = user?.avatarInitials ?? 'أنا';
  const convList = conversations.data ?? [];

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المساعد الذكيّ</h1>
          <p className="page-subtitle">
            {isRealLlm
              ? 'مساعدك الدراسيّ مدعوم بنموذج لغويّ حقيقيّ يرى بيانات إتقانك ويعطي إجابات مخصّصة لك.'
              : 'يحلّل بيانات إتقانك محليّاً ويقترح خطوة مذاكرة تالية — مساعد تحليليّ محليّ، لا نموذج لغويّ خارجيّ.'}
          </p>
        </div>
        {/* The badge names the real model when one answers — an LLM
            badge on template replies (or the reverse) would be a lie. */}
        <Badge color="gold" icon={Sparkles}>{isRealLlm && aiConfig.data?.model ? aiConfig.data.model : 'AI'}</Badge>
      </header>

      {/* Gap-aware starter cards — real data from /me/gaps. The card is a
          progressive enhancement: honest skeleton while loading, an inline
          error note on failure, and simply absent when there are no gaps. */}
      {gaps.isPending ? (
        <Card title="بناءً على أدائك" icon={Brain} subtitle="مفاهيم تحتاج إلى توضيح — اضغط على أيٍّ منها لطرح سؤال مباشر على المساعد">
          <div className="grid-3" aria-busy="true" aria-live="polite">
            {[0, 1, 2].map((i) => (
              <div key={i} className="ai-gap-card" aria-hidden>
                <Skeleton width="60%" height={10} />
                <Skeleton width="80%" height={14} />
                <Skeleton width="45%" height={10} />
              </div>
            ))}
          </div>
        </Card>
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
        <Card
          title="بناءً على أدائك"
          icon={Brain}
          subtitle="مفاهيم تحتاج إلى توضيح — اضغط على أيٍّ منها لطرح سؤال مباشر على المساعد"
        >
          <div className="grid-3">
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
                      point — student.css pairs it with --warning-ink
                      (7.29:1 light / 9.90:1 dark) after the raw
                      --warning gold measured 2.13:1 on the light card. */}
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
        </Card>
      ) : null}

      <div className="grid-2-1">
        <Card
          title="محادثتك مع المساعد"
          icon={Bot}
          actions={
            /* r164g context honesty: mastery context IS sent for
             * students (r160 prompt composition) in BOTH engine modes —
             * the local composer reads the same mastery rows. The chip
             * states exactly that awareness and nothing more; roles with
             * no mastery rows see no chip (nothing is invented). */
            isStudent ? <Badge color="brand" icon={Brain}>واعٍ بمستوى إتقانك</Badge> : undefined
          }
        >
          {/* role=log + aria-live: screen readers hear every reply and
              error as the conversation grows (audit 0-d P1).
              tabIndex (r152a A6 P2-2): the scroller has no focusable
              children and the input lives outside it — without a tab
              stop, keyboard-only users could never arrow-scroll the
              transcript. The universal :focus-visible ring applies. */}
          <div className="chat-area" ref={scroller} role="log" tabIndex={0} aria-live="polite" aria-label="سجلّ المحادثة مع المساعد" aria-busy={busy}>
            {convLoad.phase === 'loading' ? (
              <div aria-busy="true" aria-live="polite" className="flex-col gap-2">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="chat-msg bot" aria-hidden>
                    <div className="chat-avatar"><Icon icon={Bot} size={14} /></div>
                    <div className="chat-bubble" style={{ background: 'var(--surface-2)' }}>
                      <Skeleton width={i === 1 ? '90%' : '60%'} height={12} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <>
                {transcript.map((m, i) => (
                  <div key={i} className={`chat-msg ${m.role}`}>
                    {m.role === 'bot' ? (
                      <div className="chat-avatar"><Icon icon={Bot} size={14} /></div>
                    ) : (
                      <UserAvatar initials={initials} size={28} color="var(--surface-3)" />
                    )}
                    {m.error ? (
                      <div className="chat-error" role="alert">
                        <span>{m.text}</span>
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
                        <Multiline>{m.text}</Multiline>
                        {/* r166d per-turn engine tag — muted mono under the
                            reply text, existing utility classes only (no new
                            CSS). Honest in both directions: a real provider
                            turn names its model, a composer turn names the
                            composer; untagged = no data for that turn. */}
                        {m.engine && (
                          <div className="font-mono text-xxs text-subtle" style={{ marginBlockStart: 'var(--sp-1)' }}>
                            {m.model ?? m.engine}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
                {convLoad.phase === 'error' && (
                  <div className="chat-msg bot">
                    <div className="chat-avatar"><Icon icon={Bot} size={14} /></div>
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
                {chat.isPending && (
                  <div className="chat-msg bot">
                    <div className="chat-avatar"><Icon icon={Bot} size={14} /></div>
                    <div className="chat-typing">
                      <span className="chat-typing-dot" />
                      <span className="chat-typing-dot" />
                      <span className="chat-typing-dot" />
                      <span className="visually-hidden">المساعد يجهّز الردّ…</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

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

          <div className="chat-input-row">
            <input
              className="chat-input"
              placeholder="اكتب سؤالك…"
              aria-label="اكتب سؤالك للمساعد"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void send(); }}
              disabled={busy}
            />
            <button
              type="button"
              className="chat-send"
              onClick={() => void send()}
              disabled={!input.trim() || busy}
              aria-label="إرسال"
            >
              <Icon icon={Send} size={15} />
            </button>
          </div>
        </Card>

        {/* r164g — conversation management: list/switch/clear with the
            current-conversation indicator and a two-step delete confirm
            (clearing an exchange is irreversible — no accidental loss). */}
        <div className="flex-col" style={{ gap: 'var(--sp-6)', minWidth: 0 }}>
          <Card
            title="محادثاتك"
            icon={MessageSquare}
            actions={
              <button type="button" className="btn ghost sm" onClick={startNewConversation} disabled={busy}>
                <Icon icon={Plus} size={13} />
                محادثة جديدة
              </button>
            }
          >
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
              <p className="list-row-sub" style={{ padding: 'var(--sp-2) var(--sp-1)' }}>
                لا توجد محادثات سابقة بعد — ابدأ بأول سؤال وستظهر محادثاتك هنا.
              </p>
            ) : (
              <div className="flex-col">
                {delConversation.isError && (
                  <div style={{ padding: 'var(--sp-2)' }}>
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
                          {current && <Badge color="brand">الحالية</Badge>}
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

          <Card title="أسئلة مقترحة" icon={Sparkles}>
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
                  <span className="list-row-body text-sm" style={{ color: 'var(--text-muted)' }}>{q}</span>
                </button>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
