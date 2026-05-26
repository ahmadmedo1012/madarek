/**
 * Teacher live-session control center.
 *
 * Path: /teacher/live
 * Restricted: TEACHER role.
 *
 * Capabilities (per PRD):
 *  - Schedule a live session against one of my offerings
 *  - Start / end / cancel a session
 *  - Attach a join URL (Zoom / BBB / Jitsi)
 *  - See session list with status filter
 */
import { useMemo, useState } from 'react';
import {
  Radio, Plus, Play, Square, X, Calendar, Clock, AlertCircle,
  CheckCircle2, ChevronLeft,
} from 'lucide-react';
import { Card, Badge, MetricCard } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import {
  useTeacherOfferings, useLiveSessions, useCreateLiveSession,
  useLifecycleLiveSession, type LiveSessionRow,
} from '../../hooks/useResources';

const STATUS_LABEL: Record<LiveSessionRow['status'], string> = {
  SCHEDULED: 'مجدولة',
  LIVE: 'مباشرة',
  ENDED: 'منتهية',
  CANCELLED: 'ملغية',
};
const STATUS_COLOR: Record<LiveSessionRow['status'], 'amber' | 'red' | 'green' | 'brand'> = {
  SCHEDULED: 'amber',
  LIVE: 'red',
  ENDED: 'green',
  CANCELLED: 'brand',
};

export default function TeacherLivePage() {
  const offerings = useTeacherOfferings();
  const sessions = useLiveSessions();
  const create = useCreateLiveSession();
  const cycle = useLifecycleLiveSession();

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    offeringId: '',
    title: '',
    topic: '',
    scheduledAt: '',
    description: '',
    joinUrl: '',
  });

  const live = useMemo(() => sessions.data?.filter((s) => s.status === 'LIVE') ?? [], [sessions.data]);
  const scheduled = useMemo(() => sessions.data?.filter((s) => s.status === 'SCHEDULED') ?? [], [sessions.data]);
  const past = useMemo(
    () => sessions.data?.filter((s) => s.status === 'ENDED' || s.status === 'CANCELLED') ?? [],
    [sessions.data],
  );

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.offeringId || !form.title.trim() || !form.scheduledAt) return;
    await create.mutateAsync({
      offeringId: form.offeringId,
      title: form.title.trim(),
      topic: form.topic.trim() || undefined,
      description: form.description.trim() || undefined,
      scheduledAt: new Date(form.scheduledAt).toISOString(),
      joinUrl: form.joinUrl.trim() || undefined,
    });
    setShowForm(false);
    setForm({ offeringId: '', title: '', topic: '', scheduledAt: '', description: '', joinUrl: '' });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">إدارة البث المباشر</h1>
          <p className="page-subtitle">
            جدولة المحاضرات الحية وتشغيلها وإيقافها. الطلاب يرون فقط الجلسات الخاصة بمقرراتهم.
          </p>
        </div>
        <button type="button" className="btn primary" onClick={() => setShowForm((v) => !v)}>
          <Icon icon={Plus} size={14} /> {showForm ? 'إغلاق النموذج' : 'جلسة جديدة'}
        </button>
      </div>

      <div className="grid-3">
        <MetricCard icon={Radio} label="مباشرة الآن" value={live.length.toString()} color="red" />
        <MetricCard icon={Calendar} label="مجدولة" value={scheduled.length.toString()} color="amber" />
        <MetricCard icon={CheckCircle2} label="منتهية" value={past.length.toString()} color="green" />
      </div>

      {/* New-session form */}
      {showForm && (
        <Card title="جلسة بث جديدة" icon={Plus}>
          <form onSubmit={onSubmit} className="flex-col gap-3">
            <div className="form-grid-2">
              <label>
                <span className="form-label">المقرر</span>
                <select
                  className="input"
                  value={form.offeringId}
                  onChange={(e) => setForm({ ...form, offeringId: e.target.value })}
                  required
                >
                  <option value="">— اختر مقرراً —</option>
                  {offerings.data?.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.course.code} — {o.course.name} ({o.term})
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span className="form-label">موعد الجلسة</span>
                <input
                  type="datetime-local"
                  className="input"
                  value={form.scheduledAt}
                  onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                  required
                />
              </label>
            </div>
            <label>
              <span className="form-label">عنوان الجلسة</span>
              <input
                type="text"
                className="input"
                placeholder="مثال: شرح الوحدة الثالثة — التعلم الآلي"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                maxLength={200}
              />
            </label>
            <label>
              <span className="form-label">الموضوع الفرعي (اختياري)</span>
              <input
                type="text"
                className="input"
                placeholder="مثال: الانحدار الخطي"
                value={form.topic}
                onChange={(e) => setForm({ ...form, topic: e.target.value })}
                maxLength={200}
              />
            </label>
            <label>
              <span className="form-label">رابط الانضمام (Zoom / BigBlueButton / Jitsi)</span>
              <input
                type="url"
                className="input"
                placeholder="https://meet.example.com/abc-defg-hij"
                value={form.joinUrl}
                onChange={(e) => setForm({ ...form, joinUrl: e.target.value })}
                maxLength={500}
              />
            </label>
            <label>
              <span className="form-label">وصف (اختياري)</span>
              <textarea
                className="input"
                rows={3}
                placeholder="الموضوعات التي ستغطّيها الجلسة…"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                maxLength={2000}
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
              <button type="button" className="btn ghost" onClick={() => setShowForm(false)}>إلغاء</button>
              <button type="submit" className="btn primary" disabled={create.isPending}>
                {create.isPending ? 'جارٍ الإنشاء…' : 'جدولة الجلسة'}
              </button>
            </div>
          </form>
        </Card>
      )}

      {/* Live now */}
      {live.length > 0 && (
        <Card title="مباشرة الآن" icon={Radio} subtitle="جلسات نشطة — يمكنك إنهاؤها من هنا">
          <div className="flex-col gap-2">
            {live.map((s) => (
              <SessionRow key={s.id} session={s} onEnd={() => cycle.mutate({ id: s.id, action: 'END' })} />
            ))}
          </div>
        </Card>
      )}

      {/* Scheduled */}
      <Card title="جلسات قادمة" icon={Calendar} subtitle={`${scheduled.length} جلسة مجدولة`}>
        {scheduled.length === 0 ? (
          <div className="empty-state">
            <Icon icon={Calendar} size={24} className="text-subtle" />
            <p className="text-sm text-muted">لا توجد جلسات قادمة. أنشئ جلسة جديدة لتظهر هنا.</p>
          </div>
        ) : (
          <div className="flex-col gap-2">
            {scheduled.map((s) => (
              <SessionRow
                key={s.id}
                session={s}
                onStart={() => cycle.mutate({ id: s.id, action: 'START' })}
                onCancel={() => cycle.mutate({ id: s.id, action: 'CANCEL' })}
              />
            ))}
          </div>
        )}
      </Card>

      {/* Past */}
      {past.length > 0 && (
        <Card title="جلسات سابقة" icon={CheckCircle2}>
          <div className="flex-col gap-2">
            {past.slice(0, 10).map((s) => (
              <SessionRow key={s.id} session={s} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function SessionRow({
  session: s,
  onStart,
  onEnd,
  onCancel,
}: {
  session: LiveSessionRow;
  onStart?: () => void;
  onEnd?: () => void;
  onCancel?: () => void;
}) {
  const accent = s.offering.course.themeColor ?? 'var(--accent)';
  return (
    <div className="run-row" style={{ borderInlineStart: `3px solid ${accent}` }}>
      <span style={{ fontSize: 22, flexShrink: 0 }}>
        <EmojiIcon emoji={s.offering.course.iconEmoji ?? '📡'} size={22} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="text-sm" style={{ fontWeight: 600, marginBottom: 2 }}>{s.title}</div>
        <div className="text-xs text-muted">
          {s.offering.course.code} · {s.offering.course.name}
          {s.topic ? ` · ${s.topic}` : ''}
        </div>
        <div className="text-xxs text-subtle">
          <Icon icon={Clock} size={10} />{' '}
          {new Date(s.scheduledAt).toLocaleString('ar-EG', {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
          {s.joinUrl && (
            <>
              {' · '}
              <a href={s.joinUrl} target="_blank" rel="noreferrer">رابط الانضمام</a>
            </>
          )}
        </div>
      </div>
      <Badge color={STATUS_COLOR[s.status]}>
        {s.status === 'LIVE' && <Icon icon={Radio} size={11} />}
        {STATUS_LABEL[s.status]}
      </Badge>
      <div style={{ display: 'flex', gap: 6 }}>
        {onStart && (
          <button type="button" className="btn primary sm" onClick={onStart} title="بدء البث">
            <Icon icon={Play} size={12} /> بدء
          </button>
        )}
        {onEnd && (
          <button type="button" className="btn sm" onClick={onEnd} title="إنهاء البث">
            <Icon icon={Square} size={12} /> إنهاء
          </button>
        )}
        {onCancel && (
          <button type="button" className="btn ghost sm" onClick={onCancel} title="إلغاء">
            <Icon icon={X} size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
