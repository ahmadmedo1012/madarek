import { useState } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react-native";
import { Screen } from "@/components/ui";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T, MonoLabel } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Badge, ConfirmDialog, Sheet } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { Field, Segmented, SelectField } from "@/components/ui/fields";
import { SkeletonList, EmptyState, ErrorState } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { adminApi } from "@/api/admin";
import { ApiError } from "@/api/client";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { fullDate, latn } from "@/lib/format";
import {
  type FacultyNode,
  type OfferingPickRow,
} from "@/features/governance/components";

interface InviteRow {
  id: string;
  code: string;
  role?: string;
  offeringId?: string | null;
  departmentId?: string | null;
  facultyId?: string | null;
  expiresAt?: string;
  maxUses?: number;
  usedCount?: number;
  offering?: { course?: { code?: string; name?: string } | null } | null;
  department?: { name?: string } | null;
  faculty?: { name?: string } | null;
}

type ScopeKind = "none" | "faculty" | "department" | "offering";

/** Pushed: /admin/invites — invite codes console (registration codes). */
export default function AdminInvites() {
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const invites = useQuery({
    queryKey: ["admin", "invites", scope],
    queryFn: async () => (await adminApi.invites()) as InviteRow[],
  });
  const facs = useQuery({
    queryKey: ["admin", "faculties", scope],
    queryFn: async () => (await adminApi.faculties()) as FacultyNode[],
  });
  const [createOpen, setCreateOpen] = useState(false);
  const [role, setRole] = useState<"STUDENT" | "TEACHER">("STUDENT");
  const [scopeKind, setScopeKind] = useState<ScopeKind>("none");
  const [scopeId, setScopeId] = useState<string | null>(null);
  const [days, setDays] = useState("7");
const [maxUses, setMaxUses] = useState("1");
  const [deleting, setDeleting] = useState<InviteRow | null>(null);

  const offerings = useQuery({
    queryKey: ["enrollments", "offerings", scope],
    queryFn: async () => (await adminApi.enrollmentOfferings()) as OfferingPickRow[],
    enabled: scopeKind === "offering" || createOpen,
    staleTime: 60_000,
  });


  const create = useMutation({
    mutationFn: () =>
      adminApi.createInvite({
        role,
        facultyId: scopeKind === "faculty" ? scopeId! : undefined,
        departmentId: scopeKind === "department" ? scopeId! : undefined,
        offeringId: scopeKind === "offering" ? scopeId! : undefined,
        expiresInDays: Number(days) || 7,
        maxUses: Number(maxUses) || 1,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "invites"] });
      toast.success("أُنشئت الدعوة.", "دعوة جديدة");
      setCreateOpen(false);
      setScopeKind("none");
      setScopeId(null);
      setDays("7");
      setMaxUses("1");
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّر إنشاء الدعوة"),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteInvite(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "invites"] });
      toast.success("حُذف كود الدعوة.", "تمّ الحذف");
      setDeleting(null);
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّر حذف الدعوة"),
  });

  const facultyOptions = (facs.data ?? []).map((f) => ({ id: f.id, label: f.name }));
  const departmentOptions = (facs.data ?? []).flatMap((f) =>
    (f.departments ?? []).map((d) => ({ id: d.id, label: `${f.name} · ${d.name}` })),
  );
  const offeringOptions = (offerings.data ?? []).map((o) => ({
    id: o.id,
    label: `${o.course?.name ?? "—"} (${o.course?.code ?? "—"})`,
    sub: o.term ?? null,
  }));

  const rows = invites.data ?? [];

  return (
    <Screen scroll>
      <StackHeader title="دعوات التسجيل" kicker="لوحة المسجل العام" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <T variant="body" color="muted">
          أكواد انضمام للطلاب والأساتذة، بنطاق واحد على الأكثر وصلاحية محدّدة.
        </T>

        <Button
          label="دعوة جديدة"
          kind="primary"
          icon={<Plus size={14} color="#FFFFFF" />}
          onPress={() => setCreateOpen(true)}
        />

        {invites.isLoading ? (
          <SkeletonList rows={4} />
        ) : invites.isError ? (
          <ErrorState message={(invites.error as Error).message} onRetry={() => invites.refetch()} />
        ) : rows.length === 0 ? (
          <EmptyState
            title="لا توجد دعوات بعد"
            message="أنشئ أول دعوة من الزر أعلاه لمشاركة كود الانضمام."
            actionLabel="دعوة جديدة"
            onAction={() => setCreateOpen(true)}
          />
        ) : (
          <RowList>
            {rows.map((inv, i) => (
              <LedgerRow key={inv.id} last={i === rows.length - 1}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <MonoLabel>{inv.code}</MonoLabel>
                  <Badge
                    label={inv.role === "TEACHER" ? "أستاذ" : inv.role === "STUDENT" ? "طالب" : inv.role ?? "—"}
                    tone={inv.role === "TEACHER" ? "mint" : "copper"}
                  />
                </View>
                <T variant="xs" color="muted">
                  النطاق:{" "}
                  {inv.offering?.course?.name
                    ? `شعبة ${inv.offering.course.name}`
                    : inv.department?.name
                      ? `قسم ${inv.department.name}`
                      : inv.faculty?.name
                        ? `كلية ${inv.faculty.name}`
                        : "بلا نطاق"}
                </T>
                <T variant="xs" color="faint">
                  الاستخدام: {latn(inv.usedCount ?? 0)}/{latn(inv.maxUses ?? 0)} · ينتهي{" "}
                  {fullDate(inv.expiresAt)}
                </T>
                <View style={{ flexDirection: "row", paddingTop: 8 }}>
                  <Button
                    label="حذف"
                    kind="ghost"
                    small
                    icon={<Trash2 size={13} color="#C72E00" />}
                    onPress={() => setDeleting(inv)}
                  />
                </View>
              </LedgerRow>
            ))}
          </RowList>
        )}
      </View>

      <Sheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="دعوة جديدة"
        footer={
          <Button
            label={create.isPending ? "جارٍ الإنشاء…" : "إنشاء الدعوة"}
            disabled={
              create.isPending ||
              (scopeKind !== "none" && !scopeId) ||
              !(Number(days) >= 1) ||
              !(Number(maxUses) >= 1)
            }
            onPress={() => create.mutate()}
          />
        }
      >
        <View style={{ gap: 12 }}>
          <T variant="sm" color="muted">
            الدور
          </T>
          <Segmented
            options={[
              { id: "STUDENT", label: "طالب" },
              { id: "TEACHER", label: "أستاذ" },
            ]}
            selectedId={role}
            onSelect={(r) => setRole(r as "STUDENT" | "TEACHER")}
          />

          <T variant="sm" color="muted">
            نطاق الدعوة (اختيار واحد على الأكثر)
          </T>
          <Segmented
            options={[
              { id: "none", label: "بلا نطاق" },
              { id: "faculty", label: "كلية" },
              { id: "department", label: "قسم" },
              { id: "offering", label: "شعبة" },
            ]}
            selectedId={scopeKind}
            onSelect={(k) => {
              setScopeKind(k as ScopeKind);
              setScopeId(null);
            }}
          />

          {scopeKind === "faculty" ? (
            <SelectField
              label="الكلّيّة"
              value={facultyOptions.find((f) => f.id === scopeId) ?? null}
              options={facultyOptions}
              onSelect={setScopeId}
              loading={facs.isLoading}
              placeholder="اختر الكلّيّة…"
            />
          ) : null}
          {scopeKind === "department" ? (
            <SelectField
              label="القسم"
              value={departmentOptions.find((d) => d.id === scopeId) ?? null}
              options={departmentOptions}
              onSelect={setScopeId}
              loading={facs.isLoading}
              placeholder="اختر القسم…"
            />
          ) : null}
          {scopeKind === "offering" ? (
            <SelectField
              label="الشعبة"
              value={offeringOptions.find((o) => o.id === scopeId) ?? null}
              options={offeringOptions}
              onSelect={setScopeId}
              loading={offerings.isFetching}
              placeholder="اختر الشعبة…"
            />
          ) : null}

          <Field
            label="صلاحية الأيام"
            value={days}
            onChangeText={setDays}
            keyboardType="numeric"
            hint="من 1 إلى 90 يومًا"
          />
          <Field
            label="أقصى استخدامات"
            value={maxUses}
            onChangeText={setMaxUses}
            keyboardType="numeric"
            hint="من 1 إلى 500 استخدام"
          />
          <StatLine label="نطاق مختار" value={scopeKind === "none" ? "بلا نطاق" : scopeKind === "faculty" ? "كلية" : scopeKind === "department" ? "قسم" : "شعبة"} />
        </View>
      </Sheet>

      <ConfirmDialog
        open={deleting !== null}
        title="حذف الدعوة"
        message={deleting ? `سيُحذف كود «${deleting.code}» نهائيًا. لا يمكن التراجع عن هذا الإجراء.` : ""}
        confirmLabel="حذف نهائي"
        danger
        loading={remove.isPending}
        onConfirm={() => deleting && remove.mutate(deleting.id)}
        onCancel={() => setDeleting(null)}
      />
    </Screen>
  );
}
