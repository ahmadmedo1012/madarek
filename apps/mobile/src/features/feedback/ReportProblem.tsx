import { useState } from "react";
import { Pressable, StyleSheet, TextInput, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import Flag from "lucide-react-native/icons/flag";
import Lightbulb from "lucide-react-native/icons/lightbulb";
import { usePathname } from "expo-router";
import { ApiError, post } from "@/api/client";
import { useSession } from "@/auth/session";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { toast } from "@/components/ui/toast";

/**
 * ReportProblemForm — «أبلغ عن مشكلة / اقتراح» (B3.6 pilot loop → R331
 * A-App-Shell). The pilot's floating FAB sat over content on every screen
 * and clipped screen edges; the report form now lives in a real route
 * (/report) reached from the Profile menu — this is the form itself,
 * posting to the existing POST /feedback endpoint (kind BUG|IDEA, note,
 * route, role). Screenshot capture and browser-console tape are web
 * instruments — the mobile client sends route + note honestly.
 */
export function ReportProblemForm() {
  const p = usePalette();
  const user = useSession((s) => s.user);
  const pathname = usePathname();
  const [kind, setKind] = useState<"BUG" | "IDEA">("BUG");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState(false);

  const submit = useMutation({
    mutationFn: () =>
      post("/feedback", { kind, note: note.trim(), route: pathname, role: user?.role ?? undefined }),
    onSuccess: () => {
      setSent(true);
      toast.success("وصلتنا ملاحظتك — شكرًا لمساعدتك في تحسين مدارك.", "ملاحظة الطيار");
      setTimeout(() => {
        setNote("");
        setSent(false);
      }, 900);
    },
    onError: (err) => toast.error((err as ApiError).message ?? "تعذّر إرسال الملاحظة.", "ملاحظة الطيار"),
  });

  return (
    <View style={{ gap: sp[12] }}>
      <View style={{ flexDirection: "row", gap: sp[8] }}>
        {(
          [
            { id: "BUG", label: "مشكلة", icon: <Flag size={16} color={p.text} /> },
            { id: "IDEA", label: "اقتراح", icon: <Lightbulb size={16} color={p.text} /> },
          ] as const
        ).map((o) => (
          <Pressable
            key={o.id}
            accessibilityRole="button"
            accessibilityLabel={o.label}
            onPress={() => setKind(o.id)}
            style={{
              flex: 1,
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
              gap: sp[8],
              borderWidth: kind === o.id ? 2 : StyleSheet.hairlineWidth,
              borderColor: kind === o.id ? p.accent : p.rule,
              backgroundColor: p.surface,
            }}
          >
            {o.icon}
            <T variant="sm" weight="bold">
              {o.label}
            </T>
          </Pressable>
        ))}
      </View>
      <TextInput
        accessibilityLabel="نص الملاحظة"
        placeholder="اشرح المشكلة أو الاقتراح (10 أحرف على الأقل)…"
        placeholderTextColor={p.textFaint}
        value={note}
        onChangeText={setNote}
        multiline
        maxLength={2000}
        style={{
          minHeight: 110,
          borderWidth: StyleSheet.hairlineWidth,
          borderColor: p.rule,
          backgroundColor: p.surface,
          color: p.text,
          fontSize: 15,
          textAlign: "right",
          padding: sp[12],
        }}
      />
      <T variant="xs" color="faint">
        يُرفَق مسار الشاشة تلقائيًا ({pathname}). لقطة الشاشة وسجل وحدة التحكم غير متاحين في نسخة الجوال.
      </T>
      <Button
        label={sent ? "تم الإرسال ✓" : submit.isPending ? "جارٍ الإرسال…" : "إرسال الملاحظة"}
        kind="primary"
        loading={submit.isPending}
        disabled={note.trim().length < 10 || sent}
        onPress={() => submit.mutate()}
      />
    </View>
  );
}
