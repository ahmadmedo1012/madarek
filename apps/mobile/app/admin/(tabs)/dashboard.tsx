import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, FileText, Inbox, RefreshCw, ShieldCheck } from "lucide-react-native";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen, SectionBar } from "@/components/ui";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { RowList, LedgerRow, KpiCard } from "@/components/ui/data";
import { SimulatedBadge } from "@/components/ui/surfaces";
import { SkeletonList, EmptyState, ErrorState } from "@/components/ui/states";
import { adminApi } from "@/api/admin";
import { useSession, ROLE_LABELS } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { latn, num, fromNow } from "@/lib/format";
import {
  PaperStatusChip,
  pageOf,
  type PaperRow,
} from "@/features/governance/components";

/** (tabs) Admin dashboard — «لوحة المسجل العام» (web AdminDashboardPage parity). */
export default function AdminDashboard() {
  const scope = useInstitutionScope();
  const user = useSession((s) => s.user);
  const stats = useQuery({
    queryKey: ["admin", "stats", scope],
    queryFn: () => adminApi.stats(),
  });
  const [papersPage] = useState(1);
  const papers = useQuery({
    queryKey: ["admin", "papers", papersPage, 5, scope],
    queryFn: async () => pageOf<PaperRow>(await adminApi.papers(1, 5)),
  });

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
          <SkeletonList rows={3} />
        ) : stats.isError ? (
          <ErrorState message={(stats.error as Error).message} onRetry={() => stats.refetch()} />
        ) : stats.data ? (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
            <KpiCard label="الطلاب" value={num(stats.data.totalStudents ?? null)} style={{ minWidth: "47%" }} />
            <KpiCard label="الأساتذة" value={num(stats.data.totalTeachers ?? null)} style={{ minWidth: "47%" }} />
            <KpiCard label="المقرّرات" value={num(stats.data.totalCourses ?? null)} style={{ minWidth: "47%" }} />
            <KpiCard label="الكلّيات" value={num(stats.data.totalFaculties ?? null)} style={{ minWidth: "47%" }} />
            <KpiCard label="الأقسام" value={num(stats.data.totalDepartments ?? null)} style={{ minWidth: "47%" }} />
            <KpiCard label="الشُّعب" value={num(stats.data.totalOfferings ?? null)} style={{ minWidth: "47%" }} />
          </View>
        ) : null}

        <View>
          <SectionBar
            index={1}
            title="سجلّ البحوث"
            action={<SimulatedBadge note="نسبة الاقتباس" />}
          />
          {papers.isLoading ? (
            <SkeletonList rows={2} />
          ) : papers.isError ? (
            <ErrorState message={(papers.error as Error).message} onRetry={() => papers.refetch()} compact />
          ) : papers.data && papers.data.rows.length > 0 ? (
            <RowList>
              {papers.data.rows.map((p, i) => (
                <LedgerRow key={p.id} last={i === papers.data!.rows.length - 1}>
                  <T variant="body" weight="bold" numberOfLines={1}>
                    {p.title}
                  </T>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <PaperStatusChip status={p.status} />
                    <T variant="xs" color="muted">
                      {p.student ? `${p.student.firstName ?? ""} ${p.student.lastName ?? ""}`.trim() : "—"}
                    </T>
                    <T variant="xs" color="faint">
                      · {fromNow(p.uploadedAt)}
                    </T>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <T variant="xs" color="muted">
                      الاقتباس (محاكاة):
                    </T>
                    <T variant="bodyLg" weight="bold">
                      {p.plagiarismPct != null ? `${latn(Math.round(p.plagiarismPct))}%` : "—"}
                    </T>
                  </View>
                </LedgerRow>
              ))}
            </RowList>
          ) : (
            <EmptyState
              title="لا توجد بحوث بعد"
              message="ستظهر البحوث هنا فور رفع أول بحث إلى المنصة."
            />
          )}
          {papers.data && papers.data.rows.length === 5 ? (
            <View style={{ alignItems: "flex-start", paddingTop: 8 }}>
              <Button label="عرض المزيد" kind="ghost" small onPress={() => router.push("/admin/reports" as never)} />
            </View>
          ) : null}
        </View>

        <View>
          <SectionBar index={2} title="صفحات المسجل العام" />
          <RowList>
            <LedgerRow
              onPress={() => router.push("/admin/courses" as never)}
              accessibilityLabel="إدارة المقرّرات"
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <BookOpen size={18} color="#62625F" />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="bold">
                    إدارة المقرّرات
                  </T>
                  <T variant="xs" color="muted">
                    المقرّرات والشُّعب مع البحث والإضافة
                  </T>
                </View>
              </View>
            </LedgerRow>
            <LedgerRow
              onPress={() => router.push("/admin/sync" as never)}
              accessibilityLabel="المزامنة مع البيانات الرسمية"
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <RefreshCw size={18} color="#62625F" />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="bold">
                    المزامنة مع البيانات الرسمية
                  </T>
                  <T variant="xs" color="muted">
                    آخر التشغيلات والحقول القديمة
                  </T>
                </View>
              </View>
            </LedgerRow>
            <LedgerRow
              onPress={() => router.push("/admin/digital" as never)}
              accessibilityLabel="التحوّل الرقميّ"
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <ShieldCheck size={18} color="#62625F" />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="bold">
                    التحوّل الرقميّ
                  </T>
                  <T variant="xs" color="muted">
                    مؤشّرات تبنّي المنصّة الرقميّة
                  </T>
                </View>
              </View>
            </LedgerRow>
            <LedgerRow
              onPress={() => router.push("/admin/invites" as never)}
              accessibilityLabel="دعوات التسجيل"
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <Inbox size={18} color="#62625F" />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="bold">
                    دعوات التسجيل
                  </T>
                  <T variant="xs" color="muted">
                    أكواد الانضمام للطلاب والأساتذة
                  </T>
                </View>
              </View>
            </LedgerRow>
            <LedgerRow
              onPress={() => router.push("/admin/feedback" as never)}
              accessibilityLabel="صندوق التغذية الراجعة"
              last
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <FileText size={18} color="#62625F" />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="bold">
                    صندوق التغذية الراجعة
                  </T>
                  <T variant="xs" color="muted">
                    تقارير المستخدمين وسياقها الكامل
                  </T>
                </View>
              </View>
            </LedgerRow>
          </RowList>
        </View>

        <T variant="xs" color="faint">
          الكلّيات والأقسام في تبويب «الكلّيات» · الطلاب والأساتذة والتقارير في تبويبات الشريط السفلي.
        </T>
      </View>
    </Screen>
  );
}
