import {
  GraduationCap, Award, Users2, Clock, Star,
  Code, Database, Palette, Languages, Briefcase,
  type LucideIcon,
} from 'lucide-react';
import { Card, Badge } from '../../components/primitives';
import { LoadingState, EmptyState, ErrorState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useMoocs } from '../../hooks/useResources';

const moocIcon = (cat: string): LucideIcon => {
  if (cat === 'prog') return Code;
  if (cat === 'data' || cat === 'db') return Database;
  if (cat === 'design') return Palette;
  if (cat === 'lang') return Languages;
  if (cat === 'business') return Briefcase;
  return GraduationCap;
};

export default function MoocPage() {
  const { data, isPending, isError } = useMoocs();
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">كورسات خارجية</h1>
          <p className="page-subtitle">شراكات مع منصات عالمية وبرامج معتمدة من جامعة مدارك.</p>
        </div>
      </div>

      {isPending ? (
        <Card><LoadingState /></Card>
      ) : isError ? (
        <Card><ErrorState /></Card>
      ) : !data?.length ? (
        <Card><EmptyState
          icon={GraduationCap}
          title="لا توجد كورسات خارجية مرتبطة الآن"
          description="هذا القسم يضم كورسات Coursera وedX المعتمدة من الجامعة. سيتم إضافة كورسات جديدة قبل بداية الفصل القادم."
        /></Card>
      ) : (
        <div className="grid-3">
          {data.map((m) => {
            const Cmp = moocIcon(m.category);
            return (
              <div className="thumb-card" key={m.id}>
                <div className="thumb-card-image" style={{ background: 'var(--accent-soft)', height: 96 }}>
                  <span style={{ color: 'var(--accent)' }}>
                    <Icon icon={Cmp} size={32} strokeWidth={1.6} />
                  </span>
                </div>
                <div className="thumb-card-body">
                  <div className="thumb-card-title">{m.title}</div>
                  <div className="thumb-card-sub">{m.organization}</div>

                  <div className="flex items-center gap-3 text-xs text-subtle font-mono" style={{ marginTop: 'var(--sp-2)' }}>
                    <span className="flex items-center gap-1"><Icon icon={Clock} size={12} /> {m.durationHours}س</span>
                    <span className="flex items-center gap-1"><Icon icon={Star} size={12} strokeWidth={2.2} /> {m.rating}</span>
                    <span className="flex items-center gap-1"><Icon icon={Users2} size={12} /> {m.enrolled.toLocaleString('ar-LY')}</span>
                  </div>

                  <div className="flex items-center justify-between" style={{ marginTop: 'var(--sp-2)' }}>
                    <Badge>{m.level}</Badge>
                    {m.hasCertificate && <Badge color="gold" icon={Award}>شهادة</Badge>}
                  </div>

                  <button type="button" className="btn primary" style={{ width: '100%', marginTop: 'var(--sp-3)' }}>
                    سجّل الآن
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
