/**
 * Self-Development module — three pages:
 *  TrainingCatalogPage   /training              browse + filter all tracks
 *  TrainingTrackPage     /training/:slug        track detail with lessons
 *  TrainingLessonPage    /training/:slug/lesson/:id   read a lesson + complete
 *  AchievementsPage      /achievements          my badges + certificates + leaderboard
 *
 * Naming: this module is presented as "التطوير الذاتي" (Self-Development).
 * Visual language: same brand primitives, gold for points/levels,
 * UoZ green for completion milestones, no glittery gamification.
 * Styling lives in styles/training.css (@layer pages).
 */
import { useMemo, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  Sparkles, Award, Clock, CheckCircle2, Lock,
  ChevronLeft, ChevronRight, BookOpen, Target, Crown, Star, Medal,
  AlertTriangle,
} from 'lucide-react';
import { Card, Badge, ProgressBar, UserAvatar, AlertRow } from '../../components/primitives';
import { StatStrip } from '../../components/primitives/Ledger';
/* r265 (4E — اتجاه Superlist): شبكة بطاقات المسارات تصير قائمة صفوف
   هادئة (عقد RowList/RowItem) — العنوان باب الصف والتفاصيل على السطر
   الثانوي والتقدّم في الطرف. G النهائية: الإطار/الترويسة/التصفية على
   عقد patterns كاملة (PageFrame/PageHeader/FilterBar) — نفس لغة
   عائلة المجتمع/المسابقات/الكليات. */
import { PageFrame, PageHeader, RowList, RowItem, FilterBar } from '../../components/patterns';
import { PageSkeleton, DetailSkeleton, ErrorState, EmptyState, Skeleton, ListSkeleton, CardSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import { formatNum, formatDate } from '../../utils/numbers';
import {
  useTrainingCatalog, useTrainingTrack, useEnrollTrack, useCompleteLesson,
  useTrainingMe, useMyBadges, useMyTrainingCerts, useTrainingLeaderboard,
  type TrainingCategory, type TrainingTrackCard, type TrainingLessonView,
  type Tier,
} from '../../hooks/useResources';
import { TIER_LABEL, TIER_COLOR, RARITY_COLOR, RARITY_LABEL } from '../../lib/gamification';
import { apiErrorMessage, countAr } from '../../lib/format';
import { useIsNarrowLayout } from '../../hooks/useIsNarrowLayout';
import { useEntityPageTitle } from '../../components/layout/AppShell';
import '../../styles/training.css'; // training surfaces + shared families this module owns (D11 css split, 12-15)

const CATEGORY_LABEL: Record<TrainingCategory, string> = {
  ONBOARDING: 'تعريف بالمنصة',
  ACADEMIC: 'منهجية أكاديمية',
  FLIPPED: 'الصف المعكوس',
  STUDY_SKILLS: 'مهارات الدراسة',
  RESEARCH: 'البحث العلمي',
  CAREER: 'مهارات مهنية',
  COMMUNICATION: 'التواصل',
  ENGLISH: 'الإنجليزية',
  PROGRAMMING: 'البرمجة',
  PRODUCTIVITY: 'الإنتاجية',
  VISION: 'مسارات الرؤية',
};

const LEVEL_LABEL: Record<string, string> = {
  BEGINNER: 'مبتدئ',
  INTERMEDIATE: 'متوسط',
  ADVANCED: 'متقدم',
};

/** Counted Arabic noun for point values (D17-2): ar-LY grouping with the
 *  proper one/dual/few/many forms — «نقطة واحدة»، «نقطتان»، «5 نقاط»، «25 نقطة».
 *  Local twin of MorePages' helper (lib/format is frozen this wave). */
function pointsAr(n: number): string {
  if (n === 1) return 'نقطة واحدة';
  if (n === 2) return 'نقطتان';
  return `${formatNum(n)} ${n <= 10 ? 'نقاط' : 'نقطة'}`;
}

// Tier/rarity display maps (labels + the API gamification palette)
// live in lib/gamification.ts (13-15 fold, audit 11-f P2-1) — shared
// with the GamificationPage; consumed only through color-mix tints over
// var(--surface) or the --tier-color / --rarity custom properties,
// never as a text ground.

/* ═══════════════ Catalog page ═══════════════ */
export default function TrainingCatalogPage() {
  const tracksQ = useTrainingCatalog();
  const meQ = useTrainingMe();
  // Same query cache the AchievementsPage reads — honest badge totals
  // (replaces the previous invented "من 16" constant).
  const badgesQ = useMyBadges();
  const [filter, setFilter] = useState<'all' | TrainingCategory>('all');

  const tracks = tracksQ.data;
  const me = meQ.data;

  const categoriesPresent = useMemo(() => {
    const set = new Set<TrainingCategory>();
    tracks?.forEach((t) => set.add(t.category));
    return Array.from(set);
  }, [tracks]);

  const visible = useMemo(() => {
    if (!tracks) return [];
    return filter === 'all' ? tracks : tracks.filter((t) => t.category === filter);
  }, [tracks, filter]);

  const enrolledCount = tracks?.filter((t) => t.enrolled).length ?? 0;
  const completedCount = tracks?.filter((t) => t.isCompleted).length ?? 0;

  return (
    <PageFrame>
      <PageHeader
        title="التطوير الذاتي"
        description="مسارات تدريبية مصمَّمة بعناية لتناسب احتياجاتك الأكاديمية والمهنية. أكمل مساراً لتحصل على سجلّ إتمام موثَّق من المنصة."
      />

      {/* My summary — KPI band + level progress. Pending → shape-matched
          skeletons; error → honest message + retry (never a fake summary). */}
      {meQ.isPending ? (
        <>
          {/* 22-c (A4 P2-2): 4-tile skeleton matches the landed grid-4
              KPI band (was the shared 3-tile grid-3 — shift on load). */}
          <KpiStripSkeleton count={4} />
          <LevelBandSkeleton />
        </>
      ) : meQ.isError ? (
        <Card>
          <ErrorState
            message="تعذَّر تحميل ملخص تقدّمك في التطوير الذاتي"
            error={meQ.error}
            onRetry={() => meQ.refetch()}
          />
        </Card>
      ) : me ? (
        <>
          <StatStrip
            ariaLabel="ملخّص إنجازاتك"
            cells={[
              { label: 'نقاطك', value: formatNum(me.points), trend: `المستوى ${me.level.level} · ${TIER_LABEL[me.level.tier]}` },
              { label: 'الأوسمة', value: formatNum(me.badgeCount), trend: badgesQ.data ? `من ${countAr(badgesQ.data.length, ['وسام واحد', 'وسامين', 'أوسمة', 'وساماً'])} في المنصة` : 'في مسارات التطوير الذاتي' },
              { label: 'مسارات نشطة', value: formatNum(enrolledCount), trend: countAr(completedCount, ['واحد مكتمل', 'مكتملان', 'مكتملة', 'مكتمل']) },
              { label: 'الشهادات', value: formatNum(me.certificateCount), trend: 'إتمام موثَّق من المنصة' },
            ]}
          />

          {/* Level progress band */}
          <Card>
            <div className="level-band">
              <div
                className="tier-orb"
                style={{ ['--tier-color' as never]: TIER_COLOR[me.level.tier] }}
                aria-hidden
              >
                {me.level.level}
              </div>
              <div className="level-band-main">
                <div className="text-xs text-subtle">
                  {TIER_LABEL[me.level.tier]} · المستوى <bdi>{me.level.level}</bdi>
                </div>
                <ProgressBar
                  value={me.level.pctIntoLevel}
                  color={TIER_COLOR[me.level.tier]}
                  label={`${pointsAr(me.level.toNext)} للمستوى التالي`}
                  ariaLabel="التقدّم نحو المستوى التالي في التطوير الذاتي"
                />
              </div>
              <Link to="/achievements" className="btn ghost sm">
                عرض الإنجازات
                <Icon icon={ChevronLeft} size={14} />
              </Link>
            </div>
          </Card>
        </>
      ) : null}

      {/* Category filter pills — only once the catalog is loaded (an
          empty pill row while loading/erroring would be a fake signal).
          G: ‏FilterBar اللاصق — نفس عقد الكليات/المسابقات بدل صفّ الرقائق
          اليدوي داخل بطاقة؛ الرقائق نفسها بعقد aria-pressed كما كانت. */}
      {tracks && (
        <FilterBar
          sticky
          filters={(
            <div role="group" aria-label="تصفية المسارات حسب الفئة">
              <button
                type="button"
                className="filter-pill"
                aria-pressed={filter === 'all'}
                onClick={() => setFilter('all')}
              >
                <Icon icon={Sparkles} size={12} />
                كل المسارات ({formatNum(tracks.length)})
              </button>
              {categoriesPresent.map((c) => (
                <button
                  key={c}
                  type="button"
                  className="filter-pill"
                  aria-pressed={filter === c}
                  onClick={() => setFilter(c)}
                >
                  {CATEGORY_LABEL[c]} ({formatNum(tracks.filter((t) => t.category === c).length)})
                </button>
              ))}
            </div>
          )}
        />
      )}

      {/* Track rows — r265: قائمة صفوف هادئة بدل شبكة بطاقات. pending →
          هيكل مطابق، error → حالة إعادة محاولة صادقة (لا «لا توجد
          مسارات» فوق واجهة ميتة). */}
      {tracksQ.isPending ? (
        <ListSkeleton rows={5} />
      ) : tracksQ.isError ? (
        <Card>
          <ErrorState
            message="تعذَّر تحميل المسارات التدريبية"
            error={tracksQ.error}
            onRetry={() => tracksQ.refetch()}
          />
        </Card>
      ) : visible.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title={filter === 'all' ? 'لا توجد مسارات منشورة بعد' : 'لا توجد مسارات في هذه الفئة بعد'}
            illustration="empty-community"
            description="ستظهر المسارات الجديدة هنا فور نشرها من فريق الجامعة."
          />
        </Card>
      ) : (
        <RowList aria-label="قائمة المسارات التدريبية">
          {visible.map((t) => (
            <TrackCard key={t.id} track={t} />
          ))}
        </RowList>
      )}
    </PageFrame>
  );
}

function TrackCard({ track }: { track: TrainingTrackCard }) {
  /* r265: صفّ مسار هادئ — العنوان هو باب الصف (رابط حقيقي)، الفئة/
     المستوى والملخّص سطر ثانوي مقصوص، والزمن/الدروس/النقاط في الطرف،
     وتقدّم المسجَّلين شريط مضغوط تحت المؤشّرات (دون سحب الصف لسطر
     إضافي لغير المسجَّلين). */
  const accent = track.themeColor ?? 'var(--accent)';
  return (
    /* r289: الصف كله الوصلة (RowItem to) — أرضية اللمس 44px+ لكل الصف
       بدل صندوق نص العنوان (24px على 360px). */
    <RowItem
      to={`/training/${track.slug}`}
      leading={<EmojiIcon emoji={track.iconEmoji ?? '🎓'} size={20} />}
      title={track.title}
      meta={
        <span className="cp-meta-col">
          <span className="cp-clamp1" title={track.summary}>
            {CATEGORY_LABEL[track.category]} · {LEVEL_LABEL[track.level]} · {track.summary}
          </span>
          <span className="cp-meta-stats">
            <span className="cp-inline"><Icon icon={Clock} size={12} /> {formatNum(track.estMinutes)} د</span>
            <span className="cp-inline"><Icon icon={BookOpen} size={12} /> {countAr(track.totalLessons, ['درس واحد', 'درسان', 'دروس', 'درساً'])}</span>
            {/* 5-D3: --gold measured 2.30:1 on the light card — the amber
                graphics tier (chart-6) instead. */}
            <span className="cp-inline"><Icon icon={Sparkles} size={12} style={{ color: 'var(--chart-6)' }} /> {pointsAr(track.pointsAward)}</span>
          </span>
        </span>
      }
      trailing={
        /* المسجَّل فقط: شريط تقدّم مضغوط في الطرف — غير المسجَّل يرى صفًّا
           نظيفًا بلا زوائد. */
        track.enrolled ? (
          <span className="cp-progress">
            <ProgressBar
              value={track.progressPct}
              color={accent}
              label={track.isCompleted ? 'مكتمل' : `${track.completedLessons} / ${countAr(track.totalLessons, ['درس', 'درسان', 'دروس', 'درساً'])}`}
              ariaLabel={`تقدّم مسار ${track.title}`}
            />
          </span>
        ) : undefined
      }
    />
  );
}

/* Shape-matched loading skeletons (catalog). 22-c (A4 P2-2): the
   skeleton is parameterized by tile count — the catalog's real KPI band
   is grid-4 (نقاطك/الأوسمة/مسارات نشطة/الشهادات) while AchievementsPage
   renders grid-3, and one shared 3-tile skeleton fed both (a layout lie
   + a shift on load). Each caller now matches its landed band. */
function KpiStripSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={count >= 4 ? 'grid-4' : 'grid-3'} aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="metric" aria-hidden>
          <div className="metric-head">
            <Skeleton width={86} height={11} />
            <Skeleton width={70} height={26} />
            <Skeleton width={120} height={11} />
          </div>
        </div>
      ))}
    </div>
  );
}

function LevelBandSkeleton() {
  return (
    <Card>
      <div className="level-band" aria-hidden>
        <Skeleton width={48} height={48} rounded="50%" />
        <div className="level-band-main">
          <Skeleton width={150} height={11} />
          <Skeleton width="100%" height={8} rounded="var(--r-full)" />
        </div>
      </div>
    </Card>
  );
}

/* ═══════════════ Single track page ═══════════════ */
export function TrainingTrackPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const trackQ = useTrainingTrack(slug);
  // r183-B6 (A4 P3-4): the tab names the TRACK, not «مسار تدريبي».
  useEntityPageTitle(trackQ.data?.title ?? null);
  const enroll = useEnrollTrack();
  const [enrollError, setEnrollError] = useState(false);

  if (trackQ.isPending) return <PageSkeleton />;
  if (trackQ.isError) {
    return (
      <PageFrame>
        <Link to="/training" className="back-link">
          <Icon icon={ChevronRight} size={14} />
          العودة إلى المسارات
        </Link>
        <ErrorState message="تعذَّر تحميل المسار" error={trackQ.error} onRetry={() => trackQ.refetch()} />
      </PageFrame>
    );
  }
  const track = trackQ.data;
  if (!track) {
    return (
      <PageFrame>
        <EmptyState
          icon={BookOpen}
          title="المسار غير موجود"
          description="ربما تم حذفه أو أن الرابط غير صحيح."
          action={<Link to="/training" className="btn primary sm">تصفح المسارات</Link>}
        />
      </PageFrame>
    );
  }

  const completedCount = track.lessons.filter((l) => l.isCompleted).length;
  const accent = track.themeColor ?? 'var(--accent)';
  const nextLessonId = track.lessons.find((l) => !l.isCompleted)?.id;

  const onEnroll = async () => {
    setEnrollError(false);
    if (!track.enrolled) {
      try {
        await enroll.mutateAsync(track.slug);
      } catch {
        setEnrollError(true);
        return;
      }
    }
    // Jump straight to first incomplete lesson
    const next = track.lessons.find((l) => !l.isCompleted) ?? track.lessons[0];
    if (next) navigate(`/training/${track.slug}/lesson/${next.id}`);
  };

  return (
    <PageFrame>
      <Link to="/training" className="back-link">
        <Icon icon={ChevronRight} size={14} />
        العودة إلى المسارات
      </Link>

      {/* Hero band — track-themed (tint + hairline via --track-accent;
          the old 3px borderRight stripe is gone, ruling #4) */}
      <div className="track-hero" style={{ ['--track-accent' as never]: accent }}>
        <div className="track-hero-icon" aria-hidden>
          <EmojiIcon emoji={track.iconEmoji ?? '🎓'} size={24} />
        </div>
        <div className="track-hero-main">
          <div className="track-hero-cat">{CATEGORY_LABEL[track.category]}</div>
          <h1 className="track-hero-title">{track.title}</h1>
          {/* G (عقد mono — r197): الاسم الإنجليزي اسمٌ لا معرّف رقمي؛
              sans هادئ داخل bdi بدل الصوت الأحادي. */}
          {track.titleEn && <div className="text-xs text-subtle"><bdi>{track.titleEn}</bdi></div>}
          <p className="track-hero-summary">{track.summary}</p>
          <div className="track-hero-meta">
            <Badge><Icon icon={Clock} size={11} /> {countAr(track.estMinutes, ['دقيقة واحدة', 'دقيقتين', 'دقائق', 'دقيقة'])}</Badge>
            <Badge><Icon icon={BookOpen} size={11} /> {countAr(track.lessons.length, ['درس واحد', 'درسان', 'دروس', 'درساً'])}</Badge>
            <Badge color="gold"><Icon icon={Sparkles} size={11} /> {pointsAr(track.pointsAward)} عند الإكمال</Badge>
            <Badge color="purple">{LEVEL_LABEL[track.level]}</Badge>
          </div>
        </div>
        <button
          type="button"
          className="btn primary"
          onClick={onEnroll}
          disabled={enroll.isPending}
          aria-busy={enroll.isPending}
        >
          {/* G (تعليق الزر): التسمية تتغيّر أثناء الطلب — عقد صفحة الدخول
              نفسه (disabled + aria-busy + «جارٍ…») بدل صمت التعطيل. */}
          {enroll.isPending
            ? 'جارٍ البدء…'
            : !track.enrolled ? 'ابدأ المسار' : track.isCompleted ? 'مراجعة الدروس' : 'استكمل الدراسة'}
          {!enroll.isPending && <Icon icon={ChevronLeft} size={14} />}
        </button>
      </div>

      {enrollError && (
        <AlertRow
          color="red"
          icon={AlertTriangle}
          title="تعذّر بدء المسار"
          description="تحقّق من اتصالك بالشبكة ثم أعد المحاولة."
        />
      )}

      {track.enrolled && (
        <Card>
          <ProgressBar
            value={Math.round((completedCount / track.lessons.length) * 100)}
            color={accent}
            label={track.isCompleted ? 'هذا المسار مكتمل — شهادة جاهزة' : `${completedCount} / ${countAr(track.lessons.length, ['درس مكتمل', 'درسان مكتملان', 'دروس مكتملة', 'درساً مكتملًا'])}`}
            ariaLabel={`تقدّم مسار ${track.title}`}
          />
        </Card>
      )}

      {/* Lesson list — rows carry locked (not enrolled) / next / done states */}
      <Card
        title="الدروس"
        icon={BookOpen}
        subtitle={track.enrolled ? 'اضغط على أي درس للبدء بمراجعته' : 'سجّل في المسار أعلاه لفتح الدروس'}
        style={{ ['--track-accent' as never]: accent }}
      >
        <div className="flex-col gap-2">
          {track.lessons.map((lesson) => (
            <LessonRow
              key={lesson.id}
              trackSlug={track.slug}
              lesson={lesson}
              locked={!track.enrolled}
              isNext={lesson.id === nextLessonId}
            />
          ))}
        </div>
      </Card>
    </PageFrame>
  );
}

function LessonRow({
  trackSlug, lesson, locked, isNext,
}: {
  trackSlug: string;
  lesson: TrainingLessonView;
  locked: boolean;
  isNext: boolean;
}) {
  const state = [
    lesson.isCompleted ? 'done' : '',
    locked && !lesson.isCompleted ? 'locked' : '',
    isNext && !locked && !lesson.isCompleted ? 'next' : '',
  ].filter(Boolean).join(' ');

  /* Not enrolled → lessons render as locked (non-navigating) rows; the
     hero CTA is the unlock path. */
  if (locked && !lesson.isCompleted) {
    return (
      <div className={`lesson-row ${state}`} aria-disabled="true">
        <div className="lesson-row-num" aria-hidden><Icon icon={Lock} size={16} /></div>
        <div className="lesson-row-body">
          <div className="lesson-row-title">{lesson.title}</div>
          {lesson.summary && <div className="lesson-row-sub">{lesson.summary}</div>}
        </div>
        <div className="lesson-row-meta">
          <span className="text-xxs text-subtle"><Icon icon={Clock} size={10} /> {formatNum(lesson.estMinutes)} د</span>
        </div>
      </div>
    );
  }

  return (
    <Link
      to={`/training/${trackSlug}/lesson/${lesson.id}`}
      className={`lesson-row ${state}`}
    >
      <div className="lesson-row-num" aria-hidden>
        {lesson.isCompleted ? <Icon icon={CheckCircle2} size={20} /> : <span>{lesson.order}</span>}
      </div>
      <div className="lesson-row-body">
        <div className="lesson-row-title">{lesson.title}</div>
        {lesson.summary && <div className="lesson-row-sub">{lesson.summary}</div>}
      </div>
      <div className="lesson-row-meta">
        <span className="text-xxs text-subtle"><Icon icon={Clock} size={10} /> {formatNum(lesson.estMinutes)} د</span>
        {lesson.quizQuestion && <Badge color="amber"><Icon icon={Target} size={10} /> سؤال</Badge>}
      </div>
    </Link>
  );
}

/* ═══════════════ Lesson page ═══════════════ */
export function TrainingLessonPage() {
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>();
  const navigate = useNavigate();
  const trackQ = useTrainingTrack(slug);
  // r183-B6 (A4 P3-4): the tab names the LESSON, not «درس تدريبي».
  useEntityPageTitle(trackQ.data?.lessons.find((l) => l.id === lessonId)?.title ?? null);
  const complete = useCompleteLesson();
  const [quizAnswer, setQuizAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string; reward?: { points: number; level: number; tier: Tier; badges: Array<{ slug: string; title: string; iconEmoji: string }> } } | null>(null);

  if (trackQ.isPending) return <DetailSkeleton />;
  if (trackQ.isError) {
    return (
      <PageFrame>
        <Link to="/training" className="back-link">
          <Icon icon={ChevronRight} size={14} />
          العودة إلى المسارات
        </Link>
        <ErrorState message="تعذَّر تحميل الدرس" error={trackQ.error} onRetry={() => trackQ.refetch()} />
      </PageFrame>
    );
  }
  const track = trackQ.data;
  if (!track) {
    return (
      <PageFrame>
        <EmptyState
          icon={BookOpen}
          title="المسار غير موجود"
          description="ربما تم حذفه أو أن الرابط غير صحيح."
          action={<Link to="/training" className="btn primary sm">تصفح المسارات</Link>}
        />
      </PageFrame>
    );
  }

  const lesson = track.lessons.find((l) => l.id === lessonId);
  if (!lesson) {
    return (
      <PageFrame>
        <EmptyState
          icon={BookOpen}
          title="الدرس غير موجود"
          description="ربما تم حذفه أو أن الرابط غير صحيح."
          action={<Link to={`/training/${track.slug}`} className="btn primary sm">عودة إلى المسار</Link>}
        />
      </PageFrame>
    );
  }

  const accent = track.themeColor ?? 'var(--accent)';
  const idx = track.lessons.findIndex((l) => l.id === lessonId);
  const next = track.lessons[idx + 1];

  const onComplete = async () => {
    setFeedback(null);
    try {
      const res = await complete.mutateAsync({
        lessonId: lesson.id,
        quizAnswer: lesson.quizQuestion ? quizAnswer : undefined,
      });
      if (res.newlyCompleted) {
        setFeedback({
          ok: true,
          msg: `أحسنت! حصلت على ${pointsAr(res.pointsAwarded)}.`,
          reward: {
            points: res.pointsAwarded,
            level: res.level.level,
            tier: res.level.tier,
            badges: res.newBadges,
          },
        });
      } else {
        setFeedback({ ok: true, msg: 'تم احتساب هذا الدرس مسبقاً.' });
      }
    } catch (err: unknown) {
      // Arabic-first guard (15-j P0-1): an English API message never renders raw.
      setFeedback({ ok: false, msg: apiErrorMessage(err, 'تعذّر احتساب الدرس — تحقّق من اتصالك وحاول مرة أخرى.') });
    }
  };

  return (
    <PageFrame>
      <Link to={`/training/${track.slug}`} className="back-link">
        <Icon icon={ChevronRight} size={14} />
        {/* r183-B6 (A4 P3-6): the back-link family's unified grammar —
            «العودة إلى X» (this was the bare-title variant). */}
        العودة إلى {track.title}
      </Link>

      <Card>
        <div className="lesson-kicker">
          <span>الدرس <bdi>{lesson.order}</bdi> من <bdi>{track.lessons.length}</bdi></span>
          <span>·</span>
          <span><Icon icon={Clock} size={10} /> {countAr(lesson.estMinutes, ['دقيقة واحدة', 'دقيقتين', 'دقائق', 'دقيقة'])}</span>
        </div>
        <h1 className="lesson-title">{lesson.title}</h1>
        {lesson.summary && <p className="text-sm text-muted lesson-summary">{lesson.summary}</p>}

        <div className="lesson-content">
          {lesson.contentMarkdown.split(/\n+/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        {lesson.quizQuestion && (
          <div className="lesson-quiz" style={{ ['--track-accent' as never]: accent }}>
            <div className="lesson-quiz-eyebrow">
              <Icon icon={Target} size={12} />
              سؤال التحقق
            </div>
            <div className="lesson-quiz-q" id={`${lesson.id}-quiz-q`}>{lesson.quizQuestion}</div>
            {/* 22-c (A4 P2-4): the graded answer field was placeholder-
                only — an unnamed control for screen readers. Labelled by
                the question node, mirroring the exam-taker's
                aria-labelledby wiring (OnlineExamsPages). */}
            <input
              type="text"
              className="input"
              placeholder="إجابتك…"
              aria-labelledby={`${lesson.id}-quiz-q`}
              value={quizAnswer}
              onChange={(e) => setQuizAnswer(e.target.value)}
              disabled={lesson.isCompleted}
            />
          </div>
        )}

        {feedback && (
          <div
            className={`reward-feedback ${feedback.ok ? 'ok' : 'fail'}`}
            role="status"
            aria-live="polite"
          >
            {feedback.ok ? (
              <>
                <Icon icon={CheckCircle2} size={16} />
                <span>{feedback.msg}</span>
                {feedback.reward && feedback.reward.points > 0 && (
                  <>
                    <span className="reward-pill">
                      <Icon icon={Sparkles} size={12} /> <bdi>+{formatNum(feedback.reward.points)}</bdi>
                    </span>
                    <span
                      className="reward-pill"
                      style={{
                        background: `color-mix(in srgb, ${TIER_COLOR[feedback.reward.tier]} 10%, var(--surface))`,
                        color: `color-mix(in srgb, ${TIER_COLOR[feedback.reward.tier]} 60%, var(--text))`,
                      }}
                    >
                      المستوى <bdi>{feedback.reward.level}</bdi>
                    </span>
                  </>
                )}
                {feedback.reward?.badges.map((b, i) => (
                  <span
                    key={b.slug}
                    className="reward-pill badge-pop"
                    style={{ ['--badge-i' as never]: i }}
                  >
                    <EmojiIcon emoji={b.iconEmoji} fallback={Award} size={12} />
                    {b.title}
                  </span>
                ))}
              </>
            ) : (
              <>
                <Icon icon={Target} size={16} />
                <span>{feedback.msg}</span>
              </>
            )}
          </div>
        )}

        <div className="lesson-actions" style={{ ['--track-accent' as never]: accent }}>
          <button
            type="button"
            className="btn primary"
            onClick={onComplete}
            disabled={complete.isPending || lesson.isCompleted}
          >
            {lesson.isCompleted ? 'تم الإكمال' : complete.isPending ? 'جارٍ الإرسال…' : 'أكملت — احتساب الدرس'}
          </button>
          {next && (
            <button
              type="button"
              className="btn ghost"
              onClick={() => navigate(`/training/${track.slug}/lesson/${next.id}`)}
            >
              الدرس التالي
              <Icon icon={ChevronLeft} size={14} />
            </button>
          )}
        </div>
      </Card>
    </PageFrame>
  );
}

/* ═══════════════ Achievements ═══════════════ */
type AchTab = 'badges' | 'certs' | 'leaderboard';
const ACH_TABS: Array<{ key: AchTab; label: string; icon: typeof Award }> = [
  { key: 'badges', label: 'الأوسمة', icon: Award },
  { key: 'certs', label: 'الشهادات', icon: Medal },
  { key: 'leaderboard', label: 'الترتيب', icon: Crown },
];

export function AchievementsPage() {
  const meQ = useTrainingMe();
  const badgesQ = useMyBadges();
  const certsQ = useMyTrainingCerts();
  const lbQ = useTrainingLeaderboard();
  const [tab, setTab] = useState<AchTab>('badges');
  /* r184 (P3 residual — leaderboard length on phone): 20 rows ≈ 900px
   * of list on a 640px-band phone pushed the real actions below two
   * screens of scrolling. Progressive disclosure: the phone band shows
   * the top 10 and offers an honest full/collapse toggle (aria-expanded
   * + the true remaining count). Desktop keeps all 20 rows — no change. */
  const lbIsNarrow = useIsNarrowLayout(640);
  const [lbExpanded, setLbExpanded] = useState(false);
  const lbRows = lbQ.data ?? [];
  const lbVisible = lbIsNarrow && !lbExpanded ? lbRows.slice(0, 10) : lbRows;

  const me = meQ.data;

  /* RTL tablist: ArrowLeft advances (toward inline-end), ArrowRight goes
     back — mirrors the shared Tabs primitive's keyboard contract. */
  const onTabsKeyDown = (e: KeyboardEvent<HTMLElement>) => {
    const idx = ACH_TABS.findIndex((t) => t.key === tab);
    let next: number | null = null;
    if (e.key === 'ArrowLeft') next = (idx + 1) % ACH_TABS.length;
    else if (e.key === 'ArrowRight') next = (idx - 1 + ACH_TABS.length) % ACH_TABS.length;
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = ACH_TABS.length - 1;
    if (next === null) return;
    const entry = ACH_TABS[next];
    if (!entry) return;
    e.preventDefault();
    setTab(entry.key);
    document.getElementById(`ach-tab-${entry.key}`)?.focus();
  };

  return (
    <PageFrame>
      <PageHeader
        title="الإنجازات"
        description="رحلتك في التطوير الذاتي — نقاطك، أوسمتك، شهاداتك، وترتيبك بين الزملاء."
      />

      {meQ.isPending ? (
        <KpiStripSkeleton />
      ) : meQ.isError ? (
        <Card>
          <ErrorState
            message="تعذَّر تحميل ملخص نقاطك"
            error={meQ.error}
            onRetry={() => meQ.refetch()}
          />
        </Card>
      ) : me ? (
        <StatStrip
          ariaLabel="ملخّص نقاطك"
          cells={[
            { label: 'مجموع النقاط', value: formatNum(me.points), trend: `المستوى ${me.level.level} · ${TIER_LABEL[me.level.tier]}` },
            { label: 'الأوسمة المحقّقة', value: formatNum(me.badgeCount), trend: badgesQ.data ? `من ${countAr(badgesQ.data.length, ['وسام واحد', 'وسامين', 'أوسمة', 'وساماً'])}` : undefined },
            { label: 'الشهادات', value: formatNum(me.certificateCount), trend: 'إتمام موثَّق من المنصة' },
          ]}
        />
      ) : null}

      {/* Tabs — manual role/aria annotation (the tabs carry icons, which the
          shared Tabs primitive's string-only labels don't support yet).
          Roving tabindex + arrow keys + aria-controls complete the pattern. */}
      <div className="tabs" role="tablist" aria-label="أقسام الإنجازات" onKeyDown={onTabsKeyDown}>
        {ACH_TABS.map((t) => (
          <button
            key={t.key}
            id={`ach-tab-${t.key}`}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            aria-controls={`ach-panel-${t.key}`}
            tabIndex={tab === t.key ? 0 : -1}
            className={`tab${tab === t.key ? ' on' : ''}`}
            onClick={() => setTab(t.key)}
          >
            <Icon icon={t.icon} size={13} /> {t.label}
          </button>
        ))}
      </div>

      {tab === 'badges' && (
        <div role="tabpanel" id="ach-panel-badges" aria-labelledby="ach-tab-badges">
          {badgesQ.isPending ? (
            <BadgeGridSkeleton />
          ) : badgesQ.isError ? (
            <Card>
              <ErrorState message="تعذَّر تحميل الأوسمة" error={badgesQ.error} onRetry={() => badgesQ.refetch()} />
            </Card>
          ) : !badgesQ.data?.length ? (
            <Card>
              <EmptyState illustration="achievement"
                icon={Award}
                title="لا توجد أوسمة بعد"
                description="ابدأ بدروس التطوير الذاتي لتحصد أول وسام."
                action={<Link to="/training" className="btn primary sm">تصفح المسارات</Link>}
              />
            </Card>
          ) : (
            <div className="badge-grid">
              {badgesQ.data.map((b) => (
                <div
                  key={b.slug}
                  className={`badge-tile ${b.isEarned ? 'earned' : 'locked'}`}
                  style={{ ['--rarity' as never]: RARITY_COLOR[b.rarity] }}
                >
                  <div className="badge-tile-icon" aria-hidden>
                    {b.isEarned
                      ? <EmojiIcon emoji={b.iconEmoji} fallback={Award} size={22} />
                      : <Icon icon={Lock} size={20} />}
                  </div>
                  <div className="badge-tile-title">{b.title}</div>
                  <div className="badge-tile-desc">{b.description}</div>
                  <span className="badge-tile-rarity">{RARITY_LABEL[b.rarity]}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'certs' && (
        <div role="tabpanel" id="ach-panel-certs" aria-labelledby="ach-tab-certs">
          {certsQ.isPending ? (
            <div className="grid-2" aria-busy="true" aria-live="polite">
              <CardSkeleton lines={3} />
              <CardSkeleton lines={3} />
            </div>
          ) : certsQ.isError ? (
            <Card>
              <ErrorState message="تعذَّر تحميل شهاداتك" error={certsQ.error} onRetry={() => certsQ.refetch()} />
            </Card>
          ) : !certsQ.data?.length ? (
            <Card>
              <EmptyState illustration="empty-list"
                icon={Medal}
                title="لم تحصل على شهادات بعد"
                description="أكمل أول مسار تدريبي للحصول على شهادتك الأولى."
                action={<Link to="/training" className="btn primary sm">تصفح المسارات</Link>}
              />
            </Card>
          ) : (
            <div className="grid-2">
              {certsQ.data.map((c) => (
                <Card key={c.id}>
                  {/* G: وصفة بطاقة الشهادة تنتقل إلى training.css
                      (.cert-*) — القيم نفسها (r186/r148) بلا أسلوب
                      سطري؛ --cert-accent يبقى سطريًا لأنه من البيانات. */}
                  <div className="cert-row">
                    <div
                      className="cert-icon"
                      style={{ ['--cert-accent' as never]: c.themeColor ?? undefined }}
                      aria-hidden
                    >
                      <EmojiIcon emoji={c.iconEmoji ?? '🏅'} size={22} />
                    </div>
                    <div className="cert-body">
                      <div className="text-xxs text-subtle">شهادة إتمام مسار</div>
                      {/* 5-D3 (A3 P3-2): demoted from h3 — the page's only
                          heading is the h1; a cert title is a list-item
                          label. Visuals byte-identical (display family,
                          bold, fs-md, lh 1.3, same margins). */}
                      <div className="cert-title">{c.title}</div>
                      <div className="text-xs text-muted">{c.issuer}</div>
                      <div className="cert-meta">
                        <Badge color="green"><Icon icon={CheckCircle2} size={11} /> مكتملة</Badge>
                        {c.issuedAt && (
                          <Badge>{formatDate(c.issuedAt, { year: 'numeric', month: 'short', day: 'numeric' })}</Badge>
                        )}
                        <Badge>{countAr(c.hours, ['ساعة تقديرية واحدة', 'ساعتان تقديريّتان', 'ساعات تقديرية', 'ساعة تقديرية'])}</Badge>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div role="tabpanel" id="ach-panel-leaderboard" aria-labelledby="ach-tab-leaderboard">
          <Card title="الأعلى نقاطاً هذا الأسبوع" icon={Crown} subtitle="آخر 20 طالباً نشاطاً على المنصة">
            {lbQ.isPending ? (
              <ListSkeleton rows={6} />
            ) : lbQ.isError ? (
              <ErrorState message="تعذَّر تحميل الترتيب" error={lbQ.error} onRetry={() => lbQ.refetch()} />
            ) : !lbQ.data?.length ? (
              <EmptyState illustration="empty-list"
                icon={Crown}
                title="لا يوجد ترتيب بعد"
                description="اكسب النقاط بإكمال الدروس والمسارات — يظهر ترتيبك فور تسجيل أول نقطة."
                action={<Link to="/training" className="btn primary sm">ابدأ من التطوير الذاتي</Link>}
              />
            ) : (
              <>
              <ol className="leaderboard-list" id="ach-leaderboard-list" aria-label="ترتيب الطلاب بالنقاط">
                {lbVisible.map((r, i) => (
                  <li
                    key={r.userId}
                    className="leaderboard-row"
                    style={{ ['--lb-i' as never]: Math.min(i, 6) }}
                  >
                    {/* r169a: role="img" — aria-label on a bare span has no
                        valid meaning (axe aria-label-named); twin of the
                        gamification leaderboard badge. */}
                    <span className={`leaderboard-rank rank-${r.rank}`} role="img" aria-label={`المركز ${r.rank}`}>
                      {r.rank <= 3
                        ? <Icon icon={r.rank === 1 ? Crown : r.rank === 2 ? Star : Medal} size={16} />
                        : <bdi>#{r.rank}</bdi>}
                    </span>
                    <UserAvatar initials={r.avatarInitials ?? r.name.slice(0, 2)} color={r.avatarColor ?? undefined} size={32} />
                    <span className="leaderboard-name" title={r.name}>{r.name}</span>
                    <span className="leaderboard-tier"><bdi>L{r.level.level}</bdi> · {TIER_LABEL[r.level.tier]}</span>
                    <span className="leaderboard-points">
                      <Icon icon={Sparkles} size={12} /> <bdi>{formatNum(r.points)}</bdi>
                    </span>
                  </li>
                ))}
              </ol>
              {lbIsNarrow && lbRows.length > 10 && (
                <button
                  type="button"
                  className="btn ghost sm ach-lb-toggle"
                  aria-expanded={lbExpanded}
                  aria-controls="ach-leaderboard-list"
                  onClick={() => setLbExpanded((v) => !v)}
                >
                  {lbExpanded
                    ? 'عرض أفضل 10 فقط'
                    : `عرض الترتيب كاملًا — ${countAr(lbRows.length, ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'])}`}
                </button>
              )}
              </>
            )}
          </Card>
        </div>
      )}
    </PageFrame>
  );
}

/* Shape-matched loading skeleton (badges grid). */
function BadgeGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="badge-grid" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="badge-tile" aria-hidden>
          <Skeleton width={56} height={56} rounded="var(--r-lg)" />
          <Skeleton width="70%" height={14} />
          <Skeleton width="90%" height={11} />
          <Skeleton width={56} height={18} rounded="var(--r-full)" />
        </div>
      ))}
    </div>
  );
}

// Re-export for direct page imports
export { TrainingTrackPage as TrainingTrack };
