/**
 * students/[offeringId] — the deep-linked roster for one offering (the
 * dashboard/profile «مقرّراتي» rows land here). Same shared OfferingRoster
 * the (tabs)/students screen renders, pinned to the param's offering.
 */
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { StackHeader } from "@/components/shell/AppTopBar";
import { teacherApi, type TeacherOffering } from "@/api/teacher";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { useQuery } from "@tanstack/react-query";
import { T } from "@/components/ui/text";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/surfaces";
import { SkeletonList } from "@/components/ui/states";
import { OfferingRoster } from "@/features/teacher/components";

export default function OfferingStudents() {
  const { offeringId } = useLocalSearchParams<{ offeringId: string }>();
  const scope = useInstitutionScope();
  const offs = useQuery({
    queryKey: ["teacher", "offerings", scope],
    queryFn: () => teacherApi.offerings(),
  });
  const offering = ((offs.data ?? []).find((o) => o.id === offeringId) ?? null) as TeacherOffering | null;
  const title = offering ? `طلاب ${offering.course.name}` : "طلاب المقرّر";

  return (
    <Screen scroll>
      <StackHeader title={title} kicker={offering ? `${offering.course.code} · ${offering.term}` : undefined} />
      <View style={{ gap: 8 }}>
        {offering ? (
          <T variant="sm" color="muted">
            {offering.course.name} ({offering.course.code} · {offering.term})
          </T>
        ) : null}
        {offeringId === undefined || offeringId === "" ? (
          <Card>
            <T variant="body" color="muted">المقرّر غير موجود</T>
            <T variant="sm" color="muted">ربما حُذف هذا العرض أو أن الرابط غير صحيح.</T>
          </Card>
        ) : offs.isLoading ? (
          <SkeletonList rows={5} />
        ) : (
          <OfferingRoster
            offeringId={offeringId}
            offeringName={offering ? `${offering.course.name} (${offering.course.code})` : null}
          />
        )}
      </View>
    </Screen>
  );
}
