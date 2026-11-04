import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { humanizeError } from "@/lib/errors";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Badge, ConfirmDialog, Sheet } from "@/components/ui/surfaces";
import {
  DataList,
  LedgerRow,
  makeRow,
  usePagedList,
} from "@/components/ui/data";
import { SearchBar, Segmented, SelectField } from "@/components/ui/fields";
import { sp } from "@/design/tokens";
import { toast } from "@/components/ui/toast";
import { ownerApi } from "@/api/owner";
import type { Paginated } from "@/api/types";
import { ROLE_LABELS } from "@/auth/session";
import { initials } from "@/lib/format";
import { RoleChip, UserAvatar, avatarUrlOf, type OwnerUserRow } from "@/features/governance/components";

const PAGE_LIMIT = 20;

/** Role pills (web OwnerUsersPage FilterBar parity — server-side role filter). */
const ROLE_FILTERS: { id: string; label: string }[] = [
  { id: "all", label: "الكل" },
  { id: "STUDENT", label: "طالب" },
  { id: "TEACHER", label: "أستاذ" },
  { id: "ADMIN", label: "مسجل" },
  { id: "QUALITY", label: "جودة" },
  { id: "OWNER", label: "مالك" },
];

/** Roles the owner may assign from this console (web ELIGIBLE_ROLES parity —
 *  OWNER is excluded: the backend blocks owner-role changes here). */
const ELIGIBLE_ROLES: { id: string; label: string }[] = [
  { id: "STUDENT", label: ROLE_LABELS.STUDENT ?? "طالب" },
  { id: "TEACHER", label: ROLE_LABELS.TEACHER ?? "أستاذ" },
  { id: "ADMIN", label: ROLE_LABELS.ADMIN ?? "المسجل العام" },
  { id: "QUALITY", label: ROLE_LABELS.QUALITY ?? "أخصائي جودة" },
];

function nameOf(u: OwnerUserRow): string {
  const n = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return n || u.email || "—";
}

/** (tabs) Users directory — «إدارة المستخدمين» (web OwnerUsersPage parity):
 *  server-paginated search + role filter, identity rows with role/status
 *  chips, and the two governance actions (role change, status toggle)
 *  behind a per-user sheet — each behind its own confirm. */
export default function OwnerUsers() {
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");
  const [role, setRole] = useState("all");

  const appliedRef = useRef(appliedQ);
  useEffect(() => {
    const t = setTimeout(() => {
      const next = q.trim();
      if (next === appliedRef.current) return;
      appliedRef.current = next;
      setAppliedQ(next);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const directory = usePagedList<OwnerUserRow>({
    queryKey: ["owner", "users", { q: appliedQ, role }],
    fetchPage: (page) =>
      ownerApi.users({
        page,
        limit: PAGE_LIMIT,
        q: appliedQ || undefined,
        role: role === "all" ? undefined : role,
      }) as Promise<Paginated<OwnerUserRow>>,
    limit: PAGE_LIMIT,
  });

  const [selected, setSelected] = useState<OwnerUserRow | null>(null);
  const hasFilters = role !== "all" || appliedQ !== "";

  return (
    <Screen scroll={false} padded={false}>
      <AppTopBar alertsPath="/owner/alerts" />
      <View style={{ paddingHorizontal: sp[20], gap: sp[16], paddingTop: sp[16] }}>
        <View>
          <T variant="h2" weight="bold">
            إدارة المستخدمين
          </T>
          <T variant="body" color="muted">
            عرض جميع حسابات المنصّة والبحث فيها وإدارتها
          </T>
        </View>

        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="ابحث بالاسم أو البريد الإلكتروني…"
          onClear={() => setQ("")}
        />

        <Segmented
          options={ROLE_FILTERS}
          selectedId={role}
          onSelect={(id) => setRole(id)}
        />
      </View>
      <View style={{ flex: 1 }}>
        <DataList
          data={directory.items}
          renderItem={({ item }) => <DirectoryRow item={item} onSelect={setSelected} />}
          keyExtractor={(u) => u.id}
          isLoading={directory.isLoading}
          isError={directory.isError}
          errorMessage={humanizeError(directory.query.error)}
          onRetry={() => directory.refetch()}
          refetch={directory.refetch}
          isRefetching={directory.isRefetching}
          onEndReached={directory.onEndReached}
          isFetchingNextPage={directory.isFetchingNextPage}
          hasNextPage={directory.hasNextPage}
          loadMoreError={directory.loadMoreError}
          onRetryLoadMore={directory.retryLoadMore}
          emptyTitle={hasFilters ? "لا نتائج مطابقة" : "لا يوجد مستخدمون بعد"}
          emptyMessage={
            hasFilters
              ? "لم نجد حسابات تطابق البحث أو الدور المحدّد."
              : "ستظهر الحسابات هنا فور تسجيل أوّل مستخدم في المنصّة."
          }
          contentPadding={{ horizontal: 20, top: 8, bottom: 24 }}
        />
      </View>

      {selected ? <UserActionsSheet user={selected} onClose={() => setSelected(null)} /> : null}
    </Screen>
  );
}

/* ─── directory row (module scope, memo-stable) ─── */

const DirectoryRow = makeRow<OwnerUserRow, { onSelect: (row: OwnerUserRow) => void }>(
  ({ item, onSelect }) => (
    <LedgerRow
      onPress={() => onSelect(item)}
      accessibilityLabel={`إجراءات ${nameOf(item)}`}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <UserAvatar
          url={item.avatarUrl ?? avatarUrlOf(item)}
          initials={item.avatarInitials ?? initials(item.firstName, item.lastName)}
          color={item.avatarColor}
          size={36}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="bold" numberOfLines={1}>
            {nameOf(item)}
          </T>
          {item.email ? (
            <T variant="xs" color="muted" numberOfLines={1}>
              {item.email}
            </T>
          ) : null}
          {(item.memberships ?? []).length > 0 ? (
            <T variant="xs" color="faint" numberOfLines={1}>
              {(item.memberships ?? [])
                .map((m) => m.institution?.name)
                .filter(Boolean)
                .join("، ") || "بلا مؤسسة"}
            </T>
          ) : null}
        </View>
        <View style={{ gap: 4 }}>
          <RoleChip role={item.role} label={ROLE_LABELS[item.role ?? ""] ?? "دور آخر"} />
          {item.isActive ? <Badge label="مفعّل" tone="mint" /> : <Badge label="معطّل" tone="rose" />}
        </View>
      </View>
    </LedgerRow>
  ),
);

/* ─── Per-user actions sheet: role change + status toggle ─── */

function UserActionsSheet({ user, onClose }: { user: OwnerUserRow; onClose: () => void }) {
  const qc = useQueryClient();
  const name = nameOf(user);
  const [roleDraft, setRoleDraft] = useState<string | null>(null);
  const [roleConfirm, setRoleConfirm] = useState(false);
  const [statusConfirm, setStatusConfirm] = useState(false);

  const changeRole = useMutation({
    mutationFn: (role: string) => ownerApi.setUserRole(user.id, role),
    onSuccess: (_d, role) => {
      qc.invalidateQueries({ queryKey: ["owner", "users"] });
      toast.success(`أصبح دور «${name}» الآن ${ROLE_LABELS[role] ?? "دور آخر"}.`, "تمّ تغيير الدور");
      setRoleConfirm(false);
      onClose();
    },
    onError: (e) => {
      setRoleConfirm(false);
      toast.error(humanizeError(e), "تعذّر تغيير الدور");
    },
  });

  const toggleStatus = useMutation({
    mutationFn: (isActive: boolean) => ownerApi.setUserStatus(user.id, isActive),
    onSuccess: (_d, isActive) => {
      qc.invalidateQueries({ queryKey: ["owner", "users"] });
      toast.success(isActive ? `أُعيد تفعيل حساب «${name}».` : `عُطِّل حساب «${name}».`, "تمّ تحديث الحالة");
      setStatusConfirm(false);
      onClose();
    },
    onError: (e) => {
      setStatusConfirm(false);
      // The API's own Arabic message lands here (e.g. the last-active-owner guard).
      toast.error(humanizeError(e), "تعذّر تحديث حالة الحساب");
    },
  });

  const insts = (user.memberships ?? [])
    .map((m) => m.institution?.name)
    .filter(Boolean)
    .join("، ");
  const isSensitive =
    roleDraft === "ADMIN" || roleDraft === "QUALITY" || user.role === "ADMIN" || user.role === "QUALITY";

  return (
    <Sheet open onClose={onClose} title={name}>
      <View style={{ gap: 12 }}>
        {user.email ? <T variant="body" color="muted">{user.email}</T> : null}
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          <RoleChip role={user.role} label={ROLE_LABELS[user.role ?? ""] ?? "دور آخر"} />
          {user.isActive ? <Badge label="مفعّل" tone="mint" /> : <Badge label="معطّل" tone="rose" />}
        </View>
        {insts ? (
          <T variant="sm" color="faint">
            العضوية النشطة: {insts}
          </T>
        ) : (
          <T variant="sm" color="faint">
            لا عضوية مؤسسة نشطة لهذا الحساب.
          </T>
        )}

        {user.role === "OWNER" ? (
          <T variant="sm" color="muted">
            دور المالك لا يُغيَّر من هذه الواجهة.
          </T>
        ) : (
          <SelectField
            label="تغيير الدور"
            sheetTitle="اختر الدور الجديد"
            value={
              roleDraft
                ? { id: roleDraft, label: ROLE_LABELS[roleDraft] ?? "دور آخر" }
                : { id: user.role ?? "", label: ROLE_LABELS[user.role ?? ""] ?? "دور آخر" }
            }
            options={ELIGIBLE_ROLES}
            onSelect={(id) => {
              if (id === user.role) return;
              setRoleDraft(id);
              setRoleConfirm(true);
            }}
          />
        )}

        <Button
          label={user.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
          kind={user.isActive ? "danger" : "primary"}
          onPress={() => setStatusConfirm(true)}
        />
        <T variant="xs" color="faint">
          كل إجراء يُوثَّق في سجلّ نشاط المنصّة.
        </T>
      </View>

      <ConfirmDialog
        open={roleConfirm}
        title="تغيير الدور"
        message={
          roleDraft
            ? `هل تريد تغيير دور «${name}» من ${ROLE_LABELS[user.role ?? ""] ?? "دور آخر"} إلى ${ROLE_LABELS[roleDraft] ?? "دور آخر"}؟${insts ? ` عضويته النشطة: ${insts}.` : " لا عضوية مؤسسة نشطة لهذا الحساب."}`
            : ""
        }
        confirmLabel="تغيير الدور"
        danger={isSensitive}
        loading={changeRole.isPending}
        onConfirm={() => {
          if (roleDraft) changeRole.mutate(roleDraft);
        }}
        onCancel={() => {
          setRoleConfirm(false);
          setRoleDraft(null);
        }}
      />

      <ConfirmDialog
        open={statusConfirm}
        title={user.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
        confirmLabel={user.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
        danger={user.isActive}
        message={
          user.isActive
            ? `هل تريد تعطيل حساب «${name}»؟ لن يتمكّن من الدخول إلى المنصّة.`
            : `هل تريد إعادة تفعيل حساب «${name}»؟ سيتمكّن من الدخول مجدداً.`
        }
        loading={toggleStatus.isPending}
        onConfirm={() => toggleStatus.mutate(!user.isActive)}
        onCancel={() => setStatusConfirm(false)}
      />
    </Sheet>
  );
}
