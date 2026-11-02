import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import CheckCheck from "lucide-react-native/icons/check-check";
import Dot from "lucide-react-native/icons/dot";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { usePalette, useStatusTones } from "@/design/theme";
import { sp , toneForNotificationType } from "@/design/tokens";
import { Badge } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { T, MonoLabel } from "@/components/ui/text";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { currentPermission, requestAndRegisterPush } from "@/lib/push";
import { fromNow } from "@/lib/format";
import {
  safeDeepLink,
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from "@/hooks/useNotifications";
import type { AppNotification } from "@/api/types";

/**
 * NotificationsScreen — the shared role inbox (personal feed).
 * Paginated infinite list + mark-read + deep links into safe in-app paths.
 *
 * R331 A-App-Shell safe-area fix: the header now pads the status-bar inset
 * (the old per-screen tab frame never did — the inbox clipped its top edge
 * as a tab). `stacked` marks a PUSHED instance (over the persistent tab
 * shell): it owns the home-indicator inset at the bottom and shows a back
 * affordance (RTL: arrow points right = the physical back edge).
 */
export function NotificationsScreen({
  title,
  kicker,
  stacked = false,
  onBack,
}: {
  title?: string;
  kicker?: string;
  stacked?: boolean;
  onBack?: () => void;
}) {
  const p = usePalette();
  const insets = useSafeAreaInsets();
  const [page, setPage] = useState(1);
  const feed = useNotifications(page);
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();
  const rows = feed.data?.data ?? [];
  const unread = feed.data?.meta?.unread ?? 0;

  const open = (n: AppNotification) => {
    if (!n.readAt) markRead.mutate(n.id);
    const dest = safeDeepLink(n.link);
    if (dest) router.push(dest as never);
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: p.bg,
        gap: 0,
        paddingBottom: stacked ? Math.max(insets.bottom, 0) : 0,
      }}
    >
      <View
        style={{
          paddingHorizontal: sp[16],
          paddingTop: Math.max(insets.top, sp[8]),
          paddingBottom: sp[8],
          gap: sp[8],
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: p.rule,
          backgroundColor: p.surface,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
          {stacked && onBack ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="رجوع"
              onPress={onBack}
              style={{ width: 44, height: 44, alignItems: "center", justifyContent: "center" }}
            >
              <ArrowRight size={22} color={p.text} />
            </Pressable>
          ) : null}
          <View style={{ flex: 1 }}>
            {kicker ? <MonoLabel>{kicker}</MonoLabel> : null}
            <T variant="h3" weight="bold">
              {title ?? "الإشعارات"}
            </T>
          </View>
          {unread > 0 ? (
            <Pressable accessibilityRole="button" accessibilityLabel="تعليم الكل كمقروء" onPress={() => markAll.mutate()}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <CheckCheck size={18} color={p.accentInk} />
                <T variant="sm" weight="bold" color="accentInk">
                  تعليم الكل
                </T>
              </View>
            </Pressable>
          ) : null}
        </View>
        {unread > 0 ? (
          <T variant="sm" color="muted">
            {unread > 99 ? "+99" : unread} إشعارات غير مقروءة
          </T>
        ) : null}
      </View>

      {feed.isLoading ? (
        <View style={{ padding: sp[16] }}>
          <SkeletonList rows={6} />
        </View>
      ) : feed.isError ? (
        <View style={{ padding: sp[16] }}>
          <ErrorState message={(feed.error as Error | null)?.message} onRetry={() => feed.refetch()} />
        </View>
      ) : rows.length === 0 ? (
        <View style={{ flex: 1 }}>
        <PushActivationCard />
        <EmptyState title="لا إشعارات بعد" message="ستظهر هنا إعلانات المقرّرات والدرجات والرسائل الأكاديمية." />
        </View>
      ) : (
        <FlashList
          data={rows}
                    keyExtractor={(n) => n.id}
          contentContainerStyle={{ paddingHorizontal: sp[16], paddingTop: sp[12], paddingBottom: sp[24] }}
          ItemSeparatorComponent={() => <View style={{ height: sp[8] }} />}
          renderItem={({ item }) => <NotificationRow n={item} onOpen={() => open(item)} />}
        />
      )}

      {feed.data && page < (feed.data.meta?.totalPages ?? 1) ? (
        <View style={{ padding: sp[16] }}>
          <Button label="تحميل المزيد" kind="ghost" small onPress={() => setPage((v) => v + 1)} />
        </View>
      ) : null}
    </View>
  );
}

function NotificationRow({ n, onOpen }: { n: AppNotification; onOpen: () => void }) {
  const p = usePalette();
  const tones = useStatusTones();
  const tone = toneForNotificationType(n.type);
  const t = tones[tone];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={n.title}
      onPress={onOpen}
      style={({ pressed }) => [
        {
          backgroundColor: pressed ? p.surfaceHover : p.surface,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: n.readAt ? p.border : t.ink,
          padding: sp[12],
          gap: 4,
        },
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
        <Badge label={n.type} tone={tone} mono />
        <View style={{ flex: 1 }} />
        {n.readAt ? null : (
          <Dot size={22} color={p.accent} />
        )}
        <T variant="xs" color="faint">
          {fromNow(n.createdAt)}
        </T>
      </View>
      <T variant="body" weight="bold">
        {n.title}
      </T>
      {n.body ? (
        <T variant="sm" color="secondary" numberOfLines={2}>
          {n.body}
        </T>
      ) : null}
    </Pressable>
  );
}


/** R327 C3 — the value-shown push ask: only when permission is not yet
 *  granted, one honest sentence + one button. Never at first open. */
function PushActivationCard() {
  const p = usePalette();
  const qc = useQueryClient();
  const perm = useQuery({
    queryKey: ["push", "permission"],
    queryFn: currentPermission,
    staleTime: 60_000,
  });
  const [busy, setBusy] = useState(false);
  const state = perm.data;
  if (state === "granted" || state === "unavailable" || state === undefined) return null;

  const go = async () => {
    setBusy(true);
    try {
      await requestAndRegisterPush();
    } finally {
      setBusy(false);
      void qc.invalidateQueries({ queryKey: ["push", "permission"] });
    }
  };

  return (
    <View
      style={{
        marginHorizontal: sp[16],
        marginTop: sp[12],
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: p.rule,
        backgroundColor: p.surface,
        padding: sp[12],
        gap: sp[8],
      }}
    >
      <T variant="body" weight="bold">إشعارات فورية على جهازك</T>
      <T variant="sm" color="muted">
        {state === "denied"
          ? "الإشعارات مقفلة من إعدادات النظام — فعّلها لمدارك من هناك لتصلك الإعلانات والدرجات لحظة صدورها."
          : "فعّلها لتصلك الإعلانات والدرجات والتكاليف لحظة صدورها — لا رسائل إعلانية، وتلغيها متى شئت."}
      </T>
      {state !== "denied" ? (
        <View style={{ alignSelf: "flex-start" }}>
          <Button label={busy ? "جارٍ التفعيل…" : "تفعيل الإشعارات"} kind="accent" small onPress={go} />
        </View>
      ) : null}
    </View>
  );
}
