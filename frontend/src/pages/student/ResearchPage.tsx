import { useId, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  BookMarked, Upload, ScanSearch, X,
  CheckCircle2, AlertCircle, Sparkles, MessageSquare, FileText,
  type LucideIcon,
} from 'lucide-react';
import { FormField, ProgressBar } from '../../components/primitives';
import { ErrorState, EmptyState } from '../../components/primitives/States';
import { Modal } from '../../components/overlays/Modal';
import { useDiscardGuard } from '../../components/curriculum/AuthoringModal';
import { PAPER_STATUS_TONE } from '../../lib/paperStatus';
import { validatePdfFileDeep } from '../../lib/pdfUpload';
import { Icon } from '../../components/Icon';
import { toast } from '../../lib/toast';
import { countAr, formatDateWithYearAr } from '../../lib/format';
import {
  useMyResearch, useUploadPaper, useUploadPaperFile, useScanPaper,
  useMyEnrollments, apiErrorMessage,
  type ResearchPaper, type PaperStatus,
} from '../../hooks/useResources';
import { PageFrame, PageHeader, RowList, RowItem } from '../../components/patterns';
/* R319 (c3-S1) — the §B2 kit: the mono-indexed section title bars +
 * the count meta (the DashboardPage conversion's components). */
import { SectionBar, BarCount } from '../../components/student';
import { StatusPipeline } from '../../components/paper/StatusPipeline';
import { ScanResults } from '../../components/paper/ScanResults';
import { formatInt } from '../../utils/numbers';
import '../../styles/research.css';
/* R305-A7 «Heron»: the scoped research/PDF/library sheet — loaded
 * DIRECTLY AFTER the family sheet so later source order inside
 * @layer pages wins the equal-specificity ties (§0 scoping contract). */
import '../../styles/r305-research-pdf-ai.css';
/* R319 (c3-S1): the sheet system — the §B2 component anatomy + the
 * academic family's harmonics. The .r319s-page class on the same root
 * as .r305rp opts this route into the masthead re-seat. */
import '../../styles/r319-student.css';
import '../../styles/r319-student-pages.css';

const STATUS_LABEL: Record<PaperStatus, string> = {
  UPLOADED: 'بانتظار الفحص',
  SCANNING: 'جارٍ الفحص',
  CHECKS_PASSED: 'بانتظار تقييم الأستاذ',
  // r134 فشل→تعذّر family canon: «فشل الفحص» named the CHECKS_FAILED
  // bucket with the banned verb; تعذّر اجتياز keeps the meaning (the
  // paper could not pass) and stays distinct from the operational
  // «تعذّر إجراء الفحص» alert below (the scan itself could not run).
  CHECKS_FAILED: 'تعذّر اجتياز الفحص',
  GRADED: 'مُقيَّم',
  PUBLISHED: 'مُنشور في المكتبة',
};

/* R305-A7: status chips — dot + Arabic label (state never rides color
 * alone). The TONE ladder stays canonical (lib/paperStatus.ts); this
 * map only translates badge tones onto the shared chip vocabulary. */
type ChipTone = 'accent' | 'success' | 'warning' | 'danger' | 'info' | 'gold';
type BadgeTone = 'brand' | 'green' | 'amber' | 'red' | 'gold' | 'purple';
const BADGE_TONE_TO_CHIP: Record<BadgeTone, ChipTone> = {
  amber: 'warning',
  brand: 'accent',
  purple: 'info',
  red: 'danger',
  gold: 'gold',
  green: 'success',
};
function StatusChip({ tone, label }: { tone: ChipTone; label: string }) {
  return (
    <span className={`r305rp-chip r305rp-chip--${tone}`}>
      <span className="r305rp-chip-dot" aria-hidden="true" />
      {label}
    </span>
  );
}

/* fmtDate (short ar-LY date with year, '—' for missing values) is
 * lib/format.formatDateWithYearAr (13-15 fold, audit 11-f P2-1). */

/* ─── The visible sequence — the honest next step per status ────────
   r304: the workflow is a sequence the student can READ. Each status
   maps to ONE next action (or an explicit «no action needed»), in the
   same vocabulary the row's badge and the pipeline rail speak. */
function nextStepFor(paper: ResearchPaper, isScanning: boolean): { k: string; hint: string } {
  switch (paper.status) {
    case 'UPLOADED':
      return isScanning
        ? { k: 'جارٍ الآن', hint: 'الفحص الأوتوماتيكي يجري — النتائج تظهر هنا تلقائياً.' }
        : { k: 'الخطوة التالية', hint: 'ابدأ الفحص الأوتوماتيكي (انتحال + محتوى ذكاء اصطناعي).' };
    case 'SCANNING':
      return { k: 'جارٍ الآن', hint: 'الفحص الأوتوماتيكي يجري — النتائج تظهر هنا تلقائياً.' };
    case 'CHECKS_PASSED':
      return { k: 'الخطوة التالية', hint: 'بانتظار تقييم أستاذك — لا إجراء مطلوب منك الآن.' };
    case 'CHECKS_FAILED':
      return { k: 'الخطوة التالية', hint: 'ارفع نسخة معدّلة — عنوانك وملخّصك يُعبّآن مسبقاً.' };
    case 'GRADED':
      return { k: 'التقييم وصل', hint: 'راجع الدرجة والملاحظات — النشر قرار الأستاذ.' };
    case 'PUBLISHED':
      return { k: 'مكتمل', hint: 'البحث متاح للجميع في مكتبة الجامعة.' };
  }
}

export default function StudentResearchPage() {
  const my = useMyResearch();
  const enrollments = useMyEnrollments();
  const upload = useUploadPaper();
  /* P3: the real file stage — POST /files/papers mints the fileUrl the
   * create mutation below attaches to the paper row. */
  const uploadFile = useUploadPaperFile();
  const scan = useScanPaper();
  /* P3: the staged upload memory. A successful file upload whose create
   * then fails leaves an orphaned (inert) file server-side; the modal
   * stays open and the resubmit must REUSE the staged fileUrl instead of
   * re-uploading the same File. Identity is the File instance itself: a
   * re-opened modal starts from null state, and re-picking the same file
   * on disk yields a NEW instance (honest re-upload). Cleared on close. */
  const stagedUpload = useRef<{ file: File; fileUrl: string } | null>(null);
  const [uploadOpen, setUploadOpen] = useState(false);
  /* r157 (F8): تعبئة مسبقة لإعادة الرفع — «رفع نسخة جديدة» على ورقة
   * فاشلة يفتح النموذج معبّأً ببياناتها (العنوان/الملخّص/المقرّر). */
  const [resubmitPrefill, setResubmitPrefill] = useState<{
    title: string;
    abstract?: string;
    offeringId?: string;
  } | null>(null);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  /* r164f: the file-stage upload fraction (0..1) while the raw body is
   * on the wire — null means «no upload in flight». */
  const [fileProgress, setFileProgress] = useState<number | null>(null);

  const papers = my.data ?? [];
  const pendingCount = papers.filter((p) => p.status === 'UPLOADED' || p.status === 'SCANNING' || p.status === 'CHECKS_PASSED').length;
  const gradedCount = papers.filter((p) => p.status === 'GRADED' || p.status === 'PUBLISHED').length;
  const failedCount = papers.filter((p) => p.status === 'CHECKS_FAILED').length;
  /* R305-A7: the summary rides the page's ONE deep band as a metric
   * register — values formatted via utils/numbers (the StatLine canon:
   * the component never formats; neither does the band). A real state
   * (a failed paper) rides a danger dot + the hint line, never color
   * alone. */
  const kpis: Array<{ label: string; value: ReactNode; hint: string; flag?: boolean }> = [
    { label: 'إجمالي بحوثك', value: formatInt(papers.length), hint: 'منذ أول رفعة' },
    { label: 'قيد المراجعة', value: formatInt(pendingCount), hint: pendingCount > 0 ? 'بانتظار خطوة تالية' : 'لا شيء معلّق' },
    { label: 'مُقيَّمة', value: formatInt(gradedCount), hint: gradedCount > 0 ? 'منها المنشور' : 'لا توجد بعد' },
    { label: 'تعذّر اجتياز الفحص', value: formatInt(failedCount), hint: failedCount > 0 ? 'تحتاج إعادة رفع' : 'لا شيء', flag: failedCount > 0 },
  ];

  const startScan = async (id: string) => {
    setScanningId(id);
    setScanError(null);
    try {
      await scan.mutateAsync(id);
    } catch (e) {
      setScanError(apiErrorMessage(e, 'تعذَّر بدء الفحص — تحقّق من اتصالك وحاول مرة أخرى.'));
    } finally {
      setScanningId(null);
    }
  };

  /* Opens the upload modal EMPTY (the normal path — the CTA panel and
     the empty-state CTA both route here). */
  const openFreshUpload = () => {
    setResubmitPrefill(null);
    setUploadOpen(true);
  };
  /* Opens the upload modal PREFILLED from a failed paper — the student
     keeps the title/abstract/offering they already authored instead of
     retyping them from memory. */
  const openResubmit = (paper: ResearchPaper) => {
    setResubmitPrefill({
      title: paper.title,
      abstract: paper.abstract ?? undefined,
      offeringId: paper.offering?.id,
    });
    setUploadOpen(true);
  };

  return (
    /* R305-A7 marker root — every Heron rule in the scoped sheet hangs
     * off .r305rp; the upload Modal (a portal) reaches through §9's
     * body:has(.r305rp). The patterns PageFrame rides INSIDE.
     * R319 (c3-S1): + .r319s-page — the sheet-system opt-in (the §B2
     * component anatomy + the masthead re-seat). */
    <div className="r305rp r319s-page">
    <PageFrame width="default">
      <PageHeader
        title="بحوثي العلمية"
        description={
          /* r168b: the scan is a deterministic simulation until a real
              detection provider is activated — the results area carries
              the note since r154b; the header keeps matching it. */
          'ارفع بحوثك، اعرضها على فحص الانتحال وكشف الذكاء الاصطناعي (محاكاة حتى تفعيل كشف حقيقي)، ثم أرسلها لأستاذك للتقييم والنشر في مكتبة الجامعة.'
        }
      />

      {my.isPending ? (
        <RowList aria-label="بحوثك" loading />
      ) : my.isError ? (
        <ErrorRetry error={my.error} onRetry={() => my.refetch()} />
      ) : (
        <>
          {/* The submission CTA — the workflow's first move rides the
              ONE copper rail (r305rp-next): one line of intent next to
              the single emphasized action. */}
          {papers.length > 0 && (
            <section className="r305rp-next r305rp-res-cta" aria-label="رفع بحث جديد">
              <div className="r305rp-res-cta-body">
                <span className="r305rp-eyebrow">الخطوة الأولى</span>
                <div className="r305rp-res-cta-title">بحث جديد؟</div>
                <div className="r305rp-res-cta-desc">
                  ارفعه الآن — يُفحص أوتوماتيكياً، ثم يصل أستاذك للتقييم، وتميّزه ينشره في المكتبة.
                </div>
              </div>
              <button type="button" className="btn primary" onClick={openFreshUpload}>
                <Icon icon={Upload} size={14} />
                رفع بحث جديد
              </button>
            </section>
          )}

          {/* R305-A7: the page's ONE deep band — the lifecycle summary. */}
          <section className="r305rp-band r305rp-band--deep r305rp-res-band" aria-label="ملخص بحوثك">
            <span className="r305rp-eyebrow">ملخص الحالة</span>
            <dl className="r305rp-res-metrics">
              {kpis.map((k) => (
                <div key={k.label}>
                  <dt className="r305rp-metric-label">{k.label}</dt>
                  <dd className="r305rp-metric">
                    {k.flag ? <span className="r305rp-res-flag" aria-hidden="true" /> : null}
                    {k.value}
                  </dd>
                  <dd className="r305rp-band-secondary r305rp-res-metric-hint">{k.hint}</dd>
                </div>
              ))}
            </dl>
          </section>

          {scanError && (
            <div className="alert red" role="alert">
              <span className="alert-dot" />
              <div className="alert-body">
                <div className="alert-title">تعذَّر إجراء الفحص</div>
                <div className="alert-desc">{scanError}</div>
              </div>
            </div>
          )}

          {/* The list IS the page: each row carries its journey, results
              and actions attached — expandable so the list stays calm.
              R319 (c3-S1): the list region opens with the §B2 title bar
              — [01] بحوثي + the papers count as quiet mono meta (the
              lifecycle band above is the view's metadata band,
              unnumbered like the dashboard's momentum strip). */}
          <SectionBar
            index="01"
            title="بحوثي"
            meta={
              papers.length > 0 ? (
                <BarCount
                  n={papers.length}
                  srLabel={countAr(papers.length, ['بحث واحد', 'بحثان', 'بحوث', 'بحثاً'])}
                />
              ) : undefined
            }
          />
          <RowList
            aria-label="بحوثك"
            empty={
              <EmptyUpload onOpen={openFreshUpload} />
            }
          >
            {papers.map((p) => (
              <PaperRow
                key={p.id}
                paper={p}
                isScanning={scanningId === p.id || (p.status === 'SCANNING')}
                onScan={() => void startScan(p.id)}
                onResubmit={() => openResubmit(p)}
              />
            ))}
          </RowList>
        </>
      )}

      <ProcessExplainer />

      {uploadOpen && (
        <UploadModal
          enrollments={enrollments.data ?? []}
          enrollmentsPending={enrollments.isPending}
          isPending={upload.isPending || uploadFile.isPending}
          filePending={uploadFile.isPending}
          fileProgress={fileProgress}
          error={uploadError}
          initial={resubmitPrefill}
          stagedFile={stagedUpload.current?.file ?? null}
          onClose={() => {
            setUploadOpen(false);
            setUploadError(null);
            setFileProgress(null);
            setResubmitPrefill(null);
            stagedUpload.current = null;
          }}
          onSubmit={async (input) => {
            setUploadError(null);
            try {
              /* P3: a picked PDF stages FIRST (raw-body POST /files/papers),
               * then the create mutation carries the returned fileUrl —
               * the paper row finally links a real file. A staged upload
               * from a previous failed create is reused (stagedUpload
               * pins the File instance it belongs to). */
              let fileUrl: string | undefined;
              if (input.file) {
                if (stagedUpload.current?.file !== input.file) {
                  setFileProgress(0);
                  try {
                    const staged = await uploadFile.mutateAsync({
                      file: input.file,
                      onUploadProgress: setFileProgress,
                    });
                    stagedUpload.current = { file: input.file, fileUrl: staged.fileUrl };
                  } finally {
                    setFileProgress(null);
                  }
                }
                fileUrl = stagedUpload.current?.fileUrl;
              }
              await upload.mutateAsync({
                title: input.title,
                abstract: input.abstract,
                offeringId: input.offeringId,
                fileUrl,
              });
              setUploadOpen(false);
              stagedUpload.current = null;
              toast.success('سيخضع البحث لفحص الانتحال ثم يصل إلى أستاذك للتقييم.', {
                title: 'تمّ رفع البحث',
              });
            } catch (e) {
              // Keep the modal open with the entered values; the message
              // renders inside the modal so the student can retry.
              setUploadError(apiErrorMessage(e, 'تعذَّر رفع البحث — تحقّق من اتصالك وحاول مرة أخرى.'));
            }
          }}
        />
      )}
    </PageFrame>
    </div>
  );
}

function ErrorRetry({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  return <ErrorState error={error} onRetry={onRetry} />;
}

function EmptyUpload({ onOpen }: { onOpen: () => void }) {
  return (
    <EmptyState
      icon={BookMarked}
      title="لم ترفع أي بحث بعد"
      description="ابدأ برفع أول بحث لك ليتم فحصه ثم تقييمه من قبل الأستاذ."
      illustration="empty-research"
      action={
        <button type="button" className="btn primary" onClick={onOpen}>
          <Icon icon={Upload} size={14} />
          رفع بحث جديد
        </button>
      }
    />
  );
}

/* ─── Paper row — the journey attached to its item ─────────
   RowItem carries the line (title + course + badge); the body (open by
   default whenever a next action exists) holds the pipeline with its
   real timestamps, the honest next-step line, the declared-simulation
   results, grade/feedback and the row's actions. */
function PaperRow({
  paper, isScanning, onScan, onResubmit,
}: {
  paper: ResearchPaper;
  isScanning: boolean;
  onScan: () => void;
  onResubmit: () => void;
}) {
  const hasResults = paper.plagiarismPct != null || paper.aiContentPct != null;
  /* A body opens by default when the student must ACT or watch — a
     settled paper collapses so the list stays calm. */
  const mustAct = paper.status === 'UPLOADED' || paper.status === 'CHECKS_FAILED' || isScanning;
  const next = nextStepFor(paper, isScanning);
  const readerPath = paper.fileUrl
    ? `/document/${encodeURIComponent(paper.fileUrl.split('/').pop() ?? '')}?title=${encodeURIComponent(paper.title)}&back=${encodeURIComponent('/student/research')}&paper=${encodeURIComponent(paper.id)}`
    : null;
  return (
    <RowItem
      title={paper.title}
      meta={
        <>
          {paper.offering && (
            <>
              <span>{paper.offering.course.name} (<bdi className="font-mono">{paper.offering.course.code}</bdi>)</span>
              <span aria-hidden="true">·</span>
            </>
          )}
          <span>رُفع: {formatDateWithYearAr(paper.uploadedAt)}</span>
        </>
      }
      trailing={
        <StatusChip
          tone={BADGE_TONE_TO_CHIP[PAPER_STATUS_TONE[paper.status]]}
          label={STATUS_LABEL[paper.status]}
        />
      }
      defaultExpanded={mustAct}
      expandLabel={`تفاصيل البحث: ${paper.title}`}
    >
      <div className="flex-col gap-3">
        <StatusPipeline status={paper.status} paper={paper} />

        {/* The honest next step — one labelled line per status, riding
            the row's copper rail (r305rp-next); the actionable statuses
            carry their action on the same line. */}
        <div className="r305rp-next r305rp-res-next">
          <span className="r305rp-eyebrow">
            <Icon icon={isScanning && paper.status !== 'CHECKS_FAILED' ? ScanSearch : Sparkles} size={13} />
            {next.k}
          </span>
          <span className="r305rp-res-next-hint">{next.hint}</span>
          {paper.status === 'UPLOADED' && (
            <div className="rs-row-actions">
              {/* The scan start stays mounted while its request is in
                  flight — disabled + honest label (the old pin vanished
                  the button mid-flight, a state jump with no pending
                  voice and no double-fire guard). */}
              <button type="button" className="btn outline" onClick={onScan} disabled={isScanning} aria-disabled={isScanning || undefined}>
                <Icon icon={ScanSearch} size={14} />
                {isScanning ? 'جارٍ بدء الفحص…' : 'ابدأ الفحص الآن'}
              </button>
            </div>
          )}
          {paper.status === 'CHECKS_FAILED' && (
            <div className="rs-row-actions">
              <button type="button" className="btn outline" onClick={onResubmit}>
                <Icon icon={Upload} size={13} />
                رفع نسخة جديدة
              </button>
            </div>
          )}
        </div>

        {/* Scanning: honest indeterminate state — the scan endpoint
            reports no increments, so the cells sweep instead of faking
            numbers. */}
        {isScanning && <ScanResults scanning />}

        {/* Post-scan results — the declared simulation, gated values. */}
        {!isScanning && hasResults && <ScanResults plagiarismPct={paper.plagiarismPct} aiContentPct={paper.aiContentPct} />}

        {(paper.status === 'GRADED' || paper.status === 'PUBLISHED') && paper.grade != null && (
          <div className="rs-row-grade">
            <div className="rs-row-grade-head">
              <Icon icon={CheckCircle2} size={14} />
              {/* R305-A7: the reviewer identity is the API's OWN data
                  (paper.reviewer) — shown when present, omitted when the
                  server sends none (nothing invented). */}
              <span>
                {paper.reviewer
                  ? <>تقييم الأستاذ <span className="r305rp-res-grade-reviewer">{paper.reviewer.firstName} {paper.reviewer.lastName}</span>: </>
                  : 'تقييم الأستاذ: '}
              </span>
              <span className="font-mono"><bdi>{paper.grade.toFixed(1)} / 20</bdi></span>
            </div>
            {paper.feedback && <p className="rs-row-grade-note">{paper.feedback}</p>}
          </div>
        )}

        {paper.status === 'CHECKS_FAILED' && (
          <div className="rs-row-alert" role="alert">
            <div className="rs-row-alert-title">
              <Icon icon={AlertCircle} size={14} />
              تجاوز البحث الحدود التجريبية المسموح بها (محاكاة)
            </div>
          </div>
        )}

        {paper.status === 'PUBLISHED' && (
          <p className="rs-row-published" style={{ margin: 0 }}>
            <Icon icon={Sparkles} size={13} />
            تم نشر هذا البحث في مكتبة الجامعة.
          </p>
        )}

        {(paper.status === 'GRADED' || paper.status === 'PUBLISHED') && readerPath && (
          <div className="rs-row-actions">
            <RouterLink to={readerPath} className="btn outline">
              <Icon icon={MessageSquare} size={13} />
              مراجعة البحث مع ملاحظات الأستاذ
            </RouterLink>
          </div>
        )}
      </div>
    </RowItem>
  );
}

/* ─── Process explainer (helps demo storytelling) ──────── */
function ProcessExplainer() {
  const STEPS: Array<{ n: number; title: string; desc: string; icon: LucideIcon }> = [
    { n: 1, title: 'ارفع بحثك', desc: 'العنوان، الملخّص، والمقرّر المرتبط.', icon: Upload },
    { n: 2, title: 'فحص أوتوماتيكي', desc: 'كشف الانتحال + كشف توليد الذكاء الاصطناعي خلال ثوانٍ (محاكاة حتى تفعيل كشف حقيقي).', icon: ScanSearch },
    { n: 3, title: 'تقييم الأستاذ', desc: 'بعد اجتياز الفحص، يُقيِّم الأستاذ البحث من 20.', icon: FileText },
    { n: 4, title: 'النشر في المكتبة', desc: 'البحوث المتميزة تُضاف إلى مكتبة الجامعة.', icon: BookMarked },
  ];
  return (
    <section aria-label="كيف يعمل النظام" className="r305rp-res-how">
      {/* R319 (c3-S1): the explainer's heading joins the §B2 title-bar
          register — [02] + the step count as mono meta. */}
      <SectionBar
        index="02"
        title="كيف يعمل النظام"
        meta={<BarCount n={STEPS.length} srLabel={countAr(STEPS.length, ['خطوة واحدة', 'خطوتان', 'خطوات', 'خطوة'])} />}
      />
      <ol className="r305rp-res-steps">
        {STEPS.map((s) => (
          <li key={s.n} className="r305rp-res-step">
            <span className="r305rp-res-step-num" aria-hidden="true"><bdi>{formatInt(s.n)}</bdi></span>
            <div className="r305rp-res-step-body">
              <div className="r305rp-res-step-title">{s.title}</div>
              <div className="r305rp-res-step-desc">{s.desc}</div>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ─── Upload modal (shared Modal primitive: focus trap, Esc, portal) ── */
function UploadModal({
  enrollments, enrollmentsPending, isPending, filePending, fileProgress, error, initial, stagedFile, onClose, onSubmit,
}: {
  enrollments: Array<{ offering: { id: string; course: { name: string; code: string } } }>;
  enrollmentsPending: boolean;
  isPending: boolean;
  /** P3: the file-stage mutation is in flight (refines the submit
   * button's label; isPending already disables for both stages). */
  filePending: boolean;
  /** r164f: the file-stage upload fraction (0..1) — null when idle;
   * paints the real progress bar while the raw body is on the wire. */
  fileProgress: number | null;
  error: string | null;
  /** r157 (F8): prefilled values for a resubmit (CHECKS_FAILED paper) —
   * null on a fresh open; the modal only mounts while open, so the
   * state re-initializes on every open/close cycle (no leakage). */
  initial: { title: string; abstract?: string; offeringId?: string } | null;
  /** r164f: the already-staged File instance (a create failure kept
   * the modal open) — drives the reuse hint on the picked row. */
  stagedFile: File | null;
  onClose: () => void;
  onSubmit: (input: { title: string; abstract?: string; offeringId?: string; file?: File }) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [abstractText, setAbstractText] = useState(initial?.abstract ?? '');
  const [offeringId, setOfferingId] = useState<string>(initial?.offeringId ?? '');
  /* P3: the picked PDF. Optional by design — title + abstract + offering
   * still register the paper (the field says so honestly); when present it
   * is validated client-side BEFORE any request leaves the browser. */
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  /* r164f: pick-validation token — the %PDF- sniff resolves
   * asynchronously; a later pick/removal bumps the token so a stale
   * resolution can never plant its error over a newer pick. */
  const pickTokenRef = useRef(0);
  const canSubmit = title.trim().length >= 3 && !isPending;
  // Label↔control wiring (same useId pattern as the register form):
  // bare <label> text is invisible to assistive tech.
  const titleId = useId();
  const abstractId = useId();
  const offeringFieldId = useId();
  const fileId = useId();

  /* Close-parity (A10 P1-1): the upload draft (title + abstract + the
     picked file) is authoring work — a stray Esc / scrim click must
     confirm before discarding it, exactly like the teacher-side upload
     and review modals. Inert while the upload mutation is in flight. */
  const { requestClose, escapeLocked, guard } = useDiscardGuard({
    dirty:
      title.trim() !== '' ||
      abstractText.trim() !== '' ||
      offeringId !== '' ||
      file !== null,
    pending: isPending,
    onClose,
  });

  const pickFile = (f: File | null) => {
    const token = ++pickTokenRef.current;
    setFile(f);
    setFileError(null);
    if (!f) return;
    /* r164f: the deep mirror (format + size + %PDF- magic bytes) runs
     * at PICK time — a renamed non-PDF is caught with its inline Arabic
     * error BEFORE the student ever reaches the submit button, not
     * after a 20MB round trip (the server's own 400 stays the judge of
     * last resort). Guarded by the token: superseded picks are silent. */
    void validatePdfFileDeep(f).then((err) => {
      if (token !== pickTokenRef.current) return;
      if (err) setFileError(err);
    });
  };
  /* Clearing the value lets the SAME file be re-picked afterwards — a
   * file input only fires change when its value actually differs.
   * Routes through pickFile(null) so a pending pick-validation dies
   * with the pick it belonged to. */
  const removeFile = () => {
    pickFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const submit = () => {
    /* r164f: the async deep guard as the submit backstop — covers a
     * submit that raced the pick-time check (5 bytes re-read, cheap).
     * The honest client mirrors of the server's caps run BEFORE any
     * request leaves the browser. */
    void (async () => {
      const err = file ? await validatePdfFileDeep(file) : null;
      setFileError(err);
      if (err) return;
      await onSubmit({
        title: title.trim(),
        abstract: abstractText.trim() || undefined,
        offeringId: offeringId || undefined,
        file: file ?? undefined,
      });
    })();
  };

  return (
    <Modal
      open
      onClose={requestClose}
      ariaLabel="رفع بحث جديد"
      closeOnOverlayClick={!isPending}
      closeOnEscape={!escapeLocked}
    >
      <div className="modal-header">
        <div className="modal-title">رفع بحث جديد</div>
        <button type="button" className="icon-btn" onClick={requestClose} aria-label="إغلاق" disabled={isPending}>
          <Icon icon={X} size={16} />
        </button>
      </div>
      <div className="modal-body">
        {/* r152c (A2): the four upload-modal fields join the FormField
            canon — labels stay htmlFor-wired. */}
        <FormField
          label="عنوان البحث (مطلوب)"
          id={titleId}
          error={title.trim().length > 0 && title.trim().length < 3
            ? 'يجب أن يكون 3 أحرف على الأقل.'
            : undefined}
        >
          <input
            type="text"
            className="input"
            placeholder="مثال: تطبيق أنماط التصميم في تطبيقات الويب"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </FormField>

        <FormField label="الملخّص (اختياري)" id={abstractId}>
          <textarea
            className="input"
            rows={4}
            placeholder="اكتب ملخصاً مختصراً عن الفكرة، المنهج، والنتائج…"
            value={abstractText}
            onChange={(e) => setAbstractText(e.target.value)}
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
        </FormField>

        <FormField label="المقرّر الأكاديمي المرتبط (اختياري)" id={offeringFieldId}>
          <select className="input" value={offeringId} onChange={(e) => setOfferingId(e.target.value)}>
            <option value="">— غير مرتبط بمقرّر محدّد —</option>
            {enrollmentsPending && (
              <option value="" disabled>جارٍ تحميل مقرراتك المسجَّلة…</option>
            )}
            {enrollments.map((e) => (
              <option key={e.offering.id} value={e.offering.id}>
                {e.offering.course.name} ({e.offering.course.code})
              </option>
            ))}
          </select>
        </FormField>

        <FormField
          label="ملف البحث (PDF، اختياري)"
          id={fileId}
          hint="ملفات PDF فقط، بحد أقصى 20 ميغابايت — بدون ملف يسجّل البحث بعنوانه وملخصه فقط."
          error={fileError ?? undefined}
        >
          <input
            ref={fileInputRef}
            type="file"
            className="input upload-file-input"
            accept="application/pdf,.pdf"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            disabled={isPending}
          />
        </FormField>

        {/* P3: the picked-file row — name + a 44px remove target. */}
        {file && (
          <>
            <div className="upload-file-field">
              <Icon icon={FileText} size={14} className="text-muted" />
              <span className="upload-file-name" title={file.name}><bdi>{file.name}</bdi></span>
              <button
                type="button"
                className="btn ghost sm upload-file-remove"
                onClick={removeFile}
                disabled={isPending}
              >
                <Icon icon={X} size={14} />
                إزالة الملف
              </button>
            </div>
            {/* r164f: the staged-reuse hint — the bytes are already on
                the server, so a retry re-registers the paper WITHOUT
                re-uploading. */}
            {file === stagedFile && (
              <p className="text-sm text-subtle" role="note" style={{ marginBlockStart: 'calc(-1 * var(--sp-1))' }}>
                <Icon icon={CheckCircle2} size={13} />{' '}
                الملف مرفوع بالفعل — إعادة المحاولة ستعيد استخدامه دون رفعه من جديد.
              </p>
            )}
            {/* r164f: the real upload progress — a 20MB body on a slow
                uplink is minutes of dead disabled-button otherwise. */}
            {filePending && fileProgress !== null && (
              <ProgressBar
                value={Math.round(fileProgress * 100)}
                label="جارٍ رفع الملف…"
                ariaLabel="تقدّم رفع الملف"
                showValue
              />
            )}
          </>
        )}

        {error && (
          <p role="alert" className="upload-error">
            {error}
          </p>
        )}
      </div>
      <div className="modal-footer">
        {/* r168b: the hint names the exact unmet condition and is
            announced (role=status + aria-live) so keyboard/SR users
            hear it too. */}
        {!canSubmit && !isPending && (
          <p role="status" aria-live="polite" className="form-field-hint">
            أكمل عنوان البحث (3 أحرف على الأقل) لتتمكّن من الرفع.
          </p>
        )}
        <button type="button" className="btn ghost" onClick={requestClose} disabled={isPending}>
          إلغاء
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={!canSubmit}
          aria-disabled={isPending || undefined}
          onClick={submit}
        >
          <Icon icon={Upload} size={14} />
          {filePending ? 'جارٍ رفع الملف…' : isPending ? 'جارٍ الرفع…' : 'رفع البحث'}
        </button>
      </div>
      {guard}
    </Modal>
  );
}
