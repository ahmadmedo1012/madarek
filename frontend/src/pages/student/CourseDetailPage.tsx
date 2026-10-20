import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Play, FileText, ClipboardList, Calendar,
  Clock, CheckCircle2, ChevronLeft, ChevronRight, Presentation, Video, FileArchive, Image,
  type LucideIcon,
} from 'lucide-react';
import { Badge, ProgressBar } from '../../components/primitives';
import { ErrorState, EmptyState, Skeleton, ListSkeleton } from '../../components/primitives/States';
import {
  PageFrame, PageHeader, SectionHeader, StatLine,
} from '../../components/patterns';
import { Reveal, RevealGroup, useReducedMotion } from '../../components/motion';
import { Icon } from '../../components/Icon';
import { useOfferingFull, selectNextLecture, pendingCheckpoints } from '../../hooks/useResources';
import { useEntityPageTitle } from '../../components/layout/AppShell';
import { materialHref } from '../../lib/materialHref';
import { countAr, formatDateAr, WEEKDAY_NAMES_AR } from '../../lib/format';
import { formatInt } from '../../utils/numbers';
import { courseTint, ASSIGNMENT_KIND_LABEL, MATERIAL_TYPE_LABEL, type AssignmentKind, type MaterialType } from '../../lib/courseMeta';

/* courseIcon + DEFAULT_COURSE_TINT (via courseTint) + the assignment-kind
 * labels live in lib/courseMeta.ts; countAr, formatDateAr + WEEKDAY_NAMES_AR
 * live in lib/format.ts (waves 9-a / 13-15). */


function fmtDuration(sec: number) {
  const m = Math.round(sec / 60);
  return `${m}د`;
}

/* r157 (W2-F7 / audit 6A13): per-format material icons — every row
 * wore the same FileText glyph, so a 50MB lecture recording and a
 * 2-slide handout were visually identical in a list the student
 * scans by format. PPT→Presentation, VIDEO→Video, ZIP→FileArchive,
 * IMAGE→Image; the document formats (PDF/DOC/OTHER) stay FileText.
 * Unknown types (schema drift) fall back to FileText. */
const MATERIAL_TYPE_ICON: Record<MaterialType, LucideIcon> = {
  PPT: Presentation,
  VIDEO: Video,
  ZIP: FileArchive,
  IMAGE: Image,
  PDF: FileText,
  DOC: FileText,
  OTHER: FileText,
};

/* fmtDate (short ar-LY date) is lib/format.formatDateAr (13-15 fold).
 * The weekday names + assignment-kind labels are imported above. */
/** Reads a --motion-duration-* token (ms) so JS-driven animation timing
 *  stays on the design scale — guardrail #1 applies to TSX too. */
function motionTokenMs(name: string, fallback: number): number {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

/** Curriculum progress count-up (the authored moment of this page).
 *  Instant when prefers-reduced-motion is set (guardrail #6). */
function useCountUp(target: number): number {
  const reduced = useReducedMotion();
  const [value, setValue] = useState(0);
  const raf = useRef<number>(0);

  useEffect(() => {
    if (reduced || target <= 0) {
      setValue(target);
      return;
    }
    const duration = motionTokenMs('--motion-duration-stat', 700);
    const startedAt = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration);
      // exponential ease-out — the JS counterpart of --motion-ease-decelerate
      setValue(Math.round((1 - Math.pow(2, -10 * t)) * target));
      if (t < 1) raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf.current);
  }, [target, reduced]);

  return value;
}

export default function CourseDetailPage() {
  const { offeringId } = useParams<{ offeringId: string }>();
  const { data, isPending, isError, error, refetch } = useOfferingFull(offeringId);
  // r183-B6 (A4 P3-4): the tab names the COURSE, not the pattern —
  // null while pending leaves the shell's «تفاصيل المقرّر» in place.
  useEntityPageTitle(data?.course.name ?? null);

  // Derived BEFORE the early returns so the count-up hook (useState /
  // useEffect / useReducedMotion inside) keeps a stable order across the
  // pending → data transition (the LabsPage audit P2 crash pattern).
  const watchedCount = data?.lectures.filter((l) => l.watchEvents?.[0]?.completed).length ?? 0;
  const lecProgress = data?.lectures.length
    ? Math.round((watchedCount / data.lectures.length) * 100)
    : 0;
  const progressValue = useCountUp(lecProgress);

  if (isPending) {
    return (
      <PageFrame width="default">
        <Skeleton width={200} height={32} rounded="var(--r-md)" />
        <div className="course-continue" aria-busy="true" aria-live="polite">
          <Skeleton width="55%" height={20} />
          <Skeleton width={220} height={8} rounded="var(--r-full)" />
        </div>
        <ListSkeleton rows={3} />
      </PageFrame>
    );
  }
  if (isError || !data) {
    // Page chrome + way back (audit 0-d P2 — the bare ErrorState had
    // no page wrapper and no route back to the courses list).
    return (
      <PageFrame width="default">
        <Link to="/student/courses" className="btn ghost sm" style={{ alignSelf: 'flex-start' }}>
          <Icon icon={ChevronRight} size={13} />
          العودة إلى مقرراتي
        </Link>
        <ErrorState error={error} onRetry={() => refetch()} />
      </PageFrame>
    );
  }

  // Course-level identity tint from the API. It is NOT a college accent
  // (the gateCollegeAccent machinery governs college-identity surfaces
  // only) — contrast is guaranteed by construction: the tint is consumed
  // exclusively as color-mix washes over var(--surface) with --text ink.
  const tint = courseTint(data.course.themeColor);

  /* r164d (course flow): the FIRST unfinished lecture — watch open OR
   * checkpoints pending (r155a caps attempts, an unanswered checkpoint
   * stays an open loop). Pure selection lives in hooks/resources/
   * learning.ts; the same object reference rides both the hero «التالي»
   * CTA and the highlighted row below (indexOf by identity). */
  const nextLec = selectNextLecture(data.lectures);
  const nextLecIdx = nextLec ? data.lectures.indexOf(nextLec) : -1;
  const nextPending = nextLec ? pendingCheckpoints(nextLec) : 0;

  return (
    <PageFrame width="default">
      <PageHeader
        title={data.course.name}
        breadcrumbs={[
          { label: 'مقرّراتي الدراسية', to: '/student/courses' },
          { label: data.course.name },
        ]}
        description={
          <>
            د. {data.teacher.firstName} {data.teacher.lastName} ·{' '}
            {countAr(data.course.credits, ['ساعة معتمدة واحدة', 'ساعتان معتمدتان', 'ساعات معتمدة', 'ساعة معتمدة'])} · الفصل <bdi>{data.term}</bdi>
          </>
        }
        meta={<><Badge><bdi className="font-mono">{data.course.code}</bdi></Badge> · {data.course.department.name}</>}
      />

      {/* The continue strip — one unmistakable next action (the
          Coursera/edX course-home rule). Progress rides beside it;
          the tinted hero band keeps the course's identity wash. */}
      <div className="course-continue" style={{ '--course-tint': tint } as CSSProperties}>
        <div className="course-continue-progress">
          <div className="course-hero-progress-head">
            <span className="course-hero-progress-label">تقدّمك في المنهج</span>
            <span className="course-hero-progress-value">{progressValue}%</span>
          </div>
          <ProgressBar value={lecProgress} color={tint} showValue={false} ariaLabel="نسبة إكمال محاضرات المقرر" />
          <div className="course-hero-progress-note">
            {countAr(watchedCount, ['محاضرة مكتملة', 'محاضرتان مكتملتان', 'محاضرات مكتملة', 'محاضرة مكتملة'])} من {data.lectures.length}
          </div>
        </div>
        {/* r164d (course flow): THE primary «التالي» CTA — jumps
            straight to the first unfinished lecture; when nothing is
            left, the honest done state replaces the button (no dead
            CTA). */}
        {nextLec ? (
          <div className="course-continue-next">
            <Link to={`/student/lectures/${nextLec.id}`} className="btn primary" title={nextLec.title}>
              <Icon icon={Play} size={13} />
              التالي: المحاضرة <bdi>{nextLec.ordinal}</bdi>
              {/* ChevronLeft = the RTL forward direction (matches
                  the player's next-lecture button). */}
              <Icon icon={ChevronLeft} size={13} />
            </Link>
            <div
              className="course-hero-progress-note"
              style={nextPending > 0
                ? { color: 'var(--warning-ink)' }
                : { whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              title={nextLec.title}
            >
              {nextPending > 0
                ? `تبقى نقاط تفاعل لم تُجب (${nextPending})`
                : nextLec.title}
            </div>
          </div>
        ) : data.lectures.length > 0 ? (
          <Badge color="green" icon={CheckCircle2}>أنهيت محاضرات المقرّر</Badge>
        ) : null}
      </div>

      {/* The course's own facts as one stat line (r221: no icon-box
          KPI wall). */}
      <StatLine
        items={[
          { label: 'المحاضرات', value: formatInt(data.lectures.length), hint: countAr(watchedCount, ['واحدة مكتملة', 'مكتملتان', 'مكتملة', 'مكتملة']) },
          { label: 'المواد المرفقة', value: formatInt(data.materials.length), hint: countAr(data.materials.length, ['ملف واحد متاح', 'ملفان متاحان', 'ملفات متاحة', 'ملفاً متاحاً']) },
          { label: 'الواجبات', value: formatInt(data.assignments.length), hint: 'هذا الفصل' },
          { label: 'الطلاب', value: formatInt(data._count.enrollments), hint: countAr(data._count.enrollments, ['طالب واحد مسجَّل', 'طالبان مسجَّلان', 'طلاب مسجَّلون', 'طالباً مسجَّلاً']) },
        ]}
      />

      {/* Lectures — the curriculum; rows reveal with a capped stagger
          (Reveal/RevealGroup primitives, reduced-motion aware).
          heading="h2" (PP-X2 / audit P3-24): SR heading navigation can
          jump between the page's sections instead of meeting a single
          H1 + anonymous card titles. */}
      <section aria-label="محاضرات المقرر" className="course-lectures">
        <SectionHeader
          title="المحاضرات"
          description={`أكملت ${watchedCount} من ${countAr(data.lectures.length, ['محاضرة واحدة', 'محاضرتين', 'محاضرات', 'محاضرة'])}`}
        />
        {!data.lectures.length ? (
          <EmptyState
            icon={Play}
            title="لم تُرفع محاضرات بعد"
            illustration="empty-list"
            description="سيقوم الأستاذ بإضافة المحاضرات تباعاً مع تقدّم الفصل."
          />
        ) : (
          <RevealGroup className="flex-col gap-2">
            {data.lectures.map((lec, lecIdx) => {
              const we = lec.watchEvents?.[0];
              const watchedPct = we && we.totalSec > 0 ? Math.round((we.watchedSec / we.totalSec) * 100) : 0;
              const completed = we?.completed ?? false;
              // r164d: checkpoints still open on this row (watch may be
              // complete while answers are not — surfaced as a badge).
              const rowPending = pendingCheckpoints(lec);
              // The "continue here" row (see nextLec above).
              const isNext = lecIdx === nextLecIdx;
              return (
                <Reveal key={lec.id}>
                  <Link
                    to={`/student/lectures/${lec.id}`}
                    className={`list-row course-lec-row${isNext ? ' next' : ''}`}
                    style={{ textDecoration: 'none' }}
                  >
                    <div className={completed ? 'course-lec-well done' : 'course-lec-well'} aria-hidden>
                      <Icon icon={completed ? CheckCircle2 : Play} size={16} />
                    </div>
                    <div className="list-row-body">
                      <div className="list-row-title">
                        <span className="text-xxs text-subtle" style={{ marginInlineEnd: 'var(--sp-1-5)' }}>
                          المحاضرة <bdi className="font-mono">{String(lec.ordinal).padStart(2, '0')}</bdi>
                        </span>
                        {lec.title}
                      </div>
                      <div className="list-row-sub flex gap-3" style={{ flexWrap: 'wrap' }}>
                        <span className="flex items-center gap-1">
                          <Icon icon={Clock} size={11} /> <bdi className="font-mono">{fmtDuration(lec.durationSec)}</bdi>
                        </span>
                        <span>·</span>
                        <span>{countAr(lec._count.chapters, ['فصل واحد', 'فصلان', 'فصول', 'فصلاً'])}</span>
                        <span>·</span>
                        <span>{countAr(lec._count.checkpoints, ['نقطة تفاعل واحدة', 'نقطتا تفاعل', 'نقاط تفاعل', 'نقطة تفاعل'])}</span>
                      </div>
                      {watchedPct > 0 && watchedPct < 100 && (
                        <div style={{ marginTop: 'var(--sp-1-5)', maxWidth: 240 }}>
                          {/* r157 (W2-F7): named per-lecture bar — every
                              progressbar on the page needs its own accessible
                              name (the hero's has one; these rows had none,
                              so a screen reader met N unnamed sliders). */}
                          <ProgressBar value={watchedPct} color={tint} showValue={false} ariaLabel={`تقدّم المحاضرة ${lec.ordinal}`} />
                        </div>
                      )}
                    </div>
                    {completed && <Badge color="green">مكتملة</Badge>
                    /* r164d: checkpoint-pending state — the row's open
                     * loop, visible where the decision is made (watch
                     * done ≠ lecture done). */}

                    {rowPending > 0 && (
                      <Badge color="amber">نقاط تفاعل متبقية</Badge>
                    )}
                    {/* The next row's affordance replaces the raw % — the
                        verb names the action, the inline progress bar above
                        already carries the number. */}
                    {isNext && <Badge color="brand">تابع من هنا</Badge>}
                    {!completed && watchedPct > 0 && !isNext && <Badge color="brand">{watchedPct}%</Badge>}
                  </Link>
                </Reveal>
              );
            })}
          </RevealGroup>
        )}
      </section>

      {/* Materials + Assignments + Schedule */}
      <div className="grid-2-1">
        <section aria-label="المواد المرفقة">
        <SectionHeader title="المواد المرفقة" />
        <div className="pf-rowlist">
          {!data.materials.length ? (
            <EmptyState
              icon={FileText}
              title="الأستاذ لم يرفع مواد بعد"
              illustration="empty-list"
              description="ستظهر هنا الملفات والمراجع فور رفعها — العروض التقديمية، أوراق العمل، والقراءات."
            />
          ) : (
            <div className="flex-col gap-2">
              {data.materials.map((m) => {
                const label = MATERIAL_TYPE_LABEL[m.type as keyof typeof MATERIAL_TYPE_LABEL] ?? m.type;
                /* r144 (T1-h F8) made the row a real link; r164d
                 * (course flow) routes the target through the canonical
                 * materialHref helper (the DownloadsPage contract)
                 * instead of an inline regex: the /files/materials/
                 * namespace (uploaded course PDFs) previously fell
                 * through to a raw relative href that the SPA can't
                 * serve with the Bearer token — a dead click — and
                 * reserved demo hosts now read as the honest
                 * «غير متوفر بعد» non-link. The helper's ?back= rides
                 * /student/downloads (a valid, coherent destination). */
                const target = materialHref({ url: m.url, name: m.name });
                const body = (
                  <>
                    <Icon icon={MATERIAL_TYPE_ICON[m.type as MaterialType] ?? FileText} size={16} className="text-muted" />
                    <div className="list-row-body">
                      <div className="list-row-title" title={m.name}>{m.name}</div>
                      <div className="list-row-sub"><bdi>{label}</bdi> · {formatDateAr(m.createdAt)}</div>
                    </div>
                    {/* r157 (W2-F7): the trailing type Badge is deleted — the
                        sub line already carries the same label (and now the
                        icon encodes it too); the row read “PDF · PDF”. */}
                  </>
                );
                if (target.kind === 'viewer') {
                  return <Link key={m.id} className="list-row" to={target.to}>{body}</Link>;
                }
                if (target.kind === 'external') {
                  return (
                    <a key={m.id} className="list-row" href={target.href} target="_blank" rel="noreferrer">
                      {body}
                    </a>
                  );
                }
                return (
                  <div key={m.id} className="list-row">
                    {body}
                    <span className="text-xs text-subtle" role="note">غير متوفر بعد</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
        </section>

        <section aria-label="الجدول الأسبوعي">
        <SectionHeader title="الجدول الأسبوعي" />
        <div className="pf-rowlist">
          {!data.schedule.length ? (
            <EmptyState illustration="empty-list"
              icon={Calendar}
              title="لم يُنشَر جدول هذا المقرّر بعد"
              description="سيظهر هنا فور تثبيت مواعيد المحاضرات الأسبوعيّة."
            />
          ) : (
            <div className="flex-col gap-2">
              {data.schedule.map((s) => (
                <div key={s.id} className="list-row">
                  <span className="list-row-meta"><bdi className="font-mono">{s.startTime}–{s.endTime}</bdi></span>
                  <div className="list-row-body">
                    <div className="list-row-title">{WEEKDAY_NAMES_AR[s.dayOfWeek] ?? '—'}</div>
                    <div className="list-row-sub">{s.room ?? 'قاعة تُحدَّد لاحقاً'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        </section>
      </div>

      <section aria-label="واجبات المقرر">
      <SectionHeader title="الواجبات" />
      <div className="pf-rowlist">
        {!data.assignments.length ? (
          <EmptyState illustration="empty-list"
            icon={ClipboardList}
            title="لا توجد واجبات نشطة"
            description="حالياً لا شيء بانتظارك في هذا المقرر. وقت جيد لمراجعة المحاضرات السابقة."
          />
        ) : (
          <div className="table-wrap">
            <table className="table tbl-stack">
              <thead>
                <tr><th scope="col">العنوان</th><th scope="col">النوع</th><th scope="col">الموعد النهائي</th><th scope="col">الوزن</th></tr>
              </thead>
              <tbody>
                {data.assignments.map((a) => (
                  <tr key={a.id}>
                    <td className="tbl-strong" data-label="العنوان">{a.title}</td>
                    <td data-label="النوع">{ASSIGNMENT_KIND_LABEL[a.type as AssignmentKind] ?? a.type}</td>
                    <td className="tbl-num" data-label="الموعد النهائي">{formatDateAr(a.dueAt)}</td>
                    <td className="tbl-num" data-label="الوزن">{a.weight}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      </section>
    </PageFrame>
  );
}
