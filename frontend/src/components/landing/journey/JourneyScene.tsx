/**
 * JourneyScene — R308 «رحلة التعلّم» — the pinned walkthrough.
 *
 * The reference's narrative center of gravity is a pinned scene that
 * owns ~51% of the page: a full-viewport CSS-sticky drawing window
 * where the SAME model persists while overlay layers cross-fade with
 * the scroll, number stations ride past the fixed drawing, and a
 * checklist column expands at the pin's end (§6–§7). This is the
 * Madarek walkthrough in that grammar:
 *
 *  · The base drawing IS «مخطط مدارك» (BlueprintSvg) — the same
 *    artwork from the hero persists through the whole scene; only the
 *    overlay layer changes (stage ring + callouts cross-fade).
 *  · The pin is CSS `position: sticky` (the reference's own choice —
 *    GSAP never pins), measured per viewport height; it dies ≤991px
 *    into a stacked readable sequence (no pin on touch/narrow).
 *  · Scroll IS the timeline: --jt-p drives everything from ONE frame
 *    on the shared clock (no React renders per scroll; the driver
 *    sleeps shortly after scrolling stops — useSheetScroll).
 *  · The stage texts use the Arabic-safe WordReveal; the station in
 *    play carries the signal number (the reference's active-role
 *    grammar); the capability checklist column expands at pin end
 *    (the width transition, once).
 *  · Content is the honest capability ledger — every line a real,
 *    live capability (LIVE_CAPABILITIES lineage); no invented claims.
 */
import { useRef } from 'react';
import { Check } from 'lucide-react';
import { Icon } from '../../Icon';
import { BlueprintSvg } from '../BlueprintSvg';
import { WordReveal } from './WordReveal';
import { useSheetScroll } from '../../../lib/motion/useSheetScroll';
import { clamp } from '../../../lib/motion/sheetConductor';

/* ── The four walkthrough stages — reading order (RTL) through the
 * SAME drawing as the hero. Coordinates are viewBox-space (760×460),
 * mapped by the same letterbox math the whole sheet uses. ────────── */
interface JourneyStage {
  num: string;
  verbAr: string;
  titleAr: string;
  textAr: string;
  meta: string;
  /** the highlight ring (viewBox coords + radius) */
  ring: { x: number; y: number; r: number };
  /** the callout label (viewBox coords) */
  call: { x: number; y: number; code: string; textAr: string };
}

const STAGES_J: JourneyStage[] = [
  {
    num: '01',
    verbAr: 'شاهد',
    titleAr: 'المحاضرة التفاعلية',
    textAr: 'محاضرة مسجَّلة بنقاط فحص تُثبِّت الفهم، وحضورٌ يُحتسب تلقائيًا عند الإكمال.',
    meta: 'live · lectures',
    ring: { x: 662, y: 330, r: 84 },
    call: { x: 662, y: 236, code: 'L01', textAr: 'الحضور يُحتسب عند الإكمال' },
  },
  {
    num: '02',
    verbAr: 'تحقّق',
    titleAr: 'نقاط الفحص',
    textAr: 'سؤال قصير داخل المحاضرة يُصحَّح فورًا، فيثبُت الفهم قبل الانتقال.',
    meta: 'live · checkpoints',
    ring: { x: 520, y: 350, r: 72 },
    call: { x: 520, y: 262, code: 'CP', textAr: 'تصحيح فوري قبل المتابعة' },
  },
  {
    num: '03',
    verbAr: 'اختبر',
    titleAr: 'الاختبارات الإلكترونية',
    textAr: 'بنك أسئلة بأربعة أنواع وقوالب جاهزة، وتصحيح تلقائي للأسئلة الموضوعية.',
    meta: 'live · exams',
    ring: { x: 400, y: 345, r: 76 },
    call: { x: 400, y: 254, code: 'EX', textAr: 'أربعة أنواع أسئلة' },
  },
  {
    num: '04',
    verbAr: 'أتقن',
    titleAr: 'مصفوفة الإتقان',
    textAr: 'درجة إتقان لكل مفهوم تكشف الفجوة وتربطها بالدرس المناسب.',
    meta: 'live · mastery',
    ring: { x: 98, y: 300, r: 84 },
    call: { x: 98, y: 208, code: 'MG', textAr: 'خطوتك التالية مقترحة من أدائك' },
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
  const overlayRefs = useRef<Array<SVGGElement | null>>([]);

  /* ── The ONE scroll driver: --jt-p, data-stage, overlay cross-fades,
   *     the expanding column — all imperative, all from one frame. ── */
  useSheetScroll(trackRef, ({ pin }) => {
    const track = trackRef.current;
    if (!track) return;
    track.style.setProperty('--jt-p', pin.toFixed(4));
    /* the active stage = the station nearest the window's centre
     * (band centres at (i+0.5)/4 — the overlay cross-fade centres). */
    const stage = Math.max(0, Math.min(STAGES_J.length - 1, Math.floor(pin * STAGES_J.length + 0.5) - 0));
    if (track.dataset.stage !== String(stage)) {
      track.dataset.stage = String(stage);
    }
    /* overlay cross-fade: triangle windows around each stage center */
    for (let i = 0; i < STAGES_J.length; i += 1) {
      const el = overlayRefs.current[i];
      if (!el) continue;
      const center = (i + 0.5) / STAGES_J.length;
      const d = Math.abs(pin - center);
      const op = clamp((0.22 - d) / 0.13, 0, 1);
      const next = op.toFixed(3);
      if (el.dataset.op !== next) {
        el.dataset.op = next;
        el.style.opacity = next;
      }
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
          {/* the persistent base drawing — the same artwork as the hero */}
          <BlueprintSvg active={-1} />

          {/* the stage overlays — cross-fading highlight + callouts in
              the drawing's own viewBox space */}
          <svg className="jt-overlay-svg" viewBox="0 0 760 460" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
            {STAGES_J.map((s, i) => (
              <g
                key={s.num}
                ref={(el) => {
                  overlayRefs.current[i] = el;
                }}
                className="jt-ov"
                style={{ opacity: 0 }}
              >
                <circle className="jt-ov-ring" cx={s.ring.x} cy={s.ring.y} r={s.ring.r} pathLength={1} />
                <line
                  className="jt-ov-line"
                  x1={s.call.x}
                  y1={s.call.y + 10}
                  x2={s.call.x}
                  y2={s.ring.y - s.ring.r + 6}
                />
                <circle className="jt-ov-dot" cx={s.call.x} cy={s.call.y + 12} r="3" />
                <text className="jt-ov-code" x={s.call.x} y={s.call.y - 14} textAnchor="middle">
                  [{s.call.code}]
                </text>
                <text className="jt-ov-text" x={s.call.x} y={s.call.y} textAnchor="middle">
                  {s.call.textAr}
                </text>
              </g>
            ))}
          </svg>

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
