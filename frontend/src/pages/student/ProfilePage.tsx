import { useEffect, useId, useRef, useState } from 'react';
import {
  User, Mail, GraduationCap, BookOpen, Award, ExternalLink,
  CheckCircle2, AlertCircle, Trophy, Hash, type LucideIcon,
} from 'lucide-react';
import { Card, MetricCard, ProgressBar, Badge, UserAvatar, Tabs } from '../../components/primitives';
import { EmptyState, ErrorState, Skeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth.store';
import { useMyAchievements, useMyEnrollments, useMyResearch, useMyProfile } from '../../hooks/useResources';
import '../../styles/training.css'; // .achievement-* family (D11 css split, 12-15)

type LinkKind = 'research-gate' | 'google-scholar' | 'orcid';

interface AcademicLink {
  key: LinkKind;
  title: string;
  description: string;
  hint: string;
}

const LINKS: AcademicLink[] = [
  {
    key: 'research-gate',
    title: 'ResearchGate',
    description: 'منصة عالمية لمشاركة البحوث ومتابعتها — يمكنك حفظ رابط ملفك هنا للرجوع إليه.',
    hint: 'https://www.researchgate.net/profile/...',
  },
  {
    key: 'google-scholar',
    title: 'Google Scholar',
    description: 'فهرس البحوث العلمي الأشهر، يعرض منشوراتك مع الاستشهادات الدولية.',
    hint: 'https://scholar.google.com/citations?user=...',
  },
  {
    key: 'orcid',
    title: 'ORCID',
    description: 'معرّف الباحث الدولي — يُنصح به عند النشر الأكاديمي.',
    hint: '0000-0000-0000-0000',
  },
];

/* Field-level validation — the two profile links are full URLs, ORCID is
   a bare iD (four digit groups; the last character may be the check
   digit X). Guards the old accept-anything input (audit 0-d P2). */
const URL_RE = /^https?:\/\/[^\s.]+\.[^\s]+$/i;
const ORCID_RE = /^\d{4}-\d{4}-\d{4}-\d{3}[\dX]$/;
function validateLink(kind: LinkKind, raw: string): string | null {
  const v = raw.trim();
  if (!v) return 'أدخل قيمة للمتابعة.';
  if (kind === 'orcid') {
    return ORCID_RE.test(v) ? null : 'صيغة معرّف ORCID: 0000-0000-0000-0000';
  }
  if (!URL_RE.test(v)) return 'أدخل رابطاً كاملاً يبدأ بـ https://';
  return null;
}

/* localStorage writes can throw where reads are already guarded (the
   lazy initializer above): Safari private mode gives storage a 0 quota
   and some embedded browsers disable it entirely. Saving a link must
   never crash the page (audit 11-f P2-5) — fall back quietly to the
   in-memory state, which keeps working for the rest of the session. */
function persistLinks(next: Record<string, string>) {
  try {
    localStorage.setItem('mdrk-academic-links', JSON.stringify(next));
  } catch {
    // storage unavailable — keep the change in memory only
  }
}

type ProfileTab = 'academic' | 'links' | 'achievements';

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);
  const enrollments = useMyEnrollments();
  const achievements = useMyAchievements();
  const research = useMyResearch();
  const profile = useMyProfile();

  const [tab, setTab] = useState<ProfileTab>('academic');

  // Persist link state in localStorage — a LOCAL browser preference.
  // Nothing here is sent to any API (no server-side field exists for it),
  // so the copy below must never claim institutional visibility or policy.
  const [links, setLinks] = useState<Record<string, string>>(() => {
    try { return JSON.parse(localStorage.getItem('mdrk-academic-links') ?? '{}'); }
    catch { return {}; }
  });
  const [editing, setEditing] = useState<LinkKind | null>(null);
  const [draft, setDraft] = useState('');
  const [revealError, setRevealError] = useState(false);
  // transient "saved" feedback per row — cleared by timer (see below)
  const [savedKey, setSavedKey] = useState<LinkKind | null>(null);
  const savedTimer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(savedTimer.current), []);
  const editInputId = useId();

  const linkedCount = Object.keys(links).filter((k) => links[k]).length;

  // Profile completeness — real signals only: basic account data (name +
  // email, always present server-side), actual email verification, and
  // uploaded papers. Local link shortcuts do not claim server-side state.
  const emailVerified = Boolean(profile.data?.emailVerifiedAt);
  const completeness =
    40 +
    (emailVerified ? 20 : 0) +
    Math.min(30, linkedCount * 10) +
    (research.data?.length ? 10 : 0);

  const draftError = editing ? validateLink(editing, draft) : null;
  // dirty-state: Save stays disabled until the draft differs from the
  // stored value AND passes validation
  const pristine = editing !== null && draft.trim() === (links[editing] ?? '').trim();

  const startEdit = (kind: LinkKind) => {
    window.clearTimeout(savedTimer.current);
    setEditing(kind);
    setDraft(links[kind] ?? '');
    setRevealError(false);
  };
  const cancelEdit = () => {
    setEditing(null);
    setDraft('');
    setRevealError(false);
  };
  const saveLink = () => {
    if (!editing) return;
    if (draftError) { setRevealError(true); return; }
    const next = { ...links, [editing]: draft.trim() };
    setLinks(next);
    persistLinks(next);
    const done = editing;
    setEditing(null);
    setDraft('');
    setRevealError(false);
    // Save feedback — the page's authored moment: a transient, polite
    // confirmation on the row that was just saved.
    setSavedKey(done);
    window.clearTimeout(savedTimer.current);
    savedTimer.current = window.setTimeout(() => setSavedKey(null), 2500);
  };
  const removeLink = (kind: LinkKind) => {
    const next = { ...links };
    delete next[kind];
    setLinks(next);
    persistLinks(next);
  };

  if (!user) return null;
  const initials = user.avatarInitials ?? `${user.firstName[0] ?? ''}${user.lastName[0] ?? ''}`;

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">ملفي الشخصي</h1>
          <p className="page-subtitle">معلوماتك الأكاديمية، حساباتك العلمية، وإنجازاتك في المنصة.</p>
        </div>
      </header>

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
              <bdi dir="ltr" className="font-mono">{user.email}</bdi>
              {profile.data ? (
                emailVerified ? (
                  <Badge color="green" icon={CheckCircle2}>موثَّق</Badge>
                ) : (
                  <Badge color="amber" icon={AlertCircle}>البريد غير موثَّق</Badge>
                )
              ) : null}
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

      {/* KPIs — honest query states: pending → ellipsis, error → dash */}
      <div className="grid-4">
        <MetricCard
          icon={BookOpen}
          label="مواد مسجَّلة"
          value={enrollments.isPending ? '…' : enrollments.isError ? '—' : (enrollments.data?.length ?? 0).toLocaleString('ar-LY')}
          color="brand"
        />
        <MetricCard
          icon={Trophy}
          label="إنجازات محققة"
          value={achievements.isPending ? '…' : achievements.isError ? '—' : (achievements.data?.length ?? 0).toLocaleString('ar-LY')}
          color="gold"
        />
        <MetricCard
          icon={Award}
          label="بحوث منشورة"
          value={
            research.isPending ? '…'
              : research.isError ? '—'
                : (research.data?.filter((r) => r.status === 'PUBLISHED').length ?? 0).toLocaleString('ar-LY')
          }
          color="purple"
        />
        <MetricCard icon={Hash} label="روابط محفوظة في متصفحك" value={`${linkedCount} / 3`} color={linkedCount >= 2 ? 'green' : 'amber'} />
      </div>

      <Tabs
        value={tab}
        onChange={setTab}
        items={[
          { value: 'academic', label: 'المعلومات الأكاديمية' },
          { value: 'links', label: 'الحسابات البحثية' },
          { value: 'achievements', label: 'الإنجازات' },
        ]}
      />

      {tab === 'academic' && (
        <Card title="المعلومات الأكاديمية" icon={GraduationCap}>
          <div className="grid-2">
            <ProfileField label="الاسم الكامل" value={`${user.firstName} ${user.lastName}`} icon={User} />
            <ProfileField label="البريد الجامعي" value={user.email} icon={Mail} mono />
            <ProfileField
              label="الكلية"
              value={profile.data?.student?.faculty?.name ?? '—'}
              icon={GraduationCap}
            />
            <ProfileField
              label="القسم"
              value={profile.data?.student?.department?.name ?? '—'}
              icon={BookOpen}
            />
            <ProfileField
              label="الرقم الجامعي"
              value={profile.data?.student?.universityId ?? '—'}
              icon={Hash}
              mono
            />
            <ProfileField
              label="السنة الدراسية"
              value={
                profile.data?.student?.year
                  ? ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة'][profile.data.student.year - 1] ?? `السنة ${profile.data.student.year}`
                  : '—'
              }
              icon={Award}
            />
          </div>
          {profile.isError && (
            <div className="fact-error" role="status">
              <Icon icon={AlertCircle} size={13} />
              <span>تعذّر تحميل بياناتك الدراسية من الخادم — الحقول أعلاه تُعرض “—” حتّى يعود الاتصال.</span>
              <button type="button" className="btn ghost sm" onClick={() => profile.refetch()}>
                إعادة المحاولة
              </button>
            </div>
          )}
          <div className="text-xxs text-subtle" style={{ marginTop: 'var(--sp-4)', padding: 'var(--sp-2) var(--sp-3)', background: 'var(--surface-2)', borderRadius: 'var(--r-sm)' }}>
            هذه البيانات مصدرها سجلات الجامعة. لتحديثها تواصل مع شؤون الطلاب على{' '}
            <bdi dir="ltr" className="font-mono" style={{ color: 'var(--accent)' }}>info@zu.edu.ly</bdi>.
          </div>
        </Card>
      )}

      {tab === 'links' && (
        /* Academic links — a local, browser-only shortcut list. There is no
           server-side binding (no field in PATCH /users/:id), so this is
           honestly presented as a personal note, not an institutional link. */
        <Card
          title="الحسابات الأكاديمية"
          icon={ExternalLink}
          subtitle="روابطك الأكاديمية للرجوع السريع — تُحفظ في متصفّحك فقط ولا تُرسَل إلى الجامعة."
        >
          <div className="flex-col gap-3">
            {LINKS.map((l) => {
              const value = links[l.key];
              const isEditing = editing === l.key;
              return (
                <div key={l.key} className={`profile-link-row${value ? ' linked' : ''}`}>
                  <div className="profile-link-head">
                    <span className="profile-link-icon" aria-hidden>
                      <Icon icon={value ? CheckCircle2 : ExternalLink} size={18} />
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="profile-link-title-row">
                        <span className="profile-link-title">{l.title}</span>
                        {value ? (
                          <Badge color="green">مربوط</Badge>
                        ) : (
                          <Badge color="amber">بانتظار الربط</Badge>
                        )}
                        {savedKey === l.key && (
                          <span className="profile-link-saved" role="status">
                            <Icon icon={CheckCircle2} size={13} />
                            تم الحفظ في متصفّحك
                          </span>
                        )}
                      </div>
                      <div className="profile-link-desc">{l.description}</div>
                      {value && !isEditing && (
                        <div className="profile-link-value font-mono" title={value}>
                          <bdi dir="ltr">{value}</bdi>
                        </div>
                      )}
                    </div>
                    {!isEditing && (
                      <div className="profile-link-actions">
                        <button type="button" className="btn outline sm" onClick={() => startEdit(l.key)}>
                          {value ? 'تعديل' : 'ربط'}
                        </button>
                        {value && (
                          <button type="button" className="btn ghost sm" onClick={() => removeLink(l.key)}>
                            إلغاء الربط
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <form
                      className="profile-link-edit"
                      onSubmit={(e) => { e.preventDefault(); saveLink(); }}
                    >
                      <div className="flex-col gap-1" style={{ flex: 1, minWidth: 0 }}>
                        <label htmlFor={editInputId} className="text-xxs text-subtle">
                          {l.key === 'orcid' ? 'معرّف ORCID' : `رابط ${l.title}`}
                        </label>
                        <input
                          id={editInputId}
                          type="text"
                          dir="ltr"
                          className="input"
                          placeholder={l.hint}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onBlur={() => setRevealError(true)}
                          aria-invalid={Boolean(draftError && revealError)}
                          aria-describedby={draftError && revealError ? `${editInputId}-err` : undefined}
                          autoFocus
                        />
                        {revealError && draftError && (
                          <span id={`${editInputId}-err`} className="profile-link-error" role="alert">
                            {draftError}
                          </span>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button type="submit" className="btn primary sm" disabled={Boolean(draftError) || pristine}>
                          حفظ
                        </button>
                        <button type="button" className="btn ghost sm" onClick={cancelEdit}>
                          إلغاء
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {tab === 'achievements' && (
        <Card title="الإنجازات الأخيرة" icon={Trophy}>
          {achievements.isPending ? (
            <div className="flex-col gap-2" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div className="achievement" key={i} aria-hidden>
                  <Skeleton width={40} height={40} rounded="var(--r-md)" />
                  <div className="flex-1 flex-col gap-2">
                    <Skeleton width="45%" height={13} />
                    <Skeleton width="70%" height={11} />
                  </div>
                  <Skeleton width={48} height={20} rounded="var(--r-full)" />
                </div>
              ))}
            </div>
          ) : achievements.isError ? (
            <ErrorState
              message="تعذَّر تحميل الإنجازات"
              error={achievements.error}
              onRetry={() => achievements.refetch()}
            />
          ) : !achievements.data?.length ? (
            <EmptyState
              icon={Trophy}
              title="لا إنجازات بعد"
              description="أكمل بعض المحاضرات والمهام لكسب أوّل شارة."
            />
          ) : (
            <div className="flex-col gap-2">
              {achievements.data.slice(0, 4).map((a) => (
                <div className="achievement" key={a.achievement.id}>
                  <span className="achievement-icon" aria-hidden><Icon icon={Trophy} size={16} /></span>
                  <div className="flex-1">
                    <div className="achievement-name">{a.achievement.name}</div>
                    <div className="achievement-desc">{a.achievement.description}</div>
                  </div>
                  <Badge color="gold"><bdi>+{a.achievement.xp}</bdi></Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function ProfileField({
  label, value, icon, mono,
}: { label: string; value: string; icon: LucideIcon; mono?: boolean }) {
  return (
    <div className="fact-row fact-row--field">
      <Icon icon={icon} size={16} className="text-subtle" aria-hidden />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="text-xxs text-subtle">{label}</div>
        <div className="text-sm" style={{ color: 'var(--text)', marginTop: 2 }}>
          {mono ? <bdi dir="ltr" className="font-mono">{value}</bdi> : value}
        </div>
      </div>
    </div>
  );
}
