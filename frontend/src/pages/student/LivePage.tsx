/**
 * Student-facing live sessions list.
 *
 * Path: /student/live
 * Restricted: STUDENT (route-level).
 *
 * Watch-only by design — students cannot create, schedule, or end
 * sessions. They see only sessions for offerings they are enrolled
 * in, and can join the teacher-provided URL.
 */
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Radio, Calendar, CheckCircle2, ExternalLink, Clock, Video } from 'lucide-react';
import { Card, Badge, MetricCard } from '../../components/primitives';
import { EmptyState, ErrorState, Skeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import { useLiveSessions, type LiveSessionRow } from '../../hooks/useResources';

import { formatDate } from '../../utils/numbers';

/* Shape-matched loading skeleton: KPI strip + session rows. */
function LiveSkeleton() {
  return (
    <>
      <div className="grid-3" aria-busy="true" aria-live="polite">
        {[0, 1, 2].map((i) => (
          <div key={i} className="metric">
            <div style={{ marginBottom: 'var(--sp-3)' }}><Skeleton width={90} height={11} /></div>
            <Skeleton width={56} height={26} />
          </div>
        ))}
      </div>
      <div className="flex-col gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="run-row">
            <Skeleton width={40} height={40} rounded="50%" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              <Skeleton width="40%" height={13} />
              <Skeleton width="65%" height={11} />
            </div>
            <Skeleton width={88} height={22} rounded="var(--r-full)" />
          </div>
        ))}
      </div>
    </>
  );
}

export default function LivePage() {
  const { data: sessions, isPending, isError, error, refetch } = useLiveSessions();

  // `sessions` is undefined while pending AND on error — derive from a
  // settled list only, so an API failure can never render as "no sessions".
  const list = !isPending && !isError ? (sessions ?? []) : [];

  const live = useMemo(() => list.filter((s) => s.status === 'LIVE'), [list]);
  const upcoming = useMemo(() => list.filter((s) => s.status === 'SCHEDULED'), [list]);
  const recent = useMemo(
    () => list.filter((s) => s.status === 'ENDED').slice(0, 8),
    [list],
  );

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المحاضرات المباشرة</h1>
          <p className="page-subtitle">
            ينظِّم الأساتذة محاضرات حية لمقرراتك. ستجد هنا الجلسات النشطة والقادمة فقط لمقرراتك المسجَّلة.
          </p>
        </div>
        {!isPending && (
          live.length > 0 ? (
            <span className="live-chip">
              <span className="live-dot" aria-hidden />
              على الهواء الآن
            </span>
          ) : (
            !isError && <Badge>لا بثّ مباشر الآن</Badge>
          )
        )}
      </header>

      {isPending ? (
        <LiveSkeleton />
      ) : isError ? (
        /* API-down is the default demo state — surface it honestly with
           retry instead of masking it as an empty schedule. */
        <Card>
          <ErrorState
            message="تعذَّر تحميل البثوث"
            error={error}
            onRetry={() => refetch()}
          />
        </Card>
      ) : (
        <>
          <div className="grid-3">
            <MetricCard icon={Radio} label="مباشرة الآن" value={live.length.toString()} color="red" />
            <MetricCard icon={Calendar} label="جلسات قادمة" value={upcoming.length.toString()} color="amber" />
            <MetricCard icon={CheckCircle2} label="منتهية" value={recent.length.toString()} color="green" />
          </div>

          {/* 22-c (A4 P2-1): an empty schedule used to stack THREE
              «nothing» cards (per-status empties + a global «لا توجد
              بثوث بعد») on top of the 0/0/0 KPIs — a zero wall. The
              per-status cards keep their stable slots (15-j §3 #10:
              "is anything on air?" deserves a stable answer) only when
              the schedule has ANY content; a fully-empty list gets the
              single global empty card instead. */}
          {list.length === 0 ? (
            <Card>
              <EmptyState
                icon={Video}
                title="لا توجد بثوث بعد"
                description="لا توجد بثوث مرتبطة بمقرراتك بعد. حال نشر أساتذتك جلسة جديدة، ستظهر هنا تلقائياً."
              />
            </Card>
          ) : (
            <>
              <Card
                title="مباشرة الآن"
                icon={Radio}
                subtitle={live.length > 0 ? 'انضمّ إلى أيّ جلسة بنقرة واحدة' : undefined}
              >
                {live.length === 0 ? (
                  <EmptyState
                    icon={Radio}
                    title="لا بثّ مباشر الآن"
                    description="لا توجد جلسات نشطة لمقرراتك في هذه اللحظة؛ راجع الجلسات القادمة في القائمة أدناه."
                  />
                ) : (
                  <div className="flex-col gap-2">
                    {live.map((s) => <StudentSessionRow key={s.id} session={s} canJoin />)}
                  </div>
                )}
              </Card>

              {/* Upcoming */}
              <Card title="جلسات قادمة" icon={Calendar}>
                {upcoming.length === 0 ? (
                  <EmptyState
                    icon={Calendar}
                    title="لا توجد جلسات مجدولة"
                    description="لا توجد جلسات مجدولة لمقرراتك حالياً. سيظهر هنا أي بثّ يجدوله أساتذتك."
                  />
                ) : (
                  <div className="flex-col gap-2">
                    {upcoming.map((s) => <StudentSessionRow key={s.id} session={s} />)}
                  </div>
                )}
              </Card>
            </>
          )}

          {/* Recent */}
          {recent.length > 0 && (
            <Card title="جلسات منتهية" icon={CheckCircle2} subtitle="آخر 8 جلسات — قد تتوفر لها تسجيلات">
              <div className="flex-col gap-2">
                {recent.map((s) => <StudentSessionRow key={s.id} session={s} />)}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function StudentSessionRow({
  session: s,
  canJoin,
}: {
  session: LiveSessionRow;
  canJoin?: boolean;
}) {
  const ended = s.status === 'ENDED' || s.status === 'CANCELLED';
  return (
    <div
      className={`run-row${s.status === 'LIVE' ? ' is-live' : ''}`}
      style={{ '--row-accent': s.offering.course.themeColor ?? 'var(--accent)' } as CSSProperties}
    >
      <span className="live-row-icon">
        <EmojiIcon emoji={s.offering.course.iconEmoji ?? '📡'} size={20} />
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
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
          {' · '}
          {/* 22-c (A4 P3-5): a transliterated/Latin teacher name would
              scramble the Arabic sentence — isolated like the course
              code above. */}
          الأستاذ: د. <bdi>{s.teacher.firstName} {s.teacher.lastName}</bdi>
        </div>
      </div>
      {s.status === 'LIVE' && (
        <span className="live-chip">
          <span className="live-dot" aria-hidden />
          مباشر
        </span>
      )}
      {s.status === 'SCHEDULED' && <Badge color="amber">مجدولة</Badge>}
      {ended && (
        <Badge color={s.status === 'CANCELLED' ? 'red' : 'green'}>
          {s.status === 'CANCELLED' ? 'ملغاة' : 'منتهية'}
        </Badge>
      )}
      {canJoin && s.joinUrl && (
        <a
          href={s.joinUrl}
          target="_blank"
          rel="noreferrer"
          className="btn primary sm"
        >
          <Icon icon={ExternalLink} size={12} /> انضمام
        </a>
      )}
      {ended && s.recordingUrl && (
        <a href={s.recordingUrl} target="_blank" rel="noreferrer" className="btn sm">
          <Icon icon={ExternalLink} size={12} /> التسجيل
        </a>
      )}
    </div>
  );
}
