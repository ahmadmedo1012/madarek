/**
 * Community social panels (r180-F3) — the two tab bodies
 * CommunityPages.tsx mounts for its «غرف الدراسة» and «المنشورات»
 * tabs.
 *
 *   StudyRoomsPanel     — institution study rooms (r180 backend routes)
 *                         + CreateStudyRoomModal (small name/topic form)
 *   PostsFeedPanel      — the community posts feed, a faithful port of
 *                         the student SocialPage feed (MorePages.tsx —
 *                         NOT modified this round: the file is outside
 *                         this wave's ownership, so the markup/logic
 *                         patterns are replicated here instead of
 *                         extracting a shared component).
 *
 * CSS contract: the room cards reuse the event-card anatomy
 * (.event-meta / .event-actions — colleges.css, imported by
 * CommunityPages.tsx which mounts these panels) and the feed reuses
 * the .post / .social / .trend families (student.css — eager via
 * main.tsx). No new stylesheet rules; tokens only.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  MessageCircle, Heart, TrendingUp, AlertTriangle, Users, CalendarDays,
  UserPlus, UserMinus, Send, X,
} from 'lucide-react';
import { Badge, Card, UserAvatar, FormField } from '../primitives';
import { RowList, RowItem } from '../patterns';
import { ErrorState, EmptyState, Skeleton } from '../primitives/States';
import { Modal } from '../overlays';
import { Icon } from '../Icon';
import {
  usePosts, useCreatePost, useReactToPost,
  useStudyRooms, useCreateStudyRoom, useJoinStudyRoom, useLeaveStudyRoom,
  type Post, type StudyRoomRow,
} from '../../hooks/useResources';
import { useAuthStore } from '../../stores/auth.store';
import { useDiscardGuard } from '../curriculum/AuthoringModal';
import { formatDate, formatNum } from '../../utils/numbers';
import { arUnit, timeAgoAr } from '../../lib/format';
import { api, unwrap } from '../../lib/api';

/* ─────────────────────────── Study rooms ────────────────────────── */

function StudyRoomCard({ room }: { room: StudyRoomRow }) {
  const join = useJoinStudyRoom();
  const leave = useLeaveStudyRoom();
  const user = useAuthStore((s) => s.user);
  /* per-row pending (the RSVP trio pattern): only the clicked row's
     button disables while ITS mutation flies — join/leave of one room
     never freezes the rest of the grid. */
  const joinPending = join.isPending && join.variables?.roomId === room.id;
  const leavePending = leave.isPending && leave.variables?.roomId === room.id;
  const mine = room.owner.id === user?.id;
  const initials = room.owner.avatarInitials
    ?? `${room.owner.firstName[0] ?? ''}${room.owner.lastName[0] ?? ''}`;

  /* r262 (اتجاه Superlist): صفّ غرفة هادئ في RowList الأب — الصورة
     الرمزية تقود، الموضوع والعدد سطر ثانوي، وانضمام/مغادرة في الطرف
     (نفس أسماء aria والنصوص — العقد الاختباري ثابت). */
  return (
    <RowItem
      leading={<UserAvatar initials={initials} size={36} />}
      title={
        <span title={room.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
          {room.name}
          {mine && <Badge color="gold">غرفتك</Badge>}
        </span>
      }
      meta={
        <span className="event-meta">
          {room.topic && <span className="cp-clamp1" title={room.topic}>{room.topic}</span>}
          <span>أنشأها {room.owner.firstName} {room.owner.lastName}</span>
          <span><Icon icon={Users} size={11} /> {arUnit(room._count.members, 'عضو', 'عضوان', 'أعضاء')}</span>
          <span>
            <Icon icon={CalendarDays} size={11} />{' '}
            <time dateTime={room.createdAt}>
              {formatDate(room.createdAt, { day: 'numeric', month: 'short', year: 'numeric' })}
            </time>
          </span>
        </span>
      }
      trailing={
        room.isMember ? (
          /* المالك يرى زر المغادرة مثل كل عضو — الخلفية ترفض بحراسة
             400 «مالك الغرفة لا يغادرها» (r180) ويصل الردّ عبر toast
             الخُطّاف؛ شارة «غرفتك» + التلميح يشرحان السبب سلفًا. */
          <span className="event-actions cp-rsvp">
            <button
              type="button"
              className="btn outline sm"
              onClick={() => leave.mutate({ roomId: room.id, name: room.name })}
              disabled={leavePending}
              title={mine ? 'أنت مالك هذه الغرفة — لا يمكن مغادرتها' : undefined}
              aria-label={mine ? `مغادرة ${room.name} — أنت مالكها` : `مغادرة ${room.name}`}
            >
              <Icon icon={UserMinus} size={12} />
              {leavePending ? 'جارٍ المغادرة…' : 'مغادرة'}
            </button>
          </span>
        ) : (
          <span className="event-actions cp-rsvp">
            <button
              type="button"
              className="btn primary sm"
              onClick={() => join.mutate({ roomId: room.id, name: room.name })}
              disabled={joinPending}
              aria-label={`انضمام إلى ${room.name}`}
            >
              <Icon icon={UserPlus} size={12} />
              {joinPending ? 'جارٍ الانضمام…' : 'انضمام'}
            </button>
          </span>
        )
      }
    />
  );
}

/** The «غرف الدراسة» tab body — r262: RowList واحد يملك حالاته
 *  (هيكل مطابق/خطأ/فراغ) وصفوف الغرف أبناؤه المباشرون. */
export function StudyRoomsPanel() {
  const rooms = useStudyRooms();
  return (
    rooms.isError ? (
      <ErrorState message="تعذَّر تحميل غرف الدراسة" error={rooms.error} onRetry={() => rooms.refetch()} />
    ) : (
      <RowList
        aria-label="قائمة غرف الدراسة"
        loading={rooms.isPending}
        empty={(
          <EmptyState
            illustration="empty-community"
            title="لا توجد غرف دراسة بعد"
            description="أنشئ أول غرفة دراسية وادعُ زملاءك للانضمام إليها."
          />
        )}
      >
        {rooms.data?.map((r) => <StudyRoomCard key={r.id} room={r} />)}
      </RowList>
    )
  );
}

/* ─────────────────── Create-study-room modal ────────────────────── */

const studyRoomSchema = z.object({
  name: z.string().trim().min(1, 'اسم الغرفة مطلوب').max(120, 'الاسم طويل — الحد 120 حرفاً'),
  topic: z.string().trim().max(300, 'الموضوع طويل — الحد 300 حرفاً').optional(),
});
type StudyRoomInputs = z.infer<typeof studyRoomSchema>;

export function CreateStudyRoomModal({ onClose }: { onClose: () => void }) {
  const create = useCreateStudyRoom();

  const form = useForm<StudyRoomInputs>({
    resolver: zodResolver(studyRoomSchema),
    defaultValues: { name: '', topic: '' },
  });

  /* Close-parity (the announcement/event modal contract): Esc / X /
     cancel / overlay-click confirm before dropping a dirty draft, and
     every close path stays inert while the create mutation flies. */
  const { requestClose, escapeLocked, guard } = useDiscardGuard({
    dirty: form.formState.isDirty,
    pending: create.isPending,
    onClose,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      // التغذية الراجعة (نجاح/تعذّر) يصل من الخُطّاف نفسه عبر toast —
      // لا صندوق خطأ داخلي هنا كي لا يتضاعف السطحان للرسالة نفسها.
      await create.mutateAsync({
        name: values.name,
        topic: values.topic || undefined,
      });
      onClose();
    } catch { /* surfaced by the hook's toast */ }
  });

  return (
    <Modal
      open
      onClose={requestClose}
      ariaLabel="غرفة دراسة جديدة"
      closeOnOverlayClick={!create.isPending}
      closeOnEscape={!escapeLocked}
    >
      <header className="comp-modal-head">
        <h2>غرفة دراسة جديدة</h2>
        <button type="button" className="comp-modal-close" onClick={requestClose} aria-label="إغلاق" disabled={create.isPending}>
          <Icon icon={X} size={16} />
        </button>
      </header>
      <form onSubmit={onSubmit} className="comp-modal-form" style={{ overflowY: 'auto' }}>
        <FormField label="اسم الغرفة" error={form.formState.errors.name?.message}>
          <input type="text" placeholder="مجموعة مراجعة الشبكات…" {...form.register('name')} className="auth-input" />
        </FormField>
        <FormField label="الموضوع (اختياري)" error={form.formState.errors.topic?.message}>
          <textarea
            rows={2}
            placeholder="ما الذي ستدرسونه معاً؟"
            {...form.register('topic')}
            className="auth-input"
            style={{ resize: 'vertical' }}
          />
        </FormField>
        <div className="comp-modal-actions">
          <button type="button" className="btn ghost" onClick={requestClose} disabled={create.isPending}>إلغاء</button>
          <button type="submit" className="btn primary" disabled={create.isPending}>
            <Icon icon={Send} size={14} />
            {create.isPending ? 'جارٍ الإنشاء…' : 'إنشاء الغرفة'}
          </button>
        </div>
      </form>
      {guard}
    </Modal>
  );
}

/* ─────────────────────── Posts feed (tab) ───────────────────────── */

/* "الأكثر تداولاً" — derived from the loaded feed, never hardcoded:
   the top hashtags by frequency across the fetched posts (usePosts
   loads the latest 20). The card hides entirely while loading, on
   error, or when no loaded post carries a hashtag (the SocialPage
   contract — honest absence over fabricated trends). */
function topHashtags(posts: Post[] | undefined, limit = 5): Array<{ tag: string; count: number }> {
  if (!posts?.length) return [];
  const counts = new Map<string, number>();
  for (const p of posts) {
    for (const t of p.hashtags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ar'))
    .slice(0, limit);
}

/** The «المنشورات» tab body — the community posts feed (the SocialPage
 *  feed port: composer + post cards + trending rail). Role-agnostic:
 *  every role on /community surfaces gets the same feed the students'
 *  /student/social renders, from the same hooks. */
export function PostsFeedPanel() {
  const posts = usePosts();
  const createPost = useCreatePost();
  const reactToPost = useReactToPost();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  /* Composer draft persistence (the SocialPage contract): sessionStorage
   * keyed by user — a draft is content, losing it on a stray refresh or
   * a tab switch would be the same "this platform cares" miss on this
   * surface. The KEY is identical to SocialPage's, so a user active on
   * both surfaces keeps ONE draft, never two diverging copies. */
  const draftKey = `mdrk:social-draft:${user?.id ?? 'me'}`;
  const [draft, setDraft] = useState<string>(() => {
    try {
      return sessionStorage.getItem(draftKey) ?? '';
    } catch {
      return ''; // private-mode browsers: the draft stays session-local
    }
  });
  useEffect(() => {
    try {
      if (draft) sessionStorage.setItem(draftKey, draft);
      else sessionStorage.removeItem(draftKey);
    } catch {
      /* best-effort persistence only */
    }
  }, [draft, draftKey]);

  const [reactedIds, setReactedIds] = useState<Set<string>>(new Set());
  /* The real un-like. DELETE /posts/:id/react is own-reaction-only by
   * construction, so the pressed heart is a working toggle (the
   * SocialPage logic). The set below carries THIS session's optimistic
   * un-presses on top of the server truth. */
  const [unreactedIds, setUnreactedIds] = useState<Set<string>>(new Set());
  /* viewerReacted seeds the hearts — the session-local sets only ride
   * this session's optimistic toggles ON TOP of it. */
  const serverReactedIds = useMemo(
    () => new Set((posts.data ?? []).filter((p) => p.viewerReacted).map((p) => p.id)),
    [posts.data],
  );
  const hasReacted = (id: string) =>
    (serverReactedIds.has(id) || reactedIds.has(id)) && !unreactedIds.has(id);
  /* Reaction-count snapshot at click time: max(server, snapshot ± 1)
   * keeps the optimistic delta during flight without double-counting
   * after the invalidation's refetch lands. */
  const [reactionBase, setReactionBase] = useState<Record<string, number>>({});
  const [burstId, setBurstId] = useState<string | null>(null);
  const [failedLike, setFailedLike] = useState<{ id: string; mode: 'like' | 'unlike' } | null>(null);
  const burstTimer = useRef<number | undefined>(undefined);
  const failTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => {
    window.clearTimeout(burstTimer.current);
    window.clearTimeout(failTimer.current);
  }, []);
  /* Server truth arrival clears the session-local toggles — pressed
   * states and counts then read straight from the payload. */
  useEffect(() => {
    setReactedIds(new Set());
    setUnreactedIds(new Set());
    setReactionBase({});
  }, [posts.data]);

  const publish = () => {
    if (!draft.trim() || createPost.isPending) return;
    // Extract simple #hashtags from the body for proper persistence.
    const tags = (draft.match(/#[\u0600-\u06FF\w_]+/g) ?? []).map((t) => t.slice(1));
    createPost.mutate(
      { body: draft.trim(), hashtags: tags },
      { onSuccess: () => setDraft('') },
    );
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    publish();
  };

  const onLike = (id: string, serverCount: number) => {
    if (hasReacted(id)) return;
    setReactionBase((prev) => ({ ...prev, [id]: serverCount }));
    setReactedIds((prev) => new Set([...prev, id]));
    setUnreactedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setBurstId(id);
    window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setBurstId(null), 700);
    reactToPost.mutate(
      { postId: id, kind: 'like' },
      {
        onError: () => {
          setReactedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          setFailedLike({ id, mode: 'like' });
          window.clearTimeout(failTimer.current);
          failTimer.current = window.setTimeout(() => setFailedLike(null), 5000);
        },
      },
    );
  };

  /* Un-like — the SocialPage inline DELETE mutation, verbatim. */
  const removeLike = useMutation({
    mutationFn: (postId: string) =>
      unwrap<{ ok: boolean }>(api.delete(`/posts/${postId}/react`, { data: { kind: 'like' } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
  const onUnlike = (id: string, serverCount: number) => {
    if (!hasReacted(id)) return;
    setReactionBase((prev) => ({ ...prev, [id]: serverCount }));
    setUnreactedIds((prev) => new Set([...prev, id]));
    removeLike.mutate(id, {
      onError: () => {
        setUnreactedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setFailedLike({ id, mode: 'unlike' });
        window.clearTimeout(failTimer.current);
        failTimer.current = window.setTimeout(() => setFailedLike(null), 5000);
      },
    });
  };

  const trending = topHashtags(posts.data);
  const likeInFlight = (id: string) =>
    (reactToPost.isPending && reactToPost.variables?.postId === id)
    || (removeLike.isPending && removeLike.variables === id);

  return (
    <div className="grid-2-1">
      <div className="flex-col gap-3">
        {/* Composer */}
        {user && (
          <Card compact>
            <form onSubmit={submit} className="flex-col gap-3">
              <div className="flex items-start gap-3">
                <UserAvatar
                  initials={user.avatarInitials ?? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`}
                  color={user.avatarColor ?? undefined}
                  size={36}
                />
                <textarea
                  className="social-composer"
                  aria-label="اكتب منشوراً جديداً"
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="ماذا يدور في ذهنك؟ (يمكنك استخدام #هاشتاج)"
                  rows={2}
                  maxLength={2000}
                />
              </div>
              {createPost.isError && (
                <div className="social-compose-error" role="alert">
                  <Icon icon={AlertTriangle} size={14} aria-hidden />
                  <span>تعذّر نشر المنشور — نصّك ما زال محفوظاً بالأعلى.</span>
                  <button type="button" className="btn ghost sm" onClick={publish}>
                    إعادة المحاولة
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-xxs text-subtle" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--sp-1-5)' }}>
                  {draft.trim() !== '' && <span>مسودة محفوظة تلقائيّاً</span>}
                  <span><bdi>{formatNum(draft.length)}</bdi> / <bdi>2000</bdi></span>
                </span>
                <button
                  type="submit"
                  className="btn primary sm"
                  disabled={!draft.trim() || createPost.isPending}
                >
                  {createPost.isPending ? 'جارٍ النشر…' : 'نشر'}
                </button>
              </div>
            </form>
          </Card>
        )}

        {posts.isPending ? (
          <Card>
            {/* shape-matched skeleton: two post cards */}
            <div className="flex-col gap-4" aria-busy="true">
              {[0, 1].map((i) => (
                <div key={i} aria-hidden>
                  <div className="flex items-center gap-3" style={{ marginBlockEnd: 'var(--sp-3)' }}>
                    <Skeleton width={36} height={36} rounded="50%" />
                    <div className="flex-col gap-2">
                      <Skeleton width={120} height={13} />
                      <Skeleton width={64} height={10} />
                    </div>
                  </div>
                  <div className="flex-col gap-2">
                    <Skeleton width="92%" height={12} />
                    <Skeleton width="70%" height={12} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        ) : posts.isError ? (
          <Card>
            <ErrorState
              message="تعذَّر تحميل المنشورات"
              error={posts.error}
              onRetry={() => posts.refetch()}
            />
          </Card>
        ) : !posts.data?.length ? (
          <Card>
            <EmptyState
              illustration="empty-community"
              icon={MessageCircle}
              title="لا منشورات بعد"
              description="كن أول من يشارك تجربته أو سؤاله."
            />
          </Card>
        ) : (
          posts.data.map((p) => {
            const initials = p.author.avatarInitials ?? `${p.author.firstName[0] ?? ''}${p.author.lastName[0] ?? ''}`;
            const reacted = hasReacted(p.id);
            /* The optimistic ±1 applies ONLY to this session's clicks —
               a server-truth reaction is already inside _count.reactions. */
            const optimisticAdd = reactedIds.has(p.id) && !unreactedIds.has(p.id);
            const optimisticRemove = !optimisticAdd && unreactedIds.has(p.id);
            const displayed = optimisticAdd
              ? Math.max(p._count.reactions, (reactionBase[p.id] ?? p._count.reactions) + 1)
              : optimisticRemove
                ? Math.max(0, (reactionBase[p.id] ?? p._count.reactions) - 1)
                : p._count.reactions;
            return (
              <article className="post" key={p.id}>
                <div className="post-header">
                  <UserAvatar initials={initials} color={p.author.avatarColor ?? undefined} size={36} />
                  <div className="flex-1">
                    <div className="post-author">{p.author.firstName} {p.author.lastName}</div>
                    <div className="post-time">{timeAgoAr(p.createdAt)}</div>
                  </div>
                </div>
                <div className="post-body">{p.body}</div>
                {p.hashtags && p.hashtags.length > 0 && (
                  /* G (عقد mono — r197): الوسم محتوى مستخدم لا معرّف
                     رقمي؛ sans هادئ بلون الحبر المكمّم. */
                  <div className="flex flex-wrap gap-1 post-tags">
                    {p.hashtags.map((t) => (
                      <span key={t} className="text-xxs post-tag">#{t}</span>
                    ))}
                  </div>
                )}
                <div className="post-actions">
                  <button
                    type="button"
                    className={`post-action${reacted ? ' on' : ''}`}
                    onClick={() =>
                      (reacted ? onUnlike(p.id, p._count.reactions) : onLike(p.id, p._count.reactions))}
                    aria-pressed={reacted}
                    aria-label={reacted ? 'إزالة الإعجاب' : 'أعجبني بهذا المنشور'}
                    disabled={likeInFlight(p.id)}
                  >
                    <Icon icon={Heart} size={13} aria-hidden />
                    <span className={`post-count${burstId === p.id ? ' pop' : ''}`}>
                      {formatNum(displayed)}
                    </span>
                  </button>
                  {/* No comment button: there is no post-comment API —
                      removed instead of faked (the SocialPage contract). */}
                </div>
                {failedLike?.id === p.id && (
                  <div className="post-like-fail" role="alert">
                    <Icon icon={AlertTriangle} size={12} aria-hidden />
                    <span>{failedLike.mode === 'unlike' ? 'تعذّر إلغاء الإعجاب.' : 'تعذّر تسجيل الإعجاب.'}</span>
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() =>
                        (failedLike.mode === 'unlike'
                          ? onUnlike(p.id, p._count.reactions)
                          : onLike(p.id, p._count.reactions))}
                    >
                      إعادة المحاولة
                    </button>
                  </div>
                )}
              </article>
            );
          })
        )}
      </div>

      {trending.length > 0 && (
        <Card
          title="الأكثر تداولاً"
          heading="h2"
          icon={TrendingUp}
          subtitle="الوسوم الأكثر تكراراً في آخر 20 منشوراً محمَّلاً."
          style={{ alignSelf: 'start' }}
        >
          <ol className="trend-list">
            {trending.map((t, i) => (
              <li className="trend-item" key={t.tag}>
                <span className="trend-rank" aria-hidden>{i + 1}</span>
                <span className="trend-tag" title={`#${t.tag}`}>
                  <bdi>#{t.tag}</bdi>
                </span>
                <span
                  className="trend-count"
                  title={arUnit(t.count, 'منشور', 'منشوران', 'منشورات')}
                >
                  {/* r305 (2-c): عقد الأرقام — formatNum حصرًا. */}
                  <bdi>{formatNum(t.count)}</bdi>
                </span>
              </li>
            ))}
          </ol>
        </Card>
      )}
    </div>
  );
}
