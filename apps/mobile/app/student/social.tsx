import { useCallback, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Image } from "expo-image";
import Heart from "lucide-react-native/icons/heart";
import Plus from "lucide-react-native/icons/plus";
import type { Post } from "@/api/types";
import { socialApi } from "@/api/social";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { usePalette, useStatusTones } from "@/design/theme";
import { sp, touchFloor } from "@/design/tokens";
import { T } from "@/components/ui/text";
import { StackHeader } from "@/components/shell/AppTopBar";
import { Screen } from "@/components/ui/screen";
import { Card, Sheet } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { Field } from "@/components/ui/fields";
import { Avatar, DataList } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";
import { fromNow, latn } from "@/lib/format";
import { humanizeError } from "@/lib/errors";
import { ChipRow } from "@/features/student/more";

/** Reactions arrive as a counter map or a reaction rows list — read the like count honestly. */
function likeCount(post: Post): number {
  const r = post.reactions;
  if (!r) return 0;
  if (!Array.isArray(r)) return Number((r as { like?: number }).like ?? 0);
  return r.filter((x) => (x as { kind?: string }).kind === "like").length;
}

/** Feed card gap — DataList ItemSeparator (cards no longer sit in a gap View). */
function FeedSeparator() {
  return <View style={{ height: sp[10] }} />;
}

/** One feed card — module scope so FlashList rows stay cheap to re-render. */
function PostCard({
  post,
  reacted,
  count,
  disabled,
  onToggle,
}: {
  post: Post;
  reacted: boolean;
  count: number;
  disabled: boolean;
  onToggle: (post: Post) => void;
}) {
  const p = usePalette();
  const tones = useStatusTones();
  return (
    <Card style={{ gap: sp[8] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
        <Avatar
          size={36}
          initials={post.author.avatarInitials ?? `${post.author.firstName?.[0] ?? "؟"}${post.author.lastName?.[0] ?? ""}`}
          color={post.author.avatarColor ?? null}
        />
        <View style={{ flex: 1 }}>
          <T variant="body" weight="bold">
            {`${post.author.firstName} ${post.author.lastName}`}
          </T>
          <T variant="xs" color="muted">
            {fromNow(post.createdAt)}
          </T>
        </View>
      </View>
      <T variant="body" color="secondary">
        {post.body}
      </T>
      {post.imageUrl ? (
        <Image
          source={{ uri: post.imageUrl }}
          contentFit="cover"
          accessibilityLabel={`صورة مرفقة بمنشور ${post.author.firstName}`}
          style={{ height: 180, borderWidth: StyleSheet.hairlineWidth, borderColor: p.border }}
        />
      ) : null}
      {post.hashtags && post.hashtags.length > 0 ? (
        <ChipRow>
          {post.hashtags.map((t) => (
            <T key={t} variant="xs" color="secondary">
              {`#${t}`}
            </T>
          ))}
        </ChipRow>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center" }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={reacted ? "إزالة الإعجاب" : "أعجبني بهذا المنشور"}
          accessibilityState={{ selected: reacted }}
          onPress={() => onToggle(post)}
          disabled={disabled}
          style={({ pressed }) => ({
            minHeight: touchFloor,
            minWidth: touchFloor,
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "row",
            gap: sp[6],
            opacity: pressed ? 0.6 : 1,
          })}
        >
          <Heart size={16} color={reacted ? tones.rose.ink : p.textMuted} fill={reacted ? tones.rose.ink : "none"} />
          <T variant="sm" weight="bold" style={{ color: reacted ? tones.rose.deep : p.textMuted }}>
            {latn(count)}
          </T>
        </Pressable>
      </View>
    </Card>
  );
}

/**
 * /student/social — المنشورات (web SocialPage parity): the institution
 * feed with optimistic like toggles (react/unreact against the real
 * routes), an honest compose sheet (body + comma-separated hashtags)
 * and post images via expo-image when the server sends one. The feed
 * rides DataList (FlashList v2) — image cards recycle instead of all
 * mounting at once in a ScrollView.
 */
export default function SocialScreen() {
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const p = usePalette();

  const feed = useQuery({
    queryKey: ["posts", scope],
    queryFn: () => socialApi.posts(),
    placeholderData: (prev) => prev,
  });
  const posts = feed.data ?? [];

  const [composerOpen, setComposerOpen] = useState(false);
  /** Session-local optimistic toggles on top of the server's own truth. */
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});

  const react = useMutation({
    mutationFn: (postId: string) => socialApi.react(postId, "like"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e) => {
      toast.error(humanizeError(e), "تعذّر تسجيل الإعجاب");
    },
  });
  const unreact = useMutation({
    mutationFn: (postId: string) => socialApi.unreact(postId, "like"),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["posts"] });
    },
    onError: (e) => {
      toast.error(humanizeError(e), "تعذّر إلغاء الإعجاب");
    },
  });

  const toggleLike = useCallback(
    (post: Post) => {
      const serverReacted = post.myReaction === "like";
      const current = optimistic[post.id] ?? serverReacted;
      const next = !current;
      setOptimistic((prev) => ({ ...prev, [post.id]: next }));
      if (next) react.mutate(post.id);
      else unreact.mutate(post.id);
    },
    [optimistic, react, unreact],
  );

  const isReacted = (post: Post) => optimistic[post.id] ?? post.myReaction === "like";
  const displayed = (post: Post) => {
    const server = likeCount(post);
    const override = optimistic[post.id];
    if (override === undefined) return server;
    const serverReacted = post.myReaction === "like";
    if (override && !serverReacted) return server + 1;
    if (!override && serverReacted) return Math.max(0, server - 1);
    return server;
  };

  const create = useMutation({
    mutationFn: (payload: { body: string; hashtags?: string[] }) => socialApi.createPost(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["posts"] });
      toast.success("تم نشر منشورك.", "تمّ النشر");
      setComposerOpen(false);
    },
    onError: (e) => toast.error(humanizeError(e), "تعذّر نشر المنشور"),
  });

  const likeBusy = react.isPending || unreact.isPending;

  return (
    <Screen scroll={false} padded={false}>
      <StackHeader title="المنشورات" kicker="الشبكة الاجتماعية" />
      <DataList
        data={posts}
        renderItem={({ item }) => (
          <PostCard
            post={item}
            reacted={isReacted(item)}
            count={displayed(item)}
            disabled={likeBusy}
            onToggle={toggleLike}
          />
        )}
        keyExtractor={(post) => post.id}
        extraData={{ optimistic, likeBusy }}
        isLoading={feed.isLoading}
        isError={feed.isError}
        errorMessage={feed.isError ? humanizeError(feed.error) : null}
        onRetry={() => feed.refetch()}
        refetch={feed.refetch}
        isRefetching={feed.isRefetching}
        emptyTitle="لا منشورات بعد"
        emptyMessage="كن أول من يشارك تجربته أو سؤاله."
        ListHeaderComponent={
          <View style={{ paddingHorizontal: sp[16], paddingVertical: sp[8] }}>
            <T variant="sm" color="muted">
              تواصل مع زملائك وأساتذتك حول المقرّرات والمشاريع.
            </T>
          </View>
        }
        ItemSeparatorComponent={FeedSeparator}
        contentPadding={{ horizontal: 16, bottom: 96 }}
      />

      <ComposeSheet open={composerOpen} onClose={() => setComposerOpen(false)} onSubmit={(payload) => create.mutate(payload)} pending={create.isPending} />

      {/* Compose FAB — overlay on the viewport (never inside the scroller). */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="منشور جديد"
        onPress={() => setComposerOpen(true)}
        style={({ pressed }) => [
          {
            position: "absolute",
            bottom: sp[24],
            end: sp[20],
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: pressed ? p.accentHover : p.accent,
            alignItems: "center",
            justifyContent: "center",
          },
        ]}
      >
        <Plus size={24} color={p.accentFg} />
      </Pressable>
    </Screen>
  );
}

function ComposeSheet({
  open,
  onClose,
  onSubmit,
  pending,
}: {
  open: boolean;
  onClose: () => void;
  onSubmit: (payload: { body: string; hashtags?: string[] }) => void;
  pending: boolean;
}) {
  const [body, setBody] = useState("");
  const [hashtags, setHashtags] = useState("");
  const canSubmit = body.trim().length > 0 && !pending;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="منشور جديد"
      footer={
        <View style={{ gap: sp[8] }}>
          {!canSubmit && !pending ? <T variant="xs" color="faint">اكتب نص المنشور لتتمكّن من النشر.</T> : null}
          <Button
            label={pending ? "جارٍ النشر…" : "نشر"}
            kind="primary"
            disabled={!canSubmit}
            loading={pending}
            onPress={() => {
              const tags = hashtags
                .split(/[،,]/)
                .map((t) => t.trim().replace(/^#/, ""))
                .filter((t) => t.length > 0);
              onSubmit({ body: body.trim(), hashtags: tags.length > 0 ? tags : undefined });
            }}
          />
        </View>
      }
    >
      <View style={{ gap: sp[12] }}>
        <Field
          label="نص المنشور"
          value={body}
          onChangeText={setBody}
          placeholder="ماذا يدور في ذهنك؟"
          multiline
          maxLength={2000}
        />
        <Field
          label="الوسوم (اختياري)"
          value={hashtags}
          onChangeText={setHashtags}
          placeholder="مثال: برمجة، تصميم"
          hint="أدخل الوسوم مفصولة بفواصل."
        />
        <T variant="xs" color="faint">
          لا تُرفع الصور من التطبيق بعد — يُعرض ما يرسله الخادم من روابط فقط.
        </T>
      </View>
    </Sheet>
  );
}
