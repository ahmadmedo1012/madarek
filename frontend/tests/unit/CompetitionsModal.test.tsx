/**
 * T3-F2 — Competition create-modal migration unit tests.
 *
 * The create-competition modal was migrated from raw
 * `.comp-modal-backdrop` markup to the shared <Modal> overlay primitive
 * (portal + focus trap + Esc + aria-modal + scroll lock). These tests
 * exercise the migrated wrapper through the real page component:
 *   - opening the dialog renders role=dialog / aria-modal / aria-label
 *   - Esc closes the dialog
 *   - click on the backdrop closes the dialog
 *   - form labels are associated with their inputs (useId + htmlFor/id)
 *
 * Wave 12-14: the scroll lock is the ref-counted scrollLock body
 * class (lib/scrollLock.ts), not an inline overflow write.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { SCROLL_LOCK_BODY_CLASS } from '../../src/lib/scrollLock';

vi.mock('../../src/hooks/useResources', () => ({
  useCompetitions: () => ({
    data: [],
    isPending: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
  useMyPermissions: () => ({
    data: { capabilities: ['COMPETITIONS_RUN'] },
    isPending: false,
    isError: false,
  }),
  useCreateCompetition: () => ({
    mutateAsync: vi.fn(async () => ({})),
    isError: false,
    isPending: false,
  }),
  // Remaining hooks are imported by the module but unused on the index page.
  useCompetition: () => ({ data: undefined, isPending: false, isError: false, refetch: vi.fn() }),
  useEnterCompetition: () => ({ mutateAsync: vi.fn(async () => ({})), isError: false, isPending: false }),
  useCloseCompetition: () => ({ mutate: vi.fn(), isError: false, isPending: false }),
  useScoreCompetitionEntry: () => ({ mutate: vi.fn(), isError: false, isPending: false, isSuccess: false }),
  useJudgeCompetition: () => ({ mutate: vi.fn(), isError: false, isPending: false }),
}));

import { CompetitionsIndexPage } from '../../src/pages/competitions/CompetitionsPages';

function renderPage() {
  return render(
    <MemoryRouter>
      <CompetitionsIndexPage />
    </MemoryRouter>,
  );
}

describe('CompetitionsIndexPage — migrated create-competition modal', () => {
  beforeEach(() => {
    document.body.style.overflow = '';
  });

  it('opens the modal as a proper dialog (role/aria-modal/aria-label) via the Modal primitive', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /مسابقة جديدة/ }));
    const dialog = screen.getByRole('dialog', { name: 'مسابقة جديدة' });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    // Portalled to document.body, not inline in the page tree.
    expect(dialog.closest('.page')).toBeNull();
  });

  it('locks body scroll while open and releases it on Esc close (scrollLock class)', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /مسابقة جديدة/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(true);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.classList.contains(SCROLL_LOCK_BODY_CLASS)).toBe(false);
  });

  it('closes on backdrop (overlay) click', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /مسابقة جديدة/ }));
    const overlay = screen.getByRole('dialog').parentElement!;
    fireEvent.click(overlay);
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('associates form labels with their controls (useId + htmlFor/id)', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /مسابقة جديدة/ }));
    expect(screen.getByLabelText('العنوان')).toBeInTheDocument();
    expect(screen.getByLabelText('الوصف')).toBeInTheDocument();
    expect(screen.getByLabelText('الفئة')).toBeInTheDocument();
    expect(screen.getByLabelText('الموعد النهائي')).toBeInTheDocument();
    expect(screen.getByLabelText('الجائزة (اختياري)')).toBeInTheDocument();
  });

  // 16-E7 (15-e P2-3): dirty close paths route through useDiscardGuard.
  it('Esc on a dirty create form stacks the discard confirm instead of closing', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /مسابقة جديدة/ }));
    fireEvent.change(screen.getByLabelText('العنوان'), { target: { value: 'تحدي الذكاء الاصطناعي' } });
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.getByRole('dialog', { name: 'تعديلات غير محفوظة' })).toBeInTheDocument();
    expect(screen.getByRole('dialog', { name: 'مسابقة جديدة' })).toBeInTheDocument();
    // Confirming the discard closes both dialogs.
    fireEvent.click(screen.getByRole('button', { name: 'التخلّي عن التعديلات' }));
    expect(screen.queryByRole('dialog', { name: 'تعديلات غير محفوظة' })).toBeNull();
    expect(screen.queryByRole('dialog', { name: 'مسابقة جديدة' })).toBeNull();
  });

  // 5-C4 (A10 P2-3): the fields ride the platform FormField — a
  // failed submit marks the controls aria-invalid and points
  // aria-describedby at the rendered alerts (the audit measured
  // invalid:null + described:null on العنوان/الوصف/الموعد).
  it('a failed submit wires aria-invalid + aria-describedby on the invalid controls', async () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /مسابقة جديدة/ }));
    // Empty submit → RHF (async zod resolver) renders the errors.
    fireEvent.click(screen.getByRole('button', { name: 'إنشاء' }));
    await screen.findByText('العنوان قصير جدّاً');
    const title = screen.getByLabelText('العنوان');
    const description = screen.getByLabelText('الوصف');
    const deadline = screen.getByLabelText('الموعد النهائي');
    for (const control of [title, description, deadline]) {
      expect(control).toHaveAttribute('aria-invalid', 'true');
      const describedBy = control.getAttribute('aria-describedby');
      expect(describedBy).toBeTruthy();
      const alert = document.getElementById(describedBy!.split(' ')[0]!);
      expect(alert).not.toBeNull();
      expect(alert).toHaveAttribute('role', 'alert');
    }
  });
});
