import { Briefcase, MapPin, BadgeCheck } from 'lucide-react';
import { Card, Badge } from '../../components/primitives';
import { LoadingState, EmptyState, ErrorState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useJobs } from '../../hooks/useResources';

const TYPE_LABELS: Record<string, string> = {
  FULL_TIME: 'دوام كامل',
  PART_TIME: 'دوام جزئي',
  INTERNSHIP: 'تدريب',
  FREELANCE: 'عمل حر',
  REMOTE: 'عن بُعد',
};

export default function JobsPage() {
  const { data, isPending, isError } = useJobs();
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">فرص عمل</h1>
          <p className="page-subtitle">وظائف وتدريب مدفوع مفتوحة لطلاب وخرّيجي جامعة الزاوية.</p>
        </div>
      </div>

      {isPending ? (
        <Card><LoadingState /></Card>
      ) : isError ? (
        <Card><ErrorState /></Card>
      ) : !data?.length ? (
        <Card><EmptyState icon={Briefcase} title="لا توجد فرص متاحة حالياً" /></Card>
      ) : (
        <div className="flex-col gap-3">
          {data.map((j) => (
            <Card lift key={j.id} compact>
              <div className="flex items-start gap-4">
                <div
                  style={{
                    width: 48, height: 48, borderRadius: 'var(--r-md)',
                    background: 'var(--accent-soft)', color: 'var(--accent)',
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 22, flexShrink: 0,
                  }}
                >
                  {j.iconEmoji ?? '💼'}
                </div>
                <div className="flex-1">
                  <div className="text-md font-semibold" style={{ color: 'var(--text)' }}>{j.title}</div>
                  <div className="text-xs text-accent mt-1 mb-2">{j.company}</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge color="teal" icon={MapPin}>{j.location}</Badge>
                    <Badge color="blue">{TYPE_LABELS[j.type] ?? j.type}</Badge>
                    {j.salary && <Badge color="green">{j.salary}</Badge>}
                  </div>
                </div>
                <button type="button" className="btn primary shrink-0">
                  <Icon icon={BadgeCheck} size={14} />
                  تقدّم الآن
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
