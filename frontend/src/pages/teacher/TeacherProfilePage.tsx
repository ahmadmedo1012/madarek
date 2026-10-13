/**
 * Teacher self-profile.
 *
 * Path: /teacher/profile
 * Restricted: TEACHER role.
 *
 * Sections (order matches PRD):
 *   1. Header (name, rank, faculty, verification badge)
 *   2. Workload summary KPIs
 *   3. Bio + contact + office hours (editable inline)
 *   4. Specialty & subject keywords
 *   5. Certifications & degree
 *   6. Publications & awards
 *   7. Courses currently teaching
 */
import { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Award, BookOpen, Users2, MapPin, Clock, Globe,
  ShieldCheck, AlertCircle, Edit3, Save, X, FileText, Sparkles,
  ChevronLeft,
} from 'lucide-react';
import { Card, Badge, MetricCard, UserAvatar, FormField } from '../../components/primitives';
import { DetailSkeleton, ErrorState, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import { useDiscardGuard } from '../../components/curriculum/AuthoringModal';
import {
  useMyTeacherProfile, useUpdateTeacherProfile, apiErrorMessage,
} from '../../hooks/useResources';
import { countAr } from '../../lib/format';
import { formatDate } from '../../utils/numbers';
import '../../styles/training.css'; // shared .track-grid/.track-card family (D11 css split, 12-15)

const RANK_LABEL: Record<string, string> = {
  LECTURER: 'مُعيد / محاضر',
  ASSISTANT_PROFESSOR: 'أستاذ مساعد',
  ASSOCIATE_PROFESSOR: 'أستاذ مشارك',
  PROFESSOR: 'أستاذ',
};
const DEGREE_LABEL: Record<string, string> = {
  BACHELORS: 'بكالوريوس',
  MASTERS: 'ماجستير',
  PHD: 'دكتوراه',
};

export default function TeacherProfilePage() {
  const { data: profile, isPending, isError, error, refetch } = useMyTeacherProfile();
  const update = useUpdateTeacherProfile();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{
    bio: string;
    officeLocation: string;
    officeHours: string;
    websiteUrl: string;
  } | null>(null);
  // Inline mutation feedback (audit 0-e P0-12): the previous saveEdit
  // awaited mutateAsync with no catch — API-down left the edit silently
  // stuck + an unhandled rejection.
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  /* r157 / 6A9 — cancelEdit routes through the shared useDiscardGuard
   * (the same confirm the curriculum builders and both grading modals
   * use): the four inline fields are minutes of typing the old cancel
   * dropped silently. Dirty → confirm → «متابعة التحرير» keeps the
   * draft, «التخلّي عن التعديلات» discards it.
   *
   * HOOK ORDER: this block runs BEFORE the pending/error/no-profile
   * early returns below — a hook after an early return is the LabsPage
   * conditional-skip crash pattern (never skip a hook). */
  const dirty = editing
    && draft !== null
    && profile != null
    && (draft.bio !== (profile.bio ?? '')
      || draft.officeLocation !== (profile.officeLocation ?? '')
      || draft.officeHours !== (profile.officeHours ?? '')
      || draft.websiteUrl !== (profile.websiteUrl ?? ''));
  const discardDraft = useCallback(() => {
    setDraft(null);
    setSaveError(null);
    setEditing(false);
  }, []);
  const { requestClose: requestCancelEdit, guard: discardGuard } = useDiscardGuard({
    dirty,
    pending: update.isPending,
    onClose: discardDraft,
  });

  if (isPending) return <DetailSkeleton />;
  if (isError) {
    return (
      <div className="page">
        <header className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">الملف الأكاديمي</h1>
          </div>
        </header>
        <ErrorState
          message="تعذَّر تحميل ملفك الأكاديمي"
          error={error}
          onRetry={() => refetch()}
        />
      </div>
    );
  }
  if (!profile) {
    // Resolved, but the account has no teacher profile attached — an
    // honest distinct state (previously conflated with API errors).
    return (
      <div className="page">
        <header className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">الملف الأكاديمي</h1>
          </div>
        </header>
        <Card>
          <EmptyState illustration="empty-search"
            icon={AlertCircle}
            title="لا يوجد ملف أستاذ مرتبط بهذا الحساب"
            description="تواصل مع إدارة شؤون أعضاء هيئة التدريس لربط ملفك الأكاديمي بهذا الحساب."
          />
        </Card>
      </div>
    );
  }

  const startEdit = () => {
    setDraft({
      bio: profile.bio ?? '',
      officeLocation: profile.officeLocation ?? '',
      officeHours: profile.officeHours ?? '',
      websiteUrl: profile.websiteUrl ?? '',
    });
    setSaveError(null);
    setSavedAt(null);
    setEditing(true);
  };

  // r157 / 6A9 — cancelEdit IS requestCancelEdit (the discard guard
  // above); a clean form cancels directly, a dirty one confirms first.
  const cancelEdit = requestCancelEdit;

  const saveEdit = async () => {
    if (!draft) return;
    setSaveError(null);
    try {
      await update.mutateAsync({
        bio: draft.bio || null,
        officeLocation: draft.officeLocation || null,
        officeHours: draft.officeHours || null,
        websiteUrl: draft.websiteUrl || null,
      });
      setEditing(false);
      setDraft(null);
      setSavedAt(Date.now());
    } catch (err) {
      // Keep the edit open with the entered values; the Arabic error
      // renders inline so the teacher can retry without losing work.
      setSaveError(apiErrorMessage(err, 'تعذَّر حفظ تعديلات الملف — تحقّق من اتصالك ثم أعد المحاولة.'));
    }
  };

  return (
    <div className="page page-profile">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">الملف الأكاديمي</h1>
          <p className="page-subtitle">
            ملفك الأكاديمي كما يظهر للإدارة، مكتب الجودة، والطلاب. حدّثه باستمرار ليعكس نشاطك العلمي.
          </p>
        </div>
        {!editing ? (
          <button type="button" className="btn primary" onClick={startEdit}>
            <Icon icon={Edit3} size={14} /> تعديل البيانات الشخصية
          </button>
        ) : (
          <div className="flex gap-2">
            <button type="button" className="btn ghost" onClick={cancelEdit} disabled={update.isPending}>
              <Icon icon={X} size={14} /> إلغاء
            </button>
            <button type="button" className="btn primary" onClick={() => void saveEdit()} disabled={update.isPending}>
              <Icon icon={Save} size={14} /> {update.isPending ? 'جارٍ الحفظ…' : 'حفظ'}
            </button>
          </div>
        )}
      </header>

      {/* Save feedback — success confirms, failure names the action + retry */}
      {(saveError || savedAt !== null) && (
        <div
          className={`form-feedback${saveError ? ' fail' : ' ok'}`}
          role={saveError ? 'alert' : 'status'}
        >
          <Icon icon={saveError ? AlertCircle : ShieldCheck} size={14} />
          <span className="flex-1">
            {saveError ?? 'تمّ حفظ تعديلات ملفك الأكاديمي.'}
          </span>
          {saveError && (
            <button type="button" className="btn ghost sm" onClick={() => void saveEdit()} disabled={update.isPending}>
              <Icon icon={Save} size={12} /> إعادة المحاولة
            </button>
          )}
        </div>
      )}

      {/* Header: avatar + name + rank + verification */}
      <Card>
        <div className="teacher-header">
          <UserAvatar
            initials={profile.avatarInitials ?? `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`}
            color={profile.avatarColor ?? undefined}
            size={72}
          />
          <div className="flex-1">
            <h2 className="teacher-name">
              د. {profile.name}
              {profile.verifiedAt && (
                <span className="teacher-verified" title={`موثَّق منذ ${formatDate(profile.verifiedAt)}`}>
                  <Icon icon={ShieldCheck} size={14} /> موثَّق
                </span>
              )}
            </h2>
            <div className="teacher-meta">
              <Badge color="brand">{RANK_LABEL[profile.rank] ?? profile.rank}</Badge>
              <span>{profile.specialty}</span>
              <span>·</span>
              <span>{profile.department}</span>
              <span>·</span>
              <span>{profile.faculty}</span>
            </div>
            <div className="teacher-contact font-mono text-xxs">
              {/* email is a Latin run inside an RTL line — isolate it so
                  punctuation never reorders */}
              <bdi>{profile.email}</bdi>
            </div>
          </div>
        </div>
      </Card>

      {/* Workload KPIs */}
      <div className="grid-3">
        <MetricCard
          icon={BookOpen}
          label="المقرّرات هذا الفصل"
          value={profile.workload.courseCount.toString()}
          change={countAr(profile.workload.totalCredits, ['وحدة معتمدة واحدة', 'وحدتان معتمدتان', 'وحدات معتمدة', 'وحدة معتمدة'])}
          color="brand"
        />
        <MetricCard
          icon={Users2}
          label="إجمالي الطلاب"
          value={profile.workload.totalEnrolled.toString()}
          change="مسجَّلون في مقرّراتك"
          color="green"
        />
        <MetricCard
          icon={Award}
          label="الدرجة العلمية"
          value={DEGREE_LABEL[profile.degreeLevel] ?? profile.degreeLevel}
          change={countAr(profile.yearsExperience, ['سنة خبرة واحدة', 'سنتا خبرة', 'سنوات خبرة', 'سنة خبرة'])}
          color="purple"
        />
      </div>

      {/* Bio + contact (editable) */}
      <Card title="نبذة شخصية" icon={FileText}>
        {editing && draft ? (
          /* r152c (A2): the four edit-mode controls were placeholder-ONLY
             — no accessible name at all. FormField gives each a real
             (visually matching) label. */
          <FormField label="نبذة" id="teacher-bio-field">
            <textarea
              className="input"
              rows={5}
              placeholder="اكتب نبذة عن خبرتك الأكاديمية والبحثية وأهم اهتماماتك العلمية…"
              value={draft.bio}
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
            />
          </FormField>
        ) : profile.bio ? (
          <p className="profile-bio">{profile.bio}</p>
        ) : (
          <div className="text-sm text-muted">لم تُضف نبذة بعد. اضغط «تعديل» لإضافة وصف عن خلفيتك الأكاديمية.</div>
        )}
      </Card>

      <div className="grid-2">
        <Card title="المكتب وساعات العمل" icon={MapPin}>
          {editing && draft ? (
            <div className="flex-col gap-2">
              <FormField label="موقع المكتب" id="teacher-office-location-field">
                <input
                  className="input"
                  placeholder="مثال: مبنى الكلّيّة - مكتب 305"
                  value={draft.officeLocation}
                  onChange={(e) => setDraft({ ...draft, officeLocation: e.target.value })}
                />
              </FormField>
              <FormField label="ساعات العمل" id="teacher-office-hours-field">
                <input
                  className="input"
                  placeholder="مثال: الأحد والثلاثاء 10-12"
                  value={draft.officeHours}
                  onChange={(e) => setDraft({ ...draft, officeHours: e.target.value })}
                />
              </FormField>
            </div>
          ) : (
            <div className="flex-col gap-2">
              {profile.officeLocation ? (
                <div className="kv-row">
                  <Icon icon={MapPin} size={13} className="text-subtle" />
                  <span>{profile.officeLocation}</span>
                </div>
              ) : (
                <div className="text-xs text-muted">لم يُحدد موقع المكتب.</div>
              )}
              {profile.officeHours ? (
                <div className="kv-row">
                  <Icon icon={Clock} size={13} className="text-subtle" />
                  <span>{profile.officeHours}</span>
                </div>
              ) : (
                <div className="text-xs text-muted">لم تُحدَّد ساعات العمل.</div>
              )}
            </div>
          )}
        </Card>

        <Card title="الموقع الإلكتروني" icon={Globe}>
          {editing && draft ? (
            <FormField label="الموقع الإلكتروني" id="teacher-website-field">
              <input
                className="input"
                dir="ltr"
                placeholder="https://example.com/profile"
                value={draft.websiteUrl}
                onChange={(e) => setDraft({ ...draft, websiteUrl: e.target.value })}
              />
            </FormField>
          ) : profile.websiteUrl ? (
            <a href={profile.websiteUrl} target="_blank" rel="noreferrer" className="font-mono text-xs" dir="ltr">
              {profile.websiteUrl}
            </a>
          ) : (
            <div className="text-xs text-muted">لم يُضف موقع شخصي.</div>
          )}
        </Card>
      </div>

      {/* Subject keywords + degree summary */}
      <div className="grid-2">
        <Card title="مجالات الاهتمام البحثي" icon={Sparkles}>
          {profile.subjectKeywords.length === 0 ? (
            <div className="text-sm text-muted">لم تُسجَّل مجالات بحثية بعد.</div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {profile.subjectKeywords.map((kw) => <Badge key={kw}>{kw}</Badge>)}
            </div>
          )}
        </Card>
        <Card
          title="الشهادات والاعتمادات"
          icon={GraduationCap}
          /* r157 / 6A9 — countAr grammar: «3 شهادات» (the old
           * `${n} شهادة` template broke at 0 and 2); the zero case
           * names the reality like the body copy does. */
          subtitle={profile.certifications.length === 0
            ? 'لم تُضف شهادة'
            : countAr(profile.certifications.length, ['شهادة واحدة', 'شهادتان', 'شهادات', 'شهادة'])}
        >
          {profile.certifications.length === 0 ? (
            <div className="text-sm text-muted">لم تُضف شهادات.</div>
          ) : (
            <div className="flex-col gap-2">
              {profile.certifications.map((c, i) => (
                <div key={i} className="cert-row">
                  <Icon icon={GraduationCap} size={14} style={{ color: 'var(--accent-ink)' }} />
                  <div className="flex-1">
                    <div className="cert-row-title">{c.title}</div>
                    <div className="text-xxs text-subtle">{c.issuer} · <bdi>{c.year}</bdi></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Publications & awards */}
      <Card
        title="المنشورات العلمية"
        icon={FileText}
        subtitle={profile.publications.length === 0
          ? 'لم تُضف منشورات'
          : countAr(profile.publications.length, ['منشور واحد', 'منشوران', 'منشورات', 'منشوراً'])}
      >
        {profile.publications.length === 0 ? (
          <EmptyState illustration="empty-search"
            icon={FileText}
            title="لم تُضف منشورات بعد"
            description="تُدار منشوراتك من ملفك الأكاديمي لدى إدارة الجامعة."
          />
        ) : (
          <div className="flex-col gap-2">
            {profile.publications.map((p, i) => (
              <div key={i} className="publication-row">
                <bdi className="font-mono text-xxs text-subtle">{p.year}</bdi>
                <div className="flex-1">
                  <div className="cert-row-title">{p.title}</div>
                  {p.venue && <div className="text-xxs text-subtle">{p.venue}</div>}
                </div>
                {p.url && (
                  <a href={p.url} target="_blank" rel="noreferrer" className="btn ghost sm">
                    عرض <Icon icon={ChevronLeft} size={12} />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card
        title="التكريمات والجوائز"
        icon={Award}
        subtitle={profile.awards.length === 0
          ? 'لم تُضف جائزة'
          : countAr(profile.awards.length, ['جائزة واحدة', 'جائزتان', 'جوائز', 'جائزة'])}
      >
        {profile.awards.length === 0 ? (
          <EmptyState illustration="empty-search"
            icon={Award}
            title="لم تُضف جوائز بعد"
            description="تُدار تكريماتك وجوائزك من ملفك الأكاديمي لدى إدارة الجامعة."
          />
        ) : (
          <div className="flex-col gap-2">
            {profile.awards.map((a, i) => (
              <div key={i} className="cert-row">
                <Icon icon={Award} size={14} style={{ color: 'var(--gold-ink)' }} />
                <div className="flex-1">
                  <div className="cert-row-title">{a.title}</div>
                  <div className="text-xxs text-subtle">
                    {a.issuer ? `${a.issuer} · ` : ''}<bdi>{a.year}</bdi>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Courses currently teaching */}
      <Card title="المقرّرات الحالية" icon={BookOpen} subtitle={countAr(profile.courses.length, ['مقرّر واحد هذا الفصل', 'مقرّران هذا الفصل', 'مقرّرات هذا الفصل', 'مقرّراً هذا الفصل'])}>
        {profile.courses.length === 0 ? (
          <EmptyState illustration="empty-search"
            icon={BookOpen}
            title="لم يُسند إليك أي مقرّر بعد"
            description="ستظهر مقرّراتك هنا فور إسنادها من قِبَل إدارة الشؤون الأكاديمية."
          />
        ) : (
          <div className="track-grid">
            {profile.courses.map((c) => (
              <Link
                key={c.offeringId}
                to={`/teacher/intelligence/${c.offeringId}`}
                className="track-card"
                style={{ ['--track-accent' as never]: c.themeColor ?? 'var(--accent)' }}
              >
                {/* tint painted from --track-accent (training.css) — the old
                    inline `${themeColor}1a` alpha was invalid CSS */}
                <div className="track-card-icon">
                  <EmojiIcon emoji={c.iconEmoji ?? '📚'} size={22} />
                </div>
                <div className="track-card-body">
                  <div className="track-card-cat"><bdi>{c.code}</bdi> · {c.term}</div>
                  <div className="track-card-title" title={c.name}>{c.name}</div>
                  <div className="track-card-meta">
                    <span><Icon icon={Users2} size={12} /> {countAr(c.enrolled, ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'])}</span>
                    <span>{countAr(c.credits, ['وحدة واحدة', 'وحدتان', 'وحدات', 'وحدة'])}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* r157 / 6A9 — the discard-confirm for cancelEdit (portal-mounted). */}
      {discardGuard}
    </div>
  );
}
