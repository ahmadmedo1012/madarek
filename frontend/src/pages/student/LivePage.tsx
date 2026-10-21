/**
 * Student-facing live sessions list.
 *
 * Path: /student/live
 * Restricted: STUDENT (route-level).
 *
 * Watch-only by design — students cannot create, schedule, or end
 * sessions. They see only sessions for offerings they are enrolled
 * in, and can join the teacher-provided URL.
 *
 * R304 rebuild: PageFrame + patterns PageHeader + ONE StatLine (the
 * grid-3 MetricCard wall is gone) + per-status sections as
 * RowList/RowItem rows. The session row is deliberately NOT a
 * whole-row link — its trailing slot carries the real join/recording
 * anchors, and a row that is itself a link must never nest an
 * interactive control (patterns contract).
 */
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Radio, Calendar, ExternalLink, Clock, Video } from 'lucide-react';
import { Badge } from '../../components/primitives';
import { EmptyState, ErrorState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import {
  PageFrame, PageHeader, SectionHeader, RowList, RowItem, StatLine,
} from '../../components/patterns';
import { useLiveSessions, type LiveSessionRow } from '../../hooks/useResources';

import { formatDate, formatInt } from '../../utils/numbers';

/* R305 Heron: the shared student vocabulary + this family's refinements. */
import '../../styles/r305-student.css';
import '../../styles/r305-student-supplemental.css';

export default function LivePage() {
  const { data: sessions, isPending, isError, error, refetch } = useLiveSessions();

  // `sessions` is undefined while pending AND on error — derive from a
  // settled list only, so an API failure can never render as "no sessions".
  const list = useMemo(
    () => (!isPending && !isError ? (sessions ?? []) : []),
    [isPending, isError, sessions],
  );

  const live = useMemo(() => list.filter((s) => s.status === 'LIVE'), [list]);
  const upcoming = useMemo(() => list.filter((s) => s.status === 'SCHEDULED'), [list]);
  const ended = useMemo(() => list.filter((s) => s.status === 'ENDED'), [list]);
  // The section shows the latest window only; the StatLine keeps the
  // honest ENDED total.
  const recent = useMemo(() => ended.slice(0, 8), [ended]);

  /* The header's one live-status answer — quiet while the query is
     pending, an honest chip/badge once settled. */
  const headerStatus = !isPending
    ? live.length > 0
      ? (
          <span className="live-chip">
            <span className="live-dot" aria-hidden />
            على الهواء الآن
          </span>
        )
      : !isError
        ? <Badge>لا بثّ مباشر الآن</Badge>
        : undefined
    : undefined;

  return (
    <PageFrame width="default">
      <PageHeader
        title="البث المباشر"
        description="الجلسات الحيّة لمقرّراتك المسجَّلة — انضمّ للبثّ المباشر، وستجد التسجيلات هنا بعد انتهاء كل جلسة."
        actions={headerStatus}
      />

      {isPending ? (
        <RowList loading aria-label="جلسات البث" />
      ) : isError ? (
        /* API-down is the default demo state — surface it honestly with
           retry instead of masking it as an empty schedule. */
        <ErrorState
          message="تعذَّر تحميل البثوث"
          error={error}
          onRetry={() => refetch()}
        />
      ) : (
        <>
          {/* The three MetricCards collapsed into ONE StatLine. «منتهية»
              counts every ENDED session in the payload — the section
              below renders only the latest window. */}
          <StatLine
            items={[
              {
                label: 'مباشرة الآن',
                value: formatInt(live.length),
                tone: live.length > 0 ? 'signal' : 'neutral',
              },
              { label: 'جلسات قادمة', value: formatInt(upcoming.length) },
              { label: 'منتهية', value: formatInt(ended.length) },
            ]}
          />

          {/* 22-c (A4 P2-1): an empty schedule used to stack THREE
              «nothing» cards on top of the 0/0/0 KPIs. A fully-empty
              list gets ONE honest empty state; the per-status sections
              keep their stable slots (15-j §3 #10: "is anything on
              air?" deserves a stable answer) only when the schedule
              has ANY content. */}
          {list.length === 0 ? (
            <EmptyState
              illustration="empty-list"
              icon={Video}
              title="لا توجد بثوث بعد"
              description="لا توجد بثوث مرتبطة بمقرراتك بعد. حال نشر أساتذتك جلسة جديدة، ستظهر هنا تلقائياً."
            />
          ) : (
            <>
              <section aria-label="جلسات مباشرة الآن">
                <SectionHeader
                  title="مباشرة الآن"
                  description={live.length > 0 ? 'انضمّ إلى أيّ جلسة بنقرة واحدة' : undefined}
                />
                <RowList
                  aria-label="الجلسات المباشرة الآن"
                  empty={(
                    <EmptyState
                      illustration="empty-list"
                      icon={Radio}
                      title="لا بثّ مباشرة الآن"
                      description="لا توجد جلسات نشطة لمقرراتك في هذه اللحظة؛ راجع الجلسات القادمة في القائمة أدناه."
                    />
                  )}
                >
                  {live.map((s) => <StudentSessionRow key={s.id} session={s} canJoin />)}
                </RowList>
              </section>

              <section aria-label="الجلسات القادمة">
                <SectionHeader title="جلسات قادمة" />
                <RowList
                  aria-label="الجلسات القادمة"
                  empty={(
                    <EmptyState
                      illustration="empty-list"
                      icon={Calendar}
                      title="لا توجد جلسات مجدولة"
                      description="لا توجد جلسات مجدولة لمقرراتك حالياً. سيظهر هنا أي بثّ يجدوله أساتذتك."
                    />
                  )}
                >
                  {upcoming.map((s) => <StudentSessionRow key={s.id} session={s} />)}
                </RowList>
              </section>

              {recent.length > 0 && (
                <section aria-label="الجلسات المنتهية">
                  <SectionHeader
                    title="جلسات منتهية"
                    description="أحدث الجلسات المنتهية — قد تتوفر لها تسجيلات"
                  />
                  <RowList aria-label="الجلسات المنتهية">
                    {recent.map((s) => <StudentSessionRow key={s.id} session={s} />)}
                  </RowList>
                </section>
              )}
            </>
          )}
        </>
      )}
    </PageFrame>
  );
}

/**
 * One session row (RowItem anatomy — no whole-row link). The join/
 * recording anchors ride the trailing slot as real <a> targets; the
 * status Badge keeps the stable status answer. The course emoji is
 * DATA from the course record (icon policy: EmojiIcon is the
 * data-layer emoji → Lucide bridge only).
 */
function StudentSessionRow({
  session: s,
  canJoin,
}: {
  session: LiveSessionRow;
  canJoin?: boolean;
}) {
  const ended = s.status === 'ENDED' || s.status === 'CANCELLED';
  return (
    <RowItem
      leading={
        <span
          className="live-row-icon"
          style={{ '--row-accent': s.offering.course.themeColor ?? 'var(--accent)' } as CSSProperties}
        >
          <EmojiIcon emoji={s.offering.course.iconEmoji ?? '📡'} size={20} />
        </span>
      }
      title={s.title}
      meta={
        /* R305 Heron: the row's metadata rides the meta-row register —
           hairline separators instead of bare middots. */
        <span className="r305s-meta-row">
          <bdi>{s.offering.course.code}</bdi>
          <span className="r305s-meta-sep" aria-hidden />
          {s.offering.course.name}
          {s.topic && (
            <>
              <span className="r305s-meta-sep" aria-hidden />
              {s.topic}
            </>
          )}
          <span className="r305s-meta-sep" aria-hidden />
          <Icon icon={Clock} size={11} />{' '}
          <bdi>
            {formatDate(s.scheduledAt, {
              day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
            })}
          </bdi>
          <span className="r305s-meta-sep" aria-hidden />
          {/* 22-c (A4 P3-5): a transliterated/Latin teacher name would
              scramble the Arabic sentence — isolated like the course
              code above. */}
          الأستاذ: د. <bdi>{s.teacher.firstName} {s.teacher.lastName}</bdi>
        </span>
      }
      trailing={
        <>
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
            <a href={s.joinUrl} target="_blank" rel="noreferrer" className="btn primary sm">
              <Icon icon={ExternalLink} size={12} /> انضمام
            </a>
          )}
          {ended && s.recordingUrl && (
            <a href={s.recordingUrl} target="_blank" rel="noreferrer" className="btn sm">
              <Icon icon={ExternalLink} size={12} /> التسجيل
            </a>
          )}
        </>
      }
    />
  );
}
