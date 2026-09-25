import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, AlertCircle, ArrowLeft, Brain, RefreshCw } from 'lucide-react';
import { Card, Badge, UserAvatar, AlertRow } from '../../components/primitives';
import { Skeleton } from '../../components/primitives/States';
import { useReducedMotion } from '../../components/motion';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth.store';
import { useAiChat, useGaps } from '../../hooks/useResources';

interface ChatMsg {
  role: 'bot' | 'user';
  text: string;
  /** Failed exchange — renders as a recoverable error row with retry. */
  error?: boolean;
  /** The user text to re-send when retrying a failed exchange. */
  retryText?: string;
}

const SUGGESTIONS = [
  'كيف أحسّن درجتي في الذكاء الاصطناعي؟',
  'اشرح لي خوارزمية الفرز السريع',
  'ما الفرق بين SQL و NoSQL؟',
  'نصائح لإدارة الوقت أثناء الاختبارات',
  'كيف أبني محفظة مشاريع قوية؟',
];

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

export default function AiAssistantPage() {
  const user = useAuthStore((s) => s.user);
  const chat = useAiChat();
  const gaps = useGaps();
  const reducedMotion = useReducedMotion();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'bot',
      text:
        'مرحباً! أنا مساعدك الدراسيّ الذكيّ. لديّ صورة كاملة عن مستواك في كلّ مفهوم — يمكنني شرح ما تحتاجه، اقتراح خطّة مذاكرة، أو تحليل فجواتك المعرفيّة. كيف أساعدك؟',
    },
  ]);
  const [input, setInput] = useState('');
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({
      top: scroller.current.scrollHeight,
      // Smooth scrolling is motion too — respect the reduced-motion preference.
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [messages, chat.isPending, reducedMotion]);

  const send = async (text?: string) => {
    const t = (text ?? input).trim();
    if (!t || chat.isPending) return;
    setMessages((m) => [...m, { role: 'user', text: t }]);
    setInput('');
    try {
      const res = await chat.mutateAsync({ conversationId, message: t });
      setConversationId(res.conversationId);
      setMessages((m) => [...m, { role: 'bot', text: res.reply }]);
    } catch {
      // Recoverable failure: the exchange stays in the log with a retry
      // affordance instead of pretending nothing happened.
      setMessages((m) => [
        ...m,
        { role: 'bot', text: 'تعذَّر الاتصال بالمساعد الآن.', error: true, retryText: t },
      ]);
    }
  };

  const askAboutGap = (conceptName: string) => {
    void send(`اشرح لي مفهوم "${conceptName}" — لاحظت أنّ لديّ فجوة فيه.`);
  };

  const initials = user?.avatarInitials ?? 'أنا';

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المساعد الذكيّ</h1>
          <p className="page-subtitle">يفهم مستواك المعرفيّ ويوصي بأفضل خطوة تالية في رحلتك الدراسيّة.</p>
        </div>
        <Badge color="gold" icon={Sparkles}>AI</Badge>
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
                disabled={chat.isPending}
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
        <Card title="محادثتك مع المساعد" icon={Bot}>
          {/* role=log + aria-live: screen readers hear every reply and
              error as the conversation grows (audit 0-d P1). */}
          <div className="chat-area" ref={scroller} role="log" aria-live="polite" aria-label="سجلّ المحادثة مع المساعد">
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                {m.role === 'bot' ? (
                  <div className="chat-avatar"><Icon icon={Bot} size={14} /></div>
                ) : (
                  <UserAvatar initials={initials} size={28} color="var(--surface-3)" />
                )}
                {m.error ? (
                  <div className="chat-error">
                    <span>{m.text}</span>
                    {m.retryText && !chat.isPending && (
                      <button
                        type="button"
                        className="chat-retry"
                        onClick={() => void send(m.retryText)}
                      >
                        <Icon icon={RefreshCw} size={12} />
                        أعد إرسال سؤالك
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="chat-bubble">
                    <Multiline>{m.text}</Multiline>
                  </div>
                )}
              </div>
            ))}
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
          </div>

          {/* Quick-action chips above the input — Stitch signature */}
          <div className="ai-quick-actions">
            <button type="button" className="ai-quick-chip" onClick={() => void send('لخّص لي الفصل الأخير من المقرّر')} disabled={chat.isPending}>
              لخّص الفصل الأخير
            </button>
            <button type="button" className="ai-quick-chip" onClick={() => void send('اشرح لي مفهوماً صعباً واجهته اليوم')} disabled={chat.isPending}>
              اشرح مفهوماً
            </button>
            <button type="button" className="ai-quick-chip" onClick={() => void send('أنشئ لي اختباراً قصيراً (5 أسئلة)')} disabled={chat.isPending}>
              اختبار قصير
            </button>
            <button type="button" className="ai-quick-chip" onClick={() => void send('اقترح موارد دراسيّة إضافيّة')} disabled={chat.isPending}>
              موارد إضافيّة
            </button>
          </div>

          <div className="chat-input-row">
            <input
              className="chat-input"
              placeholder="اكتب سؤالك…"
              aria-label="اكتب سؤالك للمساعد"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') void send(); }}
              disabled={chat.isPending}
            />
            <button
              type="button"
              className="chat-send"
              onClick={() => void send()}
              disabled={!input.trim() || chat.isPending}
              aria-label="إرسال"
            >
              <Icon icon={Send} size={15} />
            </button>
          </div>
        </Card>

        <Card title="أسئلة مقترحة" icon={Sparkles}>
          <div className="flex-col gap-2">
            {SUGGESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void send(q)}
                className="list-row"
                disabled={chat.isPending}
              >
                <Icon icon={Sparkles} size={14} />
                <span className="list-row-body text-sm" style={{ color: 'var(--text-muted)' }}>{q}</span>
              </button>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
