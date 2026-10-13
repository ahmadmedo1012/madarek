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
import { render, screen, fireEvent, cleanup, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StudentResearchPage from '../../src/pages/student/ResearchPage';

const mocks = vi.hoisted(() => ({
  my: { data: [] as unknown[], isPending: false, isError: false, error: null as unknown, refetch: () => undefined },
  enrollments: { data: [] as unknown[], isPending: false, isError: false, error: null as unknown, refetch: () => undefined },
  upload: { isPending: false, isError: false, error: null, mutateAsync: vi.fn() },
  /* P3: the file-stage mutation (POST /files/papers → { fileUrl }). */
  uploadFile: { isPending: false, isError: false, error: null, mutateAsync: vi.fn() },
  scan: { isPending: false, isError: false, error: null, mutateAsync: vi.fn() },
}));

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    useMyResearch: () => mocks.my,
    useMyEnrollments: () => mocks.enrollments,
    useUploadPaper: () => mocks.upload,
    useUploadPaperFile: () => mocks.uploadFile,
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
    // P3: the file field is a REAL picker now (the r154d disclosure about
    // ephemeral storage is gone — direct upload ships). It must be
    // labelled through the canon and filter to PDFs.
    const picker = screen.getByLabelText('ملف البحث (PDF، اختياري)') as HTMLInputElement;
    expect(picker.type).toBe('file');
    expect(picker.accept).toBe('application/pdf,.pdf');
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

/* ───────────────────────────────────────────────
 * P3 — the REAL upload chain. The modal's file field is a live picker
 * now: the caps (PDF-only, 20MB) reject client-side BEFORE any request;
 * a picked PDF stages first (POST /files/papers → fileUrl), then the
 * create mutation carries that fileUrl; no file ⇒ create without
 * fileUrl (the old flow, unchanged); a create failure keeps the modal
 * open and the resubmit REUSES the staged fileUrl (no blind re-upload
 * of the same File instance).
 * ─────────────────────────────────────────────── */
describe('ResearchPage upload modal — the real file chain (P3)', () => {
  beforeEach(() => {
    // Isolate from the r157 describe above (its FAILED_PAPER row renders
    // its own role=alert and a resubmit button that would collide).
    mocks.my.data = [];
    mocks.enrollments.data = [];
  });

  /** Drive the picker the way a user does: a change event with files. */
  async function pickFile(file: File) {
    const picker = screen.getByLabelText('ملف البحث (PDF، اختياري)') as HTMLInputElement;
    fireEvent.change(picker, { target: { files: [file] } });
  }

  async function fillTitle() {
    fireEvent.change(screen.getByLabelText('عنوان البحث') as HTMLInputElement, {
      target: { value: 'بحث تجريبي للتصدير' },
    });
  }

  it('shows the picked file in a removable row — and the same file can be re-picked after removal', async () => {
    await openUploadModal();
    const pdf = new File(['%PDF-1.4 fake'], 'draft-v1.pdf', { type: 'application/pdf' });
    await pickFile(pdf);

    // The picked-file row names the file and carries the 44px remove button.
    expect(screen.getByText('draft-v1.pdf')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'إزالة الملف' }));
    expect(screen.queryByText('draft-v1.pdf')).toBeNull();

    // Re-picking the SAME file must fire the change event again — the
    // input's value is reset on removal, not left holding the old name.
    await pickFile(new File(['%PDF-1.4 fake'], 'draft-v1.pdf', { type: 'application/pdf' }));
    expect(screen.getByText('draft-v1.pdf')).toBeInTheDocument();
  });

  it('rejects a non-PDF file client-side — the Arabic error lands BEFORE any request', async () => {
    await openUploadModal();
    await fillTitle();
    await pickFile(new File(['x'], 'notes.txt', { type: 'text/plain' }));
    fireEvent.click(screen.getByRole('button', { name: 'رفع البحث' }));

    const dialog = screen.getByRole('dialog');
    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('الملف يجب أن يكون بصيغة PDF فقط.');
    // The client mirrors the server's caps — neither mutation fires.
    expect(mocks.uploadFile.mutateAsync).not.toHaveBeenCalled();
    expect(mocks.upload.mutateAsync).not.toHaveBeenCalled();
  });

  it('rejects a >20MB PDF client-side — before any request', async () => {
    await openUploadModal();
    await fillTitle();
    const big = new File(['x'], 'big.pdf', { type: 'application/pdf' });
    Object.defineProperty(big, 'size', { value: 21 * 1024 * 1024 });
    await pickFile(big);
    fireEvent.click(screen.getByRole('button', { name: 'رفع البحث' }));

    const dialog = screen.getByRole('dialog');
    const alert = await within(dialog).findByRole('alert');
    expect(alert).toHaveTextContent('حجم الملف يتجاوز الحد الأقصى المسموح (20 ميغابايت).');
    expect(mocks.uploadFile.mutateAsync).not.toHaveBeenCalled();
    expect(mocks.upload.mutateAsync).not.toHaveBeenCalled();
  });

  it('happy path: stages the File first, then creates the paper carrying the returned fileUrl', async () => {
    mocks.uploadFile.mutateAsync.mockResolvedValueOnce({ fileUrl: '/api/v1/files/papers/cxxx.pdf' });
    mocks.upload.mutateAsync.mockResolvedValueOnce({});
    await openUploadModal();
    await fillTitle();
    const pdf = new File(['%PDF-1.4 fake'], 'final-report.pdf', { type: 'application/pdf' });
    await pickFile(pdf);
    fireEvent.click(screen.getByRole('button', { name: 'رفع البحث' }));

    // Stage first — with the File instance itself.
    await waitFor(() => {
      expect(mocks.uploadFile.mutateAsync).toHaveBeenCalledWith(pdf);
    });
    // Then the create carries the staged fileUrl alongside the metadata.
    await waitFor(() => {
      expect(mocks.upload.mutateAsync).toHaveBeenCalledWith({
        title: 'بحث تجريبي للتصدير',
        abstract: undefined,
        offeringId: undefined,
        fileUrl: '/api/v1/files/papers/cxxx.pdf',
      });
    });
    // A landed create closes the modal.
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });

  it('no-file path unchanged: create fires WITHOUT a fileUrl and never stages', async () => {
    mocks.upload.mutateAsync.mockResolvedValueOnce({});
    await openUploadModal();
    await fillTitle();
    fireEvent.click(screen.getByRole('button', { name: 'رفع البحث' }));

    await waitFor(() => {
      expect(mocks.upload.mutateAsync).toHaveBeenCalledTimes(1);
    });
    const call = mocks.upload.mutateAsync.mock.calls[0]![0] as { fileUrl?: string };
    expect(call.fileUrl).toBeUndefined();
    expect(mocks.uploadFile.mutateAsync).not.toHaveBeenCalled();
  });

  it('a create failure after a staged upload reuses the fileUrl on resubmit — no blind re-upload', async () => {
    mocks.uploadFile.mutateAsync.mockResolvedValueOnce({ fileUrl: '/api/v1/files/papers/keep.pdf' });
    mocks.upload.mutateAsync.mockRejectedValueOnce(new Error('create failed'));
    await openUploadModal();
    await fillTitle();
    const pdf = new File(['%PDF-1.4 fake'], 'keep.pdf', { type: 'application/pdf' });
    await pickFile(pdf);
    fireEvent.click(screen.getByRole('button', { name: 'رفع البحث' }));

    // The stage succeeded, the create failed → the modal STAYS open.
    await waitFor(() => {
      expect(mocks.upload.mutateAsync).toHaveBeenCalledTimes(1);
    });
    expect(await within(screen.getByRole('dialog')).findByRole('alert')).toBeTruthy();
    expect(screen.queryByRole('dialog')).toBeTruthy();

    // Resubmit (same File instance still picked): the create retries with
    // the SAME staged fileUrl, and the upload mutation is NOT re-fired.
    mocks.upload.mutateAsync.mockResolvedValueOnce({});
    fireEvent.click(screen.getByRole('button', { name: 'رفع البحث' }));
    await waitFor(() => {
      expect(mocks.upload.mutateAsync).toHaveBeenCalledTimes(2);
    });
    const second = mocks.upload.mutateAsync.mock.calls[1]![0] as { fileUrl?: string };
    expect(second.fileUrl).toBe('/api/v1/files/papers/keep.pdf');
    expect(mocks.uploadFile.mutateAsync).toHaveBeenCalledTimes(1);
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).toBeNull();
    });
  });
});
