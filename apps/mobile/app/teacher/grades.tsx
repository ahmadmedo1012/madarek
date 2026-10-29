/**
 * grades — درجات الطلاب. Web parity: GradesPage (the per-offering read
 * table + SemesterGradeEntry: kind picker + shared max/weight scale +
 * per-student score/feedback drafts + the batch «حفظ الدرجات» upsert).
 */
import { useEffect, useMemo, useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StackHeader } from "@/components/shell/AppTopBar";
import { teacherApi } from "@/api/teacher";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { latn, pct } from "@/lib/format";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Screen, PageHeader, SectionBar } from "@/components/ui/screen";
import { Card } from "@/components/ui/surfaces";
import { LedgerRow, RowList } from "@/components/ui/data";
import { Button } from "@/components/ui/pressables";
import { Field, SelectField } from "@/components/ui/fields";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import {
  GRADE_KINDS,
  GRADE_KIND_LABEL,
  OfferingPicker,
  gradeBand,
  toRosterEntry,
  useTeacherOfferings,
} from "@/features/teacher/components";

/** Wire shape of GET /offerings/:id/grades (offerings.routes.ts). */
type GradeRow = {
  studentId: string;
  kind: string;
  score: number | null;
  maxScore: number | null;
  weight?: number | null;
  feedback?: string | null;
};

type Draft = { score: string; feedback: string };

export default function Grades() {
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const offs = useTeacherOfferings();
  const offerings = offs.data ?? [];
  const [offeringId, setOfferingId] = useState<string>("");
  const effectiveId = offeringId || offerings[0]?.id || "";

  const roster = useQuery({
    queryKey: ["teacher", "offering", effectiveId, "students", scope],
    queryFn: () => teacherApi.students(effectiveId),
    enabled: effectiveId !== "",
  });
  const existing = useQuery({
    queryKey: ["teacher", "offering", effectiveId, "grades", scope],
    queryFn: () => teacherApi.grades(effectiveId),
    enabled: effectiveId !== "",
  });

  const [kind, setKind] = useState<string>("HOMEWORK");
  const [maxScore, setMaxScore] = useState("100");
  const [weight, setWeight] = useState("10");
  const [scaleTouched, setScaleTouched] = useState(false);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const rows = useMemo(() => (roster.data ?? []).map(toRosterEntry), [roster.data]);
  const gradeRows = (existing.data ?? []) as unknown as GradeRow[];

  const existingByKind = useMemo(() => {
    const m = new Map<string, GradeRow[]>();
    for (const g of gradeRows) {
      const bucket = m.get(g.kind);
      if (bucket) bucket.push(g);
      else m.set(g.kind, [g]);
    }
    return m;
  }, [gradeRows]);

  const existingByStudent = useMemo(() => {
    const m = new Map<string, GradeRow>();
    for (const g of existingByKind.get(kind) ?? []) m.set(g.studentId, g);
    return m;
  }, [existingByKind, kind]);

  /* Scale adoption: an untouched scale follows the stored rows of the
   * picked kind (the web SemesterGradeEntry contract). */
  useEffect(() => {
    if (scaleTouched) return;
    const stored = existingByKind.get(kind);
    if (stored && stored.length > 0 && stored[0]) {
      if (stored[0].maxScore !== null) setMaxScore(String(stored[0].maxScore));
      if (stored[0].weight !== null && stored[0].weight !== undefined) setWeight(String(stored[0].weight));
    }
  }, [kind, existingByKind, scaleTouched]);

  const draftKey = (studentId: string) => `${kind}:${studentId}`;

  const dirtyRows = rows.filter((r) => {
    const d = drafts[draftKey(r.id)];
    return d !== undefined && (d.score.trim() !== "" || d.feedback.trim() !== "");
  });

  const save = useMutation({
    mutationFn: async () => {
      const mx = Number(maxScore);
      const wt = Number(weight);
      if (maxScore.trim() === "" || Number.isNaN(mx) || !Number.isInteger(mx) || mx < 1 || mx > 100) {
        throw new Error("الدرجة العظمى عدد صحيح بين 1 و100.");
      }
      if (weight.trim() === "" || Number.isNaN(wt) || !Number.isInteger(wt) || wt < 0 || wt > 100) {
        throw new Error("الوزن عدد صحيح بين 0 و100.");
      }
      if (dirtyRows.length === 0) {
        throw new Error("أدخل درجة واحدة على الأقل — الصفوف الفارغة لا تُرسَل ولا تمسّ الدرجات المسجَّلة.");
      }
      if (dirtyRows.length > 200) {
        throw new Error("الحدّ الأقصى 200 درجة في الحفظة الواحدة — احفظ على دفعات.");
      }
      for (const r of dirtyRows) {
        const d = drafts[draftKey(r.id)]!;
        const value = Number(d.score);
        if (d.score.trim() === "" || Number.isNaN(value)) throw new Error("أدخل درجة صحيحة.");
        if (value < 0) throw new Error("لا يمكن أن تكون الدرجة سالبة.");
        if (value > mx) throw new Error(`الدرجة يجب ألّا تتجاوز ${latn(mx)}.`);
      }
      return teacherApi.upsertGrades(effectiveId, dirtyRows.map((r) => {
        const d = drafts[draftKey(r.id)]!;
        return {
          studentId: r.id,
          kind,
          score: Number(d.score),
          maxScore: mx,
          weight: wt,
          feedback: d.feedback.trim() || undefined,
        };
      }));
    },
    onSuccess: () => {
      setDrafts({});
      setScaleTouched(false);
      setFormError(null);
      qc.invalidateQueries({ queryKey: ["teacher"] });
      toast.success("حُفظت الدرجات وستظهر لطلاب المقرّر فوراً.", "تمّ الحفظ");
    },
    onError: (e) => setFormError((e as Error).message),
  });

  return (
    <Screen scroll>
      <StackHeader title="درجات الطلاب" />
      <PageHeader title="درجات الطلاب" kicker="نظرة على متوسّط درجات طلاب المقرّر الحاليّ." />
      {offs.isLoading ? (
        <SkeletonList rows={5} />
      ) : offs.isError ? (
        <ErrorState message={(offs.error as Error).message} onRetry={() => offs.refetch()} />
      ) : offerings.length === 0 ? (
        <EmptyState title="اختر مقرّراً" message="حدّد أحد مقرّراتك لعرض درجات طلابه." />
      ) : (
        <>
          <OfferingPicker offerings={offerings} value={effectiveId} onChange={setOfferingId} label="المقرّر" />

          {/* Read table — name, universityId, avg, attendance, band. */}
          <SectionBar index={1} title="الدرجات" />
          {roster.isLoading ? (
            <SkeletonList rows={4} />
          ) : roster.isError ? (
            <ErrorState message={(roster.error as Error).message} onRetry={() => roster.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState title="لا يوجد طلاب" message="لا توجد تسجيلات في هذا المقرّر بعد." />
          ) : (
            <RowList>
              {rows.map((r, i) => {
                const band = r.gradePct !== null ? gradeBand(r.gradePct) : null;
                return (
                  <LedgerRow key={r.id} last={i === rows.length - 1} accessibilityLabel={`درجات ${r.name}`}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                      <View style={{ flex: 1 }}>
                        <T variant="body" weight="medium" numberOfLines={1}>
                          {r.name}
                        </T>
                        <T variant="xs" color="muted">
                          {r.universityId}
                        </T>
                      </View>
                      <T variant="body" weight="bold">
                        {r.gradePct !== null ? pct(r.gradePct) : "—"}
                      </T>
                      {band ? <T variant="sm">{band.label}</T> : null}
                    </View>
                    <T variant="xs" color="muted">
                      الحضور {r.attendancePct !== null ? pct(r.attendancePct) : "—"}
                    </T>
                  </LedgerRow>
                );
              })}
            </RowList>
          )}

          {/* إدخال الدرجات الفصليّة — the batch write half. */}
          <SectionBar index={2} title="إدخال الدرجات الفصليّة" />
          {effectiveId === "" || rows.length === 0 ? (
            <Card>
              <T variant="sm" color="muted">
                سجّل درجة كل طالب في التقييم المحدَّد — الصفوف الفارغة لا تُرسَل، والدرجات المسجَّلة مسبقاً تظهر معبَّأة.
              </T>
            </Card>
          ) : (
            <Card>
              <SelectField
                label="نوع التقييم"
                value={{ id: kind, label: GRADE_KIND_LABEL[kind] ?? kind }}
                options={GRADE_KINDS.map((k) => ({ id: k, label: GRADE_KIND_LABEL[k] }))}
                onSelect={(id) => {
                  setKind(id);
                  setFormError(null);
                }}
                sheetTitle="نوع التقييم"
              />
              <Field
                label="الدرجة العظمى"
                value={maxScore}
                onChangeText={(v) => {
                  setMaxScore(v);
                  setScaleTouched(true);
                }}
                hint="بين 1 و100 — تعتمد من الدرجات المسجَّلة لهذا النوع"
                keyboardType="number-pad"
                accessibilityLabel="الدرجة العظمى"
              />
              <Field
                label="الوزن (% من الدرجات)"
                value={weight}
                onChangeText={(v) => {
                  setWeight(v);
                  setScaleTouched(true);
                }}
                hint="بين 0 و100"
                keyboardType="number-pad"
                accessibilityLabel="الوزن"
              />

              <View style={{ gap: sp[8], paddingTop: sp[8] }}>
                {rows.map((r) => {
                  const d = drafts[draftKey(r.id)];
                  const stored = existingByStudent.get(r.id);
                  const scoreValue = d ? d.score : stored && stored.score !== null ? String(stored.score) : "";
                  const feedbackValue = d ? d.feedback : stored?.feedback ?? "";
                  return (
                    <View key={r.id} style={{ gap: sp[6] }}>
                      <T variant="sm" weight="medium">
                        {r.name}{" "}
                        <T variant="xs" color="muted">
                          {r.universityId}
                        </T>
                      </T>
                      <Field
                        label={`الدرجة (من 0 إلى ${maxScore})`}
                        value={scoreValue}
                        keyboardType="number-pad"
                        onChangeText={(v) =>
                          setDrafts((m) => ({
                            ...m,
                            [draftKey(r.id)]: { score: v, feedback: feedbackValue },
                          }))
                        }
                        accessibilityLabel={`درجة ${r.name}`}
                      />
                      <Field
                        label="ملاحظات للطالب (اختياري)"
                        value={feedbackValue}
                        onChangeText={(v) =>
                          setDrafts((m) => ({
                            ...m,
                            [draftKey(r.id)]: { score: scoreValue, feedback: v },
                          }))
                        }
                        placeholder="ملاحظة قصيرة تصل الطالب مع الدرجة…"
                        accessibilityLabel={`ملاحظات ${r.name}`}
                      />
                    </View>
                  );
                })}
              </View>

              {formError ? (
                <T variant="sm" color="danger" style={{ paddingTop: sp[8] }}>
                  {formError}
                </T>
              ) : null}
              <Button
                label="حفظ الدرجات"
                kind="accent"
                loading={save.isPending}
                onPress={() => {
                  setFormError(null);
                  save.mutate();
                }}
              />
            </Card>
          )}
        </>
      )}
    </Screen>
  );
}
