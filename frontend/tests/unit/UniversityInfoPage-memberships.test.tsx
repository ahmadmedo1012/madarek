/**
 * R349 U3 — UniversityInfoPage unified-contract pin.
 *
 * The curated demo-profile card (r188's UNIVERSITY_FACTS synthetic
 * memberships) is RETIRED with the university facts pipeline: every
 * institution — the demo tenant included — gets the same honest OWN
 * page (session identity + scoped faculties). This suite pins that
 * retirement: the card does not render, the synthetic profile is
 * gone from the tree, and the page's identity is the session's.
 */
import { describe, expect, it, vi, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UniversityInfoPage } from '../../src/pages/student/MorePages';
import { useAuthStore } from '../../src/stores/auth.store';

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

describe('UniversityInfoPage — the curated profile card is retired (R349 U3)', () => {
  it('renders NO بطاقة تعريف card and NO synthetic profile entries', () => {
    renderPage();

    expect(screen.queryByText('بطاقة تعريف المؤسّسة')).toBeNull();
    expect(screen.queryByText('بيانات تجريبية')).toBeNull();
  });

  it('without a session institution: the honest empty state (nothing invented)', () => {
    useAuthStore.setState({ currentInstitution: null });
    renderPage();
    expect(screen.getByText('لا توجد مؤسّسة في جلستك')).toBeInTheDocument();
  });
});
