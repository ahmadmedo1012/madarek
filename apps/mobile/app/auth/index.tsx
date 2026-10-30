import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ApiError } from "@/api/client";
import { useSession, ROLE_HOME } from "@/auth/session";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { FormScreen } from "@/components/ui/screen";
import { T, MonoLabel } from "@/components/ui/text";
import { Field, SecretField } from "@/components/ui/fields";
import { Button } from "@/components/ui/pressables";
import { Hairline, Card } from "@/components/ui/surfaces";
import { BrandMark } from "@/components/ui/brand";

const DEMO_ACCOUNTS = [
  { email: "student@test.ly", label: "طالب" },
  { email: "teacher@test.ly", label: "أستاذ" },
  { email: "registrar@test.ly", label: "مسجل عام" },
  { email: "quality@test.ly", label: "جودة" },
  { email: "owner@test.ly", label: "مالك" },
];
const DEMO_PASSWORD = "12345678";
const SHOW_DEMO = __DEV__ || process.env.EXPO_PUBLIC_SHOW_TEST_ACCOUNTS === "1";

/** /auth — تسجيل الدخول (mirrors the web AuthPage contract). */
export default function SignIn() {
  const p = usePalette();
  const params = useLocalSearchParams<{ continue?: string }>();
  const login = useSession((s) => s.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const go = (user: { role: string; currentInstitution?: { id: string } | null }) => {
    const cont = params.continue ? decodeURIComponent(params.continue) : null;
    // OWNER is platform-level by design: it carries NO institution membership,
    // so the institution gate never applies to it.
    const needsInstitution =
      user.role !== "OWNER" && !user.currentInstitution && user.role !== "ADMIN";
    const dest =
      cont && (user.currentInstitution || user.role === "OWNER")
        ? cont
        : needsInstitution
          ? "/select-institution"
          : ROLE_HOME[user.role] ?? "/student/dashboard";
    router.replace(dest as never);
  };

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("أدخل البريد ورقم التسجيل مع كلمة المرور.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const user = await login(email.trim(), password);
      go(user);
    } catch (err) {
      const api = err as ApiError;
      setError(api.message ?? "تعذّر تسجيل الدخول — تحقق من البيانات.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <FormScreen>
      <View style={{ flex: 1, justifyContent: "center", gap: sp[20], paddingHorizontal: sp[24] }}>
        <View style={{ alignItems: "center", gap: sp[8] }}>
          <BrandMark size={48} />
          <T variant="h2" weight="bold">تسجيل الدخول</T>
          <T variant="sm" color="muted">مدارك — منصّة التعليم الذكي</T>
        </View>

        <View style={{ gap: sp[12] }}>
          <Field
            label="البريد الإلكتروني أو رقم التسجيل"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            inputMode="email"
            error={error}
          />
          <SecretField label="كلمة المرور" value={password} onChangeText={setPassword} onSubmitEditing={submit} />
        </View>

        <Button label={busy ? "جارٍ الدخول…" : "دخول"} onPress={submit} loading={busy} />

        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
          <Pressable accessibilityRole="button" onPress={() => router.push("/auth/forgot-password")}>
            <T variant="sm" color="accentInk">نسيت كلمة المرور؟</T>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => router.push({ pathname: "/auth/register", params })}
          >
            <T variant="sm" color="accentInk">إنشاء حساب جديد</T>
          </Pressable>
        </View>

        {SHOW_DEMO ? (
          <Card style={{ gap: sp[8] }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
              <MonoLabel>[DEMO]</MonoLabel>
              <T variant="sm" color="muted">حسابات العرض — كلمة المرور: {DEMO_PASSWORD}</T>
            </View>
            <Hairline />
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[6] }}>
              {DEMO_ACCOUNTS.map((a) => (
                <Pressable
                  key={a.email}
                  accessibilityRole="button"
                  accessibilityLabel={`حساب عرض: ${a.label}`}
                  onPress={() => {
                    setEmail(a.email);
                    setPassword(DEMO_PASSWORD);
                  }}
                  style={{
                    borderWidth: StyleSheet.hairlineWidth,
                    borderColor: p.rule,
                    paddingHorizontal: sp[10],
                    paddingVertical: 6,
                    backgroundColor: p.surfaceHover,
                  }}
                >
                  <T variant="sm" weight="medium">
                    {a.label} — {a.email}
                  </T>
                </Pressable>
              ))}
            </View>
            <T variant="xs" color="faint">تظهر هذه اللوحة في بنيات التطوير والمعاينة فقط.</T>
          </Card>
        ) : null}

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace("/")}
          style={{ alignItems: "center", paddingVertical: sp[8] }}
        >
          <T variant="sm" color="muted">العودة إلى صفحة البداية</T>
        </Pressable>
      </View>
    </FormScreen>
  );
}
