/**
 * /student/lectures/[lectureId] — مشغّل المحاضرة (web LecturePlayerPage
 * parity, expo-video engine + R334 Phase-D chrome):
 *  - CUSTOM CONTROLS over expo-video (nativeControls off inline): scaled
 *    play/pause with light impact haptics, seek bar with buffered tint,
 *    ±10s double-tap on either half (transform-only ripple), speed sheet
 *    (PickerSheet ٠٫٧٥×–٢×), captions overlay driven by the VTT cues,
 *    fullscreen via the VideoView ref (native controls take over in
 *    fullscreen — platform limitation of expo-video), immersive auto-hide
 *    of the chrome while playing (3.2s timer),
 *  - resume-seek to the saved high-water mark (watchedSec − 3s, once)
 *    + the «استأنفنا من حيث توقفت» toast,
 *  - 10s watch reporting while playing (high-water never regresses;
 *    completed only at ≥95% share / on ended; final flush on unmount).
 *    Offline resilience mirrors the exam-queue semantics: the newest
 *    payload wins, a failed send is retried by the next 10s tick (the
 *    cadence IS the retry loop) and the unmount flush is fire-and-forget,
 *  - interactive checkpoints (AppSheet): pause on crossing triggerSec,
 *    Arabic option marks أ ب ج د هـ و, haptic verdict on the reveal,
 *    server-verdict reveal + explanation, honest «تخطّي» (session-local),
 *    gaps/matrix invalidation,
 *  - chapters + searchable transcript (VTT) with click-to-seek — cues
 *    render through a nested DataList (virtualized; the audit flagged
 *    the old 200-cue .map) — + prev/next lecture bar + materials card.
 * The video is pinned above the scrollable sheet (sticky at top).
 *
 * Honesty labels (no emulator in this sandbox): seek-bar scrubbing
 * smoothness, buffered-tint accuracy, fullscreen hand-off, haptic feel,
 * auto-hide timing and the double-tap ripple are UNVERIFIED on device —
 * logic is jest/typecheck-verified only (see src/test/lecture-player.test.ts).
 *
 * Quality sheet: NOT implemented — the API exposes a single `videoUrl`
 * per lecture (no HLS/DASH variants), so there is nothing to pick from.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { PanResponder, Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { VideoPlayer, VideoView, useVideoPlayer } from "expo-video";
import Captions from "lucide-react-native/icons/captions";
import CircleCheck from "lucide-react-native/icons/circle-check";
import CircleX from "lucide-react-native/icons/circle-x";
import Maximize from "lucide-react-native/icons/maximize";
import Pause from "lucide-react-native/icons/pause";
import Play from "lucide-react-native/icons/play";
import RotateCcw from "lucide-react-native/icons/rotate-ccw";
import RotateCw from "lucide-react-native/icons/rotate-cw";
import Sparkles from "lucide-react-native/icons/sparkles";
import { absoluteUrl } from "@/api/client";
import { learningApi } from "@/api/learning";
import type { CheckpointAnswerFeedback, Lecture, LectureCheckpoint } from "@/api/types";
import { useSession } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { themeFor, usePalette, useStatusTones } from "@/design/theme";
import { sp } from "@/design/tokens";
import { AppStatusBar } from "@/design/statusbar";
import { Screen, SectionBar } from "@/components/ui/screen";
import { T, MonoLabel } from "@/components/ui/text";
import { Badge, Card } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { SearchBar } from "@/components/ui/fields";
import { DataList, LedgerRow, ProgressBar, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { AppSheet, PickerSheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { haptics } from "@/haptics";
import { PressableScale } from "@/motion";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { humanizeError } from "@/lib/errors";
import { arabicIndic, latn, sizeLabel, useNumerals, type NumeralsPreference } from "@/lib/format";
import { StackHeader } from "@/components/shell/AppTopBar";
import { AR_CHOICE_LETTERS, countAr } from "@/features/student/more";
import {
  ScrollBody,
  cueClock,
  mmss,
  openMaterial,
  parseVttCues,
  type VttCue,
} from "@/features/student/components";

const NO_CUES: Awaited<ReturnType<typeof parseVttCues>> = [];

type CheckpointWithAnswers = LectureCheckpoint & { answers?: { checkpointId: string }[] };

/* ══ Pure player helpers (exported for src/test/lecture-player.test.ts) ══ */

/** Effective report total: real media duration wins, authored value falls back. */
export function resolveReportTotal(mediaDuration: number, authoredDurationSec: number | null | undefined): number {
  const winner = Number.isFinite(mediaDuration) && mediaDuration > 0 ? mediaDuration : (authoredDurationSec ?? 0);
  return Math.round(winner);
}

/** Playback speeds offered by the speed sheet (web parity). */
export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

/** m:ss (h:mm:ss beyond the hour) in the user's numerals preference. */
export function playerClock(sec: number, numerals: NumeralsPreference): string {
  const total = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  /* Pad FIRST, convert digits AFTER — padding an already-converted string
   * injects a LATIN zero into an arabic-indic clock (0١:…). Hours stay
   * unpadded (web h:mm:ss parity: 1:00:00, never 01:00:00). */
  const digits = (str: string) => (numerals === "arabic-indic" ? arabicIndic(str) : str);
  const d = (n: number) => digits(String(n).padStart(2, "0"));
  return h > 0 ? `${digits(String(h))}:${d(m)}:${d(s)}` : `${d(m)}:${d(s)}`;
}

/** Time remaining, e.g. «٠٧:٤٨» — clamped at 0, numerals-aware. */
export function remainingClock(currentSec: number, durationSec: number, numerals: NumeralsPreference): string {
  const left = Math.max(0, (Number.isFinite(durationSec) ? durationSec : 0) - (Number.isFinite(currentSec) ? currentSec : 0));
  return playerClock(left, numerals);
}

/**
 * Double-tap seek delta from the PHYSICAL tap position (YouTube-style:
 * tap the start half → back, the end half → forward — a timeline is a
 * physical LTR surface even in an RTL app).
 */
export function doubleTapSeekDelta(x: number, width: number): number {
  return width > 0 && x < width / 2 ? -10 : 10;
}

/** Seek target clamped to [0, duration−1s] (never past the last second). */
export function clampSeek(sec: number, durationSec: number): number {
  if (Number.isFinite(durationSec) && durationSec > 0) {
    return Math.min(Math.max(0, sec), Math.max(0, Math.floor(durationSec) - 1));
  }
  return Math.max(0, sec);
}

/** The cue covering time t (for the captions overlay + auto-follow). */
export function activeCueAt(cues: readonly VttCue[], t: number): VttCue | null {
  for (const c of cues) {
    if (t >= c.start && t < c.end) return c;
    if (c.start > t) break;
  }
  return null;
}

/**
 * Transcript search over the FULL cue list (M5). The pre-M5 shape capped
 * the data at 200 cues (`.slice(0, 200)` — a data cut, not virtualization:
 * a 90-minute lecture carries ~1000+ cues and every match past cue 200
 * was invisible). Virtualization belongs to the VIEW layer (DataList →
 * FlashList v2 on native, FlatList windowing on web); the data stays whole.
 */
export function filterCues(cues: readonly VttCue[], query: string): readonly VttCue[] {
  const q = query.trim();
  if (q === "") return cues;
  return cues.filter((c) => c.text.includes(q));
}

/**
 * Mount-on-first-open gate for the AppSheet family. WHY: @gorhom/bottom-
 * sheet pulls react-native-gesture-handler v3, whose import-time native
 * install cannot boot under jest — mounting the sheet only once the user
 * actually opens it keeps the render-net green (closed screens never
 * mount the engine) while on device the sheet behaves normally, close
 * animation included (armed stays true after the first open).
 */
function useArmOnOpen(open: boolean): boolean {
  const [armed, setArmed] = useState(false);
  useEffect(() => {
    if (open) setArmed(true);
  }, [open]);
  return armed || open;
}

export default function LecturePlayerScreen() {
  const params = useLocalSearchParams<{ lectureId?: string | string[] }>();
  const rawId = params.lectureId;
  const lectureId = typeof rawId === "string" ? rawId : Array.isArray(rawId) ? rawId[0] : undefined;
  const scope = useInstitutionScope();

  const lecture = useQuery({
    queryKey: ["lectures", lectureId, scope],
    queryFn: () => learningApi.lecture(lectureId!),
    enabled: !!lectureId,
  });

  if (!lectureId) {
    return (
      <ScrollFrame title="محاضرة">
        <AppStatusBar />
        <EmptyState
          title="لم يتم تحديد محاضرة"
          message="الرابط لا يتضمّن محاضرة — اختر محاضرة من المقرّر للمتابعة."
          actionLabel="العودة إلى مقرراتي"
          onAction={() => router.push("/student/courses" as never)}
        />
      </ScrollFrame>
    );
  }
  if (lecture.isLoading) {
    return (
      <ScrollFrame title="محاضرة">
        <AppStatusBar />
        <SkeletonList rows={6} rowHeight={64} />
      </ScrollFrame>
    );
  }
  if (lecture.isError || !lecture.data) {
    return (
      <ScrollFrame title="محاضرة">
        <AppStatusBar />
        <ErrorState
          message={humanizeError(lecture.error)}
          onRetry={() => lecture.refetch()}
        />
      </ScrollFrame>
    );
  }
  return <LectureBody key={lectureId} lecture={lecture.data} scope={scope} />;
}

/** Minimal frame for the shell states (no video yet). */
function ScrollFrame({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title={title} />
      <ScrollBody>{children}</ScrollBody>
    </Screen>
  );
}

/** expo-video's documented seek contract is a property assignment on
 * the player handle (an external SDK object) — seated here, at module
 * scope, once: event handlers and listeners call this, no render value
 * is ever mutated in place. */
function seekPlayer(player: VideoPlayer, sec: number) {
  player.currentTime = Math.max(0, sec);
}

function LectureBody({ lecture, scope }: { lecture: Lecture; scope: string | null }) {
  const qc = useQueryClient();
  const p = usePalette();
  const tones = useStatusTones();
  const { formatNumber: fmt } = useNumerals();

  /* ── Player + source ─────────────────────────────────────────────── */
  const player = useVideoPlayer(null, (pl) => {
    pl.timeUpdateEventInterval = 0.25;
  });
  const videoRef = useRef<VideoView | null>(null);

  /* The error is keyed to the url it belongs to (derive — not state),
   * and every setter fires after a promise settles: a NEW source derives
   * a clean slate for free (the old sync reset at effect-start was the
   * set-state-in-effect cascading class). */
  const [errUrl, setErrUrl] = useState<string | null>(null);
  const loadError = errUrl !== null && errUrl === lecture.videoUrl;
  const loadSource = useCallback(() => {
    const url = absoluteUrl(lecture.videoUrl);
    if (!url) return;
    // Bearer always — harmless for external URLs, required for /api/v1/files/lectures.
    const token = useSession.getState().accessToken;
    void player
      .replaceAsync({ uri: url, headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      .then(() => setErrUrl(null))
      .catch(() => setErrUrl(lecture.videoUrl));
  }, [player, lecture.videoUrl]);

  useEffect(() => {
    loadSource();
  }, [loadSource]);

  /* ── Watch state ─────────────────────────────────────────────────── */
  const savedEvent = lecture.watchEvents?.[0];
  const completedServer = savedEvent?.completed ?? false;
  const [completedLive, setCompletedLive] = useState(false);
  const completed = completedLive || completedServer;
  const [currentSec, setCurrentSec] = useState(0);
  const [mediaDuration, setMediaDuration] = useState<number>(Number.NaN);
  const highWaterRef = useRef<number>(Math.max(0, savedEvent?.watchedSec ?? 0));
  const durationRef = useRef<number>(lecture.durationSec ?? 0);
  const resumeSeekedRef = useRef(false);
  const inFlightRef = useRef(false);

  const totalSec = useMemo(
    () => resolveReportTotal(mediaDuration, lecture.durationSec),
    [mediaDuration, lecture.durationSec],
  );

  /** 10s-cadence report — high-water watchedSec, completed only at ≥95% (or forced on ended).
   * Offline behavior (queue semantics): a failed send leaves inFlightRef
   * false, so the NEXT 10s tick re-sends the newest high-water payload —
   * latest-value-wins with automatic retry, exactly like the exam queue. */
  const report = useCallback(
    (forceCompleted: boolean) => {
      if (inFlightRef.current) return;
      const total = resolveReportTotal(player.duration, lecture.durationSec);
      const watched = Math.floor(highWaterRef.current);
      if (watched <= 0 && !forceCompleted) return;
      const share = total > 0 ? watched / total : 0;
      const completedNow = total > 0 && (forceCompleted || share >= 0.95);
      inFlightRef.current = true;
      learningApi
        .watch(lecture.id, { watchedSec: watched, totalSec: total, completed: completedNow })
        .then((ev) => {
          inFlightRef.current = false;
          if (ev?.completed) {
            setCompletedLive(true);
            qc.invalidateQueries({ queryKey: ["me", "dashboard", scope] });
            qc.invalidateQueries({ queryKey: ["me", "resume", scope] });
            qc.invalidateQueries({ queryKey: ["enrollments", "me", scope] });
            qc.invalidateQueries({ queryKey: ["offerings", lecture.offeringId] });
            qc.invalidateQueries({ queryKey: ["lectures", lecture.id, scope] });
          }
        })
        .catch(() => {
          inFlightRef.current = false;
        });
    },
    [player, lecture.id, lecture.durationSec, lecture.offeringId, qc, scope],
  );

  /* Final flush on unmount — refs only, never the (possibly released) player. */
  useEffect(() => {
    return () => {
      const watched = Math.floor(highWaterRef.current);
      const total = resolveReportTotal(durationRef.current, lecture.durationSec);
      if (watched > 0) {
        void learningApi
          .watch(lecture.id, {
            watchedSec: watched,
            totalSec: total,
            completed: total > 0 && watched / total >= 0.95,
          })
          .catch(() => undefined);
      }
    };
  }, [lecture.id, lecture.durationSec]);

  /* Player listeners: status mirror, resume-seek, ended report (the
   * timeUpdate subscription lives with the checkpoint states below —
   * it needs their freshest values through a mirror ref). */

  useEffect(() => {
    const statusSub = player.addListener("statusChange", (pl) => {
      if (pl.status === "error") setErrUrl(lecture.videoUrl);
      const dur = player.duration;
      durationRef.current = dur;
      setMediaDuration(dur);
      if (pl.status === "readyToPlay" && !resumeSeekedRef.current) {
        resumeSeekedRef.current = true;
        const we = lecture.watchEvents?.[0];
        if (we && !we.completed && we.watchedSec > 5) {
          const target = Math.max(0, we.watchedSec - 3);
          const dur2 = player.duration;
          seekPlayer(player, clampSeek(target, dur2));
          toast.info("استأنفنا من حيث توقفت", "استئناف المشاهدة");
        }
      }
    });
    const endSub = player.addListener("playToEnd", () => {
      const dur = player.duration;
      if (Number.isFinite(dur) && dur > 0) highWaterRef.current = Math.max(highWaterRef.current, dur);
      report(true);
    });
    return () => {
      statusSub.remove();
      endSub.remove();
    };
  }, [player, lecture.id, lecture.watchEvents, report, lecture.videoUrl]);

  /* The 10s reporting ticker (while playing — web cadence). */
  useEffect(() => {
    const id = setInterval(() => {
      if (player.playing) report(false);
    }, 10_000);
    return () => clearInterval(id);
  }, [player, report]);

  /* ── Checkpoints ─────────────────────────────────────────────────── */
  const checkpoints = useMemo(
    () => [...(lecture.checkpoints ?? [])].sort((a, b) => a.triggerSec - b.triggerSec),
    [lecture.checkpoints],
  );
  const seededAnswered = useMemo(() => {
    const fromCheckpoints = checkpoints.flatMap(
      (c) => ((c as CheckpointWithAnswers).answers ?? []).map((a) => a.checkpointId),
    );
    const fromLecture = (lecture.answers ?? []).map((a) => a.checkpointId);
    return new Set([...fromCheckpoints, ...fromLecture]);
  }, [checkpoints, lecture.answers]);

  /* Server answer memory & the live session additions, UNIONED at
   * render (derived — the old merge-in-effect was the set-state-in-effect
   * cascading class). */
  const [liveAnswered, setLiveAnswered] = useState<Set<string>>(() => new Set());
  const answeredIds = useMemo(() => {
    if (seededAnswered.size === 0) return liveAnswered;
    const u = new Set(liveAnswered);
    for (const id of seededAnswered) u.add(id);
    return u;
  }, [liveAnswered, seededAnswered]);
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());

  const [activeCp, setActiveCp] = useState<CheckpointWithAnswers | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [reveal, setReveal] = useState<CheckpointAnswerFeedback | null>(null);
  const [answerErr, setAnswerErr] = useState(false);

  /* Freshest checkpoint context for the timeUpdate listener — updated
   * after every render (an EXTERNAL event callback cannot see render
   * state; the crossing detection used to live in a setState effect —
   * the cascading class). */
  const cpCtxRef = useRef({
    answered: answeredIds,
    skipped: skippedIds,
    active: activeCp,
    cps: checkpoints,
  });
  useEffect(() => {
    cpCtxRef.current = { answered: answeredIds, skipped: skippedIds, active: activeCp, cps: checkpoints };
  });

  /* Progress mirror + the checkpoint crossing — AT the event source. */
  useEffect(() => {
    const timeSub = player.addListener("timeUpdate", (pl) => {
      const t = pl.currentTime;
      if (t > highWaterRef.current) highWaterRef.current = t;
      const floored = Math.floor(t);
      setCurrentSec((prev) => (prev === floored ? prev : floored));

      /* Fire a checkpoint once per session when the playhead crosses it. */
      const ctx = cpCtxRef.current;
      if (!ctx.active) {
        const due = ctx.cps.find(
          (c) => t >= c.triggerSec && !ctx.answered.has(c.id) && !ctx.skipped.has(c.id),
        );
        if (due) {
          player.pause();
          setActiveCp(due);
          setPicked(null);
          setReveal(null);
          setAnswerErr(false);
        }
      }
    });
    return () => timeSub.remove();
  }, [player]);

  const answerCp = useMutation({
    mutationFn: (input: { cp: CheckpointWithAnswers; idx: number }) =>
      learningApi.answerCheckpoint(lecture.id, input.cp.id, input.idx),
    onSuccess: (fb) => {
      setReveal(fb);
      /* The verdict moment — success/error haptics (throttled by @/haptics). */
      haptics.notify(fb.correct ? "success" : "error");
      qc.invalidateQueries({ queryKey: ["me", "gaps", scope] });
      qc.invalidateQueries({ queryKey: ["me", "matrix", scope] });
    },
    onError: () => {
      setPicked(null);
      setAnswerErr(true);
      haptics.notify("error");
    },
  });

  const submitAnswer = (idx: number) => {
    if (!activeCp || picked !== null) return;
    haptics.selection();
    setPicked(idx);
    setAnswerErr(false);
    answerCp.mutate({ cp: activeCp, idx });
  };

  const closeCheckpoint = () => {
    if (!activeCp) return;
    const id = activeCp.id;
    setLiveAnswered((prev) => new Set(prev).add(id));
    setActiveCp(null);
    setPicked(null);
    setReveal(null);
    setAnswerErr(false);
    player.play();
  };

  /** Honest skip: session-local, never counted as answered. */
  const skipCheckpoint = () => {
    if (!activeCp) return;
    const id = activeCp.id;
    setSkippedIds((prev) => new Set(prev).add(id));
    setActiveCp(null);
    setPicked(null);
    setReveal(null);
    setAnswerErr(false);
    player.play();
  };

  /** Explicit return: un-skip, seek to the trigger, re-open the quiz. */
  const openCheckpointExplicit = (cp: CheckpointWithAnswers) => {
    player.pause();
    seekPlayer(player, cp.triggerSec);
    setSkippedIds((prev) => {
      if (!prev.has(cp.id)) return prev;
      const next = new Set(prev);
      next.delete(cp.id);
      return next;
    });
    setActiveCp(cp);
    setPicked(null);
    setReveal(null);
    setAnswerErr(false);
  };

  const seekTo = useCallback(
    (sec: number) => {
      seekPlayer(player, sec);
      player.play();
    },
    [player],
  );

  /* ── Speed (PickerSheet) ─────────────────────────────────────────── */
  const [rate, setRate] = useState<PlaybackRate>(1);
  const [speedOpen, setSpeedOpen] = useState(false);
  const speedArmed = useArmOnOpen(speedOpen);
  const speedOptions = useMemo(
    () =>
      PLAYBACK_RATES.map((r) => ({
        id: String(r),
        label: `${fmt(r)}×`,
        sub: r === 1 ? "السرعة الاعتيادية" : null,
      })),
    [fmt],
  );
  const selectRate = (id: string) => {
    const next = Number(id) as PlaybackRate;
    if (PLAYBACK_RATES.includes(next)) {
      setRate(next);
      player.playbackRate = next;
      haptics.selection();
    }
  };

  /* ── Captions overlay (driven by the transcript cues) ────────────── */
  const [captionsOn, setCaptionsOn] = useState(false);
  const toggleCaptions = useCallback(() => {
    haptics.selection();
    setCaptionsOn((v) => !v);
  }, []);

  /* ── Transcript (VTT) ────────────────────────────────────────────── */
  const transcript = useQuery<VttCue[]>({
    queryKey: ["lectures", lecture.id, "transcript", scope],
    enabled: !!lecture.transcriptUrl,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const url = absoluteUrl(lecture.transcriptUrl);
      if (!url) return [];
      const token = useSession.getState().accessToken;
      const res = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error("تعذّر تحميل النص المكتوب");
      return parseVttCues(await res.text());
    },
  });
  const [cueQuery, setCueQuery] = useState("");
  const cues = transcript.data ?? NO_CUES;
  const filteredCues = useMemo(() => filterCues(cues, cueQuery), [cues, cueQuery]);

  /* ── Siblings (prev/next) + offering materials ───────────────────── */
  const siblings = useQuery({
    queryKey: ["offerings", lecture.offeringId, "lectures", scope],
    queryFn: () => learningApi.lectures(lecture.offeringId),
    placeholderData: (prev) => prev,
  });
  const offeringFull = useQuery({
    queryKey: ["offerings", lecture.offeringId, "full", scope],
    queryFn: () => learningApi.offeringFull(lecture.offeringId),
  });

  const orderedSiblings = useMemo(
    () => [...(siblings.data ?? [])].sort((a, b) => a.ordinal - b.ordinal),
    [siblings.data],
  );
  const lecIdx = orderedSiblings.findIndex((l) => l.id === lecture.id);
  const prevLec = lecIdx > 0 ? orderedSiblings[lecIdx - 1] : undefined;
  const nextLec = lecIdx >= 0 && lecIdx < orderedSiblings.length - 1 ? orderedSiblings[lecIdx + 1] : undefined;

  const course = lecture.offering?.course;
  const teacher = (lecture.offering as { teacher?: { firstName: string; lastName: string } } | null)?.teacher;

  /* ── Watch progress surfaces ─────────────────────────────────────── */
  const savedSec = savedEvent?.watchedSec ?? 0;
  const livePct = totalSec > 0 ? Math.min(100, Math.round((currentSec / totalSec) * 100)) : 0;
  const savedPct = totalSec > 0 ? Math.min(100, Math.round((savedSec / totalSec) * 100)) : 0;
  const watchPct = completed ? 100 : Math.max(livePct, savedPct);
  const checkpointsAnswered = answeredIds.size;
  const allAnswered = checkpoints.length > 0 && checkpointsAnswered === checkpoints.length;
  const firstUnanswered = checkpoints.find((c) => !answeredIds.has(c.id));

  const transcriptPending =
    lecture.transcriptStatus === "QUEUED" || lecture.transcriptStatus === "RUNNING";

  const checkpointArmed = useArmOnOpen(!!activeCp);

  return (
    <Screen scroll={false} padded={false}>
      <AppStatusBar />
      <StackHeader
        title={lecture.title}
        kicker={course ? `${course.code} · ${course.name}` : undefined}
        right={completed ? <Badge label="مكتملة" tone="mint" /> : undefined}
      />

      {/* The video — pinned above the sheet, always in view */}
      <View>
        <VideoView
          ref={videoRef}
          player={player}
          style={{ width: "100%", aspectRatio: 16 / 9 }}
          contentFit="contain"
          nativeControls={false}
          fullscreenOptions={{ enable: true }}
        />
        <VideoStage
          player={player}
          durationSec={totalSec}
          cues={cues}
          captionsOn={captionsOn}
          onToggleCaptions={toggleCaptions}
          onOpenSpeed={() => {
            haptics.impact("light");
            setSpeedOpen(true);
          }}
          onEnterFullscreen={() => {
            haptics.impact("light");
            void videoRef.current?.enterFullscreen();
          }}
          rateLabel={`${fmt(rate)}×`}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ flexGrow: 1, gap: sp[16], paddingHorizontal: sp[20], paddingBottom: sp[24] }}
      >
        {loadError ? (
          <Card style={{ gap: sp[8] }}>
            <T variant="body" color="danger">
              تعذّر تحميل الفيديو — تحقّق من اتصالك ثم أعد المحاولة.
            </T>
            <Button label="إعادة تحميل الفيديو" kind="ghost" small onPress={loadSource} />
          </Card>
        ) : null}

        {/* Meta band */}
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
            {course ? <Badge label={course.code} tone="grey" mono /> : null}
            <T variant="sm" color="muted">
              {`المحاضرة ${latn(lecture.ordinal)}`}
            </T>
            {checkpoints.length > 0 ? (
              <Badge
                label={countAr(checkpoints.length, ["نقطة تفاعل واحدة", "نقطتا تفاعل", "نقاط تفاعل", "نقطة تفاعل"])}
                tone="sky"
              />
            ) : null}
          </View>
          {teacher ? (
            <T variant="sm" color="secondary">
              {`د. ${teacher.firstName} ${teacher.lastName}`}
            </T>
          ) : null}
          <T variant="xs" color="muted">
            {`المدة ${mmss(totalSec)}`}
          </T>
        </View>

        {/* Watch progress */}
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: sp[8] }}>
            <T variant="sm" color="muted" style={{ flex: 1 }}>
              تقدّم المشاهدة
            </T>
            <T variant="bodyLg" weight="bold">
              {`${fmt(watchPct)}٪`}
            </T>
          </View>
          <ProgressBar ratio={watchPct / 100} accent label={`تقدّم مشاهدة المحاضرة ${fmt(watchPct)}٪`} />
          {checkpoints.length > 0 ? (
            <T variant="xs" color={allAnswered ? "muted" : "accentInk"}>
              {`أُجيب عن ${fmt(checkpointsAnswered)} من ${countAr(checkpoints.length, [
                "نقطة تفاعل واحدة",
                "نقطتا تفاعل",
                "نقاط تفاعل",
                "نقطة تفاعل",
              ])}`}
            </T>
          ) : null}
        </View>

        {/* Checkpoint continuity: watch done, quizzes still open */}
        {completed && checkpoints.length > checkpointsAnswered && firstUnanswered ? (
          <Card style={{ gap: sp[8] }}>
            <T variant="body" weight="bold">
              {`أنهيت المشاهدة — تبقى ${countAr(checkpoints.length - checkpointsAnswered, [
                "نقطة تفاعل واحدة لم تُجب",
                "نقطتا تفاعل لم تُجبا",
                "نقاط تفاعل لم تُجب",
                "نقطة تفاعل لم تُجب",
              ])}`}
            </T>
            <Button
              label="إلى نقطة التفاعل التالية"
              kind="primary"
              small
              onPress={() => openCheckpointExplicit(firstUnanswered)}
            />
          </Card>
        ) : null}

        {/* Prev / next bar */}
        <View style={{ flexDirection: "row", gap: sp[8] }}>
          <View style={{ flex: 1 }}>
            <Button
              label="المحاضرة السابقة"
              kind="ghost"
              small
              disabled={!prevLec}
              onPress={() => prevLec && router.push(`/student/lectures/${prevLec.id}` as never)}
            />
          </View>
          {nextLec ? (
            <View style={{ flex: 1 }}>
              <Button
                label={`المحاضرة التالية · ${latn(nextLec.ordinal)}`}
                kind="primary"
                small
                onPress={() => router.push(`/student/lectures/${nextLec.id}` as never)}
              />
            </View>
          ) : siblings.isLoading ? (
            <View style={{ flex: 1 }}>
              <Button label="جارٍ التحميل…" kind="primary" small disabled loading />
            </View>
          ) : (
            <View style={{ flex: 1 }}>
              <Button
                label="عُد إلى المقرّر"
                kind="primary"
                small
                onPress={() => router.push(`/student/courses/${lecture.offeringId}` as never)}
              />
            </View>
          )}
        </View>

        {lecture.description ? (
          <T variant="body" color="secondary">
            {lecture.description}
          </T>
        ) : null}

        {/* نقاط التفاعل */}
        {checkpoints.length > 0 ? (
          <View style={{ gap: sp[8] }}>
            <SectionBar index={1} title="نقاط التفاعل" />
            <RowList>
              {checkpoints.map((c, i) => {
                const answered = answeredIds.has(c.id);
                return (
                  <LedgerRow
                    key={c.id}
                    last={i === checkpoints.length - 1}
                    accessibilityLabel={
                      answered
                        ? `راجع نقطة التفاعل: ${c.question}`
                        : `أجب عن نقطة التفاعل: ${c.question}`
                    }
                    onPress={() =>
                      answered ? seekTo(c.triggerSec) : openCheckpointExplicit(c)
                    }
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                      <MonoLabel>{cueClock(c.triggerSec)}</MonoLabel>
                      <T variant="sm" style={{ flex: 1 }} numberOfLines={2}>
                        {c.question}
                      </T>
                      {answered ? (
                        <CircleCheck size={16} color={tones.mint.ink} />
                      ) : (
                        <Sparkles size={16} color={p.accentInk} />
                      )}
                    </View>
                  </LedgerRow>
                );
              })}
            </RowList>
          </View>
        ) : null}

        {/* فصول المحاضرة */}
        <View style={{ gap: sp[8] }}>
          <SectionBar index={2} title="فصول المحاضرة" />

          {(lecture.chapters ?? []).length === 0 ? (
            <T variant="sm" color="muted">
              لا فصول مقسَّمة — شاهد المحاضرة كاملة دون تنقّل.
            </T>
          ) : (
            <RowList>
              {(lecture.chapters ?? []).map((ch, i, arr) => {
                const isActive = currentSec >= ch.startSec && currentSec < ch.endSec;
                const isWatched = completed || currentSec >= ch.endSec;
                return (
                  <LedgerRow
                    key={ch.id}
                    last={i === arr.length - 1}
                    accessibilityLabel={`انتقل إلى فصل: ${ch.title}`}
                    onPress={() => seekTo(ch.startSec)}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                      <MonoLabel>{`${mmss(ch.startSec)}–${mmss(ch.endSec)}`}</MonoLabel>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T
                          variant="sm"
                          weight={isActive ? "bold" : "medium"}
                          color={isActive ? "accentInk" : "text"}
                          numberOfLines={1}
                        >
                          {ch.title}
                        </T>
                        {ch.concept ? (
                          <T variant="xs" color="faint" numberOfLines={1}>
                            {ch.concept.name}
                          </T>
                        ) : null}
                      </View>
                      {isWatched ? <CircleCheck size={16} color={tones.mint.ink} /> : isActive ? <Play size={14} color={p.accentInk} /> : null}
                    </View>
                  </LedgerRow>
                );
              })}
            </RowList>
          )}
        </View>

        {/* النص المكتوب */}
        {(cues.length > 0 || transcriptPending || (!!lecture.transcriptUrl && transcript.isError)) && (
          <View style={{ gap: sp[8] }}>
            <SectionBar
              index={3}
              title="النص المكتوب"
              action={transcriptPending ? <Badge label="جارٍ توليد النص" tone="yellow" /> : undefined}
            />
            {transcript.isError ? (
              <T variant="sm" color="muted">
                {humanizeError(transcript.error)}
              </T>
            ) : cues.length === 0 ? (
              <T variant="sm" color="muted">
                {transcriptPending ? "يُولَّد نص هذه المحاضرة الآن — عد بعد قليل." : "لا مقاطع في هذا النص."}
              </T>
            ) : (
              <>
                <SearchBar
                  value={cueQuery}
                  onChange={setCueQuery}
                  placeholder="ابحث في النص المكتوب…"
                />
                {/* M5 — virtualized cue list (nested, height-capped):
                    FULL data in, windowed views out. The old shape mounted
                    200 rows via .map (audit §3); the FlatList fallback now
                    mounts only the initial window (see data.test.tsx
                    "windowing" — 10 of 1000 rows) and native FlashList v2
                    recycles. */}
                <DataList
                  data={filteredCues}
                  renderItem={({ item }) => (
                    <LedgerRow
                      accessibilityLabel={`انتقل إلى ${cueClock(item.start)}: ${item.text.slice(0, 80)}`}
                      onPress={() => seekTo(item.start)}
                    >
                      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: sp[8] }}>
                        <MonoLabel>{cueClock(item.start)}</MonoLabel>
                        <T variant="sm" color="secondary" style={{ flex: 1 }}>
                          {item.text}
                        </T>
                      </View>
                    </LedgerRow>
                  )}
                  keyExtractor={(c, i) => `${c.start}-${i}`}
                  style={{ height: 360 }}
                  contentPadding={{ bottom: 4 }}
                  windowing={{ initialNumToRender: 8, maxToRenderPerBatch: 8, windowSize: 9 }}
                  scrollProps={{ nestedScrollEnabled: true, showsVerticalScrollIndicator: true }}
                  emptyTitle="لا نتائج مطابقة في هذا النص."
                  emptyMessage="جرّب كلمة أخرى."
                />
              </>
            )}
          </View>
        )}

        {/* مواد المقرّر — one scroll away from the video */}
        {offeringFull.data && offeringFull.data.materials.length > 0 ? (
          <Card style={{ gap: sp[8] }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
              <T variant="body" weight="bold" style={{ flex: 1 }}>
                مواد المقرّر
              </T>
              <T variant="xs" color="muted">
                {fmt(offeringFull.data.materials.length)}
              </T>
            </View>
            {(offeringFull.data.materials ?? []).slice(0, 6).map((m, mi, mArr) => (
                <LedgerRow
                  key={m.id}
                  last={mi === mArr.length - 1}
                  accessibilityLabel={`مادة: ${m.name}`}
                  onPress={() => openMaterial(m.url, m.name)}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                    <T variant="sm" weight="medium" style={{ flex: 1 }} numberOfLines={1}>
                      {m.name}
                    </T>
                    <T variant="xs" color="muted">
                      {sizeLabel(m.sizeBytes)}
                    </T>
                  </View>
                </LedgerRow>
              ))}
          </Card>
        ) : null}
      </ScrollView>

      {/* Speed sheet — ٠٫٧٥× … ٢× (armed on first open: jest-safe) */}
      {speedArmed ? (
        <PickerSheet
          open={speedOpen}
          onClose={() => setSpeedOpen(false)}
          title="سرعة التشغيل"
          options={speedOptions}
          selectedId={String(rate)}
          onSelect={selectRate}
        />
      ) : null}

      {/* Checkpoint overlay — pauses the video until answered/skipped
          (AppSheet; keep the legacy logic, restyled onto the foundation). */}
      {checkpointArmed ? (
        <AppSheet
          open={!!activeCp}
          onClose={skipCheckpoint}
          title="نقطة تفاعل"
          footer={
            <View style={{ flexDirection: "row", gap: sp[8] }}>
              <View style={{ flex: 1 }}>
                <Button label="تخطّي" kind="ghost" small onPress={skipCheckpoint} />
              </View>
              {reveal ? (
                <View style={{ flex: 1 }}>
                  <Button label="متابعة المحاضرة" kind="primary" small onPress={closeCheckpoint} />
                </View>
              ) : null}
            </View>
          }
        >
          <View style={{ gap: sp[12] }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
              <Sparkles size={14} color={p.accentInk} />
              <T variant="xs" weight="bold" color="accentInk">
                أجب لتتابع المشاهدة
              </T>
            </View>
            <T variant="h4" weight="bold">
              {activeCp?.question ?? ""}
            </T>
            <View style={{ gap: sp[8] }} accessibilityLabel="خيارات الإجابة">
              {(activeCp?.options ?? []).map((opt, i) => {
                const isPicked = picked === i;
                const isCorrect = reveal?.correctIndex === i;
                const mark = AR_CHOICE_LETTERS[i] ?? latn(i + 1);
                const border = reveal
                  ? isCorrect
                    ? tones.mint.ink
                    : isPicked
                      ? tones.rose.ink
                      : p.rule
                  : isPicked
                    ? p.accent
                    : p.rule;
                const bg = reveal
                  ? isCorrect
                    ? tones.mint.bg
                    : isPicked
                      ? tones.rose.bg
                      : p.surface
                  : isPicked
                    ? p.surfaceHover
                    : p.surface;
                return (
                  <Pressable
                    key={i}
                    accessibilityRole="button"
                    accessibilityLabel={`${mark} — ${opt}`}
                    disabled={picked !== null}
                    onPress={() => submitAnswer(i)}
                    style={[
                      styles.option,
                      { borderColor: border, backgroundColor: bg, opacity: picked !== null && !reveal ? 0.9 : 1 },
                    ]}
                  >
                    <View style={[styles.mark, { borderColor: border }]}>
                      <T variant="sm" weight="bold">
                        {mark}
                      </T>
                    </View>
                    <T variant="body" style={{ flex: 1 }}>
                      {opt}
                    </T>
                    {reveal && isCorrect ? <CircleCheck size={18} color={tones.mint.ink} /> : null}
                    {reveal && !isCorrect && isPicked ? <CircleX size={18} color={tones.rose.ink} /> : null}
                  </Pressable>
                );
              })}
            </View>
            {answerErr ? (
              <T variant="sm" color="danger">
                تعذّر إرسال الإجابة — تحقّق من اتصالك ثم أعد المحاولة.
              </T>
            ) : null}
            {reveal ? (
              <View
                style={{
                  gap: sp[6],
                  borderWidth: 1,
                  borderColor: reveal.correct ? tones.mint.ink : tones.rose.ink,
                  backgroundColor: reveal.correct ? tones.mint.bg : tones.rose.bg,
                  padding: sp[12],
                }}
              >
                <T variant="body" weight="bold" style={{ color: reveal.correct ? tones.mint.deep : tones.rose.deep }}>
                  {reveal.correct ? "إجابة صحيحة!" : "ليست الإجابة الصحيحة."}
                </T>
                {reveal.explanation ? (
                  <T variant="sm" style={{ color: reveal.correct ? tones.mint.deep : tones.rose.deep }}>
                    {reveal.explanation}
                  </T>
                ) : null}
              </View>
            ) : null}
          </View>
        </AppSheet>
      ) : null}
    </Screen>
  );
}

/* ══ VideoStage — the custom controls overlay (immersive chrome) ════════ */

/** Auto-hide delay for the chrome while playing (ms). */
const CHROME_HIDE_MS = 3200;
/** Double-tap window (ms) — two taps inside it count as a seek gesture. */
const DOUBLE_TAP_MS = 320;

/**
 * The stage chrome always paints light-on-ink (the letterboxed video is
 * dark in BOTH themes), so it reads the FIXED light-theme token pair
 * (ink = .text, glyph = .primaryFg) instead of the user's theme — the
 * play/pause accent stays the theme accent (the ONE orange).
 */
function VideoStage({
  player,
  durationSec,
  cues,
  captionsOn,
  onToggleCaptions,
  onOpenSpeed,
  onEnterFullscreen,
  rateLabel,
}: {
  player: VideoPlayer;
  durationSec: number;
  cues: readonly VttCue[];
  captionsOn: boolean;
  onToggleCaptions: () => void;
  onOpenSpeed: () => void;
  onEnterFullscreen: () => void;
  rateLabel: string;
}) {
  const p = usePalette();
  const reduced = useReduceMotion();
  const { formatNumber: fmt, numerals } = useNumerals();
  /* Fixed on-ink pair (light theme tokens — see the docblock above). */
  const stage = themeFor("light").palette;

  /* Local 4Hz mirrors — the parent keeps its 1Hz currentSec; this subtree
   * re-renders alone, never the whole screen (audit §2 leaf-isolation). */
  const [posSec, setPosSec] = useState(0);
  const [bufferedSec, setBufferedSec] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [interactionKey, setInteractionKey] = useState(0);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    setPlaying(player.playing);
    const sub = player.addListener("timeUpdate", (pl) => {
      setPosSec(pl.currentTime);
      const buf = player.bufferedPosition;
      setBufferedSec(Number.isFinite(buf) && buf > 0 ? buf : 0);
    });
    const playSub = player.addListener("playingChange", (pl) => setPlaying(pl.isPlaying));
    return () => {
      sub.remove();
      playSub.remove();
    };
  }, [player]);

  /* Chrome: always visible when paused; auto-hides while playing. */
  useEffect(() => {
    if (!playing) setChromeVisible(true);
  }, [playing]);
  useEffect(() => {
    if (!chromeVisible || !playing) return;
    const id = setTimeout(() => setChromeVisible(false), CHROME_HIDE_MS);
    return () => clearTimeout(id);
  }, [chromeVisible, playing, interactionKey]);

  const pokeChrome = useCallback(() => {
    setChromeVisible(true);
    setInteractionKey((n) => n + 1);
  }, []);

  /* Chrome fade (transform+opacity only; reduced-motion = near-instant). */
  const chrome = useSharedValue(1);
  useEffect(() => {
    chrome.value = withTiming(chromeVisible ? 1 : 0, {
      duration: reduced ? 1 : 160,
    });
  }, [chromeVisible, reduced, chrome]);
  const chromeStyle = useAnimatedStyle(() => ({
    opacity: chrome.value,
    transform: [{ translateY: 6 * (1 - chrome.value) }],
  }));

  /* ±10s ripple pulses — transform/opacity only, skipped when reduced. */
  const rippleStart = useSharedValue(0);
  const rippleEnd = useSharedValue(0);
  const rippleStartStyle = useAnimatedStyle(() => ({
    opacity: rippleStart.value * 0.5,
    transform: [{ scale: 0.75 + 0.45 * rippleStart.value }],
  }));
  const rippleEndStyle = useAnimatedStyle(() => ({
    opacity: rippleEnd.value * 0.5,
    transform: [{ scale: 0.75 + 0.45 * rippleEnd.value }],
  }));
  const fireRipple = (side: -1 | 1) => {
    if (reduced) return;
    const sv: SharedValue<number> = side < 0 ? rippleStart : rippleEnd;
    sv.value = withSequence(
      withTiming(1, { duration: 70 }),
      withTiming(0, { duration: 430 }),
    );
  };

  /* Tap math: single tap toggles chrome, double tap seeks ±10s. The
   * delayed single-tap reads the chrome through a ref (the state in this
   * closure may be stale by the time the timer fires). */
  const chromeVisibleRef = useRef(true);
  useEffect(() => {
    chromeVisibleRef.current = chromeVisible;
  }, [chromeVisible]);
  const lastTapRef = useRef<{ t: number; x: number } | null>(null);
  const tapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    };
  }, []);

  const doSeekBy = (delta: number) => {
    player.seekBy(delta);
    pokeChrome();
  };

  const handleTap = (x: number) => {
    const now = Date.now();
    const last = lastTapRef.current;
    if (last && now - last.t <= DOUBLE_TAP_MS && Math.abs(x - last.x) < 72) {
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
        tapTimerRef.current = null;
      }
      lastTapRef.current = null;
      const delta = doubleTapSeekDelta(x, width);
      fireRipple(delta < 0 ? -1 : 1);
      doSeekBy(delta);
    } else {
      lastTapRef.current = { t: now, x };
      if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
      tapTimerRef.current = setTimeout(() => {
        tapTimerRef.current = null;
        lastTapRef.current = null;
        setChromeVisible(!chromeVisibleRef.current);
        setInteractionKey((n) => n + 1);
      }, DOUBLE_TAP_MS);
    }
  };

  const togglePlay = () => {
    haptics.impact("light");
    if (player.playing) player.pause();
    else player.play();
    pokeChrome();
  };

  const activeCue = captionsOn ? activeCueAt(cues, posSec) : null;
  const dur = Number.isFinite(durationSec) && durationSec > 0 ? durationSec : 0;

  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="box-none"
      onLayout={(e) => setWidth(e.nativeEvent.layout.width)}
    >
      {/* Ripple feedback (each half) */}
      <View style={[styles.rippleHalf, { left: 0 }]} pointerEvents="none">
        <Animated.View style={[styles.ripple, rippleStartStyle, { backgroundColor: stage.text }]}>
          <RotateCcw size={26} color={stage.primaryFg} />
          <T variant="sm" weight="bold" style={{ color: stage.primaryFg }}>
            {`${fmt(10)} ثوانٍ`}
          </T>
        </Animated.View>
      </View>
      <View style={[styles.rippleHalf, { right: 0 }]} pointerEvents="none">
        <Animated.View style={[styles.ripple, rippleEndStyle, { backgroundColor: stage.text }]}>
          <RotateCw size={26} color={stage.primaryFg} />
          <T variant="sm" weight="bold" style={{ color: stage.primaryFg }}>
            {`${fmt(10)} ثوانٍ`}
          </T>
        </Animated.View>
      </View>

      {/* Tap layer — always alive so a hidden chrome can be summoned */}
      <Pressable
        style={StyleSheet.absoluteFill}
        accessibilityLabel="إظهار أو إخفاء أدوات التحكم"
        accessibilityHint="نقرتان على أحد جانبي الفيديو يرجع أو يتقدّم عشر ثوانٍ"
        onPress={(e) => handleTap(e.nativeEvent.locationX)}
      />

      {/* Captions overlay (from the VTT transcript) */}
      {activeCue ? (
        <View pointerEvents="none" style={styles.captionsSeat}>
          <View style={[styles.captionsBox, { backgroundColor: stage.text }]}>
            <T variant="sm" style={{ color: stage.primaryFg }} align="center">
              {activeCue.text}
            </T>
          </View>
        </View>
      ) : null}

      {/* The controls chrome */}
      <Animated.View pointerEvents={chromeVisible ? "auto" : "none"} style={[styles.chrome, chromeStyle]}>
        {/* scrim + content stacked (opacity on the scrim only) */}
        <View style={[StyleSheet.absoluteFill, { backgroundColor: stage.text, opacity: 0.82 }]} />
        <View style={{ gap: sp[6], paddingTop: sp[8] }}>
          {/* clock row + seek bar */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10], paddingHorizontal: sp[12] }}>
            <T variant="sm" style={{ color: stage.primaryFg }} accessibilityLabel="الوقت الحالي">
              {playerClock(posSec, numerals)}
            </T>
            <SeekBar
              player={player}
              durationSec={dur}
              bufferedSec={bufferedSec}
              posSec={posSec}
              ink={stage.text}
              glyph={stage.primaryFg}
              onScrubEnd={pokeChrome}
            />
            <T variant="sm" style={{ color: stage.primaryFg }} accessibilityLabel="الوقت المتبقي">
              {remainingClock(posSec, dur, numerals)}
            </T>
          </View>
          {/* buttons row */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[4], paddingHorizontal: sp[8] }}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="رجوع عشر ثوانٍ"
              onPress={() => doSeekBy(-10)}
              hitSlop={8}
              style={styles.chip}
            >
              <RotateCcw size={20} color={stage.primaryFg} />
            </PressableScale>
            {/* THE one orange — the primary control */}
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={playing ? "إيقاف مؤقت" : "تشغيل"}
              onPress={togglePlay}
              hitSlop={4}
              style={[styles.playButton, { backgroundColor: p.accent }]}
            >
              {playing ? (
                <Pause size={26} color={p.accentFg} />
              ) : (
                <Play size={26} color={p.accentFg} />
              )}
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="تقدّم عشر ثوانٍ"
              onPress={() => doSeekBy(10)}
              hitSlop={8}
              style={styles.chip}
            >
              <RotateCw size={20} color={stage.primaryFg} />
            </PressableScale>
            <View style={{ flex: 1 }} />
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`سرعة التشغيل ${rateLabel}`}
              onPress={onOpenSpeed}
              hitSlop={8}
              style={styles.chip}
            >
              <T variant="sm" weight="bold" style={{ color: stage.primaryFg }}>
                {rateLabel}
              </T>
            </PressableScale>
            {cues.length > 0 ? (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel="النص المصاحب"
                accessibilityState={{ selected: captionsOn }}
                onPress={onToggleCaptions}
                hitSlop={8}
                style={[styles.chip, captionsOn ? { borderBottomWidth: 2, borderBottomColor: p.accent } : null]}
              >
                <Captions size={20} color={stage.primaryFg} />
              </PressableScale>
            ) : null}
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="ملء الشاشة"
              onPress={onEnterFullscreen}
              hitSlop={8}
              style={styles.chip}
            >
              <Maximize size={20} color={stage.primaryFg} />
            </PressableScale>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

/**
 * SeekBar — scrub-then-commit on a physical-LTR timeline (video
 * timelines read left→right even in RTL apps). Buffer tint + played
 * fill + a knob; a11y adjustable with ±10s increment/decrement.
 */
function SeekBar({
  player,
  durationSec,
  bufferedSec,
  posSec,
  ink,
  glyph,
  onScrubEnd,
}: {
  player: VideoPlayer;
  durationSec: number;
  bufferedSec: number;
  posSec: number;
  ink: string;
  glyph: string;
  onScrubEnd: () => void;
}) {
  const widthRef = useRef(0);
  const durationRef = useRef(durationSec);
  useEffect(() => {
    durationRef.current = durationSec;
  }, [durationSec]);
  /** Latest scrub fraction (ref) + its render mirror (state). */
  const scrubRef = useRef<number | null>(null);
  const [scrub, setScrub] = useState<number | null>(null);

  const fractionAt = (x: number) =>
    widthRef.current > 0 ? Math.min(1, Math.max(0, x / widthRef.current)) : 0;

  const pan = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => durationRef.current > 0,
        onMoveShouldSetPanResponder: () => durationRef.current > 0,
        onPanResponderGrant: (e) => {
          const f = fractionAt(e.nativeEvent.locationX);
          scrubRef.current = f;
          setScrub(f);
        },
        onPanResponderMove: (e) => {
          const f = fractionAt(e.nativeEvent.locationX);
          scrubRef.current = f;
          setScrub(f);
        },
        onPanResponderRelease: () => {
          const frac = scrubRef.current;
          scrubRef.current = null;
          setScrub(null);
          if (frac !== null && durationRef.current > 0) {
            seekPlayer(player, clampSeek(frac * durationRef.current, durationRef.current));
          }
          onScrubEnd();
        },
        onPanResponderTerminate: () => {
          scrubRef.current = null;
          setScrub(null);
        },
      }),
    [player, onScrubEnd],
  );

  const played = scrub ?? (durationSec > 0 ? Math.min(1, posSec / durationSec) : 0);
  const buffered = durationSec > 0 ? Math.min(1, Math.max(played, bufferedSec / durationSec)) : 0;

  return (
    <View
      {...pan.panHandlers}
      onLayout={(e) => (widthRef.current = e.nativeEvent.layout.width)}
      accessibilityRole="adjustable"
      accessibilityLabel="شريط تقدّم المحاضرة"
      accessibilityHint="اسحب للانتقال — نقرتان مزدوجتان على جانبي الفيديو يقدّمان أو يؤخّران عشر ثوانٍ"
      onAccessibilityAction={(e) => {
        const step = e.nativeEvent.actionName === "increment" ? 10 : e.nativeEvent.actionName === "decrement" ? -10 : 0;
        if (step !== 0) player.seekBy(step);
      }}
      accessibilityActions={[
        { name: "increment", label: "تقدّم عشر ثوانٍ" },
        { name: "decrement", label: "رجوع عشر ثوانٍ" },
      ]}
      style={{ flex: 1, height: 44, justifyContent: "center" }}
    >
      <View style={{ height: 4, backgroundColor: ink, opacity: 0.35 }} />
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 20,
          height: 4,
          width: `${buffered * 100}%`,
          backgroundColor: glyph,
          opacity: 0.45,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: 0,
          top: 20,
          height: 4,
          width: `${played * 100}%`,
          backgroundColor: glyph,
          opacity: 0.95,
        }}
      />
      <View
        style={{
          position: "absolute",
          left: `${played * 100}%`,
          top: 15,
          marginLeft: -7,
          width: 14,
          height: 14,
          borderRadius: 7,
          backgroundColor: glyph,
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: sp[10],
    borderWidth: 1,
    paddingHorizontal: sp[12],
    minHeight: 56,
  },
  mark: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  /* ── stage chrome ── */
  rippleHalf: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: "38%",
    alignItems: "center",
    justifyContent: "center",
  },
  ripple: {
    width: 104,
    height: 104,
    borderRadius: 52,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  captionsSeat: {
    position: "absolute",
    left: sp[16],
    right: sp[16],
    bottom: sp[56],
    alignItems: "center",
  },
  captionsBox: {
    paddingHorizontal: sp[12],
    paddingVertical: sp[6],
    borderRadius: 4,
    maxWidth: "100%",
  },
  chrome: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingBottom: sp[6],
  },
  chip: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
