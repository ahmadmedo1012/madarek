/**
 * Admin governance pages.
 *
 *   /admin/teachers           list of teachers + verify + view suggestions
 *   /admin/permissions/:id    per-user capability editor (effective + overrides)
 */
import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ShieldCheck, GraduationCap, Award, ChevronLeft, CheckCircle2,
  AlertCircle, Sparkles, Briefcase, Building2, Users,
} from 'lucide-react';
import { Card, Badge, MetricCard, UserAvatar } from '../../components/primitives';
import { CardSkeleton, DetailSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import {
  useTeacherSuggestions,
  type AppCapability,
} from '../../hooks/useResources';
import { api, unwrap } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const DEGREE_LABEL: Record<string, string> = {
  BACHELORS: 'بكالوريوس', MASTERS: 'ماجستير', PHD: 'دكتوراه',
};
const RANK_LABEL: Record<string, string> = {
  LECTURER: 'مُعيد / محاضر',
  ASSISTANT_PROFESSOR: 'أستاذ مساعد',
  ASSOCIATE_PROFESSOR: 'أستاذ مشارك',
  PROFESSOR: 'أستاذ',
};
const CAP_LABEL: Record<AppCapability, string> = {
  RESEARCH_GRADE_OWN: 'تقييم بحوث طلابي',
  RESEARCH_GRADE_ANY: 'تقييم أي بحث',
  RESEARCH_PUBLISH: 'نشر البحوث للمكتبة',
  EXAMS_AUTHOR: 'إنشاء اختبارات',
  EXAMS_MODERATE: 'مراجعة الاختبارات',
  EXAMS_TAKE: 'تأدية الاختبارات',
  CURRICULUM_EDIT_OWN: 'تعديل منهج مقرراتي',
  CURRICULUM_EDIT_ANY: 'تعديل أي منهج',
  USERS_MANAGE: 'إدارة المستخدمين',
  ROLES_ASSIGN: 'إسناد الأدوار',
  TEACHERS_VERIFY: 'توثيق الأساتذة',
  QUALITY_VIEW: 'عرض لوحة الجودة',
  QUALITY_REPORT: 'إصدار تقارير الجودة',
  ANNOUNCE_PLATFORM: 'إعلانات على مستوى المنصة',
  ANNOUNCE_FACULTY: 'إعلانات الكلية',
  COMPETITIONS_RUN: 'إنشاء مسابقات',
  EVENTS_RUN: 'إنشاء فعاليات',
};


// ─── Local hooks ─────────────────────────────────────────────
interface AdminUserRow {
  id: string; email: string; firstName: string; lastName: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY';
  avatarColor: string | null; avatarInitials: string | null;
  isActive: boolean; createdAt: string;
}
function useAdminUsers() {
  return useQuery({
    queryKey: ['admin', 'users'],
    queryFn: () => unwrap<AdminUserRow[]>(api.get('/admin/users')),
  });
}

interface UserPermissionsResponse {
  user: { id: string; email: string; role: string; firstName: string; lastName: string };
  roleDefaults: AppCapability[];
  effective: AppCapability[];
  overrides: Array<{ id: string; capability: AppCapability; grant: boolean; reason: string | null; grantedAt: string }>;
}
function useUserPermissions(userId: string | undefined) {
  return useQuery({
    queryKey: ['admin', 'users', userId, 'permissions'],
    enabled: !!userId,
    queryFn: () => unwrap<UserPermissionsResponse>(api.get(`/admin/users/${userId}/permissions`)),
  });
}

function useSetCapability() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ userId, capability, grant, reason }: { userId: string; capability: AppCapability; grant: boolean | null; reason?: string }) =>
      unwrap(api.post(`/admin/users/${userId}/permissions`, { capability, grant, reason })),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'users'] }),
  });
}

function useVerifyTeacher() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, verified, notes }: { id: string; verified: boolean; notes?: string }) =>
      unwrap(api.post(`/admin/teachers/${id}/verify`, { verified, notes })),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'teachers'] });
    },
  });
}


/* ═══════════════ Teachers list with onboarding suggestions ═══════════════ */
export function AdminTeachersPage() {
  const { data: users } = useAdminUsers();
  const teachers = users?.filter((u) => u.role === 'TEACHER') ?? [];
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">إدارة الأساتذة</h1>
          <p className="page-subtitle">
            توثيق الملفات الأكاديمية واقتراح المقررات الأنسب لكل أستاذ بناء على تخصصه ودرجته العلمية وشهاداته.
          </p>
        </div>
      </div>

      <div className="grid-3">
        <MetricCard icon={Users} label="عدد الأساتذة" value={teachers.length.toString()} color="brand" />
        <MetricCard icon={CheckCircle2} label="نشطون" value={teachers.filter((t) => t.isActive).length.toString()} color="green" />
        <MetricCard icon={ShieldCheck} label="نظام التوثيق" value="فعّال" color="purple" change="مطابق لمتطلبات الجودة" />
      </div>

      <div className="grid-2-1">
        <Card title="قائمة الأساتذة" icon={Users}>
          <div className="flex-col gap-2">
            {teachers.map((t) => (
              <button
                key={t.id}
                type="button"
                className={`teacher-row${selectedId === t.id ? ' selected' : ''}`}
                onClick={() => setSelectedId(t.id)}
              >
                <UserAvatar initials={t.avatarInitials ?? 'أس'} color={t.avatarColor ?? undefined} size={40} />
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div className="teacher-row-name">{t.firstName} {t.lastName}</div>
                  <div className="teacher-row-email font-mono text-xxs">{t.email}</div>
                </div>
                <Icon icon={ChevronLeft} size={14} className="text-subtle" />
              </button>
            ))}
            {teachers.length === 0 && (
              <div className="empty-state"><Icon icon={Users} size={28} className="text-subtle" /><p className="text-sm text-muted">لم يتم تسجيل أساتذة بعد.</p></div>
            )}
          </div>
        </Card>

        {selectedId ? <TeacherProfileCard teacherId={selectedId} /> : (
          <Card>
            <div className="empty-state">
              <Icon icon={GraduationCap} size={28} className="text-subtle" />
              <p className="text-sm text-muted">اختر أستاذاً من القائمة لعرض ملفه الأكاديمي والمقررات المقترحة.</p>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}


function TeacherProfileCard({ teacherId }: { teacherId: string }) {
  const { data, isLoading } = useTeacherSuggestions(teacherId);
  const verify = useVerifyTeacher();

  if (isLoading) return <CardSkeleton lines={5} />;
  if (!data) return <Card>لا يوجد ملف أستاذ.</Card>;

  return (
    <div className="flex-col gap-3">
      <Card title="الملف الأكاديمي" icon={GraduationCap} actions={
        data.teacher.verified
          ? <Badge color="green"><Icon icon={CheckCircle2} size={11} /> موثَّق</Badge>
          : <button
              type="button"
              className="btn primary sm"
              onClick={() => verify.mutate({ id: teacherId, verified: true })}
            >
              توثيق الأستاذ
            </button>
      }>
        <div className="grid-2" style={{ gap: 'var(--sp-2)' }}>
          <FactRow label="الاسم" value={data.teacher.name} />
          <FactRow label="البريد" value={data.teacher.email} mono />
          <FactRow label="التخصص" value={data.teacher.specialty} />
          <FactRow label="الدرجة العلمية" value={DEGREE_LABEL[data.teacher.degreeLevel] ?? data.teacher.degreeLevel} />
          <FactRow label="الرتبة الأكاديمية" value={RANK_LABEL[data.teacher.rank] ?? data.teacher.rank} />
          <FactRow label="سنوات الخبرة" value={`${data.teacher.yearsExperience} سنة`} />
          <FactRow label="القسم" value={data.teacher.department} />
          <FactRow label="الكلية" value={data.teacher.faculty} />
        </div>

        {data.teacher.subjectKeywords.length > 0 && (
          <div style={{ marginTop: 'var(--sp-3)' }}>
            <div className="text-xxs text-subtle" style={{ marginBottom: 4 }}>المجالات</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {data.teacher.subjectKeywords.map((k) => <Badge key={k}>{k}</Badge>)}
            </div>
          </div>
        )}

        <div style={{ marginTop: 'var(--sp-3)', padding: 'var(--sp-3)', background: 'var(--accent-soft)', borderRadius: 'var(--r-md)', display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
          <Icon icon={Sparkles} size={14} style={{ color: 'var(--accent)' }} />
          <span className="text-xs" style={{ color: 'var(--accent)' }}>{data.eligibilityNote}</span>
        </div>
      </Card>

      {data.teacher.certifications.length > 0 && (
        <Card title="الشهادات والاعتمادات" icon={Award}>
          <div className="flex-col gap-2">
            {data.teacher.certifications.map((c, i) => (
              <div key={i} className="cert-row">
                <Icon icon={Award} size={14} style={{ color: '#D4A537' }} />
                <div style={{ flex: 1 }}>
                  <div className="text-sm" style={{ fontWeight: 600 }}>{c.title}</div>
                  <div className="text-xxs text-subtle">{c.issuer} · {c.year}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card title="المقررات المقترحة لتدريسها" icon={Briefcase} subtitle={`${data.suggestedCourses.length} مقرر مرتب حسب القرب من تخصصه`}>
        <div className="flex-col gap-2">
          {data.suggestedCourses.map((c) => (
            <div key={c.id} className="suggested-course-row">
              <span style={{ fontSize: 22 }}>{c.iconEmoji ?? '📘'}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="text-sm" style={{ fontWeight: 600 }}>{c.name}</div>
                <div className="text-xxs text-subtle">
                  {c.code} · {c.departmentName} · {c.facultyName}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <Badge color="brand">{c.matchScore} درجة تطابق</Badge>
                <span className="text-xxs text-subtle">{c.reason}</span>
              </div>
            </div>
          ))}
          {data.suggestedCourses.length === 0 && (
            <div className="empty-state"><Icon icon={AlertCircle} size={28} className="text-subtle" /><p className="text-sm text-muted">لا توجد مقررات مطابقة بعد. أضف كلمات مفتاحية إلى ملف الأستاذ.</p></div>
          )}
        </div>
      </Card>

      <Link to={`/admin/permissions/${teacherId}`} className="btn ghost">
        <Icon icon={ShieldCheck} size={13} /> إدارة الصلاحيات
      </Link>
    </div>
  );
}

function FactRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{
      padding: 'var(--sp-3)', background: 'var(--surface-2)',
      borderRadius: 'var(--r-md)', display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span className="text-xxs text-subtle">{label}</span>
      <span className={mono ? 'font-mono text-sm' : 'text-sm'}>{value}</span>
    </div>
  );
}


/* ═══════════════ Per-user permissions editor ═══════════════ */
export function AdminPermissionsPage() {
  const { id } = useParams<{ id: string }>();
  const { data } = useUserPermissions(id);
  const setCap = useSetCapability();

  if (!data) return <DetailSkeleton />;

  const allCaps = Object.keys(CAP_LABEL) as AppCapability[];
  const overridesByCap = new Map(data.overrides.map((o) => [o.capability, o]));

  return (
    <div className="page">
      <Link to="/admin/teachers" className="back-link">
        <Icon icon={ChevronLeft} size={14} /> العودة
      </Link>

      <Card title="إدارة الصلاحيات" icon={ShieldCheck} subtitle={`${data.user.firstName} ${data.user.lastName} · ${data.user.email}`}>
        <div className="grid-3" style={{ marginBottom: 'var(--sp-3)' }}>
          <MetricCard icon={GraduationCap} label="الدور الحالي" value={data.user.role} color="brand" />
          <MetricCard icon={CheckCircle2} label="صلاحيات فعلية" value={data.effective.length.toString()} color="green" />
          <MetricCard icon={AlertCircle} label="استثناءات يدوية" value={data.overrides.length.toString()} color="amber" />
        </div>

        <div className="text-xxs text-subtle" style={{ marginBottom: 'var(--sp-2)' }}>
          الصلاحيات الافتراضية مرتبطة بالدور. يمكنك منح صلاحية إضافية أو سحب صلاحية افتراضية لهذا المستخدم تحديداً.
        </div>

        <div className="permissions-grid">
          {allCaps.map((cap) => {
            const fromRole = data.roleDefaults.includes(cap);
            const ovr = overridesByCap.get(cap);
            const effective = data.effective.includes(cap);
            const state: 'role' | 'granted' | 'revoked' | 'none' =
              ovr ? (ovr.grant ? 'granted' : 'revoked') : (fromRole ? 'role' : 'none');

            return (
              <div key={cap} className={`perm-row state-${state}`}>
                <div className="perm-row-info">
                  <div className="perm-row-title">{CAP_LABEL[cap]}</div>
                  <code className="perm-row-key">{cap}</code>
                  <div className="perm-row-state">
                    {state === 'role' && <Badge color="brand">من الدور</Badge>}
                    {state === 'granted' && <Badge color="green">ممنوحة يدوياً</Badge>}
                    {state === 'revoked' && <Badge color="amber">مسحوبة يدوياً</Badge>}
                    {state === 'none' && <Badge>غير مفعّلة</Badge>}
                    {effective && state !== 'role' && state !== 'granted' && <span className="text-xxs text-subtle">·</span>}
                  </div>
                </div>
                <div className="perm-row-actions">
                  {!effective && (
                    <button
                      type="button"
                      className="btn primary sm"
                      onClick={() => setCap.mutate({ userId: id!, capability: cap, grant: true })}
                    >
                      منح
                    </button>
                  )}
                  {effective && fromRole && !ovr && (
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => setCap.mutate({ userId: id!, capability: cap, grant: false })}
                    >
                      سحب
                    </button>
                  )}
                  {ovr && (
                    <button
                      type="button"
                      className="btn ghost sm"
                      onClick={() => setCap.mutate({ userId: id!, capability: cap, grant: null })}
                    >
                      إعادة للافتراضي
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
