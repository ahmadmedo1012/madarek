import { useState } from 'react';
import {
  User, Mail, GraduationCap, BookOpen, Award, ExternalLink,
  CheckCircle2, AlertCircle, Trophy, Hash, type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, ProgressBar, Badge, UserAvatar } from '../../components/primitives';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth.store';
import { useMyAchievements, useMyEnrollments, useMyResearch } from '../../hooks/useResources';

interface AcademicLink {
  key: 'research-gate' | 'google-scholar' | 'orcid';
  title: string;
  description: string;
  hint: string;
  initial?: string;
}

const LINKS: AcademicLink[] = [
  {
    key: 'research-gate',
    title: 'ResearchGate',
    description: 'منصة عالمية لمشاركة البحوث ومتابعتها — مطلوبة لاكتمال ملفك الأكاديمي.',
    hint: 'https://www.researchgate.net/profile/...',
  },
  {
    key: 'google-scholar',
    title: 'Google Scholar',
    description: 'فهرس البحوث العلمي الأشهر — يربط منشوراتك مع الاستشهادات الدولية.',
    hint: 'https://scholar.google.com/citations?user=...',
  },
  {
    key: 'orcid',
    title: 'ORCID',
    description: 'معرّف الباحث الدولي — اختياري لكن يُنصح به للنشر الأكاديمي.',
    hint: '0000-0000-0000-0000',
  },
];

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const enrollments = useMyEnrollments();
  const achievements = useMyAchievements();
  const research = useMyResearch();

  // Persist link state in localStorage so the demo "binding" survives refresh.
  const [links, setLinks] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('mdrk-academic-links') ?? '{}'); }
    catch { return {}; }
  });
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState('');

  const linkedCount = Object.keys(links).filter((k) => links[k]).length;

  // Profile completeness score: avatar/info(40) + email verified(20) + linked accounts(30) + at least 1 paper(10)
  const completeness =
    40 +
    20 +
    Math.min(30, linkedCount * 10) +
    (research.data?.length ? 10 : 0);

  const startEdit = (key: string) => {
    setEditing(key);
    setDraft(links[key] ?? '');
  };
  const saveLink = () => {
    if (!editing) return;
    const next = { ...links, [editing]: draft.trim() };
    setLinks(next);
    localStorage.setItem('mdrk-academic-links', JSON.stringify(next));
    setEditing(null);
    setDraft('');
  };
  const removeLink = (key: string) => {
    const next = { ...links };
    delete next[key];
    setLinks(next);
    localStorage.setItem('mdrk-academic-links', JSON.stringify(next));
  };

  if (!user) return null;
  const initials = user.avatarInitials ?? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">ملفي الشخصي</h1>
          <p className="page-subtitle">معلوماتك الأكاديمية، حساباتك العلمية، وإنجازاتك في المنصة.</p>
        </div>
      </div>

      {/* Hero */}
      <Card>
        <div className="flex items-center gap-4" style={{ flexWrap: 'wrap' }}>
          <UserAvatar initials={initials} color={user.avatarColor ?? undefined} size={64} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div className="text-md font-semibold" style={{ color: 'var(--text)', fontSize: 'var(--fs-lg)' }}>
              {user.firstName} {user.lastName}
            </div>
            <div className="flex items-center gap-2 text-xs text-subtle" style={{ marginTop: 4 }}>
              <Icon icon={Mail} size={12} />
              <span className="font-mono">{user.email}</span>
              <Badge color="green" icon={CheckCircle2}>موثَّق</Badge>
            </div>
          </div>
          <div className="flex-col gap-1" style={{ minWidth: 220 }}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">اكتمال الملف</span>
              <span className="font-mono font-semibold" style={{ color: completeness >= 80 ? 'var(--success)' : completeness >= 60 ? 'var(--accent)' : 'var(--warning)' }}>
                {completeness}%
              </span>
            </div>
            <ProgressBar
              value={completeness}
              showValue={false}
              color={completeness >= 80 ? 'var(--success)' : completeness >= 60 ? 'var(--accent)' : 'var(--warning)'}
            />
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid-4">
        <MetricCard icon={BookOpen} label="مواد مسجَّلة" value={enrollments.data?.length ?? '—'} color="brand" />
        <MetricCard icon={Trophy} label="إنجازات محققة" value={achievements.data?.length ?? '—'} color="gold" />
        <MetricCard icon={Award} label="بحوث منشورة" value={research.data?.filter((r) => r.status === 'PUBLISHED').length ?? 0} color="purple" />
        <MetricCard icon={Hash} label="حسابات مرتبطة" value={`${linkedCount} / 3`} color={linkedCount >= 2 ? 'green' : 'amber'} />
      </div>

      {/* Academic linking — required by the spec */}
      <Card
        title="الحسابات الأكاديمية"
        icon={ExternalLink}
        subtitle="ربط حساباتك على المنصات العالمية يُفعّل النشر الأكاديمي ويُكمل ملفك الجامعي."
      >
        {linkedCount < 2 && (
          <div className="alert amber" style={{ marginBottom: 'var(--sp-3)' }}>
            <span className="alert-dot" />
            <div className="alert-body">
              <div className="alert-title">يُنصح بربط حسابيك على ResearchGate و Google Scholar</div>
              <div className="alert-desc">
                وفقاً لسياسة الجامعة، الطالب الذي لم يكمل ربط حساباته الأكاديمية يحدث له تعليق
                للقيد قبل بداية الفصل القادم. أكمل الربط الآن لتجنّب أي تأخير.
              </div>
            </div>
          </div>
        )}
        <div className="flex-col gap-3">
          {LINKS.map((l) => {
            const value = links[l.key];
            const isEditing = editing === l.key;
            return (
              <div
                key={l.key}
                style={{
                  padding: 'var(--sp-4)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--r-md)',
                  background: 'var(--surface-1)',
                }}
              >
                <div className="flex items-start gap-3">
                  <div
                    style={{
                      width: 40, height: 40, borderRadius: 'var(--r-md)',
                      background: value ? 'var(--success-soft)' : 'var(--surface-2)',
                      color: value ? 'var(--success)' : 'var(--text-muted)',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <Icon icon={value ? CheckCircle2 : ExternalLink} size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="flex items-center gap-2" style={{ marginBottom: 2 }}>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{l.title}</span>
                      {value ? (
                        <Badge color="green">مربوط</Badge>
                      ) : (
                        <Badge color="amber">بانتظار الربط</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted" style={{ lineHeight: 'var(--lh-base)' }}>
                      {l.description}
                    </div>
                    {value && !isEditing && (
                      <div className="text-xs font-mono" style={{ marginTop: 6, color: 'var(--accent)', wordBreak: 'break-all' }}>
                        {value}
                      </div>
                    )}
                  </div>
                  {!isEditing && (
                    <div className="flex gap-2 shrink-0">
                      <button type="button" className="btn outline sm" onClick={() => startEdit(l.key)}>
                        {value ? 'تعديل' : 'ربط'}
                      </button>
                      {value && (
                        <button type="button" className="btn ghost sm" onClick={() => removeLink(l.key)}>
                          إلغاء
                        </button>
                      )}
                    </div>
                  )}
                </div>
                {isEditing && (
                  <div style={{ marginTop: 'var(--sp-3)', display: 'flex', gap: 'var(--sp-2)' }}>
                    <input
                      type="text"
                      className="input"
                      placeholder={l.hint}
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      autoFocus
                    />
                    <button type="button" className="btn primary sm" onClick={saveLink} disabled={!draft.trim()}>
                      حفظ
                    </button>
                    <button type="button" className="btn ghost sm" onClick={() => { setEditing(null); setDraft(''); }}>
                      إلغاء
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Personal info (read-only — institutional source of truth) */}
      <Card title="المعلومات الأكاديمية" icon={GraduationCap}>
        <div className="grid-2">
          <ProfileField label="الاسم الكامل" value={`${user.firstName} ${user.lastName}`} icon={User} />
          <ProfileField label="البريد الجامعي" value={user.email} icon={Mail} mono />
          <ProfileField label="الكلية" value="كلية تقنية المعلومات" icon={GraduationCap} />
          <ProfileField label="القسم" value="علوم الحاسوب" icon={BookOpen} />
          <ProfileField label="الرقم الجامعي" value="UZ-2024-00001" icon={Hash} mono />
          <ProfileField label="السنة الدراسية" value="السنة الثالثة" icon={Award} />
        </div>
        <div className="text-xxs text-subtle" style={{ marginTop: 'var(--sp-4)', padding: 'var(--sp-2) var(--sp-3)', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)' }}>
          هذه البيانات مصدرها سجلات الجامعة. لتحديثها تواصل مع شؤون الطلاب على{' '}
          <span className="font-mono" style={{ color: 'var(--accent)' }}>support@zu.edu.ly</span>.
        </div>
      </Card>

      {/* Recent achievements */}
      <Card title="الإنجازات الأخيرة" icon={Trophy}>
        {!achievements.data?.length ? (
          <div className="text-sm text-muted" style={{ padding: 'var(--sp-3) 0' }}>
            لا إنجازات بعد — أكمل بعض المحاضرات لكسب أوّل شارة.
          </div>
        ) : (
          <div className="flex-col gap-2">
            {achievements.data.slice(0, 4).map((a) => (
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
    </div>
  );
}

function ProfileField({
  label, value, icon, mono,
}: { label: string; value: string; icon: LucideIcon; mono?: boolean }) {
  return (
    <div style={{
      padding: 'var(--sp-3)',
      background: 'var(--surface-2)',
      borderRadius: 'var(--r-md)',
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--sp-3)',
    }}>
      <Icon icon={icon} size={16} className="text-subtle" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="text-xxs text-subtle">{label}</div>
        <div className={mono ? 'font-mono text-sm' : 'text-sm'} style={{ color: 'var(--text)', marginTop: 2 }}>
          {value}
        </div>
      </div>
      <span style={{ color: 'var(--text-subtle)', display: 'inline-flex' }}>
        <Icon icon={AlertCircle} size={12} />
      </span>
    </div>
  );
}
