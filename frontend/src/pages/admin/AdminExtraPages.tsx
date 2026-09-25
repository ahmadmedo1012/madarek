import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Users, GraduationCap, BookOpen, Activity, ShieldCheck, Server,
  Wifi, FlaskConical, Microscope, Radio, FileText, Search, Settings,
  Download, RefreshCw, Mail, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Card, MetricCard } from '../../components/primitives';
import { ErrorState, EmptyState, KpiSkeleton, CardSkeleton, TableSkeleton } from '../../components/primitives/States';
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

export function AdminStudentsPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState('');
  const [debouncedQ, setDebouncedQ] = useState('');
  const [facultyId, setFacultyId] = useState('');
  const facQ = useFaculties();

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
            aria-label="تصفية حسب الكلية"
          >
            <option value="">{facQ.isPending ? 'جارٍ تحميل الكليات…' : 'كلّ الكلّيّات'}</option>
            {facQ.data?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
          {facQ.isError && (
            <button type="button" className="btn ghost sm" onClick={() => facQ.refetch()}>
              <Icon icon={RefreshCw} size={13} />
              إعادة تحميل الكليات
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
                    <tr><td colSpan={7}><EmptyState title="لا توجد نتائج" description="جرّب تعديل البحث أو الفلتر لعرض نتائج أوسع." /></td></tr>
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
                  {' '}{studentsQ.data.meta.total.toLocaleString('ar-LY')} طالباً
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
          <CardSkeleton lines={5} />
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
            <MetricCard icon={BookOpen} label="موادّ تعليمية مرفوعة" value={q.data.materialsUploaded.toLocaleString('ar-LY')} color="purple" />
          </div>

          <div className="grid-2">
            <Card title="الاختبار الإلكترونيّ" icon={ShieldCheck}>
              <ul className="digital-stat-list">
                <DigitalStat label="اختبارات منشورة" value={q.data.onlineExams} index={0} />
                <DigitalStat label="محاولات أداء" value={q.data.examAttempts} index={1} />
              </ul>
            </Card>

            <Card title="التعلّم النشط" icon={FlaskConical}>
              <ul className="digital-stat-list">
                <DigitalStat label="جلسات معامل افتراضيّة" value={q.data.labSessions} index={0} />
                <DigitalStat label="جلسات بثّ مباشر" value={q.data.liveSessions} index={1} />
              </ul>
            </Card>

            <Card title="التعلّم الذاتيّ" icon={BookOpen}>
              <ul className="digital-stat-list">
                <DigitalStat label={<>تسجيلات <bdi>MOOC</bdi></>} value={q.data.moocEnrollments} index={0} />
              </ul>
            </Card>

            <Card title="البحث العلميّ" icon={Microscope}>
              <ul className="digital-stat-list">
                <DigitalStat label="أوراق علميّة في النظام" value={q.data.researchPapers} index={0} />
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function DigitalStat({ label, value, index }: { label: ReactNode; value: number; index: number }) {
  return (
    <li className="digital-stat-row" style={{ '--stagger-i': index } as CSSProperties}>
      <span className="text-sm text-muted">{label}</span>
      <strong className="font-mono">{value.toLocaleString('ar-LY')}</strong>
    </li>
  );
}

/* ───────────────────────── /admin/analysis ─────────────────────────
 *
 * Performance analysis — pulls the existing /admin/reports bundle and
 * re-arranges it as a focused analysis page (publishing trend + top
 * courses) instead of duplicating the dashboard.
 */

interface AdminReports {
  headline: { totalPapers: number; publishedPapers: number; totalUsers: number; activeStudents: number };
  paperTrend: { month: string; submitted: number; graded: number; published: number }[];
  topCourses: { code: string; name: string; enrollments: number; lectures: number }[];
}

export function AdminAnalysisPage() {
  const q = useQuery({
    queryKey: ['admin', 'reports'],
    queryFn: () => unwrap<AdminReports>(api.get('/admin/reports')),
    staleTime: 60_000,
  });

  return (
    <div className="page admin-analysis">
      <header className="page-header">
        <div className="page-title-block">
          <h1 className="page-title">تحليل الأداء</h1>
          <p className="page-subtitle">نظرة معمَّقة على الإنتاج العلميّ والمقرّرات الأعلى تفاعلاً.</p>
        </div>
      </header>

      {q.isPending && (
        <>
          <KpiSkeleton />
          <CardSkeleton lines={6} />
        </>
      )}
      {q.isError && <ErrorState error={q.error} message="تعذّر تحميل بيانات تحليل الأداء" onRetry={() => q.refetch()} />}
      {q.data && (
        <>
          <div className="grid-4">
            <MetricCard icon={FileText} label="إجمالي الأوراق" value={q.data.headline.totalPapers.toLocaleString('ar-LY')} color="brand" />
            <MetricCard icon={Microscope} label="منشورة في المكتبة" value={q.data.headline.publishedPapers.toLocaleString('ar-LY')} color="green" />
            <MetricCard icon={Users} label="إجمالي المستخدمين" value={q.data.headline.totalUsers.toLocaleString('ar-LY')} color="amber" />
            <MetricCard icon={GraduationCap} label="طلّاب نشطون" value={q.data.headline.activeStudents.toLocaleString('ar-LY')} color="purple" />
          </div>

          <Card title="تطوّر الإنتاج العلميّ — آخر ٦ أشهر" icon={Activity}>
            {q.data.paperTrend.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="لا توجد بيانات نشر بعد"
                description="ستظهر حركة الأوراق هنا بعد رفع أول بحث إلى المنصة."
              />
            ) : (
              <div className="trend-table-wrap">
                <table className="trend-table">
                  <thead>
                    <tr>
                      <th>الشهر</th>
                      <th>مُقدَّم</th>
                      <th>تمّ تقييمه</th>
                      <th>منشور</th>
                    </tr>
                  </thead>
                  <tbody>
                    {q.data.paperTrend.map((row, i) => (
                      <tr key={i}>
                        <td>{row.month}</td>
                        <td className="font-mono">{row.submitted}</td>
                        <td className="font-mono">{row.graded}</td>
                        <td className="font-mono">{row.published}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="المقرّرات الأعلى تفاعلاً" subtitle="حسب عدد التسجيلات" icon={BookOpen}>
            {q.data.topCourses.length === 0 ? (
              <EmptyState
                icon={BookOpen}
                title="لا توجد مقرّرات بتسجيلات بعد"
                description="ستظهر هنا أعلى المقرّرات تفاعلاً فور تسجيل أيّ طالب."
              />
            ) : (
              <ol className="top-courses-list">
                {q.data.topCourses.map((c, i) => (
                  <li
                    key={c.code}
                    className="top-courses-row"
                    style={{ '--stagger-i': Math.min(i, 6) } as CSSProperties}
                  >
                    <span className="top-courses-rank">{i + 1}</span>
                    <div className="top-courses-body">
                      <div className="top-courses-name">{c.name}</div>
                      <div className="top-courses-meta"><bdi>{c.code}</bdi> · {c.lectures} محاضرة</div>
                    </div>
                    <strong className="font-mono">{c.enrollments.toLocaleString('ar-LY')} تسجيل</strong>
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

/* ───────────────────────── /admin/settings ─────────────────────────
 *
 * Static settings page. Keeps the system-level controls visible even
 * before the per-setting endpoints are wired (cache, branding, sync).
 */

export function AdminSettingsPage() {
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
              <div className="settings-value"><bdi>Postgres (Neon Serverless)</bdi></div>
            </div>
            <span className="pill on">متصلة</span>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">المصادقة</div>
              <div className="settings-value"><bdi>JWT · ١٥د/٧ي</bdi></div>
            </div>
            <span className="pill on">آمنة</span>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">معدّل الطلبات</div>
              <div className="settings-value">عامّ ٢٠٠/د · مصادقة ٣٠/د</div>
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
            <li><Link to="/colleges">صفحات الكلّيّات</Link></li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
