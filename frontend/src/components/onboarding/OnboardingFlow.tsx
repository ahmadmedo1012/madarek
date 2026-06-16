/**
 * OnboardingFlow — 4-frame illustrated onboarding sequence.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/onboarding-milestone.md.
 *
 * Composition:
 *   - mounted via the Modal primitive (T060) for focus trap, Esc/click-
 *     outside dismissal, body scroll lock
 *   - one of four scene illustrations per frame, the fourth keyed off
 *     the user's role
 *   - Back / Next controls + a visible Skip on every frame
 *   - the dot strip shows progress without taking focus
 *
 * The hook (`useOnboardingState`) decides when to mount this; here we
 * only care about rendering the visible flow.
 */
import type { ReactNode } from 'react';
import { Modal } from '../overlays/Modal';
import { Illustration } from '../Illustration';
import type { IllustrationName } from '../../lib/illustrations';
import { useOnboardingState } from '../../hooks/useOnboardingState';
import { useMe } from '../../hooks/useAuth';

interface FrameCopy {
  headline: string;
  body: string;
  illustration: IllustrationName;
}

const GENERIC_FRAMES: FrameCopy[] = [
  {
    headline: 'أهلاً بك في مدراك',
    body: 'منصة جامعة الزاوية الذكية للتعلم والإدارة. خذ دقيقة لتعرّف على أبرز ما يمكنك فعله هنا.',
    illustration: 'onboarding-frame-1',
  },
  {
    headline: 'مكان عملك المنظّم',
    body: 'كل ما تحتاجه للمحاضرات والمواد والمهام في مكان واحد، صُمّم ليرتاح معه يومك.',
    illustration: 'onboarding-frame-2',
  },
  {
    headline: 'استعدّ للنمو',
    body: 'سنرافقك خطوة بخطوة. ابدأ من لوحتك الرئيسية وتقدّم بإيقاعك.',
    illustration: 'onboarding-frame-3',
  },
];

const ROLE_FRAME_HEADLINE: Record<string, string> = {
  STUDENT: 'مرحباً يا طالب',
  TEACHER: 'مرحباً بك أستاذنا',
  ADMIN: 'مرحباً بك أيها المسؤول',
  QUALITY: 'مرحباً بك في فريق الجودة',
  OWNER: 'مرحباً يا مدير المنصة',
};

const ROLE_FRAME_BODY: Record<string, string> = {
  STUDENT: 'كل أدواتك الدراسية في متناول يدك. ابدأ بمواد الفصل الحالي وتابع تقدّمك في كل مادة.',
  TEACHER: 'إدارة المقررات والطلاب والاختبارات بسهولة. ابدأ من قائمة مقرّراتك وتابع حضور طلابك.',
  ADMIN: 'صلاحياتك الإدارية جاهزة. ابدأ من لوحة الإدارة لإدارة المستخدمين والكليات.',
  QUALITY: 'متابعة جودة التعليم في جامعة الزاوية. ابدأ بمراجعة المؤشرات والتقييمات.',
  OWNER: 'لوحة المالك تجمع كل ما تحتاجه: المؤشرات الكبرى، الموارد، والإدارة العليا.',
};

export interface OnboardingFlowProps {
  /** Override frame copy (defaults to the Arabic generic set). */
  frames?: FrameCopy[];
  /** Override role-frame copy keyed by AppRole. */
  roleHeadlines?: Record<string, string>;
  roleBodies?: Record<string, string>;
  skipLabel?: string;
  nextLabel?: string;
  finishLabel?: string;
  backLabel?: string;
}

export function OnboardingFlow({
  frames = GENERIC_FRAMES,
  roleHeadlines = ROLE_FRAME_HEADLINE,
  roleBodies = ROLE_FRAME_BODY,
  skipLabel = 'تخطّي',
  nextLabel = 'التالي',
  finishLabel = 'لنبدأ',
  backLabel = 'السابق',
}: OnboardingFlowProps = {}) {
  const { isOpen, currentFrame, next, prev, skip, finish } = useOnboardingState();
  const { data: me } = useMe();
  const role = me?.role ?? 'STUDENT';

  const isLast = currentFrame === 3;
  const isFirst = currentFrame === 0;

  let illustrationName: IllustrationName;
  let headline: string;
  let body: string;
  if (currentFrame < 3) {
    const f = frames[currentFrame] ?? frames[0]!;
    illustrationName = f.illustration;
    headline = f.headline;
    body = f.body;
  } else {
    illustrationName = 'onboarding-role-intro';
    headline = roleHeadlines[role] ?? roleHeadlines.STUDENT ?? '';
    body = roleBodies[role] ?? roleBodies.STUDENT ?? '';
  }

  const advance = () => {
    if (isLast) finish();
    else next();
  };

  return (
    <Modal open={isOpen} onClose={skip} ariaLabel={headline} closeOnOverlayClick={false}>
      <div className="onboarding-flow" data-frame={currentFrame}>
        <header className="onboarding-flow-skip-row">
          <button
            type="button"
            className="onboarding-flow-skip"
            onClick={skip}
          >
            {skipLabel}
          </button>
        </header>

        <div className="onboarding-flow-illustration">
          <Illustration
            name={illustrationName}
            role={role}
            decorative
          />
        </div>

        <div className="onboarding-flow-copy">
          <h2 className="onboarding-flow-headline">{headline}</h2>
          <p className="onboarding-flow-body">{body}</p>
        </div>

        <DotStrip current={currentFrame} total={4} />

        <footer className="onboarding-flow-actions">
          <button
            type="button"
            className="btn"
            onClick={prev}
            style={{ visibility: isFirst ? 'hidden' : 'visible' }}
            aria-hidden={isFirst}
            tabIndex={isFirst ? -1 : 0}
          >
            {backLabel}
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={advance}
            autoFocus
          >
            {isLast ? finishLabel : nextLabel}
          </button>
        </footer>
      </div>
    </Modal>
  );
}

function DotStrip({ current, total }: { current: number; total: number }) {
  return (
    <div className="onboarding-flow-dots" role="presentation" aria-hidden>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`onboarding-flow-dot${i === current ? ' is-active' : ''}`}
        />
      ))}
    </div>
  );
}
