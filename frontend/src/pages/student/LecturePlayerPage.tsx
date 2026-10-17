import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  CheckCircle2, ChevronLeft, ChevronRight, ListOrdered, ListVideo, Play, Sparkles, XCircle, AlertCircle,
} from 'lucide-react';
import { Badge, Card } from '../../components/primitives';
import { EmptyState, ErrorState, Skeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { Modal } from '../../components/overlays/Modal';
import { VideoPlayerChrome } from '../../components/player/VideoPlayerChrome';
import { OfferingMaterialsCard } from '../../components/player/OfferingMaterialsCard';
import { useLecture, useOfferingLectures, useReportWatch, useAnswerCheckpoint, type LectureCheckpoint } from '../../hooks/useResources';
import { useAuthStore } from '../../stores/auth.store';
import { apiBaseURL } from '../../lib/api';
import { countAr, formatMmSs } from '../../lib/format';

/* fmtTime (the m:ss media clock) is lib/format.formatMmSs (13-15 fold,
 * audit 11-f P2-1) — deliberately NOT curriculumValidation.formatSec,
 * which promotes to h:mm:ss past the hour. */

/* Audit 11-f P0-1 (frontend half of the D9 rule): `durationSec` is an
   optional authoring field — 0 means "unset". A raw
   currentTime / durationSec division yields Infinity when the duration
   is unset, so the periodic reporter used to send completed:true for
   lectures that can never honestly complete. Completion requires a
   positive effective duration AND a finite share of it actually
   watched — since r165b the effective duration is resolved by
   resolveReportTotalSec (real media duration first, authored value
   fallback). */
export function isWatchComplete(currentTime: number, durationSec: number): boolean {
  if (!(durationSec > 0)) return false;
  const share = currentTime / durationSec;
  return Number.isFinite(share) && share >= 0.95;
}

/* r165b — the totalSec decision, ONE source of truth for the whole
   page. `durationSec` is a hand-authored field (the teacher's guess
   while building the lecture); the <video> element's metadata duration
   is the REAL media length. When the two disagree (45:00 authored over
   a 12:00 video), the server's completion rule (learning.routes.ts:
   watchedSec×10 ≥ min(totalSec, durationSec)×9) measures against the
   REPORTED totalSec — so the authored guess made the lecture
   permanently uncompletable: watching to the very end reported 720 of
   2700 and the bar read ~27% forever, silently. Every report path
   (10s ticker / onEnded / pagehide flush) and every progress render
   below resolves the effective total through this helper: a finite
   positive media duration WINS; NaN / Infinity / 0 falls back to the
   authored value. The backend is deliberately untouched — the server
   stays the authority on what counts as done.
   r181a (phase-9 live-journey find): the winning value is ROUNDED to
   a whole second. The wire contract is integer seconds
   (watchSchema: z.number().int()) and watchedSec was already
   Math.round'd at every report site — but the media duration rides
   as-is, and real encodings carry fractional seconds (the seeded
   lecture measures 718.4), so EVERY watch POST for such a lecture
   answered 400 «Expected integer, received float» — the student
   watched, the bar moved, and nothing ever persisted. Rounding here
   fixes all four report paths at the single source of truth; the
   sub-second loss (≤0.5s) can never flip the 95% completion share. */
export function resolveReportTotalSec(mediaDuration: number, authoredDurationSec: number): number {
  const winner =
    Number.isFinite(mediaDuration) && mediaDuration > 0 ? mediaDuration : authoredDurationSec;
  return Math.round(winner);
}

/* Audit 11-f P1-6 — resume-seek target for a returning student: the
   server-saved high-water mark, rewound 3s for context, clamped inside
   the real video duration. null = don't seek (already completed, or a
   trivial saved position not worth interrupting the start for). */
export function resumeSeekSec(savedSec: number, completed: boolean, videoDuration: number): number | null {
  if (completed || savedSec <= 5) return null;
  const target = Math.max(0, savedSec - 3);
  if (Number.isFinite(videoDuration) && videoDuration > 0) {
    return Math.min(target, Math.max(0, Math.floor(videoDuration) - 1));
  }
  return target;
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
        <div className="card glass">
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
  /* PP-X2 (audit P1-7): the offering's siblings — the prev/next bar.
   * Same cache the course cards read (['offerings', id, 'lectures']),
   * ordered by ordinal server-side; sorted again defensively. */
  const siblingsQ = useOfferingLectures(data?.offering.id);

  const videoRef = useRef<HTMLVideoElement>(null);
  // One-shot resume-seek guard: the saved position is applied on the
  // first loadedmetadata only — manual seeks and chapter clicks are
  // never affected (audit 11-f P1-6).
  const resumeSeekedRef = useRef(false);
  const [currentSec, setCurrentSec] = useState(0);
  /* r165b: the <video> element's real metadata duration, mirrored into
   * state so the progress surfaces can render against the media truth
   * (NaN until the first loadedmetadata — the resolveReportTotalSec
   * fallback then rides the authored durationSec, byte-identical to
   * the pre-r165b behavior). The report paths read the element's LIVE
   * duration instead (they fire outside the render cycle). */
  const [mediaDurationSec, setMediaDurationSec] = useState<number>(Number.NaN);
  const [activeCheckpoint, setActiveCheckpoint] = useState<LectureCheckpoint | null>(null);
  const [answeredCheckpointIds, setAnsweredCheckpointIds] = useState<Set<string>>(new Set());
  /* r157 (W2-F7 / audit 6A5): session-local skips — a skipped
   * checkpoint must NOT re-fire while the playhead sits past its
   * trigger (currentSec still ≥ triggerSec), or the quiz the student
   * just declined would instantly slam back open. Session-local BY
   * DESIGN: skip ≠ answer, so nothing goes to the server and an
   * unanswered checkpoint honestly re-fires in the NEXT session. */
  const [skippedCheckpointIds, setSkippedCheckpointIds] = useState<Set<string>>(new Set());
  const [pickedIndex, setPickedIndex] = useState<number | null>(null);
  const [revealResult, setRevealResult] = useState<{ correct: boolean; correctIndex: number; explanation?: string } | null>(null);
  const [answerError, setAnswerError] = useState(false);
  // Set when the video ENDS — drives the next-lecture pulse (below).
  const [pulseNext, setPulseNext] = useState(false);
  /* r152a (A4 P3): the onEnded report is the ONLY event that marks the
   * lecture complete — a network blip at video end used to silently
   * lose the «مكتملة» badge, XP and invalidations (the 10s ticker
   * never retries after `ended`). The failed completion payload is
   * kept here so the notice below can retry it verbatim. */
  const [failedReport, setFailedReport] = useState<{
    lectureId: string;
    watchedSec: number;
    totalSec: number;
    completed: boolean;
  } | null>(null);

  /* PP-X2: prev/next navigation changes ONLY the :lectureId param, so
   * the component instance SURVIVES the navigation — every per-lecture
   * state must reset here or it leaks across lectures (answered
   * checkpoints of the previous lecture, its resume-seek guard, the
   * end-of-video pulse…). */
  useEffect(() => {
    setCurrentSec(0);
    // r165b: the new lecture's media duration is unknown until ITS
    // loadedmetadata fires — the previous video's duration must not
    // leak into this lecture's progress math.
    setMediaDurationSec(Number.NaN);
    setActiveCheckpoint(null);
    setAnsweredCheckpointIds(new Set());
    setSkippedCheckpointIds(new Set());
    setPickedIndex(null);
    setRevealResult(null);
    setAnswerError(false);
    setPulseNext(false);
    setFailedReport(null);
    resumeSeekedRef.current = false;
  }, [lectureId]);

  /* r157 (W2-F7 / audit 6A5): server answer memory seed — checkpoints
   * answered in a PREVIOUS session (CheckpointAnswer rows, projected
   * by GET /lectures/:id as answers: [{checkpointId}]) MERGE into the
   * live set so the page never re-quizzes an answered checkpoint on
   * resume (the bug that burned the r155a mastery cap: reload → re-quiz
   * → re-answer → attempts frozen). Merge, never replace: the watch
   * completion invalidation refetches this query mid-lecture, and
   * in-flight answers (answered seconds ago, POST already landed but
   * the refetch predates it) must survive the refetch. */
  useEffect(() => {
    const serverIds = (data?.checkpoints ?? [])
      .flatMap((c) => c.answers ?? [])
      .map((a) => a.checkpointId);
    if (!serverIds.length) return;
    setAnsweredCheckpointIds((prev) => {
      const next = new Set(prev);
      for (const id of serverIds) next.add(id);
      // Same-size → same set: return the old object so React skips
      // the re-render (the effect runs on every refetch).
      return next.size === prev.size ? prev : next;
    });
  }, [data]);

  // Periodic watch-event reporting (every 10 sec while playing)
  // r153b in-flight guard: on a slow network the previous POST can
  // still be pending when the next tick fires — React Query queues
  // mutations, so a stalled link piled requests. The ref reads the
  // LIVE mutation state (the interval's closure froze the render it
  // was created in; data?.id is its only legitimate dependency).
  const reportWatchRef = useRef(reportWatch);
  reportWatchRef.current = reportWatch;
  useEffect(() => {
    if (!data) return;
    const id = setInterval(() => {
      const v = videoRef.current;
      if (!v || v.paused || v.ended) return;
      if (reportWatchRef.current.isPending) return;
      // r165b: resolve against the element's LIVE duration — read at
      // tick time, because this interval's closure froze the render it
      // was created in (metadata may have landed long after). The
      // P0-1 guard below still applies to the resolved total: an
      // unset duration (0) can never complete — the old raw division
      // turned ÷0 into Infinity and marked every duration-less
      // lecture complete after 10 seconds.
      const total = resolveReportTotalSec(v.duration, data.durationSec);
      reportWatch.mutate({
        lectureId: data.id,
        watchedSec: Math.round(v.currentTime),
        totalSec: total,
        completed: isWatchComplete(v.currentTime, total),
      });
    }, 10_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.id]);

  /* r153b unload flush — the 10s ticker loses every session's tail:
   * closing the tab (or backgrounding the app) between ticks silently
   * dropped up to 10 seconds of watch time, and a completion that
   * happened after the last tick never reached the server until the
   * student came back. One keepalive fetch on pagehide/hidden —
   * keepalive rather than sendBeacon because /lectures/:id/watch
   * requires the Authorization header, which sendBeacon cannot carry.
   * The high-water clamp in the backend (learning.routes.ts) makes a
   * duplicate report harmless. Refs only: the listener must never
   * re-subscribe, and it reads the freshest render through the ref. */
  const flushWatchOnHide = useRef(() => {});
  flushWatchOnHide.current = () => {
    const v = videoRef.current;
    if (!data || !v || v.paused || v.ended) return;
    // r165b: same totalSec resolution as every other report path —
    // the element's live duration wins over the authored guess.
    const total = resolveReportTotalSec(v.duration, data.durationSec);
    const token = useAuthStore.getState().accessToken;
    void fetch(`${apiBaseURL}/lectures/${data.id}/watch`, {
      method: 'POST',
      keepalive: true,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        watchedSec: Math.round(v.currentTime),
        totalSec: total,
        completed: isWatchComplete(v.currentTime, total),
      }),
    }).catch(() => {
      /* page is going away — the next session's resume-seek and the
       * 10s ticker re-report from the server's high-water mark. */
    });
  };
  useEffect(() => {
    const flush = () => flushWatchOnHide.current();
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush();
    };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('pagehide', flush);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // Trigger a checkpoint when crossing its time, once per lecture session.
  // r157 (W2-F7): answered (server-seeded or this-session) AND skipped
  // (this-session) checkpoints both stay silent — a skip while the
  // playhead already passed the trigger must not re-fire instantly.
  useEffect(() => {
    if (!data || activeCheckpoint) return;
    const due = data.checkpoints.find(
      (c) => currentSec >= c.triggerSec
        && !answeredCheckpointIds.has(c.id)
        && !skippedCheckpointIds.has(c.id),
    );
    if (due) {
      setActiveCheckpoint(due);
      setPickedIndex(null);
      setRevealResult(null);
      setAnswerError(false);
      videoRef.current?.pause();
    }
  }, [currentSec, data, activeCheckpoint, answeredCheckpointIds, skippedCheckpointIds]);

  // No lecture id in the URL — the route normally guarantees one; this
  // branch keeps a malformed deep link honest instead of pending forever
  // (useLecture stays `enabled: false` → isPending never resolves).
  if (!lectureId) {
    return (
      <div className="page">
        <EmptyState
          icon={ListVideo}
          title="لم يتم تحديد محاضرة"
          illustration="empty-search"
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

  /* r157 (W2-F7): honest skip — close WITHOUT counting the checkpoint
   * as answered (the «أُجيب عن N» note and the rail mark stay honest)
   * and remember the skip for THIS session (see skippedCheckpointIds)
   * so the playhead sitting past the trigger doesn't re-open the modal
   * instantly. Esc / onClose / «تخطّي» all route here; only «متابعة
   * المحاضرة» (after a real answer) counts via closeCheckpoint. */
  const skipCheckpoint = () => {
    if (!activeCheckpoint) return;
    setSkippedCheckpointIds((prev) => new Set(prev).add(activeCheckpoint.id));
    setActiveCheckpoint(null);
    setPickedIndex(null);
    setRevealResult(null);
    setAnswerError(false);
    void videoRef.current?.play();
  };

  /* r164d (course flow): explicit checkpoint return — from the pending
   * banner below. The session skip guard exists to stop AUTO re-fire
   * while the playhead sits past a declined trigger; an explicit
   * request un-skips that one checkpoint, seeks to its trigger and
   * opens it (the same state transition the time-based effect makes,
   * minus the auto-pause race: we pause BEFORE seeking). */
  const openCheckpoint = (cp: LectureCheckpoint) => {
    setSkippedCheckpointIds((prev) => {
      if (!prev.has(cp.id)) return prev;
      const next = new Set(prev);
      next.delete(cp.id);
      return next;
    });
    videoRef.current?.pause();
    if (videoRef.current) videoRef.current.currentTime = Math.max(0, cp.triggerSec);
    setActiveCheckpoint(cp);
    setPickedIndex(null);
    setRevealResult(null);
    setAnswerError(false);
  };

  /* Watch progress — live position (throttled to 1 render/sec below)
   * floored by the server-saved maximum; a resumed lecture also seeks
   * the <video> itself to the saved position on first metadata load
   * (see onLoadedMetadata), so the bar and the playback agree.
   * r165b: ONE resolved total for every progress surface below — the
   * bar's live/saved shares, the m:ss clock denominator and the
   * checkpoint mark offsets all divide by the SAME effective total
   * (the real media duration once the element provides one; the
   * authored value before that). The report paths above resolve
   * through the same helper against the element's live duration. */
  const reportTotalSec = resolveReportTotalSec(mediaDurationSec, data.durationSec);
  const livePct = reportTotalSec > 0 ? Math.min(100, Math.round((currentSec / reportTotalSec) * 100)) : 0;
  const savedSec = (data.watchEvents ?? []).reduce((max, e) => Math.max(max, e.watchedSec), 0);
  const savedPct = reportTotalSec > 0 ? Math.min(100, Math.round((savedSec / reportTotalSec) * 100)) : 0;
  const completed = (data.watchEvents ?? []).some((e) => e.completed);
  const watchPct = completed ? 100 : Math.max(livePct, savedPct);
  const checkpointsTotal = data.checkpoints.length;
  const checkpointsAnswered = answeredCheckpointIds.size;
  const allCheckpointsAnswered = checkpointsTotal > 0 && checkpointsAnswered === checkpointsTotal;
  /* r164d (course flow): the completion dead-end fix — a lecture whose
   * watch is complete but whose checkpoints are still open used to end
   * at a wall («مكتملة» + a pulsing next button) with the quiz
   * unreachable without blind scrubbing. The banner re-opens the FIRST
   * unanswered checkpoint on demand (checkpoints arrive sorted by
   * triggerSec server-side). */
  const firstUnansweredCheckpoint = data.checkpoints.find((c) => !answeredCheckpointIds.has(c.id));
  const showPendingCheckpointsBanner = completed && checkpointsTotal > checkpointsAnswered;

  /* ── Prev / next lecture bar (PP-X2, audit P1-7) ─────────────────
   * The watch loop's missing link: ending a lecture used to be a dead
   * end (the training pages have a next button; the lectures didn't).
   * prev = ordinal−1 (disabled on the first), next = ordinal+1; on the
   * LAST lecture the dominant action becomes «عُد إلى المقرّر» (course
   * detail — where the assignments/materials live). */
  const siblings = [...(siblingsQ.data ?? [])].sort((a, b) => a.ordinal - b.ordinal);
  const lecIdx = siblings.findIndex((l) => l.id === data.id);
  const prevLec = lecIdx > 0 ? siblings[lecIdx - 1] : undefined;
  const nextLec = lecIdx >= 0 && lecIdx < siblings.length - 1 ? siblings[lecIdx + 1] : undefined;
  const siblingsLoading = siblingsQ.isPending;

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
          {/* R2-B branded chrome: native `controls` removed — the
              VideoPlayerChrome layers the مدارك player skin over the
              SAME <video> (same ref, same reporting/checkpoint/
              resume handlers below, byte-identical). The checkpoint
              Modal portals to <body> at --z-modal, so the quiz always
              sits above this chrome. */}
          <VideoPlayerChrome
            videoRef={videoRef}
            checkpointTimes={data.checkpoints.map((c) => c.triggerSec)}
            className="lecture-video-wrap"
            /* PP-X2 (P2-12): claim the media keys on mount — Space/K/
               arrows answer from the first keypress (see the prop's
               docblock for the focus-on-body guard). */
            autoFocusOnMount
          >
            <video
              ref={videoRef}
              className="lecture-video"
              src={data.videoUrl}
              playsInline
              preload="metadata"
              aria-label={`محاضرة: ${data.title}`}
              onLoadedMetadata={(e) => {
                // r165b: mirror the REAL media length — every metadata
                // load (a src swap reloads it), not just the first.
                setMediaDurationSec(e.currentTarget.duration);
                // Resume-seek (audit 11-f P1-6): on the first metadata
                // load, continue from the server-saved position instead
                // of restarting at 0:00 — completed lectures and
                // near-start positions are skipped (see resumeSeekSec).
                if (resumeSeekedRef.current) return;
                resumeSeekedRef.current = true;
                const target = resumeSeekSec(savedSec, completed, e.currentTarget.duration);
                if (target !== null && target > 0) e.currentTarget.currentTime = target;
              }}
              onDurationChange={(e) => {
                /* r165b: streaming media can refine a placeholder
                 * non-finite duration AFTER metadata — keep the mirror
                 * fresh (the same loadedmetadata + durationchange pair
                 * VideoPlayerChrome syncs its own duration on; the
                 * non-finite guard lives in resolveReportTotalSec). */
                setMediaDurationSec(e.currentTarget.duration);
              }}
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
              onEnded={(e) => {
                if (data) {
                  // Honest end-of-video report: the actually-watched
                  // amount measured against the REAL media length
                  // (r165b — the authored duration is the fallback only
                  // when the element has no finite duration). The
                  // completion flag rides the resolved total (the same
                  // condition as before, corrected input); the server
                  // stays the authority on what counts as done (D9 —
                  // an unset authored duration is still never
                  // completable server-side).
                  const watched = Math.round(e.currentTarget.currentTime);
                  const total = resolveReportTotalSec(e.currentTarget.duration, data.durationSec);
                  const payload = {
                    lectureId: data.id,
                    watchedSec: watched,
                    totalSec: total,
                    completed: total > 0,
                  };
                  reportWatch.mutate(payload, {
                    onError: () => setFailedReport(payload),
                  });
                }
                // PP-X2 (audit P1-7): the moment the lecture ends, the
                // dominant next action is the NEXT lecture — pulse it.
                setPulseNext(true);
              }}
              poster={data.posterUrl ?? undefined}
            />
            {/* Captions: the Lecture model has no captions asset yet
                (see Lecture in useResources.ts) — when the API grows a
                captionsUrl, render <track kind="captions" srcLang="ar">
                here. Data-model gap, documented per audit 0-d. */}
          </VideoPlayerChrome>

          {failedReport && (
            <div className="lecture-report-retry" role="alert">
              <span>تعذّر تسجيل اكتمال المحاضرة — قد لا يُحتسب تقدّمك للمحاضرة.</span>
              <button
                type="button"
                className="btn sm"
                onClick={() => {
                  reportWatch.mutate(failedReport, {
                    onSuccess: () => setFailedReport(null),
                    // Keep the notice up on a second failure — retry stays available.
                    onError: () => undefined,
                  });
                }}
                disabled={reportWatch.isPending}
              >
                {reportWatch.isPending ? 'يُعيد المحاولة…' : 'إعادة تسجيل الاكتمال'}
              </button>
            </div>
          )}

          <div className="lecture-meta">
            <div className="lecture-meta-badges">
              <Badge><bdi>{data.offering.course.code}</bdi></Badge>
              <span className="text-xs text-subtle">المحاضرة {data.ordinal}</span>
              {completed && <Badge color="green" icon={CheckCircle2}>مكتملة</Badge>}
            </div>
            <h1 className="lecture-meta-title">{data.title}</h1>
            <div className="lecture-meta-sub">
              د. {data.offering.teacher.firstName} {data.offering.teacher.lastName} ·{' '}
              <bdi className="font-mono">{formatMmSs(currentSec)} / {formatMmSs(reportTotalSec)}</bdi>
              {checkpointsTotal > 0 && <> · {countAr(checkpointsTotal, ['نقطة تفاعل واحدة', 'نقطتا تفاعل', 'نقاط تفاعل', 'نقطة تفاعل'])}</>}
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
              {/* 5-C1 (A2 §1c #25): the value rides --fill-scale (0..1)
                  consumed by the scaleX fill in student.css — the old
                  inline inline-size transitioned layout per frame. */}
              <span
                className="lecture-progress-fill"
                style={{ '--fill-scale': watchPct / 100 } as CSSProperties}
              />
              {data.checkpoints.map((c) => (
                <span
                  key={c.id}
                  className={`lecture-progress-mark${answeredCheckpointIds.has(c.id) ? ' done' : ''}`}
                  style={{
                    insetInlineStart: `calc(${reportTotalSec > 0 ? (c.triggerSec / reportTotalSec) * 100 : 0}% - 4px)`,
                  }}
                  aria-hidden
                />
              ))}
            </div>
            {checkpointsTotal > 0 && (
              <div className={`lecture-progress-note${allCheckpointsAnswered ? ' done' : ''}`}>
                أُجيب عن {checkpointsAnswered} من {countAr(checkpointsTotal, ['نقطة تفاعل واحدة', 'نقطتا تفاعل', 'نقاط تفاعل', 'نقطة تفاعل'])}
              </div>
            )}
          </div>

          {/* r164d (course flow): checkpoint continuity — after the watch
              completes, the open checkpoints become the dominant unfinished
              loop of THIS lecture (r155a attempt caps keep them an open
              loop, never an infinite one). The banner re-opens the FIRST
              unanswered checkpoint on demand (checkpoints arrive sorted by
              triggerSec server-side). Token-styled inline banner — the
              SubmitAssignmentModal done-banner grammar, no new CSS
              classes this wave. */}
          {showPendingCheckpointsBanner && firstUnansweredCheckpoint && (
            <div
              role="status"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 'var(--sp-2)',
                padding: 'var(--sp-3) var(--sp-4)',
                borderRadius: 'var(--r-md)',
                background: 'var(--warning-soft)',
                color: 'var(--warning-ink)',
                fontSize: 'var(--type-label-size)',
              }}
            >
              <span>
                أنهيت المشاهدة — تبقى {countAr(checkpointsTotal - checkpointsAnswered,
                  ['نقطة تفاعل واحدة لم تُجب', 'نقطتا تفاعل لم تُجبا', 'نقاط تفاعل لم تُجب', 'نقطة تفاعل لم تُجب'])}.
              </span>
              <button
                type="button"
                className="btn primary sm"
                onClick={() => openCheckpoint(firstUnansweredCheckpoint)}
              >
                <Icon icon={AlertCircle} size={13} />
                إلى نقطة التفاعل التالية
              </button>
            </div>
          )}

          {/* Prev / next (PP-X2 / audit P1-7) — the watch loop's exit ramp.
              prev rides the RTL back-chevron (ChevronRight), next the
              forward one (ChevronLeft); on end, next pulses once. */}
          <nav className="lecture-nav" aria-label="التنقّل بين محاضرات المقرّر">
            {prevLec ? (
              <Link to={`/student/lectures/${prevLec.id}`} className="btn ghost">
                <Icon icon={ChevronRight} size={14} />
                المحاضرة السابقة
              </Link>
            ) : (
              <button type="button" className="btn ghost" disabled aria-disabled="true">
                <Icon icon={ChevronRight} size={14} />
                المحاضرة السابقة
              </button>
            )}
            {nextLec ? (
              <Link
                to={`/student/lectures/${nextLec.id}`}
                className={`btn primary lecture-nav-next${pulseNext ? ' pulse' : ''}`}
                onAnimationEnd={() => setPulseNext(false)}
              >
                المحاضرة التالية · <bdi>{nextLec.ordinal}</bdi>
                <Icon icon={ChevronLeft} size={14} />
              </Link>
            ) : siblingsLoading ? (
              <button type="button" className="btn primary lecture-nav-next" disabled aria-disabled="true">
                المحاضرة التالية
                <Icon icon={ChevronLeft} size={14} />
              </button>
            ) : (
              <Link to={`/student/courses/${data.offering.id}`} className="btn primary lecture-nav-next">
                عُد إلى المقرّر
                <Icon icon={ChevronLeft} size={14} />
              </Link>
            )}
          </nav>

          {data.description && (
            <Card>
              <p className="lecture-desc">{data.description}</p>
            </Card>
          )}
        </div>

        {/* Sidebar: Chapters */}
        <Card title="فصول المحاضرة" icon={ListOrdered} heading="h2">
          {!data.chapters.length ? (
            <EmptyState illustration="empty-search"
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
                    <span className="chapter-time" dir="ltr">{formatMmSs(ch.startSec)}</span>
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

        {/* r164d (course flow): the offering's materials, one scroll
            away from the video (reads the course page's cached /full
            payload — see the component header). */}
        <OfferingMaterialsCard offeringId={data.offering.id} />
      </div>

      {/* Checkpoint overlay — uses the shared Modal primitive so it
          gets focus trap, Esc to dismiss, body scroll lock, portal
          mount, and proper role="dialog" + aria-modal + aria-label.
          Previously this was an inline div without any of those,
          stranding keyboard / screen-reader users. */}
      <Modal
        open={!!activeCheckpoint}
        onClose={skipCheckpoint}
        ariaLabel={activeCheckpoint ? `نقطة تفاعل: ${activeCheckpoint.question}` : 'نقطة تفاعل'}
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
            {/* r157 (W2-F7): «تخطّي» is ALWAYS visible — a student who
                doesn't know an answer needs an honest exit that isn't
                «guess and look wrong», and closing via Esc used to
                silently COUNT as answered (the dishonest branch). Ghost
                chip (checkpoint-skip) — the primary verb stays
                «متابعة المحاضرة» after a real answer. */}
            <button type="button" className="btn ghost sm checkpoint-skip" onClick={skipCheckpoint}>
              تخطّي
            </button>
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
