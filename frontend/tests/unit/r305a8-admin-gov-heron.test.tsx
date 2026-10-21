/**
 * R305-A8 (task 2-b) — «Heron» transformation pins for the three admin
 * governance/extras/sync page modules (AdminGovernancePages,
 * AdminExtraPages, AdminSyncPage).
 *
 * Every pin binds to the scoping/danger contracts of the pass, never to
 * a styling accident:
 *
 *  1. MARKER — every exported page component's root carries .r305ao so
 *     the scoped sheet (frontend/src/styles/r305-admin-owner.css) can
 *     reach the page. Includes the early-return branches: the
 *     permissions editor's pending + error roots, and the sync page's
 *     pending / error / never-run roots — a scoped sheet that misses a
 *     branch is a half-styled route.
 *  2. DANGER HIERARCHY — the destructive verbs ride the new vocabulary:
 *     the permissions matrix's «سحب» (instant access removal, the one
 *     confirm-less destructive direction in the matrix) renders with
 *     .r305ao-btn-danger while the additive «منح» stays on the accent
 *     primary, and the enrollment modal's drop group («التسجيلات
 *     الحالية» — every row's «إلغاء التسجيل» deletes the enrollment AND
 *     the student's progress) sits inside .r305ao-danger-zone. The
 *     confirm dialogs themselves are NOT re-pinned here —
 *     AdminStudents-enrollment.test.tsx owns that contract; this file
 *     only proves the zone did not break it.
 *  3. IMPORT WIRING — all three modules import the scoped sheet, and
 *     the import lands AFTER the admin.css import (same @layer pages;
 *     later source order wins the equal-specificity ties).
 *
 * lib/api is mocked at the module boundary (the 16-E5 pattern); timers
 * stay real so debounce effects behave exactly as in production.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { readFileSync } from 'node:fs';
import { resolve as resolvePath } from 'node:path';

vi.mock('../../src/lib/api', () => {
  const get = vi.fn(async () => ({ data: {} }));
  const post = vi.fn(async () => ({ data: {} }));
  return {
    api: { get, post, patch: vi.fn(), delete: vi.fn() },
    // Mirrors the real one-liner — unwraps the `{ data }` envelope.
    unwrap: <T,>(promise: Promise<{ data: { data: T } }>): Promise<T> =>
      promise.then((r) => r.data.data),
  };
});

import { AdminTeachersPage, AdminPermissionsPage } from '../../src/pages/admin/AdminGovernancePages';
import { AdminStudentsPage, AdminDigitalPage, AdminSettingsPage } from '../../src/pages/admin/AdminExtraPages';
import { AdminSyncPage } from '../../src/pages/admin/AdminSyncPage';
import { api } from '../../src/lib/api';

const getMock = api.get as unknown as Mock;

/* ── Providers ─────────────────────────────────────────────────── */

function renderWithProviders(ui: React.ReactElement, route?: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      {route ? (
        <MemoryRouter initialEntries={[route]}>
          <Routes>
            <Route path="/admin/permissions/:id" element={ui} />
          </Routes>
        </MemoryRouter>
      ) : (
        <MemoryRouter>{ui}</MemoryRouter>
      )}
    </QueryClientProvider>,
  );
}

/** The page's scoped root — the .r305ao marker the sheet keys on. */
const scopedRoot = () => {
  const root = document.querySelector('.r305ao');
  expect(root, 'the page root must carry the .r305ao marker').not.toBeNull();
  return root as HTMLElement;
};

beforeEach(() => {
  getMock.mockReset();
});

/* ── Fixtures ──────────────────────────────────────────────────── */

const teacherRow = (id: string, firstName: string) => ({
  id,
  email: `${id}@zu.edu.ly`,
  firstName,
  lastName: 'الفيتوري',
  role: 'TEACHER',
  avatarColor: null,
  avatarInitials: null,
  isActive: true,
  createdAt: '2025-01-01T00:00:00.000Z',
});

const usersBody = (rows: unknown[], total: number) => ({
  data: rows,
  meta: { page: 1, limit: 20, total, totalPages: 1 },
});

const STUDENT = {
  id: 'student_1',
  email: 'ahmed@zu.edu.ly',
  firstName: 'أحمد',
  lastName: 'الزروق',
  isActive: true,
  avatarColor: null,
  avatarInitials: null,
  createdAt: '2025-01-01T00:00:00.000Z',
  studentProfile: {
    universityId: 'U-2025-001',
    year: 2,
    gpa: '3.4',
    totalXp: 120,
    level: 4,
    faculty: { id: 'f1', name: 'كلية الهندسة' },
    department: { id: 'd1', name: 'قسم الحاسوب' },
  },
};

const ENROLLMENTS = [
  {
    id: 'enr-1',
    progressPct: 45,
    status: 'active',
    enrolledAt: '2025-02-01T00:00:00.000Z',
    offering: {
      id: 'off-1',
      term: '2024-2025/1',
      room: null,
      capacity: 40,
      course: { id: 'c1', name: 'هندسة البرمجيات', code: 'CS201', iconEmoji: null },
      teacher: { id: 't1', firstName: 'سالم', lastName: 'الطاهر' },
    },
  },
];

const OFFERINGS = [
  {
    id: 'off-3',
    term: '2024-2025/2',
    room: null,
    capacity: 25,
    course: { id: 'c3', name: 'الذكاء الاصطناعي', code: 'CS401', iconEmoji: null },
    teacher: { id: 't3', firstName: 'مريم', lastName: 'الفيتوري' },
    _count: { enrollments: 5 },
  },
];

const DIGITAL = {
  totalUsers: 1200,
  activeUsers: 800,
  adoptionPct: 66,
  onlineExams: 40,
  examAttempts: 300,
  labSessions: 25,
  moocEnrollments: 90,
  researchPapers: 55,
  liveSessions: 12,
  materialsUploaded: 210,
};

const SYNC_PAYLOAD = {
  latestRun: {
    id: 'run-1', startedAt: '2026-10-01T10:00:00.000Z', completedAt: '2026-10-01T10:00:02.000Z',
    status: 'SUCCESS', source: 'static-markdown', factsAdded: 4, factsUpdated: 2,
    durationMs: 2100, errorMsg: null, notes: null,
  },
  runHistory: [
    {
      id: 'run-1', startedAt: '2026-10-01T10:00:00.000Z', completedAt: '2026-10-01T10:00:02.000Z',
      status: 'SUCCESS', source: 'static-markdown', factsAdded: 4, factsUpdated: 2,
      durationMs: 2100, errorMsg: null, notes: null,
    },
  ],
  factCount: 6,
  staleCount: 0,
  categories: [
    {
      category: 'identity', count: 2,
      items: [{ key: 'name', value: 'الجامعة', source: 'static-markdown', isStale: false, syncedAt: '2026-10-01T10:00:00.000Z' }],
    },
  ],
};

/** The permissions payload for the matrix pin: USERS_MANAGE rides the
 *  role (effective + fromRole → the «سحب» verb), everything else stays
 *  off (→ the additive «منح» verb). */
const PERMISSIONS = {
  user: {
    id: 'u1',
    email: 'amina@zu.edu.ly',
    role: 'ADMIN',
    firstName: 'أمينة',
    lastName: 'المشرفة',
    scopeFacultyId: null,
    scopeFaculty: null,
  },
  roleDefaults: ['USERS_MANAGE'],
  effective: ['USERS_MANAGE'],
  overrides: [],
};

/* ═══ 1. The .r305ao marker — one page per module + the branches ══ */

describe('R305-A8 marker — governance module roots', () => {
  it('AdminTeachersPage: the roster root carries .r305ao around the PageFrame', async () => {
    getMock.mockImplementation(async (url: string, config?: { params?: Record<string, unknown> }) => {
      if (url !== '/admin/users') throw new Error(`unexpected GET ${url}`);
      const { limit } = config!.params as { limit: number };
      return limit === 1
        ? { data: usersBody([], 87) }
        : { data: usersBody([teacherRow('t1', 'سالم')], 87) };
    });

    const { container } = renderWithProviders(<AdminTeachersPage />);
    expect(await screen.findByText('سالم الفيتوري')).toBeInTheDocument();

    const root = scopedRoot();
    // The marker wraps the whole page — the h1 masthead is inside it.
    expect(root).toContainElement(screen.getByRole('heading', { level: 1, name: 'إدارة الأساتذة' }));
    // And it is the OUTER root, not an inner fragment.
    expect(container.firstElementChild).toHaveClass('r305ao');
  });

  it('AdminPermissionsPage: pending, error, and resolved roots all carry .r305ao', async () => {
    // Pending — the read-only DetailSkeleton branch keeps the marker.
    getMock.mockImplementation(() => new Promise(() => {}));
    const pending = renderWithProviders(<AdminPermissionsPage />, '/admin/permissions/u1');
    expect(pending.container.querySelector('.r305ao')).not.toBeNull();
    pending.unmount();

    // Error — the honest retry state keeps the page chrome + marker.
    getMock.mockRejectedValue(new Error('network down'));
    const errored = renderWithProviders(<AdminPermissionsPage />, '/admin/permissions/u1');
    expect(await screen.findByText('تعذّر تحميل صلاحيات المستخدم')).toBeInTheDocument();
    expect(errored.container.querySelector('.page.r305ao')).not.toBeNull();
    errored.unmount();

    // Resolved — the matrix page root.
    getMock.mockImplementation(async (url: string) => {
      if (url === '/admin/users/u1/permissions') return { data: { data: PERMISSIONS } };
      if (url === '/faculties') return { data: { data: [] } };
      throw new Error(`unexpected GET ${url}`);
    });
    renderWithProviders(<AdminPermissionsPage />, '/admin/permissions/u1');
    expect(await screen.findByRole('heading', { level: 1, name: /أمينة المشرفة/ })).toBeInTheDocument();
    const root = scopedRoot();
    expect(root).toContainElement(screen.getByText('محرّر الصلاحيات'));
  });
});

describe('R305-A8 marker — extras module roots', () => {
  it('AdminStudentsPage: the roster root carries .r305ao around the PageFrame', async () => {
    getMock.mockImplementation(async (url: string) => {
      if (url === '/admin/students') return { data: { data: [STUDENT], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } } };
      if (url === '/faculties') return { data: { data: [] } };
      throw new Error(`unexpected GET ${url}`);
    });

    const { container } = renderWithProviders(<AdminStudentsPage />);
    expect(await screen.findByText('أحمد الزروق')).toBeInTheDocument();

    const root = scopedRoot();
    expect(root).toContainElement(screen.getByRole('heading', { level: 1, name: 'إدارة الطلاب' }));
    expect(container.firstElementChild).toHaveClass('r305ao');
  });

  it('AdminDigitalPage: the snapshot root carries .r305ao', async () => {
    getMock.mockImplementation(async (url: string) => {
      if (url === '/admin/digital') return { data: { data: DIGITAL } };
      throw new Error(`unexpected GET ${url}`);
    });

    renderWithProviders(<AdminDigitalPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'التحوّل الرقميّ' })).toBeInTheDocument();
    // Await the resolved strip before asserting containment.
    expect(await screen.findByText('تبنّي المكوّنات')).toBeInTheDocument();
    expect(scopedRoot()).toContainElement(screen.getByText('تبنّي المكوّنات'));
  });

  it('AdminSettingsPage: the settings root carries .r305ao (health pending included)', () => {
    getMock.mockImplementation(() => new Promise(() => {})); // /health never settles
    renderWithProviders(<AdminSettingsPage />);
    expect(screen.getByRole('heading', { level: 1, name: 'إعدادات المنصّة' })).toBeInTheDocument();
    expect(scopedRoot()).toContainElement(screen.getByText('الهويّة المؤسّسيّة'));
  });
});

describe('R305-A8 marker — sync module roots (every branch)', () => {
  it('pending branch keeps the marker on the aria-busy root', () => {
    getMock.mockImplementation(() => new Promise(() => {})); // /admin/sync never settles
    const { container } = renderWithProviders(<AdminSyncPage />);
    const root = container.querySelector('.page.r305ao');
    expect(root).not.toBeNull();
    expect(root).toHaveAttribute('aria-busy', 'true');
  });

  it('error branch keeps the marker + the retry chrome', async () => {
    getMock.mockRejectedValue(new Error('network down'));
    renderWithProviders(<AdminSyncPage />);
    expect(await screen.findByRole('heading', { level: 1, name: 'المزامنة مع البيانات الرسمية' })).toBeInTheDocument();
    expect(document.querySelector('.page.r305ao')).not.toBeNull();
  });

  it('never-run branch keeps the marker on the honest empty state', async () => {
    // A resolved payload with nothing in it → the !data guard branch.
    // unwrap reads r.data.data — a null body (no run has ever landed)
    // resolves to null, and TanStack v5 treats a void body as an error,
    // so null is the honest shape that reaches the guard.
    getMock.mockResolvedValue({ data: { data: null } });
    renderWithProviders(<AdminSyncPage />);
    expect(await screen.findByText('لم تُنفَّذ أي مزامنة بعد')).toBeInTheDocument();
    expect(document.querySelector('.page.r305ao')).not.toBeNull();
  });

  it('resolved branch keeps the marker + the run-history table', async () => {
    getMock.mockImplementation(async (url: string) => {
      if (url === '/admin/sync') return { data: { data: SYNC_PAYLOAD } };
      throw new Error(`unexpected GET ${url}`);
    });
    renderWithProviders(<AdminSyncPage />);
    expect(await screen.findByText('سجلّ المزامنات')).toBeInTheDocument();
    expect(scopedRoot()).toContainElement(screen.getByText('سجلّ المزامنات'));
    // The real API stays the only source of truth — the resolved run's
    // status badge renders from the payload, never faked.
    expect(screen.getAllByText('ناجحة').length).toBeGreaterThan(0);
  });
});

/* ═══ 2. The danger hierarchy — the destructive verbs stand apart ═ */

describe('R305-A8 danger hierarchy — destructive verbs ride the new vocabulary', () => {
  it('the permissions matrix «سحب» carries .r305ao-btn-danger; the additive «منح» does not', async () => {
    getMock.mockImplementation(async (url: string) => {
      if (url === '/admin/users/u1/permissions') return { data: { data: PERMISSIONS } };
      if (url === '/faculties') return { data: { data: [] } };
      throw new Error(`unexpected GET ${url}`);
    });

    renderWithProviders(<AdminPermissionsPage />, '/admin/permissions/u1');
    expect(await screen.findByText('محرّر الصلاحيات')).toBeInTheDocument();

    // The matrix structure is untouched — six domain groups of perm rows.
    expect(document.querySelector('.govx-matrix')).not.toBeNull();
    expect(document.querySelectorAll('.govx-group').length).toBeGreaterThan(0);

    // «سحب» strips a live capability the instant it is clicked (no
    // confirm on this verb) — the one destructive direction in the
    // matrix, so it is the row verb that gets the danger fill.
    const revoke = screen.getByRole('button', { name: 'سحب' });
    expect(revoke).toHaveClass('r305ao-btn-danger');
    // The additive verb stays on the accent primary — the danger tier
    // would lie about what granting does.
    const grants = screen.getAllByRole('button', { name: 'منح' });
    expect(grants.length).toBeGreaterThan(0);
    for (const grant of grants) {
      expect(grant).not.toHaveClass('r305ao-btn-danger');
    }
  });

  it('the enrollment modal drop group sits inside .r305ao-danger-zone and the confirm gate still runs', async () => {
    getMock.mockImplementation(async (url: string) => {
      switch (url) {
        case '/admin/students':
          return { data: { data: [STUDENT], meta: { page: 1, limit: 20, total: 1, totalPages: 1 } } };
        case '/faculties':
          return { data: { data: [] } };
        case '/enrollments':
          return { data: { data: ENROLLMENTS } };
        case '/enrollments/offerings':
          return { data: { data: OFFERINGS } };
        default:
          throw new Error(`unexpected GET ${url}`);
      }
    });

    renderWithProviders(<AdminStudentsPage />);
    fireEvent.click(await screen.findByRole('button', { name: 'بيانات وتسجيلات أحمد الزروق' }));
    fireEvent.click(await screen.findByRole('button', { name: 'تسجيلات' }));

    // The modal mounts through a portal — wait for the destructive verbs
    // themselves (the zone renders during the enrollments' pending tick
    // too), then prove containment.
    const dropButtons = await screen.findAllByRole('button', { name: 'إلغاء التسجيل' });
    expect(dropButtons.length).toBeGreaterThan(0);
    // The zone: the modal's destructive group (every row's «إلغاء
    // التسجيل» deletes the enrollment AND the progress in the course).
    const zone = dropButtons[0]!.closest('.r305ao-danger-zone');
    expect(zone, 'the drop verb must sit inside the danger zone').not.toBeNull();
    const zoneEl = zone as HTMLElement;
    expect(zoneEl.closest('.modal-card')).not.toBeNull(); // portals to body
    expect(within(zoneEl).getByText('التسجيلات الحالية')).toBeInTheDocument();
    // The zone names the consequence — the note is the quiet red fence.
    expect(within(zoneEl).getByText(/يحذف تسجيل الطالب في المقرّر وتقدُّمه فيه نهائيًا/)).toBeInTheDocument();
    // …and the confirm gate behind them is untouched (AdminStudents-
    // enrollment.test.tsx owns the full dialog contract; this proves
    // the zone did not break the flow).
    fireEvent.click(dropButtons[0]!);
    expect(await screen.findByRole('button', { name: 'إلغاء نهائي' })).toBeInTheDocument();
  });
});

/* ═══ 3. Import wiring — the scoped sheet rides last ═════════════ */

describe('R305-A8 import wiring — the scoped Heron sheet in all three modules', () => {
  const MODULES = [
    'AdminGovernancePages.tsx',
    'AdminExtraPages.tsx',
    'AdminSyncPage.tsx',
  ];

  it('each module imports r305-admin-owner.css AFTER its admin.css import', () => {
    for (const file of MODULES) {
      const src = readFileSync(
        resolvePath(__dirname, '../../src/pages/admin', file),
        'utf8',
      );
      const lines = src.split('\n');
      const sheetIdx = lines.findIndex((l) => l.includes("import '../../styles/r305-admin-owner.css';"));
      const adminIdx = lines.findIndex((l) => l.includes("import '../../styles/admin.css';"));
      expect(sheetIdx, `${file}: the scoped sheet import is missing`).toBeGreaterThan(-1);
      expect(adminIdx, `${file}: the admin.css import is missing`).toBeGreaterThan(-1);
      // Order matters: same @layer pages, later source order wins the
      // equal-specificity ties inside the layer.
      expect(sheetIdx, `${file}: the sheet must land after admin.css`).toBeGreaterThan(adminIdx);
      // "Directly after" in import ORDER — the first import that follows
      // admin.css (comments may sit between) is the scoped sheet.
      const nextImport = lines
        .slice(adminIdx + 1)
        .findIndex((l) => l.trim().startsWith('import '));
      expect(lines[adminIdx + 1 + nextImport]).toContain('r305-admin-owner.css');
    }
  });
});
