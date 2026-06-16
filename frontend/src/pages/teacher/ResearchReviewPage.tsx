import { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Microscope, TrendingUp, FileText, ShieldCheck, Bot as BotIcon,
  ScanSearch, CheckCircle2, X, Sparkles, BookMarked, BarChart3, MessageSquare,
  Award,
} from 'lucide-react';
import { Card, MetricCard, Badge, UserAvatar, Tabs } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import {
  useResearchQueue, useGradePaper, usePublishPaper, useMyTeacherProfile,
  type ResearchPaper, type PaperStatus,
} from '../../hooks/useResources';

function fmtDate(iso?: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ar-LY', { day: 'numeric', month: 'short' });
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

export default function ResearchReviewPage() {
  const queue = useResearchQueue();
  const [tab, setTab] = useState<Tab>('review');
  const [reviewing, setReviewing] = useState<ResearchPaper | null>(null);

  const passed = (queue.data ?? []).filter((p) => p.status === 'CHECKS_PASSED');
  const failed = (queue.data ?? []).filter((p) => p.status === 'CHECKS_FAILED');

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
            { value: 'review', label: `للمراجعة (${passed.length})` },
            { value: 'mine', label: 'منشوراتي' },
          ]}
        />
      </header>

      {tab === 'review' ? (
        <>
          <div className="grid-3">
            <MetricCard icon={CheckCircle2} label="بانتظار تقييمك" value={passed.length} color="amber" />
            <MetricCard icon={X} label="فشل الفحص" value={failed.length} color="red" />
            <MetricCard icon={BookMarked} label="نشرت في المكتبة" value="—" color="purple" />
          </div>

          <Card title="قائمة المراجعة" icon={ScanSearch} subtitle="بحوث الطلاب التي اجتازت الفحص الأوتوماتيكي وبانتظار تقييمك">
            {queue.isPending ? <LoadingState /> :
             queue.isError ? <ErrorState message="تعذَّر تحميل القائمة" error={queue.error} onRetry={() => queue.refetch()} /> :
             !passed.length ? (
              <EmptyState icon={CheckCircle2} title="لا بحوث في الانتظار" description="ستظهر هنا بحوث الطلاب فور اجتيازها فحص الانتحال والذكاء الاصطناعي." />
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
    <div style={{
      padding: 'var(--sp-4)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--r-md)',
      background: 'var(--surface-1)',
    }}>
      <div className="flex items-start gap-3" style={{ marginBottom: 'var(--sp-3)' }}>
        <UserAvatar initials={initials} color={paper.student.avatarColor ?? undefined} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="text-md font-semibold" style={{ color: 'var(--text)' }}>{paper.title}</div>
          <div className="text-xs text-subtle" style={{ marginTop: 2 }}>
            {paper.student.firstName} {paper.student.lastName}
            {paper.offering && (<> · {paper.offering.course.name} (<span className="font-mono">{paper.offering.course.code}</span>)</>)}
          </div>
        </div>
        <Badge color={paper.status === 'CHECKS_PASSED' ? 'amber' : 'red'}>
          {STATUS_LABEL[paper.status]}
        </Badge>
      </div>
      <div className="flex items-center gap-3 text-xs" style={{ marginBottom: 'var(--sp-3)' }}>
        <span className={plagOK ? 'text-green' : 'text-red'} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon icon={ShieldCheck} size={12} />
          انتحال: <span className="font-mono">{paper.plagiarismPct?.toFixed(1) ?? '—'}%</span>
        </span>
        <span className={aiOK ? 'text-green' : 'text-red'} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <Icon icon={BotIcon} size={12} />
          AI: <span className="font-mono">{paper.aiContentPct?.toFixed(1) ?? '—'}%</span>
        </span>
        <span className="text-subtle">·</span>
        <span className="text-subtle">رُفع {fmtDate(paper.uploadedAt)}</span>
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
  const grade = useGradePaper();
  const publish = usePublishPaper();
  const [score, setScore] = useState<number>(paper.grade ?? 15);
  const [feedback, setFeedback] = useState<string>(paper.feedback ?? '');

  const isGraded = paper.status === 'GRADED' || paper.status === 'PUBLISHED';

  const submit = async () => {
    await grade.mutateAsync({ id: paper.id, grade: score, feedback: feedback || undefined });
    onClose();
  };
  const publishNow = async () => {
    await publish.mutateAsync(paper.id);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
        <div className="modal-header">
          <div className="modal-title">مراجعة بحث</div>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق">
            <Icon icon={X} size={16} />
          </button>
        </div>
        <div className="modal-body">
          <div className="text-xs text-subtle">{paper.student.firstName} {paper.student.lastName}</div>
          <div className="text-md font-semibold" style={{ color: 'var(--text)', marginBottom: 'var(--sp-4)' }}>{paper.title}</div>

          {paper.abstract && (
            <>
              <div className="section-title">الملخّص</div>
              <p className="text-sm text-muted" style={{ lineHeight: 'var(--lh-loose)', marginBottom: 'var(--sp-4)' }}>
                {paper.abstract}
              </p>
            </>
          )}

          <div className="section-title">نتائج الفحص الأوتوماتيكي</div>
          <div className="scan-bar" style={{ marginBottom: 'var(--sp-5)' }}>
            <div className="scan-cell">
              <span className="scan-cell-label flex items-center gap-1">
                <Icon icon={ShieldCheck} size={11} /> نسبة الانتحال
              </span>
              <span className={`scan-cell-value ${(paper.plagiarismPct ?? 0) < 15 ? 'ok' : 'bad'}`}>
                {paper.plagiarismPct?.toFixed(1) ?? '—'}%
              </span>
            </div>
            <div className="scan-cell">
              <span className="scan-cell-label flex items-center gap-1">
                <Icon icon={BotIcon} size={11} /> محتوى AI
              </span>
              <span className={`scan-cell-value ${(paper.aiContentPct ?? 0) < 25 ? 'ok' : 'bad'}`}>
                {paper.aiContentPct?.toFixed(1) ?? '—'}%
              </span>
            </div>
          </div>

          <div className="section-title">التقييم</div>
          <div className="auth-row" style={{ marginBottom: 'var(--sp-4)' }}>
            <div>
              <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 6 }}>الدرجة (من 20)</label>
              <input
                type="number"
                min={0}
                max={20}
                step={0.5}
                className="input"
                value={score}
                onChange={(e) => setScore(Math.max(0, Math.min(20, Number(e.target.value))))}
                disabled={isGraded}
              />
            </div>
            <div>
              <label className="text-xs text-muted" style={{ display: 'block', marginBottom: 6 }}>التقدير</label>
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
              />
            </div>
          </div>

          <div className="auth-field">
            <label>ملاحظات للطالب</label>
            <textarea
              rows={4}
              className="input"
              placeholder="اكتب ملاحظاتك على البحث…"
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              disabled={isGraded}
              style={{ resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
        </div>
        <div className="modal-footer">
          {!isGraded ? (
            <>
              <button type="button" className="btn ghost" onClick={onClose}>إلغاء</button>
              <button type="button" className="btn primary" onClick={() => void submit()} disabled={grade.isPending}>
                <Icon icon={CheckCircle2} size={14} />
                {grade.isPending ? 'جارٍ الحفظ…' : 'تأكيد التقييم'}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn ghost" onClick={onClose}>إغلاق</button>
              {paper.status === 'GRADED' && (
                <button type="button" className="btn primary" onClick={() => void publishNow()} disabled={publish.isPending}>
                  <Icon icon={Sparkles} size={14} />
                  {publish.isPending ? 'جارٍ النشر…' : 'نشر في المكتبة'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Teacher's own publications (real teacher profile data) ─── */
function MyPublications() {
  const profile = useMyTeacherProfile();
  const publications = profile.data?.publications ?? [];
  const certifications = profile.data?.certifications ?? [];
  const awards = profile.data?.awards ?? [];

  if (profile.isPending) return <LoadingState />;
  if (profile.isError) return <ErrorState error={profile.error} onRetry={() => profile.refetch()} />;

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
            title="لم تُسجَّل منشورات بعد"
            description="حدِّث ملفك الأكاديميّ لإضافة بحوثك المنشورة."
          />
        ) : (
          <div className="flex-col gap-2">
            {publications.map((p, i) => (
              <div key={`${p.title}-${i}`} className="list-row">
                <span className="list-row-meta">{p.year}</span>
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
