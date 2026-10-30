/**
 * MessagesUI — the shared DM inbox (teacher + student role surfaces).
 * Web parity: components/messages/MessagesInbox — paginated personal DMs,
 * per-correspondent reply sheet, read-all sweep, honest states everywhere.
 *
 * NOTE (integration): commit d4906ef's message claims this shared feature
 * shipped, but the file never landed in the tree — both role wrappers
 * (app/teacher/messages.tsx, app/student/messages.tsx) import it. This
 * implementation closes that gap against the /me/messages contract
 * (studentApi.messages / sendMessage / readAllMessages).
 */
import { useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCheck } from "lucide-react-native";
import { ApiError } from "@/api/client";
import { studentApi } from "@/api/student";
import type { Message } from "@/api/types";
import { useSession } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { fromNow, initials, latn } from "@/lib/format";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { Badge, Sheet } from "@/components/ui/surfaces";
import { Avatar, LedgerRow, RowList } from "@/components/ui/data";
import { Button, IconButton } from "@/components/ui/pressables";
import { Field } from "@/components/ui/fields";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";

const LIMIT = 30;

interface Correspondent {
  id: string;
  name: string;
  avatarInitials: string | null;
  avatarColor: string | null;
  last: Message;
  unread: number;
}

export function MessagesUI() {
  const p = usePalette();
  const qc = useQueryClient();
  const scope = useInstitutionScope();
  const me = useSession((s) => s.user);
  const myId = me?.id ?? "";

  const [page, setPage] = useState(1);
  const feed = useQuery({
    queryKey: ["me", "messages", page, LIMIT, scope],
    queryFn: () => studentApi.messages(page, LIMIT),
    placeholderData: (prev) => prev,
  });

  const [openUser, setOpenUser] = useState<Correspondent | null>(null);
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);

  const rows = feed.data?.data ?? [];
  const meta = feed.data?.meta;

  /** Conversations composed client-side from the flat feed — the same
   * collectCorrespondents approach the web inbox uses. */
  const conversations = useMemo(() => {
    const byUser = new Map<string, Correspondent>();
    const ordered = [...rows].sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
    for (const m of ordered) {
      const other = m.fromUserId === myId ? m.toUser : m.fromUser;
      const otherId = m.fromUserId === myId ? m.toUserId : m.fromUserId;
      if (!otherId) continue;
      const name = other ? `${other.firstName} ${other.lastName}`.trim() : "مستخدم";
      const unreadInc = !m.readAt && m.fromUserId !== myId ? 1 : 0;
      const existing = byUser.get(otherId);
      if (existing) {
        existing.unread += unreadInc;
      } else {
        byUser.set(otherId, {
          id: otherId,
          name: name !== "" ? name : "مستخدم",
          avatarInitials: other ? initials(other.firstName, other.lastName) : null,
          avatarColor: (other as { avatarColor?: string | null } | null)?.avatarColor ?? null,
          last: m,
          unread: unreadInc,
        });
      }
    }
    return [...byUser.values()];
  }, [rows, myId]);

  const thread = useMemo(() => {
    if (!openUser) return [];
    return rows
      .filter((m) => m.fromUserId === openUser.id || m.toUserId === openUser.id)
      .sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? ""));
  }, [rows, openUser]);

  const send = useMutation({
    mutationFn: async () => {
      const body = reply.trim();
      if (body === "") throw new ApiError("EMPTY", "اكتب نص الرسالة قبل الإرسال.", 400);
      return studentApi.sendMessage({ toUserId: openUser!.id, body });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "messages"] });
      toast.success("أُرسلت الرسالة.", "تمّ الإرسال");
      setReply("");
      setReplyError(null);
    },
    onError: (e) => setReplyError((e as Error).message),
  });

  const readAll = useMutation({
    mutationFn: () => studentApi.readAllMessages(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me", "messages"] });
      toast.success("عُلّمت كل الرسائل كمقروءة.");
    },
    onError: (e) => toast.error((e as Error).message, "تعذَّر التعليم كمقروء"),
  });

  const unread = meta?.unread ?? conversations.reduce((s, c) => s + c.unread, 0);

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: p.bg }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      {/* Header chrome — the shared-feature pattern (see Assistant). */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: sp[8],
          paddingHorizontal: sp[16],
          paddingVertical: sp[8],
          paddingTop: sp[16],
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: p.rule,
          backgroundColor: p.surface,
        }}
      >
        <View style={{ flex: 1, gap: 0 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
            <T variant="h4" weight="bold">الرسائل</T>
            {unread > 0 ? <Badge label={`${latn(unread > 99 ? 99 : unread)} غير مقروءة`} tone="copper" /> : null}
          </View>
          <T variant="xs" color="muted">
            كل رسالة وصلتك أو أرسلتها عبر المنصّة — ردّ على الواردة من هنا.
          </T>
        </View>
        {unread > 0 ? (
          <IconButton accessibilityLabel="تعليم الكل كمقروء" onPress={() => readAll.mutate()} disabled={readAll.isPending}>
            <CheckCheck size={20} color={p.textMuted} />
          </IconButton>
        ) : null}
      </View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: sp[16], gap: sp[12], paddingBottom: sp[24] }}
        keyboardShouldPersistTaps="handled"
      >
        {feed.isLoading ? (
          <SkeletonList rows={6} />
        ) : feed.isError ? (
          <ErrorState message={(feed.error as Error).message} onRetry={() => feed.refetch()} />
        ) : conversations.length === 0 ? (
          <EmptyState
            title="لا رسائل بعد"
            message="ستظهر هنا الرسائل الواردة فور وصولها — ويمكنك الردّ عليها من هنا."
          />
        ) : (
          <>
            <RowList>
              {conversations.map((c, i) => (
                <LedgerRow
                  key={c.id}
                  last={i === conversations.length - 1}
                  onPress={() => {
                    setOpenUser(c);
                    setReply("");
                    setReplyError(null);
                  }}
                  accessibilityLabel={`محادثة ${c.name}`}
                >
                  <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
                    <Avatar initials={c.avatarInitials ?? "؟"} color={c.avatarColor} size={40} />
                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
                        <View style={{ flex: 1 }}>
                          <T variant="body" weight="medium" numberOfLines={1}>
                            {c.name}
                          </T>
                        </View>
                        {c.unread > 0 ? <Badge label={`${latn(c.unread)} جديدة`} tone="copper" /> : null}
                      </View>
                      <T variant="sm" color="muted" numberOfLines={1}>
                        {c.last.fromUserId === myId ? "أنت: " : ""}
                        {c.last.body}
                      </T>
                      <T variant="xs" color="faint">
                        {fromNow(c.last.createdAt)}
                      </T>
                    </View>
                  </View>
                </LedgerRow>
              ))}
            </RowList>
            {meta && page < (meta.totalPages || 1) ? (
              <Button
                label="تحميل المزيد"
                kind="ghost"
                loading={feed.isFetching}
                onPress={() => setPage((n) => n + 1)}
              />
            ) : null}
          </>
        )}
      </ScrollView>

      {/* المحادثة — the thread sheet + reply. */}
      <Sheet open={openUser !== null} onClose={() => setOpenUser(null)} title={openUser?.name ?? ""}>
        {openUser ? (
          <View style={{ gap: sp[10] }}>
            {thread.length === 0 ? (
              <T variant="sm" color="muted">
                لا رسائل محمّلة مع هذا المستخدم بعد.
              </T>
            ) : (
              thread.map((m) => {
                const mine = m.fromUserId === myId;
                return (
                  <View
                    key={m.id}
                    style={{
                      alignSelf: mine ? "flex-end" : "flex-start",
                      maxWidth: "85%",
                      backgroundColor: mine ? p.accentSoft : p.surface,
                      borderWidth: 1,
                      borderColor: p.border,
                      padding: sp[10],
                      gap: 2,
                    }}
                  >
                    <T variant="body">{m.body}</T>
                    <T variant="xs" color="faint">
                      {mine ? "أنت" : openUser.name} · {fromNow(m.createdAt)}
                      {mine ? (m.readAt ? " · مقروءة" : " · أُرسلت") : ""}
                    </T>
                  </View>
                );
              })
            )}
            <Field
              label="الرد"
              value={reply}
              onChangeText={(v) => {
                setReply(v);
                setReplyError(null);
              }}
              placeholder="اكتب ردّك…"
              accessibilityLabel="نص الرد"
            />
            {replyError ? (
              <T variant="sm" color="danger">
                {replyError}
              </T>
            ) : null}
            <Button
              label={send.isPending ? "جارٍ الإرسال…" : "إرسال"}
              kind="accent"
              loading={send.isPending}
              onPress={() => {
                setReplyError(null);
                send.mutate();
              }}
            />
          </View>
        ) : null}
      </Sheet>
    </KeyboardAvoidingView>
  );
}
