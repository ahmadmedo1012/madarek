import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  Plus, Landmark, ChevronDown, ChevronLeft, ChevronRight, Building2, Users,
  AlertTriangle, X, ArrowLeft, BookOpen,
} from 'lucide-react';
import { Card, Badge, AlertRow, FormField } from '../../components/primitives';
import { StatStrip } from '../../components/primitives/Ledger';
import { EmptyState, ErrorState, TableSkeleton, CardSkeleton, Skeleton } from '../../components/primitives/States';
import { Icon } from '../../components/Icon';
import { EmojiIcon } from '../../components/EmojiIcon';
import { Modal } from '../../components/overlays/Modal';
import { toast } from '../../lib/toast';
import {
  useAdminFaculties, useAdminCourses, useCreateFaculty, useCreateDepartment,
  useCreateCourse, useCreateOffering, useOwnerInstitutionTeachers,
  apiErrorMessage,
  type AdminFaculty, type AdminCourse,
  type FacultyFormInput, type DepartmentFormInput, type CourseFormInput, type OfferingFormInput,
} from '../../hooks/useResources';
import { useOwnerInstitutions } from '../../hooks/useInstitutions';
import { useEntityPageTitle } from '../../components/layout/AppShell';
import { countAr } from '../../lib/format';
import type { OwnerInstitution } from '../../lib/api';
// The roster chrome (admin-students-toolbar family) the courses table
// consumes — the same CSS AdminCoursesPage loads; the faculty cards
// read the global components.css families (admin-faculty-*).
import '../../styles/admin.css';

/**
 * r181 (phase-8 owner setup) — the OWNER's institution detail &
 * academic setup page (route /owner/institutions/:slug).
 *
 * The r180 academic-supply-chain round built the OWNER write paths
 * (?institutionSlug= faculties/departments, institutionId course
 * create, global offering create) but left them API-surface-only —
 * no owner console screen reached them. This page closes the loop:
 * starting from the institutions console, the OWNER opens ONE
 * institution and builds its whole academic structure inside its
 * context — faculties → departments → courses → offerings — with
 * every mutation explicitly bound to the selected institution
 * (the slug rides every request; the backend re-verifies each one,
 * the frontend is never the authorization boundary).
 *
 * Contract decisions:
 *  · The institution row comes from the owner listing
 *    (useOwnerInstitutions → find by slug) — no dedicated GET, the
 *    console's own source of truth; a missing slug renders the honest
 *    not-found state with the way back.
 *  · A SUSPENDED institution shows a clear banner and DISABLES every
 *    academic write (the backend 400s them — the UI says why first).
 *  · The faculties/departments listing is the /admin/faculties?
 *    institutionSlug= projection (r181 scope); the courses table is
 *    /admin/courses?institutionSlug= (r181); the offering teacher
 *    picker is /owner/users?role=TEACHER&institutionSlug= (r181) —
 *    the exact population POST /offerings accepts.
 *  · Every modal follows the AdminCoursesPage grammar (FormField
 *    canon, settle-time AlertRow, per-target draft reset).
 */

const STATUS_LABELS: Record<OwnerInstitution['status'], string> = {
  ACTIVE: 'نشطة',
  SUSPENDED: 'معلّقة',
};

/* ── The faculty census (r183-B5, A9 wave-A P1) ─────────────────── */

/** One renderable faculty card: the row + how many identical empty
 * seed rows were folded into it (1 = nothing folded). Exported pure
 * so the fold rule is pinned DB-free (the pageList precedent). */
export interface FacultyCensusEntry {
  faculty: AdminFaculty;
  duplicateCount: number;
}

/**
 * r183-B5 (A9 wave-A P1 — the duplicate seed census): the raw
 * /admin/faculties listing may carry byte-identical seed rows — same
 * name AND city (the documented uniqueness key) with zero counts —
 * which rendered as N indistinguishable «0 قسماً 0 مقرّراً 0 طالباً»
 * cards burying the real faculties. The census folds every such
 * duplicate group into ONE card (annotated «سجلّ مكرّر ×N» — the DB
 * rows stay untouched, the fold is display-only and says so); rows
 * with real content are never folded, and same-name faculties in
 * different cities render separately (the card meta now shows the
 * city, so they are distinguishable at last). Pure + order-preserving.
 */
export function dedupeFacultyCensus(
  faculties: ReadonlyArray<AdminFaculty>,
): FacultyCensusEntry[] {
  const groups = new Map<string, AdminFaculty[]>();
  for (const f of faculties) {
    const key = `${f.name.trim()}\u0000${f.city.trim()}`;
    const bucket = groups.get(key);
    if (bucket) bucket.push(f);
    else groups.set(key, [f]);
  }
  const out: FacultyCensusEntry[] = [];
  for (const bucket of groups.values()) {
    const foldable =
      bucket.length > 1 &&
      bucket.every(
        (f) => f.departmentCount === 0 && f.courseCount === 0 && f.studentCount === 0,
      );
    if (foldable) {
      // Non-empty by construction (buckets are created with the first
      // row) — the assertion is the family's indexed-access idiom.
      out.push({ faculty: bucket[0]!, duplicateCount: bucket.length });
    } else {
      for (const f of bucket) out.push({ faculty: f, duplicateCount: 1 });
    }
  }
  return out;
}

/* ── A faculty card in the owner's institution context ─────────── */

function OwnerFacultyCard({
  faculty, open, onToggle, onAddDepartment, writesDisabled, duplicateCount = 1,
}: {
  faculty: AdminFaculty;
  open: boolean;
  onToggle: () => void;
  onAddDepartment: () => void;
  writesDisabled: boolean;
  /** >1 when identical empty seed rows were folded into this card
   * (r183-B5, A9 P1) — the badge names the fold, the DB rows stay. */
  duplicateCount?: number;
}) {
  const hasDepts = faculty.departments.length > 0;
  const head = (
    <>
      <span className="admin-faculty-icon">
        <EmojiIcon emoji={faculty.iconEmoji ?? undefined} fallback={Building2} size={22} />
      </span>
      <div className="admin-faculty-body">
        <div className="admin-faculty-titles">
          <span className="admin-faculty-name">{faculty.name}</span>
          {duplicateCount > 1 && (
            <span
              title={`${duplicateCount} سجلات متطابقة بلا محتوى في قاعدة البيانات — تُعرض هنا مجمّعةً في بطاقة واحدة، والسجلات كما هي`}
            >
              <Badge>سجلّ مكرّر ×{duplicateCount}</Badge>
            </span>
          )}
          {faculty.nameEn && (
            <span className="admin-faculty-name-en font-mono text-xs text-subtle">
              · <bdi>{faculty.nameEn}</bdi>
            </span>
          )}
        </div>
        <div className="admin-faculty-meta">
          {/* r183-B5 (A9 P1): the city rides every card — name+city is
              the uniqueness key, so same-name faculties in different
              cities are finally distinguishable. */}
          <span>{faculty.city.trim() || '—'}</span>
          <span>{countAr(faculty.departmentCount, ['قسم واحد', 'قسمان', 'أقسام', 'قسماً'])}</span>
          <span>{countAr(faculty.courseCount, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}</span>
          <span>{countAr(faculty.studentCount, ['طالب واحد', 'طالبان', 'طلاب', 'طالباً'])}</span>
        </div>
      </div>
      {hasDepts && (
        <Icon
          icon={ChevronDown}
          size={16}
          style={{
            color: 'var(--text-muted)',
            marginInlineStart: 'auto',
            flexShrink: 0,
            transition: 'transform var(--t-base) var(--ease)',
            transform: open ? 'rotate(180deg)' : 'none',
          }}
        />
      )}
    </>
  );
  return (
    <div className="admin-faculty-card">
      {hasDepts ? (
        <button
          type="button"
          className={`admin-faculty-head${open ? ' has-depts' : ''}`}
          aria-expanded={open}
          aria-controls={`owner-inst-depts-${faculty.id}`}
          onClick={onToggle}
          title={open ? 'طيّ الأقسام' : 'توسيع الأقسام'}
          style={{ width: '100%', textAlign: 'start', padding: 0 }}
        >
          {head}
        </button>
      ) : (
        <div className="admin-faculty-head">{head}</div>
      )}
      {hasDepts && open && (
        <div className="admin-faculty-depts" id={`owner-inst-depts-${faculty.id}`}>
          {faculty.departments.map((d) => (
            <div key={d.id} className="admin-faculty-dept">
              <span className="admin-faculty-dept-name">{d.name}</span>
              <span className="admin-faculty-dept-meta">
                {countAr(d.courses, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])} · {countAr(d.teachers, ['مدرّس واحد', 'مدرّسان', 'مدرّسون', 'مدرّساً'])}
              </span>
            </div>
          ))}
        </div>
      )}
      <div className="flex items-center" style={{ marginBlockStart: 'var(--sp-3)' }}>
        <button
          type="button"
          className="btn ghost sm"
          onClick={onAddDepartment}
          disabled={writesDisabled}
          title={writesDisabled ? 'التعديلات الأكاديمية متاحة للمؤسسات النشطة فقط' : `إضافة قسم إلى «${faculty.name}»`}
        >
          <Icon icon={Plus} size={13} />
          إضافة قسم
        </button>
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────────────── */

export function OwnerInstitutionDetailPage() {
  const { slug: routeSlug } = useParams<{ slug: string }>();
  const listing = useOwnerInstitutions();
  const institutions = listing.data ?? [];
  const institution = routeSlug
    ? institutions.find((i) => i.slug === routeSlug) ?? null
    : null;
  // r183-B6 (A4 P3-4): the tab names the INSTITUTION, not «إعداد مؤسسة»
  // (the page's h1 already carries it — now the tab agrees).
  useEntityPageTitle(institution?.name ?? null);

  /* Every academic mutation binds to the SELECTED institution's slug —
   * the r181 hook extensions thread it into the request query/body.
   * They stay inert (undefined-bound) until the row resolves. */
  const slug = institution?.slug;
  const suspended = institution?.status === 'SUSPENDED';
  const facultiesQ = useAdminFaculties(slug);
  const createFaculty = useCreateFaculty(slug);
  const createDepartment = useCreateDepartment(slug);
  const createCourse = useCreateCourse(institution?.id);
  const createOffering = useCreateOffering();
  const teachersQ = useOwnerInstitutionTeachers(slug ?? null, true);

  /* ── Courses listing (the /admin/courses?institutionSlug= view) ── */
  const [coursePage, setCoursePage] = useState(1);
  const coursesQ = useAdminCourses({ page: coursePage, limit: 20, institutionSlug: slug });
  const courses = coursesQ.data?.data ?? [];
  const coursesMeta = coursesQ.data?.meta;

  /* ── Faculty create modal state ───────────────────────────────── */
  const [facultyFormOpen, setFacultyFormOpen] = useState(false);
  const [facultyForm, setFacultyForm] = useState<FacultyFormInput>({
    name: '', nameEn: '', iconEmoji: '', city: '',
  });
  const closeFacultyForm = () => setFacultyFormOpen(false);
  const openFacultyForm = () => {
    setFacultyForm({ name: '', nameEn: '', iconEmoji: '', city: '' });
    setFacultyFormOpen(true);
  };
  const submitFaculty = () => {
    createFaculty.mutate(facultyForm, {
      onSuccess: () => {
        toast.success(
          `أُضيفت كلّيّة «${facultyForm.name.trim()}» إلى «${institution?.name ?? ''}».`,
          { title: 'تمّت الإضافة' },
        );
        closeFacultyForm();
      },
    });
  };

  /* ── Department create modal state (target = faculty) ─────────── */
  const [deptTarget, setDeptTarget] = useState<AdminFaculty | null>(null);
  const [deptForm, setDeptForm] = useState<DepartmentFormInput>({
    name: '', nameEn: '', facultyId: '',
  });
  const closeDeptForm = () => setDeptTarget(null);
  const openDeptForm = (f: AdminFaculty) => {
    setDeptForm({ name: '', nameEn: '', facultyId: f.id });
    setDeptTarget(f);
  };
  const submitDepartment = () => {
    if (!deptTarget) return;
    createDepartment.mutate(deptForm, {
      onSuccess: () => {
        toast.success(
          `أُضيف قسم «${deptForm.name.trim()}» إلى «${deptTarget.name}».`,
          { title: 'تمّت الإضافة' },
        );
        closeDeptForm();
      },
    });
  };

  /* ── Course create modal state ─────────────────────────────────── */
  const [courseFormOpen, setCourseFormOpen] = useState(false);
  const [courseForm, setCourseForm] = useState<CourseFormInput>({
    code: '', name: '', credits: 3, departmentId: '',
  });
  const closeCourseForm = () => setCourseFormOpen(false);
  const openCourseForm = () => {
    setCourseForm({ code: '', name: '', credits: 3, departmentId: '' });
    setCourseFormOpen(true);
  };
  const submitCourse = () => {
    createCourse.mutate(courseForm, {
      onSuccess: () => {
        toast.success(
          `أُضيف مقرّر «${courseForm.name}» إلى «${institution?.name ?? ''}».`,
          { title: 'تمّت الإضافة' },
        );
        closeCourseForm();
      },
    });
  };

  /* ── Offering create modal state (target = course row) ────────── */
  const [offeringCourse, setOfferingCourse] = useState<AdminCourse | null>(null);
  const [offeringForm, setOfferingForm] = useState<OfferingFormInput>({
    courseId: '', teacherId: '', term: '', room: '', capacity: 40,
  });
  const closeOfferingForm = () => setOfferingCourse(null);
  const openOfferingForm = (c: AdminCourse) => {
    setOfferingForm({ courseId: c.id, teacherId: '', term: '', room: '', capacity: 40 });
    setOfferingCourse(c);
  };
  const submitOffering = () => {
    if (!offeringCourse) return;
    const room = offeringForm.room?.trim() ?? '';
    createOffering.mutate(
      {
        courseId: offeringCourse.id,
        teacherId: offeringForm.teacherId,
        term: offeringForm.term.trim(),
        ...(room ? { room } : {}),
        capacity: offeringForm.capacity,
      },
      {
        onSuccess: () => {
          toast.success(
            `فُتحت شعبة «${offeringCourse.name}» للفصل «${offeringForm.term.trim()}».`,
            { title: 'تمّ فتح الشعبة' },
          );
          closeOfferingForm();
        },
      },
    );
  };

  /* ── Collapsed-departments state ──────────────────────────────── */
  const [openDepts, setOpenDepts] = useState<ReadonlySet<string>>(new Set());
  const toggleDepts = (id: string) => {
    setOpenDepts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Render: the listing-level honest states first ────────────── */
  if (listing.isPending) {
    return (
      <div className="page">
        <header className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">جارٍ تحميل المؤسسة…</h1>
          </div>
        </header>
        <div className="stat-strip" aria-busy="true">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="stat-cell">
              <Skeleton width={80} height={11} />
              <div style={{ marginBlock: 'var(--sp-1)' }}>
                <Skeleton width={90} height={28} />
              </div>
              <Skeleton width={120} height={11} />
            </div>
          ))}
        </div>
        <CardSkeleton lines={7} />
      </div>
    );
  }
  if (listing.isError) {
    return (
      <div className="page">
        <header className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">المؤسسة</h1>
          </div>
        </header>
        <Card>
          <ErrorState error={listing.error} onRetry={() => listing.refetch()} />
        </Card>
      </div>
    );
  }
  if (!institution) {
    /* The listing loaded but this slug matches nothing — the honest
     * not-found state, with the way back to the console. */
    return (
      <div className="page">
        <header className="page-header">
          <div className="page-title-block">
            <h1 className="page-title">المؤسسة غير موجودة</h1>
            <p className="page-subtitle">لا توجد مؤسسة بمعرّف «{routeSlug}» على المنصّة.</p>
          </div>
        </header>
        <Card>
          <EmptyState
            icon={Landmark}
            title="المؤسسة غير موجودة"
            description="قد تكون حُذفت أو تغيّر معرّفها. عد إلى قائمة المؤسسات واخترها من هناك."
            action={(
              <Link to="/owner/institutions" className="btn primary sm">
                <Icon icon={ArrowLeft} size={13} />
                العودة إلى المؤسسات
              </Link>
            )}
          />
        </Card>
      </div>
    );
  }

  const faculties = facultiesQ.data ?? [];
  const totalDepartments = faculties.reduce((s, f) => s + f.departmentCount, 0);
  /* r183-B5 (A9 P1): the census — duplicate empty seed rows (same
   * name+city, zero counts) fold into one annotated card; the RAW
   * count still drives the KPIs (the DB census is the truth, the
   * fold is display-only and says so in the subtitle). */
  const facultyCensus = dedupeFacultyCensus(faculties);
  const foldedRows = facultyCensus.reduce((s, e) => s + (e.duplicateCount - 1), 0);
  const mutationBusy =
    createFaculty.isPending || createDepartment.isPending ||
    createCourse.isPending || createOffering.isPending;

  return (
    <div className="page">
      <header className="page-header">
        <div className="page-title-block">
          {/* The way back — the console's context never disappears. */}
          <Link
            to="/owner/institutions"
            className="btn ghost sm"
            style={{ marginBlockEnd: 'var(--sp-2)' }}
          >
            <Icon icon={ArrowLeft} size={13} />
            كل المؤسسات
          </Link>
          <h1 className="page-title">{institution.name}</h1>
          <p className="page-subtitle">
            {institution.nameEn ? `${institution.nameEn} · ` : ''}
            <span className="font-mono" dir="ltr">{institution.slug}</span>
          </p>
        </div>
        <div className="flex items-center gap-2" style={{ marginBlockStart: 'var(--sp-2)' }}>
          <Badge color={institution.status === 'ACTIVE' ? 'green' : 'red'}>
            {STATUS_LABELS[institution.status]}
          </Badge>
          <span className="text-xs text-subtle">
            <Icon icon={Users} size={13} style={{ verticalAlign: '-2px' }} />{' '}
            {countAr(institution.activeMembershipCount, ['عضو نشط واحد', 'عضوان نشطان', 'أعضاء نشطون', 'عضواً نشطاً'])}
          </span>
        </div>
      </header>

      {suspended && (
        <AlertRow
          color="amber"
          icon={AlertTriangle}
          title="هذه المؤسسة معلّقة"
          description="التعديلات الأكاديمية (كليات، أقسام، مقرّرات، شُعب) متاحة للمؤسسات النشطة فقط. فعّل المؤسسة من قائمة المؤسسات أولًا."
        />
      )}

      {/* R190 (D4): the typographic stat strip — was the grid-4 icon
          tiles (the census facts as the printed stat line). */}
      <div style={{ marginBlockStart: suspended ? 'var(--sp-4)' : undefined }}>
        <StatStrip
          ariaLabel="مؤشرات المؤسسة"
          cells={[
            {
              label: 'الأعضاء النشطون',
              value: institution.activeMembershipCount.toLocaleString('ar-LY'),
              trend: 'عضويّات فاعلة',
              trendTone: 'flat',
            },
            {
              label: 'الكلّيّات',
              value: faculties.length.toLocaleString('ar-LY'),
              trend: 'البنية الأكاديميّة',
              trendTone: 'flat',
            },
            {
              label: 'الأقسام',
              value: totalDepartments.toLocaleString('ar-LY'),
              trend: 'داخل الكلّيّات',
              trendTone: 'flat',
            },
            {
              label: 'المقرّرات',
              value: (coursesMeta?.total ?? 0).toLocaleString('ar-LY'),
              trend: coursesMeta ? 'خزينة المقرّرات' : 'بانتظار الإحصاء',
              trendTone: 'flat',
            },
          ]}
        />
      </div>

      {/* ── Section 1: the academic structure (faculties + departments) ── */}
      <Card
        style={{ marginBlockStart: 'var(--sp-9)' }}
        title="البنية الأكاديمية"
        icon={Building2}
        subtitle={`${countAr(faculties.length, ['كلّيّة واحدة', 'كلّيّتان', 'كلّيّات', 'كلّيّة'])} · ${countAr(totalDepartments, ['قسم واحد', 'قسمان', 'أقسام', 'قسماً'])}${foldedRows > 0 ? ` · ${foldedRows} سجلّ بذر مكرّر مُجمَّع` : ''}`}
      >
        <div className="admin-students-toolbar">
          <button
            type="button"
            className="btn primary sm"
            onClick={openFacultyForm}
            disabled={suspended}
            aria-label="إضافة كلّيّة جديدة إلى المؤسسة"
            title={suspended ? 'التعديلات الأكاديمية متاحة للمؤسسات النشطة فقط' : undefined}
          >
            <Icon icon={Plus} size={14} />
            إضافة كلّيّة
          </button>
        </div>
        {facultiesQ.isPending && <TableSkeleton rows={4} cols={4} />}
        {facultiesQ.isError && (
          <ErrorState error={facultiesQ.error} onRetry={() => facultiesQ.refetch()} />
        )}
        {facultiesQ.data && (
          <div className="flex-col gap-3">
            {facultyCensus.map((entry) => (
              <OwnerFacultyCard
                key={entry.faculty.id}
                faculty={entry.faculty}
                duplicateCount={entry.duplicateCount}
                open={openDepts.has(entry.faculty.id)}
                onToggle={() => toggleDepts(entry.faculty.id)}
                onAddDepartment={() => openDeptForm(entry.faculty)}
                writesDisabled={suspended}
              />
            ))}
            {faculties.length === 0 && (
              <EmptyState
                icon={Building2}
                title="لا كليات بعد في هذه المؤسسة"
                description="أنشئ أول كلّيّة من الزر أعلاه — بعدها يمكنك إضافة الأقسام والمقرّرات وشُعبها."
              />
            )}
          </div>
        )}
      </Card>

      {/* ── Section 2: the courses + offerings supply chain ─────────── */}
      <Card
        style={{ marginBlockStart: 'var(--sp-6)' }}
        title="المقرّرات والشُّعب"
        icon={BookOpen}
        subtitle={coursesMeta
          ? countAr(coursesMeta.total, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])
          : undefined}
      >
        <div className="admin-students-toolbar">
          <button
            type="button"
            className="btn primary sm"
            onClick={openCourseForm}
            disabled={suspended}
            aria-label="إضافة مقرّر جديد إلى المؤسسة"
            title={suspended ? 'التعديلات الأكاديمية متاحة للمؤسسات النشطة فقط' : undefined}
          >
            <Icon icon={Plus} size={14} />
            إضافة مقرّر
          </button>
        </div>
        {coursesQ.isPending && <TableSkeleton rows={5} cols={5} />}
        {coursesQ.isError && (
          <ErrorState error={coursesQ.error} onRetry={() => coursesQ.refetch()} />
        )}
        {coursesQ.data && (
          <div className="table-wrap">
            <table className="table tbl-stack">
              <thead>
                <tr>
                  <th scope="col" style={{ width: 100 }}>الكود</th>
                  <th scope="col">اسم المقرّر</th>
                  <th scope="col">الكلّيّة / القسم</th>
                  <th scope="col" className="admin-table-num" style={{ width: 70 }}>س.م</th>
                  <th scope="col" className="admin-table-num" style={{ width: 100 }}>الفصول</th>
                  <th scope="col">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {courses.length === 0 && (
                  <tr>
                    <td colSpan={6}>
                      <EmptyState
                        icon={BookOpen}
                        title="لا مقرّرات بعد"
                        description="أضف أول مقرّر بعد إنشاء كلّيّة وقسم له — الشُّعب تُفتح من صف المقرّر."
                      />
                    </td>
                  </tr>
                )}
                {courses.map((c) => (
                  <tr key={c.id}>
                    <td className="font-mono text-subtle" data-label="الكود"><bdi>{c.code}</bdi></td>
                    <td data-label="اسم المقرّر">
                      <span className="font-semibold" style={{ color: 'var(--text)' }}>{c.name}</span>
                    </td>
                    <td data-label="الكلّيّة / القسم">
                      {c.faculty ? (
                        <span className="text-xs text-muted">
                          {c.faculty}
                          {c.department && <span className="text-xxs text-subtle"> · {c.department}</span>}
                        </span>
                      ) : (
                        <span className="text-xxs text-subtle">—</span>
                      )}
                    </td>
                    <td className="admin-table-num font-mono" data-label="ساعات معتمدة">{c.credits}</td>
                    <td className="admin-table-num font-mono" data-label="الفصول">{c.offeringCount}</td>
                    <td data-label="إجراءات">
                      <button
                        type="button"
                        className="btn ghost sm"
                        onClick={() => openOfferingForm(c)}
                        disabled={suspended || mutationBusy}
                        aria-label={`فتح شعبة لمقرّر ${c.name}`}
                        title={suspended ? 'التعديلات الأكاديمية متاحة للمؤسسات النشطة فقط' : undefined}
                      >
                        <Icon icon={Plus} size={13} />
                        فتح شعبة
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {coursesMeta && coursesMeta.totalPages > 1 && (
              <div className="table-pagination">
                <span>
                  صفحة {coursesMeta.page.toLocaleString('ar-LY')} من {coursesMeta.totalPages.toLocaleString('ar-LY')} · {countAr(coursesMeta.total, ['مقرّر واحد', 'مقرّران', 'مقرّرات', 'مقرّراً'])}
                </span>
                <span className="table-row-actions">
                  {/* r183-B5 (A10 wave-A P2 — RTL directionality): «السابق»
                      points RIGHT (backward in RTL) and «التالي» points
                      LEFT (forward) — the MessagesInbox convention, replacing
                      the per-instance scaleX(-1) mirror that swapped the
                      semantics on every other paginated surface. */}
                  <button
                    type="button"
                    className="btn ghost sm"
                    disabled={coursePage <= 1 || coursesQ.isFetching}
                    onClick={() => setCoursePage((p) => Math.max(1, p - 1))}
                  >
                    <Icon icon={ChevronRight} size={13} />
                    السابق
                  </button>
                  <button
                    type="button"
                    className="btn ghost sm"
                    disabled={coursePage >= coursesMeta.totalPages || coursesQ.isFetching}
                    onClick={() => setCoursePage((p) => p + 1)}
                  >
                    التالي
                    <Icon icon={ChevronLeft} size={13} />
                  </button>
                </span>
              </div>
            )}
          </div>
        )}
      </Card>

      {/* ── «إضافة كلّيّة» modal ─────────────────────────────────────── */}
      <Modal open={facultyFormOpen} onClose={closeFacultyForm} ariaLabel="إضافة كلّيّة جديدة">
        <div className="modal-header">
          <h3 className="modal-title">إضافة كلّيّة جديدة</h3>
          <button type="button" className="modal-close" onClick={closeFacultyForm} aria-label="إغلاق">
            <Icon icon={X} size={18} />
          </button>
        </div>
        <div className="modal-body" style={{ maxWidth: 480 }}>
          <p className="text-sm text-muted" style={{ marginBlockEnd: 'var(--sp-3)' }}>
            ستُضاف الكلّيّة إلى «{institution.name}».
          </p>
          <FormField label="اسم الكلّيّة" id="owner-faculty-name">
            <input
              className="input"
              value={facultyForm.name}
              onChange={(e) => setFacultyForm({ ...facultyForm, name: e.target.value })}
              placeholder="كلية العلوم"
            />
          </FormField>
          <FormField label="الاسم بالإنجليزية (اختياري)" id="owner-faculty-name-en">
            <input
              className="input"
              value={facultyForm.nameEn}
              onChange={(e) => setFacultyForm({ ...facultyForm, nameEn: e.target.value })}
              placeholder="Faculty of Science"
            />
          </FormField>
          <FormField
            label="المدينة"
            id="owner-faculty-city"
            hint="الكلّيّات تتميّز بالاسم داخل كل مدينة — الاسم نفسه في مدينة أخرى لا يُعدّ تكرارًا"
          >
            <input
              className="input"
              value={facultyForm.city}
              onChange={(e) => setFacultyForm({ ...facultyForm, city: e.target.value })}
              placeholder="حرم المعرفة"
            />
          </FormField>
          <FormField label="رمز تعبيري (اختياري)" id="owner-faculty-icon">
            <input
              className="input"
              value={facultyForm.iconEmoji}
              onChange={(e) => setFacultyForm({ ...facultyForm, iconEmoji: e.target.value })}
              maxLength={10}
            />
          </FormField>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn ghost" onClick={closeFacultyForm}>
            إلغاء
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={submitFaculty}
            disabled={!facultyForm.name.trim() || !facultyForm.city.trim() || createFaculty.isPending}
          >
            {createFaculty.isPending ? 'جارٍ الإضافة…' : 'إضافة الكلّيّة'}
          </button>
        </div>
        {createFaculty.isError && (
          <AlertRow
            color="red"
            icon={AlertTriangle}
            title="تعذّر إضافة الكلّيّة"
            description={apiErrorMessage(createFaculty.error, 'لم يستجب الخادم للطلب. إعادة المحاولة.')}
          />
        )}
      </Modal>

      {/* ── «إضافة قسم» modal (bound to the target faculty) ────────── */}
      <Modal open={deptTarget !== null} onClose={closeDeptForm} ariaLabel="إضافة قسم">
        <div className="modal-header">
          <h3 className="modal-title">إضافة قسم</h3>
          <button type="button" className="modal-close" onClick={closeDeptForm} aria-label="إغلاق">
            <Icon icon={X} size={18} />
          </button>
        </div>
        <div className="modal-body" style={{ maxWidth: 480 }}>
          {deptTarget && (
            <p className="text-sm text-muted" style={{ marginBlockEnd: 'var(--sp-3)' }}>
              سيُضاف القسم إلى «{deptTarget.name}» في «{institution.name}».
            </p>
          )}
          <FormField label="اسم القسم" id="owner-dept-name">
            <input
              className="input"
              value={deptForm.name}
              onChange={(e) => setDeptForm({ ...deptForm, name: e.target.value })}
              placeholder="قسم الحاسوب"
            />
          </FormField>
          <FormField label="الاسم بالإنجليزية (اختياري)" id="owner-dept-name-en">
            <input
              className="input"
              value={deptForm.nameEn}
              onChange={(e) => setDeptForm({ ...deptForm, nameEn: e.target.value })}
              placeholder="Computer Science"
            />
          </FormField>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn ghost" onClick={closeDeptForm}>
            إلغاء
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={submitDepartment}
            disabled={!deptForm.name.trim() || createDepartment.isPending}
          >
            {createDepartment.isPending ? 'جارٍ الإضافة…' : 'إضافة القسم'}
          </button>
        </div>
        {createDepartment.isError && (
          <AlertRow
            color="red"
            icon={AlertTriangle}
            title="تعذّر إضافة القسم"
            description={apiErrorMessage(createDepartment.error, 'لم يستجب الخادم للطلب. إعادة المحاولة.')}
          />
        )}
      </Modal>

      {/* ── «إضافة مقرّر» modal (department picker from this institution) ── */}
      <Modal open={courseFormOpen} onClose={closeCourseForm} ariaLabel="إضافة مقرّر جديد">
        <div className="modal-header">
          <h3 className="modal-title">إضافة مقرّر جديد</h3>
          <button type="button" className="modal-close" onClick={closeCourseForm} aria-label="إغلاق">
            <Icon icon={X} size={18} />
          </button>
        </div>
        <div className="modal-body" style={{ maxWidth: 480 }}>
          <p className="text-sm text-muted" style={{ marginBlockEnd: 'var(--sp-3)' }}>
            سيُضاف المقرّر إلى «{institution.name}».
          </p>
          <FormField label="كود المقرّر" id="owner-course-code" hint="مثال: CS101 — يظهر بخط أحادي في السجلّ">
            <input
              className="input"
              value={courseForm.code}
              onChange={(e) => setCourseForm({ ...courseForm, code: e.target.value })}
              placeholder="CS101"
            />
          </FormField>
          <FormField label="اسم المقرّر" id="owner-course-name">
            <input
              className="input"
              value={courseForm.name}
              onChange={(e) => setCourseForm({ ...courseForm, name: e.target.value })}
              placeholder="مقدمة في علوم الحاسب"
            />
          </FormField>
          <FormField
            label="القسم"
            id="owner-course-dept"
            hint={`أقسام «${institution.name}» فقط — القسم يحدّد الكلّيّة`}
          >
            <select
              className="input"
              value={courseForm.departmentId}
              onChange={(e) => setCourseForm({ ...courseForm, departmentId: e.target.value })}
              disabled={facultiesQ.isPending}
            >
              <option value="">
                {facultiesQ.isPending ? 'جارٍ تحميل الأقسام…' : 'اختر القسم…'}
              </option>
              {faculties.flatMap((f) =>
                f.departments.map((d) => (
                  <option key={d.id} value={d.id}>{f.name} · {d.name}</option>
                )),
              )}
            </select>
          </FormField>
          <FormField
            label="الساعات المعتمدة"
            id="owner-course-credits"
            hint="بين 1 و10 — الحدّ الذي يقبله الخادم؛ الزرّ يبقى معطّلًا خارجه"
          >
            <input
              className="input"
              type="number"
              min={1}
              max={10}
              value={courseForm.credits}
              onChange={(e) => setCourseForm({ ...courseForm, credits: Number(e.target.value) })}
            />
          </FormField>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn ghost" onClick={closeCourseForm}>
            إلغاء
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={submitCourse}
            disabled={
              !courseForm.code
              || !courseForm.name
              || !courseForm.departmentId
              // r183-B5 (A9 P3): the client mirror of the backend zod
              // bounds (min 1 / max 10). Number('') → 0 and NaN both
              // fail the range check, so a cleared input can never ride
              // the 400 round-trip.
              || !(courseForm.credits >= 1 && courseForm.credits <= 10)
              || createCourse.isPending
            }
          >
            {createCourse.isPending ? 'جارٍ الحفظ…' : 'إضافة المقرّر'}
          </button>
        </div>
        {createCourse.isError && (
          <AlertRow
            color="red"
            icon={AlertTriangle}
            title="تعذّر حفظ المقرّر"
            description={apiErrorMessage(createCourse.error, 'لم يستجب الخادم للطلب. إعادة المحاولة.')}
          />
        )}
      </Modal>

      {/* ── «فتح شعبة» modal (teacher picker = this institution's roster) ── */}
      <Modal open={offeringCourse !== null} onClose={closeOfferingForm} ariaLabel="فتح شعبة">
        <div className="modal-header">
          <h3 className="modal-title">فتح شعبة</h3>
          <button type="button" className="modal-close" onClick={closeOfferingForm} aria-label="إغلاق">
            <Icon icon={X} size={18} />
          </button>
        </div>
        <div className="modal-body" style={{ maxWidth: 480 }}>
          {offeringCourse && (
            <p className="text-sm text-muted" style={{ marginBlockEnd: 'var(--sp-3)' }}>
              سيُدرَّس مقرّر «{offeringCourse.name}» (<bdi>{offeringCourse.code}</bdi>) في الشعبة الجديدة داخل «{institution.name}».
            </p>
          )}
          <FormField label="الفصل الدراسي" id="owner-offering-term" hint="نص حرّ من ١ إلى ٥٠ حرفًا — مثال: 2024-FALL">
            <input
              className="input"
              value={offeringForm.term}
              onChange={(e) => setOfferingForm({ ...offeringForm, term: e.target.value })}
              placeholder="2024-FALL"
              maxLength={50}
            />
          </FormField>
          <FormField
            label="الأستاذ"
            id="owner-offering-teacher"
            hint="أساتذة هذه المؤسسة فقط — لا تُسند الشُّعب إلا لعضو هيئة تدريس نشط فيها"
          >
            <select
              className="input"
              value={offeringForm.teacherId}
              onChange={(e) => setOfferingForm({ ...offeringForm, teacherId: e.target.value })}
              disabled={teachersQ.isPending}
            >
              <option value="">
                {teachersQ.isPending ? 'جارٍ تحميل الأساتذة…' : 'اختر الأستاذ…'}
              </option>
              {teachersQ.data?.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </FormField>
          <FormField label="القاعة (اختياري)" id="owner-offering-room">
            <input
              className="input"
              value={offeringForm.room}
              onChange={(e) => setOfferingForm({ ...offeringForm, room: e.target.value })}
              placeholder="قاعة A12"
            />
          </FormField>
          <FormField label="السعة" id="owner-offering-capacity" hint="أقصى عدد طلاب يمكن تسجيلهم في الشعبة">
            <input
              className="input"
              type="number"
              min={1}
              max={10000}
              value={offeringForm.capacity}
              onChange={(e) => setOfferingForm({ ...offeringForm, capacity: Number(e.target.value) })}
            />
          </FormField>
          {teachersQ.isError && (
            <AlertRow
              color="red"
              icon={AlertTriangle}
              title="تعذّر تحميل قائمة الأساتذة"
              description={apiErrorMessage(teachersQ.error, 'لم يستجب الخادم للطلب. إعادة المحاولة.')}
              actions={(
                <button
                  type="button"
                  className="btn ghost sm"
                  onClick={() => teachersQ.refetch()}
                  disabled={teachersQ.isPending}
                >
                  إعادة المحاولة
                </button>
              )}
            />
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="btn ghost" onClick={closeOfferingForm}>
            إلغاء
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={submitOffering}
            disabled={!offeringForm.term.trim() || !offeringForm.teacherId
              || !(offeringForm.capacity >= 1) || createOffering.isPending}
          >
            {createOffering.isPending ? 'جارٍ الفتح…' : 'فتح الشعبة'}
          </button>
        </div>
        {createOffering.isError && (
          <AlertRow
            color="red"
            icon={AlertTriangle}
            title="تعذّر فتح الشعبة"
            description={apiErrorMessage(createOffering.error, 'لم يستجب الخادم للطلب. إعادة المحاولة.')}
          />
        )}
      </Modal>
    </div>
  );
}
