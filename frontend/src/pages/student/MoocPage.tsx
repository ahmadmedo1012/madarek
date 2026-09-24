import { useState, type CSSProperties, type ReactNode } from 'react';
import {
  GraduationCap, Award, Users2, Clock, Star,
  Code, Database, Palette, Languages, Briefcase,
  type LucideIcon,
} from 'lucide-react';
import { Card, Badge } from '../../components/primitives';
import { EmptyState, ErrorState, Skeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useMoocs, type MoocCourse } from '../../hooks/useResources';

const moocIcon = (cat: string): LucideIcon => {
  if (cat === 'prog') return Code;
  if (cat === 'data' || cat === 'db') return Database;
  if (cat === 'design') return Palette;
  if (cat === 'lang') return Languages;
  if (cat === 'business') return Briefcase;
  return GraduationCap;
};

/** Arabic labels for the API level enum (audit 0-d — the raw English
 *  value used to render in the badge). Unknown values fall back to the
 *  raw string isolated in a bdi. */
const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: 'مبتدئ',
  INTERMEDIATE: 'متوسط',
  ADVANCED: 'متقدم',
};

function levelLabel(level: string): ReactNode {
  const known = LEVEL_LABEL[level];
  if (known) return known;
  return <bdi>{level}</bdi>;
}

/** Shape-matched loading skeleton for the external-course card grid
 *  (audit 0-d P2 — bare spinner where thumb cards fit). */
function MoocGridSkeleton() {
  return (
    <div className="grid-3" aria-busy="true" aria-live="polite">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div className="thumb-card" key={i} aria-hidden>
          <div className="thumb-card-image mooc-card-image">
            <Skeleton width={48} height={48} rounded="var(--r-lg)" />
          </div>
          <div className="thumb-card-body">
            <Skeleton width="80%" height={16} />
            <Skeleton width="50%" height={12} />
            <div style={{ marginTop: 'var(--sp-3)' }}>
              <Skeleton width="70%" height={12} />
            </div>
            <div style={{ marginTop: 'var(--sp-3)' }}>
              <Skeleton width="100%" height={36} rounded="var(--r-md)" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MoocCard({ m, index }: { m: MoocCourse; index: number }) {
  const Cmp = moocIcon(m.category);
  // One-shot confirmation pulse when the student opens the registration
  // page (the authored moment): the CTA acknowledges the action while
  // the external tab opens. Pure feedback — no state is faked.
  const [confirmed, setConfirmed] = useState(false);

  return (
    <div className="thumb-card mooc-card" style={{ '--cc-i': index } as CSSProperties}>
      <div className="thumb-card-image mooc-card-image">
        <span>
          <Icon icon={Cmp} size={32} strokeWidth={1.6} />
        </span>
      </div>
      <div className="thumb-card-body">
        <div className="thumb-card-title" title={m.title}>{m.title}</div>
        <div className="thumb-card-sub" title={m.organization}>{m.organization}</div>

        <div className="mooc-card-meta">
          <span><Icon icon={Clock} size={12} aria-hidden /> <bdi>{m.durationHours}س</bdi></span>
          <span><Icon icon={Star} size={12} strokeWidth={2.2} aria-hidden /> <bdi>{m.rating}</bdi></span>
          <span><Icon icon={Users2} size={12} aria-hidden /> <bdi>{m.enrolled.toLocaleString('ar-LY')}</bdi></span>
        </div>

        <div className="flex items-center justify-between" style={{ marginTop: 'var(--sp-2)' }}>
          <Badge>{levelLabel(m.level)}</Badge>
          {m.hasCertificate && <Badge color="gold" icon={Award}>شهادة</Badge>}
        </div>

        {/* Real external course page when the record has one —
            otherwise no dead CTA. */}
        {m.externalUrl ? (
          <a
            className={`btn primary mooc-cta${confirmed ? ' confirmed' : ''}`}
            href={m.externalUrl}
            target="_blank"
            rel="noreferrer noopener"
            aria-label={`فتح صفحة التسجيل في «${m.title}» على موقع ${m.organization}`}
            onClick={() => setConfirmed(true)}
          >
            سجّل الآن
          </a>
        ) : null}
      </div>
    </div>
  );
}

export default function MoocPage() {
  const { data, isPending, isError, error, refetch } = useMoocs();
  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">كورسات خارجية</h1>
          <p className="page-subtitle">شراكات مع منصات عالمية وبرامج معتمدة من جامعة الزاوية.</p>
        </div>
      </header>

      {isPending ? (
        <MoocGridSkeleton />
      ) : isError ? (
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      ) : !data?.length ? (
        <Card><EmptyState
          icon={GraduationCap}
          title="لا توجد كورسات خارجية مرتبطة الآن"
          description="هذا القسم يضم كورسات Coursera وedX المعتمدة من الجامعة. سيتم إضافة كورسات جديدة قبل بداية الفصل القادم."
        /></Card>
      ) : (
        <div className="grid-3 mooc-grid">
          {data.map((m, i) => <MoocCard key={m.id} m={m} index={i} />)}
        </div>
      )}
    </div>
  );
}
