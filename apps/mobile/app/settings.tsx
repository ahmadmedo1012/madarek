import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import Fingerprint from "lucide-react-native/icons/fingerprint-pattern";
import Flag from "lucide-react-native/icons/flag";
import Hash from "lucide-react-native/icons/hash";
import Moon from "lucide-react-native/icons/moon";
import Mail from "lucide-react-native/icons/mail";
import Vibrate from "lucide-react-native/icons/vibrate";
import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { apiWithCookieCapture, ApiError, get, put } from "@/api/client";
import { useSession, ROLE_LABELS, POSITION_LABELS, RANK_LABELS } from "@/auth/session";
import { setThemePreference, usePalette, useThemePreference, type ThemePreference } from "@/design/theme";
import { unregisterPushDevices } from "@/lib/push";
import { NUMERALS_OPTIONS, useNumerals } from "@/lib/format";
import { haptics } from "@/haptics";
import { sp } from "@/design/tokens";
import { Screen, PageHeader } from "@/components/ui/screen";
import { T, MonoLabel } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { Card, Badge } from "@/components/ui/surfaces";
import { RowList, LedgerRow } from "@/components/ui/data";
import { Field, Segmented, SecretField } from "@/components/ui/fields";
import { ConfirmSheet } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { authenticate, biometricAvailable, getBiometricLockEnabled, setBiometricLockEnabled } from "@/lib/biometric";
import type { SessionResponse } from "@/api/types";
import Constants from "expo-constants";

/** /settings — the SHARED settings surface (every role). R341 M3: the
 *  30-row wall of boxed one-per-setting cards is dead — rows are grouped
 *  by concern under muted group headers ([01] التفضيلات · [02] الحساب ·
 *  [03] الأمان · [04] الدعم · [05] الجلسة), and every row sits on the
 *  ledger rhythm (RowList/LedgerRow hairlines, 48px targets), tokens
 *  only. The measured hierarchy: the page title carries the loud tier,
 *  group headers stay muted so the rows — the actual seats — read first.
 *  The student Profile keeps a one-tap mirror of the same toggles; both
 *  seats read/write the identical persisted state, so they can never
 *  disagree. */
export default function Settings() {
  const p = usePalette();
  const user = useSession((s) => s.user);
  const logout = useSession((s) => s.logout);
  const setSession = useSession((s) => s.setSession);
  const preference = useThemePreference();
  const qc = useQueryClient();
  const { numerals, setNumerals } = useNumerals();

  /* «ردود اللمس» — the persisted kill-switch, identical seat to Profile
     (isEnabled() is a synchronous cached read → lazy initialiser, no effect). */
  const [hapticsOn, setHapticsOn] = useState(() => haptics.isEnabled());
  const toggleHaptics = (next: boolean) => {
    haptics.setEnabled(next);
    setHapticsOn(next);
    if (next) haptics.impact("light"); // a felt sample of what was enabled
  };

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

  /* R350 E6 — «إعدادات البريد»: the notification-preference toggles
   * (the E3 law, on its user seat): security/account are ESSENTIAL
   * (shown read-only, never toggleable — a password reset must always
   * arrive); courses/announcements/digest are the user's call. */
  const [mailPrefs, setMailPrefs] = useState<
    Array<{ category: string; emailEnabled: boolean; essential: boolean }>
  >([]);
  const [mailPrefsBusy, setMailPrefsBusy] = useState<string | null>(null);
  useEffect(() => {
    get<Array<{ category: string; emailEnabled: boolean; essential: boolean }>>(
      "/me/notification-preferences",
    )
      // The poisoned-net law: a hostile API answer (null/undefined/shape)
      // degrades to "no toggles" — never a crash on .length.
      .then((rows) => setMailPrefs(Array.isArray(rows) ? rows : []))
      .catch(() => setMailPrefs([])); // offline — the toggles just stay hidden
  }, []);
  const toggleMailPref = async (category: string, next: boolean) => {
    setMailPrefsBusy(category);
    try {
      const row = await put<{ category: string; emailEnabled: boolean }>(
        "/me/notification-preferences",
        { category, emailEnabled: next },
      );
      setMailPrefs((rows) =>
        rows.map((r) => (r.category === row.category ? { ...r, emailEnabled: row.emailEnabled } : r)),
      );
      toast.success(
        next ? "ستصلك رسائل هذه الفئة على بريدك." : "أوقفت رسائل هذه الفئة.",
        "البريد",
      );
    } catch (err) {
      toast.error((err as ApiError).message ?? "تعذّر حفظ التفضيل.", "البريد");
    } finally {
      setMailPrefsBusy(null);
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

  const changeNumerals = (next: string) => {
    haptics.selection();
    setNumerals(next as typeof numerals);
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
      <PageHeader title="الإعدادات" kicker="مدارك" />

      {/* [01] التفضيلات — مظهرك وأرقامك وملمس التفاعل، مقاعد متطابقة مع الملف */}
      <View style={{ gap: sp[8] }}>
        <GroupHeader index={1} title="التفضيلات" />
        <RowList>
          <LedgerRow>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
              <Moon size={20} color={p.textMuted} />
              <T variant="body" weight="medium" style={{ flex: 1 }}>
                المظهر
              </T>
              <T variant="sm" color="secondary">
                {themeOptions.find((o) => o.id === preference)?.label ?? "—"}
              </T>
            </View>
            <Segmented
              options={themeOptions}
              selectedId={preference}
              onSelect={(id) => {
                haptics.selection();
                void applyTheme(id as ThemePreference);
              }}
            />
            <T variant="xs" color="faint">{themeLabel}</T>
          </LedgerRow>
          <LedgerRow>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
              <Hash size={20} color={p.textMuted} />
              <T variant="body" weight="medium" style={{ flex: 1 }}>
                الأرقام
              </T>
              <T variant="sm" color="secondary">
                {numerals === "arabic-indic" ? "١٢٣" : "123"}
              </T>
            </View>
            <Segmented options={NUMERALS_OPTIONS} selectedId={numerals} onSelect={changeNumerals} />
            <T variant="xs" color="faint">
              طريقة عرض الأرقام في لوحتك ونتائجك — {`١٢٣`} بالخط العربي أو {`123`} باللاتيني.
            </T>
          </LedgerRow>
          <LedgerRow last>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
              <Vibrate size={20} color={p.textMuted} />
              <View style={{ flex: 1 }}>
                <T variant="body" weight="medium">ردود اللمس</T>
                <T variant="xs" color="muted">
                  اهتزاز خفيف عند التفاعلات الرئيسة — يعمل على الجوال فقط.
                </T>
              </View>
              <Button
                label={hapticsOn ? "إلغاء" : "تفعيل"}
                kind={hapticsOn ? "ghost" : "primary"}
                small
                onPress={() => toggleHaptics(!hapticsOn)}
              />
            </View>
          </LedgerRow>
        </RowList>
      </View>

      {/* [02] البريد — تفضيلات إشعارات البريد الإلكتروني (E3/E6) */}
      {mailPrefs.length > 0 ? (
        <View style={{ gap: sp[8] }}>
          <GroupHeader index={2} title="البريد" />
          <RowList>
            {mailPrefs.map((pref, i) => {
              const label = MAIL_CATEGORY_LABELS[pref.category] ?? pref.category;
              const last = i === mailPrefs.length - 1;
              if (pref.essential) {
                return (
                  <LedgerRow key={pref.category} last={last}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                      <Mail size={20} color={p.textMuted} />
                      <View style={{ flex: 1 }}>
                        <T variant="body" weight="medium">{label}</T>
                        <T variant="xs" color="muted">
                          ضروري لأمان حسابك — لا يمكن إيقافه.
                        </T>
                      </View>
                      <Badge label="دائمًا" tone="sky" />
                    </View>
                  </LedgerRow>
                );
              }
              return (
                <LedgerRow key={pref.category} last={last}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                    <Mail size={20} color={p.textMuted} />
                    <T variant="body" weight="medium" style={{ flex: 1 }}>
                      {label}
                    </T>
                    <Button
                      label={mailPrefsBusy === pref.category ? "…" : pref.emailEnabled ? "إلغاء" : "تفعيل"}
                      kind={pref.emailEnabled ? "ghost" : "primary"}
                      small
                      disabled={mailPrefsBusy === pref.category}
                      onPress={() => void toggleMailPref(pref.category, !pref.emailEnabled)}
                    />
                  </View>
                </LedgerRow>
              );
            })}
          </RowList>
        </View>
      ) : null}

      {/* [03] الحساب — الهويّة والحقائق كما تقرؤها الخدمة الآن */}
      <View style={{ gap: sp[8] }}>
        <GroupHeader index={2} title="الحساب" />
        <RowList>
          <LedgerRow>
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
          </LedgerRow>
          <FactRow label="المؤسّسة الحالية" value={user?.currentInstitution?.name ?? "—"} />
          <FactRow
            label="نطاق العمل"
            value={user?.scopeFaculty ? `كلية ${user.scopeFaculty.name}` : user?.scopeFacultyId ? "كلية محددة" : "على مستوى الجامعة"}
          />
          {user?.teacherProfile?.position ? (
            <FactRow
              label="المنصب الأكاديمي"
              value={`${POSITION_LABELS[user.teacherProfile.position] ?? user.teacherProfile.position}${
                user.teacherProfile.positionFaculty ? ` — ${user.teacherProfile.positionFaculty.name}` : ""
              }`}
            />
          ) : null}
          {user?.teacherProfile?.rank ? (
            <FactRow label="الرتبة" value={RANK_LABELS[user.teacherProfile.rank] ?? user.teacherProfile.rank} />
          ) : null}
          <FactRow
            last
            label="العضويات"
            value={(user?.memberships ?? []).map((m) => `${m.name} (${ROLE_LABELS[m.role] ?? m.role})`).join(" · ") || "—"}
          />
        </RowList>
      </View>

      {/* [04] الأمان — قفل التطبيق وكلمة المرور في مقعد واحد */}
      <View style={{ gap: sp[8] }}>
        <GroupHeader index={4} title="الأمان" />
        <RowList>
          {bioAvail ? (
            <LedgerRow last>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                <Fingerprint size={20} color={p.textMuted} />
                <View style={{ flex: 1 }}>
                  <T variant="body" weight="medium">قفل التطبيق بالبصمة</T>
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
            </LedgerRow>
          ) : (
            <LedgerRow last>
              <T variant="sm" color="muted">
                قفل التطبيق بالبصمة متاح على الأجهزة المزوّدة بمستشعر بصمة أو تعرّف على الوجه — جهازك الحالي لا يوفّره (أو لم تُسجّل بصمة في النظام).
              </T>
            </LedgerRow>
          )}
        </RowList>
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
      </View>

      {/* [04] الدعم — R331 A-App-Shell: the report loop entry for EVERY
          role (student & teacher carry it in their Profile menus;
          admin/quality/owner reach it here). Replaces the removed
          floating feedback FAB. */}
      <View style={{ gap: sp[8] }}>
        <GroupHeader index={5} title="الدعم" />
        <RowList>
          <LedgerRow
            last
            onPress={() => {
              haptics.selection();
              router.push("/report");
            }}
            accessibilityLabel="الإبلاغ عن مشكلة"
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
              <Flag size={20} color={p.textMuted} />
              <T variant="body" weight="medium" style={{ flex: 1 }}>
                الإبلاغ عن مشكلة
              </T>
            </View>
          </LedgerRow>
        </RowList>
      </View>

      {/* [06] الجلسة — الخروج وتذييل الإصدار */}
      <View style={{ gap: sp[8] }}>
        <GroupHeader index={6} title="الجلسة" />
        <Button
          label="تسجيل الخروج"
          kind="danger"
          onPress={() => {
            haptics.notify("warning");
            setConfirmLogout(true);
          }}
        />
      </View>
      <T variant="xs" color="faint" style={{ textAlign: "center" }}>
        مدارك موبايل {Constants.expoConfig?.version ?? "1.0.0"} — Expo SDK {Constants.expoConfig?.sdkVersion ?? "58"}
      </T>

      {/* Same destructive ConfirmSheet as the student Profile — one
          confirmation pattern for logout across the app. */}
      <ConfirmSheet
        open={confirmLogout}
        onClose={() => setConfirmLogout(false)}
        title="تسجيل الخروج؟"
        message="ستنتهي جلستك على هذا الجهاز فقط — تُحفظ جلسات أجهزتك الأخرى."
        confirmLabel="خروج"
        destructive
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

/** R350 E6 — the mail category labels (one Arabic name per category,
 *  shared with the E3 preference law on the backend). */
const MAIL_CATEGORY_LABELS: Record<string, string> = {
  security: "تنبيهات الأمان",
  account: "تنبيهات الحساب",
  courses: "بريد المقرّرات",
  announcements: "الإعلانات",
  digest: "الموجز الأسبوعي",
};

/** Group header — the muted wayfinding tier of the settings sheet: mono
 *  [nn] index + small muted title over a hairline. Deliberately quieter
 *  than the rows it labels (the measured hierarchy: rows carry the ink,
 *  headers only wayfind), one rung under the page title. */
function GroupHeader({ index, title }: { index: number; title: string }) {
  const p = usePalette();
  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "baseline",
        gap: sp[8],
        paddingBottom: sp[6],
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: p.border,
      }}
    >
      <MonoLabel>{`[${String(index).padStart(2, "0")}]`}</MonoLabel>
      <T variant="sm" weight="medium" color="muted">
        {title}
      </T>
    </View>
  );
}

/** Fact row — a read-only account fact on the ledger rhythm: muted label
 *  above the ink value (stacked so long Arabic values — العضويات، النطاق —
 *  wrap instead of squeezing the label). */
function FactRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <LedgerRow last={last}>
      <T variant="sm" color="muted">
        {label}
      </T>
      <T variant="body" weight="medium">
        {value}
      </T>
    </LedgerRow>
  );
}
