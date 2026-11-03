/**
 * NotificationsScreen — the shared role inbox (personal feed).
 *
 * R334 Round 2 (3-h Comms) rework:
 *   · DataList (FlashList v2) with STICKY day-section headers — «اليوم» /
 *     «أمس» / «١٥ يناير» — via features/notifications/grouping.ts
 *     (usePagedList: accumulate pages, honest load-more footer; the old
 *     replace-page + manual «تحميل المزيد» button is gone).
 *   · mark-all-read inline with haptics + toast + humanizeError; long-press
 *     toggles read on a single row (haptic selection tick). Swipe actions
 *     were evaluated and skipped on purpose — see the honesty note in
 *     docs/mobile/screens/comms-agenda.md (RNGH v3's import-time native
 *     task is fatal under the jest render net; no delete API exists).
 *   · deep links into safe in-app paths (unchanged contract).
 *   · unread tone border + dot; expo-image avatar when `icon` is a URL.
 *   · EmptyState building room «لا توجد تنبيهات».
 *
 * R331 A-App-Shell safe-area fix kept: the header pads the status-bar
 * inset. `stacked` marks a PUSHED instance (over the persistent tab shell):
 * it owns the home-indicator inset at the bottom and shows a back affordance
 * (RTL: arrow points right = the physical back edge).
 */
import { useCallback, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import CheckCheck from "lucide-react-native/icons/check-check";
import Dot from "lucide-react-native/icons/dot";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { get } from "@/api/client";
import { usePalette, useStatusTones } from "@/design/theme";
import { sp, toneForNotificationType } from "@/design/tokens";
import { Badge } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { T, MonoLabel } from "@/components/ui/text";
import { DataList, makeRow, usePagedList } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/states";
import { haptics } from "@/haptics";
import { humanizeError } from "@/lib/errors";
import { fromNow, latn } from "@/lib/format";
import { toast } from "@/components/ui/toast";
import { currentPermission, requestAndRegisterPush } from "@/lib/push";
import {
  groupNotificationsByDay,
  notificationIconUrl,
  type NotificationSectionItem,
} from "@/features/notifications/grouping";
import { safeDeepLink, useMarkAllRead, useMarkRead } from "@/hooks/useNotifications";
import type { AppNotification, Paginated } from "@/api/types";

const FEED_LIMIT = 30;

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
  const list = usePagedList<AppNotification>({
    queryKey: ["notifications", "feed", FEED_LIMIT],
    fetchPage: (page) => get<Paginated<AppNotification>>("/notifications", { page, limit: FEED_LIMIT }),
    limit: FEED_LIMIT,
  });
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const unread = list.meta?.unread ?? 0;

  /** Sticky day sections — recomputed only when the accumulated rows change. */
  const sections = useMemo(
    () => groupNotificationsByDay(list.items),
    [list.items],
  );

  const open = useCallback(
    (n: AppNotification) => {
      if (!n.readAt) markRead.mutate(n.id);
      const dest = safeDeepLink(n.link);
      if (dest) router.push(dest as never);
    },
    [markRead],
  );

  /** Long-press an unread row → mark it read (haptic tick). Read rows ignore. */
  const toggleRead = useCallback(
    (n: AppNotification) => {
      if (n.readAt) return;
      haptics.selection();
      markRead.mutate(n.id);
    },
    [markRead],
  );

  const onMarkAll = () => {
    haptics.impact("light");
    markAll.mutate(undefined, {
      onSuccess: () => {
        haptics.notify("success");
        toast.success("عُلّمت كل التنبيهات كمقروءة.");
      },
      onError: (e) => {
        haptics.notify("error");
        toast.error(humanizeError(e), "تعذّر التعليم كمقروء");
      },
    });
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: p.bg,
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
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="تعليم الكل كمقروء"
              onPress={onMarkAll}
              disabled={markAll.isPending}
              style={{ minHeight: 44, justifyContent: "center" }}
            >
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
            {`${unread > 99 ? `+${latn(99)}` : latn(unread)} تنبيهات غير مقروءة`}
          </T>
        ) : null}
      </View>

      {/* THE LIST — sticky day headers + rows; accumulate pagination. */}
      <DataList
        data={sections.items}
        renderItem={(info) =>
          info.item.kind === "header" ? (
            <DayHeader label={info.item.label} pinned={info.target === "StickyHeader"} />
          ) : (
            <NotificationRow item={info.item.n} onOpen={open} onToggleRead={toggleRead} />
          )
        }
        keyExtractor={(item: NotificationSectionItem) => item.key}
        stickyHeaderIndices={sections.stickyIndices}
        isLoading={list.isLoading}
        isError={list.isError}
        errorMessage={list.errorMessage ? humanizeError(list.query.error) : null}
        onRetry={() => list.refetch()}
        refetch={list.refetch}
        isRefetching={list.isRefetching}
        onEndReached={list.onEndReached}
        isFetchingNextPage={list.isFetchingNextPage}
        hasNextPage={list.hasNextPage}
        loadMoreError={list.loadMoreError}
        onRetryLoadMore={list.retryLoadMore}
        ListHeaderComponent={PushActivationCard}
        ItemSeparatorComponent={RowSeparator}
        emptySlot={
          <>
            <PushActivationCard />
            <EmptyState
              room="building"
              title="لا توجد تنبيهات"
              message="ستظهر هنا إعلانات المقرّرات والدرجات والرسائل لحظة صدورها."
            />
          </>
        }
        contentPadding={{ horizontal: 16, top: 12, bottom: 24 }}
      />
    </View>
  );
}

/** Sticky day header — solid ground while pinned (FlashList v2 target).
 *  Plain component on purpose: headers are few (one per day) and their
 *  `pinned` restyle changes every scroll frame — memo would churn. */
function DayHeader({ label, pinned }: { label: string; pinned: boolean }) {
  const p = usePalette();
  return (
    <View
      accessibilityRole="header"
      style={{
        backgroundColor: pinned ? p.surface : p.bg,
        paddingVertical: sp[6],
        paddingHorizontal: sp[4],
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: p.rule,
      }}
    >
      <T variant="sm" weight="bold" color={pinned ? "accentInk" : "muted"}>
        {label}
      </T>
    </View>
  );
}

function RowSeparator() {
  const p = usePalette();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.rule }} />;
}

const NotificationRow = makeRow<
  AppNotification,
  {
    onOpen: (n: AppNotification) => void;
    onToggleRead: (n: AppNotification) => void;
  }
>(
  ({ item: n, onOpen, onToggleRead }) => {
    const p = usePalette();
    const tones = useStatusTones();
    const tone = toneForNotificationType(n.type);
    const t = tones[tone];
    const iconUrl = notificationIconUrl(n.icon);
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={n.readAt ? n.title : `تنبيه غير مقروء: ${n.title}`}
        onPress={() => onOpen(n)}
        onLongPress={() => onToggleRead(n)}
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
          {iconUrl ? (
            <Image
              source={{ uri: iconUrl }}
              accessibilityLabel={`صورة تنبيه: ${n.title}`}
              style={{ width: 32, height: 32, borderWidth: StyleSheet.hairlineWidth, borderColor: p.rule }}
              contentFit="cover"
              recyclingKey={iconUrl}
            />
          ) : (
            <Badge label={n.type} tone={tone} mono />
          )}
          <View style={{ flex: 1 }} />
          {n.readAt ? null : <Dot size={22} color={p.accent} />}
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
  },
);

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
        marginBottom: sp[12],
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
