import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BookOpen, CheckCircle2, ChevronLeft, Clock, Sparkles } from "lucide-react-native";
import { trainingApi } from "@/api/training";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { latn } from "@/lib/format";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Badge, Card } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { ProgressBar, RowList, LedgerRow } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { StackHeader } from "@/components/shell/AppTopBar";
import {
  SignInPrompt,
  apiMessage,
  isUnauthError,
  lessonsAr,
  minutesAr,
  pointsAr,
} from "@/features/common/components";
import { TRAINING_CATEGORY_LABEL, TRAINING_LEVEL_LABEL } from "./index";

/**
 * /training/[slug] — track detail: hero facts, honest progress (completed
 * lessons from progress data), the ordered lesson list, and «التسجيل» —
 * enroll (idempotent on the backend) then jump straight to the first
 * incomplete lesson. Web twin: TrainingTrackPage.
 */
export default function TrainingTrack() {
  const p = usePalette();
  const params = useLocalSearchParams<{ slug: string }>();
  const scope = useInstitutionScope();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["training", "track", params.slug, scope],
    queryFn: () => trainingApi.track(params.slug),
    enabled: !!params.slug,
  });

  const enroll = useMutation({
    mutationFn: () => trainingApi.enroll(params.slug),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["training"] });
      toast.success("سُجّلت في المسار — بالتوفيق!");
    },
    onError: (e) => toast.error(apiMessage(e, "تعذّر التسجيل في المسار — تحقّق من اتصالك وأعد المحاولة.")),
  });

  if (!params.slug) {
    // R327 A4: a broken/partial deep link must land on an honest state —
    // `return null` here was a white screen (the exact M1 crash class).
    return (
      <Screen scroll>
        <StackHeader title="مسار تدريبي" kicker="التطوير الذاتي" />
        <EmptyState
          title="الرابط غير مكتمل"
          message="لا يوجد مسار في هذا الرابط — اختر مساراً من قائمة التطوير الذاتي."
          actionLabel="عرض المسارات"
          onAction={() => router.push("/training" as never)}
        />
      </Screen>
    );
  }
  if (q.isLoading) {
    return (
      <Screen scroll>
        <StackHeader title="مسار تدريبي" kicker="التطوير الذاتي" />
        <SkeletonList rows={5} />
      </Screen>
    );
  }
  if (q.isError) {
    return (
      <Screen scroll>
        <StackHeader title="مسار تدريبي" kicker="التطوير الذاتي" />
        {isUnauthError(q.error) ? (
          <SignInPrompt message="مسارات التطوير الذاتي تحتاج حسابًا — سجّل الدخول لتتبّع تقدّمك." />
        ) : (
          <ErrorState message={apiMessage(q.error)} onRetry={() => q.refetch()} />
        )}
      </Screen>
    );
  }
  if (!q.data) {
    // Success-but-null (API returned { data: null }) — honest emptiness,
    // never a white screen (R327 A4).
    return (
      <Screen scroll>
        <StackHeader title="مسار تدريبي" kicker="التطوير الذاتي" />
        <EmptyState
          title="لا توجد بيانات لهذا المسار"
          message="ربما أُزيل المسار أو أن الرابط قديم."
          actionLabel="عرض المسارات"
          onAction={() => router.push("/training" as never)}
        />
      </Screen>
    );
  }

  const track = q.data;
  const lessons = track.lessons ?? [];
  const completedCount = lessons.filter((l) => l.completedAt).length;
  const enrolled =
    (track as unknown as { enrolled?: boolean }).enrolled === true || completedCount > 0;
  const isCompleted = lessons.length > 0 && completedCount === lessons.length;
  const nextLesson = lessons.find((l) => !l.completedAt) ?? lessons[0];

  const start = async () => {
    if (!enrolled) {
      try {
        await enroll.mutateAsync();
      } catch {
        /* surfaced via toast */
        return;
      }
    }
    if (nextLesson) {
      router.push(`/training/${track.slug}/lesson/${nextLesson.id}` as never);
    }
  };

  return (
    <Screen scroll>
      <StackHeader
        title={track.title}
        kicker={track.category ? TRAINING_CATEGORY_LABEL[track.category] ?? track.category : "التطوير الذاتي"}
      />

      {/* Hero */}
      <View style={{ gap: sp[8], paddingBottom: sp[4] }}>
        <T variant="h3" weight="bold">
          {track.title}
        </T>
        {track.titleEn ? (
          <T variant="sm" color="muted">
            {track.titleEn}
          </T>
        ) : null}
        {track.summary ? (
          <T variant="body" color="secondary">
            {track.summary}
          </T>
        ) : null}
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[8] }}>
          {track.estMinutes != null ? (
            <Badge label={minutesAr(track.estMinutes)} tone="grey" />
          ) : null}
          <Badge label={lessonsAr(lessons.length)} tone="grey" />
          {track.pointsAward != null && track.pointsAward > 0 ? (
            <Badge label={`${pointsAr(track.pointsAward)} عند الإكمال`} tone="lavender" />
          ) : null}
          {track.level ? (
            <Badge label={TRAINING_LEVEL_LABEL[track.level] ?? track.level} tone="sky" />
          ) : null}
        </View>
      </View>

      <Button
        label={
          enroll.isPending
            ? "جارٍ البدء…"
            : !enrolled
              ? "ابدأ المسار"
              : isCompleted
                ? "مراجعة الدروس"
                : "استكمل الدراسة"
        }
        kind="primary"
        loading={enroll.isPending}
        disabled={lessons.length === 0}
        onPress={start}
        icon={!enrolled && !enroll.isPending ? <ChevronLeft size={16} color={p.accentFg} /> : undefined}
      />

      {enrolled && lessons.length > 0 ? (
        <Card style={{ gap: sp[8] }}>
          <ProgressBar
            ratio={completedCount / lessons.length}
            accent
            label={`تقدّم مسار ${track.title}`}
          />
          <T variant="sm" color="muted">
            {isCompleted
              ? "هذا المسار مكتمل — سجلّ الإتمام جاهز في صفحة الإنجازات."
              : `${latn(completedCount)} / ${lessonsAr(lessons.length)} مكتمل`}
          </T>
        </Card>
      ) : null}

      {/* Lesson list */}
      <T variant="h4" weight="bold">
        الدروس
      </T>
      {lessons.length === 0 ? (
        <EmptyState
          title="لا توجد دروس بعد"
          message="لم تُضَف دروس إلى هذا المسار حتى الآن."
          icon={<BookOpen size={20} color={p.textMuted} />}
        />
      ) : (
        <RowList>
          {lessons.map((lesson, i) => {
            const done = !!lesson.completedAt;
            return (
              <LedgerRow
                key={lesson.id}
                last={i === lessons.length - 1}
                onPress={() =>
                  router.push(`/training/${track.slug}/lesson/${lesson.id}` as never)
                }
                accessibilityLabel={`${done ? "درس مكتمل" : "درس"}: ${lesson.title}`}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                  <View style={{ width: 34, alignItems: "center" }}>
                    {done ? (
                      <CheckCircle2 size={20} color={p.accentInk} />
                    ) : (
                      <T variant="body" color="muted">
                        {latn(lesson.order ?? i + 1)}
                      </T>
                    )}
                  </View>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="body" weight={done ? "medium" : "bold"} numberOfLines={1}>
                      {lesson.title}
                    </T>
                    {lesson.summary ? (
                      <T variant="sm" color="muted" numberOfLines={1}>
                        {lesson.summary}
                      </T>
                    ) : null}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: sp[4] }}>
                    {lesson.quizQuestion ? (
                      <Badge label="سؤال" tone="yellow" />
                    ) : null}
                    {lesson.estMinutes != null ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                        <Clock size={10} color={p.textMuted} />
                        <T variant="xs" color="faint">{`${latn(lesson.estMinutes)} د`}</T>
                      </View>
                    ) : null}
                  </View>
                </View>
              </LedgerRow>
            );
          })}
        </RowList>
      )}

      {lessons.some((l) => l.pointsAward != null && l.pointsAward > 0) ? (
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: sp[6] }}>
          <Sparkles size={12} color={p.goldInk} />
          <T variant="xs" color="faint">إكمال الدروس يمنح نقاطًا تُحتسب في مستواك.</T>
        </View>
      ) : null}
    </Screen>
  );
}
