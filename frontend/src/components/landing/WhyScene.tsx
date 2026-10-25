/**
 * WhyScene — R313 (WP-A1 · D7 section 6 «لماذا») — the pinned
 * Watch/Check/Test/Master stage strip.
 *
 * Heron's home-why answers "why this product" with the four journey
 * verbs over its product captures. The Madarek translation: the same
 * four verbs the journey walkthrough uses (شاهد / تحقّق / اختبر / أتقن),
 * each paired with one of the REAL student-surface captures — the
 * ProductFrame contract rides every frame (mono «real-ui» tag + the
 * demo-data disclosure), so the cross-fade never blurs what is shown.
 *
 *  · the section is ONE compact band (~77vh, the reference's 5.6%):
 *    the stage rail (always-readable verb cards) beside a capture
 *    stack; the scroll traversal (--wy-p) drives data-wy-stage =
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
import { PRODUCT_CAPTURES } from '../../data/university-media';

export interface WhyStage {
  num: string;
  verbAr: string;
  titleAr: string;
  textAr: string;
  meta: string;
  captureId: string;
}

/* The four verbs — the SAME journey stages the pinned walkthrough plays
 * (JourneyScene's STAGES_J), answered by the student surface where each
 * lives. Honest pairing: the capture's own caption names the surface;
 * stage 03 (اختبر) covers the assessment instruments together (the
 * auto-graded exams + the research library) — both live capabilities,
 * one honest sentence. */
export const WHY_STAGES: WhyStage[] = [
  {
    num: '01',
    verbAr: 'شاهد',
    titleAr: 'المحاضرة التفاعلية',
    textAr: 'محاضرة مسجَّلة بنقاط فحص تُصحَّح فورًا، وحضور يُحتسب تلقائيًا.',
    meta: 'live · lectures',
    captureId: 'student-lecture-player',
  },
  {
    num: '02',
    verbAr: 'تحقّق',
    titleAr: 'لوحة الطالب',
    textAr: 'تابع يومك ومهامّك وتقدّمك — نظرة واحدة تخبرك أين أنت الآن.',
    meta: 'live · dashboard',
    captureId: 'student-dashboard',
  },
  {
    num: '03',
    verbAr: 'اختبر',
    titleAr: 'الاختبارات والبحوث',
    textAr: 'اختبارات بأربعة أنواع، وتصحيح تلقائي للموضوعي، وبحوث تُفهرَس في مكتبة تُبحث بالعربية.',
    meta: 'live · exams + research',
    captureId: 'student-library',
  },
  {
    num: '04',
    verbAr: 'أتقن',
    titleAr: 'مصفوفة الإتقان',
    textAr: 'درجة إتقان لكل مفهوم تكشف الفجوة وتربطها بالدرس المناسب.',
    meta: 'live · mastery',
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
            <span className="wy-stage-meta fo-mono" dir="ltr">{s.meta}</span>
          </li>
        ))}
      </ol>

      {/* the capture stack — one frame per stage, cross-fading */}
      <div className="wy-stack">
        {WHY_STAGES.map((s, i) => {
          const capture = PRODUCT_CAPTURES.find((c) => c.id === s.captureId);
          if (!capture) return null;
          return (
            <div key={s.num} className="wy-capture" data-i={i}>
              <ProductFrame
                capture={{ ...capture, sizes: '(min-width: 992px) 42rem, 100vw' }}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
