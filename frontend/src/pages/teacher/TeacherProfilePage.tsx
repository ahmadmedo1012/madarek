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
import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  GraduationCap, Award, BookOpen, Users2, MapPin, Clock, Globe,
  ShieldCheck, AlertCircle, Edit3, Save, X, FileText, Sparkles,
  ChevronLeft,
} from 'lucide-react';
import { Card, Badge, MetricCard, UserAvatar } from '../../components/primitives';
import { DetailSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import {
  useMyTeacherProfile, useUpdateTeacherProfile,
  type TeacherFullProfile,
} from '../../hooks/useResources';

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
  const { data: profile, isLoading } = useMyTeacherProfile();
  const update = useUpdateTeacherProfile();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<{
    bio: string;
    officeLocation: string;
    officeHours: string;
    websiteUrl: string;
  } | null>(null);

  if (isLoading) return <DetailSkeleton />;
  if (!profile) {
    return (
      <div className="page">
        <Card>
          <div className="empty-state">
            <Icon icon={AlertCircle} size={28} className="text-subtle" />
            <p className="text-sm text-muted">لا يوجد ملف أستاذ مرتبط بهذا الحساب.</p>
          </div>
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
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(null);
    setEditing(false);
  };

  const saveEdit = async () => {
    if (!draft) return;
    await update.mutateAsync({
      bio: draft.bio || null,
      officeLocation: draft.officeLocation || null,
      officeHours: draft.officeHours || null,
      websiteUrl: draft.websiteUrl || null,
    });
    setEditing(false);
    setDraft(null);
  };

  return (
    <div className="page">
      <div className="page-header">
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
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn ghost" onClick={cancelEdit} disabled={update.isPending}>
              <Icon icon={X} size={14} /> إلغاء
            </button>
            <button type="button" className="btn primary" onClick={saveEdit} disabled={update.isPending}>
              <Icon icon={Save} size={14} /> {update.isPending ? 'جارٍ الحفظ…' : 'حفظ'}
            </button>
          </div>
        )}
      </div>

      {/* Header: avatar + name + rank + verification */}
      <Card>
        <div className="teacher-header">
          <UserAvatar
            initials={profile.avatarInitials ?? `${profile.firstName[0] ?? ''}${profile.lastName[0] ?? ''}`}
            color={profile.avatarColor ?? undefined}
            size={72}
          />
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 className="teacher-name">
              د. {profile.name}
              {profile.verifiedAt && (
                <span className="teacher-verified" title={`موثَّق منذ ${new Date(profile.verifiedAt).toLocaleDateString('ar-EG')}`}>
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
              <span>{profile.email}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Workload KPIs */}
      <div className="grid-3">
        <MetricCard
          icon={BookOpen}
          label="المقررات هذا الفصل"
          value={profile.workload.courseCount.toString()}
          change={`${profile.workload.totalCredits} وحدة معتمدة`}
          color="brand"
        />
        <MetricCard
          icon={Users2}
          label="إجمالي الطلاب"
          value={profile.workload.totalEnrolled.toString()}
          change="مسجَّلون في مقرراتك"
          color="green"
        />
        <MetricCard
          icon={Award}
          label="الدرجة العلمية"
          value={DEGREE_LABEL[profile.degreeLevel] ?? profile.degreeLevel}
          change={`${profile.yearsExperience} سنة خبرة`}
          color="purple"
        />
      </div>

      {/* Bio + contact (editable) */}
      <Card title="نبذة شخصية" icon={FileText}>
        {editing && draft ? (
          <textarea
            className="input"
            rows={5}
            placeholder="اكتب نبذة عن خبرتك الأكاديمية والبحثية وأهم اهتماماتك العلمية…"
            value={draft.bio}
            onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
          />
        ) : profile.bio ? (
          <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--text)', lineHeight: 1.85 }}>
            {profile.bio}
          </p>
        ) : (
          <div className="text-sm text-muted">لم تُضف نبذة بعد. اضغط "تعديل" لإضافة وصف عن خلفيتك الأكاديمية.</div>
        )}
      </Card>

      <div className="grid-2">
        <Card title="المكتب وساعات العمل" icon={MapPin}>
          {editing && draft ? (
            <div className="flex-col gap-2">
              <input
                className="input"
                placeholder="موقع المكتب — مثال: مبنى الكلية - مكتب 305"
                value={draft.officeLocation}
                onChange={(e) => setDraft({ ...draft, officeLocation: e.target.value })}
              />
              <input
                className="input"
                placeholder="ساعات العمل — مثال: الأحد والثلاثاء 10-12"
                value={draft.officeHours}
                onChange={(e) => setDraft({ ...draft, officeHours: e.target.value })}
              />
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
            <input
              className="input"
              placeholder="https://example.com/profile"
              value={draft.websiteUrl}
              onChange={(e) => setDraft({ ...draft, websiteUrl: e.target.value })}
            />
          ) : profile.websiteUrl ? (
            <a href={profile.websiteUrl} target="_blank" rel="noreferrer" className="font-mono text-xs">
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {profile.subjectKeywords.map((kw) => <Badge key={kw}>{kw}</Badge>)}
            </div>
          )}
        </Card>
        <Card title="الشهادات والاعتمادات" icon={GraduationCap} subtitle={`${profile.certifications.length} شهادة`}>
          {profile.certifications.length === 0 ? (
            <div className="text-sm text-muted">لم تُضف شهادات.</div>
          ) : (
            <div className="flex-col gap-2">
              {profile.certifications.map((c, i) => (
                <div key={i} className="cert-row">
                  <Icon icon={GraduationCap} size={14} style={{ color: 'var(--accent)' }} />
                  <div style={{ flex: 1 }}>
                    <div className="text-sm" style={{ fontWeight: 600 }}>{c.title}</div>
                    <div className="text-xxs text-subtle">{c.issuer} · {c.year}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Publications & awards */}
      <Card title="المنشورات العلمية" icon={FileText} subtitle={`${profile.publications.length} منشور`}>
        {profile.publications.length === 0 ? (
          <div className="empty-state">
            <Icon icon={FileText} size={24} className="text-subtle" />
            <p className="text-sm text-muted">لم تُضف منشورات بعد.</p>
          </div>
        ) : (
          <div className="flex-col gap-2">
            {profile.publications.map((p, i) => (
              <div key={i} className="publication-row">
                <span className="font-mono text-xxs text-subtle">{p.year}</span>
                <div style={{ flex: 1 }}>
                  <div className="text-sm" style={{ fontWeight: 600 }}>{p.title}</div>
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

      <Card title="التكريمات والجوائز" icon={Award} subtitle={`${profile.awards.length} جائزة`}>
        {profile.awards.length === 0 ? (
          <div className="empty-state">
            <Icon icon={Award} size={24} className="text-subtle" />
            <p className="text-sm text-muted">لم تُضف جوائز بعد.</p>
          </div>
        ) : (
          <div className="flex-col gap-2">
            {profile.awards.map((a, i) => (
              <div key={i} className="cert-row">
                <Icon icon={Award} size={14} style={{ color: '#D4A537' }} />
                <div style={{ flex: 1 }}>
                  <div className="text-sm" style={{ fontWeight: 600 }}>{a.title}</div>
                  <div className="text-xxs text-subtle">
                    {a.issuer ? `${a.issuer} · ` : ''}{a.year}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Courses currently teaching */}
      <Card title="المقررات الحالية" icon={BookOpen} subtitle={`${profile.courses.length} مقرر هذا الفصل`}>
        {profile.courses.length === 0 ? (
          <div className="empty-state">
            <Icon icon={BookOpen} size={24} className="text-subtle" />
            <p className="text-sm text-muted">لم يُسند إليك أي مقرر بعد.</p>
          </div>
        ) : (
          <div className="track-grid">
            {profile.courses.map((c) => (
              <Link
                key={c.offeringId}
                to={`/teacher/intelligence/${c.offeringId}`}
                className="track-card"
                style={{ ['--track-accent' as never]: c.themeColor ?? 'var(--accent)' }}
              >
                <div
                  className="track-card-icon"
                  style={{
                    background: `${c.themeColor ?? 'var(--accent)'}1a`,
                    color: c.themeColor ?? 'var(--accent)',
                  }}
                >
                  <span style={{ fontSize: 22 }}>{c.iconEmoji ?? '📚'}</span>
                </div>
                <div className="track-card-body">
                  <div className="track-card-cat">{c.code} · {c.term}</div>
                  <div className="track-card-title">{c.name}</div>
                  <div className="track-card-meta">
                    <span><Icon icon={Users2} size={12} /> {c.enrolled} طالب</span>
                    <span>{c.credits} وحدة</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
