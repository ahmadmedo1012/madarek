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
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

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

  it('locks body scroll while open and restores it on Esc close', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: /مسابقة جديدة/ }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(document.body.style.overflow).toBe('');
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
});
