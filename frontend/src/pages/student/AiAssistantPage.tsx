import { useState, useRef, useEffect } from 'react';
import { useAuthStore } from '../../stores/auth.store';
import { useAiChat } from '../../hooks/useResources';
import { Card } from '../../components/primitives';

interface ChatMsg { role: 'bot' | 'user'; text: string }

export default function AiAssistantPage() {
  const user = useAuthStore((s) => s.user);
  const chat = useAiChat();
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      role: 'bot',
      text:
        'مرحباً! أنا مساعدك الدراسي الذكي. يمكنني مساعدتك في شرح المحاضرات، الإجابة على أسئلتك الأكاديمية، وتحليل أدائك. كيف أستطيع مساعدتك اليوم؟ 🎓',
    },
  ]);
  const [input, setInput] = useState('');
  const scroller = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [messages]);

  const send = async () => {
    const text = input.trim();
    if (!text || chat.isPending) return;
    setMessages((m) => [...m, { role: 'user', text }]);
    setInput('');
    try {
      const res = await chat.mutateAsync({ conversationId, message: text });
      setConversationId(res.conversationId);
      setMessages((m) => [...m, { role: 'bot', text: res.reply }]);
    } catch {
      setMessages((m) => [...m, { role: 'bot', text: '⚠️ تعذّر الاتصال بالمساعد الآن. حاول لاحقاً.' }]);
    }
  };

  const initials = user?.avatarInitials ?? 'أنا';

  return (
    <div className="page">
      <div className="grid-2-1">
        <Card title="المساعد الدراسي الذكي" dotColor="var(--purple)">
          <div className="chat-area" ref={scroller}>
            {messages.map((m, i) => (
              <div key={i} className={`msg ${m.role}`}>
                <div className="msg-avatar">{m.role === 'bot' ? 'AI' : initials}</div>
                <div className="msg-bubble">{m.text}</div>
              </div>
            ))}
            {chat.isPending && (
              <div className="msg bot">
                <div className="msg-avatar">AI</div>
                <div className="msg-bubble">… جارٍ التفكير</div>
              </div>
            )}
          </div>
          <div className="chat-input-row">
            <input
              className="chat-input"
              placeholder="اكتب سؤالك..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void send();
              }}
            />
            <button className="chat-send" type="button" onClick={() => void send()}>
              ➤
            </button>
          </div>
        </Card>

        <div>
          <Card title="أسئلة مقترحة" dotColor="var(--amber)" style={{ marginBottom: 14 }}>
            {[
              'كيف أحسّن درجتي في الذكاء الاصطناعي؟',
              'شرح خوارزمية الفرز السريع',
              'ما الفرق بين SQL و NoSQL؟',
              'نصائح لإدارة الوقت أثناء الامتحانات',
            ].map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setInput(q)}
                style={{
                  display: 'block',
                  width: '100%',
                  textAlign: 'right',
                  padding: '8px 12px',
                  background: 'var(--surface)',
                  borderRadius: 'var(--r-sm)',
                  marginBottom: 6,
                  fontSize: 12,
                  color: 'var(--text2)',
                  cursor: 'pointer',
                  border: '1px solid var(--border)',
                  fontFamily: 'inherit',
                }}
              >
                💬 {q}
              </button>
            ))}
          </Card>

          <Card title="اسأل الخبراء" dotColor="var(--green)">
            {['د. خالد — نظم المعلومات', 'د. سالم — ذكاء اصطناعي', 'د. فاطمة — قواعد البيانات'].map((e, i) => {
              const colors = ['#4F8EF7', '#9B6FE8', '#3DD68C'];
              return (
                <div className="sched-item" key={e} style={{ marginBottom: 6 }}>
                  <div className="user-avatar" style={{ background: colors[i], width: 28, height: 28, fontSize: 10 }}>
                    {e[3]}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>{e}</div>
                  </div>
                  <span className="badge badge-green">متاح</span>
                </div>
              );
            })}
          </Card>
        </div>
      </div>
    </div>
  );
}
