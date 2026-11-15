/**
 * OnboardingFlow — 4-frame illustrated onboarding sequence.
 *
 * Contract: specs/012-design-graphics-uplift/contracts/onboarding-milestone.md.
 *
 * Composition:
 *   - mounted via the Modal primitive (T060) for focus trap, Esc/click-
 *     outside dismissal, body scroll lock
 *   - one of four scene illustrations per frame; the fourth frame's
 *     illustration keys off the coarse role, its COPY is seat-exact
 *     (R353 E4: role + staffRole + position — see seatFrameCopy)
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
 *     focused CTA advances/finishes — the forward arrow routes through
 *     the SAME advance() path, so on the last frame it finishes the
 *     tour exactly like the CTA (no silent clamp no-op)
 *   - focus lands on the primary CTA on open and on every frame change
 *
 * Dialog naming (r170-e): the accessible name tracks the rendered
 * headline via aria-labelledby — screen readers announce the text
 * sighted users read; the per-frame live region below carries the
 * step counter + copy so every advance is announced as it changes.
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
import { Illustration as MkIllustration } from '../illustrations/Illustration';
import type { MkIllustrationName } from '../illustrations/names';
import { useOnboardingState } from '../../hooks/useOnboardingState';
import { useMe } from '../../hooks/useAuth';
import {
  STAFF_ROLE_LABELS,
  type AcademicPosition,
  type AppRole,
  type StaffRole,
} from '../../stores/auth.store';
import { ROLE_LABELS } from '../../lib/roleLabels';

/* r280: frame 0's scene moves to the mk-ill kit (`welcome-first-run`,
 * the wiring guide's §5 mapping for "Onboarding first frame") — the
 * welcome moment now speaks the redesigned state-graphics family.
 * Frames 1–2 and the role-intro keep their bespoke legacy scenes
 * (they have no kit equivalents yet; both systems coexist per the
 * Agent I guide §4). */
interface FrameCopy {
  headline: string;
  body: string;
  /** Legacy 012 scene (frames 1–2 + role-intro). */
  illustration?: IllustrationName;
  /** r280 kit piece (frame 0). Exactly one of the two is set. */
  mkIllustration?: MkIllustrationName;
}

const GENERIC_FRAMES: FrameCopy[] = [
  {
    headline: 'أهلاً بك في مدارك',
    body: 'وفّر وقتك وتركيزك: كل ما يخصّ حياتك الدراسية في جامعتك يجتمع هنا في مكان واحد.',
    mkIllustration: 'welcome-first-run',
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

/* ── R353 E4 — the seat-exact role frame ───────────────────────────
 *
 * Frame 4 used to speak in the 5 coarse Role values only. The E2 seat
 * layer (docs/ROLES-LIBYA.md §3) made the real Libyan seats exact:
 * ADMIN splits into المسجل العام / مسجل الكلية, QUALITY into مراقب
 * الامتحانات / موظف الجودة, and a TEACHER may carry a leadership
 * position (عميد / وكيل الكلية / رئيس قسم). The final frame now
 * greets the SEAT — titles read the ONE canonical label maps
 * (STAFF_ROLE_LABELS, ROLE_LABELS), never re-hardcoded — and every
 * body is a first-action hint under the copy diet law (≤ 2 short
 * lines; docs/ROLES-LIBYA.md is the terminology source).
 */
interface SeatFrameCopy {
  headline: string;
  body: string;
}

/** Leadership seat titles (the TeacherProfile.position overlay) — the
 * docs/ROLES-LIBYA.md wording (عميد الكلية / وكيل الكلية للشؤون
 * العلمية / رئيس القسم) shortened to the bare seat noun. */
const POSITION_SEAT_TITLES: Record<AcademicPosition, string> = {
  DEAN: 'العميد',
  ASSOCIATE_DEAN: 'وكيل الكلية',
  DEPARTMENT_HEAD: 'رئيس القسم',
};

/** TEACHER + position = a leadership seat (E3): the same teaching
 * tools plus the oversight read, scoped by the position — faculty for
 * the dean/vice-dean, department for the head. */
const LEADERSHIP_SEAT_FRAMES: Record<AcademicPosition, SeatFrameCopy> = {
  DEAN: {
    headline: `مرحباً بك أيها ${POSITION_SEAT_TITLES.DEAN}`,
    body: 'نفس أدوات الأستاذ: رفع المحتوى ومتابعة الحضور وإدخال الدرجات. ومعها اطلاع إشرافيّ على كلّيّتك وأقسامها.',
  },
  ASSOCIATE_DEAN: {
    headline: `مرحباً بك يا ${POSITION_SEAT_TITLES.ASSOCIATE_DEAN}`,
    body: 'نفس أدوات الأستاذ: رفع المحتوى ومتابعة الحضور وإدخال الدرجات. ومعها اطلاع إشرافيّ على كلّيّتك وأقسامها.',
  },
  DEPARTMENT_HEAD: {
    headline: `مرحباً بك يا ${POSITION_SEAT_TITLES.DEPARTMENT_HEAD}`,
    body: 'نفس أدوات الأستاذ: رفع المحتوى ومتابعة الحضور وإدخال الدرجات. ومعها اطلاع إشرافيّ على قسمك.',
  },
};

/** The four staff offices (User.staffRole) — titles reuse the ONE
 * canonical STAFF_ROLE_LABELS map (the sidebar's source), so a rename
 * there lands here too. */
const STAFF_SEAT_FRAMES: Record<StaffRole, SeatFrameCopy> = {
  // R320 §B lineage: the registrar seat's greeting names the office.
  REGISTRAR_GENERAL: {
    headline: `مرحباً بك أيها ${STAFF_ROLE_LABELS.REGISTRAR_GENERAL}`,
    body: 'ملفات الطلاب والقبول والتسجيل على مستوى المنصّة. ابدأ باستيراد قوائم الطلاب وإنشاء الملفات وإسناد الأرقام الجامعية والموافقة على الطلبات.',
  },
  COLLEGE_REGISTRAR: {
    headline: `مرحباً بك يا ${STAFF_ROLE_LABELS.COLLEGE_REGISTRAR}`,
    body: 'ملفات الطلاب والقبول والتسجيل في كليتك. ابدأ بقوائم كليتك وإسناد الأرقام الجامعية واعتماد التسجيل.',
  },
  EXAMS_CONTROLLER: {
    headline: `مرحباً بك يا ${STAFF_ROLE_LABELS.EXAMS_CONTROLLER}`,
    body: 'قسم الدراسة والامتحانات: راجع الاختبارات واعتمدها، واضبط النتائج.',
  },
  QUALITY_OFFICER: {
    headline: `مرحباً بك يا ${STAFF_ROLE_LABELS.QUALITY_OFFICER}`,
    body: 'مؤشرات الجودة والتقارير أمامك. مراجعة الاختبارات ليست من صلاحياتك — فهي لدى قسم الدراسة والامتحانات.',
  },
};

/** Coarse-role seats (STUDENT / plain TEACHER / OWNER) plus the
 * fallback for staff rows whose staffRole is still null (pre-E2
 * migration). */
const BASE_SEAT_FRAMES: Record<AppRole, SeatFrameCopy> = {
  STUDENT: {
    headline: `مرحباً يا ${ROLE_LABELS.STUDENT}`,
    body: 'موادك واختباراتك بين يديك — تابع الدروس والاختبارات والنتائج.',
  },
  TEACHER: {
    headline: 'مرحباً بك أستاذنا',
    body: 'موادك ومحاضراتك بين يديك: ارفع المحتوى، وتابع الحضور، وأدخل الدرجات.',
  },
  ADMIN: STAFF_SEAT_FRAMES.REGISTRAR_GENERAL,
  QUALITY: STAFF_SEAT_FRAMES.QUALITY_OFFICER,
  OWNER: {
    headline: `مرحباً يا ${ROLE_LABELS.OWNER}`,
    body: 'إدارة المنصّة بين يديك: المؤسسات والمستخدمون وإعدادات النظام.',
  },
};

/** Resolve the seat-exact frame-4 copy from the coarse role plus the
 * E2 seat axes (User.staffRole on ADMIN/QUALITY,
 * TeacherProfile.position on TEACHER). */
function seatFrameCopy(
  role: AppRole,
  staffRole: StaffRole | null | undefined,
  position: AcademicPosition | null | undefined,
): SeatFrameCopy {
  // Leadership overlay first: a TEACHER carrying an academic position
  // is a leadership seat (teacher tools + the oversight read), never a
  // plain-teacher frame.
  if (role === 'TEACHER' && position) return LEADERSHIP_SEAT_FRAMES[position];
  if (role === 'ADMIN' || role === 'QUALITY') {
    return staffRole ? STAFF_SEAT_FRAMES[staffRole] : BASE_SEAT_FRAMES[role];
  }
  return BASE_SEAT_FRAMES[role];
}

export interface OnboardingFlowProps {
  /** Override frame copy (defaults to the Arabic generic set). */
  frames?: FrameCopy[];
  /** Escape hatch for custom tours: coarse-role override of the final
   * frame. Unset by default — the tour then greets the exact seat
   * (R353 E4, seatFrameCopy: role + staffRole + position). */
  roleHeadlines?: Record<string, string>;
  roleBodies?: Record<string, string>;
  skipLabel?: string;
  nextLabel?: string;
  finishLabel?: string;
  backLabel?: string;
}

export function OnboardingFlow({
  frames = GENERIC_FRAMES,
  roleHeadlines,
  roleBodies,
  skipLabel = 'تخطّي',
  nextLabel = 'التالي',
  finishLabel = 'لنبدأ',
  backLabel = 'السابق',
}: OnboardingFlowProps = {}) {
  const { isOpen, currentFrame, next, prev, skip, finish } = useOnboardingState();
  const { data: me } = useMe();
  const role: AppRole = me?.role ?? 'STUDENT';
  /* R353 E4 — the seat axes frame 4 greets: the staff office
   * (ADMIN/QUALITY) and the leadership position (TEACHER overlay). */
  const staffRole = me?.staffRole ?? null;
  const position = me?.teacherProfile?.position ?? null;

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
  // The forward key routes through the SAME advance() path as the CTA
  // (next → or finish on the last frame): an arrow press on the final
  // frame completes the tour instead of silently no-oping against the
  // clamp, so the keyboard story mirrors the buttons exactly.
  const advance = () => {
    if (isLast) finish();
    else next();
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return;
    // Defensive: never hijack arrows from editable chrome.
    const target = e.target as HTMLElement;
    if (target.closest('input, textarea, select, [contenteditable="true"]')) return;
    e.preventDefault();
    const rtl = typeof document === 'undefined' || document.documentElement.dir !== 'ltr';
    const forwardKey = rtl ? 'ArrowLeft' : 'ArrowRight';
    if (e.key === forwardKey) advance();
    else prev();
  };

  // One total for every «N of M» surface: the dot strip and the live
  // region must agree, and both must count the role-keyed frame the
  // contract appends after the generic set (custom frame sets must
  // keep that frame — see the live-region note below).
  const totalFrames = frames.length + 1;

  let illustrationName: IllustrationName | undefined;
  let mkName: MkIllustrationName | undefined;
  let headline: string;
  let body: string;
  if (currentFrame < 3) {
    const f = frames[currentFrame] ?? frames[0]!;
    illustrationName = f.illustration;
    mkName = f.mkIllustration;
    headline = f.headline;
    body = f.body;
  } else {
    illustrationName = 'onboarding-role-intro';
    // R353 E4: seat-exact copy (role + staffRole + position); the
    // coarse-role props remain the custom-tour escape hatch.
    const seat = seatFrameCopy(role, staffRole, position);
    headline = roleHeadlines?.[role] ?? roleHeadlines?.STUDENT ?? seat.headline;
    body = roleBodies?.[role] ?? roleBodies?.STUDENT ?? seat.body;
  }

  return (
    <Modal
      open={isOpen}
      onClose={skip}
      ariaLabel={headline}
      labelledById="onboarding-flow-title"
      closeOnOverlayClick={false}
    >
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
            {mkName ? (
              <MkIllustration name={mkName} />
            ) : (
              <Illustration
                name={illustrationName!}
                role={role}
                decorative
              />
            )}
          </div>

          <div className="onboarding-flow-copy">
            <h2 id="onboarding-flow-title" className="onboarding-flow-headline">{headline}</h2>
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

        <DotStrip current={currentFrame} total={totalFrames} />

        {/* r157 F5: persistent sr-only live region — deliberately OUTSIDE
            the keyed frame remount above (a region that is recreated with
            each frame announces nothing: screen readers only speak when
            EXISTING live-region content changes). The SAME node stays
            mounted while the tour is open, so every frame advance is
            announced as «الإطار N من M: {headline}. {body}». Digits stay
            latin (platform numeric convention); M = totalFrames counts
            the default 4-frame set (3 generic + the role frame) — custom
            frame sets must keep the role frame. */}
        <p className="sr-only" role="status" aria-live="polite">
          {`الإطار ${currentFrame + 1} من ${totalFrames}: ${headline}. ${body}`}
        </p>
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
