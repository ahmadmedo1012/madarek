// MessagesInbox — r171a extraction of the r170a teacher inbox into the
// shared components layer. The backend messaging API (GET/POST
// /me/messages, PATCH /messages/:id/read, POST /messages/read-all) is
// role-agnostic, and the student side had NO inbox at all: students
// received DMs with notification link:null ("until an inbox exists for
// them" — me.routes.ts r155a note). The whole read/compose/reply
// lifecycle moves here once; the role pages (teacher: TeacherPages,
// student: pages/student/MessagesPage) thin down to a title, a subtitle
// and a renderCompose callback that mounts their role-specific
// MessageComposeModal wrapper.
//
// The DOM markup is byte-identical to the r170a teacher page (same
// classNames, same ARIA) — its unit suites pin it; the only swap is the
// page-header: the primitives PageHeader renders the exact same
// page-header/page-title-block/page-title/page-subtitle markup the
// teacher page's local copy rendered for a string subtitle.
import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Send, X, MailOpen, Reply, ChevronRight, ChevronLeft, ArrowRight } from 'lucide-react';
import { UserAvatar, PageHeader } from '../primitives';
import { ErrorState, ListSkeleton } from '../primitives/States';
/* R319 (c3-S2) — the §B2 kit rides the SHARED inbox (role-neutral, the
 * AlertsPage de-boxing precedent): the log's heading joins the
 * mono-indexed title-bar register and the row read-state rides the
 * mono chip register. Both inboxes (teacher + student) get the same
 * grammar — the sheet system is cross-role. */
import { SectionBar, BarCount, StatusChip, EmptyCell } from '../student';
import { Icon } from '../Icon';
import { useMyMessages, useMarkAllMessagesRead, useSendMessage, apiErrorMessage, type MessageRow } from '../../hooks/useResources';
import { useAuthStore } from '../../stores/auth.store';
import { countAr, formatRelativeArShort, formatDateTimeAr } from '../../lib/format';
import { toast } from '../../lib/toast';
import { formatDate } from '../../utils/numbers';
/* The §B2 component anatomy (the .r319s-bar / .r319s-chip / .r319s-empty
 * registers) — owned HERE so both role inboxes draw the same sheet
 * grammar regardless of which page shell mounts them. */
import '../../styles/student/pages.css';

/* One server page of the messages list (15-d P2-7). The old call
 * fetched 50 rows and rendered a client-side `.slice(0, 30)` — rows
 * 31–50 never showed and message #51+ was unreachable. */
const MESSAGES_PAGE_SIZE = 30;

/* r164-h: read-state visibility — the /messages backend projects the
 * FULL Message row (include, not select), so readAt rides every row
 * already; the shared MessageRow interface just never declared it.
 * Widened HERE (the inbox's own view of the wire) instead of touching
 * the student-domain resource file: no wire change, no cross-agent
 * surface. */
type MessageRowWithRead = { readAt?: string | null };

/** The row-level unread marker: incoming AND not yet read. Sent rows
 * carry no read state of their own (readAt is the recipient's). Pure +
 * exported for the unit suite. */
export function isUnreadIncoming(
  m: { toUser?: { id?: string } | null } & MessageRowWithRead,
  meId: string | null,
): boolean {
  return Boolean(meId && m.toUser?.id === meId && !m.readAt);
}

/* ── r170a: compose + reply (closing the read-only gap) ─────────
 *
 * RECIPIENT SCOPE — deliberately bounded, no fabricated lists: the
 * platform has NO user directory any inbox can call. The only REAL
 * recipient pools are the role's own real relationships (the teacher:
 * their offerings' rosters via /teacher/me/offerings +
 * /teacher/offerings/:id/students; the student: their enrolled
 * offerings' teachers via /enrollments/me) and the other parties
 * already present in the loaded inbox rows (reply-to-sender rides this
 * pool). Anyone else becomes reachable only after they message first —
 * until a directory endpoint exists, this is the honest ceiling; the
 * role-specific picker says so. */

/** The backend contract's own cap (me.routes.ts sendMessageSchema:
 * z.string().trim().min(1).max(4000)). */
export const MESSAGE_MAX_CHARS = 4000;

/** Client-side gate mirroring the zod schema. Pure + exported for the
 * unit suite. Returns at most one error per field. */
export function validateMessageDraft(
  recipientId: string,
  body: string,
): { recipient?: string; body?: string } {
  const errors: { recipient?: string; body?: string } = {};
  if (!recipientId) errors.recipient = 'اختر مستلِماً أولاً.';
  const trimmed = body.trim();
  if (trimmed.length < 1) errors.body = 'نص الرسالة مطلوب.';
  else if (trimmed.length > MESSAGE_MAX_CHARS) {
    errors.body = `الرسالة طويلة — الحد الأقصى ${MESSAGE_MAX_CHARS} حرف.`;
  }
  return errors;
}

/** Server error mapping: the route's own Arabic 400/404 messages ride
 * apiErrorMessage verbatim; the one status whose body is Latin-only is
 * the per-user 30/min limiter (createRouteLimiter does not override
 * `message`, so express-rate-limit ships its English default) — 429
 * gets this dedicated Arabic line instead of leaking. Pure + exported
 * for the unit suite. */
export function sendErrorMessage(error: unknown): string {
  const status = (error as { response?: { status?: number } })?.response?.status;
  if (status === 429) return 'طلبات إرسال كثيرة — انتظر قليلاً ثم أعد المحاولة.';
  return apiErrorMessage(error, 'تعذَّر إرسال الرسالة — تحقّق من اتصالك ثم أعد المحاولة.');
}

/** The inbox-side recipient pool: every OTHER party on the loaded rows
 * (incoming → sender, sent → recipient), deduped, self excluded. No
 * session (meId null, a logout race with stale cache) → empty pool —
 * the picker's honest hint takes over instead of offering the user's
 * own name. Pure + exported for the unit suite. */
export function collectCorrespondents(
  rows: MessageRow[],
  meId: string | null,
): Array<{ id: string; name: string }> {
  if (!meId) return [];
  const map = new Map<string, { id: string; name: string }>();
  for (const m of rows) {
    /* Explicit annotation — tsc -b infers this ternary circularly
     * (TS7022) without it. The !other guard stays defensive: rows from
     * older payloads could miss a side. */
    const other: MessageRow['fromUser'] | undefined =
      m.toUser?.id === meId ? m.fromUser : m.toUser;
    if (!other || other.id === meId) continue;
    if (!map.has(other.id)) {
      map.set(other.id, { id: other.id, name: `${other.firstName} ${other.lastName}` });
    }
  }
  return [...map.values()];
}

/* ── r173a: temporal grouping (the r171 VLM deferred note) ──────
 *
 * The inbox rendered one flat 30-row run: a reader scanning "what
 * arrived TODAY vs what I already handled" had to parse per-row
 * stamps to find the seam. The rows now run under day-group
 * headers — اليوم / أمس / هذا الأسبوع (the current Sunday-start
 * week's remaining days, lumped: within-week days are close enough
 * that per-day labels would be noise) / one ar-LY short date per
 * older day (formatDateWithYearAr's exact option set — day + month
 * + year, the app's own date grammar).
 *
 * Boundaries are LOCAL calendar days (midnight cuts, not rolling
 * 24h windows — "أمس" stays the calendar yesterday across the
 * week's Sunday seam) and the week starts Sunday (Date#getDay 0 =
 * الأحد — the platform's own WEEKDAY_NAMES_AR contract). The group
 * function is pure and deterministic on its Arabic labels given
 * (rows, now); the unit suite pins the boundaries with the repo's
 * fixed-clock convention (vi.setSystemTime at noon UTC, TZ=UTC —
 * format.test.ts). */

/** One rendered day group: a stable machine key (group identity for
 * React reconciliation + the unit suite — never shown) + the
 * deterministic Arabic label + the group's rows in server order. */
export interface MessageDayGroup<T extends { createdAt: string }> {
  key: string;
  label: string;
  rows: T[];
}

const MS_PER_DAY = 86_400_000;

/** Midnight of the value's own local day. Pure — copies, never
 * mutates the argument. */
function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

/** Local calendar-day key (YYYY-MM-DD) — machine identity for older
 * groups so two rows from the same day share one header regardless
 * of their times. Never rendered. */
function localDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Group inbox rows under day headers. Rows keep server order within
 * (and between) groups — the function never re-sorts; a server page
 * arriving newest-first renders اليوم → أمس → هذا الأسبوع → dated
 * groups descending. Future timestamps (clock skew between client
 * and server) land honestly in اليوم. Pure + exported for the unit
 * suite. */
export function groupMessagesByDay<T extends { createdAt: string }>(
  rows: readonly T[],
  now: Date = new Date(),
): MessageDayGroup<T>[] {
  const today = startOfDay(now);
  const yesterday = new Date(today.getTime() - MS_PER_DAY);
  /* Sunday-start week (getDay 0 = الأحد): this-week = the Sunday at
   * or before today. On a Sunday "this week" holds only today —
   * yesterday (Saturday) already took أمس, so older rows fall to
   * dated labels: honest, the week genuinely began today. */
  const weekStart = new Date(today.getTime() - today.getDay() * MS_PER_DAY);
  const byKey = new Map<string, MessageDayGroup<T>>();
  for (const row of rows) {
    const d = new Date(row.createdAt);
    let key: string;
    let label: string;
    if (d >= today) {
      key = 'today';
      label = 'اليوم';
    } else if (d >= yesterday) {
      key = 'yesterday';
      label = 'أمس';
    } else if (d >= weekStart) {
      key = 'this-week';
      label = 'هذا الأسبوع';
    } else {
      key = `date:${localDayKey(d)}`;
      label = formatDate(d, { day: 'numeric', month: 'short', year: 'numeric' });
    }
    let group = byKey.get(key);
    if (!group) {
      group = { key, label, rows: [] };
      byKey.set(key, group);
    }
    group.rows.push(row);
  }
  return [...byKey.values()];
}

/** What renderCompose receives: the reply preset (null = a fresh
 * compose), the inbox-derived correspondents pool, and the close
 * callback that owns the inbox's compose state (null = closed). */
export interface ComposeRenderArgs {
  preset: { id: string; name: string } | null;
  correspondents: Array<{ id: string; name: string }>;
  onClose: () => void;
}

/* ── r366 (2-d): the THREAD ROOM ──────────────────────────────────
 *
 * The inbox's flat log answered "what arrived"; answering rode the
 * compose modal with no conversation context. The row itself now
 * opens the conversation as a ROOM: on the phone band (<768) it
 * replaces the list (a fixed full-viewport surface — the list stays
 * mounted in flow behind it, so the back trip restores the exact
 * scroll position); on desktop it renders as a centered column over
 * a dimmed page. The room owns: the only vertical scroller (the
 * bubble list), a pinned composer, and instant bottom-pinning — the
 * AI-surface lesson applied verbatim (no smooth flights under
 * content-visibility; overflow-anchor off in CSS; a settle window
 * after each arrival). */
interface ThreadParty {
  id: string;
  name: string;
}

function ThreadRoom({
  party,
  rows,
  meId,
  onClose,
}: {
  party: ThreadParty;
  rows: MessageRow[];
  meId: string | null;
  onClose: () => void;
}) {
  const listRef = useRef<HTMLDivElement | null>(null);
  const [draft, setDraft] = useState('');
  const send = useSendMessage();

  /* Oldest → newest (the server page is newest-first). */
  const ordered = useMemo(() => [...rows].reverse(), [rows]);

  const autoScroll = useRef(true);
  const settleRef = useRef(0);
  const pinToBottom = () => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };
  const settlePin = () => {
    cancelAnimationFrame(settleRef.current);
    const deadline = performance.now() + 1200;
    const step = () => {
      const el = listRef.current;
      if (!el || !autoScroll.current || performance.now() > deadline) return;
      if (el.scrollHeight - el.scrollTop - el.clientHeight > 1) el.scrollTop = el.scrollHeight;
      settleRef.current = requestAnimationFrame(step);
    };
    settleRef.current = requestAnimationFrame(step);
  };
  useEffect(() => {
    pinToBottom();
    settlePin();
    return () => cancelAnimationFrame(settleRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [party.id]);
  useEffect(() => {
    if (autoScroll.current) { pinToBottom(); settlePin(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ordered.length]);
  useEffect(() => {
    const el = listRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => { if (autoScroll.current) pinToBottom(); });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onListScroll = () => {
    const el = listRef.current;
    if (!el) return;
    autoScroll.current = el.scrollHeight - el.scrollTop - el.clientHeight <= 80;
  };

  /* Esc closes ONLY an empty draft (a half-written reply is never
   * eaten by an escape reflex). */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !e.defaultPrevented && draft.trim() === '') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [draft, onClose]);

  const submit = async () => {
    const body = draft.trim();
    if (!body || send.isPending) return;
    setDraft('');
    autoScroll.current = true;
    try {
      await send.mutateAsync({ toUserId: party.id, body });
      pinToBottom();
      settlePin();
    } catch {
      setDraft(body); /* the draft comes back — nothing is lost */
      toast.error('تعذّر إرسال الردّ.');
    }
  };

  /* r366 (2-d): PORTAL to <body> — the page's entrance layers (Reveal)
   * carry transforms, and a transformed ancestor becomes the containing
   * block of a fixed child: the room would then span the PAGE height
   * (measured 6154px behind a 60-row list) instead of the viewport.
   * The portal escapes every ancestor, exactly like the notification
   * panel's own portal. */
  if (typeof document === 'undefined') return null;
  return createPortal(
    <div className="msg-thread" role="dialog" aria-modal="true" aria-label={'محادثة ' + party.name}>
      <header className="msg-thread-head">
        <button type="button" className="btn ghost sm" onClick={onClose}>
          <Icon icon={ArrowRight} size={14} />
          العودة إلى الرسائل
        </button>
        <span className="msg-thread-name">{party.name}</span>
        <button type="button" className="icon-btn" onClick={onClose} aria-label="إغلاق المحادثة" disabled={send.isPending}>
          <Icon icon={X} size={16} />
        </button>
      </header>
      <div
        className="msg-thread-list"
        ref={listRef}
        onScroll={onListScroll}
        aria-label={`رسائل ${party.name}`}
      >
        {ordered.map((m) => {
          const out = m.fromUser?.id === meId;
          return (
            <div key={m.id} className={`msg-bubble-row${out ? ' msg-out' : ''}`}>
              <div className="msg-bubble">{m.body}</div>
              <time className="msg-bubble-time" title={formatDateTimeAr(m.createdAt)}>{formatRelativeArShort(m.createdAt)}</time>
            </div>
          );
        })}
      </div>
      <div className="msg-thread-composer">
        <textarea
          className="input msg-thread-input"
          rows={1}
          placeholder="اكتب ردّك…"
          value={draft}
          maxLength={MESSAGE_MAX_CHARS}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            /* Enter sends (Shift+Enter keeps the newline) — the send
             * button stays the phone path. */
            if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              void submit();
            }
          }}
          disabled={send.isPending}
          aria-label="نص الردّ"
        />
        <button
          type="button"
          className="btn primary"
          onClick={() => void submit()}
          disabled={send.isPending || draft.trim().length === 0}
        >
          {send.isPending ? 'جارٍ الإرسال…' : <><Icon icon={Send} size={13} /> إرسال الردّ</>}
        </button>
      </div>
      {send.isError && (
        <div className="msg-thread-error" role="alert">
          <Icon icon={X} size={14} /> {sendErrorMessage(send.error)}
        </div>
      )
      }
    </div>,
    document.body,
  );
}

/** The role-agnostic DM inbox — pagination, unread badge + mark-all
 * sweep, rows, reply doors and the compose mount. The role page owns
 * ONLY the copy (title/subtitle) and the compose modal's recipient
 * discovery (renderCompose). */
export function MessagesInbox({
  title,
  subtitle,
  renderCompose,
}: {
  title: string;
  subtitle: string;
  renderCompose: (args: ComposeRenderArgs) => ReactNode;
}) {
  const [page, setPage] = useState(1);
  const q = useMyMessages(page, MESSAGES_PAGE_SIZE);
  /* r157 (6A9 messages): the unread sweep — POST /messages/read-all,
  * invalidating every ['me','messages',…] page key so the subtitle
  * count + rows refetch together. Hidden while unread = 0 (a
  * mark-all button with nothing to mark is noise). */
  const markAll = useMarkAllMessagesRead();
  // Read the current user's ID directly from the auth store. Inferring
  // `meId` from the rows breaks for sent messages (where the current
  // user is the *sender*, not the recipient) — incoming/outgoing
  // bubbles would swap, and the avatar shown would be wrong.
  const meId = useAuthStore((s) => s.user?.id) ?? null;

  /* r170a: the compose/reply state — null = closed; a truthy value
   * carries the reply preset (the clicked row's sender). Mounting (not
   * open-proping) the modal resets the draft between opens. */
  const [compose, setCompose] = useState<{ preset: { id: string; name: string } | null } | null>(null);
  /* r366 (2-d): the open thread (null = closed). The room renders over
   * the list — the list stays mounted, so its scroll position survives
   * the round trip untouched. */
  const [thread, setThread] = useState<ThreadParty | null>(null);
  const messages = q.data?.data ?? [];
  /* Cheap map over ≤30 loaded rows — no memo (an unmemoized dep would
   * add a 19th exhaustive-deps warning over the documented baseline). */
  const correspondents = collectCorrespondents(messages, meId);

  const meta = q.data?.meta;
  const unread = meta?.unread ?? 0;
  const totalPages = Math.max(1, meta?.totalPages ?? 1);

  return (
    <div className="page">
      {/* A6 P2 (22-a) retitle lineage: the read-only era's subtitle
          promised nothing and the page delivered exactly that. r170a
          closes the gap — compose + reply now ship, so the subtitle
          says what the page does, including the picker's honest
          recipient ceiling (see the scope note above the modal). */}
      <PageHeader
        title={title}
        subtitle={subtitle}
        actions={(
          /* R341 (D7c): the compose action is the surface's ONE primary
             CTA — the accent slab register (same fill family as
             .btn.primary; the accent seat is the one the sheet's
             measured-hover contract reads). Behaviour + label + icon
             unchanged; byte-shared by the teacher inbox. */
          <button type="button" className="btn accent" onClick={() => setCompose({ preset: null })}>
            <Icon icon={Send} size={14} /> رسالة جديدة
          </button>
        )}
      />
      {/* R319 (c3-S2): the log's heading joins the §B2 title-bar register
          (role-neutral — the shared inbox serves both roles the same
          sheet): [01] سجلّ الرسائل, the honest total as the bar's mono
          meta (countAr for AT), the unread share as the [UNREAD n] mono
          chip, and the mark-all sweep rides the bar's action slot. The
          rows de-box onto the page surface (the AlertsPage precedent). */}
      <section className="r319s-page" aria-label="سجل الرسائل">
        <SectionBar
          index="01"
          title="سجلّ الرسائل"
          meta={meta && meta.total > 0 ? (
            <span className="r319s-bar-meta">
              <BarCount
                n={meta.total}
                srLabel={countAr(meta.total, ['رسالة واحدة', 'رسالتان', 'رسائل', 'رسالة'])}
              />
              {unread > 0 && (
                <StatusChip label={`UNREAD ${unread}`} tone="new" />
              )}
            </span>
          ) : undefined}
          action={unread > 0 ? (
            <button
              type="button"
              className="btn outline sm"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
            >
              <Icon icon={MailOpen} size={13} /> {markAll.isPending ? 'جارٍ التعليم…' : 'تعليم الكل كمقروء'}
            </button>
          ) : undefined}
        />
        {markAll.isError && (
          <div className="form-feedback fail" role="alert" style={{ marginBlockEnd: 'var(--sp-3)' }}>
            <Icon icon={X} size={14} />
            <span className="flex-1">تعذَّر تعليم الرسائل كمقروءة — تحقّق من اتصالك ثم أعد المحاولة.</span>
            <button type="button" className="btn ghost sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
              <Icon icon={MailOpen} size={12} /> إعادة المحاولة
            </button>
          </div>
        )}
        {q.isPending ? (
          <ListSkeleton rows={6} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : !q.data || messages.length === 0 ? (
          /* R319 (c3-S2): the empty inbox is the sheet's reserved-but-empty
             region — the hatched EmptyCell (the old EmptyState's copy,
             kept honest and verbatim). */
          <EmptyCell
            label="لا توجد رسائل بعد"
            note="ستظهر هنا الرسائل المُرسَلة إليك أو منك عبر المنصّة."
          />
        ) : (
          <>
            <div className="flex-col gap-2 msg-list">
              {/* r173a: the rows run under day-group headers. The header
                  is aria-hidden — presentational organization only: the
                  day IS already readable per row (the relative stamp +
                  its full-datetime title), and a hidden header can never
                  join the rows' text/role semantics or the count pins
                  (getAllByText row queries see rows only by their own
                  text). Rows themselves are untouched — same keys, same
                  markup, same order. */}
              {groupMessagesByDay(messages).map((g) => (
                <Fragment key={g.key}>
                  <div className="msg-day-group" aria-hidden="true">{g.label}</div>
                  {g.rows.map((m) => {
                    const incoming = m.toUser?.id === meId;
                    const other = incoming ? m.fromUser : m.toUser;
                    /* r164-h: the row's own read state — the same brand Badge
                     * grammar the alerts log uses for its unread rows (no
                     * new CSS; a bold title alone is invisible in dark mode). */
                    const unreadRow = isUnreadIncoming(m, meId);
                    /* r170a: the row's reply door — incoming rows only (a
                     * sent row's "other" is the recipient, and the backend
                     * 400s self-DMs). The preset travels with the name so
                     * the modal needs no row lookup. */
                    const replyPreset = incoming
                      ? { id: m.fromUser.id, name: `${m.fromUser.firstName} ${m.fromUser.lastName}` }
                      : null;
                    return (
                      <div key={m.id} className="list-row">
                        {/* r366 (2-d): the row's main area opens the THREAD ROOM - a real
                            button (keyboard + AT), with the reply door and stamp as
                            siblings (never nested interactives). */}
                        <button
                          type="button"
                          className="msg-row-open"
                          onClick={() => setThread({ id: other.id, name: other.firstName + ' ' + other.lastName })}
                          aria-label={'فتح محادثة ' + other.firstName + ' ' + other.lastName}
                        >
                          <UserAvatar
                            initials={(other.firstName[0] ?? '') + (other.lastName[0] ?? '')}
                            color={other.avatarColor ?? undefined}
                            size={32}
                          />
                          <div className="list-row-body">
                            <div className="list-row-title" style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span style={{ fontWeight: unreadRow ? 600 : undefined }}>{other.firstName} {other.lastName}</span>
                              {unreadRow && <StatusChip label="UNREAD" tone="new" />}
                            </div>
                            <div className="list-row-sub msg-body" title={m.body}>
                              {incoming ? '' : 'أنت: '}{m.body}
                            </div>
                          </div>
                        </button>
                        {/* P3-2 parity: the relative stamp carries the full date on
                            hover like the exam-attempt rows. r170a: the trailing
                            cluster (stamp + reply) keeps the action inside the row's
                            end edge. */}
                        <div className="flex items-center gap-2">
                          <div className="text-xxs text-subtle" title={formatDateTimeAr(m.createdAt)}>{formatRelativeArShort(m.createdAt)}</div>
                          {incoming && (
                            <button
                              type="button"
                              className="btn ghost sm"
                              onClick={() => setCompose({ preset: replyPreset })}
                              aria-label={'ردّ على رسالة ' + (replyPreset?.name ?? '')}
                            >
                              <Icon icon={Reply} size={13} /> ردّ
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </Fragment>
              ))}
            </div>
            {meta && totalPages > 1 && (
              <div
                className="flex items-center justify-between flex-wrap gap-3"
                style={{ marginBlockStart: 'var(--sp-4)' }}
              >
                <span className="text-xs text-muted">
                  الصفحة <bdi>{page}</bdi> من <bdi>{totalPages}</bdi> ·{' '}
                  {countAr(meta.total, ['رسالة واحدة', 'رسالتان', 'رسائل', 'رسالة'])}
                </span>
                <div className="flex gap-2">
                  {/* RTL: "previous" points inline-start-ward = the right
                      chevron (wave 5-a convention, same as the owner
                      timeline pager). */}
                  <button
                    type="button"
                    className="btn ghost sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    aria-label="الصفحة السابقة"
                  >
                    <Icon icon={ChevronRight} size={14} /> السابق
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    aria-label="الصفحة التالية"
                  >
                    التالي <Icon icon={ChevronLeft} size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </section>
      {/* r170a: mounted only while composing — unmount resets the draft
       * between opens (the discard guard owns mid-session closes). The
       * role page renders its own modal through renderCompose. */}
      {compose && renderCompose({ preset: compose.preset, correspondents, onClose: () => setCompose(null) })}
      {/* r366 (2-d): the thread room — over the list, never unmounting
       * it (the scroll-position contract). */}
      {thread && (
        <ThreadRoom
          party={thread}
          rows={messages.filter((m) => {
            const other = m.toUser?.id === meId ? m.fromUser : m.toUser;
            return other?.id === thread.id;
          })}
          meId={meId}
          onClose={() => setThread(null)}
        />
      )}
    </div>
  );
}
