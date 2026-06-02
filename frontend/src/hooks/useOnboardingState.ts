/**
 * useOnboardingState — read + drive the 4-frame onboarding flow.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/onboarding-milestone.md.
 *
 * Source of truth for "has this user completed onboarding?" is the
 * server (User.onboardingCompletedAt). This hook combines that with
 * UI-local state (current frame, replay flag, open flag) so any page
 * that needs to mount <OnboardingFlow /> can read a single shape.
 *
 * Usage:
 *   const onboarding = useOnboardingState()
 *   if (onboarding.shouldAutoStart) // mount on first dashboard render
 *   onboarding.open({ replay: true }) // help-menu replay path
 *   onboarding.next() / .skip() / .finish()
 */
import { useCallback, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api, unwrap } from '../lib/api';
import { useMe } from './useAuth';

export type OnboardingFrame = 0 | 1 | 2 | 3;

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
  const [isOpen, setIsOpen] = useState(false);
  const [isReplay, setIsReplay] = useState(false);
  const [currentFrame, setCurrentFrame] = useState<OnboardingFrame>(0);

  const completeMutation = useMutation({
    mutationFn: () =>
      unwrap<CompleteResponse>(api.post('/me/onboarding/complete')),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['auth', 'me'] });
    },
  });

  const shouldAutoStart = Boolean(me?.id) && !me?.onboardingCompletedAt;

  const open = useCallback((opts?: { replay?: boolean }) => {
    setIsReplay(Boolean(opts?.replay));
    setCurrentFrame(0);
    setIsOpen(true);
  }, []);

  const next = useCallback(() => {
    setCurrentFrame((f) => (f < 3 ? ((f + 1) as OnboardingFrame) : f));
  }, []);

  const closeAndPersist = useCallback(() => {
    setIsOpen(false);
    setCurrentFrame(0);
    if (!isReplay) {
      // Fire-and-forget. Backend is idempotent; failures retried on
      // next sign-in (column stays null).
      completeMutation.mutate();
    }
    setIsReplay(false);
  }, [isReplay, completeMutation]);

  return {
    shouldAutoStart,
    isOpen,
    isReplay,
    currentFrame,
    open,
    next,
    skip: closeAndPersist,
    finish: closeAndPersist,
  };
}
