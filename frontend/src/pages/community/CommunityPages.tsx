/**
 * Real community / social layer.
 *
 *   /community            tabbed: Announcements · Competitions · Events
 *   The existing /student/social (posts) stays as it is.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useForm, type UseFormRegisterReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import {
  Megaphone, Trophy, CalendarDays, Pin, MapPin, Clock,
  CheckCircle2, Users, Sparkles, Plus, X, Send, AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { Card, Badge, MetricCard, FormField } from '../../components/primitives';
import { ErrorState, EmptyState, ListSkeleton, CardSkeleton } from '../../components/primitives/States';
import { Modal } from '../../components/overlays';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import {
  useAnnouncements, useCompetitions, useCampusEvents, useRsvpEvent,
  useCreateAnnouncement, useCreateCampusEvent, useFaculties, useMyPermissions,
  useTeacherOfferings,
  type AnnouncementRow, type CompetitionRow, type CampusEventRow,
} from '../../hooks/useResources';
import { useAuthStore } from '../../stores/auth.store';
import { useDiscardGuard } from '../../components/curriculum/AuthoringModal';
import { formatDate, formatTime } from '../../utils/numbers';
import { arUnit } from '../../lib/format';
import '../../styles/training.css'; // shared .track-grid/.track-card family (D11 css split, 12-15)
import '../../styles/colleges.css'; // borrowed .comp-modal-*/.comp-form-*/.event-meta (D14 css split, 13-17)

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

type CommunityTab = 'announcements' | 'competitions' | 'events';

const COMMUNITY_TABS: Array<{ key: CommunityTab; label: string; icon: LucideIcon }> = [
  { key: 'announcements', label: 'الإعلانات', icon: Megaphone },
  { key: 'competitions', label: 'المسابقات', icon: Trophy },
  { key: 'events', label: 'الفعاليات', icon: CalendarDays },
];

export default function CommunityPage() {
  const [tab, setTab] = useState<CommunityTab>('announcements');
  const [creatingAnnouncement, setCreatingAnnouncement] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
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

  const openComps = comps.data?.filter((c) => c.status === 'OPEN').length ?? 0;
  /* 22-c (A5 P3-7): the KPI reads «فعاليات قادمة» — count only
     sessions actually in the future instead of the whole feed. */
  const upcomingEvents =
    events.data?.filter((e) => new Date(e.startsAt).getTime() > Date.now()).length ?? 0;

  /* KPI values — honest query states (pending → ellipsis, error → dash,
     never a fabricated 0) + Arabic-Indic numerals like the rest of the
     KPI surfaces (audit 0-f P2-29). */
  const annCount = ann.isPending ? '…' : ann.isError ? '—' : (ann.data?.length ?? 0).toLocaleString('ar-LY');
  const compsCount = comps.isPending ? '…' : comps.isError ? '—' : openComps.toLocaleString('ar-LY');
  const eventsCount = events.isPending ? '…' : events.isError ? '—' : upcomingEvents.toLocaleString('ar-LY');

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
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المجتمع الجامعي</h1>
          <p className="page-subtitle">
            إعلانات الجامعة · مسابقات وفعاليات · أنشطة طلابية. المساحة الرسمية للحياة الأكاديمية اليومية.
          </p>
        </div>
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
      </header>

      {/* KPI trio — .kpis-compact keeps the strip a strip on phones
          (A12 P2-4): the plain .grid-3 stack burned 396px on three
          single numbers and pushed the tabs below the fold. */}
      <div className="grid-3 kpis-compact">
        <MetricCard icon={Megaphone} label="إعلانات نشطة" value={annCount} color="brand" />
        <MetricCard icon={Trophy} label="مسابقات مفتوحة" value={compsCount} color="gold" />
        <MetricCard icon={CalendarDays} label="فعاليات قادمة" value={eventsCount} color="green" />
      </div>

      {/* Tabs — manual role/aria annotation (icons are content, so the raw
          markup is kept; the shared Tabs primitive only accepts text labels).
          Full ARIA tabs pattern: roving tabindex + RTL arrow keys +
          id/aria-controls ↔ tabpanel wiring (audit 0-f P2-18). */}
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

      {/* Tab panels — shape-matched skeletons while pending (A9 P2-2,
          5-C3 hand-off): each panel's skeleton mirrors its loaded
          layout (announcement rows / track cards / event cards), never
          a bare spinner. */}
      {tab === 'announcements' && (
        <div className="flex-col gap-3" role="tabpanel" id="community-panel-announcements" aria-labelledby="community-tab-announcements">
          {ann.isPending ? <ListSkeleton rows={4} /> :
           ann.isError ? <ErrorState message="تعذَّر تحميل الإعلانات" error={ann.error} onRetry={() => ann.refetch()} /> :
           (ann.data?.length ?? 0) === 0 ? (
            <EmptyState title="لا توجد إعلانات بعد" description="ستظهر هنا إعلانات الجامعة والكليات والأقسام." />
          ) : ann.data?.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
        </div>
      )}
      {tab === 'competitions' && (
        <div className="track-grid" role="tabpanel" id="community-panel-competitions" aria-labelledby="community-tab-competitions">
          {comps.isPending ? <>
            <CardSkeleton lines={4} />
            <CardSkeleton lines={4} />
            <CardSkeleton lines={4} />
          </> :
           comps.isError ? <ErrorState message="تعذَّر تحميل المسابقات" error={comps.error} onRetry={() => comps.refetch()} /> :
           (comps.data?.length ?? 0) === 0 ? (
            <EmptyState title="لا توجد مسابقات بعد" description="ستظهر هنا تحديات المعرفة والابتكار عند إعلانها." />
          ) : comps.data?.map((c) => <CompetitionCard key={c.id} competition={c} />)}
        </div>
      )}
      {tab === 'events' && (
        <div className="grid-2" role="tabpanel" id="community-panel-events" aria-labelledby="community-tab-events">
          {events.isPending ? <>
            <CardSkeleton lines={3} />
            <CardSkeleton lines={3} />
          </> :
           events.isError ? <ErrorState message="تعذَّر تحميل الفعاليات" error={events.error} onRetry={() => events.refetch()} /> :
           (events.data?.length ?? 0) === 0 ? (
            <EmptyState title="لا توجد فعاليات قادمة بعد" description="ستظهر هنا الفعاليات الطلابية والجامعية عند جدولتها." />
          ) : events.data?.map((e) => <EventCard key={e.id} event={e} />)}
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
    </div>
  );
}

function AnnouncementCard({ announcement: a }: { announcement: AnnouncementRow }) {
  return (
    <article className={`announcement-card${a.pinned ? ' pinned' : ''}`}>
      <div className="announcement-head">
        <span className="announcement-icon" aria-hidden>
          <EmojiIcon emoji={a.iconEmoji ?? '📢'} size={20} />
        </span>
        <div className="announcement-head-main">
          {/* Card title demoted from h3 to a styled div (15-g P2-5 — card
              titles sat at h3 directly under the page h1, a skipped level).
              22-c (A5 P1-1/P3-5): the headline treatment moved from five
              inline style props into .announcement-title (student.css). */}
          <div className="announcement-title">{a.title}</div>
          <div className="announcement-meta">
            <Badge color={SCOPE_COLOR[a.scope]}>{SCOPE_LABEL[a.scope]}</Badge>
            <span className="announcement-meta-item">
              {a.author.firstName} {a.author.lastName} · {ROLE_LABEL[a.author.role]}
            </span>
            <time
              className="announcement-meta-item"
              dateTime={a.publishedAt}
            >
              {formatDate(a.publishedAt, { day: 'numeric', month: 'short' })}
            </time>
          </div>
        </div>
        {a.pinned && (
          <span className="announcement-pin">
            <Icon icon={Pin} size={11} /> مثبت
          </span>
        )}
      </div>
      <p className="announcement-body">{a.body}</p>
    </article>
  );
}

function CompetitionCard({ competition: c }: { competition: CompetitionRow }) {
  const accent = c.themeColor ?? 'var(--accent)';
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
    /* A real link, not a dead card (A12 P1-2 forward-path family): the
     * community tab's competition cards were non-navigable divs — the
     * only onward path was the header's «صفحة المسابقات الكاملة».
     * .track-card already carries its anchor treatment (TrainingPages'
     * tracks are Links through the same family). */
    <Link
      to={`/competitions/${c.id}`}
      className="track-card"
      style={{ ['--track-accent' as never]: accent }}
    >
      <div className="track-card-icon" style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
        <EmojiIcon emoji={c.iconEmoji ?? '🏆'} size={24} />
      </div>
      <div className="track-card-body">
        <div className="track-card-cat">{c.category}</div>
        <div className="track-card-title" title={c.title}>{c.title}</div>
        {/* summary is line-clamped by training.css — the full text rides
            along in the title attribute (craft floor: no truncation
            without a tooltip) */}
        <p className="track-card-summary" title={c.description}>{c.description}</p>
        <div className="track-card-meta">
          {/* 5-A12 P2-3: honest display state. The old ternary assumed
              !OPEN ⇒ CLOSED|JUDGED, so an OPEN competition whose deadline
              had passed rendered a FALSE «تم التحكيم». The three states
              are now exhaustive: open countdown / closed / judged /
              ended (OPEN but past deadline — awaiting the organizer's
              close action). */}
          {isOpen ? (
            <Badge color="green"><Icon icon={Clock} size={11} /> {daysLabel}</Badge>
          ) : c.status === 'CLOSED' ? (
            <Badge color="amber">مغلقة</Badge>
          ) : c.status === 'JUDGED' ? (
            <Badge color="gold">تم التحكيم</Badge>
          ) : (
            <Badge color="amber">انتهى التقديم</Badge>
          )}
          {c.prize && <span><Icon icon={Sparkles} size={12} style={{ color: 'var(--gold)' }} /> {c.prize}</span>}
          {/* A8 §7.7: a zero here reads as a dead competition — while
              entries are still possible the honest line is an invitation
              (the empty-state inside the detail page already speaks this
              copy); after the door closes it names the absence. */}
          <span>
            <Icon icon={Users} size={12} />
            {' '}
            {c._count.entries === 0
              ? (isOpen ? 'كن أول المشاركين' : 'لا مشاركات')
              : c._count.entries === 1 ? 'مشترك واحد' : arUnit(c._count.entries, 'مشترك', 'مشتركان', 'مشتركين')}
          </span>
        </div>
      </div>
    </Link>
  );
}

function EventCard({ event: e }: { event: CampusEventRow }) {
  const accent = e.themeColor ?? 'var(--accent)';
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

  return (
    <Card>
      <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
        <div style={{
          flexShrink: 0, width: 64, height: 64, borderRadius: 'var(--r-md)',
          background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent,
          display: 'grid', placeItems: 'center',
        }}>
          <EmojiIcon emoji={e.iconEmoji ?? '📅'} size={22} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Title demoted from h3 to a styled div (15-g P2-5 heading
              skip) — inline styles keep the exact rendered look. */}
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 'var(--fw-bold)', fontSize: 'var(--fs-md)', margin: '0 0 6px 0' }}>{e.title}</div>
          <p className="text-sm text-muted" style={{ margin: '0 0 var(--sp-2) 0' }}>{e.description}</p>
          <div className="event-meta">
            <span><Icon icon={CalendarDays} size={11} /> {fmtDateVal(start)}</span>
            <span><Icon icon={Clock} size={11} /> {fmtTimeVal(start)} – {fmtTimeVal(end)}</span>
            <span><Icon icon={MapPin} size={11} /> {e.location}</span>
            {/* 5-B1: the count is GOING-only — «لن أحضر» declines never
                occupied a seat; the tooltip states exactly what the pair
                measures. */}
            <span title="الحضور المؤكّدون من إجمالي السعة">
              <Icon icon={Users} size={11} /> <bdi>{e._count.rsvps} / {e.capacity}</bdi>
            </span>
          </div>
          <div className="event-actions">
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
          </div>
        </div>
      </div>
    </Card>
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

function CreateAnnouncementModal({ canPlatform, canOffering, onClose }: {
  canPlatform: boolean;
  canOffering: boolean;
  onClose: () => void;
}) {
  const create = useCreateAnnouncement();
  const facs = useFaculties();
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
            <span className="flex items-center gap-2" style={{ marginBlockStart: 8 }}>
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
