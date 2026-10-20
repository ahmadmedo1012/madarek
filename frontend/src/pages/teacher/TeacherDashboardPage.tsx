import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  AlertTriangle, FileText, Bell,
  CheckCircle2, Filter, Sparkles, Microscope,
  ClipboardCheck, Calendar,
  type LucideIcon,
} from 'lucide-react';
import { Card, Badge, UserAvatar } from '../../components/primitives';
import { StatStrip, LedgerPanel, LedgerRow } from '../../components/primitives/Ledger';
import { ErrorState, ChartSkeleton, ListSkeleton, Skeleton } from '../../components/primitives/States';
import { ChartFrame } from '../../components/charts';
import { Icon } from '../../components/Icon';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip, Legend,
} from 'chart.js';
import { cartesianOptions, chartColors, useChartThemeKey } from '../../lib/chartTheme';
import {
  useTeacherDashboard,
  useTeacherOfferings,
  useTeacherRisks,
  type TeacherDashboard,
  type TeacherOffering,
  type TeacherRiskRow,
} from '../../hooks/useResources';
import { countAr, formatRelativeAr, WEEKDAY_NAMES_AR } from '../../lib/format';
import { formatDate, formatNum, formatPct1 } from '../../utils/numbers';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

type FeedFilter = 'all' | 'submissions' | 'research' | 'attendance';

const FILTER_OPTIONS: Array<{ value: FeedFilter; label: string }> = [
  { value: 'all', label: 'الكل' },
  { value: 'submissions', label: 'تسليمات' },
  { value: 'research', label: 'بحوث' },
  { value: 'attendance', label: 'حضور' },
];

const KIND_ICON: Record<'submissions' | 'research' | 'attendance', LucideIcon> = {
  submissions: FileText,
  research: Microscope,
  attendance: AlertTriangle,
};
const KIND_TONE: Record<'submissions' | 'research' | 'attendance', 'amber' | 'red' | 'green' | 'purple' | 'gold'> = {
  submissions: 'amber',
  research: 'purple',
  attendance: 'red',
};
/* The action names what clicking actually does (mission H) — a generic
 * "مراجعة" on every row hides the destination. */
const KIND_ACTION: Record<'submissions' | 'research' | 'attendance', string> = {
  submissions: 'تقييم التسليم',
  research: 'مراجعة البحث',
  attendance: 'عرض السجل',
};

/* countAr + formatRelativeAr live in lib/format.ts (wave 9-a). */

/**
 * Trend drawability floor (A6 P2, 22-a). The 6-week window comes back
 * with 5/6 weeks null server-side early in a term; a line chart with a
 * single non-null point renders one floating dot that reads as a
 * rendering bug (VLM flagged it on desktop, mobile AND dark). A series
 * needs ≥2 non-null points to draw a trend — exported for the unit
 * suite.
 */
export function trendCoverage(trend: TeacherDashboard['trend']): {
  /** True when at least one series has ≥2 non-null points. */
  drawable: boolean;
  /** Weeks with any recorded value (grade OR attendance). */
  weeksRecorded: number;
} {
  const gradePoints = trend.filter((t) => t.avgGradePct !== null).length;
  const attendancePoints = trend.filter((t) => t.attendancePct !== null).length;
  return {
    drawable: gradePoints >= 2 || attendancePoints >= 2,
    weeksRecorded: trend.filter((t) => t.avgGradePct !== null || t.attendancePct !== null).length,
  };
}

/* ─── r164-h: the teacher home's daily-work trio (pure decisions) ── */

/** One slot of the today strip — composed client-side from the SAME
 * /teacher/me/offerings schedule the weekly Schedule page renders (the
 * backend needs no new endpoint: the data already rides the offering
 * rows; composing here is the smaller surface). */
export interface TodaySlot {
  key: string;
  offeringId: string;
  courseName: string;
  courseCode: string;
  room: string | null;
  startTime: string;
  endTime: string;
}

/** "HH:MM" → minutes-since-midnight (the wire format ScheduleSlot
 * stores; a malformed value degrades to 0 — never a NaN sort). */
function slotMinutes(hhmm: string): number {
  const parts = hhmm.split(':');
  const h = Number(parts[0]) || 0;
  const m = Number(parts[1]) || 0;
  return h * 60 + m;
}

/**
 * Today's schedule slots across ALL of the teacher's offerings, sorted
 * by start time — the dashboard's today strip. `now` decides which
 * weekday is "today" (dayOfWeek uses the Date#getDay() convention,
 * 0=Sunday — pinned in schema.prisma and TeacherSchedulePage).
 * Pure + exported for the unit suite.
 */
export function todaySlots(
  offerings: ReadonlyArray<TeacherOffering>,
  now: Date = new Date(),
): TodaySlot[] {
  const dow = now.getDay();
  const slots: TodaySlot[] = [];
  for (const o of offerings) {
    for (const slot of o.schedule) {
      if (slot.dayOfWeek !== dow) continue;
      slots.push({
        key: `${o.id}:${slot.id}`,
        offeringId: o.id,
        courseName: o.course.name,
        courseCode: o.course.code,
        room: slot.room ?? o.room ?? null,
        startTime: slot.startTime,
        endTime: slot.endTime,
      });
    }
  }
  slots.sort((a, b) => slotMinutes(a.startTime) - slotMinutes(b.startTime));
  return slots;
}

/** Where a slot stands relative to `now` — the strip's «جارٍ الآن» /
 * «انتهت» markers. Pure + exported for the unit suite. */
export function slotPhase(slot: TodaySlot, now: Date = new Date()): 'done' | 'ongoing' | 'upcoming' {
  const minutes = now.getHours() * 60 + now.getMinutes();
  if (minutes >= slotMinutes(slot.endTime)) return 'done';
  if (minutes >= slotMinutes(slot.startTime)) return 'ongoing';
  return 'upcoming';
}

/** The top at-risk students for the home shortcuts — the /teacher/risks
 * endpoint already returns worst-first (riskScore ascending: 100=OK,
 * 0=CRITICAL), so this is the honest take cap. Pure + exported for tests. */
export const AT_RISK_SHORTCUT_TAKE = 3;
export function topRisks(rows: ReadonlyArray<TeacherRiskRow>): TeacherRiskRow[] {
  return rows.slice(0, AT_RISK_SHORTCUT_TAKE);
}

/* Same labels as TeacherIntelligencePage's risk rows (the intelligence
 * page keeps its own edge/ink maps local — the label vocabulary is the
 * shared contract, mirrored here rather than coupled). */
const RISK_LABEL: Record<TeacherRiskRow['riskLevel'], string> = {
  OK: 'مستقر',
  WATCH: 'تحت المراقبة',
  AT_RISK: 'في خطر',
  CRITICAL: 'حرج',
};
const RISK_TONE: Record<TeacherRiskRow['riskLevel'], 'green' | 'gold' | 'amber' | 'red'> = {
  OK: 'green',
  WATCH: 'gold',
  AT_RISK: 'amber',
  CRITICAL: 'red',
};

export function TeacherDashboardPage() {
  const [filter, setFilter] = useState<FeedFilter>('all');
  const dash = useTeacherDashboard();
  // Remounts the chart canvas when the light/dark theme flips.
  const themeKey = useChartThemeKey();

  const visible = useMemo(() => {
    if (!dash.data) return [];
    return filter === 'all' ? dash.data.feed : dash.data.feed.filter((f) => f.kind === filter);
  }, [dash.data, filter]);

  const filterCounts = useMemo(() => {
    const feed = dash.data?.feed ?? [];
    return {
      all: feed.length,
      submissions: feed.filter((f) => f.kind === 'submissions').length,
      research: feed.filter((f) => f.kind === 'research').length,
      attendance: feed.filter((f) => f.kind === 'attendance').length,
    } as Record<FeedFilter, number>;
  }, [dash.data]);

  if (dash.isPending) {
    return (
      <div className="page" aria-busy="true" aria-live="polite">
        <header className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">لوحة الأستاذ</h1>
            <p className="page-subtitle">جارٍ تحضير لوحتك…</p>
          </div>
        </header>
        <div className="stat-strip" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="stat-cell">
              <Skeleton width={70} height={11} />
              <div style={{ marginBlock: 'var(--sp-1)' }}>
                <Skeleton width={90} height={28} />
              </div>
              <Skeleton width={120} height={11} />
            </div>
          ))}
        </div>
        <ListSkeleton rows={3} />
        <ListSkeleton rows={3} />
        <Card title="اتجاه الأداء والحضور">
          <ChartSkeleton height={240} />
        </Card>
        <Card>
          <ListSkeleton rows={5} />
        </Card>
      </div>
    );
  }
  if (dash.isError || !dash.data) {
    return (
      <div className="page">
        <header className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">لوحة الأستاذ</h1>
          </div>
        </header>
        <ErrorState
          message="تعذَّر تحميل لوحة الأستاذ"
          error={dash.error}
          onRetry={() => dash.refetch()}
        />
      </div>
    );
  }

  const d = dash.data;
  // Build the shared chart options ONCE per render (each cartesianOptions()
  // call resolves CSS custom properties — it is not free).
  const baseOpts = cartesianOptions({ legend: true });

  // A6 P2 (22-a): a series needs ≥2 non-null points to draw a trend.
  // Below that floor the canvas is replaced by the platform empty-state
  // grammar — a lone dot on an empty grid read as a rendering bug, not
  // as "not enough data yet". The sr-only data table feeds both branches.
  const coverage = trendCoverage(d.trend);
  const trendTable = {
    caption: 'اتجاه الأداء والحضور — آخر ستة أسابيع',
    columns: ['الأسبوع', 'متوسط الأداء', 'الحضور'],
    rows: d.trend.map((t) => [
      t.week,
      t.avgGradePct === null ? '—' : `${formatPct1(t.avgGradePct)}%`,
      t.attendancePct === null ? '—' : `${formatPct1(t.attendancePct)}%`,
    ]),
  } as const;

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">لوحة الأستاذ</h1>
          <p className="page-subtitle">
            كل ما يحتاج تدخّلك اليوم — في تيار واحد، مرتّب حسب الأولوية.
          </p>
          <p className="page-header-meta">
            {WEEKDAY_NAMES_AR[new Date().getDay()]} · {formatDate(new Date(), { day: 'numeric', month: 'long' })}
          </p>
        </div>
        <Badge color="brand">
          {visible.length === 0
            ? 'لا عناصر تحتاج متابعة'
            : countAr(visible.length, ['عنصر يحتاج متابعة', 'عنصران يحتاجان متابعة', 'عناصر تحتاج متابعة', 'عنصراً يحتاج متابعة'])}
        </Badge>
      </header>

      {/* R189 — the typographic stat strip (the compact-kpi row, ledgered). */}
      <StatStrip
        ariaLabel="ملخص نشاط التدريس"
        cells={[
          {
            label: 'طلابك',
            value: formatNum(d.kpi.studentCount),
            trend: 'عبر مقرّراتك',
            trendTone: 'flat',
          },
          {
            label: 'متوسط الأداء',
            value: d.kpi.avgGradePct !== null ? `${formatPct1(d.kpi.avgGradePct)}%` : '—',
            trend: d.kpi.avgGradePct === null ? 'لا تقييمات بعد' : 'كل التقييمات المعتمدة',
            trendTone: d.kpi.avgGradePct === null ? 'flat' : d.kpi.avgGradePct >= 70 ? 'up' : 'down',
          },
          {
            label: 'الحضور',
            value: d.kpi.attendancePct !== null ? `${formatPct1(d.kpi.attendancePct)}%` : '—',
            trend: d.kpi.attendancePct === null ? 'لا جلسات حضور بعد' : 'كل الجلسات المسجّلة',
            trendTone: d.kpi.attendancePct === null ? 'flat' : d.kpi.attendancePct >= 75 ? 'up' : 'down',
          },
          {
            label: 'بحاجة تقييم',
            value: formatNum(d.kpi.needsReview),
            trend: 'واجبات + بحوث',
            trendTone: d.kpi.needsReview === 0 ? 'up' : d.kpi.needsReview > 10 ? 'down' : 'flat',
          },
        ]}
      />

      {/* ── r164-h: the daily-work trio — actionable first (the Canvas
          home pattern): the pending-grading queue (the work that waits
          on the teacher's pen) + today's schedule strip, then the
          at-risk shortcuts below. All three consume data already in
          flight — the queue rides the dashboard aggregate, the strip
          composes /me/offerings, the shortcuts ride /teacher/risks. */}
      <div className="grid-2-1">
        <PendingGradingCard entries={d.pendingGrading} />
        <TodayStripCard />
      </div>

      <AtRiskShortcutsCard />

      {/* Performance + attendance trend — real 6-week data, wrapped for
          screen readers (aria-label + sr-only data table, audit 0-f). */}
      <Card title="اتجاه الأداء والحضور" icon={Sparkles} subtitle="متوسط أداء وحضور طلابك خلال الأسابيع الستة الماضية">
        {!coverage.drawable ? (
          <>
            <div className="state state-empty" role="status">
              <div className="state-icon">
                <Icon icon={Sparkles} size={20} />
              </div>
              <div className="state-title">لا تتوفّر بيانات كافية بعد لرسم الاتجاه</div>
              <div className="state-desc">
                {coverage.weeksRecorded === 0
                  ? 'لم يُسجَّل أي أسبوع حتى الآن — يُرسم المخطط تلقائياً بعد اكتمال أسبوعين على الأقل.'
                  : `${countAr(coverage.weeksRecorded, ['أسبوع واحد مسجَّل', 'أسبوعان مسجَّلان', 'أسابيع مسجَّلة', 'أسبوعاً مسجَّلاً'])} حتى الآن — يُرسم المخطط تلقائياً بعد اكتمال أسبوعين على الأقل.`}
              </div>
            </div>
            {/* The real data points stay available to screen readers
                even while the canvas is withheld. */}
            <div className="visually-hidden">
              <p>لا تتوفّر بيانات كافية بعد لرسم المخطط الخطي.</p>
              <table>
                <caption>{trendTable.caption}</caption>
                <thead>
                  <tr>
                    {trendTable.columns.map((column, i) => (
                      <th key={`${column}-${i}`} scope="col">{column}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {trendTable.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => <td key={j}>{cell}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <ChartFrame
            ariaLabel="مخطط خطي لمتوسط الأداء ونسبة الحضور خلال الأسابيع الستة الماضية"
            summary="مقارنة أسبوعية بين متوسط درجات الطلاب ونسبة الحضور."
            height={240}
            table={trendTable}
          >
            <Line
              key={themeKey}
              data={trendChartData(d.trend)}
              options={{
                ...baseOpts,
                scales: {
                  ...baseOpts.scales,
                  y: { ...baseOpts.scales!.y, min: 0, max: 100 },
                },
              }}
            />
          </ChartFrame>
        )}
      </Card>

      {/* Filter toolbar */}
      <div className="feed-toolbar">
        <div className="flex items-center gap-2" role="group" aria-label="تصفية التيار">
          <Icon icon={Filter} size={14} className="text-subtle" />
          <span className="text-xs text-subtle">تصفية:</span>
          {FILTER_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              className={`pill${filter === o.value ? ' on' : ''}`}
              aria-pressed={filter === o.value}
              onClick={() => setFilter(o.value)}
            >
              {o.label}
              <span className="filter-pill-count">{filterCounts[o.value]}</span>
            </button>
          ))}
        </div>
        <Link to="/teacher/alerts" className="btn ghost sm">
          <Icon icon={Bell} size={13} />
          الإشعارات الكاملة
        </Link>
      </div>

      {/* The feed — rows stagger in from inline-start (wave 5-a CSS) */}
      <div className="feed">
        {visible.length === 0 ? (
          <Card>
            <div className="state">
              <div className="state-icon state-icon-success">
                <Icon icon={CheckCircle2} size={20} />
              </div>
              <div className="state-title">لا متطلبات الآن — أحسنت!</div>
              <div className="state-desc">سيظهر هنا أي عنصر جديد فور وصوله.</div>
              <div style={{ marginBlockStart: 'var(--sp-3)' }}>
                <Link to="/teacher/intelligence" className="btn outline sm">
                  <Icon icon={Users} size={13} />
                  استعرض أداء مقرّراتك
                </Link>
              </div>
            </div>
          </Card>
        ) : (
          visible.map((item) => <FeedRow key={item.id} item={item} />)
        )}
      </div>
    </div>
  );
}

function trendChartData(trend: TeacherDashboard['trend']) {
  const c = chartColors();
  return {
    labels: trend.map((t) => t.week),
    datasets: [
      {
        label: 'متوسط الأداء %',
        data: trend.map((t) => t.avgGradePct ?? null),
        borderColor: c.accent,
        backgroundColor: `color-mix(in srgb, ${c.accent} 12%, transparent)`,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: c.accent,
        borderWidth: 2,
        spanGaps: true,
      },
      {
        label: 'الحضور %',
        data: trend.map((t) => t.attendancePct ?? null),
        borderColor: c.success,
        backgroundColor: `color-mix(in srgb, ${c.success} 10%, transparent)`,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
        pointBackgroundColor: c.success,
        borderWidth: 2,
        spanGaps: true,
      },
    ],
  };
}

function FeedRow({ item }: { item: TeacherDashboard['feed'][number] }) {
  const Icon_ = KIND_ICON[item.kind];
  const tone = KIND_TONE[item.kind];
  return (
    <div className="feed-item">
      {item.author ? (
        <UserAvatar
          initials={item.author.avatarInitials ?? `${item.author.firstName[0]}${item.author.lastName[0]}`}
          color={item.author.avatarColor ?? undefined}
          size={40}
        />
      ) : (
        <div className={`feed-item-avatar ${tone}`}>
          <Icon icon={Icon_} size={18} />
        </div>
      )}
      <div className="feed-item-body">
        <div className="feed-item-head">
          <span className="feed-item-author">
            {item.author ? `${item.author.firstName} ${item.author.lastName}` : 'النظام'}
          </span>
          <span className="feed-item-meta">·</span>
          {/* meta carries a Latin course code — bdi keeps RTL punctuation order */}
          <bdi className="feed-item-meta">{item.meta}</bdi>
          <span className="feed-item-meta feed-item-time">{formatRelativeAr(item.when)}</span>
        </div>
        <div className="feed-item-text">{item.title}</div>
        <div className="feed-item-actions">
          <Link to={item.actionTo} className="btn primary sm">
            <Icon icon={Icon_} size={13} />
            {KIND_ACTION[item.kind]}
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ═══════════ r164-h: the daily-work trio components ═══════════ */

/**
 * The pending-grading queue card — the teacher home's first actionable
 * surface. Per-assignment counts of submissions awaiting a grade, each
 * row linking straight into the ONE surface that walks the full queue
 * (/teacher/assignments — actionTo travels from the backend rollup).
 * Empty state names the win, not the void: «لا انتظار — كل التسليمات
 * مُقيَّمة».
 */
function PendingGradingCard({ entries }: { entries: TeacherDashboard['pendingGrading'] }) {
  const total = entries.reduce((sum, e) => sum + e.count, 0);
  return (
    <LedgerPanel
      title="طابور التصحيح"
      zone="rose"
      tag={total === 0 ? undefined : countAr(total, ['تسليم بانتظار درجتك', 'تسليمان بانتظار درجتك', 'تسليمات بانتظار درجتك', 'تسليماً بانتظار درجتك'])}
      ariaLabel="طابور التصحيح"
      actions={total > 0 ? (
        <Link to="/teacher/assignments" className="btn primary sm">
          <Icon icon={ClipboardCheck} size={13} /> ابدأ التصحيح
        </Link>
      ) : undefined}
    >
      {entries.length === 0 ? (
        <LedgerRow
          title="لا انتظار — كل التسليمات مُقيَّمة"
          subtitle="ستظهر هنا التسليمات الجديدة فور وصولها بانتظار درجتك."
          leadLabel="0" /* r197 §7: Western digits, not the spelled-out word */
          lead="انتظار"
          tail={<Badge color="green">مكتمل</Badge>}
        />
      ) : (
        entries.map((e) => (
          <LedgerRow
            key={e.assignmentId}
            to={e.actionTo}
            leadLabel={countAr(e.count, ['تسليم', 'تسليمان', 'تسليمات', 'تسليماً'])}
            title={e.title}
            subtitle={
              <>
                {e.course.name} · <bdi>{e.course.code}</bdi>
                {e.oldestSubmittedAt && <> · أقدم تسليم {formatRelativeAr(e.oldestSubmittedAt)}</>}
              </>
            }
            tail={<Badge color="amber">بانتظارك</Badge>}
          />
        ))
      )}
    </LedgerPanel>
  );
}

/**
 * The today strip — today's ScheduleSlot entries composed client-side
 * from /teacher/me/offerings (the weekly Schedule page's own source;
 * no new backend surface). Each slot marks its phase relative to now:
 * «جارٍ الآن» while inside its window, dimmed time when done.
 */
function TodayStripCard() {
  const offsQ = useTeacherOfferings();
  // Compose once per render — `new Date()` decides the weekday + phases.
  const now = new Date();
  const slots = offsQ.data ? todaySlots(offsQ.data, now) : [];
  const todayDow = now.getDay();

  return (
    <LedgerPanel
      title="محاضرات اليوم"
      zone="sky"
      tag={WEEKDAY_NAMES_AR[todayDow]}
      ariaLabel="محاضرات اليوم"
      actions={(
        <Link to="/teacher/schedule" className="btn ghost sm">
          <Icon icon={Calendar} size={13} /> الأسبوعيّ
        </Link>
      )}
    >
      {offsQ.isPending ? (
        <div className="ledger-empty">
          <ListSkeleton rows={2} />
        </div>
      ) : offsQ.isError ? (
        <div className="ledger-empty">
          <ErrorState message="تعذَّر تحميل جدول اليوم" error={offsQ.error} onRetry={() => offsQ.refetch()} />
        </div>
      ) : slots.length === 0 ? (
        <LedgerRow
          title="لا محاضرات اليوم"
          subtitle="جدول اليوم فارغ — استرح أو راجع الجدول الأسبوعيّ."
          leadLabel="اليوم"
          lead="راحة"
          tail={<Badge color="green">يوم مفتوح</Badge>}
        />
      ) : (
        slots.map((slot) => {
          const phase = slotPhase(slot, now);
          return (
            <LedgerRow
              key={slot.key}
              to="/teacher/schedule"
              lead={<bdi>{slot.startTime} — {slot.endTime}</bdi>}
              title={slot.courseName}
              subtitle={slot.room ? `${slot.room} · ${phase === 'done' ? 'انتهت' : phase === 'ongoing' ? 'جارٍ الآن' : 'قادمة'}` : (phase === 'done' ? 'انتهت' : phase === 'ongoing' ? 'جارٍ الآن' : 'قادمة')}
              tail={
                phase === 'ongoing' ? <Badge color="red">جارٍ الآن</Badge> :
                phase === 'done' ? <Badge>انتهت</Badge> :
                <Badge color="gold">قادمة</Badge>
              }
            />
          );
        })
      )}
    </LedgerPanel>
  );
}

/**
 * The at-risk shortcuts — the top rows of /teacher/risks (worst-first,
 * green students never ride the endpoint), each row ONE tap from the
 * offering's intelligence deep dive. The full list lives on
 * /teacher/intelligence; this card is the ≤1-tap door to it.
 */
function AtRiskShortcutsCard() {
  const risks = useTeacherRisks();
  const top = risks.data ? topRisks(risks.data) : [];

  return (
    <LedgerPanel
      title="طلاب يحتاجون متابعة"
      tag={risks.data && risks.data.length > 0
        ? countAr(risks.data.length, ['طالب تحت المتابعة', 'طالبان تحت المتابعة', 'طلاب تحت المتابعة', 'طالباً تحت المتابعة'])
        : undefined}
      ariaLabel="طلاب يحتاجون متابعة"
      actions={risks.data && risks.data.length > 0 ? (
        <Link to="/teacher/intelligence" className="btn ghost sm">
          <Icon icon={Users} size={13} /> القائمة الكاملة
        </Link>
      ) : undefined}
    >
      {risks.isPending ? (
        <div className="ledger-empty">
          <ListSkeleton rows={3} />
        </div>
      ) : risks.isError ? (
        <div className="ledger-empty">
          <ErrorState message="تعذَّر تحميل قائمة المتابعة" error={risks.error} onRetry={() => risks.refetch()} />
        </div>
      ) : top.length === 0 ? (
        <LedgerRow
          title="جميع طلابك في وضع جيد"
          subtitle="لا مؤشّرات خطر حاليّاً — ستظهر هنا أقصر طرق المتابعة فور رصدها."
          leadLabel="0" /* r197 §7: Western digits, not the spelled-out word */
          lead="مخاطرة"
          tail={<Badge color="green">مستقر</Badge>}
        />
      ) : (
        top.map((r) => (
          <LedgerRow
            key={`${r.studentId}:${r.offeringId}`}
            to={`/teacher/intelligence/${r.offeringId}`}
            lead={<bdi>{formatPct1(r.riskScore)}%</bdi>}
            title={r.name}
            subtitle={<>{r.courseIcon} {r.courseName}</>}
            tail={<Badge color={RISK_TONE[r.riskLevel]}>{RISK_LABEL[r.riskLevel]}</Badge>}
          />
        ))
      )}
    </LedgerPanel>
  );
}
