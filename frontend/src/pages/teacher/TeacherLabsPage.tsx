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
import { CardSkeleton } from '../../components/primitives/States';
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

function iconFor(category: string): LucideIcon {
  return CATEGORY_ICON[category.toLowerCase()] ?? FlaskConical;
}

export default function TeacherLabsPage() {
  const { data: labs, isLoading } = useLabs();

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المعامل الافتراضية</h1>
          <p className="page-subtitle">
            استعرض المعامل الافتراضية المتاحة على المنصة. يمكنك توجيه طلابك لها كمكمّل عملي
            للمحاضرات. الطلاب يدخلون المعمل كمشاركين، بينما تبقى أنت المسؤول عن سياق التعلّم.
          </p>
        </div>
      </div>

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
          value={
            labs ? new Set(labs.map((l) => l.category)).size.toString() : '—'
          }
          change="شبكات، علوم، ذكاء اصطناعي…"
          color="purple"
        />
        <MetricCard
          icon={Network}
          label="معايير المنصة"
          value="معتمدة"
          change="بتوافق مع برامج كلية الهندسة وتقنية المعلومات"
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

      {isLoading && <CardSkeleton lines={5} />}

      {labs && labs.length === 0 && (
        <Card>
          <div className="empty-state">
            <Icon icon={FlaskConical} size={28} className="text-subtle" />
            <p className="text-sm text-muted">لم تُضف معامل بعد — تواصل مع إدارة المنصة لإضافة معامل لكليتك.</p>
          </div>
        </Card>
      )}

      {labs && labs.length > 0 && (
        <Card title="المعامل المتاحة" icon={FlaskConical}>
          <div className="track-grid">
            {labs.map((lab) => <LabCard key={lab.id} lab={lab} />)}
          </div>
        </Card>
      )}
    </div>
  );
}

function LabCard({ lab }: { lab: VirtualLab }) {
  const Ico = iconFor(lab.category);
  const accent = lab.themeColor ?? '#3D6BD6';
  return (
    <div className="track-card" style={{ ['--track-accent' as never]: accent, cursor: 'default' }}>
      <div
        className="track-card-icon"
        style={{ background: `${accent}1a`, color: accent }}
      >
        <Icon icon={Ico} size={22} />
      </div>
      <div className="track-card-body">
        <div className="track-card-cat">
          {lab.category}
          {lab.platform ? ` · ${lab.platform}` : ''}
        </div>
        <div className="track-card-title">{lab.iconEmoji ? `${lab.iconEmoji} ` : ''}{lab.name}</div>
        <div className="track-card-meta">
          <Badge>{lab.totalExperiments ?? 0} تجربة معدّة</Badge>
        </div>
        <div style={{ marginTop: 'var(--sp-3)', display: 'flex', gap: 8 }}>
          <Link to="/student/labs" className="btn ghost sm">
            <Icon icon={ExternalLink} size={12} /> معاينة كطالب
            <Icon icon={ChevronLeft} size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
}
