/**
 * /student/university — عن المؤسّسة (R349 U3): the caller's OWN
 * institution page. The retired showcase-facts feed (GET
 * /university/facts + UniversityFact) is deleted with the university
 * purge — the project belongs to no university and no reference facts
 * are curated for any institution.
 *
 * Feed (all real, all the caller's own):
 *   · the session's currentInstitution (name/nameEn/slug),
 *   · the faculties + departments scoped to it (GET /faculties with
 *     the institution slug — the same public route the web page rides),
 *   · the membership card (session context), unchanged.
 *
 * Vocabulary is kind-neutral («الكليّات») — InstitutionKind-aware
 * wording lands with lane P's profiles work.
 */
import { View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import Building2 from "lucide-react-native/icons/building-complex";
import { useSession, ROLE_LABELS } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { SectionBar } from "@/components/ui/screen";
import { Card } from "@/components/ui/surfaces";
import { StatLine } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { latn } from "@/lib/format";
import { humanizeError } from "@/lib/errors";
import { countAr } from "@/features/student/more";
import { PushFrame } from "@/features/student/components";
import { catalogApi } from "@/api/catalog";

interface FacultyRow {
  id: string;
  name: string;
  nameEn?: string | null;
  city?: string | null;
  departments?: { id: string; name: string }[];
}

export default function UniversityScreen() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const user = useSession((s) => s.user);
  const institution = user?.currentInstitution ?? null;

  const facs = useQuery({
    queryKey: ["institution", "faculties", institution?.slug ?? null, scope],
    queryFn: () => catalogApi.faculties(institution?.slug ?? undefined),
    enabled: Boolean(institution?.slug),
  });

  const faculties = (facs.data ?? []) as FacultyRow[];
  const departmentCount = faculties.reduce((n, f) => n + (f.departments?.length ?? 0), 0);
  const membershipIndex = 3; // identity, faculties, membership

  if (!institution) {
    /* Null context (the multi-membership pre-selection edge): the
     * honest empty state — nothing is invented. */
    return (
      <PushFrame title="عن المؤسّسة" kicker="مؤسّستك التعليميّة على منصّة مدارك">
        <EmptyState
          icon={<Building2 size={22} color={p.textMuted} />}
          title="لا توجد مؤسّسة في جلستك"
          message="اختر مؤسّستك من قائمة العضويّات ثم عُد إلى هذه الصفحة."
        />
      </PushFrame>
    );
  }

  return (
    <PushFrame
      title="عن المؤسّسة"
      kicker={institution.name}
      refreshing={facs.isFetching && !facs.isLoading}
      onRefresh={() => facs.refetch()}
    >
      {/* ── 01 · بطاقة تعريف (the session's own institution) ── */}
      <SectionBar index={1} title="بطاقة تعريف" />
      <Card>
        <StatLine label="الاسم الرسميّ" value={institution.name} />
        <StatLine label="الاسم بالإنجليزيّة" value={institution.nameEn ?? "—"} />
        <StatLine label="المعرّف على المنصّة" value={institution.slug} />
      </Card>

      {/* ── 02 · الكليّات المسجَّلة في مؤسستك ── */}
      <SectionBar
        index={2}
        title="الكليّات"
        action={
          <T variant="xs" color="muted">
            {facs.isPending ? "…" : latn(faculties.length)}
          </T>
        }
      />
      {facs.isError ? (
        <ErrorState message={humanizeError(facs.error)} onRetry={() => facs.refetch()} />
      ) : facs.isLoading ? (
        <SkeletonList rows={4} rowHeight={56} />
      ) : faculties.length === 0 ? (
        <EmptyState
          icon={<Building2 size={22} color={p.textMuted} />}
          title="لا توجد كليّات بعد"
          message="لم تُسجَّل كلّيّات في هذه المؤسّسة بعد."
        />
      ) : (
        <>
          <Card>
            <StatLine
              label="عدد الكليّات"
              value={latn(faculties.length)}
              hint={countAr(faculties.length, ["كلّيّة واحدة", "كلّيّتان", "كلّيّات", "كلّيّة"])}
            />
            {departmentCount > 0 ? (
              <StatLine
                label="عدد الأقسام"
                value={latn(departmentCount)}
                hint={countAr(departmentCount, ["قسم واحد", "قسمان", "أقسام", "قسم"])}
              />
            ) : null}
          </Card>
          {faculties.map((f) => (
            <Card key={f.id}>
              <View style={{ gap: sp[4] }}>
                <StatLine label={f.name} value={f.city ?? "—"} />
                {f.departments && f.departments.length > 0 ? (
                  <StatLine
                    label="الأقسام"
                    value={f.departments.map((d) => d.name).join(" · ")}
                  />
                ) : null}
              </View>
            </Card>
          ))}
        </>
      )}

      {/* ── 03 · عضويّتك — session context, always available ── */}
      <SectionBar index={membershipIndex} title="عضويّتك" />
      <Card>
        <StatLine label="المؤسسة الحالية" value={institution.name} />
        <StatLine label="المعرّف على المنصّة" value={institution.slug} />
        <StatLine
          label="دورك في المؤسّسة"
          value={
            (user?.membershipRole ?? user?.role) != null
              ? ROLE_LABELS[(user?.membershipRole ?? user?.role)!] ?? "عضو"
              : "—"
          }
        />
        {user?.memberships && user.memberships.length > 0 ? (
          <StatLine
            label="عضويّاتك"
            value={latn(user.memberships.length)}
            hint={countAr(user.memberships.length, [
              "مؤسّسة واحدة",
              "مؤسّستان",
              "مؤسّسات",
              "مؤسّسة",
            ])}
          />
        ) : null}
      </Card>
    </PushFrame>
  );
}
