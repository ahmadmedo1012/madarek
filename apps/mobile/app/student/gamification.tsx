import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Crown, Medal, Star } from "lucide-react-native";
import { studentApi } from "@/api/student";
import { catalogApi } from "@/api/catalog";
import { trainingApi } from "@/api/training";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp, tierColors } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { Badge, Card, Hairline } from "@/components/ui/surfaces";
import { Avatar, LedgerRow, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { latn, num } from "@/lib/format";
import {
  RARITY_LABEL,
  RARITY_TONE,
  TIER_LABEL,
  SectionNote,
  countAr,
  pointsAr,
  tierForLevel,
} from "@/features/student/more";

/**
 * /student/gamification — نقاطي وأوسمتي (web GamificationPage parity):
 * XP + level with the tier orb (the documented gamification brand
 * constants), the institutional leaderboard (top 10) and my training
 * badges grid keyed by rarity tones.
 */
export default function GamificationScreen() {
  const scope = useInstitutionScope();
  const profile = useQuery({
    queryKey: ["me", "profile", scope],
    queryFn: () => studentApi.profile(),
    placeholderData: (p) => p,
  });
  const leaderboard = useQuery({
    queryKey: ["leaderboard", scope],
    queryFn: () => catalogApi.leaderboard(),
    placeholderData: (p) => p,
  });
  const badges = useQuery({
    queryKey: ["training", "badges", scope],
    queryFn: () => trainingApi.badges(),
    placeholderData: (p) => p,
  });

  const student = profile.data?.student ?? null;
  const totalXp = student?.totalXp ?? null;
  const level = student?.level ?? null;
  const tier = tierForLevel(level);

  return (
    <Screen scroll>
      <StackHeader title="نقاطي وأوسمتي" kicker="الإنجازات والنقاط" />
      <SectionNote>تقدّمك ومستواك مقارنة بزملائك في المنصة.</SectionNote>

      {profile.isLoading ? (
        <SkeletonList rows={2} rowHeight={72} />
      ) : profile.isError ? (
        <ErrorState message={(profile.error as Error).message} onRetry={() => profile.refetch()} />
      ) : (
        <Card style={{ gap: sp[10] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[12] }}>
            <View
              accessibilityLabel={`المستوى ${num(level ?? null)} — تصنيف ${TIER_LABEL[tier]}`}
              style={{
                width: 72,
                height: 72,
                borderRadius: 36,
                backgroundColor: tierColors[tier],
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <T variant="h2" weight="bold" style={{ color: "#FFFFFF" }}>
                {num(level ?? null)}
              </T>
            </View>
            <View style={{ flex: 1, gap: sp[4] }}>
              <T variant="sm" color="muted">
                مستوى التقدّم
              </T>
              <T variant="h4" weight="bold">
                {`${TIER_LABEL[tier]} · المستوى ${num(level ?? null)}`}
              </T>
              <T variant="body" color="secondary">
                {totalXp != null ? pointsAr(totalXp) : "لم تُسجَّل نقاط بعد"}
              </T>
            </View>
          </View>
          <Hairline />
          <T variant="xs" color="faint">
            التصنيف مشتق من مستواك: برونزي حتى المستوى 2، فضي حتى 4، ذهبي حتى 6، بلاتيني من المستوى 7.
          </T>
        </Card>
      )}

      <View style={{ gap: sp[6] }}>
        <T variant="h4" weight="bold">
          لوحة المتصدرين
        </T>
        {leaderboard.isLoading ? (
          <SkeletonList rows={5} rowHeight={56} />
        ) : leaderboard.isError ? (
          <ErrorState message={(leaderboard.error as Error).message} onRetry={() => leaderboard.refetch()} compact />
        ) : (leaderboard.data ?? []).length === 0 ? (
          <SectionNote>لا يوجد ترتيب بعد — اكسب النقاط بإكمال الدروس والمسارات.</SectionNote>
        ) : (
          <RowList>
            {(leaderboard.data ?? []).slice(0, 10).map((l, i, arr) => (
              <LedgerRow key={l.id} last={i === arr.length - 1} accessibilityLabel={`المركز ${latn(i + 1)}: ${l.firstName} ${l.lastName}`}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                  <View style={{ width: 30, alignItems: "center" }}>
                    {i === 0 ? (
                      <Crown size={18} color={tierColors.GOLD} />
                    ) : i === 1 ? (
                      <Star size={18} color={tierColors.SILVER} />
                    ) : i === 2 ? (
                      <Medal size={18} color={tierColors.BRONZE} />
                    ) : (
                      <T variant="sm" weight="bold" color="muted">
                        {latn(i + 1)}
                      </T>
                    )}
                  </View>
                  <Avatar
                    size={36}
                    initials={l.avatarInitials ?? `${l.firstName?.[0] ?? ""}${l.lastName?.[0] ?? ""}`}
                    color={l.avatarColor ?? null}
                  />
                  <View style={{ flex: 1 }}>
                    <T variant="body" weight="bold" numberOfLines={1}>
                      {`${l.firstName} ${l.lastName}`}
                    </T>
                    <T variant="xs" color="muted">
                      {`المستوى ${latn(l.level)}`}
                    </T>
                  </View>
                  <T variant="body" weight="bold" color="accentInk">
                    {pointsAr(l.totalXp)}
                  </T>
                </View>
              </LedgerRow>
            ))}
          </RowList>
        )}
      </View>

      <View style={{ gap: sp[6] }}>
        <T variant="h4" weight="bold">
          أوسمتي
        </T>
        {badges.isLoading ? (
          <SkeletonList rows={3} rowHeight={64} />
        ) : badges.isError ? (
          <ErrorState message={(badges.error as Error).message} onRetry={() => badges.refetch()} compact />
        ) : (badges.data ?? []).length === 0 ? (
          <EmptyState
            title="لا أوسمة بعد"
            message="أكمل دروساً ومسارات في التطوير الذاتي لتفتح أول وسام."
          />
        ) : (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[8] }}>
            {(badges.data ?? []).map((b) => (
              <Card key={b.slug} style={{ width: "48%", gap: sp[6] }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                  <T variant="h3">{b.iconEmoji ?? "🏅"}</T>
                  <View style={{ flex: 1 }}>
                    <T variant="body" weight="bold" numberOfLines={1}>
                      {b.title}
                    </T>
                  </View>
                </View>
                {b.description ? (
                  <T variant="xs" color="muted" numberOfLines={2}>
                    {b.description}
                  </T>
                ) : null}
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
                  <Badge label={RARITY_LABEL[b.rarity] ?? b.rarity} tone={RARITY_TONE[b.rarity] ?? "grey"} />
                  {b.earnedAt ? (
                    <T variant="xs" color="faint">
                      {`مُنح ${new Date(b.earnedAt).getFullYear() > 1970 ? latn(new Date(b.earnedAt).getFullYear()) : ""}`}
                    </T>
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        )}
        {(badges.data ?? []).length > 0 ? (
          <T variant="xs" color="faint">
            {countAr((badges.data ?? []).length, ["وسم واحد", "وسمان", "أوسمة", "وسماً"])}
          </T>
        ) : null}
      </View>
    </Screen>
  );
}
