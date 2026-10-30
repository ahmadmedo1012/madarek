import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient, type UseMutationResult } from "@tanstack/react-query";
import { Plus } from "lucide-react-native";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen, SectionBar } from "@/components/ui";
import { T, MonoLabel } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Badge, Sheet } from "@/components/ui/surfaces";
import { RowList, LedgerRow } from "@/components/ui/data";
import { Field } from "@/components/ui/fields";
import { SkeletonList, EmptyState, ErrorState } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { ownerApi, type OwnerInstitution } from "@/api/owner";
import { ApiError } from "@/api/client";
import { fullDate } from "@/lib/format";
import {
  INST_STATUS_LABEL,
  countAr,
  numOf,
  type InstitutionRow,
} from "@/features/governance/components";

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

/**
 * Pushed: /owner/institutions — «المؤسسات» (web OwnerInstitutionsPage parity):
 * the platform register (name/nameEn/slug/status/counts), a «مؤسسة جديدة»
 * sheet over POST /owner/institutions, and a row tap opening the
 * institution's own console context.
 */
export default function OwnerInstitutions() {
  const qc = useQueryClient();
  const [createOpen, setCreateOpen] = useState(false);

  const listing = useQuery({
    queryKey: ["owner", "institutions"],
    queryFn: async () => (await ownerApi.institutions()) as InstitutionRow[],
    staleTime: 60_000,
  });

  const create = useMutation({
    // Backend contract (institution.routes.ts): the body sends ONLY the
    // typed fields — a slug is derived server-side when omitted; the
    // response nests the row as { institution } (the transport unwraps
    // the outer { data } envelope only).
    mutationFn: (draft: { name: string; nameEn?: string; slug?: string }) => {
      const payload = {
        name: draft.name,
        ...(draft.nameEn ? { nameEn: draft.nameEn } : {}),
        ...(draft.slug ? { slug: draft.slug } : {}),
      } as { name: string; nameEn?: string; slug: string };
      return ownerApi.createInstitution(payload);
    },
    onSuccess: (res) => {
      const inst =
        (res as unknown as { institution?: InstitutionRow })?.institution ??
        (res as unknown as InstitutionRow);
      qc.invalidateQueries({ queryKey: ["owner", "institutions"] });
      toast.success(
        `أُنشئت «${inst?.name ?? "المؤسسة"}» وهي نشطة الآن.`,
        "تمّ إنشاء المؤسسة",
      );
    },
  });

  const rows = Array.isArray(listing.data) ? listing.data : [];

  return (
    <Screen scroll>
      <StackHeader title="المؤسسات" kicker="لوحة المالك" />
      <View style={{ gap: 16, paddingTop: 16 }}>
        <View>
          <T variant="h2" weight="bold">
            المؤسسات
          </T>
          <T variant="body" color="muted">
            إدارة المؤسسات التعليمية على المنصّة
          </T>
        </View>

        <Button
          label="مؤسسة جديدة"
          kind="accent"
          icon={<Plus size={14} color="#FFFFFF" />}
          onPress={() => setCreateOpen(true)}
        />

        <View>
          <SectionBar index={1} title="المؤسسات المسجّلة" />
          {listing.isLoading ? (
            <SkeletonList rows={4} />
          ) : listing.isError ? (
            <ErrorState
              message={(listing.error as Error).message}
              onRetry={() => listing.refetch()}
            />
          ) : rows.length === 0 ? (
            <EmptyState
              title="لا توجد مؤسسات بعد"
              message="أنشئ أول مؤسسة تعليمية من الزر أعلاه لبدء استقبال أعضائها."
            />
          ) : (
            <View style={{ gap: 12 }}>
              <RowList>
                {rows.map((inst, i) => {
                  const members = numOf(inst.activeMembershipCount ?? inst.membersCount);
                  const faculties = numOf(inst.facultyCount ?? inst.facultiesCount);
                  return (
                    <LedgerRow
                      key={inst.id}
                      onPress={() => router.push(`/owner/institutions/${inst.slug}` as never)}
                      accessibilityLabel={`فتح المؤسسة ${inst.name}`}
                      last={i === rows.length - 1}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <InstitutionStatusBadge status={inst.status} />
                        {inst.createdAt ? (
                          <T variant="xs" color="faint">
                            {fullDate(inst.createdAt)}
                          </T>
                        ) : null}
                      </View>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                        <View style={{ flex: 1, gap: 2 }}>
                          <T variant="body" weight="bold" numberOfLines={1}>
                            {inst.name}
                          </T>
                          {inst.nameEn ? (
                            <T variant="xs" color="muted" numberOfLines={1}>
                              {inst.nameEn}
                            </T>
                          ) : null}
                          <MonoLabel>{inst.slug}</MonoLabel>
                        </View>
                      </View>
                      {members !== null || faculties !== null ? (
                        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                          {members !== null ? (
                            <T variant="xs" color="faint">
                              {countAr(members, ["عضو نشط واحد", "عضوان نشطان", "أعضاء نشطون", "عضواً نشطاً"])}
                            </T>
                          ) : null}
                          {faculties !== null ? (
                            <T variant="xs" color="faint">
                              · {countAr(faculties, ["كلّيّة واحدة", "كلّيّتان", "كلّيّات", "كلّيّة"])}
                            </T>
                          ) : null}
                        </View>
                      ) : null}
                    </LedgerRow>
                  );
                })}
              </RowList>
              <T variant="xs" color="faint">
                {countAr(rows.length, ["مؤسسة واحدة", "مؤسستان", "مؤسسات", "مؤسسة"])} في السجلّ — كما تحملها
                حمولة القائمة.
              </T>
            </View>
          )}
        </View>
      </View>

      <CreateInstitutionSheet
        open={createOpen}
        onClose={() => {
          create.reset();
          setCreateOpen(false);
        }}
        create={create}
      />
    </Screen>
  );
}

/* ─── «مؤسسة جديدة» sheet — POST /owner/institutions (keep-edits contract:
       the draft clears ONLY on success; a failure is named inline). ─── */

interface CreateDraft {
  name: string;
  nameEn: string;
  slug: string;
}

const EMPTY_DRAFT: CreateDraft = { name: "", nameEn: "", slug: "" };

type CreateMutation = UseMutationResult<
  OwnerInstitution,
  Error,
  { name: string; nameEn?: string; slug?: string }
>;

function CreateInstitutionSheet({
  open,
  onClose,
  create,
}: {
  open: boolean;
  onClose: () => void;
  create: CreateMutation;
}) {
  const [draft, setDraft] = useState<CreateDraft>(EMPTY_DRAFT);
  const pending = create.isPending;
  const nameProblem =
    draft.name.length > 0 && draft.name.trim().length < 2 ? "الاسم قصير جدًا — حرفان على الأقل" : undefined;
  const canSubmit = draft.name.trim().length >= 2 && !pending;

  const submit = async () => {
    if (!canSubmit) return;
    try {
      await create.mutateAsync({
        name: draft.name.trim(),
        nameEn: draft.nameEn.trim() || undefined,
        slug: draft.slug.trim() || undefined,
      });
      setDraft(EMPTY_DRAFT);
      onClose();
    } catch {
      // The draft stays typed; the inline error names the failure (e.g. a 409 slug conflict).
    }
  };

  return (
    <Sheet open={open} onClose={onClose} title="إنشاء مؤسسة جديدة">
      <View style={{ gap: 12 }}>
        <T variant="sm" color="muted">
          أضف مؤسسة تعليمية إلى المنصّة — تُنشأ نشطة ويمكن تعيين مسجلها العام بعد ذلك.
        </T>
        <Field
          label="اسم المؤسسة"
          value={draft.name}
          onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))}
          placeholder="مثلاً: أكاديمية طرابلس للعلوم"
          error={nameProblem}
          hint="مطلوب — كما سيظهر لأعضاء المؤسسة"
        />
        <Field
          label="الاسم بالإنجليزية (اختياري)"
          value={draft.nameEn}
          onChangeText={(v) => setDraft((d) => ({ ...d, nameEn: v }))}
          placeholder="Tripoli Academy of Sciences"
          autoCorrect={false}
        />
        <Field
          label="المعرّف (slug — اختياري)"
          value={draft.slug}
          onChangeText={(v) => setDraft((d) => ({ ...d, slug: v }))}
          placeholder="inst-example"
          hint="أحرف لاتينية صغيرة وأرقام وشرطات؛ يُشتق تلقائيًا إن تُرك فارغًا"
          autoCorrect={false}
        />
        <Button
          label={pending ? "جارٍ الإنشاء…" : "إنشاء المؤسسة"}
          kind="primary"
          icon={<Plus size={14} color="#FFFFFF" />}
          disabled={!canSubmit}
          onPress={() => {
            void submit();
          }}
        />
        {create.isError ? (
          <T variant="sm" color="danger">
            تعذّر إنشاء المؤسسة — {(create.error as ApiError | null)?.message ?? "حاول مجدداً."}
          </T>
        ) : null}
      </View>
    </Sheet>
  );
}
