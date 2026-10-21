import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Microscope, FileText, CheckCircle2, X, Sparkles, MessageSquare,
  StickyNote, RefreshCw, ClipboardCheck,
} from 'lucide-react';
import { Badge, UserAvatar, Tabs, FormField } from '../../components/primitives';
import { Skeleton, EmptyState, ErrorState } from '../../components/primitives/States';
import { Sheet } from '../../components/overlays';
import { Icon } from '../../components/Icon';
import { ConfirmDialog } from '../../components/owner/ConfirmDialog';
import { useIsNarrowLayout } from '../../hooks/useIsNarrowLayout';
import { toast } from '../../lib/toast';
import { formatDateAr, timeAgoAr, apiErrorMessage } from '../../lib/format';
import {
  useResearchQueue, useGradePaper, usePublishPaper, useMyTeacherProfile,
  useAnnotations,
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

/** The paper's status → badge tone (the work-queue binary + the graded
 * gold — the r299 queue convention). */
function statusTone(status: PaperStatus): 'amber' | 'red' | 'gold' {
  if (status === 'CHECKS_FAILED') return 'red';
  if (status === 'GRADED' || status === 'PUBLISHED') return 'gold';
  return 'amber';
}

/** Deep link to the reader — the same mint every research surface uses
 * (title + back context + paper id for the annotations panel). */
function readerPathFor(paper: ResearchPaper, back: string): string | null {
  if (!paper.fileUrl) return null;
  return `/document/${encodeURIComponent(paper.fileUrl.split('/').pop() ?? '')}` +
    `?title=${encodeURIComponent(paper.title)}&back=${encodeURIComponent(back)}&paper=${encodeURIComponent(paper.id)}`;
}

export default function ResearchReviewPage() {
  const queue = useResearchQueue();
  const [tab, setTab] = useState<Tab>('review');
  const isNarrow = useIsNarrowLayout(920);

  const passed = useMemo(
    () => (queue.data ?? []).filter((p) => p.status === 'CHECKS_PASSED')
      // Priority = the wait itself: oldest submissions surface first
      // (the r299 queue convention — age is the triage signal).
      .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt)),
    [queue.data],
  );
  const failed = useMemo(
    () => (queue.data ?? []).filter((p) => p.status === 'CHECKS_FAILED')
      .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt)),
    [queue.data],
  );
  // r157 / 6A8 — GRADED papers stay in the queue until published: they
  // render in their own section below with the publish CTA (the backend
  // RESEARCH_QUEUE_STATUSES now includes GRADED, so this list is real).
  const graded = useMemo(
    () => (queue.data ?? []).filter((p) => p.status === 'GRADED')
      .sort((a, b) => a.uploadedAt.localeCompare(b.uploadedAt)),
    [queue.data],
  );
  // Real count replacing the old dead "—" KPI (audit 0-e P2-40) — and
  // r157 / 6A8: it can finally be non-zero (the queue carries GRADED).
  const readyToPublish = graded.length;

  const allPapers = useMemo(() => queue.data ?? [], [queue.data]);
  /* The document/review split state: one selected paper; its draft
     (score + feedback) lives at the page so a paper switch can be
     guarded honestly. */
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftScore, setDraftScore] = useState<number | null>(null);
  const [draftFeedback, setDraftFeedback] = useState<string | null>(null);
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const selected = allPapers.find((p) => p.id === selectedId) ?? null;
  const isGradedSelected = selected?.status === 'GRADED' || selected?.status === 'PUBLISHED';
  const dirty = selected
    ? draftScore !== (selected.grade ?? 15) ||
      draftFeedback !== (selected.feedback ?? '')
    : false;
  const [pendingConfirm, setPendingConfirm] = useState<
    { kind: 'switch'; nextId: string } | { kind: 'close' } | null
  >(null);

  /* Draft re-seats itself whenever the selection changes (fresh paper →
     fresh draft); a grade success updates the cached paper, so `dirty`
     falls back to false with no extra bookkeeping. */
  useEffect(() => {
    if (selected) {
      setDraftScore(selected.grade ?? 15);
      setDraftFeedback(selected.feedback ?? '');
    } else {
      setDraftScore(null);
      setDraftFeedback(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-seat on selection change only
  }, [selectedId]);

  /* A published paper leaves the queue — if it was selected, the split
     closes instead of showing a ghost. */
  useEffect(() => {
    if (selectedId && !selected) setSelectedId(null);
  }, [selectedId, selected]);

  /* Desktop courtesy: the split should never open empty while work
     waits — the oldest pending paper is preselected once, on the first
     resolved load. Mobile keeps the explicit tap (the Sheet is a
     deliberate act). */
  useEffect(() => {
    if (queue.isPending || queue.isError) return;
    if (selectedId || typeof window === 'undefined') return;
    if (window.matchMedia('(min-width: 921px)').matches && passed.length > 0) {
      setSelectedId(passed[0]!.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-time courtesy on first resolved load
  }, [queue.isPending, queue.isError]);

  /* Unload guard while a review draft is unsaved — the same contract as
     useDiscardGuard (the close paths here are selection switches, so
     the hook's modal-bound guard does not apply directly). */
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  /** Guarded selection switch — an edited draft confirms first. */
  const attemptSelect = (paper: ResearchPaper) => {
    if (paper.id === selectedId) return;
    if (dirty) {
      setPendingConfirm({ kind: 'switch', nextId: paper.id });
      return;
    }
    setSelectedId(paper.id);
  };

  /** Guarded mobile-sheet close. */
  const attemptClose = () => {
    if (dirty) {
      setPendingConfirm({ kind: 'close' });
      return;
    }
    setSelectedId(null);
  };

  const grade = useGradePaper();
  const publish = usePublishPaper();
  const busy = grade.isPending || publish.isPending;

  const submitGrade = async () => {
    if (!selected || isGradedSelected || draftScore === null) return;
    setGradeError(null);
    try {
      await grade.mutateAsync({ id: selected.id, grade: draftScore, feedback: draftFeedback || undefined });
      toast.success('صار البحث مُقيَّماً؛ يمكنك نشره في المكتبة من قسم «جاهزة للنشر».', {
        title: 'تمّ حفظ التقييم',
      });
    } catch (err) {
      setGradeError(apiErrorMessage(err, 'تعذَّر حفظ التقييم — تحقّق من اتصالك ثم أعد المحاولة.'));
    }
  };

  const publishNow = async () => {
    if (!selected) return;
    setPublishError(null);
    try {
      await publish.mutateAsync(selected.id);
      toast.success('أصبح البحث متاحاً للطلاب في مكتبة الجامعة.', {
        title: 'تمّ نشر البحث',
      });
    } catch (err) {
      setPublishError(apiErrorMessage(err, 'تعذَّر نشر البحث في المكتبة — تحقّق من اتصالك ثم أعد المحاولة.'));
    }
  };

  // r157 / 6A9 — the form contract: the grade fields live inside a real
  // <form>, so Enter in the score/notes submits the grade (the
  // GradeSubmissionModal contract). In GRADED/PUBLISHED mode Enter
  // no-ops BY DESIGN: publishing is an EXPLICIT action — an accidental
  // Enter must never be one keystroke away from the public archive.
  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (busy || isGradedSelected) return;
    void submitGrade();
  };

  const workspace = selected ? (
    <ReviewWorkspace
      paper={selected}
      isGraded={isGradedSelected}
      score={draftScore ?? (selected.grade ?? 15)}
      onScore={setDraftScore}
      feedback={draftFeedback ?? ''}
      onFeedback={setDraftFeedback}
      gradeError={gradeError}
      publishError={publishError}
      busy={busy}
      gradePending={grade.isPending}
      publishPending={publish.isPending}
      onSubmitGrade={onFormSubmit}
      onPublish={() => void publishNow()}
    />
  ) : null;

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

          {queue.isPending ? (
            <SplitSkeleton />
          ) : !queue.isError ? (
            <div className="rs-review-split">
              {/* ── The queue — triage: priority (oldest wait first),
                  status, and the wait age per paper. The selected row
                  carries the accent ground. ── */}
              <div className="rs-review-queue">
                <section className="flex-col gap-2" aria-label="بانتظار التقييم">
                  <SectionHeader
                    title="بانتظار تقييمك"
                    description="بحوث اجتازت الفحص التجريبي (محاكاة) — مرتّبة بالأقدم انتظاراً"
                    as="h2"
                  />
                  {passed.length === 0 ? (
                    <EmptyState illustration="empty-research"
                      icon={CheckCircle2}
                      title="لا بحوث في الانتظار"
                      description="ستظهر هنا بحوث الطلاب فور اجتيازها الفحص التجريبي (محاكاة) للانتحال والمحتوى الآلي."
                    />
                  ) : (
                    <div className="flex-col gap-2">
                      {passed.map((p) => (
                        <QueueItem key={p.id} paper={p} selected={p.id === selectedId} onSelect={() => attemptSelect(p)} />
                      ))}
                    </div>
                  )}
                </section>

                {failed.length > 0 && (
                  <section className="flex-col gap-2" aria-label="بحوث رفضها الفحص">
                    <SectionHeader
                      title="رفضها الفحص التجريبي (محاكاة)"
                      description="بحوث تجاوزت الحدود التجريبية — لا تحتاج تقييماً"
                      as="h2"
                    />
                    <div className="flex-col gap-2">
                      {failed.map((p) => (
                        <QueueItem key={p.id} paper={p} selected={p.id === selectedId} onSelect={() => attemptSelect(p)} />
                      ))}
                    </div>
                  </section>
                )}

                {/* r157 / 6A8 — the publish loop's missing half: GRADED
                    papers render here; publishing stays an EXPLICIT
                    action inside the workspace. */}
                {graded.length > 0 && (
                  <section className="flex-col gap-2" aria-label="بحوث جاهزة للنشر">
                    <SectionHeader
                      title="مُقيَّمة — جاهزة للنشر"
                      description="بحوث قُيِّمت ويمكن نشرها في مكتبة الجامعة"
                      as="h2"
                    />
                    <div className="flex-col gap-2">
                      {graded.map((p) => (
                        <QueueItem key={p.id} paper={p} selected={p.id === selectedId} onSelect={() => attemptSelect(p)} />
                      ))}
                    </div>
                  </section>
                )}
              </div>

              {/* ── The workspace — document facts / your grade / the
                  margin notes, three distinct territories. Desktop: a
                  sticky panel beside the queue. Mobile: the same
                  component rides a bottom Sheet (below). ── */}
              <div className="rs-review-work" aria-live="polite">
                {workspace ?? (
                  <EmptyState
                    icon={ClipboardCheck}
                    title="اختر بحثاً من القائمة"
                    description="تظهر نتائج الفحص ونموذج التقييم وملاحظاتك على المستند هنا."
                  />
                )}
              </div>
            </div>
          ) : null}

          {/* Mobile recomposition: the queue fills the page; the same
              workspace rides a full bottom Sheet behind one tap — no
              overlap with the queue, no second layout. */}
          {isNarrow && selected && (
            <Sheet
              open
              onClose={attemptClose}
              side="bottom"
              size="full"
              ariaLabel="مراجعة بحث"
              title="مراجعة بحث"
            >
              {workspace}
            </Sheet>
          )}

          {/* The guarded paths: switching papers (or closing the mobile
              sheet) while the grade draft is edited confirms first —
              the same discard contract as every authoring modal. */}
          {pendingConfirm && (
            <ConfirmDialog
              open
              title="تعديلات غير محفوظة"
              message="لديك تقييم لم تحفظه بعد. التبديل أو الإغلاق الآن يتخلّى عنه نهائياً."
              confirmLabel="التخلّي عن التعديلات"
              cancelLabel="متابعة التحرير"
              danger
              onConfirm={() => {
                if (pendingConfirm.kind === 'switch') setSelectedId(pendingConfirm.nextId);
                else setSelectedId(null);
                setPendingConfirm(null);
              }}
              onCancel={() => setPendingConfirm(null)}
            />
          )}
        </>
      ) : (
        <MyPublications />
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

/** Shape-matched split skeleton — queue rows + the workspace panel's
 * shell, so the resolved layout doesn't reflow the page. */
function SplitSkeleton() {
  return (
    <div className="rs-review-split" aria-busy="true" aria-live="polite">
      <div className="flex-col gap-2" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="rs-queue-item" style={{ cursor: 'default' }}>
            <Skeleton width={36} height={36} rounded="var(--r-full)" />
            <div className="rs-queue-item-main">
              <Skeleton width="70%" height={13} />
              <Skeleton width="45%" height={10} />
            </div>
          </div>
        ))}
      </div>
      <div className="rs-review-work" aria-hidden>
        <Skeleton width="55%" height={18} />
        <Skeleton width="100%" height={90} />
        <Skeleton width="40%" height={12} />
        <Skeleton width="100%" height={70} />
      </div>
    </div>
  );
}

/* ─── Queue item — the triage row ───────────────────────────────────
   A real button (the whole surface selects), carrying who/what/status
   and — for pending papers — the honest wait age (priority reads
   without opening anything). */
function QueueItem({ paper, selected, onSelect }: {
  paper: ResearchPaper;
  selected: boolean;
  onSelect: () => void;
}) {
  const initials = paper.student.avatarInitials ?? `${paper.student.firstName[0]}${paper.student.lastName[0]}`;
  const waiting = paper.status === 'CHECKS_PASSED';
  const waitDays = (Date.now() - new Date(paper.uploadedAt).getTime()) / 86_400_000;
  return (
    <button
      type="button"
      className={`rs-queue-item${selected ? ' on' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${paper.title} — ${STATUS_LABEL[paper.status]}`}
    >
      <UserAvatar initials={initials} color={paper.student.avatarColor ?? undefined} size={36} />
      <span className="rs-queue-item-main">
        <span className="rs-queue-item-title">{paper.title}</span>
        <span className="rs-queue-item-meta">
          <span>{paper.student.firstName} {paper.student.lastName}</span>
          {paper.offering && (
            <>
              <span aria-hidden="true">·</span>
              <span><bdi className="font-mono">{paper.offering.course.code}</bdi></span>
            </>
          )}
        </span>
      </span>
      <span className="rs-queue-item-tail">
        <Badge color={statusTone(paper.status)}>
          {STATUS_LABEL[paper.status]}
        </Badge>
        {waiting && (
          <span className={`rs-wait${waitDays >= 7 ? ' is-old' : ''}`}>
            بانتظار {timeAgoAr(paper.uploadedAt)}
          </span>
        )}
        {(paper.status === 'GRADED' || paper.status === 'PUBLISHED') && paper.grade != null && (
          <span className="rs-wait font-mono"><bdi>{formatInt(paper.grade)}</bdi>/20</span>
        )}
      </span>
    </button>
  );
}

/* ─── The review workspace — the split's review half ────────────────
   Three labelled territories separated by hairlines:
     1. «نتائج الفحص الأوتوماتيكي» — the declared simulation cells.
     2. «تقييمك» — the grade form (score + computed band + notes); a
        real <form>, Enter submits (graded mode: guarded no-op).
     3. «ملاحظات على البحث» — the margin-notes thread, distinct from
        the feedback controls; the reader link rides the action row.
   One component for BOTH compositions: the desktop sticky panel and
   the mobile bottom Sheet render the same content. */
function ReviewWorkspace({
  paper, isGraded, score, onScore, feedback, onFeedback,
  gradeError, publishError, busy, gradePending, publishPending,
  onSubmitGrade, onPublish,
}: {
  paper: ResearchPaper;
  isGraded: boolean;
  score: number;
  onScore: (n: number) => void;
  feedback: string;
  onFeedback: (s: string) => void;
  gradeError: string | null;
  publishError: string | null;
  busy: boolean;
  gradePending: boolean;
  publishPending: boolean;
  onSubmitGrade: (e: FormEvent) => void;
  onPublish: () => void;
}) {
  const initials = paper.student.avatarInitials ?? `${paper.student.firstName[0]}${paper.student.lastName[0]}`;
  const readerPath = readerPathFor(paper, '/teacher/research');
  return (
    <div className="rs-review-sheet-body">
      <div className="rs-review-work-head">
        <UserAvatar initials={initials} color={paper.student.avatarColor ?? undefined} size={40} />
        <div className="flex-col gap-1" style={{ flex: 1, minWidth: 0 }}>
          <h3 className="rs-review-work-title">{paper.title}</h3>
          <div className="rs-review-work-sub">
            {paper.student.firstName} {paper.student.lastName}
            {paper.offering && (
              <> · {paper.offering.course.name} (<bdi className="font-mono">{paper.offering.course.code}</bdi>)</>
            )}
            {' '}· رُفع {formatDateAr(paper.uploadedAt)}
          </div>
        </div>
        <Badge color={statusTone(paper.status)}>
          {STATUS_LABEL[paper.status]}
        </Badge>
      </div>

      {/* r157 / 6A9 — fields + actions ride one <form> (Enter submits
          the grade; graded-mode Enter is the guarded no-op above).
          display:contents keeps the form's two sections inside the
          host's flex rhythm while preserving real form semantics. */}
      <form onSubmit={onSubmitGrade} noValidate style={{ display: 'contents' }}>
        <section className="rs-work-section" aria-label="نتائج الفحص الأوتوماتيكي">
          <div className="section-title">نتائج الفحص الأوتوماتيكي</div>
          <ScanResults
            plagiarismPct={paper.plagiarismPct}
            aiContentPct={paper.aiContentPct}
            note="قيم الفحص تجريبية معلنة — ليست قياساً فعلياً حتى تفعيل كشف حقيقي."
          />
        </section>

        <section className="rs-work-section" aria-label="تقييمك">
          <div className="section-title">تقييمك</div>
          <div className="form-grid-2">
            <FormField label="الدرجة (من 20)">
              <input
                type="number"
                min={0}
                max={20}
                step={0.5}
                inputMode="decimal"
                className="input"
                value={score}
                onChange={(e) => onScore(Math.max(0, Math.min(20, Number(e.target.value))))}
                disabled={isGraded || gradePending}
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
              onChange={(e) => onFeedback(e.target.value)}
              disabled={isGraded || gradePending}
              // r165b: mirror the backend cap — gradePaperSchema pins
              // feedback at z.string().trim().max(4000) (learning.routes.ts).
              maxLength={4000}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </FormField>

          {/* The action row — grade vs publish are DIFFERENT verbs in
              DIFFERENT states; publish stays type=button (an explicit
              click, never an implicit form submit). */}
          <div className="rs-review-actions" style={{ marginBlockStart: 'var(--sp-2)' }}>
            {!isGraded ? (
              <button type="submit" className="btn primary" disabled={busy}>
                <Icon icon={CheckCircle2} size={14} />
                {gradePending ? 'جارٍ الحفظ…' : 'تأكيد التقييم'}
              </button>
            ) : (
              paper.status === 'GRADED' && (
                <button type="button" className="btn primary" onClick={onPublish} disabled={busy}>
                  <Icon icon={Sparkles} size={14} />
                  {publishPending ? 'جارٍ النشر…' : 'نشر في المكتبة'}
                </button>
              )
            )}
            {readerPath && (
              <RouterLink to={readerPath} className="btn outline">
                <Icon icon={MessageSquare} size={13} />
                قراءة البحث وكتابة ملاحظات
              </RouterLink>
            )}
          </div>

          {(gradeError || publishError) && (
            <div className="form-feedback fail" role="alert">
              <Icon icon={X} size={14} />
              <span className="flex-1">{gradeError ?? publishError}</span>
            </div>
          )}
        </section>
      </form>

      <ReviewNotes paperId={paper.id} />
    </div>
  );
}

/** ReviewNotes — the margin-notes thread of the selected paper, newest
 * first (the newest pulses once — returning from the reader with a
 * fresh note, the highlight lands on it). Own query per paperId
 * (cached); honest pending/error/empty states. */
function ReviewNotes({ paperId }: { paperId: string }) {
  const annotations = useAnnotations(paperId);
  const rows = annotations.data
    ? [...annotations.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];
  return (
    <section className="rs-work-section" aria-label="ملاحظات على البحث">
      <div className="section-title">
        <Icon icon={StickyNote} size={13} /> ملاحظات على البحث ({annotations.data?.length ?? 0})
      </div>
      {annotations.isPending && (
        <div className="flex-col gap-2" aria-busy="true" aria-live="polite">
          <Skeleton width="70%" height={12} />
          <Skeleton width="40%" height={10} />
        </div>
      )}
      {annotations.isError && (
        <div className="inline-retry" role="alert">
          <span className="text-xs text-muted">تعذَّر تحميل الملاحظات على البحث.</span>
          <button type="button" className="btn ghost sm" onClick={() => annotations.refetch()}>
            <Icon icon={RefreshCw} size={12} /> إعادة المحاولة
          </button>
        </div>
      )}
      {annotations.data && rows.length > 0 && (
        <div className="rs-work-notes">
          {rows.map((a, i) => (
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
      )}
      {annotations.data && rows.length === 0 && (
        <p className="rs-review-work-sub" style={{ margin: 0 }}>
          لا ملاحظات بعد — افتح البحث في العارض وثبّت ملاحظاتك على الصفحات.
        </p>
      )}
    </section>
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
