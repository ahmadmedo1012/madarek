import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Gauge from "lucide-react-native/icons/gauge";
import { studentApi } from "@/api/student";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/surfaces";
import { ProgressBar } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { clamp01, latn } from "@/lib/format";
import { humanizeError } from "@/lib/errors";
import { SectionNote, countAr } from "@/features/student/more";

/**
 * /student/skills — مهاراتي (web SkillsPage parity, native voice):
 * each measured skill as level 1–5 dots (Western glyphs), a name and
 * the honest progress bar of the mastery percentage.
 */
export default function SkillsScreen() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const skills = useQuery({
    queryKey: ["me", "skills", scope],
    queryFn: () => studentApi.skills(),
    placeholderData: (prev) => prev,
  });
  const rows = skills.data ?? [];

  return (
    <Screen scroll>
      <StackHeader title="مهاراتي" kicker="المهارات والشهادات" />
      <SectionNote>رصد مهاراتك التقنية وتطوّرها مع الوقت — تُحتسب تلقائياً من إنجازاتك الأكاديمية ومسارات التطوير.</SectionNote>

      {skills.isLoading ? (
        <SkeletonList rows={4} rowHeight={72} />
      ) : skills.isError ? (
        <ErrorState message={humanizeError(skills.error)} onRetry={() => skills.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Gauge size={24} color={p.textFaint} />}
          title="لم تُسجَّل أي مهارة بعد"
          message="تُحتسب المهارات تلقائياً من إنجازاتك الأكاديمية ومسارات التطوير."
        />
      ) : (
        <View style={{ gap: sp[8] }}>
          {rows.map((s) => (
            <SkillCard key={s.id} name={s.name} level={s.level} progressPct={s.progressPct} />
          ))}
          <T variant="xs" color="faint">
            {countAr(rows.length, ["مهارة واحدة مُسجَّلة", "مهارتان مُسجَّلتان", "مهارات مُسجَّلة", "مهارةً مُسجَّلة"])}
          </T>
        </View>
      )}
    </Screen>
  );
}

function SkillCard({
  name,
  level,
  progressPct,
}: {
  name: string;
  level: number;
  progressPct: number | null | undefined;
}) {
  const p = usePalette();
  const lvl = Math.min(5, Math.max(1, level));
  return (
    <Card style={{ gap: sp[10] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
        <View style={{ flex: 1 }}>
          <T variant="body" weight="bold">
            {name}
          </T>
        </View>
        {/** M9 — the web's r305s-chip register: a NEUTRAL hairline chip
          * (surfaceHover well, text-secondary medium ink); the tone lives
          * in the small accent dot only. The accent no longer floods
          * every card's meta line. */}
        <View
          accessibilityLabel={`المستوى ${latn(lvl)} من ${latn(5)}`}
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: sp[6],
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: p.rule,
            backgroundColor: p.surfaceHover,
            paddingHorizontal: sp[8],
            paddingVertical: sp[2],
            alignSelf: "flex-start",
          }}
        >
          <View style={{ width: 6, height: 6, backgroundColor: p.accent }} />
          <T variant="sm" weight="medium" style={{ color: p.textSecondary }}>
            {`المستوى ${latn(lvl)} / ${latn(5)}`}
          </T>
        </View>
      </View>
      <ProgressBar
        ratio={clamp01((progressPct ?? 0) / 100)}
        label={`تقدّم مهارة ${name}`}
      />
      <View style={{ flexDirection: "row", gap: sp[8] }} accessibilityLabel={`مستوى الإتقان: ${latn(lvl)} من ${latn(5)}`}>
        {Array.from({ length: 5 }).map((_, i) => (
          <View
            key={i}
            style={{
              width: 10,
              height: 10,
              backgroundColor: i < lvl ? p.textSecondary : p.border,
            }}
          />
        ))}
        <T variant="xs" color="muted">
          {progressPct != null ? `${latn(Math.round(progressPct))}%` : "—"}
        </T>
      </View>
    </Card>
  );
}
