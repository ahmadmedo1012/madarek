/**
 * useOnboardingState — read + drive the 4-frame onboarding flow.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/onboarding-milestone.md.
 *
 * The flow's UI state (open / frame / replay) lives in the shared
 * `onboarding.store`, so every consumer — AppShell's auto-start,
 * the Sidebar replay trigger, and the <OnboardingFlow /> renderer —
 * observes the SAME state (audit 0-f P0-2 fix).
 *
 * This hook layers two concerns on top of the store:
 *   - `shouldAutoStart`: read-only derivation from the server
 *     (User.onboardingCompletedAt) — the source of truth for "has
 *     this user completed onboarding?".
 *   - completion persistence: an idempotent POST
 *     /me/onboarding/complete on close (skip or finish), mirroring
 *     the theme profile sync pattern. Replays never re-persist.
 *
 * Usage:
 *   const onboarding = useOnboardingState()
 *   if (onboarding.shouldAutoStart) // mount on first dashboard render
 *   onboarding.open({ replay: true }) // help-menu replay path
 *   onboarding.next() / .skip() / .finish()
 */
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../lib/api';
import { useMe } from './useAuth';
import { useOnboardingStore, type OnboardingFrame } from '../stores/onboarding.store';

export type { OnboardingFrame };

export interface OnboardingState {
  /** True when the server says this user has never completed onboarding. */
  shouldAutoStart: boolean;
  /** True while the flow is mounted (auto-started or opened from help). */
  isOpen: boolean;
  /** True if this open was a help-menu replay (skips backend call). */
  isReplay: boolean;
  /** Currently visible frame index 0..3. */
  currentFrame: OnboardingFrame;
  /** Mark the flow open. `opts.replay` skips the server call on close. */
  open(opts?: { replay?: boolean }): void;
  /** Advance one frame (does NOT call the backend). */
  next(): void;
  /** Step back one frame (does NOT call the backend). */
  prev(): void;
  /** Jump to a frame (clamped to 0..3; does NOT call the backend). */
  goTo(frame: number): void;
  /** Skip → close + (if not replay) call the complete endpoint. */
  skip(): void;
  /** Finish → close + (if not replay) call the complete endpoint. */
  finish(): void;
}

interface CompleteResponse {
  onboardingCompletedAt: string;
}

export function useOnboardingState(): OnboardingState {
  const { data: me } = useMe();
  const qc = useQueryClient();
  const isOpen = useOnboardingStore((s) => s.isOpen);
  const currentFrame = useOnboardingStore((s) => s.currentFrame);
  const isReplay = useOnboardingStore((s) => s.isReplay);

  const completeMutation = useMutation({
    mutationFn: () =>
      unwrap<CompleteResponse>(api.post('/me/onboarding/complete')),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  const shouldAutoStart = Boolean(me?.id) && !me?.onboardingCompletedAt;

  // Store actions are read via getState() at call time so every
  // consumer shares one code path and no closure can go stale.
  const open = useCallback((opts?: { replay?: boolean }) => {
    useOnboardingStore.getState().start(opts);
  }, []);

  const next = useCallback(() => {
    useOnboardingStore.getState().next();
  }, []);

  const prev = useCallback(() => {
    useOnboardingStore.getState().prev();
  }, []);

  const goTo = useCallback((frame: number) => {
    useOnboardingStore.getState().goTo(frame);
  }, []);

  const skip = useCallback(() => {
    // Capture the replay flag atomically with the close.
    const { isReplay: replay, dismiss } = useOnboardingStore.getState();
    dismiss();
    if (!replay) {
      // Fire-and-forget. Backend is idempotent; failures retried on
      // next sign-in (column stays null).
      completeMutation.mutate();
    }
  }, [completeMutation]);

  const finish = useCallback(() => {
    const { isReplay: replay, complete } = useOnboardingStore.getState();
    complete();
    if (!replay) {
      completeMutation.mutate();
    }
  }, [completeMutation]);

  return {
    shouldAutoStart,
    isOpen,
    isReplay,
    currentFrame,
    open,
    next,
    prev,
    goTo,
    skip,
    finish,
  };
}
