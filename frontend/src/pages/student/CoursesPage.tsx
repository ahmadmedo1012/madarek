import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2, AlertTriangle, ClipboardList, Send, X,
  BookOpen, ArrowLeft,
} from 'lucide-react';
import { Badge, FormField } from '../../components/primitives';
import { ProgressBar } from '../../components/primitives';
import {
  PageFrame, PageHeader, SectionHeader, RowList, RowItem, FilterBar,
} from '../../components/patterns';
import { ErrorState, EmptyState, Skeleton } from '../../components/primitives/States';
import { Modal } from '../../components/overlays/Modal';
import { useDiscardGuard } from '../../components/curriculum/AuthoringModal';
import { Icon } from '../../components/Icon';
import { courseIcon, courseTint, ASSIGNMENT_KIND_LABEL } from '../../lib/courseMeta';
import { countAr } from '../../lib/format';
import {
  useMyEnrollments,
  useStudentDashboard,
  useOfferingLectures,
  useSubmitAssignment,
  validateSubmissionDraft,
  apiErrorMessage,
  type MyEnrollment,
  type StudentDashboard,
  type Submission,
} from '../../hooks/useResources';
import { formatDate } from '../../utils/numbers';

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
  /* r157 (W2-F7 / 6A11): attention = started but stalling —
   * 0 < progressPct < 30. A zero-progress course (enrolled, never
   * opened — most of a new term) is «ابدأ» territory, not an alert,
   * and an empty course can never be the student's fault. Both were
   * previously swept into the flag, drowning the 2-3 genuinely
   * stalled cards the filter exists for. */
  if (f === 'attention') return e.progressPct > 0 && e.progressPct < 30;
  return true;
}

/** Honest relative due date with proper Arabic plurals (not "بعد 2 أيّام"). */
function formatDue(iso: string): string {
  const d = new Date(iso);
  const days = Math.round((d.getTime() - Date.now()) / 86_400_000);
  if (days < 0) return formatDate(d, { dateStyle: 'medium' });
  if (days === 0) return 'اليوم';
  if (days === 1) return 'غداً';
  if (days === 2) return 'بعد يومين';
  if (days <= 10) return `بعد ${days} أيام`;
  return formatDate(d, { dateStyle: 'medium' });
}

/** Honest status derived from the real due date — no fabricated urgency. */
function dueStatus(dueAt: string): { label: string; color: 'green' | 'amber' | 'red' } {
  const days = (new Date(dueAt).getTime() - Date.now()) / 86_400_000;
  if (days < 0) return { label: 'فات الموعد', color: 'red' };
  if (days <= 2) return { label: 'يستحق قريباً', color: 'amber' };
  return { label: 'متبقّي وقت', color: 'green' };
}

/** Shape-matched loading skeleton for the course row list (audit 0-d
 *  P2 — the page used a bare spinner where a list fits). */
function CourseListSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <div className="pf-row" key={i} aria-hidden>
          <div className="pf-row-line">
            <Skeleton width={40} height={40} rounded="var(--r-md)" />
            <div className="pf-row-main">
              <Skeleton width="45%" height={15} />
              <Skeleton width="60%" height={11} />
            </div>
            <Skeleton width={140} height={8} rounded="var(--r-full)" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** r221 (4A redesign — Superlist): the course row — the LIST is the
 *  product. Needs a per-offering lectures query (the count scent «٣
 *  محاضرات»); the whole title is the link and the CTA chip is visual
 *  (no nested interactive inside an anchor). */
function CourseRow({ e }: { e: MyEnrollment }) {
  const c = e.offering.course;
  const Cmp = courseIcon(c.code ?? c.name);
  const tint = courseTint(c.themeColor);
  const teacher = `د. ${e.offering.teacher.firstName} ${e.offering.teacher.lastName}`;
  // Lecture count — the same cached list the lecture player's prev/next
  // bar reads (['offerings', id, 'lectures']), so the row's request is
  // amortized across the visit. Fail-soft: no count on error.
  const lecturesQ = useOfferingLectures(e.offering.id);
  const lectureCount = lecturesQ.data?.length;
  return (
    /* r289: الصف كله الوصلة (RowItem to) — صف المقرّر باب دخول كامل
       العرض؛ شارة «تابع/ابدأ» في الطرف تظل داخل الوصلة (علامة
       غنية بلا عنصر تفاعلي متداخل). */
    <RowItem
      to={`/student/courses/${e.offering.id}`}
      leading={
        <span
          className="courses-row-icon"
          style={{
            background: `color-mix(in srgb, ${tint} 14%, var(--surface))`,
            color: `color-mix(in srgb, ${tint} 60%, var(--text))`,
          }}
        >
          <Icon icon={Cmp} size={18} />
        </span>
      }
      title={c.name}
      meta={
        <>
          <Badge><bdi className="font-mono">{c.code}</bdi></Badge>
          {' '}{teacher}
          {lectureCount !== undefined && lectureCount > 0 && (
            <> · {countAr(lectureCount, ['محاضرة واحدة', 'محاضرتان', 'محاضرات', 'محاضرة'])}</>
          )}
          {lectureCount === 0 && <> · بانتظار محتوى المقرّر</>}
        </>
      }
      trailing={
        <span className="courses-row-progress">
          {/* 21-c (A12 P1-3): `color` is the BAR FILL hue (decorative,
              rides the track) — the primitive paints the % readout in
              --text-secondary (8.44:1) after the raw themeColor text
              measured 1.88–3.60:1 on the white cards. */}
          <ProgressBar value={e.progressPct} color={tint} label="الإنجاز" />
          <span className="btn ghost sm courses-row-go">
            {e.progressPct > 0 ? 'تابع' : 'ابدأ'}
            <Icon icon={ArrowLeft} size={12} />
          </span>
        </span>
      }
    />
  );
}

export default function StudentCoursesPage() {
  const { data, isPending, isError, error, refetch } = useMyEnrollments();
  const dashboard = useStudentDashboard();

  const [submitTarget, setSubmitTarget] = useState<{ assignment: AgendaAssignment; offeringId: string } | null>(null);
  const [filter, setFilter] = useState<CourseFilter>('all');

  const upcoming = dashboard.data?.agenda.assignments ?? [];

  const counts: Record<CourseFilter, number> = {
    all: data?.length ?? 0,
    active: data?.filter((e) => matchesFilter(e, 'active')).length ?? 0,
    done: data?.filter((e) => matchesFilter(e, 'done')).length ?? 0,
    attention: data?.filter((e) => matchesFilter(e, 'attention')).length ?? 0,
  };
  const filtered = (data ?? []).filter((e) => matchesFilter(e, filter));

  return (
    <PageFrame width="default">
      <PageHeader
        title="مقرّراتي الدراسية"
        description="جميع المقرّرات التي سجّلت فيها هذا الفصل، مع تقدّمك في كل واحد منها."
      />

      {isPending ? (
        <>
          {/* r173a: the summary-line mirror — the pending placeholder
              keeps the settled line's own box so the data handoff never
              moves the list below. */}
          <p className="courses-summary" aria-busy="true">
            <Skeleton width={220} height={20} rounded="var(--r-sm)" />
          </p>
          <CourseListSkeleton />
        </>
      ) : isError ? (
        <ErrorState error={error} onRetry={() => refetch()} />
      ) : !data?.length ? (
        <EmptyState illustration="empty-courses" icon={BookOpen} title="لم تسجّل في أي مقرّر بعد" description="تواصل مع إدارة الكلّيّة لإكمال تسجيل مقرّرات الفصل — ستظهر هنا فور اعتمادها." />
      ) : (
        <>
          {/* r173a (the r171 VLM «courses header weight» deferred note):
              the stats that used to wear four MetricCards now ride ONE
              light text-muted line. The SAME counts object; the FilterBar
              keeps the per-bucket counts, so a bucket shows here only
              when it is non-zero. */}
          <p className="courses-summary">
            <bdi>{countAr(data.length, ['مقرّر مسجَّل واحد', 'مقرّران مسجّلان', 'مقرّرات مسجَّلة', 'مقرّراً مسجّلاً'])}</bdi>
            {counts.done > 0 && (
              <> · مكتملة <bdi>{counts.done}</bdi></>
            )}
            {counts.active > 0 && (
              <> · قيد التقدّم <bdi>{counts.active}</bdi></>
            )}
            {counts.attention > 0 && (
              <> · بحاجة إلى اهتمام <bdi>{counts.attention}</bdi></>
            )}
          </p>

          {data.length > 1 && (
            <FilterBar
              filters={
                <div className="courses-filter" role="group" aria-label="تصفية المقرّرات حسب الحالة">
                  {FILTERS.map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      className={`pill${filter === f.key ? ' on' : ''}`}
                      aria-pressed={filter === f.key}
                      onClick={() => setFilter(f.key)}
                    >
                      {f.label}
                      <span className="courses-filter-count" aria-hidden>{counts[f.key]}</span>
                    </button>
                  ))}
                </div>
              }
            />
          )}

          {/* key={filter} remounts the list on filter change so the CSS
              re-stagger replays — data refetches alone never replay it. */}
          <RowList key={filter} aria-label="قائمة المقرّرات المسجّلة">
            {filtered.length ? filtered.map((e) => (
              <CourseRow key={e.id} e={e} />
            )) : (
              <EmptyState illustration="empty-courses"
                icon={BookOpen}
                title="لا توجد مقرّرات في هذا التصنيف"
                description="جرّب تصنيفاً آخر من الأزرار أعلاه لعرض مقرّراتك."
              />
            )}
          </RowList>
        </>
      )}

      <section aria-label="الواجبات القادمة">
        <SectionHeader
          title="الواجبات القادمة"
          description="واجباتك المستحقة فعلياً خلال الأسبوع القادم ولم تُسلّمها بعد"
        />
        {dashboard.isPending ? (
          <CourseListSkeleton />
        ) : dashboard.isError ? (
          <ErrorState error={dashboard.error} onRetry={() => dashboard.refetch()} />
        ) : !upcoming.length ? (
          <EmptyState illustration="empty-list"
            icon={ClipboardList}
            title="لا توجد واجبات قادمة"
            description="ستظهر هنا الواجبات المستحقة فور إضافتها من أساتذة مقرّراتك."
          />
        ) : (
          <RowList aria-label="قائمة الواجبات القادمة">
            {upcoming.map((a) => {
              const due = dueStatus(a.dueAt);
              return (
                <RowItem
                  key={a.id}
                  leading={<Icon icon={Send} size={16} className="text-subtle" />}
                  title={<>{ASSIGNMENT_KIND_LABEL[a.type] ?? a.type}: {a.title}</>}
                  meta={<>{a.courseName} · الموعد {formatDue(a.dueAt)}</>}
                  trailing={
                    <>
                      <Badge color={due.color}>{due.label}</Badge>
                      {a.offeringId && (
                        <button
                          type="button"
                          className="btn outline sm"
                          onClick={() => setSubmitTarget({ assignment: a, offeringId: a.offeringId })}
                        >
                          <Icon icon={Send} size={12} /> تسليم
                        </button>
                      )}
                    </>
                  }
                />
              );
            })}
          </RowList>
        )}
      </section>

      {submitTarget && (
        <SubmitAssignmentModal
          key={`${submitTarget.offeringId}:${submitTarget.assignment.id}`}
          assignment={submitTarget.assignment}
          offeringId={submitTarget.offeringId}
          onClose={() => setSubmitTarget(null)}
        />
      )}

    </PageFrame>
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
  /* r170d (WCAG 2.2 — 3.3.1 error identification / focus management): the
   * first invalid control. The shared validation error is announced on the
   * primary answer field (role=alert + aria-describedby + aria-invalid are
   * already wired by FormField); what was missing is the FOCUS move — a
   * keyboard user's focus stayed on the submit button after a failed
   * attempt, forcing a blind Tab hunt for the flagged field. */
  const textAnswerRef = useRef<HTMLTextAreaElement>(null);

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
      // r170d: focus moves to the first invalid field so the error context
      // (and its aria-describedby message) is where the user is looking.
      textAnswerRef.current?.focus();
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
          {formatDate(assignment.dueAt, { dateStyle: 'medium' })}
        </div>

        {done ? (
          <div
            role="status"
            style={{
              padding: 'var(--sp-4)',
              borderRadius: 'var(--r-md)',
              background: late ? 'var(--warning-soft)' : 'var(--success-soft)',
              // R131-F12b (A7 §5-1 sweep): banner ink chains through the
              // -ink tier — base --success/--warning on the soft washes
              // measured 2.53/2.04:1 in light (text, 1.4.3); dark -ink ≡
              // base, so dark is unchanged.
              color: late ? 'var(--warning-ink)' : 'var(--success-ink)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--sp-1)',
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
            {/* r164-e (assessment loop): the timeline's next step is a
                PLACE, not a dead end — the submission now lives on the
                results page until the teacher's grade lands. */}
            <Link to="/student/results" className="text-xs" style={{ color: late ? 'var(--warning-ink)' : 'var(--success-ink)', textDecoration: 'underline' }}>
              تابع حالة التقييم ودرجتك من صفحة النتائج
            </Link>
          </div>
        ) : (
          <>
            {/* r152c (A2): both fields join the FormField canon. The
                shared validation error lives on the primary answer field
                (single role=alert contract preserved for the test pins);
                the URL format copy moves to the hint slot so it is
                ALWAYS associated — the old conditional aria-describedby
                pointed at a hint that rendered unconditionally. */}
            <FormField
              label="إجابتك النصيّة"
              id="submit-text"
              error={validationError ?? undefined}
            >
              <textarea
                ref={textAnswerRef}
                className="input"
                rows={5}
                placeholder="اكتب إجابتك هنا…"
                value={textAnswer}
                onChange={(e) => setTextAnswer(e.target.value)}
                disabled={submit.isPending}
                maxLength={8000}
                style={{ resize: 'vertical', fontFamily: 'inherit' }}
              />
            </FormField>

            <FormField
              label="رابط ملف (اختياري)"
              id="submit-file"
              hint="رابط خارجي اختياري يبدأ بـ https:// إن توفّر لديك (مثل ملف على Drive) — إجابتك النصيّة وحدها تكفي للتسليم."
            >
              <input
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
            </FormField>

            {submit.isError && (
              <p role="alert" className="text-xs" style={{ color: 'var(--danger-ink)', marginTop: 'var(--sp-2)' }}>
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
