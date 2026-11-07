/**
 * MessagesUI — the shared DM inbox (teacher + student role surfaces).
 * Web parity: components/messages/MessagesInbox — paginated personal DMs,
 * per-correspondent thread, read-all sweep, honest states everywhere.
 *
 * R334 Round 2 (3-h Comms) rework:
 *   · Conversation list on DataList (audit P0: the longest unbounded list
 *     rode a ScrollView + .map) with usePagedList ACCUMULATION — the old
 *     replace-page «تحميل المزيد» button couldn't grow past one page.
 *   · Thread lives in its OWN component (ThreadSheet) so reply keystrokes
 *     can no longer recompute the conversation grouping (audit P1).
 *   · Bubbles: RTL-correct sides with hairline tails, sent/read receipts
 *     (Check → CheckCheck; the wire has no delivered state — honesty),
 *     entrance motion on new messages (fadeInUp, reduced-motion gated).
 *   · Attachments: image URLs inside a DM body render as expo-image
 *     preview chips → full preview sheet (the /messages contract has no
 *     attachment field — an image link is the honest best signal).
 *   · Typing indicator: three reanimated dots on the UI thread while the
 *     reply is in flight (REST only — no remote typing signal exists; the
 *     component is socket-ready for when one lands).
 *   · Composer: AppSheet (bottom-sheet v5) with interactive keyboard
 *     behavior + SheetTextInput + the KeyboardToolbar accessory. The sheet
 *     mounts ONLY when a thread opens (render-net: the real bottom-sheet
 *     graph must not load during route smoke renders).
 *   · Send failures: humanizeError + haptics.notify('error'); the draft
 *     stays in the field, send = retry.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import Animated, { useAnimatedStyle, useSharedValue, withRepeat, withTiming } from "react-native-reanimated";
import { KeyboardToolbar } from "react-native-keyboard-controller";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import Check from "lucide-react-native/icons/check";
import CheckCheck from "lucide-react-native/icons/check-check";
import Send from "lucide-react-native/icons/send";
import { ApiError } from "@/api/client";
import { studentApi } from "@/api/student";
import type { Message } from "@/api/types";
import { useSession } from "@/auth/session";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { useReduceMotion } from "@/hooks/useReduceMotion";
import { fromNow, latn } from "@/lib/format";
import { usePalette } from "@/design/theme";
import { sp } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { AppSheet, SheetTextInput } from "@/components/ui/sheet";
import { Avatar, DataList, makeRow, usePagedList } from "@/components/ui/data";
import { Button, IconButton } from "@/components/ui/pressables";
import { useEntrance, fadeInUp } from "@/motion";
import { haptics } from "@/haptics";
import { humanizeError } from "@/lib/errors";
import { toast } from "@/components/ui/toast";
import {
  collectConversations,
  imageUrlsInBody,
  threadMessages,
  type Correspondent,
} from "@/features/messages/logic";

const LIMIT = 30;

/**
 * MutedChip — M8: the messages unread counts ride M1's SECONDARY chip
 * tier (hairline rule frame, transparent ground, muted medium ink) —
 * the web's neutral [UNREAD n] register. The screen's one orange stays
 * on the thread sheet's send button (the primary action).
 */
function MutedChip({ label }: { label: string }) {
  const p = usePalette();
  return (
    <View
      accessibilityRole="text"
      accessibilityLabel={label}
      style={{
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: p.rule,
        paddingHorizontal: sp[8],
        paddingVertical: sp[2],
        alignSelf: "flex-start",
      }}
    >
      <T variant="sm" weight="medium" style={{ color: p.textMuted }}>
        {label}
      </T>
    </View>
  );
}

/** Solid grey RGB(200,200,200) as a 4×3 blurhash — the placeholder tint
 *  attachment chips show while the bytes stream in (expo-image decodes it
 *  natively; disk caching is on by default). */
const GREY_BLURHASH = "LG[[{0000000000000000000000";

export function MessagesUI() {
  const p = usePalette();
  const qc = useQueryClient();
  const scope = useInstitutionScope();
  const me = useSession((s) => s.user);
  const myId = me?.id ?? "";

  const list = usePagedList<Message>({
    queryKey: ["me", "messages", LIMIT, scope],
    fetchPage: (page) => studentApi.messages(page, LIMIT),
    limit: LIMIT,
  });

  const [openUser, setOpenUser] = useState<Correspondent | null>(null);

  /** Grouping recomputes only when the accumulated rows change — never per keystroke. */
  const conversations = useMemo(
    () => collectConversations(list.items, myId),
    [list.items, myId],
  );
  const unread = list.meta?.unread ?? conversations.reduce((s, c) => s + c.unread, 0);

  const readAll = useMutation({
    mutationFn: () => studentApi.readAllMessages(),
    onSuccess: () => {
      haptics.notify("success");
      qc.invalidateQueries({ queryKey: ["me", "messages"] });
      toast.success("عُلّمت كل الرسائل كمقروءة.");
    },
    onError: (e) => {
      haptics.notify("error");
      toast.error(humanizeError(e), "تعذَّر التعليم كمقروء");
    },
  });

  const openConversation = useCallback((c: Correspondent) => {
    haptics.selection();
    setOpenUser(c);
  }, []);

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
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
            {unread > 0 ? <MutedChip label={`${latn(unread > 99 ? 99 : unread)} غير مقروءة`} /> : null}
          </View>
          <T variant="xs" color="muted">
            كل رسالة وصلتك أو أرسلتها عبر المنصّة — ردّ على الواردة من هنا.
          </T>
        </View>
        {unread > 0 ? (
          <IconButton
            accessibilityLabel="تعليم الكل كمقروء"
            onPress={() => readAll.mutate()}
            disabled={readAll.isPending}
          >
            <CheckCheck size={20} color={p.textMuted} />
          </IconButton>
        ) : null}
      </View>

      {/* THE INBOX — DataList (accumulate pagination, sticky-free ledger). */}
      <DataList
        data={conversations}
        renderItem={(info) => (
          <ConversationRow
            item={info.item}
            myId={myId}
            onOpen={openConversation}
          />
        )}
        keyExtractor={(c) => c.id}
        isLoading={list.isLoading}
        isError={list.isError}
        errorMessage={list.isError ? humanizeError(list.query.error) : null}
        onRetry={() => list.refetch()}
        refetch={list.refetch}
        isRefetching={list.isRefetching}
        onEndReached={list.onEndReached}
        isFetchingNextPage={list.isFetchingNextPage}
        hasNextPage={list.hasNextPage}
        loadMoreError={list.loadMoreError}
        onRetryLoadMore={list.retryLoadMore}
        emptyTitle="لا رسائل بعد"
        emptyMessage="ستظهر هنا الرسائل الواردة فور وصولها — ويمكنك الردّ عليها من هنا."
        contentPadding={{ horizontal: 16, top: 12, bottom: 24 }}
      />

      {/* The thread — mounts only while open (keeps the bottom-sheet graph
          out of the route render net; loads on first open on device). */}
      {openUser ? (
        <ThreadSheet
          key={openUser.id}
          user={openUser}
          rows={list.items}
          myId={myId}
          onClose={() => setOpenUser(null)}
        />
      ) : null}
    </View>
  );
}

/* ── the inbox row ───────────────────────────────────────────────────── */

const ConversationRow = makeRow<
  Correspondent,
  { myId: string; onOpen: (c: Correspondent) => void }
>(({ item: c, myId, onOpen }) => {
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`محادثة ${c.name}${c.unread > 0 ? `، ${latn(c.unread)} غير مقروءة` : ""}`}
      onPress={() => onOpen(c)}
      style={({ pressed }) => ({
        minHeight: 64,
        flexDirection: "row",
        alignItems: "center",
        gap: sp[10],
        paddingHorizontal: sp[4],
        paddingVertical: sp[10],
        backgroundColor: pressed ? p.surfaceHover : "transparent",
      })}
    >
      <Avatar initials={c.avatarInitials ?? "؟"} color={c.avatarColor} size={44} />
      <View style={{ flex: 1, gap: 2 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
          <View style={{ flex: 1 }}>
            <T variant="body" weight={c.unread > 0 ? "bold" : "medium"} numberOfLines={1}>
              {c.name}
            </T>
          </View>
          {c.unread > 0 ? <MutedChip label={`${latn(c.unread)} جديدة`} /> : null}
        </View>
        <T variant="sm" color="muted" numberOfLines={1}>
          {c.last.fromUserId === myId ? "أنت: " : ""}
          {c.last.body}
        </T>
        <T variant="xs" color="faint">
          {fromNow(c.last.createdAt)}
        </T>
      </View>
    </Pressable>
  );
});

/* ── the thread sheet ────────────────────────────────────────────────── */

function ThreadSheet({
  user,
  rows,
  myId,
  onClose,
}: {
  user: Correspondent;
  rows: readonly Message[];
  myId: string;
  onClose: () => void;
}) {
  const p = usePalette();
  const qc = useQueryClient();
  const thread = useMemo(() => threadMessages(rows, user.id), [rows, user.id]);
  const [reply, setReply] = useState("");
  const [replyError, setReplyError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const send = useMutation({
    mutationFn: async () => {
      const body = reply.trim();
      if (body === "") throw new ApiError("EMPTY", "اكتب نص الرسالة قبل الإرسال.", 400);
      return studentApi.sendMessage({ toUserId: user.id, body });
    },
    onSuccess: () => {
      haptics.notify("success");
      setReply("");
      setReplyError(null);
      qc.invalidateQueries({ queryKey: ["me", "messages"] });
    },
    onError: (e) => {
      haptics.notify("error");
      setReplyError(humanizeError(e));
    },
  });

  const onSend = () => {
    haptics.impact("light");
    setReplyError(null);
    send.mutate();
  };

  return (
    <>
      <AppSheet
        open
        onClose={onClose}
        title={user.name}
        snap="lg"
        scrollable
        footer={
          <View style={{ gap: sp[8] }}>
            {send.isPending ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
                <TypingDots />
                <T variant="xs" color="muted">
                  جارٍ الإرسال…
                </T>
              </View>
            ) : null}
            {replyError ? (
              <T variant="sm" color="danger" accessibilityRole="alert">
                {`${replyError} أعد المحاولة.`}
              </T>
            ) : null}
            <View style={{ flexDirection: "row", alignItems: "flex-end", gap: sp[8] }}>
              <View style={{ flex: 1 }}>
                <SheetTextInput
                  value={reply}
                  onChangeText={(v) => {
                    setReply(v);
                    setReplyError(null);
                  }}
                  placeholder="اكتب ردّك…"
                  accessibilityLabel="نص الرد"
                  multiline
                  onSubmitEditing={onSend}
                  returnKeyType="send"
                />
              </View>
              <Button
                label={send.isPending ? "جارٍ الإرسال…" : "إرسال"}
                kind="accent"
                small
                loading={send.isPending}
                onPress={onSend}
                icon={<Send size={14} color={p.accentFg} />}
                accessibilityLabel="إرسال الرد"
              />
            </View>
            {/* R331 A-App-Motion — the keyboard accessory bar (prev/next/done):
                rides the root KeyboardProvider, styled by the theme. */}
            <KeyboardToolbar />
          </View>
        }
      >
        <View style={{ gap: sp[10] }}>
          {thread.length === 0 ? (
            <T variant="sm" color="muted">
              لا رسائل محمّلة مع هذا المستخدم بعد.
            </T>
          ) : (
            thread.map((msg) => (
              <Bubble key={msg.id} message={msg} myId={myId} otherName={user.name} onPreview={setPreviewUrl} />
            ))
          )}
        </View>
      </AppSheet>

      {/* Attachment preview — a second, content-sized sheet. */}
      {previewUrl ? (
        <AppSheet open onClose={() => setPreviewUrl(null)} title="معاينة الصورة" snap="lg">
          <Image
            source={{ uri: previewUrl }}
            placeholder={GREY_BLURHASH}
            accessibilityLabel="صورة مرفقة بالرسالة"
            contentFit="contain"
            transition={150}
            style={{ width: "100%", height: 320, borderWidth: StyleSheet.hairlineWidth, borderColor: "transparent" }}
          />
        </AppSheet>
      ) : null}
    </>
  );
}

/* ── one bubble ──────────────────────────────────────────────────────── */

function Bubble({
  message,
  myId,
  otherName,
  onPreview,
}: {
  message: Message;
  myId: string;
  otherName: string;
  onPreview: (url: string) => void;
}) {
  const p = usePalette();
  const mine = message.fromUserId === myId;
  const images = imageUrlsInBody(message.body);
  // Entrance on mount = on arrival (new messages animate in; recycled old
  // bubbles only mount once per sheet open). Reduced-motion: no animation.
  const entering = useEntrance(() => fadeInUp());
  return (
    <Animated.View
      entering={entering}
      style={{
        alignSelf: mine ? "flex-end" : "flex-start", // RTL: mine = the END (left) edge
        maxWidth: "85%",
        backgroundColor: mine ? p.accentSoft : p.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: mine ? p.accent : p.border,
        padding: sp[10],
        gap: 4,
      }}
    >
      {/* the tail — hairline corner notch pointing at the sender's side */}
      <View
        style={[
          styles.tailBase,
          {
            backgroundColor: mine ? p.accentSoft : p.surface,
            borderColor: mine ? p.accent : p.border,
          },
          mine ? styles.tailMine : styles.tailTheirs,
        ]}
      />
      {images.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[6] }}>
          {images.map((url) => (
            <Pressable
              key={url}
              accessibilityRole="button"
              accessibilityLabel="معاينة صورة مرفقة"
              onPress={() => onPreview(url)}
            >
              <Image
                source={{ uri: url }}
                placeholder={GREY_BLURHASH}
                accessibilityLabel="صورة مرفقة"
                contentFit="cover"
                recyclingKey={url}
                style={{ width: 72, height: 72, borderWidth: StyleSheet.hairlineWidth, borderColor: p.rule }}
              />
            </Pressable>
          ))}
        </View>
      ) : null}
      <T variant="body">{message.body}</T>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
        {mine ? (
          message.readAt ? (
            <CheckCheck size={13} color={p.accentInk} />
          ) : (
            <Check size={13} color={p.textMuted} />
          )
        ) : null}
        <T variant="xs" color="faint">
          {`${mine ? "أنت" : otherName} · ${fromNow(message.createdAt)}${mine ? (message.readAt ? " · مقروءة" : " · أُرسلت") : ""}`}
        </T>
      </View>
    </Animated.View>
  );
}

/* ── typing dots (UI thread) ─────────────────────────────────────────── */

/** One pulsing dot — its own component so the hook arity stays fixed. */
function TypingDot({ offset, color }: { offset: number; color: string }) {
  const reduced = useReduceMotion();
  const phase = useSharedValue(0);

  useEffect(() => {
    if (reduced) return;
    // Infinite repeat, reversing each cycle → a breathing loop, never a snap.
    phase.value = withRepeat(withTiming(1, { duration: 900 }), -1, true);
  }, [phase, reduced]);

  const animated = useAnimatedStyle(() => {
    if (reduced) return { opacity: 0.45, transform: [{ translateY: 0 }] };
    // A single 0→1→0 wave; each dot samples it phase-shifted by 120°.
    const t = (phase.value + offset) % 1;
    const lift = t < 0.5 ? t * 2 : (1 - t) * 2;
    return { opacity: 0.25 + 0.75 * lift, transform: [{ translateY: -2 * lift }] };
  });

  return <Animated.View style={[styles.dot, { backgroundColor: color }, animated]} />;
}

/**
 * TypingDots — three dots pulsing in a staggered loop on the UI thread
 * (reanimated; zero JS-thread work). Reduced-motion renders them static.
 * No remote typing signal exists on the REST wire — this component runs
 * while a reply is in flight and is socket-ready for a future transport.
 */
function TypingDots() {
  const p = usePalette();
  return (
    <View
      accessibilityLabel="جارٍ الإرسال"
      style={{ flexDirection: "row", gap: 3, alignItems: "center", minHeight: 16 }}
    >
      <TypingDot offset={0} color={p.textMuted} />
      <TypingDot offset={1 / 3} color={p.textMuted} />
      <TypingDot offset={2 / 3} color={p.textMuted} />
    </View>
  );
}

const styles = StyleSheet.create({
  dot: { width: 5, height: 5, borderRadius: 2.5 },
  tailBase: {
    position: "absolute",
    bottom: 4,
    width: 10,
    height: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    transform: [{ rotate: "45deg" }],
  },
  /** mine sits at the physical LEFT (RTL END) — tail on the left edge. */
  tailMine: { left: -5, borderLeftWidth: StyleSheet.hairlineWidth },
  /** theirs sits at the physical RIGHT (RTL START) — tail on the right edge. */
  tailTheirs: { right: -5, borderRightWidth: StyleSheet.hairlineWidth },
});

