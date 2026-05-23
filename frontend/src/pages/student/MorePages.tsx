import { Card, MetricCard, ProgressBar, Badge } from '../../components/primitives';
import { useMyAchievements, useLeaderboard, useMySkills } from '../../hooks/useResources';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';

export function GamificationPage() {
  const ach = useMyAchievements();
  const lb = useLeaderboard();
  return (
    <div className="page">
      <div className="grid-2">
        <Card title="مستوى التقدم" dotColor="var(--amber)">
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
            <div
              style={{
                width: 70,
                height: 70,
                borderRadius: '50%',
                background: 'linear-gradient(135deg,var(--amber),var(--purple))',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: "'Space Mono', monospace",
                fontSize: 22,
                fontWeight: 700,
                color: '#fff',
                flexShrink: 0,
              }}
            >
              7
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 4 }}>محلل البيانات</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>2,340 / 3,000 نقطة XP</div>
              <div className="xp-bar-wrap"><div className="xp-bar" style={{ width: '78%' }} /></div>
            </div>
          </div>
          <div className="sec-title">الإنجازات المحققة</div>
          {ach.isPending ? <LoadingState /> : ach.isError ? <ErrorState /> : !ach.data?.length ? <EmptyState title="لا إنجازات بعد" /> : (
            ach.data.map((a) => (
              <div className="achievement" key={a.achievement.id} style={{ marginBottom: 8 }}>
                <div className="ach-icon">{a.achievement.icon ?? '🏆'}</div>
                <div>
                  <div className="ach-name">{a.achievement.name}</div>
                  <div className="ach-desc">{a.achievement.description}</div>
                </div>
              </div>
            ))
          )}
        </Card>

        <Card title="لوحة المتصدرين" dotColor="var(--green)">
          {lb.isPending ? <LoadingState /> : lb.isError ? <ErrorState /> : !lb.data?.length ? <EmptyState /> : (
            lb.data.map((l, i) => {
              const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
              return (
                <div className="sched-item" key={l.id} style={{ marginBottom: 6 }}>
                  <div style={{ fontSize: 18, width: 24 }}>{medals[i] ?? `${i + 1}`}</div>
                  <div className="user-avatar" style={{ background: l.avatarColor ?? '#4F8EF7', width: 28, height: 28, fontSize: 10 }}>
                    {l.avatarInitials ?? `${l.firstName[0] ?? ''}${l.lastName[0] ?? ''}`}
                  </div>
                  <div style={{ flex: 1, fontSize: 12, color: 'var(--text)' }}>
                    {l.firstName} {l.lastName}
                  </div>
                  <span style={{ fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700, color: 'var(--amber)' }}>
                    {l.totalXp.toLocaleString('ar-LY')}
                  </span>
                </div>
              );
            })
          )}
        </Card>
      </div>
    </div>
  );
}

export function SkillsPage() {
  const skills = useMySkills();
  return (
    <div className="page">
      <Card title="🧠 خريطة المهارات التقنية">
        {skills.isPending ? <LoadingState /> : skills.isError ? <ErrorState /> : !skills.data?.length ? <EmptyState /> : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {skills.data.map((s) => (
              <div key={s.skill.id} className="prog-row">
                <div className="prog-head">
                  <span>{s.skill.icon ?? '🎯'} {s.skill.name}</span>
                  <span style={{ fontFamily: "'Space Mono', monospace", color: 'var(--accent)' }}>
                    {s.progressPct}%
                  </span>
                </div>
                <ProgressBar value={s.progressPct} />
                <div style={{ marginTop: 4 }}>
                  <Badge color="blue">المستوى {s.level}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

export function AlertsPage() {
  // Notifications hook used in dashboard; placeholder for the full alerts list
  return (
    <div className="page">
      <Card title="📬 الإشعارات">
        <div className="alert-row blue">
          <div className="alert-icon">📚</div>
          <div>
            <div className="alert-title">درجة جديدة — هندسة البرمجيات</div>
            <div className="alert-desc">حصلت على 88/100 في الاختبار الأسبوعي</div>
            <div className="alert-time">منذ ساعة</div>
          </div>
        </div>
        <div className="alert-row amber">
          <div className="alert-icon">⚠️</div>
          <div>
            <div className="alert-title">غياب تجاوز الحد — تقنيات الإنترنت</div>
            <div className="alert-desc">غياب 3 محاضرات — الحد الأقصى 4. يرجى الانتباه</div>
            <div className="alert-time">يومان</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function SchedulePage() {
  const days = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];
  return (
    <div className="page">
      <Card title="📅 الجدول الأسبوعي">
        {days.map((d) => (
          <div className="schedule-day" key={d}>
            <div className="day-label">{d}</div>
            <div className="sched-item">
              <div className="sched-time">8:00 - 9:30</div>
              <div className="sched-color" style={{ background: '#4F8EF7' }} />
              <div>
                <div className="sched-name">نظم المعلومات</div>
                <div className="sched-room">قاعة 301 · د. محمد الطاهر</div>
              </div>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

export function ResultsPage() {
  return (
    <div className="page">
      <div className="grid-3">
        <MetricCard label="🎯 أعلى درجة" value="92" change="هندسة البرمجيات" color="green" />
        <MetricCard label="📊 المتوسط العام" value="74.4" change="هذا الفصل" color="amber" />
        <MetricCard label="⚠️ أدنى درجة" value="55" change="الذكاء الاصطناعي" color="red" />
      </div>
      <div className="grid-2">
        <Card title="تفصيل النتائج">
          {[
            { s: 'هندسة البرمجيات', g: 88 },
            { s: 'تقنيات الحاسوب', g: 76 },
            { s: 'نظم المعلومات', g: 92 },
            { s: 'شبكات الحاسوب', g: 61 },
          ].map((r) => (
            <div className="prog-row" key={r.s}>
              <div className="prog-head">
                <span>{r.s}</span>
                <span style={{ fontFamily: "'Space Mono', monospace", color: 'var(--accent)' }}>{r.g}/100</span>
              </div>
              <ProgressBar value={r.g} color={r.g >= 85 ? 'var(--green)' : r.g >= 70 ? 'var(--accent)' : r.g >= 60 ? 'var(--amber)' : 'var(--red)'} />
            </div>
          ))}
        </Card>
        <Card title="تحليل الأداء بالذكاء الاصطناعي" dotColor="var(--purple)">
          <div className="alert-row blue" style={{ marginBottom: 8 }}>
            <div className="alert-icon">🧠</div>
            <div>
              <div className="alert-title">نقاط القوة</div>
              <div className="alert-desc">تتميز في هندسة البرمجيات ونظم المعلومات</div>
            </div>
          </div>
          <div className="alert-row amber">
            <div className="alert-icon">⚡</div>
            <div>
              <div className="alert-title">نقاط للتحسين</div>
              <div className="alert-desc">الشبكات وأمن المعلومات بحاجة لمراجعة</div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}

export function LabsPage() {
  return (
    <div className="page">
      <Card title="🔬 المعامل الافتراضية">
        <EmptyState icon="🔬" title="قائمة المعامل تُحمَّل من الخادم" hint="ابدأ تجربة من الكتالوج" />
      </Card>
    </div>
  );
}

export function ArVrPage() {
  return (
    <div className="page">
      <Card title="🥽 تجارب AR/VR">
        <EmptyState icon="🥽" title="تجارب AR/VR" hint="اختر مادتك لرؤية التجارب المتاحة" />
      </Card>
    </div>
  );
}

export function SocialPage() {
  return (
    <div className="page">
      <Card title="🌐 الشبكة الاجتماعية" />
    </div>
  );
}

export function DownloadsPage() {
  return (
    <div className="page">
      <Card title="⬇️ مركز التحميلات" />
    </div>
  );
}

export function UniversityInfoPage() {
  return (
    <div className="page">
      <Card title="🏛️ جامعة الزاوية">
        <p style={{ color: 'var(--text2)', fontSize: 13, lineHeight: 1.8 }}>
          جامعة الزاوية — مؤسسة تعليمية ليبية تأسست عام 1988، تضم عدة كليات متخصصة في
          العلوم والتقنية والإنسانيات، وتعمل على تطوير منظومتها الرقمية من خلال منصة
          مدارك AI لخدمة طلابها وأعضاء هيئتها التدريسية.
        </p>
      </Card>
    </div>
  );
}
