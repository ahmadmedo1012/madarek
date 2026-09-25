/**
 * Wave 22-d — vision notify CTA honesty tests (audit 4-A8 P2-2).
 *
 * The old «تفعيل التنبيه» CTA promised «ستتلقى إشعاراً على بريدك
 * الجامعي فور توفّر النسخة التجريبية» with zero API calls behind it
 * (local useState that reset on reload) — an unsatisfiable claim on a
 * public page. No notification endpoint exists, so the card now states
 * the truth: a disabled «قريباً» button and an honest "under
 * development" note, with NO email promise.
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { VisionDetailPage } from '../../src/pages/vision/VisionPages';

function renderDetail(slug = 'ai-predictor') {
  return render(
    <MemoryRouter initialEntries={[`/vision/${slug}`]}>
      <Routes>
        <Route path="/vision/:slug" element={<VisionDetailPage />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('VisionDetailPage — honest notify card (A8 P2-2)', () => {
  it('renders a disabled «قريباً» button — never a live toggle', () => {
    renderDetail();

    const cta = screen.getByRole('button', { name: /قريباً/ });
    expect(cta).toBeDisabled();
    // The old CTA labels are gone.
    expect(screen.queryByRole('button', { name: 'تفعيل التنبيه' })).toBeNull();
    expect(screen.queryByText('مُفعَّل')).toBeNull();
    expect(screen.queryByText('تم تفعيل التنبيه')).toBeNull();
  });

  it('makes NO email promise — the unsatisfiable claim is replaced by the honest state', () => {
    renderDetail();

    expect(screen.queryByText(/ستتلقى إشعاراً على بريدك الجامعي/)).toBeNull();
    expect(screen.queryByText(/سنُعلمك على بريدك الجامعي/)).toBeNull();
    expect(screen.getByText(/قيد التطوير/)).toBeInTheDocument();
    // The card still says what the visitor CAN do: follow the vision page.
    expect(screen.getByText(/تابع صفحة الرؤية/)).toBeInTheDocument();
  });
});
