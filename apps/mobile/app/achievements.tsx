import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { router } from "expo-router";
import {
  Award,
  CheckCircle2,
  Crown,
  Lock,
  Medal,
  Sparkles,
  Star,
} from "lucide-react-native";
import { trainingApi } from "@/api/training";
import type { TrainingBadge } from "@/api/training";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { fullDate, fromNow, initials, latn, num } from "@/lib/format";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Badge, Card } from "@/components/ui/surfaces";
import { Segmented } from "@/components/ui/fields";
import { Avatar, RowList, LedgerRow } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { StackHeader } from "@/components/shell/AppTopBar";
import {
  SignInPrompt,
  apiMessage,
  countAr,
  isUnauthError,
} from "@/features/common/components";

type Tab = "badges" | "certs" | "leaderboard";

/** Badge rarity → Arabic label (web lib/gamification RARITY_LABEL, verbatim). */
const RARITY_LABEL: Record<string, string> = {
  COMMON: "شائع",
  RARE: "نادر",
  EPIC: "ملحمي",
  LEGENDARY: "أسطوري",
};

/**
 * /achievements — the self-development record: badges grid (rarity tones
 * COMMON grey / RARE sky / EPIC lavender / LEGENDARY gold), certificates
 * list, and the points leaderboard. Web twin: AchievementsPage.
 */
export default function Achievements() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const [tab, setTab] = useState<Tab>("badges");

  const badges = useQuery({
    queryKey: ["training", "badges", scope],
    queryFn: () => trainingApi.badges(),
  });
  const certs = useQuery({
    queryKey: ["training", "certificates", scope],
    queryFn: () => trainingApi.certificates(),
    enabled: tab === "certs",
  });
  const board = useQuery({
    queryKey: ["training", "leaderboard", scope],
    queryFn: () => trainingApi.leaderboard(),
    enabled: tab === "leaderboard",
  });

  return (
    <Screen scroll>
      <StackHeader title="الإنجازات" kicker="التطوير الذاتي" />
      <T variant="body" color="secondary">
        رحلتك في التطوير الذاتي — نقاطك، أوسمتك، شهاداتك، وترتيبك بين الزملاء.
      </T>

      <Segmented
        options={[
          { id: "badges", label: "الأوسمة" },
          { id: "certs", label: "الشهادات" },
          { id: "leaderboard", label: "المتصدرون" },
        ]}
        selectedId={tab}
        onSelect={(id) => setTab(id as Tab)}
      />

      {tab === "badges" ? (
        badges.isLoading ? (
          <SkeletonList rows={6} rowHeight={90} />
        ) : badges.isError ? (
          isUnauthError(badges.error) ? (
            <SignInPrompt message="أوسمتك وإنجازاتك تحتاج حسابًا — سجّل الدخول لعرضها." />
          ) : (
            <ErrorState message={apiMessage(badges.error)} onRetry={() => badges.refetch()} />
          )
        ) : (badges.data ?? []).length === 0 ? (
          <EmptyState
            title="لا توجد أوسمة بعد"
            message="ابدأ بدروس التطوير الذاتي لتحصد أول وسام."
            icon={<Award size={20} color={p.textMuted} />}
            actionLabel="تصفّح المسارات"
            onAction={() => router.push("/training" as never)}
          />
        ) : (
          <View style={styles.grid}>
            {(badges.data ?? []).map((b) => (
              <BadgeTile key={b.slug} badge={b} />
            ))}
          </View>
        )
      ) : null}

      {tab === "certs" ? (
        certs.isLoading ? (
          <SkeletonList rows={4} rowHeight={84} />
        ) : certs.isError ? (
          isUnauthError(certs.error) ? (
            <SignInPrompt message="شهاداتك تحتاج حسابًا — سجّل الدخول لعرضها." />
          ) : (
            <ErrorState message={apiMessage(certs.error)} onRetry={() => certs.refetch()} />
          )
        ) : (certs.data ?? []).length === 0 ? (
          <EmptyState
            title="لم تحصل على شهادات بعد"
            message="أكمل أول مسار تدريبي للحصول على شهادتك الأولى."
            actionLabel="تصفّح المسارات"
            onAction={() => router.push("/training" as never)}
          />
        ) : (
          <View style={{ gap: sp[10] }}>
            {(certs.data ?? []).map((c) => (
              <Card key={c.id} style={{ gap: sp[8] }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                  <T variant="h4">🏅</T>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="xs" color="faint">
                      شهادة إتمام مسار
                    </T>
                    <T variant="body" weight="bold">
                      {c.title}
                    </T>
                    {c.issuer ? (
                      <T variant="sm" color="muted">
                        {c.issuer}
                      </T>
                    ) : null}
                  </View>
                </View>
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[8] }}>
                  {c.status ? <Badge label={c.status === "COMPLETED" ? "مكتملة" : c.status} tone="mint" /> : <Badge label="مكتملة" tone="mint" />}
                  {c.issuedAt ? (
                    <Badge label={fullDate(c.issuedAt)} tone="grey" />
                  ) : null}
                  {c.hours != null ? (
                    <Badge
                      label={countAr(c.hours, ["ساعة تقديرية واحدة", "ساعتان تقديريّتان", "ساعات تقديرية", "ساعة تقديرية"])}
                      tone="grey"
                    />
                  ) : null}
                </View>
              </Card>
            ))}
          </View>
        )
      ) : null}

      {tab === "leaderboard" ? (
        board.isLoading ? (
          <SkeletonList rows={8} />
        ) : board.isError ? (
          isUnauthError(board.error) ? (
            <SignInPrompt message="لوحة المتصدّرين تحتاج حسابًا — سجّل الدخول لعرضها." />
          ) : (
            <ErrorState message={apiMessage(board.error)} onRetry={() => board.refetch()} />
          )
        ) : (board.data ?? []).length === 0 ? (
          <EmptyState
            title="لا يوجد ترتيب بعد"
            message="اكسب النقاط بإكمال الدروس والمسارات — يظهر ترتيبك فور تسجيل أول نقطة."
            actionLabel="ابدأ من التطوير الذاتي"
            onAction={() => router.push("/training" as never)}
          />
        ) : (
          <>
            <View style={{ gap: sp[2], paddingBottom: sp[8] }}>
              <T variant="h4" weight="bold">
                الأعلى نقاطًا
              </T>
              <T variant="sm" color="muted">
                ترتيب الطلاب حسب نقاط التطوير الذاتي.
              </T>
            </View>
            <RowList>
              {(board.data ?? []).map((r, i) => {
                const rank = i + 1;
                const top3 = rank <= 3;
                const name = `${r.firstName} ${r.lastName}`;
                const avatarInitials =
                  (r as unknown as { avatarInitials?: string | null }).avatarInitials ?? undefined;
                const avatarColor = (r as unknown as { avatarColor?: string | null }).avatarColor ?? null;
                return (
                  <LedgerRow key={`${name}-${i}`} last={i === (board.data ?? []).length - 1} accessibilityLabel={`الترتيب ${latn(rank)}: ${name}`}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                      <View style={{ width: 34, alignItems: "center" }}>
                        {rank === 1 ? (
                          <Crown size={18} color={p.goldInk} />
                        ) : rank === 2 ? (
                          <Star size={18} color={p.goldInk} />
                        ) : rank === 3 ? (
                          <Medal size={18} color={p.goldInk} />
                        ) : (
                          <T variant="body" color="muted">
                            {latn(rank)}
                          </T>
                        )}
                      </View>
                      <Avatar
                        initials={avatarInitials ?? initials(r.firstName, r.lastName)}
                        color={avatarColor}
                        size={32}
                      />
                      <T variant="body" weight={top3 ? "bold" : "medium"} style={{ flex: 1 }} numberOfLines={1}>
                        {name}
                      </T>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
                        <Sparkles size={14} color={p.goldInk} />
                        <T variant="body" weight="bold" color={top3 ? "gold" : "text"}>
                          {num(r.points)}
                        </T>
                      </View>
                    </View>
                  </LedgerRow>
                );
              })}
            </RowList>
          </>
        )
      ) : null}
    </Screen>
  );
}

/* ── Badge tile (grid cell) ─────────────────────────────────────────── */

function BadgeTile({ badge }: { badge: TrainingBadge }) {
  const p = usePalette();
  const earned = !!badge.earnedAt;
  const rarity = badge.rarity ?? "COMMON";
  const label = RARITY_LABEL[rarity] ?? rarity;

  return (
    <View
      style={[
        styles.tile,
        { backgroundColor: p.surface, borderColor: p.border },
        !earned && { opacity: 0.75 },
      ]}
    >
      <View style={{ alignItems: "center", paddingTop: sp[4] }}>
        {earned ? (
          <T variant="display" style={{ fontSize: 34, lineHeight: 44 }}>
            {badge.iconEmoji ?? "🏅"}
          </T>
        ) : (
          <Lock size={26} color={p.textFaint} />
        )}
      </View>
      <T variant="sm" weight="bold" align="center" numberOfLines={1}>
        {badge.title}
      </T>
      {badge.description ? (
        <T variant="xs" color="muted" align="center" numberOfLines={2}>
          {badge.description}
        </T>
      ) : null}
      {rarity === "LEGENDARY" ? (
        <View style={[styles.rarityChip, { borderColor: p.gold }]}>
          <T variant="xs" weight="bold" color="gold">
            {label}
          </T>
        </View>
      ) : (
        <Badge
          label={label}
          tone={rarity === "RARE" ? "sky" : rarity === "EPIC" ? "lavender" : "grey"}
        />
      )}
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[4] }}>
        {earned ? (
          <>
            <CheckCircle2 size={12} color={p.accentInk} />
            <T variant="xs" color="faint">
              {fromNow(badge.earnedAt)}
            </T>
          </>
        ) : (
          <T variant="xs" color="faint">
            لم يُحقَّق بعد
          </T>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: sp[10],
  },
  tile: {
    width: "48.5%",
    borderWidth: StyleSheet.hairlineWidth,
    padding: sp[12],
    gap: sp[6],
    alignItems: "center",
  },
  rarityChip: {
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: sp[8],
    paddingVertical: 3,
    backgroundColor: "transparent",
  },
});
