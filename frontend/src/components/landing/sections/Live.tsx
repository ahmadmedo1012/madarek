/* P2-0 (r335 split) — [3] التحديات — R337 (A-problem): the section
 * is REBUILT against the frozen Heron spec (docs/redesign/r335/
 * heron-spec/home-problem-wrap.{390,768,1024,1440,1920}.json).
 *
 * Heron's problem band is a RULED LEDGER of four columns — the
 * inverse of the old open-column transplant (R322 2-d, retired with
 * this rewrite):
 *
 *   section.pm-section[problem.wrap] > toprule · frame
 *   frame > head[problem.head] > titleblock(kicker · h2) · subwrap > sub
 *   frame > band[problem.band] > bandrule · cols · dots(≤767)
 *   cols > col×4[problem.col.N] > colrule · meta(pad box > keyroll >
 *     keytext · indexroll > indextext · cue) · metarule · bodyzone >
 *     artzone(artcolor > artin > PainArt svg) · textzone(pad box >
 *     tgrid > titlebox > itemtitle · anszone > bodytext) · zonerule
 *
 * STRUCTURE (the spec's own census — 1920): every column carries its
 * own 1px start-edge rule (the FIRST column rides the band's edge
 * instead), the meta row closes with a dashed 1px rule, the art cell
 * is the spec's 36rem square holding the centered 20rem drawing, and
 * the text zone holds the display title + the answer-led body block.
 *
 * Honesty contracts kept (R322 lineage): each pain names a real gap
 * in Libyan higher-ed and keeps its answered-by-a-live-capability
 * line (non-negotiable — the answer rides as the body block's
 * leading sentence, accented); no invented statistics; the full
 * matrix lives on /capabilities.
 *
 * Presentational: the ≤767 snap-carousel belt (keyboard focus, dot
 * mirroring, dot tap) stays in the composer — this component
 * receives the two refs the belt drives. */
import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { PainArt } from '../PainArt';

/* ── The four pains — the honest inverse of the live ledger: each
 * pain names a real gap in Libyan higher-ed today and is answered by
 * a capability that WORKS in the system. The `keyword` is the
 * reference's own meta-row seat (mono Latin, ~6–8ch); `num` is the
 * ghost 2-digit index riding the row's far edge. The body block
 * opens with the honest answer sentence (the r322 pin, accented). */
const PAINS = [
  {
    num: '01',
    keyword: 'LECTURE',
    title: 'محاضرة بلا أثر مقيس',
    answer: 'الجواب: المحاضرات التفاعلية بنقاط الفحص.',
    text: 'تُلقى المحاضرة ثم ينتهي أثرها: لا فحص يثبّت الفهم، ولا حضور يُحتسب.',
  },
  {
    num: '02',
    keyword: 'GRADING',
    title: 'تصحيح يأتي متأخرًا',
    answer: 'الجواب: التصحيح التلقائي للموضوعي.',
    text: 'تمرّ أسابيع قبل أن يعرف الطالب خطأه — وفرصة المراجعة تكون قد فاتت.',
  },
  {
    num: '03',
    keyword: 'MASTERY',
    title: 'غياب خريطة الإتقان',
    answer: 'الجواب: مصفوفة الإتقان لكل مفهوم.',
    text: 'الطالب يعرف درجته النهائية، لا مفاهيمه الناقصة ولا خطوته التالية.',
  },
  {
    num: '04',
    keyword: 'ARCHIVE',
    title: 'بحوث تُسلَّم وتُنسى',
    answer: 'الجواب: مكتبة البحوث بالفهرسة العربية.',
    text: 'البحث يُقدَّم ورقيًا ثم يختفي: لا فهرسة ولا بحث عربي يبقى.',
  },
] as const;

interface LiveProps {
  /* the snap-carousel scroll region (≤767) — the composer's belt reads it */
  colsRef: RefObject<HTMLOListElement>;
  /* the dot rail — the composer's belt mirrors the snap position onto it */
  dotsRef: RefObject<HTMLDivElement>;
}

export function Live({ colsRef, dotsRef }: LiveProps) {
  return (
    <section id="live" className="pm-section" aria-labelledby="pm-title" data-spec="problem.wrap">
      {/* the band's top rule (a real 1px element) */}
      <div className="pm-toprule" aria-hidden="true" data-spec="problem.toprule" />

      <div className="pm-frame" data-spec="problem.frame">
        <div className="pm-inner" data-spec="problem.inner">
        {/* ── the head: kicker + H2 at the start, sub note at the far
            edge (margined off the head row's top). */}
        <div className="pm-head" data-spec="problem.head">
          <div className="pm-titleblock" data-spec="problem.titleblock">
            <div className="pm-kicker" data-spec="problem.kicker">
              <div className="pm-kicker-text fo-mono" dir="ltr" data-spec="problem.kickertext">
                [03] التحديات
              </div>
            </div>
            <div className="pm-titlebox">
              <h2 className="pm-title" id="pm-title" data-spec="problem.h2">
                أربعة أوجاع من التعليم العالي الليبي
              </h2>
            </div>
          </div>
          <div className="pm-subwrap" data-spec="problem.subwrap">
            <div className="pm-sub" data-spec="problem.sub">
              ليست أحكامًا على أحد — بل هي المشكلات التي بُنيت مدارك لحلّها؛ تحت كل وجع بند
              يعمل اليوم، والسجل الكامل في{' '}
              <Link to="/capabilities" className="fo-text-link">صفحة القدرات</Link>.
            </div>
          </div>
        </div>

        {/* ── the columns band: one hairline under the head, then the
            four ruled columns (+ the ≤767 dot rail at its foot). */}
        <div className="pm-band" data-spec="problem.band">
          <div className="pm-bandrule" aria-hidden="true" data-spec="problem.bandrule" />
          <div className="pm-bandinner" data-spec="problem.bandinner">
          <ol className="pm-cols" ref={colsRef} aria-label="الأوجاع الأربعة">
            {PAINS.map((p, i) => (
              <li
                key={p.num}
                className="pm-col"
                data-mdrk-reveal="item"
                data-spec={`problem.col.${i + 1}`}
              >
                {/* the column's own start-edge rule (the first column
                    rides the band's edge — no double line) */}
                <div className={`pm-colrule${i === 0 ? ' pm-colrule-first' : ''}`} aria-hidden="true" data-spec={`problem.colrule.${i + 1}`} />

                {/* the meta row — a padded box holding the keyword roll,
                    the ghost index roll, and the orange cue dot. */}
                <div className="pm-meta" data-spec={`problem.meta.${i + 1}`}>
                  <div className="pm-keyword-roll" data-spec={`problem.keyroll.${i + 1}`}>
                    <div className="pm-keyword fo-mono" dir="ltr" data-spec={`problem.keytext.${i + 1}`}>
                      {p.keyword}
                    </div>
                  </div>
                  <div className="pm-index-roll" data-spec={`problem.indexroll.${i + 1}`}>
                    <div className="pm-index fo-mono" dir="ltr" data-spec={`problem.indextext.${i + 1}`}>
                      {p.num}
                    </div>
                  </div>
                  <div className="pm-metarule" aria-hidden="true" data-spec={`problem.metarule.${i + 1}`} />
                  <div className="pm-cue" aria-hidden="true" data-spec={`problem.cue.${i + 1}`} />
                </div>

                {/* the body zone: the art cell over the text cell. */}
                <div className="pm-bodyzone" data-spec={`problem.bodyzone.${i + 1}`}>
                  <div className="pm-artzone" data-spec={`problem.artzone.${i + 1}`}>
                    <div className="pm-artcolor" data-spec={`problem.artcolor.${i + 1}`}>
                      <div className="pm-artin" data-spec={`problem.artin.${i + 1}`}>
                        <PainArt kind={p.num} />
                      </div>
                    </div>
                  </div>
                  <div className="pm-textzone" data-spec={`problem.textzone.${i + 1}`}>
                    <div className="pm-tgrid" data-spec={`problem.tgrid.${i + 1}`}>
                      <div className="pm-item-titlebox" data-spec={`problem.titleboxcol.${i + 1}`}>
                        <div className="pm-item-title" data-spec={`problem.itemtitle.${i + 1}`}>
                          {p.title}
                        </div>
                      </div>
                      <div className="pm-anszone" data-spec={`problem.anszone.${i + 1}`}>
                        <div className="pm-answrap" data-spec={`problem.answrap.${i + 1}`}>
                          <p className="pm-item-sub" data-spec={`problem.bodytext.${i + 1}`}>
                            <strong className="pm-ans">{p.answer}</strong> {p.text}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="pm-zonerule" aria-hidden="true" data-spec={`problem.zonerule.${i + 1}`} />
                  </div>
                </div>
              </li>
            ))}
          </ol>
          </div>

          {/* ≤767 only — the reference's swiper dot rail at the band's
              foot (2.02×0.2rem bars, 1st active): one button per
              column, the active bar follows the snap position, a tap
              centers its column. */}
          <div className="pm-dots" ref={dotsRef} aria-hidden="true">
            {PAINS.map((p) => (
              <button key={p.num} type="button" className="pm-dot-btn" data-pm-num={p.num} tabIndex={-1}>
                <span className="pm-dot-bar" />
              </button>
            ))}
          </div>
        </div>
        </div>
      </div>
    </section>
  );
}
