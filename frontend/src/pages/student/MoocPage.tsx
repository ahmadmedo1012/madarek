import { GraduationCap, Award, Users2, Clock } from 'lucide-react';
import { Card, Badge } from '../../components/primitives';
import { LoadingState, EmptyState, ErrorState } from '../../components/primitives/States';
import { useMoocs } from '../../hooks/useResources';

export default function MoocPage() {
  const { data, isPending, isError } = useMoocs();
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">كورسات خارجية</h1>
          <p className="page-subtitle">شراكات مع منصات عالمية وبرامج معتمدة من جامعة الزاوية.</p>
        </div>
      </div>

      {isPending ? (
        <Card><LoadingState /></Card>
      ) : isError ? (
        <Card><ErrorState /></Card>
      ) : !data?.length ? (
        <Card><EmptyState icon={GraduationCap} title="لا توجد كورسات متاحة حالياً" /></Card>
      ) : (
        <div className="grid-3">
          {data.map((m) => (
            <div className="thumb-card" key={m.id}>
              <div
                className="thumb-card-image"
                style={{
                  background: 'linear-gradient(135deg, rgba(90,156,255,.18), rgba(155,111,232,.08))',
                  height: 110,
                }}
              >
                {m.iconEmoji ?? '🎓'}
              </div>
              <div className="thumb-card-body">
                <div className="thumb-card-title">{m.title}</div>
                <div className="text-xs text-accent">{m.organization}</div>

                <div className="flex flex-wrap gap-2 mt-2">
                  <Badge color="blue" icon={Clock}>{m.durationHours} ساعة</Badge>
                  <Badge color="purple">{m.level}</Badge>
                  {m.hasCertificate && <Badge color="amber" icon={Award}>شهادة</Badge>}
                </div>

                <div className="flex items-center justify-between mt-3">
                  <span className="text-amber text-xs font-mono">★ {m.rating}</span>
                  <span className="text-xs text-subtle flex items-center gap-1">
                    <Users2 size={12} /> {m.enrolled.toLocaleString('ar-LY')}
                  </span>
                </div>

                <button type="button" className="btn primary mt-3 w-full">سجّل الآن</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
