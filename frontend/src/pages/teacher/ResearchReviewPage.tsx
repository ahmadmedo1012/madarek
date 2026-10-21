import { Fragment, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Microscope, FileText, CheckCircle2, X, Sparkles, MessageSquare,
  StickyNote, RefreshCw, ClipboardCheck, ArrowLeft,
} from 'lucide-react';
import { Button, UserAvatar, Tabs, FormField } from '../../components/primitives';
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
import '../../styles/r305-research-pdf-ai.css';

/* fmtDate (short ar-LY date, '—' for missing values) is
 * lib/format.formatDateAr (13-15 fold, audit 11-f P2-1). The annotation
 * rows render timeAgoAr — the same helper the AnnotationsPanel uses for
 * the very same notes in the PDF reader, so both surfaces agree on one
 * instant (15-h P2-2, 16-E10).
 *
 * R305-A7 «Heron» — the review surface rebuilds in the research-family
 * grammar (r305-research-pdf-ai.css §B, marker .r305rp on the page
 * root): status is a dot+label chip (never color alone), the decisive
 * action rides the one-action rail with an explicit before→after of
 * the decision, the API's decision timestamps render as a record row,
 * and in-flight requests show the canonical Button spinner. Every
 * contract below is carried verbatim — payloads, endpoints, the
 * <form> Enter semantics (r157/6A9), the 4000-char cap (r165b), the
 * discard guard (15-e P1-6) and the error-language guard (15-j P0-1). */

const STATUS_LABEL: Record<PaperStatus, string> = {
  UPLOADED: 'بانتظار الفحص',
  SCANNING: 'جارٍ الفحص',
  CHECKS_PASSED: 'بانتظار التقييم',
  // r134 فشل→تعذّر family canon — see the student twin (ResearchPage).
  CHECKS_FAILED: 'تعذّر اجتياز الفحص',
  GRADED: 'مُقيَّم',
  PUBLISHED: 'مُنشور',
};

/* Heron chip tones — the dot carries the tone; the Arabic label rides
 * beside it, so state never rides color alone (§4 contract). */
type ChipTone = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'gold';

const STATUS_CHIP_TONE: Record<PaperStatus, ChipTone> = {
  UPLOADED: 'info',
  SCANNING: 'info',
  CHECKS_PASSED: 'warning',
  CHECKS_FAILED: 'danger',
  GRADED: 'gold',
  PUBLISHED: 'success',
};

/** The status chip: dot (tone) + Arabic label. */
function StatusChip({ status }: { status: PaperStatus }) {
  return (
    <span className={`r305rp-chip r305rp-chip--${STATUS_CHIP_TONE[status]}`}>
      <span className="r305rp-chip-dot" aria-hidden="true" />
      {STATUS_LABEL[status]}
    </span>
  );
}

/* The decision map — what the decisive action TURNS the paper into.
 * The queue's three reachable states (backend RESEARCH_QUEUE_STATUSES):
 * a waiting/failed paper becomes GRADED on save; a graded one becomes
 * PUBLISHED on publish. PUBLISHED is terminal (unreachable from the
 * queue — the publish removes it — but the workspace renders honestly
 * if it ever appears). */
const NEXT_STEP: Partial<Record<PaperStatus, { label: string; tone: ChipTone; afterLabel: string }>> = {
  CHECKS_PASSED: { label: 'مُقيَّم', tone: 'gold', afterLabel: 'بعد حفظ التقييم' },
  CHECKS_FAILED: { label: 'مُقيَّم', tone: 'gold', afterLabel: 'بعد حفظ التقييم' },
  GRADED: { label: 'مُنشور', tone: 'success', afterLabel: 'بعد النشر' },
};

/** The paper's decision record — the timestamps the API actually
 * returns (uploadedAt/scannedAt/gradedAt/publishedAt), shown so the
 * reviewer sees WHERE the paper stands in its journey without opening
 * the reader. Missing steps say so plainly. */
function decisionRecord(paper: ResearchPaper): Array<{ label: string; value: string }> {
  return [
    { label: 'رُفع', value: formatDateAr(paper.uploadedAt) },
    { label: 'فُحص', value: paper.scannedAt ? formatDateAr(paper.scannedAt) : 'لم يُفحص بعد' },
    { label: 'قُيِّم', value: paper.gradedAt ? formatDateAr(paper.gradedAt) : 'لم يُقيَّم بعد' },
    { label: 'نُشر', value: paper.publishedAt ? formatDateAr(paper.publishedAt) : 'لم يُنشر بعد' },
  ];
}

/** The backend's UPPER_SNAKE support code (D17-3: codes stay English
 * for the FE support-code chip; messages are Arabic). */
function errorCodeOf(err: unknown): string | null {
  const code = (err as { response?: { data?: { error?: { code?: unknown } } } })
    ?.response?.data?.error?.code;
  return typeof code === 'string' && code.length > 0 ? code : null;
}

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
  // The backend's support codes for the two write paths (D17-3 chip).
  const [gradeErrorCode, setGradeErrorCode] = useState<string | null>(null);
  const [publishErrorCode, setPublishErrorCode] = useState<string | null>(null);

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
    setGradeErrorCode(null);
    try {
      await grade.mutateAsync({ id: selected.id, grade: draftScore, feedback: draftFeedback || undefined });
      toast.success('صار البحث مُقيَّماً؛ يمكنك نشره في المكتبة من قسم «جاهزة للنشر».', {
        title: 'تمّ حفظ التقييم',
      });
    } catch (err) {
      setGradeError(apiErrorMessage(err, 'تعذَّر حفظ التقييم — تحقّق من اتصالك ثم أعد المحاولة.'));
      setGradeErrorCode(errorCodeOf(err));
    }
  };

  const publishNow = async () => {
    if (!selected) return;
    setPublishError(null);
    setPublishErrorCode(null);
    try {
      await publish.mutateAsync(selected.id);
      toast.success('أصبح البحث متاحاً للطلاب في مكتبة الجامعة.', {
        title: 'تمّ نشر البحث',
      });
    } catch (err) {
      setPublishError(apiErrorMessage(err, 'تعذَّر نشر البحث في المكتبة — تحقّق من اتصالك ثم أعد المحاولة.'));
      setPublishErrorCode(errorCodeOf(err));
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
      dirty={dirty}
      score={draftScore ?? (selected.grade ?? 15)}
      onScore={setDraftScore}
      feedback={draftFeedback ?? ''}
      onFeedback={setDraftFeedback}
      gradeError={gradeError}
      gradeErrorCode={gradeErrorCode}
      publishError={publishError}
      publishErrorCode={publishErrorCode}
      busy={busy}
      gradePending={grade.isPending}
      publishPending={publish.isPending}
      onSubmitGrade={onFormSubmit}
      onPublish={() => void publishNow()}
    />
  ) : null;

  return (
    <div className="r305rp">
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
                    carries the accent ground AND a visible «تُعرض الآن»
                    marker — selection is never color alone. ── */}
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
                      <div className="r305rp-rev-queue">
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
                      <div className="r305rp-rev-queue">
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
                      <div className="r305rp-rev-queue">
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
                <div className="rs-review-work r305rp-rev-work" aria-live="polite">
                  {workspace ?? (
                    <div className="r305rp-empty">
                      <span className="r305rp-eyebrow">
                        <Icon icon={ClipboardCheck} size={13} /> لوحة المراجعة
                      </span>
                      <p className="r305rp-rev-empty-title">اختر بحثاً من القائمة</p>
                      <p className="r305rp-rev-empty-sub">
                        تظهر نتائج الفحص ونموذج التقييم وملاحظاتك على المستند هنا.
                      </p>
                    </div>
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
    </div>
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
 * shell, so the resolved layout doesn't reflow the page. The rows
 * mirror the Heron row anatomy (r305rp-rev-row). */
function SplitSkeleton() {
  return (
    <div className="rs-review-split" aria-busy="true" aria-live="polite">
      <div className="r305rp-rev-queue" aria-hidden>
        {[0, 1, 2].map((i) => (
          <div key={i} className="r305rp-rev-row r305rp-rev-row--static">
            <Skeleton width={36} height={36} rounded="var(--r-full)" />
            <span className="r305rp-rev-row-main">
              <Skeleton width="70%" height={13} />
              <Skeleton width="45%" height={10} />
            </span>
          </div>
        ))}
      </div>
      <div className="rs-review-work r305rp-rev-work" aria-hidden>
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
   without opening anything; ≥7 days says «متأخر» in words, not only
   in rose ink). The selected row adds a visible «تُعرض الآن» chip. */
function QueueItem({ paper, selected, onSelect }: {
  paper: ResearchPaper;
  selected: boolean;
  onSelect: () => void;
}) {
  const initials = paper.student.avatarInitials ?? `${paper.student.firstName[0]}${paper.student.lastName[0]}`;
  const waiting = paper.status === 'CHECKS_PASSED';
  const waitDays = (Date.now() - new Date(paper.uploadedAt).getTime()) / 86_400_000;
  const late = waiting && waitDays >= 7;
  return (
    <button
      type="button"
      className={`r305rp-rev-row${selected ? ' r305rp-rev-row--on' : ''}`}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`${paper.title} — ${STATUS_LABEL[paper.status]}`}
    >
      <UserAvatar initials={initials} color={paper.student.avatarColor ?? undefined} size={36} />
      <span className="r305rp-rev-row-main">
        <span className="r305rp-rev-row-title">{paper.title}</span>
        <span className="r305rp-meta-row">
          <span>{paper.student.firstName} {paper.student.lastName}</span>
          {paper.offering && (
            <>
              <span className="r305rp-meta-sep" aria-hidden="true" />
              <span><bdi className="font-mono">{paper.offering.course.code}</bdi></span>
            </>
          )}
        </span>
      </span>
      <span className="r305rp-rev-row-tail">
        <StatusChip status={paper.status} />
        {waiting && (
          <span className={`rs-wait${late ? ' is-old' : ''}`}>
            بانتظار {timeAgoAr(paper.uploadedAt)}{late ? ' — متأخر' : ''}
          </span>
        )}
        {(paper.status === 'GRADED' || paper.status === 'PUBLISHED') && paper.grade != null && (
          <span className="rs-wait font-mono"><bdi>{formatInt(paper.grade)}</bdi>/20</span>
        )}
        {selected && (
          <span className="r305rp-chip r305rp-chip--accent r305rp-rev-row-now">
            تُعرض الآن
          </span>
        )}
      </span>
    </button>
  );
}

/* ─── The review workspace — the split's review half ────────────────
   Heron territories, each with a kicker heading and hairline bounds:
     1. The masthead — the ONE deep band: who/what/status + the title.
     2. «سجل الحالة» — the decision record (API timestamps).
     3. «نتائج الفحص الأوتوماتيكي» — the declared simulation cells.
     4. «تقييمك» — the grade form; its decisive action rides the
        one-action rail with the explicit before→after of the decision.
     5. «ملاحظات على البحث» — the margin-notes thread.
   One component for BOTH compositions: the desktop sticky panel and
   the mobile bottom Sheet render the same content. */
function ReviewWorkspace({
  paper, isGraded, dirty, score, onScore, feedback, onFeedback,
  gradeError, gradeErrorCode, publishError, publishErrorCode,
  busy, gradePending, publishPending,
  onSubmitGrade, onPublish,
}: {
  paper: ResearchPaper;
  isGraded: boolean;
  dirty: boolean;
  score: number;
  onScore: (n: number) => void;
  feedback: string;
  onFeedback: (s: string) => void;
  gradeError: string | null;
  gradeErrorCode: string | null;
  publishError: string | null;
  publishErrorCode: string | null;
  busy: boolean;
  gradePending: boolean;
  publishPending: boolean;
  onSubmitGrade: (e: FormEvent) => void;
  onPublish: () => void;
}) {
  const initials = paper.student.avatarInitials ?? `${paper.student.firstName[0]}${paper.student.lastName[0]}`;
  const readerPath = readerPathFor(paper, '/teacher/research');
  const next = NEXT_STEP[paper.status];
  const record = decisionRecord(paper);
  return (
    <div className="rs-review-sheet-body">
      {/* The masthead — the page's one deep band (§3): the submission's
          identity inverts so the workspace reads as the decisive
          surface at a glance. */}
      <div className="r305rp-band r305rp-band--deep r305rp-rev-masthead">
        <UserAvatar initials={initials} color={paper.student.avatarColor ?? undefined} size={40} />
        <div className="r305rp-rev-masthead-main">
          <h3 className="r305rp-rev-masthead-title">{paper.title}</h3>
          <div className="r305rp-meta-row r305rp-rev-masthead-meta">
            <span>{paper.student.firstName} {paper.student.lastName}</span>
            {paper.offering && (
              <>
                <span className="r305rp-meta-sep" aria-hidden="true" />
                <span>{paper.offering.course.name} (<bdi className="font-mono">{paper.offering.course.code}</bdi>)</span>
              </>
            )}
            <span className="r305rp-meta-sep" aria-hidden="true" />
            <span>رُفع {formatDateAr(paper.uploadedAt)}</span>
          </div>
        </div>
        <StatusChip status={paper.status} />
      </div>

      {/* سجل الحالة — the decision record from the API's own fields. */}
      <div className="r305rp-rev-record">
        <div className="r305rp-rule-labeled"><span>سجل الحالة</span></div>
        <div className="r305rp-meta-row">
          {record.map((fact, i) => (
            <Fragment key={fact.label}>
              {i > 0 && <span className="r305rp-meta-sep" aria-hidden="true" />}
              <span className="r305rp-rev-record-item">
                <span className="r305rp-rev-record-label">{fact.label}</span> {fact.value}
              </span>
            </Fragment>
          ))}
        </div>
      </div>

      {/* r157 / 6A9 — fields + actions ride one <form> (Enter submits
          the grade; graded-mode Enter is the guarded no-op above).
          display:contents keeps the form's two sections inside the
          host's flex rhythm while preserving real form semantics. */}
      <form onSubmit={onSubmitGrade} noValidate style={{ display: 'contents' }}>
        <section className="rs-work-section" aria-label="نتائج الفحص الأوتوماتيكي">
          <div className="r305rp-kicker"><h4 className="r305rp-kicker-title">نتائج الفحص الأوتوماتيكي</h4></div>
          <ScanResults
            plagiarismPct={paper.plagiarismPct}
            aiContentPct={paper.aiContentPct}
            note="قيم الفحص تجريبية معلنة — ليست قياساً فعلياً حتى تفعيل كشف حقيقي."
          />
        </section>

        <section className="rs-work-section" aria-label="تقييمك">
          <div className="r305rp-kicker"><h4 className="r305rp-kicker-title">تقييمك</h4></div>
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
                onChange={(e) => {
                  // A cleared/intermediate field ("", "-") parses as
                  // NaN — clamp to the honest floor instead of posting
                  // NaN to the backend (z.number() would 400 it).
                  const n = Number(e.target.value);
                  onScore(Number.isFinite(n) ? Math.max(0, Math.min(20, n)) : 0);
                }}
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

          {/* The decisive rail (§7 — ONE emphasized action): the
              before→after of the decision sits beside the verb that
              performs it. Publish stays type=button (an explicit click,
              never an implicit form submit). */}
          <div className="r305rp-next r305rp-rev-decision">
            {next ? (
              <div className="r305rp-rev-decision-flow">
                <div className="r305rp-rev-decision-state">
                  <span className="r305rp-eyebrow">الآن</span>
                  <StatusChip status={paper.status} />
                </div>
                <Icon icon={ArrowLeft} size={14} className="r305rp-rev-decision-arrow" />
                <div className="r305rp-rev-decision-state">
                  <span className="r305rp-eyebrow">{next.afterLabel}</span>
                  <span className={`r305rp-chip r305rp-chip--${next.tone}`}>
                    <span className="r305rp-chip-dot" aria-hidden="true" />
                    {next.label}
                  </span>
                </div>
                {!isGraded && (
                  <span
                    className={`r305rp-chip r305rp-rev-dirty${dirty ? ' r305rp-chip--warning' : ''}`}
                    role="status"
                  >
                    <span className="r305rp-chip-dot" aria-hidden="true" />
                    {dirty ? 'مسودة غير محفوظة' : 'بلا تعديلات'}
                  </span>
                )}
              </div>
            ) : (
              <p className="r305rp-rev-decision-terminal">
                البحث منشور في المكتبة — لا إجراء متاح عليه هنا.
              </p>
            )}
            <div className="r305rp-rev-decision-actions">
              {!isGraded ? (
                <Button
                  type="submit"
                  variant="primary"
                  loading={gradePending}
                  disabled={busy}
                  leadingIcon={<Icon icon={CheckCircle2} size={14} />}
                >
                  تأكيد التقييم
                </Button>
              ) : (
                paper.status === 'GRADED' && (
                  <Button
                    type="button"
                    variant="primary"
                    loading={publishPending}
                    disabled={busy}
                    onClick={onPublish}
                    leadingIcon={<Icon icon={Sparkles} size={14} />}
                  >
                    نشر في المكتبة
                  </Button>
                )
              )}
              {readerPath && (
                <RouterLink to={readerPath} className="btn outline">
                  <Icon icon={MessageSquare} size={13} />
                  قراءة البحث وكتابة ملاحظات
                </RouterLink>
              )}
            </div>
          </div>

          {(gradeError || publishError) && (
            <div className="form-feedback fail" role="alert">
              <Icon icon={X} size={14} />
              <span className="flex-1">{gradeError ?? publishError}</span>
              {(gradeErrorCode ?? publishErrorCode) && (
                <bdi className="font-mono r305rp-rev-err-code">{gradeErrorCode ?? publishErrorCode}</bdi>
              )}
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
      <div className="r305rp-kicker">
        <h4 className="r305rp-kicker-title">
          <Icon icon={StickyNote} size={13} /> ملاحظات على البحث ({annotations.data?.length ?? 0})
        </h4>
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
      {/* r305-a7 a11y: the notes thread is a real list (role=list +
          listitem) — the rows branch is its only content. */}
      {annotations.data && rows.length > 0 && (
        <div className="rs-work-notes" role="list">
          {rows.map((a, i) => (
            <div key={a.id} className={`annotation-row${i === 0 ? ' is-newest' : ''}`} role="listitem">
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
        <div className="r305rp-empty">
          <span className="r305rp-eyebrow">لا ملاحظات بعد</span>
          <p className="r305rp-rev-empty-sub">افتح البحث في العارض وثبّت ملاحظاتك على الصفحات.</p>
        </div>
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
                  /* r305-a7 a11y: the off-app target is disclosed to
                     assistive tech, not only to sighted users who see
                     the new tab (G201). */
                  <a href={p.url} target="_blank" rel="noreferrer" className="btn ghost sm"
                    aria-label="فتح — يفتح في نافذة جديدة">
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
