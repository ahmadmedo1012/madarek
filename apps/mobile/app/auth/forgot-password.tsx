import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { ApiError, post } from "@/api/client";
import { sp } from "@/design/tokens";
import { Screen, PageHeader } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Field } from "@/components/ui/fields";
import { Button } from "@/components/ui/pressables";
import { Card } from "@/components/ui/surfaces";

/** /auth/forgot-password — always-200 request; devInbox surfaces test reset links. */
export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("أدخل بريدًا إلكترونيًا صالحًا.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await post<{ message: string; devInbox?: { url: string } }>("/auth/forgot-password", { email: email.trim() });
      setMessage(res.message ?? "إن كان البريد مسجّلًا فستصلك رسالة تحتوي رابط إعادة التعيين.");
      setDevLink(res.devInbox?.url ?? null);
    } catch (err) {
      setError((err as ApiError).message ?? "تعذّر إرسال الطلب.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <PageHeader title="استعادة كلمة المرور" kicker="حسابك" compact />
      <T variant="body" color="secondary">
        أدخل بريدك المسجّل وسنرسل رابط إعادة تعيين كلمة المرور إذا كان الحساب موجودًا.
      </T>
      <View style={{ gap: sp[12] }}>
        <Field
          label="البريد الإلكتروني"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          inputMode="email"
          error={error}
        />
        <Button label={busy ? "جارٍ الإرسال…" : "إرسال رابط الاستعادة"} onPress={submit} loading={busy} />
        {message ? (
          <Card>
            <T variant="body">{message}</T>
            {devLink ? (
              <View style={{ marginTop: sp[8], gap: sp[4] }}>
                <T variant="sm" color="muted">رابط بيئة الاختبار:</T>
                <T variant="monoSm" color="accentInk">{devLink}</T>
              </View>
            ) : null}
          </Card>
        ) : null}
        <Button label="رجوع إلى تسجيل الدخول" kind="ghost" onPress={() => router.back()} small />
      </View>
    </Screen>
  );
}
