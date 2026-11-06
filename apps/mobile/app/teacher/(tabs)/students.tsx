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
import Animated from "react-native-reanimated";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen, PageHeader } from "@/components/ui/screen";
import { BidiText } from "@/components/ui/text";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { sp } from "@/design/tokens";
import { humanizeError } from "@/lib/errors";
import { haptics } from "@/haptics";
import { useStaggerEntrance } from "@/motion";
import { arCount, OfferingPicker, OfferingRoster, useTeacherOfferings } from "@/features/teacher/components";

export default function TeacherStudents() {
  const offs = useTeacherOfferings();
  const offerings = offs.data ?? [];
  const [offeringId, setOfferingId] = useState<string>("");
  const effectiveId = offeringId || offerings[0]?.id || "";
  const offering = offerings.find((o) => o.id === effectiveId) ?? null;
  const headerReady = !offs.isLoading && !offs.isError && offerings.length > 0 && effectiveId !== "";
  const entering = useStaggerEntrance({ base: 40, step: 60 });

  return (
    <Screen scroll={false} padded={false}>
      <AppTopBar alertsPath="/teacher/alerts" />
      {/* T-50 (review-3 P0-3/P0-5): staggered header entrance + selection
          haptics on the offering picker; the true-empty offering case is
          the kit EmptyState (library room), not a bare Card. */}
      <Animated.View entering={entering(0)} style={{ paddingHorizontal: sp[20], gap: sp[16] }}>
        <PageHeader title="قائمة الطلاب" kicker="جميع الطلاب المسجَّلين في مقرّراتك." />
        {offs.isLoading ? (
          <SkeletonList rows={4} />
        ) : offs.isError ? (
          <ErrorState message={humanizeError(offs.error)} onRetry={() => offs.refetch()} />
        ) : offerings.length === 0 ? (
          <EmptyState fill room="library" title="لم تُسند إليك مقرّرات بعد" />
        ) : (
          <>
            <OfferingPicker
              offerings={offerings}
              value={effectiveId}
              onChange={(id) => {
                haptics.selection();
                setOfferingId(id);
              }}
              label="المقرّر"
            />
            {offering ? (
              <BidiText variant="sm" color="muted">
                {`${offering.course.name} · ${offering.course.code}${
                  offering.studentsCount !== undefined
                    ? ` · ${arCount(offering.studentsCount, ["طالب واحد", "طالبان", "طلاب", "طالباً"])}`
                    : ""
                }`}
              </BidiText>
            ) : null}
          </>
        )}
      </Animated.View>
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
