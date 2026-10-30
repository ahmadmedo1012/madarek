/**
 * (tabs)/students — قائمة الطلاب. Web parity: StudentsListPage (the
 * offering picker header + the roster table). The roster card itself is
 * the shared OfferingRoster (also used by students/[offeringId]).
 */
import { RoleTabFrame } from "@/components/shell/TabFrame";

import { useState } from "react";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen, PageHeader } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Card } from "@/components/ui/surfaces";
import { arCount, OfferingPicker, OfferingRoster, useTeacherOfferings } from "@/features/teacher/components";

function TeacherStudents() {
  const offs = useTeacherOfferings();
  const offerings = offs.data ?? [];
  const [offeringId, setOfferingId] = useState<string>("");
  const effectiveId = offeringId || offerings[0]?.id || "";
  const offering = offerings.find((o) => o.id === effectiveId) ?? null;

  return (
    <Screen scroll>
      <AppTopBar alertsPath="/teacher/alerts" />
      <PageHeader title="قائمة الطلاب" kicker="جميع الطلاب المسجَّلين في مقرّراتك." />
      {offs.isLoading ? (
        <T variant="body" color="muted">جارٍ تحميل مقرّراتك…</T>
      ) : offs.isError ? (
        <Card>
          <T variant="body" color="danger">تعذَّر تحميل مقرّراتك</T>
          <T variant="sm" color="muted">
            {(offs.error as Error).message} — أعد المحاولة من ملفك أو اسحب للتحديث.
          </T>
        </Card>
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
          {effectiveId !== "" ? (
            <OfferingRoster
              offeringId={effectiveId}
              offeringName={offering ? `${offering.course.name} (${offering.course.code})` : null}
            />
          ) : null}
        </>
      )}
    </Screen>
  );
}


export default function TeacherStudentsTabbed() {
  return (
    <RoleTabFrame role="TEACHER">
      <TeacherStudents />
    </RoleTabFrame>
  );
}
