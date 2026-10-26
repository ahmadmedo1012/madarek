/**
 * r178 — OwnerInstitutionsPage render tests.
 *
 * R320 override (§B rename, c1-RENAME): the provision surface names the
 * institution's ADMIN account «مسجل عام» (registrar general) — was
 * «مدير» in every label/button/title below; the role is one name
 * everywhere (lib/roleLabels.ts + backend twin).
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
import { render, screen, fireEvent, cleanup, within, waitFor } from '@testing-library/react';
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
      email: 'admin2@test.ly',
      firstName: 'المسجل',
      lastName: 'العام',
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
  /* r183-B5: create + provision moved to mutateAsync (the keep-edits
   * contract — the draft survives a rejected create/provision), so the
   * mocks carry the async shape + the isError/error/reset fields the
   * page reads for the inline AlertRow. */
  create: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null as unknown,
    reset: vi.fn(),
  },
  update: { mutate: vi.fn(), isPending: false },
  provision: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null as unknown,
    reset: vi.fn(),
  },
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
  mocks.create.isPending = false;
  mocks.create.isError = false;
  mocks.create.error = null;
  mocks.provision.isPending = false;
  mocks.provision.isError = false;
  mocks.provision.error = null;
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
    expect(screen.getByText('admin2@test.ly')).toBeInTheDocument();
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

    fireEvent.click(screen.getByRole('button', { name: /تعيين مسجل عام/ }));

    // The modal names the target institution — the OWNER must always
    // know which institution the grant lands in.
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(/جامعة الزاوية/)).toBeInTheDocument();
    const modeSelect = within(dialog).getByLabelText('نوع المستخدم') as HTMLSelectElement;
    expect(modeSelect.value).toBe('new');
    expect(within(dialog).getByLabelText(/البريد الإلكتروني/)).toBeInTheDocument();
    // mode=new: password required.
    expect(within(dialog).getByLabelText('كلمة المرور')).toBeInTheDocument();
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

/* ════════════════════════════════════════════════════════════════
   r183-B5 (A9 wave-A P2) — keep edits on failure: create-institution
   and provision-admin clear their drafts ONLY on success; a failed
   mutation (409 slug conflict / 404 unknown email) keeps every typed
   field, the modal stays open, and the failure is named inline (the
   settings/detail-page modal contract). Plus the A9 P3 quick wins:
   masked password + opt-in reveal, h3.modal-title.
   ════════════════════════════════════════════════════════════════ */
describe('OwnerInstitutionsPage — keep edits on create failure (r183-B5)', () => {
  it('a rejected create keeps every typed field (the draft clears only on success)', async () => {
    mocks.listing.data = [];
    renderPage();

    fireEvent.change(screen.getByLabelText(/اسم المؤسسة/), { target: { value: 'أكاديمية طرابلس' } });
    fireEvent.change(screen.getByLabelText(/المعرّف/), { target: { value: 'zawia-showcase' } });

    mocks.create.mutateAsync.mockRejectedValueOnce(new Error('409 CONFLICT'));
    fireEvent.click(screen.getByRole('button', { name: /إنشاء المؤسسة/ }));

    await waitFor(() => expect(mocks.create.mutateAsync).toHaveBeenCalledTimes(1));
    // THE DRAFT SURVIVES — the 409 slug conflict keeps both fields the
    // owner typed (the old code cleared them at submit).
    expect((screen.getByLabelText(/اسم المؤسسة/) as HTMLInputElement).value).toBe('أكاديمية طرابلس');
    expect((screen.getByLabelText(/المعرّف/) as HTMLInputElement).value).toBe('zawia-showcase');
  });

  it('a successful create clears the draft', async () => {
    mocks.listing.data = [];
    renderPage();

    fireEvent.change(screen.getByLabelText(/اسم المؤسسة/), { target: { value: 'أكاديمية طرابلس' } });
    mocks.create.mutateAsync.mockResolvedValueOnce({ institution: { name: 'أكاديمية طرابلس' } });
    fireEvent.click(screen.getByRole('button', { name: /إنشاء المؤسسة/ }));

    await waitFor(() =>
      expect((screen.getByLabelText(/اسم المؤسسة/) as HTMLInputElement).value).toBe(''),
    );
  });

  it('the create failure is named inline (AlertRow — not a vanishing toast)', () => {
    mocks.listing.data = [];
    mocks.create.isError = true;
    mocks.create.error = new Error('409 CONFLICT');
    renderPage();

    expect(screen.getByText('تعذّر إنشاء المؤسسة')).toBeInTheDocument();
    expect(screen.getByText('حاول مرة أخرى بعد لحظات.')).toBeInTheDocument();
  });
});

describe('OwnerInstitutionsPage — keep edits on provision failure (r183-B5)', () => {
  it('a rejected provision keeps the modal OPEN with the draft intact', async () => {
    mocks.listing.data = [ZAWIA];
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /تعيين مسجل عام/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/البريد الإلكتروني/), { target: { value: 'new@test.ly' } });
    fireEvent.change(within(dialog).getByLabelText('كلمة المرور'), { target: { value: 'Madarek-2026-Demo' } });

    mocks.provision.mutateAsync.mockRejectedValueOnce(new Error('404 UNKNOWN_EMAIL'));
    fireEvent.click(within(dialog).getByRole('button', { name: 'تعيين المسجل العام' }));

    await waitFor(() => expect(mocks.provision.mutateAsync).toHaveBeenCalledTimes(1));
    // The modal stays open — the old code closed it right after mutate().
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect((within(dialog).getByLabelText(/البريد الإلكتروني/) as HTMLInputElement).value).toBe('new@test.ly');
    expect((within(dialog).getByLabelText('كلمة المرور') as HTMLInputElement).value).toBe('Madarek-2026-Demo');
  });

  it('a successful provision closes the modal', async () => {
    mocks.listing.data = [ZAWIA];
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /تعيين مسجل عام/ }));
    const dialog = screen.getByRole('dialog');
    fireEvent.change(within(dialog).getByLabelText(/البريد الإلكتروني/), { target: { value: 'new@test.ly' } });
    fireEvent.change(within(dialog).getByLabelText('كلمة المرور'), { target: { value: 'Madarek-2026-Demo' } });

    mocks.provision.mutateAsync.mockResolvedValueOnce({
      user: { firstName: 'مسجل', lastName: 'جديد' },
    });
    fireEvent.click(within(dialog).getByRole('button', { name: 'تعيين المسجل العام' }));

    await waitFor(() => expect(mocks.provision.mutateAsync).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('the provision failure is named inline inside the modal', () => {
    mocks.listing.data = [ZAWIA];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /تعيين مسجل عام/ }));

    // The mock flips the mutation's error state the page reads at render.
    mocks.provision.isError = true;
    mocks.provision.error = new Error('404 UNKNOWN_EMAIL');
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'إلغاء' }));
    // Re-open — the error reads from the (still-flagged) mutation state.
    fireEvent.click(screen.getByRole('button', { name: /تعيين مسجل عام/ }));

    expect(screen.getByText('تعذّر تعيين المسجل العام')).toBeInTheDocument();
  });
});

describe('OwnerInstitutionsPage — provision modal quick wins (r183-B5, A9 P3)', () => {
  it('the password is masked by default; the reveal toggle is opt-in', () => {
    mocks.listing.data = [ZAWIA];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /تعيين مسجل عام/ }));

    const dialog = screen.getByRole('dialog');
    const password = within(dialog).getByLabelText('كلمة المرور') as HTMLInputElement;
    expect(password.type).toBe('password'); // was type="text"

    const reveal = within(dialog).getByRole('button', { name: 'إظهار كلمة المرور' });
    fireEvent.click(reveal);
    expect(password.type).toBe('text');
    expect(within(dialog).getByRole('button', { name: 'إخفاء كلمة المرور' })).toBeInTheDocument();
    expect(reveal.getAttribute('aria-pressed')).toBe('true');
  });

  it('the modal title is an h3 (the owner modals\' heading grammar)', () => {
    mocks.listing.data = [ZAWIA];
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /تعيين مسجل عام/ }));

    expect(
      within(screen.getByRole('dialog')).getByRole('heading', {
        level: 3,
        name: 'تعيين مسجل عام للمؤسسة',
      }),
    ).toBeInTheDocument();
  });
});
