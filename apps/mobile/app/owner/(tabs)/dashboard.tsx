import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Bot,
  FileText,
  Landmark,
  Palette,
  Settings,
  TriangleAlert,
} from "lucide-react-native";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen, SectionBar } from "@/components/ui";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { RowList, LedgerRow, KpiCard } from "@/components/ui/data";
import { SkeletonList, ErrorState, EmptyState, Skeleton } from "@/components/ui/states";
import { ownerApi } from "@/api/owner";
import { fromNow, num } from "@/lib/format";
import {
  SeverityChip,
  auditActionLabel,
  countAr,
  pageOf,
  UNIT,
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

/** (tabs) Owner dashboard — «لوحة التحكم الرئيسية» (web OwnerDashboardPage parity). */
export default function OwnerDashboard() {
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
        <View>
          <T variant="h2" weight="bold">
            لوحة التحكم الرئيسية
          </T>
          <T variant="body" color="muted">
            نظرة شاملة وإحصائيات حيّة عن المنصة
          </T>
        </View>

        {stats.isLoading ? (
          <SkeletonList rows={4} />
        ) : stats.isError ? (
          <ErrorState message={(stats.error as Error).message} onRetry={() => stats.refetch()} />
        ) : s ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <KpiCard label="إجمالي المستخدمين" value={num(s.totalUsers ?? null)} style={{ minWidth: "47%" }} />
            <KpiCard label="الطلاب" value={num(s.students ?? null)} style={{ minWidth: "47%" }} />
            <KpiCard label="الأساتذة" value={num(s.teachers ?? null)} style={{ minWidth: "47%" }} />
            <KpiCard label="المقرّرات" value={num(s.totalCourses ?? null)} style={{ minWidth: "47%" }} />
            <KpiCard label="الشُّعب" value={num(s.totalOfferings ?? null)} style={{ minWidth: "47%" }} />
            <KpiCard label="التسجيلات" value={num(s.totalEnrollments ?? null)} style={{ minWidth: "47%" }} />
          </View>
        ) : null}

        <View>
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
            <ErrorState message={(alerts.error as Error).message} onRetry={() => alerts.refetch()} compact />
          ) : alertRows.length === 0 ? (
            <T variant="body" color="muted">
              النظام يعمل بشكل طبيعي — لا تنبيهات مفتوحة.
            </T>
          ) : (
            <View style={{ gap: 12 }}>
              <RowList>
                {alertRows.slice(0, 3).map((a, i, arr) => (
                  <LedgerRow key={a.id} last={i === arr.length - 1}>
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
        </View>

        <View>
          <SectionBar index={2} title="الأحداث الأخيرة" />
          {activity.isLoading ? (
            <SkeletonList rows={3} />
          ) : activity.isError ? (
            <ErrorState message={(activity.error as Error).message} onRetry={() => activity.refetch()} compact />
          ) : events.length === 0 ? (
            <EmptyState title="لا توجد أحداث بعد" message="ستظهر أحدث العمليّات هنا فور حدوثها." />
          ) : (
            <View style={{ gap: 12 }}>
              <RowList>
                {events.map((ev, i, arr) => (
                  <LedgerRow key={ev.id} last={i === arr.length - 1}>
                    <T variant="body" weight="medium">
                      {auditActionLabel(ev.action)}
                    </T>
                    <T variant="xs" color="muted" numberOfLines={1}>
                      {ev.user ? `${ev.user.firstName ?? ""} ${ev.user.lastName ?? ""}`.trim() || "النظام" : "النظام"} ·{" "}
                      {fromNow(ev.createdAt)}
                    </T>
                  </LedgerRow>
                ))}
              </RowList>
              <Button
                label="سجلّ النشاط الكامل"
                kind="ghost"
                small
                onPress={() => router.push("/owner/activity" as never)}
              />
            </View>
          )}
        </View>

        <View>
          <SectionBar index={3} title="لوحة المالك" />
          <RowList>
            <LedgerRow
              onPress={() => router.push("/owner/institutions" as never)}
              accessibilityLabel="المؤسسات"
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Landmark size={18} color="#62625F" />
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
              onPress={() => router.push("/owner/activity" as never)}
              accessibilityLabel="سجلّ النشاط"
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Activity size={18} color="#62625F" />
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
              onPress={() => router.push("/owner/alerts" as never)}
              accessibilityLabel="التنبيهات التشغيليّة"
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <TriangleAlert size={18} color="#62625F" />
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
              onPress={() => router.push("/owner/ai" as never)}
              accessibilityLabel="مركز الذكاء الاصطناعيّ"
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Bot size={18} color="#62625F" />
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
              onPress={() => router.push("/owner/education" as never)}
              accessibilityLabel="النظرة التعليميّة"
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <FileText size={18} color="#62625F" />
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
              onPress={() => router.push("/owner/system" as never)}
              accessibilityLabel="النظام والتشغيل"
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Settings size={18} color="#62625F" />
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
              onPress={() => router.push("/owner/content" as never)}
              accessibilityLabel="المحتوى والعلامة التجاريّة"
              last
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Palette size={18} color="#62625F" />
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
            المراقبة الحيّة والمستخدمون والحواكمة في تبويبات الشريط السفلي · صندوق التغذية الراجعة من صفحة «المحتوى».
          </T>
        </View>
      </View>
    </Screen>
  );
}
