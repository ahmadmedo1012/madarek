import {
  Trophy, Star, Award, Activity, Crown,
  Target, FlaskConical, Headset,
  Bell, Calendar, AlertTriangle, BookOpen, Download,
  CheckCircle2, MessageCircle, Heart, Repeat2, Bookmark,
  TrendingUp, Building2, Users2, GraduationCap, Microscope,
} from 'lucide-react';
import { Card, MetricCard, ProgressBar, Badge, UserAvatar, AlertRow, SectionTitle } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useMyAchievements, useLeaderboard, useMySkills } from '../../hooks/useResources';

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

/* ─── Labs ─────────────────────────────────────────────── */
const LABS = [
  { name: 'معمل الشبكات الافتراضي', platform: 'Cisco Packet Tracer', count: 18, progress: 65, status: 'نشط' as const },
  { name: 'معمل الكيمياء الرقمي', platform: 'ChemSim', count: 24, progress: 30 },
  { name: 'معمل الدوائر الكهربائية', platform: 'Tinkercad', count: 15, progress: 0 },
  { name: 'معمل الأحياء الجزيئي', platform: 'BioModel', count: 12, progress: 0 },
  { name: 'معمل الفيزياء الفلكية', platform: 'PhysSim', count: 8, progress: 50 },
  { name: 'معمل الروبوتيكا', platform: 'Arduino Sim', count: 20, progress: 10 },
];

export function LabsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المعامل الافتراضية</h1>
          <p className="page-subtitle">تجارب علمية تفاعلية بدون الحاجة لمعدات حقيقية.</p>
        </div>
      </div>

      <div className="grid-3">
        {LABS.map((l) => (
          <Card key={l.name} compact bordered>
            <div className="flex items-start justify-between" style={{ marginBottom: 'var(--sp-3)' }}>
              <div className="metric-icon" style={{ color: 'var(--accent)' }}>
                <Icon icon={FlaskConical} size={20} />
              </div>
              {l.status === 'نشط' && <Badge color="green">نشط</Badge>}
            </div>
            <div className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{l.name}</div>
            <div className="text-xs text-subtle" style={{ marginTop: 4 }}>{l.platform} · {l.count} تجربة</div>
            {l.progress > 0 && (
              <div style={{ marginTop: 'var(--sp-3)' }}>
                <ProgressBar value={l.progress} showValue />
              </div>
            )}
            <button type="button" className={`btn ${l.status === 'نشط' ? 'primary' : 'outline'}`} style={{ width: '100%', marginTop: 'var(--sp-3)' }}>
              {l.status === 'نشط' ? 'استكمال' : 'بدء التجربة'}
            </button>
          </Card>
        ))}
      </div>
    </div>
  );
}

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
const POSTS = [
  { author: 'مريم الفاخري', initials: 'مف', time: 'منذ 10 دقائق', text: 'حصلت على شهادة Python Professional من كورسات المنصة! من كان يظن أن الطالبة اللي كانت تخاف من البرمجة ستصل لهذا المستوى', likes: 48, comments: 12 },
  { author: 'يوسف البركي', initials: 'يب', time: 'منذ 45 دقيقة', text: 'جربت المعمل الافتراضي لأول مرة اليوم — التجربة كانت مذهلة! صممت شبكة LAN كاملة بدون الحاجة لأي معدات حقيقية.', likes: 31, comments: 7 },
  { author: 'سارة المحجوب', initials: 'سم', time: 'منذ ساعتين', text: 'شاركت ملخص محاضرات مادة الذكاء الاصطناعي الكاملة في المكتبة. 40 صفحة بأمثلة عملية — للاستفادة الجميع!', likes: 95, comments: 24 },
];

export function SocialPage() {
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
          {POSTS.map((p) => (
            <div className="post" key={p.author}>
              <div className="post-header">
                <UserAvatar initials={p.initials} size={36} />
                <div className="flex-1">
                  <div className="post-author">{p.author}</div>
                  <div className="post-time">{p.time}</div>
                </div>
                <button type="button" className="btn outline sm">+ متابعة</button>
              </div>
              <div className="post-body">{p.text}</div>
              <div className="post-actions">
                <button type="button" className="post-action"><Icon icon={Heart} size={13} /> {p.likes}</button>
                <button type="button" className="post-action"><Icon icon={MessageCircle} size={13} /> {p.comments}</button>
                <button type="button" className="post-action"><Icon icon={Repeat2} size={13} /> مشاركة</button>
                <button type="button" className="post-action"><Icon icon={Bookmark} size={13} /> حفظ</button>
              </div>
            </div>
          ))}
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
export function UniversityInfoPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">جامعة الزاوية</h1>
          <p className="page-subtitle">معلومات عامة عن الجامعة والكليات والأقسام.</p>
        </div>
      </div>

      <div className="grid-3">
        <MetricCard icon={Building2} label="الكليات" value="29" color="brand" />
        <MetricCard icon={GraduationCap} label="الطلاب" value="42,800" color="green" />
        <MetricCard icon={Users2} label="هيئة التدريس" value="1,640" color="purple" />
      </div>

      <Card title="نبذة عن الجامعة" icon={Building2}>
        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)', lineHeight: 'var(--lh-loose)' }}>
          جامعة الزاوية مؤسسة تعليمية ليبية حكومية تأسست عام 1988، تضم 29 كلية تشمل العلوم
          التطبيقية والإنسانية والطبية والهندسية. تعمل على تطوير منظومتها الرقمية من خلال
          منصة مدارك AI لخدمة طلابها وأعضاء هيئتها التدريسية، كجزء من رؤية التحول الرقمي
          للتعليم العالي في ليبيا.
        </p>
      </Card>

      <Card title="مجالات البحث العلمي" icon={Microscope}>
        <div className="flex flex-wrap gap-2">
          {['الذكاء الاصطناعي', 'علوم الحياة', 'الطاقة المتجددة', 'علم المواد', 'الطب الحيوي', 'الهندسة المدنية', 'علوم الحاسوب', 'الاقتصاد الإسلامي'].map((t) => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      </Card>
    </div>
  );
}
