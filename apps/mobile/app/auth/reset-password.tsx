import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { z } from "zod";
import { post } from "@/api/client";
import { sp } from "@/design/tokens";
import { AppStatusBar } from "@/design/statusbar";
import { FormScreen, useFormValidation, ar } from "@/components/ui/form";
import { T } from "@/components/ui/text";
import { SecretField } from "@/components/ui/fields";
import { Card } from "@/components/ui/surfaces";
import { humanizeError, GENERIC_AR } from "@/lib/errors";
import { haptics } from "@/haptics";

/**
 * /auth/reset-password?token=… — single-use 30-min token, on the form
 * foundation: keyboard-aware + toolbar, inline Arabic validation
 * (12–72 chars), the match check rides the form-level summary (zod
 * cross-field refines don't fit the per-field adapter — checked here,
 * honestly seated under the action), humanizeError for API failures.
 */
export default function ResetPassword() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const form = useFormValidation({
    schema: z.object({ password: ar.password(12, 72), confirm: ar.required("أدخل تأكيد كلمة المرور.") }),
  });

  /* The token rides the URL (single-use, 30-min) — derived, never state:
   * seeding state from params via an effect was the set-state-in-effect
   * cascading class. */
  const token = typeof params.token === "string" ? params.token : "";

  const submit = async () => {
    if (busy || done) return;
    if (token.length < 40) {
      setError("رابط الاستعادة غير صالح أو مفقود.");
      haptics.notify("error");
      return;
    }
    if (!form.validateAll()) {
      haptics.notify("error");
      return;
    }
    const password = String(form.values.password);
    if (password !== String(form.values.confirm)) {
      setError("كلمتا المرور غير متطابقتين.");
      haptics.notify("error");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await post("/auth/reset-password", { token, password });
      haptics.notify("success");
      setDone(true);
      setTimeout(() => router.replace("/auth/login"), 2600);
    } catch (err) {
      const human = humanizeError(err);
      // Specific Arabic API copy passes through; the generic bucket gets
      // this flow's own honest sentence (expired/used link).
      setError(human === GENERIC_AR ? "تعذّر تعيين كلمة المرور — قد يكون الرابط منتهيًا أو مستخدمًا." : human);
      haptics.notify("error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <AppStatusBar />
      <FormScreen
        onSubmit={done ? undefined : submit}
        submitLabel={busy ? "جارٍ الحفظ…" : "حفظ كلمة المرور"}
        submitLoading={busy}
        submitKind="accent"
        error={error}
        success={done ? "تم تعيين كلمة المرور — انتهت جلساتك الأخرى وسيُعادك التطبيق إلى تسجيل الدخول الآن." : null}
      >
        <T variant="h2" weight="bold">تعيين كلمة مرور جديدة</T>
        {done ? (
          <Card>
            <T variant="h4" weight="bold">تم تعيين كلمة المرور</T>
            <T variant="body" color="secondary">
              اكتملت الاستعادة — انتهت جلساتك الأخرى وسيُعادك التطبيق إلى تسجيل الدخول الآن.
            </T>
          </Card>
        ) : (
          <View style={{ gap: sp[12] }}>
            <SecretField
              {...form.field("password")}
              fieldId="password"
              label="كلمة المرور الجديدة"
              purpose="newPassword"
              hint="12 حرفًا على الأقل — حتى 72."
              required
            />
            <SecretField
              {...form.field("confirm")}
              fieldId="confirm"
              label="تأكيد كلمة المرور"
              purpose="newPassword"
              required
            />
          </View>
        )}
      </FormScreen>
    </>
  );
}
