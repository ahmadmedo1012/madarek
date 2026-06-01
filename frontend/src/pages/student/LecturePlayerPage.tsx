import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  ChevronLeft, Play, ListOrdered, Sparkles, CheckCircle2, XCircle,
} from 'lucide-react';
import { Card, Badge } from '../../components/primitives';
import { LoadingState, ErrorState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useLecture, useReportWatch, useAnswerCheckpoint, type LectureCheckpoint } from '../../hooks/useResources';

function fmtTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
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
      videoRef.current?.pause();
    }
  }, [currentSec, data, activeCheckpoint, answeredCheckpointIds]);

  if (isPending) return <LoadingState />;
  if (isError || !data) return <ErrorState error={error} onRetry={() => refetch()} />;

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
      setRevealResult({ correct: false, correctIndex: -1, explanation: 'تعذّر إرسال الإجابة الآن.' });
    }
  };

  const closeCheckpoint = () => {
    if (!activeCheckpoint) return;
    setAnsweredCheckpointIds((prev) => new Set(prev).add(activeCheckpoint.id));
    setActiveCheckpoint(null);
    setPickedIndex(null);
    setRevealResult(null);
    void videoRef.current?.play();
  };

  return (
    <div className="page">
      <Link to={`/student/courses/${data.offering.id}`} className="btn ghost sm" style={{ alignSelf: 'flex-start' }}>
        <Icon icon={ChevronLeft} size={13} style={{ transform: 'scaleX(-1)' }} />
        {data.offering.course.name}
      </Link>

      <div className="lecture-shell">
        {/* Video + meta */}
        <div>
          <div className="lecture-video-wrap">
            <video
              ref={videoRef}
              className="lecture-video"
              src={data.videoUrl}
              controls
              playsInline
              onTimeUpdate={(e) => setCurrentSec(e.currentTarget.currentTime)}
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
          </div>

          <div className="lecture-meta">
            <div>
              <div className="flex items-center gap-2" style={{ marginBottom: 4 }}>
                <Badge>{data.offering.course.code}</Badge>
                <span className="text-xs text-subtle">المحاضرة {data.ordinal}</span>
              </div>
              <div className="lecture-meta-title">{data.title}</div>
              <div className="lecture-meta-sub">
                د. {data.offering.teacher.firstName} {data.offering.teacher.lastName} ·
                <span className="font-mono"> {fmtTime(currentSec)} / {fmtTime(data.durationSec)}</span> ·
                {' '}{data.checkpoints.length} نقطة تفاعل
              </div>
            </div>
          </div>

          {data.description && (
            <Card style={{ marginTop: 'var(--sp-4)' }}>
              <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', lineHeight: 'var(--lh-loose)' }}>
                {data.description}
              </p>
            </Card>
          )}
        </div>

        {/* Sidebar: Chapters */}
        <Card title="فصول المحاضرة" icon={ListOrdered}>
          {!data.chapters.length ? (
            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-subtle)', padding: 'var(--sp-4) 0' }}>
              لم تُقسَّم هذه المحاضرة بعد.
            </div>
          ) : (
            <div className="chapter-list">
              {data.chapters.map((ch) => {
                const isActive = currentSec >= ch.startSec && currentSec < ch.endSec;
                return (
                  <button
                    type="button"
                    key={ch.id}
                    className={`chapter-row${isActive ? ' on' : ''}`}
                    onClick={() => seekTo(ch.startSec)}
                  >
                    <span className="chapter-time">{fmtTime(ch.startSec)}</span>
                    <div className="chapter-body">
                      <div className="chapter-title">{ch.title}</div>
                      {ch.concept && <div className="chapter-concept">{ch.concept.name}</div>}
                    </div>
                    {isActive && <Icon icon={Play} size={12} />}
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Checkpoint overlay */}
      {activeCheckpoint && (
        <div className="checkpoint-overlay" role="dialog" aria-modal="true">
          <div className="checkpoint-card">
            <div className="checkpoint-eyebrow">
              <Icon icon={Sparkles} size={12} />
              نقطة تفاعل
            </div>
            <div className="checkpoint-question">{activeCheckpoint.question}</div>
            <div className="checkpoint-options">
              {(activeCheckpoint.options as string[]).map((opt, i) => {
                const isPicked = pickedIndex === i;
                const isCorrect = revealResult && revealResult.correctIndex === i;
                const cls = revealResult
                  ? isCorrect
                    ? 'correct'
                    : isPicked
                      ? 'incorrect'
                      : ''
                  : '';
                return (
                  <button
                    key={i}
                    type="button"
                    className={`checkpoint-option ${cls}`}
                    disabled={pickedIndex !== null}
                    onClick={() => void submitAnswer(i)}
                  >
                    {opt}
                  </button>
                );
              })}
            </div>

            {revealResult && (
              <div className={`checkpoint-result ${revealResult.correct ? 'correct' : 'incorrect'}`}>
                <div className="flex items-center gap-2">
                  <Icon icon={revealResult.correct ? CheckCircle2 : XCircle} size={14} />
                  <strong>{revealResult.correct ? 'إجابة صحيحة!' : 'ليست الإجابة الصحيحة.'}</strong>
                </div>
                {revealResult.explanation && (
                  <div style={{ marginTop: 6, color: 'var(--text-muted)' }}>
                    {revealResult.explanation}
                  </div>
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
        </div>
      )}
    </div>
  );
}
