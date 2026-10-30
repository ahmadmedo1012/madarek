import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Clock, GraduationCap, Sparkles } from "lucide-react-native";
import { trainingApi } from "@/api/training";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { latn } from "@/lib/format";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { ProgressBar, RowList, LedgerRow } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { StackHeader } from "@/components/shell/AppTopBar";
import {
  SignInPrompt,
  apiMessage,
  isUnauthError,
  lessonsAr,
  pointsAr,
} from "@/features/common/components";

/** Training category labels (web TrainingPages CATEGORY_LABEL, verbatim). */
export const TRAINING_CATEGORY_LABEL: Record<string, string> = {
  ONBOARDING: "تعريف بالمنصة",
  ACADEMIC: "منهجية أكاديمية",
  FLIPPED: "الصف المعكوس",
  STUDY_SKILLS: "مهارات الدراسة",
  RESEARCH: "البحث العلمي",
  CAREER: "مهارات مهنية",
  COMMUNICATION: "التواصل",
  ENGLISH: "الإنجليزية",
  PROGRAMMING: "البرمجة",
  PRODUCTIVITY: "الإنتاجية",
  VISION: "مسارات الرؤية",
};

export const TRAINING_LEVEL_LABEL: Record<string, string> = {
  BEGINNER: "مبتدئ",
  INTERMEDIATE: "متوسط",
  ADVANCED: "متقدّم",
};

/**
 * /training — the self-development catalog: title, summary, category,
 * level, estimated minutes, points, lessons count, progress bar when
 * present. «التسجيل» rides on the track detail. Web twin:
 * TrainingCatalogPage (r265 quiet rows).
 */
export default function TrainingIndex() {
  const p = usePalette();
  const scope = useInstitutionScope();

  const q = useQuery({
    queryKey: ["training", "catalog", scope],
    queryFn: () => trainingApi.catalog(),
  });
  const tracks = q.data ?? [];

  return (
    <Screen scroll>
      <StackHeader title="التطوير الذاتي" kicker="مسارات تدريبية" />

      <View style={{ gap: sp[4], paddingBottom: sp[8] }}>
        <T variant="h3" weight="bold">
          التطوير الذاتي
        </T>
        <T variant="body" color="secondary">
          مسارات تدريبية مصمَّمة بعناية لتناسب احتياجاتك الأكاديمية والمهنية. أكمل مسارًا لتحصل على سجلّ إتمام موثَّق من المنصّة.
        </T>
      </View>

      {q.isLoading ? (
        <SkeletonList rows={5} rowHeight={76} />
      ) : q.isError ? (
        isUnauthError(q.error) ? (
          <SignInPrompt message="مسارات التطوير الذاتي تحتاج حسابًا — سجّل الدخول لتصفّحها وتتبّع تقدّمك." />
        ) : (
          <ErrorState message={apiMessage(q.error)} onRetry={() => q.refetch()} />
        )
      ) : tracks.length === 0 ? (
        <EmptyState
          title="لا توجد مسارات منشورة بعد"
          message="ستظهر المسارات الجديدة هنا فور نشرها من فريق الجامعة."
          icon={<BookOpen size={20} color={p.textMuted} />}
        />
      ) : (
        <RowList>
          {tracks.map((t, i) => (
            <LedgerRow
              key={t.slug}
              last={i === tracks.length - 1}
              onPress={() => router.push(`/training/${t.slug}` as never)}
              accessibilityLabel={`${t.title}${t.category ? ` — ${TRAINING_CATEGORY_LABEL[t.category] ?? t.category}` : ""}`}
            >
              <View style={{ gap: sp[6] }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                  <GraduationCap size={20} color={p.accentInk} />
                  <T variant="body" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
                    {t.title}
                  </T>
                  {t.level ? (
                    <Badge label={TRAINING_LEVEL_LABEL[t.level] ?? t.level} tone="sky" />
                  ) : null}
                </View>
                {t.summary ? (
                  <T variant="sm" color="muted" numberOfLines={2}>
                    {t.summary}
                  </T>
                ) : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10], flexWrap: "wrap" }}>
                  {t.category ? (
                    <T variant="xs" color="faint">
                      {TRAINING_CATEGORY_LABEL[t.category] ?? t.category}
                    </T>
                  ) : null}
                  {t.estMinutes != null ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                      <Clock size={12} color={p.textMuted} />
                      <T variant="xs" color="faint">{`~${latn(t.estMinutes)} دقيقة`}</T>
                    </View>
                  ) : null}
                  {t.lessonsCount != null ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                      <BookOpen size={12} color={p.textMuted} />
                      <T variant="xs" color="faint">{lessonsAr(t.lessonsCount)}</T>
                    </View>
                  ) : null}
                  {t.pointsAward != null && t.pointsAward > 0 ? (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                      <Sparkles size={12} color={p.goldInk} />
                      <T variant="xs" color="faint">{pointsAr(t.pointsAward)}</T>
                    </View>
                  ) : null}
                </View>
                {t.progressPct != null && t.progressPct >= 0 ? (
                  <View style={{ gap: sp[4] }}>
                    <ProgressBar ratio={t.progressPct / 100} accent label={`تقدّمك: ${latn(t.progressPct)}%`} />
                    <T variant="xs" color="faint">
                      {t.progressPct >= 100 ? "مكتمل" : `${latn(t.progressPct)}% مكتمل`}
                    </T>
                  </View>
                ) : null}
              </View>
            </LedgerRow>
          ))}
        </RowList>
      )}
    </Screen>
  );
}
