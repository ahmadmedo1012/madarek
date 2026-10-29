import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { router } from "expo-router";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck, Dot } from "lucide-react-native";
import { usePalette, useStatusTones } from "@/design/theme";
import { sp } from "@/design/tokens";
import { toneForNotificationType } from "@/design/tokens";
import { Badge, Card } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { T, MonoLabel } from "@/components/ui/text";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { fromNow } from "@/lib/format";
import {
  NOTIFICATIONS_FEED_LIMIT,
  safeDeepLink,
  useMarkAllRead,
  useMarkRead,
  useNotifications,
} from "@/hooks/useNotifications";
import type { AppNotification } from "@/api/types";

/**
 * NotificationsScreen — the shared role inbox (personal feed).
 * Paginated infinite list + mark-read + deep links into safe in-app paths.
 */
export function NotificationsScreen({ title, kicker }: { title?: string; kicker?: string }) {
  const p = usePalette();
  const qc = useQueryClient();
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
    <View style={{ flex: 1, backgroundColor: p.bg, gap: 0 }}>
      <View
        style={{
          paddingHorizontal: sp[16],
          paddingTop: sp[8],
          paddingBottom: sp[8],
          gap: sp[8],
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: p.rule,
          backgroundColor: p.surface,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
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
          <ErrorState message={(feed.error as Error).message} onRetry={() => feed.refetch()} />
        </View>
      ) : rows.length === 0 ? (
        <EmptyState title="لا إشعارات بعد" message="ستظهر هنا إعلانات المقرّرات والدرجات والرسائل الأكاديمية." />
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
