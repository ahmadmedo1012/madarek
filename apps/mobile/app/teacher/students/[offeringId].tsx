/**
 * students/[offeringId] — the deep-linked roster for one offering (the
 * dashboard/profile «مقرّراتي» rows land here). Same shared OfferingRoster
 * the (tabs)/students screen renders, pinned to the param's offering.
 * The DataList is the scroller — fixed header above, `flex: 1` list below.
 */
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { StackHeader } from "@/components/shell/AppTopBar";
import { teacherApi } from "@/api/teacher";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { humanizeError } from "@/lib/errors";
import { T } from "@/components/ui/text";
import { Screen } from "@/components/ui/screen";
import { Card } from "@/components/ui/surfaces";
import { ErrorState, SkeletonList } from "@/components/ui/states";
import { sp } from "@/design/tokens";
import { OfferingRoster } from "@/features/teacher/components";

export default function OfferingStudents() {
  const { offeringId } = useLocalSearchParams<{ offeringId: string }>();
  const scope = useInstitutionScope();
  const offs = useQuery({
    queryKey: ["teacher", "offerings", scope],
    queryFn: () => teacherApi.offerings(),
  });
  const offering = (offs.data ?? []).find((o) => o.id === offeringId) ?? null;
  const title = offering ? `طلاب ${offering.course.name}` : "طلاب المقرّر";

  if (offeringId === undefined || offeringId === "") {
    return (
      <Screen scroll>
        <StackHeader title={title} />
        <Card>
          <T variant="body" color="muted">المقرّر غير موجود</T>
          <T variant="sm" color="muted">ربما حُذف هذا العرض أو أن الرابط غير صحيح.</T>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader
        title={title}
        kicker={offering ? `${offering.course.code} · ${offering.term}` : undefined}
      />
      <View style={{ paddingHorizontal: sp[20], gap: sp[12] }}>
        {offs.isLoading ? (
          <SkeletonList rows={4} />
        ) : offs.isError ? (
          <ErrorState message={humanizeError(offs.error)} onRetry={() => offs.refetch()} />
        ) : offering ? (
          <T variant="sm" color="muted">
            {offering.course.name} ({offering.course.code} · {offering.term})
          </T>
        ) : null}
      </View>
      {offs.isLoading || offs.isError ? null : (
        <View style={{ flex: 1 }}>
          <OfferingRoster
            offeringId={offeringId}
            offeringName={offering ? `${offering.course.name} (${offering.course.code})` : null}
          />
        </View>
      )}
    </Screen>
  );
}
