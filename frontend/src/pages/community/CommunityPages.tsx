/**
 * Real community / social layer.
 *
 *   /community            tabbed: Announcements · Competitions · Events
 *   The existing /student/social (posts) stays as it is.
 */
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import {
  Megaphone, Trophy, CalendarDays, Pin, MapPin, Clock,
  CheckCircle2, Users, Sparkles, Plus, X, Send,
} from 'lucide-react';
import { Card, Badge, MetricCard } from '../../components/primitives';
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

export default function CommunityPage() {
  const [tab, setTab] = useState<'announcements' | 'competitions' | 'events'>('announcements');
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
        <MetricCard icon={Megaphone} label="إعلانات نشطة" value={(ann.data?.length ?? 0).toString()} color="brand" />
        <MetricCard icon={Trophy} label="مسابقات مفتوحة" value={openComps.toString()} color="gold" />
        <MetricCard icon={CalendarDays} label="فعاليات قادمة" value={upcomingEvents.toString()} color="green" />
      </div>

      <div className="tabs">
        <button type="button" className={`tab${tab === 'announcements' ? ' on' : ''}`} onClick={() => setTab('announcements')}>
          <Icon icon={Megaphone} size={13} /> الإعلانات
        </button>
        <button type="button" className={`tab${tab === 'competitions' ? ' on' : ''}`} onClick={() => setTab('competitions')}>
          <Icon icon={Trophy} size={13} /> المسابقات
        </button>
        <button type="button" className={`tab${tab === 'events' ? ' on' : ''}`} onClick={() => setTab('events')}>
          <Icon icon={CalendarDays} size={13} /> الفعاليات
        </button>
      </div>

      {tab === 'announcements' && (
        <div className="flex-col gap-3">
          {ann.data?.map((a) => <AnnouncementCard key={a.id} announcement={a} />)}
        </div>
      )}
      {tab === 'competitions' && (
        <div className="track-grid">
          {comps.data?.map((c) => <CompetitionCard key={c.id} competition={c} />)}
        </div>
      )}
      {tab === 'events' && (
        <div className="grid-2">
          {events.data?.map((e) => <EventCard key={e.id} event={e} />)}
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
  return (
    <div className="track-card" style={{ ['--track-accent' as never]: accent, cursor: 'default' }}>
      <div className="track-card-icon" style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
        <EmojiIcon emoji={c.iconEmoji ?? '🏆'} size={24} />
      </div>
      <div className="track-card-body">
        <div className="track-card-cat">{c.category}</div>
        <div className="track-card-title">{c.title}</div>
        <p className="track-card-summary">{c.description}</p>
        <div className="track-card-meta">
          {isOpen ? (
            <Badge color="green"><Icon icon={Clock} size={11} /> {days} يوم متبقٍ</Badge>
          ) : (
            <Badge color="amber">{c.status === 'CLOSED' ? 'مغلقة' : 'تم التحكيم'}</Badge>
          )}
          {c.prize && <span><Icon icon={Sparkles} size={12} style={{ color: 'var(--gold)' }} /> {c.prize}</span>}
          <span><Icon icon={Users} size={12} /> {c._count.entries} مشترك</span>
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

  return (
    <Card>
      <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
        <div style={{
          flexShrink: 0, width: 64, height: 64, borderRadius: 'var(--r-md)',
          background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent,
          display: 'grid', placeItems: 'center', fontSize: 30,
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
            <span><Icon icon={Users} size={11} /> {e._count.rsvps} / {e.capacity}</span>
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 'var(--sp-3)' }}>
            <button type="button" className="btn primary sm" onClick={() => rsvp.mutate({ eventId: e.id, status: 'GOING' })}>
              <Icon icon={CheckCircle2} size={12} /> سأحضر
            </button>
            <button type="button" className="btn ghost sm" onClick={() => rsvp.mutate({ eventId: e.id, status: 'MAYBE' })}>
              ربما
            </button>
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
    <div className="comp-modal-backdrop" onClick={onClose}>
      <div className="comp-modal" onClick={(e) => e.stopPropagation()}>
        <header className="comp-modal-head">
          <h2>إعلان جديد</h2>
          <button type="button" className="comp-modal-close" onClick={onClose} aria-label="إغلاق">
            <Icon icon={X} size={16} />
          </button>
        </header>
        <form onSubmit={onSubmit} className="comp-modal-form">
          <div className="comp-form-row">
            <div className="comp-form-field">
              <label>النطاق</label>
              <select {...form.register('scope')} className="auth-input">
                {canPlatform && <option value="PLATFORM">على مستوى المنصّة</option>}
                <option value="FACULTY">كلّيّة</option>
                <option value="DEPARTMENT">قسم</option>
              </select>
            </div>
            {scope !== 'PLATFORM' && (
              <div className="comp-form-field">
                <label>{scope === 'FACULTY' ? 'الكلّيّة' : 'القسم'}</label>
                <select {...form.register('scopeId')} className="auth-input">
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
            <label>العنوان</label>
            <input type="text" {...form.register('title')} className="auth-input" />
            {form.formState.errors.title && <span className="auth-field-error">{form.formState.errors.title.message}</span>}
          </div>
          <div className="comp-form-field">
            <label>نصّ الإعلان</label>
            <textarea rows={5} {...form.register('body')} className="auth-input" />
            {form.formState.errors.body && <span className="auth-field-error">{form.formState.errors.body.message}</span>}
          </div>

          <div className="comp-form-row">
            <div className="comp-form-field">
              <label>أيقونة</label>
              <div className="comp-icon-picker">
                {ANN_ICONS.map((ic) => (
                  <button
                    key={ic} type="button"
                    className={`comp-icon-btn${form.watch('iconEmoji') === ic ? ' on' : ''}`}
                    onClick={() => form.setValue('iconEmoji', ic)}
                  >{ic}</button>
                ))}
              </div>
            </div>
            <div className="comp-form-field">
              <label>تثبيت</label>
              <label className="flex items-center gap-2" style={{ marginBlockStart: 8 }}>
                <input type="checkbox" {...form.register('pinned')} />
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
      </div>
    </div>
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
    <div className="comp-modal-backdrop" onClick={onClose}>
      <div className="comp-modal" onClick={(e) => e.stopPropagation()}>
        <header className="comp-modal-head">
          <h2>فعاليّة جديدة</h2>
          <button type="button" className="comp-modal-close" onClick={onClose} aria-label="إغلاق">
            <Icon icon={X} size={16} />
          </button>
        </header>
        <form onSubmit={onSubmit} className="comp-modal-form">
          <div className="comp-form-field">
            <label>العنوان</label>
            <input type="text" {...form.register('title')} className="auth-input" />
            {form.formState.errors.title && <span className="auth-field-error">{form.formState.errors.title.message}</span>}
          </div>
          <div className="comp-form-field">
            <label>الوصف</label>
            <textarea rows={3} {...form.register('description')} className="auth-input" />
            {form.formState.errors.description && <span className="auth-field-error">{form.formState.errors.description.message}</span>}
          </div>
          <div className="comp-form-field">
            <label>المكان</label>
            <input type="text" placeholder="مدرَج الكلّيّة، قاعة 301…" {...form.register('location')} className="auth-input" />
            {form.formState.errors.location && <span className="auth-field-error">{form.formState.errors.location.message}</span>}
          </div>
          <div className="comp-form-row">
            <div className="comp-form-field">
              <label>البداية</label>
              <input type="datetime-local" {...form.register('startsAt')} className="auth-input" />
              {form.formState.errors.startsAt && <span className="auth-field-error">{form.formState.errors.startsAt.message}</span>}
            </div>
            <div className="comp-form-field">
              <label>النهاية</label>
              <input type="datetime-local" {...form.register('endsAt')} className="auth-input" />
              {form.formState.errors.endsAt && <span className="auth-field-error">{form.formState.errors.endsAt.message}</span>}
            </div>
          </div>
          <div className="comp-form-row">
            <div className="comp-form-field">
              <label>السعة القصوى</label>
              <input type="number" min={1} max={10000} {...form.register('capacity')} className="auth-input" />
            </div>
            <div className="comp-form-field">
              <label>أيقونة</label>
              <div className="comp-icon-picker">
                {EVENT_ICONS.map((ic) => (
                  <button
                    key={ic} type="button"
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
      </div>
    </div>
  );
}
