import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { act, render } from '@testing-library/react';
import { Skeleton, SkeletonGroup } from '../../src/components/motion/Skeleton';

describe('Skeleton', () => {
  it('renders the requested variant', () => {
    const { container } = render(<Skeleton variant="kpi" />);
    const el = container.querySelector('.skeleton');
    expect(el).not.toBeNull();
    expect(el?.getAttribute('data-variant')).toBe('kpi');
  });

  it('repeats text rows', () => {
    const { container } = render(<Skeleton variant="text" rows={3} />);
    const rows = container.querySelectorAll('.skeleton');
    expect(rows.length).toBe(3);
  });

  it('marks itself as busy for screen readers', () => {
    const { container } = render(<Skeleton variant="card" />);
    const el = container.querySelector('.skeleton');
    expect(el?.getAttribute('aria-busy')).toBe('true');
    expect(el?.getAttribute('role')).toBe('status');
  });

  it('applies width / height overrides', () => {
    const { container } = render(<Skeleton variant="card" width="60%" height="200px" />);
    const el = container.querySelector('.skeleton') as HTMLElement;
    expect(el.style.width).toBe('60%');
    expect(el.style.height).toBe('200px');
  });
});

describe('SkeletonGroup', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders children with the still-loading cue hidden initially', () => {
    const { container } = render(
      <SkeletonGroup>
        <Skeleton variant="kpi" />
      </SkeletonGroup>,
    );
    const cue = container.querySelector('.skeleton-still-loading');
    expect(cue).not.toBeNull();
    expect(cue?.getAttribute('data-visible')).toBeNull();
  });

  it('shows the still-loading cue after 4 s', () => {
    const { container } = render(
      <SkeletonGroup>
        <Skeleton variant="card" />
      </SkeletonGroup>,
    );
    expect(container.querySelector('.skeleton-still-loading')?.getAttribute('data-visible')).toBeNull();
    act(() => {
      vi.advanceTimersByTime(4001);
    });
    expect(container.querySelector('.skeleton-still-loading')?.getAttribute('data-visible')).toBe('true');
  });

  it('respects a custom stillLoadingAfterMs', () => {
    const { container } = render(
      <SkeletonGroup stillLoadingAfterMs={500}>
        <Skeleton variant="card" />
      </SkeletonGroup>,
    );
    act(() => {
      vi.advanceTimersByTime(501);
    });
    expect(container.querySelector('.skeleton-still-loading')?.getAttribute('data-visible')).toBe('true');
  });
});
