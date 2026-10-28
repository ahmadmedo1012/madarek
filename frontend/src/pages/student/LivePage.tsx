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
 *
 * R321 (c1 · WP-B2) — the page joins the sheet system (the CampusMap
 * family twin): ONE .r321m-page opt-in root (the r321-exams.css
 * contract), the SectionHeader stacks became §B2 title bars with
 * honest mono counts, the empty boards are hatched EmptyCells, and
 * the status pills ride the square r305s-chip register (tone on the
 * dot). The .live-chip/.live-dot honest LIVE pulse and the
 * .live-row-icon wells keep their student.css family untouched.
 */
import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { ExternalLink, Clock } from 'lucide-react';
/* R321 (c1 · WP-B2) — the §B2 kit: the mono-indexed section title
 * bar, the honest mono count + the hatched empty cell. */
import { SectionBar, BarCount, EmptyCell } from '../../components/student';
import { ErrorState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import {
  PageFrame, PageHeader, RowList, RowItem, StatLine,
} from '../../components/patterns';
import { useLiveSessions, type LiveSessionRow } from '../../hooks/useResources';

import { formatDate, formatInt } from '../../utils/numbers';
import { countAr } from '../../lib/format';

/* R305 Heron: the shared student vocabulary + this family's refinements. */
import '../../styles/r305-student.css';
import '../../styles/r305-student-supplemental.css';
/* R319 (c3-S2): the sheet system — the §B2 anatomy every converted
 * student page mounts (SectionBar/BarCount/EmptyCell + the family's
 * unlayered masthead tail precedent). */
import '../../styles/r319-student.css';
/* R321 (c1 · WP-B2): the map/live family's own harmonics — the
 * .r321m-page opt-in root + the inner-scale masthead re-seat (the
 * r321-exams.css contract); family-unique rules only. */
import '../../styles/r321-map-live.css';

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
     pending, the honest pulse chip / quiet chip once settled (the
     neutral answer rides the square r305s-chip register; the old
     Badge pill retired with the sheet conversion). */
  const headerStatus = !isPending
    ? live.length > 0
      ? (
          <span className="live-chip">
            <span className="live-dot" aria-hidden />
            على الهواء الآن
          </span>
        )
      : !isError
        ? (
            <span className="r305s-chip">
              <span className="r305s-chip-dot" aria-hidden />
              لا بثّ مباشر الآن
            </span>
          )
        : undefined
    : undefined;

  return (
    <div className="r321m-page">
    <PageFrame width="default">
      <PageHeader
        index="01"
        eyebrow="المعامل والتقنيات"
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
              has ANY content. R321 B2: the one empty state is the
              sheet's hatched EmptyCell. */}
          {list.length === 0 ? (
            <EmptyCell
              label="لا توجد بثوث بعد"
              note="لا توجد بثوث مرتبطة بمقرراتك بعد. حال نشر أساتذتك جلسة جديدة، ستظهر هنا تلقائياً."
            />
          ) : (
            <>
              <section className="ml-sec" aria-labelledby="live-sec-live">
                <SectionBar
                  index="02"
                  title="مباشرة الآن"
                  id="live-sec-live"
                  meta={
                    live.length > 0 ? (
                      <BarCount
                        n={live.length}
                        srLabel={countAr(live.length, ['جلسة واحدة', 'جلستان', 'جلسات', 'جلسة'])}
                      />
                    ) : undefined
                  }
                />
                {live.length > 0 && (
                  <p className="ml-sec-note">انضمّ إلى أيّ جلسة بنقرة واحدة</p>
                )}
                <RowList
                  aria-label="الجلسات المباشرة الآن"
                  empty={(
                    <EmptyCell
                      label="لا بثّ مباشرة الآن"
                      note="لا توجد جلسات نشطة لمقرراتك في هذه اللحظة؛ راجع الجلسات القادمة في القائمة أدناه."
                    />
                  )}
                >
                  {live.map((s) => <StudentSessionRow key={s.id} session={s} canJoin />)}
                </RowList>
              </section>

              <section className="ml-sec" aria-labelledby="live-sec-upcoming">
                <SectionBar
                  index="03"
                  title="جلسات قادمة"
                  id="live-sec-upcoming"
                  meta={
                    upcoming.length > 0 ? (
                      <BarCount
                        n={upcoming.length}
                        srLabel={countAr(upcoming.length, ['جلسة واحدة', 'جلستان', 'جلسات', 'جلسة'])}
                      />
                    ) : undefined
                  }
                />
                <RowList
                  aria-label="الجلسات القادمة"
                  empty={(
                    <EmptyCell
                      label="لا توجد جلسات مجدولة"
                      note="لا توجد جلسات مجدولة لمقرراتك حالياً. سيظهر هنا أي بثّ يجدوله أساتذتك."
                    />
                  )}
                >
                  {upcoming.map((s) => <StudentSessionRow key={s.id} session={s} />)}
                </RowList>
              </section>

              {recent.length > 0 && (
                <section className="ml-sec" aria-labelledby="live-sec-ended">
                  <SectionBar
                    index="04"
                    title="جلسات منتهية"
                    id="live-sec-ended"
                    meta={(
                      /* The board prints the rows it shows (the latest
                          window); the StatLine above keeps the honest
                          ENDED total. */
                      <BarCount
                        n={recent.length}
                        srLabel={countAr(recent.length, ['جلسة واحدة', 'جلستان', 'جلسات', 'جلسة'])}
                      />
                    )}
                  />
                  <p className="ml-sec-note">أحدث الجلسات المنتهية — قد تتوفر لها تسجيلات</p>
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
    </div>
  );
}

/**
 * One session row (RowItem anatomy — no whole-row link). The join/
 * recording anchors ride the trailing slot as real <a> targets; the
 * status chip keeps the stable status answer. The course emoji is
 * DATA from the course record (icon policy: EmojiIcon is the
 * data-layer emoji → Lucide bridge only). R321 B2: the status rides
 * the square r305s-chip register — tone on the dot, the honest
 * Arabic words the chip body (the amber/green/red Badge pills
 * retired); the LIVE pulse keeps its .live-chip family.
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
          {s.status === 'SCHEDULED' && (
            <span className="r305s-chip r305s-chip--warning">
              <span className="r305s-chip-dot" aria-hidden />
              مجدولة
            </span>
          )}
          {ended && (
            <span className={`r305s-chip ${s.status === 'CANCELLED' ? 'r305s-chip--danger' : 'r305s-chip--success'}`}>
              <span className="r305s-chip-dot" aria-hidden />
              {s.status === 'CANCELLED' ? 'ملغاة' : 'منتهية'}
            </span>
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
