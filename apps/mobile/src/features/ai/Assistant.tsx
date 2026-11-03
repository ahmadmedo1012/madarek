import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlatList, Platform, Pressable, Share, StyleSheet, TextInput, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Animated from "react-native-reanimated";
import { KeyboardAvoidingView, KeyboardToolbar } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ArrowRight from "lucide-react-native/icons/arrow-right";
import Check from "lucide-react-native/icons/check";
import Copy from "lucide-react-native/icons/copy";
import Clock from "lucide-react-native/icons/clock";
import Plus from "lucide-react-native/icons/plus";
import RefreshCw from "lucide-react-native/icons/refresh-cw";
import Send from "lucide-react-native/icons/send";
import Share2 from "lucide-react-native/icons/share-2";
import Square from "lucide-react-native/icons/square";
import ThumbsDown from "lucide-react-native/icons/thumbs-down";
import ThumbsUp from "lucide-react-native/icons/thumbs-up";
import Trash2 from "lucide-react-native/icons/trash";
import * as WebBrowser from "expo-web-browser";
import { aiApi } from "@/api/ai";
import { usePalette, useSemanticTheme } from "@/design/theme";
import { AppStatusBar } from "@/design/statusbar";
import { sp } from "@/design/tokens";
import { T, MonoLabel } from "@/components/ui/text";
import { Badge, Card } from "@/components/ui/surfaces";
import { Button, IconButton } from "@/components/ui/pressables";
import { ActionSheet, AppSheet, ConfirmSheet } from "@/components/ui/sheet";
import { DataList } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";
import { haptics } from "@/haptics";
import { PressableScale, Skeleton, slideInFromEnd, useEntrance, useStaggerEntrance } from "@/motion";
import { humanizeError } from "@/lib/errors";
import type { AiCitation } from "./stream";
import { canStreamAi, isStreamAbortError, streamAiChat } from "./stream";
import { AssistantMarkdown } from "./Markdown";
import { copyTextWithToast } from "./clipboard";
import {
  appendDelta,
  beginTurn,
  canSend as canSendTurn,
  citationChipLabel,
  completeTurn,
  dropFailedTurn,
  failTurn,
  isCitationOpenable,
  isQuotaError,
  nextTurnKey,
  pickSuggestions,
  retryTarget,
  ROLE_KICKER,
  ROLE_WELCOME_BODY,
  ROLE_WELCOME_TITLE,
  stopTurn,
  streamingKey,
  type AssistantRole,
  type ChatTurn,
} from "./logic";

/**
 * Assistant — the AI academic assistant (R334 3-f, full chat UX).
 *
 * Streaming: POST /ai/chat?stream=1 over XHR-SSE (./stream) — tokens render
 * the moment they arrive; the `done` frame's reply replaces the client
 * buffer (a transport drop can never truncate the answer on screen); the
 * stop button aborts (the server persists NOTHING for an aborted turn —
 * the kept partial text is labeled «أُوقف الردّ», honestly). When XHR
 * streaming is unavailable the JSON grammar (aiApi.chat) takes over with
 * the typing shimmer — same engine, no streaming pretense.
 *
 * Provider honesty: the «مزوّد: …» badge stays verbatim (local = the
 * disclosed template composer). Every failure routes through
 * humanizeError (src/lib/errors); a failed turn gets «إعادة المحاولة»
 * (haptics.notify("error") on failure).
 *
 * The heavy sheet engine (@gorhom/bottom-sheet + RNGH) mounts on the
 * FIRST sheet open, not at screen mount — the render net (jest) must
 * never import the native graph (see docs/mobile/foundations/sheets.md).
 *
 * `stacked` marks a PUSHED instance (over the persistent tab shell): it
 * owns the home-indicator inset below the composer and shows a back
 * affordance (RTL: the arrow points right = the back edge).
 */
export function Assistant({
  role = "student",
  stacked = false,
  onBack,
}: {
  role?: AssistantRole;
  stacked?: boolean;
  onBack?: () => void;
} = {}) {
  const p = usePalette();
  const { colors, hairlines } = useSemanticTheme();
  const insets = useSafeAreaInsets();
  const qc = useQueryClient();
  const inFlight = useRef(false);

  const [conversationId, setConversationId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatTurn[]>([]);
  const [quotaHit, setQuotaHit] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [messageActions, setMessageActions] = useState<ChatTurn | null>(null);
  /** Flip once, on the first sheet open → the native sheet graph loads then. */
  const [sheetsMounted, setSheetsMounted] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const isStreaming = streamingKey(messages) !== null;
  const retry = useMemo(() => retryTarget(messages), [messages]);

  const mountSheets = useCallback(() => {
    setSheetsMounted(true);
  }, []);

  /* ── provider config (the honest badge) ─────────────────────────────── */

  const config = useQuery({
    queryKey: ["ai", "config"],
    queryFn: () => aiApi.config(),
    staleTime: 5 * 60_000,
  });
  const provider = config.data?.provider ?? null;
  const model = config.data?.model ?? null;

  /* ── conversation history (the AppSheet) ────────────────────────────── */

  const history = useQuery({
    queryKey: ["ai", "conversations"],
    queryFn: () => aiApi.conversations(),
    enabled: historyOpen,
    staleTime: 30_000,
  });

  const openConversation = useCallback(async (id: string) => {
    setHistoryOpen(false);
    setQuotaHit(false);
    setConversationId(id);
    try {
      const rows = await aiApi.messages(id);
      setMessages(
        (rows ?? [])
          .filter((m) => m.role === "USER" || m.role === "ASSISTANT")
          .map((m, i) => ({
            key: `h-${id}-${m.id ?? i}`,
            role: (m.role === "USER" ? "user" : "assistant") as "user" | "assistant",
            content: m.content ?? "",
            status: "done" as const,
            messageId: m.id,
          })),
      );
    } catch (err) {
      toast.error(humanizeError(err));
    }
  }, []);

  const newConversation = useCallback(() => {
    haptics.selection();
    abortRef.current?.abort();
    setHistoryOpen(false);
    setConversationId(null);
    setMessages([]);
    setQuotaHit(false);
    setInput("");
  }, []);

  const deleteConversation = useMutation({
    mutationFn: (id: string) => aiApi.deleteConversation(id),
    onSuccess: (_data, id) => {
      haptics.notify("success");
      if (id === conversationId) newConversation();
      void qc.invalidateQueries({ queryKey: ["ai", "conversations"] });
    },
    onError: (err) => {
      haptics.notify("error");
      toast.error(humanizeError(err));
    },
  });

  /* ── sending (streaming first, JSON grammar as the fallback) ────────── */

  const send = useCallback(
    async (rawText: string) => {
      const text = rawText.trim();
      if (!text || inFlight.current) return;
      haptics.impact("light");
      inFlight.current = true;
      setQuotaHit(false);
      // The streaming turn's key is decided HERE — beginTurn plants it, the
      // token callbacks address it. No ref/effect race.
      const key = nextTurnKey("assistant");
      setMessages((prev) => beginTurn(prev, text, key));
      setInput("");
      try {
        if (canStreamAi()) {
          const controller = new AbortController();
          abortRef.current = controller;
          const final = await streamAiChat({
            conversationId: conversationId ?? undefined,
            message: text,
            signal: controller.signal,
            onToken: (delta) => setMessages((prev) => appendDelta(prev, key, delta)),
          });
          setConversationId(final.conversationId);
          setMessages((prev) =>
            completeTurn(prev, key, {
              reply: final.reply,
              messageId: final.messageId,
              engine: final.engine,
              model: final.model,
              citations: final.citations,
            }),
          );
          void qc.invalidateQueries({ queryKey: ["ai", "conversations"] });
          return;
        }
        const res = await aiApi.chat({ conversationId: conversationId ?? undefined, message: text });
        setConversationId(res.conversationId);
        setMessages((prev) =>
          completeTurn(prev, key, {
            reply: res.reply,
            messageId: res.messageId,
            engine: res.engine,
            model: res.model,
            citations: (res.citations as AiCitation[] | undefined) ?? [],
          }),
        );
        void qc.invalidateQueries({ queryKey: ["ai", "conversations"] });
      } catch (err) {
        if (isStreamAbortError(err)) {
          // the user's stop button — keep the partial text, label it honestly
          setMessages((prev) => stopTurn(prev, key));
        } else if (isQuotaError(err)) {
          haptics.notify("warning");
          setQuotaHit(true);
          setMessages((prev) => failTurn(prev, key, humanizeError(err)));
        } else {
          haptics.notify("error");
          setMessages((prev) => failTurn(prev, key, humanizeError(err)));
        }
      } finally {
        inFlight.current = false;
        abortRef.current = null;
      }
    },
    [conversationId, qc],
  );

  const stop = useCallback(() => {
    haptics.impact("medium");
    abortRef.current?.abort();
  }, []);

  const retrySend = useCallback(() => {
    if (!retry) return;
    haptics.impact("light");
    const prompt = retry.prompt;
    setMessages((prev) => dropFailedTurn(prev, retry.key));
    void send(prompt);
  }, [retry, send]);

  // An unmount mid-stream must not leak the XHR.
  useEffect(() => () => abortRef.current?.abort(), []);

  const rate = useMutation({
    mutationFn: ({ messageId, rating }: { messageId: string; rating: 1 | -1 }) =>
      aiApi.feedback(messageId, rating),
    onSuccess: () => haptics.selection(),
    onError: (err) => toast.error(humanizeError(err)),
  });

  /* ── empty state (staggered suggestion chips) ───────────────────────── */

  const chipEntering = useStaggerEntrance({ base: 80, step: 60 });
  // Fresh chips once the first turn lands (offset 1 → the next pool slice).
  const empty = messages.length === 0;
  const suggestions = useMemo(
    () => pickSuggestions(role, empty ? 0 : 1, 4),
    [role, empty],
  );

  const openCitation = useCallback((url: string) => {
    void WebBrowser.openBrowserAsync(url).catch(() => toast.error("تعذّر فتح المصدر"));
  }, []);

  const openHistory = useCallback(() => {
    haptics.selection();
    mountSheets();
    setHistoryOpen(true);
  }, [mountSheets]);

  const askClear = useCallback(() => {
    mountSheets();
    setConfirmClear(true);
  }, [mountSheets]);

  const data = useMemo(() => [...messages].reverse(), [messages]); // inverted list

  return (
    <View style={{ flex: 1, backgroundColor: p.bg }}>
      <AppStatusBar />
      {/* Header — role context + the honest provider badge (verbatim) */}
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: sp[8],
          paddingHorizontal: sp[16],
          paddingTop: Math.max(insets.top, sp[8]),
          paddingBottom: sp[8],
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: p.rule,
          backgroundColor: colors.surface,
        }}
      >
        {stacked && onBack ? (
          <IconButton accessibilityLabel="رجوع" onPress={onBack}>
            <ArrowRight size={22} color={p.text} />
          </IconButton>
        ) : null}
        <View style={{ flex: 1, gap: 0 }}>
          <T variant="xs" color="muted">
            {ROLE_KICKER[role]}
          </T>
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
            <T variant="h4" weight="bold">
              المساعد الأكاديمي
            </T>
            {provider ? (
              <Badge label={`مزوّد: ${provider}`} tone={provider === "local" ? "yellow" : "mint"} />
            ) : null}
          </View>
          {provider === "local" ? (
            <T variant="xs" color="muted" numberOfLines={1}>
              المزوّد «local» — ردود قالبيّة مركّبة محليًا حتى تفعيل مزوّد خارجي حقيقي.
            </T>
          ) : model ? (
            <MonoLabel>{model}</MonoLabel>
          ) : null}
        </View>
        {messages.length > 0 ? (
          <IconButton accessibilityLabel="محادثة جديدة" onPress={newConversation}>
            <Plus size={20} color={p.textMuted} />
          </IconButton>
        ) : null}
        <IconButton accessibilityLabel="سجلّ المحادثات" onPress={openHistory}>
          <Clock size={20} color={p.textMuted} />
        </IconButton>
        {conversationId ? (
          <IconButton accessibilityLabel="مسح المحادثة" onPress={askClear}>
            <Trash2 size={20} color={p.textMuted} />
          </IconButton>
        ) : null}
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* The transcript — an inverted FlatList: the newest turn sits at
            the visual bottom by construction (streaming text appears with
            no scrollTo calls) and rows recycle on long conversations. */}
        <FlatList
          data={data}
          inverted
          keyExtractor={(item) => item.key}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="interactive"
          contentContainerStyle={[
            { padding: sp[16], gap: sp[12] },
            messages.length === 0 ? { flexGrow: 1, justifyContent: "center" } : null,
          ]}
          ListEmptyComponent={
            <View style={{ gap: sp[12], paddingBottom: sp[24] }}>
              <View style={{ alignItems: "center", gap: sp[8] }}>
                <T variant="h4" weight="bold">
                  {ROLE_WELCOME_TITLE[role]}
                </T>
                <T variant="body" color="muted" align="center" style={{ paddingHorizontal: sp[8] }}>
                  {ROLE_WELCOME_BODY[role]}
                </T>
              </View>
              <View
                style={{
                  flexDirection: "row",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  gap: sp[8],
                }}
              >
                {suggestions.map((s, i) => (
                  <Animated.View key={s.id} entering={chipEntering(i)}>
                    <PressableScale
                      accessibilityRole="button"
                      accessibilityLabel={s.label}
                      onPress={() => {
                        haptics.selection();
                        void send(s.prompt);
                      }}
                      style={[
                        {
                          backgroundColor: colors.surfaceElevated,
                          borderRadius: 999,
                          paddingVertical: sp[10],
                          paddingHorizontal: sp[16],
                          minHeight: 44,
                          justifyContent: "center",
                        },
                        hairlines.border,
                      ]}
                    >
                      <T variant="sm" color="accentInk">
                        {s.label}
                      </T>
                    </PressableScale>
                  </Animated.View>
                ))}
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <TurnBubble
              turn={item}
              onRetry={retrySend}
              canRetry={retry?.key === item.key}
              onRate={(rating) =>
                item.messageId && rate.mutate({ messageId: item.messageId, rating })
              }
              onCitationPress={openCitation}
              onLongPress={() => {
                mountSheets();
                setMessageActions(item);
              }}
            />
          )}
        />

        {/* Composer — the primary send is NEVER under the keyboard:
            KeyboardAvoidingView (keyboard-controller, UI-thread offset) +
            the «تم» toolbar dismiss key. Multiline grows 48 → 120. */}
        <View
          style={{
            borderTopWidth: StyleSheet.hairlineWidth,
            borderTopColor: p.rule,
            backgroundColor: colors.surface,
            paddingHorizontal: sp[12],
            paddingTop: sp[8],
            paddingBottom: stacked ? Math.max(sp[10], insets.bottom) : sp[10],
            gap: sp[6],
          }}
        >
          {quotaHit ? (
            <Card style={{ borderColor: p.accentInk, padding: sp[10], gap: 2 }}>
              <T variant="sm" weight="bold">
                وصلت حدّ الأسئلة اليومي
              </T>
              <T variant="xs" color="muted">
                عُد غدًا — الحد اليومي يحفظ عدالة استخدام الخدمة للجميع.
              </T>
            </Card>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "flex-end", gap: sp[8] }}>
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
                backgroundColor: colors.sunken,
                color: p.text,
                fontSize: 15,
                textAlign: "right",
                writingDirection: "rtl",
                padding: sp[12],
                borderRadius: 12,
              }}
            />
            {isStreaming ? (
              <IconButton accessibilityLabel="إيقاف الردّ" onPress={stop}>
                <Square size={18} color={p.text} fill={p.text} />
              </IconButton>
            ) : (
              <IconButton
                accessibilityLabel="إرسال"
                onPress={() => void send(input)}
                disabled={input.trim().length === 0 || !canSendTurn(messages)}
              >
                <Send size={22} color={input.trim().length === 0 ? p.textFaint : p.accent} />
              </IconButton>
            )}
          </View>
          <T variant="xs" color="faint">
            قد تكون الردود غير دقيقة — راجع مصادر المقرّر دائمًا.
          </T>
        </View>
        <KeyboardToolbar>
          <KeyboardToolbar.Done text={<T variant="sm" weight="medium">تم</T>} />
        </KeyboardToolbar>
      </KeyboardAvoidingView>

      {/* The sheets mount on first open (the native graph stays out of the
          jest render net — see the module docblock). */}
      {sheetsMounted ? (
        <>
          {/* History — the conversation ledger + «محادثة جديدة» */}
          <AppSheet
            open={historyOpen}
            onClose={() => setHistoryOpen(false)}
            title="سجلّ المحادثات"
            snap="lg"
            dynamic={false}
            footer={
              <Button
                label="محادثة جديدة"
                kind="primary"
                onPress={newConversation}
                icon={<Plus size={16} color={p.primaryFg} />}
              />
            }
          >
            <View style={{ height: 360 }}>
              <DataList
                data={history.data ?? []}
                keyExtractor={(c) => c.id}
                isLoading={history.isLoading}
                isError={history.isError}
                errorMessage={humanizeError(history.error)}
                onRetry={() => void history.refetch()}
                emptyTitle="لا توجد محادثات سابقة"
                emptyMessage="ابدأ أول سؤال — ستظهر محادثاتك هنا."
                refetch={() => void history.refetch()}
                isRefetching={history.isRefetching}
                renderItem={({ item }) => (
                  <HistoryRow
                    title={item.title?.trim() || "محادثة"}
                    active={item.id === conversationId}
                    onPress={() => void openConversation(item.id)}
                    onDelete={() => setConfirmDeleteId(item.id)}
                  />
                )}
              />
            </View>
          </AppSheet>

          {/* Per-message copy/share */}
          <ActionSheet
            open={messageActions !== null}
            onClose={() => setMessageActions(null)}
            title="إجراءات الرسالة"
            actions={[
              {
                label: "نسخ النص",
                icon: <Copy size={16} color={p.text} />,
                onPress: () => {
                  if (messageActions) copyTextWithToast(messageActions.content);
                },
              },
              {
                label: "مشاركة",
                icon: <Share2 size={16} color={p.text} />,
                onPress: () => {
                  const m = messageActions;
                  if (m)
                    void Share.share({ message: m.content, title: "المساعد الأكاديمي" }).catch(
                      () => undefined,
                    );
                },
              },
            ]}
          />

          <ConfirmSheet
            open={confirmClear}
            onClose={() => setConfirmClear(false)}
            title="مسح المحادثة؟"
            message="لن تتمكن من استرجاع هذا الحوار."
            confirmLabel="مسح"
            destructive
            onConfirm={() => {
              setConfirmClear(false);
              const id = conversationId;
              if (id) {
                aiApi.deleteConversation(id).catch(() => undefined);
              }
              newConversation();
            }}
          />
          <ConfirmSheet
            open={confirmDeleteId !== null}
            onClose={() => setConfirmDeleteId(null)}
            title="حذف المحادثة؟"
            message="ستُحذف من سجلّك نهائيًا."
            confirmLabel="حذف"
            destructive
            onConfirm={() => {
              if (confirmDeleteId) deleteConversation.mutate(confirmDeleteId);
              setConfirmDeleteId(null);
            }}
          />
        </>
      ) : null}
    </View>
  );
}

/* ── subcomponents (module scope — stable under React Compiler) ───────── */

function HistoryRow({
  title,
  active,
  onPress,
  onDelete,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
  onDelete: () => void;
}) {
  const { colors } = useSemanticTheme();
  const p = usePalette();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 56,
        justifyContent: "center",
        backgroundColor: pressed ? colors.sunken : "transparent",
        paddingHorizontal: sp[8],
      })}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], paddingVertical: sp[6] }}>
        {active ? <Check size={16} color={p.accentInk} /> : null}
        <View style={{ flex: 1 }}>
          <T variant="body" weight={active ? "bold" : "medium"} numberOfLines={1}>
            {title}
          </T>
        </View>
        <IconButton accessibilityLabel={`حذف ${title}`} onPress={onDelete}>
          <Trash2 size={16} color={p.textFaint} />
        </IconButton>
      </View>
      <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: p.border }} />
    </Pressable>
  );
}

function TurnBubble({
  turn,
  onRetry,
  canRetry,
  onRate,
  onCitationPress,
  onLongPress,
}: {
  turn: ChatTurn;
  onRetry: () => void;
  canRetry: boolean;
  onRate: (rating: 1 | -1) => void;
  onCitationPress: (url: string) => void;
  onLongPress: () => void;
}) {
  const p = usePalette();
  const { colors, hairlines } = useSemanticTheme();
  const bubbleEntering = useEntrance(() => slideInFromEnd());
  const mine = turn.role === "user";
  const citations: { label: string; openable: boolean; url?: string | null }[] = (turn.citations ?? []).map(
    (c: AiCitation) => ({
      label: citationChipLabel(c),
      openable: isCitationOpenable(c),
      url: c.url,
    }),
  );

  return (
    <Animated.View
      entering={bubbleEntering}
      style={{
        alignSelf: mine ? "flex-start" : "flex-end",
        maxWidth: "86%",
        backgroundColor: mine ? colors.sunken : colors.surfaceElevated,
        borderRadius: 14,
        padding: sp[12],
        gap: sp[6],
        ...(mine ? { borderWidth: StyleSheet.hairlineWidth, borderColor: p.rule } : hairlines.border),
      }}
    >
      {turn.status === "error" ? (
        <View style={{ gap: sp[8] }}>
          <T variant="sm" color="danger">
            {turn.error}
          </T>
          {canRetry ? (
            <Button
              label="إعادة المحاولة"
              kind="ghost"
              small
              onPress={onRetry}
              icon={<RefreshCw size={14} color={p.text} />}
            />
          ) : null}
        </View>
      ) : turn.content.length === 0 && turn.status === "streaming" ? (
        // zero tokens yet — the typing shimmer (UI thread, reduced-motion safe)
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
          <Skeleton width={14} height={14} radius={4} />
          <Skeleton width={90} height={14} radius={4} />
          <T variant="sm" color="muted">
            يفكّر…
          </T>
        </View>
      ) : (
        <Pressable onLongPress={onLongPress} delayLongPress={350} accessibilityLabel="رسالة">
          <AssistantMarkdown
            source={turn.content}
            citations={turn.status === "done" ? citations : undefined}
            onCitationPress={onCitationPress}
          />
          {turn.status === "streaming" || turn.status === "stopped" ? (
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6], paddingTop: sp[4] }}>
              {turn.status === "streaming" ? <Skeleton width={10} height={14} radius={2} /> : null}
              <T variant="xs" color="faint">
                {turn.status === "streaming" ? "يكتب…" : "أُوقف الردّ — لم يُحفظ في السجلّ"}
              </T>
            </View>
          ) : null}
        </Pressable>
      )}
      {turn.role === "assistant" && turn.status === "done" && turn.messageId ? (
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
          {turn.model ? <MonoLabel>{turn.model}</MonoLabel> : null}
          <IconButton accessibilityLabel="تقييم مفيد" onPress={() => onRate(1)}>
            <ThumbsUp size={14} color={p.textFaint} />
          </IconButton>
          <IconButton accessibilityLabel="تقييم غير مفيد" onPress={() => onRate(-1)}>
            <ThumbsDown size={14} color={p.textFaint} />
          </IconButton>
        </View>
      ) : null}
    </Animated.View>
  );
}
