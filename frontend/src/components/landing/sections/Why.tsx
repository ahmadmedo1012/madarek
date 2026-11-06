/* T-05 (r338) — [06] لماذا مدارك — REWRITTEN from the frozen Heron
 * home-why-wrap spec (docs/redesign/r335/heron-spec/home-why-wrap.*.json).
 *
 * The reference's why strip: a ruled editorial head (eyebrow + display
 * h2 | vertical rule + lede + muted note), a full-width hairline, then
 * a TALL pinned stage (2.76 viewport-heights @1440) — a centred axis
 * with two svg way-markers, a scrubbed accent progress rule, and four
 * 464px capture rows (the alternating big card + small-capture + icon
 * cluster + the pinned dark caption bar grammar), closing on the
 * dashed route-map row. This file is the pure mount: head copy + the
 * scene; every measured geometry value lives in WhyScene + why.css. */
import { RevealCssClass } from '../../../hooks/useReveal';
import { WhyScene } from '../WhyScene';

export function Why() {
  return (
    <section className="wy-section" aria-labelledby="wy-title">
      {/* the ruled editorial head — eyebrow + display title (left lane)
       * + the side rail (vertical rule + lede + muted note) seated in the
       * head grid's right lane, mirrored RTL — spec: head w962 + side w464
       * share the top band (side lede sr.y = eyebrow sr.y). */}
      <div className="wy-head" data-spec="why.head">
        <div className="wy-eyebrow" data-spec="why.eyebrow">
          <div className="wy-eyebrow-t" data-spec="why.eyebrowt">[06] لماذا مدارك</div>
        </div>
        <RevealCssClass as="div" className="wy-h2w" data-spec="why.h2w" delay={1}>
          <h2 className="wy-title" id="wy-title" data-spec="why.title">الرحلة في أربع مراحل</h2>
        </RevealCssClass>

        {/* the side rail — vertical rule + lede + muted note (mirrored RTL) */}
        <div className="wy-side" data-spec="why.side">
          <div className="wy-rule-v" aria-hidden="true" data-spec="why.rulev" />
          <div className="wy-lede" data-spec="why.lede">
            <div className="wy-lede-t" data-spec="why.ledet">
              شاهد، تحقّق، اختبر، أتقن — المراحل الأربع التي تعبرها في كل مقرّر داخل
              مدارك، ولكل مرحلة سطح حقيقي من أسطح الطالب نعرضه هنا كما هو تمامًا.
            </div>
          </div>
          <div className="wy-note" data-spec="why.note">
            <div className="wy-note-t" data-spec="why.notet">اللقطات من بيئة العرض التجريبية</div>
          </div>
        </div>
      </div>

      <div className="wy-hrule" aria-hidden="true" data-spec="why.hrule" />

      <WhyScene />
    </section>
  );
}
