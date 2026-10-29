import { useState } from "react";
import { View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ShieldCheck } from "lucide-react-native";
import { Screen } from "@/components/ui";
import { StackHeader } from "@/components/shell/AppTopBar";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow, StatLine } from "@/components/ui/data";
import { Segmented, SelectField } from "@/components/ui/fields";
import { SkeletonList, ErrorState } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { adminApi } from "@/api/admin";
import { ApiError } from "@/api/client";
import { useSession, ROLE_LABELS } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { latn, num } from "@/lib/format";
import { CAPABILITY_LABEL, type FacultyNode } from "@/features/governance/components";

/**
 * Pushed: /admin/permissions/[id] — the per-user capability editor
 * (web AdminPermissionsPage parity): the 17-capability matrix + the
 * governance scope selector.
 */
export default function AdminPermissions() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = typeof id === "string" ? id : Array.isArray(id) ? id[0] : "";
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const myId = useSession((s) => s.user?.id);
  const isSelf = !!myId && myId === userId;

  const user = useQuery({
    queryKey: ["admin", "users", "detail", userId, scope],
    queryFn: () => adminApi.user(userId),
    enabled: !!userId,
  });
  const permissions = useQuery({
    queryKey: ["admin", "users", userId, "permissions", scope],
    queryFn: () => adminApi.permissions(userId),
    enabled: !!userId,
  });
  const facs = useQuery({
    queryKey: ["admin", "faculties", scope],
    queryFn: async () => (await adminApi.faculties()) as FacultyNode[],
  });

  const grantedMap = new Map(
    (permissions.data?.capabilities ?? []).map((c) => [c.capability, c.granted]),
  );
  const grantedCount = [...grantedMap.values()].filter(Boolean).length;

  const setPermission = useMutation({
    mutationFn: (payload: { capability: string; grant: boolean }) =>
      adminApi.setPermission(userId, payload),
    onSuccess: (_d, payload) => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success(
        payload.grant
          ? `مُنحت صلاحية «${CAPABILITY_LABEL[payload.capability] ?? payload.capability}».`
          : `سُحبت صلاحية «${CAPABILITY_LABEL[payload.capability] ?? payload.capability}».`,
      );
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّر تحديث الصلاحية"),
  });

  const currentScopeFaculty = (
    user.data as { scopeFaculty?: { id?: string; name?: string } | null } | undefined
  )?.scopeFaculty;
  const [scopeMode, setScopeMode] = useState<"UNIVERSITY" | "FACULTY">(
    currentScopeFaculty ? "FACULTY" : "UNIVERSITY",
  );
  const [scopeFacultyId, setScopeFacultyId] = useState<string | null>(null);

  const setScope = useMutation({
    mutationFn: () => adminApi.setScope(userId, scopeMode === "UNIVERSITY" ? null : scopeFacultyId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "users"] });
      toast.success("تمّ حفظ النطاق.", "نطاق العمل");
    },
    onError: (e) => toast.error((e as ApiError).message, "تعذّر حفظ النطاق"),
  });

  const facultyOptions = (facs.data ?? []).map((f) => ({ id: f.id, label: f.name }));

  const busy = setPermission.isPending;

  return (
    <Screen scroll>
      <StackHeader
        title={user.data ? `${user.data.firstName} ${user.data.lastName}` : "إدارة الصلاحيات"}
        kicker="لوحة المسجل العام"
      />
      <View style={{ gap: 16, paddingTop: 16 }}>
        {user.data ? (
          <T variant="body" color="muted">
            {ROLE_LABELS[user.data.role] ?? user.data.role} · {user.data.email}
          </T>
        ) : null}

        {permissions.isLoading ? (
          <SkeletonList rows={6} />
        ) : permissions.isError ? (
          <ErrorState message={(permissions.error as Error).message} onRetry={() => permissions.refetch()} />
        ) : (
          <>
            <StatLine
              label="صلاحيات مفعّلة"
              value={latn(grantedCount)}
              hint={`من ${latn(Object.keys(CAPABILITY_LABEL).length)} صلاحية في المنصّة`}
            />

            {isSelf ? (
              <T variant="sm" color="danger">
                هذه صلاحياتك أنت — حرس الحاكمية يمنع تعديل صلاحياتك بنفسك من الخادم؛ اطلب من مالك أو إداري آخر تطبيق التغيير.
              </T>
            ) : null}

            <T variant="xs" color="muted">
              الصلاحيات الافتراضية مرتبطة بالدور. يمكنك منح صلاحية إضافية أو سحب صلاحية لهذا المستخدم تحديداً.
            </T>

            <RowList>
              {Object.entries(CAPABILITY_LABEL).map(([cap, label], i, arr) => {
                const granted = grantedMap.get(cap) ?? false;
                return (
                  <LedgerRow key={cap} last={i === arr.length - 1}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <View style={{ flex: 1 }}>
                        <T variant="body" weight="medium">
                          {label}
                        </T>
                      </View>
                      {granted ? (
                        <Badge label="ممنوحة" tone="mint" />
                      ) : (
                        <Badge label="غير مفعّلة" tone="grey" />
                      )}
                    </View>
                    <View style={{ flexDirection: "row", paddingTop: 8 }}>
                      <Button
                        label={granted ? "سحب" : "منح"}
                        kind={granted ? "ghost" : "primary"}
                        small
                        disabled={busy || isSelf}
                        icon={granted ? undefined : <ShieldCheck size={13} color="#FFFFFF" />}
                        onPress={() => setPermission.mutate({ capability: cap, grant: !granted })}
                      />
                    </View>
                  </LedgerRow>
                );
              })}
            </RowList>

            <View>
              <T variant="h4" weight="bold">
                نطاق العمل
              </T>
              <T variant="sm" color="muted">
                النطاق الافتراضيّ على مستوى الجامعة. يمكن قَصره على كلّيّة واحدة فقط للحدّ من نطاق الإشراف.
              </T>
              {currentScopeFaculty?.name ? (
                <T variant="xs" color="faint">
                  النطاق الحاليّ: {currentScopeFaculty.name}
                </T>
              ) : null}
              <View style={{ gap: 12, paddingTop: 8 }}>
                <Segmented
                  options={[
                    { id: "UNIVERSITY", label: "على مستوى الجامعة" },
                    { id: "FACULTY", label: "كلّيّة محدَّدة" },
                  ]}
                  selectedId={scopeMode}
                  onSelect={(m) => setScopeMode(m as "UNIVERSITY" | "FACULTY")}
                />
                {scopeMode === "FACULTY" ? (
                  <SelectField
                    label="الكلّيّة"
                    value={facultyOptions.find((f) => f.id === scopeFacultyId) ?? null}
                    options={facultyOptions}
                    onSelect={setScopeFacultyId}
                    loading={facs.isLoading}
                    placeholder="اختر…"
                  />
                ) : null}
                <Button
                  label={setScope.isPending ? "جارٍ الحفظ…" : "حفظ النطاق"}
                  disabled={setScope.isPending || (scopeMode === "FACULTY" && !scopeFacultyId)}
                  onPress={() => setScope.mutate()}
                />
              </View>
            </View>

            <StatLine
              label="قدرات مُعروضة من الخادم"
              value={num(permissions.data?.capabilities?.length ?? null)}
              hint="عدد الصلاحيات التي أجاب عنها الخادم لهذا المستخدم"
            />
          </>
        )}
      </View>
    </Screen>
  );
}
