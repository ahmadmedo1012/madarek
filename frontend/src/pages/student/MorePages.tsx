import {
  Trophy, Star, Award, BarChart3, Crown,
  Target, FlaskConical, Headset, Globe, Building2,
  Bell, Calendar, AlertTriangle, BookOpen, Download,
  CheckCircle2, Activity,
} from 'lucide-react';
import { Card, MetricCard, ProgressBar, Badge, UserAvatar, AlertRow } from '../../components/primitives';
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
          <h1 className="page-title">نقاطي ومكافآتي</h1>
          <p className="page-subtitle">تقدّمك ومستواك مقارنةً بزملائك في المنصة.</p>
        </div>
      </div>

      <div className="grid-2">
        <Card icon={Trophy} title="مستوى التقدم">
          <div className="flex items-center gap-4 mb-6">
            <div
              style={{
                width: 76, height: 76, borderRadius: '50%',
                background: 'linear-gradient(135deg, var(--amber), var(--purple))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'var(--font-mono)', fontSize: 26, fontWeight: 700,
                color: '#fff', flexShrink: 0,
              }}
            >
              7
            </div>
            <div className="flex-1">
              <div className="text-md font-semibold mb-1" style={{ color: 'var(--text)' }}>محلل البيانات</div>
              <div className="text-xs text-subtle mb-2">2,340 / 3,000 نقطة XP</div>
              <div className="xp-track"><div className="xp-fill" style={{ width: '78%' }} /></div>
            </div>
          </div>

          <div className="section-title">الإنجازات المحققة</div>
          {ach.isPending ? <LoadingState /> :
           ach.isError ? <ErrorState /> :
           !ach.data?.length ? <EmptyState icon={Award} title="لا إنجازات بعد" /> : (
            <div className="flex-col gap-2">
              {ach.data.map((a) => (
                <div className="achievement" key={a.achievement.id}>
                  <span className="achievement-icon"><Icon icon={Trophy} size={18} /></span>
                  <div className="flex-1">
                    <div className="achievement-name">{a.achievement.name}</div>
                    <div className="achievement-desc">{a.achievement.description}</div>
                  </div>
                  <Badge color="amber" icon={Star}>+{a.achievement.xp} XP</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card icon={Crown} title="لوحة المتصدرين">
          {lb.isPending ? <LoadingState /> :
           lb.isError ? <ErrorState /> :
           !lb.data?.length ? <EmptyState /> : (
            <div className="flex-col gap-2">
              {lb.data.map((l, i) => (
                <div className="list-row" key={l.id}>
                  <div
                    className="font-mono font-bold text-md"
                    style={{
                      width: 28, textAlign: 'center',
                      color: i === 0 ? 'var(--amber)' : i === 1 ? 'var(--text-muted)' : i === 2 ? 'var(--pink)' : 'var(--text-subtle)',
                    }}
                  >
                    #{i + 1}
                  </div>
                  <UserAvatar
                    initials={l.avatarInitials ?? `${l.firstName[0] ?? ''}${l.lastName[0] ?? ''}`}
                    color={l.avatarColor ?? '#5A9CFF'}
                    size={32}
                  />
                  <div className="list-row-body">
                    <div className="list-row-title">{l.firstName} {l.lastName}</div>
                    <div className="list-row-sub">المستوى {l.level}</div>
                  </div>
                  <Badge color="amber" icon={Star}>{l.totalXp.toLocaleString('ar-LY')}</Badge>
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
          <h1 className="page-title">مهاراتي وشهاداتي</h1>
          <p className="page-subtitle">رصد مهاراتك التقنية وتطوّرها مع الوقت.</p>
        </div>
      </div>

      <Card icon={Target} title="خريطة المهارات التقنية">
        {skills.isPending ? <LoadingState /> :
         skills.isError ? <ErrorState /> :
         !skills.data?.length ? <EmptyState icon={Target} title="لم تُسجَّل أي مهارة بعد" /> : (
          <div className="flex-col gap-4">
            {skills.data.map((s) => (
              <div key={s.skill.id} className="flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium" style={{ color: 'var(--text)' }}>{s.skill.name}</span>
                  <Badge color="blue">المستوى {s.level}</Badge>
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

      <Card icon={Bell} title="غير مقروء">
        <div className="flex-col gap-2">
          <AlertRow color="red" icon={AlertTriangle} title="غياب تجاوز الحد — تقنيات الإنترنت"
            description="غياب 3 محاضرات — الحد الأقصى 4. يرجى الانتباه" time="منذ يومين" />
          <AlertRow color="blue" icon={BookOpen} title="درجة جديدة — هندسة البرمجيات"
            description="حصلت على 88/100 في الاختبار الأسبوعي" time="منذ ساعة" />
          <AlertRow color="amber" icon={Calendar} title="تذكير — محاضرة شبكات الحاسوب"
            description="الأحد 8:00 صباحاً — قاعة 301" time="منذ ساعتين" />
          <AlertRow color="green" icon={CheckCircle2} title="إنجاز جديد"
            description="أكملت 5 مهام متتالية — حصلت على شارة المثابر" time="أمس" />
        </div>
      </Card>
    </div>
  );
}

/* ─── Schedule ─────────────────────────────────────────── */
export function SchedulePage() {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الجدول الدراسي</h1>
          <p className="page-subtitle">جدولك الأسبوعي مع أماكن المحاضرات.</p>
        </div>
      </div>

      <Card icon={Calendar} title="الأسبوع الحالي">
        <div className="flex-col gap-4">
          {days.map((d) => (
            <div key={d}>
              <div className="section-title mb-2">{d}</div>
              <div className="list-row">
                <span className="list-row-meta">8:00 — 9:30</span>
                <span className="list-row-stripe" style={{ background: 'var(--accent)' }} />
                <div className="list-row-body">
                  <div className="list-row-title">نظم المعلومات</div>
                  <div className="list-row-sub">قاعة 301 · د. محمد الطاهر</div>
                </div>
                <Badge color="blue">قاعة</Badge>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

/* ─── Results ──────────────────────────────────────────── */
export function ResultsPage() {
  const results = [
    { s: 'هندسة البرمجيات', g: 88 },
    { s: 'تقنيات الحاسوب', g: 76 },
    { s: 'نظم المعلومات', g: 92 },
    { s: 'شبكات الحاسوب', g: 61 },
    { s: 'تقنيات الإنترنت', g: 55 },
  ];
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">النتائج والتقييمات</h1>
          <p className="page-subtitle">تفاصيل درجاتك وتحليل أداءك بالذكاء الاصطناعي.</p>
        </div>
      </div>

      <div className="grid-3">
        <MetricCard icon={Award} label="أعلى درجة" value="92" change="هندسة البرمجيات" color="green" />
        <MetricCard icon={BarChart3} label="المتوسط العام" value="74.4" change="هذا الفصل" color="amber" />
        <MetricCard icon={AlertTriangle} label="أدنى درجة" value="55" change="الذكاء الاصطناعي" color="red" />
      </div>

      <div className="grid-2">
        <Card icon={Activity} title="تفصيل النتائج">
          <div className="flex-col gap-4">
            {results.map((r) => (
              <ProgressBar
                key={r.s}
                value={r.g}
                label={r.s}
                color={r.g >= 85 ? 'var(--green)' : r.g >= 70 ? 'var(--accent)' : r.g >= 60 ? 'var(--amber)' : 'var(--red)'}
              />
            ))}
          </div>
        </Card>

        <Card icon={Trophy} title="تحليل ذكي لأداءك">
          <div className="flex-col gap-2">
            <AlertRow color="blue" icon={Activity} title="نقاط القوة"
              description="تتميّز في هندسة البرمجيات ونظم المعلومات — استمر بهذا المستوى." />
            <AlertRow color="amber" icon={AlertTriangle} title="تحتاج تحسين"
              description="الشبكات وتقنيات الإنترنت تتطلب وقتاً إضافياً للمراجعة." />
            <AlertRow color="green" icon={CheckCircle2} title="توصية"
              description="خصّص 3 ساعات يومياً للمواد الضعيفة وراجع الفيديوهات المسجلة." />
          </div>
        </Card>
      </div>
    </div>
  );
}

/* ─── Labs ─────────────────────────────────────────────── */
export function LabsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">المعامل الافتراضية</h1>
          <p className="page-subtitle">تجارب علمية تفاعلية بدون الحاجة لمعدات حقيقية.</p>
        </div>
      </div>
      <Card>
        <EmptyState
          icon={FlaskConical}
          title="قائمة المعامل تُحمَّل من الخادم"
          description="ابدأ تجربة من الكتالوج بعد إضافة المعامل من قِبل الإدارة."
        />
      </Card>
    </div>
  );
}

/* ─── AR/VR ────────────────────────────────────────────── */
export function ArVrPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">تجارب AR/VR</h1>
          <p className="page-subtitle">محتوى تفاعلي ثلاثي الأبعاد للمواد العملية.</p>
        </div>
      </div>
      <Card>
        <EmptyState icon={Headset} title="تجارب AR/VR قيد الإطلاق"
          description="ستتوفر قريباً عبر تطبيق الجوّال وأجهزة VR المعتمدة." />
      </Card>
    </div>
  );
}

/* ─── Social ───────────────────────────────────────────── */
export function SocialPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الشبكة الاجتماعية</h1>
          <p className="page-subtitle">تواصل مع زملائك وأساتذتك حول المواد والمشاريع.</p>
        </div>
      </div>
      <Card>
        <EmptyState icon={Globe} title="ابدأ بمتابعة زملائك"
          description="مشاركة الملاحظات والمشاريع ستظهر هنا في خلاصتك." />
      </Card>
    </div>
  );
}

/* ─── Downloads ────────────────────────────────────────── */
export function DownloadsPage() {
  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">مركز التحميلات</h1>
          <p className="page-subtitle">جميع المواد الدراسية متاحة للتحميل والحفظ للأوفلاين.</p>
        </div>
      </div>
      <Card>
        <EmptyState icon={Download} title="تصفّح المواد"
          description="ستظهر هنا الملفات المتاحة بحسب موادك المسجّلة." />
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
      <Card icon={Building2} title="نبذة عن الجامعة">
        <p className="text-sm text-muted" style={{ lineHeight: 'var(--lh-loose)' }}>
          جامعة الزاوية مؤسسة تعليمية ليبية تأسست عام 1988، تضم عدة كليات متخصصة في
          العلوم والتقنية والإنسانيات، وتعمل على تطوير منظومتها الرقمية من خلال منصة
          مدارك AI لخدمة طلابها وأعضاء هيئتها التدريسية.
        </p>
      </Card>
    </div>
  );
}
