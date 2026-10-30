import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, View , TextInput } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Send, ThumbsDown, ThumbsUp, Trash2 } from "lucide-react-native";
import { aiApi, AI_QUOTA_MARKER } from "@/api/ai";
import { ApiError } from "@/api/client";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T, MonoLabel } from "@/components/ui/text";
import { Button, IconButton } from "@/components/ui/pressables";
import { Badge, Card, ConfirmDialog, Hairline } from "@/components/ui/surfaces";
import { EmptyState, ErrorState } from "@/components/ui/states";
import { BrandMark } from "@/components/ui/brand";

/**
 * Assistant — the AI academic assistant with the honest provider badge.
 * `local` provider = template composer (disclosed verbatim, as the web does).
 * Non-streaming JSON contract (the SSE stream remains a web instrument; the
 * reply semantics are identical).
 */
export function Assistant() {
  const p = usePalette();
  const qc = useQueryClient();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<{ role: "USER" | "ASSISTANT"; content: string; id?: string; engine?: string; model?: string }[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quotaHit, setQuotaHit] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const config = useQuery({
    queryKey: ["ai", "config"],
    queryFn: () => aiApi.config(),
    staleTime: 5 * 60_000,
  });
  const provider = config.data?.provider ?? null;
  const model = config.data?.model ?? null;

  const send = async () => {
    const text = input.trim();
    if (!text || sending) return;
    setSending(true);
    setError(null);
    setQuotaHit(false);
    setMessages((prev) => [...prev, { role: "USER", content: text }]);
    setInput("");
    try {
      const res = await aiApi.chat({ conversationId: conversationId ?? undefined, message: text });
      setConversationId(res.conversationId);
      setMessages((prev) => [...prev, { role: "ASSISTANT", content: res.reply, id: res.messageId, engine: res.engine, model: res.model }]);
      qc.invalidateQueries({ queryKey: ["ai", "conversations"] });
    } catch (err) {
      const api = err as ApiError;
      if (api.message.includes(AI_QUOTA_MARKER) || api.status === 429) {
        setQuotaHit(true);
      } else {
        setError(api.message ?? "تعذّر إرسال السؤال.");
      }
      setMessages((prev) => prev.filter((m) => m.role !== "USER" || m.content !== text || prev.indexOf(m) < prev.length - 2));
    } finally {
      setSending(false);
    }
  };

  const rate = useMutation({
    mutationFn: ({ messageId, rating }: { messageId: string; rating: 1 | -1 }) => aiApi.feedback(messageId, rating),
  });

  const clear = async () => {
    if (conversationId) {
      try {
        await aiApi.deleteConversation(conversationId);
      } catch {
        // conversation may already be gone server-side
      }
    }
    setConversationId(null);
    setMessages([]);
    setError(null);
    setConfirmClear(false);
  };

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: sp[8],
          paddingHorizontal: sp[16],
          paddingVertical: sp[8],
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: p.rule,
          backgroundColor: p.surface,
        }}
      >
        <View style={{ flex: 1, gap: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
            <T variant="h4" weight="bold">المساعد الأكاديمي</T>
            {provider ? <Badge label={`مزوّد: ${provider}`} tone={provider === "local" ? "yellow" : "mint"} /> : null}
          </View>
          {provider === "local" ? (
            <T variant="xs" color="muted">
              المزوّد «local» — ردود قالبيّة مركّبة محليًا حتى تفعيل مزوّد خارجي حقيقي.
            </T>
          ) : model ? (
            <MonoLabel>{model}</MonoLabel>
          ) : null}
        </View>
        {messages.length > 0 ? (
          <IconButton accessibilityLabel="مسح المحادثة" onPress={() => setConfirmClear(true)}>
            <Trash2 size={20} color={p.textMuted} />
          </IconButton>
        ) : null}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: sp[16], gap: sp[12], paddingBottom: sp[24] }}
        keyboardShouldPersistTaps="handled"
      >
        {messages.length === 0 && !error && !quotaHit ? (
          <View style={{ alignItems: "center", paddingTop: sp[24], gap: sp[8] }}>
            <BrandMark size={44} />
            <T variant="h4" weight="bold">اسأل عن مقرّرك</T>
            <T variant="body" color="muted" align="center" style={{ paddingHorizontal: sp[16] }}>
              اسأل عن مفهوم من المنهج، أو اطلب تلخيصًا، أو تدرب على سؤال — يجيب ضمن نطاق مؤسّستك.
            </T>
          </View>
        ) : null}
        {messages.map((m, i) => (
          <View
            key={i}
            style={{
              alignSelf: m.role === "USER" ? "flex-start" : "flex-end",
              maxWidth: "86%",
              backgroundColor: m.role === "USER" ? p.primary : p.surface,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: m.role === "USER" ? p.primary : p.border,
              padding: sp[12],
              gap: 4,
            }}
          >
            <T variant="body" style={{ color: m.role === "USER" ? p.primaryFg : p.text }}>
              {m.content}
            </T>
            {m.role === "ASSISTANT" && m.id ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                {m.model ? <MonoLabel>{m.model}</MonoLabel> : null}
                <Pressable accessibilityRole="button" accessibilityLabel="تقييم مفيد" onPress={() => rate.mutate({ messageId: m.id!, rating: 1 })}>
                  <ThumbsUp size={14} color={rate.variables?.rating === 1 ? p.accentInk : p.textFaint} />
                </Pressable>
                <Pressable accessibilityRole="button" accessibilityLabel="تقييم غير مفيد" onPress={() => rate.mutate({ messageId: m.id!, rating: -1 })}>
                  <ThumbsDown size={14} color={p.textFaint} />
                </Pressable>
              </View>
            ) : null}
          </View>
        ))}
        {sending ? (
          <View style={{ alignSelf: "flex-end", backgroundColor: p.surface, borderWidth: StyleSheet.hairlineWidth, borderColor: p.border, padding: sp[12] }}>
            <T variant="body" color="muted">يفكّر…</T>
          </View>
        ) : null}
        {error ? <ErrorState message={error} compact /> : null}
        {quotaHit ? (
          <Card style={{ borderColor: "#A8750F" }}>
            <T variant="body" weight="bold">وصلت حدّ الأسئلة اليومي</T>
            <T variant="sm" color="muted">عُد غدًا — الحد اليومي يحفظ عدالة استخدام الخدمة للجميع.</T>
          </Card>
        ) : null}
      </ScrollView>

      <View
        style={{
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: p.rule,
          backgroundColor: p.surface,
          padding: sp[12],
          paddingBottom: sp[16],
          gap: sp[8],
        }}
      >
        <View style={{ flexDirection: "row", gap: sp[8] }}>
          <TextInput
            accessibilityLabel="سؤالك للمساعد"
            value={input}
            onChangeText={setInput}
            placeholder="اكتب سؤالك الأكاديمي…"
            placeholderTextColor={p.textFaint}
            multiline
            style={{
              flex: 1,
              minHeight: 48,
              maxHeight: 120,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: p.rule,
              backgroundColor: p.bg,
              color: p.text,
              fontSize: 15,
              textAlign: "right",
              padding: sp[12],
            }}
          />
          <IconButton accessibilityLabel="إرسال" onPress={send} disabled={sending || input.trim().length === 0}>
            <Send />
          </IconButton>
        </View>
        <T variant="xs" color="faint">
          قد تكون الردود غير دقيقة — راجع مصادر المقرّر دائمًا.
        </T>
      </View>

      <ConfirmDialog
        open={confirmClear}
        title="مسح المحادثة؟"
        message="لن تتمكن من استرجاع هذا الحوار."
        confirmLabel="مسح"
        danger
        onCancel={() => setConfirmClear(false)}
        onConfirm={clear}
      />
    </View>
  );
}
