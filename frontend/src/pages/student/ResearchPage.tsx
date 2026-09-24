import { useId, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  BookMarked, Upload, ShieldCheck, Bot as BotIcon, FileText,
  CheckCircle2, XCircle, AlertCircle, ScanSearch, X, Workflow,
  Sparkles, BarChart3, Clock, MessageSquare, type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge } from '../../components/primitives';
import { Skeleton, ErrorState, EmptyState } from '../../components/primitives/States';
import { Modal } from '../../components/overlays/Modal';
import { Icon } from '../../components/Icon';
import { toast } from '../../lib/toast';
import {
  useMyResearch, useUploadPaper, useScanPaper,
  useMyEnrollments, apiErrorMessage,
  type ResearchPaper, type PaperStatus,
} from '../../hooks/useResources';

const STATUS_LABEL: Record<PaperStatus, string> = {
  UPLOADED: 'بانتظار الفحص',
  SCANNING: 'جارٍ الفحص',
  CHECKS_PASSED: 'بانتظار تقييم الأستاذ',
  CHECKS_FAILED: 'فشل الفحص',
  GRADED: 'مُقيَّم',
  PUBLISHED: 'مُنشور في المكتبة',
};

const STATUS_TONE: Record<PaperStatus, 'brand' | 'green' | 'amber' | 'red' | 'gold' | 'purple'> = {
  UPLOADED: 'amber',
  SCANNING: 'brand',
  CHECKS_PASSED: 'brand',
  CHECKS_FAILED: 'red',
  GRADED: 'green',
  PUBLISHED: 'purple',
};

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ar-LY', { day: 'numeric', month: 'short', year: 'numeric' });
}

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
  const scan = useScanPaper();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [scanningId, setScanningId] = useState<string | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

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
        <button type="button" className="btn primary" onClick={() => setUploadOpen(true)}>
          <Icon icon={Upload} size={14} />
          رفع بحث جديد
        </button>
      </header>

      <div className="grid-4">
        <MetricCard icon={BookMarked} label="إجمالي البحوث" value={counts.total} color="brand" />
        <MetricCard icon={Clock} label="قيد المراجعة" value={counts.pending} color="amber" />
        <MetricCard icon={CheckCircle2} label="مُقيَّمة" value={counts.graded} color="green" />
        <MetricCard icon={XCircle} label="فشل الفحص" value={counts.rejected} color="red" />
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
            action={
              <button type="button" className="btn primary" onClick={() => setUploadOpen(true)}>
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
          isPending={upload.isPending}
          error={uploadError}
          onClose={() => { setUploadOpen(false); setUploadError(null); }}
          onSubmit={async (input) => {
            setUploadError(null);
            try {
              await upload.mutateAsync(input);
              setUploadOpen(false);
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
  paper, isScanning, onScan,
}: {
  paper: ResearchPaper;
  isScanning: boolean;
  onScan: () => void;
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
          <Badge color={STATUS_TONE[paper.status]}>{STATUS_LABEL[paper.status]}</Badge>
          <span className="text-xxs text-subtle">رُفع: {fmtDate(paper.uploadedAt)}</span>
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
              <span className="scan-cell-meta">جارٍ المقارنة مع الأبحاث المنشورة ومصادر الإنترنت…</span>
            </div>
            <div className="scan-cell">
              <span className="scan-cell-label">
                <Icon icon={BotIcon} size={11} /> كشف الذكاء الاصطناعي
              </span>
              <span className="scan-cell-run" aria-hidden />
              <span className="scan-cell-meta">جارٍ تحليل أنماط الكتابة…</span>
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
            تجاوز البحث الحدود المسموح بها — يُرجى مراجعة المحتوى وإعادة الرفع.
          </div>
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
    { n: 1, title: 'ارفع بحثك', desc: 'العنوان، الملخّص، الملف، والمادة المرتبطة.', icon: Upload },
    { n: 2, title: 'فحص أوتوماتيكي', desc: 'كشف الانتحال + كشف توليد الذكاء الاصطناعي خلال ثوانٍ.', icon: ScanSearch },
    { n: 3, title: 'تقييم الأستاذ', desc: 'بعد اجتياز الفحص، يُقيِّم الأستاذ البحث من 20.', icon: BarChart3 },
    { n: 4, title: 'النشر في المكتبة', desc: 'البحوث المتميزة تُضاف إلى مكتبة الجامعة وResearchGate.', icon: BookMarked },
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
  enrollments, enrollmentsPending, isPending, error, onClose, onSubmit,
}: {
  enrollments: Array<{ offering: { id: string; course: { name: string; code: string } } }>;
  enrollmentsPending: boolean;
  isPending: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (input: { title: string; abstract?: string; offeringId?: string; fileUrl?: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [abstractText, setAbstractText] = useState('');
  const [offeringId, setOfferingId] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const canSubmit = title.trim().length >= 3 && !isPending;
  // Label↔control wiring (same useId pattern as the register form):
  // bare <label> text is invisible to assistive tech.
  const titleId = useId();
  const abstractId = useId();
  const offeringFieldId = useId();
  const fileId = useId();

  return (
    <Modal
      open
      onClose={onClose}
      ariaLabel="رفع بحث جديد"
      closeOnOverlayClick={!isPending}
      closeOnEscape={!isPending}
    >
      <div className="modal-header">
        <div className="modal-title">رفع بحث جديد</div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق" disabled={isPending}>
          <Icon icon={X} size={16} />
        </button>
      </div>
      <div className="modal-body">
        <div className="auth-field">
          <label htmlFor={titleId}>عنوان البحث</label>
          <input
            id={titleId}
            type="text"
            className="input"
            placeholder="مثال: تطبيق أنماط التصميم في تطبيقات الويب"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label htmlFor={abstractId}>الملخّص (اختياري)</label>
          <textarea
            id={abstractId}
            className="input"
            rows={4}
            placeholder="اكتب ملخصاً مختصراً عن الفكرة، المنهج، والنتائج…"
            value={abstractText}
            onChange={(e) => setAbstractText(e.target.value)}
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div className="auth-field">
          <label htmlFor={offeringFieldId}>المادة الأكاديمية المرتبطة (اختياري)</label>
          <select id={offeringFieldId} className="input" value={offeringId} onChange={(e) => setOfferingId(e.target.value)}>
            <option value="">— غير مرتبط بمادة محدّدة —</option>
            {enrollmentsPending && (
              <option value="" disabled>جارٍ تحميل مقرراتك المسجَّلة…</option>
            )}
            {enrollments.map((e) => (
              <option key={e.offering.id} value={e.offering.id}>
                {e.offering.course.name} ({e.offering.course.code})
              </option>
            ))}
          </select>
        </div>

        <div className="auth-field">
          <label htmlFor={fileId}>الملف</label>
          <button
            id={fileId}
            type="button"
            className={`upload-dropzone${fileName ? ' has-file' : ''}`}
            onClick={() => setFileName('research_paper_demo.pdf')}
          >
            <Icon icon={fileName ? FileText : Upload} size={24} className={fileName ? '' : 'text-muted'} />
            <span className="text-sm" style={{ color: 'var(--text)' }}>
              {fileName ? <bdi>{fileName}</bdi> : 'اضغط لاختيار ملف PDF (محاكاة للعرض)'}
            </span>
            <span className="text-xxs text-subtle">
              الحد الأقصى 20 MB · PDF / DOCX
            </span>
          </button>
        </div>

        {error && (
          <p role="alert" className="upload-error">
            {error}
          </p>
        )}
      </div>
      <div className="modal-footer">
        <button type="button" className="btn ghost" onClick={onClose} disabled={isPending}>
          إلغاء
        </button>
        <button
          type="button"
          className="btn primary"
          disabled={!canSubmit}
          onClick={() => void onSubmit({
            title: title.trim(),
            abstract: abstractText.trim() || undefined,
            offeringId: offeringId || undefined,
            fileUrl: fileName ? `https://example.invalid/${fileName}` : undefined,
          })}
        >
          <Icon icon={Upload} size={14} />
          {isPending ? 'جارٍ الرفع…' : 'رفع البحث'}
        </button>
      </div>
    </Modal>
  );
}
