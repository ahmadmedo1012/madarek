import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Users, GraduationCap, BookOpen, Activity, ShieldCheck, Server,
  Wifi, FlaskConical, Microscope, Radio, FileText, Search, Settings,
  Download, RefreshCw, Mail, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Card, MetricCard } from '../../components/primitives';
import { LoadingState, ErrorState, EmptyState } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { api, unwrap } from '../../lib/api';
import { useFaculties } from '../../hooks/useResources';

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
  const [facultyId, setFacultyId] = useState('');
  const facQ = useFaculties();

  const studentsQ = useQuery({
    queryKey: ['admin', 'students', page, q, facultyId],
    queryFn: async () => {
      const res = await api.get<{ data: AdminStudentRow[]; meta: PaginatedStudents['meta'] }>(
        '/admin/students',
        { params: { page, limit: 20, q: q || undefined, facultyId: facultyId || undefined } },
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
              onChange={(e) => { setQ(e.target.value); setPage(1); }}
              className="admin-students-input"
            />
          </div>
          <select
            className="admin-students-input"
            value={facultyId}
            onChange={(e) => { setFacultyId(e.target.value); setPage(1); }}
          >
            <option value="">كلّ الكلّيّات</option>
            {facQ.data?.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
          </select>
        </div>

        {studentsQ.isPending && <LoadingState />}
        {studentsQ.isError && <ErrorState error={studentsQ.error} onRetry={() => studentsQ.refetch()} />}
        {studentsQ.data && (
          <>
            <div className="admin-students-table-wrap">
              <table className="admin-students-table">
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
                    <tr><td colSpan={7}><EmptyState title="لا توجد نتائج" description="جرّب تعديل البحث أو الفلتر." /></td></tr>
                  )}
                  {studentsQ.data.data.map((s) => (
                    <tr key={s.id}>
                      <td>
                        <div className="admin-students-name">
                          <span className="avatar" style={{ width: 28, height: 28, fontSize: 11, ...(s.avatarColor ? { background: s.avatarColor } : {}) }}>
                            {s.avatarInitials ?? `${s.firstName[0]}${s.lastName[0]}`}
                          </span>
                          <div>
                            <div>{s.firstName} {s.lastName}</div>
                            <div className="admin-students-email">{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="font-mono">{s.studentProfile?.universityId ?? '—'}</td>
                      <td>
                        <div>{s.studentProfile?.faculty.name ?? '—'}</div>
                        <div className="text-subtle text-xxs">{s.studentProfile?.department.name ?? ''}</div>
                      </td>
                      <td>{s.studentProfile?.year ?? '—'}</td>
                      <td className="font-mono">{s.studentProfile?.gpa ?? '—'}</td>
                      <td className="font-mono">{s.studentProfile?.level ?? '—'}</td>
                      <td>
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

      {q.isPending && <LoadingState />}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
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
            <MetricCard icon={GraduationCap} label="مقرّرات رقميّة" value={q.data.materialsUploaded.toLocaleString('ar-LY')} color="purple" />
          </div>

          <div className="grid-2">
            <Card title="الاختبار الإلكترونيّ" icon={ShieldCheck}>
              <ul className="digital-stat-list">
                <DigitalStat label="اختبارات منشورة" value={q.data.onlineExams} />
                <DigitalStat label="محاولات أداء" value={q.data.examAttempts} />
              </ul>
            </Card>

            <Card title="التعلّم النشط" icon={FlaskConical}>
              <ul className="digital-stat-list">
                <DigitalStat label="جلسات معامل افتراضيّة" value={q.data.labSessions} />
                <DigitalStat label="جلسات بثّ مباشر" value={q.data.liveSessions} />
              </ul>
            </Card>

            <Card title="التعلّم الذاتيّ" icon={BookOpen}>
              <ul className="digital-stat-list">
                <DigitalStat label="تسجيلات MOOC" value={q.data.moocEnrollments} />
              </ul>
            </Card>

            <Card title="البحث العلميّ" icon={Microscope}>
              <ul className="digital-stat-list">
                <DigitalStat label="أوراق علميّة في النظام" value={q.data.researchPapers} />
              </ul>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}

function DigitalStat({ label, value }: { label: string; value: number }) {
  return (
    <li className="digital-stat-row">
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

      {q.isPending && <LoadingState />}
      {q.isError && <ErrorState error={q.error} onRetry={() => q.refetch()} />}
      {q.data && (
        <>
          <div className="grid-4">
            <MetricCard icon={FileText} label="إجمالي الأوراق" value={q.data.headline.totalPapers.toLocaleString('ar-LY')} color="brand" />
            <MetricCard icon={Microscope} label="منشورة في المكتبة" value={q.data.headline.publishedPapers.toLocaleString('ar-LY')} color="green" />
            <MetricCard icon={Users} label="إجمالي المستخدمين" value={q.data.headline.totalUsers.toLocaleString('ar-LY')} color="amber" />
            <MetricCard icon={GraduationCap} label="طلّاب نشطون" value={q.data.headline.activeStudents.toLocaleString('ar-LY')} color="purple" />
          </div>

          <Card title="تطوّر الإنتاج العلميّ — آخر ٦ أشهر" icon={Activity}>
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
          </Card>

          <Card title="المقرّرات الأعلى تفاعلاً" subtitle="حسب عدد التسجيلات" icon={BookOpen}>
            {q.data.topCourses.length === 0 ? (
              <EmptyState title="لا توجد بيانات" />
            ) : (
              <ol className="top-courses-list">
                {q.data.topCourses.map((c, i) => (
                  <li key={c.code} className="top-courses-row">
                    <span className="top-courses-rank">{i + 1}</span>
                    <div className="top-courses-body">
                      <div className="top-courses-name">{c.name}</div>
                      <div className="top-courses-meta">{c.code} · {c.lectures} محاضرة</div>
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
              <div className="settings-value">Postgres (Neon Serverless)</div>
            </div>
            <span className="pill on">متصلة</span>
          </div>
          <div className="settings-row">
            <div>
              <div className="settings-label">المصادقة</div>
              <div className="settings-value">JWT · ١٥د/٧ي</div>
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
            <li><a href="/admin/sync">مزامنة الكلّيّات والأقسام</a></li>
            <li><a href="/admin/teachers">صلاحيات أعضاء هيئة التدريس</a></li>
            <li><a href="/admin/reports">تقارير الإدارة</a></li>
            <li><a href="/colleges">صفحات الكلّيّات</a></li>
          </ul>
        </Card>
      </div>
    </div>
  );
}
