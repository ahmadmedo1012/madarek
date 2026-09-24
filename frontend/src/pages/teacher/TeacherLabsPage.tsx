/**
 * Teacher virtual-labs management.
 *
 * Path: /teacher/labs
 * Restricted: TEACHER role.
 *
 * Scope (intentionally narrow — full lab orchestration is a bigger
 * product decision; this page surfaces what exists and frames it as
 * "labs you can recommend to your students"):
 *  - List of available virtual labs (DB-backed)
 *  - Per-lab: short description, platform, category, "open student view"
 *  - Hint to students: "labs are also accessible from /student/labs"
 *
 * The simulation logic itself lives in the student page — teachers
 * don't drive a state machine inside the lab; they curate which
 * labs make sense per course.
 */
import { Link } from 'react-router-dom';
import {
  FlaskConical, Network, Cpu, Atom, Zap, Microscope, Bot as BotIcon,
  ExternalLink, ChevronLeft, AlertCircle, type LucideIcon,
} from 'lucide-react';
import { Card, Badge, MetricCard } from '../../components/primitives';
import { ErrorState, Skeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useLabs, type VirtualLab } from '../../hooks/useResources';

const CATEGORY_ICON: Record<string, LucideIcon> = {
  net: Network,
  computer: Cpu,
  physics: Atom,
  electronics: Zap,
  ai: BotIcon,
  bio: Microscope,
};

/* Arabic labels for the raw English category enum (audit 0-e D — raw
 * enums never render). Unknown values fall back to the raw code inside
 * a bdi so future categories stay readable until mapped. */
const CATEGORY_LABEL: Record<string, string> = {
  net: 'شبكات',
  computer: 'حاسوب',
  physics: 'فيزياء',
  electronics: 'إلكترونيات',
  ai: 'ذكاء اصطناعي',
  bio: 'أحياء',
};

function iconFor(category: string): LucideIcon {
  return CATEGORY_ICON[category.toLowerCase()] ?? FlaskConical;
}

function categoryLabel(category: string): React.ReactNode {
  const label = CATEGORY_LABEL[category.toLowerCase()];
  if (label) return label;
  return <bdi>{category}</bdi>;
}

/** Shape-matched skeleton for the labs KPI strip + card grid. */
function LabsSkeleton() {
  return (
    <>
      <div className="grid-3" aria-busy="true" aria-live="polite">
        {[0, 1, 2].map((i) => (
          <div key={i} className="metric" aria-hidden>
            <div style={{ marginBlockEnd: 'var(--sp-3)' }}>
              <Skeleton width={90} height={11} />
            </div>
            <Skeleton width={60} height={26} />
            <div style={{ marginBlockStart: 'var(--sp-2)' }}>
              <Skeleton width={120} height={11} />
            </div>
          </div>
        ))}
      </div>
      <Card>
        <div className="track-grid" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="track-card">
              <Skeleton width={48} height={48} rounded="var(--r-lg)" />
              <div className="track-card-body">
                <Skeleton width="45%" height={10} />
                <Skeleton width="85%" height={16} />
                <Skeleton width="60%" height={10} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
}

export default function TeacherLabsPage() {
  const { data: labs, isPending, isError, error, refetch } = useLabs();

  const categories = labs ? new Set(labs.map((l) => l.category.toLowerCase())).size : 0;
  const platforms = labs ? new Set(labs.map((l) => l.platform).filter(Boolean)).size : 0;

  return (
    <div className="page page-labs">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المعامل الافتراضية</h1>
          <p className="page-subtitle">
            استعرض المعامل الافتراضية المتاحة على المنصة. يمكنك توجيه طلابك لها كمكمّل عملي
            للمحاضرات. الطلاب يدخلون المعمل كمشاركين، بينما تبقى أنت المسؤول عن سياق التعلّم.
          </p>
        </div>
      </header>

      {isPending ? (
        <LabsSkeleton />
      ) : isError ? (
        <>
          <div className="grid-3">
            <MetricCard icon={FlaskConical} label="معامل متاحة" value="—" color="brand" />
            <MetricCard icon={Microscope} label="فئات المعامل" value="—" color="purple" />
            <MetricCard icon={Network} label="منصّات التدريب" value="—" color="green" />
          </div>
          <Card>
            <ErrorState
              message="تعذَّر تحميل المعامل الافتراضية"
              error={error}
              onRetry={() => refetch()}
            />
          </Card>
        </>
      ) : (
        <>
          <div className="grid-3">
            <MetricCard
              icon={FlaskConical}
              label="معامل متاحة"
              value={(labs?.length ?? 0).toString()}
              change="جاهزة للتجربة"
              color="brand"
            />
            <MetricCard
              icon={Microscope}
              label="فئات المعامل"
              value={categories.toString()}
              change="شبكات، علوم، ذكاء اصطناعي…"
              color="purple"
            />
            <MetricCard
              icon={Network}
              label="منصّات التدريب"
              value={platforms.toString()}
              change="منصّات مختلفة داخل المعامل"
              color="green"
            />
          </div>

          <Card>
            <div className="flex items-center gap-3">
              <Icon icon={AlertCircle} size={18} style={{ color: 'var(--accent)' }} />
              <div className="text-xs text-muted">
                <strong>تنويه أكاديمي:</strong> المعامل الافتراضية هي بيئات محاكاة معتمدة في الجامعة.
                استخدمها لتعزيز فهم الطلاب للمحتوى النظري — ليست بديلاً عن المختبر الواقعي.
              </div>
            </div>
          </Card>

          {labs && labs.length === 0 ? (
            <Card>
              <div className="empty-state">
                <Icon icon={FlaskConical} size={28} className="text-subtle" />
                <p className="text-sm text-muted">
                  لم تُضف معامل بعد — تواصل مع إدارة المنصة لإضافة معامل لكليتك.
                </p>
              </div>
            </Card>
          ) : (
            <Card title="المعامل المتاحة" icon={FlaskConical}>
              <div className="track-grid">
                {labs?.map((lab, i) => <LabCard key={lab.id} lab={lab} index={i} />)}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function LabCard({ lab, index }: { lab: VirtualLab; index: number }) {
  const Ico = iconFor(lab.category);
  // --track-accent feeds the color-mix tints owned by training.css; the
  // previous inline `${accent}1a` alpha was invalid CSS whenever the
  // fallback fired (audit 0-e P1-15).
  const accent = lab.themeColor ?? 'var(--accent)';
  return (
    <div
      className="track-card is-static"
      style={{ ['--track-accent' as never]: accent, ['--lab-i' as never]: index }}
    >
      <div className="track-card-icon">
        <Icon icon={Ico} size={22} />
      </div>
      <div className="track-card-body">
        <div className="track-card-cat">
          {categoryLabel(lab.category)}
          {lab.platform ? <> · <bdi>{lab.platform}</bdi></> : ''}
        </div>
        <div className="track-card-title" title={lab.name}>{lab.name}</div>
        <div className="track-card-meta">
          <Badge>{lab.totalExperiments ?? 0} تجربة معدّة</Badge>
        </div>
        <div className="track-card-actions">
          <Link to="/student/labs" className="btn ghost sm">
            <Icon icon={ExternalLink} size={12} /> معاينة كطالب
            <Icon icon={ChevronLeft} size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
