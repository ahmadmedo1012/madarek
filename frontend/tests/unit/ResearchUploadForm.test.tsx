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
import { describe, expect, it, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentResearchPage from '../../src/pages/student/ResearchPage';

const mocks = vi.hoisted(() => ({
  my: { data: [] as unknown[], isPending: false, isError: false, error: null as unknown, refetch: () => undefined },
  enrollments: { data: [] as unknown[], isPending: false, isError: false, error: null as unknown, refetch: () => undefined },
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

/* ────────────────────────────────────────────────────────────────
 * r157 (F8) — resubmit prefill: «رفع نسخة جديدة» on a CHECKS_FAILED
 * paper opens the upload modal carrying the failed paper's
 * title/abstract/offering, so the student fixes content instead of
 * retyping metadata from memory. A fresh open (the header CTA) resets
 * the fields — no leakage from the previous resubmit.
 * ──────────────────────────────────────────────────────────────── */
describe('ResearchPage resubmit — CHECKS_FAILED prefill (r157)', () => {
  const FAILED_PAPER = {
    id: 'p1',
    title: 'تحليل أداء قواعد البيانات الموزعة',
    abstract: 'دراسة تجريبية لأداء النسخ المتماثلة تحت حمل متغيّر.',
    fileUrl: null,
    status: 'CHECKS_FAILED',
    plagiarismPct: 41.2,
    aiContentPct: 55.5,
    grade: null,
    feedback: null,
    uploadedAt: new Date(Date.now() - 86_400_000).toISOString(),
    scannedAt: new Date(Date.now() - 43_200_000).toISOString(),
    gradedAt: null,
    publishedAt: null,
    student: { id: 'st1', firstName: 'آمنة', lastName: 'العبيدي', avatarInitials: null, avatarColor: null },
    reviewer: null,
    offering: { id: 'off1', course: { name: 'هندسة البرمجيات', code: 'SE301' } },
  };

  beforeEach(() => {
    mocks.my.data = [FAILED_PAPER];
    mocks.enrollments.data = [
      { offering: { id: 'off1', course: { name: 'هندسة البرمجيات', code: 'SE301' } } },
    ];
  });

  it('«رفع نسخة جديدة» opens the modal PREFILLED with the failed paper (title/abstract/offering)', async () => {
    renderPage();

    // The failed paper's banner carries the resubmit action…
    const resubmit = screen.getByRole('button', { name: 'رفع نسخة جديدة' });
    fireEvent.click(resubmit);

    await screen.findByRole('dialog');

    // …and the modal opens carrying the paper's own metadata.
    const title = screen.getByLabelText('عنوان البحث') as HTMLInputElement;
    const abstract = screen.getByLabelText('الملخّص (اختياري)') as HTMLTextAreaElement;
    const offering = screen.getByLabelText('المقرّر الأكاديمي المرتبط (اختياري)') as HTMLSelectElement;
    expect(title.value).toBe('تحليل أداء قواعد البيانات الموزعة');
    expect(abstract.value).toBe('دراسة تجريبية لأداء النسخ المتماثلة تحت حمل متغيّر.');
    expect(offering.value).toBe('off1');
  });

  it('a fresh open after close resets the fields — no prefill leakage', async () => {
    renderPage();

    // Open the prefilled resubmit modal, then close it (dirty → confirm).
    fireEvent.click(screen.getByRole('button', { name: 'رفع نسخة جديدة' }));
    await screen.findByRole('dialog');
    fireEvent.click(screen.getByRole('button', { name: 'إلغاء' }));
    fireEvent.click(await screen.findByRole('button', { name: 'التخلّي عن التعديلات' }));
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    // The header CTA opens a FRESH modal — empty fields.
    fireEvent.click(screen.getByRole('button', { name: 'رفع بحث جديد' }));
    await screen.findByRole('dialog');

    const title = screen.getByLabelText('عنوان البحث') as HTMLInputElement;
    const abstract = screen.getByLabelText('الملخّص (اختياري)') as HTMLTextAreaElement;
    const offering = screen.getByLabelText('المقرّر الأكاديمي المرتبط (اختياري)') as HTMLSelectElement;
    expect(title.value).toBe('');
    expect(abstract.value).toBe('');
    expect(offering.value).toBe('');
  });
});

