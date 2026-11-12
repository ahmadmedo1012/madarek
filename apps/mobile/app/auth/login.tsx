import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { z } from "zod";
import { useSession, ROLE_HOME } from "@/auth/session";
import { sp } from "@/design/tokens";
import { AppStatusBar } from "@/design/statusbar";
import { usePalette } from "@/design/theme";
import { FormScreen, useFormValidation } from "@/components/ui/form";
import { T, MonoLabel } from "@/components/ui/text";
import { Field, SecretField } from "@/components/ui/fields";
import { Hairline, Card } from "@/components/ui/surfaces";
import { BrandMark } from "@/components/ui/brand";
import { resolveEntryDestination } from "@/components/ui/boot";
import { humanizeError } from "@/lib/errors";
import { haptics } from "@/haptics";

const DEMO_ACCOUNTS = [
  { email: "student@test.ly", label: "طالب" },
  { email: "teacher@test.ly", label: "أستاذ" },
  { email: "registrar@test.ly", label: "مسجل عام" },
  { email: "quality@test.ly", label: "جودة" },
  { email: "owner@test.ly", label: "مالك" },
];
const DEMO_PASSWORD = "12345678";
const SHOW_DEMO = __DEV__ || process.env.EXPO_PUBLIC_SHOW_TEST_ACCOUNTS === "1";

const schema = z.object({
  identifier: z.string().trim().min(1, { message: "أدخل البريد الإلكتروني أو رقم التسجيل." }),
  password: z.string().min(1, { message: "أدخل كلمة المرور." }),
});

/**
 * /auth/login — تسجيل الدخول (mirrors the web AuthPage contract) on the
 * form foundation: KeyboardAwareScrollView + the «التالي/السابق/تم»
 * accessory toolbar, inline Arabic validation (useFormValidation), a
 * sticky primary action riding above the keyboard with async loading,
 * humanizeError for every failure, and haptic notification on submit
 * outcomes. ONE orange accent: the primary action.
 *
 * Error seats stay honest (R2 B4 review): field errors = validation
 * only; an API refusal (wrong password, locked account, waking server)
 * gets the form-level Arabic summary under the button — never blamed on
 * the email field.
 */
export default function SignIn() {
  const p = usePalette();
  const params = useLocalSearchParams<{ continue?: string }>();
  const login = useSession((s) => s.login);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useFormValidation({ schema });

  const submit = async () => {
    if (busy) return;
    if (!form.validateAll()) {
      haptics.notify("error");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const user = await login(String(form.values.identifier).trim(), String(form.values.password));
      haptics.notify("success");
      router.replace(resolveEntryDestination(user, params.continue, ROLE_HOME) as never);
    } catch (err) {
      // humanizeError: Arabic always — API Arabic copy passes through,
      // lockout/rate-limit/network map to honest Arabic sentences.
      setError(humanizeError(err));
      haptics.notify("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AppStatusBar />
      <FormScreen
        onSubmit={submit}
        submitLabel={busy ? "جارٍ الدخول…" : "دخول"}
        submitLoading={busy}
        submitKind="accent"
        submitTestID="login-submit"
        error={error}
        footer={
          <View style={{ gap: sp[12] }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Pressable accessibilityRole="link" onPress={() => router.push("/auth/forgot-password")}>
                <T variant="sm" color="secondary">نسيت كلمة المرور؟</T>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                onPress={() =>
                  router.push(
                    params.continue
                      ? ({ pathname: "/auth/register", params: { continue: params.continue } } as never)
                      : "/auth/register",
                  )
                }
              >
                <T variant="sm" color="secondary">إنشاء حساب جديد</T>
              </Pressable>
            </View>
            <Pressable
              accessibilityRole="link"
              onPress={() => router.replace("/auth")}
              style={{ alignItems: "center", paddingVertical: sp[8] }}
            >
              <T variant="sm" color="muted">العودة إلى صفحة البداية</T>
            </Pressable>
          </View>
        }
      >
        <View style={{ alignItems: "center", gap: sp[8], paddingTop: sp[16] }}>
          <BrandMark size={48} />
          <T variant="h2" weight="bold">تسجيل الدخول</T>
          <T variant="sm" color="muted">مدارك — منصّة التعليم الذكي</T>
        </View>

        <View style={{ gap: sp[12] }}>
          <Field
            {...form.field("identifier")}
            fieldId="identifier"
            label="البريد الإلكتروني أو رقم التسجيل"
            testID="login-email"
            purpose="username"
            inputMode="email"
            required
          />
          <SecretField
            {...form.field("password")}
            fieldId="password"
            label="كلمة المرور"
            testID="login-password"
            purpose="password"
            required
          />
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
                    form.setValue("identifier", a.email);
                    form.setValue("password", DEMO_PASSWORD);
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
      </FormScreen>
    </>
  );
}
