import { useState } from "react";
import { StyleSheet, View } from "react-native";
import { useMutation } from "@tanstack/react-query";
import Flag from "lucide-react-native/icons/flag";
import Lightbulb from "lucide-react-native/icons/lightbulb";
import { usePathname } from "expo-router";
import { post } from "@/api/client";
import { useSession } from "@/auth/session";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Button } from "@/components/ui/pressables";
import { AppSheet, SheetTextInput } from "@/components/ui/sheet";
import { toast } from "@/components/ui/toast";
import { PressableScale } from "@/motion";
import { haptics } from "@/haptics";
import { humanizeError } from "@/lib/errors";

/**
 * ReportProblemSheet — «أبلغ عن مشكلة / اقتراح» (B3.6 pilot loop → R331
 * A-App-Shell → R334 R2 sheet migration). The pilot's floating FAB sat
 * over content on every screen and clipped screen edges; the report
 * loop became a real route (/report), and this R334 pass moves the form
 * itself onto AppSheet (FilterSheet-style scrollable body + pinned
 * footer): keyboard-aware via SheetTextInput, failures humanized via
 * humanizeError, outcomes confirmed with toast + haptics. Posts to the
 * existing POST /feedback endpoint (kind BUG|IDEA, note, route, role).
 * Screenshot capture and browser-console tape are web instruments — the
 * mobile client sends route + note honestly.
 */
export function ReportProblemSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const p = usePalette();
  const user = useSession((s) => s.user);
  const pathname = usePathname();
  const [kind, setKind] = useState<"BUG" | "IDEA">("BUG");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = useMutation({
    mutationFn: () =>
      post("/feedback", { kind, note: note.trim(), route: pathname, role: user?.role ?? undefined }),
    onSuccess: () => {
      haptics.notify("success");
      toast.success("وصلتنا ملاحظتك — شكرًا لمساعدتك في تحسين مدارك.", "ملاحظة الطيار");
      setNote("");
      setError(null);
      onClose();
    },
    onError: (err) => {
      haptics.notify("error");
      setError(humanizeError(err));
    },
  });

  const onSubmit = () => {
    if (note.trim().length < 10) {
      haptics.notify("error");
      setError("اشرح الملاحظة في 10 أحرف على الأقل حتى نفهمها ونصلحها.");
      return;
    }
    setError(null);
    submit.mutate();
  };

  return (
    <AppSheet
      open={open}
      onClose={onClose}
      title="الإبلاغ عن مشكلة"
      snap="lg"
      dynamic={false}
      scrollable
      footer={
        <Button
          label={submit.isPending ? "جارٍ الإرسال…" : "إرسال الملاحظة"}
          kind="primary"
          loading={submit.isPending}
          disabled={note.trim().length < 10}
          onPress={onSubmit}
        />
      }
    >
      <View style={{ gap: sp[12], paddingBottom: sp[8] }}>
        <T variant="body" color="secondary">
          رأيك يصل فريق الطيار مباشرة — صف المشكلة أو الاقتراح وسيُرفَق مسار الشاشة تلقائيًا.
        </T>

        {/* النوع — مشكلة أم اقتراح */}
        <View style={{ flexDirection: "row", gap: sp[8] }} accessibilityRole="radiogroup">
          {(
            [
              { id: "BUG", label: "مشكلة", icon: <Flag size={16} color={p.text} /> },
              { id: "IDEA", label: "اقتراح", icon: <Lightbulb size={16} color={p.text} /> },
            ] as const
          ).map((o) => {
            const selected = kind === o.id;
            return (
              <PressableScale
                key={o.id}
                accessibilityRole="radio"
                accessibilityLabel={o.label}
                accessibilityState={{ selected }}
                onPress={() => {
                  haptics.selection();
                  setKind(o.id);
                }}
                style={{
                  flex: 1,
                  minHeight: 44,
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: sp[8],
                  borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
                  borderColor: selected ? p.primary : p.rule,
                  backgroundColor: p.surface,
                }}
              >
                {o.icon}
                <T variant="sm" weight="bold">
                  {o.label}
                </T>
              </PressableScale>
            );
          })}
        </View>

        <SheetTextInput
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

        {error ? (
          <T variant="sm" color="danger">
            {error}
          </T>
        ) : null}

        <T variant="xs" color="faint">
          يُرفَق مسار الشاشة تلقائيًا ({pathname}). لقطة الشاشة وسجل وحدة التحكم غير متاحين في نسخة الجوال.
        </T>
      </View>
    </AppSheet>
  );
}
