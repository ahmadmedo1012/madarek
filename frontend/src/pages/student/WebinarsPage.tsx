import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  Calendar, Globe, Mic2, Video, ArrowLeft, MessageSquare, Radio, Clock,
} from 'lucide-react';
import { Card, MetricCard, Badge } from '../../components/primitives';
import { ErrorState, EmptyState, Skeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useCampusEvents, useLiveSessions } from '../../hooks/useResources';

/**
 * Honest webinars landing.
 *
 * The previous WebinarsPage rendered 7 invented webinars with fake
 * international speakers. The platform's real events live in
 * CampusEvent / LiveSession; this page surfaces the real live/upcoming
 * session schedule (live-vs-upcoming distinction: the pulse dot marks
 * LIVE sessions only) plus links to where events actually live.
 */

/** Human session slot: weekday + date + time (time isolated in a bdi). */
function fmtSessionWhen(iso: string): ReactNode {
  const d = new Date(iso);
  const date = d.toLocaleDateString('ar-LY', { weekday: 'long', day: 'numeric', month: 'short' });
  const time = d.toLocaleTimeString('ar-LY', { hour: '2-digit', minute: '2-digit' });
  return <>{date} · <bdi>{time}</bdi></>;
}

export default function WebinarsPage() {
  const events = useCampusEvents();
  const live = useLiveSessions();

  const liveNow = (live.data ?? []).filter((s) => s.status === 'LIVE');
  const upcoming = (live.data ?? [])
    .filter((s) => s.status === 'SCHEDULED')
    .sort((a, b) => a.scheduledAt.localeCompare(b.scheduledAt))
    .slice(0, liveNow.length > 0 ? 2 : 3);
  const sessions = [...liveNow, ...upcoming];

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الندوات وورش العمل</h1>
          <p className="page-subtitle">
            الفعاليّات الجامعيّة الرسميّة تُنشر على لوحة المجتمع — ستجد هنا جدول البثّ المباشر وروابط سريعة.
          </p>
        </div>
      </header>

      <div className="grid-2 webinar-kpis">
        <MetricCard
          icon={Calendar}
          label="فعاليّات قادمة"
          value={events.isPending ? '…' : events.isError ? '—' : (events.data?.length ?? 0).toLocaleString('ar-LY')}
          change={
            events.isError
              // Honest failure + a way out — never a masked zero (ruling #14).
              ? <button type="button" className="btn ghost sm" onClick={() => void events.refetch()}>تعذّر التحميل — أعد المحاولة</button>
              : 'على لوحة المجتمع'
          }
          color="brand"
        />
        <MetricCard
          icon={Mic2}
          label="بثوث مباشرة الآن"
          value={live.isPending ? '…' : live.isError ? '—' : liveNow.length.toLocaleString('ar-LY')}
          change={live.isError ? 'تعذّر التحميل' : 'مرتبطة بمقرّراتك'}
          color="red"
        />
      </div>

      <Card title="جلسات البثّ المباشر" icon={Video} subtitle="البثوث المرتبطة بمقرّراتك — المباشرة منها تُعلَّم بنبضة حمراء">
        {live.isPending ? (
          <div className="flex-col gap-2" aria-busy="true" aria-live="polite">
            {[0, 1, 2].map((i) => (
              <div className="webinar-row" key={i} aria-hidden>
                <Skeleton width={14} height={14} rounded="50%" />
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--sp-1)' }}>
                  <Skeleton width="45%" height={13} />
                  <Skeleton width="65%" height={11} />
                </div>
                <Skeleton width={70} height={22} rounded="var(--r-full)" />
              </div>
            ))}
          </div>
        ) : live.isError ? (
          <ErrorState error={live.error} onRetry={() => live.refetch()} />
        ) : !sessions.length ? (
          <EmptyState
            icon={Video}
            title="لا توجد جلسات مباشرة مجدولة الآن"
            description="عندما يبدأ أستاذك بثّاً مباشراً ستجده هنا وفي صفحة البثّ — مع التسجيلات بعد انتهاء الجلسة."
            action={<Link to="/student/live" className="btn outline sm">زيارة صفحة البثّ</Link>}
          />
        ) : (
          <div className="flex-col gap-2">
            {sessions.map((s) => {
              const isLive = s.status === 'LIVE';
              return (
                <div className={`webinar-row${isLive ? ' live' : ''}`} key={s.id}>
                  {isLive ? (
                    /* The ONE pulse on the page — LIVE rows only */
                    <span className="webinar-live-dot" aria-hidden />
                  ) : (
                    <span className="webinar-row-icon" aria-hidden><Icon icon={Clock} size={14} /></span>
                  )}
                  <div className="webinar-row-body">
                    <div className="webinar-row-title" title={s.title}>{s.title}</div>
                    <div className="webinar-row-sub">{s.offering.course.name} · {fmtSessionWhen(s.scheduledAt)}</div>
                  </div>
                  {isLive ? (
                    <Badge color="red"><Icon icon={Radio} size={11} /> مباشر الآن</Badge>
                  ) : (
                    <Badge>قادمة</Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>

      <Card title="أين أجد الفعاليّات الحقيقيّة؟" icon={Globe}>
        <div className="webinar-dest-grid">
          <div className="webinar-dest">
            <h3 className="webinar-dest-title">
              <Icon icon={MessageSquare} size={16} aria-hidden /> المجتمع الجامعيّ
            </h3>
            <p className="webinar-dest-desc">
              تابع الفعاليّات والإعلانات والمسابقات على مستوى الجامعة. جميع الأحداث القادمة ظاهرة هناك مع
              زر «سأحضر» للتأكيد.
            </p>
            <Link to="/community" className="btn primary sm">
              <Icon icon={ArrowLeft} size={13} />
              فتح المجتمع
            </Link>
          </div>

          <div className="webinar-dest">
            <h3 className="webinar-dest-title">
              <Icon icon={Video} size={16} aria-hidden /> البثّ المباشر
            </h3>
            <p className="webinar-dest-desc">
              جلسات البثّ المباشر الخاصّة بمقرّراتك مع التسجيلات بعد الجلسة.
            </p>
            <Link to="/student/live" className="btn primary sm">
              <Icon icon={ArrowLeft} size={13} />
              فتح صفحة البثّ
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
