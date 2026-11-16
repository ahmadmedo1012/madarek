/**
 * r357 L2 — /auth/verify-email (VerifyEmailPage): the page the emailed
 * link opens. The API route has existed since R350 E3; this pins the
 * PAGE contract: success copy, the backend's Arabic refusal verbatim,
 * and the missing-token guard.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const apiGet = vi.hoisted(() => vi.fn());
vi.mock('../../src/lib/api', () => ({
  api: { get: (...a: unknown[]) => apiGet(...a) },
  unwrap: async (r: Promise<{ data: unknown }>) => (await r).data,
}));
vi.mock('../../src/components/layout/ThemeToggle', () => ({ useThemeSync: () => null }));
vi.mock('../../src/brand', () => ({ Logo: () => null }));

import VerifyEmailPage from '../../src/pages/auth/VerifyEmailPage';

const mountAt = (search: string) =>
  render(
    <MemoryRouter initialEntries={[`/auth/verify-email${search}`]}>
      <VerifyEmailPage />
    </MemoryRouter>,
  );

describe('r357 L2 · VerifyEmailPage', () => {
  beforeEach(() => {
    apiGet.mockReset();
    window.history.replaceState({}, '', '/auth/verify-email');
  });

  it('a valid token renders the backend success message', async () => {
    window.history.replaceState({}, '', '/auth/verify-email?token=good');
    apiGet.mockResolvedValueOnce({ data: { verified: true, message: 'تم تأكيد بريدك الإلكتروني — شكرًا' } });
    mountAt('?token=good');
    await waitFor(() => {
      expect(screen.getByTestId('verify-email-message').textContent).toContain('تم تأكيد بريدك الإلكتروني');
    });
  });

  it('a refused token surfaces the backend Arabic message verbatim (no oracle differences)', async () => {
    window.history.replaceState({}, '', '/auth/verify-email?token=spent');
    apiGet.mockRejectedValueOnce({
      response: { status: 400, data: { error: { message: 'رابط التأكيد غير صالح أو منتهي — اطلب رسالة جديدة' } } },
      isAxiosError: true,
    });
    mountAt('?token=spent');
    await waitFor(() => {
      expect(screen.getByTestId('verify-email-message').textContent).toContain('رابط التأكيد غير صالح أو منتهي');
    });
    expect(screen.getByText(/اطلب رسالة جديدة من «الإعدادات/)).toBeTruthy();
  });

  it('no token at all: the honest missing-link copy, and NO api call', () => {
    window.history.replaceState({}, '', '/auth/verify-email');
    mountAt('');
    expect(screen.getByTestId('verify-email-message').textContent).toContain('الرابط ناقص');
    expect(apiGet).not.toHaveBeenCalled();
  });
});
