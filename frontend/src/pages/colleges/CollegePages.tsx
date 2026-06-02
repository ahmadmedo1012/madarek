import { Link, useParams } from 'react-router-dom';
import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, Users, BookOpen, GraduationCap, Trophy, Megaphone,
  Calendar, Radio, Award, ArrowLeft, MapPin, Clock,
  FlaskConical, Microscope, ClipboardCheck, Medal, BarChart3,
  Search, X,
} from 'lucide-react';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import { UserAvatar } from '../../components/primitives';
import { Card, MetricCard } from '../../components/primitives';
import { EmptyState, ErrorState, LoadingState } from '../../components/primitives/States';
import { Reveal, Skeleton } from '../../components/motion';
import { api, unwrap } from '../../lib/api';
import { getCollegeIdentity } from '../../data/colleges.config';
import { gateCollegeAccent } from '../../lib/theme';
import { useThemeStore, resolveTheme } from '../../stores/theme.store';
import { filterColleges, CAMPUS_ORDER, type CityName } from './filter-colleges';
import { useUrlQueryState } from '../../hooks/useUrlQueryState';
import type { AcademicPosition } from '../../stores/auth.store';

interface CollegeListItem {
  id: string;
  name: string;
  nameEn?: string | null;
  iconEmoji?: string | null;
  city: string;
  departmentCount: number;
  studentCount: number;
  teacherCount: number;
  courseCount: number;
}

interface UserMini {
  id: string;
  firstName: string;
  lastName: string;
  avatarColor?: string | null;
  avatarInitials?: string | null;
}

interface CollegeDetail {
  id: string;
  name: string;
  nameEn?: string | null;
  iconEmoji?: string | null;
  city: string;
  stats: {
    studentCount: number;
    teacherCount: number;
    departmentCount: number;
    courseCount: number;
  };
  departments: { id: string; name: string; studentCount: number; teacherCount: number; courseCount: number }[];
  leadership: {
    position: AcademicPosition | null;
    appointedAt: string | null;
    user: UserMini;
    department: { id: string; name: string } | null;
    faculty: { id: string; name: string } | null;
  }[];
  topStudents: {
    totalXp: number;
    level: number;
    year: number;
    department: { id: string; name: string };
    user: UserMini;
  }[];
  announcements: {
    id: string;
    title: string;
    body: string;
    pinned: boolean;
    iconEmoji?: string | null;
    publishedAt: string;
    scope: 'PLATFORM' | 'FACULTY' | 'DEPARTMENT' | 'OFFERING';
    author: { firstName: string; lastName: string };
  }[];
  upcomingEvents: {
    id: string;
    title: string;
    location: string;
    startsAt: string;
    endsAt: string;
    capacity: number;
    iconEmoji?: string | null;
    _count: { rsvps: number };
  }[];
  upcomingLive: {
    id: string;
    title: string;
    topic?: string | null;
    scheduledAt: string;
    status: 'SCHEDULED' | 'LIVE' | 'ENDED' | 'CANCELLED';
    teacher: { firstName: string; lastName: string };
    offering: { course: { name: string; code: string } };
  }[];
  activeCompetitions: {
    id: string;
    title: string;
    category: string;
    prize?: string | null;
    deadline: string;
    iconEmoji?: string | null;
    themeColor?: string | null;
    _count: { entries: number };
  }[];
}

const POSITION_LABEL: Record<AcademicPosition, string> = {
  DEAN: 'عميد الكلية',
  ASSOCIATE_DEAN: 'وكيل العميد',
  DEPARTMENT_HEAD: 'رئيس قسم',
};

function formatDateTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('ar-LY', { dateStyle: 'medium', timeStyle: 'short' });
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = d.getTime() - Date.now();
  const days = Math.round(diff / 86400000);
  if (Math.abs(days) < 1) return 'اليوم';
  if (days === 1) return 'غداً';
  if (days === -1) return 'أمس';
  if (days > 1 && days < 7) return `بعد ${days} أيّام`;
  return d.toLocaleDateString('ar-LY', { dateStyle: 'medium' });
}

/* ───────────────────────── Index page ───────────────────────── */

export function CollegesIndexPage() {
  const q = useQuery({
    queryKey: ['colleges'],
    queryFn: () => unwrap<CollegeListItem[]>(api.get('/colleges')),
    staleTime: 5 * 60_000,
  });

  const { state, setQuery, setCampus, clear } = useUrlQueryState();
  const data = q.data ?? [];

  // Pre-compute total per campus for the chip-strip counts.
  const totalByCampus = useMemo(() => {
    const counts = new Map<CityName, number>();
    for (const c of data) {
      const cityRaw = c.city;
      const city = (CAMPUS_ORDER as ReadonlyArray<string>).includes(cityRaw)
        ? (cityRaw as CityName)
        : ('مناطق أخرى' as CityName);
      counts.set(city, (counts.get(city) ?? 0) + 1);
    }
    return counts;
  }, [data]);

  const result = useMemo(
    () => filterColleges(data, state),
    [data, state],
  );

  const hasActiveFilters = state.query.trim() !== '' || state.campus !== null;

  return (
    <div className="page colleges-index">
      <header className="page-header">
        <h1 className="page-title">كلّيّات جامعة الزاوية</h1>
        <p className="page-subtitle">استكشف الكلّيّات والأقسام، وقادة كلّ كلّيّة، وأبرز طلّابها وأنشطتها.</p>
      </header>

      {q.isLoading && (
        <div className="gallery-skeleton" aria-hidden>
          {[0, 1, 2].map((s) => (
            <section key={s} className="gallery-skeleton-section">
              <Skeleton className="gallery-skeleton-title" />
              <div className="gallery-skeleton-grid">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} variant="card" />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {q.data && q.data.length === 0 && (
        <EmptyState title="لا توجد كلّيّات بعد" description="ستظهر الكلّيّات هنا حين يقوم الإداريّون بإضافتها." />
      )}

      {q.data && q.data.length > 0 && (
        <>
          {/* Toolbar: search + campus chip strip + clear-filters. */}
          <div className="gallery-toolbar" role="search">
            <label className="visually-hidden" htmlFor="gallery-search">ابحث عن كلية</label>
            <div style={{ flex: '1 1 240px', position: 'relative' }}>
              <Icon
                icon={Search}
                size={16}
                style={{
                  position: 'absolute',
                  insetBlockStart: '50%',
                  insetInlineStart: 'var(--sp-3)',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                  pointerEvents: 'none',
                }}
              />
              <input
                id="gallery-search"
                type="search"
                className="input gallery-search-input"
                placeholder="ابحث عن كلية…"
                value={state.query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ paddingInlineStart: 'var(--sp-9)' }}
              />
            </div>

            <div className="gallery-chip-strip" role="tablist" aria-label="فلترة حسب الحرم">
              <button
                type="button"
                role="tab"
                aria-selected={state.campus === null}
                className={`gallery-chip${state.campus === null ? ' gallery-chip-on' : ''}`}
                onClick={() => setCampus(null)}
              >
                <span>الكل</span>
                <span className="gallery-chip-count">{data.length}</span>
              </button>
              {CAMPUS_ORDER.map((city) => {
                const count = totalByCampus.get(city) ?? 0;
                if (count === 0) return null;
                const active = state.campus === city;
                return (
                  <button
                    key={city}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`gallery-chip${active ? ' gallery-chip-on' : ''}`}
                    onClick={() => setCampus(active ? null : city)}
                  >
                    <span>{city}</span>
                    <span className="gallery-chip-count">{count}</span>
                  </button>
                );
              })}
            </div>

            {hasActiveFilters && (
              <button type="button" className="gallery-clear" onClick={clear}>
                <Icon icon={X} size={14} />
                <span>إعادة تعيين</span>
              </button>
            )}
          </div>

          {/* Polite live region for filter result count (FR-031). */}
          <div role="status" aria-live="polite" aria-atomic="true" className="visually-hidden">
            {`${result.total} نتيجة`}
          </div>

          {result.total === 0 ? (
            <EmptyState
              title="لم نعثر على نتائج"
              description="جرّب كلمة بحث مختلفة أو غيّر الحرم الجامعي."
              action={
                <button type="button" className="btn primary" onClick={clear}>
                  <Icon icon={X} size={14} />
                  مسح الفلترة
                </button>
              }
            />
          ) : (
            Array.from(result.byCampus.entries()).map(([city, list]) => (
              <Reveal as="section" key={city} className="college-city-section" distance="medium">
                <header className="college-city-header">
                  <h2 className="college-city-name">{city}</h2>
                  <span className="college-city-count">{list.length} كلّيّة</span>
                </header>
                <div className="college-grid">
                  {list.map((c) => {
                    const profile = getCollegeIdentity(c.id);
                    const accent = profile?.accent ?? null;
                    const accentStyle = accent
                      ? ({ ['--college-accent']: accent } as React.CSSProperties)
                      : undefined;
                    return (
                      <Link
                        key={c.id}
                        to={`/colleges/${c.id}`}
                        className="college-card"
                        data-college-accent={accent ?? undefined}
                        style={accentStyle}
                      >
                        <div className="college-card-header">
                          <span className="college-card-emoji" aria-hidden>
                            {/* allow-emoji: data-default for admin-chosen icon */}
                            <EmojiIcon emoji={c.iconEmoji ?? '🏛️'} size={26} />
                          </span>
                          <div className="college-card-titles">
                            <div className="college-card-name">{c.name}</div>
                            {c.nameEn && <div className="college-card-sub">{c.nameEn}</div>}
                          </div>
                          <span className="college-card-arrow"><Icon icon={ArrowLeft} size={18} /></span>
                        </div>
                        <div className="college-card-stats">
                          <CollegeStatChip icon={Building2} value={c.departmentCount} label="قسم" />
                          <CollegeStatChip icon={GraduationCap} value={c.studentCount} label="طالب" />
                          <CollegeStatChip icon={Users} value={c.teacherCount} label="عضو هيئة" />
                          <CollegeStatChip icon={BookOpen} value={c.courseCount} label="مقرّر" />
                        </div>
                        <span className="college-card-cta">
                          <span>زيارة الصفحة</span>
                          <Icon icon={ArrowLeft} size={12} />
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </Reveal>
            ))
          )}

          <div className="leaderboard-cta">
            <Link to="/colleges/leaderboard" className="btn primary">
              <Icon icon={Medal} size={14} />
              منافسة الكلّيّات
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

function CollegeStatChip({
  icon,
  value,
  label,
}: {
  icon: typeof Building2;
  value: number | null | undefined;
  label: string;
}) {
  // FR-010: render "—" for unknown values, the formatted number for any
  // genuine number including 0. Principle III — we never invent counts.
  const display = value === null || value === undefined
    ? '—'
    : value.toLocaleString('ar-LY');
  return (
    <span className="college-stat-chip">
      <Icon icon={icon} size={13} />
      <strong>{display}</strong>
      <span>{label}</span>
    </span>
  );
}

/* ───────────────────────── Detail page ───────────────────────── */

export function CollegeDetailPage() {
  const { id } = useParams<{ id: string }>();
  const q = useQuery({
    queryKey: ['colleges', id],
    queryFn: () => unwrap<CollegeDetail>(api.get(`/colleges/${id}`)),
    enabled: !!id,
    staleTime: 60_000,
  });

  if (q.isLoading) return <div className="page"><LoadingState /></div>;
  if (q.isError || !q.data) {
    return <div className="page"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  }

  const c = q.data;
  // Resolve the college identity profile (accent, hero, icon).
  // When no profile exists for this slug, the page falls back to the
  // default Madrak chrome — no synthetic identity is invented.
  // 012-design-graphics-uplift FR-005: gate the identity colour at
  // runtime; if it fails AA-large vs the active chrome surface, drop
  // the inline override so the page falls back to var(--role-accent).
  const themeMode = useThemeStore((s) => s.mode);
  const identity = getCollegeIdentity(id);
  const activeSurface = resolveTheme(themeMode);
  const gatedAccent = identity ? gateCollegeAccent(identity.accent, activeSurface) : null;
  const collegeStyle = gatedAccent
    ? ({
        '--college-accent': gatedAccent,
        '--college-accent-fg': identity?.namedTokens?.['college-accent-fg'] ?? gatedAccent,
        '--college-accent-soft':
          identity?.namedTokens?.['college-accent-soft'] ?? `color-mix(in srgb, ${gatedAccent} 12%, transparent)`,
      } as React.CSSProperties)
    : undefined;

  return (
    <div
      className="page college-detail"
      data-college={identity?.slug || undefined}
      style={collegeStyle}
    >
      {/* Hero / masthead */}
      <header className="college-hero page-header">
        <div className="college-hero-emoji" aria-hidden><EmojiIcon emoji={c.iconEmoji ?? '🏛️'} size={36} /></div>
        <div className="college-hero-titles">
          <div className="college-hero-eyebrow">جامعة الزاوية · {c.city}</div>
          <h1 className="page-title college-hero-name">{c.name}</h1>
          {c.nameEn && <div className="college-hero-sub">{c.nameEn}</div>}
        </div>
      </header>

      {/* Stats row */}
      <section className="grid-4">
        <MetricCard label="عدد الأقسام" value={c.stats.departmentCount.toLocaleString('ar-LY')} icon={Building2} color="brand" />
        <MetricCard label="إجمالي الطلاب" value={c.stats.studentCount.toLocaleString('ar-LY')} icon={GraduationCap} color="green" />
        <MetricCard label="هيئة التدريس" value={c.stats.teacherCount.toLocaleString('ar-LY')} icon={Users} color="purple" />
        <MetricCard label="عدد المقرّرات" value={c.stats.courseCount.toLocaleString('ar-LY')} icon={BookOpen} color="amber" />
      </section>

      <div className="college-grid-2">
        {/* Leadership */}
        <Card title="القيادة الأكاديميّة" subtitle="المعيَّنون لهذه الكلّيّة">
          {c.leadership.length === 0 ? (
            <p className="text-muted text-sm">لم يتمّ تعيين قيادة لهذه الكلّيّة بعد.</p>
          ) : (
            <ul className="leadership-list">
              {c.leadership.map((l, i) => (
                <li key={`${l.user.id}-${i}`} className="leadership-row">
                  <UserAvatar
                    initials={l.user.avatarInitials ?? `${l.user.firstName[0]}${l.user.lastName[0]}`}
                    color={l.user.avatarColor ?? undefined}
                    size={36}
                  />
                  <div className="leadership-row-body">
                    <div className="leadership-row-name">{l.user.firstName} {l.user.lastName}</div>
                    <div className="leadership-row-role">
                      {l.position ? POSITION_LABEL[l.position] : 'عضو'}
                      {l.department && ` · ${l.department.name}`}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Departments */}
        <Card title="الأقسام" subtitle={`${c.departments.length} قسماً`}>
          {c.departments.length === 0 ? (
            <p className="text-muted text-sm">لم تُضَف أقسام بعد.</p>
          ) : (
            <ul className="dept-list">
              {c.departments.map((d) => (
                <li key={d.id} className="dept-row">
                  <div className="dept-row-name">
                    <Icon icon={Building2} size={14} />
                    {d.name}
                  </div>
                  <div className="dept-row-counts">
                    <span><strong>{d.studentCount}</strong> طالب</span>
                    <span><strong>{d.teacherCount}</strong> أستاذ</span>
                    <span><strong>{d.courseCount}</strong> مقرّر</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="college-grid-2">
        {/* Top students */}
        <Card title="الطلّاب المتميّزون" subtitle="حسب نقاط الخبرة" icon={Trophy}>
          {c.topStudents.length === 0 ? (
            <p className="text-muted text-sm">لا توجد بيانات طلّاب بعد.</p>
          ) : (
            <ol className="student-rank-list">
              {c.topStudents.map((s, i) => (
                <li key={s.user.id} className="student-rank-row">
                  <span className="student-rank-num">{i + 1}</span>
                  <UserAvatar
                    initials={s.user.avatarInitials ?? `${s.user.firstName[0]}${s.user.lastName[0]}`}
                    color={s.user.avatarColor ?? undefined}
                    size={32}
                  />
                  <div className="student-rank-body">
                    <div className="student-rank-name">{s.user.firstName} {s.user.lastName}</div>
                    <div className="student-rank-meta">{s.department.name} · السنة {s.year}</div>
                  </div>
                  <div className="student-rank-xp">
                    <Icon icon={Award} size={12} />
                    <strong>{s.totalXp.toLocaleString('ar-LY')}</strong>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Card>

        {/* Announcements */}
        <Card title="الإعلانات" subtitle="آخر التحديثات" icon={Megaphone}>
          {c.announcements.length === 0 ? (
            <p className="text-muted text-sm">لا توجد إعلانات حاليّاً.</p>
          ) : (
            <ul className="announce-list">
              {c.announcements.slice(0, 5).map((a) => (
                <li key={a.id} className="announce-row">
                  <span className="announce-emoji" aria-hidden><EmojiIcon emoji={a.iconEmoji ?? '📌'} size={18} /></span>
                  <div className="announce-body">
                    <div className="announce-title">
                      {a.pinned && <span className="pill on">مثبَّت</span>}
                      {a.title}
                    </div>
                    <div className="announce-meta">
                      {a.author.firstName} {a.author.lastName} · {formatRelative(a.publishedAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="college-grid-2">
        {/* Upcoming events */}
        <Card title="فعاليّات قادمة" icon={Calendar}>
          {c.upcomingEvents.length === 0 ? (
            <p className="text-muted text-sm">لا توجد فعاليّات قادمة.</p>
          ) : (
            <ul className="event-list">
              {c.upcomingEvents.map((e) => (
                <li key={e.id} className="event-row">
                  <span className="event-emoji" aria-hidden><EmojiIcon emoji={e.iconEmoji ?? '🎤'} size={18} /></span>
                  <div className="event-body">
                    <div className="event-title">{e.title}</div>
                    <div className="event-meta">
                      <span><Icon icon={MapPin} size={12} /> {e.location}</span>
                      <span><Icon icon={Clock} size={12} /> {formatDateTime(e.startsAt)}</span>
                      <span>{e._count.rsvps}/{e.capacity}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* Live broadcasts */}
        <Card title="البثّ المباشر" icon={Radio}>
          {c.upcomingLive.length === 0 ? (
            <p className="text-muted text-sm">لا توجد جلسات بثّ مجدولة.</p>
          ) : (
            <ul className="live-list">
              {c.upcomingLive.map((l) => (
                <li key={l.id} className="live-row">
                  {l.status === 'LIVE' && <span className="pill on" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}>مباشر الآن</span>}
                  <div className="live-body">
                    <div className="live-title">{l.title}</div>
                    <div className="live-meta">
                      {l.offering.course.code} · {l.teacher.firstName} {l.teacher.lastName} · {formatDateTime(l.scheduledAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Competitions */}
      <Card title="مسابقات نشطة" subtitle="على مستوى الجامعة" icon={Trophy}>
        {c.activeCompetitions.length === 0 ? (
          <p className="text-muted text-sm">لا توجد مسابقات نشطة.</p>
        ) : (
          <div className="comp-grid">
            {c.activeCompetitions.map((comp) => (
              <div key={comp.id} className="comp-card" style={comp.themeColor ? { borderInlineStartColor: comp.themeColor } : undefined}>
                <div className="comp-emoji" aria-hidden>{comp.iconEmoji ?? '🏆'}</div>
                <div className="comp-body">
                  <div className="comp-title">{comp.title}</div>
                  <div className="comp-meta">
                    <span>{comp.category}</span>
                    <span>· الإغلاق {formatRelative(comp.deadline)}</span>
                    <span>· {comp._count.entries} مشترك</span>
                  </div>
                  {comp.prize && <div className="comp-prize">الجائزة: {comp.prize}</div>}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ───────────────────────── Leaderboard page ─────────────────────────
 *
 * Sub-project C: inter-college comparison. Single page with a sortable
 * table that ranks every college on shared metrics (XP, GPA, papers,
 * exam attempts, lab activity, completed enrollments). Each metric
 * shows the rank as a medal glyph on the leader. // allow-emoji: doc comment describing leaderboard glyphs
 */

interface LeaderboardCollege {
  id: string;
  name: string;
  iconEmoji?: string | null;
  city: string;
  studentCount: number;
  teacherCount: number;
  totalXp: number;
  avgXp: number;
  avgGpa: number;
  publishedPapers: number;
  examAttempts: number;
  labSessions: number;
  completedEnrollments: number;
  ranks: {
    totalXp: number;
    avgGpa: number;
    publishedPapers: number;
    examAttempts: number;
    labSessions: number;
    completedEnrollments: number;
  };
}

interface LeaderboardData {
  colleges: LeaderboardCollege[];
}

const METRICS = [
  { key: 'totalXp' as const, label: 'إجمالي نقاط الخبرة', icon: Award, format: (n: number) => n.toLocaleString('ar-LY') },
  { key: 'avgGpa' as const, label: 'المعدّل العام', icon: BarChart3, format: (n: number) => n.toFixed(2) },
  { key: 'publishedPapers' as const, label: 'الأبحاث المنشورة', icon: Microscope, format: (n: number) => n.toLocaleString('ar-LY') },
  { key: 'examAttempts' as const, label: 'محاولات الاختبارات', icon: ClipboardCheck, format: (n: number) => n.toLocaleString('ar-LY') },
  { key: 'labSessions' as const, label: 'جلسات المعامل', icon: FlaskConical, format: (n: number) => n.toLocaleString('ar-LY') },
  { key: 'completedEnrollments' as const, label: 'تسجيلات مكتملة', icon: GraduationCap, format: (n: number) => n.toLocaleString('ar-LY') },
];

function rankMedal(rank: number): string {
  if (rank === 1) return '🥇'; // allow-emoji: medal rank glyph
  if (rank === 2) return '🥈'; // allow-emoji: medal rank glyph
  if (rank === 3) return '🥉'; // allow-emoji: medal rank glyph
  return '';
}

export function CollegesLeaderboardPage() {
  const q = useQuery({
    queryKey: ['colleges', 'leaderboard'],
    queryFn: () => unwrap<LeaderboardData>(api.get('/colleges/leaderboard')),
    staleTime: 5 * 60_000,
  });

  return (
    <div className="page colleges-leaderboard">
      <header className="page-header">
        <h1 className="page-title">منافسة الكلّيّات</h1>
        <p className="page-subtitle">مقارنة الكلّيّات على مؤشّرات الأداء الأكاديميّ والنشاط الرقميّ.</p>
      </header>

      {q.isLoading && <LoadingState />}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {q.data && q.data.colleges.length === 0 && (
        <EmptyState title="لا توجد بيانات" description="ستظهر المنافسة حين تتوفّر بيانات للكلّيّات." />
      )}

      {q.data && q.data.colleges.length > 0 && (
        <Card title="لوحة المتصدّرين" icon={Trophy}>
          <div className="leaderboard-table-wrap">
            <table className="leaderboard-table">
              <thead>
                <tr>
                  <th className="leaderboard-college">الكلّيّة</th>
                  {METRICS.map((m) => (
                    <th key={m.key} title={m.label}>
                      <span className="leaderboard-th">
                        <Icon icon={m.icon} size={13} />
                        <span>{m.label}</span>
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {q.data.colleges
                  .slice()
                  .sort((a, b) => b.totalXp - a.totalXp)
                  .map((c) => (
                    <tr key={c.id}>
                      <td className="leaderboard-college">
                        <Link to={`/colleges/${c.id}`} className="leaderboard-college-link">
                          <span className="leaderboard-emoji" aria-hidden>{c.iconEmoji ?? '🏛️'}</span>
                          <div>
                            <div className="leaderboard-college-name">{c.name}</div>
                            <div className="leaderboard-college-meta">
                              {c.city} · {c.studentCount.toLocaleString('ar-LY')} طالب · {c.teacherCount} أستاذ
                            </div>
                          </div>
                        </Link>
                      </td>
                      {METRICS.map((m) => {
                        const value = c[m.key];
                        const rank = c.ranks[m.key];
                        return (
                          <td key={m.key} className={`leaderboard-cell rank-${rank}`}>
                            <span className="leaderboard-value font-mono">{m.format(value)}</span>
                            {rank <= 3 && <span className="leaderboard-medal" aria-label={`الترتيب ${rank}`}>{rankMedal(rank)}</span>}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
