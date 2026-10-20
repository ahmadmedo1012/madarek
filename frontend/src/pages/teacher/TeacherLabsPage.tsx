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
 *  - «معاينة كطالب» opens the student labs explorer at /student/labs —
 *    mounted role-permissively (STUDENT+TEACHER) since 22-a; the old
 *    STUDENT-only guard made this CTA silently bounce every teacher
 *    back to their dashboard (A6 P1).
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
import { Card, Badge } from '../../components/primitives';
import { StatStrip } from '../../components/primitives/Ledger';
import { ErrorState, Skeleton, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useLabs, type VirtualLab } from '../../hooks/useResources';
import { formatNum } from '../../utils/numbers';
import '../../styles/teacher-quality.css'; // 4C family sheet (r241): the .tq list-row catalog grammar

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

/** Shape-matched skeleton for the stat strip + row list (r241: rows,
 * not thumb-card tiles — mirrors the .tq-rows anatomy). */
function LabsSkeleton() {
  return (
    <>
      <div className="stat-strip" aria-busy="true" aria-live="polite">
        {[0, 1, 2].map((i) => (
          <div key={i} className="stat-cell" aria-hidden>
            <Skeleton width={70} height={11} />
            <div style={{ marginBlock: 'var(--sp-1)' }}>
              <Skeleton width={60} height={28} />
            </div>
            <Skeleton width={110} height={11} />
          </div>
        ))}
      </div>
      <Card>
        <div className="tq-rows" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="tq-row">
              <Skeleton width={44} height={44} rounded="var(--r-lg)" />
              <div className="tq-row-body">
                <Skeleton width="38%" height={10} />
                <Skeleton width="72%" height={16} />
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
          <StatStrip
            ariaLabel="إحصاءات المعامل"
            cells={[
              { label: 'معامل متاحة', value: '—' },
              { label: 'فئات المعامل', value: '—' },
              { label: 'منصّات التدريب', value: '—' },
            ]}
          />
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
          <StatStrip
            ariaLabel="إحصاءات المعامل"
            cells={[
              {
                label: 'معامل متاحة',
                value: formatNum(labs?.length ?? 0),
                trend: 'جاهزة للتجربة',
                trendTone: 'flat',
              },
              {
                label: 'فئات المعامل',
                value: formatNum(categories),
                trend: 'شبكات، علوم، ذكاء اصطناعي…',
                trendTone: 'flat',
              },
              {
                label: 'منصّات التدريب',
                value: formatNum(platforms),
                trend: 'منصّات مختلفة داخل المعامل',
                trendTone: 'flat',
              },
            ]}
          />

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
              {/* r149 (R3-A1 #6): EmptyState الكنونية — كانت يدوية بعلامة مزدوجة. */}
              <EmptyState
                illustration="empty-list"
                title="لم تُضف معامل بعد"
                description="تواصل مع إدارة المنصة لإضافة معامل لكليتك."
              />
            </Card>
          ) : (
            <Card title="المعامل المتاحة" icon={FlaskConical}>
              {/* r241 (Superlist): a LIST of labs, not a card wall — each
                  row keeps the category/platform kicker, the honest
                  experiment count, and its own معاينة action. */}
              <div className="tq-rows" role="list">
                {labs?.map((lab) => <LabRow key={lab.id} lab={lab} />)}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

/** r241 (Superlist): one lab = one row — icon well leading, category·
 * platform kicker, name prominent, honest experiment count, and the
 * معاينة كطالب action trailing (44px zone). */
function LabRow({ lab }: { lab: VirtualLab }) {
  const Ico = iconFor(lab.category);
  // --tq-accent feeds the color-mix tint owned by teacher-quality.css;
  // the previous inline `${accent}1a` alpha was invalid CSS whenever the
  // fallback fired (audit 0-e P1-15).
  const accent = lab.themeColor ?? 'var(--accent)';
  return (
    <div className="tq-row" role="listitem" style={{ ['--tq-accent' as never]: accent }}>
      <span className="tq-row-icon">
        <Icon icon={Ico} size={22} />
      </span>
      <span className="tq-row-body">
        <span className="tq-row-kicker">
          {categoryLabel(lab.category)}
          {lab.platform ? <> · <bdi>{lab.platform}</bdi></> : ''}
        </span>
        <span className="tq-row-title" title={lab.name}>{lab.name}</span>
        <span className="tq-row-meta">
          <Badge><span className="tq-num">{formatNum(lab.totalExperiments ?? 0)}</span> تجربة معدّة</Badge>
        </span>
      </span>
      <span className="tq-row-actions">
        <Link to="/student/labs" className="btn ghost sm">
          <Icon icon={ExternalLink} size={12} /> معاينة كطالب
          <Icon icon={ChevronLeft} size={12} />
        </Link>
      </span>
    </div>
  );
}
