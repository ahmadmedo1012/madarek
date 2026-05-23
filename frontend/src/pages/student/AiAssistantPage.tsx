import { useState, useRef, useEffect } from 'react';
import { Bot, Send, MessageCircle, Sparkles, BadgeCheck } from 'lucide-react';
import { Card, Badge, UserAvatar } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth.store';
import { useAiChat } from '../../hooks/useResources';

interface ChatMsg { role: 'bot' | 'user'; text: string }

const SUGGESTIONS = [
  'كيف أحسّن درجتي في الذكاء الاصطناعي؟',
  'شرح خوارزمية الفرز السريع',
  'ما الفرق بين SQL و NoSQL؟',
  'نصائح لإدارة الوقت أثناء الامتحانات',
];

const EXPERTS = [
  { name: 'د. خالد المبروك', dept: 'نظم المعلومات', initials: 'خم', color: '#5A9CFF' },
  { name: 'د. سالم الشريف', dept: 'الذكاء الاصطناعي', initials: 'سش', color: '#9B6FE8' },
  { name: 'د. فاطمة العجيلي', dept: 'قواعد البيانات', initials: 'فع', color: '#3DD68C' },
];

export default function AiAssistantPage() {
  const user = useAuthStore((s) => s.user);
  const chat = useAiChat();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'bot',
      text:
        'مرحباً! أنا مساعدك الدراسي الذكي. يمكنني مساعدتك في شرح المحاضرات، الإجابة على أسئلتك الأكاديمية، وتحليل أدائك. كيف أستطيع مساعدتك اليوم؟',
    },
  ]);
  const [input, setInput] = useState('');
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
      setMessages((m) => [...m, { role: 'bot', text: '⚠️ تعذّر الاتصال بالمساعد الآن. حاول لاحقاً.' }]);
    }
  };

  const initials = user?.avatarInitials ?? 'أنا';

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المساعد الدراسي الذكي</h1>
          <p className="page-subtitle">اطرح سؤالاً أكاديمياً، اطلب شرحاً، أو احصل على نصيحة دراسية مخصصة.</p>
        </div>
        <Badge color="purple" icon={Sparkles}>AI</Badge>
      </div>

      <div className="grid-2-1">
        <Card icon={Bot} title="محادثة جديدة" subtitle="مدعوم بنماذج تعليمية متخصصة">
          <div className="chat-area" ref={scroller}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.role}`}>
                {m.role === 'bot' ? (
                  <div className="chat-avatar"><Icon icon={Bot} size={14} /></div>
                ) : (
                  <UserAvatar initials={initials} size={30} color="var(--surface-2)" />
                )}
                <div className="chat-bubble">{m.text}</div>
              </div>
            ))}
            {chat.isPending && (
              <div className="chat-msg bot">
                <div className="chat-avatar"><Icon icon={Bot} size={14} /></div>
                <div className="chat-bubble">
                  <span className="text-subtle">جارٍ التفكير…</span>
                </div>
              </div>
            )}
          </div>

          <div className="chat-input-row">
            <input
              className="chat-input"
              placeholder="اكتب سؤالك هنا…"
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
              <Icon icon={Send} size={16} />
            </button>
          </div>
        </Card>

        <div className="flex-col gap-4">
          <Card icon={MessageCircle} title="أسئلة مقترحة">
            <div className="flex-col gap-2">
              {SUGGESTIONS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => void send(q)}
                  className="list-row"
                  style={{ textAlign: 'right', cursor: 'pointer' }}
                >
                  <Icon icon={Sparkles} size={14} />
                  <span className="list-row-body text-sm">{q}</span>
                </button>
              ))}
            </div>
          </Card>

          <Card icon={BadgeCheck} title="اسأل خبيراً">
            <div className="flex-col gap-2">
              {EXPERTS.map((e) => (
                <div className="list-row" key={e.name}>
                  <UserAvatar initials={e.initials} color={e.color} size={32} />
                  <div className="list-row-body">
                    <div className="list-row-title">{e.name}</div>
                    <div className="list-row-sub">{e.dept}</div>
                  </div>
                  <Badge color="green">متاح</Badge>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
