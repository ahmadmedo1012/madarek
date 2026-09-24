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
 *   - the dot strip (below the controls) fills as the tour progresses
 *
 * Motion (wave 8-c — one authored moment per frame):
 *   - the whole frame body (illustration + copy + controls) slides in
 *     direction-aware — forward follows the reading direction via
 *     --motion-direction, stepping back mirrors it
 *   - inside the slide the three beats stagger in: illustration
 *     settles first, then the copy, then the CTA (3 beats, under the
 *     --motion-stagger-cap)
 *   - reduced motion: every keyframe has its own off-switch in the
 *     wave 8-c section of components.css
 *
 * Keyboard:
 *   - arrows navigate frames (RTL-aware: ArrowLeft advances under
 *     dir="rtl"), Escape skips (the Modal's focus trap), Enter on the
 *     focused CTA advances/finishes
 *   - focus lands on the primary CTA on open and on every frame change
 *
 * State flow: `open/frame/replay` live in the shared `onboarding.store`
 * (driven by AppShell's auto-start and the Sidebar replay trigger);
 * the `useOnboardingState` hook exposes that store plus the
 * me-derived `shouldAutoStart` flag and the completion POST. This
 * component only renders the visible flow.
 */
import { useEffect, useRef } from 'react';
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
    headline: 'أهلاً بك في مدارك',
    body: 'وفّر وقتك وتركيزك: كل ما يخصّ حياتك الدراسية في جامعة الزاوية يجتمع هنا في مكان واحد.',
    illustration: 'onboarding-frame-1',
  },
  {
    headline: 'يومك الدراسي واضح من أول نظرة',
    body: 'محاضراتك ومهامك ومواعيد تسليمك مرتّبة أمامك، فتعرف دائماً ماذا بعد — بلا بحث ولا تشتّت.',
    illustration: 'onboarding-frame-2',
  },
  {
    headline: 'تقدّمك يُقاس ويُحتفى به',
    body: 'تابع نموّك مادةً بمادة، وستجد المنصة تحتفل معك بكل إنجاز جديد.',
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
  STUDENT: 'موادك ومهامك ودرجاتك بين يديك. ابدأ من لوحة يومك، وتقدّم بإيقاعك الذي يناسبك.',
  TEACHER: 'جهّز محاضراتك وتابع حضور طلابك وتقييماتهم من شاشة واحدة، بوقت أقل وجهد أيسر.',
  ADMIN: 'أدِر المستخدمين والكليات والصلاحيات بوضوح وثقة — كل أدواتك الإدارية جاهزة بين يديك.',
  QUALITY: 'مؤشرات الأداء والتقييمات أمامك مباشرة، لتستند في قراراتك إلى بيانات دقيقة.',
  OWNER: 'رؤية شاملة للمنصة: المؤشرات الكبرى، حالة الخدمات، وكل ما يهمّ القرار في مكان واحد.',
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

  // Direction-aware slide: compare the incoming frame against the one
  // the user just saw. The ref holds the previous frame until after
  // paint (the standard previous-value pattern), so the render that
  // swaps frames still knows which way the user is travelling.
  const prevFrameRef = useRef(currentFrame);
  const direction: 'forward' | 'back' =
    currentFrame >= prevFrameRef.current ? 'forward' : 'back';
  useEffect(() => {
    prevFrameRef.current = currentFrame;
  }, [currentFrame]);

  // Focus lands on the CTA on open and on every frame change (wave 8-c
  // mission): keyboard users get a stable Enter-to-advance anchor. The
  // deferral lets the Modal focus trap's own initial focus settle
  // first (child effects run before this one), so the CTA wins.
  const ctaRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (!isOpen) return;
    const t = window.setTimeout(() => {
      ctaRef.current?.focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(t);
  }, [isOpen, currentFrame]);

  // Arrow-key frame navigation (RTL-aware): under dir="rtl" the
  // reading direction runs right-to-left, so ArrowLeft points "forward"
  // — the same side of the modal the Next control sits on. LTR mirrors.
  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    // Defensive: never hijack arrows from editable chrome.
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
    e.preventDefault();
    const rtl = typeof document === 'undefined' || document.documentElement.dir !== 'ltr';
    const forwardKey = rtl ? 'ArrowLeft' : 'ArrowRight';
    if (e.key === forwardKey) next();
    else prev();
  };

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
      <div className="onboarding-flow" data-frame={currentFrame} onKeyDown={onKeyDown}>
        <header className="onboarding-flow-skip-row">
          <button
            type="button"
            className="onboarding-flow-skip"
            onClick={skip}
          >
            {skipLabel}
          </button>
        </header>

        {/* Keyed frame body: remounting on every frame change replays
            the direction-aware slide + the 3-beat stagger (components.css
            wave 8-c). The skip row and dot strip persist above/below so
            the dots' fill transition animates between frames. */}
        <div
          className="onboarding-flow-frame"
          key={currentFrame}
          data-frame-direction={direction}
        >
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
              ref={ctaRef}
            >
              {isLast ? finishLabel : nextLabel}
            </button>
          </footer>
        </div>

        <DotStrip current={currentFrame} total={4} />
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
          className={`onboarding-flow-dot${
            i === current ? ' is-active' : i < current ? ' is-done' : ''
          }`}
        />
      ))}
    </div>
  );
}
