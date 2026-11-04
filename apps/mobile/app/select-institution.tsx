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
import { Badge } from "@/components/ui/surfaces";
import { Field } from "@/components/ui/fields";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { BrandMark } from "@/components/ui/brand";
import { PressableScale } from "@/motion";
import { haptics } from "@/haptics";
import { humanizeError } from "@/lib/errors";

/**
 * /select-institution — the multi-institution context gate.
 * Login auto-selects only when exactly one ACTIVE membership exists;
 * otherwise the user picks before any academic surface loads
 * (403 INSTITUTION_CONTEXT_REQUIRED otherwise). R334 R2: searchable
 * picker rows (PressableScale + haptics.selection), skeleton rows with
 * the picker's real geometry while the session hydrates, an honest
 * building-room EmptyState when no membership is active, and failures
 * run through humanizeError.
 */
export default function SelectInstitution() {
  const p = usePalette();
  const user = useSession((s) => s.user);
  const selectInstitution = useSession((s) => s.selectInstitution);
  const logout = useSession((s) => s.logout);
  const qc = useQueryClient();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const active = (user?.memberships ?? []).filter((m) => m.isActive);

  /* Search matches the Arabic and the Latin name alike (case-insensitive). */
  const needle = query.trim().toLowerCase();
  const rows = needle
    ? active.filter(
        (m) =>
          m.name.toLowerCase().includes(needle) ||
          (m.nameEn ?? "").toLowerCase().includes(needle),
      )
    : active;

  const pick = async (institutionId: string) => {
    haptics.selection();
    setBusyId(institutionId);
    setError(null);
    try {
      const fresh = await selectInstitution(institutionId);
      qc.clear();
      router.replace((ROLE_HOME[fresh.role] ?? "/student/dashboard") as never);
    } catch (err) {
      setError(humanizeError(err));
    } finally {
      setBusyId(null);
    }
  };

  const doLogout = async () => {
    await logout();
    qc.clear();
    router.replace("/");
  };

  /* Session hydrating — skeleton rows with the picker's real geometry
     (the same 72px BrandMark row), never a bare spinner. */
  if (!user) {
    return (
      <Screen scroll>
        <PageHeader title="اختيار المؤسّسة" kicker="سياق الحساب" compact />
        <SkeletonList rows={3} rowHeight={72} />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <PageHeader title="اختيار المؤسّسة" kicker="سياق الحساب" compact />
      <T variant="body" color="secondary">
        حسابك لديه أكثر من عضوية نشطة — اختر المؤسّسة التي ستعمل ضمنها الآن.
      </T>

      {active.length > 1 ? (
        <Field
          label="ابحث عن مؤسّسة"
          value={query}
          onChangeText={setQuery}
          placeholder="اسم المؤسّسة…"
          autoCorrect={false}
        />
      ) : null}

      {error ? (
        <ErrorState message={error} onReport={() => router.push("/report" as never)} compact />
      ) : null}

      <View style={{ gap: sp[8] }}>
        {rows.map((m) => {
          const busy = busyId === m.institutionId;
          return (
            <PressableScale
              key={m.institutionId}
              accessibilityRole="button"
              accessibilityLabel={`اختيار ${m.name} — ${
                ROLE_LABELS[m.role] ?? m.role
              }${busy ? " — جارٍ الدخول" : ""}`}
              accessibilityState={{ busy, disabled: busyId !== null }}
              onPress={() => void pick(m.institutionId)}
              disabled={busyId !== null}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: sp[12],
                borderWidth: 1,
                borderColor: p.border,
                backgroundColor: p.surface,
                padding: sp[12],
                minHeight: 72,
                opacity: busyId && busyId !== m.institutionId ? 0.5 : 1,
              }}
            >
              <BrandMark size={32} />
              <View style={{ flex: 1, gap: 2 }}>
                <T variant="body" weight="bold" numberOfLines={1}>
                  {m.name}
                </T>
                {m.nameEn ? (
                  <T variant="sm" color="muted" numberOfLines={1}>
                    {m.nameEn}
                  </T>
                ) : null}
              </View>
              {busy ? (
                <T variant="xs" color="muted">
                  جارٍ الدخول…
                </T>
              ) : (
                <Badge label={ROLE_LABELS[m.role] ?? m.role} tone="sky" />
              )}
            </PressableScale>
          );
        })}

        {needle && rows.length === 0 ? (
          <EmptyState
            title="لا مؤسّسة تطابق بحثك"
            message="جرّب اسمًا آخر — أو امسح البحث لعرض جميع عضوياتك النشطة."
          />
        ) : null}

        {active.length === 0 ? (
          <EmptyState
            room="building"
            title="لا عضوية نشطة بعد"
            message="لم تُفعَّل أي عضوية مؤسّسة على حسابك — تواصل مع إدارة مؤسّستك لإتمام التفعيل، ثم عُد إلى تسجيل الدخول."
            actionLabel="تسجيل الخروج"
            onAction={() => void doLogout()}
          />
        ) : null}
      </View>

      {active.length > 0 ? (
        <Button label="تسجيل الخروج" kind="ghost" small onPress={() => void doLogout()} />
      ) : null}
    </Screen>
  );
}
