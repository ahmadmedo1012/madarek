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
  CheckCircle2, RefreshCw,
} from 'lucide-react';
import { Card, Badge, MetricCard } from '../../components/primitives';
import { ErrorState, Skeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import {
  useTeacherOfferings, useLiveSessions, useCreateLiveSession,
  useLifecycleLiveSession, apiErrorMessage, type LiveSessionRow,
} from '../../hooks/useResources';
import { formatDateTimeAr } from '../../lib/format';
import { formatDate } from '../../utils/numbers';

const STATUS_LABEL: Record<LiveSessionRow['status'], string> = {
  SCHEDULED: 'مجدولة',
  LIVE: 'مباشرة الآن',
  ENDED: 'منتهية',
  CANCELLED: 'ملغاة',
};
const STATUS_COLOR: Record<LiveSessionRow['status'], 'amber' | 'red' | 'green' | 'brand'> = {
  SCHEDULED: 'amber',
  LIVE: 'red',
  ENDED: 'green',
  CANCELLED: 'brand',
};

/** Shape-matched skeleton for the KPI strip + session rows. */
function LiveSkeleton() {
  return (
    <>
      <div className="grid-3" aria-busy="true" aria-live="polite">
        {[0, 1, 2].map((i) => (
          <div key={i} className="metric" aria-hidden>
            <div style={{ marginBlockEnd: 'var(--sp-3)' }}>
              <Skeleton width={90} height={11} />
            </div>
            <Skeleton width={60} height={26} />
          </div>
        ))}
      </div>
      <Card>
        <div className="flex-col gap-2" aria-hidden>
          {[0, 1, 2].map((i) => (
            <div key={i} className="run-row">
              <Skeleton width={40} height={40} rounded="var(--r-full)" />
              <div className="flex-col gap-2 flex-1">
                <Skeleton width="50%" height={14} />
                <Skeleton width="35%" height={10} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

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

  const [createError, setCreateError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.offeringId || !form.title.trim() || !form.scheduledAt) return;
    setCreateError(null);
    try {
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
    } catch (err) {
      // Keep the form open with the entered values; the Arabic error
      // renders inside the card so the teacher can retry.
      setCreateError(apiErrorMessage(err, 'تحقّق من اتصالك ثم أعد المحاولة.'));
    }
  };

  // The failing lifecycle action (start/end/cancel) re-fires on retry.
  const retryCycle = () => {
    if (cycle.variables) cycle.mutate(cycle.variables);
  };

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">إدارة البث المباشر</h1>
          <p className="page-subtitle">
            جدولة المحاضرات الحية وتشغيلها وإيقافها. الطلاب يرون فقط الجلسات الخاصة بمقرّراتهم.
          </p>
        </div>
        <button type="button" className="btn primary" onClick={() => setShowForm((v) => !v)}>
          <Icon icon={Plus} size={14} /> {showForm ? 'إغلاق النموذج' : 'جلسة جديدة'}
        </button>
      </header>

      {/* Metrics read only from settled data — never a fake "0" while the
          list is still loading (audit 0-e P1-17). */}
      {sessions.isPending ? (
        <LiveSkeleton />
      ) : sessions.isError ? (
        <>
          <div className="grid-3">
            <MetricCard icon={Radio} label="مباشرة الآن" value="—" color="red" />
            <MetricCard icon={Calendar} label="مجدولة" value="—" color="amber" />
            <MetricCard icon={CheckCircle2} label="منتهية" value="—" color="green" />
          </div>
          <Card>
            <ErrorState
              message="تعذَّر تحميل جلسات البث"
              error={sessions.error}
              onRetry={() => sessions.refetch()}
            />
          </Card>
        </>
      ) : (
        <>
          <div className="grid-3">
            {/* A6 P2 (22-a): keep the honest zeros, add the one-word
                context — the bare 0/0/0 wall read as a malfunction
                ("Zero Wall" / "depressing" VLM verdicts). */}
            <MetricCard
              icon={Radio}
              label="مباشرة الآن"
              value={live.length.toString()}
              color="red"
              change={live.length === 0 ? 'لا بثّ نشط حالياً' : undefined}
            />
            <MetricCard
              icon={Calendar}
              label="مجدولة"
              value={scheduled.length.toString()}
              color="amber"
              change={scheduled.length === 0 ? 'لا جلسات قادمة' : undefined}
            />
            <MetricCard
              icon={CheckCircle2}
              label="منتهية"
              value={past.length.toString()}
              color="green"
              change={past.length === 0 ? 'لا جلسات سابقة' : undefined}
            />
          </div>

          {/* New-session form */}
          {showForm && (
            <Card title="جلسة بث جديدة" icon={Plus}>
              <form onSubmit={onSubmit} className="flex-col gap-3">
                {offerings.isError && (
                  <div className="form-feedback fail" role="alert">
                    <Icon icon={AlertCircle} size={14} />
                    <span className="flex-1">تعذَّر تحميل مقرّراتك — اختر المقرر بعد إعادة المحاولة.</span>
                    <button type="button" className="btn ghost sm" onClick={() => offerings.refetch()}>
                      <Icon icon={RefreshCw} size={12} /> إعادة المحاولة
                    </button>
                  </div>
                )}
                <div className="form-grid-2">
                  <label>
                    <span className="form-label">المقرّر</span>
                    <select
                      className="input"
                      value={form.offeringId}
                      onChange={(e) => setForm({ ...form, offeringId: e.target.value })}
                      required
                      disabled={offerings.isError}
                    >
                      <option value="">
                        {offerings.isPending ? 'جارٍ تحميل مقرّراتك…' : '— اختر مقرراً —'}
                      </option>
                      {offerings.data?.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.course.code} — {o.course.name} ({o.term})
                        </option>
                      ))}
                    </select>
                  </label>
                  {/* The hint sits OUTSIDE the label so it never leaks
                      into the input's accessible name (A6 P2, 22-a):
                      Chromium paints datetime-local in the browser's
                      locale (en-US → mm/dd/yyyy) inside this Arabic
                      form — the hint names the native calendar as the
                      safe path, and the Arabic echo verifies what was
                      actually picked (datetime-local values carry no
                      offset, so the echo renders in the same local
                      time). */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                    <label htmlFor="live-when"><span className="form-label">موعد الجلسة</span></label>
                    <input
                      id="live-when"
                      type="datetime-local"
                      className="input"
                      dir="ltr"
                      value={form.scheduledAt}
                      onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                      required
                      aria-describedby="live-when-hint"
                    />
                    <span id="live-when-hint" className="form-field-hint">
                      {form.scheduledAt
                        ? <>المحدَّد: {formatDateTimeAr(form.scheduledAt)}</>
                        : 'اختر التاريخ والوقت من تقويم الحقل — ترتيب الصيغة داخله يتبع إعدادات المتصفح.'}
                    </span>
                  </div>
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
                    dir="ltr"
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
                {/* Mutation errors sit ABOVE the actions — the old placement
                    below the buttons hid them (audit 0-e P2-48). */}
                {createError && (
                  <div className="form-feedback fail" role="alert">
                    <Icon icon={AlertCircle} size={14} />
                    <span className="flex-1">تعذَّر جدولة الجلسة: {createError}</span>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn ghost" onClick={() => setShowForm(false)} disabled={create.isPending}>إلغاء</button>
                  <button type="submit" className="btn primary" disabled={create.isPending || offerings.isError}>
                    {create.isPending ? 'جارٍ الإنشاء…' : 'جدولة الجلسة'}
                  </button>
                </div>
              </form>
            </Card>
          )}

          {/* A failed start/end/cancel surfaces here with a working retry. */}
          {cycle.isError && (
            <div className="form-feedback fail" role="alert">
              <Icon icon={AlertCircle} size={14} />
              <span className="flex-1">
                {apiErrorMessage(cycle.error, 'تعذَّر تحديث حالة الجلسة.')}
              </span>
              <button type="button" className="btn ghost sm" onClick={retryCycle} disabled={cycle.isPending}>
                <Icon icon={RefreshCw} size={12} /> إعادة المحاولة
              </button>
            </div>
          )}

          {/* Live now */}
          {live.length > 0 && (
            <Card title="مباشرة الآن" icon={Radio} subtitle="جلسات نشطة — يمكنك إنهاؤها من هنا">
              <div className="flex-col gap-2">
                {live.map((s) => (
                  <SessionRow
                    key={s.id}
                    session={s}
                    onEnd={() => cycle.mutate({ id: s.id, action: 'END' })}
                    busy={cycle.isPending && cycle.variables?.id === s.id}
                  />
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
                    busy={cycle.isPending && cycle.variables?.id === s.id}
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
        </>
      )}
    </div>
  );
}

function SessionRow({
  session: s,
  onStart,
  onEnd,
  onCancel,
  busy,
}: {
  session: LiveSessionRow;
  onStart?: () => void;
  onEnd?: () => void;
  onCancel?: () => void;
  /** True while this row's own lifecycle action is in flight. */
  busy?: boolean;
}) {
  const accent = s.offering.course.themeColor ?? 'var(--accent)';
  const isLive = s.status === 'LIVE';
  return (
    <div
      className={`run-row${isLive ? ' is-live' : ''}`}
      style={{ ['--row-accent' as never]: accent }}
    >
      {/* Tinted course well replaces the old 3px inline-start stripe
          (ruling #4) — same grammar as the student live page. */}
      <span className="live-row-icon">
        <EmojiIcon emoji={s.offering.course.iconEmoji ?? '📡'} size={20} />
      </span>
      <div className="flex-1">
        <div className="live-row-title">{s.title}</div>
        <div className="text-xs text-muted">
          <bdi>{s.offering.course.code}</bdi> · {s.offering.course.name}
          {s.topic ? ` · ${s.topic}` : ''}
        </div>
        <div className="text-xxs text-subtle">
          <Icon icon={Clock} size={10} />{' '}
          <bdi>
            {formatDate(s.scheduledAt, {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </bdi>
          {s.joinUrl && (
            <>
              {' · '}
              <a href={s.joinUrl} target="_blank" rel="noreferrer">رابط الانضمام</a>
            </>
          )}
        </div>
      </div>
      {isLive ? (
        /* THE authored moment (LIVE only): the dot breathes a danger ping
            while everything else on the page sits still. */
        <span className="live-chip">
          <span className="live-dot" aria-hidden />
          {STATUS_LABEL[s.status]}
        </span>
      ) : (
        <Badge color={STATUS_COLOR[s.status]}>
          {STATUS_LABEL[s.status]}
        </Badge>
      )}
      <div className="run-row-actions">
        {onStart && (
          <button type="button" className="btn primary sm" onClick={onStart} title="بدء البث" disabled={busy}>
            <Icon icon={Play} size={12} /> بدء
          </button>
        )}
        {onEnd && (
          <button type="button" className="btn sm" onClick={onEnd} title="إنهاء البث" disabled={busy}>
            <Icon icon={Square} size={12} /> إنهاء
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            className="btn ghost sm"
            onClick={onCancel}
            title="إلغاء الجلسة"
            aria-label="إلغاء الجلسة"
            disabled={busy}
          >
            <Icon icon={X} size={12} />
          </button>
        )}
      </div>
    </div>
  );
}
