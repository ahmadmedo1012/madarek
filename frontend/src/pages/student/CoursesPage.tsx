import { useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, Clock, AlertTriangle, ClipboardList, Send, X,
  BookOpen,
} from 'lucide-react';
import { Card, MetricCard, ProgressBar, Badge } from '../../components/primitives';
import { ErrorState, EmptyState, Skeleton, KpiSkeleton, TableSkeleton } from '../../components/primitives/States';
import { Modal } from '../../components/overlays/Modal';
import { useDiscardGuard } from '../../components/curriculum/AuthoringModal';
import { Icon } from '../../components/Icon';
import { courseIcon, courseTint, ASSIGNMENT_KIND_LABEL } from '../../lib/courseMeta';
import {
  useMyEnrollments,
  useStudentDashboard,
  useSubmitAssignment,
  validateSubmissionDraft,
  apiErrorMessage,
  type MyEnrollment,
  type StudentDashboard,
  type Submission,
} from '../../hooks/useResources';

/* courseIcon + DEFAULT_COURSE_TINT (via courseTint) + the assignment-kind
 * labels live in lib/courseMeta.ts (waves 9-a / 13-15 — this page's former
 * TYPE_LABELS was byte-identical to ASSIGNMENT_KIND_LABEL). */

type AgendaAssignment = StudentDashboard['agenda']['assignments'][number];

/** Exported for unit tests (submission-modal validation wiring). */
export type SubmitModalAssignment = AgendaAssignment;

/** Filter buckets mirror the KPI strip semantics (mutually real, counts
 *  derived from data — never invented). */
type CourseFilter = 'all' | 'active' | 'done' | 'attention';

const FILTERS: Array<{ key: CourseFilter; label: string }> = [
  { key: 'all', label: 'الكل' },
  { key: 'active', label: 'قيد التقدّم' },
  { key: 'done', label: 'مكتملة' },
  { key: 'attention', label: 'بحاجة إلى اهتمام' },
];

function matchesFilter(e: MyEnrollment, f: CourseFilter): boolean {
  if (f === 'done') return e.progressPct >= 100;
  if (f === 'active') return e.progressPct > 0 && e.progressPct < 100;
  if (f === 'attention') return e.progressPct < 30;
  return true;
}

/** Honest relative due date with proper Arabic plurals (not "بعد 2 أيّام"). */
function formatDue(iso: string): string {
  const d = new Date(iso);
  const days = Math.round((d.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return d.toLocaleDateString('ar-LY', { dateStyle: 'medium' });
  if (days === 0) return 'اليوم';
  if (days === 1) return 'غداً';
  if (days === 2) return 'بعد يومين';
  if (days <= 10) return `بعد ${days} أيام`;
  return d.toLocaleDateString('ar-LY', { dateStyle: 'medium' });
}

/** Honest status derived from the real due date — no fabricated urgency. */
function dueStatus(dueAt: string): { label: string; color: 'green' | 'amber' | 'red' } {
  const days = (new Date(dueAt).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return { label: 'فات الموعد', color: 'red' };
  if (days <= 2) return { label: 'يستحق قريباً', color: 'amber' };
  return { label: 'متبقّي وقت', color: 'green' };
}

/** Shape-matched loading skeleton for the course card grid (audit 0-d
 *  P2 — the page used a bare spinner where a thumb-card grid fits). */
function CourseGridSkeleton() {
  return (
    <div className="grid-3" aria-busy="true" aria-live="polite">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div className="thumb-card" key={i} aria-hidden>
          <div className="thumb-card-image">
            <Skeleton width={56} height={56} rounded="var(--r-lg)" />
          </div>
          <div className="thumb-card-body">
            <Skeleton width="85%" height={16} />
            <Skeleton width="55%" height={12} />
            <div style={{ marginTop: 'var(--sp-3)' }}>
              <Skeleton width="100%" height={4} rounded="var(--r-full)" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function StudentCoursesPage() {
  const { data, isPending, isError, error, refetch } = useMyEnrollments();
  const dashboard = useStudentDashboard();

  const [submitTarget, setSubmitTarget] = useState<{ assignment: AgendaAssignment; offeringId: string } | null>(null);
  const [filter, setFilter] = useState<CourseFilter>('all');
  // The re-stagger authored moment fires on filter CHANGES only — the
  // first data render lands without an entrance (no same-entrance
  // antipattern); `data-stagger` opts the grid into the CSS animation.
  const [stagger, setStagger] = useState(false);

  const upcoming = dashboard.data?.agenda.assignments ?? [];

  const counts: Record<CourseFilter, number> = {
    all: data?.length ?? 0,
    active: data?.filter((e) => matchesFilter(e, 'active')).length ?? 0,
    done: data?.filter((e) => matchesFilter(e, 'done')).length ?? 0,
    attention: data?.filter((e) => matchesFilter(e, 'attention')).length ?? 0,
  };
  const filtered = (data ?? []).filter((e) => matchesFilter(e, filter));

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">مقرّراتي الدراسية</h1>
          <p className="page-subtitle">جميع المقرّرات التي سجّلت فيها هذا الفصل، مع تقدّمك في كل واحد منها.</p>
        </div>
      </header>

      {isPending ? (
        <>
          <KpiSkeleton />
          <CourseGridSkeleton />
        </>
      ) : isError ? (
        <Card><ErrorState error={error} onRetry={() => refetch()} /></Card>
      ) : !data?.length ? (
        <Card><EmptyState icon={BookOpen} title="لم تُسجَّل في أي مقرّر بعد" description="تواصل مع إدارة الكلّيّة لإكمال تسجيل مقرّرات الفصل — ستظهر هنا فور اعتمادها." /></Card>
      ) : (
        <>
          <div className="grid-4">
            <MetricCard
              icon={BookOpen}
              label="مقرّرات مسجَّلة"
              value={data.length}
              change="هذا الفصل"
              color="brand"
            />
            <MetricCard
              icon={CheckCircle2}
              label="مكتملة"
              value={counts.done}
              color="green"
            />
            <MetricCard
              icon={Clock}
              label="قيد التقدّم"
              value={counts.active}
              color="amber"
            />
            <MetricCard
              icon={AlertTriangle}
              label="بحاجة إلى اهتمام"
              value={counts.attention}
              change="أداء منخفض"
              color="red"
            />
          </div>

          {data.length > 1 && (
            <div className="courses-filter" role="group" aria-label="تصفية المقرّرات حسب الحالة">
              {FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  className={`pill${filter === f.key ? ' on' : ''}`}
                  aria-pressed={filter === f.key}
                  onClick={() => { setFilter(f.key); setStagger(true); }}
                >
                  {f.label}
                  <span className="courses-filter-count" aria-hidden>{counts[f.key]}</span>
                </button>
              ))}
            </div>
          )}

          {/* key={filter} remounts the grid on filter change so the CSS
              re-stagger replays — data refetches alone never replay it. */}
          <div className="grid-3 courses-grid" key={filter} data-stagger={stagger ? '' : undefined}>
            {filtered.length ? filtered.map((e, i) => {
              const c = e.offering.course;
              const Cmp = courseIcon(c.code ?? c.name);
              const tint = courseTint(c.themeColor);
              const teacher = `د. ${e.offering.teacher.firstName} ${e.offering.teacher.lastName}`;
              return (
                <Link
                  to={`/student/courses/${e.offering.id}`}
                  className="thumb-card"
                  key={e.id}
                  style={{ '--cc-i': i, '--course-tint': tint } as CSSProperties}
                >
                  <div className="thumb-card-image">
                    <span>
                      <Icon icon={Cmp} size={28} strokeWidth={1.6} />
                    </span>
                  </div>
                  <div className="thumb-card-body">
                    <div className="thumb-card-title" title={c.name}>{c.name}</div>
                    <div className="thumb-card-sub" title={teacher}>{teacher}</div>
                    <div style={{ marginTop: 'var(--sp-2)' }}>
                      {/* 21-c (A12 P1-3): `color` is the BAR FILL hue
                          (decorative, rides the track) — the primitive
                          paints the 12px % readout in --text-secondary
                          (8.44:1) after the raw themeColor text measured
                          1.88–3.60:1 on the white cards. */}
                      <ProgressBar value={e.progressPct} color={tint} label="الإنجاز" />
                    </div>
                  </div>
                </Link>
              );
            }) : (
              <div className="courses-grid-empty">
                <EmptyState
                  icon={BookOpen}
                  title="لا توجد مقرّرات في هذا التصنيف"
                  description="جرّب تصنيفاً آخر من الأزرار أعلاه لعرض مقرّراتك."
                />
              </div>
            )}
          </div>
        </>
      )}

      <Card title="الواجبات القادمة" icon={ClipboardList} subtitle="واجباتك المستحقة فعلياً خلال الأسبوع القادم ولم تُسلّمها بعد">
        {dashboard.isPending ? (
          <TableSkeleton rows={4} cols={5} />
        ) : dashboard.isError ? (
          <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />
        ) : !upcoming.length ? (
          <EmptyState
            icon={ClipboardList}
            title="لا توجد واجبات قادمة"
            description="ستظهر هنا الواجبات المستحقة فور إضافتها من أساتذة مقرّراتك."
          />
        ) : (
          <div className="table-wrap courses-assignments">
            <table className="table tbl-stack">
              <thead>
                <tr>
                  <th>المقرّر</th>
                  <th>الواجب</th>
                  <th>الموعد النهائي</th>
                  <th>الحالة</th>
                  <th>تسليم</th>
                </tr>
              </thead>
              <tbody>
                {upcoming.map((a) => {
                  const due = dueStatus(a.dueAt);
                  return (
                    <tr key={a.id}>
                      <td className="tbl-strong" data-label="المقرّر">{a.courseName}</td>
                      <td data-label="الواجب">
                        <Badge>{ASSIGNMENT_KIND_LABEL[a.type] ?? a.type}</Badge>{' '}
                        {a.title}
                      </td>
                      <td className="tbl-num" data-label="الموعد النهائي">{formatDue(a.dueAt)}</td>
                      <td data-label="الحالة"><Badge color={due.color}>{due.label}</Badge></td>
                      <td data-label="التسليم">
                        {a.offeringId ? (
                          <button
                            type="button"
                            className="btn outline sm"
                            onClick={() => setSubmitTarget({ assignment: a, offeringId: a.offeringId })}
                          >
                            <Icon icon={Send} size={12} /> تسليم
                          </button>
                        ) : (
                          <span className="text-xs text-subtle">—</span>
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

  /* Close-parity (A10 P1-1): the student's answer is the same class of
     long-form prose the 11 teacher-side authoring modals guard — an
     8000-character draft must not vanish on a stray Esc / scrim click.
     Dirty while any field carries text and the submission hasn't landed;
     inert while the mutation is in flight (A10's teacher-side pattern). */
  const { requestClose, escapeLocked, guard } = useDiscardGuard({
    dirty: !done && (textAnswer.trim() !== '' || fileUrl.trim() !== ''),
    pending: submit.isPending,
    onClose,
  });

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
    <Modal
      open
      onClose={requestClose}
      ariaLabel={`تسليم الواجب ${assignment.title}`}
      closeOnOverlayClick={!submit.isPending}
      closeOnEscape={!escapeLocked}
    >
      <div className="modal-header">
        <div className="modal-title">تسليم الواجب</div>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="إغلاق" disabled={submit.isPending}>
          <Icon icon={X} size={16} />
        </button>
      </div>
      <div className="modal-body">
        <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{assignment.title}</div>
        <div className="text-xs text-subtle" style={{ marginBottom: 'var(--sp-4)' }}>
          {assignment.courseName} · <bdi className="font-mono">{assignment.courseCode}</bdi> · الموعد النهائي:{' '}
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
                ? 'استُلمت إجابتك وسيُعلَّم تسليمك كمتأخر؛ الحسم النهائي يعود إلى أستاذ المقرّر.'
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
        <button type="button" className="btn ghost" onClick={requestClose} disabled={submit.isPending}>
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
      {guard}
    </Modal>
  );
}
