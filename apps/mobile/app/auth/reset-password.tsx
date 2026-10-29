import { useEffect, useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ApiError, post } from "@/api/client";
import { sp } from "@/design/tokens";
import { Screen, PageHeader } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { SecretField } from "@/components/ui/fields";
import { Button } from "@/components/ui/pressables";
import { Card } from "@/components/ui/surfaces";

/** /auth/reset-password?token=… — single-use 30-min token. */
export default function ResetPassword() {
  const params = useLocalSearchParams<{ token?: string }>();
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof params.token === "string") setToken(params.token);
  }, [params.token]);

  const submit = async () => {
    setError(null);
    if (!token || token.length < 40) {
      setError("رابط الاستعادة غير صالح أو مفقود.");
      return;
    }
    if (password.length < 12 || password.length > 72) {
      setError("كلمة المرور يجب ألا تقل عن 12 حرفًا ولا تتجاوز 72.");
      return;
    }
    if (password !== confirm) {
      setError("كلمتا المرور غير متطابقتين.");
      return;
    }
    setBusy(true);
    try {
      await post("/auth/reset-password", { token, password });
      setDone(true);
      setTimeout(() => router.replace("/auth"), 2600);
    } catch (err) {
      setError((err as ApiError).message ?? "تعذّر تعيين كلمة المرور — قد يكون الرابط منتهيًا أو مستخدمًا.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen scroll>
      <PageHeader title="تعيين كلمة مرور جديدة" kicker="استعادة الحساب" compact />
      {done ? (
        <Card>
          <T variant="h4" weight="bold">تم تعيين كلمة المرور</T>
          <T variant="body" color="secondary">
            اكتملت الاستعادة — انتهت جلساتك الأخرى وسيُعادك التطبيق إلى تسجيل الدخول الآن.
          </T>
        </Card>
      ) : (
        <View style={{ gap: sp[12] }}>
          <SecretField label="كلمة المرور الجديدة" value={password} onChangeText={setPassword} />
          <SecretField label="تأكيد كلمة المرور" value={confirm} onChangeText={setConfirm} onSubmitEditing={submit} />
          {error ? (
            <Card style={{ borderColor: "#C72E00" }}>
              <T variant="sm" color="danger">{error}</T>
            </Card>
          ) : null}
          <Button label={busy ? "جارٍ الحفظ…" : "حفظ كلمة المرور"} onPress={submit} loading={busy} />
        </View>
      )}
    </Screen>
  );
}
