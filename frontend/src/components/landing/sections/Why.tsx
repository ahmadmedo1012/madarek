/* P2-0 (r335 split) — [6] لماذا مدارك — the Watch/Check/Test/Master stage
 * strip (the reference's why): the four journey verbs beside
 * the four real student-surface captures, cross-fading on the
 * scroll (the 74%-hold plateau grammar); static + fully
 * readable under reduced motion and ≤991px.
 *
 * The cross-fade scrub lives inside WhyScene — this section is a
 * pure mount: head copy + the scene + the one disclosure line. */
import { RevealCssClass } from '../../../hooks/useReveal';
import { WhyScene } from '../WhyScene';

export function Why() {
  return (
    <section className="wy-section" aria-labelledby="wy-title">
      <div className="wy-head">
        <span className="fo-label"><span className="fo-mono" dir="ltr">[06]</span> لماذا مدارك</span>
        <RevealCssClass as="h2" className="wy-title" delay={1} id="wy-title">
          الرحلة في <em>أربع مراحل</em>
        </RevealCssClass>
        <RevealCssClass as="p" className="wy-lede" delay={2}>
          شاهد، تحقّق، اختبر، أتقن — المراحل الأربع التي تعبرها في كل مقرّر،
          ولكل منها سطح حقيقي داخل المنصّة.
        </RevealCssClass>
      </div>

      <WhyScene />

      {/* R325 Y3 — the strip's ONE disclosure line: the per-frame
          caption demos retired with the overlay chrome (both rode
          the art or duplicated this note); this note carries the
          demo-data confession once, below the whole strip. */}
      <RevealCssClass as="p" className="wy-note" delay={3}>
        اللقطات من بيئة العرض — بيانات «جامعة مدارك التجريبية» اصطناعية بالكامل.
      </RevealCssClass>
    </section>
  );
}
