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
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  GraduationCap, Sparkles, Award, Trophy, Clock, CheckCircle2, Lock,
  ChevronLeft, BookOpen, Flame, Target, Crown, Star, Medal,
  type LucideIcon,
} from 'lucide-react';
import { Card, Badge, MetricCard, ProgressBar, UserAvatar } from '../../components/primitives';
import { PageSkeleton, DetailSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import { formatNum, formatDate } from '../../utils/numbers';
import {
  useTrainingCatalog, useTrainingTrack, useEnrollTrack, useCompleteLesson,
  useTrainingMe, useMyBadges, useMyTrainingCerts, useTrainingLeaderboard,
  type TrainingCategory, type TrainingTrackCard, type TrainingLessonView,
  type BadgeRarity, type Tier,
} from '../../hooks/useResources';

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

const TIER_COLOR: Record<Tier, string> = {
  BRONZE: '#A7724E',
  SILVER: '#9CA3AF',
  GOLD: '#D4A537',
  PLATINUM: '#7B3AED',
};

const TIER_LABEL: Record<Tier, string> = {
  BRONZE: 'برونزي',
  SILVER: 'فضي',
  GOLD: 'ذهبي',
  PLATINUM: 'بلاتيني',
};

const RARITY_COLOR: Record<BadgeRarity, string> = {
  COMMON: '#9CA3AF',
  RARE: '#2952C8',
  EPIC: '#7B3AED',
  LEGENDARY: '#D4A537',
};

const RARITY_LABEL: Record<BadgeRarity, string> = {
  COMMON: 'شائع',
  RARE: 'نادر',
  EPIC: 'أسطوري',
  LEGENDARY: 'فريد',
};

/* ═══════════════ Catalog page ═══════════════ */
export default function TrainingCatalogPage() {
  const { data: tracks } = useTrainingCatalog();
  const { data: me } = useTrainingMe();
  const [filter, setFilter] = useState<'all' | TrainingCategory>('all');

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

      {/* My summary — sticky-feel band */}
      {me && (
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
            value={me.badgeCount.toString()}
            change={`من ${me.badgeCount > 0 ? '16' : '16'} متاحة`}
          />
          <MetricCard
            icon={GraduationCap} color="brand"
            label="مسارات نشطة"
            value={enrolledCount.toString()}
            change={`${completedCount} مكتمل`}
          />
          <MetricCard
            icon={Medal} color="green"
            label="الشهادات"
            value={me.certificateCount.toString()}
            change="معتمدة من المنصة"
          />
        </div>
      )}

      {/* Level progress band */}
      {me && (
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: TIER_COLOR[me.level.tier], color: '#fff',
              display: 'grid', placeItems: 'center', fontWeight: 700, fontSize: 18,
            }}>
              {me.level.level}
            </div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div className="text-xs text-subtle" style={{ marginBottom: 4 }}>
                {TIER_LABEL[me.level.tier]} · المستوى {me.level.level}
              </div>
              <ProgressBar
                value={me.level.pctIntoLevel}
                color={TIER_COLOR[me.level.tier]}
                label={`${me.level.toNext} نقطة للمستوى التالي`}
              />
            </div>
            <Link to="/achievements" className="btn ghost sm">
              عرض الإنجازات
              <Icon icon={ChevronLeft} size={14} />
            </Link>
          </div>
        </Card>
      )}

      {/* Category filter pills */}
      <Card flush>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, padding: 'var(--sp-3)' }}>
          <button
            type="button"
            className={`filter-pill${filter === 'all' ? ' on' : ''}`}
            onClick={() => setFilter('all')}
          >
            <Icon icon={Sparkles} size={12} />
            كل المسارات ({tracks?.length ?? 0})
          </button>
          {categoriesPresent.map((c) => (
            <button
              key={c}
              type="button"
              className={`filter-pill${filter === c ? ' on' : ''}`}
              onClick={() => setFilter(c)}
            >
              {CATEGORY_LABEL[c]} ({tracks?.filter((t) => t.category === c).length ?? 0})
            </button>
          ))}
        </div>
      </Card>

      {/* Track cards grid */}
      <div className="track-grid">
        {visible.map((t) => (
          <TrackCard key={t.id} track={t} />
        ))}
        {visible.length === 0 && (
          <Card>
            <div className="empty-state">
              <Icon icon={BookOpen} size={28} className="text-subtle" />
              <p className="text-sm text-muted">لا توجد مسارات في هذه الفئة بعد.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}

function TrackCard({ track }: { track: TrainingTrackCard }) {
  const accent = track.themeColor ?? 'var(--accent)';
  return (
    <Link to={`/training/${track.slug}`} className="track-card" style={{ ['--track-accent' as never]: accent }}>
      <div className="track-card-icon" style={{ background: `color-mix(in srgb, ${accent} 12%, transparent)`, color: accent }}>
        <EmojiIcon emoji={track.iconEmoji ?? '🎓'} size={20} />
      </div>
      <div className="track-card-body">
        <div className="track-card-cat">{CATEGORY_LABEL[track.category]} · {LEVEL_LABEL[track.level]}</div>
        <div className="track-card-title">{track.title}</div>
        <p className="track-card-summary">{track.summary}</p>
        <div className="track-card-meta">
          <span><Icon icon={Clock} size={12} /> {track.estMinutes} د</span>
          <span><Icon icon={BookOpen} size={12} /> {track.totalLessons} درس</span>
          <span><Icon icon={Sparkles} size={12} style={{ color: 'var(--gold)' }} /> {track.pointsAward} نقطة</span>
        </div>
        {track.enrolled && (
          <div style={{ marginTop: 'var(--sp-2)' }}>
            <ProgressBar
              value={track.progressPct}
              color={accent}
              label={track.isCompleted ? '✓ مكتمل' : `${track.completedLessons} / ${track.totalLessons} دروس`}
            />
          </div>
        )}
      </div>
    </Link>
  );
}

/* ═══════════════ Single track page ═══════════════ */
export function TrainingTrackPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: track, isLoading } = useTrainingTrack(slug);
  const enroll = useEnrollTrack();

  if (isLoading) return <PageSkeleton />;
  if (!track) return <div className="page"><Card>المسار غير موجود.</Card></div>;

  const completedCount = track.lessons.filter((l) => l.isCompleted).length;
  const accent = track.themeColor ?? 'var(--accent)';

  const onEnroll = async () => {
    if (!track.enrolled) {
      await enroll.mutateAsync(track.slug);
    }
    // Jump straight to first incomplete lesson
    const next = track.lessons.find((l) => !l.isCompleted) ?? track.lessons[0];
    if (next) navigate(`/training/${track.slug}/lesson/${next.id}`);
  };

  return (
    <div className="page">
      <Link to="/training" className="back-link">
        <Icon icon={ChevronLeft} size={14} />
        كل المسارات
      </Link>

      {/* Hero band — track-themed */}
      <div className="track-hero" style={{ background: `linear-gradient(135deg, ${accent}26 0%, transparent 70%)`, borderRight: `3px solid ${accent}` }}>
        <div className="track-hero-icon" style={{ background: accent, color: '#fff' }}>
          <EmojiIcon emoji={track.iconEmoji ?? '🎓'} size={30} />
        </div>
        <div style={{ flex: 1 }}>
          <div className="track-hero-cat">{CATEGORY_LABEL[track.category]}</div>
          <h1 className="track-hero-title">{track.title}</h1>
          {track.titleEn && <div className="text-xs text-subtle font-mono">{track.titleEn}</div>}
          <p className="track-hero-summary">{track.summary}</p>
          <div className="track-hero-meta">
            <Badge><Icon icon={Clock} size={11} /> {track.estMinutes} دقيقة</Badge>
            <Badge><Icon icon={BookOpen} size={11} /> {track.lessons.length} درس</Badge>
            <Badge color="gold"><Icon icon={Sparkles} size={11} /> {track.pointsAward} نقطة عند الإكمال</Badge>
            <Badge color="purple">{LEVEL_LABEL[track.level]}</Badge>
          </div>
        </div>
        <button
          type="button"
          className="btn primary"
          onClick={onEnroll}
          disabled={enroll.isPending}
          style={{ background: accent }}
        >
          {!track.enrolled ? 'ابدأ المسار' : track.isCompleted ? 'مراجعة الدروس' : 'استكمل الدراسة'}
          <Icon icon={ChevronLeft} size={14} />
        </button>
      </div>

      {track.enrolled && (
        <Card>
          <ProgressBar
            value={Math.round((completedCount / track.lessons.length) * 100)}
            color={accent}
            label={track.isCompleted ? '✓ هذا المسار مكتمل — شهادة جاهزة' : `${completedCount} / ${track.lessons.length} درس مكتمل`}
          />
        </Card>
      )}

      {/* Lesson list */}
      <Card title="الدروس" icon={BookOpen} subtitle="اضغط على أي درس للبدء بمراجعته">
        <div className="flex-col gap-2">
          {track.lessons.map((lesson) => (
            <LessonRow key={lesson.id} trackSlug={track.slug} lesson={lesson} accent={accent} />
          ))}
        </div>
      </Card>
    </div>
  );
}

function LessonRow({ trackSlug, lesson, accent }: { trackSlug: string; lesson: TrainingLessonView; accent: string }) {
  return (
    <Link
      to={`/training/${trackSlug}/lesson/${lesson.id}`}
      className={`lesson-row${lesson.isCompleted ? ' done' : ''}`}
    >
      <div className="lesson-row-num" style={{ color: lesson.isCompleted ? 'var(--success)' : accent }}>
        {lesson.isCompleted ? <Icon icon={CheckCircle2} size={20} /> : <span>{lesson.order}</span>}
      </div>
      <div className="lesson-row-body">
        <div className="lesson-row-title">{lesson.title}</div>
        {lesson.summary && <div className="lesson-row-sub">{lesson.summary}</div>}
      </div>
      <div className="lesson-row-meta">
        <span className="text-xxs text-subtle"><Icon icon={Clock} size={10} /> {lesson.estMinutes} د</span>
        {lesson.quizQuestion && <Badge color="amber"><Icon icon={Target} size={10} /> سؤال</Badge>}
      </div>
    </Link>
  );
}

/* ═══════════════ Lesson page ═══════════════ */
export function TrainingLessonPage() {
  const { slug, lessonId } = useParams<{ slug: string; lessonId: string }>();
  const navigate = useNavigate();
  const { data: track } = useTrainingTrack(slug);
  const complete = useCompleteLesson();
  const [quizAnswer, setQuizAnswer] = useState('');
  const [feedback, setFeedback] = useState<{ ok: boolean; msg: string; reward?: { points: number; level: number; tier: Tier; badges: Array<{ title: string; iconEmoji: string }> } } | null>(null);

  if (!track) return <DetailSkeleton />;

  const lesson = track.lessons.find((l) => l.id === lessonId);
  if (!lesson) return <div className="page"><Card>الدرس غير موجود.</Card></div>;

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
          msg: `أحسنت! حصلت على ${res.pointsAwarded} نقطة.`,
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
        <Icon icon={ChevronLeft} size={14} />
        {track.title}
      </Link>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-2)' }}>
          <span className="text-xxs text-subtle">الدرس {lesson.order} من {track.lessons.length}</span>
          <span className="text-xxs text-subtle">·</span>
          <span className="text-xxs text-subtle"><Icon icon={Clock} size={10} /> {lesson.estMinutes} دقيقة</span>
        </div>
        <h1 style={{ fontSize: 'var(--fs-xl)', margin: '0 0 var(--sp-2) 0' }}>{lesson.title}</h1>
        {lesson.summary && <p className="text-sm text-muted" style={{ marginBottom: 'var(--sp-3)' }}>{lesson.summary}</p>}

        <div className="lesson-content">
          {lesson.contentMarkdown.split(/\n+/).map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </div>

        {lesson.quizQuestion && (
          <div className="lesson-quiz" style={{ borderRight: `3px solid ${accent}` }}>
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
          <div className={`reward-feedback ${feedback.ok ? 'ok' : 'fail'}`}>
            {feedback.ok ? (
              <>
                <Icon icon={CheckCircle2} size={16} />
                <span>{feedback.msg}</span>
                {feedback.reward && feedback.reward.points > 0 && (
                  <>
                    <span className="reward-pill"><Icon icon={Sparkles} size={12} /> +{feedback.reward.points}</span>
                    <span className="reward-pill" style={{ background: `${TIER_COLOR[feedback.reward.tier]}26`, color: TIER_COLOR[feedback.reward.tier] }}>
                      المستوى {feedback.reward.level}
                    </span>
                  </>
                )}
                {feedback.reward?.badges.map((b) => (
                  <span key={b.title} className="reward-pill badge-pop">{b.iconEmoji} {b.title}</span>
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

        <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-4)', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn primary"
            onClick={onComplete}
            disabled={complete.isPending || lesson.isCompleted}
            style={{ background: accent }}
          >
            {lesson.isCompleted ? 'تم الإكمال ✓' : complete.isPending ? 'جارٍ الإرسال…' : 'أكملت — احتساب الدرس'}
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
export function AchievementsPage() {
  const { data: me } = useTrainingMe();
  const { data: badges } = useMyBadges();
  const { data: certs } = useMyTrainingCerts();
  const { data: lb } = useTrainingLeaderboard();
  const [tab, setTab] = useState<'badges' | 'certs' | 'leaderboard'>('badges');

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

      {me && (
        <div className="grid-3">
          <MetricCard icon={Trophy} color="gold" label="مجموع النقاط" value={formatNum(me.points)} change={`المستوى ${me.level.level} · ${TIER_LABEL[me.level.tier]}`} />
          <MetricCard icon={Award} color="purple" label="الأوسمة المحقّقة" value={me.badgeCount.toString()} change={badges ? `من ${badges.length} متاح` : undefined} />
          <MetricCard icon={Medal} color="green" label="الشهادات" value={me.certificateCount.toString()} change="معتمدة من المنصة" />
        </div>
      )}

      <div className="tabs">
        <button type="button" className={`tab${tab === 'badges' ? ' on' : ''}`} onClick={() => setTab('badges')}>
          <Icon icon={Award} size={13} /> الأوسمة
        </button>
        <button type="button" className={`tab${tab === 'certs' ? ' on' : ''}`} onClick={() => setTab('certs')}>
          <Icon icon={Medal} size={13} /> الشهادات
        </button>
        <button type="button" className={`tab${tab === 'leaderboard' ? ' on' : ''}`} onClick={() => setTab('leaderboard')}>
          <Icon icon={Crown} size={13} /> الترتيب
        </button>
      </div>

      {tab === 'badges' && (
        <div className="badge-grid">
          {badges?.map((b) => (
            <div
              key={b.slug}
              className={`badge-tile${b.isEarned ? ' earned' : ' locked'}`}
              style={{ ['--rarity' as never]: RARITY_COLOR[b.rarity] }}
            >
              <div className="badge-tile-icon">{b.isEarned ? b.iconEmoji : <Icon icon={Lock} size={20} />}</div>
              <div className="badge-tile-title">{b.title}</div>
              <div className="badge-tile-desc">{b.description}</div>
              <span className="badge-tile-rarity">{RARITY_LABEL[b.rarity]}</span>
            </div>
          ))}
          {badges && badges.length === 0 && (
            <Card><div className="empty-state"><Icon icon={Award} size={28} className="text-subtle" /><p className="text-sm text-muted">لا توجد أوسمة بعد.</p></div></Card>
          )}
        </div>
      )}

      {tab === 'certs' && (
        <div className="grid-2">
          {certs?.map((c) => (
            <Card key={c.id}>
              <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 'var(--r-md)',
                  background: `${c.themeColor ?? 'var(--accent)'}1a`, color: c.themeColor ?? 'var(--accent)',
                  display: 'grid', placeItems: 'center', fontSize: 26, flexShrink: 0,
                }}>
                  <EmojiIcon emoji={c.iconEmoji ?? '🏅'} size={22} />
                </div>
                <div style={{ flex: 1 }}>
                  <div className="text-xxs text-subtle">شهادة إتمام مسار</div>
                  <h3 style={{ fontSize: 'var(--fs-md)', margin: '4px 0 6px 0' }}>{c.title}</h3>
                  <div className="text-xs text-muted">{c.issuer}</div>
                  <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-2)', flexWrap: 'wrap' }}>
                    <Badge color="green"><Icon icon={CheckCircle2} size={11} /> مكتملة</Badge>
                    {c.issuedAt && (
                      <Badge>{formatDate(c.issuedAt, { year: 'numeric', month: 'short', day: 'numeric' })}</Badge>
                    )}
                    <Badge>{c.hours} ساعة معتمدة</Badge>
                  </div>
                </div>
              </div>
            </Card>
          ))}
          {certs && certs.length === 0 && (
            <Card><div className="empty-state"><Icon icon={Medal} size={28} className="text-subtle" /><p className="text-sm text-muted">لم تحصل على شهادات بعد. أكمل أول مسار للحصول على شهادتك الأولى.</p><Link to="/training" className="btn primary sm">تصفح المسارات</Link></div></Card>
          )}
        </div>
      )}

      {tab === 'leaderboard' && (
        <Card title="الأعلى نقاطاً هذا الأسبوع" icon={Crown} subtitle="آخر 20 طالباً نشاطاً على المنصة">
          <div className="flex-col gap-1">
            {lb?.map((r) => (
              <div key={r.userId} className="leaderboard-row">
                <span className={`leaderboard-rank rank-${r.rank}`}>
                  {r.rank <= 3 ? <Icon icon={r.rank === 1 ? Crown : r.rank === 2 ? Star : Flame} size={14} /> : `#${r.rank}`}
                </span>
                <UserAvatar initials={r.avatarInitials ?? r.name.slice(0, 2)} color={r.avatarColor ?? undefined} size={32} />
                <span className="leaderboard-name">{r.name}</span>
                <span className="leaderboard-tier" style={{ color: TIER_COLOR[r.level.tier] }}>L{r.level.level} · {TIER_LABEL[r.level.tier]}</span>
                <span className="leaderboard-points"><Icon icon={Sparkles} size={11} /> {formatNum(r.points)}</span>
              </div>
            ))}
            {lb && lb.length === 0 && (
              <div className="empty-state"><Icon icon={Crown} size={28} className="text-subtle" /><p className="text-sm text-muted">لا توجد بيانات بعد.</p></div>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

// Re-export for direct page imports
export { TrainingTrackPage as TrainingTrack };
