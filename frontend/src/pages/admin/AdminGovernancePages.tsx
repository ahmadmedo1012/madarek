/**
 * Admin governance pages.
 *
 *   /admin/teachers           list of teachers + verify + view suggestions
 *   /admin/permissions/:id    per-user capability editor (effective + overrides)
 *
 * Wave 16-E5 (audits 15-d P1-1 + 15-e P1-5): the teachers roster is
 * filtered/searched/paginated SERVER-side (GET /admin/users page/limit/q/
 * role — the old no-params call silently capped at 200 users and filtered
 * TEACHER client-side, so user #201 was invisible), and the position/scope
 * editors reset only on identity change, so an invalidation refetch can no
 * longer clobber selects the admin is editing toward the next save.
 */
import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ShieldCheck, GraduationCap, Award, ChevronLeft, ChevronRight, CheckCircle2,
  AlertCircle, Sparkles, Briefcase, Building2, Users, Crown, BookOpen,
  Search, X,
} from 'lucide-react';
import { Card, Badge, MetricCard, UserAvatar, AlertRow } from '../../components/primitives';
import {
  CardSkeleton, DetailSkeleton, ErrorState, EmptyState, Skeleton,
} from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import {
  useTeacherSuggestions,
  useFaculties,
  useAssignTeacherPosition,
  useAssignUserScope,
  apiErrorMessage,
  type AppCapability,
  type AcademicPositionInput,
} from '../../hooks/useResources';
import { api, unwrap } from '../../lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import '../../styles/training.css'; // .back-link family (D11 css split, 12-15)
import '../../styles/colleges.css'; // borrowed .comp-form-field (D14 css split, 13-17)

const DEGREE_LABEL: Record<string, string> = {
  BACHELORS: 'بكالوريوس', MASTERS: 'ماجستير', PHD: 'دكتوراه',
};
const RANK_LABEL: Record<string, string> = {
  LECTURER: 'مُعيد / محاضر',
  ASSISTANT_PROFESSOR: 'أستاذ مساعد',
  ASSOCIATE_PROFESSOR: 'أستاذ مشارك',
  PROFESSOR: 'أستاذ',
};
/** Arabic labels for user roles — raw enums (TEACHER/QUALITY…) never reach the UI. */
const ROLE_LABEL: Record<string, string> = {
  STUDENT: 'طالب',
  TEACHER: 'أستاذ',
  ADMIN: 'إداري',
  QUALITY: 'مكتب الجودة',
  OWNER: 'مالك',
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
/** Row of GET /admin/users (also the wire shape tests build). */
export interface AdminUserRow {
  id: string; email: string; firstName: string; lastName: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMIN' | 'QUALITY';
  avatarColor: string | null; avatarInitials: string | null;
  isActive: boolean; createdAt: string;
}
/** GET /admin/users wire shape — `{ data, meta }` (backend buildMeta). */
interface AdminUsersResponse {
  data: AdminUserRow[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * Server-side role filter + search + pagination (audit 15-d P1-1): the
 * backend paginates WITHIN the role (page/limit/q/role, limit ≤ 200) — the
 * old no-params call silently capped the roster at 200 users and the
 * TEACHER filter ran client-side, so the KPIs undercounted and user #201
 * was invisible. Key mirrors useOwnerUsers so the ['admin','users']
 * prefix invalidations (useSetCapability, useAssignUserScope) still reach
 * every parameterized page.
 */
function useAdminUsers(
  params: { page?: number; limit?: number; q?: string; role?: string } = {},
) {
  const { page = 1, limit = 20, q, role } = params;
  return useQuery({
    queryKey: ['admin', 'users', { page, limit, q, role }],
    queryFn: async () => {
      const res = await api.get<AdminUsersResponse>('/admin/users', {
        params: { page, limit, q, role },
      });
      return res.data;
    },
    // Keeps the current roster on screen while the next page/search
    // loads (AdminStudentsPage pattern) — no skeleton flash mid-browse.
    placeholderData: (prev) => prev,
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

interface CapabilityPayload {
  userId: string;
  capability: AppCapability;
  grant: boolean | null;
  reason?: string;
}
function useSetCapability() {
  const qc = useQueryClient();
  return useMutation({
    // The URL carries the user; the body stays { capability, grant, reason }
    // (the wire format the endpoint expects).
    mutationFn: ({ userId, ...body }: CapabilityPayload) =>
      unwrap(api.post(`/admin/users/${userId}/permissions`, body)),
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

/** Pages rendered either side of the current one before an ellipsis gap. */
const PAGE_NEIGHBORS = 2;

/**
 * Bounded page list for the roster's pagination footer — the wave-6-b
 * OwnerUsersPage helper (always page 1 and the last page, a window of
 * PAGE_NEIGHBORS around the current one, 'gap' markers where numbers
 * were elided; a 200-page result renders ≤ 2·PAGE_NEIGHBORS + 4 buttons).
 * Local twin, not a cross-page import (pages must not pull each other's
 * lazy chunks); tests pin it against the OwnerUsersPage original so the
 * two cannot drift before a shared-lib extraction.
 */
export function pageList(page: number, totalPages: number): Array<number | 'gap'> {
  const include = new Set<number>([1, totalPages]);
  const from = Math.max(1, page - PAGE_NEIGHBORS);
  const to = Math.min(totalPages, page + PAGE_NEIGHBORS);
  for (let p = from; p <= to; p++) include.add(p);
  const out: Array<number | 'gap'> = [];
  let prev = 0;
  for (const p of [...include].sort((a, b) => a - b)) {
    if (p - prev > 1) out.push('gap');
    out.push(p);
    prev = p;
  }
  return out;
}

/** Proper Arabic counted plural for the roster footer's teachers total. */
function teachersCountLabel(n: number): string {
  if (n === 0) return 'لا أساتذة';
  if (n === 1) return 'أستاذ واحد';
  if (n === 2) return 'أستاذان';
  if (n >= 3 && n <= 10) return `${n.toLocaleString('ar-LY')} أساتذة`;
  return `${n.toLocaleString('ar-LY')} أستاذاً`;
}

export function AdminTeachersPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Debounce the search input (OwnerUsersPage pattern) so the roster
  // query fires once typing pauses instead of on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  // Population count for the KPI — a dedicated server count (role filter,
  // one-row window), decoupled from the search exactly like
  // OwnerUsersPage's stats query. The old code counted the fetched
  // slice, which undercounted the moment the platform passed 200 users
  // (audit 15-d P1-1).
  const count = useAdminUsers({ page: 1, limit: 1, role: 'TEACHER' });
  // The roster itself — the TEACHER filter runs SERVER-side (the API
  // paginates within the role); the old client-side filter hid every
  // teacher past the silent 200-user cap (audit 15-d P1-1).
  const roster = useAdminUsers({
    page,
    limit: 20,
    role: 'TEACHER',
    q: debouncedSearch || undefined,
  });

  const teachers = roster.data?.data ?? [];
  const meta = roster.data?.meta;
  const totalPages = meta?.totalPages ?? 1;
  const isSearching = debouncedSearch !== '';

  // KPI honesty: '…' while loading, '—' on error — never a fake zero.
  // The count query's meta is the only server-backed teacher total.
  const teacherCount =
    count.isPending ? '…' : count.data ? count.data.meta.total.toLocaleString('ar-LY') : '—';

  const clearSearch = () => {
    setSearch('');
    setPage(1);
  };

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

      {/* Metrics — real values only: '…' while loading, '—' on error
          (never a fake zero). The old «نشطون» KPI counted the fetched
          slice; no endpoint counts active teachers, so it left with the
          client-side filter instead of lying at scale (audit 15-d P1-1). */}
      <div className="grid-2">
        <MetricCard icon={Users} label="عدد الأساتذة" value={teacherCount} color="brand" />
        <MetricCard icon={ShieldCheck} label="نظام التوثيق" value="فعّال" color="purple" change="مطابق لمتطلبات الجودة" />
      </div>

      <div className="grid-2-1">
        <Card title="قائمة الأساتذة" icon={Users}>
          {/* Borrowed admin-family search chrome from colleges.css (the
              AdminStudentsPage look) — the sheet is already imported for
              .comp-form-field. */}
          <div className="admin-students-search">
            <Icon icon={Search} size={14} />
            <input
              type="search"
              className="admin-students-input"
              placeholder="ابحث بالاسم أو البريد الإلكتروني…"
              aria-label="البحث في الأساتذة"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {roster.isPending ? (
            <TeacherListSkeleton rows={5} />
          ) : roster.isError ? (
            /* API-down must never read as "no teachers registered" — a
               retryable error, with the KPI degrading to '—' above. */
            <ErrorState
              error={roster.error}
              message="تعذّر تحميل قائمة الأساتذة"
              onRetry={() => roster.refetch()}
            />
          ) : teachers.length === 0 ? (
            <EmptyState
              icon={Users}
              title={isSearching ? 'لا نتائج مطابقة' : 'لم يتم تسجيل أساتذة بعد'}
              description={isSearching
                ? 'لم نجد أساتذة تطابق البحث الحالي.'
                : 'ستظهر القائمة فور تسجيل أول أستاذ في النظام.'}
              action={isSearching ? (
                <button type="button" className="btn ghost sm" onClick={clearSearch}>
                  <Icon icon={X} size={13} />
                  مسح البحث
                </button>
              ) : undefined}
            />
          ) : (
            <>
              <div className="flex-col gap-2">
                {teachers.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    className={`teacher-row${selectedId === t.id ? ' selected' : ''}`}
                    onClick={() => setSelectedId(t.id)}
                  >
                    <UserAvatar initials={t.avatarInitials ?? 'أس'} color={t.avatarColor ?? undefined} size={40} />
                    <div style={{ flex: 1, textAlign: 'start' }}>
                      <div className="teacher-row-name">{t.firstName} {t.lastName}</div>
                      <div className="teacher-row-email font-mono text-xxs"><bdi>{t.email}</bdi></div>
                    </div>
                    <Icon icon={ChevronLeft} size={14} className="text-subtle" />
                  </button>
                ))}
              </div>

              {/* Server-side pagination footer — the .table-pagination
                  system with a bounded page window, RTL-correct chevrons
                  (prev points right) and the honest "page X of Y · N
                  teachers" line: the OwnerUsersPage wave-6-b pattern
                  (.owner-page-gap borrowed from the eager owner.css). */}
              {meta && totalPages > 1 && (
                <div className="table-pagination">
                  <span>
                    الصفحة {page} من {totalPages} · {teachersCountLabel(meta.total)}
                  </span>
                  <div className="table-pagination-actions">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      aria-label="الصفحة السابقة"
                    >
                      <Icon icon={ChevronRight} size={14} aria-hidden />
                      السابق
                    </button>
                    {pageList(page, totalPages).map((item, i) =>
                      item === 'gap' ? (
                        <span key={`gap-${i}`} className="owner-page-gap" aria-hidden>…</span>
                      ) : (
                        <button
                          key={item}
                          type="button"
                          aria-current={item === page ? 'page' : undefined}
                          aria-label={`الصفحة ${item}`}
                          onClick={() => setPage(item)}
                        >
                          {item}
                        </button>
                      ),
                    )}
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                      aria-label="الصفحة التالية"
                    >
                      التالي
                      <Icon icon={ChevronLeft} size={14} aria-hidden />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>

        {selectedId ? (
          <TeacherProfileCard teacherId={selectedId} />
        ) : roster.isPending ? (
          <CardSkeleton lines={6} />
        ) : (
          <Card>
            <EmptyState
              icon={GraduationCap}
              title="اختر أستاذاً من القائمة"
              description="اعرض الملف الأكاديمي والمقررات المقترحة لتوثيقه أو إسناد منصب له."
            />
          </Card>
        )}
      </div>
    </div>
  );
}

/** Shape-matched skeleton for the teachers list (avatar + name + email rows). */
function TeacherListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="flex-col gap-2" aria-busy="true" aria-live="polite">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="teacher-row" style={{ cursor: 'default' }}>
          <Skeleton width={40} height={40} rounded="50%" />
          <div className="flex-col" style={{ flex: 1, gap: 6 }}>
            <Skeleton width="55%" height={12} />
            <Skeleton width="40%" height={10} />
          </div>
        </div>
      ))}
    </div>
  );
}


function TeacherProfileCard({ teacherId }: { teacherId: string }) {
  const { data, isLoading, isError, error, refetch } = useTeacherSuggestions(teacherId);
  const verify = useVerifyTeacher();

  if (isLoading) return <CardSkeleton lines={5} />;
  if (isError) {
    return (
      <Card>
        <ErrorState
          error={error}
          message="تعذّر تحميل الملف الأكاديمي"
          onRetry={() => refetch()}
        />
      </Card>
    );
  }
  if (!data) {
    return (
      <Card>
        <EmptyState
          icon={GraduationCap}
          title="لا يوجد ملف أستاذ"
          description="هذا الحساب لم يُستكمل ملفه الأكاديمي بعد."
        />
      </Card>
    );
  }

  return (
    <div className="flex-col gap-3">
      <Card title="الملف الأكاديمي" icon={GraduationCap} actions={
        data.teacher.verified
          ? <Badge color="green"><Icon icon={CheckCircle2} size={11} /> موثَّق</Badge>
          : <button
              type="button"
              className="btn primary sm"
              onClick={() => verify.mutate({ id: teacherId, verified: true })}
              disabled={verify.isPending}
            >
              {verify.isPending ? 'جارٍ التوثيق…' : 'توثيق الأستاذ'}
            </button>
      }>
        {verify.isError && (
          <AlertRow
            color="red"
            icon={AlertCircle}
            title="تعذّر توثيق الأستاذ"
            description={apiErrorMessage(verify.error, 'لم يستجب الخادم للطلب. أعد المحاولة بعد لحظات.')}
            actions={
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => verify.mutate({ id: teacherId, verified: true })}
                disabled={verify.isPending}
              >
                إعادة المحاولة
              </button>
            }
          />
        )}

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
          <div className="gov-keywords">
            <div className="text-xxs text-subtle" style={{ marginBottom: 4 }}>المجالات</div>
            <div className="gov-keywords-list">
              {data.teacher.subjectKeywords.map((k) => <Badge key={k}><bdi>{k}</bdi></Badge>)}
            </div>
          </div>
        )}

        <div className="gov-eligibility">
          <Icon icon={Sparkles} size={14} />
          <span>{data.eligibilityNote}</span>
        </div>
      </Card>

      {/* key = teacher identity → a fresh mount per teacher re-runs the
          useState initializers below (15-e P1-5's identity-reset rule). */}
      <PositionAssignmentCard key={data.teacher.id} teacher={data.teacher} />

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

      <Card title="المقررات المقترحة لتدريسها" icon={Briefcase} subtitle={data.suggestedCourses.length > 0 ? `${data.suggestedCourses.length} مقرر مرتب حسب القرب من تخصصه` : undefined}>
        <div className="flex-col gap-2">
          {data.suggestedCourses.map((c) => (
            <div key={c.id} className="suggested-course-row">
              <EmojiIcon emoji={c.iconEmoji} fallback={BookOpen} size={22} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="text-sm" style={{ fontWeight: 600 }}>{c.name}</div>
                <div className="text-xxs text-subtle">
                  <bdi>{c.code}</bdi> · {c.departmentName} · {c.facultyName}
                </div>
              </div>
              <div className="suggested-course-score">
                <Badge color="brand">{c.matchScore} درجة تطابق</Badge>
                <span className="text-xxs text-subtle">{c.reason}</span>
              </div>
            </div>
          ))}
          {data.suggestedCourses.length === 0 && (
            <EmptyState
              icon={Briefcase}
              title="لا توجد مقررات مطابقة بعد"
              description="أضف كلمات مفتاحية إلى ملف الأستاذ لتوليد اقتراحات أدق."
            />
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
    <div className="gov-fact">
      <span className="gov-fact-label">{label}</span>
      <span className={mono ? 'gov-fact-value font-mono' : 'gov-fact-value'}>
        <bdi>{value}</bdi>
      </span>
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
  // Local draft state, initialized once per mount — the parent keys this
  // card by teacher id, so switching teachers remounts it. There is
  // deliberately NO server-sync effect: an invalidation refetch (assign
  // or verify) delivers a new teacher object for the SAME id, and
  // resetting on it clobbered selects the admin had already changed
  // toward the next save (audit 15-e P1-5).
  const [position, setPosition] = useState<'NONE' | 'DEAN' | 'ASSOCIATE_DEAN' | 'DEPARTMENT_HEAD'>(teacher.position ?? 'NONE');
  const [facultyId, setFacultyId] = useState<string>(teacher.positionFacultyId ?? teacher.facultyId);
  const [departmentId, setDepartmentId] = useState<string>(teacher.positionDepartmentId ?? teacher.departmentId);

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
          <label htmlFor={`pos-${teacher.id}`}>المنصب</label>
          <select
            id={`pos-${teacher.id}`}
            className="input"
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
            <label htmlFor={`pos-fac-${teacher.id}`}>الكلّيّة</label>
            <select
              id={`pos-fac-${teacher.id}`}
              className="input"
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
              <label htmlFor={`pos-dfac-${teacher.id}`}>الكلّيّة</label>
              <select
                id={`pos-dfac-${teacher.id}`}
                className="input"
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
              <label htmlFor={`pos-dep-${teacher.id}`}>القسم</label>
              <select
                id={`pos-dep-${teacher.id}`}
                className="input"
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

      <div className="gov-form-actions">
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

      {assign.isError && (
        <AlertRow
          color="red"
          icon={AlertCircle}
          title="تعذّر حفظ التعيين"
          description={apiErrorMessage(assign.error, 'لم يستجب الخادم للطلب. أعد المحاولة بعد لحظات.')}
          actions={
            <button
              type="button"
              className="btn ghost sm"
              onClick={onSave}
              disabled={assign.isPending || !dirty}
            >
              إعادة المحاولة
            </button>
          }
        />
      )}
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
  // Local draft state, initialized once per mount — the parent keys this
  // card by user id. No server-sync effect on purpose: the capability
  // mutations invalidate ['admin','users'], whose prefix also refetches
  // this page's permissions query, and resetting on that refetch clobbered
  // a scope the admin was mid-way through changing (audit 15-e P1-5).
  const [scope, setScope] = useState<'UNIVERSITY' | 'FACULTY'>(scopeFacultyId ? 'FACULTY' : 'UNIVERSITY');
  const [facultyId, setFacultyId] = useState<string>(scopeFacultyId ?? '');

  const dirty =
    (scope === 'UNIVERSITY' && scopeFacultyId !== null) ||
    (scope === 'FACULTY' && facultyId !== scopeFacultyId && facultyId !== '');

  const onSave = () => {
    assign.mutate(scope === 'UNIVERSITY' ? null : facultyId);
  };

  const roleLabel = role === 'ADMIN' ? 'الإداريّ' : 'مكتب الجودة';

  return (
    <div className="gov-scope-card">
      <div className="gov-scope-head">
        <Icon icon={Building2} size={14} style={{ color: 'var(--accent)' }} />
        <strong className="text-sm">نطاق صلاحيّة {roleLabel}</strong>
      </div>
      <p className="gov-scope-note">
        النطاق الافتراضيّ على مستوى الجامعة. يمكن قَصره على كلّيّة واحدة فقط للحدّ من نطاق الإشراف.
      </p>
      <div className="grid-2" style={{ gap: 'var(--sp-2)' }}>
        <div className="comp-form-field">
          <label htmlFor={`scope-${userId}`}>النطاق</label>
          <select
            id={`scope-${userId}`}
            className="input"
            value={scope}
            onChange={(e) => setScope(e.target.value as 'UNIVERSITY' | 'FACULTY')}
          >
            <option value="UNIVERSITY">على مستوى الجامعة</option>
            <option value="FACULTY">كلّيّة محدَّدة</option>
          </select>
        </div>
        {scope === 'FACULTY' && (
          <div className="comp-form-field">
            <label htmlFor={`scope-fac-${userId}`}>الكلّيّة</label>
            <select
              id={`scope-fac-${userId}`}
              className="input"
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
      <div className="gov-form-actions">
        <button
          type="button"
          className="btn primary sm"
          onClick={onSave}
          disabled={assign.isPending || !dirty}
        >
          {assign.isPending ? 'جارٍ الحفظ…' : 'حفظ النطاق'}
        </button>
      </div>
      {assign.isError && (
        <AlertRow
          color="red"
          icon={AlertCircle}
          title="تعذّر حفظ النطاق"
          description={apiErrorMessage(assign.error, 'لم يستجب الخادم للطلب. أعد المحاولة بعد لحظات.')}
          actions={
            <button
              type="button"
              className="btn ghost sm"
              onClick={onSave}
              disabled={assign.isPending || !dirty}
            >
              إعادة المحاولة
            </button>
          }
        />
      )}
    </div>
  );
}

/* ═══════════════ Per-user permissions editor ═══════════════ */

/** JS cadence constant — clears the one-shot confirm pulse shortly after
 *  the CSS animation (var(--t-slower) + ring settle) has finished. Not a
 *  CSS duration, so the motion-token gate does not apply; keep it in the
 *  token scale's register when retuning madarek-perm-confirm. */
const PULSE_CLEAR_MS = 1200;

export function AdminPermissionsPage() {
  const { id } = useParams<{ id: string }>();
  const { data, isPending, isError, error, refetch } = useUserPermissions(id);
  const setCap = useSetCapability();
  /** One-shot confirmation pulse on the row whose capability just changed. */
  const [pulse, setPulse] = useState<{ cap: AppCapability; ok: boolean } | null>(null);
  /** Last attempted change — powers the inline retry after a failure. */
  const [lastAttempt, setLastAttempt] = useState<CapabilityPayload | null>(null);

  useEffect(() => {
    if (!pulse) return;
    const t = setTimeout(() => setPulse(null), PULSE_CLEAR_MS);
    return () => clearTimeout(t);
  }, [pulse]);

  if (isPending) return <DetailSkeleton />;
  // API-down must not infinite-skeleton (audit 0-e P0-5) — an honest,
  // recoverable error with a way back.
  if (isError || !data) {
    return (
      <div className="page">
        <Link to="/admin/teachers" className="back-link">
          <Icon icon={ChevronRight} size={14} /> العودة إلى الأساتذة
        </Link>
        <Card>
          <ErrorState
            error={error}
            message="تعذّر تحميل صلاحيات المستخدم"
            onRetry={() => refetch()}
          />
        </Card>
      </div>
    );
  }

  const allCaps = Object.keys(CAP_LABEL) as AppCapability[];
  const overridesByCap = new Map(data.overrides.map((o) => [o.capability, o]));
  const roleLabel = ROLE_LABEL[data.user.role] ?? data.user.role;

  const applyCap = (capability: AppCapability, grant: boolean | null) => {
    if (!id) return;
    const payload: CapabilityPayload = { userId: id, capability, grant };
    setLastAttempt(payload);
    setCap.mutate(payload, {
      // The authored moment: the changed row confirms itself with a
      // one-shot tone pulse while the badge flips.
      onSuccess: () => setPulse({ cap: capability, ok: grant !== false }),
    });
  };

  const retryLast = () => {
    if (!lastAttempt) return;
    setCap.mutate(lastAttempt, {
      onSuccess: () => setPulse({ cap: lastAttempt.capability, ok: lastAttempt.grant !== false }),
    });
  };

  return (
    <div className="page">
      <Link to="/admin/teachers" className="back-link">
        <Icon icon={ChevronRight} size={14} /> العودة إلى الأساتذة
      </Link>

      <Card title="إدارة الصلاحيات" icon={ShieldCheck} subtitle={<>{data.user.firstName} {data.user.lastName} · <bdi>{data.user.email}</bdi></>}>
        <div className="grid-3" style={{ marginBottom: 'var(--sp-3)' }}>
          <MetricCard
            icon={GraduationCap}
            label="الدور الحالي"
            value={ROLE_LABEL[data.user.role] ?? <bdi>{data.user.role}</bdi>}
            color="brand"
          />
          <MetricCard icon={CheckCircle2} label="صلاحيات فعلية" value={data.effective.length.toString()} color="green" />
          <MetricCard icon={AlertCircle} label="استثناءات يدوية" value={data.overrides.length.toString()} color="amber" />
        </div>

        {(data.user.role === 'ADMIN' || data.user.role === 'QUALITY') && (
          <ScopeAssignmentCard
            key={data.user.id}
            userId={data.user.id}
            role={data.user.role as 'ADMIN' | 'QUALITY'}
            scopeFacultyId={data.user.scopeFacultyId}
            scopeFacultyName={data.user.scopeFaculty?.name ?? null}
          />
        )}

        <div className="text-xxs text-subtle" style={{ marginBottom: 'var(--sp-2)' }}>
          الصلاحيات الافتراضية مرتبطة بالدور ({roleLabel}). يمكنك منح صلاحية إضافية أو سحب صلاحية افتراضية لهذا المستخدم تحديداً.
        </div>

        {setCap.isError && (
          <AlertRow
            color="red"
            icon={AlertCircle}
            title="تعذّر تحديث الصلاحية"
            description={apiErrorMessage(setCap.error, 'لم يستجب الخادم للطلب. أعد المحاولة بعد لحظات.')}
            actions={
              <button
                type="button"
                className="btn ghost sm"
                onClick={retryLast}
                disabled={setCap.isPending || !lastAttempt}
              >
                إعادة المحاولة
              </button>
            }
          />
        )}

        <div className="permissions-grid">
          {allCaps.map((cap) => {
            const fromRole = data.roleDefaults.includes(cap);
            const ovr = overridesByCap.get(cap);
            const effective = data.effective.includes(cap);
            const state: 'role' | 'granted' | 'revoked' | 'none' =
              ovr ? (ovr.grant ? 'granted' : 'revoked') : (fromRole ? 'role' : 'none');
            const pulsing = pulse?.cap === cap;

            return (
              <div
                key={cap}
                className={[
                  'perm-row',
                  `state-${state}`,
                  pulsing ? (pulse.ok ? 'confirm-pulse pulse-ok' : 'confirm-pulse pulse-neutral') : '',
                ].filter(Boolean).join(' ')}
              >
                <div className="perm-row-info">
                  <div className="perm-row-title">{CAP_LABEL[cap]}</div>
                  <code className="perm-row-key"><bdi>{cap}</bdi></code>
                  <div className="perm-row-state">
                    {state === 'role' && <Badge color="brand">من الدور</Badge>}
                    {state === 'granted' && <Badge color="green">ممنوحة يدوياً</Badge>}
                    {state === 'revoked' && <Badge color="amber">مسحوبة يدوياً</Badge>}
                    {state === 'none' && <Badge>غير مفعّلة</Badge>}
                  </div>
                </div>
                <div className="perm-row-actions">
                  {!effective && (
                    <button
                      type="button"
                      className="btn primary sm"
                      disabled={setCap.isPending}
                      onClick={() => applyCap(cap, true)}
                    >
                      منح
                    </button>
                  )}
                  {effective && fromRole && !ovr && (
                    <button
                      type="button"
                      className="btn ghost sm"
                      disabled={setCap.isPending}
                      onClick={() => applyCap(cap, false)}
                    >
                      سحب
                    </button>
                  )}
                  {ovr && (
                    <button
                      type="button"
                      className="btn ghost sm"
                      disabled={setCap.isPending}
                      onClick={() => applyCap(cap, null)}
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
