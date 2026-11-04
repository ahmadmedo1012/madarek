import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { z } from "zod";
import { post } from "@/api/client";
import { sp } from "@/design/tokens";
import { AppStatusBar } from "@/design/statusbar";
import { FormScreen, useFormValidation, ar } from "@/components/ui/form";
import { T } from "@/components/ui/text";
import { Field } from "@/components/ui/fields";
import { humanizeError } from "@/lib/errors";
import { haptics } from "@/haptics";

/**
 * /auth/forgot-password — always-200 request (the API never confirms
 * existence); devInbox surfaces test reset links. On the form foundation:
 * keyboard-aware + «التالي/تم» toolbar, inline Arabic validation, the
 * mint success note rides the sticky action bar.
 */
export default function ForgotPassword() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const form = useFormValidation({ schema: z.object({ email: ar.email() }) });

  const submit = async () => {
    if (busy) return;
    if (!form.validateAll()) {
      haptics.notify("error");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await post<{ message: string; devInbox?: { url: string } }>("/auth/forgot-password", {
        email: String(form.values.email).trim(),
      });
      haptics.notify("success");
      setMessage(res.message ?? "إن كان البريد مسجّلًا فستصلك رسالة تحتوي رابط إعادة التعيين.");
      setDevLink(res.devInbox?.url ?? null);
    } catch (err) {
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
        submitLabel={busy ? "جارٍ الإرسال…" : "إرسال رابط الاستعادة"}
        submitLoading={busy}
        submitKind="accent"
        error={error}
        success={message}
        footer={
          <View style={{ alignItems: "center" }}>
            <T
              variant="sm"
              color="secondary"
              onPress={() => router.back()}
              accessibilityRole="link"
              style={{ paddingVertical: sp[8] }}
            >
              رجوع إلى تسجيل الدخول
            </T>
          </View>
        }
      >
        <T variant="h2" weight="bold">استعادة كلمة المرور</T>
        <T variant="body" color="secondary">
          أدخل بريدك المسجّل وسنرسل رابط إعادة تعيين كلمة المرور إذا كان الحساب موجودًا.
        </T>
        <Field
          {...form.field("email")}
          fieldId="email"
          label="البريد الإلكتروني"
          purpose="email"
          required
        />
        {message && devLink ? (
          <View style={{ gap: sp[4] }}>
            <T variant="sm" color="muted">رابط بيئة الاختبار:</T>
            <T variant="monoSm" color="accentInk">{devLink}</T>
          </View>
        ) : null}
      </FormScreen>
    </>
  );
}
