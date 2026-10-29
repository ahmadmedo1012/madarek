import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen, SectionBar } from "@/components/ui";
import { T } from "@/components/ui/text";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { SkeletonList, EmptyState, ErrorState } from "@/components/ui/states";
import { ownerApi } from "@/api/owner";
import { latn } from "@/lib/format";
import {
  countAr,
  numOf,
  type GovernanceRow,
  type LoginAnalyticsRow,
} from "@/features/governance/components";

/**
 * (tabs) Advanced governance — «الحوكمة المتقدّمة» (web OwnerGovernancePage
 * parity): permission/role-change counters, weekly signup growth, and the
 * login-analytics read (success/failure, daily table, failure reasons) —
 * every figure an honest StatLine from the real payload.
 */
export default function OwnerGovernance() {
  const gov = useQuery({
    queryKey: ["owner", "governance"],
    queryFn: () => ownerApi.governance(),
  });
  const logins = useQuery({
    queryKey: ["owner", "login-analytics"],
    queryFn: () => ownerApi.loginAnalytics(),
  });

  const g = gov.data as GovernanceRow | undefined;
  const la = logins.data as LoginAnalyticsRow | undefined;

  return (
    <Screen scroll>
      <AppTopBar alertsPath="/owner/alerts" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <View>
          <T variant="h2" weight="bold">
            الحوكمة المتقدّمة
          </T>
          <T variant="body" color="muted">
            تتبّع الصلاحيات والنموّ وتحليل تسجيلات الدخول
          </T>
        </View>

        {/* [01] Governance counters */}
        <View>
          <SectionBar index={1} title="مؤشرات الحوكمة" />
          {gov.isLoading ? (
            <SkeletonList rows={3} rowHeight={48} />
          ) : gov.isError ? (
            <ErrorState
              message={(gov.error as Error).message}
              onRetry={() => gov.refetch()}
              compact
            />
          ) : (
            <RowList>
              <LedgerRow last>
                <StatLine
                  label="تغييرات الصلاحيات"
                  value={numOf(g?.permissionChanges)}
                  hint="تجاوزات موثّقة في السجلّ"
                />
                <StatLine
                  label="تغييرات الأدوار"
                  value={numOf(g?.roleChanges)}
                  hint="تعيينات وتحويلات"
                />
                <StatLine
                  label="مستخدمون جدد هذا الشهر"
                  value={numOf(g?.newUsersThisMonth)}
                  hint="من باب التسجيل"
                />
              </LedgerRow>
            </RowList>
          )}
        </View>

        {/* [02] Weekly signup growth */}
        <View>
          <SectionBar index={2} title="نموّ المستخدمين الأسبوعيّ" />
          {gov.isLoading ? (
            <SkeletonList rows={3} rowHeight={48} />
          ) : gov.isError ? null : (g?.weeklyGrowth ?? []).length === 0 ? (
            <T variant="body" color="muted">
              لا توجد بيانات نموّ بعد — سيُرسم السجلّ فور تسجيل أوّل مستخدم.
            </T>
          ) : (
            <RowList>
              {(g?.weeklyGrowth ?? []).map((w, i, arr) => (
                <LedgerRow key={`${w.week ?? i}`} last={i === arr.length - 1}>
                  <StatLine label={w.week ?? `أسبوع ${latn(i + 1)}`} value={numOf(w.count)} />
                </LedgerRow>
              ))}
            </RowList>
          )}
        </View>

        {/* [03] Login analytics */}
        <View>
          <SectionBar index={3} title="تسجيلات الدخول" />
          {logins.isLoading ? (
            <SkeletonList rows={3} rowHeight={48} />
          ) : logins.isError ? (
            <ErrorState
              message={(logins.error as Error).message}
              onRetry={() => logins.refetch()}
              compact
            />
          ) : !la || numOf(la.total) === 0 ? (
            <EmptyState
              title="لا توجد محاولات دخول بعد"
              message="سيظهر التوزيع فور أوّل محاولة تسجيل دخول."
            />
          ) : (
            <RowList>
              <LedgerRow last>
                <StatLine label="محاولات ناجحة" value={numOf(la.successCount)} />
                <StatLine label="محاولات فاشلة" value={numOf(la.failureCount)} tone="danger" />
                <StatLine label="إجمالي المحاولات" value={numOf(la.total)} />
              </LedgerRow>
            </RowList>
          )}
        </View>

        {/* [04] Daily login detail */}
        <View>
          <SectionBar index={4} title="تفاصيل تسجيلات الدخول اليوميّة" />
          {logins.isLoading ? (
            <SkeletonList rows={4} rowHeight={48} />
          ) : logins.isError ? null : (la?.daily ?? []).length === 0 ? (
            <T variant="body" color="muted">
              لا توجد بيانات يوميّة — تُسجَّل المحاولات يوماً بيوم فور حدوثها.
            </T>
          ) : (
            <RowList>
              {(la?.daily ?? []).map((d, i, arr) => {
                const succ = numOf(d.success);
                const fail = numOf(d.failure);
                const parts = [
                  succ != null ? `ناجحة ${latn(succ)}` : null,
                  fail != null ? `فاشلة ${latn(fail)}` : null,
                ].filter(Boolean);
                return (
                  <LedgerRow key={d.date ?? i} last={i === arr.length - 1}>
                    <StatLine label={d.date ?? "—"} value={parts.length > 0 ? parts.join(" · ") : null} />
                  </LedgerRow>
                );
              })}
            </RowList>
          )}
        </View>

        {/* [05] Failure reasons */}
        {(la?.topReasons ?? []).length > 0 ? (
          <View>
            <SectionBar index={5} title="أسباب تعذّر تسجيل الدخول" />
            <RowList>
              {(la?.topReasons ?? []).map((r, i, arr) => (
                <LedgerRow key={r.reason ?? i} last={i === arr.length - 1}>
                  <StatLine label={r.reason ?? "—"} value={numOf(r.count)} />
                </LedgerRow>
              ))}
            </RowList>
            <T variant="xs" color="faint">
              {countAr((la?.topReasons ?? []).length, [
                "سبب واحد مسجَّل",
                "سببان مسجَّلان",
                "أسباب مسجَّلة",
                "سبباً مسجَّلاً",
              ])}{" "}
              — من سجلّ المحاولات الفاشلة.
            </T>
          </View>
        ) : null}
      </View>
    </Screen>
  );
}
