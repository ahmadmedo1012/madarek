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
import { useCallback, useEffect, useRef, useState } from 'react';
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
  // The set of milestone IDs already presented in this session, keyed
  // by the user it was seeded from. Seeded from the server's initial
  // firedMilestones — if the user already had a milestone before this
  // session, we never present it.
  //
  // The user key hardens the "stale milestone" class: firedMilestones
  // is a per-User column, so a presented-set seeded for one account
  // is meaningless for the next. As long as the hook mounts, a session
  // that swaps identity without an unmount (in-place re-login /
  // session refresh paths) would otherwise let the successor account
  // inherit the predecessor's presented-set — every milestone already
  // on the successor's server row would look "genuinely new" and fire
  // retroactively. On an identity change the cache reseeds from the
  // incoming user's firedMilestones and any pending scene the
  // previous user left behind is dropped (a scene keyed to account A
  // must never present to account B).
  const presentedRef = useRef<{ userId: string; presented: Set<string> } | null>(null);
  const [pendingScene, setPendingScene] = useState<MilestoneId | null>(null);

  useEffect(() => {
    if (!me?.id) return;
    const fired = me.firedMilestones ?? [];

    // First observation for this user (or an identity change): seed the
    // presented set so anything already on the server is treated as
    // "previously presented" and never fires a scene retroactively.
    const cache = presentedRef.current;
    if (cache === null || cache.userId !== me.id) {
      presentedRef.current = { userId: me.id, presented: new Set(fired) };
      if (cache !== null) setPendingScene(null);
      return;
    }

    // Don't pull a new scene while one is still being presented; the
    // queue progresses when the consumer calls dismissPending.
    if (pendingScene !== null) return;

    // Find the first un-presented id in fired order. Anything earlier
    // is already on the server but not yet in the presented set →
    // genuinely new for this session.
    for (const id of fired) {
      if (!cache.presented.has(id)) {
        cache.presented.add(id);
        setPendingScene(id as MilestoneId);
        return;
      }
    }
  }, [me?.id, me?.firedMilestones, pendingScene]);

  // Stable identity: MilestoneScene's auto-dismiss hold and the
  // Modal's focus-trap listeners depend on this callback — an inline
  // closure would restart the hold timer on every parent re-render
  // during the 4s window (audit 11-e P2-8).
  const dismissPending = useCallback(() => setPendingScene(null), []);

  return { pendingScene, dismissPending };
}
