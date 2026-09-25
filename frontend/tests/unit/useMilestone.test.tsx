/**
 * useMilestone hook unit tests.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { act, renderHook } from '@testing-library/react';

const mockMe = vi.fn();
vi.mock('../../src/hooks/useAuth', () => ({
  useMe: () => mockMe(),
}));

import { useMilestone } from '../../src/hooks/useMilestone';

describe('useMilestone', () => {
  beforeEach(() => {
    mockMe.mockReset();
  });

  it('does NOT fire a scene for milestones already on the server when the hook mounts', () => {
    mockMe.mockReturnValue({
      data: { id: 'u1', firedMilestones: ['first-assignment-complete'] },
    });
    const { result } = renderHook(() => useMilestone());
    expect(result.current.pendingScene).toBeNull();
  });

  it('returns null when the user is not loaded yet', () => {
    mockMe.mockReturnValue({ data: undefined });
    const { result } = renderHook(() => useMilestone());
    expect(result.current.pendingScene).toBeNull();
  });

  it('fires a scene when a new milestone id appears in firedMilestones', () => {
    let fired: string[] = [];
    mockMe.mockImplementation(() => ({ data: { id: 'u1', firedMilestones: fired } }));
    const { result, rerender } = renderHook(() => useMilestone());
    expect(result.current.pendingScene).toBeNull();

    fired = ['first-assignment-complete'];
    rerender();
    expect(result.current.pendingScene).toBe('first-assignment-complete');
  });

  it('does NOT re-fire the same id after dismissPending', () => {
    let fired: string[] = [];
    mockMe.mockImplementation(() => ({ data: { id: 'u1', firedMilestones: fired } }));
    const { result, rerender } = renderHook(() => useMilestone());

    fired = ['first-course-complete'];
    rerender();
    expect(result.current.pendingScene).toBe('first-course-complete');

    act(() => {
      result.current.dismissPending();
    });
    expect(result.current.pendingScene).toBeNull();

    // Refetch with the same array — should NOT re-trigger.
    rerender();
    expect(result.current.pendingScene).toBeNull();
  });

  it('queues subsequent milestones one at a time', () => {
    let fired: string[] = [];
    mockMe.mockImplementation(() => ({ data: { id: 'u1', firedMilestones: fired } }));
    const { result, rerender } = renderHook(() => useMilestone());

    // Both new at once. Hook presents the first one only; the second
    // surfaces after dismissPending.
    fired = ['first-assignment-complete', 'first-course-complete'];
    rerender();
    expect(result.current.pendingScene).toBe('first-assignment-complete');

    act(() => {
      result.current.dismissPending();
    });
    rerender();
    expect(result.current.pendingScene).toBe('first-course-complete');
  });

  it('handles exam-window-opens id with a window suffix', () => {
    let fired: string[] = [];
    mockMe.mockImplementation(() => ({ data: { id: 'u1', firedMilestones: fired } }));
    const { result, rerender } = renderHook(() => useMilestone());

    fired = ['exam-window-opens:abc123'];
    rerender();
    expect(result.current.pendingScene).toBe('exam-window-opens:abc123');
  });

  it('returns a referentially stable dismissPending across renders (P2-8)', () => {
    let fired: string[] = [];
    mockMe.mockImplementation(() => ({ data: { id: 'u1', firedMilestones: fired } }));
    const { result, rerender } = renderHook(() => useMilestone());

    fired = ['first-assignment-complete'];
    rerender();
    const first = result.current.dismissPending;
    // Unrelated re-renders (parent state changes, me refetches) must not
    // produce a new callback — MilestoneScene's auto-dismiss hold and the
    // Modal's focus-trap listeners depend on it and would restart on
    // every re-render (audit 11-e P2-8).
    rerender();
    rerender();
    expect(result.current.dismissPending).toBe(first);

    // Stability must not come at the cost of behavior.
    act(() => {
      result.current.dismissPending();
    });
    expect(result.current.pendingScene).toBeNull();
  });
});
