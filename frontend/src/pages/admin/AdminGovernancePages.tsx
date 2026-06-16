/**
 * Admin governance pages.
 *
 *   /admin/teachers           list of teachers + verify + view suggestions
 *   /admin/permissions/:id    per-user capability editor (effective + overrides)
 */
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ShieldCheck, GraduationCap, Award, ChevronLeft, CheckCircle2,
  AlertCircle, Sparkles, Briefcase, Building2, Users, Crown,
} from 'lucide-react';
import { Card, Badge, MetricCard, UserAvatar } from '../../components/primitives';
import { CardSkeleton, DetailSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import {
  useTeacherSuggestions,
  useFaculties,
  useAssignTeacherPosition,
  useAssignUserScope,
  type AppCapability,
  type AcademicPositionInput,
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
  user: {
    id: string;
    email: string;
    role: string;
    firstName: string;
    lastName: string;
    scopeFacultyId: string | null;
    scopeFaculty: { id: string; name: string } | null;
  };
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
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">إدارة الأساتذة</h1>
          <p className="page-subtitle">
            توثيق الملفات الأكاديمية واقتراح المقررات الأنسب لكل أستاذ بناء على تخصصه ودرجته العلمية وشهاداته.
          </p>
        </div>
      </header>

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
        </div>        {data.teacher.subjectKeywords.length > 0 && (
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

      <PositionAssignmentCard teacher={data.teacher} />

      {data.teacher.certifications.length > 0 && (
        <Card title="الشهادات والاعتمادات" icon={Award}>
          <div className="flex-col gap-2">
            {data.teacher.certifications.map((c, i) => (
              <div key={i} className="cert-row">
                <Icon icon={Award} size={14} style={{ color: 'var(--gold)' }} />
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
              <EmojiIcon emoji={c.iconEmoji ?? '📘'} size={22} />
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

/* ═══════════════ Academic position assignment ═══════════════ */

const POSITION_LABEL: Record<'DEAN' | 'ASSOCIATE_DEAN' | 'DEPARTMENT_HEAD', string> = {
  DEAN: 'عميد كلّيّة',
  ASSOCIATE_DEAN: 'وكيل العميد',
  DEPARTMENT_HEAD: 'رئيس قسم',
};

function PositionAssignmentCard({
  teacher,
}: {
  teacher: {
    id: string;
    facultyId: string;
    departmentId: string;
    position: 'DEAN' | 'ASSOCIATE_DEAN' | 'DEPARTMENT_HEAD' | null;
    positionFacultyId: string | null;
    positionDepartmentId: string | null;
    appointedAt: string | null;
  };
}) {
  const facs = useFaculties();
  const assign = useAssignTeacherPosition(teacher.id);
  const [position, setPosition] = useState<'NONE' | 'DEAN' | 'ASSOCIATE_DEAN' | 'DEPARTMENT_HEAD'>(teacher.position ?? 'NONE');
  const [facultyId, setFacultyId] = useState<string>(teacher.positionFacultyId ?? teacher.facultyId);
  const [departmentId, setDepartmentId] = useState<string>(teacher.positionDepartmentId ?? teacher.departmentId);

  // Reset selectors whenever the underlying teacher changes (admin clicked another teacher).
  useEffect(() => {
    setPosition(teacher.position ?? 'NONE');
    setFacultyId(teacher.positionFacultyId ?? teacher.facultyId);
    setDepartmentId(teacher.positionDepartmentId ?? teacher.departmentId);
  }, [teacher.id, teacher.position, teacher.positionFacultyId, teacher.positionDepartmentId, teacher.facultyId, teacher.departmentId]);

  const facultyOptions = facs.data ?? [];
  const departmentsForFaculty = facultyOptions.find((f) => f.id === facultyId)?.departments ?? [];

  const dirty =
    position !== (teacher.position ?? 'NONE') ||
    (position === 'DEAN' && facultyId !== teacher.positionFacultyId) ||
    (position === 'ASSOCIATE_DEAN' && facultyId !== teacher.positionFacultyId) ||
    (position === 'DEPARTMENT_HEAD' && departmentId !== teacher.positionDepartmentId);

  const onSave = () => {
    let payload: AcademicPositionInput;
    if (position === 'NONE') payload = { position: null };
    else if (position === 'DEPARTMENT_HEAD') payload = { position, positionDepartmentId: departmentId };
    else payload = { position, positionFacultyId: facultyId };
    assign.mutate(payload);
  };

  return (
    <Card title="المنصب القياديّ" icon={Crown} subtitle="يُمنح المنصب بالتعيين الإداريّ — يضاف فوق دور الأستاذ ولا يستبدله">
      {teacher.position && teacher.appointedAt && (
        <div className="text-xxs text-subtle" style={{ marginBlockEnd: 'var(--sp-2)' }}>
          تمّ التعيين في {new Date(teacher.appointedAt).toLocaleDateString('ar-LY', { dateStyle: 'medium' })}
        </div>
      )}

      <div className="grid-2" style={{ gap: 'var(--sp-2)' }}>
        <div className="comp-form-field">
          <label>المنصب</label>
          <select
            className="auth-input"
            value={position}
            onChange={(e) => setPosition(e.target.value as typeof position)}
          >
            <option value="NONE">— بلا منصب —</option>
            <option value="DEAN">عميد كلّيّة</option>
            <option value="ASSOCIATE_DEAN">وكيل العميد</option>
            <option value="DEPARTMENT_HEAD">رئيس قسم</option>
          </select>
        </div>

        {(position === 'DEAN' || position === 'ASSOCIATE_DEAN') && (
          <div className="comp-form-field">
            <label>الكلّيّة</label>
            <select
              className="auth-input"
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
            >
              {facultyOptions.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        )}

        {position === 'DEPARTMENT_HEAD' && (
          <>
            <div className="comp-form-field">
              <label>الكلّيّة</label>
              <select
                className="auth-input"
                value={facultyId}
                onChange={(e) => {
                  setFacultyId(e.target.value);
                  const first = facultyOptions.find((f) => f.id === e.target.value)?.departments[0];
                  if (first) setDepartmentId(first.id);
                }}
              >
                {facultyOptions.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="comp-form-field">
              <label>القسم</label>
              <select
                className="auth-input"
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
              >
                {departmentsForFaculty.map((d) => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          </>
        )}
      </div>

      <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBlockStart: 'var(--sp-3)' }}>
        <button
          type="button"
          className="btn primary"
          onClick={onSave}
          disabled={assign.isPending || !dirty}
        >
          {assign.isPending ? 'جارٍ الحفظ…'
            : position === 'NONE' ? 'إلغاء التعيين'
            : `تعيين ${POSITION_LABEL[position]}`}
        </button>
        {position !== 'NONE' && teacher.position && (
          <button
            type="button"
            className="btn ghost"
            onClick={() => { setPosition('NONE'); }}
          >
            إنهاء المنصب الحاليّ
          </button>
        )}
      </div>
    </Card>
  );
}

/* ═══════════════ Governance scope (ADMIN / QUALITY) ═══════════════ */

function ScopeAssignmentCard({
  userId, role, scopeFacultyId, scopeFacultyName,
}: {
  userId: string;
  role: 'ADMIN' | 'QUALITY';
  scopeFacultyId: string | null;
  scopeFacultyName: string | null;
}) {
  const facs = useFaculties();
  const assign = useAssignUserScope(userId);
  const [scope, setScope] = useState<'UNIVERSITY' | 'FACULTY'>(scopeFacultyId ? 'FACULTY' : 'UNIVERSITY');
  const [facultyId, setFacultyId] = useState<string>(scopeFacultyId ?? '');

  useEffect(() => {
    setScope(scopeFacultyId ? 'FACULTY' : 'UNIVERSITY');
    setFacultyId(scopeFacultyId ?? '');
  }, [userId, scopeFacultyId]);

  const dirty =
    (scope === 'UNIVERSITY' && scopeFacultyId !== null) ||
    (scope === 'FACULTY' && facultyId !== scopeFacultyId && facultyId !== '');

  const onSave = () => {
    assign.mutate(scope === 'UNIVERSITY' ? null : facultyId);
  };

  const roleLabel = role === 'ADMIN' ? 'الإداريّ' : 'مكتب الجودة';

  return (
    <div style={{
      marginBlock: 'var(--sp-3)',
      padding: 'var(--sp-3)',
      borderRadius: 'var(--r-md)',
      background: 'var(--surface-2)',
      border: '1px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBlockEnd: 'var(--sp-2)' }}>
        <Icon icon={Building2} size={14} style={{ color: 'var(--accent)' }} />
        <strong className="text-sm">نطاق صلاحيّة {roleLabel}</strong>
      </div>
      <p className="text-xxs text-subtle" style={{ marginBlockEnd: 'var(--sp-3)' }}>
        النطاق الافتراضيّ على مستوى الجامعة. يمكن قَصره على كلّيّة واحدة فقط للحدّ من نطاق الإشراف.
      </p>
      <div className="grid-2" style={{ gap: 'var(--sp-2)' }}>
        <div className="comp-form-field">
          <label>النطاق</label>
          <select
            className="auth-input"
            value={scope}
            onChange={(e) => setScope(e.target.value as 'UNIVERSITY' | 'FACULTY')}
          >
            <option value="UNIVERSITY">على مستوى الجامعة</option>
            <option value="FACULTY">كلّيّة محدَّدة</option>
          </select>
        </div>
        {scope === 'FACULTY' && (
          <div className="comp-form-field">
            <label>الكلّيّة</label>
            <select
              className="auth-input"
              value={facultyId}
              onChange={(e) => setFacultyId(e.target.value)}
            >
              <option value="">اختر…</option>
              {facs.data?.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      {scopeFacultyName && (
        <div className="text-xxs text-subtle" style={{ marginBlockStart: 'var(--sp-2)' }}>
          النطاق الحاليّ: <strong>{scopeFacultyName}</strong>
        </div>
      )}
      <div style={{ marginBlockStart: 'var(--sp-3)' }}>
        <button
          type="button"
          className="btn primary sm"
          onClick={onSave}
          disabled={assign.isPending || !dirty}
        >
          {assign.isPending ? 'جارٍ الحفظ' : 'حفظ النطاق'}
        </button>
      </div>
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

        {(data.user.role === 'ADMIN' || data.user.role === 'QUALITY') && (
          <ScopeAssignmentCard
            userId={data.user.id}
            role={data.user.role as 'ADMIN' | 'QUALITY'}
            scopeFacultyId={data.user.scopeFacultyId}
            scopeFacultyName={data.user.scopeFaculty?.name ?? null}
          />
        )}

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
