import { View } from "react-native";
import Animated from "react-native-reanimated";
import { humanizeError } from "@/lib/errors";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import Activity from "lucide-react-native/icons/activity";
import Bot from "lucide-react-native/icons/bot";
import FileText from "lucide-react-native/icons/file-text";
import Landmark from "lucide-react-native/icons/landmark";
import Palette from "lucide-react-native/icons/palette";
import Settings from "lucide-react-native/icons/settings";
import TriangleAlert from "lucide-react-native/icons/triangle-alert";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen, SectionBar } from "@/components/ui";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { DataList, LedgerRow, makeRow, RowList } from "@/components/ui/data";
import { SkeletonList, EmptyState, ErrorState, Skeleton } from "@/components/ui/states";
import { useStaggerEntrance } from "@/motion";
import { haptics } from "@/haptics";
import { ownerApi } from "@/api/owner";
import { usePalette } from "@/design/theme";
import { fromNow } from "@/lib/format";
import {
  MetricHero,
  MetricTile,
  SEVERITY_LABEL,
  SeverityChip,
  auditActionLabel,
  countAr,
  pageOf,
  type AuditRow,
  type OwnerStatsRow,
} from "@/features/governance/components";

interface OwnerAlert {
  id: string;
  severity?: string | null;
  category?: string | null;
  title?: string;
  message?: string | null;
  createdAt?: string;
  resolvedAt?: string | null;
}

/** memo-stable event row (module scope — DataList/makeRow contract). */
const EventRow = makeRow<AuditRow>(({ item }) => (
  <LedgerRow accessibilityLabel={auditActionLabel(item.action)}>
    <T variant="body" weight="medium">
      {auditActionLabel(item.action)}
    </T>
    <T variant="xs" color="muted" numberOfLines={1}>
      {item.user ? `${item.user.firstName ?? ""} ${item.user.lastName ?? ""}`.trim() || "النظام" : "النظام"} ·{" "}
      {fromNow(item.createdAt)}
    </T>
  </LedgerRow>
));

/** (tabs) Owner dashboard — «لوحة التحكم الرئيسية» (web OwnerDashboardPage parity).
 *  R334 review-panel fixes: staggered entrance, haptics.selection on the
 *  menu rows, Arabic a11y labels on the alert rows, and the true-empty
 *  alerts state renders a kit EmptyState room (never plain muted text). */
export default function OwnerDashboard() {
  const p = usePalette();
  /* Entrance stagger — base 40, step 60 → 5th block lands at 280ms (cap 400). */
  const entering = useStaggerEntrance({ base: 40, step: 60 });
  const stats = useQuery({ queryKey: ["owner", "stats"], queryFn: () => ownerApi.stats() });
  const alerts = useQuery({
    queryKey: ["owner", "alerts"],
    queryFn: async () => (await ownerApi.alerts()) as OwnerAlert[],
    staleTime: 30_000,
  });
  const activity = useQuery({
    queryKey: ["owner", "activity", 1, 5],
    queryFn: async () => pageOf<AuditRow>(await ownerApi.activity(1, 5)),
  });

  const s = stats.data as OwnerStatsRow | undefined;
  const alertRows = Array.isArray(alerts.data) ? alerts.data : [];
  const events = activity.data?.rows ?? [];

  return (
    <Screen scroll>
      <AppTopBar alertsPath="/owner/alerts" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <Animated.View entering={entering(0)}>
          <T variant="h2" weight="bold">
            لوحة التحكم الرئيسية
          </T>
          <T variant="body" color="muted">
            نظرة شاملة وإحصائيات حيّة عن المنصة
          </T>
        </Animated.View>

        {stats.isLoading ? (
          <Animated.View entering={entering(1)} style={{ gap: 8 }}>
            <Skeleton h={132} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Skeleton h={72} />
              <Skeleton h={72} />
            </View>
          </Animated.View>
        ) : stats.isError ? (
          <Animated.View entering={entering(1)}>
            <ErrorState message={humanizeError(stats.error)} onRetry={() => stats.refetch()} />
          </Animated.View>
        ) : s ? (
          <Animated.View entering={entering(1)} style={{ gap: 8 }}>
            <MetricHero
              label="إجمالي مستخدمي المنصّة"
              value={s.totalUsers ?? null}
              hint={countAr(s.totalUsers ?? 0, ["حساب واحد", "حسابان", "حسابات", "حساباً"])}
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <MetricTile label="الطلاب" value={s.students ?? null} />
              <MetricTile label="الأساتذة" value={s.teachers ?? null} />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <MetricTile label="المقرّرات" value={s.totalCourses ?? null} />
              <MetricTile label="التسجيلات" value={s.totalEnrollments ?? null} />
            </View>
          </Animated.View>
        ) : null}

        <Animated.View entering={entering(2)}>
          <SectionBar
            index={1}
            title="التنبيهات التشغيليّة"
            action={
              alertRows.length > 0 ? (
                <T variant="sm" color="accentInk" weight="bold">
                  {countAr(alertRows.length, ["تنبيه مفتوح", "تنبيهان مفتوحان", "تنبيهات مفتوحة", "تنبيهاً مفتوحاً"])}
                </T>
              ) : undefined
            }
          />
          {alerts.isLoading ? (
            <View style={{ gap: 8 }}>
              <Skeleton h={44} />
              <Skeleton h={44} />
            </View>
          ) : alerts.isError ? (
            <ErrorState message={humanizeError(alerts.error)} onRetry={() => alerts.refetch()} compact />
          ) : alertRows.length === 0 ? (
            <EmptyState
              room="building"
              title="النظام يعمل بشكل طبيعي"
              message="لا تنبيهات تشغيليّة مفتوحة حاليًا — ستظهر التنبيهات والحوادث هنا فور رصدها."
            />
          ) : (
            <View style={{ gap: 12 }}>
              <RowList>
                {alertRows.slice(0, 3).map((a, i, arr) => (
                  <LedgerRow
                    key={a.id}
                    last={i === arr.length - 1}
                    accessibilityLabel={`تنبيه ${
                      (a.severity != null && SEVERITY_LABEL[a.severity]) || "تشغيليّ"
                    }: ${a.title ?? "بدون عنوان"} · ${fromNow(a.createdAt)}`}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <SeverityChip severity={a.severity} />
                      <T variant="xs" color="faint">
                        {fromNow(a.createdAt)}
                      </T>
                    </View>
                    <T variant="body" weight="medium" numberOfLines={1}>
                      {a.title ?? "—"}
                    </T>
                  </LedgerRow>
                ))}
              </RowList>
              <Button
                label="فتح التنبيهات"
                kind="ghost"
                small
                onPress={() => router.push("/owner/alerts" as never)}
              />
            </View>
          )}
        </Animated.View>

        <Animated.View entering={entering(3)}>
          <SectionBar index={2} title="الأحداث الأخيرة" />
          {activity.isLoading ? (
            <SkeletonList rows={3} />
          ) : activity.isError ? (
            <ErrorState message={humanizeError(activity.error)} onRetry={() => activity.refetch()} compact />
          ) : events.length === 0 ? (
            <EmptyState title="لا توجد أحداث بعد" message="ستظهر أحدث العمليّات هنا فور حدوثها." />
          ) : (
            <View style={{ gap: 12 }}>
              <DataList
                data={events}
                renderItem={({ item }) => <EventRow item={item} />}
                keyExtractor={(ev) => ev.id}
                loadingSlot={<SkeletonList rows={3} />}
                contentPadding={{ bottom: 8 }}
                style={{ maxHeight: 5 * 76 }}
                scrollProps={{ nestedScrollEnabled: true }}
              />
              <Button
                label="سجلّ النشاط الكامل"
                kind="ghost"
                small
                onPress={() => router.push("/owner/activity" as never)}
              />
            </View>
          )}
        </Animated.View>

        <Animated.View entering={entering(4)}>
          <SectionBar index={3} title="لوحة المالك" />
          <RowList>
            <LedgerRow
              onPress={() => {
                haptics.selection();
                router.push("/owner/institutions" as never);
              }}
              accessibilityLabel="المؤسسات"
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Landmark size={18} color={p.textMuted} />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="bold">
                    المؤسسات
                  </T>
                  <T variant="xs" color="muted">
                    إدارة المؤسسات التعليمية على المنصّة
                  </T>
                </View>
              </View>
            </LedgerRow>
            <LedgerRow
              onPress={() => {
                haptics.selection();
                router.push("/owner/activity" as never);
              }}
              accessibilityLabel="سجلّ النشاط"
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Activity size={18} color={p.textMuted} />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="bold">
                    سجلّ النشاط والمراقبة
                  </T>
                  <T variant="xs" color="muted">
                    جميع العمليّات المنفَّذة على المنصّة
                  </T>
                </View>
              </View>
            </LedgerRow>
            <LedgerRow
              onPress={() => {
                haptics.selection();
                router.push("/owner/alerts" as never);
              }}
              accessibilityLabel="التنبيهات التشغيليّة"
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TriangleAlert size={18} color={p.textMuted} />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="bold">
                    التنبيهات التشغيليّة
                  </T>
                  <T variant="xs" color="muted">
                    إدارة ومراقبة التنبيهات والحوادث
                  </T>
                </View>
              </View>
            </LedgerRow>
            <LedgerRow
              onPress={() => {
                haptics.selection();
                router.push("/owner/ai" as never);
              }}
              accessibilityLabel="مركز الذكاء الاصطناعيّ"
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Bot size={18} color={p.textMuted} />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="bold">
                    مركز الذكاء الاصطناعيّ
                  </T>
                  <T variant="xs" color="muted">
                    مراقبة استخدام وأداء خدمات الذكاء الاصطناعيّ
                  </T>
                </View>
              </View>
            </LedgerRow>
            <LedgerRow
              onPress={() => {
                haptics.selection();
                router.push("/owner/education" as never);
              }}
              accessibilityLabel="النظرة التعليميّة"
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <FileText size={18} color={p.textMuted} />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="bold">
                    النظرة التعليميّة
                  </T>
                  <T variant="xs" color="muted">
                    إحصائيات حيّة عن المقرّرات وأعضاء هيئة التدريس
                  </T>
                </View>
              </View>
            </LedgerRow>
            <LedgerRow
              onPress={() => {
                haptics.selection();
                router.push("/owner/system" as never);
              }}
              accessibilityLabel="النظام والتشغيل"
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Settings size={18} color={p.textMuted} />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="bold">
                    النظام والتشغيل
                  </T>
                  <T variant="xs" color="muted">
                    البنية التحتية وحالة الخدمات وإعدادات المنصّة
                  </T>
                </View>
              </View>
            </LedgerRow>
            <LedgerRow
              onPress={() => {
                haptics.selection();
                router.push("/owner/content" as never);
              }}
              accessibilityLabel="المحتوى والعلامة التجاريّة"
              last
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Palette size={18} color={p.textMuted} />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="bold">
                    المحتوى والعلامة التجاريّة
                  </T>
                  <T variant="xs" color="muted">
                    الهويّة البصريّة وأصول العلامة
                  </T>
                </View>
              </View>
            </LedgerRow>
          </RowList>
          <T variant="xs" color="faint">
            المراقبة الحيّة والمستخدمون والحوكمة في تبويبات الشريط السفلي · صندوق التغذية الراجعة من صفحة «المحتوى».
          </T>
        </Animated.View>
      </View>
    </Screen>
  );
}
