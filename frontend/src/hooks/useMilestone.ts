/**
 * useMilestone — drive the one-shot milestone scene presenter.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/onboarding-milestone.md.
 *
 * Source of truth for "has this milestone fired?" is the server
 * (User.firedMilestones — append-only string[]). The hook tracks a
 * session-local Set of "already presented" IDs so the scene fires
 * exactly once per session even if React remounts or the me query
 * refetches.
 *
 * The hook returns:
 *   - pendingScene: a milestone id newly added to firedMilestones
 *     since this session started (or null when nothing is pending)
 *   - dismissPending(): mark the pending id as presented, clearing
 *     pendingScene so the next render does not re-mount the scene
 */
import { useEffect, useRef, useState } from 'react';
import { useMe } from './useAuth';

export type MilestoneId =
  | 'first-assignment-complete'
  | 'first-course-complete'
  | `exam-window-opens:${string}`;

export interface MilestoneState {
  pendingScene: MilestoneId | null;
  dismissPending(): void;
}

export function useMilestone(): MilestoneState {
  const { data: me } = useMe();
  // The set of milestone IDs already presented in this session.
  // Seeded from the server's initial firedMilestones — if the user
  // already had a milestone before this session, we never present it.
  const presentedRef = useRef<Set<string> | null>(null);
  const [pendingScene, setPendingScene] = useState<MilestoneId | null>(null);

  useEffect(() => {
    if (!me?.id) return;
    const fired = me.firedMilestones ?? [];

    // First observation: seed the presented set so anything already on
    // the server is treated as "previously presented" and never fires
    // a scene retroactively.
    if (presentedRef.current === null) {
      presentedRef.current = new Set(fired);
      return;
    }

    // Don't pull a new scene while one is still being presented; the
    // queue progresses when the consumer calls dismissPending.
    if (pendingScene !== null) return;

    // Find the first un-presented id in fired order. Anything earlier
    // is already on the server but not yet in presentedRef → genuinely
    // new for this session.
    for (const id of fired) {
      if (!presentedRef.current.has(id)) {
        presentedRef.current.add(id);
        setPendingScene(id as MilestoneId);
        return;
      }
    }
  }, [me?.id, me?.firedMilestones, pendingScene]);

  const dismissPending = () => setPendingScene(null);

  return { pendingScene, dismissPending };
}
