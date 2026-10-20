/**
 * r181 (phase-8 owner setup) — OwnerInstitutionDetailPage tests.
 *
 * The OWNER's institution setup context (route
 * /owner/institutions/:slug): pins the page contract against mocked
 * hooks (the mock boundary OwnerInstitutionsPage's tests established):
 *  · the institution header (name, slug, status badge) + the way back
 *    to the console;
 *  · the honest not-found state for a slug the listing doesn't know;
 *  · a SUSPENDED institution shows the banner and DISABLES every
 *    academic write affordance;
 *  · the academic-supply-chain mutations are CONSTRUCTED with the
 *    selected institution's binding (slug / institution id) — the
 *    load-bearing r181 contract: an owner write never lands in an
 *    institution the page didn't select;
 *  · the faculty / department / course / offering create flows submit
 *    the drafted bodies through the (mocked) mutations.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { OwnerInstitutionDetailPage } from '../../src/pages/owner/OwnerInstitutionDetailPage';

const ZAWIA = {
  id: 'inst-zawia-showcase',
  name: 'جامعة الزاوية',
  nameEn: 'University of Zawia',
  slug: 'zawia-showcase',
  status: 'ACTIVE',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  activeMembershipCount: 4,
  facultyCount: 2,
  admins: [],
};

const ALANDALUS = {
  ...ZAWIA,
  id: 'inst-alandalus-demo',
  name: 'مؤسسة الأندلس التعليمية',
  nameEn: 'Al-Andalus Education Institute',
  slug: 'alandalus-demo',
  status: 'SUSPENDED',
  activeMembershipCount: 2,
  facultyCount: 1,
};

const FACULTY_SCIENCE = {
  id: 'fac-sci-00000000000001',
  name: 'كلية العلوم',
  nameEn: 'Faculty of Science',
  iconEmoji: null,
  city: 'الزاوية',
  departmentCount: 2,
  studentCount: 10,
  teacherCount: 4,
  courseCount: 6,
  departments: [
    { id: 'dep-cs-00000000000001', name: 'قسم الحاسوب', students: 6, teachers: 2, courses: 4 },
    { id: 'dep-math-000000000001', name: 'قسم الرياضيات', students: 4, teachers: 2, courses: 2 },
  ],
};

const COURSE_CS101 = {
  id: 'crs-cs101-00000000001',
  code: 'CS101',
  name: 'مقدمة في علوم الحاسب',
  credits: 3,
  themeColor: null,
  faculty: 'كلية العلوم',
  facultyEmoji: null,
  department: 'قسم الحاسوب',
  departmentId: 'dep-cs-00000000000001',
  offeringCount: 1,
  conceptCount: 0,
  totalEnrollments: 3,
  totalLectures: 8,
  totalMaterials: 0,
  recentOfferings: [],
};

const TEACHERS = [
  { id: 'u-teacher-00000000001', name: 'سالم الفيتوري', email: 'salim@zu.edu.ly' },
];

const mocks = vi.hoisted(() => ({
  listing: {
    data: null as typeof ZAWIA[] | null,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  },
  faculties: {
    data: null as typeof FACULTY_SCIENCE[] | null,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  },
  courses: {
    data: null as { data: typeof COURSE_CS101[]; meta: { page: number; limit: number; total: number; totalPages: number } } | null,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  },
  createFaculty: { mutate: vi.fn(), isPending: false, isError: false, error: null },
  createDepartment: { mutate: vi.fn(), isPending: false, isError: false, error: null },
  createCourse: { mutate: vi.fn(), isPending: false, isError: false, error: null },
  createOffering: { mutate: vi.fn(), isPending: false, isError: false, error: null },
  teachers: { data: null as typeof TEACHERS | null, isPending: false, isError: false, error: null, refetch: vi.fn() },
}));

/* The hook-construction log — the r181 load-bearing contract: the
 * page must construct the academic mutations WITH the selected
 * institution's binding (slug or id), so an owner write can never
 * land in an unselected institution. */
const construction = vi.hoisted(() => ({
  useAdminFaculties: vi.fn(),
  useCreateFaculty: vi.fn(),
  useCreateDepartment: vi.fn(),
  useCreateCourse: vi.fn(),
  useAdminCourses: vi.fn(),
  useOwnerInstitutionTeachers: vi.fn(),
}));

vi.mock('../../src/hooks/useInstitutions', () => ({
  useOwnerInstitutions: () => mocks.listing,
}));

vi.mock('../../src/hooks/useResources', () => ({
  useAdminFaculties: (slug?: string) => {
    construction.useAdminFaculties(slug);
    return mocks.faculties;
  },
  useCreateFaculty: (slug?: string) => {
    construction.useCreateFaculty(slug);
    return mocks.createFaculty;
  },
  useCreateDepartment: (slug?: string) => {
    construction.useCreateDepartment(slug);
    return mocks.createDepartment;
  },
  useCreateCourse: (institutionId?: string) => {
    construction.useCreateCourse(institutionId);
    return mocks.createCourse;
  },
  useAdminCourses: (params: { institutionSlug?: string }) => {
    construction.useAdminCourses(params);
    return mocks.courses;
  },
  useCreateOffering: () => mocks.createOffering,
  useOwnerInstitutionTeachers: (slug: string | null, enabled: boolean) => {
    construction.useOwnerInstitutionTeachers(slug, enabled);
    return mocks.teachers;
  },
  apiErrorMessage: () => 'حاول مرة أخرى بعد لحظات.',
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.listing.data = null;
  mocks.listing.isPending = false;
  mocks.listing.isError = false;
  mocks.listing.error = null;
  mocks.faculties.data = null;
  mocks.faculties.isPending = false;
  mocks.faculties.isError = false;
  mocks.courses.data = null;
  mocks.courses.isPending = false;
  mocks.courses.isError = false;
  mocks.teachers.data = null;
  mocks.teachers.isPending = false;
  mocks.createFaculty.isError = false;
  mocks.createDepartment.isError = false;
  mocks.createCourse.isError = false;
  mocks.createOffering.isError = false;
});

function renderAt(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/owner/institutions/${slug}`]}>
      <Routes>
        <Route path="/owner/institutions/:slug" element={<OwnerInstitutionDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('OwnerInstitutionDetailPage — header + honest states (r181)', () => {
  it('renders the institution context: name, slug, status badge, and the way back', () => {
    mocks.listing.data = [ZAWIA];
    mocks.faculties.data = [FACULTY_SCIENCE];
    mocks.courses.data = {
      data: [COURSE_CS101],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    renderAt('zawia-showcase');

    expect(screen.getByRole('heading', { level: 1, name: 'جامعة الزاوية' })).toBeInTheDocument();
    expect(screen.getByText('zawia-showcase')).toBeInTheDocument();
    expect(screen.getByText('نشطة')).toBeInTheDocument();
    // The back link — the console's context never disappears.
    expect(screen.getByRole('link', { name: /كل المؤسسات/ })).toHaveAttribute(
      'href',
      '/owner/institutions',
    );
    // The academic structure + courses sections render real rows.
    expect(screen.getAllByText('كلية العلوم').length).toBeGreaterThan(0);
    expect(screen.getByText('مقدمة في علوم الحاسب')).toBeInTheDocument();
  });

  it('shows the honest not-found state for an unknown slug, with the way back', () => {
    mocks.listing.data = [ZAWIA];
    renderAt('no-such-institution');

    expect(screen.getByRole('heading', { level: 1, name: 'المؤسسة غير موجودة' })).toBeInTheDocument();
    expect(screen.getByText(/لا توجد مؤسسة بمعرّف «no-such-institution»/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /العودة إلى المؤسسات/ })).toHaveAttribute(
      'href',
      '/owner/institutions',
    );
  });

  it('renders skeletons while the listing is pending', () => {
    mocks.listing.isPending = true;
    renderAt('zawia-showcase');

    expect(screen.getByRole('heading', { level: 1, name: /جارٍ تحميل المؤسسة/ })).toBeInTheDocument();
  });
});

describe('OwnerInstitutionDetailPage — the institution binding (r181 load-bearing)', () => {
  it('constructs every academic query/mutation with the selected institution\'s slug/id', () => {
    mocks.listing.data = [ZAWIA];
    mocks.faculties.data = [];
    mocks.courses.data = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } };
    renderAt('zawia-showcase');

    // Faculties listing + structure writes + teacher roster: the slug.
    expect(construction.useAdminFaculties).toHaveBeenCalledWith('zawia-showcase');
    expect(construction.useCreateFaculty).toHaveBeenCalledWith('zawia-showcase');
    expect(construction.useCreateDepartment).toHaveBeenCalledWith('zawia-showcase');
    expect(construction.useOwnerInstitutionTeachers).toHaveBeenCalledWith('zawia-showcase', true);
    // Course create: the OWNER-only institutionId wire field.
    expect(construction.useCreateCourse).toHaveBeenCalledWith('inst-zawia-showcase');
    // Courses listing: the institutionSlug query param.
    expect(construction.useAdminCourses).toHaveBeenCalledWith(
      expect.objectContaining({ institutionSlug: 'zawia-showcase' }),
    );
  });
});

describe('OwnerInstitutionDetailPage — suspended institutions (r181)', () => {
  it('shows the suspension banner and disables every academic write affordance', () => {
    mocks.listing.data = [ALANDALUS];
    mocks.faculties.data = [FACULTY_SCIENCE];
    mocks.courses.data = { data: [COURSE_CS101], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } };
    renderAt('alandalus-demo');

    expect(screen.getByText('هذه المؤسسة معلّقة')).toBeInTheDocument();
    expect(screen.getByText('معلّقة')).toBeInTheDocument();
    // Create affordances: all disabled while suspended.
    expect(screen.getByRole('button', { name: /إضافة كلّيّة/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /إضافة مقرّر/ })).toBeDisabled();
    // The per-faculty department add + per-course section open: disabled.
    expect(screen.getByRole('button', { name: 'إضافة قسم' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /فتح شعبة لمقرّر/ })).toBeDisabled();
  });
});

describe('OwnerInstitutionDetailPage — faculty create flow (r181)', () => {
  it('drafts and submits the faculty form through the slug-bound mutation', () => {
    mocks.listing.data = [ZAWIA];
    mocks.faculties.data = [];
    mocks.courses.data = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } };
    renderAt('zawia-showcase');

    fireEvent.click(screen.getByRole('button', { name: /إضافة كلّيّة/ }));

    const dialog = screen.getByRole('dialog');
    // The modal names the target institution — an owner write must
    // always say WHERE it lands.
    expect(within(dialog).getByText(/ستُضاف الكلّيّة إلى «جامعة الزاوية»/)).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/اسم الكلّيّة/), { target: { value: 'كلية الهندسة' } });
    fireEvent.change(within(dialog).getByLabelText(/المدينة/), { target: { value: 'الزاوية' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'إضافة الكلّيّة' }));

    expect(mocks.createFaculty.mutate).toHaveBeenCalledWith(
      { name: 'كلية الهندسة', nameEn: '', iconEmoji: '', city: 'الزاوية' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});

describe('OwnerInstitutionDetailPage — department create flow (r181)', () => {
  it('binds the department draft to the card it rode on and names both faculty and institution', () => {
    mocks.listing.data = [ZAWIA];
    mocks.faculties.data = [FACULTY_SCIENCE];
    mocks.courses.data = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } };
    renderAt('zawia-showcase');

    fireEvent.click(screen.getByRole('button', { name: 'إضافة قسم' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/سيُضاف القسم إلى «كلية العلوم» في «جامعة الزاوية»/)).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/اسم القسم/), { target: { value: 'قسم الفيزياء' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'إضافة القسم' }));

    expect(mocks.createDepartment.mutate).toHaveBeenCalledWith(
      { name: 'قسم الفيزياء', nameEn: '', facultyId: 'fac-sci-00000000000001' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});

describe('OwnerInstitutionDetailPage — course create flow (r181)', () => {
  it('drafts code/name/credits + an institution department and submits the body', () => {
    mocks.listing.data = [ZAWIA];
    mocks.faculties.data = [FACULTY_SCIENCE];
    mocks.courses.data = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 1 } };
    renderAt('zawia-showcase');

    fireEvent.click(screen.getByRole('button', { name: /إضافة مقرّر/ }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/سيُضاف المقرّر إلى «جامعة الزاوية»/)).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/كود المقرّر/), { target: { value: 'CS210' } });
    fireEvent.change(within(dialog).getByLabelText(/اسم المقرّر/), { target: { value: 'هياكل البيانات' } });
    const deptSelect = within(dialog).getByLabelText(/القسم/) as HTMLSelectElement;
    fireEvent.change(deptSelect, { target: { value: 'dep-cs-00000000000001' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'إضافة المقرّر' }));

    expect(mocks.createCourse.mutate).toHaveBeenCalledWith(
      { code: 'CS210', name: 'هياكل البيانات', credits: 3, departmentId: 'dep-cs-00000000000001' },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });
});

describe('OwnerInstitutionDetailPage — offering create flow (r181)', () => {
  it('binds the offering to the course row, picks an institution teacher, and submits', () => {
    mocks.listing.data = [ZAWIA];
    mocks.faculties.data = [FACULTY_SCIENCE];
    mocks.courses.data = {
      data: [COURSE_CS101],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    mocks.teachers.data = TEACHERS;
    renderAt('zawia-showcase');

    fireEvent.click(screen.getByRole('button', { name: /فتح شعبة لمقرّر مقدمة في علوم الحاسب/ }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/سيُدرَّس مقرّر «مقدمة في علوم الحاسب»/)).toBeInTheDocument();
    expect(within(dialog).getByText(/داخل «جامعة الزاوية»/)).toBeInTheDocument();

    fireEvent.change(within(dialog).getByLabelText(/الفصل الدراسي/), { target: { value: '2027-SPRING' } });
    const teacherSelect = within(dialog).getByLabelText(/الأستاذ/) as HTMLSelectElement;
    fireEvent.change(teacherSelect, { target: { value: 'u-teacher-00000000001' } });
    fireEvent.change(within(dialog).getByLabelText(/القاعة \(اختياري\)/), { target: { value: 'قاعة B7' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'فتح الشعبة' }));

    expect(mocks.createOffering.mutate).toHaveBeenCalledWith(
      {
        courseId: 'crs-cs101-00000000001',
        teacherId: 'u-teacher-00000000001',
        term: '2027-SPRING',
        room: 'قاعة B7',
        capacity: 40,
      },
      expect.objectContaining({ onSuccess: expect.any(Function) }),
    );
  });

  it('gates the offering submit on term + teacher + capacity', () => {
    mocks.listing.data = [ZAWIA];
    mocks.faculties.data = [FACULTY_SCIENCE];
    mocks.courses.data = {
      data: [COURSE_CS101],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    mocks.teachers.data = TEACHERS;
    renderAt('zawia-showcase');

    fireEvent.click(screen.getByRole('button', { name: /فتح شعبة لمقرّر مقدمة في علوم الحاسب/ }));

    const dialog = screen.getByRole('dialog');
    const submit = within(dialog).getByRole('button', { name: 'فتح الشعبة' });
    expect(submit).toBeDisabled();

    fireEvent.change(within(dialog).getByLabelText(/الفصل الدراسي/), { target: { value: '2027-SPRING' } });
    expect(submit).toBeDisabled(); // teacher still missing
  });
});

/* ════════════════════════════════════════════════════════════════
   r299 (workstream F) — the de-duplicated masthead + the modal
   close contract.
   · The KPI StatStrip died: every one of its four numbers already
     lived on the page exactly where it belongs (members on the
     header line, faculties/departments in the academic card's
     subtitle, courses in the courses card's subtitle). One owner
     per datum — a regression must not reintroduce the second
     printing.
   · The four create-modals' close buttons rode the `modal-close`
     class — zero CSS rules anywhere (a naked X, no 44px floor, no
     hover chip). They ride the canonical .icon-btn now.
   ════════════════════════════════════════════════════════════════ */

describe('OwnerInstitutionDetailPage — one owner per datum (r299)', () => {
  it('renders NO StatStrip — the header line and the cards\' subtitles own the four numbers', () => {
    mocks.listing.data = [ZAWIA];
    mocks.faculties.data = [FACULTY_SCIENCE];
    mocks.courses.data = {
      data: [COURSE_CS101],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    renderAt('zawia-showcase');

    // The duplicated KPI band never renders…
    expect(document.querySelector('.stat-strip')).toBeNull();
    // …while the real owners stay: the header's member count…
    expect(screen.getByText(/4 أعضاء نشطون/)).toBeInTheDocument();
    // …and the academic card's faculty/department subtitle.
    expect(screen.getByText(/كلّيّة واحدة · قسمان/)).toBeInTheDocument();
  });
});

describe('OwnerInstitutionDetailPage — modal close contract (r299)', () => {
  it('every create-modal\'s close affordance is the styled icon-btn chip, not the dead modal-close class', () => {
    mocks.listing.data = [ZAWIA];
    mocks.faculties.data = [FACULTY_SCIENCE];
    mocks.courses.data = {
      data: [COURSE_CS101],
      meta: { page: 1, limit: 20, total: 1, totalPages: 1 },
    };
    renderAt('zawia-showcase');

    // Every close button the modals ever mount rides the icon chip —
    // modal-close had zero CSS rules (a naked X). Asserting on ALL of
    // them at once also covers the persisted-dialog DOM (the Modal
    // keeps mounted dialogs around), so the pin can never miss one.
    /* The Modal keeps closed dialogs mounted in the DOM, so every
     * successive modal adds another إغلاق button — assert on ALL of
     * them (the pin can never miss one) and close via the LAST one
     * (the currently-open dialog's own). */
    const assertAndCloseLast = () => {
      const closes = screen.getAllByRole('button', { name: 'إغلاق' });
      expect(closes.length).toBeGreaterThan(0);
      for (const close of closes) {
        expect(close).toHaveClass('icon-btn');
        expect(close).not.toHaveClass('modal-close');
      }
      fireEvent.click(closes[closes.length - 1]!);
    };

    // The faculty modal.
    fireEvent.click(screen.getByRole('button', { name: /إضافة كلّيّة/ }));
    assertAndCloseLast();

    // The course modal.
    fireEvent.click(screen.getByRole('button', { name: /إضافة مقرّر/ }));
    assertAndCloseLast();

    // The department modal rides a faculty card's row action.
    fireEvent.click(screen.getByRole('button', { name: /إضافة قسم/ }));
    const closes = screen.getAllByRole('button', { name: 'إغلاق' });
    for (const close of closes) {
      expect(close).toHaveClass('icon-btn');
      expect(close).not.toHaveClass('modal-close');
    }
  });
});
