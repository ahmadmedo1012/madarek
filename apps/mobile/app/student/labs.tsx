import { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FlaskConical, Microscope } from "lucide-react-native";
import { catalogApi } from "@/api/catalog";
import { studentApi, type LabSession } from "@/api/student";
import { ApiError } from "@/api/client";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { Badge, Card, SimulatedBadge, Sheet } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { Field } from "@/components/ui/fields";
import { LedgerRow, RowList } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { fromNow, latn, num } from "@/lib/format";
import { SectionNote, countAr } from "@/features/student/more";

type LabRow = Awaited<ReturnType<typeof catalogApi.labs>>[number];

/**
 * /student/labs — المعامل الافتراضية (web LabsPage parity, mobile-honest):
 * the lab directory with its experiments; starting an experiment records a
 * REAL session row (studentApi.recordLab) while the interactive operator
 * itself stays disclosed as under development.
 */
export default function LabsScreen() {
  const p = usePalette();
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const feed = useQuery({
    queryKey: ["labs", scope],
    queryFn: () => catalogApi.labs(),
    placeholderData: (p) => p,
  });
  const sessions = useQuery({
    queryKey: ["me", "lab-sessions", scope],
    queryFn: () => studentApi.labSessions(),
    placeholderData: (p) => p,
  });
  const rows = feed.data ?? [];

  const [labSheet, setLabSheet] = useState<LabRow | null>(null);
  const [expSheet, setExpSheet] = useState<{ lab: LabRow; name: string } | null>(null);

  const record = useMutation({
    mutationFn: ({ labId, name }: { labId: string; name: string }) => studentApi.recordLab(labId, name),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["me", "lab-sessions"] });
      toast.success("سُجّلت جلسة المعمل في سجلّك.", "تمّ تسجيل الجلسة");
      setExpSheet(null);
      setLabSheet(null);
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذَّر تسجيل الجلسة"),
  });

  return (
    <Screen scroll>
      <StackHeader title="المعامل الافتراضية" kicker="المعامل والتقنيات" />
      <SectionNote>
        تجارب علمية بدون الحاجة لمعدات حقيقية — سجّل جلستك في المعمل، والمشغّل التفاعلي قيد التطوير.
      </SectionNote>

      {sessions.data && sessions.data.length > 0 ? (
        <Card style={{ gap: sp[4] }}>
          <T variant="sm" weight="bold">
            جلساتك المسجّلة
          </T>
          <T variant="xs" color="muted">
            {countAr(sessions.data.length, ["جلسة واحدة", "جلستان", "جلسات", "جلسة"])} في سجلّك — أحدثها{" "}
            {fromNow(sessions.data[sessions.data.length - 1]?.createdAt ?? null)}.
          </T>
        </Card>
      ) : null}

      {feed.isLoading ? (
        <SkeletonList rows={3} rowHeight={80} />
      ) : feed.isError ? (
        <ErrorState message={(feed.error as Error).message} onRetry={() => feed.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon={<FlaskConical size={24} color={p.textFaint} />}
          title="لا معامل متاحة"
          message="لم تُسجّل معامل في دليل المنصّة بعد — ستظهر هنا فور إضافتها."
        />
      ) : (
        <RowList>
          {rows.map((lab, i) => (
            <LedgerRow
              key={lab.id}
              last={i === rows.length - 1}
              onPress={() => setLabSheet(lab)}
              accessibilityLabel={`معمل: ${lab.name}`}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                <Microscope size={18} color={p.accentInk} />
                <View style={{ flex: 1 }}>
                  <T variant="bodyLg" weight="bold">
                    {lab.name}
                  </T>
                </View>
                {lab.experiments && lab.experiments.length > 0 ? (
                  <Badge label={`${latn(lab.experiments.length)} تجربة`} tone="grey" />
                ) : null}
              </View>
              {lab.discipline ? (
                <T variant="sm" color="secondary">
                  {lab.discipline}
                </T>
              ) : null}
              {lab.description ? (
                <T variant="xs" color="muted" numberOfLines={2}>
                  {lab.description}
                </T>
              ) : null}
            </LedgerRow>
          ))}
        </RowList>
      )}

      {/* Lab detail sheet — the experiments list + honest disclosure. */}
      <Sheet open={!!labSheet} onClose={() => setLabSheet(null)} title={labSheet?.name ?? "معمل"}>
        <View style={{ gap: sp[12] }}>
          {labSheet?.discipline ? (
            <T variant="sm" color="secondary">
              {labSheet.discipline}
            </T>
          ) : null}
          {labSheet?.description ? (
            <T variant="body" color="secondary">
              {labSheet.description}
            </T>
          ) : null}

          <View style={{ gap: sp[6] }}>
            <T variant="sm" weight="bold">
              التجارب المتاحة
            </T>
            {labSheet?.experiments && labSheet.experiments.length > 0 ? (
              <RowList>
                {labSheet.experiments.map((exp, i) => (
                  <LedgerRow
                    key={exp.id}
                    last={i === labSheet.experiments!.length - 1}
                    accessibilityLabel={`تجربة: ${exp.name}`}
                  >
                    <T variant="body" weight="bold">
                      {exp.name}
                    </T>
                    <Button
                      label="بدء تجربة"
                      kind="ghost"
                      small
                      onPress={() => setExpSheet({ lab: labSheet, name: exp.name })}
                    />
                  </LedgerRow>
                ))}
              </RowList>
            ) : (
              <T variant="sm" color="muted">
                لا توجد تجارب مسجّلة لهذا المعمل بعد.
              </T>
            )}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6], flexWrap: "wrap" }}>
            <SimulatedBadge />
            <T variant="xs" color="muted">
              المشغّل التفاعلي قيد التطوير — تسجيل الجلسة حقيقي.
            </T>
          </View>
        </View>
      </Sheet>

      {/* Experiment-name prompt sheet → recordLab (real). */}
      <Sheet
        open={!!expSheet}
        onClose={() => setExpSheet(null)}
        title="بدء تجربة"
        footer={
          <Button
            label={record.isPending ? "جارٍ التسجيل…" : "تسجيل الجلسة"}
            kind="primary"
            loading={record.isPending}
            disabled={!expSheet || expSheet.name.trim().length === 0}
            onPress={() => expSheet && record.mutate({ labId: expSheet.lab.id, name: expSheet.name.trim() })}
          />
        }
      >
        <View style={{ gap: sp[10] }}>
          <T variant="sm" color="muted">
            {expSheet ? `${expSheet.lab.name} — يُسجَّل اسم التجربة في سجلّك على الخادم.` : ""}
          </T>
          <Field
            label="اسم التجربة"
            value={expSheet?.name ?? ""}
            onChangeText={(t) => setExpSheet((prev) => (prev ? { ...prev, name: t } : prev))}
            hint="يُسجَّل اسم التجربة كما تكتبه في سجلّ جلساتك."
          />
        </View>
      </Sheet>

      {sessions.data && sessions.data.length > 0 ? (
        <View style={{ gap: sp[6] }}>
          <T variant="h4" weight="bold">
            سجلّ جلساتي
          </T>
          <RowList>
            {sessions.data.slice(-8).reverse().map((s, i, arr) => (
              <SessionRow key={s.id} session={s} last={i === arr.length - 1} />
            ))}
          </RowList>
        </View>
      ) : null}
      <T variant="xs" color="faint">
        {`معامل متاحة: ${num(rows.length)}`}
      </T>
    </Screen>
  );
}

function SessionRow({ session, last }: { session: LabSession; last: boolean }) {
  return (
    <LedgerRow last={last} accessibilityLabel={`جلسة: ${session.experimentName}`}>
      <T variant="body" weight="bold">
        {session.experimentName}
      </T>
      <T variant="xs" color="muted">
        {`${session.labName ?? "معمل"} · ${fromNow(session.createdAt)}`}
      </T>
      {session.completedAt ? <Badge label="منجزة" tone="mint" /> : null}
    </LedgerRow>
  );
}
