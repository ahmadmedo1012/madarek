/**
 * EmptyState / ErrorState illustration wiring tests (T089).
 */
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
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
});
