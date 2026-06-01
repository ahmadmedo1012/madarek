import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Trophy, Star, Award, Activity, Crown,
  Target, FlaskConical, Headset,
  Bell, Calendar, AlertTriangle, BookOpen, Download,
  CheckCircle2, MessageCircle, Heart, Repeat2, Bookmark,
  TrendingUp, Building2, Users2, GraduationCap, Microscope,
} from 'lucide-react';
import { Bar, Radar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, RadialLinearScale, PointElement, LineElement, Filler } from 'chart.js';
import { Card, MetricCard, ProgressBar, Badge, UserAvatar, AlertRow, SectionTitle } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useMyAchievements, useLeaderboard, useMySkills, usePosts, useCreatePost, useReactToPost, useStudentResults, useMyEnrollments, useNotifications, useArExperiences, useStudentMaterials, useFaculties } from '../../hooks/useResources';
import { useAuthStore } from '../../stores/auth.store';
import { cartesianOptions, chartColors, valueLabels } from '../../lib/chartTheme';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, RadialLinearScale, PointElement, LineElement, Filler);

/* ─── Gamification ─────────────────────────────────────── */
export function GamificationPage() {
  const ach = useMyAchievements();
  const lb = useLeaderboard();

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الإنجازات والنقاط</h1>
          <p className="page-subtitle">تقدّمك ومستواك مقارنة بزملائك في المنصة.</p>
        </div>
        <Badge color="gold" icon={Star}>2,340 XP</Badge>
      </div>

      <div className="grid-2">
        <Card title="مستوى التقدم" icon={Trophy}>
          <div className="flex items-center gap-4" style={{ marginBottom: 'var(--sp-5)' }}>
            <div
              style={{
                width: 72, height: 72, borderRadius: '50%',
                background: 'var(--accent-soft)',
                color: 'var(--accent)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 24, fontWeight: 700,
                flexShrink: 0,
                border: '2px solid var(--accent)',
              }}
            >
              7
            </div>
            <div className="flex-1">
              <div className="text-md font-semibold" style={{ color: 'var(--text)' }}>محلل البيانات</div>
              <div className="text-xs text-subtle" style={{ marginBottom: 8 }}>
                <span className="font-mono">2,340</span> / <span className="font-mono">3,000 XP</span>
              </div>
              <div className="xp-track"><div className="xp-fill" style={{ width: '78%' }} /></div>
            </div>
          </div>

          <SectionTitle>الإنجازات المحققة</SectionTitle>
          {ach.isPending ? <LoadingState /> :
           ach.isError ? <ErrorState /> :
           !ach.data?.length ? <EmptyState icon={Award} title="لا إنجازات بعد" /> : (
            <div className="flex-col gap-2">
              {ach.data.map((a) => (
                <div className="achievement" key={a.achievement.id}>
                  <span className="achievement-icon"><Icon icon={Trophy} size={16} /></span>
                  <div className="flex-1">
                    <div className="achievement-name">{a.achievement.name}</div>
                    <div className="achievement-desc">{a.achievement.description}</div>
                  </div>
                  <Badge color="gold">+{a.achievement.xp}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="لوحة المتصدرين" icon={Crown}>
          {lb.isPending ? <LoadingState /> :
           lb.isError ? <ErrorState /> :
           !lb.data?.length ? <EmptyState /> : (
            <div className="flex-col gap-1">
              {lb.data.map((l, i) => (
                <div className="list-row" key={l.id}>
                  <span
                    className="font-mono"
                    style={{
                      width: 24, textAlign: 'center', fontSize: 13,
                      color: i === 0 ? 'var(--gold)' : i === 1 ? 'var(--text-muted)' : i === 2 ? 'var(--brand-purple)' : 'var(--text-subtle)',
                      fontWeight: 700,
                    }}
                  >
                    #{i + 1}
                  </span>
                  <UserAvatar
                    initials={l.avatarInitials ?? `${l.firstName[0] ?? ''}${l.lastName[0] ?? ''}`}
                    color={l.avatarColor ?? undefined}
                    size={32}
                  />
                  <div className="list-row-body">
                    <div className="list-row-title">{l.firstName} {l.lastName}</div>
                    <div className="list-row-sub">المستوى {l.level}</div>
                  </div>
                  <span className="font-mono text-xs" style={{ color: 'var(--gold)' }}>
                    {l.totalXp.toLocaleString('ar-LY')} XP
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ─── Skills ───────────────────────────────────────────── */
export function SkillsPage() {
  const skills = useMySkills();
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المهارات والشهادات</h1>
          <p className="page-subtitle">رصد مهاراتك التقنية وتطوّرها مع الوقت.</p>
        </div>
      </div>

      <Card title="خريطة المهارات التقنية" icon={Target}>
        {skills.isPending ? <LoadingState /> :
         skills.isError ? <ErrorState /> :
         !skills.data?.length ? <EmptyState icon={Target} title="لم تُسجَّل أي مهارة بعد" /> : (
          <div className="grid-1-2" style={{ alignItems: 'center' }}>
            <div style={{ height: 300, position: 'relative' }}>
              <Radar
                data={{
                  labels: skills.data.map((s) => s.skill.name),
                  datasets: [{
                    label: 'مستوى الإتقان',
                    data: skills.data.map((s) => s.progressPct),
                    backgroundColor: 'rgba(59, 130, 246, 0.18)',
                    borderColor: chartColors().accent,
                    borderWidth: 2,
                    pointBackgroundColor: chartColors().accent,
                    pointRadius: 3,
                  }],
                }}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  animation: { duration: 750, easing: 'easeOutQuart' },
                  plugins: { legend: { display: false } },
                  scales: {
                    r: {
                      min: 0, max: 100,
                      angleLines: { color: chartColors().grid },
                      grid: { color: chartColors().grid },
                      pointLabels: { color: chartColors().text, font: { family: 'IBM Plex Sans Arabic', size: 11 } },
                      ticks: { display: false, stepSize: 25 },
                    },
                  },
                }}
              />
            </div>
            <div className="flex-col gap-4">
              {skills.data.map((s) => (
                <div key={s.skill.id} className="flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{s.skill.name}</span>
                    <Badge>المستوى {s.level} / 5</Badge>
                  </div>
                  <ProgressBar value={s.progressPct} showValue />
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ─── Alerts ───────────────────────────────────────────── */
export function AlertsPage() {
  const q = useNotifications();

  const items = q.data ?? [];
  const unreadCount = items.filter((n) => !n.readAt).length;

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
  const formatRelative = (iso: string): string => {
    const d = new Date(iso);
    const m = Math.round((Date.now() - d.getTime()) / 60000);
    if (m < 1) return 'الآن';
    if (m < 60) return `منذ ${m} دقيقة`;
    const h = Math.round(m / 60);
    if (h < 24) return `منذ ${h} ساعة`;
    return `منذ ${Math.round(h / 24)} يوم`;
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الإشعارات</h1>
          <p className="page-subtitle">آخر التحديثات والتذكيرات الأكاديمية.</p>
        </div>
      </div>

      <Card title="إشعاراتي" icon={Bell} actions={
        unreadCount > 0 ? <Badge color="brand">{unreadCount} غير مقروء</Badge> : <Badge color="green">الكلّ مقروء</Badge>
      }>
        {q.isPending ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState />
        ) : items.length === 0 ? (
          <EmptyState title="لا توجد إشعارات بعد" description="ستظهر التذكيرات والتحديثات الأكاديميّة هنا." />
        ) : (
          <div className="flex-col gap-2">
            {items.slice(0, 30).map((n) => (
              <AlertRow
                key={n.id}
                color={toneFor(n.type)}
                icon={iconFor(n.type)}
                title={n.title}
                description={n.body ?? undefined}
                time={formatRelative(n.createdAt)}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

/* ─── Schedule ─────────────────────────────────────────── */
const DAY_NAMES = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];

export function SchedulePage() {
  const q = useMyEnrollments();

  if (q.isPending) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">الجدول الدراسي</h1>
            <p className="page-subtitle">جارٍ جمع جدولك…</p>
          </div>
        </div>
        <LoadingState />
      </div>
    );
  }
  if (q.isError) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">الجدول الدراسي</h1>
          </div>
        </div>
        <ErrorState />
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

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الجدول الدراسي</h1>
          <p className="page-subtitle">جدولك الأسبوعيّ مع أماكن المحاضرات.</p>
        </div>
      </div>

      {daysWithItems.length === 0 ? (
        <EmptyState
          title="لا يوجد جدول مسجَّل"
          description="ستظهر محاضراتك هنا فور أن يُسجَّل الجدول لمقرّراتك."
        />
      ) : (
        <div className="flex-col gap-5">
          {daysWithItems.map((d) => (
            <div key={d.dow}>
              <SectionTitle>{DAY_NAMES[d.dow]}</SectionTitle>
              <Card flush>
                <div className="flex-col">
                  {d.items.map((it, i) => (
                    <div
                      key={i}
                      className="list-row"
                      style={{
                        borderRadius:
                          i === 0 ? 'var(--r-lg) var(--r-lg) 0 0' :
                          i === d.items.length - 1 ? '0 0 var(--r-lg) var(--r-lg)' : 0,
                      }}
                    >
                      <span className="list-row-meta">{it.time}</span>
                      <div className="list-row-body">
                        <div className="list-row-title">{it.name}</div>
                        <div className="list-row-sub">{it.room} · {it.teacher}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Results ──────────────────────────────────────────── */
export function ResultsPage() {
  const q = useStudentResults();

  if (q.isPending) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">النتائج والتقييمات</h1>
            <p className="page-subtitle">جارٍ جمع درجاتك…</p>
          </div>
        </div>
        <LoadingState />
      </div>
    );
  }
  if (q.isError || !q.data) {
    return (
      <div className="page">
        <div className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">النتائج والتقييمات</h1>
          </div>
        </div>
        <ErrorState
          message="تعذَّر تحميل هذا القسم"
          error={q.error}
          onRetry={() => q.refetch()}
        />
      </div>
    );
  }

  const d = q.data;
  const hasGrades = d.courses.some((c) => c.gradePct !== null);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">النتائج والتقييمات</h1>
          <p className="page-subtitle">تفاصيل درجاتك وتحليل أدائك بناءً على بياناتك الفعليّة.</p>
        </div>
      </div>

      <div className="grid-3">
        <MetricCard
          icon={Award}
          label="أعلى درجة"
          value={d.headline.highest ? `${d.headline.highest.gradePct}` : '—'}
          change={d.headline.highest?.courseName ?? 'لا توجد درجات بعد'}
          color="green"
        />
        <MetricCard
          icon={Activity}
          label="المتوسّط"
          value={d.headline.avgGradePct !== null ? `${d.headline.avgGradePct}` : '—'}
          change={d.headline.courseCount > 0 ? `عبر ${d.headline.courseCount} مقرّر` : 'لا تقييمات بعد'}
          color={d.headline.avgGradePct !== null && d.headline.avgGradePct >= 70 ? 'brand' : 'amber'}
        />
        <MetricCard
          icon={AlertTriangle}
          label="أدنى درجة"
          value={d.headline.lowest ? `${d.headline.lowest.gradePct}` : '—'}
          change={d.headline.lowest?.courseName ?? '—'}
          color={d.headline.lowest && d.headline.lowest.gradePct < 60 ? 'red' : 'amber'}
        />
      </div>

      <Card title="درجاتك حسب المقرّر" icon={Activity} subtitle={hasGrades ? 'النسبة المرجَّحة لكل مقرّر' : 'ستظهر درجاتك هنا فور تسجيلها'}>
        {!hasGrades ? (
          <EmptyState title="لم تُسجَّل أي درجات بعد" description="يبدأ الحساب فور رصد أوّل تقييم في أي مقرّر." />
        ) : (
          <div style={{ height: Math.max(180, d.courses.length * 32) }}>
            <Bar
              data={{
                labels: d.courses.map((r) => r.courseName),
                datasets: [{
                  label: 'الدرجة',
                  data: d.courses.map((r) => r.gradePct ?? 0),
                  backgroundColor: d.courses.map((r) => {
                    const c = chartColors();
                    const g = r.gradePct ?? 0;
                    return g >= 85 ? c.success : g >= 70 ? c.accent : g >= 60 ? c.warning : c.danger;
                  }),
                  borderRadius: 6,
                  maxBarThickness: 48,
                }],
              }}
              plugins={[valueLabels]}
              options={{
                ...cartesianOptions(),
                scales: {
                  ...cartesianOptions().scales,
                  y: { ...cartesianOptions().scales!.y, min: 0, max: 100 },
                },
              }}
            />
          </div>
        )}
      </Card>

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
                  color={
                    (r.gradePct ?? 0) >= 85 ? 'var(--success)' :
                    (r.gradePct ?? 0) >= 70 ? 'var(--accent)' :
                    (r.gradePct ?? 0) >= 60 ? 'var(--warning)' :
                    'var(--danger)'
                  }
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
              {d.recentAssignments.slice(0, 6).map((a) => (
                <AlertRow
                  key={a.id}
                  color={a.gradePct >= 85 ? 'green' : a.gradePct >= 70 ? 'brand' : a.gradePct >= 60 ? 'amber' : 'red'}
                  icon={a.gradePct >= 70 ? CheckCircle2 : AlertTriangle}
                  title={`${a.title} — ${a.gradePct}%`}
                  description={a.gradedAt ? new Date(a.gradedAt).toLocaleDateString('ar-LY', { dateStyle: 'medium' }) : ''}
                />
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

/* ─── Labs / AR-VR ─────────────────────────────────────── */
// LabsPage moved to its own file (LabsPage.tsx).

/* ─── AR/VR ────────────────────────────────────────────── */
export function ArVrPage() {
  const q = useArExperiences();

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">تجارب AR / VR</h1>
          <p className="page-subtitle">محتوى تفاعليّ ثلاثيّ الأبعاد للمواد العمليّة.</p>
        </div>
      </div>

      {q.isPending ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState />
      ) : !q.data || q.data.length === 0 ? (
        <EmptyState
          title="لا توجد تجارب AR/VR بعد"
          description="ستظهر هنا حين يقوم الإداريّون بإضافتها."
        />
      ) : (
        <div className="grid-3">
          {q.data.map((e) => (
            <Card key={e.id} compact bordered>
              <div className="flex items-start justify-between" style={{ marginBottom: 'var(--sp-3)' }}>
                <div className="metric-icon" style={{ color: 'var(--brand-purple)' }}>
                  <Icon icon={Headset} size={20} />
                </div>
                <Badge color={e.type === 'VR' ? 'purple' : 'brand'}>{e.type}</Badge>
              </div>
              <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{e.title}</div>
              <div className="text-xs text-subtle" style={{ marginTop: 4 }}>{e.subject}</div>
              {e.description && (
                <p className="text-xs text-muted" style={{ marginTop: 'var(--sp-2)', lineHeight: 1.5 }}>
                  {e.description}
                </p>
              )}
              <button type="button" className="btn outline" style={{ width: '100%', marginTop: 'var(--sp-3)' }}>
                ابدأ التجربة
              </button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Social ───────────────────────────────────────────── */
export function SocialPage() {
  const posts = usePosts();
  const createPost = useCreatePost();
  const reactToPost = useReactToPost();
  const user = useAuthStore((s) => s.user);
  const [draft, setDraft] = useState('');
  const [reactedIds, setReactedIds] = useState<Set<string>>(new Set());

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim() || createPost.isPending) return;
    // Extract simple #hashtags from the body for proper persistence.
    const tags = (draft.match(/#[\u0600-\u06FF\w_]+/g) ?? []).map((t) => t.slice(1));
    createPost.mutate(
      { body: draft.trim(), hashtags: tags },
      { onSuccess: () => setDraft('') },
    );
  };

  const onLike = (id: string) => {
    if (reactedIds.has(id)) return;
    reactToPost.mutate({ postId: id, kind: 'like' });
    setReactedIds(new Set([...reactedIds, id]));
  };

  const fmtTime = (iso: string) => {
    const d = new Date(iso);
    const diffSec = Math.round((Date.now() - +d) / 1000);
    if (diffSec < 60) return 'الآن';
    if (diffSec < 3600) return `منذ ${Math.round(diffSec / 60)} دقيقة`;
    if (diffSec < 86400) return `منذ ${Math.round(diffSec / 3600)} ساعة`;
    return d.toLocaleDateString('ar-LY', { day: 'numeric', month: 'short' });
  };

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الشبكة الاجتماعية</h1>
          <p className="page-subtitle">تواصل مع زملائك وأساتذتك حول المواد والمشاريع.</p>
        </div>
      </div>

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
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="ماذا يدور في ذهنك؟ (يمكنك استخدام #هاشتاج)"
                    rows={2}
                    style={{
                      flex: 1,
                      resize: 'vertical',
                      minHeight: 48,
                      padding: 'var(--sp-2) var(--sp-3)',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 'var(--r-md)',
                      color: 'var(--text)',
                      fontFamily: 'inherit',
                      fontSize: 'var(--fs-sm)',
                      lineHeight: 'var(--lh-base)',
                    }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xxs text-subtle">{draft.length} / 2000</span>
                  <button
                    type="submit"
                    className="btn primary sm"
                    disabled={!draft.trim() || createPost.isPending}
                  >
                    {createPost.isPending ? 'جاري النشر…' : 'نشر'}
                  </button>
                </div>
              </form>
            </Card>
          )}

          {posts.isPending ? (
            <Card><LoadingState /></Card>
          ) : posts.isError ? (
            <Card><ErrorState /></Card>
          ) : !posts.data?.length ? (
            <Card>
              <EmptyState
                icon={MessageCircle}
                title="لا منشورات بعد"
                description="كن أول من يشارك تجربته أو سؤاله."
              />
            </Card>
          ) : (
            posts.data.map((p) => {
              const initials = p.author.avatarInitials ?? `${p.author.firstName[0] ?? ''}${p.author.lastName[0] ?? ''}`;
              const reacted = reactedIds.has(p.id);
              return (
                <div className="post" key={p.id}>
                  <div className="post-header">
                    <UserAvatar initials={initials} color={p.author.avatarColor ?? undefined} size={36} />
                    <div className="flex-1">
                      <div className="post-author">{p.author.firstName} {p.author.lastName}</div>
                      <div className="post-time">{fmtTime(p.createdAt)}</div>
                    </div>
                  </div>
                  <div className="post-body">{p.body}</div>
                  {p.hashtags && p.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1" style={{ marginTop: 6 }}>
                      {p.hashtags.map((t) => (
                        <span key={t} className="text-xxs font-mono" style={{ color: 'var(--accent)' }}>#{t}</span>
                      ))}
                    </div>
                  )}
                  <div className="post-actions">
                    <button type="button" className={`post-action${reacted ? ' on' : ''}`} onClick={() => onLike(p.id)}>
                      <Icon icon={Heart} size={13} />
                      {p._count.reactions + (reacted ? 1 : 0)}
                    </button>
                    <button type="button" className="post-action">
                      <Icon icon={MessageCircle} size={13} />
                      {p._count.comments}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <Card title="الأكثر تداولاً" icon={TrendingUp}>
          <div className="flex-col gap-2">
            {['#امتحانات_نهائية', '#معامل_افتراضية', '#Python_للمبتدئين', '#وظائف_ليبيا_التقنية', '#مشاريع_تخرج'].map((t, i) => (
              <div className="list-row" key={t}>
                <span className="font-mono text-xs text-subtle" style={{ width: 18 }}>{i + 1}</span>
                <div className="list-row-body">
                  <div className="text-sm" style={{ color: 'var(--accent)' }}>{t}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
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
  return new Date(iso).toLocaleDateString('ar-LY', { day: 'numeric', month: 'short' });
}

export function DownloadsPage() {
  const q = useStudentMaterials();

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">مركز التحميلات</h1>
          <p className="page-subtitle">جميع المواد الدراسية في مقرّراتك متاحة للتحميل.</p>
        </div>
      </div>

      <Card title="ملفّات حديثة" icon={Download}>
        {q.isPending ? (
          <LoadingState />
        ) : q.isError ? (
          <ErrorState />
        ) : !q.data || q.data.length === 0 ? (
          <EmptyState
            title="لا توجد ملفّات بعد"
            description="ستظهر هنا فور رفع موادّ في أيٍّ من مقرّراتك المسجَّلة."
          />
        ) : (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>الملفّ</th>
                  <th>المادة</th>
                  <th>النوع</th>
                  <th>الحجم</th>
                  <th>التاريخ</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {q.data.map((f) => (
                  <tr key={f.id}>
                    <td className="tbl-strong">{f.name}</td>
                    <td>{f.course.name}</td>
                    <td><Badge>{f.type}</Badge></td>
                    <td className="tbl-num">{f.sizeBytes > 0 ? formatSize(f.sizeBytes) : '—'}</td>
                    <td className="text-subtle">{formatShortDate(f.createdAt)}</td>
                    <td>
                      <a href={f.url} target="_blank" rel="noreferrer" className="btn ghost sm">
                        <Icon icon={Download} size={13} /> تحميل
                      </a>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ─── University Info ──────────────────────────────────── */

const MEMBERSHIPS = [
  { ar: 'اتحاد الجامعات العربية', en: 'AARU' },
  { ar: 'اتحاد الجامعات الأفريقية', en: 'AAU' },
  { ar: 'اتحاد الجامعات الإسلامية', en: 'FUIW' },
];

export function UniversityInfoPage() {
  const facs = useFaculties();
  const faculties = facs.data ?? [];
  const insideCampus = faculties.filter((f) => f.city === 'الزاوية');
  const outsideCampus = faculties.filter((f) => f.city !== 'الزاوية');
  const cityCount = new Set(faculties.map((f) => f.city)).size;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">جامعة الزاوية</h1>
          <p className="page-subtitle">
            مؤسّسة تعليميّة حكوميّة، تأسّست عام 1988 وتمتدّ عبر عدّة مدن في الإقليم الغربيّ.
          </p>
        </div>
      </div>

      <div className="grid-4">
        <MetricCard
          icon={Building2}
          label="عدد الكليّات"
          value={faculties.length > 0 ? faculties.length.toLocaleString('ar-LY') : '—'}
          change={cityCount > 0 ? `موزَّعة على ${cityCount} ${cityCount === 1 ? 'مدينة' : 'مدن'}` : undefined}
          color="brand"
        />
        <MetricCard
          icon={GraduationCap}
          label="داخل الحرم الجامعيّ"
          value={insideCampus.length.toLocaleString('ar-LY')}
          change="الزاوية"
          color="green"
        />
        <MetricCard
          icon={Users2}
          label="فروع خارجيّة"
          value={outsideCampus.length.toLocaleString('ar-LY')}
          change={`في ${Math.max(0, cityCount - 1)} مدن`}
          color="purple"
        />
        <MetricCard
          icon={Award}
          label="سنة التأسيس"
          value="1988"
          change="بقرار رقم 135"
          color="gold"
        />
      </div>

      {/* Vision + Mission */}
      <div className="grid-2">
        <Card title="الرؤية" icon={Target}>
          <p style={{ fontSize: 'var(--fs-md)', color: 'var(--text)', lineHeight: 'var(--lh-loose)', margin: 0 }}>
            تحقيق التميّز والريادة في مجال التعليم والبحث العلميّ وخدمة المجتمع.
          </p>
        </Card>
        <Card title="الرسالة" icon={Star}>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', lineHeight: 'var(--lh-loose)', margin: 0 }}>
            تقديم خدمات تعليميّة وبحثيّة متميّزة في خدمة المجتمع من خلال كوادر مؤهّلة، وبرامج علميّة،
            وبيئة محفّزة، وشراكات فعّالة مع المؤسّسات المحليّة والدوليّة، وتلبية احتياجات سوق العمل
            ومعايير الجودة والاعتماد.
          </p>
        </Card>
      </div>

      <Card title="بطاقة تعريف" icon={Building2}>
        <div className="grid-2">
          <FactRow label="الاسم الرسميّ" value="جامعة الزاوية" />
          <FactRow label="الاسم السابق" value="جامعة السابع من أبريل" />
          <FactRow label="النوع" value="جامعة حكوميّة عامّة" />
          <FactRow label="تاريخ التأسيس" value="1988 م (بقرار رقم 135)" />
          <FactRow label="الموقع" value="الزاوية، ليبيا" />
          <FactRow label="الموقع الإلكترونيّ" value="zu.edu.ly" mono />
        </div>
      </Card>

      <Card
        title="الكليّات داخل الحرم الجامعيّ"
        icon={Building2}
        subtitle={facs.isPending ? 'جارٍ التحميل…' : `${insideCampus.length} كلّيّة في مدينة الزاوية`}
      >
        {facs.isPending ? (
          <LoadingState />
        ) : insideCampus.length === 0 ? (
          <p className="text-sm text-muted">لا توجد بيانات.</p>
        ) : (
          <div className="grid-auto-200" style={{ gap: 'var(--sp-2)' }}>
            {insideCampus.map((f) => (
              <Link
                key={f.id}
                to={`/colleges/${f.id}`}
                className="faculty-chip-row"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <span style={{ fontSize: 16 }} aria-hidden>{f.iconEmoji ?? '🏛️'}</span>
                <span className="text-sm" style={{ flex: 1 }}>{f.name}</span>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="الكليّات الفرعيّة"
        icon={Building2}
        subtitle={facs.isPending ? '' : `${outsideCampus.length} كلّيّة موزَّعة على ${new Set(outsideCampus.map((c) => c.city)).size} مدن`}
      >
        {facs.isPending ? (
          <LoadingState />
        ) : outsideCampus.length === 0 ? (
          <p className="text-sm text-muted">لا توجد فروع خارج الحرم.</p>
        ) : (
          <div className="grid-auto-260" style={{ gap: 'var(--sp-2)' }}>
            {outsideCampus.map((f) => (
              <Link
                key={f.id}
                to={`/colleges/${f.id}`}
                className="faculty-chip-row"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <span style={{ fontSize: 16 }} aria-hidden>{f.iconEmoji ?? '🏛️'}</span>
                <span className="text-sm" style={{ flex: 1, minWidth: 0 }}>{f.name}</span>
                <Badge color="purple">{f.city}</Badge>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Card title="العضويّات الدوليّة" icon={Crown}>
        <div className="flex-col gap-2">
          {MEMBERSHIPS.map((m) => (
            <div key={m.en} className="flex items-center justify-between" style={{
              padding: 'var(--sp-3)', background: 'var(--surface-2)', borderRadius: 'var(--r-md)',
            }}>
              <span className="text-sm">{m.ar}</span>
              <Badge color="gold">{m.en}</Badge>
            </div>
          ))}
        </div>
        <div className="text-xxs text-subtle" style={{
          marginTop: 'var(--sp-3)', padding: 'var(--sp-2) var(--sp-3)',
          background: 'var(--accent-soft)', color: 'var(--accent)', borderRadius: 'var(--r-sm)',
          display: 'inline-block',
        }}>
          معتمدة من وزارة التعليم العالي والبحث العلميّ — ليبيا
        </div>
      </Card>

      {/* Strategic plan */}
      <Card title="الخطّة الاستراتيجيّة 2024–2028" icon={Target} subtitle="خارطة طريق للارتقاء بمكانة الجامعة وتعزيز دورها في خدمة المجتمع">
        <div className="grid-2" style={{ gap: 'var(--sp-2)' }}>
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
            <div key={g} style={{
              padding: 'var(--sp-3)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)',
              background: 'var(--surface-2)', borderRadius: 'var(--r-sm)',
            }}>
              <Icon icon={CheckCircle2} size={14} style={{ color: 'var(--success)', flexShrink: 0 }} />
              <span className="text-sm">{g}</span>
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
            <div key={d.en} style={{
              padding: 'var(--sp-3)', background: 'var(--surface-2)', borderRadius: 'var(--r-md)',
              borderRight: '3px solid var(--accent)',
            }}>
              <div className="text-sm" style={{ fontWeight: 600 }}>{d.ar}</div>
              <div className="text-xxs text-subtle font-mono">{d.en}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card title="معلومات التواصل" icon={Headset}>
        <div className="grid-2">
          <FactRow label="العنوان" value="جامعة الزاوية، الزاوية، ليبيا" />
          <FactRow label="الهاتف" value="‎+218 23 762659" mono />
          <FactRow label="هاتف بديل" value="‎+218 23 762882" mono />
          <FactRow label="البريد العامّ" value="info@zu.edu.ly" mono />
          <FactRow label="التعاون الدوليّ" value="ico@zu.edu.ly" mono />
          <FactRow label="الموقع الرسميّ" value="zu.edu.ly" mono />
        </div>
      </Card>
    </div>
  );
}

function FactRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{
      padding: 'var(--sp-3)',
      background: 'var(--surface-2)',
      borderRadius: 'var(--r-md)',
      display: 'flex',
      flexDirection: 'column',
      gap: 4,
    }}>
      <span className="text-xxs text-subtle">{label}</span>
      <span className={mono ? 'font-mono text-sm' : 'text-sm'} style={{ color: 'var(--text)' }}>{value}</span>
    </div>
  );
}
