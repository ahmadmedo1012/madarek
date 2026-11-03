import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import BookOpen from "lucide-react-native/icons/book-open";
import FileText from "lucide-react-native/icons/file-text";
import Inbox from "lucide-react-native/icons/inbox";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen, SectionBar } from "@/components/ui";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { DataList, LedgerRow, makeRow, usePagedList } from "@/components/ui/data";
import { SimulatedBadge } from "@/components/ui/surfaces";
import { Skeleton, EmptyState } from "@/components/ui/states";
import { adminApi } from "@/api/admin";
import { useSession, ROLE_LABELS } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { humanizeError } from "@/lib/errors";
import { latn, fromNow } from "@/lib/format";
import {
  MetricHero,
  MetricTile,
  PaperStatusChip,
  type PaperRow,
} from "@/features/governance/components";

/** (tabs) Admin dashboard — «لوحة المسجل العام» (web AdminDashboardPage parity).
 *  Metric hierarchy: ONE hero (students) + supporting tiles — not a flat grid. */
export default function AdminDashboard() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const user = useSession((s) => s.user);
  const stats = useQuery({
    queryKey: ["admin", "stats", scope],
    queryFn: () => adminApi.stats(),
  });
  const papers = usePagedList<PaperRow>({
    queryKey: ["admin", "papers", 10, scope],
    fetchPage: (page) =>
      adminApi.papers(page, 10).then((res) => ({ data: res.data as PaperRow[], meta: res.meta })),
    limit: 10,
  });

  const s = stats.data;

  return (
    <Screen scroll>
      <AppTopBar alertsPath="/admin/alerts" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <View>
          <T variant="h2" weight="bold">
            لوحة {ROLE_LABELS[user?.role ?? "ADMIN"] ?? "المسجل العام"}
          </T>
          <T variant="body" color="muted">
            إحصائيات حيّة عن طلاب وأساتذة المنصّة.
          </T>
        </View>

        {stats.isLoading ? (
          /* skeleton with real geometry: hero slab + 2×2 tiles */
          <View style={{ gap: 8 }}>
            <Skeleton h={132} />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Skeleton h={72} />
              <Skeleton h={72} />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <Skeleton h={72} />
              <Skeleton h={72} />
            </View>
          </View>
        ) : stats.isError ? (
          <EmptyState
            title="تعذّر تحميل الإحصائيات"
            message={humanizeError(stats.error)}
            actionLabel="إعادة المحاولة"
            onAction={() => stats.refetch()}
          />
        ) : s ? (
          <View style={{ gap: 8 }}>
            <MetricHero
              label="الطلاب المسجَّلون"
              value={s.totalStudents ?? null}
              hint="إجمالي حسابات الطلاب في هذه المؤسّسة"
            />
            <View style={{ flexDirection: "row", gap: 8 }}>
              <MetricTile label="الأساتذة" value={s.totalTeachers ?? null} />
              <MetricTile label="المقرّرات" value={s.totalCourses ?? null} />
            </View>
            <View style={{ flexDirection: "row", gap: 8 }}>
              <MetricTile label="الشُّعب" value={s.totalOfferings ?? null} />
              <MetricTile label="الكلّيات والأقسام" value={(s.totalFaculties ?? 0) + (s.totalDepartments ?? 0)} />
            </View>
          </View>
        ) : null}

        <View>
          <SectionBar
            index={1}
            title="سجلّ البحوث"
            action={<SimulatedBadge note="نسبة الاقتباس" />}
          />
          <DataList
            data={papers.items}
            renderItem={({ item }) => <PaperRowView item={item} />}
            keyExtractor={(row) => row.id}
            isLoading={papers.isLoading}
            isError={papers.isError}
            errorMessage={humanizeError(papers.query.error)}
            onRetry={() => papers.refetch()}
            refetch={papers.refetch}
            isRefetching={papers.isRefetching}
            onEndReached={papers.onEndReached}
            isFetchingNextPage={papers.isFetchingNextPage}
            hasNextPage={papers.hasNextPage}
            loadMoreError={papers.loadMoreError}
            onRetryLoadMore={papers.retryLoadMore}
            emptyTitle="لا توجد بحوث بعد"
            emptyMessage="ستظهر البحوث هنا فور رفع أول بحث إلى المنصة."
            loadingSlot={
              <View style={{ gap: 8, paddingTop: 8 }}>
                <Skeleton h={64} />
                <Skeleton h={64} />
              </View>
            }
            /* bounded peek-list (5 rows) — DataList owns its scrolling */
            style={{ height: 400 }}
            scrollProps={{ nestedScrollEnabled: true }}
            contentPadding={{ bottom: 8 }}
          />
          {papers.items.length >= 10 ? (
            <View style={{ alignItems: "flex-start", paddingTop: 8 }}>
              <Button label="تقرير البحوث الكامل" kind="ghost" small onPress={() => router.push("/admin/reports" as never)} />
            </View>
          ) : null}
        </View>

        <View>
          <SectionBar index={2} title="صفحات المسجل العام" />
          <View style={{ gap: 8 }}>
            {(
              [
                [BookOpen, "إدارة المقرّرات", "المقرّرات والشُّعب مع البحث والإضافة", "/admin/courses"],
                [RefreshCw, "المزامنة مع البيانات الرسمية", "آخر التشغيلات والحقول القديمة", "/admin/sync"],
                [ShieldCheck, "التحوّل الرقميّ", "مؤشّرات تبنّي المنصّة الرقميّة", "/admin/digital"],
                [Inbox, "دعوات التسجيل", "أكواد الانضمام للطلاب والأساتذة", "/admin/invites"],
                [FileText, "صندوق التغذية الراجعة", "تقارير المستخدمين وسياقها الكامل", "/admin/feedback"],
              ] as const
            ).map(([Icon, title, sub, href], i, arr) => (
              <LedgerRow
                key={href}
                onPress={() => router.push(href as never)}
                accessibilityLabel={title}
                last={i === arr.length - 1}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <Icon size={18} color={p.textMuted} />
                  <View style={{ flex: 1 }}>
                    <T variant="body" weight="bold">
                      {title}
                    </T>
                    <T variant="xs" color="muted">
                      {sub}
                    </T>
                  </View>
                </View>
              </LedgerRow>
            ))}
          </View>
        </View>

        <T variant="xs" color="faint" style={{ paddingBottom: sp[8] }}>
          الكلّيات والأقسام في تبويب «الكلّيات» · الطلاب والأساتذة والتقارير في تبويبات الشريط السفلي.
        </T>
      </View>
    </Screen>
  );
}

/* ─── papers row (module scope, memo-stable for DataList) ─── */

const PaperRowView = makeRow<PaperRow>(({ item }) => (
  <LedgerRow accessibilityLabel={`بحث ${item.title}`}>
    <T variant="body" weight="bold" numberOfLines={1}>
      {item.title}
    </T>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      <PaperStatusChip status={item.status} />
      <T variant="xs" color="muted">
        {item.student ? `${item.student.firstName ?? ""} ${item.student.lastName ?? ""}`.trim() : "—"}
      </T>
      <T variant="xs" color="faint">
        · {fromNow(item.uploadedAt)}
      </T>
    </View>
    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
      <T variant="xs" color="muted">
        الاقتباس (محاكاة):
      </T>
      <T variant="bodyLg" weight="bold">
        {item.plagiarismPct != null ? `${latn(Math.round(item.plagiarismPct))}%` : "—"}
      </T>
    </View>
  </LedgerRow>
));
