/**
 * 18-F2 — JobsPage pins: the honest «تمّ التقديم» state.
 *
 * 18-G made GET /jobs carry `appliedJobIds` beside the rows (page-scoped,
 * computed for every authenticated caller); 18-F2's useJobs captures the
 * whole payload and this page seeds the badge from server truth. The old
 * `useState(false)` was client-local fiction — a remount un-applied the
 * badge while the server-side application persisted.
 *
 * The suite drives the REAL hooks against the URL-dispatching api mock
 * (the useResources-contracts / ExamAuthorPages pattern), so the pins
 * cover the payload capture and the rendered states in one pass.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import JobsPage from '../../src/pages/student/JobsPage';
import { useAuthStore } from '../../src/stores/auth.store';

const mocks = vi.hoisted(() => ({
  get: vi.fn(),
  post: vi.fn(),
}));

vi.mock('../../src/lib/api', () => ({
  api: {
    get: (...args: unknown[]) => mocks.get(...(args as [string])),
    post: (...args: unknown[]) => mocks.post(...(args as [string, unknown])),
  },
  unwrap: <T,>(p: Promise<{ data: T }>): Promise<T> => p.then((r) => r.data),
}));

const STUDENT = {
  id: 'st1',
  email: 'amna@zu.edu.ly',
  firstName: 'آمنة',
  lastName: 'العبيدي',
  role: 'STUDENT' as const,
};

function job(id: string, title: string) {
  return {
    id,
    title,
    company: 'شركة الأفق',
    location: 'طرابلس',
    type: 'FULL_TIME',
    salary: null,
    category: 'tech',
    iconEmoji: null,
    postedAt: new Date(Date.now() - 86_400_000).toISOString(),
  };
}

beforeEach(() => {
  mocks.get.mockReset();
  mocks.post.mockReset();
  mocks.post.mockResolvedValue({ data: { id: 'app1', jobId: 'j2', userId: 'st1' } });
  mocks.get.mockResolvedValue({
    data: {
      data: [job('j1', 'مهندس واجهات أمامية'), job('j2', 'محلل بيانات')],
      meta: { page: 1, limit: 50, total: 2, totalPages: 1 },
      // Server truth: the viewer already applied to j1.
      appliedJobIds: ['j1'],
    },
  });
  act(() => { useAuthStore.setState({ user: STUDENT }); });
});

function renderPage() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <JobsPage />
    </QueryClientProvider>,
  );
}

const rowOf = (title: string) =>
  screen.getByText(title).closest('tr') as HTMLElement;

describe('JobsPage — the honest applied state (18-G payload, 18-F2 consumption)', () => {
  it('seeds the «تمّ التقديم» badge from appliedJobIds — no apply button for an applied job', async () => {
    renderPage();

    await screen.findByText('مهندس واجهات أمامية');
    const appliedRow = rowOf('مهندس واجهات أمامية');
    expect(within(appliedRow).getByText('تمّ التقديم')).toBeInTheDocument();
    expect(within(appliedRow).queryByRole('button', { name: 'تقدّم' })).toBeNull();

    // The un-applied job still offers the real action.
    const openRow = rowOf('محلل بيانات');
    expect(within(openRow).getByRole('button', { name: 'تقدّم' })).toBeInTheDocument();
    expect(within(openRow).queryByText('تمّ التقديم')).toBeNull();
  });

  it('requests the full payload — the whole body is the query result', async () => {
    renderPage();
    await screen.findByText('محلل بيانات');
    expect(mocks.get).toHaveBeenCalledWith('/jobs?limit=50');
  });

  it('applying lands the badge in-session (the optimistic path on top of server truth)', async () => {
    renderPage();
    await screen.findByText('محلل بيانات');
    const openRow = rowOf('محلل بيانات');

    fireEvent.click(within(openRow).getByRole('button', { name: 'تقدّم' }));
    await waitFor(() => {
      expect(mocks.post).toHaveBeenCalledWith('/jobs/j2/apply');
    });
    expect(await within(openRow).findByText('تمّ التقديم')).toBeInTheDocument();
  });
});
