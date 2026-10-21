import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import {
  Video, ArrowLeft, MessageSquare, Radio, Clock, ExternalLink,
} from 'lucide-react';
import { Badge } from '../../components/primitives';
import { ErrorState, EmptyState, Skeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { PageFrame, PageHeader, SectionHeader, StatLine } from '../../components/patterns';
import { useCampusEvents, useLiveSessions } from '../../hooks/useResources';
import { formatDate, formatInt, formatNum, formatTime } from '../../utils/numbers';

/* R305 Heron: the shared student vocabulary + this family's refinements. */
import '../../styles/r305-student.css';
import '../../styles/r305-student-supplemental.css';

/**
 * Honest webinars landing.
 *
 * The previous WebinarsPage rendered 7 invented webinars with fake
 * international speakers. The platform's real events live in
 * CampusEvent / LiveSession; this page surfaces the real live/upcoming
 * session schedule (live-vs-upcoming distinction: the pulse dot marks
 * LIVE sessions only) plus links to where events actually live.
 *
 * R304 rebuild: PageFrame + patterns PageHeader + ONE StatLine (the
 * grid-2 MetricCard pair is gone — including the one that abused the
 * `change` slot as an error control; that failure path now lives in
 * its own quiet retry row under the StatLine). The session rows keep
 * their `.webinar-row` anatomy inside SectionHeader sections.
 */

/** Human session slot: weekday + date + time (time isolated in a bdi). */
function fmtSessionWhen(iso: string): ReactNode {
  const d = new Date(iso);
  const date = formatDate(d, { weekday: 'long', day: 'numeric', month: 'short' });
  const time = formatTime(d, { hour: '2-digit', minute: '2-digit' });
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
    <PageFrame width="default">
      <PageHeader
        title="الندوات وورش العمل"
        description="جدول البثّ المباشر لمقرّراتك، وروابط سريعة إلى حيث تُنشر الفعاليّات الجامعيّة الرسميّة."
      />

      {/* The two MetricCards collapsed into ONE StatLine — counts from
          the real payloads only (honest «…»/«—» placeholders while the
          queries settle / fail). */}
      <StatLine
        items={[
          {
            label: 'فعاليّات قادمة',
            value: events.isPending ? '…' : events.isError ? '—' : formatNum(events.data?.length ?? 0),
            hint: 'على لوحة المجتمع',
          },
          {
            label: 'بثوث مباشرة الآن',
            value: live.isPending ? '…' : live.isError ? '—' : formatInt(liveNow.length),
            hint: 'مرتبطة بمقرّراتك',
            tone: !live.isPending && !live.isError && liveNow.length > 0 ? 'signal' : 'neutral',
          },
        ]}
      />

      {/* Honest failure + a way out — never a masked zero (ruling #14).
          Used to live inside a MetricCard `change` slot. */}
      {events.isError && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>تعذّر تحميل الفعاليّات الجامعيّة.</span>
          <button type="button" className="btn ghost sm" onClick={() => void events.refetch()}>
            أعد المحاولة
          </button>
        </div>
      )}

      <section aria-label="جلسات البثّ المباشر">
        <SectionHeader
          title="جلسات البثّ المباشر"
          description="البثوث المرتبطة بمقرّراتك — المباشرة منها تُعلَّم بنبضة حمراء"
        />
        {live.isPending ? (
          <div className="flex-col gap-2" aria-busy="true" aria-live="polite">
            {[0, 1, 2].map((i) => (
              <div className="webinar-row" key={i} aria-hidden>
                <Skeleton width={14} height={14} rounded="50%" />
                <div className="webinar-row-body">
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
            illustration="empty-list"
            description="عندما يبدأ أستاذك بثّاً مباشراً ستجده هنا وفي صفحة البثّ — مع التسجيلات بعد انتهاء الجلسة."
            action={<Link to="/student/live" className="btn outline sm">زيارة صفحة البثّ</Link>}
          />
        ) : (
          <div className="flex-col gap-2">
            {sessions.map((s) => {
              const isLive = s.status === 'LIVE';
              /* r157 (F8): فعل الانضمام لصفوف البثّ المباشر — كانت الصفوف
               * كلها استعراضاً بلا نقر. joinUrl خارجي (http/https) → مرساة
               * تبويب جديد؛ وبدونه (أو بمسار غير خارجي) → رابط صفحة البثّ
               * الداخلي حيث تجري الجلسة فعلاً. الصفوف القادمة لا تحمل
                 الفعل — ليست مباشرة بعد. */
              const externalJoin = s.joinUrl && /^https?:\/\//i.test(s.joinUrl) ? s.joinUrl : null;
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
                    <>
                      <Badge color="red"><Icon icon={Radio} size={11} /> مباشر الآن</Badge>
                      {externalJoin ? (
                        <a
                          href={externalJoin}
                          target="_blank"
                          rel="noreferrer"
                          className="btn primary sm"
                        >
                          <Icon icon={ExternalLink} size={12} /> انضمام
                        </a>
                      ) : (
                        <Link to="/student/live" className="btn primary sm">
                          <Icon icon={Video} size={12} /> انضمام
                        </Link>
                      )}
                    </>
                  ) : (
                    <Badge>قادمة</Badge>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      <section aria-label="أين أجد الفعاليّات الحقيقيّة؟">
        <SectionHeader
          title="أين أجد الفعاليّات الحقيقيّة؟"
          description="الفعاليّات الرسميّة تُنشر على لوحة المجتمع، وجلسات مقرّراتك تعيش في صفحة البثّ."
        />
        {/* R305 Heron: the two destinations fold from card tiles into the
            copper-edged rails (the shared .r305s-next emphasis) — quiet
            paths, not boxes. */}
        <div className="r305w-dests">
          <div className="r305s-next r305p-rail r305w-dest">
            {/* 5-D3 (A3 P3-2): demoted from h3 — card-internal labels
                under the page's lone h1 (class carries the visuals). */}
            <div className="webinar-dest-title">
              <Icon icon={MessageSquare} size={16} aria-hidden /> المجتمع الجامعيّ
            </div>
            <p className="webinar-dest-desc">
              تابع الفعاليّات والإعلانات والمسابقات على مستوى الجامعة. جميع الأحداث القادمة ظاهرة هناك مع
              زر «سأحضر» للتأكيد.
            </p>
            <Link to="/community" className="btn primary sm">
              <Icon icon={ArrowLeft} size={13} />
              فتح المجتمع
            </Link>
          </div>

          <div className="r305s-next r305p-rail r305w-dest">
            <div className="webinar-dest-title">
              <Icon icon={Video} size={16} aria-hidden /> البثّ المباشر
            </div>
            <p className="webinar-dest-desc">
              جلسات البثّ المباشر الخاصّة بمقرّراتك مع التسجيلات بعد الجلسة.
            </p>
            <Link to="/student/live" className="btn primary sm">
              <Icon icon={ArrowLeft} size={13} />
              فتح صفحة البثّ
            </Link>
          </div>
        </div>
      </section>
    </PageFrame>
  );
}
