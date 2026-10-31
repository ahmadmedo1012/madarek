import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Fingerprint from "lucide-react-native/icons/fingerprint-pattern";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { apiWithCookieCapture, ApiError, post, put } from "@/api/client";
import { useSession, ROLE_LABELS, POSITION_LABELS, RANK_LABELS } from "@/auth/session";
import { setThemePreference, usePalette, useThemePreference, type ThemePreference } from "@/design/theme";
import { currentPermission, requestAndRegisterPush, unregisterPushDevices } from "@/lib/push";
import { sp } from "@/design/tokens";
import { Screen, PageHeader, SectionBar } from "@/components/ui/screen";
import { T, MonoLabel } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Card, Badge, ConfirmDialog, Hairline } from "@/components/ui/surfaces";
import { Field, Segmented, SecretField } from "@/components/ui/fields";
import { toast } from "@/components/ui/toast";
import { authenticate, biometricAvailable, getBiometricLockEnabled, setBiometricLockEnabled } from "@/lib/biometric";
import type { SessionResponse } from "@/api/types";
import Constants from "expo-constants";

/** /settings — theme + change password + account actions (every role). */
export default function Settings() {
  const p = usePalette();
  const user = useSession((s) => s.user);
  const logout = useSession((s) => s.logout);
  const setSession = useSession((s) => s.setSession);
  const preference = useThemePreference();
  const qc = useQueryClient();

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [confirmLogout, setConfirmLogout] = useState(false);

  /* R327 C3 — the biometric app-lock seat: the row only exists when the
   * device has hardware AND an enrolled biometric (web: never). Enabling
   * PROVES it first (one authenticate) before the flag is saved — a
   * toggle that never asked the sensor is a lock nobody tested. */
  const [bioAvail, setBioAvail] = useState(false);
  const [bioOn, setBioOn] = useState(false);
  const [bioBusy, setBioBusy] = useState(false);
  useEffect(() => {
    void biometricAvailable().then(setBioAvail);
    void getBiometricLockEnabled().then(setBioOn);
  }, []);
  const toggleBio = async (next: boolean) => {
    setBioBusy(true);
    try {
      if (next) {
        const ok = await authenticate("أكّد تفعيل قفل التطبيق");
        if (!ok) return; // refused → the toggle stays off
      }
      await setBiometricLockEnabled(next);
      setBioOn(next);
      toast.success(
        next ? "سيُطلب فتح القفل عند كل فتح بارد للتطبيق." : "أُلغي قفل التطبيق.",
        "الأمان",
      );
    } finally {
      setBioBusy(false);
    }
  };

  const themeOptions: { id: ThemePreference; label: string }[] = [
    { id: "light", label: "فاتح" },
    { id: "dark", label: "داكن" },
    { id: "system", label: "النظام" },
  ];

  const applyTheme = async (next: ThemePreference) => {
    setThemePreference(next);
    try {
      await put("/me/theme", { themePreference: next.toUpperCase() });
    } catch {
      // Local preference still applies; server sync is best-effort.
    }
  };

  const changePassword = async () => {
    setPwError(null);
    if (newPassword.length < 12 || newPassword.length > 72) {
      setPwError("كلمة المرور الجديدة يجب ألا تقل عن 12 حرفًا ولا تتجاوز 72.");
      return;
    }
    if (newPassword !== confirm) {
      setPwError("كلمتا المرور غير متطابقتين.");
      return;
    }
    setBusy(true);
    try {
      const { data, refreshCookie } = await apiWithCookieCapture<SessionResponse>("/auth/change-password", {
        method: "POST",
        body: { currentPassword, newPassword },
      });
      setSession(data.user, data.accessToken, refreshCookie);
      setCurrentPassword("");
      setNewPassword("");
      setConfirm("");
      toast.success("تم تغيير كلمة المرور — انتهت جلسات أجهزتك الأخرى.", "كلمة المرور");
    } catch (err) {
      setPwError((err as ApiError).message ?? "تعذّر تغيير كلمة المرور.");
    } finally {
      setBusy(false);
    }
  };

  const themeLabel = user?.themePreference ? `الخادم: ${user.themePreference === "LIGHT" ? "فاتح" : user.themePreference === "DARK" ? "داكن" : "النظام"}` : "الخادم: —";

  return (
    <Screen scroll>
      <PageHeader title="الإعدادات" kicker="مدارك" mono="SETTINGS" />

      <SectionBar index={1} title="المظهر" />
      <Card style={{ gap: sp[8] }}>
        <T variant="body" color="secondary">
          يتبع التطبيق تفضيلك هنا وعلى الموقع — يتزامن مع حسابك.
        </T>
        <Segmented options={themeOptions} selectedId={preference} onSelect={(id) => applyTheme(id as ThemePreference)} />
        <T variant="xs" color="faint">{themeLabel}</T>
      </Card>

      <SectionBar index={2} title="الحساب" />
      <Card style={{ gap: sp[8] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
          <View style={{ flex: 1 }}>
            <T variant="body" weight="bold">
              {user ? `${user.firstName} ${user.lastName}` : "—"}
            </T>
            <T variant="sm" color="muted">
              {user?.email}
            </T>
          </View>
          {user ? <Badge label={ROLE_LABELS[user.role] ?? user.role} tone="sky" /> : null}
        </View>
        <Hairline />
        <Stat label="المؤسّسة الحالية" value={user?.currentInstitution?.name ?? "—"} />
        <Stat label="نطاق العمل" value={user?.scopeFaculty ? `كلية ${user.scopeFaculty.name}` : user?.scopeFacultyId ? "كلية محددة" : "على مستوى الجامعة"} />
        {user?.teacherProfile?.position ? (
          <Stat
            label="المنصب الأكاديمي"
            value={`${POSITION_LABELS[user.teacherProfile.position] ?? user.teacherProfile.position}${
              user.teacherProfile.positionFaculty ? ` — ${user.teacherProfile.positionFaculty.name}` : ""
            }`}
          />
        ) : null}
        {user?.teacherProfile?.rank ? <Stat label="الرتبة" value={RANK_LABELS[user.teacherProfile.rank] ?? user.teacherProfile.rank} /> : null}
        <Stat
          label="العضويات"
          value={(user?.memberships ?? []).map((m) => `${m.name} (${ROLE_LABELS[m.role] ?? m.role})`).join(" · ") || "—"}
        />
      </Card>

      <SectionBar index={3} title="تغيير كلمة المرور" />
      <Card style={{ gap: sp[10] }}>
        <Field label="كلمة المرور الحالية" value={currentPassword} onChangeText={setCurrentPassword} secureTextEntry autoCorrect={false} />
        <SecretField label="كلمة المرور الجديدة" value={newPassword} onChangeText={setNewPassword} hint="12 حرفًا على الأقل." />
        <SecretField label="تأكيد كلمة المرور الجديدة" value={confirm} onChangeText={setConfirm} onSubmitEditing={changePassword} />
        {pwError ? <T variant="sm" color="danger">{pwError}</T> : null}
        <T variant="xs" color="faint">
          تغيير كلمة المرور ينهي جلساتك على جميع الأجهزة الأخرى.
        </T>
        <Button label={busy ? "جارٍ الحفظ…" : "حفظ كلمة المرور"} onPress={changePassword} loading={busy} />
      </Card>

      <SectionBar index={4} title="الأمان" />
      {bioAvail ? (
        <Card style={{ gap: sp[8] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
            <Fingerprint size={20} color={p.textMuted} />
            <View style={{ flex: 1 }}>
              <T variant="body" weight="bold">
                قفل التطبيق بالبصمة
              </T>
              <T variant="xs" color="muted">
                عند التفعيل، يُطلب فتح القفل عند كل فتح بارد للتطبيق قبل عرض أي بيانات — مع رمز الجهاز كبديل دائمًا.
              </T>
            </View>
            <Button
              label={bioBusy ? "…" : bioOn ? "إلغاء" : "تفعيل"}
              kind={bioOn ? "ghost" : "primary"}
              small
              disabled={bioBusy}
              onPress={() => void toggleBio(!bioOn)}
            />
          </View>
        </Card>
      ) : (
        <Card>
          <T variant="sm" color="muted">
            قفل التطبيق بالبصمة متاح على الأجهزة المزوّدة بمستشعر بصمة أو تعرّف على الوجه — جهازك الحالي لا يوفّره (أو لم تُسجّل بصمة في النظام).
          </T>
        </Card>
      )}

      <SectionBar index={5} title="الجلسة" />
      <Button label="تسجيل الخروج" kind="danger" onPress={() => setConfirmLogout(true)} />
      <T variant="xs" color="faint" style={{ textAlign: "center" }}>
        مدارك موبايل {Constants.expoConfig?.version ?? "1.0.0"} — Expo SDK {Constants.expoConfig?.sdkVersion ?? "58"}
      </T>

      <ConfirmDialog
        open={confirmLogout}
        title="تسجيل الخروج؟"
        message="ستنتهي جلستك على هذا الجهاز فقط — تُحفظ جلسات أجهزتك الأخرى."
        confirmLabel="خروج"
        danger
        onCancel={() => setConfirmLogout(false)}
        onConfirm={async () => {
          setConfirmLogout(false);
          // R327 C3 — a handed-over phone must not keep pushing.
          await unregisterPushDevices().catch(() => undefined);
          await logout();
          qc.clear();
          router.replace("/");
        }}
      />
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ gap: 2 }}>
      <T variant="xs" color="muted">
        {label}
      </T>
      <T variant="sm" weight="medium">
        {value}
      </T>
    </View>
  );
}
