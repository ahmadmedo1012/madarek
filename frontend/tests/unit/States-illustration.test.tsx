/**
 * EmptyState / ErrorState illustration wiring tests (T089).
 */
import { describe, expect, it, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyState, ErrorState } from '../../src/components/primitives/States';

describe('EmptyState', () => {
  it('renders the legacy icon when no illustration prop is given', () => {
    render(<EmptyState title="empty" />);
    expect(document.querySelector('.state-icon')).not.toBeNull();
    expect(document.querySelector('.state-illustration')).toBeNull();
  });

  it('renders an illustration block when illustration is set', () => {
    render(<EmptyState illustration="empty-notifs" title="no notifs" />);
    expect(document.querySelector('.state-icon')).toBeNull();
    expect(document.querySelector('.state-illustration')).not.toBeNull();
    expect(document.querySelector('[data-illustration="empty-notifs"]')).not.toBeNull();
  });

  it('the illustration block is decorative (aria-hidden)', () => {
    render(<EmptyState illustration="empty-notifs" title="x" />);
    const block = document.querySelector('.state-illustration');
    expect(block).toHaveAttribute('aria-hidden');
  });

  it('shows the actionable default description when the caller passes none (15-j Batch F)', () => {
    // A description-less EmptyState used to be a dead end — the default
    // now tells the user what to do next.
    render(<EmptyState title="empty" />);
    expect(
      screen.getByText('تعال لاحقاً — أو حدّث الصفحة للتحقق من وجود محتوى جديد.'),
    ).toBeInTheDocument();
  });

  it('an explicit description still wins over the default', () => {
    render(<EmptyState title="x" description="وصف مخصّص" />);
    expect(screen.getByText('وصف مخصّص')).toBeInTheDocument();
    expect(screen.queryByText(/تعال لاحقاً/)).toBeNull();
  });

  it('description="" opts out entirely (nothing renders)', () => {
    render(<EmptyState title="x" description="" />);
    expect(document.querySelector('.state-desc')).toBeNull();
  });
});

describe('ErrorState', () => {
  it('renders the legacy AlertTriangle icon when no illustration prop is given', () => {
    render(<ErrorState message="error" />);
    expect(document.querySelector('.state-icon')).not.toBeNull();
    expect(document.querySelector('.state-illustration')).toBeNull();
  });

  it('renders an illustration block when illustration is set', () => {
    render(<ErrorState illustration="error-404" message="not found" />);
    expect(document.querySelector('.state-icon')).toBeNull();
    expect(document.querySelector('[data-illustration="error-404"]')).not.toBeNull();
  });

  it('still renders the retry button when onRetry is given', () => {
    render(<ErrorState illustration="error-404" message="x" onRetry={() => {}} />);
    expect(screen.getByRole('button', { name: /إعادة/ })).toBeInTheDocument();
  });

  it('honors onRetry in the 404 branch instead of silently dropping it (P2-18)', () => {
    const onRetry = vi.fn();
    const error = {
      response: { status: 404, data: { error: { message: 'غير موجود' } } },
    };
    render(<ErrorState error={error} onRetry={onRetry} />);
    const retry = screen.getByRole('button', { name: /إعادة/ });
    fireEvent.click(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('404 without onRetry renders the not-found copy and no retry button', () => {
    const error = { response: { status: 404 } };
    render(<ErrorState error={error} />);
    expect(screen.getByText('العنصر غير موجود')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('403 renders the permission-denied state and never a retry button', () => {
    const onRetry = vi.fn();
    const error = {
      response: { status: 403, data: { error: { message: 'ممنوع' } } },
    };
    render(<ErrorState error={error} onRetry={onRetry} />);
    // Authorization is not transient — retry cannot fix it, so the
    // affordance stays off even when the caller passes onRetry
    // (the 403 branch's documented contract, audit 11-e P2-18).
    expect(screen.getByText('لا تملك صلاحية الوصول')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });
});

describe('ErrorState — Arabic-first error detail (15-j P0-1, 16-E10)', () => {
  it('renders the API message when it is Arabic', () => {
    const error = {
      response: { status: 400, data: { error: { code: 'BAD_REQUEST', message: 'الصفحة خارج نطاق المستند' } } },
    };
    render(<ErrorState error={error} />);
    expect(screen.getByText('الصفحة خارج نطاق المستند')).toBeInTheDocument();
  });

  it('never renders a Latin-only API message — generic Arabic refusal + the machine code for support', () => {
    const error = {
      response: {
        status: 400,
        data: { error: { code: 'VALIDATION_ERROR', message: 'Validation failed' } },
      },
    };
    render(<ErrorState error={error} />);
    expect(screen.queryByText('Validation failed')).toBeNull();
    // The generic refusal + the code share the desc line — grab the
    // line via the code and assert both, bidi-isolated mono for the
    // Latin run.
    const desc = screen.getByText('VALIDATION_ERROR').closest('.state-desc')!;
    expect(desc).not.toBeNull();
    expect(desc).toHaveTextContent('تعذَّر إتمام الطلب، حاول مرة أخرى.');
    expect(desc.querySelector('bdi.font-mono')).toHaveTextContent('VALIDATION_ERROR');
  });

  it('an API refusal without a code shows the generic refusal alone', () => {
    const error = { response: { status: 500, data: { error: { message: 'Internal server error' } } } };
    render(<ErrorState error={error} />);
    expect(screen.getByText('تعذَّر إتمام الطلب، حاول مرة أخرى.')).toBeInTheDocument();
  });

  it('keeps the connection-advice default for network faults (no response at all)', () => {
    render(<ErrorState error={new Error('Network Error')} />);
    expect(screen.queryByText('Network Error')).toBeNull();
    expect(screen.getByText('حاول مرة أخرى، أو تحقّق من اتصالك بالشبكة.')).toBeInTheDocument();
  });

  it('an Arabic plain-Error message still surfaces (not every Error is English)', () => {
    render(<ErrorState error={new Error('انقطع الاتصال بالخادم')} />);
    expect(screen.getByText('انقطع الاتصال بالخادم')).toBeInTheDocument();
  });
});
