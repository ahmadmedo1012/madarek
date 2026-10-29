import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { Pencil, UserPlus } from "lucide-react-native";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen, SectionBar } from "@/components/ui";
import { T, MonoLabel } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Badge, ConfirmDialog, Sheet } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { Field } from "@/components/ui/fields";
import { SkeletonList, EmptyState, ErrorState } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { ownerApi } from "@/api/owner";
import { ApiError } from "@/api/client";
import { fullDate } from "@/lib/format";
import {
  INST_STATUS_LABEL,
  countAr,
  numOf,
  type InstitutionRow,
} from "@/features/governance/components";

type AdminRow = NonNullable<InstitutionRow["admins"]>[number];

/**
 * Pushed: /owner/institutions/:slug — «سياق المؤسسة» (web
 * OwnerInstitutionDetailPage parity, owner-scoped subset): identity facts
 * with a rename sheet (PATCH), the «تجهيز مسجل عام» flow, and the admin
 * memberships board (revoke/restore behind confirms). The row is resolved
 * from the owner listing by slug — the console's own source of truth.
 */
export default function OwnerInstitutionDetail() {
  const params = useLocalSearchParams<{ slug: string }>();
  const slugParam = Array.isArray(params.slug) ? params.slug[0] : params.slug;

  const listing = useQuery({
    queryKey: ["owner", "institutions"],
    queryFn: async () => (await ownerApi.institutions()) as InstitutionRow[],
    staleTime: 60_000,
  });

  const rows = Array.isArray(listing.data) ? listing.data : [];
  const inst = rows.find((i) => i.slug === slugParam) ?? null;

  if (listing.isLoading) {
    return (
      <Screen scroll>
        <StackHeader title="المؤسسة" kicker="لوحة المالك" />
        <View style={{ paddingTop: 16 }}>
          <SkeletonList rows={5} />
        </View>
      </Screen>
    );
  }
  if (listing.isError) {
    return (
      <Screen scroll>
        <StackHeader title="المؤسسة" kicker="لوحة المالك" />
        <View style={{ paddingTop: 16 }}>
          <ErrorState
            message={(listing.error as Error).message}
            onRetry={() => listing.refetch()}
          />
        </View>
      </Screen>
    );
  }
  if (!inst) {
    return (
      <Screen scroll>
        <StackHeader title="المؤسسة" kicker="لوحة المالك" />
        <View style={{ paddingTop: 16 }}>
          <EmptyState
            title="المؤسسة غير موجودة"
            message="لم نعثر على مؤسسة بهذا المعرّف — ربما حُذفت أو تغيّر معرّفها."
            actionLabel="رجوع إلى القائمة"
            onAction={() => router.push("/owner/institutions" as never)}
          />
        </View>
      </Screen>
    );
  }
  return <InstitutionConsole inst={inst} />;
}

function InstitutionConsole({ inst }: { inst: InstitutionRow }) {
  const qc = useQueryClient();
  const [renameOpen, setRenameOpen] = useState(false);
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<AdminRow | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<AdminRow | null>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["owner", "institutions"] });

  const rename = useMutation({
    mutationFn: (payload: { name: string; nameEn?: string }) =>
      ownerApi.updateInstitution(inst.id, payload),
    onSuccess: () => {
      invalidate();
      toast.success("حُفظت أسماء المؤسسة.", "بيانات المؤسسة");
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّر حفظ الأسماء"),
  });

  const provision = useMutation({
    // Backend contract: mode='existing' attaches a KNOWN email to this
    // institution as its «مسجل عام» (upsert: revoked memberships are
    // reactivated and upgraded). The mobile API surface carries the
    // three owner fields; the mode rides the same body, and EMPTY names
    // are omitted (the DTO requires min(1) on present names).
    mutationFn: (payload: { email: string; firstName?: string; lastName?: string }) =>
      ownerApi.provisionAdmin(
        inst.id,
        {
          email: payload.email,
          ...(payload.firstName ? { firstName: payload.firstName } : {}),
          ...(payload.lastName ? { lastName: payload.lastName } : {}),
          mode: "existing",
        } as Parameters<typeof ownerApi.provisionAdmin>[1],
      ),
    onSuccess: (_d, payload) => {
      invalidate();
      toast.success(
        `تمّ ربط «${payload.email}» بدور المسجل العام في «${inst.name}».`,
        "تمّ التعيين",
      );
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّر تعيين المسجل العام"),
  });

  const revoke = useMutation({
    mutationFn: (membershipId: string) => ownerApi.revokeMembership(inst.id, membershipId),
    onSuccess: () => {
      invalidate();
      toast.success(`أُلغيت العضوية في «${inst.name}».`, "تمّ إلغاء العضوية");
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّر إلغاء العضوية"),
  });

  const restore = useMutation({
    mutationFn: (membershipId: string) => ownerApi.restoreMembership(inst.id, membershipId),
    onSuccess: () => {
      invalidate();
      toast.success(`أُعيدت العضوية في «${inst.name}».`, "تمّت الاستعادة");
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّرت استعادة العضوية"),
  });

  const members = numOf(inst.activeMembershipCount ?? inst.membersCount);
  const faculties = numOf(inst.facultyCount ?? inst.facultiesCount);
  const admins = inst.admins ?? [];

  return (
    <Screen scroll>
      <StackHeader title={inst.name} kicker={inst.slug} />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <InstitutionStatusBadge status={inst.status} />
          {members !== null ? (
            <T variant="sm" color="muted">
              {countAr(members, ["عضو نشط واحد", "عضوان نشطان", "أعضاء نشطون", "عضواً نشطاً"])}
            </T>
          ) : null}
          {faculties !== null ? (
            <T variant="sm" color="muted">
              · {countAr(faculties, ["كلّيّة واحدة", "كلّيّتان", "كلّيّات", "كلّيّة"])}
            </T>
          ) : null}
        </View>

        {/* [01] بيانات المؤسسة */}
        <View>
          <SectionBar
            index={1}
            title="بيانات المؤسسة"
            action={
              <Button
                label="تعديل الأسماء"
                kind="ghost"
                small
                icon={<Pencil size={14} color="#282828" />}
                onPress={() => setRenameOpen(true)}
              />
            }
          />
          <RowList>
            <LedgerRow last>
              <StatLine label="الاسم" value={inst.name} />
              <StatLine label="الاسم بالإنجليزية" value={inst.nameEn || "—"} />
              <StatLine label="تاريخ الإنشاء" value={inst.createdAt ? fullDate(inst.createdAt) : "—"} />
            </LedgerRow>
            <LedgerRow last>
              <T variant="sm" color="muted">
                المعرّف (slug)
              </T>
              <MonoLabel>{inst.slug}</MonoLabel>
            </LedgerRow>
          </RowList>
        </View>

        {/* [02] تجهيز مسجل عام */}
        <View>
          <SectionBar
            index={2}
            title="تجهيز مسجل عام"
            action={
              <Button
                label="تجهيز"
                kind="ghost"
                small
                icon={<UserPlus size={14} color="#282828" />}
                onPress={() => setProvisionOpen(true)}
              />
            }
          />
          <T variant="body" color="muted">
            يُمنح دور المسجل العام داخل هذه المؤسسة فقط — يُربط حساب قائم عبر بريده الإلكتروني.
          </T>
        </View>

        {/* [03] العضويات */}
        <View>
          <SectionBar index={3} title="العضويات" />
          {admins.length === 0 ? (
            <T variant="body" color="muted">
              لا تحمل حمولة القائمة عضويات مسجلين بعد — تُعرض هنا فور توثيق أول تعيين.
            </T>
          ) : (
            <RowList>
              {admins.map((a, i) => (
                <LedgerRow key={a.membershipId ?? a.userId ?? i} last={i === admins.length - 1}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                    <View style={{ flex: 1, gap: 2 }}>
                      <T variant="body" weight="bold" numberOfLines={1}>
                        {`${a.firstName ?? ""} ${a.lastName ?? ""}`.trim() || "—"}
                      </T>
                      {a.email ? (
                        <T variant="xs" color="muted" numberOfLines={1}>
                          {a.email}
                        </T>
                      ) : null}
                    </View>
                    {a.isActive ? <Badge label="نشطة" tone="mint" /> : <Badge label="معطّلة" tone="rose" />}
                  </View>
                  {a.membershipId ? (
                    <View style={{ alignSelf: "flex-start" }}>
                      <Button
                        label={a.isActive ? "إلغاء العضوية" : "استعادة"}
                        kind={a.isActive ? "danger" : "primary"}
                        small
                        onPress={() => (a.isActive ? setRevokeTarget(a) : setRestoreTarget(a))}
                      />
                    </View>
                  ) : (
                    <T variant="xs" color="faint">
                      لا تحمل الحمولة معرّف العضوية — يُدار الإجراء من لوحة الويب.
                    </T>
                  )}
                </LedgerRow>
              ))}
            </RowList>
          )}
        </View>
      </View>

      <RenameSheet
        key={`rename-${inst.id}-${inst.name}-${inst.nameEn ?? ""}`}
        open={renameOpen}
        onClose={() => {
          rename.reset();
          setRenameOpen(false);
        }}
        inst={inst}
        rename={rename}
      />
      <ProvisionSheet
        open={provisionOpen}
        onClose={() => {
          provision.reset();
          setProvisionOpen(false);
        }}
        provision={provision}
      />

      <ConfirmDialog
        open={revokeTarget !== null}
        title="إلغاء عضوية المسجل العام"
        confirmLabel="إلغاء العضوية"
        danger
        loading={revoke.isPending}
        message={
          revokeTarget
            ? `هل تريد إلغاء عضوية «${`${revokeTarget.firstName ?? ""} ${revokeTarget.lastName ?? ""}`.trim() || revokeTarget.email || "—"}» في «${inst.name}»؟ سيفقد وصوله إلى سياق هذه المؤسسة فورًا.`
            : ""
        }
        onConfirm={() => {
          if (revokeTarget?.membershipId) revoke.mutate(revokeTarget.membershipId);
          setRevokeTarget(null);
        }}
        onCancel={() => setRevokeTarget(null)}
      />
      <ConfirmDialog
        open={restoreTarget !== null}
        title="استعادة عضوية المسجل العام"
        confirmLabel="استعادة"
        loading={restore.isPending}
        message={
          restoreTarget
            ? `هل تريد إعادة تنشيط عضوية «${`${restoreTarget.firstName ?? ""} ${restoreTarget.lastName ?? ""}`.trim() || restoreTarget.email || "—"}» في «${inst.name}»؟ سيستعيد وصوله إلى سياق هذه المؤسسة.`
            : ""
        }
        onConfirm={() => {
          if (restoreTarget?.membershipId) restore.mutate(restoreTarget.membershipId);
          setRestoreTarget(null);
        }}
        onCancel={() => setRestoreTarget(null)}
      />
    </Screen>
  );
}

/** Institution status → Badge tone (the list + detail share one vocabulary). */
function InstitutionStatusBadge({ status }: { status?: string }) {
  const known = status != null && status in INST_STATUS_LABEL;
  return (
    <Badge
      label={known ? INST_STATUS_LABEL[status] : status || "—"}
      tone={status === "ACTIVE" ? "mint" : status === "SUSPENDED" ? "rose" : "grey"}
      mono={!known}
    />
  );
}

/* ─── Rename sheet — PATCH /owner/institutions/:id ─── */

function RenameSheet({
  open,
  onClose,
  inst,
  rename,
}: {
  open: boolean;
  onClose: () => void;
  inst: InstitutionRow;
  rename: UseMutationResult<unknown, Error, { name: string; nameEn?: string }>;
}) {
  const [name, setName] = useState(inst.name ?? "");
  const [nameEn, setNameEn] = useState(inst.nameEn ?? "");
  const nameProblem = name.length > 0 && name.trim().length < 2 ? "الاسم قصير جدًا — حرفان على الأقل" : undefined;
  const canSubmit = name.trim().length >= 2 && !rename.isPending;

  const submit = async () => {
    if (!canSubmit) return;
    try {
      await rename.mutateAsync({ name: name.trim(), ...(nameEn.trim() ? { nameEn: nameEn.trim() } : {}) });
      onClose();
    } catch {
      // keep the draft; the toast names the failure.
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="تعديل الأسماء">
      <View style={{ gap: 12 }}>
        <Field
          label="اسم المؤسسة"
          value={name}
          onChangeText={setName}
          error={nameProblem}
          hint="كما سيظهر لأعضاء المؤسسة"
        />
        <Field
          label="الاسم بالإنجليزية (اختياري)"
          value={nameEn}
          onChangeText={setNameEn}
          autoCorrect={false}
          hint="يُترك فارغاً للإبقاء على قيمته الحالية كما هي"
        />
        <Button
          label={rename.isPending ? "جارٍ الحفظ…" : "حفظ الأسماء"}
          kind="primary"
          disabled={!canSubmit}
          onPress={() => {
            void submit();
          }}
        />
        {rename.isError ? (
          <T variant="sm" color="danger">
            {(rename.error as ApiError)?.message ?? "تعذّر حفظ الأسماء — حاول مجدداً."}
          </T>
        ) : null}
      </View>
    </Sheet>
  );
}

/* ─── Provision sheet — POST /owner/institutions/:id/administrators ─── */

function ProvisionSheet({
  open,
  onClose,
  provision,
}: {
  open: boolean;
  onClose: () => void;
  provision: UseMutationResult<unknown, Error, { email: string; firstName?: string; lastName?: string }>;
}) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const emailProblem =
    email.length > 0 && !/.+@.+\..+/.test(email.trim()) ? "بريد إلكتروني غير صالح" : undefined;
  const canSubmit = /.+@.+\..+/.test(email.trim()) && !provision.isPending;

  const submit = async () => {
    if (!canSubmit) return;
    try {
      await provision.mutateAsync({
        email: email.trim().toLowerCase(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
      });
      setEmail("");
      setFirstName("");
      setLastName("");
      onClose();
    } catch {
      // the draft stays typed; the toast names the failure.
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="تجهيز مسجل عام">
      <View style={{ gap: 12 }}>
        <T variant="sm" color="muted">
          يُربط الحساب القائم (بالبريد) بدور المسجل العام داخل هذه المؤسسة فقط — إنشاء حساب جديد بكلمة
          مرور يُدار من لوحة الويب.
        </T>
        <Field
          label="البريد الإلكتروني"
          value={email}
          onChangeText={setEmail}
          error={emailProblem}
          hint="مطلوب — لحساب مسجَّل على المنصّة"
          autoCorrect={false}
          autoCapitalize="none"
          keyboardType="email-address"
        />
        <Field label="الاسم الأول" value={firstName} onChangeText={setFirstName} />
        <Field label="اللقب" value={lastName} onChangeText={setLastName} />
        <Button
          label={provision.isPending ? "جارٍ التعيين…" : "تعيين المسجل العام"}
          kind="primary"
          disabled={!canSubmit}
          onPress={() => {
            void submit();
          }}
        />
        {provision.isError ? (
          <T variant="sm" color="danger">
            {(provision.error as ApiError)?.message ?? "تعذّر تعيين المسجل العام — حاول مجدداً."}
          </T>
        ) : null}
      </View>
    </Sheet>
  );
}
