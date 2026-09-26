import { useEffect, useState, type ReactNode } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users, BookOpen, Activity, ShieldCheck, Server,
  Wifi, Radio, Settings, Search,
  Download, RefreshCw, Mail, ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { Card, MetricCard, Badge } from '../../components/primitives';
import { ErrorState, EmptyState, KpiSkeleton, TableSkeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { api, unwrap } from '../../lib/api';
import { useFaculties } from '../../hooks/useResources';
// D14 css split (13-17): colleges.css has owned the admin-extras surfaces
// (.admin-students-*, .admin-pagination, .digital-stat-*, .trend-table,
// .settings-*, .top-courses-*) since "Sub-project D" — see its ownership
// banner. It lands in the chunk shared with CollegePages / CompetitionsPages /
// LandingPage (the other consumers).
import '../../styles/colleges.css';

/* ───────────────────────── /admin/students ─────────────────────────
 *
 * Real student listing with search + faculty filter + pagination.
 * Replaces the AdminPlaceholder stub.
 */

interface AdminStudentRow {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  avatarColor?: string | null;
  avatarInitials?: string | null;
  createdAt: string;
  studentProfile: {
    universityId: string;
    year: number;
    gpa: string | number;
    totalXp: number;
    level: number;
    faculty: { id: string; name: string };
    department: { id: string; name: string };
  } | null;
}

interface PaginatedStudents {
  data: AdminStudentRow[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

/** Grouped counted plural for the roster footer — ar-LY grouping like
 *  the OwnerUsersPage/AdminGovernancePages footers (countAr renders raw
 *  digits; a five-digit students total wants the separators). */
function studentsCountLabel(n: number): string {
  if (n === 1) return 'طالب واحد';
  if (n === 2) return 'طالبان';
  if (n >= 3 && n <= 10) return `${n.toLocaleString('ar-LY')} طلاب`;
  return `${n.toLocaleString('ar-LY')} طالباً`;
}

export function AdminStudentsPage() {
  const [searchParams] = useSearchParams();
  // 5-B4 (5-A8 §5 row 5 landing craft): drill-down links arrive with
  // ?facultyId (the dashboard's chart bars / quick stats) or ?q — the
  // roster opens PRE-FILTERED instead of making the admin re-pick the
  // faculty the tile just named. Consumed once on mount (deep-link
  // semantics); later param changes don't fight the user's edits.
  const [page, setPage] = useState(1);
  const [q, setQ] = useState(() => searchParams.get('q') ?? '');
  const [debouncedQ, setDebouncedQ] = useState(() => searchParams.get('q') ?? '');
  const [facultyId, setFacultyId] = useState(() => searchParams.get('facultyId') ?? '');
  const facQ = useFaculties();
  // A8 P3-4: the empty-search state gets the same reset affordance its
  // teachers twin has — a dead end otherwise.
  const hasActiveFilters = debouncedQ !== '' || facultyId !== '';
  const clearSearch = () => {
    setQ('');
    setDebouncedQ('');
    setFacultyId('');
    setPage(1);
  };

  // Debounce the search input (OwnerUsersPage pattern) so the server query
  // fires once typing pauses instead of on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedQ(q.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [q]);

  const studentsQ = useQuery({
    queryKey: ['admin', 'students', page, debouncedQ, facultyId],
    queryFn: async () => {
      const res = await api.get<{ data: AdminStudentRow[]; meta: PaginatedStudents['meta'] }>(
        '/admin/students',
        { params: { page, limit: 20, q: debouncedQ || undefined, facultyId: facultyId || undefined } },
      );
      return { data: res.data.data, meta: res.data.meta };
    },
    placeholderData: (prev) => prev,
  });

  return (
    <div className="page admin-students">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">إدارة الطلاب</h1>
          <p className="page-subtitle">قائمة الطلاب المسجَّلين في الجامعة، مع البحث والتصفية حسب الكلّيّة.</p>
        </div>
      </header>

      <Card>
        <div className="admin-students-toolbar">
          <div className="admin-students-search">
            <Icon icon={Search} size={14} />
            <input
              type="search"
              placeholder="ابحث بالاسم أو البريد أو رقم القيد…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="admin-students-input"
              aria-label="البحث في الطلاب"
            />
          </div>
          <select
            className="admin-students-input"
            value={facultyId}
            onChange={(e) => { setFacultyId(e.target.value); setPage(1); }}
            disabled={facQ.isPending}
            aria-label="تصفية حسب الكلّيّة"
          >
            <option value="">{facQ.isPending ? 'جارٍ تحميل الكلّيّات…' : 'كلّ الكلّيّات'}</option>
            {facQ.data?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          {facQ.isError && (
            <button type="button" className="btn ghost sm" onClick={() => facQ.refetch()}>
              <Icon icon={RefreshCw} size={13} />
              إعادة تحميل الكلّيّات
            </button>
          )}
        </div>

        {studentsQ.isPending && <TableSkeleton rows={6} cols={7} />}
        {studentsQ.isError && <ErrorState error={studentsQ.error} message="تعذّر تحميل قائمة الطلاب" onRetry={() => studentsQ.refetch()} />}
        {studentsQ.data && (
          <>
            <div className="admin-students-table-wrap">
              <table className="admin-students-table tbl-stack">
                <thead>
                  <tr>
                    <th>الطالب</th>
                    <th>رقم القيد</th>
                    <th>الكلّيّة / القسم</th>
                    <th>السنة</th>
                    <th>المعدّل</th>
                    <th>المستوى</th>
                    <th>الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {studentsQ.data.data.length === 0 && (
                    <tr><td colSpan={7}><EmptyState title="لا توجد نتائج" description="جرّب تعديل البحث أو الفلتر لعرض نتائج أوسع." action={hasActiveFilters ? (
                      <button type="button" className="btn ghost sm" onClick={clearSearch}>
                        <Icon icon={X} size={13} />
                        مسح البحث
                      </button>
                    ) : undefined} /></td></tr>
                  )}
                  {studentsQ.data.data.map((s) => (
                    <tr key={s.id}>
                      <td data-label="الطالب">
                        <div className="admin-students-name">
                          <span className="avatar" style={{ width: 28, height: 28, fontSize: 11, ...(s.avatarColor ? { background: s.avatarColor } : {}) }}>
                            {s.avatarInitials ?? `${s.firstName[0]}${s.lastName[0]}`}
                          </span>
                          <div>
                            <div>{s.firstName} {s.lastName}</div>
                            <div className="admin-students-email"><bdi>{s.email}</bdi></div>
                          </div>
                        </div>
                      </td>
                      <td data-label="رقم القيد" className="font-mono">
                        {s.studentProfile?.universityId ? <bdi>{s.studentProfile.universityId}</bdi> : '—'}
                      </td>
                      <td data-label="الكلّيّة / القسم">
                        <div>{s.studentProfile?.faculty.name ?? '—'}</div>
                        <div className="text-subtle text-xxs">{s.studentProfile?.department.name ?? ''}</div>
                      </td>
                      <td data-label="السنة" className="font-mono">{s.studentProfile?.year ?? '—'}</td>
                      <td data-label="المعدّل" className="font-mono">{s.studentProfile?.gpa ?? '—'}</td>
                      <td data-label="المستوى" className="font-mono">{s.studentProfile?.level ?? '—'}</td>
                      <td data-label="الحالة">
                        <span className={`pill ${s.isActive ? 'on' : ''}`}>
                          {s.isActive ? 'نشط' : 'موقوف'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {studentsQ.data.data.length > 0 && (
              <div className="admin-pagination">
                <span className="text-xs text-muted">
                  الصفحة {studentsQ.data.meta.page} من {studentsQ.data.meta.totalPages} ·
                  {' '}{studentsCountLabel(studentsQ.data.meta.total)}
                </span>
                <div className="admin-pagination-actions">
                  <button
                    type="button"
                    className="btn ghost sm"
                    disabled={studentsQ.data.meta.page === 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <Icon icon={ChevronRight} size={14} />
                    السابق
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    disabled={studentsQ.data.meta.page >= studentsQ.data.meta.totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    التالي
                    <Icon icon={ChevronLeft} size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

/* ───────────────────────── /admin/digital ─────────────────────────
 *
 * Digital transformation snapshot. How much of the university's life
 * actually flows through the platform vs. paper.
 */

interface DigitalMetrics {
  totalUsers: number;
  activeUsers: number;
  adoptionPct: number;
  onlineExams: number;
  examAttempts: number;
  labSessions: number;
  moocEnrollments: number;
  researchPapers: number;
  liveSessions: number;
  materialsUploaded: number;
}

export function AdminDigitalPage() {
  const q = useQuery({
    queryKey: ['admin', 'digital'],
    queryFn: () => unwrap<DigitalMetrics>(api.get('/admin/digital')),
    staleTime: 60_000,
  });

  return (
    <div className="page admin-digital">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">التحوّل الرقميّ</h1>
          <p className="page-subtitle">مؤشّرات تبنّي المنصّة الرقميّة عبر مكوّنات الجامعة.</p>
        </div>
      </header>

      {q.isPending && (
        <>
          <KpiSkeleton />
          <TableSkeleton rows={6} cols={3} />
        </>
      )}
      {q.isError && <ErrorState error={q.error} message="تعذّر تحميل مؤشّرات التحوّل الرقميّ" onRetry={() => q.refetch()} />}
      {q.data && (
        <>
          <div className="grid-4">
            <MetricCard icon={Users} label="إجمالي الحسابات" value={q.data.totalUsers.toLocaleString('ar-LY')} color="brand" />
            <MetricCard icon={Activity} label="حسابات نشطة" value={q.data.activeUsers.toLocaleString('ar-LY')} color="green" />
            <MetricCard
              icon={Wifi}
              label="نسبة التبنّي"
              value={`${q.data.adoptionPct}%`}
              change={`${q.data.activeUsers}/${q.data.totalUsers}`}
              color="amber"
            />
            <MetricCard icon={BookOpen} label="ملفات تعليمية مرفوعة" value={q.data.materialsUploaded.toLocaleString('ar-LY')} color="purple" />
          </div>

          {/* 5-A8 §6 step 4 (route identity): the four single-stat cards
              fold into ONE «تبنّي المكوّنات» register — this was the third
              consecutive 4-identical-tiles page in the nav. One card, one
              scanning rhythm, mobile-safe via tbl-stack.
              §6 step 6 (rhythm): the register is the page's primary
              section — it takes the breath after the KPI band. */}
          <Card
            style={{ marginBlockStart: 'var(--sp-9)' }}
            title="تبنّي المكوّنات"
            icon={ShieldCheck}
            subtitle="ما يجري فعلاً عبر المنصّة في كل مكوّن"
          >
            <div className="table-wrap">
              <table className="table tbl-stack">
                <thead>
                  <tr>
                    <th>المكوّن</th>
                    <th>المؤشّر</th>
                    <th className="admin-table-num" style={{ width: 120 }}>القيمة</th>
                  </tr>
                </thead>
                <tbody>
                  <DigitalRow component="الاختبار الإلكترونيّ" label="اختبارات منشورة" value={q.data.onlineExams} />
                  <DigitalRow component="الاختبار الإلكترونيّ" label="محاولات أداء" value={q.data.examAttempts} />
                  <DigitalRow component="التعلّم النشط" label="جلسات معامل افتراضيّة" value={q.data.labSessions} />
                  <DigitalRow component="التعلّم النشط" label="جلسات بثّ مباشر" value={q.data.liveSessions} />
                  <DigitalRow component="التعلّم الذاتيّ" label={<>تسجيلات <bdi>MOOC</bdi></>} value={q.data.moocEnrollments} />
                  <DigitalRow component="البحث العلميّ" label="أوراق علميّة في النظام" value={q.data.researchPapers} />
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}

function DigitalRow({ component, label, value }: { component: string; label: ReactNode; value: number }) {
  return (
    <tr>
      <td data-label="المكوّن"><span className="text-sm text-muted">{component}</span></td>
      <td data-label="المؤشّر">{label}</td>
      <td className="admin-table-num font-mono" data-label="القيمة">{value.toLocaleString('ar-LY')}</td>
    </tr>
  );
}

/* ───────────────────────── /admin/analysis ─────────────────────────
 *
 * 5-B4 (5-A8 §6 step 2): the analysis page was a third arrangement of
 * the same /admin/reports bundle — the same four KPIs re-labeled plus
 * the same trend series as a table (audit route score 6.0). It folds
 * into /admin/reports as the trend's «جدول» view; this route now
 * redirects there with the table view pre-set so old bookmarks keep
 * working. NAV/RTE NOTE for 5-B5/orchestrator: remove the nav item
 * (lib/nav.ts «تحليل الأداء»), the App.tsx route row and the AppShell
 * title-map entry — listed in the 5-B4 worklog.
 */

export function AdminAnalysisPage() {
  return <Navigate to="/admin/reports?trend=table" replace />;
}

/* ───────────────────────── /admin/settings ─────────────────────────
 *
 * Settings landing. Keeps the system-level facts visible even before
 * the per-setting endpoints are wired. Infrastructure rows are driven
 * by the real /health probe (A8 P2-6): the old hardcoded «متصلة/آمنة»
 * pills and the wrong «Postgres (Neon Serverless)» vendor line were
 * unfalsifiable decoration next to honest «قيد التطوير» copy.
 */

/** GET /api/v1/health payload (raw — not the {data} envelope). */
interface HealthStatus {
  ok: boolean;
  dbLatencyMs: number;
}

export function AdminSettingsPage() {
  const health = useQuery({
    queryKey: ['admin', 'health'],
    queryFn: async () => {
      const res = await api.get<HealthStatus>('/health');
      return res.data;
    },
    staleTime: 30_000,
    retry: 1,
  });
  const dbOk = health.isSuccess && health.data?.ok === true;

  return (
    <div className="page admin-settings">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">إعدادات المنصّة</h1>
          <p className="page-subtitle">إعدادات تشغيليّة على مستوى الجامعة. تفعيل المعدِّلات الفرديّة قيد التطوير.</p>
        </div>
      </header>

      <div className="grid-2">
        <Card title="الهويّة المؤسّسيّة" icon={Settings}>
          <div className="settings-row">
            <div>
              <div className="settings-label">اسم المنصّة</div>
              <div className="settings-value">منصّة الزاوية للتعليم الذكيّ</div>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">اللغة الافتراضيّة</div>
              <div className="settings-value">العربيّة (RTL)</div>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">الشعار</div>
              <div className="settings-value">جامعة الزاوية · وزارة التعليم العالي</div>
            </div>
          </div>
        </Card>

        <Card title="البنية التشغيليّة" icon={Server}>
          <div className="settings-row">
            <div>
              <div className="settings-label">قاعدة البيانات</div>
              <div className="settings-value">
                {health.isPending
                  ? 'جارٍ التحقق…'
                  : dbOk
                    ? `متصلة · زمن الاستجابة ${health.data!.dbLatencyMs} مث`
                    : 'تعذّر التحقق من الاتصال'}
              </div>
            </div>
            {!health.isPending && (
              <Badge color={dbOk ? 'green' : 'red'}>{dbOk ? 'متصلة' : 'غير متاحة'}</Badge>
            )}
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">المصادقة</div>
              <div className="settings-value">صلاحية الرمز 15 دقيقة · التحديث كل 7 أيام</div>
            </div>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">معدّل الطلبات</div>
              <div className="settings-value">حدّ عامّ 200 طلب في الدقيقة · مصادقة 30 طلباً في الدقيقة</div>
            </div>
          </div>
        </Card>

        <Card title="عمليّات النظام" icon={RefreshCw}>
          <p className="text-sm text-muted" style={{ marginBlockEnd: 'var(--sp-3)' }}>
            عمليّات تنفيذيّة على مستوى المنصّة. للتنفيذ الفعليّ، استخدم لوحة المالك.
          </p>
          <div className="settings-actions">
            <button type="button" className="btn ghost sm" disabled>
              <Icon icon={RefreshCw} size={14} />
              مزامنة بيانات الجامعة
            </button>
            <button type="button" className="btn ghost sm" disabled>
              <Icon icon={Download} size={14} />
              تصدير سجلّ النشاط
            </button>
            <button type="button" className="btn ghost sm" disabled>
              <Icon icon={Mail} size={14} />
              بثّ إعلان عامّ
            </button>
            <button type="button" className="btn ghost sm" disabled>
              <Icon icon={Radio} size={14} />
              فحص الصحّة العامّة
            </button>
          </div>
        </Card>

        <Card title="الموارد المرتبطة" icon={ShieldCheck}>
          <ul className="settings-links">
            <li><Link to="/admin/sync">مزامنة الكلّيّات والأقسام</Link></li>
            <li><Link to="/admin/teachers">صلاحيات أعضاء هيئة التدريس</Link></li>
            <li><Link to="/admin/reports">تقارير الإدارة</Link></li>
            {/* 5-B5 hand-off (one-name-per-surface): the surface's own
                title is «كلّيّات الجامعة» — the former «صفحات الكلّيّات»
                label drifted from the folded reality (the public
                colleges + leaderboard page). */}
            <li><Link to="/colleges">كلّيّات الجامعة</Link></li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
