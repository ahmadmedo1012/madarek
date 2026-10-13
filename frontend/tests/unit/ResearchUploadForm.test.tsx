/**
 * r152c (A2) — ResearchPage upload-modal FormField wiring tests.
 *
 * The modal's four fields joined the FormField canon; these pins verify
 * the association contract the migration promised:
 *   1. every control is labelled (getByLabelText works — the old
 *      .auth-field copies were hand-wired and one was dangling),
 *   2. the short-title error is role=alert AND the input carries
 *      aria-invalid + aria-describedby pointing at a REAL element
 *      (the old markup pointed at an id that only existed
 *      conditionally — a dangling reference for screen readers),
 *   3. the file dropzone (a <button>) is labelled and receives the
 *      FormField-injected id.
 *
 * Data hooks are mocked at the useResources boundary (house pattern).
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentResearchPage from '../../src/pages/student/ResearchPage';

const mocks = vi.hoisted(() => ({
  my: { data: [], isPending: false, isError: false, error: null, refetch: () => undefined },
  enrollments: { data: [], isPending: false, isError: false, error: null, refetch: () => undefined },
  upload: { isPending: false, isError: false, error: null, mutateAsync: vi.fn() },
  scan: { isPending: false, isError: false, error: null, mutateAsync: vi.fn() },
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    useMyResearch: () => mocks.my,
    useMyEnrollments: () => mocks.enrollments,
    useUploadPaper: () => mocks.upload,
    useScanPaper: () => mocks.scan,
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <StudentResearchPage />
    </MemoryRouter>,
  );
}

async function openUploadModal() {
  renderPage();
  // Two affordances open the same modal (header + empty state) — either works.
  const openers = await screen.findAllByRole('button', { name: /رفع بحث جديد/ });
  fireEvent.click(openers[0]!);
  await screen.findByRole('dialog');
}

describe('ResearchPage upload modal — FormField wiring (r152c)', () => {
  it('labels every control through the canon (htmlFor association)', async () => {
    await openUploadModal();
    expect(screen.getByLabelText('عنوان البحث')).toBeInstanceOf(HTMLInputElement);
    expect(screen.getByLabelText('الملخّص (اختياري)')).toBeInstanceOf(HTMLTextAreaElement);
    expect(screen.getByLabelText('المقرّر الأكاديمي المرتبط (اختياري)')).toBeInstanceOf(HTMLSelectElement);
    // r154d: the file field is no longer a fake upload button — it's an
    // honest disclosure that direct upload is unavailable (ephemeral disk).
    // The disclosure text must be present and visible to assistive tech.
    expect(screen.getByText(/رفع الملفات غير متاح بعد/)).toBeTruthy();
  });

  it('wires the short-title error as a live, non-dangling association', async () => {
    await openUploadModal();
    const title = screen.getByLabelText('عنوان البحث') as HTMLInputElement;

    // Clean state: no error attributes at all.
    expect(title.getAttribute('aria-invalid')).toBeNull();
    expect(title.getAttribute('aria-describedby')).toBeNull();

    fireEvent.change(title, { target: { value: 'أ' } });
    const alert = await screen.findByRole('alert');
    expect(alert).toHaveTextContent('يجب أن يكون 3 أحرف على الأقل.');

    // The input is marked invalid and its describedby RESOLVES to the
    // alert element — the dangling-reference fix.
    expect(title.getAttribute('aria-invalid')).toBe('true');
    const describedBy = title.getAttribute('aria-describedby');
    expect(describedBy).not.toBeNull();
    expect(document.getElementById(describedBy!)).toBe(alert);
  });

  it('clears the error association when the title becomes valid', async () => {
    await openUploadModal();
    const title = screen.getByLabelText('عنوان البحث') as HTMLInputElement;

    fireEvent.change(title, { target: { value: 'أ' } });
    await screen.findByRole('alert');

    fireEvent.change(title, { target: { value: 'عنوان بحث صالح للعرض' } });
    await waitFor(() => {
      expect(screen.queryByRole('alert')).toBeNull();
      expect(title.getAttribute('aria-invalid')).toBeNull();
      expect(title.getAttribute('aria-describedby')).toBeNull();
    });
  });
});

