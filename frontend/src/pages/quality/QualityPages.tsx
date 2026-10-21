import { useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { Doughnut, Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, BarElement, ArcElement, Filler, Tooltip, Legend,
} from 'chart.js';
import {
  ShieldCheck, BookOpen, Activity,
  AlertTriangle, TrendingUp, FileText, ClipboardCheck, ListChecks,
  Building2, School, Star, ArrowLeft, X,
  CheckCircle2, Search, Eye,
  type LucideIcon,
} from 'lucide-react';
import { useInstitutionScope } from '../../stores/auth.store';
import { withInstitutionScope } from '../../lib/queryClient';
import { Card, Badge, AlertRow, ProgressBar, UserAvatar } from '../../components/primitives';
import { StatStrip } from '../../components/primitives/Ledger';
import { ChartFrame } from '../../components/charts';
import { cartesianOptions, radialOptions, chartColors, useChartThemeKey } from '../../lib/chartTheme';
import { ErrorState, EmptyState, ChartSkeleton, ListSkeleton, TableSkeleton, Skeleton, CardSkeleton } from '../../components/primitives/States';
import { useReducedMotion } from '../../components/motion';
import { Icon } from '../../components/Icon';
import { api, unwrap } from '../../lib/api';
import { formatRelativeArShort, WEEKDAY_NAMES_AR, countAr } from '../../lib/format';
import '../../styles/training.css'; // .filter-pill family (D11 css split, 12-15)
import { formatDate, formatNum, formatPct1 } from '../../utils/numbers';
// R304: the teacher & quality family sheet (tq-/tpg-/qlt-/exa-/oex-/cur-)
// — the quality sector's qlt-* rules consolidated there, and the roster
// toolbar migrated OFF the borrowed .admin-students-* chrome onto the
// family-owned .tq-toolbar/.tq-search pill.
import '../../styles/teacher-quality.css';
// R305 Heron (§0+§D): the shared hr- primitives + this family's
// quality-boards overlay. Imported AFTER the R304 family sheet so the
// equal-specificity Heron rules land last.
import '../../styles/r305-teacher-quality.css';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, ArcElement, Filler, Tooltip, Legend);

/* ════════════════════════════════════════════════════════════════
   API hooks
   ════════════════════════════════════════════════════════════════ */
interface QualityOverview {
  users: Partial<Record<'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY', number>>;
  courses: number;
  offerings: number;
  lectures: number;
  attendance: Partial<Record<'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED', number>>;
  papers: Partial<Record<'UPLOADED' | 'SCANNING' | 'CHECKS_PASSED' | 'CHECKS_FAILED' | 'GRADED' | 'PUBLISHED', number>>;
}

const useOverview = () => {
  const inst = useInstitutionScope(); // r180: scoped key
  return useQuery({
    /* r180: /quality/* is institution-scoped server-side — scoped key. */
    queryKey: withInstitutionScope(['quality', 'overview'], inst),
    queryFn: () => unwrap<QualityOverview>(api.get('/quality/overview')),
  });
};

interface QualityCourse {
  id: string;
  term: string;
  course: { id: string; name: string; code: string; themeColor?: string | null };
  teacher: { id: string; firstName: string; lastName: string };
  _count: { enrollments: number; lectures: number; materials: number; assignments: number };
  /** Present only on ?metric= drill-downs (5-B1): null = no countable
   *  data for this offering — render «لا بيانات», never a fake 0/100. */
  metrics?: { attendanceRate?: number | null; completionRate?: number | null };
}

/**
 * r183-B5 (A8 wave-A P2-2 recurrence — the silent-capped roster): the
 * envelope now carries `meta.total` (counted BEFORE take:50 server-side),
 * and `q` runs the search server-side (course name/code). Optional so
 * an older payload without meta still renders — the count line falls
 * back to the visible rows (the r165g alerts-page degrade contract).
 */
interface QualityRosterEnvelope<T> {
  data: T[];
  meta?: { total: number };
}

const useQualityCourses = (metric?: 'attendance' | 'completion', q?: string) => {
  const inst = useInstitutionScope(); // r180: scoped key
  return useQuery({
    /* r180: /quality/* is institution-scoped server-side — scoped key.
     * r183-B5: q rides the key (the debounced search term). */
    queryKey: withInstitutionScope(['quality', 'courses', metric ?? 'all', q ?? ''], inst),
    queryFn: async () => {
      const res = await api.get<QualityRosterEnvelope<QualityCourse>>('/quality/courses', {
        params: {
          ...(metric ? { metric } : {}),
          ...(q ? { q } : {}),
        },
      });
      return res.data;
    },
  });
};

interface ProfessorRow {
  id: string;
  firstName: string;
  lastName: string;
  avatarInitials?: string | null;
  avatarColor?: string | null;
  rank: string;
  specialty: string;
  faculty: string;
  department: string;
  offerings: number;
  totals: { enrollments: number; materials: number; lectures: number; assignments: number; attendance: number };
  satisfaction: number;
  // r151a (R5-A5): honesty flags the backend already sends — satisfaction
  // and response time are deterministic placeholders, not survey
  // measurements (learning.routes.ts marks both *Estimated: true). The
  // engagement page already honors its analogous weeklyActiveEstimated;
  // these columns deserve the same treatment instead of posing as measured.
  satisfactionEstimated?: boolean;
  responseHours: number;
  responseHoursEstimated?: boolean;
  compliance: number;
}
const useProfessors = (q?: string) => {
  const inst = useInstitutionScope(); // r180: scoped key
  return useQuery({
    /* r180: /quality/* is institution-scoped server-side — scoped key.
     * r183-B5: q rides the key (the debounced search term); the
     * envelope carries meta.total (count before take:100). */
    queryKey: withInstitutionScope(['quality', 'professors', q ?? ''], inst),
    queryFn: async () => {
      const res = await api.get<QualityRosterEnvelope<ProfessorRow>>('/quality/professors', {
        params: q ? { q } : undefined,
      });
      return res.data;
    },
  });
};

interface Engagement {
  attendance: { presentRate: number; lateRate: number; absentRate: number; total: number };
  videos: { totalLectures: number; totalEvents: number; completionRate: number; completedLectures: number };
  enrollments: number;
  totalStudents: number;
  papersByStatus: Record<string, number>;
  weeklyActive: number[];
  /** true when the backend filled the curve with its deterministic fallback. */
  weeklyActiveEstimated: boolean;
}
const useEngagement = () => {
  const inst = useInstitutionScope(); // r180: scoped key
  return useQuery({
    /* r180: /quality/* is institution-scoped server-side — scoped key. */
    queryKey: withInstitutionScope(['quality', 'engagement'], inst),
    queryFn: () => unwrap<Engagement>(api.get('/quality/engagement')),
  });
};

interface FacultyTree {
  id: string;
  name: string;
  iconEmoji?: string | null;
  departments: Array<{
    id: string;
    name: string;
    courses: Array<{
      id: string;
      name: string;
      code: string;
      themeColor?: string | null;
      offerings: Array<{
        id: string;
        term: string;
        _count: { lectures: number; materials: number; assignments: number; enrollments: number };
      }>;
      _count: { offerings: number; concepts: number };
    }>;
  }>;
}
const useCurriculum = () => {
  const inst = useInstitutionScope(); // r180: scoped key
  return useQuery({
    /* r180: /quality/* is institution-scoped server-side — scoped key. */
    queryKey: withInstitutionScope(['quality', 'curriculum'], inst),
    queryFn: () => unwrap<FacultyTree[]>(api.get('/quality/curriculum')),
  });
};

const RANK_LABEL: Record<string, string> = {
  LECTURER: 'محاضر',
  ASSISTANT_PROFESSOR: 'أستاذ مساعد',
  ASSOCIATE_PROFESSOR: 'أستاذ مشارك',
  PROFESSOR: 'أستاذ',
};

/* ════════════════════════════════════════════════════════════════
   Quality alerts — derived from real database signals
   (shared by the dashboard's summary card + the full alerts page)
   ════════════════════════════════════════════════════════════════ */

interface QualityAlert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  category: 'attendance' | 'plagiarism' | 'content';
  title: string;
  description: string;
  occurredAt: string;
}
interface QualityAlertsResponse {
  alerts: QualityAlert[];
  counts: { critical: number; warning: number; info: number; total: number };
}

const SEVERITY_TONE: Record<QualityAlert['severity'], 'red' | 'amber' | 'brand'> = {
  critical: 'red',
  warning: 'amber',
  info: 'brand',
};
/* R305 Heron (§D): the alert row chip rides §0's vocabulary — the same
 * severity semantics the R304 edge paints, in the one chip lexicon. */
const SEVERITY_CHIP_TONE: Record<QualityAlert['severity'], 'danger' | 'warn' | 'info'> = {
  critical: 'danger',
  warning: 'warn',
  info: 'info',
};
/* 4C-b: the alerts page's row chip label — the severity word rides the
 * semantic badge so a row is readable at a glance (dashboard summary
 * keeps the bare AlertRow grammar). */
const SEVERITY_LABEL: Record<QualityAlert['severity'], string> = {
  critical: 'حرج',
  warning: 'تحذير',
  info: 'معلومة',
};
/* 4C-b: the oversight-sector read-only cue — rides every quality page
 * header (muted neutral badge + Eye icon; the sector has no authoring
 * affordances at all). r299 (E item 1): the dashboard joined its
 * siblings — its former gold ShieldCheck «وصول قراءة فقط» badge
 * retired (gold is achievements-only per the token discipline). */
function ReadOnlyBadge() {
  return (
    <Badge icon={Eye}>قراءة فقط</Badge>
  );
}

/* R305 Heron (§D): the sector brow — every oversight board opens
 * brow → strong heading so the seven surfaces read as ONE governance
 * face. A separate element (never inside the h1) keeps heading names
 * and pinned strings byte-identical. */
function QualityBrow() {
  return <span className="hr-brow">قطاع ضمان الجودة</span>;
}

/** R305 Heron (§D): the status vocabulary rides §0's .hr-chip tones —
 *  the R304 ThemeColor bands (r299 E6) translated to the chip lexicon.
 *  Same bands, one vocabulary: content scores 80/50 (courses), the
 *  professor compliance band 75/50. Zero/no-data stays neutral (the
 *  honest «لا محتوى بعد» register — never a colored fake). */
function completionChipTone(score: number): 'ok' | 'warn' | 'danger' {
  return score >= 80 ? 'ok' : score >= 50 ? 'warn' : 'danger';
}
function complianceChipTone(pct: number): 'ok' | 'warn' | 'danger' {
  return pct >= 75 ? 'ok' : pct >= 50 ? 'warn' : 'danger';
}

const CATEGORY_ICON: Record<QualityAlert['category'], LucideIcon> = {
  attendance: ClipboardCheck,
  plagiarism: FileText,
  content: BookOpen,
};

/* formatRelativeArShort (compact relative time) lives in lib/format.ts
 * (wave 9-a) — identical strings to the former local copy. */

const useQualityAlerts = () => {
  const inst = useInstitutionScope(); // r180: scoped key
  return useQuery({
    /* r180: /quality/* is institution-scoped server-side — scoped key. */
    queryKey: withInstitutionScope(['quality', 'alerts'], inst),
    queryFn: () => unwrap<QualityAlertsResponse>(api.get('/quality/alerts')),
  staleTime: 60_000,
  });
};

/* ─── Shared chart/table helpers ────────────────────────────── */
// NOTE: chart options must be built during render (see components below) —
// a module-level `cartesianOptions()` would freeze the resolved CSS colours
// at import time and never follow a light/dark theme switch.

/* WEEKDAY_NAMES_AR (Sunday-first Arabic weekday names) lives in
 * lib/format.ts (13-15 fold). */

/**
 * Read a --motion-duration-* token as milliseconds. Returns 0 when the
 * token is missing/unparsable so callers can fall back explicitly.
 * (Replicated from the wave 4-a DashboardPage helper — promote both
 * copies into a shared hooks module in a lib-owning wave.)
 */
function motionTokenMs(token: string): number {
  if (typeof document === 'undefined') return 0;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(token).trim();
  if (!raw.endsWith('ms')) return 0;
  const ms = parseFloat(raw);
  return Number.isFinite(ms) ? ms : 0;
}

/**
 * CountIn — the in-app data edition of the count-up reveal (first paint
 * only: mounts on the settled value and counts toward it; later value
 * changes render instantly; instant under prefers-reduced-motion).
 * Replicated from wave 4-a's DashboardPage per the wave 5-c mission —
 * extracting a shared hook would mean touching DashboardPage, which is
 * outside this wave's file scope. Same contract, same easing.
 */
function CountIn({ value, suffix = '' }: { value: number; suffix?: string }) {
  const reducedMotion = useReducedMotion();
  const [display, setDisplay] = useState(value);
  const settled = useRef(false);

  useEffect(() => {
    if (settled.current || reducedMotion || !Number.isFinite(value)) {
      setDisplay(value);
      if (!reducedMotion) settled.current = true;
      return;
    }
    // Mirrors --motion-duration-stat (700ms); 0 only when the token is
    // unreadable, in which case the division below settles on frame one.
    const duration = motionTokenMs('--motion-duration-stat') || 700;
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t;
      const p = Math.min((t - start) / duration, 1);
      const eased = 1 - Math.pow(1 - p, 4); // exponential ease-out
      setDisplay(value * eased);
      if (p < 1) raf = requestAnimationFrame(tick);
      else settled.current = true;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, reducedMotion]);

  // Fractional values (e.g. 4.2/5) keep one decimal, integers none —
  // the settled render matches the raw API value exactly.
  const decimals = Number.isInteger(value) ? 0 : 1;
  return (
    <>
      {formatNum(display, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </>
  );
}

/* ════════════════════════════════════════════════════════════════
   R190 (D4): the StatStrip's own shape-matched skeleton — the
   KpiSkeleton's .metric boxes swapped for the strip's real cells so
   the pending → resolved handoff moves nothing (the OwnerDashboard
   loading-closure pattern, in-page because the shared States module
   is outside this wave's file scope).
   ════════════════════════════════════════════════════════════════ */
function StatStripSkeleton({ cells = 3 }: { cells?: number }) {
  return (
    <div className="stat-strip" aria-busy="true">
      {Array.from({ length: cells }).map((_, i) => (
        <div key={i} className="stat-cell">
          <Skeleton width={70} height={11} />
          <div style={{ marginBlock: 'var(--sp-1)' }}>
            <Skeleton width={90} height={28} />
          </div>
          <Skeleton width={120} height={11} />
        </div>
      ))}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Quality Dashboard
   ════════════════════════════════════════════════════════════════ */
export function QualityDashboardPage() {
  const ov = useOverview();
  const eg = useEngagement();
  const al = useQualityAlerts();
  // Remounts each chart canvas when the light/dark theme flips.
  const themeKey = useChartThemeKey();

  // r299 (E item 7b): ONE header across pending/error/resolved — the
  // subtitle, meta line and read-only cue are payload-independent, so
  // every state carries the resolved copy. The former pending/error
  // subtitle «رؤية لحظية لسير العملية التعليمية في الجامعة.» was a
  // second, divergent string — the handoff moved text on load.
  const pageHeader = (
    <header className="page-header">
      <div className="page-title-block">
        {/* R305 Heron (§D): the sector brow opens the governance face. */}
        <QualityBrow />
        <h1 className="page-title">لوحة الجودة</h1>
        <p className="page-subtitle">
          بناء نظام تعليمي فعّال عبر تطوير الأداء الأكاديمي والإداري والتقني — وفقاً لمتطلبات الاعتماد المحلية والدولية.
        </p>
        <p className="page-header-meta">
          {formatDate(new Date(), { weekday: 'long', day: 'numeric', month: 'long' })} · قراءة لحظية للمؤشرات
        </p>
      </div>
      {/* r299 (E item 1): the sector's own read-only cue — the former
          gold ShieldCheck «وصول قراءة فقط» badge retired (gold is
          achievements-only per the token discipline). */}
      <div className="qlt-header-badges"><ReadOnlyBadge /></div>
    </header>
  );

  if (ov.isPending || eg.isPending) {
    return (
      <div className="page">
        <div className="hr-scope">
        {pageHeader}
        {/* r299 (E item 7a): the file's own StatStripSkeleton (five
            cells — the resolved strip's shape), not the inline twin. */}
        <StatStripSkeleton cells={5} />
        {/* 4C-b: the pending skeleton mirrors the resolved board shape
            (main: chart + KPI ledger · side: attendance + alerts) so the
            handoff moves nothing (the loading-closure discipline). */}
        <div className="qlt-board qlt-section">
          <div className="qlt-board-main">
            <Card><ChartSkeleton /></Card>
            <Card><ListSkeleton rows={5} /></Card>
          </div>
          <div className="qlt-board-side">
            <Card><ChartSkeleton height={180} /></Card>
            <Card><ListSkeleton rows={3} /></Card>
          </div>
        </div>
        </div>
      </div>
    );
  }
  if (ov.isError || !ov.data || eg.isError || !eg.data) {
    // r157 (6A9 #5): the early-error return keeps the page chrome
    // (.page + header + h1) — the retry used to land on a chrome-less
    // wall, so an API blip stripped the centre's bearings before the
    // retry offer. (QualityCourses below keeps its in-page ternary
    // below the header — chrome by construction.)
    // r299 (E item 9): page-level errors render the state BARE — the
    // untitled Card wrapper retired (one grammar across the sector:
    // bare under the header at page level, inside the section card
    // when the section owns the header chrome).
    return (
      <div className="page">
        <div className="hr-scope">
        {pageHeader}
        <ErrorState
          message="تعذَّر تحميل لوحة الجودة"
          error={ov.error ?? eg.error}
          onRetry={() => { ov.refetch(); eg.refetch(); }}
        />
        </div>
      </div>
    );
  }
  const d = ov.data;
  const e = eg.data;
  // Resolve chart colours/options during render so a theme flip (which
  // remounts the canvases via `key`) picks up fresh values — the old
  // module-level `const chartOpts = cartesianOptions()` froze at import time.
  const cc = chartColors();
  const opts = cartesianOptions();

  // 5-A8 P2-4 (chart honesty): a 100/0/0 distribution renders a solid
  // ring with zero analytical signal — degenerate distributions get
  // the honest ProgressBar form instead of the doughnut.
  const attendanceDominant = Math.max(
    e.attendance.presentRate,
    e.attendance.lateRate,
    e.attendance.absentRate,
  ) >= 97;

  // KPI bars — every value derives from a real payload field:
  //   · معدل الحضور / إكمال المحاضرات  ← /quality/engagement
  //   · معدل التسجيل                   ← enrollments ÷ totalStudents
  //   · البحوث المكتملة                ← /quality/overview papers (GRADED+PUBLISHED ÷ total)
  // (The old hardcoded 68/82/91 bars presented numbers no API provides.)
  const enrollmentRate = e.totalStudents > 0
    ? Math.min(100, (e.enrollments / e.totalStudents) * 100)
    : 0;
  const paperTotal = Object.values(d.papers).reduce((s, n) => s + (n ?? 0), 0);
  const paperDone = (d.papers.GRADED ?? 0) + (d.papers.PUBLISHED ?? 0);
  const paperProgress = paperTotal > 0 ? (paperDone / paperTotal) * 100 : 0;

  return (
    <div className="page">
      <div className="hr-scope">
      {pageHeader}

      {/* R189 — the typographic stat strip (was the grid-4 KPI tiles). */}
      <StatStrip
        ariaLabel="مؤشرات الجودة الأساسية"
        cells={[
          {
            label: 'الطلاب النشطون',
            value: <CountIn value={d.users.STUDENT ?? 0} />,
            trend: 'مسجَّل في النظام',
            trendTone: 'flat',
          },
          {
            label: 'هيئة التدريس',
            value: <CountIn value={d.users.TEACHER ?? 0} />,
            trend: 'أعضاء فاعلون',
            trendTone: 'flat',
            to: '/quality/professors',
          },
          {
            label: 'مقرّرات نشطة',
            value: <CountIn value={d.offerings} />,
            trend: countAr(d.lectures, ['محاضرة واحدة', 'محاضرتان', 'محاضرات', 'محاضرة']),
            trendTone: 'flat',
            to: '/quality/courses',
          },
          {
            label: 'معدل الحضور',
            value: <CountIn value={Math.round(e.attendance.presentRate)} suffix="%" />,
            trend: countAr(e.attendance.total, ['سجل واحد', 'سجلان', 'سجلات', 'سجلاً']),
            trendTone: e.attendance.presentRate >= 75 ? 'up' : e.attendance.presentRate >= 60 ? 'flat' : 'down',
            to: '/quality/courses?metric=attendance',
          },
          {
            label: 'بحوث مكتملة',
            value: `${Math.round(paperProgress)}%`,
            trend: paperTotal > 0 ? `${formatNum(paperDone)} من ${formatNum(paperTotal)} بحثًا` : 'لا بحوث بعد',
            trendTone: 'flat',
          },
        ]}
      />

      {/* 4C-b (Superlist board): ONE compact signal line (the stat strip)
          then the oversight board — main column = weekly activity chart +
          the honest KPI ledger; side rail = attendance mix + alerts.
          Charts stay ChartFrame-wrapped with their sr-only tables. */}
      <div className="qlt-board qlt-section">
        <div className="qlt-board-main">
          <Card
            title="النشاط الأسبوعي"
            subtitle={
              e.weeklyActiveEstimated
                ? 'عدد الجلسات اليومية النشطة على المنصة — منحنى تقديري لحدّة البيانات'
                : 'عدد الجلسات اليومية النشطة على المنصة'
            }
            icon={TrendingUp}
          >
          <ChartFrame
            ariaLabel={`مخطط خطّي للنشاط الأسبوعي — جلسات نشطة يومياً${e.weeklyActiveEstimated ? ' (منحنى تقديري)' : ''}`}
            summary={
              e.weeklyActive.length > 0
                ? `ذروة النشاط ${countAr(Math.max(...e.weeklyActive), ['جلسة واحدة', 'جلستان', 'جلسات', 'جلسة'])} يوم ${WEEKDAY_NAMES_AR[e.weeklyActive.indexOf(Math.max(...e.weeklyActive))] ?? ''}.`
                : 'لا بيانات نشاط لهذا الأسبوع.'
            }
            table={{
              caption: 'النشاط الأسبوعي — جلسات نشطة يومياً',
              columns: ['اليوم', 'جلسات'],
              rows: WEEKDAY_NAMES_AR.map((day, i) => [day, e.weeklyActive[i] ?? 0]),
            }}
            height={220}
          >
          <Line
            key={themeKey}
            aria-hidden="true"
            data={{
              labels: WEEKDAY_NAMES_AR,
              datasets: [{
                label: 'مستخدم نشط',
                data: e.weeklyActive,
                borderColor: cc.accent,
                backgroundColor: `color-mix(in srgb, ${cc.accent} 12%, transparent)`,
                tension: 0.4,
                fill: true,
                borderWidth: 2,
                pointRadius: 3,
                pointHoverRadius: 5,
                pointBackgroundColor: cc.accent,
                // 5-A8 P2-4 (chart honesty): the backend's deterministic
                // fallback is a binary square wave — smoothing it into a
                // curve invents a trend that isn't in the data. Estimated
                // series render as DOTS ONLY (no interpolation, no fill).
                ...(e.weeklyActiveEstimated ? { showLine: false, fill: false, pointRadius: 5, pointHoverRadius: 7 } : {}),
              }],
            }}
            options={opts}
          />
        </ChartFrame>
          </Card>

          {/* 4C-b: the honest KPI ledger — the four payload-derived
              progressbars as a calm list (hairline rows, mono tabular
              values, thin rails). Labels/values/aria contract unchanged
              (WS-F6 pins the four progressbar names). */}
          <Card title="مؤشرات الجودة الأساسية" icon={ShieldCheck}>
            <div className="qlt-kpi-ledger">
              <ProgressBar value={e.attendance.presentRate} label="معدل الحضور التراكمي" ariaLabel="معدل الحضور التراكمي" color="var(--success)" />
              <ProgressBar value={e.videos.completionRate} label="معدل إكمال المحاضرات" ariaLabel="معدل إكمال المحاضرات" color="var(--accent)" />
              <ProgressBar value={enrollmentRate} label="معدل تسجيل الطلاب في المقرّرات" ariaLabel="معدل تسجيل الطلاب في المقرّرات" color="var(--brand-purple)" />
              <ProgressBar value={paperProgress} label="نسبة البحوث المكتملة التقييم" ariaLabel="نسبة البحوث المكتملة التقييم" color="var(--gold)" />
            </div>
          </Card>
        </div>

        <div className="qlt-board-side">
          <Card title="توزيع الحضور" icon={ClipboardCheck}>
          {/* Degenerate distribution (5-A8 P2-4): one ProgressBar + the
              honest note beats a solid ring that carries no signal. */}
          {attendanceDominant ? (
            <div className="flex-col gap-4">
              <ProgressBar value={e.attendance.presentRate} label="حضور" ariaLabel="نسبة الحضور" color="var(--success)" />
              <p className="text-sm text-muted">
                تأخير <bdi>{Math.round(e.attendance.lateRate)}%</bdi> · غياب <bdi>{Math.round(e.attendance.absentRate)}%</bdi>
              </p>
              <p className="text-xs text-subtle">
                كل السجلات تقريباً بوضع واحد؛ يظهر المخطط الدائريّ فور تنوّع حالات الحضور.
              </p>
            </div>
          ) : (
          <ChartFrame
            ariaLabel={`توزيع الحضور: حضور ${Math.round(e.attendance.presentRate)}% وتأخر ${Math.round(e.attendance.lateRate)}% وغياب ${Math.round(e.attendance.absentRate)}%`}
            table={{
              caption: 'توزيع الحضور',
              columns: ['الحالة', 'النسبة'],
              rows: [
                ['حضور', Math.round(e.attendance.presentRate)],
                ['تأخر', Math.round(e.attendance.lateRate)],
                ['غياب', Math.round(e.attendance.absentRate)],
              ],
            }}
            height={220}
          >
            <Doughnut
              key={themeKey}
              aria-hidden="true"
              data={{
                labels: ['حضور', 'تأخر', 'غياب'],
                datasets: [{
                  data: [e.attendance.presentRate, e.attendance.lateRate, e.attendance.absentRate],
                  backgroundColor: [cc.success, cc.warning, cc.danger],
                  borderColor: cc.surface,
                  borderWidth: 2,
                }],
              }}
              options={radialOptions({ legend: true, cutout: '65%' })}
            />
          </ChartFrame>
          )}
          </Card>

          <Card title="تنبيهات الجودة" icon={AlertTriangle}>
          {al.isPending ? (
            <ListSkeleton rows={3} />
          ) : al.isError ? (
            /* r299 (E item 9): the shared ErrorState (retry built in) —
               the hand-rolled EmptyState + ghost buttons retired. The
               section Card keeps its header chrome (title/icon), so the
               state renders inside it (page-level errors render bare). */
            <ErrorState
              message="تعذّر تحميل التنبيهات"
              error={al.error}
              onRetry={() => void al.refetch()}
            />
          ) : !al.data || al.data.alerts.length === 0 ? (
            <EmptyState illustration="empty-notifications"
              icon={CheckCircle2}
              title="لا توجد تنبيهات"
              description="كل المؤشرات ضمن النطاق الطبيعي حالياً."
            />
          ) : (
            <>
              <div className="qlt-alert-list">
                {/* Server sorts critical-first; show the top 3 and link out. */}
                {al.data.alerts.slice(0, 3).map((a) => (
                  <AlertRow
                    key={a.id}
                    color={SEVERITY_TONE[a.severity]}
                    icon={CATEGORY_ICON[a.category]}
                    title={a.title}
                    description={a.description}
                    time={formatRelativeArShort(a.occurredAt)}
                  />
                ))}
              </div>
              <Link to="/quality/alerts" className="btn ghost sm hr-cta" style={{ marginTop: 'var(--sp-3)' }}>
                <Icon icon={ArrowLeft} size={13} />
                عرض كل التنبيهات
              </Link>
            </>
          )}
        </Card>
        </div>
      </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Quality Courses
   ════════════════════════════════════════════════════════════════ */
export function QualityCoursesPage() {
  // 5-B4 (5-A8 §5 row 11): ?metric=attendance|completion lands the roster
  // pre-filtered from the dashboard's KPIs — a new metric column sorted
  // worst-first (server), nulls rendered as honest «لا بيانات».
  const [searchParams, setSearchParams] = useSearchParams();
  const metricParam = searchParams.get('metric');
  const metric = metricParam === 'attendance' || metricParam === 'completion' ? metricParam : undefined;
  // r183-B5 (A8 wave-A P2-2 recurrence — the silent-capped roster): the
  // standard roster search (the AdminCoursesPage `q` contract) debounced
  // 300ms — the term runs SERVER-side (course name/code) and the count
  // line reads meta.total, so take:50 is a visible cap, never a silent
  // truncation. Real timers in tests (the AdminGovernancePages pattern).
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const appliedQ = useRef(debouncedQ);
  useEffect(() => {
    const t = setTimeout(() => {
      const next = q.trim();
      if (next === appliedQ.current) return;
      appliedQ.current = next;
      setDebouncedQ(next);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const clearSearch = () => {
    setQ('');
    setDebouncedQ('');
  };
  const c = useQualityCourses(metric, debouncedQ || undefined);
  const courses = c.data?.data;
  const total = c.data?.meta?.total;
  // r299 (E item 8): the professors roster's ≤1024 compact band, applied
  // to the courses table — the ?metric= drill reaches 8 columns and the
  // tablet band sideways-scrolled inside .table-wrap (the audit's
  // column-diet option). At ≤1024 the teacher folds under the course
  // identity and lectures+files merge into ONE «النشاط التعليميّ»
  // column (8 → 6). jsdom's matchMedia stub returns matches:false, so
  // unit tests keep exercising the desktop path (same contract as the
  // professors band hook).
  const compact = useCompactRosterBand();
  const metricLabel = metric === 'attendance' ? 'معدل الحضور' : 'إكمال المحاضرات';
  const metricValue = (o: QualityCourse): number | null | undefined =>
    metric === 'attendance' ? o.metrics?.attendanceRate : o.metrics?.completionRate;
  return (
    <div className="page">
      <div className="hr-scope">
      <header className="page-header">
        <div className="page-title-block">
          {/* R305 Heron (§D): the sector brow opens the governance face. */}
          <QualityBrow />
          <h1 className="page-title">جودة المقرّرات</h1>
          <p className="page-subtitle">
            {metric
              ? `${metricLabel} لكل مقرّر · مرتَّبة من الأدنى أولاً`
              : 'تتبّع جودة كل مقرّر: المحاضرات، الملفات، الواجبات، التسجيلات.'}
          </p>
        </div>
        {/* 4C-b: the oversight read-only cue (the sector has no authoring). */}
        <div className="qlt-header-badges">
          <ReadOnlyBadge />
        </div>
      </header>
      {c.isPending ? (
        <Card title="المقرّرات النشطة" icon={BookOpen}><TableSkeleton rows={4} cols={8} /></Card>
      ) :
       c.isError ? <ErrorState message="تعذّر تحميل قائمة المقرّرات" error={c.error} onRetry={() => c.refetch()} /> :
       !courses?.length ? <Card><EmptyState
         illustration="empty-list"
         icon={BookOpen}
         title={debouncedQ ? 'لا نتائج مطابقة' : 'لا توجد مقرّرات نشطة بعد'}
         description={debouncedQ
           ? 'لم نجد مقرّراً يطابق البحث — جرّب كلمة أوسع أو امسح البحث.'
           : 'ستظهر المقرّرات وعروضها الدراسية هنا فور اعتمادها وربطها بالفصل الحاليّ.'}
         action={debouncedQ ? (
           <button type="button" className="btn ghost sm" onClick={clearSearch}>
             <Icon icon={X} size={13} />
             مسح البحث
           </button>
         ) : undefined}
       /></Card> : (
        <Card
          title="المقرّرات النشطة"
          subtitle={total != null
            ? (
              /* R305 Heron (§D): the roster count line rides the §0
                 section-count chip (text unchanged — tests pin it). */
              <span className="hr-section-count">
                {`${countAr(total, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}${debouncedQ ? ' مطابقة للبحث' : ''}${courses && courses.length < total ? ` · تُعرض أول ${courses.length}` : ''}`}
              </span>
            )
            : undefined}
          icon={BookOpen}
          actions={metric ? (
            <button
              type="button"
              className="btn ghost sm"
              onClick={() => setSearchParams({})}
            >
              <Icon icon={X} size={13} />
              عرض الجدول الكامل
            </button>
          ) : undefined}
        >
          {/* R304: the roster search chrome — now the family-owned
              .tq-toolbar/.tq-search pill (migrated off the borrowed
              admin-students-* chrome) wired to the debounced
              server-side `q`. R305 Heron (§D): .hr-toolbar joins for
              the one placement grammar. */}
          <div className="tq-toolbar hr-toolbar">
            <div className="tq-search">
              <Icon icon={Search} size={14} />
              <input
                type="search"
                placeholder="ابحث بالاسم أو الكود…"
                value={q}
                onChange={(e) => setQ(e.target.value)}
                className="tq-search-input"
                aria-label="البحث في المقرّرات"
              />
            </div>
          </div>
          {/* tbl-stack (A8 P1-1): the roster collapses to labelled cards
              on phones — same .table-wrap > .table.tbl-stack pattern as
              every admin roster (OwnerUsersPage reference). 4C-b: the
              page-scoped qlt-table restyle keeps the ONE shared DOM —
              mono tabular metric columns, identity cell (name + code)
              leading. R305 Heron (§D): .hr-table layers the filled
              header + denser hairline rows over the shared recipe. */}
          <div className="table-wrap">
            <table className="table tbl-stack qlt-table hr-table">
              <thead>
                <tr>
                  <th scope="col">المقرّر</th>
                  {!compact && <th scope="col">الأستاذ</th>}
                  <th scope="col">الفصل</th>
                  <th scope="col">الطلاب</th>
                  {!compact && <th scope="col">المحاضرات</th>}
                  {!compact && <th scope="col">الملفات</th>}
                  {compact && (
                    <th scope="col" title="محاضرات المقرّر وملفاته المرفوعة">النشاط التعليميّ</th>
                  )}
                  {metric && <th scope="col" className="tbl-num">{metricLabel}</th>}
                  {/* A8 P2-4: this is an estimated completion index, not
                      a measured “quality” — renamed + weights surfaced so
                      the number names its own formula. */}
                  <th scope="col" title="تقدير اكتمال المحتوى: كل محاضرة 20 نقطة، كل ملف 5، كل واجب 10 — بحدّ أقصى 100">اكتمال المحتوى</th>
                </tr>
              </thead>
              <tbody>
                {courses!.map((o) => {
                  const score = Math.min(100, o._count.lectures * 20 + o._count.materials * 5 + o._count.assignments * 10);
                  // Score 0 = no content yet — a neutral state, never a
                  // danger register (A8 P2-4: red “0%” spent the danger
                  // color on “no data”). r299 (E item 6): typed tones —
                  // the `as never` casts retired. R305 Heron (§D): the
                  // bands ride the .hr-chip vocabulary verbatim.
                  const tone = completionChipTone(score);
                  const mv = metric ? metricValue(o) : undefined;
                  return (
                    <tr key={o.id}>
                      <td className="tbl-strong" data-label="المقرّر">
                        {/* 4C-b: identity leads — name prominent, Latin
                            code bidi-isolated under it. r299 (E item 8):
                            at ≤1024 the teacher folds under the identity
                            (the professors band's rank fold). */}
                        <div className="qlt-course-name">{o.course.name}</div>
                        <div className="qlt-course-code"><bdi>{o.course.code}</bdi></div>
                        {compact && (
                          <div className="text-xxs text-subtle">د. {o.teacher.firstName} {o.teacher.lastName}</div>
                        )}
                      </td>
                      {!compact && <td data-label="الأستاذ">د. {o.teacher.firstName} {o.teacher.lastName}</td>}
                      <td className="font-mono text-xs" data-label="الفصل"><bdi>{o.term}</bdi></td>
                      <td className="tbl-num" data-label="الطلاب">{o._count.enrollments}</td>
                      {!compact ? (
                        <>
                          <td className="tbl-num" data-label="المحاضرات">{o._count.lectures}</td>
                          <td className="tbl-num" data-label="الملفات">{o._count.materials}</td>
                        </>
                      ) : (
                        <td data-label="النشاط التعليميّ">
                          <div>{countAr(o._count.lectures, ['محاضرة واحدة', 'محاضرتان', 'محاضرات', 'محاضرة'])}</div>
                          <div className="text-xxs text-subtle">{countAr(o._count.materials, ['ملف واحد', 'ملفان', 'ملفات', 'ملفاً'])}</div>
                        </td>
                      )}
                      {metric && (
                        <td className="tbl-num" data-label={metricLabel}>
                          {mv == null
                            ? <span className="hr-chip">لا بيانات</span>
                            : <span className="hr-chip" data-tone={completionChipTone(mv)}><bdi>{Math.round(mv)}%</bdi></span>}
                        </td>
                      )}
                      <td data-label="اكتمال المحتوى">
                        {score === 0
                          ? <span className="hr-chip">لا محتوى بعد</span>
                          : <span className="hr-chip" data-tone={tone}>{score}%</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Professor Evaluation
   ════════════════════════════════════════════════════════════════ */

/**
 * ≤1024px band (5-A8 P2-2): the 8-column roster sideways-scrolled
 * 164px at 768 (and still 28px at 1024) because .tbl-stack only arms
 * at ≤640. The audit's column-diet option, implemented TSX-side: at
 * ≤1024 the rank folds under the name and the files count joins the
 * courses count (8 → 6 columns, ~665px — fits the 666px wrap at 768).
 * jsdom's matchMedia stub returns matches:false, so unit tests keep
 * exercising the desktop path (same contract as GlobalSearch's band
 * hook).
 */
function useCompactRosterBand(): boolean {
  const [compact, setCompact] = useState(
    () => typeof window !== 'undefined'
      && typeof window.matchMedia === 'function'
      && window.matchMedia('(max-width: 1024px)').matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia('(max-width: 1024px)');
    const onChange = () => setCompact(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return compact;
}

export function QualityProfessorsPage() {
  // r183-B5 (A8 wave-A P2-2 recurrence): the standard roster search (the
  // AdminCoursesPage `q` contract, debounced 300ms) — the term runs
  // SERVER-side (first/last name) and the roster count reads meta.total
  // (count before take:100), so the cap is visible, never silent.
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const appliedQ = useRef(debouncedQ);
  useEffect(() => {
    const t = setTimeout(() => {
      const next = q.trim();
      if (next === appliedQ.current) return;
      appliedQ.current = next;
      setDebouncedQ(next);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);
  const clearSearch = () => {
    setQ('');
    setDebouncedQ('');
  };
  const p = useProfessors(debouncedQ || undefined);
  // 5-B4 (5-A8 §5 row 12 — client filter): «بحاجة لمتابعة» filters the
  // roster to compliance < 50% instead of dead-ending on the count.
  const [lowOnly, setLowOnly] = useState(false);
  const compact = useCompactRosterBand();
  if (p.isPending) {
    return (
      <div className="page">
        <div className="hr-scope">
        <header className="page-header">
          <div className="page-title-block">
            {/* R305 Heron (§D): the sector brow. */}
            <QualityBrow />
            <h1 className="page-title">تقييم الأساتذة</h1>
            <p className="page-subtitle">رضا الطلاب، معدل الاستجابة، الالتزام بمعايير المنصة.</p>
          </div>
          <div className="qlt-header-badges"><ReadOnlyBadge /></div>
        </header>
        <StatStripSkeleton cells={3} />
        <Card title="هيئة التدريس" icon={School}><TableSkeleton rows={5} cols={8} /></Card>
        </div>
      </div>
    );
  }
  // r157 (6A9 #5): same chrome-keeping discipline as the dashboard —
  // the early-error return wraps .page + header + h1 so the retry sits
  // inside the page the specialist landed on, not a chrome-less wall.
  // r299 (E item 9): the state renders BARE (the untitled Card wrapper
  // retired — one page-level error grammar across the sector).
  if (p.isError || !p.data) {
    return (
      <div className="page">
        <div className="hr-scope">
        <header className="page-header">
          <div className="page-title-block">
            {/* R305 Heron (§D): the sector brow. */}
            <QualityBrow />
            <h1 className="page-title">تقييم الأساتذة</h1>
            <p className="page-subtitle">رضا الطلاب، معدل الاستجابة، الالتزام بمعايير المنصة.</p>
          </div>
          <div className="qlt-header-badges"><ReadOnlyBadge /></div>
        </header>
        <ErrorState message="تعذّر تحميل قائمة الأساتذة" error={p.error} onRetry={() => p.refetch()} />
        </div>
      </div>
    );
  }

  const professors = p.data.data;
  const total = p.data.meta?.total;
  const avgSat = professors.length ? professors.reduce((s, t) => s + t.satisfaction, 0) / professors.length : 0;
  const avgResp = professors.length ? professors.reduce((s, t) => s + t.responseHours, 0) / professors.length : 0;
  const lowComp = professors.filter((t) => t.compliance < 50).length;
  const visible = lowOnly ? professors.filter((t) => t.compliance < 50) : professors;
  const searching = debouncedQ !== '';

  return (
    <div className="page">
      <div className="hr-scope">
      <header className="page-header">
        <div className="page-title-block">
          {/* R305 Heron (§D): the sector brow. */}
          <QualityBrow />
          <h1 className="page-title">تقييم الأساتذة</h1>
          <p className="page-subtitle">
            رضا الطلاب، معدل الاستجابة، الالتزام بمعايير المنصة.
            {p.data.data.some((t) => t.satisfactionEstimated || t.responseHoursEstimated)
              ? ' رضا الطلاب وزمن الاستجابة قيم تقديرية حتى تفعيل قياسها الفعلي.'
              : ''}
          </p>
        </div>
        <div className="qlt-header-badges"><ReadOnlyBadge /></div>
      </header>

      {/* R190 (D4): the typographic stat strip — was the grid-3
          icon-tile band (the audit's "identical icon-box grid" read).
          The «بحاجة لمتابعة» cell stays a stat; its roster FILTER
          affordance moved down into the toolbar as a pressed pill
          (the filter belongs beside the search — the pinned toggle
          contract lives there now). */}
      <StatStrip
        ariaLabel="مؤشرات هيئة التدريس"
        cells={[
          {
            label: 'متوسط رضا الطلاب',
            value: <CountIn value={Math.round(avgSat * 10) / 10} />,
            trend: 'من 5.0',
            trendTone: 'flat',
          },
          {
            label: 'متوسط الاستجابة',
            value: <CountIn value={Math.round(avgResp)} suffix=" س" />,
            trend: 'على رسائل الطلاب',
            trendTone: 'flat',
          },
          {
            label: 'بحاجة لمتابعة',
            value: <CountIn value={lowComp} />,
            trend: 'التزام أقلّ من 50%',
            trendTone: lowComp > 0 ? 'down' : 'flat',
          },
        ]}
      />

      {/* 5-A8 §6 step 6 (rhythm): the roster is the page's primary
          section — it takes the breath after the KPI band (the
          .qlt-section rung replaces the former inline margin). */}
      <Card
        className="qlt-section"
        title={lowOnly ? `هيئة التدريس · بحاجة لمتابعة (${lowComp})` : 'هيئة التدريس'}
        subtitle={total != null
          ? (
            /* R305 Heron (§D): the count line rides the §0
               section-count chip (text unchanged — tests pin it). */
            <span className="hr-section-count">
              {`${countAr(total, ['أستاذ واحد', 'أستاذان', 'أساتذة', 'أستاذاً'])}${searching ? ' مطابقة للبحث' : ''}${professors.length < total ? ` · تُعرض أول ${professors.length}` : ''}`}
            </span>
          )
          : undefined}
        icon={School}
      >
        {/* R304: the roster search chrome — the family-owned
            .tq-toolbar/.tq-search pill (migrated off the borrowed
            admin-students-* chrome) wired to the debounced server-side
            `q`, plus R190 (D4): the «بحاجة لمتابعة» filter as a pressed
            pill — the former icon-tile KPI toggle, now where filters
            live. r299 (E item 5): the toolbar stays up even when the
            roster is empty (searched or not) — a fresh institution
            reads an honest empty state below, never a header-only
            table. R305 Heron (§D): .hr-toolbar joins for the one
            placement grammar; the pressed pill reads the ember. */}
        <div className="tq-toolbar hr-toolbar">
          <div className="tq-search">
            <Icon icon={Search} size={14} />
            <input
              type="search"
              placeholder="ابحث باسم الأستاذ…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="tq-search-input"
              aria-label="البحث في الأساتذة"
            />
          </div>
          {lowComp > 0 && (
            <button
              type="button"
              className={`filter-pill${lowOnly ? ' on' : ''}`}
              aria-pressed={lowOnly}
              onClick={() => setLowOnly((v) => !v)}
              title={lowOnly ? 'عرض جميع الأساتذة' : 'عرض الأساتذة بحاجة لمتابعة فقط'}
            >
              بحاجة لمتابعة
              <span className="filter-pill-count">{lowComp}</span>
            </button>
          )}
        </div>
        {professors.length === 0 ? (
          searching ? (
            <EmptyState
              illustration="empty-search"
              icon={School}
              title="لا نتائج مطابقة"
              description="لم نجد أستاذاً يطابق البحث — جرّب اسمًا آخر أو امسح البحث."
              action={(
                <button type="button" className="btn ghost sm" onClick={clearSearch}>
                  <Icon icon={X} size={13} />
                  مسح البحث
                </button>
              )}
            />
          ) : (
            /* r299 (E item 5): zero professors, no search — the honest
               zero-state (the old page rendered a toolbar-less,
               header-only empty table for a fresh institution). */
            <EmptyState
              illustration="empty-list"
              icon={School}
              title="لا أساتذة بعد"
              description="ستظهر هيئة التدريس ومؤشراتها هنا فور إضافة أعضائها إلى المؤسسة."
            />
          )
        ) : (
          <>
        {lowOnly && (
          <div className="qlt-filter-note">
            {/* R305 Heron (§D): the filter state rides the chip lexicon. */}
            <span className="hr-chip" data-tone="danger">مصفّى: التزام أقلّ من 50%</span>
            <button type="button" className="btn ghost sm" onClick={() => setLowOnly(false)}>
              <Icon icon={X} size={13} />
              عرض جميع الأساتذة
            </button>
          </div>
        )}
        {/* tbl-stack (A8 P1-1): 8 columns sideways-scrolled 524px at
            390px — the roster now collapses to labelled cards like the
            admin siblings. At ≤1024 the compact diet (above) keeps the
            tablet band inside the wrap. R305 Heron (§D): .hr-table
            layers the filled header + denser hairline rows. */}
        <div className="table-wrap">
          <table className="table tbl-stack qlt-roster hr-table">
            <thead>
              <tr>
                <th scope="col">الأستاذ</th>
                <th scope="col">الكلّيّة / القسم</th>
                {!compact && <th scope="col">الرتبة</th>}
                {!compact ? <th scope="col">المقرّرات</th> : <th scope="col" title="المقرّرات التي يدرّسها والملفات المرفوعة">النشاط التعليميّ</th>}
                {!compact && <th scope="col">الملفات المرفوعة</th>}
                <th scope="col" title="قيمة تقديرية — ليست قياساً فعلياً حتى تفعيل استطلاعات الطلاب">رضا الطلاب <span className="text-xxs text-subtle">تقديري</span></th>
                <th scope="col" title="قيمة تقديرية — ليست قياساً فعلياً حتى تفعيل قياس أزمنة الردّ">زمن الاستجابة <span className="text-xxs text-subtle">تقديري</span></th>
                <th scope="col">الالتزام</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => {
                // r299 (E item 6): the typed compliance band (75/50) —
                // the `as never` cast retired. R305 Heron (§D): the
                // band rides the .hr-chip vocabulary verbatim.
                const compTone = complianceChipTone(t.compliance);
                return (
                  <tr key={t.id}>
                    <td data-label="الأستاذ">
                      <div className="flex items-center gap-2">
                        {/* r187 (a11y): was a hand-rolled .avatar div — the
                            twin of the AdminExtraPages fix: bypassed
                            avatarInk, so grey grounds measured 3.91:1
                            (--accent-fg). UserAvatar gates the ink; the
                            undefined-color fallback keeps the accent
                            ground via the CSS pair (accent/accent-fg). */}
                        <UserAvatar size={28} initials={t.avatarInitials ?? `${t.firstName[0] ?? ''}${t.lastName[0] ?? ''}`} color={t.avatarColor ?? undefined} />
                        <div>
                          <div className="tbl-strong">د. {t.firstName} {t.lastName}</div>
                          <div className="text-xxs text-subtle">
                            {compact
                              ? `${RANK_LABEL[t.rank] ?? t.rank} · ${t.specialty}`
                              : t.specialty}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td data-label="الكلّيّة / القسم">
                      <div>{t.faculty}</div>
                      <div className="text-xxs text-subtle">{t.department}</div>
                    </td>
                    {!compact && <td data-label="الرتبة"><span className="hr-chip">{RANK_LABEL[t.rank] ?? t.rank}</span></td>}
                    {!compact ? (
                      <td className="tbl-num" data-label="المقرّرات">{t.offerings}</td>
                    ) : (
                      <td data-label="النشاط التعليميّ">
                        <div>{countAr(t.offerings, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}</div>
                        <div className="text-xxs text-subtle">{countAr(t.totals.materials, ['ملف واحد', 'ملفان', 'ملفات', 'ملفاً'])}</div>
                      </td>
                    )}
                    {!compact && <td className="tbl-num" data-label="الملفات المرفوعة">{t.totals.materials}</td>}
                    {/* r299 (E item 6): the estimated metrics ride the
                        unified numeral surface — satisfaction keeps its
                        one-decimal 0-5 scale (the KPI band's «من 5.0»
                        convention), and the response time reads as a
                        counted noun instead of the clipped «6س». */}
                    <td className="tbl-num" data-label="رضا الطلاب" style={{ color: 'var(--gold-ink, var(--c-yellow-deep))' }}><Icon icon={Star} size={14} /> {formatNum(t.satisfaction, { maximumFractionDigits: 1 })}</td>
                    <td className="tbl-num" data-label="زمن الاستجابة">{countAr(t.responseHours, ['ساعة', 'ساعتين', 'ساعات', 'ساعة'])}</td>
                    <td data-label="الالتزام">
                      <div className="q-compliance">
                        <ProgressBar value={t.compliance} showValue={false} ariaLabel={`التزام د. ${t.firstName} ${t.lastName}`} />
                        <span className="hr-chip" data-tone={compTone}>{formatPct1(t.compliance)}%</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
          </>
        )}
      </Card>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Engagement & Attendance
   ════════════════════════════════════════════════════════════════ */
export function QualityEngagementPage() {
  const e = useEngagement();
  // Remounts the chart canvas when the light/dark theme flips.
  const themeKey = useChartThemeKey();
  // Page chrome stays up in every state — loading and error keep the
  // header (audit 0-e P2-39: siblings must not drop it mid-load).
  const pageHeader = (
    <header className="page-header">
      <div className="page-title-block">
        {/* R305 Heron (§D): the sector brow. */}
        <QualityBrow />
        <h1 className="page-title">الانخراط والحضور</h1>
        <p className="page-subtitle">نسب الحضور، إكمال المحاضرات، النقاط المتفاعلة.</p>
      </div>
      <div className="qlt-header-badges"><ReadOnlyBadge /></div>
    </header>
  );
  if (e.isPending) {
    return (
      <div className="page">
        <div className="hr-scope">
        {pageHeader}
        <StatStripSkeleton cells={4} />
        <div className="grid-2-1">
          <Card><ChartSkeleton height={240} /></Card>
          <Card><ListSkeleton rows={3} /></Card>
        </div>
        </div>
      </div>
    );
  }
  if (e.isError || !e.data) {
    return (
      <div className="page">
        <div className="hr-scope">
        {pageHeader}
        {/* r299 (E item 9): the sector's ONE page-level error grammar —
            bare ErrorState with a specific message, under the header. */}
        <ErrorState message="تعذّر تحميل مؤشرات الانخراط" error={e.error} onRetry={() => void e.refetch()} />
        </div>
      </div>
    );
  }
  const d = e.data;
  const cc = chartColors();
  const opts = cartesianOptions();

  const enrollmentRate = d.totalStudents > 0 ? Math.min(100, (d.enrollments / d.totalStudents) * 100) : 0;
  // Empty weeklyActive (backend edge) must read as an honest dash,
  // never as NaN (audit 0-e P2-39).
  const weeklyAvg = d.weeklyActive.length > 0
    ? Math.round(d.weeklyActive.reduce((a, b) => a + b, 0) / d.weeklyActive.length)
    : null;
  const peak = d.weeklyActive.length > 0 ? Math.max(...d.weeklyActive) : null;

  return (
    <div className="page">
      <div className="hr-scope">
      {pageHeader}

      <StatStrip
        ariaLabel="مؤشرات الانخراط"
        cells={[
          {
            label: 'معدل الحضور',
            value: <CountIn value={Math.round(d.attendance.presentRate)} suffix="%" />,
            trend: countAr(d.attendance.total, ['سجل واحد', 'سجلان', 'سجلات', 'سجلاً']),
            trendTone: d.attendance.presentRate >= 75 ? 'up' : d.attendance.presentRate >= 60 ? 'flat' : 'down',
            to: '/quality/courses?metric=attendance',
          },
          {
            label: 'إكمال المحاضرات',
            value: <CountIn value={Math.round(d.videos.completionRate)} suffix="%" />,
            trend: countAr(d.videos.completedLectures, ['محاضرة مكتملة', 'محاضرتان مكتملتان', 'محاضرات مكتملة', 'محاضرة مكتملة']),
            trendTone: 'flat',
            to: '/quality/courses?metric=completion',
          },
          {
            label: 'معدل التسجيل',
            value: <CountIn value={Math.round(enrollmentRate)} suffix="%" />,
            trend: countAr(d.enrollments, ['تسجيل واحد', 'تسجيلان', 'تسجيلات', 'تسجيلاً']),
            trendTone: 'flat',
          },
          {
            label: 'متوسط النشاط الأسبوعي',
            value: weeklyAvg === null ? '—' : <CountIn value={weeklyAvg} />,
            trend: 'مستخدم/يوم',
            trendTone: 'flat',
          },
        ]}
      />

      {/* 5-A8 §6 step 6 (rhythm): the charts row is the page's breathing
          section after the tight KPI band (the .qlt-section rung — the
          same rhythm the quality dashboard's board carries). */}
      <div className="grid-2-1 qlt-section">
        <Card
          title="النشاط الأسبوعي"
          icon={TrendingUp}
          subtitle={d.weeklyActiveEstimated ? 'عدد الجلسات اليومية النشطة · بيانات تقديرية لحدّة النشاط المسجَّل' : undefined}
        >
          <ChartFrame
            ariaLabel="مخطط أعمدة للنشاط الأسبوعي — عدد الجلسات النشطة يومياً"
            summary={
              peak !== null
                ? `ذروة النشاط ${countAr(peak, ['جلسة نشطة واحدة', 'جلستان نشطتان', 'جلسات نشطة', 'جلسة نشطة'])}.`
                : 'لا بيانات نشاط لهذا الأسبوع.'
            }
            table={{
              caption: 'النشاط الأسبوعي — جلسات نشطة يومياً',
              columns: ['اليوم', 'جلسات'],
              rows: WEEKDAY_NAMES_AR.map((day, i) => [day, d.weeklyActive[i] ?? 0]),
            }}
            height={240}
          >
            <Bar
              key={themeKey}
              aria-hidden="true"
              data={{
                labels: WEEKDAY_NAMES_AR,
                datasets: [{
                  label: 'نشاط يومي',
                  data: d.weeklyActive,
                  backgroundColor: cc.accent,
                  borderRadius: 6,
                  borderSkipped: false,
                }],
              }}
              options={opts}
            />
          </ChartFrame>
        </Card>

        <Card title="تحليل المشاهدة" icon={Activity}>
          {/* 4C-b: the payload-derived bars as a calm ledger list. */}
          <div className="qlt-progress-list">
            <ProgressBar value={d.videos.completionRate} label="معدل الإكمال" ariaLabel="معدل إكمال المحاضرات" color="var(--accent)" />
            <ProgressBar value={(d.videos.completedLectures / Math.max(d.videos.totalLectures, 1)) * 100} label="نسبة المحاضرات المكتملة" ariaLabel="نسبة المحاضرات المكتملة" color="var(--success)" />
            <ProgressBar value={d.attendance.absentRate} label="نسبة الغياب" ariaLabel="نسبة الغياب" color="var(--danger)" />
          </div>
        </Card>
      </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Curriculum Review — completion heatmap
   ════════════════════════════════════════════════════════════════ */

type CurriculumCourse = FacultyTree['departments'][number]['courses'][number];
type CurriculumLevel = 'strong' | 'weak' | 'poor';

/** Content-completion score per course (lectures/materials/concepts). */
function courseCompletion(co: CurriculumCourse): number {
  const lectures = co.offerings.reduce((s, o) => s + o._count.lectures, 0);
  const materials = co.offerings.reduce((s, o) => s + o._count.materials, 0);
  return Math.min(100, lectures * 18 + materials * 5 + co._count.concepts * 4);
}
function completionLevel(pct: number): CurriculumLevel {
  if (pct >= 70) return 'strong';
  if (pct >= 40) return 'weak';
  return 'poor';
}
const LEVEL_LABEL: Record<CurriculumLevel | 'all', string> = {
  all: 'الكل',
  strong: 'مكتمل',
  weak: 'جزئي',
  poor: 'متأخر',
};
const LEVEL_LEGEND: Record<CurriculumLevel, string> = {
  strong: 'مكتمل — 70% فأكثر',
  weak: 'جزئي — 40 إلى 69%',
  poor: 'متأخر — أقلّ من 40%',
};

export function QualityCurriculumPage() {
  const c = useCurriculum();
  // Level filter — declared BEFORE the early returns so the hook order
  // is stable across the pending → data transition.
  const [level, setLevel] = useState<CurriculumLevel | 'all'>('all');
  // Page chrome stays up in every state (audit 0-e P2-39).
  const pageHeader = (
    <header className="page-header">
      <div className="page-title-block">
        {/* R305 Heron (§D): the sector brow. */}
        <QualityBrow />
        <h1 className="page-title">مراجعة المناهج</h1>
        <p className="page-subtitle">شجرة الكلّيّات والأقسام والمقرّرات، مع مؤشرات اكتمال المحتوى.</p>
      </div>
      <div className="qlt-header-badges"><ReadOnlyBadge /></div>
    </header>
  );
  if (c.isPending) {
    return (
      <div className="page">
        <div className="hr-scope">
        {pageHeader}
        <CardSkeleton lines={2} />
        <Card>
          {/* 5-C3 (A9 P2-5): the placeholder carries the primitives-family
              busy semantics (bars stay aria-hidden). 4C-b: the bars are
              row-shaped now — the resolved surface is a course-row list,
              so the handoff moves nothing. */}
          <div className="qlt-course-rows" aria-busy="true" aria-live="polite">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} width="100%" height={56} />
            ))}
          </div>
        </Card>
        </div>
      </div>
    );
  }
  if (c.isError || !c.data) {
    return (
      <div className="page">
        <div className="hr-scope">
        {pageHeader}
        {/* r299 (E item 9): the sector's ONE page-level error grammar —
            bare ErrorState with a specific message, under the header. */}
        <ErrorState message="تعذّر تحميل شجرة المناهج" error={c.error} onRetry={() => void c.refetch()} />
        </div>
      </div>
    );
  }

  // Real per-level counts across the whole tree (drives the pills).
  const levelCounts: Record<CurriculumLevel, number> = { strong: 0, weak: 0, poor: 0 };
  for (const f of c.data) {
    for (const d of f.departments) {
      for (const co of d.courses) levelCounts[completionLevel(courseCompletion(co))] += 1;
    }
  }
  const total = levelCounts.strong + levelCounts.weak + levelCounts.poor;

  return (
    <div className="page">
      <div className="hr-scope">
      {pageHeader}

      {/* Filter + legend — the pills reuse the shared .filter-pill
          segmented-control family; rows dim (not disappear) so the
          roster stays whole while filtering (4C-b keeps the matrix
          page's dim-in-place contract on the row list). R305 Heron
          (§D): .hr-toolbar joins for the one placement grammar, and a
          pressed pill reads the ember. */}
      <Card>
        <div className="filter-pill-row hr-toolbar" role="group" aria-label="تصفية المقرّرات بحسب نسبة اكتمال المحتوى">
          <button
            type="button"
            className="filter-pill"
            aria-pressed={level === 'all'}
            onClick={() => setLevel('all')}
          >
            {LEVEL_LABEL.all}
            <span className="filter-pill-count">{total}</span>
          </button>
          {(['strong', 'weak', 'poor'] as const).map((key) => (
            <button
              key={key}
              type="button"
              className="filter-pill"
              aria-pressed={level === key}
              onClick={() => setLevel(key)}
              disabled={levelCounts[key] === 0}
            >
              {LEVEL_LABEL[key]}
              <span className="filter-pill-count">{levelCounts[key]}</span>
            </button>
          ))}
        </div>
        <div className="heat-legend">
          {(['strong', 'weak', 'poor'] as const).map((key) => (
            <span key={key} className="heat-legend-key">
              <span className={`heat-legend-dot ${key === 'strong' ? 'lvl-strong' : key === 'weak' ? 'lvl-weak' : 'lvl-poor'}`} />
              {LEVEL_LEGEND[key]}
            </span>
          ))}
        </div>
      </Card>

      <div className="flex-col gap-4">
        {c.data.map((f) => (
          <Card key={f.id} title={f.name} icon={Building2}
            subtitle={`${countAr(f.departments.length, ['قسم واحد', 'قسمان', 'أقسام', 'قسماً'])} · ${countAr(f.departments.reduce((s, d) => s + d.courses.length, 0), ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}`}>
            <div className="flex-col gap-4">
              {f.departments.map((d) => {
                const completions = d.courses.map((co) => courseCompletion(co));
                const deptAvg = completions.length > 0
                  ? Math.round(completions.reduce((s, v) => s + v, 0) / completions.length)
                  : null;
                return (
                  <div key={d.id}>
                    <div className="section-title">{d.name}</div>
                    {!d.courses.length ? (
                      <div className="qlt-empty-note">لا مقرّرات</div>
                    ) : (
                      <>
                        <div className="q-dept-stat">
                          <span>{countAr(d.courses.length, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}</span>
                          <span>متوسط الاكتمال <bdi>{deptAvg}%</bdi></span>
                        </div>
                        {/* 4C-b: the heatmap retires for oversight ROWS —
                            identity leading (name + mono code), the honest
                            content detail as visible text (was a title-only
                            tooltip), mono tabular percentage + level chip
                            trailing, and a thin completion rail under each
                            row. Filtered-out rows dim via .is-dim. R305
                            Heron (§D): the row wears the §0 severity edge
                            (poor→overdue danger, weak→soon warning, strong
                            rides transparent) and the level chip rides
                            the .hr-chip lexicon. */}
                        <div className="qlt-course-rows">
                          {d.courses.map((co) => {
                            const completion = courseCompletion(co);
                            const lvl = completionLevel(completion);
                            const lectures = co.offerings.reduce((s, o) => s + o._count.lectures, 0);
                            const materials = co.offerings.reduce((s, o) => s + o._count.materials, 0);
                            return (
                              <div
                                key={co.id}
                                className={`qlt-course-row hr-edge${level !== 'all' && lvl !== level ? ' is-dim' : ''}`}
                                data-severity={lvl === 'poor' ? 'overdue' : lvl === 'weak' ? 'soon' : undefined}
                              >
                                <div className="qlt-course-main">
                                  <div className="qlt-course-title">
                                    {co.name}
                                    <bdi className="qlt-course-code">{co.code}</bdi>
                                  </div>
                                  <div className="qlt-course-meta">
                                    {countAr(lectures, ['محاضرة واحدة', 'محاضرتان', 'محاضرات', 'محاضرة'])}
                                    {' · '}
                                    {countAr(materials, ['ملف واحد', 'ملفان', 'ملفات', 'ملفاً'])}
                                    {' · '}
                                    {countAr(co._count.concepts, ['مفهوم واحد', 'مفهومان', 'مفاهيم', 'مفهوماً'])}
                                  </div>
                                </div>
                                <div className="qlt-course-side">
                                  <span className="qlt-course-pct"><bdi>{formatPct1(completion)}%</bdi></span>
                                  <span className="hr-chip" data-tone={lvl === 'strong' ? 'ok' : lvl === 'weak' ? 'warn' : 'danger'}>
                                    {LEVEL_LABEL[lvl]}
                                  </span>
                                </div>
                                <ProgressBar
                                  value={completion}
                                  showValue={false}
                                  ariaLabel={`اكتمال ${co.name}`}
                                  color={lvl === 'strong' ? 'var(--success)' : lvl === 'weak' ? 'var(--warning)' : 'var(--danger)'}
                                />
                              </div>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Reports — honest landing for institutional dashboards
   ════════════════════════════════════════════════════════════════ */
/** The reports directory — one link-row list (5-B4 rhythm pass: the old
 *  grid of four identical link-cards was the audit's "identical-grid
 *  read"; the .alert row family gives each entry a full-width target). */
const QUALITY_DASHBOARDS: Array<{
  to: string;
  icon: LucideIcon;
  title: string;
  desc: string;
}> = [
  {
    to: '/quality/courses',
    icon: BookOpen,
    title: 'جودة المقرّرات',
    desc: 'كل عرض دراسيّ: التسجيلات، المحتوى، اكتمال التقييم.',
  },
  {
    to: '/quality/professors',
    icon: School,
    title: 'تقييم الأساتذة',
    desc: 'رضا الطلاب، زمن الاستجابة، والالتزام بمعايير المنصة لكل عضو هيئة تدريس.',
  },
  {
    to: '/quality/engagement',
    icon: Activity,
    title: 'الانخراط والحضور',
    desc: 'نسب الحضور والغياب، إكمال المحاضرات، النشاط الأسبوعي.',
  },
  {
    to: '/quality/curriculum',
    icon: ListChecks,
    title: 'مراجعة المناهج',
    desc: 'نسبة اكتمال المحتوى الرقميّ عبر الكلّيّات والأقسام.',
  },
];

export function QualityReportsPage() {
  return (
    <div className="page">
      <div className="hr-scope">
      <header className="page-header">
        <div className="page-title-block">
          {/* R305 Heron (§D): the sector brow. */}
          <QualityBrow />
          <h1 className="page-title">تقارير الجودة</h1>
          <p className="page-subtitle">لوحات حيّة بدلاً من تقارير ثابتة — تُحدَّث مع كل عمليّة على المنصّة.</p>
        </div>
        <div className="qlt-header-badges"><ReadOnlyBadge /></div>
      </header>

      {/* 4C-b: the link ledger — full-width ≥44px rows with an icon well,
          title + one-line description and a trailing chevron; hairline
          separators + a quiet hover wash (the former .alert link rows
          retire with their card-in-card boxes). R305 Heron (§D): the
          icon wells ride the ember — these rows are the page's primary
          actions. */}
      <Card title="اللوحات الحيّة" icon={ListChecks} subtitle="أربع لوحات مرتبطة ببعضها">
        <div className="qlt-link-rows">
          {QUALITY_DASHBOARDS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className="qlt-link-row"
              title={`فتح ${item.title}`}
            >
              <span className="qlt-link-row-icon" aria-hidden="true">
                <Icon icon={item.icon} size={16} />
              </span>
              <span className="qlt-link-row-body">
                <span className="qlt-link-row-title">{item.title}</span>
                <span className="qlt-link-row-desc">{item.desc}</span>
              </span>
              <Icon icon={ArrowLeft} size={14} className="qlt-link-row-chevron" />
            </Link>
          ))}
        </div>
      </Card>

      <Card title="تصدير تقارير ثابتة (PDF/Excel)" icon={FileText}>
        {/* R305 Heron (§D): the honest pending disclosure rides the §0
            note box (copy unchanged). */}
        <p className="qlt-note hr-note">
          إصدار التقارير القابلة للتحميل قيد التطوير. حاليّاً يمكنك الاعتماد على اللوحات الحيّة أعلاه — كلّ
          الأرقام تُحدَّث فوريّاً مع البيانات في قاعدة المنصّة.
        </p>
      </Card>
      </div>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════
   Quality Alerts page (full list — hooks/helpers live near the top,
   shared with the dashboard's summary card)
   ════════════════════════════════════════════════════════════════ */

export function QualityAlertsPage() {
  const q = useQualityAlerts();
  /* R304: severity is the page's one scan axis — a read-only client-side
   * view control (the .filter-pill grammar the professors roster uses)
   * so the queue answers «ما الحرج الآن؟» without touching the wire.
   * Default = الكل (every pinned row contract stays in view). */
  const [severityFilter, setSeverityFilter] = useState<'all' | QualityAlert['severity']>('all');
  const severityCounts = q.data?.counts;
  const visibleAlerts = q.data
    ? (severityFilter === 'all'
        ? q.data.alerts
        : q.data.alerts.filter((a) => a.severity === severityFilter))
    : [];

  return (
    <div className="page">
      <div className="hr-scope">
      <header className="page-header">
        <div className="page-title-block">
          {/* R305 Heron (§D): the sector brow. */}
          <QualityBrow />
          <h1 className="page-title">تنبيهات الجودة</h1>
          <p className="page-subtitle">أحداث تستوجب تدخّل فريق ضمان الجودة — مُستخرجة فوريّاً من بيانات المنصّة.</p>
        </div>
        <div className="qlt-header-badges">
          {q.data && q.data.counts.critical > 0 && (
            /* R305 Heron (§D): the critical count rides the chip lexicon. */
            <span className="hr-chip" data-tone="danger">{countAr(q.data.counts.critical, ['تنبيه حرج', 'تنبيهان حرجان', 'تنبيهات حرجة', 'تنبيهاً حرجاً'])}</span>
          )}
          <ReadOnlyBadge />
        </div>
      </header>

      {q.isPending ? (
        /* r148 (AUDIT-2 L8): قائمة تنبيهات (نقطة خطورة + سطران) —
           ListSkeleton مطابق الشكل بدل السبينر الصفحي. */
        <Card><ListSkeleton rows={4} /></Card>
      ) : q.isError ? (
        /* r299 (E item 9): the sector's ONE page-level error grammar —
           bare ErrorState with a specific message, under the header. */
        <ErrorState message="تعذّر تحميل التنبيهات" error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data || q.data.alerts.length === 0 ? (
        <Card>
          {/* r299 (E item 4): the shared EmptyState primitive (the
              dashboard alerts card's own convention) — the hand-rolled
              .state div retired; copy unchanged. */}
          <EmptyState
            illustration="empty-notifications"
            icon={CheckCircle2}
            title="لا توجد تنبيهات حالياً"
            description="كلّ المؤشّرات ضمن النطاق الطبيعيّ."
          />
        </Card>
      ) : (
        <Card
          title="تنبيهات نشطة"
          icon={AlertTriangle}
          subtitle={q.data.counts.total > q.data.alerts.length
            /* r299 (E item 3): the honest cap disclosure — the backend
               slices 20 rows server-side while counts.total stays the
               TRUE uncapped count (learning.routes.ts); the rosters'
               own grammar (countAr total · «تُعرض أول N»), so the
               truncation is visible, never silent. R305 Heron (§D):
               the count rides the §0 section-count chip. */
            ? (
              <span className="hr-section-count">
                {`${countAr(q.data.counts.total, ['تنبيه واحد', 'تنبيهان', 'تنبيهات', 'تنبيهاً'])} · تُعرض أول ${q.data.alerts.length}`}
              </span>
            )
            : undefined}
        >
          {/* R304: the severity filter rail — counts inline so the rail
              answers both «كم؟» and «أيّها؟» in one line. R305 Heron
              (§D): .hr-toolbar joins for the one placement grammar; a
              pressed pill reads the ember. */}
          <div className="qlt-alert-filter hr-toolbar" role="group" aria-label="تصفية التنبيهات بحسب الشدّة">
            <button
              type="button"
              className={`filter-pill${severityFilter === 'all' ? ' on' : ''}`}
              aria-pressed={severityFilter === 'all'}
              onClick={() => setSeverityFilter('all')}
            >
              الكل
              <span className="filter-pill-count">{formatNum(q.data.alerts.length)}</span>
            </button>
            {(['critical', 'warning', 'info'] as const).map((sev) => (
              <button
                key={sev}
                type="button"
                className={`filter-pill${severityFilter === sev ? ' on' : ''}`}
                aria-pressed={severityFilter === sev}
                onClick={() => setSeverityFilter(sev)}
              >
                {SEVERITY_LABEL[sev]}
                <span className="filter-pill-count">{formatNum(severityCounts?.[sev] ?? 0)}</span>
              </button>
            ))}
          </div>
          {visibleAlerts.length === 0 ? (
            <p className="qlt-empty-note hr-note">لا تنبيهات بهذه الشدّة حاليّاً — اختر شدّة أخرى أو أعد التصفية إلى «الكل».</p>
          ) : (
            <>
              {/* 4C-b: oversight rows — leading severity edge (2px inline-start:
                  danger / warning / brand tints — r299: the info edge mirrors
                  the brand Badge's copper family, it was --success green while
                  the same row's chip rendered brand), category icon, severity
                  chip + relative time. R305 Heron (§D): the edge joins the
                  3px Heron hairline weight and the severity word rides the
                  .hr-chip lexicon (critical→danger, warning→warn, info→info). */}
              <div className="qlt-alert-list">
                {visibleAlerts.map((a) => (
                  <div key={a.id} className={`qlt-alert-row qlt-sev-${a.severity}`}>
                    <span className="qlt-alert-row-icon" aria-hidden="true">
                      <Icon icon={CATEGORY_ICON[a.category]} size={16} />
                    </span>
                    <div className="qlt-alert-row-body">
                      <div className="qlt-alert-row-title">{a.title}</div>
                      <div className="qlt-alert-row-desc">{a.description}</div>
                      <div className="qlt-alert-row-time">{formatRelativeArShort(a.occurredAt)}</div>
                    </div>
                    <span className="hr-chip" data-tone={SEVERITY_CHIP_TONE[a.severity]}>{SEVERITY_LABEL[a.severity]}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      )}
      </div>
    </div>
  );
}
