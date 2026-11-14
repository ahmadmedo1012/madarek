/**
 * R350 E6 — «البريد» (the admin mail surface), pinned.
 *
 * 1. Provider status: configured vs the honest-none state, the 24h
 *    counters, the honest owner-side note when unconfigured.
 * 2. The delivery log: rows render with status pills + the provider-id
 *    link; the status filter re-queries; a failed row offers retry;
 *    a queued row offers cancel.
 * 3. The suppression list renders + un-suppress calls DELETE.
 * 4. The test send: submit posts to /mail/admin/test-send.
 *
 * lib/api is mocked at the module boundary (the 16-E5 pattern).
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

vi.mock('../../src/lib/toast', () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../src/lib/api', () => {
  const get = vi.fn(async () => ({ data: {} }));
  const post = vi.fn(async () => ({ data: {} }));
  const patch = vi.fn(async () => ({ data: {} }));
  const del = vi.fn(async () => ({ data: {} }));
  return {
    api: { get, post, patch, delete: del },
    unwrap: <T,>(promise: Promise<{ data: { data: T } }>): Promise<T> =>
      promise.then((r) => r.data.data),
  };
});

import { AdminMailPage } from '../../src/pages/admin/AdminMailPage';
import { api } from '../../src/lib/api';

const getMock = api.get as unknown as Mock;
const postMock = api.post as unknown as Mock;
const deleteMock = api.delete as unknown as Mock;

function renderWithProviders() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/admin/mail']}>
        <Routes>
          <Route path="/admin/mail" element={<AdminMailPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

const STATUS = {
  provider: 'resend',
  configured: true,
  from: 'مدارك <no-reply@madarek.onrender.com>',
  domainVerified: null,
  previewEnabled: false,
  caps: { recipientDaily: 12, institutionDaily: 500 },
  retryScheduleMin: [1, 5, 30, 120, 360],
  last24h: { queued: 0, sending: 0, sent: 12, failed: 1, suppressed: 0 },
  outboxTotals: { queued: 3, sending: 0, sent: 36, failed: 1, suppressed: 0 },
  suppressionTotal: 2,
  lastSentAt: '2026-11-14T01:00:05Z',
  lastSentTemplate: 'verify-email',
};

const OUTBOX_ROWS = [
  {
    id: 'o1',
    to: 'salem@madarek.ly',
    template: 'verify-email',
    subject: 'مدارك — أكِّد بريدك الإلكتروني',
    status: 'sent',
    attempts: 1,
    nextAttemptAt: null,
    providerId: 're-123',
    lastError: null,
    dedupeKey: 'verify:u1:abc',
    sentAt: '2026-11-14T01:00:00Z',
    createdAt: '2026-11-14T01:00:00Z',
  },
  {
    id: 'o2',
    to: 'huda@madarek.ly',
    template: 'reset-password',
    subject: 'مدارك — رابط إعادة تعيين كلمة المرور',
    status: 'failed',
    attempts: 5,
    nextAttemptAt: null,
    providerId: null,
    lastError: 'dead letter: retry schedule exhausted',
    dedupeKey: 'reset:u2:def',
    sentAt: null,
    createdAt: '2026-11-13T20:00:00Z',
  },
  {
    id: 'o3',
    to: 'ali@madarek.ly',
    template: 'welcome',
    subject: 'مدارك — أهلًا بك',
    status: 'queued',
    attempts: 0,
    nextAttemptAt: '2026-11-14T02:00:00Z',
    providerId: null,
    lastError: null,
    dedupeKey: 'welcome:u3',
    sentAt: null,
    createdAt: '2026-11-14T01:30:00Z',
  },
];

const SUPPRESSION = [
  { id: 's1', email: 'gone@madarek.ly', type: 'hard_bounce', reason: 'Resend bounce event', createdAt: '2026-11-10T00:00:00Z' },
  { id: 's2', email: 'out@madarek.ly', type: 'unsubscribe', reason: null, createdAt: '2026-11-11T00:00:00Z' },
];

const META = { page: 1, limit: 20, total: OUTBOX_ROWS.length, totalPages: 1 };

beforeEach(() => {
  vi.clearAllMocks();
  getMock.mockImplementation(async (url: string, cfg?: { params?: Record<string, unknown> }) => {
    if (url === '/admin/mail/status') return { data: { data: STATUS } };
    if (url === '/admin/mail/outbox') {
      const status = cfg?.params?.status as string | undefined;
      const rows = status ? OUTBOX_ROWS.filter((r) => r.status === status) : OUTBOX_ROWS;
      return { data: { data: rows, meta: { ...META, total: rows.length } } };
    }
    if (url === '/admin/mail/suppression') return { data: { data: SUPPRESSION } };
    if (url === '/admin/mail/templates') return { data: { data: { templates: ['verify-email', 'welcome'] } } };
    return { data: { data: null, meta: META } };
  });
  postMock.mockResolvedValue({ data: { data: { id: 'o9', deduped: false, to: 'owner@madarek.ly' } } });
  deleteMock.mockResolvedValue({ data: { data: { removed: true } } });
});

describe('R350 E6 — AdminMailPage', () => {
  it('renders the provider status (configured) + the 24h counters', async () => {
    renderWithProviders();
    // findByText: the skeleton branch also shows the title — wait for DATA.
    expect(await screen.findByText('مضبوط')).toBeInTheDocument();
    expect(screen.getByText(/resend/)).toBeInTheDocument();
    expect(screen.getByText('سجلّ التسليم')).toBeInTheDocument();
    expect(screen.getByText('قائمة الحجب')).toBeInTheDocument();
    expect(screen.getByText('إرسال رسالة اختبار')).toBeInTheDocument();
  });

  it('the honest-none state names the owner-side setup steps', async () => {
    getMock.mockImplementation(async (url: string) => {
      if (url === '/admin/mail/status')
        return {
          data: {
            data: { ...STATUS, provider: 'none', configured: false, from: 'مدارك <no-reply@madarek.example>' },
          },
        };
      if (url === '/admin/mail/outbox') return { data: { data: [], meta: META } };
      if (url === '/admin/mail/suppression') return { data: { data: [] } };
      if (url === '/admin/mail/templates') return { data: { data: { templates: [] } } };
      return { data: { data: null, meta: META } };
    });
    renderWithProviders();
    expect(await screen.findByText('غير مضبوط')).toBeInTheDocument();
    expect(await screen.findByText('لا رسائل بعد')).toBeInTheDocument();
    expect(screen.getByText(/MAIL_PROVIDER/)).toBeInTheDocument();
  });

  it('the delivery log renders rows with pills; the filter re-queries', async () => {
    renderWithProviders();
    expect(await screen.findByText('مدارك — رابط إعادة تعيين كلمة المرور')).toBeInTheDocument();
    // 'أُرسل' rides both the filter pill and the row pill — ≥2 is the contract.
    expect(screen.getAllByText('أُرسل').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('فشل').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('في الانتظار').length).toBeGreaterThanOrEqual(2);

    fireEvent.click(screen.getAllByRole('button', { name: 'فشل' })[0]!);
    await waitFor(() => {
      expect(getMock).toHaveBeenCalledWith('/admin/mail/outbox', { params: { page: 1, status: 'failed' } });
    });
    // placeholderData keeps the previous page visible during the refetch —
    // the sent row disappears once the filtered page resolves.
    await waitFor(() => {
      expect(screen.queryByText('مدارك — أكِّد بريدك الإلكتروني')).not.toBeInTheDocument();
    });
  });

  it('a failed row offers retry (POST) and a queued row offers cancel', async () => {
    renderWithProviders();
    const retryBtn = await screen.findByRole('button', { name: /إعادة إرسال/ });
    fireEvent.click(retryBtn);
    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/admin/mail/outbox/o2/retry');
    });

    const cancelBtn = screen.getByRole('button', { name: /إلغاء/ });
    fireEvent.click(cancelBtn);
    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/admin/mail/outbox/o3/cancel');
    });
  });

  it('the provider id links its provider message', async () => {
    renderWithProviders();
    const link = await screen.findByRole('link', { name: /re-123/ });
    expect(link).toHaveAttribute('href', 'https://resend.com/emails/re-123');
  });

  it('the suppression list renders + un-suppress calls DELETE', async () => {
    renderWithProviders();
    expect(await screen.findByText('gone@madarek.ly')).toBeInTheDocument();
    expect(screen.getByText('ارتداد قاسٍ')).toBeInTheDocument();
    const buttons = await screen.findAllByRole('button', { name: 'إزالة الحجب' });
    fireEvent.click(buttoners(buttons));
    await waitFor(() => {
      expect(deleteMock).toHaveBeenCalledWith('/admin/mail/suppression/s1');
    });
  });

  it('the test send form posts the chosen address', async () => {
    renderWithProviders();
    const input = await screen.findByPlaceholderText('name@example.ly');
    fireEvent.change(input, { target: { value: 'owner@madarek.ly' } });
    fireEvent.submit(input.closest('form')!);
    await waitFor(() => {
      expect(postMock).toHaveBeenCalledWith('/admin/mail/test-send', { to: 'owner@madarek.ly' });
    });
  });
});

function buttoners(buttons: HTMLElement[]): HTMLElement {
  return buttons[0]!;
}
