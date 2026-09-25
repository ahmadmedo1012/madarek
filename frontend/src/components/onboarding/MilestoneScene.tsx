/**
 * MilestoneScene — one-shot celebratory presenter for a milestone.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/onboarding-milestone.md.
 *
 * Reads the pending milestone id from useMilestone and renders the
 * milestone-section illustration in a Modal. Auto-dismisses after a
 * short hold so the user isn't blocked.
 *
 * Per the contract:
 *   - fires once per scope (the hook's session-Set guarantees this)
 *   - a milestone that arrives while the user is inside the
 *     onboarding flow QUEUES until the flow closes (§5) — two stacked
 *     focus-trapped modals would fight for focus. The gate is the
 *     store-derived `selectCanShowMilestone`.
 *   - reduced-motion users see the final state without the cascade
 *
 * Wave 8-c:
 *   - celebration beat (components.css): the illustration POPS in with
 *     a settle overshoot, the title rises just behind it — one authored
 *     moment, off-switch included for reduced motion
 *   - smooth handoff: when the onboarding flow closes while a
 *     milestone is queued, the flow's modal is still playing its exit
 *     animation (useDelayedUnmount keeps it mounted with
 *     data-closing). Presenting the celebration the same instant would
 *     cross-fade two modal cards (a "double flash"); the scene waits
 *     out the exit window first — see the handoff effect below.
 *
 * Wave 13-16 (audit 11-e P2-8):
 *   - the Modal owns its own close: it stays mounted with
 *     open={presenting} instead of MilestoneScene returning null on
 *     dismissal, so the wave-7a exit animation finally plays for
 *     milestones too (parity with OnboardingFlow). The last-presented
 *     scene is remembered so the card keeps its content through the
 *     exit window.
 *   - the auto-dismiss hold no longer restarts on parent re-renders
 *     (useMilestone's dismissPending is now referentially stable).
 */
import { useEffect, useRef, useState } from 'react';
import { Modal } from '../overlays/Modal';
import { Illustration } from '../Illustration';
import { useMilestone, type MilestoneId } from '../../hooks/useMilestone';
import { useOnboardingStore, selectCanShowMilestone } from '../../stores/onboarding.store';
import { readMotionDurationMs } from '../overlays/useDelayedUnmount';

const HEADLINE_BY_ID: Record<string, string> = {
  // تهانينا — the formal register (15-j P2-12: مبروك is colloquial);
  // مادة → مقرّر per D17-1.
  'first-assignment-complete': 'تهانينا على أوّل واجب!',
  'first-course-complete': 'تهانينا على إتمام أوّل مقرّر!',
};

const BODY_BY_ID: Record<string, string> = {
  'first-assignment-complete': 'خطوة جميلة، تابع المسير. التزامك سيُحدث فرقاً.',
  'first-course-complete': 'إنجاز كبير. أكمل لتصل لمراحل أبعد.',
};

function describe(id: string): { headline: string; body: string } {
  if (id.startsWith('exam-window-opens:')) {
    return {
      headline: 'فُتحت نافذة اختبارك',
      body: 'بالتوفيق! حان وقت عرض ما تعلّمته بثقة.',
    };
  }
  return {
    headline: HEADLINE_BY_ID[id] ?? 'إنجاز جديد',
    body: BODY_BY_ID[id] ?? 'خطوة في الاتجاه الصحيح.',
  };
}

/**
 * Auto-dismiss hold. Budget: the entrance beat (illustration pop +
 * title rise) plays within ~--motion-duration-long (380ms), leaving
 * roughly 3.5s to read two short lines and land on the CTA before the
 * scene dismisses itself. The timer only arms once the scene is
 * actually visible, so a queued milestone never burns its hold.
 */
const HOLD_MS = 4000;

/** Slack added to the exit-window read so the handoff never cuts the
 * onboarding modal's fade short (mirrors useDelayedUnmount's math). */
const HANDOFF_SLACK_MS = 80;

export interface MilestoneSceneProps {
  /** Override the auto-dismiss hold (ms). Default 4000. */
  holdMs?: number;
}

export function MilestoneScene({ holdMs = HOLD_MS }: MilestoneSceneProps = {}) {
  const { pendingScene, dismissPending } = useMilestone();
  // Queue behind the onboarding flow (contract §5): while the tour
  // owns the modal layer the milestone stays pending but unrendered;
  // it presents the moment onboarding completes or is dismissed.
  const canShowMilestone = useOnboardingStore(selectCanShowMilestone);

  // Smooth handoff (see docblock): if the gate opens while the
  // onboarding modal is still exiting (data-closing overlay in the
  // DOM), hold the milestone for the exit window so the two modals
  // never cross-fade. Derived from the live DOM rather than a fixed
  // timer — when no closing overlay exists (standalone milestones,
  // reduced motion, test harnesses without the flow mounted) the scene
  // presents immediately.
  const [handoffReady, setHandoffReady] = useState(true);
  const prevGateRef = useRef(canShowMilestone);
  useEffect(() => {
    const wasBlocked = !prevGateRef.current;
    prevGateRef.current = canShowMilestone;
    if (!canShowMilestone || !wasBlocked) return;
    const closingOverlay = document.querySelector('.modal-overlay[data-closing="true"]');
    if (!closingOverlay) return;
    const exitMs =
      readMotionDurationMs('--motion-duration-medium', 240) + HANDOFF_SLACK_MS;
    setHandoffReady(false);
    const t = window.setTimeout(() => setHandoffReady(true), exitMs);
    return () => window.clearTimeout(t);
  }, [canShowMilestone]);

  // The scene is VISIBLE while a milestone is pending AND the queue
  // gates are open. The Modal stays mounted from the first
  // presentation onward — its useDelayedUnmount owns the exit window,
  // so dismissal flips `open` to false and the wave-7a exit animation
  // plays instead of an instant unmount (audit 11-e P2-8).
  const presenting = Boolean(pendingScene) && canShowMilestone && handoffReady;

  // The last-presented scene outlives pendingScene (which goes null on
  // dismissal) so the modal card keeps its content through the exit
  // animation instead of fading out empty.
  const [presentedScene, setPresentedScene] = useState<MilestoneId | null>(null);
  useEffect(() => {
    if (presenting && pendingScene !== null) setPresentedScene(pendingScene);
  }, [presenting, pendingScene]);

  // Auto-dismiss after the hold elapses — the timer only arms once
  // the scene is actually visible (gate open AND handoff complete), so
  // a queued or handed-off milestone never burns its hold while
  // hidden behind the onboarding modal or its exit animation. With a
  // referentially stable dismissPending, parent re-renders no longer
  // tear the timer down mid-hold (audit 11-e P2-8).
  useEffect(() => {
    if (!pendingScene || !canShowMilestone || !handoffReady) return;
    const t = window.setTimeout(dismissPending, holdMs);
    return () => window.clearTimeout(t);
  }, [pendingScene, dismissPending, holdMs, canShowMilestone, handoffReady]);

  // Nothing has ever presented — no modal in the tree at all.
  if (!presentedScene) return null;
  const { headline, body } = describe(presentedScene);

  return (
    <Modal open={presenting} onClose={dismissPending} ariaLabel={headline} closeOnOverlayClick>
      <div className="onboarding-flow onboarding-flow--milestone" data-milestone={presentedScene}>
        <div className="onboarding-flow-illustration">
          <Illustration name="milestone-section" decorative />
        </div>
        <div className="onboarding-flow-copy">
          <h2 className="onboarding-flow-headline">{headline}</h2>
          <p className="onboarding-flow-body">{body}</p>
        </div>
        <footer className="onboarding-flow-actions" style={{ justifyContent: 'center' }}>
          <button type="button" className="btn primary" onClick={dismissPending} autoFocus>
            تابع
          </button>
        </footer>
      </div>
    </Modal>
  );
}
