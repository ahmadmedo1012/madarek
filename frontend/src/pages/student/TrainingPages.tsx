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
  GraduationCap, Sparkles, Award, Trophy, Clock, CheckCircle2, Lock,
  ChevronLeft, ChevronRight, BookOpen, Target, Crown, Star, Medal,
  AlertTriangle,
} from 'lucide-react';
import { Card, Badge, MetricCard, ProgressBar, UserAvatar, AlertRow } from '../../components/primitives';
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
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">التطوير الذاتي</h1>
          <p className="page-subtitle">
            مسارات تدريبية مصمَّمة من فريق جامعة الزاوية لتطوير مهاراتك الأكاديمية والمهنية.
            أكمل مساراً لتحصل على شهادة معتمدة من المنصة.
          </p>
        </div>
      </header>

      {/* My summary — KPI band + level progress. Pending → shape-matched
          skeletons; error → honest message + retry (never a fake summary). */}
      {meQ.isPending ? (
        <>
          <KpiStripSkeleton />
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
          <div className="grid-4">
            <MetricCard
              icon={Trophy} color="gold"
              label="نقاطك"
              value={formatNum(me.points)}
              change={`المستوى ${me.level.level} · ${TIER_LABEL[me.level.tier]}`}
            />
            <MetricCard
              icon={Award} color="purple"
              label="الأوسمة"
              value={formatNum(me.badgeCount)}
              change={badgesQ.data ? `من ${formatNum(badgesQ.data.length)} وسام في المنصة` : 'في مسارات التطوير الذاتي'}
            />
            <MetricCard
              icon={GraduationCap} color="brand"
              label="مسارات نشطة"
              value={formatNum(enrolledCount)}
              change={`${formatNum(completedCount)} مكتمل`}
            />
            <MetricCard
              icon={Medal} color="green"
              label="الشهادات"
              value={formatNum(me.certificateCount)}
              change="معتمدة من المنصة"
            />
          </div>

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
                  label={`${formatNum(me.level.toNext)} نقطة للمستوى التالي`}
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
          empty pill row while loading/erroring would be a fake signal). */}
      {tracks && (
        <Card flush>
          <div className="filter-pill-row" role="group" aria-label="تصفية المسارات حسب الفئة">
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
        </Card>
      )}

      {/* Track cards grid — pending → shape-matched skeletons, error →
          honest retry state (never "لا توجد مسارات" over a dead API). */}
      {tracksQ.isPending ? (
        <TrackGridSkeleton />
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
            description="ستظهر المسارات الجديدة هنا فور نشرها من فريق الجامعة."
          />
        </Card>
      ) : (
        <div className="track-grid">
          {visible.map((t) => (
            <TrackCard key={t.id} track={t} />
          ))}
        </div>
      )}
    </div>
  );
}

function TrackCard({ track }: { track: TrainingTrackCard }) {
  const accent = track.themeColor ?? 'var(--accent)';
  return (
    <Link
      to={`/training/${track.slug}`}
      className="track-card"
      style={{ ['--track-accent' as never]: accent }}
    >
      <div className="track-card-icon" aria-hidden>
        <EmojiIcon emoji={track.iconEmoji ?? '🎓'} size={20} />
      </div>
      <div className="track-card-body">
        <div className="track-card-cat">{CATEGORY_LABEL[track.category]} · {LEVEL_LABEL[track.level]}</div>
        <div className="track-card-title">{track.title}</div>
        <p className="track-card-summary" title={track.summary}>{track.summary}</p>
        <div className="track-card-meta">
          <span><Icon icon={Clock} size={12} /> {formatNum(track.estMinutes)} د</span>
          <span><Icon icon={BookOpen} size={12} /> {formatNum(track.totalLessons)} درس</span>
          <span><Icon icon={Sparkles} size={12} style={{ color: 'var(--gold)' }} /> {formatNum(track.pointsAward)} نقطة</span>
        </div>
        {track.enrolled && (
          <ProgressBar
            value={track.progressPct}
            color={accent}
            label={track.isCompleted ? 'مكتمل' : `${track.completedLessons} / ${track.totalLessons} دروس`}
            ariaLabel={`تقدّم مسار ${track.title}`}
          />
        )}
      </div>
    </Link>
  );
}

/* Shape-matched loading skeletons (catalog). */
function KpiStripSkeleton() {
  return (
    <div className="grid-3" aria-busy="true" aria-live="polite">
      {[0, 1, 2].map((i) => (
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

function TrackGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="track-grid" aria-busy="true" aria-live="polite">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="track-card" aria-hidden>
          <Skeleton width={48} height={48} rounded="var(--r-lg)" />
          <div className="track-card-body">
            <Skeleton width="55%" height={11} />
            <Skeleton width="80%" height={16} />
            <Skeleton width="100%" height={12} />
            <Skeleton width="65%" height={12} />
          </div>
        </div>
      ))}
    </div>
  );
}

/* ═══════════════ Single track page ═══════════════ */
export function TrainingTrackPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const trackQ = useTrainingTrack(slug);
  const enroll = useEnrollTrack();
  const [enrollError, setEnrollError] = useState(false);

  if (trackQ.isPending) return <PageSkeleton />;
  if (trackQ.isError) {
    return (
      <div className="page">
        <Link to="/training" className="back-link">
          <Icon icon={ChevronRight} size={14} />
          كل المسارات
        </Link>
        <ErrorState message="تعذَّر تحميل المسار" error={trackQ.error} onRetry={() => trackQ.refetch()} />
      </div>
    );
  }
  const track = trackQ.data;
  if (!track) {
    return (
      <div className="page">
        <EmptyState
          icon={BookOpen}
          title="المسار غير موجود"
          description="ربما تم حذفه أو أن الرابط غير صحيح."
          action={<Link to="/training" className="btn primary sm">تصفح المسارات</Link>}
        />
      </div>
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
    <div className="page">
      <Link to="/training" className="back-link">
        <Icon icon={ChevronRight} size={14} />
        كل المسارات
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
          {track.titleEn && <div className="text-xs text-subtle font-mono"><bdi>{track.titleEn}</bdi></div>}
          <p className="track-hero-summary">{track.summary}</p>
          <div className="track-hero-meta">
            <Badge><Icon icon={Clock} size={11} /> {formatNum(track.estMinutes)} دقيقة</Badge>
            <Badge><Icon icon={BookOpen} size={11} /> {formatNum(track.lessons.length)} درس</Badge>
            <Badge color="gold"><Icon icon={Sparkles} size={11} /> {formatNum(track.pointsAward)} نقطة عند الإكمال</Badge>
            <Badge color="purple">{LEVEL_LABEL[track.level]}</Badge>
          </div>
        </div>
        <button
          type="button"
          className="btn primary"
          onClick={onEnroll}
          disabled={enroll.isPending}
        >
          {!track.enrolled ? 'ابدأ المسار' : track.isCompleted ? 'مراجعة الدروس' : 'استكمل الدراسة'}
          <Icon icon={ChevronLeft} size={14} />
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
            label={track.isCompleted ? 'هذا المسار مكتمل — شهادة جاهزة' : `${completedCount} / ${track.lessons.length} درس مكتمل`}
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
    </div>
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
  const complete = useCompleteLesson();
  const [quizAnswer, setQuizAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string; reward?: { points: number; level: number; tier: Tier; badges: Array<{ slug: string; title: string; iconEmoji: string }> } } | null>(null);

  if (trackQ.isPending) return <DetailSkeleton />;
  if (trackQ.isError) {
    return (
      <div className="page">
        <Link to="/training" className="back-link">
          <Icon icon={ChevronRight} size={14} />
          كل المسارات
        </Link>
        <ErrorState message="تعذَّر تحميل الدرس" error={trackQ.error} onRetry={() => trackQ.refetch()} />
      </div>
    );
  }
  const track = trackQ.data;
  if (!track) {
    return (
      <div className="page">
        <EmptyState
          icon={BookOpen}
          title="المسار غير موجود"
          description="ربما تم حذفه أو أن الرابط غير صحيح."
          action={<Link to="/training" className="btn primary sm">تصفح المسارات</Link>}
        />
      </div>
    );
  }

  const lesson = track.lessons.find((l) => l.id === lessonId);
  if (!lesson) {
    return (
      <div className="page">
        <EmptyState
          icon={BookOpen}
          title="الدرس غير موجود"
          description="ربما تم حذفه أو أن الرابط غير صحيح."
          action={<Link to={`/training/${track.slug}`} className="btn primary sm">عودة إلى المسار</Link>}
        />
      </div>
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
          msg: `أحسنت! حصلت على ${formatNum(res.pointsAwarded)} نقطة.`,
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
      const e = err as { response?: { data?: { error?: { message?: string } } } };
      setFeedback({ ok: false, msg: e.response?.data?.error?.message ?? 'حدث خطأ، حاول مجدداً' });
    }
  };

  return (
    <div className="page">
      <Link to={`/training/${track.slug}`} className="back-link">
        <Icon icon={ChevronRight} size={14} />
        {track.title}
      </Link>

      <Card>
        <div className="lesson-kicker">
          <span>الدرس <bdi>{lesson.order}</bdi> من <bdi>{track.lessons.length}</bdi></span>
          <span>·</span>
          <span><Icon icon={Clock} size={10} /> {formatNum(lesson.estMinutes)} دقيقة</span>
        </div>
        <h1 className="lesson-title">{lesson.title}</h1>
        {lesson.summary && <p className="text-sm text-muted" style={{ marginBottom: 'var(--sp-3)' }}>{lesson.summary}</p>}

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
            <div className="lesson-quiz-q">{lesson.quizQuestion}</div>
            <input
              type="text"
              className="input"
              placeholder="إجابتك…"
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
    </div>
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
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الإنجازات</h1>
          <p className="page-subtitle">
            رحلتك في التطوير الذاتي — نقاطك، أوسمتك، شهاداتك، وترتيبك بين الزملاء.
          </p>
        </div>
      </header>

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
        <div className="grid-3">
          <MetricCard icon={Trophy} color="gold" label="مجموع النقاط" value={formatNum(me.points)} change={`المستوى ${me.level.level} · ${TIER_LABEL[me.level.tier]}`} />
          <MetricCard icon={Award} color="purple" label="الأوسمة المحقّقة" value={formatNum(me.badgeCount)} change={badgesQ.data ? `من ${formatNum(badgesQ.data.length)} متاح` : undefined} />
          <MetricCard icon={Medal} color="green" label="الشهادات" value={formatNum(me.certificateCount)} change="معتمدة من المنصة" />
        </div>
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
              <EmptyState
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
              <EmptyState
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
                  <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
                    <div
                      className="cert-icon"
                      style={{ ['--cert-accent' as never]: c.themeColor ?? undefined }}
                      aria-hidden
                    >
                      <EmojiIcon emoji={c.iconEmoji ?? '🏅'} size={22} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="text-xxs text-subtle">شهادة إتمام مسار</div>
                      <h3 style={{ fontSize: 'var(--fs-md)', margin: '4px 0 6px' }}>{c.title}</h3>
                      <div className="text-xs text-muted">{c.issuer}</div>
                      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)', flexWrap: 'wrap' }}>
                        <Badge color="green"><Icon icon={CheckCircle2} size={11} /> مكتملة</Badge>
                        {c.issuedAt && (
                          <Badge>{formatDate(c.issuedAt, { year: 'numeric', month: 'short', day: 'numeric' })}</Badge>
                        )}
                        <Badge>{formatNum(c.hours)} ساعة معتمدة</Badge>
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
              <EmptyState icon={Crown} title="لا توجد بيانات بعد" description="سيظهر الترتيب مع أول نقاط مسجّلة على المنصة." />
            ) : (
              <ol className="leaderboard-list" aria-label="ترتيب الطلاب بالنقاط">
                {lbQ.data.map((r, i) => (
                  <li
                    key={r.userId}
                    className="leaderboard-row"
                    style={{ ['--lb-i' as never]: Math.min(i, 6) }}
                  >
                    <span className={`leaderboard-rank rank-${r.rank}`} aria-label={`المركز ${r.rank}`}>
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
            )}
          </Card>
        </div>
      )}
    </div>
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
