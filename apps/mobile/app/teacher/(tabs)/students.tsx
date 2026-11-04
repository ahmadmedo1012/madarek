/**
 * (tabs)/students — قائمة الطلاب. Web parity: StudentsListPage (the
 * offering picker header + the roster). The roster itself is the shared
 * OfferingRoster: searchable DataList + risk FilterSheet + per-student
 * AppSheet (profile + quick grade).
 *
 * Layout: the DataList IS the scroller — mount it in a `flex: 1` slot
 * under the fixed header, never inside `<Screen scroll>`.
 */
import { useState } from "react";
import { View } from "react-native";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen, PageHeader } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Card } from "@/components/ui/surfaces";
import { ErrorState, SkeletonList } from "@/components/ui/states";
import { sp } from "@/design/tokens";
import { humanizeError } from "@/lib/errors";
import { arCount, OfferingPicker, OfferingRoster, useTeacherOfferings } from "@/features/teacher/components";

export default function TeacherStudents() {
  const offs = useTeacherOfferings();
  const offerings = offs.data ?? [];
  const [offeringId, setOfferingId] = useState<string>("");
  const effectiveId = offeringId || offerings[0]?.id || "";
  const offering = offerings.find((o) => o.id === effectiveId) ?? null;
  const headerReady = !offs.isLoading && !offs.isError && offerings.length > 0 && effectiveId !== "";

  return (
    <Screen scroll={false} padded={false}>
      <AppTopBar alertsPath="/teacher/alerts" />
      <View style={{ paddingHorizontal: sp[20], gap: sp[16] }}>
        <PageHeader title="قائمة الطلاب" kicker="جميع الطلاب المسجَّلين في مقرّراتك." />
        {offs.isLoading ? (
          <SkeletonList rows={4} />
        ) : offs.isError ? (
          <ErrorState message={humanizeError(offs.error)} onRetry={() => offs.refetch()} />
        ) : offerings.length === 0 ? (
          <Card>
            <T variant="body" weight="bold">لم تُسند إليك مقرّرات بعد</T>
            <T variant="sm" color="muted">
              ستظهر مقرّراتك هنا فور إسنادها من قِبَل المسجل العام.
            </T>
          </Card>
        ) : (
          <>
            <OfferingPicker
              offerings={offerings}
              value={effectiveId}
              onChange={setOfferingId}
              label="المقرّر"
            />
            {offering ? (
              <T variant="sm" color="muted">
                {offering.course.name} · {offering.course.code}
                {offering.studentsCount !== undefined
                  ? ` · ${arCount(offering.studentsCount, ["طالب واحد", "طالبان", "طلاب", "طالباً"])}`
                  : ""}
              </T>
            ) : null}
          </>
        )}
      </View>
      {headerReady ? (
        <View style={{ flex: 1 }}>
          <OfferingRoster
            offeringId={effectiveId}
            offeringName={offering ? `${offering.course.name} (${offering.course.code})` : null}
          />
        </View>
      ) : null}
    </Screen>
  );
}
