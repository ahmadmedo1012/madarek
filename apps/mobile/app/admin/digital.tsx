import { View } from "react-native";
import { humanizeError } from "@/lib/errors";
import { useQuery } from "@tanstack/react-query";
import Server from "lucide-react-native/icons/server";
import { Screen, PageHeader, SectionBar } from "@/components/ui";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { SkeletonList, ErrorState } from "@/components/ui/states";
import { adminApi } from "@/api/admin";
import { get } from "@/api/client";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { latn } from "@/lib/format";
import { REGISTRAR_DASHBOARD } from "@/lib/copy";

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
  const p = usePalette();
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
    { label: "جلسات المعامل", value: d?.labSessions },
    { label: "جلسات بثّ مباشر", value: d?.liveSessions },
    { label: "تسجيلات MOOC", value: d?.moocEnrollments },
    { label: "أوراق علميّة", value: d?.researchPapers },
  ];

  return (
    <Screen scroll>
      <StackHeader title="التحوّل الرقميّ" kicker={REGISTRAR_DASHBOARD} />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <PageHeader title="التحوّل الرقميّ" kicker="مؤشّرات التبنّي الرقميّ عبر الجامعة." />

        {metrics.isLoading ? (
          <SkeletonList rows={5} />
        ) : metrics.isError ? (
          <ErrorState
            message={humanizeError(metrics.error)}
            onRetry={() => metrics.refetch()}
          />
        ) : d ? (
          <>
            <RowList>
              <LedgerRow last>
                <StatLine label="الحسابات" value={latn(d.totalUsers ?? 0)} hint="كل الأدوار" />
                <StatLine label="حسابات نشطة" value={latn(d.activeUsers ?? 0)} hint="من الإجمالي" />
                <StatLine label="نسبة التبنّي" value={`${latn(Math.round(d.adoptionPct ?? 0))}%`} hint="حصة النشطة" />
                <StatLine label="ملفات مرفوعة" value={latn(d.materialsUploaded ?? 0)} />
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
                <Server size={18} color={p.textMuted} />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="medium">
                    قاعدة البيانات
                  </T>
                  <T variant="xs" color="muted">
                    {health.isLoading
                      ? "جارٍ التحقق…"
                      : dbOk
                        ? `متصلة · زمن الاستجابة ${latn(health.data?.dbLatencyMs ?? 0)} مث`
                        : "تعذّر التحقق"}
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
