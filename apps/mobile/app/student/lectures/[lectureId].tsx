/**
 * /student/lectures/[lectureId] — مشغّل المحاضرة (web LecturePlayerPage
 * parity, expo-video engine):
 *  - resume-seek to the saved high-water mark (watchedSec − 3s, once),
 *  - 10s watch reporting while playing (high-water never regresses;
 *    completed only at ≥95% share / on ended; final flush on unmount),
 *  - interactive checkpoints: pause on crossing triggerSec, Arabic
 *    option marks أ ب ج د هـ و, server-verdict reveal + explanation,
 *    honest «تخطّي» (session-local), gaps/matrix invalidation,
 *  - chapters + searchable transcript (VTT) with click-to-seek,
 *  - prev/next lecture bar + the offering's materials card.
 * The video is pinned above the scrollable sheet (sticky at top).
 */
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { VideoView, useVideoPlayer } from "expo-video";
import { CircleCheck, CircleX, Play, Sparkles } from "lucide-react-native";
import { absoluteUrl } from "@/api/client";
import { learningApi } from "@/api/learning";
import type { CheckpointAnswerFeedback, Lecture, LectureCheckpoint } from "@/api/types";
import { useSession } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette, useStatusTones } from "@/design/theme";
import { sp } from "@/design/tokens";
import { Screen } from "@/components/ui/screen";
import { SectionBar } from "@/components/ui/screen";
import { T, MonoLabel } from "@/components/ui/text";
import { Badge, Card, Sheet } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { SearchBar } from "@/components/ui/fields";
import { LedgerRow, ProgressBar, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { latn, pct, sizeLabel } from "@/lib/format";
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

type CheckpointWithAnswers = LectureCheckpoint & { answers?: { checkpointId: string }[] };

/** Effective report total: real media duration wins, authored value falls back. */
function resolveReportTotal(mediaDuration: number, authoredDurationSec: number | null | undefined): number {
  const winner = Number.isFinite(mediaDuration) && mediaDuration > 0 ? mediaDuration : (authoredDurationSec ?? 0);
  return Math.round(winner);
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
        <SkeletonList rows={6} rowHeight={64} />
      </ScrollFrame>
    );
  }
  if (lecture.isError || !lecture.data) {
    return (
      <ScrollFrame title="محاضرة">
        <ErrorState message={(lecture.error as Error)?.message} onRetry={() => lecture.refetch()} />
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

function LectureBody({ lecture, scope }: { lecture: Lecture; scope: string | null }) {
  const qc = useQueryClient();
  const p = usePalette();
  const tones = useStatusTones();

  /* ── Player + source ─────────────────────────────────────────────── */
  const player = useVideoPlayer(null, (pl) => {
    pl.timeUpdateEventInterval = 0.25;
  });

  const [loadError, setLoadError] = useState(false);
  const loadSource = useCallback(() => {
    const url = absoluteUrl(lecture.videoUrl);
    if (!url) return;
    // Bearer always — harmless for external URLs, required for /api/v1/files/lectures.
    const token = useSession.getState().accessToken;
    setLoadError(false);
    void player
      .replaceAsync({ uri: url, headers: token ? { Authorization: `Bearer ${token}` } : undefined })
      .catch(() => setLoadError(true));
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

  /** 10s-cadence report — high-water watchedSec, completed only at ≥95% (or forced on ended). */
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

  /* Player listeners: progress mirror, resume-seek, ended report. */
  useEffect(() => {
    const timeSub = player.addListener("timeUpdate", (pl) => {
      const t = pl.currentTime;
      if (t > highWaterRef.current) highWaterRef.current = t;
      const floored = Math.floor(t);
      setCurrentSec((prev) => (prev === floored ? prev : floored));
    });
    const statusSub = player.addListener("statusChange", (pl) => {
      if (pl.status === "error") setLoadError(true);
      const dur = player.duration;
      durationRef.current = dur;
      setMediaDuration(dur);
      if (pl.status === "readyToPlay" && !resumeSeekedRef.current) {
        resumeSeekedRef.current = true;
        const we = lecture.watchEvents?.[0];
        if (we && !we.completed && we.watchedSec > 5) {
          const target = Math.max(0, we.watchedSec - 3);
          const dur2 = player.duration;
          player.currentTime =
            Number.isFinite(dur2) && dur2 > 0 ? Math.min(target, Math.max(0, Math.floor(dur2) - 1)) : target;
        }
      }
    });
    const endSub = player.addListener("playToEnd", () => {
      const dur = player.duration;
      if (Number.isFinite(dur) && dur > 0) highWaterRef.current = Math.max(highWaterRef.current, dur);
      report(true);
    });
    return () => {
      timeSub.remove();
      statusSub.remove();
      endSub.remove();
    };
  }, [player, lecture.id, lecture.watchEvents, report]);

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

  const [answeredIds, setAnsweredIds] = useState<Set<string>>(() => new Set(seededAnswered));
  const [skippedIds, setSkippedIds] = useState<Set<string>>(new Set());
  const [activeCp, setActiveCp] = useState<CheckpointWithAnswers | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [reveal, setReveal] = useState<CheckpointAnswerFeedback | null>(null);
  const [answerErr, setAnswerErr] = useState(false);

  /* Server answer memory stays merged with the live set across refetches. */
  useEffect(() => {
    if (seededAnswered.size === 0) return;
    setAnsweredIds((prev) => {
      const next = new Set(prev);
      for (const id of seededAnswered) next.add(id);
      return next.size === prev.size ? prev : next;
    });
  }, [seededAnswered]);

  /* Fire a checkpoint once per session when the playhead crosses it. */
  useEffect(() => {
    if (activeCp) return;
    const due = checkpoints.find(
      (c) => currentSec >= c.triggerSec && !answeredIds.has(c.id) && !skippedIds.has(c.id),
    );
    if (due) {
      player.pause();
      setActiveCp(due);
      setPicked(null);
      setReveal(null);
      setAnswerErr(false);
    }
  }, [currentSec, activeCp, answeredIds, skippedIds, checkpoints, player]);

  const answerCp = useMutation({
    mutationFn: (input: { cp: CheckpointWithAnswers; idx: number }) =>
      learningApi.answerCheckpoint(lecture.id, input.cp.id, input.idx),
    onSuccess: (fb) => {
      setReveal(fb);
      qc.invalidateQueries({ queryKey: ["me", "gaps", scope] });
      qc.invalidateQueries({ queryKey: ["me", "matrix", scope] });
    },
    onError: () => {
      setPicked(null);
      setAnswerErr(true);
    },
  });

  const submitAnswer = (idx: number) => {
    if (!activeCp || picked !== null) return;
    setPicked(idx);
    setAnswerErr(false);
    answerCp.mutate({ cp: activeCp, idx });
  };

  const closeCheckpoint = () => {
    if (!activeCp) return;
    const id = activeCp.id;
    setAnsweredIds((prev) => new Set(prev).add(id));
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
    player.currentTime = Math.max(0, cp.triggerSec);
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

  const seekTo = (sec: number) => {
    player.currentTime = Math.max(0, sec);
    player.play();
  };

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
  const cues = transcript.data ?? [];
  const filteredCues = useMemo(() => {
    const q = cueQuery.trim();
    const list = q === "" ? cues : cues.filter((c) => c.text.includes(q));
    return list.slice(0, 200);
  }, [cues, cueQuery]);

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
  const teacher = (lecture.offering as { teacher?: { firstName: string; lastName: string } | null } | null)?.teacher;

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

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader
        title={lecture.title}
        kicker={course ? `${course.code} · ${course.name}` : undefined}
        right={completed ? <Badge label="مكتملة" tone="mint" /> : undefined}
      />

      {/* The video — pinned above the sheet, always in view */}
      <View>
        <VideoView
          player={player}
          style={{ width: "100%", aspectRatio: 16 / 9 }}
          contentFit="contain"
          nativeControls
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
            {`${mmss(currentSec)} / ${mmss(totalSec)}`}
          </T>
        </View>

        {/* Watch progress */}
        <View style={{ gap: 4 }}>
          <View style={{ flexDirection: "row", alignItems: "baseline", gap: sp[8] }}>
            <T variant="sm" color="muted" style={{ flex: 1 }}>
              تقدّم المشاهدة
            </T>
            <T variant="bodyLg" weight="bold">
              {pct(watchPct)}
            </T>
          </View>
          <ProgressBar ratio={watchPct / 100} accent label={`تقدّم مشاهدة المحاضرة ${pct(watchPct)}`} />
          {checkpoints.length > 0 ? (
            <T variant="xs" color={allAnswered ? "muted" : "accentInk"}>
              {`أُجيب عن ${latn(checkpointsAnswered)} من ${countAr(checkpoints.length, [
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
                تعذّر تحميل النص المكتوب — أعد المحاولة لاحقاً.
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
                <RowList>
                  {filteredCues.map((c, i) => (
                    <LedgerRow
                      key={`${c.start}-${i}`}
                      last={i === filteredCues.length - 1}
                      accessibilityLabel={`انتقل إلى ${cueClock(c.start)}: ${c.text.slice(0, 80)}`}
                      onPress={() => seekTo(c.start)}
                    >
                      <View style={{ flexDirection: "row", alignItems: "flex-start", gap: sp[8] }}>
                        <MonoLabel>{cueClock(c.start)}</MonoLabel>
                        <T variant="sm" color="secondary" style={{ flex: 1 }}>
                          {c.text}
                        </T>
                      </View>
                    </LedgerRow>
                  ))}
                </RowList>
                {cueQuery.trim() !== "" && filteredCues.length === 0 ? (
                  <T variant="sm" color="muted">
                    لا نتائج مطابقة في هذا النص.
                  </T>
                ) : null}
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
                {latn(offeringFull.data.materials.length)}
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

      {/* Checkpoint overlay — pauses the video until answered/skipped */}
      <Sheet
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
      </Sheet>
    </Screen>
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
});
