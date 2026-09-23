import { useState } from 'react';
import {
  Briefcase, MapPin, CheckCircle2,
  Code, BarChart3, Palette, Network, Smartphone, Shield, type LucideIcon,
} from 'lucide-react';
import { Card, Badge } from '../../components/primitives';
import { LoadingState, EmptyState, ErrorState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useJobs, useApplyJob, apiErrorMessage } from '../../hooks/useResources';

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

export default function JobsPage() {
  const { data, isPending, isError, error, refetch } = useJobs();
  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">فرص العمل</h1>
          <p className="page-subtitle">وظائف وتدريب مدفوع مفتوحة لطلاب وخرّيجي جامعة الزاوية.</p>
        </div>
      </header>

      {isPending ? (
        <Card><LoadingState /></Card>
      ) : isError ? (
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      ) : !data?.length ? (
        <Card><EmptyState
          icon={Briefcase}
          title="لا توجد فرص نشطة هذا الأسبوع"
          description="نضيف فرص التوظيف والتدريب من شركات وطنية وعربية بشكل دوري. ستصلك إشعارات الفرص الملائمة لتخصصك تلقائياً."
        /></Card>
      ) : (
        <div className="flex-col gap-3">

          {data.map((j) => (
            <JobCard key={j.id} jobId={j.id} icon={jobIcon(j.category, j.title)} title={j.title} company={j.company} location={j.location} type={j.type} salary={j.salary} />
          ))}

        </div>
      )}
    </div>
  );
}

function JobCard({
  jobId, icon: Cmp, title, company, location, type, salary,
}: {
  jobId: string;
  icon: LucideIcon;
  title: string;
  company: string;
  location: string;
  type: string;
  salary?: string | null;
}) {
  const apply = useApplyJob();
  const [applied, setApplied] = useState(false);

  const onApply = async () => {
    try {
      await apply.mutateAsync(jobId);
      setApplied(true);
    } catch {
      // surfaced inline from apply.isError below
    }
  };

  return (
    <Card compact bordered>
      <div className="flex items-center gap-4">
        <div
          style={{
            width: 44, height: 44, borderRadius: 'var(--r-md)',
            background: 'var(--accent-soft)', color: 'var(--accent)',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}
        >
          <Icon icon={Cmp} size={20} />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="text-md font-semibold" style={{ color: 'var(--text)' }}>{title}</span>
            {applied && <Badge color="green" icon={CheckCircle2}>تمّ التقديم</Badge>}
          </div>
          <div className="text-xs text-muted" style={{ marginTop: 4 }}>{company}</div>
          <div className="flex items-center gap-3 text-xs text-subtle" style={{ marginTop: 8 }}>
            <span className="flex items-center gap-1"><Icon icon={MapPin} size={12} /> {location}</span>
            <span>·</span>
            <span>{TYPE_LABELS[type] ?? type}</span>
            {salary && (<><span>·</span><span className="font-mono">{salary}</span></>)}
          </div>
          {apply.isError && (
            <p role="alert" className="text-xs" style={{ color: 'var(--danger)', marginTop: 6 }}>
              {apiErrorMessage(apply.error, 'تعذَّر إرسال طلب التقديم — حاول مرة أخرى.')}
            </p>
          )}
        </div>
        {applied ? (
          <button type="button" className="btn outline" disabled title="تمّ إرسال طلبك لهذه الوظيفة">
            <Icon icon={CheckCircle2} size={14} />
            تمّ التقديم
          </button>
        ) : (
          <button
            type="button"
            className="btn primary"
            onClick={() => void onApply()}
            disabled={apply.isPending}
          >
            {apply.isPending ? 'جارٍ التقديم…' : 'تقدّم الآن'}
          </button>
        )}
      </div>
    </Card>
  );
}
