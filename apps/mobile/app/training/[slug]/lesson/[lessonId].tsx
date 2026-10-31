import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, Target } from "lucide-react-native";
import { trainingApi } from "@/api/training";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { latn } from "@/lib/format";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Card, Badge } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { Field } from "@/components/ui/fields";
import { Markdown } from "@/components/ui/markdown";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { StackHeader } from "@/components/shell/AppTopBar";
import {
  SignInPrompt,
  apiMessage,
  isUnauthError,
  minutesAr,
  pointsAr,
} from "@/features/common/components";

interface CompleteLessonResult {
  newlyCompleted?: boolean;
  pointsAwarded?: number;
}

/**
 * /training/[slug]/lesson/[lessonId] — the lesson runner: Markdown body
 * (contentMarkdown), the quiz block when quizQuestion exists (answer sent
 * with completion), and the honest already-completed state. Completing
 * toasts + bounces back to the track. Web twin: TrainingLessonPage.
 */
export default function TrainingLesson() {
  const p = usePalette();
  const params = useLocalSearchParams<{ slug: string; lessonId: string }>();
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const [quizAnswer, setQuizAnswer] = useState("");

  const q = useQuery({
    queryKey: ["training", "track", params.slug, scope],
    queryFn: () => trainingApi.track(params.slug),
    enabled: !!params.slug,
  });

  const complete = useMutation({
    mutationFn: () => trainingApi.completeLesson(params.lessonId, quizAnswer.trim() || undefined),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["training"] });
      const r = res as CompleteLessonResult | null;
      if (r?.newlyCompleted === false) {
        toast.info("تم احتساب هذا الدرس مسبقًا.");
      } else if (r?.pointsAwarded && r.pointsAwarded > 0) {
        toast.success(`أحسنت! حصلت على ${pointsAr(r.pointsAwarded)}.`, "درس مكتمل");
      } else {
        toast.success("تمّ احتساب الدرس.", "درس مكتمل");
      }
      router.back();
    },
    onError: (e) =>
      toast.error(apiMessage(e, "تعذّر احتساب الدرس — تحقّق من اتصالك وحاول مرة أخرى.")),
  });

  if (!params.slug || !params.lessonId) {
    // R327 A4: broken deep link → honest state, never a white screen.
    return (
      <Screen scroll>
        <StackHeader title="درس" kicker="التطوير الذاتي" />
        <EmptyState
          title="الرابط غير مكتمل"
          message="لا يوجد درس في هذا الرابط — افتح المسار من قائمة التطوير الذاتي."
          actionLabel="عرض المسارات"
          onAction={() => router.push("/training" as never)}
        />
      </Screen>
    );
  }
  if (q.isLoading) {
    return (
      <Screen scroll>
        <StackHeader title="درس" kicker="التطوير الذاتي" />
        <SkeletonList rows={5} />
      </Screen>
    );
  }
  if (q.isError) {
    return (
      <Screen scroll>
        <StackHeader title="درس" kicker="التطوير الذاتي" />
        {isUnauthError(q.error) ? (
          <SignInPrompt message="دروس التطوير الذاتي تحتاج حسابًا — سجّل الدخول لقراءتها واحتساب تقدّمك." />
        ) : (
          <ErrorState message={apiMessage(q.error)} onRetry={() => q.refetch()} />
        )}
      </Screen>
    );
  }
  if (!q.data) {
    // Success-but-null — honest emptiness, never a white screen (R327 A4).
    return (
      <Screen scroll>
        <StackHeader title="درس" kicker="التطوير الذاتي" />
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
  const lesson = lessons.find((l) => l.id === params.lessonId);

  if (!lesson) {
    return (
      <Screen scroll>
        <StackHeader title="درس" kicker={track.title} />
        <EmptyState
          title="الدرس غير موجود"
          message="ربما تم حذفه أو أن الرابط غير صحيح."
          actionLabel="عودة إلى المسار"
          onAction={() => router.push(`/training/${track.slug}` as never)}
        />
      </Screen>
    );
  }

  const idx = lessons.findIndex((l) => l.id === lesson.id);
  const next = lessons[idx + 1];
  const alreadyDone = !!lesson.completedAt;

  const onComplete = () => {
    if (lesson.quizQuestion && !quizAnswer.trim()) {
      toast.error("أجب عن سؤال التحقق أولًا.");
      return;
    }
    complete.mutate();
  };

  return (
    <Screen scroll>
      <StackHeader title={lesson.title} kicker={track.title} />

      {/* Lesson kicker: order · minutes */}
      <View style={{ gap: sp[4], paddingBottom: sp[8] }}>
        <T variant="sm" color="muted">
          {`الدرس ${latn(lesson.order ?? idx + 1)} من ${latn(lessons.length)}${
            lesson.estMinutes != null ? ` · ${minutesAr(lesson.estMinutes)}` : ""
          }`}
        </T>
        <T variant="h3" weight="bold">
          {lesson.title}
        </T>
        {lesson.summary ? (
          <T variant="body" color="secondary">
            {lesson.summary}
          </T>
        ) : null}
      </View>

      {alreadyDone ? (
        <Card style={{ gap: sp[6] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
            <CheckCircle2 size={20} color={p.accentInk} />
            <T variant="body" weight="bold" style={{ flex: 1 }}>
              أكملت هذا الدرس
            </T>
            {lesson.pointsAward != null && lesson.pointsAward > 0 ? (
              <Badge label={`+${latn(lesson.pointsAward)} نقطة`} tone="mint" />
            ) : null}
          </View>
          <T variant="sm" color="muted">
            يمكنك إعادة قراءة المحتوى متى شئت — لا تُحتسب النقاط مرة أخرى.
          </T>
        </Card>
      ) : null}

      {/* The reading body */}
      <Card>
        <Markdown source={lesson.contentMarkdown} />
      </Card>

      {/* Quiz block */}
      {lesson.quizQuestion && !alreadyDone ? (
        <Card style={{ gap: sp[10] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
            <Target size={18} color={p.accentInk} />
            <T variant="body" weight="bold">
              سؤال التحقق
            </T>
          </View>
          <T variant="body" color="secondary">
            {lesson.quizQuestion}
          </T>
          <Field label="إجابتك" value={quizAnswer} onChangeText={setQuizAnswer} placeholder="إجابتك…" />
          <T variant="xs" color="faint">
            تُرسل إجابتك مع إكمال الدرس — الإجابة الصحيحة تحتسب الدرس مكتملًا.
          </T>
        </Card>
      ) : null}

      {/* Actions */}
      {!alreadyDone ? (
        <Button
          label={complete.isPending ? "جارٍ الإرسال…" : "إكمال الدرس"}
          kind="primary"
          loading={complete.isPending}
          onPress={onComplete}
        />
      ) : null}
      {next ? (
        <Button
          label="الدرس التالي"
          kind="ghost"
          onPress={() => router.replace(`/training/${track.slug}/lesson/${next.id}` as never)}
        />
      ) : null}
      <Button
        label={`العودة إلى ${track.title}`}
        kind="ghost"
        onPress={() => router.push(`/training/${track.slug}` as never)}
      />
    </Screen>
  );
}
