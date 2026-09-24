/**
 * Real community / social layer.
 *
 *   /community            tabbed: Announcements · Competitions · Events
 *   The existing /student/social (posts) stays as it is.
 */
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import {
  Megaphone, Trophy, CalendarDays, Pin, MapPin, Clock,
  CheckCircle2, Users, Sparkles, Plus, X, Send, AlertTriangle,
  type LucideIcon,
} from 'lucide-react';
import { Card, Badge, MetricCard } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { Modal } from '../../components/overlays';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import {
  useAnnouncements, useCompetitions, useCampusEvents, useRsvpEvent,
  useCreateAnnouncement, useCreateCampusEvent, useFaculties, useMyPermissions,
  type AnnouncementRow, type CompetitionRow, type CampusEventRow,
} from '../../hooks/useResources';
import { formatDate, formatTime } from '../../utils/numbers';

const SCOPE_LABEL: Record<string, string> = {
  PLATFORM: 'كل المنصة', FACULTY: 'كلية', DEPARTMENT: 'قسم', OFFERING: 'مقرر',
};
const SCOPE_COLOR: Record<string, 'brand' | 'green' | 'gold' | 'purple'> = {
  PLATFORM: 'brand', FACULTY: 'green', DEPARTMENT: 'purple', OFFERING: 'gold',
};
const ROLE_LABEL: Record<string, string> = {
  STUDENT: 'طالب', TEACHER: 'أستاذ', ADMIN: 'الإدارة', QUALITY: 'مكتب الجودة',
};

/* Local Arabic counted-noun helper (same contract as the one in
   MorePages.tsx — a shared util extraction is queued for a wave that
   owns utils/): 1 → singular, 2 → dual, 3–10 → plural, 11+ → singular. */
function arUnit(n: number, one: string, two: string, few: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  if (n <= 10) return `${n} ${few}`;
  return `${n} ${one}`;
}

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

  const canAnnounceFaculty = perms.data?.capabilities.includes('ANNOUNCE_FACULTY') ?? false;
  const canAnnouncePlatform = perms.data?.capabilities.includes('ANNOUNCE_PLATFORM') ?? false;
  const canAnnounce = canAnnounceFaculty || canAnnouncePlatform;
  const canRunEvents = perms.data?.capabilities.includes('EVENTS_RUN') ?? false;

  const openComps = comps.data?.filter((c) => c.status === 'OPEN').length ?? 0;
  const upcomingEvents = events.data?.length ?? 0;

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

      <div className="grid-3">
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

      {tab === 'announcements' && (
        <div className="flex-col gap-3" role="tabpanel" id="community-panel-announcements" aria-labelledby="community-tab-announcements">
          {ann.isPending ? <LoadingState label="جارٍ تحميل الإعلانات…" /> :
           ann.isError ? <ErrorState message="تعذَّر تحميل الإعلانات" error={ann.error} onRetry={() => ann.refetch()} /> :
           (ann.data?.length ?? 0) === 0 ? (
            <EmptyState title="لا توجد إعلانات بعد" description="ستظهر هنا إعلانات الجامعة والكليات والأقسام." />
          ) : ann.data?.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
        </div>
      )}
      {tab === 'competitions' && (
        <div className="track-grid" role="tabpanel" id="community-panel-competitions" aria-labelledby="community-tab-competitions">
          {comps.isPending ? <LoadingState label="جارٍ تحميل المسابقات…" /> :
           comps.isError ? <ErrorState message="تعذَّر تحميل المسابقات" error={comps.error} onRetry={() => comps.refetch()} /> :
           (comps.data?.length ?? 0) === 0 ? (
            <EmptyState title="لا توجد مسابقات بعد" description="ستظهر هنا تحديات المعرفة والابتكار عند إعلانها." />
          ) : comps.data?.map((c) => <CompetitionCard key={c.id} competition={c} />)}
        </div>
      )}
      {tab === 'events' && (
        <div className="grid-2" role="tabpanel" id="community-panel-events" aria-labelledby="community-tab-events">
          {events.isPending ? <LoadingState label="جارٍ تحميل الفعاليات…" /> :
           events.isError ? <ErrorState message="تعذَّر تحميل الفعاليات" error={events.error} onRetry={() => events.refetch()} /> :
           (events.data?.length ?? 0) === 0 ? (
            <EmptyState title="لا توجد فعاليات قادمة بعد" description="ستظهر هنا الفعاليات الطلابية والجامعية عند جدولتها." />
          ) : events.data?.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      )}

      {creatingAnnouncement && (
        <CreateAnnouncementModal
          canPlatform={canAnnouncePlatform}
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
    <div className={`announcement-card${a.pinned ? ' pinned' : ''}`}>
      {a.pinned && (
        <div className="announcement-pin"><Icon icon={Pin} size={12} /> مثبت</div>
      )}
      <div className="announcement-head">
        <span className="announcement-icon"><EmojiIcon emoji={a.iconEmoji ?? '📢'} size={20} /></span>
        <div style={{ flex: 1 }}>
          <h3 className="announcement-title">{a.title}</h3>
          <div className="announcement-meta">
            <Badge color={SCOPE_COLOR[a.scope]}>{SCOPE_LABEL[a.scope]}</Badge>
            <span className="text-xxs text-subtle">
              {a.author.firstName} {a.author.lastName} · {ROLE_LABEL[a.author.role]}
            </span>
            <span className="text-xxs text-subtle">·</span>
            <span className="text-xxs text-subtle">{formatDate(a.publishedAt, { day: 'numeric', month: 'short' })}</span>
          </div>
        </div>
      </div>
      <p className="announcement-body">{a.body}</p>
    </div>
  );
}

function CompetitionCard({ competition: c }: { competition: CompetitionRow }) {
  const accent = c.themeColor ?? 'var(--accent)';
  const days = Math.max(0, Math.round((new Date(c.deadline).getTime() - Date.now()) / 86400000));
  const isOpen = c.status === 'OPEN' && days > 0;
  const daysLabel =
    days === 1 ? 'يوم واحد متبقٍ'
      : days === 2 ? 'يومان متبقيان'
        : days <= 10 ? `${days} أيام متبقية`
          : `${days} يوماً متبقياً`;
  return (
    <div className="track-card" style={{ ['--track-accent' as never]: accent, cursor: 'default' }}>
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
          {isOpen ? (
            <Badge color="green"><Icon icon={Clock} size={11} /> {daysLabel}</Badge>
          ) : (
            <Badge color="amber">{c.status === 'CLOSED' ? 'مغلقة' : 'تم التحكيم'}</Badge>
          )}
          {c.prize && <span><Icon icon={Sparkles} size={12} style={{ color: 'var(--gold)' }} /> {c.prize}</span>}
          <span><Icon icon={Users} size={12} /> {c._count.entries === 1 ? 'مشترك واحد' : arUnit(c._count.entries, 'مشترك', 'مشتركان', 'مشتركين')}</span>
        </div>
      </div>
    </div>
  );
}

function EventCard({ event: e }: { event: CampusEventRow }) {
  const accent = e.themeColor ?? 'var(--accent)';
  const start = new Date(e.startsAt);
  const end = new Date(e.endsAt);
  const rsvp = useRsvpEvent();
  const fmtDateVal = (d: Date) => formatDate(d, { weekday: 'long', day: 'numeric', month: 'short' });
  const fmtTimeVal = (d: Date) => formatTime(d, { hour: '2-digit', minute: '2-digit' });

  /* Session-local RSVP reflection — the event row carries no "my RSVP"
     field from the API, so the pressed state is tracked locally after a
     successful mutate (audit 0-f P2-17: pending / pressed / failure
     feedback instead of double-submitting blind). */
  const [mine, setMine] = useState<'GOING' | 'MAYBE' | null>(null);
  const [failed, setFailed] = useState(false);
  const failTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(failTimer.current), []);

  const rsvpPending = rsvp.isPending && rsvp.variables?.eventId === e.id;
  const rsvpTo = (status: 'GOING' | 'MAYBE') => {
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
          <h3 style={{ fontSize: 'var(--fs-md)', margin: '0 0 6px 0' }}>{e.title}</h3>
          <p className="text-sm text-muted" style={{ margin: '0 0 var(--sp-2) 0' }}>{e.description}</p>
          <div className="event-meta">
            <span><Icon icon={CalendarDays} size={11} /> {fmtDateVal(start)}</span>
            <span><Icon icon={Clock} size={11} /> {fmtTimeVal(start)} – {fmtTimeVal(end)}</span>
            <span><Icon icon={MapPin} size={11} /> {e.location}</span>
            <span><Icon icon={Users} size={11} /> <bdi>{e._count.rsvps} / {e.capacity}</bdi></span>
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

function CreateAnnouncementModal({ canPlatform, onClose }: { canPlatform: boolean; onClose: () => void }) {
  const create = useCreateAnnouncement();
  const facs = useFaculties();
  const scopeId = useId();
  const scopeSelectId = useId();
  const titleId = useId();
  const bodyId = useId();
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
    <Modal open onClose={onClose} ariaLabel="إعلان جديد">
      <header className="comp-modal-head">
        <h2>إعلان جديد</h2>
        <button type="button" className="comp-modal-close" onClick={onClose} aria-label="إغلاق">
          <Icon icon={X} size={16} />
        </button>
      </header>
      <form onSubmit={onSubmit} className="comp-modal-form" style={{ overflowY: 'auto' }}>
        <div className="comp-form-row">
          <div className="comp-form-field">
            <label htmlFor={scopeSelectId}>النطاق</label>
            <select id={scopeSelectId} {...form.register('scope')} className="auth-input">
              {canPlatform && <option value="PLATFORM">على مستوى المنصّة</option>}
              <option value="FACULTY">كلّيّة</option>
              <option value="DEPARTMENT">قسم</option>
            </select>
          </div>
          {scope !== 'PLATFORM' && (
            <div className="comp-form-field">
              <label htmlFor={scopeId}>{scope === 'FACULTY' ? 'الكلّيّة' : 'القسم'}</label>
              <select id={scopeId} {...form.register('scopeId')} className="auth-input">
                <option value="">اختر…</option>
                {scope === 'FACULTY' && facs.data?.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
                {scope === 'DEPARTMENT' && facs.data?.flatMap((f) => f.departments.map((d) => (
                  <option key={d.id} value={d.id}>{f.name} — {d.name}</option>
                )))}
              </select>
              {form.formState.errors.scopeId && <span className="auth-field-error">{form.formState.errors.scopeId.message}</span>}
            </div>
          )}
        </div>

        <div className="comp-form-field">
          <label htmlFor={titleId}>العنوان</label>
          <input id={titleId} type="text" {...form.register('title')} className="auth-input" />
          {form.formState.errors.title && <span className="auth-field-error">{form.formState.errors.title.message}</span>}
        </div>
        <div className="comp-form-field">
          <label htmlFor={bodyId}>نصّ الإعلان</label>
          <textarea id={bodyId} rows={5} {...form.register('body')} className="auth-input" />
          {form.formState.errors.body && <span className="auth-field-error">{form.formState.errors.body.message}</span>}
        </div>

        <div className="comp-form-row">
          <div className="comp-form-field">
            <label id={iconLabelId}>أيقونة</label>
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
          <div className="comp-form-field">
            <label htmlFor={pinnedId}>تثبيت</label>
            <label htmlFor={pinnedId} className="flex items-center gap-2" style={{ marginBlockStart: 8 }}>
              <input id={pinnedId} type="checkbox" {...form.register('pinned')} />
              <span className="text-sm text-muted">إبقاء الإعلان في أعلى التغذية</span>
            </label>
          </div>
        </div>

        {create.isError && <div className="auth-error">تعذَّر النشر. تحقَّق من البيانات.</div>}

        <div className="comp-modal-actions">
          <button type="button" className="btn ghost" onClick={onClose}>إلغاء</button>
          <button type="submit" className="btn primary" disabled={create.isPending}>
            <Icon icon={Send} size={14} />
            {create.isPending ? 'جارٍ النشر…' : 'نشر الإعلان'}
          </button>
        </div>
      </form>
    </Modal>
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
  const titleId = useId();
  const descId = useId();
  const locId = useId();
  const startId = useId();
  const endId = useId();
  const capId = useId();
  const iconLabelId = useId();

  const form = useForm<EventInputs>({
    resolver: zodResolver(eventSchema),
    defaultValues: {
      title: '', description: '', location: '',
      startsAt: '', endsAt: '',
      capacity: 100, iconEmoji: '📅',
    },
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
    <Modal open onClose={onClose} ariaLabel="فعاليّة جديدة">
      <header className="comp-modal-head">
        <h2>فعاليّة جديدة</h2>
        <button type="button" className="comp-modal-close" onClick={onClose} aria-label="إغلاق">
          <Icon icon={X} size={16} />
        </button>
      </header>
      <form onSubmit={onSubmit} className="comp-modal-form" style={{ overflowY: 'auto' }}>
        <div className="comp-form-field">
          <label htmlFor={titleId}>العنوان</label>
          <input id={titleId} type="text" {...form.register('title')} className="auth-input" />
          {form.formState.errors.title && <span className="auth-field-error">{form.formState.errors.title.message}</span>}
        </div>
        <div className="comp-form-field">
          <label htmlFor={descId}>الوصف</label>
          <textarea id={descId} rows={3} {...form.register('description')} className="auth-input" />
          {form.formState.errors.description && <span className="auth-field-error">{form.formState.errors.description.message}</span>}
        </div>
        <div className="comp-form-field">
          <label htmlFor={locId}>المكان</label>
          <input id={locId} type="text" placeholder="مدرَج الكلّيّة، قاعة 301…" {...form.register('location')} className="auth-input" />
          {form.formState.errors.location && <span className="auth-field-error">{form.formState.errors.location.message}</span>}
        </div>
        <div className="comp-form-row">
          <div className="comp-form-field">
            <label htmlFor={startId}>البداية</label>
            <input id={startId} type="datetime-local" {...form.register('startsAt')} className="auth-input" />
            {form.formState.errors.startsAt && <span className="auth-field-error">{form.formState.errors.startsAt.message}</span>}
          </div>
          <div className="comp-form-field">
            <label htmlFor={endId}>النهاية</label>
            <input id={endId} type="datetime-local" {...form.register('endsAt')} className="auth-input" />
            {form.formState.errors.endsAt && <span className="auth-field-error">{form.formState.errors.endsAt.message}</span>}
          </div>
        </div>
        <div className="comp-form-row">
          <div className="comp-form-field">
            <label htmlFor={capId}>السعة القصوى</label>
            <input id={capId} type="number" min={1} max={10000} {...form.register('capacity')} className="auth-input" />
          </div>
          <div className="comp-form-field">
            <label id={iconLabelId}>أيقونة</label>
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
          <button type="button" className="btn ghost" onClick={onClose}>إلغاء</button>
          <button type="submit" className="btn primary" disabled={create.isPending}>
            <Icon icon={Send} size={14} />
            {create.isPending ? 'جارٍ الحفظ…' : 'إنشاء الفعاليّة'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
