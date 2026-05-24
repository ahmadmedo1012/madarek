import { useEffect, useRef, useState } from 'react';
import { Radio, Eye, Send, Calendar, Bell } from 'lucide-react';
import { Card, Badge, MetricCard, UserAvatar } from '../../components/primitives';
import { Icon } from '../../components/Icon';

const SIMULATED_MSGS: Array<{ author: string; body: string; initials: string }> = [
  { author: 'مريم الفاخري', initials: 'مف', body: 'هل سيتم تغطية موضوع الـ Singleton اليوم؟' },
  { author: 'يوسف البركي', initials: 'يب', body: 'أستاذ، الصوت غير واضح من فضلك' },
  { author: 'سارة المحجوب', initials: 'سم', body: 'شكراً، الصوت أوضح الآن 👍' },
  { author: 'خالد المزوغي', initials: 'خم', body: 'هل سترفع الشرائح بعد المحاضرة؟' },
  { author: 'نور الأمين', initials: 'نأ', body: 'سؤال: ما الفرق بين Factory و Abstract Factory؟' },
  { author: 'عمر الزبيدي', initials: 'عز', body: 'محاضرة ممتازة 🙏' },
  { author: 'أسماء البوسيفي', initials: 'أب', body: 'هل من ملاحظات على الواجب الأخير؟' },
  { author: 'رانيا المقرحي', initials: 'رم', body: 'هل سنحلّ مسائل تطبيقية؟' },
];

export default function LivePage() {
  const [chat, setChat] = useState<Array<{ author: string; body: string; initials: string }>>([]);
  const [viewers, setViewers] = useState(127);
  const [input, setInput] = useState('');
  const scroller = useRef<HTMLDivElement>(null);

  // Stream simulated chat messages over time.
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      setChat((c) => [...c, SIMULATED_MSGS[i % SIMULATED_MSGS.length]!]);
      i += 1;
      // Slight viewer drift.
      setViewers((v) => v + Math.floor(Math.random() * 5) - 2);
    }, 3500);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight });
  }, [chat]);

  const sendMyMessage = () => {
    if (!input.trim()) return;
    setChat((c) => [...c, { author: 'أنا', body: input.trim(), initials: 'أنا' }]);
    setInput('');
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">البث المباشر</h1>
          <p className="page-subtitle">محاضرات حيّة ومناقشات مع الأساتذة في الوقت الفعلي.</p>
        </div>
        <Badge color="red">على الهواء الآن</Badge>
      </div>

      <div className="grid-3">
        <MetricCard icon={Radio} label="بث نشط الآن" value="2" change="من 4 محاضرات" color="red" />
        <MetricCard icon={Eye} label="مشاهد متزامن" value={viewers.toString()} color="brand" />
        <MetricCard icon={Calendar} label="مجدولة هذا الأسبوع" value="12" color="purple" />
      </div>

      <div className="live-shell">
        <div>
          <div className="live-frame">
            <video
              src="https://test-videos.co.uk/vids/bigbuckbunny/mp4/h264/720/Big_Buck_Bunny_720_10s_1MB.mp4"
              autoPlay
              muted
              loop
              playsInline
            />
            <div className="live-pulse">
              <span className="live-pulse-dot" />
              مباشر
            </div>
            <div className="live-viewers">
              <Icon icon={Eye} size={11} /> {viewers.toLocaleString('ar-LY')}
            </div>
          </div>

          <div className="lecture-meta">
            <div>
              <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                <Badge>SE301</Badge>
                <span className="text-xs text-subtle">حصة مباشرة</span>
              </div>
              <div className="lecture-meta-title">حلقة نقاش: نماذج التصميم في تطبيقات الويب</div>
              <div className="lecture-meta-sub">
                د. سالم البوسيفي · هندسة البرمجيات · بدأت قبل 18 دقيقة
              </div>
            </div>
            <button type="button" className="btn outline">
              <Icon icon={Bell} size={13} />
              تذكير قبل البدء
            </button>
          </div>
        </div>

        <Card title="الدردشة المباشرة" subtitle={`${viewers} مشارك`}>
          <div className="live-chat">
            <div className="live-chat-list" ref={scroller}>
              {chat.length === 0 && (
                <div className="text-xs text-subtle">سيظهر الدردشة هنا فور بدء المشاركة…</div>
              )}
              {chat.map((m, i) => (
                <div key={i} className="live-chat-msg flex items-start gap-2">
                  <UserAvatar
                    initials={m.initials}
                    size={22}
                    color={m.author === 'أنا' ? 'var(--accent)' : 'var(--surface-3)'}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="author">{m.author}:</span>
                    <span className="body"> {m.body}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="chat-input-row" style={{ marginTop: 0, paddingTop: 'var(--sp-3)' }}>
              <input
                className="chat-input"
                placeholder="شارك في النقاش…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') sendMyMessage(); }}
              />
              <button type="button" className="chat-send" onClick={sendMyMessage} aria-label="إرسال">
                <Icon icon={Send} size={14} />
              </button>
            </div>
          </div>
        </Card>
      </div>

      <Card title="بثوث قادمة" icon={Calendar}>
        <div className="flex-col gap-2">
          {[
            { c: 'CS302', t: 'حلقة نقاش: تحسين أداء قواعد البيانات', d: 'الأحد 10:00 ص', who: 'د. فاطمة العجيلي' },
            { c: 'NET301', t: 'ندوة: مستقبل الشبكات اللاسلكية', d: 'الاثنين 13:00', who: 'د. سالم الشريف' },
            { c: 'IS301', t: 'محاضرة مسجلة + جلسة أسئلة', d: 'الثلاثاء 11:00', who: 'د. محمد الطاهر' },
          ].map((s, i) => (
            <div key={i} className="list-row">
              <Badge>{s.c}</Badge>
              <div className="list-row-body">
                <div className="list-row-title">{s.t}</div>
                <div className="list-row-sub">{s.who}</div>
              </div>
              <span className="list-row-meta">{s.d}</span>
              <button type="button" className="btn outline sm">تذكير</button>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
