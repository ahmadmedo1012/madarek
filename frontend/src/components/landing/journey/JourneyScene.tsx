/**
 * JourneyScene — R308 «رحلة التعلّم» · R310 the plan scene.
 *
 * The reference's narrative center of gravity is a pinned scene that
 * owns ~51% of the page. The R310 translation (spec §2.2/§4.3): the
 * walkthrough draws an original detailed FLOOR PLAN — «مسطح التعلّم»
 * (LearningPlanDrawing) — and the plan's geometry GENUINELY BUILDS as
 * the scroll advances:
 *
 *  · stage 0 (شاهد) — the envelope, column grid and the lecture hall
 *    (raked seating + stage) draw in;
 *  · stage 1 (تحقّق) — the checkpoint kiosk joins;
 *  · stage 2 (اختبر) — the exam hall + the library wing join;
 *  · stage 3 (أتقن) — the mastery room, the entry and every
 *    annotation resolve — the completed plan.
 * The active stage's zone carries the signal WASH on the plan itself
 * (the architectural highlight — no floating rings over the busy
 * geometry; the station markers at the doors warm with the stage).
 *
 *  · The pin is CSS `position: sticky` (the reference's own choice —
 *    GSAP never pins), measured per viewport height; it dies ≤991px
 *    into a stacked readable sequence (no pin on touch/narrow).
 *  · Scroll IS the timeline: --jt-p drives everything from ONE frame
 *    on the shared clock (no React renders per scroll; the driver
 *    sleeps shortly after scrolling stops — useSheetScroll).
 *  · The stage texts use the Arabic-safe WordReveal; the capability
 *    checklist column expands at pin end (the width transition, once).
 *  · Content is the honest capability ledger — every line a real,
 *    live capability (LIVE_CAPABILITIES lineage); no invented claims.
 */
import { useRef } from 'react';
import { Check } from 'lucide-react';
import { Icon } from '../../Icon';
import { LearningPlanDrawing } from '../LearningPlanDrawing';
import { WordReveal } from './WordReveal';
import { useSheetScroll } from '../../../lib/motion/useSheetScroll';

/* ── The four walkthrough stages — reading order (RTL) through the
 * PLAN. The zone + station references mirror LearningPlanDrawing's
 * own layer names (the wash + marker wiring lives in landing.css). */
interface JourneyStage {
  num: string;
  verbAr: string;
  titleAr: string;
  textAr: string;
  meta: string;
}

const STAGES_J: JourneyStage[] = [
  {
    num: '01',
    verbAr: 'شاهد',
    titleAr: 'المحاضرة التفاعلية',
    textAr: 'محاضرة مسجَّلة بنقاط فحص تُثبِّت الفهم، وحضورٌ يُحتسب تلقائيًا عند الإكمال.',
    meta: 'live · lectures',
  },
  {
    num: '02',
    verbAr: 'تحقّق',
    titleAr: 'نقاط الفحص',
    textAr: 'سؤال قصير داخل المحاضرة يُصحَّح فورًا، فيثبُت الفهم قبل الانتقال.',
    meta: 'live · checkpoints',
  },
  {
    num: '03',
    verbAr: 'اختبر',
    titleAr: 'الاختبارات الإلكترونية',
    textAr: 'بنك أسئلة بأربعة أنواع وقوالب جاهزة، وتصحيح تلقائي للأسئلة الموضوعية.',
    meta: 'live · exams',
  },
  {
    num: '04',
    verbAr: 'أتقن',
    titleAr: 'مصفوفة الإتقان',
    textAr: 'درجة إتقان لكل مفهوم تكشف الفجوة وتربطها بالدرس المناسب.',
    meta: 'live · mastery',
  },
];

/* The capability checklist — the expanding column at pin end. Every
 * line is a live capability (the honest ledger); the closing note
 * carries the r191 AI-assistant scope contract verbatim (claims only
 * the local engine — no external services). */
const CHECKLIST = [
  'محاضرات تفاعلية بنقاط فحص وحضور تلقائي',
  'تصحيح فوري يُثبِّت الفهم لحظة بلحظة',
  'اختبارات بأربعة أنواع وتصحيح تلقائي للموضوعي',
  'مصفوفة إتقان تقترح خطوتك التالية',
];

const ASSISTANT_NOTE =
  'والمساعد الأكاديمي — يعمل الآن داخل المنصّة — يقترح شروحات مخصَّصة وخطط مراجعة حسب أدائك الفعلي.';

export function JourneyScene() {
  const trackRef = useRef<HTMLDivElement>(null);
  const sideRef = useRef<HTMLDivElement>(null);

  /* ── The ONE scroll driver: --jt-p, data-stage (the plan's staged
   *     build + the zone wash + the station warming all read it from
   *     CSS — imperative, zero React renders per scroll tick). ──── */
  useSheetScroll(trackRef, ({ pin }) => {
    const track = trackRef.current;
    if (!track) return;
    track.style.setProperty('--jt-p', pin.toFixed(4));
    /* the active stage = the station nearest the pin's centre band */
    const stage = Math.max(0, Math.min(STAGES_J.length - 1, Math.floor(pin * STAGES_J.length + 0.5) - 0));
    if (track.dataset.stage !== String(stage)) {
      track.dataset.stage = String(stage);
    }
    /* the expanding column at the pin's end */
    const side = sideRef.current;
    if (side) {
      const open = pin >= 0.93 ? 'on' : 'off';
      if (side.dataset.open !== open) side.dataset.open = open;
    }
  });

  return (
    <div className="jt" ref={trackRef} data-stage="0">
      <div className="jt-pin">
        <div className="jt-window">
          {/* the learning floor — the plan that BUILDS with the scroll
              (staged geometry via .jt[data-stage]; the active zone
              carries the signal wash) */}
          <LearningPlanDrawing />

          {/* the status strip — the current station, stacked + faded */}
          <div className="jt-status" aria-hidden="true">
            {STAGES_J.map((s) => (
              <span key={s.num} className="jt-status-line">
                <span className="fo-mono" dir="ltr">{s.num} · {s.meta}</span>
              </span>
            ))}
          </div>
        </div>

        {/* the expanding capability column (pin end) */}
        <div className="jt-side" ref={sideRef} data-open="off">
          <span className="jt-side-label fo-mono" dir="ltr">[01–04] · LIVE</span>
          <ul className="jt-checklist">
            {CHECKLIST.map((c) => (
              <li key={c}>
                <Icon icon={Check} size={13} />
                {c}
              </li>
            ))}
          </ul>
          <p className="jt-side-note">{ASSISTANT_NOTE}</p>
        </div>
      </div>

      {/* the number stations — riding the track past the fixed drawing */}
      <div className="jt-stations">
        {STAGES_J.map((s) => (
          <article key={s.num} className="jt-station">
            <span className="jt-station-num fo-mono" dir="ltr">{s.num}</span>
            <h3 className="jt-station-verb">{s.verbAr}</h3>
            <p className="jt-station-title">{s.titleAr}</p>
            <WordReveal className="jt-station-text" text={s.textAr} />
          </article>
        ))}
      </div>
    </div>
  );
}
