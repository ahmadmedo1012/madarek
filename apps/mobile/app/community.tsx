import { useState, type ReactNode } from "react";
import { View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark,
  CalendarDays,
  CheckCircle2,
  Heart,
  MapPin,
  MessageCircle,
  Plus,
  Send,
  UserMinus,
  UserPlus,
  Users,
} from "lucide-react-native";
import { socialApi } from "@/api/social";
import type { StudyRoom } from "@/api/social";
import type { Announcement, CampusEvent, Post } from "@/api/types";
import { ApiError } from "@/api/client";
import { useSession } from "@/auth/session";
import { usePalette, useStatusTones } from "@/design/theme";
import { sp } from "@/design/tokens";
import { dateTime, fromNow, initials, latn } from "@/lib/format";
import { useInstitutionScope } from "@/hooks/useInstitutionScope";
import { Screen } from "@/components/ui/screen";
import { T } from "@/components/ui/text";
import { Badge, Card, Sheet } from "@/components/ui/surfaces";
import { Button } from "@/components/ui/pressables";
import { Field, Segmented } from "@/components/ui/fields";
import { Avatar, RowList, LedgerRow } from "@/components/ui/data";
import { EmptyState, ErrorState, SkeletonList } from "@/components/ui/states";
import { toast } from "@/components/ui/toast";
import { StackHeader } from "@/components/shell/AppTopBar";
import {
  SignInPrompt,
  apiMessage,
  isUnauthError,
  membersAr,
} from "@/features/common/components";

type Tab = "posts" | "announcements" | "events" | "rooms";

const SCOPE_LABEL: Record<string, string> = {
  PLATFORM: "كل المنصة",
  FACULTY: "كلّيّة",
  DEPARTMENT: "قسم",
  OFFERING: "مقرر",
};
const SCOPE_TONE: Record<string, "copper" | "mint" | "lavender" | "sky"> = {
  PLATFORM: "copper",
  FACULTY: "mint",
  DEPARTMENT: "lavender",
  OFFERING: "sky",
};

/**
 * /community — the university community (4 segments: posts ·
 * announcements · events · study rooms). The backend routes are
 * auth-walled, so a guest gets the honest sign-in prompt per tab instead
 * of fake data. Web twin: CommunityPage + CommunitySocialPanels.
 */
export default function Community() {
  const [tab, setTab] = useState<Tab>("posts");

  return (
    <Screen scroll>
      <StackHeader title="المجتمع الجامعي" kicker="الحياة الأكاديمية" />
      <T variant="body" color="secondary">
        إعلانات الجامعة · مسابقات وفعاليات · أنشطة طلابية. المساحة الرسمية للحياة الأكاديمية اليومية.
      </T>
      <Segmented
        options={[
          { id: "posts", label: "المنشورات" },
          { id: "announcements", label: "الإعلانات" },
          { id: "events", label: "الفعاليات" },
          { id: "rooms", label: "غرف الدراسة" },
        ]}
        selectedId={tab}
        onSelect={(id) => setTab(id as Tab)}
      />
      {tab === "posts" ? <PostsPanel /> : null}
      {tab === "announcements" ? <AnnouncementsPanel /> : null}
      {tab === "events" ? <EventsPanel /> : null}
      {tab === "rooms" ? <RoomsPanel /> : null}
    </Screen>
  );
}

/* ═══════════ Tab: posts ═══════════ */

function reactionCounts(post: Post): { like: number; save: number } {
  const r = post.reactions;
  if (!r) return { like: 0, save: 0 };
  if (Array.isArray(r)) {
    let like = 0;
    let save = 0;
    for (const x of r) {
      const kind = (x as { kind?: string })?.kind;
      if (kind === "like") like++;
      else if (kind === "save") save++;
    }
    return { like, save };
  }
  const o = r as { like?: unknown; save?: unknown };
  return {
    like: typeof o.like === "number" ? o.like : 0,
    save: typeof o.save === "number" ? o.save : 0,
  };
}

function PostsPanel() {
  const p = usePalette();
  const qc = useQueryClient();
  const scope = useInstitutionScope();
  const user = useSession((s) => s.user);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");

  const q = useQuery({
    queryKey: ["community", "posts", scope],
    queryFn: () => socialApi.posts(),
  });

  const react = useMutation({
    mutationFn: ({ postId, kind, on }: { postId: string; kind: "like" | "save"; on: boolean }) =>
      on ? socialApi.react(postId, kind) : socialApi.unreact(postId, kind),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", "posts", scope] }),
    onError: (e) => toast.error(apiMessage(e, "تعذّر تسجيل تفاعلك.")),
  });

  const publish = useMutation({
    mutationFn: () => {
      const tags = draft.match(/#[\u0600-\u06FF\w_]+/g)?.map((t) => t.slice(1));
      return socialApi.createPost({ body: draft.trim(), hashtags: tags });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community", "posts", scope] });
      setDraft("");
      setComposing(false);
      toast.success("تم نشر منشورك.");
    },
    onError: (e) => toast.error(apiMessage(e, "تعذّر نشر المنشور — نصّك ما زال محفوظًا.")),
  });

  const posts = q.data ?? [];

  if (q.isLoading) return <SkeletonList rows={4} rowHeight={84} />;
  if (q.isError) {
    if (isUnauthError(q.error)) return <SignInPrompt />;
    return <ErrorState message={apiMessage(q.error)} onRetry={() => q.refetch()} />;
  }

  return (
    <View style={{ gap: sp[12] }}>
      {user ? (
        <Button
          label="اكتب منشورًا جديدًا"
          kind="ghost"
          icon={<Plus size={16} color={p.text} />}
          onPress={() => setComposing(true)}
        />
      ) : null}

      {posts.length === 0 ? (
        <EmptyState
          title="لا منشورات بعد"
          message="كن أول من يشارك تجربته أو سؤاله."
          icon={<MessageCircle size={20} color={p.textMuted} />}
          actionLabel={user ? "اكتب منشورًا" : undefined}
          onAction={user ? () => setComposing(true) : undefined}
        />
      ) : (
        posts.map((post) => (
          <PostCard key={post.id} post={post} onReact={(kind, on) => react.mutate({ postId: post.id, kind, on })} />
        ))
      )}

      <Sheet
        open={composing}
        onClose={() => setComposing(false)}
        title="منشور جديد"
        footer={
          <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
            <View style={{ flex: 1 }}>
              <T variant="xs" color="faint">{`${latn(draft.length)} / ${latn(2000)}`}</T>
            </View>
            <Button
              label={publish.isPending ? "جارٍ النشر…" : "نشر"}
              onPress={() => draft.trim() && publish.mutate()}
              loading={publish.isPending}
              disabled={!draft.trim()}
              small
              icon={<Send size={14} color={p.accentFg} />}
            />
          </View>
        }
      >
        <Field
          label="ماذا يدور في ذهنك؟"
          value={draft}
          onChangeText={setDraft}
          placeholder="يمكنك استخدام #هاشتاج"
          multiline
          maxLength={2000}
          textAlignVertical="top"
        />
        {publish.isError ? (
          <T variant="sm" color="danger">
            {(publish.error as ApiError)?.message ?? "تعذّر نشر المنشور."}
          </T>
        ) : null}
      </Sheet>
    </View>
  );
}

function PostCard({ post, onReact }: { post: Post; onReact: (kind: "like" | "save", on: boolean) => void }) {
  const p = usePalette();
  const tones = useStatusTones();
  const counts = reactionCounts(post);
  const my = post.myReaction ?? null;

  return (
    <Card style={{ gap: sp[8] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[10] }}>
        <Avatar
          initials={initials(post.author.firstName, post.author.lastName)}
          color={post.author.avatarColor ?? null}
          size={36}
        />
        <View style={{ flex: 1, gap: 1 }}>
          <T variant="body" weight="bold">
            {`${post.author.firstName} ${post.author.lastName}`}
          </T>
          <T variant="xs" color="faint">
            {fromNow(post.createdAt)}
          </T>
        </View>
      </View>
      <T variant="body" color="secondary">
        {post.body}
      </T>
      {post.hashtags && post.hashtags.length > 0 ? (
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp[6] }}>
          {post.hashtags.map((t) => (
            <T key={t} variant="xs" color="accentInk">
              {`#${t}`}
            </T>
          ))}
        </View>
      ) : null}
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[4] }}>
        <Button
          label={counts.like > 0 ? latn(counts.like) : "أعجبني"}
          kind="ghost"
          small
          icon={
            <Heart
              size={18}
              color={my === "like" ? p.accentInk : p.textMuted}
              fill={my === "like" ? p.accentInk : "none"}
            />
          }
          onPress={() => onReact("like", my !== "like")}
          accessibilityLabel={my === "like" ? "إزالة الإعجاب" : "أعجبني بهذا المنشور"}
        />
        <Button
          label={counts.save > 0 ? latn(counts.save) : "حفظ"}
          kind="ghost"
          small
          icon={
            <Bookmark
              size={18}
              color={my === "save" ? tones.mint.ink : p.textMuted}
              fill={my === "save" ? tones.mint.ink : "none"}
            />
          }
          onPress={() => onReact("save", my !== "save")}
          accessibilityLabel={my === "save" ? "إلغاء الحفظ" : "حفظ المنشور"}
        />
      </View>
    </Card>
  );
}

/* ═══════════ Tab: announcements ═══════════ */

function AnnouncementsPanel() {
  const scope = useInstitutionScope();

  const q = useQuery({
    queryKey: ["community", "announcements", scope],
    queryFn: () => socialApi.announcements(),
  });
  const rows = q.data ?? [];

  if (q.isLoading) return <SkeletonList rows={5} />;
  if (q.isError) {
    if (isUnauthError(q.error)) return <SignInPrompt />;
    return <ErrorState message={apiMessage(q.error)} onRetry={() => q.refetch()} />;
  }

  return (
    <View style={{ gap: sp[8] }}>
      {rows.length === 0 ? (
        <EmptyState
          title="لا توجد إعلانات بعد"
          message="ستظهر هنا إعلانات الجامعة والكليات والأقسام."
        />
      ) : (
        <RowList>
          {rows.map((a: Announcement, i) => (
            <LedgerRow key={a.id} last={i === rows.length - 1} accessibilityLabel={a.title}>
              <View style={{ gap: sp[6] }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
                  <T variant="bodyLg">{a.iconEmoji ?? "📢"}</T>
                  <T variant="body" weight="bold" style={{ flex: 1 }}>
                    {a.title}
                  </T>
                  {a.pinned ? (
                    <Badge label="مثبَّت" tone="copper" mono={false} />
                  ) : null}
                  <Badge label={SCOPE_LABEL[a.scope] ?? a.scope} tone={SCOPE_TONE[a.scope] ?? "grey"} />
                </View>
                {a.body ? (
                  <T variant="sm" color="secondary">
                    {a.body}
                  </T>
                ) : null}
                {a.author ? (
                  <T variant="xs" color="faint">
                    {`${a.author.firstName} ${a.author.lastName} · ${fromNow(a.publishedAt)}`}
                  </T>
                ) : null}
              </View>
            </LedgerRow>
          ))}
        </RowList>
      )}
      <T variant="xs" color="faint" style={{ textAlign: "center" }}>
        إنشاء الإعلانات متاح للإدارة وهيئة التدريس من لوحاتها — يظهر هنا آخر تحديثات الجامعة.
      </T>
    </View>
  );
}

/* ═══════════ Tab: events ═══════════ */

function EventsPanel() {
  const scope = useInstitutionScope();
  const qc = useQueryClient();
  const user = useSession((s) => s.user);

  const q = useQuery({
    queryKey: ["community", "events", scope],
    queryFn: () => socialApi.events(),
  });
  const rows = q.data ?? [];

  const rsvp = useMutation({
    mutationFn: ({ eventId, status }: { eventId: string; status: "GOING" | "MAYBE" | "NO" }) =>
      socialApi.rsvp(eventId, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["community", "events", scope] }),
    onError: (e) => toast.error(apiMessage(e, "تعذّر تسجيل ردّك.")),
  });

  if (q.isLoading) return <SkeletonList rows={4} rowHeight={84} />;
  if (q.isError) {
    if (isUnauthError(q.error)) return <SignInPrompt />;
    return <ErrorState message={apiMessage(q.error)} onRetry={() => q.refetch()} />;
  }

  return (
    <View style={{ gap: sp[8] }}>
      {rows.length === 0 ? (
        <EmptyState
          title="لا توجد فعاليات قادمة بعد"
          message="ستظهر هنا الفعاليات الطلابية والجامعية عند جدولتها."
        />
      ) : (
        rows.map((e: CampusEvent) => (
          <EventCard
            key={e.id}
            event={e}
            canRsvp={!!user}
            pending={rsvp.isPending && rsvp.variables?.eventId === e.id}
            onRsvp={(status) => rsvp.mutate({ eventId: e.id, status })}
          />
        ))
      )}
    </View>
  );
}

function EventCard({
  event,
  canRsvp,
  pending,
  onRsvp,
}: {
  event: CampusEvent;
  canRsvp: boolean;
  pending: boolean;
  onRsvp: (status: "GOING" | "MAYBE" | "NO") => void;
}) {
  const p = usePalette();
  const mine = event.myRsvp?.status ?? null;
  const rsvps = (event as unknown as { _count?: { rsvps?: number } })._count?.rsvps;

  return (
    <Card style={{ gap: sp[8] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
        <T variant="bodyLg">📅</T>
        <T variant="body" weight="bold" style={{ flex: 1 }} numberOfLines={2}>
          {event.title}
        </T>
      </View>
      {event.description ? (
        <T variant="sm" color="secondary">
          {event.description}
        </T>
      ) : null}
      <View style={{ flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: sp[8] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <CalendarDays size={12} color={p.textMuted} />
          <T variant="sm" color="muted">
            {dateTime(event.startsAt)}
          </T>
        </View>
        {event.location ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <MapPin size={12} color={p.textMuted} />
            <T variant="sm" color="muted">
              {event.location}
            </T>
          </View>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
          <Users size={12} color={p.textMuted} />
          <T variant="sm" color="muted">
            {rsvps !== undefined && event.capacity != null
              ? `${latn(rsvps)} / ${latn(event.capacity)} حضور مؤكّد`
              : rsvps !== undefined
                ? membersAr(rsvps)
                : event.capacity != null
                  ? `سعة ${latn(event.capacity)}`
                  : "—"}
          </T>
        </View>
      </View>
      {canRsvp ? (
        <View style={{ flexDirection: "row", gap: sp[8] }}>
          <RsvpButton label="سأحضر" icon={<CheckCircle2 size={14} color={mine === "GOING" ? p.primaryFg : p.text} />} active={mine === "GOING"} pending={pending} onPress={() => onRsvp("GOING")} />
          <RsvpButton label="ربما" icon={null} active={mine === "MAYBE"} pending={pending} onPress={() => onRsvp("MAYBE")} />
          <RsvpButton label="لن أحضر" icon={null} active={mine === "NO"} pending={pending} onPress={() => onRsvp("NO")} />
        </View>
      ) : null}
    </Card>
  );
}

function RsvpButton({
  label,
  icon,
  active,
  pending,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  active: boolean;
  pending: boolean;
  onPress: () => void;
}) {
  return (
    <View style={{ flex: 1 }}>
      <Button
        label={label}
        kind={active ? "primary" : "ghost"}
        small
        icon={icon}
        disabled={pending}
        onPress={onPress}
        accessibilityLabel={`${label}${active ? " — اختيارك الحالي" : ""}`}
      />
    </View>
  );
}

/* ═══════════ Tab: study rooms ═══════════ */

function RoomsPanel() {
  const p = usePalette();
  const qc = useQueryClient();
  const scope = useInstitutionScope();
  const user = useSession((s) => s.user);
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");

  const q = useQuery({
    queryKey: ["community", "rooms", scope],
    queryFn: () => socialApi.studyRooms(),
  });
  const rows = q.data ?? [];

  const join = useMutation({
    mutationFn: (id: string) => socialApi.joinRoom(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community", "rooms", scope] });
      toast.success("انضممت إلى الغرفة.");
    },
    onError: (e) => toast.error(apiMessage(e, "تعذّر الانضمام إلى الغرفة.")),
  });
  const leave = useMutation({
    mutationFn: (id: string) => socialApi.leaveRoom(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community", "rooms", scope] });
      toast.info("غادرت الغرفة.");
    },
    onError: (e) => toast.error(apiMessage(e, "تعذّرت مغادرة الغرفة.")),
  });
  const create = useMutation({
    mutationFn: () => socialApi.createStudyRoom({ name: name.trim(), topic: topic.trim() || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["community", "rooms", scope] });
      setCreating(false);
      setName("");
      setTopic("");
      toast.success("أُنشئت غرفتك الدراسية.");
    },
    onError: (e) => toast.error(apiMessage(e, "تعذّر إنشاء الغرفة.")),
  });

  if (q.isLoading) return <SkeletonList rows={4} rowHeight={72} />;
  if (q.isError) {
    if (isUnauthError(q.error)) return <SignInPrompt />;
    return <ErrorState message={apiMessage(q.error)} onRetry={() => q.refetch()} />;
  }

  return (
    <View style={{ gap: sp[8] }}>
      {user ? (
        <Button
          label="إنشاء غرفة"
          kind="ghost"
          icon={<Plus size={16} color={p.text} />}
          onPress={() => setCreating(true)}
        />
      ) : null}

      {rows.length === 0 ? (
        <EmptyState
          title="لا توجد غرف دراسة بعد"
          message="أنشئ أول غرفة دراسية وادعُ زملاءك للانضمام إليها."
        />
      ) : (
        <RowList>
          {rows.map((r: StudyRoom, i) => (
            <RoomRow
              key={r.id}
              room={r}
              last={i === rows.length - 1}
              isOwner={!!user && r.owner?.id === user.id}
              isMember={(r as unknown as { isMember?: boolean }).isMember === true}
              joinPending={join.isPending && join.variables === r.id}
              leavePending={leave.isPending && leave.variables === r.id}
              onJoin={() => join.mutate(r.id)}
              onLeave={() => leave.mutate(r.id)}
            />
          ))}
        </RowList>
      )}

      <Sheet
        open={creating}
        onClose={() => setCreating(false)}
        title="غرفة دراسة جديدة"
        footer={
          <View style={{ flexDirection: "row", gap: sp[8] }}>
            <View style={{ flex: 1 }}>
              <Button label="إلغاء" kind="ghost" small onPress={() => setCreating(false)} />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                label={create.isPending ? "جارٍ الإنشاء…" : "إنشاء الغرفة"}
                loading={create.isPending}
                disabled={!name.trim()}
                onPress={() => create.mutate()}
                small
              />
            </View>
          </View>
        }
      >
        <View style={{ gap: sp[12] }}>
          <Field
            label="اسم الغرفة"
            value={name}
            onChangeText={setName}
            placeholder="مجموعة مراجعة الشبكات…"
            maxLength={120}
          />
          <Field
            label="الموضوع (اختياري)"
            value={topic}
            onChangeText={setTopic}
            placeholder="ما الذي ستدرسونه معًا؟"
            maxLength={300}
          />
          {create.isError ? (
            <T variant="sm" color="danger">
              {(create.error as ApiError)?.message ?? "تعذّر إنشاء الغرفة."}
            </T>
          ) : null}
        </View>
      </Sheet>
    </View>
  );
}

function RoomRow({
  room,
  last,
  isOwner,
  isMember,
  joinPending,
  leavePending,
  onJoin,
  onLeave,
}: {
  room: StudyRoom;
  last: boolean;
  isOwner: boolean;
  isMember: boolean;
  joinPending: boolean;
  leavePending: boolean;
  onJoin: () => void;
  onLeave: () => void;
}) {
  const p = usePalette();
  return (
    <LedgerRow last={last} accessibilityLabel={room.name}>
      <View style={{ gap: sp[6] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8] }}>
          <Avatar
            initials={
              room.owner ? initials(room.owner.firstName, room.owner.lastName) : "؟"
            }
            size={36}
          />
          <View style={{ flex: 1, gap: 2 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp[6] }}>
              <T variant="body" weight="bold" numberOfLines={1} style={{ flexShrink: 1 }}>
                {room.name}
              </T>
              {isOwner ? (
                <T variant="xs" weight="bold" color="gold">
                  غرفتك
                </T>
              ) : null}
            </View>
            {room.topic ? (
              <T variant="sm" color="muted" numberOfLines={1}>
                {room.topic}
              </T>
            ) : null}
          </View>
          {isOwner ? null : isMember ? (
            <Button
              label={leavePending ? "جارٍ المغادرة…" : "مغادرة"}
              kind="ghost"
              small
              icon={<UserMinus size={14} color={p.text} />}
              onPress={onLeave}
              loading={leavePending}
              accessibilityLabel={`مغادرة ${room.name}`}
            />
          ) : (
            <Button
              label={joinPending ? "جارٍ الانضمام…" : "انضمام"}
              kind="accent"
              small
              icon={<UserPlus size={14} color={p.accentFg} />}
              onPress={onJoin}
              loading={joinPending}
              accessibilityLabel={`انضمام إلى ${room.name}`}
            />
          )}
        </View>
        <View style={{ flexDirection: "row", alignItems: "center", gap: sp[8], flexWrap: "wrap" }}>
          {room.owner ? (
            <T variant="xs" color="faint">
              {`أنشأها ${room.owner.firstName} ${room.owner.lastName}`}
            </T>
          ) : null}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
            <Users size={12} color={p.textMuted} />
            <T variant="xs" color="faint">
              {membersAr(room.membersCount ?? 0)}
            </T>
          </View>
        </View>
      </View>
    </LedgerRow>
  );
}
