import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  BookMarked, Upload, ShieldCheck, Bot as BotIcon, FileText,
  CheckCircle2, XCircle, AlertCircle, ScanSearch, X, ChevronLeft,
  Sparkles, BarChart3, Clock, MessageSquare, type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, Badge } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import {
  useMyResearch, useUploadPaper, useScanPaper,
  useMyEnrollments, type ResearchPaper, type PaperStatus,
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

export default function StudentResearchPage() {
  const my = useMyResearch();
  const enrollments = useMyEnrollments();
  const upload = useUploadPaper();
  const scan = useScanPaper();
  const [uploadOpen, setUploadOpen] = useState(false);
  const [scanningId, setScanningId] = useState<string | null>(null);

  const papers = my.data ?? [];
  const counts = {
    total: papers.length,
    pending: papers.filter((p) => p.status === 'UPLOADED' || p.status === 'SCANNING' || p.status === 'CHECKS_PASSED').length,
    graded: papers.filter((p) => p.status === 'GRADED' || p.status === 'PUBLISHED').length,
    rejected: papers.filter((p) => p.status === 'CHECKS_FAILED').length,
  };

  const startScan = async (id: string) => {
    setScanningId(id);
    // Show "scanning" state for 1.4s before the result lands so the demo feels real.
    await new Promise((r) => setTimeout(r, 1400));
    try {
      await scan.mutateAsync(id);
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
        {my.isPending ? <LoadingState /> :
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
          isPending={upload.isPending}
          onClose={() => setUploadOpen(false)}
          onSubmit={async (input) => {
            await upload.mutateAsync(input);
            setUploadOpen(false);
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
  return (
    <div style={{
      padding: 'var(--sp-4)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)',
      background: 'var(--surface-1)',
    }}>
      <div className="flex items-start justify-between gap-3" style={{ marginBottom: 'var(--sp-3)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="text-md font-semibold" style={{ color: 'var(--text)', marginBottom: 4 }}>{paper.title}</div>
          {paper.offering && (
            <div className="text-xs text-subtle">
              {paper.offering.course.name} · <span className="font-mono">{paper.offering.course.code}</span>
            </div>
          )}
          {paper.abstract && (
            <p className="text-xs text-muted" style={{ marginTop: 'var(--sp-2)', lineHeight: 'var(--lh-base)' }}>
              {paper.abstract.length > 200 ? `${paper.abstract.slice(0, 200)}…` : paper.abstract}
            </p>
          )}
        </div>
        <div className="flex-col gap-2 items-end shrink-0">
          <Badge color={STATUS_TONE[paper.status]}>{STATUS_LABEL[paper.status]}</Badge>
          <span className="text-xxs text-subtle">رُفع: {fmtDate(paper.uploadedAt)}</span>
        </div>
      </div>

      {/* Pre-scan: show CTA */}
      {paper.status === 'UPLOADED' && !isScanning && (
        <button type="button" className="btn outline" style={{ width: '100%' }} onClick={onScan}>
          <Icon icon={ScanSearch} size={14} />
          ابدأ الفحص الآن
        </button>
      )}

      {/* Scanning: animated state */}
      {isScanning && (
        <div className="scan-pulse" style={{ width: '100%', justifyContent: 'center' }}>
          <span className="scan-pulse-dot" />
          جارٍ الفحص — كشف الانتحال + الذكاء الاصطناعي…
        </div>
      )}

      {/* Post-scan: show results */}
      {!isScanning && (paper.plagiarismPct != null || paper.aiContentPct != null) && (
        <div className="scan-bar">
          <div className="scan-cell">
            <span className="scan-cell-label flex items-center gap-1">
              <Icon icon={ShieldCheck} size={11} /> نسبة الانتحال
            </span>
            <span className={`scan-cell-value ${plagColor(paper.plagiarismPct)}`}>
              {paper.plagiarismPct?.toFixed(1) ?? '—'}%
            </span>
            <span className="scan-cell-meta">الحد المقبول: أقل من 15%</span>
          </div>
          <div className="scan-cell">
            <span className="scan-cell-label flex items-center gap-1">
              <Icon icon={BotIcon} size={11} /> محتوى ذكاء اصطناعي
            </span>
            <span className={`scan-cell-value ${aiColor(paper.aiContentPct)}`}>
              {paper.aiContentPct?.toFixed(1) ?? '—'}%
            </span>
            <span className="scan-cell-meta">الحد المقبول: أقل من 25%</span>
          </div>
        </div>
      )}

      {/* Graded */}
      {(paper.status === 'GRADED' || paper.status === 'PUBLISHED') && paper.grade != null && (
        <div style={{
          marginTop: 'var(--sp-3)',
          padding: 'var(--sp-3) var(--sp-4)',
          background: 'var(--success-soft)',
          color: 'var(--success)',
          borderRadius: 'var(--r-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}>
          <div className="flex items-center gap-2 font-semibold text-sm">
            <Icon icon={CheckCircle2} size={14} />
            تقييم الأستاذ: <span className="font-mono">{paper.grade.toFixed(1)} / 20</span>
          </div>
          {paper.feedback && (
            <p className="text-xs" style={{ color: 'var(--text-muted)', lineHeight: 'var(--lh-base)' }}>
              {paper.feedback}
            </p>
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
        <div style={{
          marginTop: 'var(--sp-3)',
          padding: 'var(--sp-3) var(--sp-4)',
          background: 'var(--danger-soft)',
          color: 'var(--danger)',
          borderRadius: 'var(--r-md)',
          fontSize: 'var(--fs-xs)',
        }}>
          <div className="flex items-center gap-2 font-semibold">
            <Icon icon={AlertCircle} size={14} />
            تجاوز البحث الحدود المسموح بها — يُرجى مراجعة المحتوى وإعادة الرفع.
          </div>
        </div>
      )}

      {paper.status === 'PUBLISHED' && (
        <div className="flex items-center gap-2 mt-3 text-xs" style={{ color: 'var(--brand-purple)' }}>
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
    <Card title="كيف يعمل النظام" icon={ChevronLeft} subtitle="أربع مراحل أوتوماتيكية بالكامل">
      <div className="grid-4">
        {STEPS.map((s) => (
          <div key={s.n} style={{
            padding: 'var(--sp-4)',
            background: 'var(--surface-2)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--r-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--sp-2)',
          }}>
            <div className="flex items-center gap-2">
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--accent-soft)', color: 'var(--accent)',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 12,
              }}>
                {s.n}
              </div>
              <Icon icon={s.icon} size={15} className="text-muted" />
            </div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{s.title}</div>
            <div className="text-xs text-muted" style={{ lineHeight: 'var(--lh-base)' }}>{s.desc}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ─── Upload modal ──────────────────────────────────────── */
function UploadModal({
  enrollments, isPending, onClose, onSubmit,
}: {
  enrollments: Array<{ offering: { id: string; course: { name: string; code: string } } }>;
  isPending: boolean;
  onClose: () => void;
  onSubmit: (input: { title: string; abstract?: string; offeringId?: string; fileUrl?: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState('');
  const [abstractText, setAbstractText] = useState('');
  const [offeringId, setOfferingId] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const canSubmit = title.trim().length >= 3 && !isPending;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">رفع بحث جديد</div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق">
            <Icon icon={X} size={16} />
          </button>
        </div>
        <div className="modal-body">
          <div className="auth-field">
            <label>عنوان البحث</label>
            <input
              type="text"
              className="input"
              placeholder="مثال: تطبيق أنماط التصميم في تطبيقات الويب"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="auth-field">
            <label>الملخّص (اختياري)</label>
            <textarea
              className="input"
              rows={4}
              placeholder="اكتب ملخصاً مختصراً عن الفكرة، المنهج، والنتائج…"
              value={abstractText}
              onChange={(e) => setAbstractText(e.target.value)}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>

          <div className="auth-field">
            <label>المادة الأكاديمية المرتبطة (اختياري)</label>
            <select className="input" value={offeringId} onChange={(e) => setOfferingId(e.target.value)}>
              <option value="">— غير مرتبط بمادة محدّدة —</option>
              {enrollments.map((e) => (
                <option key={e.offering.id} value={e.offering.id}>
                  {e.offering.course.name} ({e.offering.course.code})
                </option>
              ))}
            </select>
          </div>

          <div className="auth-field">
            <label>الملف</label>
            <div
              style={{
                border: '2px dashed var(--border-strong)',
                borderRadius: 'var(--r-md)',
                padding: 'var(--sp-5)',
                textAlign: 'center',
                background: 'var(--surface-2)',
                cursor: 'pointer',
              }}
              onClick={() => setFileName('research_paper_demo.pdf')}
            >
              <Icon icon={FileText} size={24} className="text-muted" />
              <div className="text-sm" style={{ marginTop: 'var(--sp-2)', color: 'var(--text)' }}>
                {fileName || 'اضغط لاختيار ملف PDF (محاكاة للعرض)'}
              </div>
              <div className="text-xxs text-subtle" style={{ marginTop: 4 }}>
                الحد الأقصى 20 MB · PDF / DOCX
              </div>
            </div>
          </div>
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
      </div>
    </div>
  );
}
