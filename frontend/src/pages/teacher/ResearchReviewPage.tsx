import { useId, useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Microscope, FileText, ShieldCheck, Bot as BotIcon,
  ScanSearch, CheckCircle2, X, Sparkles, BookMarked, BarChart3, MessageSquare,
  Award, StickyNote, RefreshCw,
} from 'lucide-react';
import { Card, MetricCard, Badge, UserAvatar, Tabs } from '../../components/primitives';
import { Skeleton, EmptyState, ErrorState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/overlays/Modal';
import { toast } from '../../lib/toast';
import { formatDateAr } from '../../lib/format';
import {
  useResearchQueue, useGradePaper, usePublishPaper, useMyTeacherProfile,
  useAnnotations, apiErrorMessage,
  type ResearchPaper, type PaperStatus,
} from '../../hooks/useResources';

/* fmtDate (short ar-LY date, '—' for missing values) is
 * lib/format.formatDateAr (13-15 fold, audit 11-f P2-1) — shared with
 * CourseDetailPage's former unguarded copy. */

function fmtRelative(iso: string): string {
  const m = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'الآن';
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.round(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  return formatDateAr(iso);
}

const STATUS_LABEL: Record<PaperStatus, string> = {
  UPLOADED: 'بانتظار الفحص',
  SCANNING: 'جارٍ الفحص',
  CHECKS_PASSED: 'بانتظار التقييم',
  CHECKS_FAILED: 'فشل الفحص',
  GRADED: 'مُقيَّم',
  PUBLISHED: 'مُنشور',
};

type Tab = 'review' | 'mine';

/** Shape-matched skeleton for the 3-KPI strip (metric-card anatomy). */
function Kpi3Skeleton() {
  return (
    <div className="grid-3" aria-busy="true" aria-live="polite">
      {[0, 1, 2].map((i) => (
        <div key={i} className="metric" aria-hidden>
          <div style={{ marginBlockEnd: 'var(--sp-3)' }}>
            <Skeleton width={90} height={11} />
          </div>
          <Skeleton width={60} height={26} />
        </div>
      ))}
    </div>
  );
}

export default function ResearchReviewPage() {
  const queue = useResearchQueue();
  const [tab, setTab] = useState<Tab>('review');
  const [reviewing, setReviewing] = useState<ResearchPaper | null>(null);

  const passed = (queue.data ?? []).filter((p) => p.status === 'CHECKS_PASSED');
  const failed = (queue.data ?? []).filter((p) => p.status === 'CHECKS_FAILED');
  // Real count replacing the old dead "—" KPI (audit 0-e P2-40).
  const readyToPublish = (queue.data ?? []).filter((p) => p.status === 'GRADED').length;
  // KPIs never show a masked "0" on API-down (ruling #14).
  const kpiValue = (n: number) => (queue.isError ? '—' : n);

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">البحث العلمي</h1>
          <p className="page-subtitle">قائمة بحوث الطلاب للمراجعة، ومنشوراتك العلمية.</p>
        </div>
        <Tabs<Tab>
          value={tab}
          onChange={setTab}
          items={[
            { value: 'review', label: `للمراجعة${queue.data ? ` (${passed.length})` : ''}` },
            { value: 'mine', label: 'منشوراتي' },
          ]}
        />
      </header>

      {tab === 'review' ? (
        <>
          {queue.isPending ? (
            <Kpi3Skeleton />
          ) : (
            <div className="grid-3">
              <MetricCard icon={CheckCircle2} label="بانتظار تقييمك" value={kpiValue(passed.length)} color="amber" />
              <MetricCard icon={X} label="فشل الفحص" value={kpiValue(failed.length)} color="red" />
              <MetricCard icon={BookMarked} label="جاهزة للنشر" value={kpiValue(readyToPublish)} color="purple" />
            </div>
          )}

          <Card title="قائمة المراجعة" icon={ScanSearch} subtitle="بحوث الطلاب التي اجتازت الفحص الأوتوماتيكي وبانتظار تقييمك">
            {queue.isPending ? (
              <div className="flex-col gap-3" aria-busy="true" aria-live="polite">
                {[0, 1].map((i) => (
                  <div key={i} className="paper-row" aria-hidden>
                    <div className="flex items-center gap-3">
                      <Skeleton width={36} height={36} rounded="50%" />
                      <div className="flex-col gap-2 flex-1">
                        <Skeleton width="55%" height={14} />
                        <Skeleton width="35%" height={10} />
                      </div>
                    </div>
                    <Skeleton width="40%" height={10} />
                  </div>
                ))}
              </div>
            ) : queue.isError ? (
              <ErrorState
                message="تعذَّر تحميل قائمة المراجعة"
                error={queue.error}
                onRetry={() => queue.refetch()}
              />
            ) : !passed.length ? (
              <EmptyState
                icon={CheckCircle2}
                title="لا بحوث في الانتظار"
                description="ستظهر هنا بحوث الطلاب فور اجتيازها فحص الانتحال والذكاء الاصطناعي."
              />
            ) : (
              <div className="flex-col gap-3">
                {passed.map((p) => (
                  <ReviewRow key={p.id} paper={p} onOpen={() => setReviewing(p)} />
                ))}
              </div>
            )}
          </Card>

          {failed.length > 0 && (
            <Card title="رفضها الفحص الأوتوماتيكي" icon={X} subtitle="بحوث تجاوزت الحدود المسموحة — لا تحتاج تقييماً">
              <div className="flex-col gap-3">
                {failed.map((p) => (
                  <ReviewRow key={p.id} paper={p} onOpen={() => setReviewing(p)} />
                ))}
              </div>
            </Card>
          )}
        </>
      ) : (
        <MyPublications />
      )}

      {reviewing && (
        <ReviewModal paper={reviewing} onClose={() => setReviewing(null)} />
      )}
    </div>
  );
}

function ReviewRow({ paper, onOpen }: { paper: ResearchPaper; onOpen: () => void }) {
  const initials = paper.student.avatarInitials ?? `${paper.student.firstName[0]}${paper.student.lastName[0]}`;
  const plagOK = (paper.plagiarismPct ?? 0) < 15;
  const aiOK = (paper.aiContentPct ?? 0) < 25;
  return (
    // .paper-row family is owned by student.css §research (shared grammar)
    <div className="paper-row">
      <div className="paper-row-head">
        <div className="flex items-center gap-3">
          <UserAvatar initials={initials} color={paper.student.avatarColor ?? undefined} size={36} />
          <div className="paper-row-main">
            <div className="paper-row-title">{paper.title}</div>
            <div className="paper-row-course">
              {paper.student.firstName} {paper.student.lastName}
              {paper.offering && (<> · {paper.offering.course.name} (<bdi className="font-mono">{paper.offering.course.code}</bdi>)</>)}
            </div>
          </div>
        </div>
        <Badge color={paper.status === 'CHECKS_PASSED' ? 'amber' : 'red'}>
          {STATUS_LABEL[paper.status]}
        </Badge>
      </div>
      <div className="review-row-meta">
        <span className={plagOK ? 'text-green' : 'text-red'}>
          <Icon icon={ShieldCheck} size={12} />
          انتحال: <bdi className="font-mono">{paper.plagiarismPct?.toFixed(1) ?? '—'}%</bdi>
        </span>
        <span className={aiOK ? 'text-green' : 'text-red'}>
          <Icon icon={BotIcon} size={12} />
          <bdi>AI</bdi>: <bdi className="font-mono">{paper.aiContentPct?.toFixed(1) ?? '—'}%</bdi>
        </span>
        <span className="text-subtle">·</span>
        <span className="text-subtle">رُفع {formatDateAr(paper.uploadedAt)}</span>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
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
  );
}

function ReviewModal({ paper, onClose }: { paper: ResearchPaper; onClose: () => void }) {
  const uid = useId();
  const grade = useGradePaper();
  const publish = usePublishPaper();
  const annotations = useAnnotations(paper.id);
  const [score, setScore] = useState<number>(paper.grade ?? 15);
  const [feedback, setFeedback] = useState<string>(paper.feedback ?? '');
  // Inline, action-named feedback (audit 0-e P0-11): both mutations used to
  // await mutateAsync with no catch — an API failure was an unhandled
  // rejection while the modal kept looking usable.
  const [gradeError, setGradeError] = useState<string | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const isGraded = paper.status === 'GRADED' || paper.status === 'PUBLISHED';
  const busy = grade.isPending || publish.isPending;

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

  const annotationRows = annotations.data
    ? [...annotations.data].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];

  return (
    <Modal open onClose={onClose} ariaLabel="مراجعة بحث" closeOnOverlayClick={!busy}>
      <div className="modal-header">
        <div className="modal-title">مراجعة بحث</div>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق" disabled={busy}>
          <Icon icon={X} size={16} />
        </button>
      </div>
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
        {/* The grading form lives OUTSIDE the scan grid now — a misplaced
            closing div used to nest the whole form inside .scan-bar
            (audit 0-e P2-40). */}
        <div className="scan-bar" style={{ marginBlockEnd: 'var(--sp-4)' }}>
          <div className="scan-cell">
            <span className="scan-cell-label flex items-center gap-1">
              <Icon icon={ShieldCheck} size={11} /> نسبة الانتحال
            </span>
            <span className={`scan-cell-value ${(paper.plagiarismPct ?? 0) < 15 ? 'ok' : 'bad'}`}>
              <bdi>{paper.plagiarismPct?.toFixed(1) ?? '—'}%</bdi>
            </span>
          </div>
          <div className="scan-cell">
            <span className="scan-cell-label flex items-center gap-1">
              <Icon icon={BotIcon} size={11} /> محتوى <bdi>AI</bdi>
            </span>
            <span className={`scan-cell-value ${(paper.aiContentPct ?? 0) < 25 ? 'ok' : 'bad'}`}>
              <bdi>{paper.aiContentPct?.toFixed(1) ?? '—'}%</bdi>
            </span>
          </div>
        </div>

        <div className="section-title">التقييم</div>
        <div className="form-grid-2" style={{ marginBlockEnd: 'var(--sp-4)' }}>
          <div>
            <label className="form-label" htmlFor={`${uid}-score`}>الدرجة (من 20)</label>
            <input
              id={`${uid}-score`}
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
          </div>
          <div>
            <label className="form-label" htmlFor={`${uid}-rating`}>التقدير</label>
            <input
              id={`${uid}-rating`}
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
          </div>
        </div>

        <div className="flex-col gap-2">
          <label className="form-label" htmlFor={`${uid}-feedback`}>ملاحظات للطالب</label>
          <textarea
            id={`${uid}-feedback`}
            rows={4}
            className="input"
            placeholder="اكتب ملاحظاتك على البحث…"
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            disabled={isGraded || grade.isPending}
            style={{ resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

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
                      {a.author.firstName} {a.author.lastName} · صفحة <bdi>{a.page}</bdi> · {fmtRelative(a.createdAt)}
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
            <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>إلغاء</button>
            <button type="button" className="btn primary" onClick={() => void submit()} disabled={busy}>
              <Icon icon={CheckCircle2} size={14} />
              {grade.isPending ? 'جارٍ الحفظ…' : 'تأكيد التقييم'}
            </button>
          </>
        ) : (
          <>
            <button type="button" className="btn ghost" onClick={onClose} disabled={busy}>إغلاق</button>
            {paper.status === 'GRADED' && (
              <button type="button" className="btn primary" onClick={() => void publishNow()} disabled={busy}>
                <Icon icon={Sparkles} size={14} />
                {publish.isPending ? 'جارٍ النشر…' : 'نشر في المكتبة'}
              </button>
            )}
          </>
        )}
      </div>
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
        <Kpi3Skeleton />
        <Card>
          <div className="flex-col gap-2" aria-busy="true" aria-live="polite">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3" aria-hidden>
                <Skeleton width={40} height={12} />
                <Skeleton width={`${60 - i * 10}%`} height={14} />
              </div>
            ))}
          </div>
        </Card>
      </>
    );
  }
  if (profile.isError) {
    return (
      <Card>
        <ErrorState
          message="تعذَّر تحميل منشوراتك"
          error={profile.error}
          onRetry={() => profile.refetch()}
        />
      </Card>
    );
  }

  return (
    <>
      <div className="grid-3">
        <MetricCard
          icon={Microscope}
          label="منشورات في ملفّك"
          value={publications.length.toLocaleString('ar-LY')}
          change={publications.length === 0 ? 'لم تُسجَّل بعد' : undefined}
          color="brand"
        />
        <MetricCard
          icon={Award}
          label="شهادات وجوائز"
          value={(certifications.length + awards.length).toLocaleString('ar-LY')}
          color="green"
        />
        <MetricCard
          icon={BarChart3}
          label="سنوات الخبرة"
          value={(profile.data?.yearsExperience ?? 0).toLocaleString('ar-LY')}
          color="amber"
        />
      </div>
      <Card title="منشوراتي" icon={Microscope}>
        {publications.length === 0 ? (
          <EmptyState
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
          <div className="flex-col gap-2">
            {publications.map((p, i) => (
              <div key={`${p.title}-${i}`} className="list-row">
                <bdi className="list-row-meta font-mono">{p.year}</bdi>
                <div className="list-row-body">
                  <div className="list-row-title">{p.title}</div>
                  {p.venue && <div className="list-row-sub">{p.venue}</div>}
                </div>
                {p.url && (
                  <a href={p.url} target="_blank" rel="noreferrer" className="btn ghost sm">
                    فتح
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}
