import { useState } from 'react';
import {
  Briefcase, MapPin, CheckCircle2,
  Code, BarChart3, Palette, Network, Smartphone, Shield, type LucideIcon,
} from 'lucide-react';
import { Card, Badge } from '../../components/primitives';
import { EmptyState, ErrorState, TableSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useJobs, useApplyJob, apiErrorMessage, type Job } from '../../hooks/useResources';

const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'دوام كامل',
  PART_TIME: 'دوام جزئي',
  INTERNSHIP: 'تدريب',
  FREELANCE: 'عمل حر',
  REMOTE: 'عن بُعد',
};

const jobIcon = (cat: string, title: string): LucideIcon => {
  const t = title.toLowerCase();
  if (t.includes('بيانات') || t.includes('analyst')) return BarChart3;
  if (t.includes('ui') || t.includes('ux') || t.includes('تصميم')) return Palette;
  if (t.includes('شبك')) return Network;
  if (t.includes('موبايل')) return Smartphone;
  if (t.includes('أمن')) return Shield;
  if (cat === 'tech' || t.includes('برمج')) return Code;
  return Briefcase;
};

/** Proper Arabic counted noun for the open-opportunities line. */
function openJobsLabel(n: number): string {
  if (n === 1) return 'فرصة واحدة مفتوحة';
  if (n === 2) return 'فرصتان مفتوحتان';
  if (n >= 3 && n <= 10) return `${n} فرص مفتوحة`;
  return `${n} فرصة مفتوحة`;
}

/** Relative posting age with proper Arabic plurals (audit 0-d —
 *  postedAt was fetched but never shown). */
function fmtPosted(iso: string): string {
  const d = new Date(iso);
  const days = Math.round((Date.now() - d.getTime()) / 86_400_000);
  if (days <= 0) return 'اليوم';
  if (days === 1) return 'أمس';
  if (days === 2) return 'منذ يومين';
  if (days <= 10) return `منذ ${days} أيام`;
  if (days <= 30) return `منذ ${days} يوماً`;
  return d.toLocaleDateString('ar-LY', { day: 'numeric', month: 'short' });
}

function JobRow({ job }: { job: Job }) {
  const apply = useApplyJob();
  const [applied, setApplied] = useState(false);
  const Cmp = jobIcon(job.category, job.title);

  const onApply = async () => {
    try {
      await apply.mutateAsync(job.id);
      setApplied(true);
    } catch {
      // surfaced inline from apply.isError below
    }
  };

  return (
    <>
      <tr>
        <td className="tbl-strong" data-label="الوظيفة">
          <div className="job-title-cell">
            <span className="job-icon-well" aria-hidden>
              <Icon icon={Cmp} size={18} />
            </span>
            <span className="job-title-block">
              <span className="job-title" title={job.title}>{job.title}</span>
              <span className="job-company" title={job.company}>{job.company}</span>
            </span>
          </div>
        </td>
        <td data-label="الموقع">
          <span className="flex items-center gap-1">
            <Icon icon={MapPin} size={12} aria-hidden /> {job.location}
          </span>
        </td>
        <td data-label="النوع">{TYPE_LABELS[job.type] ?? job.type}</td>
        <td data-label="الراتب">
          {job.salary
            ? <bdi className="font-mono">{job.salary}</bdi>
            : <span className="text-xs text-subtle">حسب الاتفاق</span>}
        </td>
        <td
          className="tbl-num"
          data-label="النشر"
          title={new Date(job.postedAt).toLocaleDateString('ar-LY', { dateStyle: 'long' })}
        >
          {fmtPosted(job.postedAt)}
        </td>
        <td data-label="الإجراء">
          {applied ? (
            <Badge color="green" icon={CheckCircle2}>تمّ التقديم</Badge>
          ) : (
            /* The authored moment: actions stay quiet until the row is
               hovered / focused (CSS .table-row-actions — persistent on
               touch, always visible for keyboard via focus-within). */
            <span className="table-row-actions">
              <button
                type="button"
                className="btn primary sm"
                onClick={() => void onApply()}
                disabled={apply.isPending}
              >
                {apply.isPending ? 'جارٍ التقديم…' : 'تقدّم'}
              </button>
            </span>
          )}
        </td>
      </tr>
      {apply.isError && (
        <tr>
          <td colSpan={6} role="alert">
            <p className="job-apply-error">
              {apiErrorMessage(apply.error, 'تعذّر إرسال طلب التقديم — حاول مرة أخرى.')}
            </p>
          </td>
        </tr>
      )}
    </>
  );
}

export default function JobsPage() {
  const { data, isPending, isError, error, refetch } = useJobs();
  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">فرص العمل</h1>
          <p className="page-subtitle">وظائف وفرص تدريب مفتوحة لطلاب وخرّيجي جامعة الزاوية.</p>
        </div>
      </header>

      {isPending ? (
        <Card><TableSkeleton rows={5} cols={6} /></Card>
      ) : isError ? (
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      ) : !data?.length ? (
        <Card><EmptyState
          icon={Briefcase}
          title="لا توجد فرص نشطة هذا الأسبوع"
          description="نضيف فرص التوظيف والتدريب من شركات وطنية وعربية بشكل دوري. ستصلك إشعارات الفرص الملائمة لتخصصك تلقائياً."
        /></Card>
      ) : (
        <>
          <p className="jobs-count" aria-live="polite">{openJobsLabel(data.length)}</p>
          <div className="table-wrap">
            <table className="table tbl-stack jobs-table">
              <thead>
                <tr>
                  <th>الوظيفة</th>
                  <th>الموقع</th>
                  <th>النوع</th>
                  <th>الراتب</th>
                  <th>نُشرت</th>
                  <th>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {data.map((j) => <JobRow key={j.id} job={j} />)}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
