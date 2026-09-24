import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, ChevronRight, ListOrdered, ListVideo, Play, Sparkles, XCircle,
} from 'lucide-react';
import { Badge, Card } from '../../components/primitives';
import { EmptyState, ErrorState, Skeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/overlays/Modal';
import { useLecture, useReportWatch, useAnswerCheckpoint, type LectureCheckpoint } from '../../hooks/useResources';

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/* Option markers — checkpoint options are 2..6 (curriculumValidation.ts
   caps them at MAX_CHECKPOINT_OPTIONS = 6); the numeral is a fallback. */
const OPTION_MARKS = ['أ', 'ب', 'ج', 'د', 'هـ', 'و'];

/* Shape-matched loading skeleton: back-link chip + 16:9 video frame +
   meta lines + chapter sidebar rows (audit 0-d P2 — the page used a
   bare <LoadingState/> spinner with no .page chrome, so the layout
   jumped when data landed and the error state had no way back). */
function LectureSkeleton() {
  return (
    <div className="page" aria-busy="true" aria-live="polite">
      <Skeleton width={150} height={32} rounded="var(--r-md)" />
      <div className="lecture-shell">
        <div className="lecture-main">
          <div className="lecture-video-wrap">
            <Skeleton width="100%" height="100%" rounded="var(--r-xl)" />
          </div>
          <div className="flex-col gap-2">
            <Skeleton width="42%" height={20} />
            <Skeleton width="70%" height={12} />
            <Skeleton width="55%" height={12} />
          </div>
        </div>
        <div className="card">
          <Skeleton width={120} height={16} />
          <div className="flex-col gap-3" style={{ marginTop: 'var(--sp-4)' }}>
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton width={44} height={24} rounded="var(--r-xs)" />
                <div className="flex-1 flex-col gap-2">
                  <Skeleton width={`${88 - i * 14}%`} height={12} />
                  <Skeleton width={`${54 - i * 10}%`} height={10} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LecturePlayerPage() {
  const { lectureId } = useParams<{ lectureId: string }>();
  const { data, isPending, isError, error, refetch } = useLecture(lectureId);
  const reportWatch = useReportWatch();
  const answerCheckpoint = useAnswerCheckpoint();
  const qc = useQueryClient();

  const videoRef = useRef<HTMLVideoElement>(null);
  const [currentSec, setCurrentSec] = useState(0);
  const [activeCheckpoint, setActiveCheckpoint] = useState<LectureCheckpoint | null>(null);
  const [answeredCheckpointIds, setAnsweredCheckpointIds] = useState<Set<string>>(new Set());
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [revealResult, setRevealResult] = useState<{ correct: boolean; correctIndex: number; explanation?: string } | null>(null);
  const [answerError, setAnswerError] = useState(false);

  // Periodic watch-event reporting (every 10 sec while playing)
  useEffect(() => {
    if (!data) return;
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v || v.paused || v.ended) return;
      reportWatch.mutate({
        lectureId: data.id,
        watchedSec: Math.round(v.currentTime),
        totalSec: data.durationSec,
        completed: v.currentTime / data.durationSec >= 0.95,
      });
    }, 10_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  // Trigger a checkpoint when crossing its time, once per lecture session.
  useEffect(() => {
    if (!data || activeCheckpoint) return;
    const due = data.checkpoints.find(
      (c) => currentSec >= c.triggerSec && !answeredCheckpointIds.has(c.id),
    );
    if (due) {
      setActiveCheckpoint(due);
      setPickedIndex(null);
      setRevealResult(null);
      setAnswerError(false);
      videoRef.current?.pause();
    }
  }, [currentSec, data, activeCheckpoint, answeredCheckpointIds]);

  // No lecture id in the URL — the route normally guarantees one; this
  // branch keeps a malformed deep link honest instead of pending forever
  // (useLecture stays `enabled: false` → isPending never resolves).
  if (!lectureId) {
    return (
      <div className="page">
        <EmptyState
          icon={ListVideo}
          title="لم يتم تحديد محاضرة"
          description="الرابط لا يتضمّن محاضرة — اختر محاضرة من المقرر للمتابعة."
          action={<Link className="btn ghost sm" to="/student/courses">العودة إلى مقرراتي</Link>}
        />
      </div>
    );
  }
  if (isPending) return <LectureSkeleton />;
  if (isError || !data) {
    return (
      <div className="page">
        <Link to="/student/courses" className="btn ghost sm" style={{ alignSelf: 'flex-start' }}>
          <Icon icon={ChevronRight} size={13} />
          العودة إلى مقرراتي
        </Link>
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  const seekTo = (sec: number) => {
    const v = videoRef.current;
    if (v) {
      v.currentTime = sec;
      void v.play();
    }
  };

  const submitAnswer = async (index: number) => {
    if (!activeCheckpoint || pickedIndex !== null) return;
    setPickedIndex(index);
    setAnswerError(false);
    try {
      const result = await answerCheckpoint.mutateAsync({
        lectureId: data.id,
        checkpointId: activeCheckpoint.id,
        answerIndex: index,
      });
      setRevealResult(result);
      // Refresh gaps + matrix on next focus.
      void qc.invalidateQueries({ queryKey: ['me', 'gaps'] });
      void qc.invalidateQueries({ queryKey: ['me', 'matrix'] });
    } catch {
      // Recoverable transport failure (not a wrong answer): re-enable
      // the options so the student can retry, and say what happened —
      // error states are first-class (orchestrator ruling #14).
      setPickedIndex(null);
      setAnswerError(true);
    }
  };

  const closeCheckpoint = () => {
    if (!activeCheckpoint) return;
    setAnsweredCheckpointIds((prev) => new Set(prev).add(activeCheckpoint.id));
    setActiveCheckpoint(null);
    setPickedIndex(null);
    setRevealResult(null);
    setAnswerError(false);
    void videoRef.current?.play();
  };

  // Watch progress — live position (throttled to 1 render/sec below)
  // floored by the server-saved maximum, so a resumed lecture starts
  // at its recorded progress instead of 0%.
  const totalSec = data.durationSec;
  const livePct = totalSec > 0 ? Math.min(100, Math.round((currentSec / totalSec) * 100)) : 0;
  const savedSec = (data.watchEvents ?? []).reduce((max, e) => Math.max(max, e.watchedSec), 0);
  const savedPct = totalSec > 0 ? Math.min(100, Math.round((savedSec / totalSec) * 100)) : 0;
  const completed = (data.watchEvents ?? []).some((e) => e.completed);
  const watchPct = completed ? 100 : Math.max(livePct, savedPct);
  const checkpointsTotal = data.checkpoints.length;
  const checkpointsAnswered = answeredCheckpointIds.size;
  const allCheckpointsAnswered = checkpointsTotal > 0 && checkpointsAnswered === checkpointsTotal;

  return (
    <div className="page">
      <Link to={`/student/courses/${data.offering.id}`} className="btn ghost sm" style={{ alignSelf: 'flex-start' }}>
        {/* ChevronRight = the RTL back direction (mirrors auth-back-home
            and DocumentViewerPage); ChevronLeft pointed "forward". */}
        <Icon icon={ChevronRight} size={13} />
        {data.offering.course.name}
      </Link>

      <div className="lecture-shell">
        {/* Video + meta */}
        <div className="lecture-main">
          <div className="lecture-video-wrap">
            <video
              ref={videoRef}
              className="lecture-video"
              src={data.videoUrl}
              controls
              playsInline
              preload="metadata"
              aria-label={`محاضرة: ${data.title}`}
              onTimeUpdate={(e) => {
                // `timeupdate` fires ~4×/sec; the elapsed-time label,
                // chapter highlight and checkpoint triggers all work at
                // 1-second granularity, so commit state only when the
                // whole second flips. Returning the previous value makes
                // React skip the render entirely → ~1 render/sec instead
                // of ~4. Watch-report accuracy is unaffected (the 10s
                // reporter and onEnded read video.currentTime directly).
                const t = e.currentTarget.currentTime;
                setCurrentSec((prev) => (Math.floor(prev) === Math.floor(t) ? prev : Math.floor(t)));
              }}
              onEnded={() => {
                if (data) {
                  reportWatch.mutate({
                    lectureId: data.id,
                    watchedSec: data.durationSec,
                    totalSec: data.durationSec,
                    completed: true,
                  });
                }
              }}
              poster={data.posterUrl ?? undefined}
            />
            {/* Captions: the Lecture model has no captions asset yet
                (see Lecture in useResources.ts) — when the API grows a
                captionsUrl, render <track kind="captions" srcLang="ar">
                here. Data-model gap, documented per audit 0-d. */}
          </div>

          <div className="lecture-meta">
            <div className="lecture-meta-badges">
              <Badge><bdi>{data.offering.course.code}</bdi></Badge>
              <span className="text-xs text-subtle">المحاضرة {data.ordinal}</span>
              {completed && <Badge color="green" icon={CheckCircle2}>مكتملة</Badge>}
            </div>
            <div className="lecture-meta-title">{data.title}</div>
            <div className="lecture-meta-sub">
              د. {data.offering.teacher.firstName} {data.offering.teacher.lastName} ·{' '}
              <bdi className="font-mono">{fmtTime(currentSec)} / {fmtTime(totalSec)}</bdi>
              {checkpointsTotal > 0 && <> · {checkpointsTotal} نقطة تفاعل</>}
            </div>
          </div>

          <div className="lecture-progress">
            <div className="lecture-progress-head">
              <span>تقدّم المشاهدة</span>
              <span className="lecture-progress-value">{watchPct}%</span>
            </div>
            <div
              className="lecture-progress-track"
              role="progressbar"
              aria-label="تقدّم مشاهدة المحاضرة"
              aria-valuenow={watchPct}
              aria-valuemin={0}
              aria-valuemax={100}
            >
              <span className="lecture-progress-fill" style={{ inlineSize: `${watchPct}%` }} />
              {data.checkpoints.map((c) => (
                <span
                  key={c.id}
                  className={`lecture-progress-mark${answeredCheckpointIds.has(c.id) ? ' done' : ''}`}
                  style={{
                    insetInlineStart: `calc(${totalSec > 0 ? (c.triggerSec / totalSec) * 100 : 0}% - 4px)`,
                  }}
                  aria-hidden
                />
              ))}
            </div>
            {checkpointsTotal > 0 && (
              <div className={`lecture-progress-note${allCheckpointsAnswered ? ' done' : ''}`}>
                أُجيب عن {checkpointsAnswered} من {checkpointsTotal} نقطة تفاعل
              </div>
            )}
          </div>

          {data.description && (
            <Card>
              <p className="lecture-desc">{data.description}</p>
            </Card>
          )}
        </div>

        {/* Sidebar: Chapters */}
        <Card title="فصول المحاضرة" icon={ListOrdered}>
          {!data.chapters.length ? (
            <EmptyState
              icon={ListVideo}
              title="لم تُقسَّم هذه المحاضرة بعد"
              description="لم يُضف المدرّس فصولاً لهذه المحاضرة — شاهدها كاملة دون تنقّل."
            />
          ) : (
            <div className="chapter-list">
              {data.chapters.map((ch, i) => {
                const isActive = currentSec >= ch.startSec && currentSec < ch.endSec;
                const isWatched = completed || currentSec >= ch.endSec;
                return (
                  <button
                    type="button"
                    key={ch.id}
                    className={`chapter-row${isActive ? ' on' : ''}${isWatched ? ' watched' : ''}`}
                    aria-current={isActive ? 'time' : undefined}
                    style={{ '--ch-i': i } as CSSProperties}
                    onClick={() => seekTo(ch.startSec)}
                  >
                    <span className="chapter-time" dir="ltr">{fmtTime(ch.startSec)}</span>
                    <span className="chapter-body">
                      <span className="chapter-title">{ch.title}</span>
                      {ch.concept && <span className="chapter-concept">{ch.concept.name}</span>}
                    </span>
                    <span className="chapter-state" aria-hidden>
                      {isWatched ? (
                        <Icon icon={CheckCircle2} size={14} />
                      ) : isActive ? (
                        <Icon icon={Play} size={12} />
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Checkpoint overlay — uses the shared Modal primitive so it
          gets focus trap, Esc to dismiss, body scroll lock, portal
          mount, and proper role="dialog" + aria-modal + aria-label.
          Previously this was an inline div without any of those,
          stranding keyboard / screen-reader users. */}
      <Modal
        open={!!activeCheckpoint}
        onClose={closeCheckpoint}
        ariaLabel="نقطة تفاعل"
        closeOnOverlayClick={false}
      >
        <div className="checkpoint-card">
          <div className="checkpoint-eyebrow">
            <Icon icon={Sparkles} size={12} />
            نقطة تفاعل
          </div>
          <div className="checkpoint-question">{activeCheckpoint?.question}</div>
          <div className="checkpoint-options" role="group" aria-label="خيارات الإجابة">
            {(activeCheckpoint?.options ?? []).map((opt, i) => {
              const isPicked = pickedIndex === i;
              const isCorrect = revealResult?.correctIndex === i;
              const cls = [
                'checkpoint-option',
                // pending (answer in flight) — before the server replies
                isPicked && !revealResult ? 'picked' : '',
                // revealed — correct / wrong-pick / dimmed rest
                revealResult ? (isCorrect ? 'correct' : isPicked ? 'incorrect' : '') : '',
              ].filter(Boolean).join(' ');
              return (
                <button
                  key={i}
                  type="button"
                  className={cls}
                  disabled={pickedIndex !== null}
                  onClick={() => void submitAnswer(i)}
                >
                  <span className="checkpoint-mark" aria-hidden>{OPTION_MARKS[i] ?? i + 1}</span>
                  <span className="checkpoint-option-text">{opt}</span>
                  {revealResult && isCorrect && (
                    <Icon icon={CheckCircle2} size={16} className="checkpoint-option-icon" />
                  )}
                  {revealResult && !isCorrect && isPicked && (
                    <Icon icon={XCircle} size={16} className="checkpoint-option-icon" />
                  )}
                </button>
              );
            })}
          </div>

          {answerError && (
            <div className="checkpoint-error" role="alert">
              تعذّر إرسال الإجابة — تحقّق من اتصالك ثم أعد المحاولة.
            </div>
          )}

          {revealResult && (
            <div className={`checkpoint-result ${revealResult.correct ? 'correct' : 'incorrect'}`} role="status">
              <div className="flex items-center gap-2">
                <Icon icon={revealResult.correct ? CheckCircle2 : XCircle} size={14} />
                <strong>{revealResult.correct ? 'إجابة صحيحة!' : 'ليست الإجابة الصحيحة.'}</strong>
              </div>
              {revealResult.explanation && (
                <div className="checkpoint-result-note">{revealResult.explanation}</div>
              )}
            </div>
          )}

          <div className="checkpoint-actions">
            {revealResult && (
              <button type="button" className="btn primary" onClick={closeCheckpoint}>
                متابعة المحاضرة
              </button>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
