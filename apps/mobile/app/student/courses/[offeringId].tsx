/**
 * /student/courses/[offeringId] — تفاصيل المقرّر (web CourseDetailPage
 * parity): نظرة عامة (description, teacher, credits, room, weekly
 * schedule), المحاضرات (completed badges + checkpoint counts),
 * المواد (authenticated PDF viewer route), التكاليف (dueLabel chips +
 * the «تسليم» sheet — teacherApi.submitAssignment).
 */
import { View } from "react-native";
import { useMemo, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Send } from "lucide-react-native";
import { learningApi } from "@/api/learning";
import type { Assignment, Material } from "@/api/types";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T, MonoLabel } from "@/components/ui/text";
import { SectionBar } from "@/components/ui/screen";
import { Badge, Card } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { LedgerRow, ProgressBar, RowList, StatLine } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { dayName, dueLabel, latn, pct, sizeLabel } from "@/lib/format";
import { countAr } from "@/features/student/more";
import {
  AssignSubmitSheet,
  CourseWell,
  PushFrame,
  mmss,
  openMaterial,
  type SubmitTarget,
} from "@/features/student/components";

const MATERIAL_TYPE_LABEL: Record<string, string> = {
  PDF: "PDF",
  PPT: "PPT",
  DOC: "DOC",
  ZIP: "ZIP",
  VIDEO: "فيديو",
  IMAGE: "صورة",
  OTHER: "ملف",
};

function materialTypeLabel(type: string): string {
  return MATERIAL_TYPE_LABEL[type] ?? type;
}

const ASSIGNMENT_KIND_LABEL: Record<string, string> = {
  HOMEWORK: "واجب",
  QUIZ: "اختبار قصير",
  PROJECT: "مشروع",
  EXAM: "اختبار",
};

export default function CourseDetailScreen() {
  const { offeringId } = useLocalSearchParams<{ offeringId: string }>();
  const router = useRouter();
  const scope = useInstitutionScope();

  const full = useQuery({
    queryKey: ["offerings", offeringId, "full", scope],
    queryFn: () => learningApi.offeringFull(offeringId),
    enabled: !!offeringId,
  });

  const [submitTarget, setSubmitTarget] = useState<SubmitTarget | null>(null);

  const lectures = useMemo(
    () => [...(full.data?.lectures ?? [])].sort((a, b) => a.ordinal - b.ordinal),
    [full.data],
  );
  const materials = full.data?.materials ?? [];
  const assignments = useMemo(
    () =>
      [...(full.data?.assignments ?? [])].sort((a, b) => {
        const at = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        const bt = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
        return at - bt;
      }),
    [full.data],
  );
  const schedule = useMemo(
    () => [...(full.data?.schedule ?? [])].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
    [full.data],
  );

  const course = full.data?.course;
  const teacher = full.data?.teacher;
  const watchedCount = lectures.filter((l) => l.watchEvents?.[0]?.completed).length;
  const lecProgress = lectures.length > 0 ? Math.round((watchedCount / lectures.length) * 100) : 0;

  return (
    <PushFrame
      title={course?.name ?? "تفاصيل المقرّر"}
      kicker={course?.code}
      refreshing={full.isFetching && !full.isLoading}
      onRefresh={() => full.refetch()}
    >
      {full.isLoading ? (
        <SkeletonList rows={6} rowHeight={72} />
      ) : full.isError || !full.data ? (
        <ErrorState message={(full.error as Error)?.message} onRetry={() => full.refetch()} />
      ) : (
        <>
          {/* نظرة عامة */}
          <View style={{ gap: sp[12] }}>
            <SectionBar index={1} title="نظرة عامة" />
            <Card style={{ gap: sp[8] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                <CourseWell emoji={course?.iconEmoji} color={course?.themeColor} size={44} />
                <View style={{ flex: 1, gap: 2 }}>
                  <T variant="bodyLg" weight="bold">
                    {course?.name}
                  </T>
                  <T variant="sm" color="muted">
                    {course?.department?.name ?? "قسم غير محدَّد"}
                    {course?.faculty ? ` · ${course.faculty.name}` : ""}
                  </T>
                </View>
              </View>
              {course?.description ? (
                <T variant="body" color="secondary">
                  {course.description}
                </T>
              ) : null}
              <StatLine
                label="الأستاذ"
                value={teacher ? `د. ${teacher.firstName} ${teacher.lastName}` : "—"}
              />
              <StatLine
                label="الساعات المعتمدة"
                value={
                  course?.credits
                    ? countAr(course.credits, ["ساعة معتمدة واحدة", "ساعتان معتمدتان", "ساعات معتمدة", "ساعة معتمدة"])
                    : "—"
                }
              />
              <StatLine label="القاعة" value={full.data.room ?? "قاعة تُحدَّد لاحقاً"} />
              <StatLine label="الفصل" value={full.data.term} />
            </Card>
          </View>

          {/* الجدول الأسبوعي */}
          <View style={{ gap: sp[8] }}>
            <SectionBar index={2} title="الجدول الأسبوعي" />
            {schedule.length === 0 ? (
              <T variant="sm" color="muted">
                لم يُنشَر جدول هذا المقرّر بعد.
              </T>
            ) : (
              <RowList>
                {schedule.map((s, i) => (
                  <LedgerRow key={s.id} last={i === schedule.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                      <MonoLabel>{`${s.startTime}–${s.endTime}`}</MonoLabel>
                      <T variant="body" weight="medium" style={{ flex: 1 }}>
                        {dayName(s.dayOfWeek)}
                      </T>
                    </View>
                    <T variant="sm" color="muted">
                      {s.room ?? full.data?.room ?? "قاعة تُحدَّد لاحقاً"}
                    </T>
                  </LedgerRow>
                ))}
              </RowList>
            )}
          </View>

          {/* المحاضرات */}
          <View style={{ gap: sp[8] }}>
            <SectionBar
              index={3}
              title="المحاضرات"
              action={
                lectures.length > 0 ? (
                  <T variant="xs" color="muted">{`${latn(watchedCount)}/${latn(lectures.length)}`}</T>
                ) : undefined
              }
            />
            <View style={{ gap: 4 }}>
              <ProgressBar ratio={lecProgress / 100} accent label={`تقدّمك في المنهج ${pct(lecProgress)}`} />
              <T variant="xs" color="muted">
                {`تقدّمك في المنهج ${pct(lecProgress)} · ${countAr(watchedCount, [
                  "محاضرة مكتملة",
                  "محاضرتان مكتملتان",
                  "محاضرات مكتملة",
                  "محاضرة مكتملة",
                ])} من ${latn(lectures.length)}`}
              </T>
            </View>
            {lectures.length === 0 ? (
              <T variant="sm" color="muted">
                لم تُرفع محاضرات بعد — سيضيفها الأستاذ تباعاً مع تقدّم الفصل.
              </T>
            ) : (
              <RowList>
                {lectures.map((lec, i) => {
                  const we = lec.watchEvents?.[0];
                  const completed = we?.completed ?? false;
                  const checkpoints = lec._count?.checkpoints ?? 0;
                  const answered = (lec as { answeredCheckpoints?: number }).answeredCheckpoints ?? 0;
                  const pending = Math.max(0, checkpoints - answered);
                  const watchedPct = we && we.totalSec > 0 ? Math.round((we.watchedSec / we.totalSec) * 100) : 0;
                  return (
                    <LedgerRow
                      key={lec.id}
                      last={i === lectures.length - 1}
                      accessibilityLabel={`محاضرة ${latn(lec.ordinal)}: ${lec.title}`}
                      onPress={() => router.push(`/student/lectures/${lec.id}` as never)}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                        <MonoLabel>{String(lec.ordinal).padStart(2, "0")}</MonoLabel>
                        <T variant="body" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
                          {lec.title}
                        </T>
                        {completed ? <Badge label="مكتملة" tone="mint" /> : null}
                      </View>
                      <T variant="sm" color="muted">
                        {`${lec.durationSec ? mmss(lec.durationSec) : "—"} · ${countAr(lec._count?.chapters ?? 0, [
                          "فصل واحد",
                          "فصلان",
                          "فصول",
                          "فصلاً",
                        ])} · ${countAr(checkpoints, [
                          "نقطة تفاعل واحدة",
                          "نقطتا تفاعل",
                          "نقاط تفاعل",
                          "نقطة تفاعل",
                        ])}`}
                      </T>
                      {!completed && watchedPct > 0 ? <Badge label={pct(watchedPct)} tone="copper" /> : null}
                      {pending > 0 ? <Badge label="نقاط تفاعل متبقية" tone="yellow" /> : null}
                    </LedgerRow>
                  );
                })}
              </RowList>
            )}
          </View>

          {/* المواد */}
          <View style={{ gap: sp[8] }}>
            <SectionBar index={4} title="المواد" />
            {materials.length === 0 ? (
              <T variant="sm" color="muted">
                الأستاذ لم يرفع مواد بعد — ستظهر هنا العروض والملفات فور نشرها.
              </T>
            ) : (
              <RowList>
                {materials.map((m, i) => (
                  <MaterialRowView key={m.id} m={m} last={i === materials.length - 1} />
                ))}
              </RowList>
            )}
          </View>

          {/* التكاليف */}
          <View style={{ gap: sp[8] }}>
            <SectionBar index={5} title="التكاليف" />
            <T variant="sm" color="muted">
              مواعيد التسليم ووزن كل تكليف في درجة المقرّر.
            </T>
            {assignments.length === 0 ? (
              <EmptyState
                title="لا توجد واجبات نشطة"
                message="حالياً لا شيء بانتظارك في هذا المقرر. وقت جيد لمراجعة المحاضرات السابقة."
              />
            ) : (
              <RowList>
                {assignments.map((a, i) => (
                  <AssignmentRowView
                    key={a.id}
                    a={a}
                    last={i === assignments.length - 1}
                    onSubmit={() =>
                      setSubmitTarget({
                        id: a.id,
                        title: a.title,
                        dueAt: a.dueAt,
                        type: a.type,
                        courseName: course?.name ?? undefined,
                      })
                    }
                  />
                ))}
              </RowList>
            )}
          </View>
        </>
      )}

      {submitTarget ? (
        <AssignSubmitSheet
          open={!!submitTarget}
          onClose={() => setSubmitTarget(null)}
          offeringId={offeringId}
          assignment={submitTarget}
        />
      ) : null}
    </PushFrame>
  );
}

function MaterialRowView({ m, last }: { m: Material; last: boolean }) {
  return (
    <LedgerRow last={last} accessibilityLabel={`مادة: ${m.name}`} onPress={() => openMaterial(m.url, m.name)}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
        <T variant="body" weight="bold" style={{ flex: 1 }} numberOfLines={1}>
          {m.name}
        </T>
        <Badge label={materialTypeLabel(m.type)} tone="grey" mono />
      </View>
      <T variant="sm" color="muted">
        {`${materialTypeLabel(m.type)} · ${sizeLabel(m.sizeBytes)}`}
      </T>
    </LedgerRow>
  );
}

function AssignmentRowView({ a, last, onSubmit }: { a: Assignment; last: boolean; onSubmit: () => void }) {
  const p = usePalette();
  const due = dueLabel(a.dueAt);
  return (
    <LedgerRow last={last} accessibilityLabel={`تكليف: ${a.title}`}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="bold" numberOfLines={1}>
            {a.title}
          </T>
          <T variant="sm" color="muted">
            {`${ASSIGNMENT_KIND_LABEL[a.type] ?? a.type}${a.weight != null ? ` · الوزن ${latn(Math.round(a.weight))}%` : ""}`}
          </T>
        </View>
        <Badge label={due.text} tone={due.overdue ? "rose" : "yellow"} />
      </View>
      <View style={{ flexDirection: "row", gap: sp[8], alignSelf: "flex-start" }}>
        <Button
          label="تسليم"
          kind="accent"
          small
          onPress={onSubmit}
          icon={<Send size={14} color={p.accentFg} />}
          accessibilityLabel={`تسليم ${a.title}`}
        />
      </View>
    </LedgerRow>
  );
}
