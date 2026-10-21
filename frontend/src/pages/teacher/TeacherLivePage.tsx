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
import { useCallback, useMemo, useState } from 'react';
import {
  Radio, Plus, Play, Square, X, Calendar, Clock, AlertCircle,
  CheckCircle2, RefreshCw,
} from 'lucide-react';
import { Card, Badge, FormField } from '../../components/primitives';
import { StatStrip } from '../../components/primitives/Ledger';
import { ErrorState, Skeleton, EmptyState } from '../../components/primitives/States';
import { useDiscardGuard } from '../../components/curriculum/AuthoringModal';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import '../../styles/owner.css'; // ConfirmDialog surfaces via the discard guard (D11 css split, 12-15)
import {
  useTeacherOfferings, useLiveSessions, useCreateLiveSession,
  useLifecycleLiveSession, apiErrorMessage, type LiveSessionRow,
} from '../../hooks/useResources';
import { formatDateTimeAr, countAr } from '../../lib/format';
import { formatDate } from '../../utils/numbers';

const STATUS_LABEL: Record<LiveSessionRow['status'], string> = {
  SCHEDULED: 'مجدولة',
  LIVE: 'مباشرة الآن',
  ENDED: 'منتهية',
  CANCELLED: 'ملغاة',
};
/* Badge tones: SCHEDULED amber (waiting), LIVE red (the authored
 * moment), ENDED green (done) — and CANCELLED NEUTRAL: a cancelled
 * session is a void state, not an accent one, so its Badge carries no
 * color (the dashboard's done=neutral grammar; brand is an accent,
 * never a status). */
const STATUS_COLOR: Record<LiveSessionRow['status'], 'amber' | 'red' | 'green' | undefined> = {
  SCHEDULED: 'amber',
  LIVE: 'red',
  ENDED: 'green',
  CANCELLED: undefined,
};

/** Shape-matched skeleton for the stat strip + session rows. */
function LiveSkeleton() {
  return (
    <>
      <div className="stat-strip" aria-busy="true" aria-live="polite">
        {[0, 1, 2].map((i) => (
          <div key={i} className="stat-cell" aria-hidden>
            <Skeleton width={70} height={11} />
            <div style={{ marginBlock: 'var(--sp-1)' }}>
              <Skeleton width={60} height={28} />
            </div>
            <Skeleton width={110} height={11} />
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

  /* H3 (defect map 2-a): the inline create form is an authoring surface
   * and gets the family's discard guard — the same useDiscardGuard idiom
   * AssignmentFormModal uses. Every close path (the footer «إلغاء» and
   * the header toggle) routes through requestClose while dirty; a clean
   * form closes directly, and a pending create locks the guard (the
   * r157 no-op rule). */
  const closeForm = useCallback(() => setShowForm(false), []);
  const dirty = form.offeringId !== ''
    || form.title.trim() !== ''
    || form.topic.trim() !== ''
    || form.scheduledAt !== ''
    || form.description.trim() !== ''
    || form.joinUrl.trim() !== '';
  const { requestClose, guard } = useDiscardGuard({
    dirty,
    pending: create.isPending,
    onClose: closeForm,
  });

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
        <button type="button" className="btn primary" onClick={() => (showForm ? requestClose() : setShowForm(true))}>
          <Icon icon={Plus} size={14} /> {showForm ? 'إغلاق النموذج' : 'جلسة جديدة'}
        </button>
      </header>

      {/* Metrics read only from settled data — never a fake "0" while the
          list is still loading (audit 0-e P1-17). */}
      {sessions.isPending ? (
        <LiveSkeleton />
      ) : sessions.isError ? (
        <>
          <StatStrip
            ariaLabel="حالة الجلسات"
            cells={[
              { label: 'مباشرة الآن', value: '—' },
              { label: 'مجدولة', value: '—' },
              { label: 'منتهية', value: '—' },
            ]}
          />
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
          <StatStrip
            ariaLabel="حالة الجلسات"
            cells={[
              {
                label: 'مباشرة الآن',
                value: live.length.toString(),
                /* A6 P2 (22-a): keep the honest zeros, add the one-word
                   context — the bare 0/0/0 wall read as a malfunction
                   ("Zero Wall" / "depressing" VLM verdicts). */
                trend: live.length === 0 ? 'لا بثّ نشط حالياً' : 'يمكن إنهاؤها من هنا',
                trendTone: 'flat',
              },
              {
                label: 'مجدولة',
                value: scheduled.length.toString(),
                trend: scheduled.length === 0 ? 'لا جلسات قادمة' : 'قادمة في جدولك',
                trendTone: scheduled.length === 0 ? 'flat' : 'up',
              },
              {
                label: 'منتهية',
                value: past.length.toString(),
                trend: past.length === 0 ? 'لا جلسات سابقة' : 'معروضة في الأسفل',
                trendTone: 'flat',
              },
            ]}
          />

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
                  <FormField label="المقرّر">
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
                  </FormField>
                  {/* The hint sits OUTSIDE the label so it never leaks
                      into the input's accessible name (A6 P2, 22-a):
                      Chromium paints datetime-local in the browser's
                      locale (en-US → mm/dd/yyyy) inside this Arabic
                      form — the hint names the native calendar as the
                      safe path, and the Arabic echo verifies what was
                      actually picked (datetime-local values carry no
                      offset, so the echo renders in the same local
                      time). */}
                  <FormField
                    label="موعد الجلسة"
                    id="live-when"
                    hint={form.scheduledAt
                      ? <>المحدَّد: {formatDateTimeAr(form.scheduledAt)}</>
                      : 'اختر التاريخ والوقت من تقويم الحقل — ترتيب الصيغة داخله يتبع إعدادات المتصفح.'}
                  >
                    <input
                      type="datetime-local"
                      className="input"
                      dir="ltr"
                      value={form.scheduledAt}
                      onChange={(e) => setForm({ ...form, scheduledAt: e.target.value })}
                      required
                    />
                  </FormField>
                </div>
                <FormField label="عنوان الجلسة">
                  <input
                    type="text"
                    className="input"
                    placeholder="مثال: شرح الوحدة الثالثة — التعلم الآلي"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                    maxLength={200}
                  />
                </FormField>
                <FormField label="الموضوع الفرعي (اختياري)">
                  <input
                    type="text"
                    className="input"
                    placeholder="مثال: الانحدار الخطي"
                    value={form.topic}
                    onChange={(e) => setForm({ ...form, topic: e.target.value })}
                    maxLength={200}
                  />
                </FormField>
                <FormField label="رابط الانضمام (Zoom / BigBlueButton / Jitsi)">
                  <input
                    type="url"
                    className="input"
                    dir="ltr"
                    placeholder="https://meet.example.com/abc-defg-hij"
                    value={form.joinUrl}
                    onChange={(e) => setForm({ ...form, joinUrl: e.target.value })}
                    maxLength={500}
                  />
                </FormField>
                <FormField label="وصف (اختياري)">
                  <textarea
                    className="input"
                    rows={3}
                    placeholder="الموضوعات التي ستغطّيها الجلسة…"
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    maxLength={2000}
                  />
                </FormField>
                {/* Mutation errors sit ABOVE the actions — the old placement
                    below the buttons hid them (audit 0-e P2-48). */}
                {createError && (
                  <div className="form-feedback fail" role="alert">
                    <Icon icon={AlertCircle} size={14} />
                    <span className="flex-1">تعذَّر جدولة الجلسة: {createError}</span>
                  </div>
                )}
                <div className="flex justify-end gap-2">
                  <button type="button" className="btn ghost" onClick={requestClose} disabled={create.isPending}>إلغاء</button>
                  <button type="submit" className="btn primary" disabled={create.isPending || offerings.isError}>
                    {create.isPending ? 'جارٍ الإنشاء…' : 'جدولة الجلسة'}
                  </button>
                </div>
              </form>
              {guard}
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

          {/* Scheduled — r157 / 6A9: countAr grammar (the old `${n} جلسة
              مجدولة` template broke at 0 and 2 — «0 جلسة مجدولة» / «2
              جلسة مجدولة»); the zero case names the reality. */}
          <Card
            title="جلسات قادمة"
            icon={Calendar}
            subtitle={scheduled.length === 0
              ? 'لا جلسات مجدولة'
              : countAr(scheduled.length, ['جلسة مجدولة واحدة', 'جلستان مجدولتان', 'جلسات مجدولة', 'جلسة مجدولة'])}
          >
            {scheduled.length === 0 ? (
              /* r149 (R3-A1 #6): EmptyState الكنونية — كانت يدوية بعلامة
                 مزدوجة (رسم + أيقونة معًا) وبلا تشريح العنوان/الدور. */
              <EmptyState
                illustration="empty-list"
                title="لا توجد جلسات قادمة"
                description="أنشئ جلسة جديدة لتظهر هنا."
              />
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

          {/* Past — capped at 10 rows; the disclosure (r157 / 6A9)
              names the truncation honestly: «أحدث 10 جلسات من أصل N».
              The old silent .slice(0, 10) hid the rest. */}
          {past.length > 0 && (
            <Card title="جلسات سابقة" icon={CheckCircle2}>
              <div className="flex-col gap-2">
                {past.slice(0, 10).map((s) => (
                  <SessionRow key={s.id} session={s} />
                ))}
              </div>
              {past.length > 10 && (
                <div className="text-xs text-subtle" style={{ marginBlockStart: 'var(--sp-3)' }}>
                  أحدث <bdi>10</bdi> جلسات من أصل <bdi>{past.length}</bdi>
                </div>
              )}
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
