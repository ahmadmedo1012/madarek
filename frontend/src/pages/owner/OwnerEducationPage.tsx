import { useMemo } from 'react';
import type { CSSProperties } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { Card, ProgressBar } from '../../components/primitives';
import { StatStrip } from '../../components/primitives/Ledger';
/* R304: the education overview opens with the patterns PageHeader —
 * breadcrumbs back to the owner dashboard. */
import { PageHeader as PatternsPageHeader } from '../../components/patterns';
import {
  ErrorState, EmptyState, ChartSkeleton, TableSkeleton, ListSkeleton,
} from '../../components/primitives/States';
import { ChartFrame } from '../../components/charts/ChartFrame';
import { cartesianOptions, chartColors, valueLabels, useChartThemeKey } from '../../lib/chartTheme';
import { useOwnerEducation } from '../../hooks/useOwner';
import { useReducedMotion } from '../../components/motion';
import { formatNum } from '../../utils/numbers';
/* r299: the strip's shape-matched skeleton — the owner family's shared
 * helper (this page's local EduStripSkeleton twin died with it). */
import { StatStripSkeleton } from '../../components/owner/StripSkeletons';

ChartJS.register(CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, Tooltip, Legend);

/** Proper Arabic counted plural for teacher counts (bucket labels). */
function teachersCountLabel(n: number): string {
  if (n === 0) return 'لا أساتذة';
  if (n === 1) return 'أستاذ واحد';
  if (n === 2) return 'أستاذان';
  if (n >= 3 && n <= 10) return `${formatNum(n)} أساتذة`;
  return `${formatNum(n)} أستاذاً`;
}

/** Proper Arabic counted plural for the faculty count (chart summary). */
function facultiesCountLabel(n: number): string {
  if (n === 1) return 'كلية واحدة';
  if (n === 2) return 'كليتان';
  if (n >= 3 && n <= 10) return `${formatNum(n)} كليات`;
  return `${formatNum(n)} كلية`;
}

/** The StatStrip's shape-matched pending placeholder (R190 D4 — the
 *  resolved band is the strip, so the strip's cells are what the
 *  skeleton must occupy) — r299: consumed from the owner family's
 *  shared StripSkeletons helper (the local twin died). */

export function OwnerEducationPage() {
  const q = useOwnerEducation();
  // Remounts each chart canvas when the light/dark theme flips.
  const themeKey = useChartThemeKey();
  // Baking the reduced-motion animation profile into memoized options
  // requires re-building them when the OS flag flips mid-session too.
  const reducedMotion = useReducedMotion();
  const edu = q.data;

  // Chart data/options are memoized (audit 11-f P2-2): react-chartjs-2
  // re-applies any identity-changed prop with an animated chart.update(),
  // so every unrelated re-render used to churn both charts. chartColors()
  // resolves CSS custom properties at call time — it is resolved once per
  // theme flip and captured by the data memos, while the option factories
  // re-resolve inside their own memos keyed on the same themeKey.
  const c = useMemo(() => chartColors(), [themeKey]);

  const barData = useMemo(() => ({
    labels: (edu?.byFaculty ?? []).map((f) => f.name),
    datasets: [{
      label: 'عدد المقررات',
      data: (edu?.byFaculty ?? []).map((f) => f.courseCount),
      backgroundColor: `color-mix(in srgb, ${c.accent} 60%, transparent)`,
      borderColor: c.accent,
      borderWidth: 1,
      borderRadius: 4,
    }],
  }), [edu, c]);

  const barOptions = useMemo(
    () => ({ ...cartesianOptions({ horizontal: true }), indexAxis: 'y' as const }),
    [themeKey, reducedMotion],
  );

  /* 22-b (4-A7 P3-2): bar-end value labels via the shared theme's
   * valueLabels plugin (the admin pages' convention) — the reader no
   * longer has to trace the axis for a count. Every bar carries a
   * non-zero count since 22-b's API fold drops zero-course faculties
   * (4-A7 P1-3), so no empty bar gets a meaningless "0". */
  const barPlugins = useMemo(() => [valueLabels], []);

  const lineData = useMemo(() => ({
    labels: (edu?.attendanceTrend ?? []).map((t) => t.month),
    datasets: [{
      label: 'نسبة الحضور %',
      data: (edu?.attendanceTrend ?? []).map((t) => t.attendancePct ?? null),
      borderColor: c.success,
      backgroundColor: `color-mix(in srgb, ${c.success} 12%, transparent)`,
      fill: true,
      tension: 0.4,
      pointRadius: 4,
      pointBackgroundColor: c.success,
      spanGaps: true,
    }],
  }), [edu, c]);

  const lineOptions = useMemo(() => {
    const base = cartesianOptions();
    return {
      ...base,
      scales: {
        ...base.scales,
        y: { ...base.scales!.y, min: 0, max: 100 },
      },
    };
  }, [themeKey, reducedMotion]);

  if (q.isPending) {
    return (
      /* r305-A8: the marker rides EVERY branch — pending included —
         so the scoped sheet reaches the skeleton band too. */
      <div className="page r305ao" aria-busy="true">
        <PatternsPageHeader
          title="النظرة التعليميّة"
          description="جارٍ جمع البيانات…"
          breadcrumbs={[{ label: 'لوحة المالك', to: '/owner/dashboard' }, { label: 'النظرة التعليميّة' }]}
        />
        {/* Shape-matched skeletons — one per card the data will fill. */}
        <StatStripSkeleton />
        <Card title="المقرّرات حسب الكلّيّة"><ChartSkeleton height={240} /></Card>
        <Card title="أكثر المقرّرات تسجيلاً"><TableSkeleton rows={5} cols={4} /></Card>
        <Card title="توزيع حِمل أعضاء هيئة التدريس"><ListSkeleton rows={5} /></Card>
        <Card title="اتّجاه الحضور"><ChartSkeleton height={240} /></Card>
      </div>
    );
  }
  if (q.isError || !edu) {
    return (
      /* r305-A8: the marker rides EVERY branch — the honest error
         state renders under the same scoped grammar. */
      <div className="page r305ao">
        <PatternsPageHeader
          title="النظرة التعليميّة"
          breadcrumbs={[{ label: 'لوحة المالك', to: '/owner/dashboard' }, { label: 'النظرة التعليميّة' }]}
        />
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </div>
    );
  }

  const { totals, byFaculty, topCourses, workloadBuckets, attendanceTrend } = edu;

  const totalTeachers =
    workloadBuckets.idle +
    workloadBuckets.one +
    workloadBuckets.two +
    workloadBuckets.three +
    workloadBuckets.fourPlus;
  const pct = (n: number) => (totalTeachers > 0 ? Math.round((n / totalTeachers) * 100) : 0);

  const barHeight = Math.max(220, byFaculty.length * 36);

  const trendHasData = attendanceTrend.some((t) => t.attendancePct !== null);
  const trendMax = attendanceTrend.length > 0
    ? Math.max(...attendanceTrend.map((t) => t.attendancePct ?? 0))
    : 0;

  // Workload buckets — share-of-teachers meters (owner.css §6-b); the
  // staggered fill on load is the page's authored moment.
  const buckets: Array<{ label: string; n: number; color: string; aria: string }> = [
    { label: 'بدون عرض هذا الفصل', n: workloadBuckets.idle, color: 'var(--neutral-400)', aria: 'نسبة الأساتذة بدون عرض هذا الفصل' },
    { label: 'عرض واحد', n: workloadBuckets.one, color: c.accent, aria: 'نسبة الأساتذة بعرض واحد هذا الفصل' },
    { label: 'عرضان', n: workloadBuckets.two, color: c.success, aria: 'نسبة الأساتذة بعرضين هذا الفصل' },
    { label: '3 عروض', n: workloadBuckets.three, color: c.gold, aria: 'نسبة الأساتذة بثلاثة عروض هذا الفصل' },
    { label: '4 فأكثر', n: workloadBuckets.fourPlus, color: c.warning, aria: 'نسبة الأساتذة بأربعة عروض فأكثر هذا الفصل' },
  ];

  return (
    /* r305-A8 «Heron»: page-root marker — meters (owner-workload),
       tables and chart containers all key off the scoped sheet. */
    <div className="page r305ao">
      <PatternsPageHeader
        title="النظرة التعليميّة"
        description="إحصائيات حيّة عن المقرّرات وأعضاء هيئة التدريس والطلاب"
        breadcrumbs={[{ label: 'لوحة المالك', to: '/owner/dashboard' }, { label: 'النظرة التعليميّة' }]}
      />

      {/* r299: the trend notes died — each one restated its own label
          («إجمالي المقرّرات» / «مقرّرات مسجَّلة») in different words; the
          label already carries the noun. */}
      <StatStrip
        ariaLabel="إحصائيات التعليم"
        cells={[
          { label: 'إجمالي المقرّرات', value: formatNum(totals.totalCourses) },
          { label: 'عدد الأساتذة', value: formatNum(totals.teachers) },
          { label: 'العروض النشطة', value: formatNum(totals.totalOfferings) },
          { label: 'متوسط التسجيل في العرض', value: formatNum(totals.avgEnrolment) },
        ]}
      />

      <Card title="المقرّرات حسب الكلّيّة" subtitle="عدد المقرّرات المُدرَّجة في كل كلّيّة">
        {byFaculty.length === 0 ? (
          <EmptyState illustration="empty-courses" title="لا مقرّرات بعد" description="ستظهر هنا حين تُسجَّل مقرّرات على نظام الكلّيّات." />
        ) : (
          <ChartFrame
            ariaLabel="مخطط أعمدة أفقي — عدد المقرّرات في كل كلّيّة"
            summary={`${facultiesCountLabel(byFaculty.length)} بها مقرّرات؛ أكبرها ${byFaculty.reduce((a, b) => (b.courseCount > a.courseCount ? b : a)).name}.`}
            table={{
              caption: 'المقرّرات حسب الكلّيّة',
              columns: ['الكلّيّة', 'عدد المقرّرات'],
              rows: byFaculty.map((f) => [f.name, f.courseCount]),
            }}
            height={barHeight}
          >
            <Bar key={themeKey} data={barData} options={barOptions} plugins={barPlugins} />
          </ChartFrame>
        )}
      </Card>

      <Card title="أكثر المقرّرات تسجيلاً">
        {topCourses.length === 0 ? (
          <EmptyState illustration="empty-list" title="لا تسجيلات بعد" description="ستظهر المقرّرات الأكثر تسجيلاً فور تسجيل الطلاب في العروض." />
        ) : (
          <div className="table-wrap">
            <table className="table tbl-stack">
              <thead>
                <tr>
                  <th scope="col">الرمز</th>
                  <th scope="col">اسم المقرّر</th>
                  <th scope="col">الكلّيّة</th>
                  <th scope="col">المسجَّلون</th>
                </tr>
              </thead>
              <tbody>
                {topCourses.map((course) => (
                  // R190 (D4): the composite key — two faculties can carry
                  // the same course code (SE301 in both), so the bare
                  // `course.code` collided and React warned on duplicate
                  // keys. The faculty-scoped pair is the row's identity.
                  <tr key={`${course.code}·${course.facultyName}`}>
                    <td data-label="الرمز"><bdi className="owner-num" dir="ltr">{course.code}</bdi></td>
                    <td className="tbl-strong" data-label="اسم المقرّر">{course.name}</td>
                    <td data-label="الكلّيّة" className="owner-cell-muted">{course.facultyName}</td>
                    <td className="owner-num" data-label="المسجَّلون">{formatNum(course.enrolled)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card
        title="توزيع حِمل أعضاء هيئة التدريس"
        subtitle="نسبة الأساتذة حسب عدد العروض التي يُدرِّسونها هذا الفصل"
      >
        {totalTeachers === 0 ? (
          <EmptyState illustration="empty-list" title="لا يوجد أساتذة بعد" description="يُحسب التوزيع فور إسناد أوّل عرض لمقرّر." />
        ) : (
          <div className="owner-workload">
            {buckets.map((b, i) => (
              <div key={b.label} className="owner-meter" style={{ '--meter-i': i } as CSSProperties}>
                <ProgressBar
                  value={pct(b.n)}
                  label={`${b.label} (${teachersCountLabel(b.n)})`}
                  ariaLabel={b.aria}
                  color={b.color}
                />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card title="اتّجاه الحضور" subtitle="آخر 6 أشهر — يُحسب من سجلات الحضور الفعليّة">
        {!trendHasData ? (
          <EmptyState illustration="empty-list" title="لا توجد سجلّات حضور بعد" description="يبدأ الحساب فور تسجيل أوّل جلسة حضور على المنصّة." />
        ) : (
          <ChartFrame
            ariaLabel="مخطط خطّي لاتّجاه نسبة الحضور الشهريّة على مدى آخر ستة أشهر"
            summary={`أعلى نسبة حضور مسجَّلة ${trendMax}%.`}
            table={{
              caption: 'اتّجاه الحضور الشهري',
              columns: ['الشهر', 'نسبة الحضور %'],
              rows: attendanceTrend.map((t) => [t.month, t.attendancePct ?? '—']),
            }}
            height={240}
          >
            <Line key={themeKey} data={lineData} options={lineOptions} />
          </ChartFrame>
        )}
      </Card>
    </div>
  );
}
