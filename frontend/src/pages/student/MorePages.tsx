import {
  Trophy, Star, Award, Activity, Crown,
  Target, FlaskConical, Headset,
  Bell, Calendar, AlertTriangle, BookOpen, Download,
  CheckCircle2, MessageCircle, Heart, Repeat2, Bookmark,
  TrendingUp, Building2, Users2, GraduationCap, Microscope,
} from 'lucide-react';
import { useState } from 'react';
import { Bar, Radar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Tooltip, RadialLinearScale, PointElement, LineElement, Filler } from 'chart.js';
import { Card, MetricCard, ProgressBar, Badge, UserAvatar, AlertRow, SectionTitle } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useMyAchievements, useLeaderboard, useMySkills, usePosts, useCreatePost, useReactToPost } from '../../hooks/useResources';
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
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الإشعارات</h1>
          <p className="page-subtitle">آخر التحديثات والتذكيرات الأكاديمية.</p>
        </div>
      </div>

      <Card title="إشعارات غير مقروءة" icon={Bell} actions={<Badge color="brand">4</Badge>}>
        <div className="flex-col gap-2">
          <AlertRow color="red" icon={AlertTriangle} title="غياب تجاوز الحد"
            description="تقنيات الإنترنت — غياب 3 محاضرات، الحد الأقصى 4"
            time="منذ يومين" />
          <AlertRow color="brand" icon={BookOpen} title="درجة جديدة في هندسة البرمجيات"
            description="حصلت على 88 من 100 في الاختبار الأسبوعي"
            time="منذ ساعة" />
          <AlertRow color="amber" icon={Calendar} title="تذكير: محاضرة الأحد"
            description="شبكات الحاسوب · 8:00 ص · قاعة 301"
            time="منذ ساعتين" />
          <AlertRow color="green" icon={CheckCircle2} title="إنجاز جديد"
            description="أكملت 5 مهام متتالية — حصلت على شارة المثابر"
            time="أمس" />
        </div>
      </Card>
    </div>
  );
}

/* ─── Schedule ─────────────────────────────────────────── */
const SCHEDULE: Array<{ day: string; items: Array<{ time: string; name: string; room: string; teacher: string }> }> = [
  {
    day: 'الأحد',
    items: [
      { time: '08:00 — 09:30', name: 'نظم المعلومات', room: 'قاعة 301', teacher: 'د. محمد الطاهر' },
      { time: '10:00 — 11:30', name: 'قواعد البيانات', room: 'معمل 2', teacher: 'د. فاطمة العجيلي' },
    ],
  },
  {
    day: 'الاثنين',
    items: [
      { time: '09:00 — 10:30', name: 'هندسة البرمجيات', room: 'قاعة 205', teacher: 'د. عياض الهنقاري' },
      { time: '11:00 — 12:30', name: 'الذكاء الاصطناعي', room: 'قاعة 410', teacher: 'د. سالم الشريف' },
    ],
  },
  {
    day: 'الثلاثاء',
    items: [
      { time: '08:30 — 10:00', name: 'شبكات الحاسوب', room: 'معمل 1', teacher: 'د. سالم الشريف' },
      { time: '10:30 — 12:00', name: 'أمن المعلومات', room: 'قاعة 303', teacher: 'د. خالد المبروك' },
    ],
  },
  { day: 'الأربعاء', items: [{ time: '09:00 — 10:30', name: 'تقنيات الإنترنت', room: 'معمل الويب', teacher: 'د. رجاء أبو شعالة' }] },
  { day: 'الخميس', items: [{ time: '11:00 — 12:30', name: 'مشروع التخرج', room: 'قاعة المشاريع', teacher: 'د. عياض الهنقاري' }] },
];

export function SchedulePage() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الجدول الدراسي</h1>
          <p className="page-subtitle">جدولك الأسبوعي مع أماكن المحاضرات.</p>
        </div>
      </div>

      <div className="flex-col gap-5">
        {SCHEDULE.map((d) => (
          <div key={d.day}>
            <SectionTitle>{d.day}</SectionTitle>
            <Card flush>
              <div className="flex-col">
                {d.items.map((it, i) => (
                  <div key={i} className="list-row" style={{ borderRadius: i === 0 ? 'var(--r-lg) var(--r-lg) 0 0' : i === d.items.length - 1 ? '0 0 var(--r-lg) var(--r-lg)' : 0 }}>
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
    </div>
  );
}

/* ─── Results ──────────────────────────────────────────── */
const RESULTS = [
  { s: 'هندسة البرمجيات', g: 88 },
  { s: 'تقنيات الحاسوب', g: 76 },
  { s: 'نظم المعلومات', g: 92 },
  { s: 'شبكات الحاسوب', g: 61 },
  { s: 'تقنيات الإنترنت', g: 55 },
];

export function ResultsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">النتائج والتقييمات</h1>
          <p className="page-subtitle">تفاصيل درجاتك وتحليل أدائك بالذكاء الاصطناعي.</p>
        </div>
      </div>

      <div className="grid-3">
        <MetricCard icon={Award} label="أعلى درجة" value="92" change="نظم المعلومات" color="green" />
        <MetricCard icon={Activity} label="المتوسط" value="74.4" change="هذا الفصل" color="brand" />
        <MetricCard icon={AlertTriangle} label="أدنى درجة" value="55" change="تقنيات الإنترنت" color="red" />
      </div>

      <Card title="درجاتك حسب المقرر" icon={Activity} subtitle="نظرة بصرية على أدائك في مقررات هذا الفصل">
        <div style={{ height: 260 }}>
          <Bar
            data={{
              labels: RESULTS.map((r) => r.s),
              datasets: [{
                label: 'الدرجة',
                data: RESULTS.map((r) => r.g),
                backgroundColor: RESULTS.map((r) => {
                  const c = chartColors();
                  return r.g >= 85 ? c.success : r.g >= 70 ? c.accent : r.g >= 60 ? c.warning : c.danger;
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
      </Card>

      <div className="grid-2">
        <Card title="تفصيل النتائج" icon={Activity}>
          <div className="flex-col gap-4">
            {RESULTS.map((r) => (
              <ProgressBar
                key={r.s}
                value={r.g}
                label={r.s}
                color={r.g >= 85 ? 'var(--success)' : r.g >= 70 ? 'var(--accent)' : r.g >= 60 ? 'var(--warning)' : 'var(--danger)'}
              />
            ))}
          </div>
        </Card>

        <Card title="تحليل ذكي للأداء">
          <div className="flex-col gap-2">
            <AlertRow color="green" icon={CheckCircle2} title="نقاط القوة"
              description="تتميّز في هندسة البرمجيات ونظم المعلومات." />
            <AlertRow color="amber" icon={AlertTriangle} title="بحاجة لتحسين"
              description="الشبكات وتقنيات الإنترنت تتطلب وقتاً إضافياً." />
            <AlertRow color="brand" icon={Target} title="توصية"
              description="خصّص ساعتين يومياً للمواد الضعيفة وراجع الفيديوهات." />
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── Labs / AR-VR ─────────────────────────────────────── */
// LabsPage moved to its own file (LabsPage.tsx).

/* ─── AR/VR ────────────────────────────────────────────── */
const AR = [
  { title: 'تشريح الجسم البشري', subject: 'بيولوجيا', kind: 'AR' },
  { title: 'دوائر كهربائية حية', subject: 'هندسة كهربائية', kind: 'AR' },
  { title: 'جولة في الفضاء الافتراضي', subject: 'فلك وفيزياء', kind: 'VR' },
  { title: 'تصميم المباني ثلاثي الأبعاد', subject: 'هندسة مدنية', kind: 'AR' },
  { title: 'تفاعلات كيميائية آمنة', subject: 'كيمياء', kind: 'VR' },
  { title: 'تجميع الروبوتات', subject: 'هندسة ميكانيكية', kind: 'AR' },
];

export function ArVrPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">تجارب AR / VR</h1>
          <p className="page-subtitle">محتوى تفاعلي ثلاثي الأبعاد للمواد العملية.</p>
        </div>
      </div>

      <div className="grid-3">
        {AR.map((e) => (
          <Card key={e.title} compact bordered>
            <div className="flex items-start justify-between" style={{ marginBottom: 'var(--sp-3)' }}>
              <div className="metric-icon" style={{ color: 'var(--brand-purple)' }}>
                <Icon icon={Headset} size={20} />
              </div>
              <Badge color={e.kind === 'VR' ? 'purple' : 'brand'}>{e.kind}</Badge>
            </div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{e.title}</div>
            <div className="text-xs text-subtle" style={{ marginTop: 4 }}>{e.subject}</div>
            <button type="button" className="btn outline" style={{ width: '100%', marginTop: 'var(--sp-3)' }}>
              ابدأ التجربة
            </button>
          </Card>
        ))}
      </div>
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
const FILES = [
  { name: 'محاضرة UML — الوحدة 1', course: 'هندسة البرمجيات', kind: 'PDF', size: '3.2 MB', date: '15 مايو' },
  { name: 'شرائح Design Patterns', course: 'هندسة البرمجيات', kind: 'PPTX', size: '12.4 MB', date: '12 مايو' },
  { name: 'شرح SQL Joins', course: 'نظم المعلومات', kind: 'MP4', size: '180 MB', date: '13 مايو' },
  { name: 'OSI Model — الطبقات السبع', course: 'شبكات الحاسوب', kind: 'PPTX', size: '8.7 MB', date: '15 مايو' },
  { name: 'محاضرة TCP/IP', course: 'شبكات الحاسوب', kind: 'PDF', size: '6.2 MB', date: '12 مايو' },
];

export function DownloadsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">مركز التحميلات</h1>
          <p className="page-subtitle">جميع المواد الدراسية متاحة للتحميل والحفظ للأوفلاين.</p>
        </div>
      </div>

      <Card title="ملفات حديثة" icon={Download}>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>الملف</th>
                <th>المادة</th>
                <th>النوع</th>
                <th>الحجم</th>
                <th>التاريخ</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {FILES.map((f) => (
                <tr key={f.name}>
                  <td className="tbl-strong">{f.name}</td>
                  <td>{f.course}</td>
                  <td><Badge>{f.kind}</Badge></td>
                  <td className="tbl-num">{f.size}</td>
                  <td className="text-subtle">{f.date}</td>
                  <td>
                    <button type="button" className="btn ghost sm">
                      <Icon icon={Download} size={13} /> تحميل
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

/* ─── University Info ──────────────────────────────────── */
const REAL_FACULTIES_INSIDE = [
  'كلية الآداب',
  'كلية الاقتصاد',
  'كلية العلوم',
  'كلية الهندسة',
  'كلية الطب البشري',
  'كلية طب الأسنان والجراحة الفموية',
  'كلية الصيدلة',
  'كلية التقنية الطبية',
  'كلية تقنية المعلومات',
  'كلية التربية البدنية وعلوم الرياضة',
  'كلية هندسة النفط والغاز',
];

const REAL_FACULTIES_OUTSIDE: Array<{ name: string; city: string }> = [
  { name: 'كلية الآداب', city: 'زوارة' },
  { name: 'كلية الاقتصاد', city: 'العجيلات' },
  { name: 'كلية العلوم', city: 'العجيلات' },
  { name: 'كلية التربية', city: 'الزاوية' },
  { name: 'كلية التربية', city: 'العجيلات' },
  { name: 'كلية التربية', city: 'أبي عيسى' },
  { name: 'كلية التربية', city: 'ناصر' },
  { name: 'كلية التربية', city: 'زوارة' },
  { name: 'كلية الشريعة والقانون', city: 'العجيلات' },
  { name: 'كلية القانون', city: 'الزاوية' },
  { name: 'كلية الطب البيطري والعلوم الزراعية', city: 'العجيلات' },
  { name: 'كلية العلوم الطبية', city: 'صرمان' },
  { name: 'كلية هندسة الموارد الطبيعية', city: 'بئر الغنم' },
  { name: 'كلية الهندسة', city: 'صبراتة' },
  { name: 'كلية الهندسة', city: 'الرقدالين' },
  { name: 'كلية الصحة العامة', city: 'العجيلات' },
  { name: 'كلية العلوم السياسية والإعلام', city: 'الزاوية' },
  { name: 'كلية اللغات والترجمة', city: 'الزاوية' },
];

const MEMBERSHIPS = [
  { ar: 'اتحاد الجامعات العربية', en: 'AARU' },
  { ar: 'اتحاد الجامعات الأفريقية', en: 'AAU' },
  { ar: 'اتحاد الجامعات الإسلامية', en: 'FUIW' },
];

const RANKINGS = [
  { label: 'تصنيف QS العربي 2026', value: '#251–300' },
  { label: 'تصنيف QS العربي 2025', value: '#201–250' },
  { label: 'تصنيف QS العربي 2024', value: '#151–170' },
  { label: 'UniRank عالمياً 2026', value: '#5,080' },
  { label: 'الترتيب على مستوى ليبيا', value: '#6' },
];

export function UniversityInfoPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">جامعة الزاوية</h1>
          <p className="page-subtitle">
            مؤسسة تعليمية حكومية رائدة، تأسست عام 1988 وتمتد عبر تسع مدن في الإقليم الغربي.
          </p>
        </div>
      </div>

      <div className="grid-4">
        <MetricCard icon={Building2} label="عدد الكليات" value="29" change="حضرية وفرعية" color="brand" />
        <MetricCard icon={GraduationCap} label="الطلاب" value="50K+" change="مسجَّلون" color="green" />
        <MetricCard icon={Users2} label="هيئة التدريس" value="2,500" change="عضو" color="purple" />
        <MetricCard icon={Award} label="ترتيب ليبيا" value="#6" change="UniRank 2026" color="gold" />
      </div>

      {/* Vision + Mission */}
      <div className="grid-2">
        <Card title="الرؤية" icon={Target}>
          <p style={{ fontSize: 'var(--fs-md)', color: 'var(--text)', lineHeight: 'var(--lh-loose)', margin: 0 }}>
            تحقيق التميّز والريادة في مجال التعليم والبحث العلمي وخدمة المجتمع.
          </p>
        </Card>
        <Card title="الرسالة" icon={Star}>
          <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', lineHeight: 'var(--lh-loose)', margin: 0 }}>
            تقديم خدمات تعليمية وبحثية متميّزة في خدمة المجتمع من خلال كوادر مؤهّلة، وبرامج علمية،
            وبيئة محفّزة، وشراكات فعّالة مع المؤسسات المحلية والدولية، وتلبية احتياجات سوق العمل
            ومعايير الجودة والاعتماد.
          </p>
        </Card>
      </div>

      {/* Quick facts grid */}
      <Card title="بطاقة تعريف" icon={Building2}>
        <div className="grid-2">
          <FactRow label="الاسم الرسمي" value="جامعة الزاوية" />
          <FactRow label="الاسم السابق" value="جامعة السابع من أبريل" />
          <FactRow label="النوع" value="جامعة حكومية عامة" />
          <FactRow label="تاريخ التأسيس" value="1988 م (الكلية الفرعية 1983)" />
          <FactRow label="الموقع" value="6 كم جنوب مدينة الزاوية" />
          <FactRow label="المساحة" value="≈ 100 هكتار" />
          <FactRow label="الإحداثيات" value="32°45′00″N · 12°43′00″E" mono />
          <FactRow label="الألوان الرسمية" value="أخضر · أحمر · أبيض · أسود" />
        </div>
      </Card>

      {/* Faculties — inside campus */}
      <Card title="الكليات داخل الحرم الجامعي" icon={Building2} subtitle={`${REAL_FACULTIES_INSIDE.length} كلية في مدينة الزاوية`}>
        <div className="grid-auto-200" style={{ gap: 'var(--sp-2)' }}>
          {REAL_FACULTIES_INSIDE.map((f) => (
            <div key={f} className="faculty-chip-row">
              <Icon icon={GraduationCap} size={14} className="text-subtle" />
              <span className="text-sm">{f}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Faculties — outside campus */}
      <Card title="الكليات الفرعية" icon={Building2} subtitle={`${REAL_FACULTIES_OUTSIDE.length} كلية موزّعة على ${new Set(REAL_FACULTIES_OUTSIDE.map((c) => c.city)).size} مدن`}>
        <div className="grid-auto-260" style={{ gap: 'var(--sp-2)' }}>
          {REAL_FACULTIES_OUTSIDE.map((f, i) => (
            <div key={`${f.name}-${f.city}-${i}`} className="faculty-chip-row">
              <Icon icon={Building2} size={14} className="text-subtle" />
              <span className="text-sm" style={{ flex: 1, minWidth: 0 }}>{f.name}</span>
              <Badge color="purple">{f.city}</Badge>
            </div>
          ))}
        </div>
      </Card>

      {/* Rankings + Memberships */}
      <div className="grid-2">
        <Card title="التصنيفات الدولية" icon={TrendingUp}>
          <div className="flex-col gap-2">
            {RANKINGS.map((r) => (
              <div key={r.label} className="flex items-center justify-between" style={{
                padding: 'var(--sp-3)', background: 'var(--surface-2)', borderRadius: 'var(--r-md)',
              }}>
                <span className="text-sm">{r.label}</span>
                <span className="font-mono text-sm" style={{ color: 'var(--accent)', fontWeight: 600 }}>{r.value}</span>
              </div>
            ))}
          </div>
        </Card>
        <Card title="العضويات الدولية" icon={Crown}>
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
            معتمدة من وزارة التعليم العالي والبحث العلمي — ليبيا
          </div>
        </Card>
      </div>

      {/* Strategic plan */}
      <Card title="الخطة الاستراتيجية 2024–2028" icon={Target} subtitle="خارطة طريق للارتقاء بمكانة الجامعة وتعزيز دورها في خدمة المجتمع">
        <div className="grid-2" style={{ gap: 'var(--sp-2)' }}>
          {[
            'تقديم برامج تعليمية وفق معايير الجودة المحلية والدولية',
            'الارتقاء بمستوى البحث العلمي',
            'تعزيز دور الجامعة في خدمة المجتمع',
            'توفير بيئة مناسبة وتحسين مستوى الخدمات',
            'تأهيل وتطوير الموارد البشرية',
            'مواءمة المخرجات مع متطلبات سوق العمل',
            'دعم التعاون مع المؤسسات المحلية والدولية',
            'تجويد الخدمات التعليمية والمجتمعية',
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

      {/* Degree levels + sample programs — straight from zu.edu.ly catalog */}
      <Card title="الشهادات والبرامج الأكاديمية" icon={Microscope} subtitle="درجات أكاديمية معتمدة وبرامج معلنة على الموقع الرسمي">
        <div className="grid-3" style={{ gap: 'var(--sp-3)', marginBottom: 'var(--sp-4)' }}>
          {[
            { ar: 'الإجازة الجامعية', en: 'Bachelor / Licence' },
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
        <div className="text-xs text-subtle" style={{ marginBottom: 'var(--sp-2)' }}>
          أمثلة على البرامج المتاحة:
        </div>
        <div className="flex flex-wrap gap-2">
          {[
            'بكالوريوس محاسبة',
            'القانون العام',
            'التربية البدنية وعلوم الرياضة',
            'هندسة الطاقات المتجددة',
            'الصيدلة',
            'هندسة النفط والغاز والطاقة المتجددة',
          ].map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      </Card>

      {/* Contact */}
      <Card title="معلومات التواصل" icon={Headset}>
        <div className="grid-2">
          <FactRow label="العنوان" value="شارع جمال عبد الناصر، الزاوية، ليبيا" />
          <FactRow label="الهاتف" value="‎+218 91 9235939" mono />
          <FactRow label="هاتف بديل" value="‎+218 92 6539727" mono />
          <FactRow label="البريد العام" value="info@zu.edu.ly" mono />
          <FactRow label="التعاون الدولي" value="ico@zu.edu.ly" mono />
          <FactRow label="الموقع الرسمي" value="zu.edu.ly" mono />
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
