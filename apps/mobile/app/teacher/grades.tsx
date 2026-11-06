/**
 * grades — درجات الطلاب (FAST grading flow). Web parity: GradesPage /
 * SemesterGradeEntry, recomposed mobile-first:
 *
 *   · نوع التقييم as an inline Segmented (the "rubric"), not a sheet;
 *   · one student at a time: tap a roster row (or swipe the grading
 *     panel) to move between students — no 200-Field wall of inputs;
 *   · per-student save: haptics.notify('success') + optimistic cache
 *     merge + auto-advance to the next student;
 *   · the roster read table is a DataList (FlashList v2) — big rosters
 *     recycle instead of mounting every row;
 *   · scale adoption (maxScore/weight follow the stored rows of the
 *     picked kind until the teacher touches them) preserved from the web.
 */
import { useCallback, useMemo, useRef, useState } from "react";
import { PanResponder, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { StackHeader } from "@/components/shell/AppTopBar";
import { teacherApi } from "@/api/teacher";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { humanizeError } from "@/lib/errors";
import { haptics } from "@/haptics";
import { latn, pct } from "@/lib/format";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Screen, PageHeader, SectionBar } from "@/components/ui/screen";
import { Card } from "@/components/ui/surfaces";
import { DataList, LedgerRow, makeRow } from "@/components/ui/data";
import { Button } from "@/components/ui/pressables";
import { Field, Segmented } from "@/components/ui/fields";
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
import { isDirtyDraft, nextIndex, parseGradeRows } from "@/features/teacher/wire";

type Draft = { score: string; feedback: string };

/** Swipe threshold (px) before a horizontal drag flips the student. */
const SWIPE_DX = 48;

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
  const [focusIndex, setFocusIndex] = useState(0);

  const rows = useMemo(() => (roster.data ?? []).map(toRosterEntry), [roster.data]);
  const gradeRows = useMemo(() => parseGradeRows(existing.data), [existing.data]);

  const existingByKind = useMemo(() => {
    const m = new Map<string, typeof gradeRows>();
    for (const g of gradeRows) {
      const bucket = m.get(g.kind);
      if (bucket) bucket.push(g);
      else m.set(g.kind, [g]);
    }
    return m;
  }, [gradeRows]);

  const existingByStudent = useMemo(() => {
    const m = new Map<string, (typeof gradeRows)[number]>();
    for (const g of existingByKind.get(kind) ?? []) m.set(g.studentId, g);
    return m;
  }, [existingByKind, kind]);

  /* Scale adoption: an untouched scale follows the stored rows of the
   * picked kind (the web SemesterGradeEntry contract) — the React-blessed
   * "adjust state during render". Re-adopts when a refetch changes the
   * stored scale while the user hasn't touched it. */
  const storedRow = existingByKind.get(kind)?.[0];
  const storedSig = `${kind}:${storedRow?.maxScore ?? ""}:${storedRow?.weight ?? ""}`;
  const [adoptedSig, setAdoptedSig] = useState<string | null>(null);
  if (!scaleTouched && storedRow && adoptedSig !== storedSig) {
    if (storedRow.maxScore !== null) setMaxScore(String(storedRow.maxScore));
    if (storedRow.weight !== null && storedRow.weight !== undefined) setWeight(String(storedRow.weight));
    setAdoptedSig(storedSig);
  }

  const draftKey = (studentId: string) => `${kind}:${studentId}`;
  const focus = rows.length > 0 ? rows[Math.min(focusIndex, rows.length - 1)] : null;
  const focusDraft = focus ? (drafts[draftKey(focus.id)] ?? { score: "", feedback: "" }) : null;
  const focusStored = focus ? (existingByStudent.get(focus.id) ?? null) : null;
  const focusDirty = focus ? isDirtyDraft(drafts[draftKey(focus.id)]) : false;

  const moveTo = (delta: number) => {
    if (rows.length === 0) return;
    setFocusIndex(nextIndex(focusIndex, rows.length, delta));
  };

  /* Swipe-next between students (RTL: a leftward drag = التالي).
   * Built on RN PanResponder — a static react-native-gesture-handler
   * import would crash the jest render net (RNGH v3 native install task;
   * see docs/mobile/foundations/sheets.md §lazy-native-graph). */
  const swipe = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_e, g) =>
          Math.abs(g.dx) > SWIPE_DX && Math.abs(g.dy) < Math.abs(g.dx) / 2,
        onPanResponderRelease: (_e, g) => {
          if (g.dx <= -SWIPE_DX) {
            haptics.selection();
            moveTo(1);
          } else if (g.dx >= SWIPE_DX) {
            haptics.selection();
            moveTo(-1);
          }
        },
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [focusIndex, rows.length],
  );

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
      if (!focus || !focusDraft) {
        throw new Error("اختر طالبًا من القائمة أولًا.");
      }
      if (!focusDirty) {
        throw new Error("أدخل درجة أو ملاحظة لهذا الطالب قبل الحفظ.");
      }
      const value = Number(focusDraft.score);
      if (focusDraft.score.trim() === "" || Number.isNaN(value)) throw new Error("أدخل درجة صحيحة.");
      if (value < 0) throw new Error("لا يمكن أن تكون الدرجة سالبة.");
      if (value > mx) throw new Error(`الدرجة يجب ألّا تتجاوز ${latn(mx)}.`);
      return teacherApi.upsertGrades(effectiveId, [
        {
          studentId: focus.id,
          kind,
          score: value,
          maxScore: mx,
          weight: wt,
          feedback: focusDraft.feedback.trim() || undefined,
        },
      ]);
    },
    onSuccess: () => {
      haptics.notify("success");
      if (focus) {
        // Optimistic merge into the grades cache (server reconcile follows
        // via invalidation — the UI never waits for it).
        const saved = {
          studentId: focus.id,
          kind,
          score: Number(focusDraft?.score ?? 0),
          maxScore: Number(maxScore),
          weight: Number(weight),
          feedback: focusDraft?.feedback.trim() || null,
        };
        qc.setQueryData<unknown[]>(["teacher", "offering", effectiveId, "grades", scope], (old) => {
          const rest = (old ?? []).filter(
            (r) =>
              !(
                typeof r === "object" &&
                r !== null &&
                (r as { studentId?: unknown }).studentId === focus.id &&
                (r as { kind?: unknown }).kind === kind
              ),
          );
          return [...rest, saved];
        });
        setDrafts((m) => {
          const next = { ...m };
          delete next[draftKey(focus.id)];
          return next;
        });
      }
      setScaleTouched(false);
      setFormError(null);
      qc.invalidateQueries({ queryKey: ["teacher"] });
      toast.success("حُفظت الدرجة وستظهر للطالب فوراً.", "تمّ الحفظ");
      moveTo(1); // auto-advance: grade the next student.
    },
    onError: (e) => {
      haptics.notify("error");
      setFormError(humanizeError(e));
    },
  });

  /* Stable handlers: the DataList row is a memoized makeRow — fresh
   * arrows per render would defeat its memo on every keystroke. */
  const rosterKeyExtractor = useCallback((r: { id: string }) => r.id, []);
  const onRosterFocus = useCallback((index: number) => {
    haptics.selection();
    setFocusIndex(index);
  }, []);
  const renderRow = useCallback(
    ({ item, index }: { item: (typeof rows)[number]; index: number }) => (
      <GradesRow
        item={item}
        active={index === Math.min(focusIndex, rows.length - 1)}
        stored={existingByStudent.get(item.id) ?? null}
        focusIndex={index}
        last={index === rows.length - 1}
        onFocus={onRosterFocus}
      />
    ),
    [focusIndex, rows.length, existingByStudent, onRosterFocus],
  );

  const headerReady = !offs.isLoading && !offs.isError && offerings.length > 0 && effectiveId !== "";

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title="درجات الطلاب" />
      <View style={{ paddingHorizontal: sp[20], gap: sp[12] }}>
        <PageHeader
          title="درجات الطلاب"
          kicker="صحِّح طالبًا بعد طالب — اسحب لانتقال التالي أو اختر من القائمة."
        />
        {offs.isLoading ? (
          <SkeletonList rows={4} />
        ) : offs.isError ? (
          <ErrorState message={humanizeError(offs.error)} onRetry={() => offs.refetch()} />
        ) : offerings.length === 0 ? (
          <EmptyState fill title="لا مقرّرات" message="حدّد أحد مقرّراتك لعرض درجات طلابه — ستظهر هنا فور إسناد مقرّر لك." />
        ) : (
          <OfferingPicker offerings={offerings} value={effectiveId} onChange={setOfferingId} label="المقرّر" />
        )}
      </View>

      {headerReady ? (
        <View style={{ flex: 1, gap: sp[12] }}>
          {/* التقييم + المقياس — the compact rubric. */}
          <View style={{ paddingHorizontal: sp[20], gap: sp[10] }}>
            <Segmented
              options={GRADE_KINDS.map((k) => ({ id: k, label: GRADE_KIND_LABEL[k] }))}
              selectedId={kind}
              onSelect={(id) => {
                setKind(id);
                setFormError(null);
                haptics.selection();
              }}
            />
            <View style={{ flexDirection: "row", gap: sp[8] }}>
              <View style={{ flex: 1 }}>
                <Field
                  label="الدرجة العظمى"
                  value={maxScore}
                  onChangeText={(v) => {
                    setMaxScore(v);
                    setScaleTouched(true);
                  }}
                  hint="1–100 — تُعتمد من المسجَّل لهذا النوع"
                  keyboardType="number-pad"
                  accessibilityLabel="الدرجة العظمى"
                />
              </View>
              <View style={{ flex: 1 }}>
                <Field
                  label="الوزن (%)"
                  value={weight}
                  onChangeText={(v) => {
                    setWeight(v);
                    setScaleTouched(true);
                  }}
                  hint="0–100"
                  keyboardType="number-pad"
                  accessibilityLabel="الوزن"
                />
              </View>
            </View>
          </View>

          {/* بطاقة التصحيح — one student at a time, swipeable. */}
          {rows.length === 0 ? null : (
            <View style={{ paddingHorizontal: sp[20] }}>
              <Card>
                <View {...swipe.panHandlers} style={{ gap: sp[10] }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                    <View style={{ flex: 1 }}>
                      <T variant="body" weight="bold" numberOfLines={1}>
                        {focus?.name ?? "—"}
                      </T>
                      <T variant="xs" color="muted">
                        {focus?.universityId ?? ""} · {latn(Math.min(focusIndex, rows.length - 1) + 1)} من {latn(rows.length)}
                        {focusDirty ? " · مسودّة غير محفوظة" : ""}
                      </T>
                    </View>
                    <Button label="السابق" kind="ghost" small onPress={() => { haptics.selection(); moveTo(-1); }} />
                    <Button label="التالي" kind="ghost" small onPress={() => { haptics.selection(); moveTo(1); }} />
                  </View>
                  {focusStored && !focusDirty ? (
                    <T variant="xs" color="muted">
                      المسجَّلة: {focusStored.score !== null ? `${latn(focusStored.score)} / ${latn(focusStored.maxScore ?? 0)}` : "—"}
                      {focusStored.feedback ? ` · «${focusStored.feedback}»` : ""}
                    </T>
                  ) : null}
                  <View style={{ flexDirection: "row", gap: sp[8] }}>
                    <View style={{ flex: 1 }}>
                      <Field
                        label={`الدرجة (من 0 إلى ${maxScore})`}
                        value={focusDraft?.score ?? ""}
                        keyboardType="number-pad"
                        onChangeText={(v) =>
                          focus &&
                          setDrafts((m) => ({
                            ...m,
                            [draftKey(focus.id)]: { score: v, feedback: focusDraft?.feedback ?? "" },
                          }))
                        }
                        accessibilityLabel={`درجة ${focus?.name ?? ""}`}
                      />
                    </View>
                  </View>
                  <Field
                    label="ملاحظات للطالب (اختياري)"
                    value={focusDraft?.feedback ?? ""}
                    onChangeText={(v) =>
                      focus &&
                      setDrafts((m) => ({
                        ...m,
                        [draftKey(focus.id)]: { score: focusDraft?.score ?? "", feedback: v },
                      }))
                    }
                    placeholder="ملاحظة قصيرة تصل الطالب مع الدرجة…"
                    accessibilityLabel={`ملاحظات ${focus?.name ?? ""}`}
                  />
                  {formError ? (
                    <T variant="sm" color="danger">
                      {formError}
                    </T>
                  ) : null}
                  <Button
                    label="حفظ والتالي"
                    kind="accent"
                    loading={save.isPending}
                    onPress={() => {
                      setFormError(null);
                      save.mutate();
                    }}
                  />
                  <T variant="xs" color="faint">
                    اسحب البطاقة يمينًا أو يسارًا للتنقّل بين الطلاب.
                  </T>
                </View>
              </Card>
            </View>
          )}

          {/* كشف الدرجات — the read table (DataList, recycles big rosters). */}
          {roster.isLoading ? (
            <SkeletonList rows={4} />
          ) : roster.isError ? (
            <ErrorState message={humanizeError(roster.error)} onRetry={() => roster.refetch()} />
          ) : rows.length === 0 ? (
            <EmptyState fill title="لا يوجد طلاب" message="لا توجد تسجيلات في هذا المقرّر بعد." />
          ) : (
            <DataList
              data={rows}
              renderItem={renderRow}
              keyExtractor={rosterKeyExtractor}
              emptyTitle="لا يوجد طلاب"
              emptyMessage="لا توجد تسجيلات في هذا المقرّر بعد."
              contentPadding={{ horizontal: 20, bottom: 24 }}
            />
          )}
        </View>
      ) : null}
    </Screen>
  );
}

/** One read-table row: name, universityId, avg, attendance, band + focus ring. */
const GradesRow = makeRow<
  { id: string; name: string; universityId: string; gradePct: number | null; attendancePct: number | null },
  { active: boolean; stored: { score: number | null; maxScore: number | null } | null; focusIndex: number; last: boolean; onFocus?: (index: number) => void }
>(({ item, active, stored, focusIndex, last, onFocus }) => {
  const band = item.gradePct !== null ? gradeBand(item.gradePct) : null;
  return (
    <LedgerRow
      last={last}
      onPress={onFocus ? () => onFocus(focusIndex) : undefined}
      accessibilityLabel={`درجات ${item.name}${active ? " — محدَّد للتصحيح" : ""}`}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
        <View style={{ flex: 1 }}>
          <T variant="body" weight={active ? "bold" : "medium"} numberOfLines={1}>
            {item.name}
          </T>
          <T variant="xs" color="muted">
            {item.universityId}
          </T>
        </View>
        {stored && stored.score !== null ? (
          <T variant="sm" weight="bold">
            {latn(stored.score)} / {latn(stored.maxScore ?? 0)}
          </T>
        ) : null}
        <T variant="body" weight="bold">
          {item.gradePct !== null ? pct(item.gradePct) : "—"}
        </T>
        {band ? <T variant="sm">{band.label}</T> : null}
      </View>
      <T variant="xs" color="muted">
        الحضور {item.attendancePct !== null ? pct(item.attendancePct) : "—"}
      </T>
    </LedgerRow>
  );
});
