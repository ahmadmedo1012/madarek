import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  Compass, Play, AlertCircle, Sparkles, ArrowLeft, BookOpen,
  Cog, Cpu, Database, Network, Globe, Shield, type LucideIcon,
} from 'lucide-react';
import { Card, Badge } from '../../components/primitives';
import { ErrorState, EmptyState, Skeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useMatrix, useGaps } from '../../hooks/useResources';

const courseIcon = (codeOrName: string): LucideIcon => {
  const s = codeOrName.toLowerCase();
  if (s.includes('se') || s.includes('برمج')) return Cog;
  if (s.includes('ct') || s.includes('تقنيات الحاسوب')) return Cpu;
  if (s.includes('is') || s.includes('نظم')) return Database;
  if (s.includes('net') || s.includes('شبك')) return Network;
  if (s.includes('web') || s.includes('إنترنت')) return Globe;
  if (s.includes('sec') || s.includes('أمن')) return Shield;
  return BookOpen;
};

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

/** Arabic plural rules for concept counts (1 / dual / 3–10 / 11+). */
function conceptCount(n: number): string {
  if (n === 1) return 'مفهوم واحد';
  if (n === 2) return 'مفهومان';
  if (n >= 3 && n <= 10) return `${n} مفاهيم`;
  return `${n} مفهوماً`;
}

/** Shape-matched skeleton for one course card of the heatmap. */
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

/** Shape-matched skeleton for the gap recommendation rows. */
function GapListSkeleton() {
  return (
    <div className="flex-col gap-2" aria-hidden>
      {Array.from({ length: 4 }).map((_, i) => (
        <div className="list-row" key={i}>
          <Skeleton width={16} height={16} />
          <div className="list-row-body">
            <Skeleton width="45%" height={12} />
            <Skeleton width="30%" height={10} />
          </div>
          <Skeleton width={38} height={12} />
          <Skeleton width={96} height={32} rounded="var(--r-sm)" />
        </div>
      ))}
    </div>
  );
}

export default function MatrixPage() {
  const matrix = useMatrix();
  const gaps = useGaps();
  const [filter, setFilter] = useState<LevelFilter>('all');

  // Real per-level counts across every course (drives the filter pills).
  const levelCounts: Record<MasteryClass, number> = {
    'lvl-strong': 0, 'lvl-good': 0, 'lvl-weak': 0, 'lvl-poor': 0, 'lvl-untouched': 0,
  };
  let totalConcepts = 0;
  for (const c of matrix.data ?? []) {
    for (const k of c.concepts) levelCounts[levelClass(k.level, k.attempts)]++;
    totalConcepts += c.concepts.length;
  }

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المصفوفة التعليمية</h1>
          <p className="page-subtitle">
            خريطة معرفيّة شخصيّة لكل مفهوم درسته. كل خلية تعكس درجة إتقانك،
            بناءً على نقاط التفاعل في المحاضرات والاختبارات.
          </p>
        </div>
        <Badge color="brand" icon={Sparkles}>تتبّع المعرفة</Badge>
      </header>

      {/* Legend */}
      <div className="matrix-legend">
        <div className="matrix-legend-item"><span className="matrix-legend-dot" style={{ background: 'var(--success)' }} /> إتقان (80%+)</div>
        <div className="matrix-legend-item"><span className="matrix-legend-dot" style={{ background: 'var(--accent)' }} /> جيد (60–80%)</div>
        <div className="matrix-legend-item"><span className="matrix-legend-dot" style={{ background: 'var(--warning)' }} /> يحتاج مراجعة (40–60%)</div>
        <div className="matrix-legend-item"><span className="matrix-legend-dot" style={{ background: 'var(--danger)' }} /> ضعف (&lt;40%)</div>
        <div className="matrix-legend-item"><span className="matrix-legend-dot" style={{ background: 'var(--text-subtle)' }} /> لم يُختبر</div>
      </div>

      {/* Top gaps with one-click fill */}
      <Card
        title="فجواتك ذات الأولوية"
        icon={AlertCircle}
        subtitle="ابدأ بسدّ هذه الفجوات — حيث تتوفّر توصية، يأخذك الزرّ مباشرة إلى المحاضرة المناسبة"
      >
        {gaps.isPending ? (
          <GapListSkeleton />
        ) : gaps.isError ? (
          <ErrorState
            message="تعذَّر تحميل فجواتك"
            error={gaps.error}
            onRetry={() => gaps.refetch()}
          />
        ) : !gaps.data?.length ? (
          <EmptyState icon={Sparkles} title="لا فجوات حالياً — أحسنت!" description="استمر بحضور المحاضرات والإجابة على نقاط التفاعل." />
        ) : (
          <div className="flex-col gap-2 matrix-gap-list">
            {gaps.data.slice(0, 5).map((g, i) => (
              <div
                className="list-row"
                key={g.conceptId}
                style={{ '--gap-i': i } as CSSProperties}
              >
                <span style={{ color: 'var(--warning)' }}><Icon icon={AlertCircle} size={16} /></span>
                <div className="list-row-body">
                  <div className="list-row-title">{g.conceptName}</div>
                  <div className="list-row-sub">{g.courseName}</div>
                </div>
                <span className="font-mono text-xs" style={{ color: 'var(--warning)' }}>
                  {Math.round(g.level * 100)}%
                </span>
                {g.recommendedLectureId ? (
                  <Link to={`/student/lectures/${g.recommendedLectureId}`} className="btn outline sm">
                    <Icon icon={Play} size={13} />
                    سدّ الفجوة
                  </Link>
                ) : (
                  <Badge>لا توصية</Badge>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* The full matrix per course */}
      {matrix.isPending ? (
        <div className="flex-col gap-4" aria-busy="true" aria-live="polite">
          <MatrixCourseSkeleton />
          <MatrixCourseSkeleton />
        </div>
      ) : matrix.isError ? (
        <Card>
          <ErrorState
            message="تعذَّر تحميل المصفوفة التعليميّة"
            error={matrix.error}
            onRetry={() => matrix.refetch()}
          />
        </Card>
      ) : !matrix.data?.length ? (
        <Card><EmptyState
          icon={Compass}
          title="لم تتشكّل مصفوفتك بعد"
          description="شاهد أول محاضرة وأجب عن نقاط التفاعل فيها، وستبدأ المصفوفة برسم خريطة معرفتك تلقائياً."
        /></Card>
      ) : (
        <div className="flex-col gap-4">
          {/* Level filter — dimming non-matching cells animates the
              heatmap's shade transitions (the page's signature moment).
              Same flush-card pill toolbar as the training catalog. */}
          <Card flush>
            <div
              className="filter-pill-row"
              role="group"
              aria-label="تصفية المفاهيم بحسب درجة الإتقان"
            >
              <button
                type="button"
                className="filter-pill"
                aria-pressed={filter === 'all'}
                onClick={() => setFilter('all')}
              >
                الكل
                <span className="filter-pill-count">{totalConcepts}</span>
              </button>
              {(Object.keys(FILTER_LABEL) as Array<Exclude<LevelFilter, 'all'>>).map((key) => (
                <button
                  key={key}
                  type="button"
                  className="filter-pill"
                  aria-pressed={filter === key}
                  onClick={() => setFilter(key)}
                  disabled={levelCounts[key] === 0}
                >
                  {FILTER_LABEL[key]}
                  <span className="filter-pill-count">{levelCounts[key]}</span>
                </button>
              ))}
            </div>
          </Card>

          {matrix.data.map((c) => {
            const Cmp = courseIcon(c.courseCode);
            // NOTE: shared default course tint — the single-constant
            // extraction (lib/courseMeta.ts) belongs to the courses wave.
            const tint = c.themeColor ?? '#3D6BD6';
            const totalConceptsInCourse = c.concepts.length;
            const masteredConcepts = c.concepts.filter((x) => x.level >= 0.8).length;
            const avgPct = totalConceptsInCourse
              ? Math.round((c.concepts.reduce((s, x) => s + x.level, 0) / totalConceptsInCourse) * 100)
              : 0;
            return (
              <div className="matrix-course" key={c.courseId}>
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
                      {masteredConcepts > 0 ? `أتقنت ${masteredConcepts}` : 'لم تتقن منها بعد'} · متوسط {avgPct}%
                    </div>
                  </div>
                  <Link to={`/student/courses/${c.offeringId}`} className="btn ghost sm">
                    افتح المقرّر
                    <Icon icon={ArrowLeft} size={13} />
                  </Link>
                </div>

                {!c.concepts.length ? (
                  <EmptyState
                    icon={Compass}
                    title="لم تُحدَّد مفاهيم هذه المادة بعد"
                    description="ستظهر خريطة المفاهيم فور إضافتها من الأستاذ."
                  />
                ) : (
                  <div className="matrix-cells">
                    {c.concepts.map((k) => {
                      const cls = levelClass(k.level, k.attempts);
                      const dimmed = filter !== 'all' && cls !== filter;
                      return (
                        <div
                          className={`matrix-cell ${cls}${dimmed ? ' is-dim' : ''}`}
                          key={k.id}
                          title={`${k.name} — ${levelLabel(k.level, k.attempts)}${k.attempts > 0 ? ` (${Math.round(k.level * 100)}%)` : ''}`}
                        >
                          <div className="matrix-name">{k.name}</div>
                          <div className="matrix-meta">
                            <span>{levelLabel(k.level, k.attempts)}</span>
                            <span className="matrix-meta-pct">
                              {k.attempts > 0 ? `${Math.round(k.level * 100)}%` : '—'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
