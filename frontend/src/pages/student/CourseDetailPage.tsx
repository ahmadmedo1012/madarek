import { Link, useParams } from 'react-router-dom';
import {
  BookOpen, Play, FileText, ClipboardList, Calendar, Users,
  Clock, CheckCircle2, ChevronLeft,
  Cog, Cpu, Database, Network, Globe, Shield,
  type LucideIcon,
} from 'lucide-react';
import { Card, Badge, ProgressBar } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useOfferingFull } from '../../hooks/useResources';

const courseIcon = (codeOrName: string): LucideIcon => {
  const s = codeOrName.toLowerCase();
  if (s.includes('se') || s.includes('برمج')) return Cog;
  if (s.includes('ct') || s.includes('تقنيات الحاسوب')) return Cpu;
  if (s.includes('is') || s.includes('نظم')) return Database;
  if (s.includes('net') || s.includes('شبك')) return Network;
  if (s.includes('web') || s.includes('إنترنت')) return Globe;
  if (s.includes('sec') || s.includes('أمن')) return Shield;
  return BookOpen;
};

const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

function fmtDuration(sec: number) {
  const m = Math.round(sec / 60);
  return `${m}د`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('ar-LY', { day: 'numeric', month: 'short' });
}

export default function CourseDetailPage() {
  const { offeringId } = useParams<{ offeringId: string }>();
  const { data, isPending, isError } = useOfferingFull(offeringId);

  if (isPending) return <LoadingState />;
  if (isError || !data) return <ErrorState />;

  const Cmp = courseIcon(data.course.code ?? data.course.name);
  const tint = data.course.themeColor ?? '#3D6BD6';

  const watchedCount = data.lectures.filter((l) => l.watchEvents?.[0]?.completed).length;
  const lecProgress = data.lectures.length ? Math.round((watchedCount / data.lectures.length) * 100) : 0;

  return (
    <div className="page">
      {/* Hero header */}
      <div style={{
        position: 'relative',
        background: `linear-gradient(135deg, ${tint}15 0%, ${tint}05 100%)`,
        border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)',
        padding: 'var(--sp-6)',
      }}>
        <Link to="/student/courses" className="btn ghost sm" style={{ marginBottom: 'var(--sp-4)' }}>
          <Icon icon={ChevronLeft} size={13} style={{ transform: 'scaleX(-1)' }} />
          المواد الدراسية
        </Link>
        <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
          <div style={{
            width: 64, height: 64, borderRadius: 'var(--r-lg)',
            background: `${tint}20`, color: tint,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Icon icon={Cmp} size={28} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
              <Badge>{data.course.code}</Badge>
              <span className="text-xs text-subtle">·</span>
              <span className="text-xs text-subtle">{data.course.department.name}</span>
            </div>
            <h1 style={{
              fontSize: 'var(--fs-2xl)', fontWeight: 600, color: 'var(--text)',
              letterSpacing: '-0.4px', marginBottom: 6,
            }}>
              {data.course.name}
            </h1>
            <div className="text-sm text-muted">
              د. {data.teacher.firstName} {data.teacher.lastName} · {data.course.credits} ساعات معتمدة · الفصل {data.term}
            </div>
          </div>
        </div>
      </div>

      {/* Course KPIs */}
      <div className="grid-4">
        <KPI icon={Play} label="المحاضرات" value={data.lectures.length.toString()} sub={`${watchedCount} مكتملة`} />
        <KPI icon={FileText} label="المواد" value={data.materials.length.toString()} sub="ملف متاح" />
        <KPI icon={ClipboardList} label="الواجبات" value={data.assignments.length.toString()} sub="هذا الفصل" />
        <KPI icon={Users} label="الطلاب" value={data._count.enrollments.toString()} sub="مسجَّل" />
      </div>

      {/* Lectures list */}
      <Card title="المحاضرات" icon={Play} subtitle={`تقدّمك: ${lecProgress}% من المنهج`}>
        {!data.lectures.length ? (
          <EmptyState icon={Play} title="لم تُضَف أي محاضرة بعد" />
        ) : (
          <div className="flex-col gap-2">
            {data.lectures.map((lec) => {
              const we = lec.watchEvents?.[0];
              const watchedPct = we && we.totalSec > 0 ? Math.round((we.watchedSec / we.totalSec) * 100) : 0;
              const completed = we?.completed ?? false;
              return (
                <Link
                  to={`/student/lectures/${lec.id}`}
                  key={lec.id}
                  className="list-row"
                  style={{ textDecoration: 'none' }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--r-sm)',
                    background: completed ? 'var(--success-soft)' : `${tint}15`,
                    color: completed ? 'var(--success)' : tint,
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <Icon icon={completed ? CheckCircle2 : Play} size={16} />
                  </div>
                  <div className="list-row-body">
                    <div className="list-row-title">
                      <span className="font-mono text-xs text-subtle" style={{ marginLeft: 6 }}>
                        المحاضرة {String(lec.ordinal).padStart(2, '0')}
                      </span>
                      {lec.title}
                    </div>
                    <div className="list-row-sub flex gap-3" style={{ flexWrap: 'wrap' }}>
                      <span className="flex items-center gap-1">
                        <Icon icon={Clock} size={11} /> {fmtDuration(lec.durationSec)}
                      </span>
                      <span>·</span>
                      <span>{lec._count.chapters} فصل</span>
                      <span>·</span>
                      <span>{lec._count.checkpoints} نقطة تفاعل</span>
                    </div>
                    {watchedPct > 0 && watchedPct < 100 && (
                      <div style={{ marginTop: 6, maxWidth: 240 }}>
                        <ProgressBar value={watchedPct} color={tint} showValue={false} />
                      </div>
                    )}
                  </div>
                  {completed && <Badge color="green">مكتملة</Badge>}
                  {!completed && watchedPct > 0 && <Badge color="brand">{watchedPct}%</Badge>}
                </Link>
              );
            })}
          </div>
        )}
      </Card>

      {/* Materials + Assignments + Schedule */}
      <div className="grid-2-1">
        <Card title="المواد المرفقة" icon={FileText}>
          {!data.materials.length ? (
            <EmptyState icon={FileText} title="لا توجد مواد بعد" />
          ) : (
            <div className="flex-col gap-2">
              {data.materials.map((m) => (
                <div key={m.id} className="list-row">
                  <Icon icon={FileText} size={16} className="text-muted" />
                  <div className="list-row-body">
                    <div className="list-row-title">{m.name}</div>
                    <div className="list-row-sub">{m.type} · {fmtDate(m.createdAt)}</div>
                  </div>
                  <Badge>{m.type}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="الجدول الأسبوعي" icon={Calendar}>
          {!data.schedule.length ? (
            <EmptyState icon={Calendar} title="لم يُحدَّد جدول بعد" />
          ) : (
            <div className="flex-col gap-2">
              {data.schedule.map((s) => (
                <div key={s.id} className="list-row">
                  <span className="list-row-meta">{s.startTime} — {s.endTime}</span>
                  <div className="list-row-body">
                    <div className="list-row-title">{DAYS[s.dayOfWeek] ?? '—'}</div>
                    <div className="list-row-sub">{s.room ?? '—'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="الواجبات" icon={ClipboardList}>
        {!data.assignments.length ? (
          <EmptyState icon={ClipboardList} title="لا توجد واجبات نشطة" />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr><th>العنوان</th><th>النوع</th><th>الموعد النهائي</th><th>الوزن</th></tr>
              </thead>
              <tbody>
                {data.assignments.map((a) => (
                  <tr key={a.id}>
                    <td className="tbl-strong">{a.title}</td>
                    <td>{a.type}</td>
                    <td className="tbl-num">{fmtDate(a.dueAt)}</td>
                    <td className="tbl-num">{a.weight}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

function KPI({ icon, label, value, sub }: { icon: LucideIcon; label: string; value: string; sub: string }) {
  return (
    <div className="metric">
      <div className="metric-head">
        <span className="metric-label">{label}</span>
        <Icon icon={icon} size={16} className="metric-icon" />
      </div>
      <div className="metric-value">{value}</div>
      <div className="metric-change">{sub}</div>
    </div>
  );
}
