import { useEffect, useRef, useState } from "react";
import { View } from "react-native";
import { humanizeError } from "@/lib/errors";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Crown from "lucide-react-native/icons/crown";
import ShieldCheck from "lucide-react-native/icons/shield-check";
import { AppTopBar } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Badge, ConfirmDialog, Sheet } from "@/components/ui/surfaces";
import {
  DataList,
  LedgerRow,
  StatLine,
  makeRow,
  usePagedList,
} from "@/components/ui/data";
import { SearchBar, Segmented, SelectField } from "@/components/ui/fields";
import { sp } from "@/design/tokens";
import { toast } from "@/components/ui/toast";
import { adminApi } from "@/api/admin";
import type { AdminUserRow } from "@/api/admin";
import { POSITION_LABELS, ROLE_LABELS } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette } from "@/design/theme";
import { initials, num } from "@/lib/format";
import { pageOf, textOf, UserAvatar, avatarUrlOf, type FacultyNode } from "@/features/governance/components";

const PAGE_LIMIT = 20;

type PositionChoice = "NONE" | "DEAN" | "ASSOCIATE_DEAN" | "DEPARTMENT_HEAD";

const POSITION_OPTIONS: { id: PositionChoice; label: string }[] = [
  { id: "NONE", label: "بلا منصب" },
  { id: "DEAN", label: "عميد" },
  { id: "ASSOCIATE_DEAN", label: "وكيل عميد" },
  { id: "DEPARTMENT_HEAD", label: "رئيس قسم" },
];

/** (tabs) Teachers roster — «إدارة الأساتذة» (web AdminTeachersPage parity). */
export default function AdminTeachers() {
  const scope = useInstitutionScope();
  const [q, setQ] = useState("");
  const [appliedQ, setAppliedQ] = useState("");

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

  const count = useQuery({
    queryKey: ["admin", "users", { role: "TEACHER", page: 1, q: "", countOnly: true }, scope],
    queryFn: async () => pageOf<AdminUserRow>(await adminApi.users({ role: "TEACHER", page: 1, limit: 1 })),
  });
  const roster = usePagedList<AdminUserRow>({
    queryKey: ["admin", "users", { role: "TEACHER", q: appliedQ }, scope],
    fetchPage: (page) =>
      adminApi.users({ role: "TEACHER", page, q: appliedQ || undefined, limit: PAGE_LIMIT }),
    limit: PAGE_LIMIT,
  });

  const [selected, setSelected] = useState<AdminUserRow | null>(null);

  return (
    <Screen scroll={false} padded={false}>
      <AppTopBar alertsPath="/admin/alerts" />
      <View style={{ paddingHorizontal: sp[20], gap: sp[16], paddingTop: sp[16] }}>
        <View>
          <T variant="h2" weight="bold">
            إدارة الأساتذة
          </T>
          <T variant="body" color="muted">
            توثيق الملفات الأكاديمية وتعيين المناصب القيادية لكل أستاذ.
          </T>
        </View>

        <StatLine
          label="عدد الأساتذة"
          value={num(count.data?.rows ? (count.data.meta?.total ?? count.data.rows.length) : null, "…")}
          hint={count.isLoading ? "قراءة عدّاد الخادم…" : "في هذه المؤسّسة"}
        />

        <SearchBar
          value={q}
          onChange={setQ}
          placeholder="ابحث بالاسم أو البريد الإلكتروني…"
          onClear={() => setQ("")}
        />
      </View>
      <View style={{ flex: 1 }}>
        <DataList
          data={roster.items}
          renderItem={({ item }) => <TeacherRow item={item} onSelect={setSelected} />}
          keyExtractor={(t) => t.id}
          isLoading={roster.isLoading}
          isError={roster.isError}
          errorMessage={humanizeError(roster.query.error)}
          onRetry={() => roster.refetch()}
          refetch={roster.refetch}
          isRefetching={roster.isRefetching}
          onEndReached={roster.onEndReached}
          isFetchingNextPage={roster.isFetchingNextPage}
          hasNextPage={roster.hasNextPage}
          loadMoreError={roster.loadMoreError}
          onRetryLoadMore={roster.retryLoadMore}
          emptyTitle={appliedQ ? "لا نتائج مطابقة" : "لم يتم تسجيل أساتذة بعد"}
          emptyMessage={
            appliedQ
              ? "لم نجد أساتذة تطابق البحث الحالي."
              : "ستظهر القائمة فور تسجيل أول أستاذ في النظام."
          }
          contentPadding={{ horizontal: 20, top: 8, bottom: 24 }}
        />
      </View>

      {selected ? <TeacherSheet teacher={selected} onClose={() => setSelected(null)} /> : null}
    </Screen>
  );
}

/* ─── roster row (module scope, memo-stable) ─── */

const TeacherRow = makeRow<AdminUserRow, { onSelect: (row: AdminUserRow) => void }>(
  ({ item, onSelect }) => (
    <LedgerRow
      onPress={() => onSelect(item)}
      accessibilityLabel={`ملف ${item.firstName} ${item.lastName}`}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
        <UserAvatar
          url={avatarUrlOf(item)}
          initials={item.avatarInitials ?? initials(item.firstName, item.lastName)}
          color={item.avatarColor}
          size={36}
        />
        <View style={{ flex: 1, gap: 2 }}>
          <T variant="body" weight="bold" numberOfLines={1}>
            {item.firstName} {item.lastName}
          </T>
          <T variant="xs" color="muted" numberOfLines={1}>
            {item.email}
          </T>
        </View>
        {item.verifiedAt ? <Badge label="موثَّق" tone="mint" /> : null}
        {item.position ? (
          <Badge label={POSITION_LABELS[item.position] ?? "منصب آخر"} tone="lavender" />
        ) : null}
      </View>
    </LedgerRow>
  ),
);

/* ─── Teacher actions sheet: verify + position + permissions ─── */

interface SuggestionPayload {
  eligibilityNote?: string | null;
  suggestedCourses?: { id?: string; name?: string; code?: string | null }[];
}

function TeacherSheet({ teacher, onClose }: { teacher: AdminUserRow; onClose: () => void }) {
  const p = usePalette();
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const [mode, setMode] = useState<"actions" | "position">("actions");
  const [unverifyConfirm, setUnverifyConfirm] = useState(false);

  const facs = useQuery({
    queryKey: ["admin", "faculties", scope],
    queryFn: async () => (await adminApi.faculties()) as FacultyNode[],
    enabled: mode === "position",
  });

  const suggestions = useQuery({
    queryKey: ["admin", "teachers", teacher.id, "suggestions", scope],
    queryFn: () => adminApi.positionSuggestions(teacher.id) as Promise<SuggestionPayload>,
  });

  const verify = useMutation({
    mutationFn: (verified: boolean) => adminApi.verifyTeacher(teacher.id, { verified }),
    onSuccess: (_d, verified) => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "teachers"] });
      toast.success(verified ? `تمّ توثيق «${teacher.firstName} ${teacher.lastName}».` : "أُلغي توثيق الأستاذ.");
    },
    onError: (e) => toast.error(humanizeError(e), "تعذّر تحديث التوثيق"),
  });

  const [position, setPosition] = useState<PositionChoice>(
    (teacher.position as PositionChoice) ?? "NONE",
  );
  const [facultyId, setFacultyId] = useState<string | null>(null);
  const [departmentId, setDepartmentId] = useState<string | null>(null);

  const setPositionM = useMutation({
    mutationFn: () => {
      const payload: Parameters<typeof adminApi.setPosition>[1] =
        position === "NONE"
          ? { position: null }
          : position === "DEPARTMENT_HEAD"
            ? { position: "DEPARTMENT_HEAD", positionDepartmentId: departmentId ?? undefined }
            : { position, positionFacultyId: facultyId ?? undefined };
      return adminApi.setPosition(teacher.id, payload);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      qc.invalidateQueries({ queryKey: ["admin", "teachers"] });
      toast.success("تمّ حفظ التعيين.", "المنصب القياديّ");
      onClose();
    },
    onError: (e) => toast.error(humanizeError(e), "تعذّر حفظ التعيين"),
  });

  const facultyOptions = (facs.data ?? []).map((f) => ({ id: f.id, label: f.name, sub: f.city ?? null }));
  const departmentOptions =
    (facs.data ?? []).find((f) => f.id === facultyId)?.departments?.map((d) => ({
      id: d.id,
      label: d.name,
    })) ?? [];

  const needsFaculty = position === "DEAN" || position === "ASSOCIATE_DEAN" || position === "DEPARTMENT_HEAD";
  const canSave =
    position === "NONE" ||
    (needsFaculty && !!facultyId && (position !== "DEPARTMENT_HEAD" || !!departmentId));

  const suggestedNames = (suggestions.data?.suggestedCourses ?? []).slice(0, 3);

  return (
    <Sheet open onClose={onClose} title={`${teacher.firstName} ${teacher.lastName}`}>
      {mode === "actions" ? (
        <View style={{ gap: 12 }}>
          <T variant="body" color="muted">
            {ROLE_LABELS[teacher.role] ?? "دور آخر"} · {teacher.email}
          </T>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {teacher.verifiedAt ? <Badge label="موثَّق" tone="mint" /> : <Badge label="غير موثَّق" tone="grey" />}
            {teacher.position ? (
              <Badge label={POSITION_LABELS[teacher.position] ?? "منصب آخر"} tone="lavender" />
            ) : null}
          </View>

          {suggestions.data?.eligibilityNote ? (
            <T variant="sm" color="muted">
              {textOf(suggestions.data.eligibilityNote)}
            </T>
          ) : null}
          {suggestedNames.length > 0 ? (
            <T variant="xs" color="faint">
              مقرّرات مقترحة: {suggestedNames.map((c) => c.name ?? "—").join(" · ")}
            </T>
          ) : null}

          {teacher.verifiedAt ? (
            <Button
              label="إلغاء التوثيق"
              kind="ghost"
              small
              onPress={() => setUnverifyConfirm(true)}
            />
          ) : (
            <Button
              label={verify.isPending ? "جارٍ التوثيق…" : "توثيق"}
              kind="primary"
              icon={<ShieldCheck size={14} color={p.primaryFg} />}
              disabled={verify.isPending}
              onPress={() => verify.mutate(true)}
            />
          )}

          <Button
            label="تعيين منصب"
            kind="accent"
            icon={<Crown size={14} color={p.accentFg} />}
            onPress={() => setMode("position")}
          />
          <Button
            label="إدارة الصلاحيات"
            kind="ghost"
            onPress={() => {
              onClose();
              router.push({ pathname: "/admin/permissions/[id]", params: { id: teacher.id } } as never);
            }}
          />
        </View>
      ) : (
        <View style={{ gap: 12 }}>
          <T variant="sm" color="muted">
            يُمنح المنصب بالتعيين الإداريّ — يضاف فوق دور الأستاذ ولا يستبدله.
          </T>
          <Segmented options={POSITION_OPTIONS} selectedId={position ?? ""} onSelect={(id) => setPosition(id as PositionChoice)} />
          {needsFaculty ? (
            <SelectField
              label="الكلّيّة"
              value={facultyOptions.find((f) => f.id === facultyId) ?? null}
              options={facultyOptions}
              onSelect={(id) => {
                setFacultyId(id);
                setDepartmentId(null);
              }}
              loading={facs.isLoading}
              placeholder="اختر الكلّيّة…"
            />
          ) : null}
          {position === "DEPARTMENT_HEAD" ? (
            <SelectField
              label="القسم"
              value={departmentOptions.find((d) => d.id === departmentId) ?? null}
              options={departmentOptions}
              onSelect={setDepartmentId}
              disabled={!facultyId}
              placeholder="اختر القسم…"
            />
          ) : null}
          <Button
            label={
              setPositionM.isPending
                ? "جارٍ الحفظ…"
                : position === "NONE"
                  ? "إلغاء التعيين"
                  : `تعيين ${POSITION_LABELS[position] ?? ""}`
            }
            disabled={!canSave || setPositionM.isPending}
            onPress={() => setPositionM.mutate()}
          />
          <Button label="رجوع" kind="ghost" small onPress={() => setMode("actions")} />
        </View>
      )}

      <ConfirmDialog
        open={unverifyConfirm}
        title="إلغاء توثيق الأستاذ"
        message={`سيُفقد «${teacher.firstName} ${teacher.lastName}» شارة التوثيق، ويُسجَّل الإجراء في سجلّ النشاط.`}
        confirmLabel="إلغاء التوثيق"
        danger
        loading={verify.isPending}
        onConfirm={() => {
          verify.mutate(false);
          setUnverifyConfirm(false);
        }}
        onCancel={() => setUnverifyConfirm(false)}
      />
    </Sheet>
  );
}
