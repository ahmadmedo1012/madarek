import { useState, useRef, useEffect } from 'react';
import { Bot, Send, Sparkles, BadgeCheck, AlertCircle, Brain, type LucideIcon } from 'lucide-react';
import { Card, Badge, UserAvatar, Tabs } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth.store';
import { useAiChat, useGaps } from '../../hooks/useResources';
import { AiBrainIllustration } from '../../components/illustrations';

interface ChatMsg { role: 'bot' | 'user'; text: string }

const SUGGESTIONS = [
  'كيف أحسّن درجتي في الذكاء الاصطناعي؟',
  'اشرح لي خوارزمية الفرز السريع',
  'ما الفرق بين SQL و NoSQL؟',
  'نصائح لإدارة الوقت أثناء الامتحانات',
  'كيف أبني محفظة مشاريع قوية؟',
];

const EXPERTS: Array<{ name: string; dept: string; initials: string; }> = [
  { name: 'د. خالد المبروك', dept: 'نظم المعلومات', initials: 'خم' },
  { name: 'د. سالم الشريف', dept: 'الذكاء الاصطناعي', initials: 'سش' },
  { name: 'د. فاطمة العجيلي', dept: 'قواعد البيانات', initials: 'فع' },
  { name: 'د. عياض الهنقاري', dept: 'هندسة البرمجيات', initials: 'عه' },
];

type Side = 'suggestions' | 'experts';

/** Render text with newlines preserved (chat replies use \n now). */
function Multiline({ children, icon }: { children: string; icon?: LucideIcon }) {
  void icon;
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
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'bot',
      text:
        'مرحباً! أنا مساعدك الدراسي الذكي. لديّ صورة كاملة عن مستواك في كل مفهوم — يمكنني شرح ما تحتاجه، اقتراح خطة مذاكرة، أو تحليل فجواتك المعرفية. كيف أساعدك؟',
    },
  ]);
  const [input, setInput] = useState('');
  const [side, setSide] = useState<Side>('suggestions');
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: 'smooth' });
  }, [messages, chat.isPending]);

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
      setMessages((m) => [...m, { role: 'bot', text: 'تعذّر الاتصال بالمساعد الآن. حاول لاحقاً.' }]);
    }
  };

  const askAboutGap = (conceptName: string) => {
    void send(`اشرح لي مفهوم "${conceptName}" — لاحظت أن لديّ فجوة فيه.`);
  };

  const initials = user?.avatarInitials ?? 'أنا';

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المساعد الذكي</h1>
          <p className="page-subtitle">يفهم مستواك المعرفي ويوصي بأفضل خطوة تالية في رحلتك الدراسية.</p>
        </div>
        <AiBrainIllustration />
        <Badge color="gold" icon={Sparkles}>AI</Badge>
      </div>

      {/* Gap-aware starter cards */}
      {gaps.data && gaps.data.length > 0 && (
        <Card
          title="بناءً على أدائك"
          icon={Brain}
          subtitle="مفاهيم اكتشفنا أنها بحاجة لتوضيح — اضغط لبدء محادثة مع المساعد"
        >
          <div className="grid-3">
            {gaps.data.slice(0, 3).map((g) => (
              <button
                key={g.conceptId}
                type="button"
                onClick={() => askAboutGap(g.conceptName)}
                style={{
                  textAlign: 'right',
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)',
                  padding: 'var(--sp-4)',
                  cursor: 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--sp-2)',
                  fontFamily: 'inherit',
                  transition: 'border-color var(--t-fast) var(--ease)',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; }}
              >
                <div className="flex items-center gap-2">
                  <Icon icon={AlertCircle} size={14} style={{ color: 'var(--warning)' }} />
                  <span className="text-xxs text-subtle">{g.courseName}</span>
                  <span className="font-mono text-xxs" style={{ color: 'var(--warning)', marginLeft: 'auto' }}>
                    {Math.round(g.level * 100)}%
                  </span>
                </div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>
                  {g.conceptName}
                </div>
                <div className="text-xs text-muted">
                  اسأل المساعد عن هذا المفهوم →
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="grid-2-1">
        <Card title="محادثة جديدة" icon={Bot}>
          <div className="chat-area" ref={scroller}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                {m.role === 'bot' ? (
                  <div className="chat-avatar"><Icon icon={Bot} size={14} /></div>
                ) : (
                  <UserAvatar initials={initials} size={28} color="var(--surface-3)" />
                )}
                <div className="chat-bubble">
                  <Multiline>{m.text}</Multiline>
                </div>
              </div>
            ))}
            {chat.isPending && (
              <div className="chat-msg bot">
                <div className="chat-avatar"><Icon icon={Bot} size={14} /></div>
                <div className="chat-bubble">
                  <div className="ai-typing-indicator">
                    <span />
                    <span />
                    <span />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Quick-action chips above the input — Stitch signature */}
          <div className="ai-quick-actions">
            <button type="button" className="ai-quick-chip" onClick={() => void send('لخّص لي الفصل الأخير من المادة')}>
              لخّص الفصل الأخير
            </button>
            <button type="button" className="ai-quick-chip" onClick={() => void send('اشرح لي مفهوماً صعباً واجهته اليوم')}>
              اشرح مفهوماً
            </button>
            <button type="button" className="ai-quick-chip" onClick={() => void send('أنشئ لي اختباراً قصيراً (5 أسئلة)')}>
              اختبار قصير
            </button>
            <button type="button" className="ai-quick-chip" onClick={() => void send('اقترح موارد دراسية إضافية')}>
              موارد إضافية
            </button>
          </div>

          <div className="chat-input-row">
            <input
              className="chat-input"
              placeholder="اكتب سؤالك…"
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

        <Card title={side === 'suggestions' ? 'أسئلة مقترحة' : 'خبراء متاحون'} actions={
          <Tabs<Side>
            value={side}
            onChange={setSide}
            items={[
              { value: 'suggestions', label: 'مقترحة' },
              { value: 'experts', label: 'الخبراء' },
            ]}
          />
        }>
          {side === 'suggestions' ? (
            <div className="flex-col gap-2">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void send(q)}
                  className="list-row"
                  style={{ textAlign: 'right', cursor: 'pointer', border: 0, background: 'transparent' }}
                >
                  <Icon icon={Sparkles} size={14} />
                  <span className="list-row-body text-sm" style={{ color: 'var(--text-muted)' }}>{q}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="flex-col gap-2">
              {EXPERTS.map((e) => (
                <div className="list-row" key={e.name}>
                  <UserAvatar initials={e.initials} size={32} />
                  <div className="list-row-body">
                    <div className="list-row-title">{e.name}</div>
                    <div className="list-row-sub">{e.dept}</div>
                  </div>
                  <Badge color="green" icon={BadgeCheck}>متاح</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
