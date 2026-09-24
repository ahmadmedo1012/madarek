/**
 * Onboarding store — single shared source of truth for the 4-frame
 * onboarding flow (contract: specs/012-design-graphics-uplift/contracts/
 * onboarding-milestone.md).
 *
 * Why a store (audit 0-f P0-2): the flow is driven from several
 * components — AppShell auto-starts it after the first authenticated
 * render, the Sidebar help menu replays it, and <OnboardingFlow />
 * renders the modal. With component-local state each instance held
 * its own copy, so the renderer's `isOpen` never flipped and the flow
 * could never open. All UI state lives here; every consumer observes
 * and mutates the same store.
 *
 * Server persistence stays in the `useOnboardingState` hook (mirroring
 * the theme profile sync pattern): completion is recorded via the
 * idempotent `POST /me/onboarding/complete` and `me.onboardingCompletedAt`
 * drives `shouldAutoStart` — no local persistence is needed.
 *
 * Session-scoped by design (like `ui.store`'s mobile drawer state):
 * nothing here outlives the tab, so no `persist` middleware.
 */
import { create } from 'zustand';

export type OnboardingFrame = 0 | 1 | 2 | 3;

/** Last frame index of the generic → role-keyed sequence. */
export const ONBOARDING_LAST_FRAME = 3;

interface OnboardingState {
  /** True while the flow modal is mounted (auto-started or replayed). */
  isOpen: boolean;
  /** Currently visible frame index 0..3. */
  currentFrame: OnboardingFrame;
  /** True when this open was a help-menu replay — completion must not be re-persisted on close. */
  isReplay: boolean;
  /** Open the flow at frame 0. `opts.replay` marks a help-menu replay. */
  start(opts?: { replay?: boolean }): void;
  /** Close without recording completion (user skipped / dismissed). */
  dismiss(): void;
  /** Close after the user completed the final frame. */
  complete(): void;
  /** Advance one frame (clamped at the last frame; no backend call). */
  next(): void;
  /** Step back one frame (clamped at 0; no backend call). */
  prev(): void;
  /** Jump to an arbitrary frame, clamped to 0..3. */
  goTo(frame: number): void;
}

function closedReset(): Pick<OnboardingState, 'isOpen' | 'currentFrame' | 'isReplay'> {
  return { isOpen: false, currentFrame: 0, isReplay: false };
}

function clampFrame(frame: number): OnboardingFrame {
  return Math.max(0, Math.min(ONBOARDING_LAST_FRAME, Math.round(frame))) as OnboardingFrame;
}

export const useOnboardingStore = create<OnboardingState>()((set) => ({
  isOpen: false,
  currentFrame: 0,
  isReplay: false,
  start: (opts) =>
    set({ isOpen: true, currentFrame: 0, isReplay: Boolean(opts?.replay) }),
  // Both close paths reset frame + replay flag; they stay separate
  // actions so callers (and future analytics) can express intent.
  dismiss: () => set(closedReset()),
  complete: () => set(closedReset()),
  next: () => set((s) => ({ currentFrame: clampFrame(s.currentFrame + 1) })),
  prev: () => set((s) => ({ currentFrame: clampFrame(s.currentFrame - 1) })),
  goTo: (frame) => set({ currentFrame: clampFrame(frame) }),
}));

/**
 * Derived gate (contract onboarding-milestone.md §5): milestone scenes
 * queue while the onboarding flow owns the modal layer — two stacked
 * focus-trapped modals would fight for focus. The milestone presents
 * as soon as the flow completes or is dismissed.
 */
export const selectCanShowMilestone = (s: OnboardingState): boolean => !s.isOpen;
