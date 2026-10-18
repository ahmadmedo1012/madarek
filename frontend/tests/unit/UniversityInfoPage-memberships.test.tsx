/**
 * r188 — UniversityInfoPage demo-profile source-of-truth pin.
 *
 * The retired real-university memberships card (r155b: the
 * MEDITERRANEAN/ARAB/AFRICAN unions list — real-institution claims)
 * is gone with the brand reset. The card now renders the demo
 * tenant's SYNTHETIC profile from UNIVERSITY_FACTS.profile: the
 * r155b retyping-error lesson (never hand-retype the fact list)
 * carries over — the render still reads the single source module.
 *
 * useFaculties mocked at the module boundary (the ...actual spread
 * pattern); the profile card itself is static data.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UniversityInfoPage } from '../../src/pages/student/MorePages';
import { UNIVERSITY_FACTS } from '../../src/data/university.facts';

vi.mock('../../src/hooks/useResources', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/hooks/useResources')>();
  return {
    ...actual,
    useFaculties: () => ({ data: [], isPending: false, isError: false, error: null, refetch: vi.fn() }),
  };
});

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <UniversityInfoPage />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('UniversityInfoPage — بطاقة تعريف المؤسّسة (r188)', () => {
  it('renders the demo-tenant profile straight from UNIVERSITY_FACTS (no hand-retyped list)', () => {
    renderPage();

    // the synthetic profile's three entries, in module order
    for (const entry of UNIVERSITY_FACTS.profile) {
      expect(screen.getAllByText(entry.full).length).toBeGreaterThan(0);
    }
    // the card title states what this is
    expect(screen.getByText('بطاقة تعريف المؤسّسة')).toBeInTheDocument();
  });

  it('the fictional institution name is the one the page carries', () => {
    renderPage();
    expect(screen.getAllByText('جامعة مدارك التجريبية').length).toBeGreaterThan(0);
  });
});
