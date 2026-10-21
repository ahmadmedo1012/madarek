import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Microscope, FileText, CheckCircle2, X, Sparkles, MessageSquare,
  StickyNote, RefreshCw,
} from 'lucide-react';
import { Badge, UserAvatar, Tabs, FormField } from '../../components/primitives';
import { Skeleton, EmptyState, ErrorState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/overlays/Modal';
import { useDiscardGuard } from '../../components/curriculum/AuthoringModal';
import { toast } from '../../lib/toast';
import { formatDateAr, timeAgoAr } from '../../lib/format';
import {
  useResearchQueue, useGradePaper, usePublishPaper, useMyTeacherProfile,
  useAnnotations, apiErrorMessage,
  type ResearchPaper, type PaperStatus,
} from '../../hooks/useResources';
import { formatInt } from '../../utils/numbers';
import { ScanResults } from '../../components/paper/ScanResults';
import {
  PageFrame, PageHeader, RowList, RowItem, StatLine, SectionHeader,
} from '../../components/patterns';
import type { StatLineItem } from '../../components/patterns';
import '../../styles/research.css';

/* fmtDate (short ar-LY date, '—' for missing values) is
 * lib/format.formatDateAr (13-15 fold, audit 11-f P2-1). The annotation
 * rows render timeAgoAr — the same helper the AnnotationsPanel uses for
 * the very same notes in the PDF reader, so both surfaces agree on one
 * instant (15-h P2-2, 16-E10). */

const STATUS_LABEL: Record<PaperStatus, string> = {
  UPLOADED: 'بانتظار الفحص',
  SCANNING: 'جارٍ الفحص',
  CHECKS_PASSED: 'بانتظار التقييم',
  // r134 فشل→تعذّر family canon — see the student twin (ResearchPage).
  CHECKS_FAILED: 'تعذّر اجتياز الفحص',
  GRADED: 'مُقيَّم',
  PUBLISHED: 'مُنشور',
};

type Tab = 'review' | 'mine';

/** The review-tab KPI trio as a StatLine — the queue's honest counts.
 *  KPIs never show a masked "0" on API-down (ruling #14) — the `down`
 *  flag renders the honest em-dash instead. */
function reviewKpiCells(passed: number, failed: number, readyToPublish: number, down: boolean): StatLineItem[] {
  return [
    {
      label: 'بانتظار تقييمك',
      value: down ? '—' : formatInt(passed),
      hint: 'بحوث اجتازت الفحص',
      tone: passed > 0 ? 'signal' : 'neutral',
    },
    {
      label: 'تعذّر اجتياز الفحص',
      value: down ? '—' : formatInt(failed),
      hint: 'لا تحتاج تقييماً',
      tone: failed > 0 ? 'danger' : 'neutral',
    },
    {
      label: 'جاهزة للنشر',
      value: down ? '—' : formatInt(readyToPublish),
      hint: 'بحوث مُقيَّمة',
      tone: readyToPublish > 0 ? 'positive' : 'neutral',
    },
  ];
}

export default function ResearchReviewPage() {
  const queue = useResearchQueue();
  const [tab, setTab] = useState<Tab>('review');
  const [reviewing, setReviewing] = useState<ResearchPaper | null>(null);

  const passed = (queue.data ?? []).filter((p) => p.status === 'CHECKS_PASSED');
  const failed = (queue.data ?? []).filter((p) => p.status === 'CHECKS_FAILED');
  // r157 / 6A8 — GRADED papers stay in the queue until published: they
  // render in their own section below with the publish CTA (the backend
  // RESEARCH_QUEUE_STATUSES now includes GRADED, so this list is real).
  const graded = (queue.data ?? []).filter((p) => p.status === 'GRADED');
  // Real count replacing the old dead "—" KPI (audit 0-e P2-40) — and
  // r157 / 6A8: it can finally be non-zero (the queue carries GRADED).
  const readyToPublish = graded.length;

  return (
    <PageFrame width="default">
      <PageHeader
        title="البحث العلمي"
        description="قائمة بحوث الطلاب للمراجعة، ومنشوراتك العلمية."
        tabs={
          <Tabs<Tab>
            value={tab}
            onChange={setTab}
            items={[
              { value: 'review', label: `للمراجعة${queue.data ? ` (${passed.length})` : ''}` },
              { value: 'mine', label: 'منشوراتي' },
            ]}
          />
        }
      />

      {tab === 'review' ? (
        <>
          {queue.isPending ? (
            <StatLineSkeleton />
          ) : queue.isError ? (
            <ErrorState
              message="تعذَّر تحميل قائمة المراجعة"
              error={queue.error}
              onRetry={() => queue.refetch()}
            />
          ) : (
            <StatLine items={reviewKpiCells(passed.length, failed.length, readyToPublish, false)} />
          )}

          {/* The queue IS the page: each paper is a row with its scan
              facts and actions attached. */}
          <section className="flex-col gap-2" aria-label="قائمة المراجعة">
            <SectionHeader
              title="قائمة المراجعة"
              description="بحوث الطلاب التي اجتازت الفحص التجريبي (محاكاة) وبانتظار تقييمك"
              as="h2"
            />
            {queue.isPending ? (
              <RowList aria-label="قائمة المراجعة" loading />
            ) : !queue.isError && !passed.length ? (
              <EmptyState illustration="empty-research"
                icon={CheckCircle2}
                title="لا بحوث في الانتظار"
                description="ستظهر هنا بحوث الطلاب فور اجتيازها الفحص التجريبي (محاكاة) للانتحال والمحتوى الآلي."
              />
            ) : (
              <RowList aria-label="قائمة المراجعة">
                {passed.map((p) => (
                  <ReviewRow key={p.id} paper={p} onOpen={() => setReviewing(p)} />
                ))}
              </RowList>
            )}
          </section>

          {failed.length > 0 && (
            <section className="flex-col gap-2" aria-label="بحوث رفضها الفحص">
              <SectionHeader
                title="رفضها الفحص التجريبي (محاكاة)"
                description="بحوث تجاوزت الحدود التجريبية — لا تحتاج تقييماً"
                as="h2"
              />
              <RowList aria-label="بحوث رفضها الفحص">
                {failed.map((p) => (
                  <ReviewRow key={p.id} paper={p} onOpen={() => setReviewing(p)} />
                ))}
              </RowList>
            </section>
          )}

          {/* r157 / 6A8 — the publish loop's missing half: GRADED papers
              render here with the publish CTA; the KPI «جاهزة للنشر»
              finally counts something reachable. */}
          {graded.length > 0 && (
            <section className="flex-col gap-2" aria-label="بحوث جاهزة للنشر">
              <SectionHeader
                title="مُقيَّمة — جاهزة للنشر"
                description="بحوث قُيِّمت ويمكن نشرها في مكتبة الجامعة — النشر خطوة صريحة من مراجعة كل بحث"
                as="h2"
              />
              <RowList aria-label="بحوث جاهزة للنشر">
                {graded.map((p) => (
                  <GradedRow key={p.id} paper={p} onOpen={() => setReviewing(p)} />
                ))}
              </RowList>
            </section>
          )}
        </>
      ) : (
        <MyPublications />
      )}

      {reviewing && (
        <ReviewModal paper={reviewing} onClose={() => setReviewing(null)} />
      )}
    </PageFrame>
  );
}

/** Shape-matched skeleton for the 3-cell stat line (label / value /
 * hint — the anatomy StatLine renders). */
function StatLineSkeleton() {
  return (
    <div className="pf-statline" aria-busy="true" aria-live="polite">
      {[0, 1, 2].map((i) => (
        <div key={i} className="pf-stat" aria-hidden>
          <Skeleton width={90} height={11} />
          <div style={{ marginBlock: 'var(--sp-1)' }}>
            <Skeleton width={60} height={24} />
          </div>
          <Skeleton width={110} height={11} />
        </div>
      ))}
    </div>
  );
}

/* One queue row — the paper's facts attached: who, what, scan numbers,
 * and the row's next action. The scan cells live in the row body (the
 * declared-simulation presentation shared with the student surface),
 * open by default so the decision needs no click. */
function ReviewRow({ paper, onOpen }: { paper: ResearchPaper; onOpen: () => void }) {
  const initials = paper.student.avatarInitials ?? `${paper.student.firstName[0]}${paper.student.lastName[0]}`;
  return (
    <RowItem
      leading={<UserAvatar initials={initials} color={paper.student.avatarColor ?? undefined} size={36} />}
      title={paper.title}
      meta={
        <>
          <span>{paper.student.firstName} {paper.student.lastName}</span>
          {paper.offering && (
            <>
              <span aria-hidden="true">·</span>
              <span>{paper.offering.course.name} (<bdi className="font-mono">{paper.offering.course.code}</bdi>)</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>رُفع {formatDateAr(paper.uploadedAt)}</span>
        </>
      }
      trailing={
        <Badge color={paper.status === 'CHECKS_PASSED' ? 'amber' : 'red'}>
          {STATUS_LABEL[paper.status]}
        </Badge>
      }
      defaultExpanded
      expandLabel={`تفاصيل البحث: ${paper.title}`}
    >
      <div className="flex-col gap-3">
        <ScanResults
          plagiarismPct={paper.plagiarismPct}
          aiContentPct={paper.aiContentPct}
          note="النسب كما حسبها الفحص التجريبي — لا تحتاج تقييماً منك."
        />
        <div className="rs-review-actions">
          <button type="button" className="btn primary sm" onClick={onOpen}>
            <Icon icon={FileText} size={13} />
            مراجعة وتقييم
          </button>
          {paper.fileUrl && (
            <RouterLink
              to={`/document/${encodeURIComponent(paper.fileUrl.split('/').pop() ?? '')}?title=${encodeURIComponent(paper.title)}&back=${encodeURIComponent('/teacher/research')}&paper=${encodeURIComponent(paper.id)}`}
              className="btn outline sm"
            >
              <Icon icon={MessageSquare} size={13} />
              قراءة وكتابة ملاحظات
            </RouterLink>
          )}
        </div>
      </div>
    </RowItem>
  );
}

/* r157 / 6A8 — one GRADED row: the score travels on the row, and the
 * CTA opens the review modal where publishing stays an EXPLICIT footer
 * action (an accidental Enter must never publish a paper to the public
 * archive). */
function GradedRow({ paper, onOpen }: { paper: ResearchPaper; onOpen: () => void }) {
  const initials = paper.student.avatarInitials ?? `${paper.student.firstName[0]}${paper.student.lastName[0]}`;
  return (
    <RowItem
      leading={<UserAvatar initials={initials} color={paper.student.avatarColor ?? undefined} size={36} />}
      title={paper.title}
      meta={
        <>
          <span>{paper.student.firstName} {paper.student.lastName}</span>
          {paper.offering && (
            <>
              <span aria-hidden="true">·</span>
              <span>{paper.offering.course.name} (<bdi className="font-mono">{paper.offering.course.code}</bdi>)</span>
            </>
          )}
          <span aria-hidden="true">·</span>
          <span>قُيِّم {paper.gradedAt ? formatDateAr(paper.gradedAt) : formatDateAr(paper.uploadedAt)}</span>
        </>
      }
      trailing={
        <>
          <Badge color="gold">{STATUS_LABEL[paper.status]}</Badge>
          <span className="rs-row-date">
            الدرجة: <bdi className="font-mono">{formatInt(paper.grade ?? 0)}</bdi> / <bdi className="font-mono">20</bdi>
          </span>
        </>
      }
      defaultExpanded
      expandLabel={`تفاصيل البحث: ${paper.title}`}
    >
      <div className="rs-review-actions">
        <button type="button" className="btn primary sm" onClick={onOpen}>
          <Icon icon={Sparkles} size={13} />
          نشر في المكتبة
        </button>
        {paper.fileUrl && (
          <RouterLink
            to={`/document/${encodeURIComponent(paper.fileUrl.split('/').pop() ?? '')}?title=${encodeURIComponent(paper.title)}&back=${encodeURIComponent('/teacher/research')}&paper=${encodeURIComponent(paper.id)}`}
            className="btn outline sm"
          >
            <Icon icon={MessageSquare} size={13} />
            قراءة وكتابة ملاحظات
          </RouterLink>
        )}
      </div>
    </RowItem>
  );
}

function ReviewModal({ paper, onClose }: { paper: ResearchPaper; onClose: () => void }) {
  const grade = useGradePaper();
  const publish = usePublishPaper();
  const annotations = useAnnotations(paper.id);
  const initialScore = paper.grade ?? 15;
  const initialFeedback = paper.feedback ?? '';
  const [score, setScore] = useState<number>(initialScore);
  const [feedback, setFeedback] = useState<string>(initialFeedback);
  // Inline, action-named feedback (audit 0-e P0-11): both mutations used to
  // await mutateAsync with no catch — an API failure was an unhandled
  // rejection while the modal kept looking usable.
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const isGraded = paper.status === 'GRADED' || paper.status === 'PUBLISHED';
  const busy = grade.isPending || publish.isPending;

  // 15-e P1-6 — this is one of the three longest unsaved-prose modals
  // (up to a full review write-up): Esc / X / cancel / overlay click
  // route through the shared discard confirm while edits exist instead
  // of silently destroying the draft. A pending save still closes
  // freely (existing parity with the curriculum builders).
  const { requestClose, escapeLocked, guard } = useDiscardGuard({
    dirty: score !== initialScore || feedback !== initialFeedback,
    pending: busy,
    onClose,
  });

  const submit = async () => {
    setGradeError(null);
    try {
      await grade.mutateAsync({ id: paper.id, grade: score, feedback: feedback || undefined });
      onClose();
      toast.success('صار البحث مُقيَّماً؛ يمكنك نشره في المكتبة من صفحة البحوث.', {
        title: 'تمّ حفظ التقييم',
      });
    } catch (err) {
      setGradeError(apiErrorMessage(err, 'تعذَّر حفظ التقييم — تحقّق من اتصالك ثم أعد المحاولة.'));
    }
  };
  const publishNow = async () => {
    setPublishError(null);
    try {
      await publish.mutateAsync(paper.id);
      onClose();
      toast.success('أصبح البحث متاحاً للطلاب في مكتبة الجامعة.', {
        title: 'تمّ نشر البحث',
      });
    } catch (err) {
      setPublishError(apiErrorMessage(err, 'تعذَّر نشر البحث في المكتبة — تحقّق من اتصالك ثم أعد المحاولة.'));
    }
  };

  // r157 / 6A9 — the form contract: the grade fields live inside a real
  // <form>, so Enter in the score/notes submits the grade (the
  // GradeSubmissionModal contract; every long-form grading surface now
  // agrees). In GRADED/PUBLISHED mode Enter no-ops BY DESIGN: publishing
  // is an EXPLICIT footer action — an accidental Enter must never be one
  // keystroke away from the public archive.
  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (busy || isGraded) return;
    void submit();
  };

  const annotationRows = annotations.data
    ? [...annotations.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];

  return (
    <Modal open onClose={requestClose} ariaLabel="مراجعة بحث" closeOnOverlayClick={!busy} closeOnEscape={!escapeLocked}>
      <div className="modal-header">
        <div className="modal-title">مراجعة بحث</div>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="إغلاق" disabled={busy}>
          <Icon icon={X} size={16} />
        </button>
      </div>
      {/* r157 / 6A9 — fields + actions ride one <form> (Enter submits
          the grade; graded-mode Enter is the guarded no-op above). */}
      <form onSubmit={onFormSubmit} noValidate>
      <div className="modal-body">
        <div className="text-xs text-subtle">{paper.student.firstName} {paper.student.lastName}</div>
        <div className="text-md font-semibold" style={{ color: 'var(--text)', marginBlockEnd: 'var(--sp-4)' }}>{paper.title}</div>

        {paper.abstract && (
          <>
            <div className="section-title">الملخّص</div>
            <p className="text-sm text-muted" style={{ lineHeight: 'var(--lh-loose)', marginBlockEnd: 'var(--sp-4)' }}>
              {paper.abstract}
            </p>
          </>
        )}

        <div className="section-title">نتائج الفحص الأوتوماتيكي</div>
        {/* The declared-simulation cells (shared with the student row) —
            the grading form lives OUTSIDE them. */}
        <div style={{ marginBlockEnd: 'var(--sp-4)' }}>
          <ScanResults
            plagiarismPct={paper.plagiarismPct}
            aiContentPct={paper.aiContentPct}
            note="قيم الفحص تجريبية معلنة — ليست قياساً فعلياً حتى تفعيل كشف حقيقي."
          />
        </div>

        <div className="section-title">التقييم</div>
        {/* 23-b (21-b hand-off, A9 P2-4): the review form rides the
            shared FormField primitive — labels stay htmlFor-wired. */}
        <div className="form-grid-2" style={{ marginBlockEnd: 'var(--sp-4)' }}>
          <FormField label="الدرجة (من 20)">
            <input
              type="number"
              min={0}
              max={20}
              step={0.5}
              inputMode="decimal"
              className="input"
              value={score}
              onChange={(e) => setScore(Math.max(0, Math.min(20, Number(e.target.value))))}
              disabled={isGraded || grade.isPending}
            />
          </FormField>
          <FormField label="التقدير">
            <input
              type="text"
              className="input"
              value={
                score >= 17 ? 'ممتاز' :
                score >= 14 ? 'جيد جداً' :
                score >= 12 ? 'جيد' :
                score >= 10 ? 'مقبول' : 'ضعيف'
              }
              disabled
              readOnly
            />
          </FormField>
        </div>

        <FormField label="ملاحظات للطالب">
          <textarea
            rows={4}
            className="input"
            placeholder="اكتب ملاحظاتك على البحث…"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={isGraded || grade.isPending}
            // r165b: mirror the backend cap — gradePaperSchema pins
            // feedback at z.string().trim().max(4000) (learning.routes.ts).
            maxLength={4000}
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
        </FormField>

        {/* Margin notes the teacher left on the document — the newest one
            pulses once (the page's authored moment): returning from the
            reader with a fresh note, the highlight lands on it. */}
        {annotations.data && annotationRows.length > 0 && (
          <>
            <div className="section-title">
              <Icon icon={StickyNote} size={13} /> ملاحظات على البحث ({annotationRows.length})
            </div>
            <div className="flex-col gap-2" style={{ marginBlockEnd: 'var(--sp-2)' }}>
              {annotationRows.map((a, i) => (
                <div key={a.id} className={`annotation-row${i === 0 ? ' is-newest' : ''}`}>
                  <span className="annotation-row-icon" aria-hidden>
                    <Icon icon={StickyNote} size={13} />
                  </span>
                  <div className="flex-1">
                    <div className="text-sm">{a.comment}</div>
                    <div className="text-xxs text-subtle">
                      {a.author.firstName} {a.author.lastName} · صفحة <bdi>{a.page}</bdi> · {timeAgoAr(a.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        {annotations.isPending && (
          <div className="flex-col gap-2" aria-busy="true" aria-live="polite" style={{ marginBlockStart: 'var(--sp-3)' }}>
            <Skeleton width="70%" height={12} />
            <Skeleton width="40%" height={10} />
          </div>
        )}
        {annotations.isError && (
          <div className="inline-retry" role="alert" style={{ marginBlockStart: 'var(--sp-3)' }}>
            <span className="text-xs text-muted">تعذَّر تحميل الملاحظات على البحث.</span>
            <button type="button" className="btn ghost sm" onClick={() => annotations.refetch()}>
              <Icon icon={RefreshCw} size={12} /> إعادة المحاولة
            </button>
          </div>
        )}

        {(gradeError || publishError) && (
          <div className="form-feedback fail" role="alert" style={{ marginBlockStart: 'var(--sp-4)' }}>
            <Icon icon={X} size={14} />
            <span className="flex-1">{gradeError ?? publishError}</span>
          </div>
        )}
      </div>
      <div className="modal-footer">
        {!isGraded ? (
          <>
            <button type="button" className="btn ghost" onClick={requestClose} disabled={busy}>إلغاء</button>
            <button type="submit" className="btn primary" disabled={busy}>
              <Icon icon={CheckCircle2} size={14} />
              {grade.isPending ? 'جارٍ الحفظ…' : 'تأكيد التقييم'}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn ghost" onClick={requestClose} disabled={busy}>إغلاق</button>
            {/* Publish stays type=button — an explicit click, never an
                implicit form submit (the same guard as onFormSubmit). */}
            {paper.status === 'GRADED' && (
              <button type="button" className="btn primary" onClick={() => void publishNow()} disabled={busy}>
                <Icon icon={Sparkles} size={14} />
                {publish.isPending ? 'جارٍ النشر…' : 'نشر في المكتبة'}
              </button>
            )}
          </>
        )}
      </div>
      </form>
      {guard}
    </Modal>
  );
}

/* ─── Teacher's own publications (real teacher profile data) ─── */
function MyPublications() {
  const profile = useMyTeacherProfile();
  const publications = profile.data?.publications ?? [];
  const certifications = profile.data?.certifications ?? [];
  const awards = profile.data?.awards ?? [];

  if (profile.isPending) {
    return (
      <>
        <StatLineSkeleton />
        <div className="flex-col gap-2" aria-busy="true" aria-live="polite">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-3" aria-hidden>
              <Skeleton width={40} height={12} />
              <Skeleton width={`${60 - i * 10}%`} height={14} />
            </div>
          ))}
        </div>
      </>
    );
  }
  if (profile.isError) {
    return (
      <ErrorState
        message="تعذَّر تحميل منشوراتك"
        error={profile.error}
        onRetry={() => profile.refetch()}
      />
    );
  }

  return (
    <>
      <StatLine
        items={[
          {
            label: 'منشورات في ملفّك',
            value: formatInt(publications.length),
            hint: publications.length === 0 ? 'لم تُسجَّل بعد' : 'في ملفك الأكاديمي',
          },
          {
            label: 'شهادات وجوائز',
            value: formatInt(certifications.length + awards.length),
          },
          {
            label: 'سنوات الخبرة',
            value: formatInt(profile.data?.yearsExperience ?? 0),
          },
        ]}
      />
      <section className="flex-col gap-2" aria-label="منشوراتي">
        <SectionHeader title="منشوراتي" as="h2" />
        {publications.length === 0 ? (
          <EmptyState illustration="empty-research"
            icon={Microscope}
            title="لم تُسجَّل منشورات بعد"
            description="حدِّث ملفك الأكاديميّ لإضافة بحوثك المنشورة."
            action={
              <RouterLink to="/teacher/profile" className="btn outline sm">
                <Icon icon={FileText} size={13} />
                تحديث الملف الأكاديمي
              </RouterLink>
            }
          />
        ) : (
          <RowList aria-label="منشوراتي">
            {publications.map((p, i) => (
              <RowItem
                key={`${p.title}-${i}`}
                leading={<bdi className="rs-row-date font-mono">{p.year}</bdi>}
                title={p.title}
                meta={p.venue ?? undefined}
                trailing={p.url ? (
                  <a href={p.url} target="_blank" rel="noreferrer" className="btn ghost sm">
                    فتح
                  </a>
                ) : undefined}
              />
            ))}
          </RowList>
        )}
      </section>
    </>
  );
}
