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
 */
import { useEffect } from 'react';
import { Modal } from '../overlays/Modal';
import { Illustration } from '../Illustration';
import { useMilestone } from '../../hooks/useMilestone';
import { useOnboardingStore, selectCanShowMilestone } from '../../stores/onboarding.store';

const HEADLINE_BY_ID: Record<string, string> = {
  'first-assignment-complete': 'مبروك أوّل واجب!',
  'first-course-complete': 'مبروك إنهاء أوّل مادة!',
};

const BODY_BY_ID: Record<string, string> = {
  'first-assignment-complete': 'خطوة جميلة، تابع المسير. التزامك سيُحدث فرقاً.',
  'first-course-complete': 'إنجاز كبير. أكمل لتصل لمراحل أبعد.',
};

function describe(id: string): { headline: string; body: string } {
  if (id.startsWith('exam-window-opens:')) {
    return {
      headline: 'فُتحت نافذة امتحانك',
      body: 'حظاً موفقاً. أنت جاهز.',
    };
  }
  return {
    headline: HEADLINE_BY_ID[id] ?? 'إنجاز جديد',
    body: BODY_BY_ID[id] ?? 'خطوة في الاتجاه الصحيح.',
  };
}

const HOLD_MS = 4000;

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

  // Auto-dismiss after the hold elapses — the timer only arms once
  // the scene is actually visible, so a queued milestone never burns
  // its hold while hidden behind the onboarding modal.
  useEffect(() => {
    if (!pendingScene || !canShowMilestone) return;
    const t = window.setTimeout(dismissPending, holdMs);
    return () => window.clearTimeout(t);
  }, [pendingScene, dismissPending, holdMs, canShowMilestone]);

  if (!pendingScene || !canShowMilestone) return null;
  const { headline, body } = describe(pendingScene);

  return (
    <Modal open onClose={dismissPending} ariaLabel={headline} closeOnOverlayClick>
      <div className="onboarding-flow" data-milestone={pendingScene}>
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
