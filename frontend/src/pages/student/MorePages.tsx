import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Trophy, Star, Medal, Activity, Crown,
  Target, Headset,
  Bell, AlertTriangle, BookOpen, Download,
  CheckCircle2, Check, Heart, GraduationCap,
  Building2, Microscope,
  Hourglass, ArrowLeft, X,
} from 'lucide-react';
import { Bar, Radar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, RadialLinearScale, PointElement, LineElement, Filler } from 'chart.js';
import { Card, MetricCard, ProgressBar, Badge, UserAvatar, AlertRow } from '../../components/primitives';
import { ErrorState, EmptyState, Skeleton, ChartSkeleton, TableSkeleton, CardSkeleton, ListSkeleton } from '../../components/primitives/States';
import { ChartFrame } from '../../components/charts';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import { useMyAchievements, useLeaderboard, useMySkills, usePosts, useCreatePost, useReactToPost, useStudentResults, useMyEnrollments, useNotificationsFeed, useMarkNotifRead, useMarkAllNotifsRead, notifDeepLink, useArExperiences, useStudentMaterials, useFaculties, useCurrentInstitutionSlug, useStudentDashboard, useTrainingMe, submissionStatusAr, type Post, type StudentMaterial } from '../../hooks/useResources';
import { materialHref } from '../../lib/materialHref';
import { UNIVERSITY_FACTS } from '../../data/university.facts';
import { formatNum, formatPct1 } from '../../utils/numbers';
import { useAuthStore, type InstitutionSummary } from '../../stores/auth.store';
import { cartesianOptions, chartAnimation, chartColors, useChartThemeKey } from '../../lib/chartTheme';
import { arUnit, countAr, timeAgoAr, WEEKDAY_NAMES_AR, formatDateTimeAr } from '../../lib/format';
import { api, unwrap } from '../../lib/api';
import { TIER_LABEL, TIER_COLOR } from '../../lib/gamification';
import { gradeBand, type GradeBandKey } from '../../lib/courseMeta';
import { PageFrame, PageHeader as PatternPageHeader, SectionHeader, RowList, RowItem, StatLine } from '../../components/patterns';
/* R319 (c3-S2) — the §B2 kit: the mono-indexed section title bar, the
 * BarCount meta, the mono status chip, the hatched empty cell + the
 * today week strip (the pages-B sweep's shared barrel for this file's
 * pages). */
import { SectionBar, BarCount, StatusChip, EmptyCell, WeekStrip } from '../../components/student';
import '../../styles/training.css'; // gamification .tier-orb/.xp-*/.leaderboard-*/.achievement-* families (D11 css split, 12-15)
import { formatDate } from '../../utils/numbers';
/* ── r305-c (schedule family) + r305-d (supplemental family) imports —
   collapsed by the R305 integrator (handoff N1): the duplicated
   r305-student.css import was legal (Vite dedupes) but confusing. ── */
import '../../styles/r305-student.css';
import '../../styles/r305-student-schedule.css';
import '../../styles/r305-student-supplemental.css';
/* R319 (c3-S2): the sheet system — the §B2 component anatomy + the
 * academic family's harmonics (the same pair every converted student
 * page rides; this file's pages opt in per-page via .r319s-page). */
import '../../styles/r319-student.css';
import '../../styles/r319-student-pages.css';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, RadialLinearScale, PointElement, LineElement, Filler);

/** Counted Arabic noun for point values (D17-2): ar-LY grouping with the
 *  proper one/dual/few/many forms — «نقطة واحدة»، «نقطتان»، «5 نقاط»، «25 نقطة».
 *  Local twin of TrainingPages' helper (lib/format is frozen this wave). */
function pointsAr(n: number): string {
  if (n === 1) return 'نقطة واحدة';
  if (n === 2) return 'نقطتان';
  return `${formatNum(n)} ${n <= 10 ? 'نقاط' : 'نقطة'}`;
}

/* ─── Gamification ─────────────────────────────────────────── */
/* Tier display maps (lib/gamification.ts, 13-15) for the training-points
 * economy. Visual system shared with the training module:
 * styles/training.css §gamification (tier orbs, XP bar, achievement
 * rows, leaderboard ranks). */

export function GamificationPage() {
  const ach = useMyAchievements();
  const lb = useLeaderboard();
  // Real XP economy — same scale the leaderboard ranks by.
  const dash = useStudentDashboard();
  // Real self-development progression (level / tier / distance to next level).
  const training = useTrainingMe();

  const xp = dash.data ? dash.data.kpi.totalXp : null;
  const rank = dash.data?.kpi.rank ?? null;
  const cohortSize = dash.data?.kpi.cohortSize ?? 0;
  const me = training.data;

  /* r224 (4A redesign — Superlist): the page opens with the pattern
     header + one calm stat line (points / tier / cohort rank), then the
     two playful panels keep their system grammar (training.css §
     gamification: the tier orb and gold ride achievements ONLY). */
  return (
    <div className="r319s-page">
    <PageFrame width="default">
      <PatternPageHeader
        title="الإنجازات والنقاط"
        description="تقدّمك ومستواك مقارنة بزملائك في المنصة."
        actions={
          /* 22-c (A5 P3-2): one unit voice — the page mixed «XP»,
             «نقطة/نقاط» and bare «+N». pointsAr everywhere. */
          xp !== null && <Badge color="gold" icon={Star}>{pointsAr(xp)}</Badge>
        }
      />

      <StatLine
        items={[
          {
            label: 'نقاط الإنجاز',
            value: xp !== null ? formatNum(xp) : '—',
            hint: dash.isError ? 'تعذّر تحميل النقاط' : undefined,
            tone: 'signal',
          },
          {
            label: 'مستوى التطوير الذاتي',
            value: me ? formatNum(me.level.level) : '—',
            hint: me ? TIER_LABEL[me.level.tier] : 'لم يبدأ المسار بعد',
            tone: 'neutral',
          },
          {
            label: 'مركزك على الدفعة',
            value: rank !== null && cohortSize > 1 ? `${formatNum(rank)} من ${formatNum(cohortSize)}` : '—',
            hint: rank !== null && cohortSize > 1 ? undefined : 'يظهر الترتيب فور توافر الدفعة',
            tone: 'neutral',
          },
        ]}
      />

      {/* R305 Heron: the level statement rides the page's ONE deep band;
          the achievements + leaderboard lists stay quiet page-surface rows
          under shared kickers (no card wall). The gold discipline holds:
          --gold rides the tier orb / xp fill / +XP chips (training.css),
          never the band's type. */}
      <div className="r305s-band r305s-band--deep">
        {/* N2: one .r305g-level — the wrapper class lives on the loaded
            branch (it carries --tier-color); the pending skeleton keeps
            its own shape-matched wrapper. */}
        {dash.isPending || training.isPending ? (
          /* shape-matched skeleton: orb + lines + track */
          <div className="flex items-center gap-4" style={{ marginBottom: 'var(--sp-5)' }} aria-busy="true">
            <Skeleton width={72} height={72} rounded="50%" />
            <div className="flex-1 flex-col gap-2">
              <Skeleton width="55%" height={16} />
              <Skeleton width="75%" height={12} />
              <Skeleton width="100%" height={10} rounded="var(--r-full)" />
            </div>
          </div>
        ) : (
          <div
            className="r305g-level"
            style={{ ['--tier-color' as never]: me ? TIER_COLOR[me.level.tier] : undefined }}
          >
              <div
                className="tier-orb lg"
                data-empty={!me}
                aria-label={me ? `المستوى ${me.level.level} في مسار التطوير الذاتي` : undefined}
              >
                {me ? me.level.level : '—'}
              </div>
              <div className="r305g-level-main">
                <span className="r305s-eyebrow">مستوى التقدّم</span>
                <div className="r305g-level-title">
                  {training.isError
                    ? 'تعذّر تحميل مستوى التطوير الذاتي'
                    : me
                      ? `${TIER_LABEL[me.level.tier]} · المستوى ${me.level.level} في التطوير الذاتي`
                      : 'لم يبدأ مسار التطوير الذاتي بعد'}
                </div>
                <div className="r305g-level-sub">
                  {xp !== null ? (
                    <>
                      {pointsAr(xp)}
                      {rank !== null && cohortSize > 1 && ` · المركز ${formatNum(rank)} من ${formatNum(cohortSize)} على دفعتك`}
                    </>
                  ) : dash.isError ? (
                    <span className="flex items-center gap-2">
                      تعذّر تحميل نقاط الإنجاز.
                      <button type="button" className="btn ghost sm" onClick={() => dash.refetch()}>
                        إعادة المحاولة
                      </button>
                    </span>
                  ) : (
                    'تعذّر تحميل نقاط الإنجاز'
                  )}
                </div>
                {training.isError && (
                  <div style={{ marginBlockEnd: 'var(--sp-2)' }}>
                    <button type="button" className="btn ghost sm" onClick={() => training.refetch()}>
                      إعادة محاولة تحميل المستوى
                    </button>
                  </div>
                )}
                {me && (
                  <>
                    <div
                      className="xp-track"
                      role="progressbar"
                      aria-label="التقدّم نحو المستوى التالي في مسار التطوير الذاتي"
                      aria-valuenow={me.level.pctIntoLevel}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    >
                      {/* 23-b (A11 P2-10): scaleX (RTL transform-origin in
                          training.css) instead of an inline width —
                          compositor-only fill animation. */}
                      <div
                        className="xp-fill"
                        style={{ transform: `scaleX(${me.level.pctIntoLevel / 100})`, background: 'var(--tier-color)' }}
                      />
                    </div>
                    <div className="r305g-level-foot">
                      متبقّي <bdi>{pointsAr(me.level.toNext)}</bdi> للمستوى التالي
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* R304 (6-d): الإنجازات على لغة الصفوف المشتركة (RowList/RowItem) —
              بئر أيقونة الإنجاز الذهبي يبقى من training.css (§gamification،
              بينما يحمل RowList السطح والفواصل والفراغات. */}
      </div>

      <div className="grid-2">
        <section aria-label="الإنجازات المحققة">
          {/* R319 (c3-S2): the section's heading joins the §B2 title-bar
              register — [01] with the honest earned count as mono meta
              (countAr for assistive tech). */}
          <SectionBar
            index="01"
            title="الإنجازات المحققة"
            meta={
              !ach.isPending && !ach.isError && (ach.data?.length ?? 0) > 0 ? (
                <BarCount
                  n={ach.data!.length}
                  srLabel={countAr(ach.data!.length, ['إنجاز واحد محقّق', 'إنجازان محقّقان', 'إنجازات محقّقة', 'إنجازاً محقّقاً'])}
                />
              ) : undefined
            }
          />
          {ach.isError ? <ErrorState error={ach.error} onRetry={() => ach.refetch()} /> : (
            <RowList
              aria-label="الإنجازات المحققة"
              loading={ach.isPending}
              empty={
                /* R319 (c3-S2): the hatched EmptyCell — the sheet's
                   reserved-but-empty region (same copy, same one action). */
                <EmptyCell
                  label="لا إنجازات بعد"
                  note="أكمل دروساً ومسارات في التطوير الذاتي لتفتح أول إنجاز."
                  action={<Link to="/training" className="btn primary sm">استكشف المسارات</Link>}
                />
              }
            >
              {ach.data?.map((a) => (
                <RowItem
                  key={a.achievement.id}
                  leading={<span className="achievement-icon" aria-hidden><Icon icon={Trophy} size={16} /></span>}
                  title={a.achievement.name}
                  meta={a.achievement.description}
                  trailing={<Badge color="gold">+{pointsAr(a.achievement.xp)}</Badge>}
                />
              ))}
            </RowList>
          )}
        </section>

        <section aria-label="لوحة المتصدرين">
          {/* R319 (c3-S2): [02] لوحة المتصدرين — the honest ranked-student
              count as the bar's mono meta. */}
          <SectionBar
            index="02"
            title="لوحة المتصدرين"
            meta={
              !lb.isPending && !lb.isError && (lb.data?.length ?? 0) > 0 ? (
                <BarCount
                  n={lb.data!.length}
                  srLabel={countAr(lb.data!.length, ['طالب واحد مرتّب', 'طالبان مرتّبان', 'طلاب مرتّبون', 'طالباً مرتّباً'])}
                />
              ) : undefined
            }
          />
          {lb.isPending ? (
            /* shape-matched skeleton: ranked rows */
            <div className="flex-col gap-1" aria-busy="true">
              {[0, 1, 2, 3, 4].map((i) => (
                <div className="leaderboard-row" key={i} aria-hidden>
                  <Skeleton width={30} height={30} rounded="var(--r-full)" />
                  <Skeleton width={32} height={32} rounded="50%" />
                  <Skeleton width="40%" height={13} />
                  <Skeleton width={64} height={13} />
                </div>
              ))}
            </div>
          ) : lb.isError ? <ErrorState error={lb.error} onRetry={() => lb.refetch()} /> :
           !lb.data?.length ? (
            <EmptyCell
              label="لا يوجد ترتيب بعد"
              note="اكسب النقاط بإكمال الدروس والمسارات — يظهر ترتيبك فور تسجيل أول نقطة."
              action={<Link to="/training" className="btn primary sm">ابدأ من التطوير الذاتي</Link>}
            />
          ) : (
            /* same ranked-list grammar as the training achievements page
               (styles/training.css §achievements) — one system */
            <ol className="leaderboard-list" aria-label="ترتيب الطلاب بالنقاط">
              {lb.data.map((l, i) => (
                <li className="leaderboard-row" key={l.id} style={{ ['--lb-i' as never]: Math.min(i, 6) }}>
                  {/* r169a: role="img" — aria-label on a bare span has no
                      valid meaning (axe aria-label-named); the rank badge
                      is a self-contained visual token. */}
                  <span className={`leaderboard-rank rank-${i + 1}`} role="img" aria-label={`المركز ${i + 1}`}>
                    {i < 3
                      ? <Icon icon={i === 0 ? Crown : i === 1 ? Star : Medal} size={16} />
                      : <bdi className="font-mono">#{i + 1}</bdi>}
                  </span>
                  <UserAvatar
                    initials={l.avatarInitials ?? `${l.firstName[0] ?? ''}${l.lastName[0] ?? ''}`}
                    color={l.avatarColor ?? undefined}
                    size={32}
                  />
                  <span className="leaderboard-name" title={`${l.firstName} ${l.lastName}`}>
                    {l.firstName} {l.lastName}
                  </span>
                  {/* 22-c (A5 P3-1): «L2» Latin tier label → Arabic
                      «المستوى ٢» (formatNum = ar-LY digits). */}
                  <span className="leaderboard-tier">المستوى <bdi>{formatNum(l.level)}</bdi></span>
                  <span className="leaderboard-points">{pointsAr(l.totalXp)}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </PageFrame>
    </div>
  );
}

/* ─── Local Arabic unit helper — arUnit + timeAgoAr now live in
   lib/format.ts (13-15 fold, audit 11-f P2-1; byte-identical copies
   of the former local helpers shared with CommunityPages). ── */

/* ─── Skills ───────────────────────────────────────────── */
export function SkillsPage() {
  const skills = useMySkills();
  const themeKey = useChartThemeKey();
  const cc = chartColors();
  /* Highest-mastery skill feeds the ChartFrame prose summary. Undefined
     in the pending/empty/error branches (this JSX block renders only
     with data present). */
  const topSkill = skills.data?.length
    ? skills.data.reduce((a, b) => (b.progressPct > a.progressPct ? b : a))
    : undefined;
  return (
    <div className="r319s-page">
    <PageFrame width="default">
      <PatternPageHeader title="المهارات والشهادات" description="رصد مهاراتك التقنية وتطوّرها مع الوقت." />

      {/* R319 (c3-S2): the map region opens with the §B2 title-bar —
          [01] خريطة المهارات التقنية, the honest measured-skill count
          as mono meta (countAr for assistive tech). */}
      <SectionBar
        index="01"
        title="خريطة المهارات التقنية"
        meta={
          !skills.isPending && !skills.isError && (skills.data?.length ?? 0) > 0 ? (
            <BarCount
              n={skills.data!.length}
              srLabel={countAr(skills.data!.length, ['مهارة واحدة مُسجَّلة', 'مهارتان مُسجَّلتان', 'مهارات مُسجَّلة', 'مهارةً مُسجَّلة'])}
            />
          ) : undefined
        }
      />
      <Card>
        {skills.isPending ? (
          /* shape-matched skeleton: radar pane + progress rows */
          <div className="grid-1-2" style={{ alignItems: 'center' }} aria-busy="true">
            <ChartSkeleton height={300} />
            <div className="flex-col gap-4">
              {[0, 1, 2].map((i) => (
                <div className="flex-col gap-2" key={i} aria-hidden>
                  <div className="flex items-center justify-between">
                    <Skeleton width={90} height={13} />
                    <Skeleton width={72} height={18} rounded="var(--r-full)" />
                  </div>
                  <Skeleton width="100%" height={6} rounded="var(--r-full)" />
                </div>
              ))}
            </div>
          </div>
        ) : skills.isError ? <ErrorState error={skills.error} onRetry={() => skills.refetch()} /> :
         !skills.data?.length ? (
          /* R319 (c3-S2): the empty map is the sheet's reserved-but-empty
             region — the hatched EmptyCell (same honest copy). */
          <EmptyCell
            label="لم تُسجَّل أي مهارة بعد"
            note="تُحتسب المهارات تلقائياً من إنجازاتك الأكاديمية ومسارات التطوير."
          />
        ) : (
          <div className="grid-1-2" style={{ alignItems: 'center' }}>
            {/* 5-A6 (A11 P2-10): ChartFrame — the radar canvas gains
                role=img + an accessible name, a prose summary naming the
                top skill, and a visually-hidden data table (a bare
                <canvas> is opaque to screen readers; same treatment as
                the results bar chart further down the file). */}
            <ChartFrame
              ariaLabel="خريطة مهاراتك التقنية — مستوى الإتقان لكل مهارة"
              summary={topSkill ? `أعلى إتقان: ${topSkill.skill.name} — ${formatPct1(topSkill.progressPct)}%` : undefined}
              height={300}
              table={{
                caption: 'مستوى الإتقان لكل مهارة',
                columns: ['المهارة', 'مستوى الإتقان'],
                rows: skills.data.map((s) => [s.skill.name, `${formatPct1(s.progressPct)}%`]),
              }}
            >
              <Radar
                key={themeKey}
                data={{
                  labels: skills.data.map((s) => s.skill.name),
                  datasets: [{
                    label: 'مستوى الإتقان',
                    data: skills.data.map((s) => s.progressPct),
                    backgroundColor: `color-mix(in srgb, ${cc.accent} 18%, transparent)`,
                    borderColor: cc.accent,
                    borderWidth: 2,
                    pointBackgroundColor: cc.accent,
                    pointRadius: 3,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  /* shared calm animation profile (token-based +
                     reduced-motion aware) instead of a raw 750ms */
                  animation: chartAnimation(),
                  plugins: { legend: { display: false } },
                  scales: {
                    r: {
                      min: 0, max: 100,
                      angleLines: { color: cc.grid },
                      grid: { color: cc.grid },
                      // NOTE: font family duplicated inline because chartTheme
                      // does not export its font stack yet (audit 0-d P3 —
                      // resolves when chartTheme exports FONT).
                      pointLabels: { color: cc.text, font: { family: 'IBM Plex Sans Arabic', size: 11 } },
                      ticks: { display: false, stepSize: 25 },
                    },
                  },
                }}
              />
            </ChartFrame>
            <div className="flex-col gap-4">
              <span className="r305s-eyebrow">سجلّ الإتقان</span>
              {skills.data.map((s) => (
                <div key={s.skill.id} className="flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{s.skill.name}</span>
                    <span className="r305s-chip r305s-chip--accent"><span className="r305s-chip-dot" aria-hidden />المستوى {s.level} / 5</span>
                  </div>
                  <ProgressBar value={s.progressPct} showValue ariaLabel={`تقدّم مهارة ${s.skill.name}`} />
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </PageFrame>
    </div>
  );
}

/* ─── Alerts ───────────────────────────────────────────── */
/* r155b: صفحة الإشعارات الكاملة كانت تُعرض «للقراءة فقط» — عدد غير
 * المقروء بلا تمييز بصري ولا سبيل للتعليم. تُضيف نفس قدرات
 * NotificationDropdown (الخطّ العلوي): تعليم صفّ فردي عبر hook
 * useMarkNotifRead، و«تعليم الكل» عبر useMarkAllNotifsRead (طلب
 * POST واحد)، والصفوف غير المقروءة تحمل شارة «غير مقروء» بنفس لون
 * العلامة (brand) الذي يحمله العدّاد في الترويسة.
 *
 * r157 (F8, 6A6): القصّ slice(0,30) كان يُخفي كل إشعار بعد الثلاثين
 * (الاستعلام نفسه limit=50). الآن صفحة كاملة عبر useNotificationsFeed
 * («عرض المزيد» تُلحق الصفحات)، وعدّاد غير المقروء يقرأه من meta الخادم
 * لا من الصفوف المحمّلة، وسطر «آخر N من M» يقول بصدق كم بقي مخفيّاً.
 *
 * r261 (4E إعادة تصميم — اتجاه Superlist): القائمة تتحوّل من بطاقات
 * تنبيه ملوّنة (.alert) إلى صفوف إدارة هادئة — قائمة أولًا، التفصيل
 * على الصف نفسه، فواصل شعرية وسطح ساكن. بئر أيقونة بلون النوع
 * (soft) فقط، والعنوان/الوصف/الوقت بلون الحبر بحسب القراءة؛ غير
 * المقروء يُقرأ من العنوان القويّ وبئر الإشارة قبل أي شارة، والتحكّم
 * «تعليم كمقروء» يبقى داخل الصف (عرف variables-gating). الأنماط في
 * notifications.css قسم .np-*.
 *
 * R304 (6-d): الصفحة على عقد الأنماط المشترك — PageFrame + PageHeader
 * (الشارة المعدودة وزرّ «تعليم الكل» يعلون الصفحة بدل بطاقة وسيطة)،
 * ولافتة فشل «تعليم الكل» مباشرة تحت الترويسة. تشريح القائمة
 * (np-list/np-row) وسلوكياتها مثبّتة كما هي. */
const NP_TONE_CLASS: Record<'red' | 'brand' | 'amber' | 'green', 'danger' | 'accent' | 'warning' | 'success'> = {
  red: 'danger',
  brand: 'accent',
  amber: 'warning',
  green: 'success',
};

export function AlertsPage() {
  const feed = useNotificationsFeed();
  const markRead = useMarkNotifRead();
  const markAllRead = useMarkAllNotifsRead();

  const items = feed.data?.pages.flatMap((p) => p.data) ?? [];
  /* Server truth: the unread badge reads the LAST page's meta.unread —
     a client-side filter would under-count as soon as pagination loads
     more rows than the first page (and lie about rows never fetched). */
  const meta = feed.data?.pages.at(-1)?.meta;
  const unreadCount = meta?.unread ?? 0;
  const total = meta?.total ?? items.length;

  const toneFor = (type: 'URGENT' | 'ACADEMIC' | 'SYSTEM' | 'SOCIAL'): 'red' | 'brand' | 'amber' | 'green' => {
    if (type === 'URGENT') return 'red';
    if (type === 'ACADEMIC') return 'brand';
    if (type === 'SYSTEM') return 'amber';
    return 'green';
  };
  const iconFor = (type: 'URGENT' | 'ACADEMIC' | 'SYSTEM' | 'SOCIAL') => {
    if (type === 'URGENT') return AlertTriangle;
    if (type === 'ACADEMIC') return BookOpen;
    if (type === 'SYSTEM') return Bell;
    return CheckCircle2;
  };

  return (
    <div className="r319s-page">
    <PageFrame width="default">
      <PatternPageHeader
        title="الإشعارات"
        description="آخر التحديثات والتذكيرات الأكاديمية."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {unreadCount > 0 ? (
              <>
                <Badge color="brand">{arUnit(unreadCount, 'إشعار غير مقروء', 'إشعاران غير مقروءان', 'إشعارات غير مقروءة')}</Badge>
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => markAllRead.mutate()}
                  disabled={markAllRead.isPending}
                >
                  <Icon icon={Check} size={13} />
                  {markAllRead.isPending ? 'جارٍ التعليم…' : 'تعليم الكل كمقروء'}
                </button>
              </>
            ) : (
              <Badge color="green">الكلّ مقروء</Badge>
            )}
          </div>
        }
      />

      {/* r165d (D3): فشل «تعليم الكل كمقروء» كان صامتًا — الزرّ يعطّل نفسه
          أثناء الانتظار ثم يعود دون أي أثر (الخطّاف لا يُبطل الذاكرة
          إلا عند النجاح). نفس عرف صفحة رسائل الأستاذ (TeacherPages —
          form-feedback fail + «إعادة المحاولة» يعيد إطلاق العملية
          نفسها): اللافتة تسمّي الفشل، والمحاولة تعيد الطلب الجماعي —
          وتسكن مباشرة تحت الترويسة التي يقع فيها الفعل. */}
      {markAllRead.isError && (
        <div className="form-feedback fail" role="alert">
          <Icon icon={X} size={14} />
          <span className="flex-1">تعذَّر تعليم الإشعارات كمقروءة — تحقّق من اتصالك ثم أعد المحاولة.</span>
          <button
            type="button"
            className="btn ghost sm"
            onClick={() => markAllRead.mutate()}
            disabled={markAllRead.isPending}
          >
            <Icon icon={Check} size={12} /> إعادة المحاولة
          </button>
        </div>
      )}

      {/* سطح القائمة الصامت — الترويسة أعلاه هي صاحبة العنوان والإجراءات.
          R305 Heron: البطاقة تُسْقَط — الصفوف الشعرية تسكن سطح الصفحة مباشرة
          (القائمة أولًا) واللاصق المشترك يصنّف الكتلة. هذا المقطع محايد
          الدور: نفس المكوّن يخدم /admin/alerts و /teacher/alerts
          و /quality/notifications و /owner/notifications. */}
      <section className="r305p-alerts" aria-label="سجل الإشعارات">
        {/* R319 (c3-S2): the log's heading joins the §B2 title-bar register
            (role-neutral — this section serves every role's alerts route):
            [01] آخر الإشعارات, the server's honest total as the bar's
            mono meta (countAr for assistive tech). */}
        <SectionBar
          index="01"
          title="آخر الإشعارات"
          meta={
            !feed.isPending && !feed.isError && total > 0 ? (
              <BarCount
                n={total}
                srLabel={countAr(total, ['إشعار واحد', 'إشعاران', 'إشعارات', 'إشعاراً'])}
              />
            ) : undefined
          }
        />
        {feed.isPending ? (
          /* shape-matched skeleton: np rows (well + title + desc lines) */
          <div className="np-list" aria-busy="true">
            {[0, 1, 2, 3].map((i) => (
              <div className="np-row np-skel" key={i} aria-hidden>
                <Skeleton width={36} height={36} rounded="var(--r-md)" />
                <div className="np-body flex-col gap-2">
                  <Skeleton width="42%" height={13} />
                  <Skeleton width="74%" height={11} />
                </div>
              </div>
            ))}
          </div>
        ) : feed.isError ? (
          <ErrorState error={feed.error} onRetry={() => feed.refetch()} />
        ) : items.length === 0 ? (
          /* R319 (c3-S2): the hatched EmptyCell — the sheet's
             reserved-but-empty region (same honest copy). */
          <EmptyCell label="لا توجد إشعارات بعد" note="ستظهر التذكيرات والتحديثات الأكاديميّة هنا." />
        ) : (
          <div className="np-list">
            {items.map((n) => {
              const unread = !n.readAt;
              /* r165d (D1): رابط التعمّق للإشعار — نفس قرار التوجيه الذي
                 يحمله صف اللوحة المنسدلة (notifDeepLink). العنوان هو باب
                 الصف (عرف r164-h في قائمة طلاب الأستاذ: «الاسم هو باب
                 الصفّ») — لا يمكن لفّ الصفّ كاملًا في رابط لأنّ صفوف غير
                 المقروء تحمل زرّ «تعليم كمقروء» داخل حدّ الـactions،
                 والتحكّم التفاعلي المتشعّب داخل مرساة مخالفٌ للقانون
                 الأدقّ (A12 P1-3: أزال CoursesPage تحكّمًا متشعّبًا داخل
                 مرساة البطاقة لهذا السبب نفسه). الروابط الخارجية
                 والنسبية للبروتوكول تُهمَل (الرابط الداخلي فقط). */
              const deepLink = notifDeepLink(n);
              const titleNode = deepLink ? (
                <Link
                  to={deepLink}
                  className="text-link"
                  title="الانتقال إلى مصدر الإشعار"
                >
                  {n.title}
                </Link>
              ) : n.title;
              /* variables-gating (the likeInFlight idiom): only the row
                 whose id is in flight goes pending — a shared isPending
                 would freeze every row's button + flip its label. */
              const rowPending = markRead.isPending && markRead.variables === n.id;
              return (
                <div key={n.id} className={`np-row${unread ? ' unread' : ''}`}>
                  <span className={`np-well ${NP_TONE_CLASS[toneFor(n.type)]}`} aria-hidden>
                    <Icon icon={iconFor(n.type)} size={15} />
                  </span>
                  <div className="np-body">
                    <p className="np-title">
                      {unread ? (
                        <span className="flex items-center gap-2 flex-wrap">
                          {titleNode}
                          <Badge color="brand">غير مقروء</Badge>
                        </span>
                      ) : titleNode}
                    </p>
                    {n.body && <p className="np-desc">{n.body}</p>}
                    <p className="np-time">{timeAgoAr(n.createdAt)}</p>
                  </div>
                  <div className="np-tail">
                    {unread ? (
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => markRead.mutate(n.id)}
                        disabled={rowPending}
                        aria-label={`تعليم «${n.title}» كمقروء`}
                      >
                        <Icon icon={Check} size={13} />
                        {rowPending ? 'جارٍ التعليم…' : 'تعليم كمقروء'}
                      </button>
                    ) : (
                      <span className="np-read-mark" title="مقروء" aria-hidden>
                        <Icon icon={Check} size={13} />
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
            {/* r157 (F8): الصفحات الإضافية — سطر الإفصاح يقول بصدق كم
                إشعاراً محمّلاً من أصل الكل، و«عرض المزيد» تُلحق الصفحة
                التالية. عند استنفاد الصفحات يسقط العنصران معاً (لا زر
                ميّت ولا سطر يوهم بوجود المزيد). */}
            {feed.hasNextPage && (
              <div className="flex-col gap-2" style={{ alignItems: 'center', marginTop: 'var(--sp-2)' }}>
                {items.length < total && (
                  <p className="text-xxs text-subtle" style={{ margin: 0 }} role="note">
                    آخر <bdi>{formatNum(items.length)}</bdi> من <bdi>{formatNum(total)}</bdi>
                  </p>
                )}
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => void feed.fetchNextPage()}
                  disabled={feed.isFetchingNextPage}
                >
                  {feed.isFetchingNextPage ? 'جارٍ التحميل…' : 'عرض المزيد'}
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </PageFrame>
    </div>
  );
}

/* ─── Schedule ─────────────────────────────────────────── */
/* Weekday names live in lib/format.ts (WEEKDAY_NAMES_AR, 13-15). */

export function SchedulePage() {
  const q = useMyEnrollments();

  if (q.isPending) {
    return (
      <div className="r319s-page">
      <PageFrame width="default">
        <PatternPageHeader title="الجدول الدراسي" description="جارٍ جمع جدولك…" />
        {/* R319 (c3-S2): the week strip — the page's genuine today/week
            context (the day rotation below anchors on it). */}
        <WeekStrip />
        {/* 5-C3 (A9 P2-2): bare spinner → day-section skeletons. The
            settled page is a stack of day sections (SectionBar +
            RowList rows); two day skeletons hold the visible band so
            the data-land swap doesn't jump (A9 V1). r299: the mirror
            recomposed for the pattern anatomy. */}
        {[0, 1].map((d) => (
          <section key={d} aria-hidden>
            <div className="pf-section-header">
              <Skeleton width={90} height={16} />
            </div>
            <ListSkeleton rows={d === 0 ? 3 : 2} />
          </section>
        ))}
      </PageFrame>
      </div>
    );
  }
  if (q.isError) {
    return (
      <div className="r319s-page">
      <PageFrame width="default">
        <PatternPageHeader title="الجدول الدراسي" />
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      </PageFrame>
      </div>
    );
  }

  // Flatten all schedule slots across all enrolments, then group by day-of-week.
  type Slot = { time: string; startTime: string; name: string; room: string; teacher: string };
  const byDay: Record<number, Slot[]> = { 0: [], 1: [], 2: [], 3: [], 4: [], 5: [], 6: [] };
  for (const e of q.data ?? []) {
    for (const slot of e.offering.schedule) {
      byDay[slot.dayOfWeek]?.push({
        time: `${slot.startTime} — ${slot.endTime}`,
        startTime: slot.startTime,
        name: e.offering.course.name,
        room: slot.room ?? e.offering.room ?? '—',
        teacher: `${e.offering.teacher.firstName} ${e.offering.teacher.lastName}`,
      });
    }
  }
  // Sort each day chronologically.
  for (const dayList of Object.values(byDay)) {
    dayList.sort((a, b) => a.startTime.localeCompare(b.startTime));
  }

  const daysWithItems = Object.entries(byDay)
    .map(([dow, items]) => ({ dow: Number(dow), items }))
    .filter((d) => d.items.length > 0);

  /* r305-c (Heron): the header's meta line carries the week's real
   * load — the counted slot total (honest data, never decoration). */
  const totalSlots = daysWithItems.reduce((sum, d) => sum + d.items.length, 0);

  /* 22-c (A5 P3-6): the week rendered in a fixed 0–6 order regardless
     of the actual day. Anchor the rotation on TODAY (today's group
     first, then the coming days) and badge today's title. */
  const todayDow = new Date().getDay();
  const orderedDays = [
    ...daysWithItems.filter((d) => d.dow === todayDow),
    ...daysWithItems.filter((d) => d.dow !== todayDow)
      .sort((a, b) => ((a.dow - todayDow + 7) % 7) - ((b.dow - todayDow + 7) % 7)),
  ];

  return (
    <div className="r319s-page">
    <PageFrame width="default">
      <PatternPageHeader
        title="الجدول الدراسي"
        description="جدولك الأسبوعيّ مع أماكن المحاضرات."
        meta={totalSlots > 0
          ? countAr(totalSlots, ['حصة واحدة أسبوعياً', 'حصتان أسبوعياً', 'حصص أسبوعياً', 'حصة أسبوعياً'])
          : undefined}
      />

      {/* R319 (c3-S2): the week strip — the page's genuine today/week
          context: the current week as one hairline row of 7 cells with
          today inked (the day rotation below anchors on it). */}
      <WeekStrip />

      {daysWithItems.length === 0 ? (
        /* R319 (c3-S2): the empty week is the sheet's reserved-but-empty
           region — the hatched EmptyCell (the old EmptyState's copy,
           kept honest and verbatim). */
        <EmptyCell
          label="لا يوجد جدول مسجّل"
          note="ستظهر محاضراتك هنا فور أن يُسجَّل الجدول مقرّراتك."
        />
      ) : (
        /* r299 (final C): day sections on the pattern anatomy —
           R319 (c3-S2): each day's heading joins the §B2 title-bar
           register ([01]… by the rendered rotation order), the day's
           honest slot count as the bar's mono meta (countAr for AT),
           and today's marker rides the mono chip register. RowList
           rows + separators stay the RowList's own. */
        <div className="flex-col gap-5">
          {orderedDays.map((d, di) => (
            <section key={d.dow} className="schedule-day" aria-label={`جدول ${WEEKDAY_NAMES_AR[d.dow]}`}>
              <SectionBar
                index={String(di + 1).padStart(2, '0')}
                title={WEEKDAY_NAMES_AR[d.dow] ?? ''}
                meta={(
                  <BarCount
                    n={d.items.length}
                    srLabel={countAr(d.items.length, ['حصة واحدة', 'حصتان', 'حصص', 'حصة'])}
                  />
                )}
                action={d.dow === todayDow ? <StatusChip label="TODAY" tone="due" /> : undefined}
              />
              <RowList aria-label={`حصص يوم ${WEEKDAY_NAMES_AR[d.dow]}`}>
                {d.items.map((it, i) => (
                  <RowItem
                    key={i}
                    leading={<bdi className="font-mono">{it.time}</bdi>}
                    title={it.name}
                    meta={<>{it.room} · {it.teacher}</>}
                  />
                ))}
              </RowList>
            </section>
          ))}
        </div>
      )}
    </PageFrame>
    </div>
  );
}

/* ─── Results ──────────────────────────────────────────── */
/* r299: the canonical grade band (r164-a) projected onto the StatLine's
 * semantic tone ladder — the value's color still comes from the SAME
 * band the teacher's table and the chart bars consume. */
function bandTone(gradePct: number): 'positive' | 'signal' | 'warning' | 'danger' {
  const color = gradeBand(gradePct).color;
  if (color === 'green') return 'positive';
  if (color === 'brand') return 'signal';
  if (color === 'amber' || color === 'gold') return 'warning';
  return 'danger';
}

export function ResultsPage() {
  const q = useStudentResults();
  // Remount the chart (and re-resolve its colours) when the theme flips.
  const themeKey = useChartThemeKey();

  if (q.isPending) {
    return (
      <PageFrame width="default">
        <PatternPageHeader title="النتائج والتقييمات" description="جارٍ جمع درجاتك…" />
        {/* 5-C3 (A9 P2-2): bare spinner → the shapes that land (A9 V1
            measured +204px on the spinner→content swap). r299: the
            settled page leads with the StatLine + the chart card, so
            the mirror holds the stat line's own boxes + the chart
            card's frame (the r172b loading-closure contract).
            r305-c: the mirror lives INSIDE the summary deep band — the
            pending → resolved swap keeps the band's footprint. */}
        <div className="r305s-band r305s-band--deep results-summary">
          <p className="r305s-eyebrow">ملخّص الدرجات</p>
          <div className="pf-statline" aria-busy="true">
            {[0, 1, 2].map((i) => (
              <div key={i} className="pf-stat">
                <Skeleton width={70} height={13} />
                <Skeleton width={56} height={24} />
              </div>
            ))}
          </div>
        </div>
        <CardSkeleton lines={6} />
      </PageFrame>
    );
  }
  if (q.isError || !q.data) {
    return (
      <PageFrame width="default">
        <PatternPageHeader title="النتائج والتقييمات" />
        <ErrorState
          message="تعذَّر تحميل هذا القسم"
          error={q.error}
          onRetry={() => q.refetch()}
        />
      </PageFrame>
    );
  }

  const d = q.data;
  const hasGrades = d.courses.some((c) => c.gradePct !== null);
  const cc = chartColors();
  /* r164-a (status semantics): النتائج الطالبية كانت تحمل سلّمًا
     خاصًا 85/70/60 يخالف سلّم النطاقات الكنونيّ الواحد
     (GRADE_BANDS 85/75/65/50 — lib/courseMeta): درجة ٥٥٪ كانت تُرى
     حمراء «راسب» للطالب بينما جدول الأستاذ يعرضها «مقبولًا» ذهبية،
     و٧٠–٧٤ كانت «brand» بدل «جيّد». الآن كل سطح من أسطح هذه الصفحة
     يستهلك gradeBand نفسه الذي يستهلكه الأستاذ — طالب واحد، شارة
     واحدة، في كل مكان (عقد 22-a A6 P2). */
  const BAND_CHART_COLOR: Record<GradeBandKey, string> = {
    EXCELLENT: cc.success,
    VERY_GOOD: cc.accent,
    GOOD: cc.warning,
    PASS: cc.gold,
    WEAK: cc.danger,
  };
  // r164-e: the awaiting-grading half of the timeline. Optional on the
  // wire (additive backend field) — an older payload degrades to the
  // honest "nothing pending" copy instead of crashing.
  const pendingSubs = d.pendingSubmissions ?? [];
  // Build the shared chart options ONCE per render (each cartesianOptions()
  // call resolves CSS custom properties — it is not free).
  const baseOpts = cartesianOptions({ horizontal: true });

  return (
    <PageFrame width="default">
      <PatternPageHeader
        title="النتائج والتقييمات"
        description="تفاصيل درجاتك وتحليل أدائك بناءً على بياناتك الفعليّة."
        meta={d.headline.courseCount > 0
          ? <>{countAr(d.headline.courseCount, ['مقرّر واحد مُقيَّم', 'مقرّران مُقيَّمان', 'مقرّرات مُقيَّمة', 'مقرّراً مُقيَّماً'])} هذا الفصل</>
          : undefined}
      />

      {/* r299 (final C): the three headline KPI cards ride ONE StatLine —
          the same fact line the dashboard and the course page open
          with. The r164-a canonical grade band still colors each value
          (tone is derived from the band, never re-invented here).
          r305-c (Heron): the strip is the page's ONE deep band — the
          theme-reactive inversion earns the hierarchy; the sheet
          re-derives every inner ink toward the band's own fg pole so
          the canonical tones stay AA in both themes. */}
      <div className="r305s-band r305s-band--deep results-summary">
        <p className="r305s-eyebrow">ملخّص الدرجات</p>
        <StatLine
        items={[
          {
            label: 'أعلى درجة',
            value: d.headline.highest ? <bdi>{formatPct1(d.headline.highest.gradePct)}%</bdi> : '—',
            hint: d.headline.highest?.courseName ?? 'لا توجد درجات بعد',
            tone: d.headline.highest ? bandTone(d.headline.highest.gradePct) : 'neutral',
          },
          {
            label: 'المتوسّط',
            value: d.headline.avgGradePct !== null ? <bdi>{formatPct1(d.headline.avgGradePct)}%</bdi> : '—',
            hint: d.headline.courseCount > 0
              ? `عبر ${countAr(d.headline.courseCount, ['مقرّر واحد', 'مقرّرين', 'مقرّرات', 'مقرّراً'])}`
              : 'لا تقييمات بعد',
            tone: d.headline.avgGradePct !== null ? bandTone(d.headline.avgGradePct) : 'neutral',
          },
          {
            label: 'أدنى درجة',
            value: d.headline.lowest ? <bdi>{formatPct1(d.headline.lowest.gradePct)}%</bdi> : '—',
            hint: d.headline.lowest?.courseName ?? '—',
            tone: d.headline.lowest ? bandTone(d.headline.lowest.gradePct) : 'neutral',
          },
        ]}
        />
      </div>

      {/* 5-A6 P2-9 — the chart card carries its own hook class: on phone
          (≤640px, student.css) it re-orders above the stacked KPI cards
          so the page's one data visualization starts at the fold. */}
      <Card title="درجاتك حسب المقرّر" icon={Activity} subtitle={hasGrades ? 'النسبة المرجَّحة لكل مقرّر' : 'ستظهر درجاتك هنا فور تسجيلها'} className="results-chart-card">
        {!hasGrades ? (
          <EmptyState illustration="empty-list" title="لم تُسجَّل أي درجات بعد" description="يبدأ الحساب فور رصد أوّل تقييم في أي مقرّر." />
        ) : (
          // 5-A6 P1-2 — ChartFrame: the canvas gains role=img + an
          // accessible name, a prose summary and a visually-hidden data
          // table (the dashboard doughnut's treatment 40 lines away in
          // spirit; a bare <canvas> is opaque to screen readers).
          <ChartFrame
            className="results-chart-frame"
            ariaLabel="درجاتك حسب المقرّر بالنسبة المئوية"
            summary={
              d.headline.avgGradePct !== null
                ? `متوسّط درجاتك ${formatPct1(d.headline.avgGradePct)}% عبر ${countAr(d.headline.courseCount, ['مقرّر واحد', 'مقرّرين', 'مقرّرات', 'مقرّراً'])}`
                : 'لم تُسجَّل درجات بعد.'
            }
            height={Math.max(180, d.courses.length * 32)}
            table={{
              caption: 'درجاتك حسب المقرّر بالنسبة المئوية',
              columns: ['المقرّر', 'الدرجة'],
              rows: d.courses.map((r) => [r.courseName, `${formatPct1(r.gradePct)}%`]),
            }}
          >
            {/* Horizontal bars — Arabic course names read at full width on
                the start edge, and the reversed value axis anchors 0 at the
                inline-start edge so bars grow in the reading direction
                (audit 0-d P2). Inline value labels are dropped: the shared
                valueLabels plugin draws at the value-end assuming an
                LTR axis (chartTheme.ts, wave-2); exact values stay
                readable in the adjacent detail card and in tooltips. */}
            <Bar
              key={themeKey}
              data={{
                labels: d.courses.map((r) => r.courseName),
                datasets: [{
                  label: 'الدرجة',
                  data: d.courses.map((r) => r.gradePct ?? 0),
                  /* r164-a: كل عمود يحمل لون نطاقه من السلّم الكنونيّ
                     (PASS = cc.gold) بدل السلّم الخاصّ القديم الذي كان
                     يصبغ ٥٠–٦٤٪ بالأحمر. */
                  backgroundColor: d.courses.map((r) => BAND_CHART_COLOR[gradeBand(r.gradePct ?? 0).key]),
                  borderRadius: 6,
                  maxBarThickness: 26,
                }],
              }}
              options={{
                ...baseOpts,
                indexAxis: 'y',
                scales: {
                  x: { ...baseOpts.scales!.x, reverse: true, min: 0, max: 100 },
                  y: { ...baseOpts.scales!.y, position: 'right' },
                },
              }}
            />
          </ChartFrame>
        )}
      </Card>

      {/* r164-e (assessment loop) — the timeline's middle step. Submitted
          work that has not been graded yet had NO student surface at all:
          it silently dropped out of the agenda (which only lists the
          un-submitted) and never appeared in the graded feed below. This
          section keeps the state visible — with its own timestamp and the
          honest what-happens-next — until the teacher's grade lands.
          R304 (6-d): the block rides the pattern row grammar (SectionHeader
          + RowList/RowItem) — the same day-section anatomy the schedule
          page carries; the graded feed below keeps its AlertRow tones. */}
      <SectionHeader
        title="تسليمات بانتظار التقييم"
        description={
          pendingSubs.length === 0
            ? 'لا شيء بانتظار تقييم الأستاذ حالياً'
            : countAr(pendingSubs.length, ['تسليم واحد بانتظار التقييم', 'تسليمان بانتظار التقييم', 'تسليمات بانتظار التقييم', 'تسليماً بانتظار التقييم'])
        }
      />
      {pendingSubs.length === 0 ? (
        <p className="text-sm text-muted" style={{ margin: 0 }}>
          كل ما سلّمته وتمّ تقييمه يظهر في «آخر الواجبات المقيَّمة» أدناه — وسيصلك إشعار لحظة رصد أي درجة جديدة.
        </p>
      ) : (
        <RowList aria-label="تسليمات بانتظار التقييم">
          {pendingSubs.slice(0, 6).map((p) => {
            const st = submissionStatusAr(p.status);
            return (
              <RowItem
                key={p.id}
                leading={
                  /* نفس بئر الإشارة اللين الذي تحمله صفوف الإشعارات —
                     العبرة بالحالة قبل أي شارة (amber = سلّم في وقته،
                     red = سلّم متأخرًا). */
                  <span className={`np-well ${p.late ? 'danger' : 'warning'}`} aria-hidden>
                    <Icon icon={Hourglass} size={15} />
                  </span>
                }
                title={p.title}
                meta={
                  <span className="flex-col gap-1" style={{ display: 'flex' }}>
                    <span title={formatDateTimeAr(p.submittedAt)}>
                      {p.courseName} · <bdi className="font-mono" dir="ltr">{p.courseCode}</bdi> · سلّمته {timeAgoAr(p.submittedAt)}
                    </span>
                    <span>{st.hint}</span>
                  </span>
                }
                trailing={
                  <span className="flex items-center gap-2">
                    <Badge color={st.color}>{st.label}</Badge>
                    {p.offeringId && (
                      <Link
                        to={`/student/courses/${p.offeringId}`}
                        className="btn ghost sm"
                        title="الرجوع إلى سياق المقرّر حيث يظهر هذا التكليف"
                      >
                        <Icon icon={ArrowLeft} size={13} />
                        المقرّر
                      </Link>
                    )}
                  </span>
                }
              />
            );
          })}
        </RowList>
      )}

      <div className="grid-2">
        <Card title="تفصيل النتائج" icon={Activity}>
          {!hasGrades ? (
            <p className="text-sm text-muted" style={{ padding: 'var(--sp-3) 0' }}>لم تُسجَّل درجات بعد.</p>
          ) : (
            <div className="flex-col gap-4">
              {d.courses.map((r) => (
                <ProgressBar
                  key={r.offeringId}
                  value={r.gradePct ?? 0}
                  label={`${r.courseName} (${r.courseCode})`}
                  ariaLabel={`درجة مقرّر ${r.courseName}`}
                  /* r164-a: band.barColor هو لون التعبئة الكنونيّ — نفس
                     السلّم الذي يعرضه توزيع الأداء عند الأستاذ. */
                  color={gradeBand(r.gradePct ?? 0).barColor}
                />
              ))}
            </div>
          )}
        </Card>

        <Card title="آخر الواجبات المقيَّمة">
          {d.recentAssignments.length === 0 ? (
            <p className="text-sm text-muted" style={{ padding: 'var(--sp-3) 0' }}>لا توجد تقييمات حديثة.</p>
          ) : (
            <div className="flex-col gap-2">
              {d.recentAssignments.slice(0, 6).map((a) => {
                /* r164-a (status semantics): الصفّ يحمل نطاق درجته من
                   السلّم الكنونيّ — الشارة نفسها («ممتاز»…«ضعيف») التي
                   يعرضها جدول درجات الأستاذ لنفس الرقم، ومحاذاة اللون
                   مع الشارة تحلّ الانفصال البصريّ القديمّ (55٪ حمراء
                   هنا بينما هي «مقبول» عند الأستاذ). الأيقونة تقول
                   الحالة الصادقة فقط: علامة تحقّق لكل اجتياز (≥50)
                   ومثلث تحذير للضعيف (<50) — قبل r164-a كان الوجب
                   «الجيّد» 60–69 يظهر بمثلث التحذير. */
                const band = gradeBand(a.gradePct);
                return (
                  <AlertRow
                    key={a.id}
                    color={band.color}
                    icon={band.key === 'WEAK' ? AlertTriangle : CheckCircle2}
                    /* r164-e: the graded step carries the full verdict —
                       score AND ceiling (the pct alone hid the rubric),
                       falling back to the legacy pct-only title for a
                       pre-r164-e payload. */
                    title={
                      <span className="flex items-center gap-2 flex-wrap">
                        {a.grade != null && a.maxScore != null
                          ? <>{a.title} — <bdi className="font-mono">{a.grade} / {a.maxScore}</bdi> <span className="text-xs text-subtle">(<bdi>{formatPct1(a.gradePct)}%</bdi>)</span></>
                          : <>{a.title} — <bdi>{formatPct1(a.gradePct)}%</bdi></>}
                        <Badge color={band.color}>{band.label}</Badge>
                      </span>
                    }
                    /* r164-e: ملاحظة الأستاذ داخل الصف — الخطوة الأخيرة
                       من الحلقة كانت تنتهي عند الرقم. */
                    description={
                      a.feedback
                        ? <span className="flex-col gap-1" style={{ display: 'flex' }}>
                            <span>ملاحظة الأستاذ: {a.feedback}</span>
                            {a.submittedAt && (
                              <span className="text-xs text-subtle" title={formatDateTimeAr(a.submittedAt)}>
                                سلّمته {timeAgoAr(a.submittedAt)} · قُيِّم {a.gradedAt ? timeAgoAr(a.gradedAt) : '—'}
                              </span>
                            )}
                          </span>
                        : a.gradedAt ? `قُيِّم ${timeAgoAr(a.gradedAt)}` : ''
                    }
                    actions={(
                      <Link
                        to={`/student/courses/${a.offeringId}`}
                        className="btn ghost sm"
                        title="الرجوع إلى سياق المقرّر حيث يظهر هذا التكليف"
                      >
                        <Icon icon={ArrowLeft} size={13} />
                        المقرّر
                      </Link>
                    )}
                  />
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </PageFrame>
  );
}

/* ─── Labs / AR-VR ─────────────────────────────────────── */
// LabsPage moved to its own file (LabsPage.tsx).

/* ─── AR/VR ────────────────────────────────────────────── */
export function ArVrPage() {
  const q = useArExperiences();

  return (
    <PageFrame width="default">
      {/* r168b: honesty — the page is a CATALOG of seeded AR/VR titles;
          no launch action exists yet (the dead launch button was removed
          earlier). The subtitle no longer promises interactive 3D
          content delivery. */}
      <PatternPageHeader title="تجارب AR / VR" description="فهرس تجارب AR/VR للمقرّرات العمليّة — التشغيل غير متاح بعد." />

      {q.isPending ? (
        /* r148 (AUDIT-2 L8): هيكل مطابق الشكل بدل السبينر الصفحي —
           R305 Heron: نفس صفوف القائمة (بئر + عنوان + سطران). */
        <ListSkeleton rows={3} />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : !q.data || q.data.length === 0 ? (
        <EmptyState illustration="empty-list"
          title="لا توجد تجارب AR/VR بعد"
          description="ستظهر هنا حين يضيفها المسجل العام."
        />
      ) : (
        <RowList aria-label="فهرس تجارب AR/VR">
          {q.data.map((e) => (
            <RowItem
              key={e.id}
              leading={
                <span className="r305v-well" aria-hidden>
                  <Icon icon={Headset} size={18} />
                </span>
              }
              title={e.title}
              meta={
                <>
                  <span>{e.subject}</span>
                  {e.description && <span className="r305v-desc">{e.description}</span>}
                </>
              }
              trailing={<Badge color={e.type === 'VR' ? 'purple' : 'brand'}><bdi className="font-mono" dir="ltr">{e.type}</bdi></Badge>}
            />
          ))}
        </RowList>
      )}
    </PageFrame>
  );
}

/* ─── Social ───────────────────────────────────────────── */
/* "الأكثر تداولاً" — derived from the loaded feed, never hardcoded:
   the top hashtags by frequency across the fetched posts (usePosts
   loads the latest 20). The card is hidden entirely while loading, on
   error, or when no loaded post carries a hashtag — an honest absence
   beats a fabricated trend (audit 0-f P1). */
function topHashtags(posts: Post[] | undefined, limit = 5): Array<{ tag: string; count: number }> {
  if (!posts?.length) return [];
  const counts = new Map<string, number>();
  for (const p of posts) {
    for (const t of p.hashtags ?? []) counts.set(t, (counts.get(t) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ar'))
    .slice(0, limit);
}

export function SocialPage() {
  const posts = usePosts();
  const createPost = useCreatePost();
  const reactToPost = useReactToPost();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  /* 5-C5 (A12 P3-3): the composer draft survives reload AND SPA
   * navigation — sessionStorage keyed by user (a shared lab machine
   * keeps students' drafts separate), cleared on successful publish.
   * A draft is content, not state: losing it on a stray refresh was
   * the audit's cheapest "this platform cares" miss. */
  const draftKey = `mdrk:social-draft:${user?.id ?? 'me'}`;
  const [draft, setDraft] = useState<string>(() => {
    try {
      return sessionStorage.getItem(draftKey) ?? '';
    } catch {
      return ''; // private-mode browsers: the draft stays session-local
    }
  });
  useEffect(() => {
    try {
      if (draft) sessionStorage.setItem(draftKey, draft);
      else sessionStorage.removeItem(draftKey);
    } catch {
      /* best-effort persistence only */
    }
  }, [draft, draftKey]);
  const [reactedIds, setReactedIds] = useState<Set<string>>(new Set());
  /* 5-C5 (5-B1 hand-off): the real un-like. DELETE /posts/:id/react is
   * own-reaction-only by construction (the compound key pins the
   * caller), so the pressed heart is now a working toggle instead of
   * the aria-disabled state-only control it was while the route was
   * missing. The set below carries THIS session's optimistic
   * un-presses on top of the server truth. */
  const [unreactedIds, setUnreactedIds] = useState<Set<string>>(new Set());
  /* 18-G's viewerReacted (18-F2 consumption): the server's own-reaction
     truth seeds the hearts — the session-local set above now only rides
     this session's optimistic toggles on TOP of it (a reload used to
     un-like the UI while the server reaction persisted). */
  const serverReactedIds = useMemo(
    () => new Set((posts.data ?? []).filter((p) => p.viewerReacted).map((p) => p.id)),
    [posts.data],
  );
  const hasReacted = (id: string) =>
    (serverReactedIds.has(id) || reactedIds.has(id)) && !unreactedIds.has(id);
  /* Reaction-count snapshot at click time. When a like/un-like succeeds,
     the ['posts'] invalidation delivers a server count that ALREADY includes
     the change — max(server, snapshot ± 1) keeps the optimistic delta
     during flight without double-counting after the refetch (audit
     0-f P2 double-count risk). */
  const [reactionBase, setReactionBase] = useState<Record<string, number>>({});
  /* transient per-post feedback: burst = the scale-pop on the reacted
     counter, fail = the rollback note with retry */
  const [burstId, setBurstId] = useState<string | null>(null);
  const [failedLike, setFailedLike] = useState<{ id: string; mode: 'like' | 'unlike' } | null>(null);
  const burstTimer = useRef<number | undefined>(undefined);
  const failTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => {
    window.clearTimeout(burstTimer.current);
    window.clearTimeout(failTimer.current);
  }, []);
  /* Server truth arrival (the invalidation's refetch lands) clears the
     session-local toggles — the pressed states and counts then read
     straight from the payload, so a stale optimistic delta can never
     outlive its own refetch (and an un-pressed heart that the server
     still counts re-syncs to the truth). */
  useEffect(() => {
    setReactedIds(new Set());
    setUnreactedIds(new Set());
    setReactionBase({});
  }, [posts.data]);

  const publish = () => {
    if (!draft.trim() || createPost.isPending) return;
    // Extract simple #hashtags from the body for proper persistence.
    const tags = (draft.match(/#[\u0600-\u06FF\w_]+/g) ?? []).map((t) => t.slice(1));
    createPost.mutate(
      { body: draft.trim(), hashtags: tags },
      { onSuccess: () => setDraft('') },
    );
  };
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    publish();
  };

  const onLike = (id: string, serverCount: number) => {
    if (hasReacted(id)) return;
    setReactionBase((prev) => ({ ...prev, [id]: serverCount }));
    setReactedIds((prev) => new Set([...prev, id]));
    // a pending un-like of the same post is superseded by this click
    setUnreactedIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    // reaction burst — fires on interaction only, never idle
    setBurstId(id);
    window.clearTimeout(burstTimer.current);
    burstTimer.current = window.setTimeout(() => setBurstId(null), 700);
    reactToPost.mutate(
      { postId: id, kind: 'like' },
      {
        onError: () => {
          // optimistic rollback — the heart and the +1 come back off
          setReactedIds((prev) => {
            const next = new Set(prev);
            next.delete(id);
            return next;
          });
          setFailedLike({ id, mode: 'like' });
          window.clearTimeout(failTimer.current);
          failTimer.current = window.setTimeout(() => setFailedLike(null), 5000);
        },
      },
    );
  };

  /* Un-like — 5-B1's DELETE route wired to the pressed heart (the
     aria-disabled state-only control it used to be). Own-reaction-only
     by construction server-side; optimistic un-press + −1 with
     rollback, and the server's viewerReacted flips on the refetch. */
  const removeLike = useMutation({
    mutationFn: (postId: string) =>
      unwrap<{ ok: boolean }>(api.delete(`/posts/${postId}/react`, { data: { kind: 'like' } })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['posts'] }),
  });
  const onUnlike = (id: string, serverCount: number) => {
    if (!hasReacted(id)) return;
    setReactionBase((prev) => ({ ...prev, [id]: serverCount }));
    setUnreactedIds((prev) => new Set([...prev, id]));
    removeLike.mutate(id, {
      onError: () => {
        setUnreactedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
        setFailedLike({ id, mode: 'unlike' });
        window.clearTimeout(failTimer.current);
        failTimer.current = window.setTimeout(() => setFailedLike(null), 5000);
      },
    });
  };

  const trending = topHashtags(posts.data);
  const likeInFlight = (id: string) =>
    (reactToPost.isPending && reactToPost.variables?.postId === id)
    || (removeLike.isPending && removeLike.variables === id);

  return (
    <div className="r319s-page">
    <PageFrame width="default">
      <PatternPageHeader
        title="الشبكة الاجتماعية"
        description="تواصل مع زملائك وأساتذتك حول المقرّرات والمشاريع."
      />

      <div className="grid-2-1">
        <div className="flex-col gap-3">
          {/* Composer */}
          {user && (
            <Card compact>
              <form onSubmit={submit} className="flex-col gap-3">
                <div className="flex items-start gap-3">
                  <UserAvatar
                    initials={user.avatarInitials ?? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`}
                    color={user.avatarColor ?? undefined}
                    size={36}
                  />
                  <textarea
                    className="social-composer"
                    aria-label="اكتب منشوراً جديداً"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="ماذا يدور في ذهنك؟ (يمكنك استخدام #هاشتاج)"
                    rows={2}
                    maxLength={2000}
                  />
                </div>
                {createPost.isError && (
                  <div className="social-compose-error" role="alert">
                    <Icon icon={AlertTriangle} size={14} aria-hidden />
                    <span>تعذّر نشر المنشور — نصّك ما زال محفوظاً بالأعلى.</span>
                    <button type="button" className="btn ghost sm" onClick={publish}>
                      إعادة المحاولة
                    </button>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="r305s-meta-row">
                    {draft.trim() !== '' && <span>مسودة محفوظة تلقائيّاً</span>}
                    <span><bdi>{formatNum(draft.length)}</bdi> / <bdi>2000</bdi></span>
                  </span>
                  <button
                    type="submit"
                    className="btn primary sm"
                    disabled={!draft.trim() || createPost.isPending}
                  >
                    {createPost.isPending ? 'جارٍ النشر…' : 'نشر'}
                  </button>
                </div>
              </form>
            </Card>
          )}

          {posts.isPending ? (
            <Card>
              {/* shape-matched skeleton: two post cards */}
              <div className="flex-col gap-4" aria-busy="true">
                {[0, 1].map((i) => (
                  <div key={i} aria-hidden>
                    <div className="flex items-center gap-3" style={{ marginBlockEnd: 'var(--sp-3)' }}>
                      <Skeleton width={36} height={36} rounded="50%" />
                      <div className="flex-col gap-2">
                        <Skeleton width={120} height={13} />
                        <Skeleton width={64} height={10} />
                      </div>
                    </div>
                    <div className="flex-col gap-2">
                      <Skeleton width="92%" height={12} />
                      <Skeleton width="70%" height={12} />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : posts.isError ? (
            <Card>
              <ErrorState
                message="تعذَّر تحميل المنشورات"
                error={posts.error}
                onRetry={() => posts.refetch()}
              />
            </Card>
          ) : !posts.data?.length ? (
            /* R319 (c3-S2): the empty feed is the sheet's reserved-but-
               empty region — the hatched EmptyCell (the old EmptyState's
               copy, kept honest and verbatim). */
            <EmptyCell
              label="لا منشورات بعد"
              note="كن أول من يشارك تجربته أو سؤاله."
            />
          ) : (
            posts.data.map((p) => {
              const initials = p.author.avatarInitials ?? `${p.author.firstName[0] ?? ''}${p.author.lastName[0] ?? ''}`;
              const reacted = hasReacted(p.id);
              /* The optimistic ±1 applies ONLY to this session's clicks —
                 a server-truth reaction is already inside _count.reactions.
                 An un-like reads the click-time snapshot − 1 (the server
                 count still carries the like until the refetch lands). */
              const optimisticAdd = reactedIds.has(p.id) && !unreactedIds.has(p.id);
              const optimisticRemove = !optimisticAdd && unreactedIds.has(p.id);
              const displayed = optimisticAdd
                ? Math.max(p._count.reactions, (reactionBase[p.id] ?? p._count.reactions) + 1)
                : optimisticRemove
                  ? Math.max(0, (reactionBase[p.id] ?? p._count.reactions) - 1)
                  : p._count.reactions;
              return (
                <article className="post" key={p.id}>
                  <div className="post-header">
                    <UserAvatar initials={initials} color={p.author.avatarColor ?? undefined} size={36} />
                    <div className="flex-1">
                      <div className="post-author">{p.author.firstName} {p.author.lastName}</div>
                      <div className="post-time">{timeAgoAr(p.createdAt)}</div>
                    </div>
                  </div>
                  <div className="post-body">{p.body}</div>
                  {p.hashtags && p.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1" style={{ marginTop: 'var(--sp-1-5)' }}>
                      {p.hashtags.map((t) => (
                        // r183-B3 (A6 P3): Arabic hashtags never ride the
                        // numeric-mono costume (same ruling as the library
                        // labels) — the chip keeps the accent-ink colour
                        // only. 5-C5 (A12 P2-5): --accent on white is
                        // 3.8:1 at 11px — --accent-ink is the designed
                        // text-grade pair (same family as A11 P2-2's
                        // profile fix).
                        <span key={t} className="text-xxs" style={{ color: 'var(--accent-ink, var(--accent))' }}>#{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="post-actions">
                    <button
                      type="button"
                      className={`post-action${reacted ? ' on' : ''}`}
                      onClick={() =>
                        (reacted ? onUnlike(p.id, p._count.reactions) : onLike(p.id, p._count.reactions))}
                      aria-pressed={reacted}
                      aria-label={reacted ? 'إزالة الإعجاب' : 'أعجبني بهذا المنشور'}
                      disabled={likeInFlight(p.id)}
                    >
                      <Icon icon={Heart} size={13} aria-hidden />
                      <span className={`post-count${burstId === p.id ? ' pop' : ''}`}>
                        {formatNum(displayed)}
                      </span>
                    </button>
                    {/* The old comment button was a dead control (there is no
                        post-comment API) — removed instead of faked. */}
                  </div>
                  {failedLike?.id === p.id && (
                    <div className="post-like-fail" role="alert">
                      <Icon icon={AlertTriangle} size={12} aria-hidden />
                      <span>{failedLike.mode === 'unlike' ? 'تعذّر إلغاء الإعجاب.' : 'تعذّر تسجيل الإعجاب.'}</span>
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() =>
                          (failedLike.mode === 'unlike'
                            ? onUnlike(p.id, p._count.reactions)
                            : onLike(p.id, p._count.reactions))}
                      >
                        إعادة المحاولة
                      </button>
                    </div>
                  )}
                </article>
              );
            })
          )}
        </div>

        {trending.length > 0 && (
          /* R319 (c3-S2): the rail's heading joins the §B2 title-bar
             register — [01] الأكثر تداولاً, the honest measured-tag count
             as the bar's mono meta; the old Card subtitle survives
             verbatim as the under-bar note. The rail keeps its
             start-aligned hug (22-c A5 P2-1). */
          <div style={{ alignSelf: 'start' }}>
            <SectionBar
              index="01"
              title="الأكثر تداولاً"
              meta={(
                <BarCount
                  n={trending.length}
                  srLabel={countAr(trending.length, ['وسم واحد متداولاً', 'وسمان متداولاان', 'وسوم متداولة', 'وسماً متداولاً'])}
                />
              )}
            />
            <p className="r319sp-sec-note">الوسوم الأكثر تكراراً في آخر 20 منشوراً محمَّلاً.</p>
            <Card>
            <ol className="trend-list">
              {trending.map((t, i) => (
                <li className="trend-item" key={t.tag}>
                  <span className="trend-rank" aria-hidden>{i + 1}</span>
                  <span className="trend-tag" title={`#${t.tag}`}>
                    <bdi>#{t.tag}</bdi>
                  </span>
                  <span
                    className="trend-count"
                    title={arUnit(t.count, 'منشور', 'منشوران', 'منشورات')}
                  >
                    <bdi>{t.count}</bdi>
                  </span>
                </li>
              ))}
            </ol>
            </Card>
          </div>
        )}
      </div>
    </PageFrame>
    </div>
  );
}

/* ─── Downloads ────────────────────────────────────────── */
function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}
function formatShortDate(iso: string): string {
  return formatDate(iso, { day: 'numeric', month: 'short' });
}

/* r157 (F8, 6A7): فعل التحميل كان رابطاً خاماً واحداً لكل الصفوف —
 * مع بذور example.invalid ذلك رابط ميّت يفتح تبويب خطأ. الحقل
 * الحقيقي الآن يُحسم عبر materialHref (lib/materialHref.ts):
 * مسار ملفات الأبحاث الداخلي → عارض /document داخل التطبيق (يرسل
 * PdfViewer رمز Bearer)، https حقيقي → تبويب خارجي جديد، وكل ما لا
 * يمكن فتحه بصدق → «غير متوفر بعد» بلا أي رابط. */
function MaterialAction({ material }: { material: StudentMaterial }) {
  const target = materialHref({ url: material.url, name: material.name });
  if (target.kind === 'viewer') {
    return (
      <Link to={target.to} className="btn ghost sm">
        <Icon icon={BookOpen} size={13} /> فتح
      </Link>
    );
  }
  if (target.kind === 'external') {
    return (
      <a href={target.href} target="_blank" rel="noreferrer" className="btn ghost sm">
        <Icon icon={Download} size={13} /> تحميل
      </a>
    );
  }
  /* المحجوزات (RFC 2606) والروابط غير الآمنة — الحالة الصادقة:
     نص بلا مرساة؛ مرساة ميّتة أسوأ من لا مرساة. R305 Heron: الحالة
     تصنيفٌ، فتصعد على الرقاقة المحايدة المشتركة. */
  return (
    <span className="r305s-chip" role="note">
      <span className="r305s-chip-dot" aria-hidden />
      غير متوفر بعد
    </span>
  );
}

export function DownloadsPage() {
  const q = useStudentMaterials();

  return (
    <div className="r319s-page">
    <PageFrame width="default">
      <PatternPageHeader title="مركز التحميلات" description="ملفّات مقرّراتك في مكان واحد — وحالة كل رابط معلَنة." />

      {/* R319 (c3-S2): the files region opens with the §B2 title-bar —
          [01] ملفّات حديثة, the honest resolved material count as mono
          meta (countAr for assistive tech). */}
      <SectionBar
        index="01"
        title="ملفّات حديثة"
        meta={
          !q.isPending && !q.isError && (q.data?.length ?? 0) > 0 ? (
            <BarCount
              n={q.data!.length}
              srLabel={countAr(q.data!.length, ['ملفّ واحد', 'ملفّان', 'ملفّات', 'ملفاً'])}
            />
          ) : undefined
        }
      />
      <Card>
        {q.isPending ? (
          <TableSkeleton rows={5} cols={6} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} />
        ) : !q.data || q.data.length === 0 ? (
          /* R319 (c3-S2): the empty shelf is the sheet's reserved-but-
             empty region — the hatched EmptyCell (same honest copy). */
          <EmptyCell
            label="لا توجد ملفّات بعد"
            note="ستظهر هنا فور رفع موادّ في أيٍّ من مقرّراتك المسجَّلة."
          />
        ) : (
          <div className="table-wrap">
            <table className="table tbl-stack">
              <thead>
                <tr>
                  <th scope="col">الملفّ</th>
                  <th scope="col">المقرّر</th>
                  <th scope="col">النوع</th>
                  <th scope="col">الحجم</th>
                  <th scope="col">التاريخ</th>
                  {/* r171c (axe empty-table-header): the actions column
                      used to be a bare <th aria-label="إجراءات" /> — an
                      empty cell whose accessible name never reaches the
                      visual layer. Real visible text, same Arabic copy
                      as OwnerUsersPage's actions header; the mobile
                      tbl-stack layout hides thead anyway (the td's own
                      data-label="التحميل" labels the stacked row). */}
                  <th scope="col">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {q.data.map((f) => (
                  <tr key={f.id}>
                    <td className="tbl-strong" data-label="الملفّ">{f.name}</td>
                    <td data-label="المقرّر">{f.course.name}</td>
                    <td data-label="النوع"><Badge>{f.type}</Badge></td>
                    <td className="tbl-num" data-label="الحجم">{f.sizeBytes > 0 ? formatSize(f.sizeBytes) : '—'}</td>
                    <td className="text-subtle" data-label="التاريخ">{formatShortDate(f.createdAt)}</td>
                    <td data-label="التحميل">
                      <MaterialAction material={f} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </PageFrame>
    </div>
  );
}

/* ─── University Info ──────────────────────────────────── */

/* r183-B3 (A6 P2): the slug of the reference showcase institution —
 * the same contract as the backend's SHOWCASE_INSTITUTION_SLUG
 * (http/routes/colleges.routes.ts) and the seed row (prisma/seed.ts,
 * slug `madarek-demo` — r188 fictional demo tenant). Only this institution renders the curated
 * ZU showcase facts; every other institution gets its own identity
 * and only the facts the platform actually holds for it. */
const SHOWCASE_INSTITUTION_SLUG = 'madarek-demo';

export function UniversityInfoPage() {
  const institution = useAuthStore((s) => s.currentInstitution);
  const facs = useFaculties(useCurrentInstitutionSlug()); // r180: caller-institution scoping
  const faculties = facs.data ?? [];
  const insideCampus = faculties.filter((f) => f.city === 'حرم المعرفة');
  const outsideCampus = faculties.filter((f) => f.city !== 'حرم المعرفة');
  const cityCount = new Set(faculties.map((f) => f.city)).size;
  /* r183-B3: the outside-branch change line said «في 0 مدينة» whenever
   * every faculty sat outside the main campus — a self-contradictory KPI (the
   * alandalus view). Phrase the line ONLY from the real distinct
   * cities of the outside faculties, and only when there are any. */
  const outsideCityCount = new Set(outsideCampus.map((f) => f.city)).size;

  /* Null context (the multi-membership pre-selection edge) keeps the
   * showcase default — the only institution whose facts the platform
   * curates. A scoped session at any OTHER institution never reads
   * the ZU identity again. */
  const isShowcase = !institution || institution.slug === SHOWCASE_INSTITUTION_SLUG;

  const facCount = facs.isPending
    ? '…'
    : facs.isError || faculties.length === 0 ? '—' : formatNum(faculties.length);
  const citiesChange = cityCount > 0
    ? `موزَّعة على ${countAr(cityCount, ['مدينة واحدة', 'مدينتين', 'مدن', 'مدينة'])}`
    : undefined;

  if (!isShowcase) {
    /* ── The institution's OWN page (r183-B3): name/slug facts + the
     * faculties scoped to it. The ZU-specific facts (founding year,
     * campus split, demo profile, strategic plan,
     * contact block) are showcase-curated content and are dropped —
     * never re-attributed to another institution. */
    const inst: InstitutionSummary = institution;
    return (
      <PageFrame width="default">
        <PatternPageHeader
          title={inst.name}
          description="مؤسّسة تعليميّة على منصّة مدارك — تعرض هذه الصفحة الكليّات المسجَّلة في مؤسّستك."
        />

        <div className="grid-4">
          <MetricCard
            icon={Building2}
            label="عدد الكليّات"
            value={facCount}
            change={citiesChange}
            color="brand"
          />
        </div>

      {/* R305 Heron: the identity card is the page's ONE deep band — the
          authority surface. Facts ride the band-safe .r305u-fact anatomy
          (the deep FactRow variant) inside the .r305u-facts grid. */}
        <section aria-label="بطاقة التعريف">
          <div className="r305s-kicker">
            <h2 className="r305s-kicker-title">بطاقة تعريف</h2>
          </div>
          <div className="r305s-band r305s-band--deep">
            <div className="r305u-facts">
              <FactRow deep label="الاسم الرسميّ" value={inst.name} />
              {inst.nameEn ? (
                <FactRow deep label="الاسم بالإنجليزيّة" value={inst.nameEn} mono />
              ) : null}
              <FactRow deep label="المعرّف على المنصّة" value={inst.slug} mono />
            </div>
          </div>
        </section>

        {facs.isError ? (
          /* One honest error surface for the shared query (the
           * showcase branch's own convention). */
          <Card title="الكليّات" icon={Building2}>
            <ErrorState
              message="تعذَّر تحميل قائمة الكليّات"
              error={facs.error}
              onRetry={() => facs.refetch()}
            />
          </Card>
        ) : (
          <Card
            title="كلّيّات المؤسّسة"
            icon={Building2}
            subtitle={facs.isPending ? 'جارٍ التحميل…' : `${countAr(faculties.length, ['كلّيّة واحدة', 'كلّيّتان', 'كلّيّات', 'كلّيّة'])} في مؤسّستك`}
          >
            {facs.isPending ? (
              <div className="flex-col gap-2" aria-busy="true">
                {[0, 1, 2, 3].map((i) => (
                  <div className="campus-skel-row" key={i} aria-hidden>
                    <Skeleton width={130} height={13} />
                    <span style={{ flex: 1 }} />
                    <Skeleton width={54} height={13} />
                  </div>
                ))}
              </div>
            ) : faculties.length === 0 ? (
              <EmptyState illustration="empty-list" title="لا توجد كلّيّات بعد" description="لم تُسجَّل كلّيّات في هذه المؤسّسة بعد." />
            ) : (
              <div className="grid-auto-260" style={{ gap: 'var(--sp-2)' }}>
                {faculties.map((f) => (
                  <Link
                    key={f.id}
                    to={`/colleges/${f.id}`}
                    className="faculty-chip-row"
                  >
                    <span className="faculty-chip-emoji" aria-hidden>
                      <EmojiIcon emoji={f.iconEmoji ?? '🏛️'} size={16} />
                    </span>
                    <span className="text-sm" style={{ flex: 1, minWidth: 0 }}>{f.name}</span>
                    <Badge color="purple">{f.city}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        )}
      </PageFrame>
    );
  }

  return (
    <PageFrame width="default">
      {/* r188: the demonstration tenant — the platform's explicitly
          FICTIONAL reference institution. Every fact below is synthetic
          demo data (no real founding year, decree, or history); the
          page labels the tenant as بيانات تجريبية throughout. */}
      <PatternPageHeader
        title="جامعة مدارك التجريبية"
        description="مؤسّسة العرض على منصّة مدارك — مؤسّسة اصطناعية بالكامل تُظهر سير العمل الأكاديمي ببيانات تجريبية عبر ثلاثة حرَم معرفيّة."
        meta={outsideCityCount > 0 ? (
          /* سطر التوزيع الحقيقي للفروع — العدّ من مدن الكليّات الخارجيّة
             الفعليّة لا من السقّ النظري (عقد r183-B3: لا «في 0 مدينة»). */
          <span>
            الفروع الخارجيّة{' '}
            <span className="metric-change">في {countAr(outsideCityCount, ['مدينة واحدة', 'مدينتين', 'مدن', 'مدينة'])}</span>
          </span>
        ) : undefined}
      />

      {/* R304 (6-d): حائط بطاقات KPI السابق صار سطر أرقام واحد (StatLine) —
          نفس الحقائق نفسها الصدق: العدّ الحقيقي من الكليّات المحمّلة،
          وسطر التجريبيّة يعلن طابع البيانات. */}
      <StatLine
        items={[
          {
            label: 'عدد الكليّات',
            value: facCount,
            hint: citiesChange,
            tone: 'signal',
          },
          {
            label: 'داخل الحرم الجامعيّ',
            value: facs.isPending ? '…' : facs.isError ? '—' : formatNum(insideCampus.length),
            hint: 'حرم المعرفة',
          },
          {
            label: 'فروع خارجيّة',
            value: facs.isPending ? '…' : facs.isError ? '—' : formatNum(outsideCampus.length),
          },
          {
            label: 'الحرَم الأكاديميّة',
            value: formatNum(3),
            hint: 'بيانات تجريبية',
          },
        ]}
      />

      {/* Vision + Mission (the demo tenant's synthetic strategy —
          mirrors static-source.ts strategicPlan.*) */}
      <div className="grid-2">
        <Card title="الرؤية" icon={Target}>
          <p style={{ fontSize: 'var(--fs-md)', color: 'var(--text)', lineHeight: 'var(--lh-loose)', margin: 0 }}>
            منصّة عرض تُبرهن على تعليم عالي منظَّم رقميًا — ببيانات اصطناعية آمنة.
          </p>
        </Card>
        <Card title="الرسالة" icon={Star}>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', lineHeight: 'var(--lh-loose)', margin: 0 }}>
            إظهار سير العمل الأكاديمي الكامل — من الهيكل إلى الإتقان — داخل مدارك:
            تجربة الطالب، تقييم الأستاذ، عزل المؤسّسات، وجودة قابلة للقياس، كلها كأمثلة حيّة.
          </p>
        </Card>
      </div>

      {/* R305 Heron: the identity card is the page's ONE deep band — the
          authority surface. Facts ride the band-safe .r305u-fact anatomy
          (the deep FactRow variant) inside the .r305u-facts grid. */}
      <section aria-label="بطاقة التعريف">
        <div className="r305s-kicker">
          <h2 className="r305s-kicker-title">بطاقة تعريف</h2>
        </div>
        <div className="r305s-band r305s-band--deep">
          <div className="r305u-facts">
            <FactRow deep label="الاسم الرسميّ" value="جامعة مدارك التجريبية" />
            <FactRow deep label="النطاق" value="بيانات اصطناعية — لا مؤسّسة حقيقية" />
            <FactRow deep label="النوع" value="مؤسّسة عرض تجريبية (اصطناعية)" />
            <FactRow deep label="بريد العرض" value="demo.madarek.ly" mono />
            <FactRow deep label="الحرم" value="حرم المعرفة · حرم الابتكار · حرم البيان" />
            <FactRow deep label="طابع البيانات" value="مولَّدة لأغراض العرض" />
          </div>
        </div>
      </section>

      {facs.isError ? (
        /* One honest error surface for the shared query — no masked
           “لا توجد بيانات” empty states (audit 0-d P1). */
        <Card title="الكليّات" icon={Building2}>
          <ErrorState
            message="تعذَّر تحميل قائمة الكليّات"
            error={facs.error}
            onRetry={() => facs.refetch()}
          />
        </Card>
      ) : (
        <>
          <Card
            title="الكليّات داخل الحرم الجامعيّ"
            icon={Building2}
            subtitle={facs.isPending ? 'جارٍ التحميل…' : `${countAr(insideCampus.length, ['كلّيّة واحدة', 'كلّيّتان', 'كلّيّات', 'كلّيّة'])} في الحرم الرئيسي`}
          >
            {facs.isPending ? (
              <div className="flex-col gap-2" aria-busy="true">
                {[0, 1, 2, 3].map((i) => (
                  <div className="campus-skel-row" key={i} aria-hidden>
                    <Skeleton width={110} height={13} />
                    <span style={{ flex: 1 }} />
                    <Skeleton width={40} height={13} />
                  </div>
                ))}
              </div>
            ) : insideCampus.length === 0 ? (
              <EmptyState illustration="empty-list" title="لا توجد بيانات" description="لم تُسجَّل كلّيّات داخل الحرم بعد." />
            ) : (
              <div className="grid-auto-200" style={{ gap: 'var(--sp-2)' }}>
                {insideCampus.map((f) => (
                  <Link
                    key={f.id}
                    to={`/colleges/${f.id}`}
                    className="faculty-chip-row"
                  >
                    <span className="faculty-chip-emoji" aria-hidden>
                      <EmojiIcon emoji={f.iconEmoji ?? '🏛️'} size={16} />
                    </span>
                    <span className="text-sm" style={{ flex: 1 }}>{f.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          <Card
            title="الكليّات الفرعيّة"
            icon={Building2}
            subtitle={facs.isPending ? 'جارٍ التحميل…' : `${countAr(outsideCampus.length, ['كلّيّة واحدة', 'كلّيّتان', 'كلّيّات', 'كلّيّة'])} موزَّعة على ${countAr(new Set(outsideCampus.map((c) => c.city)).size, ['مدينة واحدة', 'مدينتين', 'مدن', 'مدينة'])}`}
          >
            {facs.isPending ? (
              <div className="flex-col gap-2" aria-busy="true">
                {[0, 1, 2, 3].map((i) => (
                  <div className="campus-skel-row" key={i} aria-hidden>
                    <Skeleton width={130} height={13} />
                    <span style={{ flex: 1 }} />
                    <Skeleton width={54} height={13} />
                  </div>
                ))}
              </div>
            ) : outsideCampus.length === 0 ? (
              <EmptyState illustration="empty-list" title="لا توجد فروع خارج الحرم" description="كل الكليّات المسجَّلة داخل الحرم الرئيسي." />
            ) : (
              <div className="grid-auto-260" style={{ gap: 'var(--sp-2)' }}>
                {outsideCampus.map((f) => (
                  <Link
                    key={f.id}
                    to={`/colleges/${f.id}`}
                    className="faculty-chip-row"
                  >
                    <span className="faculty-chip-emoji" aria-hidden>
                      <EmojiIcon emoji={f.iconEmoji ?? '🏛️'} size={16} />
                    </span>
                    <span className="text-sm" style={{ flex: 1, minWidth: 0 }}>{f.name}</span>
                    <Badge color="purple">{f.city}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </>
      )}

      <Card title="بطاقة تعريف المؤسّسة" icon={Crown}>
        <div className="r305u-rows">
          {/* r155b: العضويّات تُقرأ من UNIVERSITY_FACTS (data/university.facts.ts
              — مصدر الحقيقة الوحيد المعتمد على static-source.ts). النسخة
              المحليّة السابقة أعادت إنتاج خطأ إعادة الكتابة الموثّق هناك:
              «اتحاد الجامعات الإسلامية» بدل المتوسطيّة. الشارة تحمل تصنيف
              العضويّة (label) — الاختصارات اللاتينيّة القديمة لم تكن ضمن
              المصدر المعتمد أصلاً. */}
          {/* R305 Heron: the inline surface-2 wells become hairline ledger
              rows (.r305u-row). The membership Badge drops the gold tone —
              gold is the ACHIEVEMENTS-only signal on the Madarek canon;
              institutional classifications ride the neutral chip. */}
          {UNIVERSITY_FACTS.profile.map((m) => (
            <div key={m.label} className="r305u-row">
              <span className="text-sm r305u-row-main">{m.full}</span>
              <Badge>{m.label}</Badge>
            </div>
          ))}
        </div>
        {/* 5-A6 P2-7 — accreditation chip as a class (student.css
            .uni-accredit): the old inline styles painted --accent on
            --accent-soft at 11px (measured 3.06:1); the class pairs the
            pastel with its -deep rung ink. */}
        <div className="uni-accredit">
          معتمدة من وزارة التعليم العالي والبحث العلميّ — ليبيا
        </div>
      </Card>

      {/* Strategic plan */}
      <Card title="الخطّة الاستراتيجيّة 2024–2028" icon={Target} subtitle="خارطة طريق للارتقاء بمكانة الجامعة وتعزيز دورها في خدمة المجتمع">
        <div className="grid-2 r305u-rows">
          {[
            'تقديم برامج تعليميّة وفق معايير الجودة المحليّة والدوليّة',
            'الارتقاء بمستوى البحث العلميّ',
            'تعزيز دور الجامعة في خدمة المجتمع',
            'توفير بيئة مناسبة وتحسين مستوى الخدمات',
            'تأهيل وتطوير الموارد البشريّة',
            'مواءمة المخرجات مع متطلّبات سوق العمل',
            'دعم التعاون مع المؤسّسات المحليّة والدوليّة',
            'تجويد الخدمات التعليميّة والمجتمعيّة',
          ].map((g) => (
            <div key={g} className="r305u-row">
              <Icon icon={CheckCircle2} size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <span className="text-sm r305u-row-main">{g}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="الشهادات والبرامج الأكاديميّة" icon={Microscope} subtitle="درجات أكاديميّة معتمدة على الموقع الرسميّ">
        <div className="grid-3" style={{ gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
          {[
            { ar: 'الإجازة الجامعيّة', en: 'Bachelor / Licence' },
            { ar: 'الدراسات العليا', en: "Master's" },
            { ar: 'الدراسات الدقيقة', en: 'PhD / Doctorate' },
          ].map((d) => (
            /* Leading icon chip replaces the old 3px borderRight stripe
               (orchestrator ruling #4 — no colored start-edge stripes). */
            <div key={d.en} className="degree-card">
              <span className="degree-card-icon" aria-hidden>
                <Icon icon={GraduationCap} size={16} />
              </span>
              <div>
                <div className="text-sm" style={{ fontWeight: 600 }}>{d.ar}</div>
                <div className="text-xxs text-subtle font-mono"><bdi>{d.en}</bdi></div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="معلومات التواصل" icon={Headset}>
        <div className="grid-2">
          <FactRow label="العنوان" value="بيانات عرض — بلا عنوان حقيقي (مؤسّسة اصطناعية)" />
          <FactRow label="الهاتف" value="+218 23 762659" mono />
          <FactRow label="هاتف بديل" value="+218 23 762882" mono />
          <FactRow label="البريد العامّ" value="info@demo.madarek.ly" mono />
          <FactRow label="بريد العرض" value="ico@demo.madarek.ly" mono />
          <FactRow label="نطاق العرض" value="demo.madarek.ly" mono />
        </div>
      </Card>
    </PageFrame>
  );
}

function FactRow({ label, value, mono, deep }: { label: string; value: string; mono?: boolean; deep?: boolean }) {
  /* R305 Heron deep variant: on the identity band the frozen .fact-tile
     well (light surface-2) would fight the inverted ground — the deep
     anatomy is label-over-value with a hairline base instead. */
  if (deep) {
    return (
      <div className="r305u-fact">
        <span className="r305u-fact-label">{label}</span>
        {mono ? (
          <bdi dir="ltr" className="font-mono r305u-fact-value">{value}</bdi>
        ) : (
          <span className="r305u-fact-value">{value}</span>
        )}
      </div>
    );
  }
  return (
    <div className="fact-tile">
      <span className="text-xxs text-subtle">{label}</span>
      {mono ? (
        /* bidi-isolated LTR run — phone numbers / emails / domains keep
           their order inside Arabic copy (audit 0-d P2, unified pattern) */
        <bdi dir="ltr" className="font-mono text-sm" style={{ color: 'var(--text)' }}>{value}</bdi>
      ) : (
        <span className="text-sm" style={{ color: 'var(--text)' }}>{value}</span>
      )}
    </div>
  );
}
