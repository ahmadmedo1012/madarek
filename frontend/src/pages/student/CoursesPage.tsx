import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQueries } from '@tanstack/react-query';
import {
  BookOpen, CheckCircle2, Clock, AlertTriangle, ClipboardList, Send, X,
  Cog, Cpu, Database, Network, Globe, Shield,
  type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, ProgressBar, Badge } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { Modal } from '../../components/overlays/Modal';
import { Icon } from '../../components/Icon';
import {
  useMyEnrollments,
  useStudentDashboard,
  useSubmitAssignment,
  offeringAssignmentsOptions,
  validateSubmissionDraft,
  apiErrorMessage,
  type StudentDashboard,
  type Submission,
} from '../../hooks/useResources';

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

type AgendaAssignment = StudentDashboard['agenda']['assignments'][number];

/** Exported for unit tests (submission-modal validation wiring). */
export type SubmitModalAssignment = AgendaAssignment;

const TYPE_LABELS: Record<string, string> = {
  HOMEWORK: 'واجب',
  QUIZ: 'اختبار قصير',
  PROJECT: 'مشروع',
  EXAM: 'امتحان',
};

function formatDue(iso: string): string {
  const d = new Date(iso);
  const days = Math.round((d.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return d.toLocaleDateString('ar-LY', { dateStyle: 'medium' });
  if (days === 0) return 'اليوم';
  if (days === 1) return 'غداً';
  if (days < 7) return `بعد ${days} أيّام`;
  return d.toLocaleDateString('ar-LY', { dateStyle: 'medium' });
}

/** Honest status derived from the real due date — no fabricated urgency. */
function dueStatus(dueAt: string): { label: string; color: 'green' | 'amber' | 'red' } {
  const days = (new Date(dueAt).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return { label: 'فات الموعد', color: 'red' };
  if (days <= 2) return { label: 'يستحق قريباً', color: 'amber' };
  return { label: 'متبقّي وقت', color: 'green' };
}

export default function StudentCoursesPage() {
  const { data, isPending, isError, error, refetch } = useMyEnrollments();
  const dashboard = useStudentDashboard();

  // The agenda lists upcoming assignments by id but omits the owning
  // offeringId the submit endpoint needs. Resolve it exactly by fetching
  // each enrolled offering's assignments (same ['offerings', id,
  // 'assignments'] key the offering page uses) — no code-name guessing.
  const offeringIds = useMemo(() => (data ?? []).map((e) => e.offering.id), [data]);
  const assignmentsQueries = useQueries({
    queries: offeringIds.map((id) => offeringAssignmentsOptions(id)),
  });
  const assignmentsResolved =
    assignmentsQueries.length > 0 && assignmentsQueries.every((q) => !q.isPending);
  const assignmentIndex = useMemo(() => {
    const map = new Map<string, { offeringId: string }>();
    for (const q of assignmentsQueries) {
      for (const a of q.data ?? []) map.set(a.id, { offeringId: a.offeringId });
    }
    return map;
  }, [assignmentsQueries]);

  const [submitTarget, setSubmitTarget] = useState<{ assignment: AgendaAssignment; offeringId: string } | null>(null);

  const upcoming = dashboard.data?.agenda.assignments ?? [];

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المواد الدراسية</h1>
          <p className="page-subtitle">جميع المواد التي سجّلت فيها هذا الفصل، مع تقدّمك في كل واحدة.</p>
        </div>
      </header>

      <div className="grid-4">
        <MetricCard
          icon={BookOpen}
          label="مواد مسجَّلة"
          value={data?.length ?? '—'}
          change="هذا الفصل"
          color="brand"
        />
        <MetricCard
          icon={CheckCircle2}
          label="مكتملة"
          value={data?.filter((e) => e.progressPct >= 100).length ?? 0}
          color="green"
        />
        <MetricCard
          icon={Clock}
          label="قيد التقدم"
          value={data?.filter((e) => e.progressPct > 0 && e.progressPct < 100).length ?? 0}
          color="amber"
        />
        <MetricCard
          icon={AlertTriangle}
          label="تحتاج اهتمام"
          value={data?.filter((e) => e.progressPct < 30).length ?? 0}
          change="أداء منخفض"
          color="red"
        />
      </div>

      {isPending ? (
        <Card><LoadingState /></Card>
      ) : isError ? (
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      ) : !data?.length ? (
        <Card><EmptyState icon={BookOpen} title="لم تُسجَّل في أي مادة بعد" description="تواصل مع إدارة الكلية لإكمال التسجيل." /></Card>
      ) : (
        <div className="grid-3">
          {data.map((e) => {
            const c = e.offering.course;
            const Cmp = courseIcon(c.code ?? c.name);
            const tint = c.themeColor ?? '#3D6BD6';
            return (
              <Link to={`/student/courses/${e.offering.id}`} className="thumb-card" key={e.id}>
                <div className="thumb-card-image" style={{ background: `${tint}10` }}>
                  <span style={{ color: tint }}>
                    <Icon icon={Cmp} size={28} strokeWidth={1.6} />
                  </span>
                </div>
                <div className="thumb-card-body">
                  <div className="thumb-card-title">{c.name}</div>
                  <div className="thumb-card-sub">د. {e.offering.teacher.firstName} {e.offering.teacher.lastName}</div>
                  <div style={{ marginTop: 'var(--sp-2)' }}>
                    <ProgressBar value={e.progressPct} color={tint} label="الإنجاز" />
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}


      <Card title="الواجبات القادمة" icon={ClipboardList} subtitle="واجباتك المستحقة فعلياً خلال الأسبوع القادم ولم تُسلّمها بعد">
        {dashboard.isPending ? (
          <LoadingState />
        ) : dashboard.isError ? (
          <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />
        ) : !upcoming.length ? (
          <EmptyState
            icon={ClipboardList}
            title="لا توجد واجبات قادمة"
            description="ستظهر هنا الواجبات المستحقة فور إضافتها من أساتذة موادك."
          />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>المادة</th>
                  <th>الواجب</th>
                  <th>الموعد النهائي</th>
                  <th>الحالة</th>
                  <th>تسليم</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((a) => {
                  const offering = assignmentIndex.get(a.id);
                  const due = dueStatus(a.dueAt);
                  return (
                    <tr key={a.id}>
                      <td className="tbl-strong">{a.courseName}</td>
                      <td>
                        <Badge>{TYPE_LABELS[a.type] ?? a.type}</Badge>{' '}
                        {a.title}
                      </td>
                      <td className="tbl-num">{formatDue(a.dueAt)}</td>
                      <td><Badge color={due.color}>{due.label}</Badge></td>
                      <td>
                        {offering ? (
                          <button
                            type="button"
                            className="btn outline sm"
                            onClick={() => setSubmitTarget({ assignment: a, offeringId: offering.offeringId })}
                          >
                            <Icon icon={Send} size={12} /> تسليم
                          </button>
                        ) : assignmentsResolved ? (
                          <span className="text-xs text-subtle">—</span>
                        ) : (
                          <button type="button" className="btn outline sm" disabled title="جارٍ تحضير بيانات التسليم…">
                            تسليم
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {submitTarget && (
        <SubmitAssignmentModal
          key={`${submitTarget.offeringId}:${submitTarget.assignment.id}`}
          assignment={submitTarget.assignment}
          offeringId={submitTarget.offeringId}
          onClose={() => setSubmitTarget(null)}
        />
      )}

    </div>
  );
}

/* ─── Student assignment submission modal ─────────────────── */
export function SubmitAssignmentModal({
  assignment,
  offeringId,
  onClose,
}: {
  assignment: AgendaAssignment;
  offeringId: string;
  onClose: () => void;
}) {
  const submit = useSubmitAssignment(offeringId, assignment.id);
  const [textAnswer, setTextAnswer] = useState('');
  const [fileUrl, setFileUrl] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);
  const [done, setDone] = useState<Submission | null>(null);

  const onSubmit = async () => {
    const draft = {
      textAnswer: textAnswer.trim() || undefined,
      fileUrl: fileUrl.trim() || undefined,
    };
    const err = validateSubmissionDraft(draft);
    if (err) {
      setValidationError(err);
      return;
    }
    setValidationError(null);
    try {
      const submission = await submit.mutateAsync(draft);
      setDone(submission);
    } catch {
      // surfaced inline from submit.isError below
    }
  };

  const late = done?.status === 'LATE';

  return (
    <Modal open onClose={onClose} ariaLabel={`تسليم الواجب ${assignment.title}`} closeOnOverlayClick={!submit.isPending}>
      <div className="modal-header">
        <div className="modal-title">تسليم الواجب</div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق" disabled={submit.isPending}>
          <Icon icon={X} size={16} />
        </button>
      </div>
      <div className="modal-body">
        <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{assignment.title}</div>
        <div className="text-xs text-subtle" style={{ marginBottom: 'var(--sp-4)' }}>
          {assignment.courseName} · <span className="font-mono">{assignment.courseCode}</span> · الموعد النهائي:{' '}
          {new Date(assignment.dueAt).toLocaleDateString('ar-LY', { dateStyle: 'medium' })}
        </div>

        {done ? (
          <div
            role="status"
            style={{
              padding: 'var(--sp-4)',
              borderRadius: 'var(--r-md)',
              background: late ? 'var(--warning-soft)' : 'var(--success-soft)',
              color: late ? 'var(--warning)' : 'var(--success)',
              display: 'flex',
              flexDirection: 'column',
              gap: 4,
            }}
          >
            <div className="flex items-center gap-2 font-semibold text-sm">
              <Icon icon={late ? AlertTriangle : CheckCircle2} size={15} />
              {late ? 'تمّ التسليم — بعد الموعد النهائي' : 'تمّ التسليم بنجاح'}
            </div>
            <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: 'var(--lh-base)' }}>
              {late
                ? 'استُلمت إجابتك وسيُعلَّم تسليمك كمتأخر؛ الحسم النهائي يعود إلى أستاذ المادة.'
                : 'استُلمت إجابتك وستظهر للأستاذ بانتظار التقييم.'}
            </p>
          </div>
        ) : (
          <>
            <div className="auth-field">
              <label htmlFor="submit-text">إجابتك النصيّة</label>
              <textarea
                id="submit-text"
                className="input"
                rows={5}
                placeholder="اكتب إجابتك هنا…"
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                disabled={submit.isPending}
                maxLength={8000}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </div>

            <div className="auth-field">
              <label htmlFor="submit-file">رابط ملف (اختياري)</label>
              <input
                id="submit-file"
                type="text"
                className="input"
                placeholder="https://…"
                value={fileUrl}
                onChange={(e) => setFileUrl(e.target.value)}
                disabled={submit.isPending}
                dir="ltr"
                maxLength={500}
                style={{ fontFamily: 'var(--font-mono)' }}
              />
              <div className="text-xxs text-subtle">
                يجب أن يبدأ الرابط بـ https:// أو أن يكون مسار ملف داخل المنصة (/api/v1/files/papers/).
              </div>
            </div>

            {validationError && (
              <p role="alert" className="text-xs" style={{ color: 'var(--danger)', marginTop: 'var(--sp-2)' }}>
                {validationError}
              </p>
            )}
            {submit.isError && (
              <p role="alert" className="text-xs" style={{ color: 'var(--danger)', marginTop: 'var(--sp-2)' }}>
                {apiErrorMessage(submit.error, 'تعذَّر تسليم الواجب — تحقّق من اتصالك وحاول مرة أخرى.')}
              </p>
            )}
          </>
        )}
      </div>
      <div className="modal-footer">
        <button type="button" className="btn ghost" onClick={onClose} disabled={submit.isPending}>
          {done ? 'إغلاق' : 'إلغاء'}
        </button>
        {!done && (
          <button
            type="button"
            className="btn primary"
            onClick={() => void onSubmit()}
            disabled={submit.isPending}
          >
            {submit.isPending ? 'جارٍ التسليم…' : 'تسليم الواجب'}
          </button>
        )}
      </div>
    </Modal>
  );
}
