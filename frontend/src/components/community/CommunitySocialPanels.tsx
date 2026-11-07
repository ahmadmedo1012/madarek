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
  useStudyRooms, useCreateStudyRoom, useJoinStudyRoom, useLeaveStudyRoom,
  type StudyRoomRow,
} from '../../hooks/useResources';
import { useAuthStore } from '../../stores/auth.store';
import { useDiscardGuard } from '../curriculum/AuthoringModal';
import { formatDate, formatNum } from '../../utils/numbers';
import { arUnit, timeAgoAr } from '../../lib/format';
import { usePostsFeed } from './usePostsFeed';

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
/* The trending derivation + the whole feed state machine live in
   usePostsFeed (shared with SocialPage — see that module's header). */

/** The «المنشورات» tab body — the community posts feed (the SocialPage
 *  feed port: composer + post cards + trending rail). Role-agnostic:
 *  every role on /community surfaces gets the same feed the students'
 *  /student/social renders, from the same hooks. The feed's state
 *  machine itself is shared with SocialPage via usePostsFeed (see its
 *  header) — this sheet owns only the presentation. */
export function PostsFeedPanel() {
  const {
    user, posts, createPost, draft, setDraft, submit, publish,
    hasReacted, reactedIds, unreactedIds, reactionBase, burstId, failedLike,
    onLike, onUnlike, likeInFlight, trending,
  } = usePostsFeed();

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
                  {/* r313: the N / 2000 counter is a mono micro-label —
                      Latin digits, tabular instrument voice (the same
                      grammar as the trend counts and exam char counters). */}
                  <span className="font-mono"><bdi>{formatNum(draft.length)}</bdi> / <bdi>2000</bdi></span>
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
