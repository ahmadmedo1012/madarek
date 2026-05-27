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
import { Radio, Calendar, CheckCircle2, AlertCircle, ExternalLink, Clock } from 'lucide-react';
import { Card, Badge, MetricCard } from '../../components/primitives';
import { CardSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import { useLiveSessions, type LiveSessionRow } from '../../hooks/useResources';

import { formatDate } from '../../utils/numbers';

export default function LivePage() {
  const { data: sessions, isLoading } = useLiveSessions();

  const live = useMemo(() => sessions?.filter((s) => s.status === 'LIVE') ?? [], [sessions]);
  const upcoming = useMemo(() => sessions?.filter((s) => s.status === 'SCHEDULED') ?? [], [sessions]);
  const recent = useMemo(
    () => sessions?.filter((s) => s.status === 'ENDED').slice(0, 8) ?? [],
    [sessions],
  );

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المحاضرات المباشرة</h1>
          <p className="page-subtitle">
            ينظِّم الأساتذة محاضرات حية لمقرراتك. ستجد هنا الجلسات النشطة والقادمة فقط لمقرراتك المسجَّلة.
          </p>
        </div>
        {live.length > 0 ? (
          <Badge color="red"><Icon icon={Radio} size={11} /> على الهواء الآن</Badge>
        ) : (
          <Badge>لا توجد جلسات نشطة</Badge>
        )}
      </div>

      <div className="grid-3">
        <MetricCard icon={Radio} label="مباشرة الآن" value={live.length.toString()} color="red" />
        <MetricCard icon={Calendar} label="جلسات قادمة" value={upcoming.length.toString()} color="amber" />
        <MetricCard icon={CheckCircle2} label="منتهية" value={recent.length.toString()} color="green" />
      </div>

      {isLoading && <CardSkeleton lines={4} />}

      {/* Live now */}
      {live.length > 0 && (
        <Card title="مباشرة الآن" icon={Radio} subtitle="انضمّ إلى أيّ جلسة بنقرة واحدة">
          <div className="flex-col gap-2">
            {live.map((s) => <StudentSessionRow key={s.id} session={s} canJoin />)}
          </div>
        </Card>
      )}

      {/* Upcoming */}
      <Card title="جلسات قادمة" icon={Calendar}>
        {upcoming.length === 0 ? (
          <div className="empty-state">
            <Icon icon={Calendar} size={24} className="text-subtle" />
            <p className="text-sm text-muted">
              لا توجد جلسات مجدولة لمقرراتك حالياً. سيظهر هنا أي بثّ يجدوله أساتذتك.
            </p>
          </div>
        ) : (
          <div className="flex-col gap-2">
            {upcoming.map((s) => <StudentSessionRow key={s.id} session={s} />)}
          </div>
        )}
      </Card>

      {/* Recent */}
      {recent.length > 0 && (
        <Card title="جلسات منتهية" icon={CheckCircle2} subtitle="آخر 8 جلسات — قد تتوفر لها تسجيلات">
          <div className="flex-col gap-2">
            {recent.map((s) => <StudentSessionRow key={s.id} session={s} />)}
          </div>
        </Card>
      )}

      {!isLoading && sessions && sessions.length === 0 && (
        <Card>
          <div className="empty-state">
            <Icon icon={AlertCircle} size={28} className="text-subtle" />
            <p className="text-sm text-muted" style={{ textAlign: 'center', maxWidth: 380 }}>
              لا توجد بثوث مرتبطة بمقرراتك بعد. حال نشر أساتذتك جلسة جديدة، ستظهر هنا تلقائياً.
            </p>
          </div>
        </Card>
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
  const accent = s.offering.course.themeColor ?? 'var(--accent)';
  const ended = s.status === 'ENDED' || s.status === 'CANCELLED';
  return (
    <div className="run-row" style={{ borderInlineStart: `3px solid ${accent}` }}>
      <EmojiIcon emoji={s.offering.course.iconEmoji ?? '📡'} size={22} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="text-sm" style={{ fontWeight: 600, marginBottom: 2 }}>
          {s.title}
        </div>
        <div className="text-xs text-muted">
          {s.offering.course.code} · {s.offering.course.name}
          {s.topic ? ` · ${s.topic}` : ''}
        </div>
        <div className="text-xxs text-subtle">
          <Icon icon={Clock} size={10} />{' '}
          {formatDate(s.scheduledAt, {
            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
          })}
          {' · '}
          الأستاذ: د. {s.teacher.firstName} {s.teacher.lastName}
        </div>
      </div>
      {s.status === 'LIVE' && (
        <Badge color="red"><Icon icon={Radio} size={11} /> مباشر</Badge>
      )}
      {s.status === 'SCHEDULED' && <Badge color="amber">مجدولة</Badge>}
      {ended && <Badge color="green">منتهية</Badge>}
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
