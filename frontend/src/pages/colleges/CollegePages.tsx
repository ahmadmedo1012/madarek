import { Link, useParams, useLocation } from 'react-router-dom';
import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Building2, Users, BookOpen, GraduationCap, Trophy, Megaphone,
  Calendar, Radio, Award, ArrowLeft, MapPin, Clock,
  FlaskConical, Microscope, ClipboardCheck, Medal, BarChart3,
  Search, X, ChevronRight, ChevronDown, ChevronUp, ArrowUpDown,
} from 'lucide-react';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import { UserAvatar } from '../../components/primitives';
import { Card, MetricCard } from '../../components/primitives';
import { EmptyState, ErrorState, DetailSkeleton, TableSkeleton } from '../../components/primitives/States';
import { Reveal, Skeleton } from '../../components/motion';
import { SectionAccent } from '../../components/motion/SectionAccent';
import { api, unwrap } from '../../lib/api';
import { formatDateTimeAr, countAr } from '../../lib/format';
import { formatNum } from '../../utils/numbers';
import {
  colleges, getCollegeIdentityByRecord,
} from '../../data/colleges.config';
import { gateCollegeAccent } from '../../lib/theme';
import { useThemeStore, resolveTheme } from '../../stores/theme.store';
import { filterColleges, CAMPUS_ORDER, type CityName } from './filter-colleges';
import { useUrlQueryState } from '../../hooks/useUrlQueryState';
import { useAuthStore, type AcademicPosition } from '../../stores/auth.store';
// D14 CSS split (13-17): this sheet also styles the .comp-* competitions
// grid rendered by the page below and is shared with five other lazy
// consumers, so it lands in the chunk-shared CSS.
import '../../styles/colleges.css';

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
  DEAN: 'عميد الكلّيّة',
  ASSOCIATE_DEAN: 'وكيل العميد',
  DEPARTMENT_HEAD: 'رئيس قسم',
};

/** Counted noun with ar-LY digit grouping for large counts (leaderboard
 *  meta line) — countAr's plain template doesn't group thousands. */
function countedGroupedAr(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  return `${n.toLocaleString('ar-LY')} ${n <= 10 ? few : many}`;
}

/* formatDateTime (ar-LY medium date + short time) is
 * lib/format.formatDateTimeAr (13-15 fold, audit 11-f P2-1) — identical
 * to the copy that still lives in OwnerSystemPage (owner pages belong
 * to another batch; hand-off noted in the wave-13 worklog). */

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

/* ── Document titles (A12 P2-6 / P3-6) ─────────────────────────────
 * The docTitle effect lives inside the AppShell, which never mounts
 * for guests — the app's ONLY crawlable pages shipped the static
 * index.html title. This local effect mirrors the shell's exact
 * grammar (title + « · مدارك», base restore on unmount) for the guest
 * branch on the listing surfaces, and carries the PAYLOAD name on the
 * detail pages for everyone (the shell resolves titles from the
 * pathname alone and cannot know the record's name — «كلّيّة» for
 * every college). The set rides a 0ms macrotask: a static/cached
 * payload can land in the SAME commit as the shell's pathname effect,
 * and child effects run BEFORE the parent's — the task schedules
 * after every effect in that commit, so the payload title survives. */
const GUEST_TITLE_BASE = 'مدارك · منصة التعليم الذكي · جامعة الزاوية'; // AppShell's DOC_TITLE_BASE (keep in sync)
function useDocTitle(title: string | null) {
  useEffect(() => {
    if (title === null) return;
    const set = window.setTimeout(() => {
      document.title = `${title} · مدارك`;
    }, 0);
    return () => {
      window.clearTimeout(set);
      document.title = GUEST_TITLE_BASE;
    };
  }, [title]);
}

/* ───────────────────────── Index page ───────────────────────── */

/* ── Guest funnel chrome (5-A12 P1-2) ──────────────────────────────
 * The public colleges pages are the university's front door, yet a
 * guest who found their faculty had NO path to registration — 0 auth
 * CTAs on gallery/detail/leaderboard (A12 link census) and the
 * landing's colleges entry sits below the fold. Two restrained
 * affordances close the funnel: this compact join row on the listing
 * surfaces, and one closing band on the college detail (the «I found
 * my faculty» conversion moment). Labels mirror the landing's exact
 * pair (ghost «تسجيل الدخول» + primary «أنشئ حسابك الجامعي» — one
 * label per intent), and both carry `state.from` so a login
 * round-trip lands the new member back on the page that earned the
 * click (AuthPage readFromPath contract). Authed visitors keep the
 * app shell and never see these. */
function GuestJoinRow() {
  const { pathname } = useLocation();
  const from = { from: { pathname } };
  return (
    <div className="guest-join-row">
      <span className="guest-join-note">طالب جديد في الجامعة؟</span>
      <Link to="/auth" state={from} className="btn ghost sm">تسجيل الدخول</Link>
      <Link to="/auth" state={from} className="btn primary sm">أنشئ حسابك الجامعي</Link>
    </div>
  );
}

/* The closing band — college detail only, at the end of the story
 * the page tells. One persuasive line, one CTA pair, soft accent
 * ground; the college's own identity stays above it. */
function GuestClosingBand() {
  const { pathname } = useLocation();
  const from = { from: { pathname } };
  return (
    <section className="guest-cta-band" aria-labelledby="guest-cta-title">
      <h2 id="guest-cta-title" className="guest-cta-title">هل هذه كلّيتك؟</h2>
      <p className="guest-cta-note">
        أنشئ حسابك الجامعي وابدأ رحلتك الأكاديميّة على منصّة مدارك.
      </p>
      <div className="guest-cta-actions">
        <Link to="/auth" state={from} className="btn primary">أنشئ حسابك الجامعي</Link>
        <Link to="/auth" state={from} className="btn ghost">تسجيل الدخول</Link>
      </div>
    </section>
  );
}

export function CollegesIndexPage() {
  const user = useAuthStore((s) => s.user);
  // Public-zeros ruling (A8 P2-6): for guests, a «0 طالب / 0 عضو هيئة»
  // chip on 24 of 25 cards reads as a dead campus, not as honesty
  // about internal data (FR-010 keeps rendering genuine zeros for
  // authed roles, who see the working university tool).
  const isGuest = !user;
  // Guests get no AppShell → no docTitle effect (A12 P2-6). Authed
  // visitors keep the shell's own resolution (NAV_TITLES carries
  // /colleges — same label, one source in nav.ts).
  useDocTitle(isGuest ? 'كلّيّات الجامعة' : null);
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

  // Dev-time drift guard (ruling #6 follow-through): the identity registry
  // and the API faculty list must stay in lock-step — count AND per-record
  // resolution. DEV-only; compiled out of production builds.
  useEffect(() => {
    if (!import.meta.env.DEV || !q.data) return;
    const unmatched = q.data.filter((c) => !getCollegeIdentityByRecord(c.name, c.city));
    if (q.data.length === colleges.length && unmatched.length === 0) return;
    const detail = unmatched.length > 0
      ? `; unmatched records: ${unmatched.map((c) => `${c.name} (${c.city})`).join('، ')}`
      : '';
    console.warn(
      `[colleges] identity registry drift: ${colleges.length} profiles vs ${q.data.length} API faculties${detail}`,
    );
  }, [q.data]);

  return (
    <div className="page colleges-index">
      <SectionAccent kind="scene-paint" as="header" className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">كلّيّات جامعة الزاوية</h1>
          <p className="page-subtitle">استكشف الكلّيّات والأقسام، وقادة كلّ كلّيّة، وأبرز طلّابها وأنشطتها.</p>
        </div>
        {isGuest && <GuestJoinRow />}
      </SectionAccent>

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
            <label className="visually-hidden" htmlFor="gallery-search">ابحث عن كلّيّة</label>
            {/* A5 P1-1: the flex sizing lives in .gallery-search-wrap
                (colleges.css) — the old inline `flex: 1 1 240px` was
                written for the desktop row layout and, in the mobile
                column direction, put a 240px BASIS ON THE VERTICAL
                axis (a 196px dead gap under a 44px input). */}
            <div className="gallery-search-wrap">
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
                placeholder="ابحث عن كلّيّة…"
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
            {`${countAr(result.total, ['نتيجة واحدة', 'نتيجتان', 'نتائج', 'نتيجة'])}`}
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
                  <span className="college-city-count">{countAr(list.length, ['كلّيّة واحدة', 'كلّيّتان', 'كلّيّات', 'كلّيّة'])}</span>
                </header>
                <div className="college-grid">
                  {list.map((c) => {
                    // API records are id-keyed; reconcile with the slug-keyed
                    // identity registry through the deterministic
                    // (nameAr, city) bridge.
                    const profile = getCollegeIdentityByRecord(c.name, c.city);
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
                            {/* P3-2: the English sub single-lines with the
                                full name on title — long names (Physical
                                Education & Sports) wrapped and split the
                                grid into two card heights. */}
                            {c.nameEn && (
                              <div className="college-card-sub" title={c.nameEn}>{c.nameEn}</div>
                            )}
                          </div>
                          <span className="college-card-arrow"><Icon icon={ArrowLeft} size={18} /></span>
                        </div>
                        <div className="college-card-stats">
                          {/* Guest zero-chip suppression (A8 P2-6): the
                              audit sketch assumed dept/course counts are
                              non-zero — the seed has 21 colleges where
                              they are 0 too, so a «0 قسم · 0 مقرّر» pair
                              still read as a dead campus (VLM frame-1
                              catch, re-measured). For guests EVERY
                              zero chip drops; a card with no real
                              numbers shows none at all. Authed roles
                              keep the full FR-010 view. */}
                          {(!isGuest || c.departmentCount > 0) && (
                            <CollegeStatChip icon={Building2} value={c.departmentCount} label="قسم" />
                          )}
                          {(!isGuest || c.studentCount > 0) && (
                            <CollegeStatChip icon={GraduationCap} value={c.studentCount} label="طالب" />
                          )}
                          {(!isGuest || c.teacherCount > 0) && (
                            <CollegeStatChip icon={Users} value={c.teacherCount} label="عضو هيئة" />
                          )}
                          {(!isGuest || c.courseCount > 0) && (
                            <CollegeStatChip icon={BookOpen} value={c.courseCount} label="مقرّر" />
                          )}
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
  // Rules of hooks: this subscription used to sit BELOW the loading /
  // error early-returns — the first render mounted 2 hooks and
  // returned early, then the resolved query rendered a 3rd hook →
  // React threw "Rendered more hooks than during the previous render"
  // and the detail page crashed on every first visit (audit 0-f
  // P0-1). Every hook must run unconditionally above the gates.
  const themeMode = useThemeStore((s) => s.mode);
  const user = useAuthStore((s) => s.user);
  const q = useQuery({
    queryKey: ['colleges', id],
    queryFn: () => unwrap<CollegeDetail>(api.get(`/colleges/${id}`)),
    enabled: !!id,
    staleTime: 60_000,
  });
  // Payload title (A12 P3-6): the college's real name beats the shell's
  // generic «كلّيّة» pattern — applies once data lands, guest or authed.
  useDocTitle(q.data?.name ?? null);

  if (q.isLoading) {
    return <div className="page"><DetailSkeleton /></div>;
  }
  if (q.isError || !q.data) {
    return <div className="page"><ErrorState error={q.error} onRetry={() => q.refetch()} /></div>;
  }

  const c = q.data;
  /* Public-zeros ruling (A8 P1-2, orchestrator): the college detail is
   * the university's front door, and 24/25 seeded colleges are
   * data-thin — a GUEST's first page must not be a wall of «لا توجد…
   * بعد» internal-workflow empties («لم يتمّ تعيين قيادة…», four zero
   * KPI tiles). For guests, zero-data sections collapse entirely and
   * zero KPIs drop out of the strip; what remains is the college's
   * real story (name, city, departments, whatever activity exists) +
   * ONE honest «قريباً» line when the board is thin. Authed roles keep
   * the full honest view (FR-010 — genuine zeros stay visible to the
   * people who run the university). */
  const isGuest = !user;
  const guestStats = isGuest
    ? [
        { label: 'عدد الأقسام', value: c.stats.departmentCount, icon: Building2, color: 'brand' as const },
        { label: 'إجمالي الطلاب', value: c.stats.studentCount, icon: GraduationCap, color: 'green' as const },
        { label: 'هيئة التدريس', value: c.stats.teacherCount, icon: Users, color: 'purple' as const },
        { label: 'عدد المقرّرات', value: c.stats.courseCount, icon: BookOpen, color: 'amber' as const },
      ].filter((m) => m.value > 0)
    : null;
  const showLeadership = !isGuest || c.leadership.length > 0;
  const showDepartments = !isGuest || c.departments.length > 0;
  const showTopStudents = !isGuest || c.topStudents.length > 0;
  const showAnnouncements = !isGuest || c.announcements.length > 0;
  const showEvents = !isGuest || c.upcomingEvents.length > 0;
  const showLive = !isGuest || c.upcomingLive.length > 0;
  const showCompetitions = !isGuest || c.activeCompetitions.length > 0;
  // In each 2-col pairing, a lone surviving card spans the full row —
  // a half-width orphan unbalances the page (taste: no trailing empty
  // grid cell). Only computed for guests; authed always see both.
  const soloPair1 = showLeadership !== showDepartments;
  const soloPair2 = showTopStudents !== showAnnouncements;
  const soloPair3 = showEvents !== showLive;
  const soloSpan = { gridColumn: '1 / -1' } as const;
  // Resolve the college identity profile (accent, hero, icon). The API
  // record is id-keyed, so the deterministic (nameAr, city) bridge maps it
  // onto the slug-keyed registry. When no profile matches, the page falls
  // back to the default Madrak chrome — no synthetic identity is invented.
  // 012-design-graphics-uplift FR-005: gate the identity colour at
  // runtime; if it fails AA-large vs the active chrome surface, drop
  // the inline override so the page falls back to var(--role-accent).
  const identity = getCollegeIdentityByRecord(c.name, c.city);
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
      {/* Back to the gallery (A14 P2-3): the one detail page in the app
          without a back affordance — copies the CourseDetail idiom
          (ghost button, ChevronRight = the RTL back direction). */}
      <Link to="/colleges" className="btn ghost sm" style={{ alignSelf: 'flex-start' }}>
        <Icon icon={ChevronRight} size={13} />
        كلّيّات الجامعة
      </Link>
      {/* Hero / masthead — real photography via identity.heroImage when it
          lands (Principle III: never synthetic); the API emoji chip is the
          default treatment. The optional motif renders as a decorative
          trailing wash behind the titles. Both imgs are dormant today; the
          width/height attrs are square ratio hints matching the CSS-pinned
          geometry (72px chip / aspect-ratio:1 wash) so the day real
          photography lands it reserves layout without CLS (audit 11-g
          P2-4) — lazy+async keeps the decorative wash off the load path. */}
      <SectionAccent kind="scene-paint" as="header" className="college-hero page-header">
        {identity?.motif && (
          <img
            className="college-hero-motif"
            src={identity.motif.src}
            alt={identity.motif.alt}
            aria-hidden
            width={512}
            height={512}
            loading="lazy"
            decoding="async"
          />
        )}
        {identity?.heroImage ? (
          <img
            className="college-hero-media"
            src={identity.heroImage.src}
            alt={identity.heroImage.alt}
            width={72}
            height={72}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <div className="college-hero-emoji" aria-hidden><EmojiIcon emoji={c.iconEmoji ?? '🏛️'} size={36} /></div>
        )}
        <div className="college-hero-titles">
          <div className="college-hero-eyebrow">جامعة الزاوية · {c.city}</div>
          <h1 className="page-title college-hero-name">{c.name}</h1>
          {c.nameEn && <div className="college-hero-sub">{c.nameEn}</div>}
        </div>
      </SectionAccent>

      {/* Stats row — guests see only the real numbers (A8 P1-2 ruling);
          authed roles keep the full four-tile strip including zeros.
          The grid always matches the count: no trailing empty cell. */}
      {isGuest ? (
        guestStats && guestStats.length === 1 ? (
          <section className="college-stat-solo">
            <MetricCard label={guestStats[0]!.label} value={guestStats[0]!.value.toLocaleString('ar-LY')} icon={guestStats[0]!.icon} color={guestStats[0]!.color} />
          </section>
        ) : guestStats && guestStats.length >= 2 ? (
          <section className={guestStats.length === 2 ? 'grid-2' : guestStats.length === 3 ? 'grid-3' : 'grid-4'}>
            {guestStats.map((m) => (
              <MetricCard key={m.label} label={m.label} value={m.value.toLocaleString('ar-LY')} icon={m.icon} color={m.color} />
            ))}
          </section>
        ) : null
      ) : (
        <section className="grid-4">
          <MetricCard label="عدد الأقسام" value={c.stats.departmentCount.toLocaleString('ar-LY')} icon={Building2} color="brand" />
          <MetricCard label="إجمالي الطلاب" value={c.stats.studentCount.toLocaleString('ar-LY')} icon={GraduationCap} color="green" />
          <MetricCard label="هيئة التدريس" value={c.stats.teacherCount.toLocaleString('ar-LY')} icon={Users} color="purple" />
          <MetricCard label="عدد المقرّرات" value={c.stats.courseCount.toLocaleString('ar-LY')} icon={BookOpen} color="amber" />
        </section>
      )}

      {/* Guests on a college whose OWN four counters are all zero: one
          honest institutional line replaces the zero strip (A8 P1-2's
          exact sketch) — university-wide activity below stays visible
          because it is real. */}
      {isGuest && guestStats !== null && guestStats.length === 0 && (
        <p className="college-coming-soon text-sm text-muted">
          كلّيّة حديثة التأسيس — تُحدَّث بياناتها مع بدء التسجيل.
        </p>
      )}

      {(showLeadership || showDepartments) && (
      <div className="college-grid-2">
        {/* Leadership */}
        {showLeadership && (
        <Card title="القيادة الأكاديميّة" subtitle="المعيَّنون لهذه الكلّيّة" style={soloPair1 ? soloSpan : undefined}>
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
        )}

        {/* Departments */}
        {showDepartments && (
        <Card
          title="الأقسام"
          subtitle={countAr(c.departments.length, ['قسم واحد', 'قسمان', 'أقسام', 'قسماً'])}
          style={soloPair1 ? soloSpan : undefined}
        >
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
        )}
      </div>
      )}

      {(showTopStudents || showAnnouncements) && (
      <div className="college-grid-2">
        {/* Top students */}
        {showTopStudents && (
        <Card title="الطلّاب المتميّزون" subtitle="حسب نقاط الخبرة" icon={Trophy} style={soloPair2 ? soloSpan : undefined}>
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
        )}

        {/* Announcements */}
        {showAnnouncements && (
        <Card title="الإعلانات" subtitle="آخر التحديثات" icon={Megaphone} style={soloPair2 ? soloSpan : undefined}>
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
        )}
      </div>
      )}

      {(showEvents || showLive) && (
      <div className="college-grid-2">
        {/* Upcoming events */}
        {showEvents && (
        <Card title="فعاليّات قادمة" icon={Calendar} style={soloPair3 ? soloSpan : undefined}>
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
                      <span><Icon icon={Clock} size={12} /> {formatDateTimeAr(e.startsAt)}</span>
                      {/* 5-B1: the count is GOING-only — a decline never
                          occupied a seat; the tooltip says exactly what the
                          pair measures. */}
                      <span title="الحضور المؤكّدون من إجمالي السعة">{e._count.rsvps}/{e.capacity}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        )}

        {/* Live broadcasts */}
        {showLive && (
        <Card title="البثّ المباشر" icon={Radio} style={soloPair3 ? soloSpan : undefined}>
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
                      {l.offering.course.code} · {l.teacher.firstName} {l.teacher.lastName} · {formatDateTimeAr(l.scheduledAt)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        )}
      </div>
      )}

      {/* Competitions — real links, not a dead-end list (A12 P1-2:
          the college detail was a hub where nothing onward was
          clickable; the comp cards now route to the competition page
          — for a guest that's the register wall with return-to, for
          everyone else it's the competition itself). */}
      {showCompetitions && (
      <Card title="مسابقات نشطة" subtitle="على مستوى الجامعة" icon={Trophy}>
        {/* Guests only see this card when a competition exists; the
            empty branch is the authed (internal) view. */}
        {c.activeCompetitions.length === 0 ? (
          <p className="text-muted text-sm">لا توجد مسابقات نشطة.</p>
        ) : (
        <div className="comp-grid">
          {c.activeCompetitions.map((comp) => (
            <Link
              key={comp.id}
              to={`/competitions/${comp.id}`}
              className="comp-card"
              style={comp.themeColor ? { borderInlineStartColor: comp.themeColor } : undefined}
            >
              <div className="comp-emoji" aria-hidden><EmojiIcon emoji={comp.iconEmoji ?? '🏆'} size={22} /></div>
              <div className="comp-body">
                <div className="comp-title">{comp.title}</div>
                <div className="comp-meta">
                  <span>{comp.category}</span>
                  <span>· الإغلاق {formatRelative(comp.deadline)}</span>
                  {/* A8 §7.7: an invitation while entries are possible,
                      the honest absence after (same derived state as the
                      competitions index). */}
                  <span>· {comp._count.entries === 0
                    ? (new Date(comp.deadline).getTime() > Date.now() ? 'كن أول المشاركين' : 'لا مشاركات')
                    : `${comp._count.entries} مشترك`}</span>
                </div>
                {comp.prize && <div className="comp-prize">الجائزة: {comp.prize}</div>}
              </div>
              <span className="comp-go" aria-hidden>
                <Icon icon={ArrowLeft} size={14} />
              </span>
            </Link>
          ))}
        </div>
        )}
      </Card>
      )}

      {/* The guest funnel's closing band — «I found my faculty, now I
          sign up» (A12 P1-2). Last element of the page by design. */}
      {isGuest && <GuestClosingBand />}
    </div>
  );
}

/* ───────────────────────── Leaderboard page ─────────────────────────
 *
 * Sub-project C: inter-college comparison. Single page with a sortable
 * table that ranks every college on shared metrics (XP, GPA, papers,
 * exam attempts, lab activity, completed enrollments). Each metric
 * shows the rank as a lucide Medal glyph on the leader (the platform's
 * icon language — raw emoji medals were per-OS inconsistent, audit
 * 4-A8 P3-1) — except when the whole column is zero, where a “rank 1
 * of nothing” gets no celebration at all (P3-2). Mobile collapses to
 * labelled cards via the shared .tbl-stack pattern (P2-5).
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
  { key: 'avgGpa' as const, label: 'المعدّل العام', icon: BarChart3, format: (n: number) => formatNum(n, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
  { key: 'publishedPapers' as const, label: 'الأبحاث المنشورة', icon: Microscope, format: (n: number) => n.toLocaleString('ar-LY') },
  { key: 'examAttempts' as const, label: 'محاولات الاختبارات', icon: ClipboardCheck, format: (n: number) => n.toLocaleString('ar-LY') },
  { key: 'labSessions' as const, label: 'جلسات المعامل', icon: FlaskConical, format: (n: number) => n.toLocaleString('ar-LY') },
  { key: 'completedEnrollments' as const, label: 'تسجيلات مكتملة', icon: GraduationCap, format: (n: number) => n.toLocaleString('ar-LY') },
];

type MetricKey = (typeof METRICS)[number]['key'];

export function CollegesLeaderboardPage() {
  const user = useAuthStore((s) => s.user);
  // Public-zeros ruling (A8 P2-6): for guests, «٠ طلاب · ٠ أساتذة» on
  // 24 of 25 rows reads as a dead campus; authed roles keep the full
  // honest meta (FR-010).
  const isGuest = !user;
  // Guest title (A12 P2-6) — matches AppShell's PAGE_TITLES entry for
  // this route (same label, one source there).
  useDocTitle(isGuest ? 'منافسة الكلّيّات' : null);
  const q = useQuery({
    queryKey: ['colleges', 'leaderboard'],
    queryFn: () => unwrap<LeaderboardData>(api.get('/colleges/leaderboard')),
    staleTime: 5 * 60_000,
  });

  // Sort affordance (A8 leaderboard polish): every metric column is a
  // real sort control with aria-sort — the table used to be silently
  // hard-wired to totalXp.
  const [sort, setSort] = useState<{ key: MetricKey; dir: 1 | -1 }>({ key: 'totalXp', dir: -1 });
  const toggleSort = (key: MetricKey) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === -1 ? 1 : -1 } : { key, dir: -1 }));

  // A8 P3-2: a column where every college holds 0 has no leader — no
  // medals, no bold, and a muted value. Computed once per payload.
  const maxByMetric = useMemo(() => {
    const map = {} as Record<MetricKey, number>;
    for (const m of METRICS) {
      map[m.key] = q.data ? Math.max(...q.data.colleges.map((c) => c[m.key])) : 0;
    }
    return map;
  }, [q.data]);

  const sorted = useMemo(() => {
    if (!q.data) return [];
    return q.data.colleges
      .slice()
      .sort((a, b) => sort.dir * (a[sort.key] - b[sort.key]));
  }, [q.data, sort]);

  return (
    <div className="page colleges-leaderboard">
      {/* Gallery back-link (A12 P1-2): leaderboard ↔ gallery used to be
          one-way — the gallery CTA brought you here and the ONLY link
          out was the landing. Same ghost idiom as the detail page. */}
      <Link to="/colleges" className="btn ghost sm" style={{ alignSelf: 'flex-start' }}>
        <Icon icon={ChevronRight} size={13} />
        كلّيّات الجامعة
      </Link>
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">منافسة الكلّيّات</h1>
          <p className="page-subtitle">مقارنة الكلّيّات على مؤشّرات الأداء الأكاديميّ والنشاط الرقميّ.</p>
        </div>
        {isGuest && <GuestJoinRow />}
      </header>

      {/* Shape-matched skeleton (A9 P2-2, 5-C3 hand-off): the payload
          is a 25-row × 7-col table — a bare spinner left the page
          structureless until data landed. */}
      {q.isLoading && (
        <Card title="لوحة المتصدّرين" icon={Trophy}>
          <TableSkeleton rows={8} cols={7} />
        </Card>
      )}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {q.data && q.data.colleges.length === 0 && (
        <EmptyState
          title="لوحة منافسة الكلّيّات فارغة"
          description="تُحتسب النقاط من نشاط الطلاب المسجّل؛ ستظهر أولى النتائج مع بداية النشاط هذا الفصل."
        />
      )}

      {q.data && q.data.colleges.length > 0 && (
        <Card title="لوحة المتصدّرين" icon={Trophy}>
          <div className="leaderboard-table-wrap">
            {/* tbl-stack (A8 P2-5): collapses to labelled cards on phones
                — the 720px min-width table used to scroll 398px sideways
                at 390px. */}
            <table className="leaderboard-table tbl-stack">
              <thead>
                <tr>
                  <th className="leaderboard-college">الكلّيّة</th>
                  {METRICS.map((m) => {
                    const active = sort.key === m.key;
                    const ariaSort = active ? (sort.dir === -1 ? 'descending' : 'ascending') : 'none';
                    return (
                      <th
                        key={m.key}
                        title={m.label}
                        aria-sort={ariaSort}
                      >
                        <button
                          type="button"
                          className="leaderboard-sort"
                          onClick={() => toggleSort(m.key)}
                          aria-label={`ترتيب حسب ${m.label}${active ? (sort.dir === -1 ? ' — تنازليّ' : ' — تصاعديّ') : ''}`}
                        >
                          <span className="leaderboard-th">
                            <Icon icon={m.icon} size={13} />
                            <span>{m.label}</span>
                          </span>
                          <Icon
                            icon={active ? (sort.dir === -1 ? ChevronDown : ChevronUp) : ArrowUpDown}
                            size={12}
                            className={active ? 'leaderboard-sort-on' : undefined}
                          />
                        </button>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sorted.map((c) => (
                  <tr key={c.id}>
                    <td className="leaderboard-college" data-label="الكلّيّة">
                      <Link to={`/colleges/${c.id}`} className="leaderboard-college-link">
                        <span className="leaderboard-emoji" aria-hidden><EmojiIcon emoji={c.iconEmoji ?? '🏛️'} size={20} /></span>
                        <div>
                          <div className="leaderboard-college-name">{c.name}</div>
                          <div className="leaderboard-college-meta">
                            {c.city}
                            {(!isGuest || c.studentCount > 0) && (
                              <> · {countedGroupedAr(c.studentCount, 'طالب واحد', 'طالبان', 'طلاب', 'طالباً')}</>
                            )}
                            {(!isGuest || c.teacherCount > 0) && (
                              <> · {countedGroupedAr(c.teacherCount, 'أستاذ واحد', 'أستاذان', 'أساتذة', 'أستاذاً')}</>
                            )}
                          </div>
                        </div>
                      </Link>
                    </td>
                    {METRICS.map((m) => {
                      const value = c[m.key];
                      const rank = c.ranks[m.key];
                      const columnAlive = maxByMetric[m.key] > 0;
                      // Medals need an actual score: a college holding 0
                      // in a live column still ties at rank 2 (backend
                      // ties share ranks) — silver next to «0» is the
                      // same dishonesty P3-2 flagged on all-zero columns.
                      const earnsMedal = columnAlive && value > 0 && rank <= 3;
                      return (
                        <td
                          key={m.key}
                          data-label={m.label}
                          className={`leaderboard-cell${columnAlive && rank === 1 ? ' rank-1' : ''}${columnAlive ? '' : ' is-dead'}`}
                        >
                          <span className="leaderboard-value font-mono">{m.format(value)}</span>
                          {/* lucide Medal (A8 P3-1) — the icon language the
                              page already speaks; suppressed on all-zero
                              columns AND on zero-valued cells (P3-2: no
                              “rank of nothing”). */}
                          {earnsMedal && (
                            <span className="leaderboard-medal" role="img" aria-label={`الترتيب ${rank}`}>
                              <Icon icon={Medal} size={14} className={`medal-${rank}`} />
                            </span>
                          )}
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
