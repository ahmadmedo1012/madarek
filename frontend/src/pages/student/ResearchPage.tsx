import { useId, useRef, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  BookMarked, Upload, ShieldCheck, Bot as BotIcon,
  CheckCircle2, XCircle, AlertCircle, ScanSearch, X, Workflow,
  Sparkles, BarChart3, Clock, MessageSquare, FileText, type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge, FormField, ProgressBar } from '../../components/primitives';
import { Skeleton, ErrorState, EmptyState } from '../../components/primitives/States';
import { Modal } from '../../components/overlays/Modal';
import { useDiscardGuard } from '../../components/curriculum/AuthoringModal';
import { PAPER_STATUS_TONE } from '../../lib/paperStatus';
import { validatePdfFileDeep } from '../../lib/pdfUpload';
import { Icon } from '../../components/Icon';
import { toast } from '../../lib/toast';
import { formatDateWithYearAr } from '../../lib/format';
import {
  useMyResearch, useUploadPaper, useUploadPaperFile, useScanPaper,
  useMyEnrollments, apiErrorMessage,
  type ResearchPaper, type PaperStatus,
} from '../../hooks/useResources';

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

/* r149 (R3-A1 #1): السلّم الكنوني المشترك — كان هنا انقسام دلالي
 * (CHECKS_PASSED brand/GRADED green/PUBLISHED purple) يخالف ما يراه
 * الإداري لنفس الورقة. الآن تعريف واحد في lib/paperStatus.ts. */

/* fmtDate (short ar-LY date with year, '—' for missing values) is
 * lib/format.formatDateWithYearAr (13-15 fold, audit 11-f P2-1). */

function plagColor(pct?: number | null) {
  if (pct == null) return 'ok';
  if (pct < 15) return 'ok';
  if (pct < 25) return 'warn';
  return 'bad';
}
function aiColor(pct?: number | null) {
  if (pct == null) return 'ok';
  if (pct < 25) return 'ok';
  if (pct < 40) return 'warn';
  return 'bad';
}

/* Shape-matched skeleton for a paper row (title + course + abstract). */
function PaperRowSkeleton() {
  return (
    <div className="paper-row" aria-hidden>
      <div className="paper-row-head">
        <div className="paper-row-main">
          <Skeleton width="55%" height={16} />
          <div style={{ marginTop: 'var(--sp-2)' }}><Skeleton width={180} height={12} /></div>
          <div style={{ marginTop: 'var(--sp-2)' }}><Skeleton width="90%" height={12} /></div>
        </div>
        <Skeleton width={96} height={22} rounded="var(--r-full)" />
      </div>
      <Skeleton width="100%" height={38} />
    </div>
  );
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
   * فاشلة يفتح النموذج معبّأً ببياناتها (العنوان/الملخّص/المقرّر).
   * الفتح العادي (الترويسة/الحالة الفارغة) يصفّرها؛ الإغلاق يصفّرها
   * أيضاً كي لا يتسرّب بحثٌ سابق إلى فتحٍ لاحق غير مقصود. */
  const [resubmitPrefill, setResubmitPrefill] = useState<{
    title: string;
    abstract?: string;
    offeringId?: string;
  } | null>(null);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  /* r164f: the file-stage upload fraction (0..1) while the raw body is
   * on the wire — null means «no upload in flight»; feeds the modal's
   * real progress bar (a disabled button was the only signal before). */
  const [fileProgress, setFileProgress] = useState<number | null>(null);

  const papers = my.data ?? [];
  const counts = {
    total: papers.length,
    pending: papers.filter((p) => p.status === 'UPLOADED' || p.status === 'SCANNING' || p.status === 'CHECKS_PASSED').length,
    graded: papers.filter((p) => p.status === 'GRADED' || p.status === 'PUBLISHED').length,
    rejected: papers.filter((p) => p.status === 'CHECKS_FAILED').length,
  };

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

  /* Opens the upload modal EMPTY (the normal path — header button and
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
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">بحوثي العلمية</h1>
          <p className="page-subtitle">
            ارفع بحوثك، اعرضها على فحص الانتحال وكشف الذكاء الاصطناعي،
            ثم أرسلها لأستاذك للتقييم والنشر في مكتبة الجامعة.
          </p>
        </div>
        <button type="button" className="btn primary" onClick={openFreshUpload}>
          <Icon icon={Upload} size={14} />
          رفع بحث جديد
        </button>
      </header>

      <div className="grid-4">
        <MetricCard icon={BookMarked} label="إجمالي البحوث" value={counts.total} color="brand" />
        <MetricCard icon={Clock} label="قيد المراجعة" value={counts.pending} color="amber" />
        <MetricCard icon={CheckCircle2} label="مُقيَّمة" value={counts.graded} color="green" />
        <MetricCard icon={XCircle} label="تعذّر اجتياز الفحص" value={counts.rejected} color="red" />
      </div>

      <Card title="بحوثك" icon={BookMarked} subtitle="جميع البحوث التي رفعتها على المنصة">
        {scanError && (
          <div className="alert red" role="alert" style={{ marginBottom: 'var(--sp-3)' }}>
            <span className="alert-dot" />
            <div className="alert-body">
              <div className="alert-title">تعذَّر إجراء الفحص</div>
              <div className="alert-desc">{scanError}</div>
            </div>
          </div>
        )}
        {my.isPending ? (
          <div className="flex-col gap-3">
            <PaperRowSkeleton />
            <PaperRowSkeleton />
          </div>
        ) :
         my.isError ? <ErrorState error={my.error} onRetry={() => my.refetch()} /> :
         !papers.length ? (
          <EmptyState
            icon={BookMarked}
            title="لم ترفع أي بحث بعد"
            description="ابدأ برفع أول بحث لك ليتم فحصه ثم تقييمه من قبل الأستاذ."
            illustration="empty-search"
            action={
              <button type="button" className="btn primary" onClick={openFreshUpload}>
                <Icon icon={Upload} size={14} />
                رفع بحث جديد
              </button>
            }
          />
        ) : (
          <div className="flex-col gap-3">
            {papers.map((p) => (
              <PaperRow
                key={p.id}
                paper={p}
                isScanning={scanningId === p.id || (p.status === 'SCANNING')}
                onScan={() => void startScan(p.id)}
                onResubmit={() => openResubmit(p)}
              />
            ))}
          </div>
        )}
      </Card>

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
          /* r164f: the staged File instance — after a create failure the
           * modal shows the reuse hint on the picked row so the student
           * KNOWS the retry will not re-upload the bytes. Instance
           * identity is the same mechanism the staged upload itself
           * uses (a re-picked file is a new instance → honest re-upload). */
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
               * pins the File instance it belongs to). r164f: the stage
               * reports its progress so the modal can paint it. */
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
    </div>
  );
}

/* ─── Paper row ─────────────────────────────────────────── */
function PaperRow({
  paper, isScanning, onScan, onResubmit,
}: {
  paper: ResearchPaper;
  isScanning: boolean;
  onScan: () => void;
  onResubmit: () => void;
}) {
  const hasResults = paper.plagiarismPct != null || paper.aiContentPct != null;
  return (
    <div className="paper-row">
      <div className="paper-row-head">
        <div className="paper-row-main">
          <div className="paper-row-title">{paper.title}</div>
          {paper.offering && (
            <div className="paper-row-course">
              {paper.offering.course.name} · <span className="font-mono"><bdi>{paper.offering.course.code}</bdi></span>
            </div>
          )}
          {paper.abstract && (
            <p className="paper-row-abstract" title={paper.abstract}>{paper.abstract}</p>
          )}
        </div>
        <div className="paper-row-side">
          <Badge color={PAPER_STATUS_TONE[paper.status]}>{STATUS_LABEL[paper.status]}</Badge>
          <span className="text-xxs text-subtle">رُفع: {formatDateWithYearAr(paper.uploadedAt)}</span>
        </div>
      </div>

      {/* Pre-scan: show CTA */}
      {paper.status === 'UPLOADED' && !isScanning && (
        <button type="button" className="btn outline paper-row-cta" onClick={onScan}>
          <Icon icon={ScanSearch} size={14} />
          ابدأ الفحص الآن
        </button>
      )}

      {/* Scanning: honest indeterminate state — the scan endpoint reports
          no increments, so the cells sweep instead of faking numbers. */}
      {isScanning && (
        <div role="status" aria-live="polite">
          <div className="scan-bar">
            <div className="scan-cell">
              <span className="scan-cell-label">
                <Icon icon={ShieldCheck} size={11} /> فحص الانتحال
              </span>
              <span className="scan-cell-run" aria-hidden />
              <span className="scan-cell-meta">جارٍ احتساب نسبة الانتحال التجريبية…</span>
            </div>
            <div className="scan-cell">
              <span className="scan-cell-label">
                <Icon icon={BotIcon} size={11} /> كشف الذكاء الاصطناعي
              </span>
              <span className="scan-cell-run" aria-hidden />
              <span className="scan-cell-meta">جارٍ احتساب نسبة المحتوى الآلي التجريبية…</span>
            </div>
            <p className="scan-pulse">
              <span className="scan-pulse-dot" aria-hidden />
              جارٍ الفحص — قد تستغرق العملية بضع ثوانٍ
            </p>
          </div>
        </div>
      )}

      {/* Post-scan: show results (.scan-bar/.scan-cell family owned by
          components.css "wave 3-c") */}
      {!isScanning && hasResults && (
        <div className="scan-bar">
          <div className="scan-cell">
            <span className="scan-cell-label">
              <Icon icon={ShieldCheck} size={11} /> نسبة الانتحال
            </span>
            <span className={`scan-cell-value ${plagColor(paper.plagiarismPct)}`}>
              <bdi>{paper.plagiarismPct?.toFixed(1) ?? '—'}%</bdi>
            </span>
            <span className="scan-cell-meta">الحد المقبول: أقل من 15%</span>
          </div>
          <div className="scan-cell">
            <span className="scan-cell-label">
              <Icon icon={BotIcon} size={11} /> محتوى ذكاء اصطناعي
            </span>
            <span className={`scan-cell-value ${aiColor(paper.aiContentPct)}`}>
              <bdi>{paper.aiContentPct?.toFixed(1) ?? '—'}%</bdi>
            </span>
            <span className="scan-cell-meta">الحد المقبول: أقل من 25%</span>
          </div>
        </div>
      )}
      {!isScanning && hasResults && (
        <p className="text-xxs text-subtle" role="note" style={{ marginTop: 'var(--sp-2)' }}>
          نسب الفحص قيم محاكاة تجريبية — ليست قياساً فعلياً حتى تفعيل كشف حقيقي.
        </p>
      )}

      {/* Graded */}
      {(paper.status === 'GRADED' || paper.status === 'PUBLISHED') && paper.grade != null && (
        <div className="paper-row-grade">
          <div className="paper-row-grade-head">
            <Icon icon={CheckCircle2} size={14} />
            تقييم الأستاذ: <span className="font-mono"><bdi>{paper.grade.toFixed(1)} / 20</bdi></span>
          </div>
          {paper.feedback && (
            <p className="paper-row-grade-note">{paper.feedback}</p>
          )}
          {paper.fileUrl && (
            <RouterLink
              to={`/document/${encodeURIComponent(paper.fileUrl.split('/').pop() ?? '')}?title=${encodeURIComponent(paper.title)}&back=${encodeURIComponent('/student/research')}&paper=${encodeURIComponent(paper.id)}`}
              className="btn outline sm"
              style={{ marginTop: 6, alignSelf: 'flex-start' }}
            >
              <Icon icon={MessageSquare} size={13} />
              مراجعة البحث مع ملاحظات الأستاذ
            </RouterLink>
          )}
        </div>
      )}

      {paper.status === 'CHECKS_FAILED' && (
        <div className="paper-row-failed" role="alert">
          <div className="flex items-center gap-2 font-semibold">
            <Icon icon={AlertCircle} size={14} />
            تجاوز البحث الحدود التجريبية المسموح بها (محاكاة) — يُرجى مراجعة المحتوى وإعادة الرفع.
          </div>
          {/* r157 (F8): الإرشاد السابق كان بلا فعل — «راجع وأعد الرفع»
              ثم يفتح الطالب النموذج فارغاً ويسترجع بياناته من ذاكرته.
              الزرّ يفتح UploadModal معبّأً من الورقة الفاشلة
              (العنوان/الملخّص/المقرّر — see openResubmit above). */}
          <button
            type="button"
            className="btn outline sm"
            onClick={onResubmit}
            style={{ alignSelf: 'flex-start', marginTop: 'var(--sp-1)' }}
          >
            <Icon icon={Upload} size={13} />
            رفع نسخة جديدة
          </button>
        </div>
      )}

      {paper.status === 'PUBLISHED' && (
        <div className="paper-row-published">
          <Icon icon={Sparkles} size={13} />
          تم نشر هذا البحث في مكتبة الجامعة.
        </div>
      )}
    </div>
  );
}

/* ─── Process explainer (helps demo storytelling) ──────── */
function ProcessExplainer() {
  const STEPS: Array<{ n: number; title: string; desc: string; icon: LucideIcon }> = [
    { n: 1, title: 'ارفع بحثك', desc: 'العنوان، الملخّص، والمقرّر المرتبط.', icon: Upload },
    { n: 2, title: 'فحص أوتوماتيكي', desc: 'كشف الانتحال + كشف توليد الذكاء الاصطناعي خلال ثوانٍ.', icon: ScanSearch },
    { n: 3, title: 'تقييم الأستاذ', desc: 'بعد اجتياز الفحص، يُقيِّم الأستاذ البحث من 20.', icon: BarChart3 },
    { n: 4, title: 'النشر في المكتبة', desc: 'البحوث المتميزة تُضاف إلى مكتبة الجامعة.', icon: BookMarked },
  ];
  return (
    <Card title="كيف يعمل النظام" icon={Workflow} subtitle="أربع مراحل أوتوماتيكية بالكامل">
      <div className="grid-4">
        {STEPS.map((s) => (
          <div key={s.n} className="process-step">
            <div className="process-step-head">
              <span className="process-step-num">{s.n}</span>
              <Icon icon={s.icon} size={15} className="text-muted" />
            </div>
            <div className="process-step-title">{s.title}</div>
            <div className="process-step-desc">{s.desc}</div>
          </div>
        ))}
      </div>
    </Card>
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
            canon. This also fixes the dangling aria-describedby — the
            old markup pointed at the error id unconditionally while the
            message rendered conditionally; FormField wires the
            association only while the error exists. */}
        <FormField
          label="عنوان البحث"
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

        {/* P3: the picked-file row — name + a 44px remove target; the
            row (not the input) is the affordance once a file is chosen. */}
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
                the server (a create failure kept the modal open), so a
                retry re-registers the paper WITHOUT re-uploading. The
                row itself says nothing about it; this note does. */}
            {file === stagedFile && (
              <p className="text-xxs text-subtle" role="note" style={{ marginBlockStart: 'calc(-1 * var(--sp-1))' }}>
                <Icon icon={CheckCircle2} size={11} />{' '}
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
        <button type="button" className="btn ghost" onClick={requestClose} disabled={isPending}>
          إلغاء
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={!canSubmit}
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
