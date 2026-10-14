/**
 * r164-h — the materials PDF channel's upload states.
 *
 * MaterialFormModal (file mode) now carries the full upload lifecycle:
 *  · pick guard — validatePdfFile fires the MOMENT a wrong file is
 *    picked (wrong type / oversize), not at submit: immediate inline
 *    Arabic feedback; a valid pick clears a stale error.
 *  · progress — the mutation's onUploadProgress (axios) drives a
 *    determinate ProgressBar (byte-accurate, live-announced).
 *  · failure retry — the draft (file + name + description) survives a
 *    failed attempt; «إعادة المحاولة» re-runs the SAME submit path.
 *
 * Mirrors TeacherPages.test.tsx's mock boundary (hooks stubbed at the
 * useResources seam; MaterialFormModal + its real Modal/discard guard
 * render for real).
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { MaterialsPage } from '../../src/pages/teacher/TeacherPages';

const mocks = vi.hoisted(() => ({
  offerings: [] as unknown[],
  materials: {
    data: [] as unknown[],
    isPending: false,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  createMaterial: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null as unknown,
  },
  uploadMaterial: {
    mutateAsync: vi.fn(),
    isPending: false,
    isError: false,
    error: null as unknown,
  },
}));

vi.mock('../../src/hooks/useResources', () => ({
  useTeacherOfferings: () => ({
    data: mocks.offerings,
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useTeacherMaterials: () => mocks.materials,
  useCreateMaterial: () => mocks.createMaterial,
  useUploadMaterialFile: () => mocks.uploadMaterial,
  apiErrorMessage: (_e: unknown, fallback: string) => fallback,
}));

const OFFERING = {
  id: 'off1',
  term: '2026-1',
  room: 'قاعة 12',
  capacity: 40,
  course: { id: 'c1', code: 'SE101', name: 'هندسة البرمجيات', iconEmoji: null, themeColor: null, credits: 3 },
  _count: { enrollments: 2, assignments: 1, lectures: 4, examTemplates: 0 },
  schedule: [],
};

const VALID_PDF = () => new File(['%PDF-1.4 fake'], 'lecture-3.pdf', { type: 'application/pdf' });
const WRONG_TYPE = () => new File(['plain text'], 'notes.txt', { type: 'text/plain' });

const renderModal = () => {
  const utils = render(<MemoryRouter><MaterialsPage /></MemoryRouter>);
  // The page's header CTA opens the modal.
  fireEvent.click(screen.getByRole('button', { name: /إضافة مادة/ }));
  // The Modal renders through a portal on document.body — the page
  // container never sees it.
  const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
  expect(fileInput).not.toBeNull();
  return { ...utils, fileInput };
};

beforeEach(() => {
  mocks.offerings = [OFFERING];
  mocks.materials = { data: [], isPending: false, isError: false, error: null, refetch: vi.fn() };
  mocks.createMaterial = { mutateAsync: vi.fn(), isPending: false, isError: false, error: null };
  mocks.uploadMaterial = { mutateAsync: vi.fn(), isPending: false, isError: false, error: null };
});

describe('MaterialFormModal (file mode) — pick guard (r164-h)', () => {
  it('rejects a wrong-type file the MOMENT it is picked — before any submit', () => {
    const { fileInput } = renderModal();

    fireEvent.change(fileInput, { target: { files: [WRONG_TYPE()] } });

    // The shared pdfUpload mirror's message, rendered inline with no
    // submit pressed (the mutation never fired).
    expect(screen.getByText('الملف يجب أن يكون بصيغة PDF فقط.')).toBeInTheDocument();
    expect(mocks.uploadMaterial.mutateAsync).not.toHaveBeenCalled();
  });

  it('a valid pick clears the stale file error', () => {
    const { fileInput } = renderModal();

    fireEvent.change(fileInput, { target: { files: [WRONG_TYPE()] } });
    expect(screen.getByText('الملف يجب أن يكون بصيغة PDF فقط.')).toBeInTheDocument();

    fireEvent.change(fileInput, { target: { files: [VALID_PDF()] } });
    expect(screen.queryByText('الملف يجب أن يكون بصيغة PDF فقط.')).toBeNull();
  });
});

describe('MaterialFormModal (file mode) — determinate progress (r164-h)', () => {
  it('submits with an onUploadProgress callback and renders the live bar while in flight', async () => {
    // In flight for the whole test — the successful path closes the
    // modal (toast + onClose); the bar only lives while pending.
    mocks.uploadMaterial.mutateAsync.mockImplementation(() => new Promise(() => {}));
    const { fileInput, rerender } = renderModal();

    fireEvent.change(fileInput, { target: { files: [VALID_PDF()] } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'إضافة المادة' }));
    });

    expect(mocks.uploadMaterial.mutateAsync).toHaveBeenCalledTimes(1);
    const payload = mocks.uploadMaterial.mutateAsync.mock.calls[0]![0] as {
      file: File; onUploadProgress?: (pct: number) => void;
    };
    expect(payload.file.name).toBe('lecture-3.pdf');
    // The progress contract travels with the mutation.
    expect(typeof payload.onUploadProgress).toBe('function');

    // In flight → the bar renders at 0% until bytes report back.
    mocks.uploadMaterial.isPending = true;
    rerender(<MemoryRouter><MaterialsPage /></MemoryRouter>);
    expect(screen.getByText('جارٍ رفع الملف… 0%')).toBeInTheDocument();

    // A progress event drives the bar — real bytes, not a fake spinner.
    act(() => payload.onUploadProgress?.(50));
    expect(screen.getByText('جارٍ رفع الملف… 50%')).toBeInTheDocument();
  });
});

describe('MaterialFormModal (file mode) — failure retry (r164-h)', () => {
  it('a failed attempt keeps the draft; «إعادة المحاولة» re-runs the SAME submit path', async () => {
    // The first attempt REJECTS — the catch branch keeps the modal
    // (and its draft) open; the retry re-enters the submit path.
    mocks.uploadMaterial.mutateAsync.mockRejectedValueOnce(new Error('network down'));
    const { fileInput, rerender } = renderModal();

    fireEvent.change(fileInput, { target: { files: [VALID_PDF()] } });
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'إضافة المادة' }));
    });
    expect(mocks.uploadMaterial.mutateAsync).toHaveBeenCalledTimes(1);

    // The attempt failed — the inline error + the retry affordance.
    mocks.uploadMaterial.isPending = false;
    mocks.uploadMaterial.isError = true;
    mocks.uploadMaterial.error = new Error('network down');
    rerender(<MemoryRouter><MaterialsPage /></MemoryRouter>);

    expect(screen.getByText('تعذّرت إضافة المادة — حاول مرة أخرى.')).toBeInTheDocument();
    // The picked file row survived (the draft is intact).
    expect(screen.getByTitle('lecture-3.pdf')).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /إعادة المحاولة/ }));
    });
    expect(mocks.uploadMaterial.mutateAsync).toHaveBeenCalledTimes(2);
    // The retry re-sends the SAME file — no re-pick needed.
    const retryPayload = mocks.uploadMaterial.mutateAsync.mock.calls[1]![0] as { file: File };
    expect(retryPayload.file.name).toBe('lecture-3.pdf');
  });
});
