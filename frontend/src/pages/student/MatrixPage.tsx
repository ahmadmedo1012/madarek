import React from 'react';
import { Link } from 'react-router-dom';
import {
  Compass, Play, AlertCircle, Sparkles, ArrowLeft, BookOpen,
  Cog, Cpu, Database, Network, Globe, Shield, type LucideIcon,
} from 'lucide-react';
import { Card, Badge } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
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

function levelClass(level: number, attempts: number) {
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

export default function MatrixPage() {
  const matrix = useMatrix();
  const gaps = useGaps();

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المصفوفة التعليمية</h1>
          <p className="page-subtitle">
            خريطة معرفية شخصية لكل مفهوم درسته. كل خلية تعكس درجة إتقانك،
            بناءً على نقاط التفاعل في المحاضرات والاختبارات.
          </p>
        </div>
        <Badge color="brand" icon={Sparkles}>تتبّع المعرفة</Badge>
      </div>

      {/* Legend */}
      <div className="matrix-legend">
        <div className="matrix-legend-item"><span className="matrix-legend-dot" style={{ background: 'var(--success)' }} /> إتقان (80%+)</div>
        <div className="matrix-legend-item"><span className="matrix-legend-dot" style={{ background: 'var(--accent)' }} /> جيد (60–80%)</div>
        <div className="matrix-legend-item"><span className="matrix-legend-dot" style={{ background: 'var(--warning)' }} /> يحتاج مراجعة (40–60%)</div>
        <div className="matrix-legend-item"><span className="matrix-legend-dot" style={{ background: 'var(--danger)' }} /> ضعف (&lt;40%)</div>
        <div className="matrix-legend-item"><span className="matrix-legend-dot" style={{ background: 'var(--text-subtle)' }} /> لم يُختبر</div>
      </div>

      {/* Top gaps with one-click fill */}
      <Card title="فجواتك الأولوية" icon={AlertCircle} subtitle="ابدأ بسدّ هذه الفجوات أولاً — كل فجوة مرتبطة بالمحاضرة المناسبة">
        {gaps.isPending ? (
          <LoadingState />
        ) : gaps.isError ? (
          <ErrorState />
        ) : !gaps.data?.length ? (
          <EmptyState icon={Sparkles} title="لا فجوات حالياً — أحسنت!" description="استمر بحضور المحاضرات والإجابة على نقاط التفاعل." />
        ) : (
          <div className="flex-col gap-2">
            {gaps.data.slice(0, 5).map((g) => (
              <div className="list-row matrix-gap-card" key={g.conceptId}>
                <span className="matrix-gap-alert-icon"><Icon icon={AlertCircle} size={16} /></span>
                <div className="list-row-body matrix-gap-body">
                  <div className="list-row-title matrix-gap-title">{g.conceptName}</div>
                  <div className="list-row-sub matrix-gap-sub">{g.courseName}</div>
                </div>
                <span className="font-mono text-xs matrix-gap-pct">
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
        <Card><LoadingState /></Card>
      ) : matrix.isError ? (
        <Card><ErrorState /></Card>
      ) : !matrix.data?.length ? (
        <Card><EmptyState
          icon={Compass}
          title="مصفوفتك تبدأ بالتشكّل قريباً"
          description="بعد مشاهدتك لأول محاضرة وحلّك لأول نقطة تفاعل، تبدأ المصفوفة برسم خريطة معرفتك بشكل تلقائي."
        /></Card>
      ) : (
        <div className="flex-col gap-4">
          {matrix.data.map((c) => {
            const Cmp = courseIcon(c.courseCode);
            const tint = c.themeColor ?? '#3D6BD6';
            const totalConcepts = c.concepts.length;
            const masteredConcepts = c.concepts.filter((x) => x.level >= 0.8).length;
            const avgPct = totalConcepts ? Math.round((c.concepts.reduce((s, x) => s + x.level, 0) / totalConcepts) * 100) : 0;
            return (
              <div className="matrix-course" key={c.courseId} style={{ '--course-tint': `${tint}10` } as React.CSSProperties}>
                <div className="matrix-course-head">
                  <div className="matrix-course-icon" style={{ background: `${tint}15`, color: tint }}>
                    <Icon icon={Cmp} size={18} />
                  </div>
                  <div className="flex-1" style={{ minWidth: 0 }}>
                    <div className="text-md font-semibold" style={{ color: 'var(--text)' }}>{c.courseName}</div>
                    <div className="text-xs text-subtle">
                      {totalConcepts} مفهوم · أتقنت {masteredConcepts} · متوسط {avgPct}%
                    </div>
                  </div>
                  <div className="matrix-mini-ring" style={{ '--ring-pct': avgPct, '--ring-color': tint } as React.CSSProperties}>
                    <span className="matrix-mini-ring-value">{avgPct}%</span>
                  </div>
                  <Link to={`/student/courses/${c.offeringId}`} className="btn ghost sm">
                    افتح المادة
                    <Icon icon={ArrowLeft} size={13} />
                  </Link>
                </div>

                {!c.concepts.length ? (
                  <EmptyState icon={Compass} title="لم تُحدَّد مفاهيم لهذه المادة بعد" />
                ) : (
                  <div className="matrix-grid">
                    {c.concepts.map((k) => {
                      const cls = levelClass(k.level, k.attempts);
                      const dataLevel = cls.replace('lvl-', '');
                      const cellLevel = k.attempts > 0 ? Math.round(k.level * 100) : 0;
                      return (
                        <div
                          className={`matrix-cell ${cls}`}
                          key={k.id}
                          data-level={dataLevel}
                          style={{ '--cell-level': cellLevel } as React.CSSProperties}
                        >
                          <div className="matrix-name">{k.name}</div>
                          <div className="matrix-meta">
                            <span>{levelLabel(k.level, k.attempts)}</span>
                            <span className="matrix-meta-pct">
                              {k.attempts > 0 ? `${Math.round(k.level * 100)}%` : '\u2014'}
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
