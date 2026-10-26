import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import {
  User, Mail, GraduationCap, BookOpen, Award, ExternalLink,
  CheckCircle2, AlertCircle, Trophy, Hash, type LucideIcon,
} from 'lucide-react';
import { Card, FormField, ProgressBar, Badge, UserAvatar, Tabs } from '../../components/primitives';
import { ErrorState, Skeleton } from '../../components/primitives/States';
import { PageFrame, PageHeader, StatLine } from '../../components/patterns';
/* R319 (c3-S2) — the §B2 kit: the mono-indexed section title bar + the
 * hatched empty cell + the mono status chip (the DashboardPage
 * conversion's components — the pages-B half of the Cycle 3 sweep). */
import { SectionBar, BarCount, StatusChip, EmptyCell } from '../../components/student';
import { Icon } from '../../components/Icon';
import { useAuthStore } from '../../stores/auth.store';
import { useMyAchievements, useMyEnrollments, useMyResearch, useMyProfile } from '../../hooks/useResources';
import {
  useChangePassword,
  changePasswordPolicy,
  isWrongCurrentPassword,
  changePasswordErrorMessage,
} from '../../hooks/useChangePassword'; // r180-F4
import { toast } from '../../lib/toast';
import '../../styles/training.css'; // .achievement-* family (D11 css split, 12-15)
/* R305 Heron: the shared student vocabulary + this family's page-scoped
   refinements (the deep profile hero band, §1 of the family sheet). */
import '../../styles/r305-student.css';
import '../../styles/r305-student-supplemental.css';
/* R319 (c3-S2): the sheet system — the §B2 component anatomy + the
 * academic family's harmonics (the same pair every converted student
 * page rides; the profile's own regions are Cards + the R305 hero band,
 * which keep their pinned registers). */
import '../../styles/r319-student.css';
import '../../styles/r319-student-pages.css';
import { formatNum } from '../../utils/numbers';
import { countAr } from '../../lib/format';
/* R319 C1-C — visible-text hygiene on data-field values (§B2): the
   same sanitizer the dashboard header rides — placeholder test names
   and revision codes never render as a student's faculty/department. */
import { sanitizeInstitutionName } from '../../utils/display-text';

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
    <div className="r319s-page">
    <PageFrame width="default">
      <PageHeader
        title="ملفي الشخصي"
        description="معلوماتك الأكاديمية، حساباتك العلمية، وإنجازاتك في المنصة."
      />

      {/* R305 Heron hero — the ONE deep band on the page: identity
          (avatar + name + verified state) and the completeness meter
          share the auto-inverting ground; the eyebrow classifies the
          band as the account block before the tabs classify content. */}
      <div className="r305s-band r305s-band--deep r305p-hero">
        <UserAvatar initials={initials} color={user.avatarColor ?? undefined} size={64} />
        <div className="r305p-hero-id">
          <span className="r305s-eyebrow">الملف الشخصي</span>
          <div className="r305p-hero-name">{user.firstName} {user.lastName}</div>
          <div className="r305p-hero-mail">
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
        <div className="r305p-hero-meter">
          <div className="r305p-hero-meter-head">
            <span>اكتمال الملف</span>
            {/* 5-D1 (A11 P2-2): the % is mono TEXT — the base
                accent/success/warning fills measured 3.80/3.00/2.30:1
                on white (AA needs 4.5). The -ink pair kept the
                traffic-light tiers on the old light hero; on the R305
                deep band the readout rides the band's own ink
                (.r305p-hero-meter-value) so contrast holds in both
                themes, and the BAR keeps the base tokens (graphic,
                redundant with the % above it). */}
            <span className="r305p-hero-meter-value">{completeness}%</span>
          </div>
          <ProgressBar
            value={completeness}
            showValue={false}
            color={completeness >= 80 ? 'var(--success)' : completeness >= 60 ? 'var(--accent)' : 'var(--warning)'}
            ariaLabel="اكتمال الملف الشخصي"
          />
        </div>
      </div>

      {/* R304: the 2×2 MetricCard wall folds into ONE StatLine — the
          same four facts with the same real sources and the same
          honest query states (pending → '…', error → '—'). The saved
          links' count keeps its local-only disclosure: the hint says
          WHERE the links live (browser localStorage), never implying a
          server-side record. */}
      <StatLine
        items={[
          {
            label: 'مقرّرات مسجَّلة',
            value: enrollments.isPending ? '…' : enrollments.isError ? '—' : formatNum(enrollments.data?.length ?? 0),
          },
          {
            label: 'إنجازات محققة',
            value: achievements.isPending ? '…' : achievements.isError ? '—' : formatNum(achievements.data?.length ?? 0),
          },
          {
            label: 'بحوث منشورة',
            value:
              research.isPending ? '…'
                : research.isError ? '—'
                  : formatNum(research.data?.filter((r) => r.status === 'PUBLISHED').length ?? 0),
          },
          {
            label: 'روابط محفوظة',
            value: `${formatNum(linkedCount)} / ${formatNum(LINKS.length)}`,
            hint: 'حفظ محليّ في متصفّحك فقط',
            tone: linkedCount >= 2 ? 'positive' : linkedCount === 0 ? 'warning' : 'neutral',
          },
        ]}
      />

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
        <section aria-label="المعلومات الأكاديمية">
          {/* R319 (c3-S2): the tab panel's heading joins the §B2
              title-bar register — [01]…[03] follow the tabs' order, so
              whichever facet is open reads as the sheet's numbered
              section; the account-level password block below closes the
              sheet as [04]. */}
          <SectionBar index="01" title="المعلومات الأكاديمية" />
        <Card>
          <div className="grid-2">
            <ProfileField label="الاسم الكامل" value={`${user.firstName} ${user.lastName}`} icon={User} />
            <ProfileField label="البريد الجامعي" value={user.email} icon={Mail} mono />
            <ProfileField
              label="الكلّيّة"
              value={sanitizeInstitutionName(profile.data?.student?.faculty?.name) || '—'}
              icon={GraduationCap}
            />
            <ProfileField
              label="القسم"
              value={sanitizeInstitutionName(profile.data?.student?.department?.name) || '—'}
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
              value={(() => {
                /* R319 C1-C: finite 1..8 integer sanity (medicine/pharmacy
                   legitimately reach 8) — junk years render «—», never
                   «السنة undefined». */
                const y = profile.data?.student?.year;
                if (typeof y !== 'number' || !Number.isInteger(y) || y < 1 || y > 8) return '—';
                return ['الأولى', 'الثانية', 'الثالثة', 'الرابعة', 'الخامسة', 'السادسة'][y - 1] ?? `السنة ${y}`;
              })()}
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
            {/* 5-D1 (A11 P2-2): 11px mono accent-as-text measured 3.52:1
                on surface-2 — --accent-ink is the text-safe accent (10.72:1
                on surface); dark already passed either way. */}
            <bdi dir="ltr" className="font-mono" style={{ color: 'var(--accent-ink)' }}>info@demo.madarek.ly</bdi>.
          </div>
        </Card>
        </section>
      )}

      {tab === 'links' && (
        /* Academic links — a local, browser-only shortcut list. There is no
           server-side binding (no field in PATCH /users/:id), so this is
           honestly presented as a personal note, not an institutional link. */
        <section aria-label="الحسابات الأكاديمية">
          {/* R319 (c3-S2): the panel's heading joins the §B2 title-bar
              register — the mono meta is the honest linked/total ratio
              (real data — the same pair the StatLine's رابع cell counts);
              the old Card subtitle survives verbatim as the under-bar
              note. */}
          <SectionBar
            index="02"
            title="الحسابات الأكاديمية"
            meta={(
              <span className="r319s-bar-meta">
                <bdi className="r319s-mono" dir="ltr" aria-hidden="true">{linkedCount}/{formatNum(LINKS.length)}</bdi>
                <span className="sr-only">{countAr(linkedCount, ['رابط محفوظ واحد', 'رابطان محفوظان', 'روابط محفوظة', 'رابطاً محفوظاً'])} من {formatNum(LINKS.length)}</span>
              </span>
            )}
          />
          <p className="r319sp-sec-note">روابطك الأكاديمية للرجوع السريع — تُحفظ في متصفّحك فقط ولا تُرسَل إلى الجامعة.</p>
          <Card>
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
                        {/* R319 (c3-S2): the row's link state rides the §B2
                            mono chip register — square hairline ink, never
                            a color-only Badge (state never rides color
                            alone). */}
                        {value ? (
                          <StatusChip label="LINKED" tone="done" />
                        ) : (
                          <StatusChip label="UNLINKED" />
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
        </section>
      )}

      {tab === 'achievements' && (
        <section aria-label="الإنجازات الأخيرة">
          {/* R319 (c3-S2): the panel's heading joins the §B2 title-bar
              register — the honest resolved count as mono meta (pending /
              error show no count — never a fabricated zero). */}
          <SectionBar
            index="03"
            title="الإنجازات الأخيرة"
            meta={
              !achievements.isPending && !achievements.isError && (achievements.data?.length ?? 0) > 0 ? (
                <BarCount
                  n={achievements.data!.length}
                  srLabel={countAr(achievements.data!.length, ['إنجاز واحد محقّق', 'إنجازان محقّقان', 'إنجازات محقّقة', 'إنجازاً محقّقاً'])}
                />
              ) : undefined
            }
          />
          <Card>
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
            /* R319 (c3-S2): the empty achievements tab is the sheet's
               reserved-but-empty region — the hatched EmptyCell (the old
               EmptyState's copy, kept honest and verbatim). */
            <EmptyCell
              label="لا إنجازات بعد"
              note="أكمل بعض المحاضرات والمهام لكسب أوّل شارة."
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
                  <Badge color="gold"><bdi className="font-mono" dir="ltr">+{a.achievement.xp}</bdi></Badge>
                </div>
              ))}
            </div>
          )}
          </Card>
        </section>
      )}

      {/* r180-F4: password change — an account-level section, so it
          lives OUTSIDE the academic tabs (security is not one of the
          profile's academic facets). R319 (c3-S2): the block's heading
          joins the §B2 title-bar register as the sheet's closing [04]. */}
      <section aria-label="تغيير كلمة المرور">
        <SectionBar index="04" title="تغيير كلمة المرور" />
        <p className="r319sp-sec-note">عند التغيير تُنهى جلساتك على بقية الأجهزة، وتبقى جلستك الحالية مفتوحة.</p>
        <ChangePasswordCard />
      </section>
    </PageFrame>
    </div>
  );
}

/* ── r180-F4: تغيير كلمة المرور ────────────────────────────────
 * POST /auth/change-password via hooks/useChangePassword. The policy
 * mirror (12–72 chars + the blocklist) is the hook's own export; the
 * field copy mirrors the register form's («12 حرفًا على الأقل» /
 * «كلمة المرور شائعة جدًا…»). Honest post-success behavior, read from
 * the backend route: the tokenVersion bump kills every OTHER
 * session's refresh cookie while THIS device continues on the fresh
 * tokens the route re-issues — so the user stays logged in and the
 * copy says the other sessions may need to sign in again. */
function ChangePasswordCard() {
  const submit = useChangePassword();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  /* Errors stay hidden until the first blur/submit (the links editor's
   * reveal convention — a pristine form shows nothing). */
  const [reveal, setReveal] = useState(false);
  const [done, setDone] = useState(false);

  /* Field-level validation, computed on every keystroke but gated by
   * `reveal` at render — the same shape as the links editor. */
  const currentError = current ? null : 'أدخل كلمة المرور الحالية.';
  const policyCheck = next ? changePasswordPolicy.safeParse(next) : null;
  const nextError = !next
    ? 'أدخل كلمة المرور الجديدة.'
    : policyCheck && !policyCheck.success
      ? (policyCheck.error.issues[0]?.message ?? null)
      : null;
  const confirmError = confirm === next ? null : 'كلمتا المرور غير متطابقتين.';

  /* 401 INVALID_CREDENTIALS — the current password did not verify: the
   * backend's own Arabic copy lands ON that field so the user knows
   * WHICH control failed. Any other failure (429 limiter, network)
   * renders once below the form. */
  const wrongCurrent = submit.isError && isWrongCurrentPassword(submit.error);
  const serverMessage = submit.isError && !wrongCurrent
    ? changePasswordErrorMessage(submit.error)
    : null;
  const currentFieldError = wrongCurrent
    ? changePasswordErrorMessage(submit.error)
    : reveal ? (currentError ?? undefined) : undefined;

  const canSubmit = Boolean(current) && Boolean(next) && !nextError && next === confirm;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setReveal(true);
    if (!canSubmit) return; // the inline field errors own this case
    try {
      await submit.mutateAsync({ currentPassword: current, newPassword: next });
      setDone(true);
      setCurrent('');
      setNext('');
      setConfirm('');
      // Honest copy per the backend contract: this session re-issued
      // its tokens (still logged in), the OTHER devices were signed
      // out by the tokenVersion bump.
      toast.success(
        'تمّ تغيير كلمة المرور — قد تحتاج الجلسات الأخرى إلى تسجيل الدخول مجددًا.',
        { title: 'تمّ التغيير' },
      );
    } catch {
      // surfaced inline from submit.isError below (wrong-current field
      // error or the general server banner)
    }
  };

  return (
    <Card>
      {done && (
        <div className="form-feedback ok" role="status" style={{ marginBlockEnd: 'var(--sp-3)' }}>
          <Icon icon={CheckCircle2} size={14} />
          <span className="flex-1">
            تمّ تغيير كلمة المرور بنجاح — بقيت جلستك الحالية مفتوحة، وقد تحتاج بقية الأجهزة إلى تسجيل الدخول مجددًا.
          </span>
        </div>
      )}
      {serverMessage && (
        <div className="form-feedback fail" role="alert" style={{ marginBlockEnd: 'var(--sp-3)' }}>
          <Icon icon={AlertCircle} size={14} />
          <span className="flex-1">{serverMessage}</span>
        </div>
      )}
      <form className="flex-col gap-3" onSubmit={onSubmit} noValidate>
        <FormField
          label="كلمة المرور الحالية"
          id="pw-current"
          error={currentFieldError}
        >
          {/* dir="ltr": passwords are overwhelmingly Latin runs; the
              caret and masked glyphs must not bidi-flip in RTL (the
              register form's own note). */}
          <input
            className="input"
            type="password"
            dir="ltr"
            autoComplete="current-password"
            value={current}
            onChange={(e) => { setCurrent(e.target.value); setDone(false); }}
            onBlur={() => setReveal(true)}
            disabled={submit.isPending}
          />
        </FormField>
        <FormField
          label="كلمة المرور الجديدة"
          id="pw-new"
          hint="12 حرفًا على الأقل وحتى 72 حرفًا — تجنّب كلمات المرور الشائعة."
          error={reveal ? (nextError ?? undefined) : undefined}
        >
          <input
            className="input"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={next}
            onChange={(e) => { setNext(e.target.value); setDone(false); }}
            onBlur={() => setReveal(true)}
            disabled={submit.isPending}
          />
        </FormField>
        <FormField
          label="تأكيد كلمة المرور الجديدة"
          id="pw-confirm"
          error={reveal ? (confirmError ?? undefined) : undefined}
        >
          <input
            className="input"
            type="password"
            dir="ltr"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => { setConfirm(e.target.value); setDone(false); }}
            onBlur={() => setReveal(true)}
            disabled={submit.isPending}
          />
        </FormField>
        <div className="flex items-center gap-2">
          <button
            type="submit"
            className="btn primary"
            disabled={submit.isPending}
          >
            {submit.isPending ? 'جارٍ التغيير…' : 'تغيير كلمة المرور'}
          </button>
        </div>
      </form>
    </Card>
  );
}

function ProfileField({
  label, value, icon, mono,
}: { label: string; value: string; icon: LucideIcon; mono?: boolean }) {
  return (
    <div className="fact-tile fact-tile--field">
      <Icon icon={icon} size={16} className="text-subtle" aria-hidden />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div className="text-xxs text-subtle">{label}</div>
        <div className="text-sm" style={{ color: 'var(--text)', marginTop: 'var(--sp-0-5)' }}>
          {mono ? <bdi dir="ltr" className="font-mono">{value}</bdi> : value}
        </div>
      </div>
    </div>
  );
}
