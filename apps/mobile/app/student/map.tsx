/**
 * /student/map — خريطة الكليات (web CampusMapPage parity, recomposed):
 * the honest city directory of the CALLER's institution faculties — no
 * invented buildings or coordinates. City sections (SectionBar) hold
 * faculty LedgerRows (iconEmoji + name + departments count when the
 * payload carries it). A true interactive campus map remains a
 * facilities-data follow-up — the honest «قيد التطوير» note rides the
 * bottom (web parity).
 */
import { useMemo } from "react";
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react-native";
import { catalogApi } from "@/api/catalog";
import { useSession } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { SectionBar } from "@/components/ui/screen";
import { LedgerRow, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { latn } from "@/lib/format";
import { SectionNote, countAr } from "@/features/student/more";
import { PushFrame } from "@/features/student/components";

/** Faculties whose city is null/blank bucket here — never dropped. */
const UNKNOWN_CITY = "مدينة غير محدّدة";

const EMPTY: Awaited<ReturnType<typeof catalogApi.faculties>> = [];

type FacultyRow = Awaited<ReturnType<typeof catalogApi.faculties>>[number];

export default function CampusMapScreen() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const slug = useSession((s) => s.user?.currentInstitution?.slug ?? null);

  /* Caller-institution scoping (web useFaculties(useCurrentInstitutionSlug())
     parity) — the query never fires without a slug so the unfiltered
     cross-institution payload is never fetched. */
  const faculties = useQuery({
    queryKey: ["catalog", "faculties", slug ?? "none", scope],
    queryFn: () => catalogApi.faculties(slug ?? undefined),
    enabled: !!slug,
  });

  const rows = faculties.data ?? EMPTY;

  /* Group by city — insertion order of the name-sorted payload; no invented sort. */
  const byCity = useMemo(() => {
    const map = new Map<string, FacultyRow[]>();
    for (const f of rows) {
      const city = (f.city ?? "").trim() || UNKNOWN_CITY;
      const bucket = map.get(city);
      if (bucket) bucket.push(f);
      else map.set(city, [f]);
    }
    return [...map.entries()];
  }, [rows]);

  return (
    <PushFrame
      title="خريطة الكليات"
      kicker="دليل كليّات مؤسّستك بحسب المدينة"
      refreshing={faculties.isFetching && !faculties.isLoading}
      onRefresh={() => faculties.refetch()}
    >
      {faculties.isError ? (
        <ErrorState message={(faculties.error as Error).message} onRetry={() => faculties.refetch()} />
      ) : !slug ? (
        <EmptyState
          icon={<Building2 size={22} color={p.textMuted} />}
          title="لم تُحدَّد مؤسستك بعد"
          message="اختر مؤسستك من مبدّل المؤسسة لعرض خريطة كليّاتها."
        />
      ) : faculties.isLoading ? (
        <SkeletonList rows={5} rowHeight={64} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<Building2 size={22} color={p.textMuted} />}
          title="لا كليات مسجّلة في مؤسّستك بعد"
          message="لم تُضف كليّات لمؤسّستك الحالية حتى الآن — ستظهر هنا فور تسجيلها من إدارة المؤسّسة."
        />
      ) : (
        <>
          <SectionNote>
            {countAr(rows.length, ["كلّيّة واحدة", "كلّيّتان", "كليّات", "كلّيّة"])} في مؤسّستك، موزَّعة على{" "}
            {countAr(byCity.length, ["مدينة واحدة", "مدينتين", "مدن", "مدينة"])}.
          </SectionNote>

          {byCity.map(([city, list], idx) => (
            <View key={city} style={{ gap: sp[8] }}>
              <SectionBar
                index={idx + 1}
                title={city}
                action={
                  <T variant="xs" color="muted">
                    {latn(list.length)}
                  </T>
                }
              />
              <RowList>
                {list.map((f, i) => (
                  <LedgerRow key={f.id} last={i === list.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                      <T variant="bodyLg" weight="bold">
                        {f.iconEmoji && f.iconEmoji.trim().length > 0 ? f.iconEmoji : "🏛️"}
                      </T>
                      <View style={{ flex: 1, gap: 2 }}>
                        <T variant="body" weight="medium" numberOfLines={1}>
                          {f.name}
                        </T>
                        {f.departments && f.departments.length > 0 ? (
                          <T variant="xs" color="muted">
                            {countAr(f.departments.length, ["قسم واحد", "قسمان", "أقسام", "قسماً"])}
                          </T>
                        ) : null}
                      </View>
                    </View>
                  </LedgerRow>
                ))}
              </RowList>
            </View>
          ))}

          <T variant="xs" color="faint">
            خريطة الحرم التفاعليّة قيد التطوير — يعرض هذا الدليل الكليّات المسجَّلة فعلياً في مؤسّستك بحسب
            مدينتها.
          </T>
        </>
      )}
    </PushFrame>
  );
}
