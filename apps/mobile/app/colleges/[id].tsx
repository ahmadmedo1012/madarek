import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Building2 } from "lucide-react-native";
import { collegesApi } from "@/api/catalog";
import type { Faculty } from "@/api/types";
import { useSession } from "@/auth/session";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { latn } from "@/lib/format";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Card } from "@/components/ui/surfaces";
import { StatLine, RowList, LedgerRow } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { StackHeader } from "@/components/shell/AppTopBar";
import { apiMessage } from "@/features/common/components";

/** Known stat keys → Arabic labels (honest: unmapped keys render raw). */
const STAT_LABELS: Record<string, string> = {
  studentCount: "إجمالي الطلاب",
  teacherCount: "هيئة التدريس",
  departmentCount: "عدد الأقسام",
  courseCount: "عدد المقرّرات",
  programsCount: "عدد البرامج",
  facultyCount: "عدد الكلّيّات",
  memberCount: "الأعضاء",
  labCount: "المعامل",
};

/**
 * /colleges/[id] — one college's honest profile: name, city, stats
 * (StatLines from the stats object), faculties, programs. Present fields
 * render; absent ones never fake a row. Web twin: CollegeDetailPage
 * (guest public-zeros ruling applied: a guest never sees a wall of zeros —
 * zero stats drop and one honest founding line appears instead).
 */
export default function CollegeDetail() {
  const p = usePalette();
  const params = useLocalSearchParams<{ id: string }>();
  const scope = useInstitutionScope();
  const user = useSession((s) => s.user);
  const isGuest = !user;

  const q = useQuery({
    queryKey: ["colleges", params.id, scope],
    queryFn: () => collegesApi.detail(params.id),
    enabled: !!params.id,
    staleTime: 60_000,
  });

  if (q.isLoading) {
    return (
      <Screen scroll>
        <StackHeader title="كلّيّة" kicker="جامعة مدارك التجريبية" />
        <SkeletonList rows={5} />
      </Screen>
    );
  }
  if (q.isError || !q.data) {
    return (
      <Screen scroll>
        <StackHeader title="كلّيّة" kicker="جامعة مدارك التجريبية" />
        <ErrorState message={apiMessage(q.error)} onRetry={() => q.refetch()} />
      </Screen>
    );
  }

  const c = q.data;
  const stats = c.stats ?? {};
  const statEntries = Object.entries(stats).filter(
    ([, v]) => typeof v === "number" && (isGuest ? v > 0 : true),
  );
  const faculties = (c.faculties ?? []) as Faculty[];
  const programs = normalizePrograms(c.programs);

  return (
    <Screen scroll>
      <StackHeader title={c.name} kicker={c.city ?? "جامعة مدارك التجريبية"} />

      {/* Identity band — the honest eyebrow (web parity). */}
      <View style={{ gap: sp[4], paddingBottom: sp[8] }}>
        <T variant="h3" weight="bold">
          {c.name}
        </T>
        {typeof c.nameEn === "string" && c.nameEn ? (
          <T variant="sm" color="muted">
            {c.nameEn}
          </T>
        ) : null}
        <T variant="xs" color="faint">
          {`جامعة مدارك التجريبية${c.city ? ` · ${c.city}` : ""} · بيانات تجريبية`}
        </T>
      </View>

      {statEntries.length > 0 ? (
        <Card style={{ paddingVertical: sp[4] }}>
          {statEntries.map(([k, v]) => (
            <StatLine
              key={k}
              label={STAT_LABELS[k] ?? k}
              value={v as number}
            />
          ))}
        </Card>
      ) : (
        isGuest ? (
          <T variant="sm" color="muted">
            كلّيّة حديثة التأسيس — تُحدَّث بياناتها مع بدء التسجيل.
          </T>
        ) : null
      )}

      {/* Faculties */}
      {faculties.length > 0 ? (
        <>
          <T variant="h4" weight="bold">
            الأقسام
          </T>
          <RowList>
            {faculties.map((f, i) => (
              <LedgerRow
                key={f.id}
                last={i === faculties.length - 1}
                accessibilityLabel={f.name}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                  <T variant="body">{f.iconEmoji ?? "🏛️"}</T>
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="body" weight="medium">
                      {f.name}
                    </T>
                    {f.city ? (
                      <T variant="sm" color="muted">
                        {f.city}
                      </T>
                    ) : null}
                  </View>
                </View>
              </LedgerRow>
            ))}
          </RowList>
        </>
      ) : null}

      {/* Programs */}
      {programs.length > 0 ? (
        <>
          <T variant="h4" weight="bold">
            البرامج
          </T>
          <RowList>
            {programs.map((prog, i) => (
              <LedgerRow
                key={`${prog.name}-${i}`}
                last={i === programs.length - 1}
                accessibilityLabel={prog.name}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                  <Building2 size={18} color={p.textMuted} />
                  <View style={{ flex: 1, gap: 2 }}>
                    <T variant="body" weight="medium">
                      {prog.name}
                    </T>
                    {prog.sub ? (
                      <T variant="sm" color="muted">
                        {prog.sub}
                      </T>
                    ) : null}
                  </View>
                </View>
              </LedgerRow>
            ))}
          </RowList>
        </>
      ) : null}

      {programs.length === 0 && faculties.length === 0 && statEntries.length === 0 && !isGuest ? (
        <EmptyState
          title="لا توجد بيانات لهذه الكلّيّة بعد"
          message="تُحدَّث بياناتها مع بدء التسجيل وإضافة الأقسام والبرامج."
        />
      ) : null}
    </Screen>
  );
}

/** Honest normalization of the programs array (unknown[] → presentable rows). */
function normalizePrograms(raw: unknown[] | null | undefined): { name: string; sub: string | null }[] {
  if (!Array.isArray(raw)) return [];
  const rows: { name: string; sub: string | null }[] = [];
  for (const item of raw) {
    if (typeof item !== "object" || item === null) continue;
    const o = item as Record<string, unknown>;
    const name = typeof o.name === "string" && o.name
      ? o.name
      : typeof o.title === "string" && o.title
        ? o.title
        : null;
    if (!name) continue;
    const subParts: string[] = [];
    for (const key of ["degree", "level", "city", "credits"]) {
      const v = o[key];
      if (typeof v === "string" && v) subParts.push(v);
      else if (typeof v === "number" && key === "credits") subParts.push(`${latn(v)} ساعة`);
    }
    rows.push({ name, sub: subParts.length > 0 ? subParts.join(" · ") : null });
  }
  return rows;
}
