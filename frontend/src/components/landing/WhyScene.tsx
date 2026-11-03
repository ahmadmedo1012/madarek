/**
 * WhyScene — R313 (WP-A1 · D7 section 6 «لماذا») — the pinned
 * Watch/Check/Test/Master stage strip.
 *
 * Heron's home-why answers "why this product" with the four journey
 * verbs over its product captures. The Madarek translation: the same
 * four verbs the journey walkthrough uses (شاهد / تحقّق / اختبر / أتقن),
 * each paired with one of the REAL student-surface captures — each
 * frame's honest caption rides BELOW the art (R325 Y3: the mock-UI
 * overlay collage and the per-frame demo disclosure are scoped OFF
 * this strip — the caption + the section's one .wy-note confession
 * carry the truth; nothing is pasted over the capture), so the
 * cross-fade never blurs what is shown. The capture hint seats at
 * 48rem so the browser picks the sharp 1280w asset (the r324 X4
 * re-encode: the 720w tier went q78 → q92 — text-heavy UI needs the
 * headroom).
 *
 *  · the section is ONE content-sized band (R325 Y3 — no forced
 *    min-height floor, V4: no forced voids): the stage rail
 *    (always-readable verb cards) beside a capture stack; the scroll
 *    traversal (--wy-p) drives data-wy-stage =
 *    floor(traversal × 4) — the same flip formula the journey uses;
 *  · the active stage's verb card warms + its tag snaps with the
 *    reference's hold-plateau shape (0%→74% held, then resolves —
 *    the vs-tag-snap grammar, re-keyed wy-snap here);
 *  · the captures cross-fade (opacity, var(--t-slower)) — never
 *    layout, never height;
 *  · reduced motion AND ≤991px: the stack collapses to a static
 *    grid of all four captures — everything readable statically
 *    (the RM/mobile belt), the rail stays plain text.
 */
import { useRef } from 'react';
import { useSheetScroll } from '../../lib/motion/useSheetScroll';
import { ProductFrame } from './ProductFrame';
import {
  CAPTURE_LECTURE_CHECKPOINT_2X,
  PRODUCT_CAPTURES,
  type ProductCapture,
} from '../../data/university-media';
/* P-A2 R333 (INV-08 · heron-craft row 13) — the 2× capture: the SAME
 * lecture-player surface re-captured @2880×1740 (1440×870 @1×) from
 * the seeded stack; Vite-asset loaded (fingerprinted dist asset). */
import lectureShot2x from '../../assets/product/lecture-checkpoint.webp';

export interface WhyStage {
  num: string;
  verbAr: string;
  titleAr: string;
  textAr: string;
  captureId: string;
  /** P-A2 R333 (INV-08) — the proper-scale seat: when set, the stage's
   * frame rides the 2× re-capture (Vite asset) instead of the 1280×800
   * public ladder. The capture carries the honest Arabic copy; the
   * story stays the same surface, now at the heron platform frame's
   * own 1440×870 @1× resolution. */
  twoX?: { src: string; capture: ProductCapture };
}

/* The four verbs — the SAME journey stages the pinned walkthrough plays
 * (JourneyScene's STAGES_J), answered by the student surface where each
 * lives. Honest pairing: the capture's own caption names the surface;
 * stage 03 (اختبر) covers the assessment instruments together (the
 * auto-graded exams + the research library) — both live capabilities,
 * one honest sentence. R322 V1 kill: the English jargon metas
 * ('live · lectures' … 'live · mastery') are deleted — the Arabic
 * textAr line and the capture caption carry the facts. */
export const WHY_STAGES: WhyStage[] = [
  {
    num: '01',
    verbAr: 'شاهد',
    titleAr: 'المحاضرة التفاعلية',
    textAr: 'محاضرة مسجَّلة بنقاط فحص تُصحَّح فورًا، وحضور يُحتسب تلقائيًا.',
    captureId: 'student-lecture-player',
    /* P-A2 (INV-08) — the supervisor defect's «اللقطة الصغيرة»: the
     * lecture frame is the strip's proper-scale seat now — the same
     * seeded surface (player + checkpoint card) at 2×, edge-to-edge
     * in its cell on the 1px rule frame with the [01] chip. */
    twoX: { src: lectureShot2x, capture: CAPTURE_LECTURE_CHECKPOINT_2X },
  },
  {
    num: '02',
    verbAr: 'تحقّق',
    titleAr: 'لوحة الطالب',
    textAr: 'تابع يومك ومهامّك وتقدّمك — نظرة واحدة تخبرك أين أنت الآن.',
    captureId: 'student-dashboard',
  },
  {
    num: '03',
    verbAr: 'اختبر',
    titleAr: 'الاختبارات والبحوث',
    textAr: 'اختبارات بأربعة أنواع، وتصحيح تلقائي للموضوعي، وبحوث تُفهرَس في مكتبة تُبحث بالعربية.',
    captureId: 'student-library',
  },
  {
    num: '04',
    verbAr: 'أتقن',
    titleAr: 'مصفوفة الإتقان',
    textAr: 'درجة إتقان لكل مفهوم تكشف الفجوة وتربطها بالدرس المناسب.',
    captureId: 'student-matrix',
  },
];

export function WhyScene() {
  const trackRef = useRef<HTMLDivElement>(null);

  /* the ONE scroll driver: traversal → data-wy-stage + --wy-p
   * (imperative, zero renders per tick — the useSheetScroll contract).
   * R318 (C2): the var write is idempotent (same-string setProperty
   * still invalidates style every frame — 4-var flush cost measured
   * 72ms @1440 in the CDP profile). */
  let lastWyP = '';
  useSheetScroll(trackRef, ({ traversal }) => {
    const track = trackRef.current;
    if (!track) return;
    const stage = Math.max(0, Math.min(WHY_STAGES.length - 1, Math.floor(traversal * WHY_STAGES.length)));
    if (track.dataset.wyStage !== String(stage)) {
      track.dataset.wyStage = String(stage);
    }
    const p = traversal.toFixed(4);
    if (p !== lastWyP) {
      track.style.setProperty('--wy-p', p);
      lastWyP = p;
    }
  });

  return (
    <div className="wy" ref={trackRef} data-wy-stage="0">
      {/* the stage rail — every verb card is ALWAYS readable (the muted
          non-active states stay visible; nothing hides behind the
          scroll). */}
      <ol className="wy-rail" aria-label="مراحل الرحلة الأربع">
        {WHY_STAGES.map((s) => (
          <li key={s.num} className="wy-stage">
            <span className="wy-stage-num fo-mono" dir="ltr">{s.num}</span>
            <span className="wy-stage-verb">{s.verbAr}</span>
            <span className="wy-stage-title">{s.titleAr}</span>
            <span className="wy-stage-text">{s.textAr}</span>
          </li>
        ))}
      </ol>

      {/* the capture stack — one frame per stage, cross-fading. P-A2
          (INV-08): every frame carries the mono [nn] index chip (the
          stage echo, aria-hidden chrome) and presents edge-to-edge in
          its cell on the 1px rule frame (why.css re-seat). */}
      <div className="wy-stack">
        {WHY_STAGES.map((s, i) => {
          const capture = s.twoX
            ? s.twoX.capture
            : PRODUCT_CAPTURES.find((c) => c.id === s.captureId);
          if (!capture) return null;
          return (
            <div key={s.num} className="wy-capture" data-i={i}>
              <ProductFrame
                capture={{ ...capture, sizes: '(min-width: 992px) 48rem, 100vw' }}
                twoXSrc={s.twoX?.src}
                idxChip={`[${s.num}]`}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
