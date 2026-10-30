import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react-native";
import { Screen } from "@/components/ui";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Badge, SimulatedBadge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, Avatar, ProgressBar } from "@/components/ui/data";
import { SkeletonList, EmptyState, ErrorState } from "@/components/ui/states";
import { get } from "@/api/client";
import { RANK_LABELS } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { clamp01, initials, latn } from "@/lib/format";
import { countAr, type ProfessorRow } from "@/features/governance/components";

const ROSTER_CAP = 100;

/**
 * Pushed: /quality/professors — «تقييم الأساتذة» (web QualityProfessorsPage
 * parity). NOTE (contract mismatch): /quality/professors' query schema is
 * strict (q only) — page/limit params 400, so the roster is fetched bare
 * (server caps at take:100; disclosed honestly when hit).
 */
export default function QualityProfessors() {
  const scope = useInstitutionScope();
  const professors = useQuery({
    queryKey: ["quality", "professors", scope],
    queryFn: () => get<ProfessorRow[]>("/quality/professors"),
  });

  const rows = Array.isArray(professors.data) ? professors.data : [];
  const lowComp = rows.filter((t) => (t.compliance ?? 0) < 50).length;

  return (
    <Screen scroll>
      <StackHeader title="تقييم الأساتذة" kicker="قطاع ضمان الجودة" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <View style={{ flex: 1 }}>
            <T variant="body" color="muted">
              رضا الطلاب، معدل الاستجابة، الالتزام بمعايير المنصة.
            </T>
          </View>
          <Badge label="قراءة فقط" tone="grey" />
        </View>

        {rows.some((t) => t.satisfactionEstimated || t.responseHoursEstimated) ? (
          <T variant="xs" color="faint">
            رضا الطلاب وزمن الاستجابة قيم تقديرية حتى تفعيل قياسها الفعلي.
          </T>
        ) : null}

        {professors.isLoading ? (
          <SkeletonList rows={5} />
        ) : professors.isError ? (
          <ErrorState
            message={(professors.error as Error).message}
            onRetry={() => professors.refetch()}
          />
        ) : rows.length === 0 ? (
          <EmptyState
            title="لا أساتذة بعد"
            message="ستظهر هيئة التدريس ومؤشراتها هنا فور إضافة أعضائها إلى المؤسسة."
          />
        ) : (
          <>
            {lowComp > 0 ? (
              <Badge label={`بحاجة لمتابعة: ${latn(lowComp)} — التزام أقلّ من 50%`} tone="yellow" />
            ) : null}
            <RowList>
              {rows.map((t, i) => {
                const compliance = t.compliance ?? 0;
                return (
                  <LedgerRow key={t.id} last={i === rows.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Avatar
                        initials={
                          t.avatarInitials ?? initials(t.firstName ?? "", t.lastName ?? "")
                        }
                        color={t.avatarColor}
                        size={36}
                      />
                      <View style={{ flex: 1, gap: 2 }}>
                        <T variant="body" weight="bold" numberOfLines={1}>
                          د. {t.firstName ?? ""} {t.lastName ?? ""}
                        </T>
                        <T variant="xs" color="muted" numberOfLines={1}>
                          {RANK_LABELS[t.rank ?? ""] ?? t.rank ?? "—"}
                          {t.specialty ? ` · ${t.specialty}` : ""}
                        </T>
                        <T variant="xs" color="faint" numberOfLines={1}>
                          {t.faculty ?? "—"}
                          {t.department ? ` · ${t.department}` : ""}
                        </T>
                      </View>
                    </View>
                    <T variant="xs" color="muted">
                      {countAr(t.offerings ?? 0, ["مقرّر واحد", "مقرّران", "مقرّرات", "مقرّراً"])} ·{" "}
                      {latn(t.totals?.materials ?? 0)} ملف · {latn(t.totals?.lectures ?? 0)} محاضرة
                    </T>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <Star size={13} color="#8F5A28" />
                      <T variant="sm" color="gold">
                        رضا {latn(Math.round((t.satisfaction ?? 0) * 10) / 10)}/5
                      </T>
                      {t.satisfactionEstimated ? <SimulatedBadge /> : null}
                      <T variant="sm" color="muted">
                        استجابة {latn(t.responseHours ?? 0)} س
                      </T>
                      {t.responseHoursEstimated ? <SimulatedBadge /> : null}
                    </View>
                    <View style={{ paddingTop: 4 }}>
                      <ProgressBar ratio={clamp01(compliance / 100)} label="الالتزام" />
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 4 }}>
                        <Badge
                          label={`الالتزام ${latn(Math.round(compliance))}%`}
                          tone={compliance >= 75 ? "mint" : compliance >= 50 ? "yellow" : "rose"}
                        />
                      </View>
                    </View>
                  </LedgerRow>
                );
              })}
            </RowList>
            {rows.length >= ROSTER_CAP ? (
              <T variant="xs" color="faint">
                تُعرض أول {latn(ROSTER_CAP)} أستاذًا — حدّ الخادم لهذا السجلّ.
              </T>
            ) : null}
          </>
        )}
      </View>
    </Screen>
  );
}
