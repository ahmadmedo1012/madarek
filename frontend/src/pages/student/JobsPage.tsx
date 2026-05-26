import {
  Briefcase, MapPin, Sparkles,
  Code, BarChart3, Palette, Network, Smartphone, Shield, type LucideIcon,
} from 'lucide-react';
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
  const { data, isPending, isError } = useJobs();
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">فرص العمل</h1>
          <p className="page-subtitle">وظائف وتدريب مدفوع مفتوحة لطلاب وخرّيجي جامعة مدارك.</p>
        </div>
      </div>

      {isPending ? (
        <Card><LoadingState /></Card>
      ) : isError ? (
        <Card><ErrorState /></Card>
      ) : !data?.length ? (
        <Card><EmptyState
          icon={Briefcase}
          title="لا توجد فرص نشطة هذا الأسبوع"
          description="نضيف فرص التوظيف والتدريب من شركات وطنية وعربية بشكل دوري. ستصلك إشعارات الفرص الملائمة لتخصصك تلقائياً."
        /></Card>
      ) : (
        <div className="flex-col gap-3">
          {data.map((j) => {
            const Cmp = jobIcon(j.category, j.title);
            // Pseudo-match score driven by job order — replace with real data when API supports.
            const match = 95 - (data.indexOf(j) * 7);
            return (
              <Card compact key={j.id} bordered>
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
                      <span className="text-md font-semibold" style={{ color: 'var(--text)' }}>{j.title}</span>
                      <Badge color={match >= 90 ? 'green' : match >= 75 ? 'brand' : undefined} icon={Sparkles}>
                        تطابق {match}%
                      </Badge>
                    </div>
                    <div className="text-xs text-muted" style={{ marginTop: 4 }}>{j.company}</div>
                    <div className="flex items-center gap-3 text-xs text-subtle" style={{ marginTop: 8 }}>
                      <span className="flex items-center gap-1"><Icon icon={MapPin} size={12} /> {j.location}</span>
                      <span>·</span>
                      <span>{TYPE_LABELS[j.type] ?? j.type}</span>
                      {j.salary && (<><span>·</span><span className="font-mono">{j.salary}</span></>)}
                    </div>
                  </div>
                  <button type="button" className="btn primary">تقدّم الآن</button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
