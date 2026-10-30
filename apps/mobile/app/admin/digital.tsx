import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Server } from "lucide-react-native";
import { Screen , SectionBar } from "@/components/ui";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { SkeletonList, ErrorState } from "@/components/ui/states";
import { adminApi } from "@/api/admin";
import { get } from "@/api/client";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { latn } from "@/lib/format";

interface DigitalPayload {
  totalUsers?: number | null;
  activeUsers?: number | null;
  adoptionPct?: number | null;
  onlineExams?: number | null;
  examAttempts?: number | null;
  labSessions?: number | null;
  moocEnrollments?: number | null;
  researchPapers?: number | null;
  liveSessions?: number | null;
  materialsUploaded?: number | null;
}

interface HealthPayload {
  ok?: boolean;
  dbLatencyMs?: number;
  env?: string;
  buildId?: string;
}

/** Pushed: /admin/digital — «التحوّل الرقميّ» (web AdminDigitalPage parity) + the real /health probe. */
export default function AdminDigital() {
  const scope = useInstitutionScope();
  const metrics = useQuery({
    queryKey: ["admin", "digital", scope],
    queryFn: async () => (await adminApi.digital()) as DigitalPayload,
    staleTime: 60_000,
  });
  const health = useQuery({
    queryKey: ["admin", "health"],
    queryFn: () => get<HealthPayload>("/health"),
    staleTime: 30_000,
    retry: 1,
  });

  const d = metrics.data;
  const dbOk = health.isSuccess && health.data?.ok === true;

  const components: { label: string; value: number | null | undefined }[] = [
    { label: "اختبارات منشورة", value: d?.onlineExams },
    { label: "محاولات أداء", value: d?.examAttempts },
    { label: "جلسات معامل افتراضيّة", value: d?.labSessions },
    { label: "جلسات بثّ مباشر", value: d?.liveSessions },
    { label: "تسجيلات MOOC", value: d?.moocEnrollments },
    { label: "أوراق علميّة في النظام", value: d?.researchPapers },
  ];

  return (
    <Screen scroll>
      <StackHeader title="التحوّل الرقميّ" kicker="لوحة المسجل العام" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <T variant="body" color="muted">
          مؤشّرات تبنّي المنصّة الرقميّة عبر مكوّنات الجامعة.
        </T>

        {metrics.isLoading ? (
          <SkeletonList rows={5} />
        ) : metrics.isError ? (
          <ErrorState
            message={(metrics.error as Error).message}
            onRetry={() => metrics.refetch()}
          />
        ) : d ? (
          <>
            <RowList>
              <LedgerRow last>
                <StatLine label="إجمالي الحسابات" value={latn(d.totalUsers ?? 0)} hint="كل الأدوار في الجامعة" />
                <StatLine label="حسابات نشطة" value={latn(d.activeUsers ?? 0)} hint="من إجمالي الحسابات" />
                <StatLine label="نسبة التبنّي" value={`${latn(Math.round(d.adoptionPct ?? 0))}%`} hint="حصة الحسابات النشطة" />
                <StatLine label="ملفات تعليمية مرفوعة" value={latn(d.materialsUploaded ?? 0)} />
              </LedgerRow>
            </RowList>

            <View>
              <SectionBar index={1} title="تبنّي المكوّنات" />
              <RowList>
                {components.map((c, i) => (
                  <LedgerRow key={c.label} last={i === components.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <T variant="sm" color="muted">
                          {c.label}
                        </T>
                      </View>
                      <T variant="bodyLg" weight="bold">
                        {c.value != null ? latn(c.value) : "—"}
                      </T>
                    </View>
                  </LedgerRow>
                ))}
              </RowList>
            </View>
          </>
        ) : null}

        <View>
          <SectionBar index={2} title="البنية التشغيليّة" />
          <RowList>
            <LedgerRow last>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Server size={18} color="#62625F" />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="medium">
                    قاعدة البيانات
                  </T>
                  <T variant="xs" color="muted">
                    {health.isLoading
                      ? "جارٍ التحقق…"
                      : dbOk
                        ? `متصلة · زمن الاستجابة ${latn(health.data?.dbLatencyMs ?? 0)} مث`
                        : "تعذّر التحقق من الاتصال"}
                  </T>
                </View>
                {!health.isLoading ? (
                  <Badge label={dbOk ? "متصلة" : "غير متاحة"} tone={dbOk ? "mint" : "rose"} />
                ) : null}
              </View>
            </LedgerRow>
          </RowList>
        </View>
      </View>
    </Screen>
  );
}
