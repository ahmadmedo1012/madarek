/**
 * r178 — OwnerInstitutionsPage render tests.
 *
 * The OWNER's institution console (route /owner/institutions): pins the
 * listing contract against mocked institution hooks (the mock boundary
 * OwnerUsersPage's tests established) — both seeded institutions with
 * their status badges, membership/faculty counts, admin rows with the
 * revoke affordance, the create form's required-name gate, the
 * provision-admin modal's mode+email fields, the suspend confirm
 * dialog, and the listing's three honest states (skeleton / empty /
 * rows). Mutation call arguments are asserted where the contract is
 * load-bearing (status toggle → PATCH payload).
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { OwnerInstitutionsPage } from '../../src/pages/owner/OwnerInstitutionsPage';

const ZAWIA = {
  id: 'inst-zawia-showcase',
  name: 'جامعة الزاوية',
  nameEn: 'University of Zawia',
  slug: 'zawia-showcase',
  status: 'ACTIVE',
  createdAt: '2026-10-01T00:00:00.000Z',
  updatedAt: '2026-10-01T00:00:00.000Z',
  activeMembershipCount: 4,
  facultyCount: 25,
  admins: [
    {
      userId: 'u-admin-000000000000',
      email: 'admin@zu.edu.ly',
      firstName: 'إداري',
      lastName: 'تجريبي',
      membershipId: 'mem-admin-zawia',
      isActive: true,
    },
  ],
};

const ALANDALUS = {
  id: 'inst-alandalus-demo',
  name: 'مؤسسة الأندلس التعليمية',
  nameEn: 'Al-Andalus Education Institute',
  slug: 'alandalus-demo',
  status: 'SUSPENDED',
  createdAt: '2026-10-02T00:00:00.000Z',
  updatedAt: '2026-10-02T00:00:00.000Z',
  activeMembershipCount: 2,
  facultyCount: 1,
  admins: [
    {
      userId: 'u-admin2-0000000000',
      email: 'admin2@demo.madarek.ly',
      firstName: 'مدير',
      lastName: 'الأندلس',
      membershipId: 'mem-admin-alandalus',
      isActive: false,
    },
  ],
};

const mocks = vi.hoisted(() => ({
  listing: {
    data: null as typeof ZAWIA[] | null,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  },
  create: { mutate: vi.fn(), isPending: false },
  update: { mutate: vi.fn(), isPending: false },
  provision: { mutate: vi.fn(), isPending: false },
  revoke: { mutate: vi.fn(), isPending: false },
  restore: { mutate: vi.fn(), isPending: false },
}));

vi.mock('../../src/hooks/useInstitutions', () => ({
  useOwnerInstitutions: () => mocks.listing,
  useCreateInstitution: () => mocks.create,
  useUpdateInstitution: () => mocks.update,
  useProvisionInstitutionAdmin: () => mocks.provision,
  useRevokeInstitutionMembership: () => mocks.revoke,
  useRestoreInstitutionMembership: () => mocks.restore,
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    apiErrorMessage: () => 'حاول مرة أخرى بعد لحظات.',
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.listing.data = null;
  mocks.listing.isPending = false;
  mocks.listing.isError = false;
  mocks.listing.error = null;
});

function renderPage() {
  return render(
    <MemoryRouter>
      <OwnerInstitutionsPage />
    </MemoryRouter>,
  );
}

describe('OwnerInstitutionsPage — listing (r178)', () => {
  it('renders the page header and both seeded institutions with their status badges and counts', () => {
    mocks.listing.data = [ZAWIA, ALANDALUS];
    renderPage();

    expect(screen.getByRole('heading', { level: 1, name: 'المؤسسات' })).toBeInTheDocument();
    expect(screen.getByText('إدارة المؤسسات التعليمية على المنصّة')).toBeInTheDocument();

    // Identity: Arabic name + Latin nameEn + slug per institution.
    expect(screen.getByText('جامعة الزاوية')).toBeInTheDocument();
    expect(screen.getByText('University of Zawia')).toBeInTheDocument();
    expect(screen.getByText('zawia-showcase')).toBeInTheDocument();
    expect(screen.getByText('مؤسسة الأندلس التعليمية')).toBeInTheDocument();

    // Status badges — the Arabic status vocabulary, not raw enum values.
    expect(screen.getByText('نشطة')).toBeInTheDocument();
    expect(screen.getByText('معلّقة')).toBeInTheDocument();

    // Counts land as figures (4 members / 25 faculties for Zawia).
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument();

    // Admin rows: active Zawia admin offers «إلغاء العضوية», the revoked
    // Al-Andalus admin offers «استعادة».
    expect(screen.getByText('admin@zu.edu.ly')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'إلغاء العضوية' })).toBeInTheDocument();
    expect(screen.getByText('admin2@demo.madarek.ly')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'استعادة' })).toBeInTheDocument();
  });

  it('renders the table skeleton while the listing is pending (no rows)', () => {
    mocks.listing.isPending = true;
    renderPage();

    expect(document.querySelector('[aria-busy="true"]')).toBeTruthy();
    expect(screen.queryByRole('row')).toBeNull();
  });

  it('renders the honest empty state when no institution exists', () => {
    mocks.listing.data = [];
    renderPage();

    expect(screen.getByText('لا توجد مؤسسات بعد')).toBeInTheDocument();
    expect(screen.queryByRole('row')).toBeNull();
  });
});

describe('OwnerInstitutionsPage — create form (r178)', () => {
  it('gates the submit on a name of at least two characters', () => {
    mocks.listing.data = [];
    renderPage();

    const submit = screen.getByRole('button', { name: /إنشاء المؤسسة/ });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/اسم المؤسسة/), { target: { value: 'م' } });
    expect(submit).toBeDisabled();

    fireEvent.change(screen.getByLabelText(/اسم المؤسسة/), { target: { value: 'أكاديمية طرابلس' } });
    expect(submit).not.toBeDisabled();
  });
});

describe('OwnerInstitutionsPage — provision admin modal (r178)', () => {
  it('opens with the institution named and the mode + email fields', () => {
    mocks.listing.data = [ZAWIA];
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /تعيين مدير/ }));

    // The modal names the target institution — the OWNER must always
    // know which institution the grant lands in.
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/جامعة الزاوية/)).toBeInTheDocument();
    const modeSelect = within(dialog).getByLabelText('نوع المستخدم') as HTMLSelectElement;
    expect(modeSelect.value).toBe('new');
    expect(within(dialog).getByLabelText(/البريد الإلكتروني/)).toBeInTheDocument();
    // mode=new: password required.
    expect(within(dialog).getByLabelText(/كلمة المرور/)).toBeInTheDocument();
  });
});

describe('OwnerInstitutionsPage — status toggle (r178)', () => {
  it('confirms suspension and PATCHes status SUSPENDED for the named institution', () => {
    mocks.listing.data = [ZAWIA];
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'تعليق' }));

    // The confirm dialog names the institution before the danger lands.
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/هل تريد تعليق «جامعة الزاوية»/)).toBeInTheDocument();

    fireEvent.click(within(dialog).getByRole('button', { name: 'تعليق المؤسسة' }));

    expect(mocks.update.mutate).toHaveBeenCalledWith(
      { id: 'inst-zawia-showcase', patch: { status: 'SUSPENDED' } },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it('offers reactivation for a suspended institution (patch ACTIVE)', () => {
    mocks.listing.data = [ALANDALUS];
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'تنشيط' }));
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'تنشيط المؤسسة' }));

    expect(mocks.update.mutate).toHaveBeenCalledWith(
      { id: 'inst-alandalus-demo', patch: { status: 'ACTIVE' } },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });
});

describe('OwnerInstitutionsPage — membership revoke (r178)', () => {
  it('confirms and revokes the admin membership by its membershipId', () => {
    mocks.listing.data = [ZAWIA];
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'إلغاء العضوية' }));

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/هل تريد إلغاء عضوية «إداري تجريبي»/)).toBeInTheDocument();

    // The dialog's confirm shares the row action's name — pick the one
    // INSIDE the dialog (the row button stays rendered behind it).
    fireEvent.click(within(dialog).getByRole('button', { name: 'إلغاء العضوية' }));

    expect(mocks.revoke.mutate).toHaveBeenCalledWith(
      { institutionId: 'inst-zawia-showcase', membershipId: 'mem-admin-zawia' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });

  it('restores a revoked admin membership without a confirm dialog', () => {
    mocks.listing.data = [ALANDALUS];
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: 'استعادة' }));

    expect(mocks.restore.mutate).toHaveBeenCalledWith(
      { institutionId: 'inst-alandalus-demo', membershipId: 'mem-admin-alandalus' },
      expect.objectContaining({ onSuccess: expect.any(Function), onError: expect.any(Function) }),
    );
  });
});
