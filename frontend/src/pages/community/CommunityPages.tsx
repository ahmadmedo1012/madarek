/**
 * Real community / social layer.
 *
 *   /community            tabbed: Announcements · Competitions · Events
 *                          · Study rooms (r180) · Posts (the feed)
 *   The existing /student/social (posts) stays as it is.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import {
  Megaphone, Trophy, CalendarDays, Pin, MapPin, Clock,
  CheckCircle2, Users, MessageCircle, Sparkles, Plus, X, Send, AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { Badge, FormField } from '../../components/primitives';
/* r262 (4E — اتجاه Superlist): الصفحة تُركّب من عقد الأنماط المشترك:
   ترويسة patterns (بالألسنة داخلها)، شريط أرقام StatLine بدل جدار
   بطاقات KPI، وقوائم RowList/RowItem هادئة بتفصيل ملتصق بالصف.
   MetricCard يُتقاعد من هذه الصفحة (.kpis-compact يُذكر في ملف التسليم). */
import { PageHeader, RowList, RowItem, StatLine } from '../../components/patterns';
import { ErrorState, EmptyState } from '../../components/primitives/States';
import { Modal } from '../../components/overlays';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import {
  useAnnouncements, useCompetitions, useCampusEvents, useRsvpEvent,
  useCreateAnnouncement, useCreateCampusEvent, useFaculties, useCurrentInstitutionSlug, useMyPermissions,
  useTeacherOfferings,
  type AnnouncementRow, type CompetitionRow, type CampusEventRow,
} from '../../hooks/useResources';
import { useAuthStore } from '../../stores/auth.store';
import { useDiscardGuard } from '../../components/curriculum/AuthoringModal';
import { formatDate, formatTime } from '../../utils/numbers';
import { arUnit } from '../../lib/format';
// r180-F3: the two new tab bodies + the create-room modal live in their
// own file (components/community) — they mount ONLY when their tab is
// active, so their hooks (useStudyRooms/usePosts…) never fire for a
// visitor sitting on the announcements/competitions/events tabs.
import { StudyRoomsPanel, PostsFeedPanel, CreateStudyRoomModal } from '../../components/community/CommunitySocialPanels';
import '../../styles/training.css'; // shared .track-grid/.track-card family (D11 css split, 12-15)
import '../../styles/colleges.css'; // borrowed .comp-modal-*/.comp-form-*/.event-meta (D14 css split, 13-17)
import { formatNum } from '../../utils/numbers';

const SCOPE_LABEL: Record<string, string> = {
  PLATFORM: 'كل المنصة', FACULTY: 'كلّيّة', DEPARTMENT: 'قسم', OFFERING: 'مقرر',
};
const SCOPE_COLOR: Record<string, 'brand' | 'green' | 'gold' | 'purple'> = {
  PLATFORM: 'brand', FACULTY: 'green', DEPARTMENT: 'purple', OFFERING: 'gold',
};
const ROLE_LABEL: Record<string, string> = {
  STUDENT: 'طالب', TEACHER: 'أستاذ', ADMIN: 'الإدارة', QUALITY: 'مكتب الجودة',
};

/* arUnit (Arabic counted-noun helper) lives in lib/format.ts — the 13-15
   fold of the identical local copies this page shared with MorePages. */

type CommunityTab = 'announcements' | 'competitions' | 'events' | 'rooms' | 'posts';

const COMMUNITY_TABS: Array<{ key: CommunityTab; label: string; icon: LucideIcon }> = [
  { key: 'announcements', label: 'الإعلانات', icon: Megaphone },
  { key: 'competitions', label: 'المسابقات', icon: Trophy },
  { key: 'events', label: 'الفعاليات', icon: CalendarDays },
  /* r180-F3: غرف الدراسة + المنشورات — نفس شريط التبويبات ونمطه
     (أيقونة Lucide بحجم 13 + تسمية عربية)، ومسار لوحة المفاتيح
     أعلاه (roving tabindex + أسهم RTL) يعمل تلقائيًا مع الإضافات. */
  { key: 'rooms', label: 'غرف الدراسة', icon: Users },
  { key: 'posts', label: 'المنشورات', icon: MessageCircle },
];

export default function CommunityPage() {
  const [tab, setTab] = useState<CommunityTab>('announcements');
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const ann = useAnnouncements();
  const comps = useCompetitions();
  const events = useCampusEvents();
  const perms = useMyPermissions();
  const user = useAuthStore((s) => s.user);

  const canAnnounceFaculty = perms.data?.capabilities.includes('ANNOUNCE_FACULTY') ?? false;
  const canAnnouncePlatform = perms.data?.capabilities.includes('ANNOUNCE_PLATFORM') ?? false;
  const canAnnounce = canAnnounceFaculty || canAnnouncePlatform;
  const canRunEvents = perms.data?.capabilities.includes('EVENTS_RUN') ?? false;
  /* OFFERING scope is offered where an existing hook can enumerate the
     author's permitted targets: /teacher/me/offerings (TEACHER + OWNER —
     15-a P1-2). ADMIN/QUALITY may address any offering server-side but
     no all-offerings list endpoint exists yet (worklog hand-off). */
  const canAnnounceOffering = user?.role === 'TEACHER' || user?.role === 'OWNER';
  /* r180: إنشاء غرف الدراسة متاح لكل الأدوار المؤسسية — الخلفية تقبل
     STUDENT/TEACHER/ADMIN/QUALITY (سياق مؤسسة متحقّق منه) بلا قدرة
     خاصة، خلافًا لبقية أزرار هذه الصفحة المقيّدة بـ capabilities. */
  const canCreateRoom =
    user?.role === 'STUDENT' || user?.role === 'TEACHER' ||
    user?.role === 'ADMIN' || user?.role === 'QUALITY';

  const openComps = comps.data?.filter((c) => c.status === 'OPEN').length ?? 0;
  /* 22-c (A5 P3-7): the KPI reads «فعاليات قادمة» — count only
     sessions actually in the future instead of the whole feed. */
  const upcomingEvents =
    events.data?.filter((e) => new Date(e.startsAt).getTime() > Date.now()).length ?? 0;

  /* KPI values — honest query states (pending → ellipsis, error → dash,
     never a fabricated 0) + Arabic-Indic numerals like the rest of the
     KPI surfaces (audit 0-f P2-29). */
  const annCount = ann.isPending ? '…' : ann.isError ? '—' : formatNum(ann.data?.length ?? 0);
  const compsCount = comps.isPending ? '…' : comps.isError ? '—' : formatNum(openComps);
  const eventsCount = events.isPending ? '…' : events.isError ? '—' : formatNum(upcomingEvents);

  /* RTL tablist: ArrowLeft advances (toward inline-end), ArrowRight goes
     back — mirrors the shared Tabs primitive's keyboard contract. */
  const onTabsKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const idx = COMMUNITY_TABS.findIndex((t) => t.key === tab);
    let next: number | null = null;
    if (e.key === 'ArrowLeft') next = (idx + 1) % COMMUNITY_TABS.length;
    else if (e.key === 'ArrowRight') next = (idx - 1 + COMMUNITY_TABS.length) % COMMUNITY_TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = COMMUNITY_TABS.length - 1;
    if (next === null) return;
    const entry = COMMUNITY_TABS[next];
    if (!entry) return;
    e.preventDefault();
    setTab(entry.key);
    document.getElementById(`community-tab-${entry.key}`)?.focus();
  };

  return (
    <div className="page">
      {/* r262: ترويسة patterns — الألسنة تسكن الترويسة نفسها (نمط
          ورقة Superlist ذات السطر الكبير)، والإجراءات الشرطية باقية
          بلا تغيير في الأسماء/الأدوار. */}
      <PageHeader
        title="المجتمع الجامعي"
        description="إعلانات الجامعة · مسابقات وفعاليات · أنشطة طلابية. المساحة الرسمية للحياة الأكاديمية اليومية."
        actions={
          /* A fragment keeps the conditional actions as direct children
             of the header actions row — the conditional set per tab is
             unchanged from the r164-a fold. */
          <>
            {tab === 'announcements' && canAnnounce && (
              <button type="button" className="btn primary" onClick={() => setCreatingAnnouncement(true)}>
                <Icon icon={Plus} size={14} />
                إعلان جديد
              </button>
            )}
            {tab === 'competitions' && (
              <Link to="/competitions" className="btn ghost">
                <Icon icon={Trophy} size={14} />
                صفحة المسابقات الكاملة
              </Link>
            )}
            {tab === 'events' && canRunEvents && (
              <button type="button" className="btn primary" onClick={() => setCreatingEvent(true)}>
                <Icon icon={Plus} size={14} />
                فعاليّة جديدة
              </button>
            )}
            {tab === 'rooms' && canCreateRoom && (
              <button type="button" className="btn primary" onClick={() => setCreatingRoom(true)}>
                <Icon icon={Plus} size={14} />
                إنشاء غرفة
              </button>
            )}
          </>
        }
        tabs={
          /* Tabs — manual role/aria annotation (icons are content, so the raw
              markup is kept; the shared Tabs primitive only accepts text labels).
              Full ARIA tabs pattern: roving tabindex + RTL arrow keys +
              id/aria-controls ↔ tabpanel wiring (audit 0-f P2-18). */
          <div className="tabs" role="tablist" aria-label="أقسام المجتمع الجامعي" onKeyDown={onTabsKeyDown}>
            {COMMUNITY_TABS.map((t) => (
              <button
                key={t.key}
                id={`community-tab-${t.key}`}
                type="button"
                role="tab"
                aria-selected={tab === t.key}
                aria-controls={`community-panel-${t.key}`}
                tabIndex={tab === t.key ? 0 : -1}
                className={`tab${tab === t.key ? ' on' : ''}`}
                onClick={() => setTab(t.key)}
              >
                <Icon icon={t.icon} size={13} /> {t.label}
              </button>
            ))}
          </div>
        }
      />

      {/* r262: شريط أرقام هادئ بدل ثلاث بطاقات KPI (عقد StatLine):
          القيم الصادقة نفسها (…/—/formatNum) بلا آبار أيقونات. */}
      <StatLine
        items={[
          { label: 'إعلانات نشطة', value: annCount, tone: 'signal' },
          { label: 'مسابقات مفتوحة', value: compsCount },
          { label: 'فعاليات قادمة', value: eventsCount, tone: 'positive' },
        ]}
      />

      {/* Tab panels — shape-matched skeletons while pending (A9 P2-2,
          5-C3 hand-off): each panel's skeleton mirrors its loaded
          layout (announcement rows / track cards / event cards), never
          a bare spinner. */}
      {tab === 'announcements' && (
        <div role="tabpanel" id="community-panel-announcements" aria-labelledby="community-tab-announcements">
          {ann.isError ? (
            <ErrorState message="تعذَّر تحميل الإعلانات" error={ann.error} onRetry={() => ann.refetch()} />
          ) : (
            <RowList
              aria-label="قائمة الإعلانات"
              loading={ann.isPending}
              empty={<EmptyState title="لا توجد إعلانات بعد" description="ستظهر هنا إعلانات الجامعة والكليات والأقسام." illustration="empty-community" />}
            >
              {ann.data?.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
            </RowList>
          )}
        </div>
      )}
      {tab === 'competitions' && (
        <div role="tabpanel" id="community-panel-competitions" aria-labelledby="community-tab-competitions">
          {comps.isError ? (
            <ErrorState message="تعذَّر تحميل المسابقات" error={comps.error} onRetry={() => comps.refetch()} />
          ) : (
            <RowList
              aria-label="قائمة المسابقات"
              loading={comps.isPending}
              empty={<EmptyState illustration="empty-community" title="لا توجد مسابقات بعد" description="ستظهر هنا تحديات المعرفة والابتكار عند إعلانها." />}
            >
              {comps.data?.map((c) => <CompetitionCard key={c.id} competition={c} />)}
            </RowList>
          )}
        </div>
      )}
      {tab === 'events' && (
        <div role="tabpanel" id="community-panel-events" aria-labelledby="community-tab-events">
          {events.isError ? (
            <ErrorState message="تعذَّر تحميل الفعاليات" error={events.error} onRetry={() => events.refetch()} />
          ) : (
            <RowList
              aria-label="قائمة الفعاليات"
              loading={events.isPending}
              empty={<EmptyState illustration="empty-community" title="لا توجد فعاليات قادمة بعد" description="ستظهر هنا الفعاليات الطلابية والجامعية عند جدولتها." />}
            >
              {events.data?.map((e) => <EventCard key={e.id} event={e} />)}
            </RowList>
          )}
        </div>
      )}

      {tab === 'rooms' && (
        <div role="tabpanel" id="community-panel-rooms" aria-labelledby="community-tab-rooms">
          <StudyRoomsPanel />
        </div>
      )}
      {tab === 'posts' && (
        <div role="tabpanel" id="community-panel-posts" aria-labelledby="community-tab-posts">
          <PostsFeedPanel />
        </div>
      )}

      {creatingAnnouncement && (
        <CreateAnnouncementModal
          canPlatform={canAnnouncePlatform}
          canOffering={canAnnounceOffering}
          onClose={() => setCreatingAnnouncement(false)}
        />
      )}
      {creatingEvent && (
        <CreateEventModal onClose={() => setCreatingEvent(false)} />
      )}
      {creatingRoom && (
        <CreateStudyRoomModal onClose={() => setCreatingRoom(false)} />
      )}
    </div>
  );
}

function AnnouncementCard({ announcement: a }: { announcement: AnnouncementRow }) {
  /* r262 (اتجاه Superlist): صفّ هادئ بتفصيل ملتصق — نصّ الإعلان يُعرض
     عند الفتح (المثبّت يفتح افتراضيًا)، والنطاق/التثبيت شارتان في
     الطرف، والسطر الثانوي يحمل الكاتب والنطاق الزمني. */
  return (
    <RowItem
      leading={<EmojiIcon emoji={a.iconEmoji ?? '📢'} size={20} />}
      title={a.title}
      meta={
        <>
          {a.author.firstName} {a.author.lastName} · {ROLE_LABEL[a.author.role]} ·{' '}
          <time dateTime={a.publishedAt}>
            {formatDate(a.publishedAt, { day: 'numeric', month: 'short' })}
          </time>
        </>
      }
      trailing={
        <>
          {a.pinned && (
            <Badge color="brand" icon={Pin}>مثبت</Badge>
          )}
          <Badge color={SCOPE_COLOR[a.scope]}>{SCOPE_LABEL[a.scope]}</Badge>
        </>
      }
      expandLabel={`عرض نص الإعلان: ${a.title}`}
      defaultExpanded={a.pinned}
    >
      <p style={{ margin: 0 }}>{a.body}</p>
    </RowItem>
  );
}

function CompetitionCard({ competition: c }: { competition: CompetitionRow }) {
  /* Deadline truth is instant-based (15-h P1-4): an OPEN competition
     stays open until its deadline actually passes — the previous
     `Math.round(days) > 0` gate flipped the amber «مغلقة» badge on for
     the final <12 h. Units are floor-ed ("full units remaining") so the
     last 24 h reach the ends-in-hours branch instead of claiming a
     phantom extra day. */
  const msLeft = new Date(c.deadline).getTime() - Date.now();
  const isOpen = c.status === 'OPEN' && msLeft > 0;
  const days = Math.max(0, Math.floor(msLeft / 86400000));
  const hours = Math.max(0, Math.floor(msLeft / 3600000));
  const daysLabel =
    days >= 1
      ? days === 1 ? 'يوم واحد متبقٍ'
        : days === 2 ? 'يومان متبقيان'
          : days <= 10 ? `${days} أيام متبقية`
            : `${days} يوماً متبقياً`
      : hours >= 1 ? `تنتهي بعد ${arUnit(hours, 'ساعة', 'ساعتين', 'ساعات')}`
        : 'تنتهي خلال دقائق';
  return (
    /* r262 (اتجاه Superlist): صفّ هادئ والعنوان هو باب الصف (عرف
       «الاسم هو باب الصفّ») — رابط حقيقي إلى تفاصيل المسابقة بدل
       بطاقة ميتة (A12 P1-2). الحالة/الجائزة/المشاركون في الطرف،
       والوصف سطر ثانوي مقصوص بسطرين (النصّ الكامل في title). */
    <RowItem
      leading={<EmojiIcon emoji={c.iconEmoji ?? '🏆'} size={20} />}
      title={
        <Link to={`/competitions/${c.id}`} className="cp-row-link" title={c.title}>
          {c.title}
        </Link>
      }
      meta={<span className="cp-clamp2" title={c.description}>{c.category} · {c.description}</span>}
      trailing={
        <span className="cp-trail">
          {/* 5-A12 P2-3: honest display state. The three states are
              exhaustive: open countdown / closed / judged / ended (OPEN
              but past deadline — awaiting the organizer's close). */}
          {isOpen ? (
            <Badge color="green"><Icon icon={Clock} size={11} /> {daysLabel}</Badge>
          ) : c.status === 'CLOSED' ? (
            <Badge color="amber">مغلقة</Badge>
          ) : c.status === 'JUDGED' ? (
            <Badge color="gold">تمّ التحكيم</Badge>
          ) : (
            <Badge color="amber">انتهى التقديم</Badge>
          )}
          {/* 5-D3: --gold measured 2.30:1 on the light card — the amber
              graphics tier (chart-6) instead. */}
          {c.prize && (
            <span className="cp-inline">
              <Icon icon={Sparkles} size={12} style={{ color: 'var(--chart-6)' }} /> {c.prize}
            </span>
          )}
          {/* A8 §7.7: a zero here reads as a dead competition — while
              entries are still possible the honest line is an invitation. */}
          <span className="cp-inline">
            <Icon icon={Users} size={12} />
            {c._count.entries === 0
              ? (isOpen ? 'كن أول المشاركين' : 'لا مشاركات')
              : c._count.entries === 1 ? 'مشترك واحد' : arUnit(c._count.entries, 'مشترك', 'مشتركان', 'مشتركين')}
          </span>
        </span>
      }
    />
  );
}

function EventCard({ event: e }: { event: CampusEventRow }) {
  const start = new Date(e.startsAt);
  const end = new Date(e.endsAt);
  const rsvp = useRsvpEvent();
  const fmtDateVal = (d: Date) => formatDate(d, { weekday: 'long', day: 'numeric', month: 'short' });
  const fmtTimeVal = (d: Date) => formatTime(d, { hour: '2-digit', minute: '2-digit' });

  /* RSVP reflection — 5-B1 ships `myRsvp` per viewer on /events (the
     viewerReacted pattern), so the pressed state now SURVIVES RELOAD
     (A12 P2-2): the server truth seeds the local state, and a
     successful mutate updates it optimistically on top. */
  const [mine, setMine] = useState<'GOING' | 'MAYBE' | 'NO' | null>(e.myRsvp ?? null);
  const [failed, setFailed] = useState(false);
  const failTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(failTimer.current), []);

  const rsvpPending = rsvp.isPending && rsvp.variables?.eventId === e.id;
  const rsvpTo = (status: 'GOING' | 'MAYBE' | 'NO') => {
    if (rsvpPending) return;
    rsvp.mutate(
      { eventId: e.id, status },
      {
        onSuccess: () => setMine(status),
        onError: () => {
          setFailed(true);
          window.clearTimeout(failTimer.current);
          failTimer.current = window.setTimeout(() => setFailed(false), 5000);
        },
      },
    );
  };

  /* r262 (اتجاه Superlist): صفّ فعالية هادئ — الوصف تفصيل ملتصق يُفتح
     بالصف نفسه (expandLabel صريح)، والإجراءات الثلاثة في الطرف تنكسر
     إلى سطر خاص تحت العنوان على الجوال (قاعدة .cp-rsvp في
     colleges.css عبر :has — لا حاجة لخارج العقد). */
  return (
    <RowItem
      leading={<EmojiIcon emoji={e.iconEmoji ?? '📅'} size={20} />}
      title={e.title}
      meta={
        <span className="event-meta">
          <span><Icon icon={CalendarDays} size={11} /> {fmtDateVal(start)}</span>
          <span><Icon icon={Clock} size={11} /> {fmtTimeVal(start)} – {fmtTimeVal(end)}</span>
          <span><Icon icon={MapPin} size={11} /> {e.location}</span>
          {/* 5-B1: the count is GOING-only — «لن أحضر» declines never
              occupied a seat; the tooltip states exactly what the pair
              measures. */}
          <span title="الحضور المؤكّدون من إجمالي السعة">
            <Icon icon={Users} size={11} /> <bdi>{e._count.rsvps} / {e.capacity}</bdi>
          </span>
        </span>
      }
      trailing={
        <EventRsvpControls
          mine={mine}
          failed={failed}
          rsvpPending={rsvpPending}
          rsvpTo={rsvpTo}
        />
      }
      expandLabel={`عرض وصف الفعالية: ${e.title}`}
    >
      <p style={{ margin: 0 }}>{e.description}</p>
    </RowItem>
  );
}

/* RSVP trio — kept as its own function so the event row's trailing slot
   stays readable; identical buttons/aria contract (tests + SR). */
function EventRsvpControls({ mine, failed, rsvpPending, rsvpTo }: {
  mine: 'GOING' | 'MAYBE' | 'NO' | null;
  failed: boolean;
  rsvpPending: boolean;
  rsvpTo: (status: 'GOING' | 'MAYBE' | 'NO') => void;
}) {
  return (
    <span className="event-actions cp-rsvp">
      <button
        type="button"
        className={`btn ${mine === 'GOING' ? 'primary' : 'outline'} sm`}
        aria-pressed={mine === 'GOING'}
        disabled={rsvpPending}
        onClick={() => rsvpTo('GOING')}
      >
        <Icon icon={CheckCircle2} size={12} /> سأحضر
      </button>
      <button
        type="button"
        className={`btn ${mine === 'MAYBE' ? 'primary' : 'outline'} sm`}
        aria-pressed={mine === 'MAYBE'}
        disabled={rsvpPending}
        onClick={() => rsvpTo('MAYBE')}
      >
        ربما
      </button>
      <button
        type="button"
        className={`btn ${mine === 'NO' ? 'primary' : 'outline'} sm`}
        aria-pressed={mine === 'NO'}
        disabled={rsvpPending}
        onClick={() => rsvpTo('NO')}
      >
        لن أحضر
      </button>
      {failed && (
        <span className="event-rsvp-fail" role="alert">
          <Icon icon={AlertTriangle} size={12} aria-hidden /> تعذّر تسجيل ردّك
        </span>
      )}
    </span>
  );
}

/* ───────────────────────── Create-announcement modal ─────────────── */

const announcementSchema = z.object({
  scope: z.enum(['PLATFORM', 'FACULTY', 'DEPARTMENT', 'OFFERING']),
  scopeId: z.string().optional(),
  title: z.string().min(3, 'العنوان قصير').max(200),
  body: z.string().min(3, 'النصّ قصير').max(4000),
  pinned: z.boolean().default(false),
  iconEmoji: z.string().max(8).optional(),
}).superRefine((data, ctx) => {
  if (data.scope !== 'PLATFORM' && !data.scopeId) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['scopeId'], message: 'مطلوب لهذا النطاق' });
  }
});
type AnnouncementInputs = z.infer<typeof announcementSchema>;

const ANN_ICONS = ['📢', '📌', '🎓', '🏆', '⚠️', '✨', '📝', '🗓️']; // allow-emoji: admin icon-picker palette
/* r152a (A6 P3-5): controlled Arabic names so SR announcements stay in
 * the app's language instead of the SR's emoji localization. */
const ANN_ICON_NAMES_AR: Record<string, string> = {
  '📢': 'مكبّر صوت', '📌': 'دبوس', '🎓': 'قبعة تخرّج', '🏆': 'كأس', // allow-emoji: a11y name map for the admin-picker palette above
  '⚠️': 'تنبيه', '✨': 'بريق', '📝': 'ملاحظة', '🗓️': 'تقويم', // allow-emoji: a11y name map for the admin-picker palette above
};

function CreateAnnouncementModal({ canPlatform, canOffering, onClose }: {
  canPlatform: boolean;
  canOffering: boolean;
  onClose: () => void;
}) {
  const create = useCreateAnnouncement();
  /* r180: the composer's faculty picker lists ONLY the caller's
     * institution's faculties — the unscoped listing offered foreign
     * choices the r179 guards would always reject. */
  const facs = useFaculties(useCurrentInstitutionSlug());
  const offeringScopeId = useId();
  const iconLabelId = useId();
  const pinnedId = useId();

  const form = useForm<AnnouncementInputs>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      scope: canPlatform ? 'PLATFORM' : 'FACULTY',
      scopeId: '',
      title: '', body: '',
      pinned: false,
      iconEmoji: '📢',
    },
  });
  const scope = form.watch('scope');
  const scopeRegistration = form.register('scope');

  /* Close-parity (15-e P2-3): Esc / X / cancel / overlay-click confirm
     before dropping a dirty draft, and every close path stays inert
     while the create mutation is in flight. */
  const { requestClose, escapeLocked, guard } = useDiscardGuard({
    dirty: form.formState.isDirty,
    pending: create.isPending,
    onClose,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync({
        scope: values.scope,
        scopeId: values.scope === 'PLATFORM' ? undefined : values.scopeId || undefined,
        title: values.title,
        body: values.body,
        pinned: values.pinned,
        iconEmoji: values.iconEmoji,
      });
      onClose();
    } catch { /* surfaced below */ }
  });

  return (
    <Modal
      open
      onClose={requestClose}
      ariaLabel="إعلان جديد"
      closeOnOverlayClick={!create.isPending}
      closeOnEscape={!escapeLocked}
    >
      <header className="comp-modal-head">
        <h2>إعلان جديد</h2>
        <button type="button" className="comp-modal-close" onClick={requestClose} aria-label="إغلاق" disabled={create.isPending}>
          <Icon icon={X} size={16} />
        </button>
      </header>
      {/* 5-C4 (A10 P2-3): platform FormField — aria-invalid +
          aria-describedby on every error-carrying control (the census
          measured all four announcement controls unwired). */}
      <form onSubmit={onSubmit} className="comp-modal-form" style={{ overflowY: 'auto' }}>
        <div className="comp-form-row">
          <FormField label="النطاق">
            <select
              className="auth-input"
              {...scopeRegistration}
              onChange={(e) => {
                scopeRegistration.onChange(e);
                // A target id chosen for the previous scope type is
                // invalid for the new one (a faculty id is not an offering
                // id) — restart the target select clean instead of
                // submitting a stale id the backend would reject.
                form.setValue('scopeId', '');
              }}
            >
              {canPlatform && <option value="PLATFORM">على مستوى المنصّة</option>}
              <option value="FACULTY">كلّيّة</option>
              <option value="DEPARTMENT">قسم</option>
              {canOffering && <option value="OFFERING">مقرر</option>}
            </select>
          </FormField>
          {(scope === 'FACULTY' || scope === 'DEPARTMENT') && (
            <FormField
              label={scope === 'FACULTY' ? 'الكلّيّة' : 'القسم'}
              error={form.formState.errors.scopeId?.message}
            >
              <select {...form.register('scopeId')} className="auth-input">
                <option value="">اختر…</option>
                {scope === 'FACULTY' && facs.data?.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
                {scope === 'DEPARTMENT' && facs.data?.flatMap((f) => f.departments.map((d) => (
                  <option key={d.id} value={d.id}>{f.name} — {d.name}</option>
                )))}
              </select>
            </FormField>
          )}
          {scope === 'OFFERING' && (
            <OfferingScopeSelect
              id={offeringScopeId}
              registration={form.register('scopeId')}
              error={form.formState.errors.scopeId?.message}
            />
          )}
        </div>

        <FormField label="العنوان" error={form.formState.errors.title?.message}>
          <input type="text" {...form.register('title')} className="auth-input" />
        </FormField>
        <FormField label="نصّ الإعلان" error={form.formState.errors.body?.message}>
          <textarea rows={5} {...form.register('body')} className="auth-input" style={{ resize: 'vertical' }} />
        </FormField>

        <div className="comp-form-row">
          <div className="form-field">
            <label className="form-field-label" id={iconLabelId}>أيقونة</label>
            <div className="comp-icon-picker" role="group" aria-labelledby={iconLabelId}>
              {ANN_ICONS.map((ic) => (
                <button
                  key={ic} type="button"
                  aria-pressed={form.watch('iconEmoji') === ic}
                  aria-label={ANN_ICON_NAMES_AR[ic] ?? 'أيقونة'}
                  className={`comp-icon-btn${form.watch('iconEmoji') === ic ? ' on' : ''}`}
                  onClick={() => form.setValue('iconEmoji', ic)}
                >{ic}</button>
              ))}
            </div>
          </div>
          {/* 5-C4 (A10 P3-7 while in the row): ONE label names the
              checkbox — the old pair (field label + wrapping label)
              concatenated into a garbled accessible name. */}
          <div className="form-field">
            <label className="form-field-label" htmlFor={pinnedId}>تثبيت</label>
            <span className="flex items-center gap-2" style={{ marginBlockStart: 'var(--sp-2)' }}>
              <input id={pinnedId} type="checkbox" {...form.register('pinned')} />
              <span className="text-sm text-muted">إبقاء الإعلان في أعلى التغذية</span>
            </span>
          </div>
        </div>

        {create.isError && <div className="auth-error">تعذَّر النشر. تحقَّق من البيانات.</div>}

        <div className="comp-modal-actions">
          <button type="button" className="btn ghost" onClick={requestClose} disabled={create.isPending}>إلغاء</button>
          <button type="submit" className="btn primary" disabled={create.isPending}>
            <Icon icon={Send} size={14} />
            {create.isPending ? 'جارٍ النشر…' : 'نشر الإعلان'}
          </button>
        </div>
      </form>
      {guard}
    </Modal>
  );
}

/* OFFERING-scope target picker — the courses the announcing teacher
   teaches (the backend permits exactly those for TEACHER, and the same
   taught list for OWNER). Mounted only while that scope is selected so
   roles without the teacher-offerings endpoint never fire the query.
   ADMIN/QUALITY may address any offering server-side, but no
   all-offerings list endpoint exists yet — 16-E7 worklog hand-off. */
function OfferingScopeSelect({
  id, registration, error,
}: {
  id: string;
  registration: UseFormRegisterReturn;
  error?: string;
}) {
  const offerings = useTeacherOfferings();
  /* 5-C4 (A10 P2-3): the load/empty notices ride the FormField hint
     slot, so aria-describedby covers them too. */
  const hint = offerings.isPending
    ? 'جارٍ تحميل مقرّراتك…'
    : offerings.isError
      ? 'تعذَّر تحميل المقرّرات.'
      : (offerings.data?.length ?? 0) === 0
        ? 'لا توجد مقرّرات مُسنَدة إليك حالياً.'
        : undefined;
  return (
    <FormField label="المقرر" id={id} error={error} hint={hint}>
      <select className="auth-input" {...registration}>
        <option value="">اختر…</option>
        {offerings.data?.map((o) => (
          <option key={o.id} value={o.id}>{o.course.name} ({o.course.code})</option>
        ))}
      </select>
    </FormField>
  );
}

/* ───────────────────────── Create-event modal ─────────────────── */

const eventSchema = z.object({
  title: z.string().min(3, 'العنوان قصير').max(200),
  description: z.string().min(10, 'الوصف قصير').max(4000),
  location: z.string().min(2, 'حدِّد المكان').max(200),
  startsAt: z.string().min(1, 'حدِّد بداية الفعاليّة'),
  endsAt: z.string().min(1, 'حدِّد نهاية الفعاليّة'),
  capacity: z.coerce.number().int().min(1).max(10_000).default(100),
  iconEmoji: z.string().max(8).optional(),
}).refine((d) => new Date(d.endsAt) > new Date(d.startsAt), {
  message: 'النهاية يجب أن تكون بعد البداية', path: ['endsAt'],
});
type EventInputs = z.infer<typeof eventSchema>;

const EVENT_ICONS = ['📅', '🎤', '🎓', '🔬', '⚽', '🎨', '🧑‍🏫', '🤝']; // allow-emoji: admin icon-picker palette
/* r152a (A6 P3-5): controlled Arabic names for SR announcements. */
const EVENT_ICON_NAMES_AR: Record<string, string> = {
  '📅': 'تقويم', '🎤': 'ميكروفون', '🎓': 'قبعة تخرّج', '🔬': 'مجهر', // allow-emoji: a11y name map for the admin-picker palette above
  '⚽': 'كرة قدم', '🎨': 'لوحة ألوان', '🧑‍🏫': 'مدرّس', '🤝': 'مصافحة', // allow-emoji: a11y name map for the admin-picker palette above
};

function CreateEventModal({ onClose }: { onClose: () => void }) {
  const create = useCreateCampusEvent();
  const iconLabelId = useId();

  const form = useForm<EventInputs>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '', description: '', location: '',
      startsAt: '', endsAt: '',
      capacity: 100, iconEmoji: '📅',
    },
  });

  /* Close-parity (15-e P2-3) — same contract as the announcement modal. */
  const { requestClose, escapeLocked, guard } = useDiscardGuard({
    dirty: form.formState.isDirty,
    pending: create.isPending,
    onClose,
  });

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      await create.mutateAsync({
        title: values.title,
        description: values.description,
        location: values.location,
        startsAt: new Date(values.startsAt).toISOString(),
        endsAt: new Date(values.endsAt).toISOString(),
        capacity: values.capacity,
        iconEmoji: values.iconEmoji,
      });
      onClose();
    } catch { /* surfaced below */ }
  });

  return (
    <Modal
      open
      onClose={requestClose}
      ariaLabel="فعاليّة جديدة"
      closeOnOverlayClick={!create.isPending}
      closeOnEscape={!escapeLocked}
    >
      <header className="comp-modal-head">
        <h2>فعاليّة جديدة</h2>
        <button type="button" className="comp-modal-close" onClick={requestClose} aria-label="إغلاق" disabled={create.isPending}>
          <Icon icon={X} size={16} />
        </button>
      </header>
      {/* 5-C4 (A10 P2-3): platform FormField on the event form too —
          same association contract as the announcement composer. */}
      <form onSubmit={onSubmit} className="comp-modal-form" style={{ overflowY: 'auto' }}>
        <FormField label="العنوان" error={form.formState.errors.title?.message}>
          <input type="text" {...form.register('title')} className="auth-input" />
        </FormField>
        <FormField label="الوصف" error={form.formState.errors.description?.message}>
          <textarea rows={3} {...form.register('description')} className="auth-input" style={{ resize: 'vertical' }} />
        </FormField>
        <FormField label="المكان" error={form.formState.errors.location?.message}>
          <input type="text" placeholder="مدرَج الكلّيّة، قاعة 301…" {...form.register('location')} className="auth-input" />
        </FormField>
        <div className="comp-form-row">
          <FormField label="البداية" error={form.formState.errors.startsAt?.message}>
            <input type="datetime-local" {...form.register('startsAt')} className="auth-input" />
          </FormField>
          <FormField label="النهاية" error={form.formState.errors.endsAt?.message}>
            <input type="datetime-local" {...form.register('endsAt')} className="auth-input" />
          </FormField>
        </div>
        <div className="comp-form-row">
          <FormField label="السعة القصوى">
            <input type="number" min={1} max={10000} {...form.register('capacity')} className="auth-input" />
          </FormField>
          <div className="form-field">
            <label className="form-field-label" id={iconLabelId}>أيقونة</label>
            <div className="comp-icon-picker" role="group" aria-labelledby={iconLabelId}>
              {EVENT_ICONS.map((ic) => (
                <button
                  key={ic} type="button"
                  aria-pressed={form.watch('iconEmoji') === ic}
                  aria-label={EVENT_ICON_NAMES_AR[ic] ?? 'أيقونة'}
                  className={`comp-icon-btn${form.watch('iconEmoji') === ic ? ' on' : ''}`}
                  onClick={() => form.setValue('iconEmoji', ic)}
                >{ic}</button>
              ))}
            </div>
          </div>
        </div>
        {create.isError && <div className="auth-error">تعذَّر إنشاء الفعاليّة. تحقَّق من البيانات.</div>}
        <div className="comp-modal-actions">
          <button type="button" className="btn ghost" onClick={requestClose} disabled={create.isPending}>إلغاء</button>
          <button type="submit" className="btn primary" disabled={create.isPending}>
            <Icon icon={Send} size={14} />
            {create.isPending ? 'جارٍ الحفظ…' : 'إنشاء الفعاليّة'}
          </button>
        </div>
      </form>
      {guard}
    </Modal>
  );
}
