/**
 * r155b — UniversityInfoPage memberships source-of-truth pin.
 *
 * The page hand-retyped the memberships list and reproduced the exact
 * retyping error university.facts.ts documents: «اتحاد الجامعات
 * الإسلامية» (FUIW) instead of the MEDITERRANEAN union the curated
 * source carries. The local MEMBERSHIPS array is gone — the render
 * reads UNIVERSITY_FACTS.memberships; this pin keeps the factual fix
 * from regressing via another local retyping.
 *
 * useFaculties mocked at the module boundary (the ...actual spread
 * pattern); the memberships card itself is static data.
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

describe('UniversityInfoPage — العضويّات الدوليّة (r155b)', () => {
  it('renders the MEDITERRANEAN union — never the documented retyping error', () => {
    renderPage();

    expect(screen.getByText('اتحاد الجامعات المتوسطية')).toBeInTheDocument();
    expect(screen.getByText('اتحاد الجامعات العربية')).toBeInTheDocument();
    expect(screen.getByText('اتحاد الجامعات الأفريقية')).toBeInTheDocument();
    // The exact factual error the facts file documents (an Islamic
    // union membership the university does not hold).
    expect(screen.queryByText('اتحاد الجامعات الإسلامية')).toBeNull();
  });

  it('renders every membership the canonical facts module carries — same source, same count', () => {
    renderPage();

    for (const m of UNIVERSITY_FACTS.memberships) {
      expect(screen.getByText(m.full)).toBeInTheDocument();
      expect(screen.getByText(m.label)).toBeInTheDocument();
    }
    expect(screen.getAllByText(/اتحاد الجامعات/)).toHaveLength(
      UNIVERSITY_FACTS.memberships.length,
    );
  });
});
