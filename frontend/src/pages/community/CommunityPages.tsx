/**
 * Real community / social layer.
 *
 *   /community            tabbed: Announcements · Competitions · Events
 *   The existing /student/social (posts) stays as it is.
 */
import { useState } from 'react';
import {
  Megaphone, Trophy, CalendarDays, Pin, MapPin, Clock,
  CheckCircle2, Users, Sparkles,
} from 'lucide-react';
import { Card, Badge, MetricCard } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import {
  useAnnouncements, useCompetitions, useCampusEvents, useRsvpEvent,
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
  const ann = useAnnouncements();
  const comps = useCompetitions();
  const events = useCampusEvents();

  const openComps = comps.data?.filter((c) => c.status === 'OPEN').length ?? 0;
  const upcomingEvents = events.data?.length ?? 0;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المجتمع الجامعي</h1>
          <p className="page-subtitle">
            إعلانات الجامعة · مسابقات وفعاليات · أنشطة طلابية. المساحة الرسمية للحياة الأكاديمية اليومية.
          </p>
        </div>
      </div>

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
          {c.prize && <span><Icon icon={Sparkles} size={12} style={{ color: '#D4A537' }} /> {c.prize}</span>}
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
