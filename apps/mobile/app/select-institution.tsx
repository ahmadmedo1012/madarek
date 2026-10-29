import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { useSession, ROLE_HOME, ROLE_LABELS } from "@/auth/session";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { Screen, PageHeader } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Card, Badge } from "@/components/ui/surfaces";
import { BrandMark } from "@/components/ui/brand";
import { LoadingScreen } from "@/components/ui/states";

/**
 * /select-institution — the multi-institution context gate.
 * Login auto-selects only when exactly one ACTIVE membership exists;
 * otherwise the user picks before any academic surface loads
 * (403 INSTITUTION_CONTEXT_REQUIRED otherwise).
 */
export default function SelectInstitution() {
  const p = usePalette();
  const user = useSession((s) => s.user);
  const selectInstitution = useSession((s) => s.selectInstitution);
  const logout = useSession((s) => s.logout);
  const qc = useQueryClient();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!user) {
    return <LoadingScreen />;
  }

  const active = (user.memberships ?? []).filter((m) => m.isActive);

  const pick = async (institutionId: string) => {
    setBusyId(institutionId);
    setError(null);
    try {
      const fresh = await selectInstitution(institutionId);
      qc.clear();
      router.replace((ROLE_HOME[fresh.role] ?? "/student/dashboard") as never);
    } catch (err) {
      setError((err as Error).message ?? "تعذّر اختيار المؤسّسة.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Screen scroll>
      <PageHeader title="اختيار المؤسّسة" kicker="سياق الحساب" compact />
      <T variant="body" color="secondary">
        حسابك لديه أكثر من عضوية نشطة — اختر المؤسّسة التي ستعمل ضمنها الآن.
      </T>
      <View style={{ gap: sp[8] }}>
        {active.map((m) => (
          <Card
            key={m.institutionId}
            onPress={() => pick(m.institutionId)}
            accessibilityLabel={`اختيار ${m.name}`}
            style={{ flexDirection: "row", alignItems: "center", gap: sp[12], opacity: busyId && busyId !== m.institutionId ? 0.5 : 1 }}
          >
            <BrandMark size={32} />
            <View style={{ flex: 1, gap: 2 }}>
              <T variant="body" weight="bold">{m.name}</T>
              {m.nameEn ? <T variant="sm" color="muted">{m.nameEn}</T> : null}
            </View>
            <Badge label={ROLE_LABELS[m.role] ?? m.role} tone="sky" />
          </Card>
        ))}
        {active.length === 0 ? (
          <Card>
            <T variant="body" color="muted">
              لا توجد عضوية نشطة مرتبطة بحسابك حاليًا — تواصل مع إدارة مؤسّستك، أو اختر تسجيل الخروج.
            </T>
          </Card>
        ) : null}
        {error ? (
          <Card style={{ borderColor: "#C72E00", backgroundColor: p.surface }}>
            <T variant="sm" color="danger">{error}</T>
          </Card>
        ) : null}
        <Button
          label="تسجيل الخروج"
          kind="ghost"
          small
          onPress={async () => {
            await logout();
            qc.clear();
            router.replace("/");
          }}
          style={{ marginTop: sp[8] }}
        />
      </View>
    </Screen>
  );
}
