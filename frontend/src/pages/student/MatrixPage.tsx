import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass, Play, AlertCircle, Sparkles, ArrowLeft,
} from 'lucide-react';
import { Badge } from '../../components/primitives';
import { ErrorState, EmptyState, Skeleton } from '../../components/primitives/States';
import {
  PageFrame, PageHeader, SectionHeader, RowList, RowItem, FilterBar,
} from '../../components/patterns';
import { Icon } from '../../components/Icon';
import { useMatrix, useGaps } from '../../hooks/useResources';
import { courseIcon, courseTint } from '../../lib/courseMeta';
import { countAr } from '../../lib/format';
import { formatInt } from '../../utils/numbers';
/* ── r305-c (schedule family) imports — the only region agent 2-c edits above the components ── */
import '../../styles/r305-student.css';
import '../../styles/r305-student-schedule.css';

/* courseIcon + DEFAULT_COURSE_TINT (via courseTint) live in
 * lib/courseMeta.ts (wave 9-a). */

/* r299 (final C): the matrix joins the patterns contract — PageFrame/
 * PageHeader open the page, the level filter rides FilterBar + the
 * shared .pill grammar (the training.css filter-pill import is
 * retired), and the priority-gaps Card becomes a SectionHeader +
 * RowList — the same row anatomy the dashboard's gaps ledger carries.
 * The heatmap itself (r220 legible grid, mobile recomposition, the
 * r164d سدّ الفجوة link contract) is untouched. */

/* r220 (4A redesign — Superlist direction): the matrix stays the
 * per-course dense concept grid, but every status is now legible
 * WITHOUT colour (status word rides every cell as text), the grid is
 * keyboard-legible (non-link cells are focusable list items with the
 * shared focus ring), and ≤640px the same data recomposes into a
 * concept list — one row per concept, status + % inline (the CSS-only
 * recomposition lives in student.css §matrix). The gap-row contract
 * (سدّ الفجوة / لا توصية) and the weak/poor-cells-link rule are the
 * r164d contract, untouched (pinned by MatrixPage-links.test). */

type MasteryClass = 'lvl-untouched' | 'lvl-strong' | 'lvl-good' | 'lvl-weak' | 'lvl-poor';

function levelClass(level: number, attempts: number): MasteryClass {
  if (attempts === 0) return 'lvl-untouched';
  if (level >= 0.8) return 'lvl-strong';
  if (level >= 0.6) return 'lvl-good';
  if (level >= 0.4) return 'lvl-weak';
  return 'lvl-poor';
}

function levelLabel(level: number, attempts: number) {
  if (attempts === 0) return 'لم يُختبر';
  if (level >= 0.8) return 'إتقان';
  if (level >= 0.6) return 'جيد';
  if (level >= 0.4) return 'يحتاج مراجعة';
  return 'ضعف';
}

/** Mastery-level filter over the whole heatmap. */
type LevelFilter = 'all' | MasteryClass;
const FILTER_LABEL: Record<Exclude<LevelFilter, 'all'>, string> = {
  'lvl-strong': 'إتقان',
  'lvl-good': 'جيد',
  'lvl-weak': 'يحتاج مراجعة',
  'lvl-poor': 'ضعف',
  'lvl-untouched': 'لم يُختبر',
};

/* r305-c (Heron): the cell's status renders as the shared chip register
 * — tone on the DOT, the status word stays the body text (never hue
 * alone; the r220 contract). Pure presentation map over MasteryClass. */
const LEVEL_CHIP_TONE: Record<MasteryClass, string> = {
  'lvl-strong': 'r305s-chip--success',
  'lvl-good': 'r305s-chip--accent',
  'lvl-weak': 'r305s-chip--warning',
  'lvl-poor': 'r305s-chip--danger',
  'lvl-untouched': '',
};

/** Arabic plural rules for concept counts (1 / dual / 3–10 / 11+). */
function conceptCount(n: number): string {
  if (n === 1) return 'مفهوم واحد';
  if (n === 2) return 'مفهومان';
  if (n >= 3 && n <= 10) return `${n} مفاهيم`;
  return `${n} مفهوماً`;
}

/** Shape-matched skeleton for one course block of the heatmap. */
function MatrixCourseSkeleton() {
  return (
    <div className="matrix-course" aria-hidden>
      <div className="matrix-course-head">
        <Skeleton width={36} height={36} rounded="var(--r-md)" />
        <div className="flex-col gap-2" style={{ flex: 1 }}>
          <Skeleton width="55%" height={14} />
          <Skeleton width="35%" height={10} />
        </div>
      </div>
      <div className="matrix-cells">
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} height={46} />
        ))}
      </div>
    </div>
  );
}

export default function MatrixPage() {
  const matrix = useMatrix();
  const gaps = useGaps();
  const [filter, setFilter] = useState<LevelFilter>('all');

  /* r164d (course flow): concept → recommended lecture, built from the
   * SAME gaps payload the gap rows read — the heatmap's weak/poor
   * cells (the actual mastery gaps) become direct links to the lecture
   * that teaches the concept, instead of dead tiles the student could
   * see but never act on. Concepts without a recommendation (untested,
   * or unmapped to a chapter) stay honest non-links. */
  const gapLectureByConcept = new Map<string, { lectureId: string; lectureTitle: string | null }>();
  for (const g of gaps.data ?? []) {
    if (g.recommendedLectureId) {
      gapLectureByConcept.set(g.conceptId, {
        lectureId: g.recommendedLectureId,
        lectureTitle: g.recommendedLectureTitle,
      });
    }
  }

  // Real per-level counts across every course (drives the filter pills).
  const levelCounts: Record<MasteryClass, number> = {
    'lvl-strong': 0, 'lvl-good': 0, 'lvl-weak': 0, 'lvl-poor': 0, 'lvl-untouched': 0,
  };
  let totalConcepts = 0;
  for (const c of matrix.data ?? []) {
    for (const k of c.concepts) levelCounts[levelClass(k.level, k.attempts)]++;
    totalConcepts += c.concepts.length;
  }

  /* 22-c (A4 P3-7): partition mapped/un-mapped courses — un-mapped
     ones collapse into one summary line instead of five identical
     empty cards burying the one real heatmap. */
  const mappedCourses = (matrix.data ?? []).filter((c) => c.concepts.length > 0);
  const unmappedCount = (matrix.data ?? []).length - mappedCourses.length;

  /* r304 — course anchor density: with MORE than one mapped course,
     the heatmap is a tall scroll and the filter bar's trailing slot
     carries one quiet chip per course that jumps to its block (real
     navigation, no new data — the blocks carry matrix-course-<id>
     DOM ids). Reduced-motion aware: the same idiom the exam map and
     the lecture-player contents anchor use. One course = no chips. */
  const jumpToCourse = (courseId: string) => {
    const el = document.getElementById(`matrix-course-${courseId}`);
    if (!el) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <PageFrame width="default">
      <PageHeader
        title="المصفوفة التعليمية"
        description={
          'خريطة معرفيّة شخصيّة لكل مفهوم درسته. كل خلية تعكس درجة إتقانك، ' +
          'بناءً على نقاط التفاعل في المحاضرات والاختبارات.'
        }
        meta={matrix.data && totalConcepts > 0
          ? <>{countAr(totalConcepts, ['مفهوم واحد مُقاس', 'مفهومان مُقاسان', 'مفاهيم مُقاسة', 'مفهوماً مُقاساً'])} عبر {countAr(mappedCourses.length, ['مقرّر واحد', 'مقرّرين', 'مقرّرات', 'مقرّراً'])}</>
          : undefined}
        actions={<Badge color="brand" icon={Sparkles}>تتبّع المعرفة</Badge>}
      />

      {/* Status key — the words ARE the encoding; the dots only anchor
          the eye. Ranges stated in text so the key never leans on hue. */}
      <div className="matrix-legend" role="group" aria-label="دليل حالات الإتقان">
        <div className="matrix-legend-item"><span className="matrix-legend-dot" style={{ background: 'var(--success)' }} /> إتقان (80%+)</div>
        <div className="matrix-legend-item"><span className="matrix-legend-dot" style={{ background: 'var(--accent)' }} /> جيد (60–80%)</div>
        <div className="matrix-legend-item"><span className="matrix-legend-dot" style={{ background: 'var(--warning)' }} /> يحتاج مراجعة (40–60%)</div>
        <div className="matrix-legend-item"><span className="matrix-legend-dot" style={{ background: 'var(--danger)' }} /> ضعف (&lt;40%)</div>
        <div className="matrix-legend-item"><span className="matrix-legend-dot" style={{ background: 'var(--text-subtle)' }} /> لم يُختبر</div>
      </div>

      {/* Top gaps with one-click fill — r299: the same SectionHeader +
          RowList anatomy the dashboard's gaps ledger carries. The سدّ
          الفجوة contract is the r164d pin: where a recommendation
          exists the WHOLE row is the link (RowItem to) and the chip
          rides the trailing slot; no recommendation stays an honest
          non-link row. */}
      <section aria-label="فجوات الإتقان ذات الأولوية">
        <SectionHeader
          title="فجواتك ذات الأولوية"
          description="ابدأ بسدّ هذه الفجوات — حيث تتوفّر توصية، يأخذك الصفّ مباشرة إلى المحاضرة المناسبة"
        />
        {gaps.isPending ? (
          <RowList aria-label="قائمة الفجوات ذات الأولوية" loading />
        ) : gaps.isError ? (
          <ErrorState
            message="تعذَّر تحميل فجواتك"
            error={gaps.error}
            onRetry={() => gaps.refetch()}
          />
        ) : !gaps.data?.length ? (
          <EmptyState icon={Sparkles} title="لا فجوات حالياً — أحسنت!" description="استمر بحضور المحاضرات والإجابة على نقاط التفاعل." />
        ) : (
          <RowList aria-label="قائمة الفجوات ذات الأولوية">
            {gaps.data.slice(0, 5).map((g) => (
              <RowItem
                key={g.conceptId}
                leading={<Icon icon={AlertCircle} size={16} style={{ color: 'var(--warning-ink)' }} />}
                title={g.conceptName}
                meta={<>{g.courseName} · <bdi className="font-mono">{formatInt(Math.round(g.level * 100))}%</bdi> الآن</>}
                to={g.recommendedLectureId ? `/student/lectures/${g.recommendedLectureId}` : undefined}
                trailing={g.recommendedLectureId
                  ? <span className="btn outline sm pf-chip"><Icon icon={Play} size={13} />سدّ الفجوة</span>
                  : <Badge>لا توصية</Badge>}
              />
            ))}
          </RowList>
        )}
      </section>

      {/* The full matrix per course */}
      {matrix.isPending ? (
        <div className="flex-col gap-4" aria-busy="true" aria-live="polite">
          <MatrixCourseSkeleton />
          <MatrixCourseSkeleton />
        </div>
      ) : matrix.isError ? (
        <ErrorState
          message="تعذَّر تحميل المصفوفة التعليميّة"
          error={matrix.error}
          onRetry={() => matrix.refetch()}
        />
      ) : !matrix.data?.length ? (
        <EmptyState illustration="empty-list"
          icon={Compass}
          title="لم تتشكّل مصفوفتك بعد"
          description="شاهد أول محاضرة وأجب عن نقاط التفاعل فيها، وستبدأ المصفوفة برسم خريطة معرفتك تلقائياً."
        />
      ) : (
        <div className="flex-col gap-4">
          {/* Level filter — dimming non-matching cells animates the
              heatmap's shade transitions (the page's signature moment).
              r299: the FilterBar + shared .pill grammar (the CoursesPage
              toolbar contract) replaces the training.css filter-pill
              family — one filter voice across the student family. */}
          <FilterBar
            filters={
              <div className="matrix-filter" role="group" aria-label="تصفية المفاهيم بحسب درجة الإتقان">
                <button
                  type="button"
                  className={`pill${filter === 'all' ? ' on' : ''}`}
                  aria-pressed={filter === 'all'}
                  onClick={() => setFilter('all')}
                >
                  الكل
                  <span className="matrix-filter-count" aria-hidden>{formatInt(totalConcepts)}</span>
                </button>
                {(Object.keys(FILTER_LABEL) as Array<Exclude<LevelFilter, 'all'>>).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`pill${filter === key ? ' on' : ''}`}
                    aria-pressed={filter === key}
                    onClick={() => setFilter(key)}
                    disabled={levelCounts[key] === 0}
                  >
                    {FILTER_LABEL[key]}
                    <span className="matrix-filter-count" aria-hidden>{formatInt(levelCounts[key])}</span>
                  </button>
                ))}
              </div>
            }
            trailing={mappedCourses.length > 1 ? (
              /* r304 — course anchor chips: one quiet ghost chip per
                  mapped course, jumping to its heatmap block below
                  (the same quiet-anchor recipe the lecture player's
                  contents chip uses). One course = nothing renders. */
              <div
                role="group"
                aria-label="الانتقال السريع بين مقرّرات المصفوفة"
                style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--sp-2)' }}
              >
                {mappedCourses.map((c) => (
                  <button
                    key={c.courseId}
                    type="button"
                    className="btn ghost sm"
                    onClick={() => jumpToCourse(c.courseId)}
                  >
                    <bdi>{c.courseName}</bdi>
                  </button>
                ))}
              </div>
            ) : undefined}
          />

          {/* 22-c (A4 P3-7): the seed maps concepts on ONE course — the
              other five each rendered the same «لم تُحدَّد مفاهيم هذا
              المقرّر بعد» empty card, burying the one real heatmap under
              an empty-state directory. Un-mapped courses collapse into a
              single summary line; mapped ones render in full. */}
          {mappedCourses.map((c) => {
            const Cmp = courseIcon(c.courseCode);
            const tint = courseTint(c.themeColor);
            const totalConceptsInCourse = c.concepts.length;
            const masteredConcepts = c.concepts.filter((x) => x.level >= 0.8).length;
            const avgPct = totalConceptsInCourse
              ? Math.round((c.concepts.reduce((s, x) => s + x.level, 0) / totalConceptsInCourse) * 100)
              : 0;
            return (
              <div className="matrix-course" key={c.courseId} id={`matrix-course-${c.courseId}`}>
                <div className="matrix-course-head">
                  <div
                    className="matrix-course-icon"
                    style={{
                      // color-mix keeps API tints theme-adaptive (the old
                      // `${tint}15` alpha-hex concat broke on 8-digit input).
                      background: `color-mix(in srgb, ${tint} 14%, var(--surface))`,
                      // badge-tile pattern: hue pulled toward ink for a
                      // theme-adaptive ≥3:1 icon contrast.
                      color: `color-mix(in srgb, ${tint} 60%, var(--text))`,
                    }}
                  >
                    <Icon icon={Cmp} size={18} />
                  </div>
                  <div className="flex-1" style={{ minWidth: 0 }}>
                    <div className="text-md font-semibold" style={{ color: 'var(--text)' }}>{c.courseName}</div>
                    <div className="text-xs text-subtle">
                      {conceptCount(totalConceptsInCourse)} ·{' '}
                      {masteredConcepts > 0 ? `أتقنت ${masteredConcepts}` : 'لم تتقن منها بعد'} · متوسط {formatInt(avgPct)}%
                    </div>
                  </div>
                  <Link to={`/student/courses/${c.offeringId}`} className="btn ghost sm">
                    افتح المقرّر
                    <Icon icon={ArrowLeft} size={13} />
                  </Link>
                </div>

                {/* The concept grid — a keyboard-legible list: every cell
                    is focusable with a full aria-label (name + status +
                    %), so the heatmap reads linearly without a pointer.
                    Gap cells stay real links (r164d contract). */}
                <div className="matrix-cells" aria-label={`مفاهيم مقرر ${c.courseName}`}>
                  {c.concepts.map((k) => {
                    const cls = levelClass(k.level, k.attempts);
                    const dimmed = filter !== 'all' && cls !== filter;
                    const pctText = k.attempts > 0 ? `${formatInt(Math.round(k.level * 100))}%` : '—';
                    const statusText = levelLabel(k.level, k.attempts);
                    const cellAria = `${k.name} — ${statusText}${k.attempts > 0 ? ` (${pctText})` : ''}`;
                    const titleBase = `${k.name} — ${statusText}${k.attempts > 0 ? ` (${pctText})` : ''}`;
                    const body = (
                      <>
                        <div className="matrix-name">{k.name}</div>
                        <div className="matrix-meta">
                          <span className={`r305s-chip matrix-status-chip${LEVEL_CHIP_TONE[cls] ? ` ${LEVEL_CHIP_TONE[cls]}` : ''}`}>
                            <i className="r305s-chip-dot" aria-hidden />
                            {statusText}
                          </span>
                          <span className="matrix-meta-pct">{pctText}</span>
                        </div>
                      </>
                    );
                    /* r164d: only the GAP levels link (weak/poor — the
                     * same «سدّ الفجوة» contract the rows above carry);
                     * strong/good/untouched tiles stay informational. */
                    const remediation = cls === 'lvl-weak' || cls === 'lvl-poor'
                      ? gapLectureByConcept.get(k.id)
                      : undefined;
                    if (remediation) {
                      /* r164d + r304: the cell link's aria-name is the
                       * ACTION, not just the state — «سدّ فجوة» + the
                       * concept + the honest destination (the lecture
                       * title when the payload names one). The concept
                       * name stays in the name so the row link and the
                       * cell link keep agreeing (MatrixPage-links pin). */
                      return (
                        <Link
                          to={`/student/lectures/${remediation.lectureId}`}
                          className={`matrix-cell ${cls}${dimmed ? ' is-dim' : ''}`}
                          style={{ cursor: 'pointer' }}
                          title={`${titleBase} — راجع في: ${remediation.lectureTitle ?? 'المحاضرة الموصى بها'}`}
                          aria-label={`سدّ فجوة: ${k.name} — انتقل إلى المحاضرة${remediation.lectureTitle ? ` «${remediation.lectureTitle}»` : ''}`}
                          key={k.id}
                        >
                          {body}
                        </Link>
                      );
                    }
                    return (
                      <div
                        className={`matrix-cell ${cls}${dimmed ? ' is-dim' : ''}`}
                        key={k.id}
                        title={titleBase}
                        aria-label={cellAria}
                        tabIndex={0}
                      >
                        {body}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {unmappedCount > 0 && (
            <p className="matrix-unmapped-note">
              {countAr(unmappedCount, ['مقرّر واحد آخر في قائمتك', 'مقرّران آخران في قائمتك', 'مقرّرات أخرى في قائمتك', 'مقرّراً آخر في قائمتك'])}
              {' '}بلا مفاهيم محدَّدة بعد — تظهر خرائطها هنا فور إضافتها من الأستاذ.
            </p>
          )}
        </div>
      )}
    </PageFrame>
  );
}
