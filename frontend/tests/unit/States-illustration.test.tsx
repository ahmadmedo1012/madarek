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
