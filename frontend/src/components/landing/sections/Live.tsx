/* P2-0 (r335 split) — [3] التحديات — the four pains (the reference's
 * home-problem): R322 (2-d) — the OPEN COLUMN transplant on
 * the section's shared grid (V8 closed). A head row (kicker +
 * H2 at the reading-start content line, sub note at the far
 * column's edge, bottoms aligned like the reference) over
 * four unboxed columns — mono keyword + ghost 2-digit index
 * meta row, dashed rule, the 20×20rem drawing in its 36rem
 * zone, title + body + the live-capability answer. Every edge
 * rides the same 4-up hairline grammar the head aligns to;
 * @768 it wraps 2×2, @390 it becomes the snap carousel with
 * the reference's dot rail. Each pain keeps its honest
 * answered-by-a-live-capability line (non-negotiable).
 *
 * Presentational: the ≤767 snap-carousel belt (keyboard focus,
 * dot mirroring, dot tap) stays in the composer — this component
 * receives the two refs the belt drives. */
import type { RefObject } from 'react';
import { Link } from 'react-router-dom';
import { PainArt } from '../PainArt';
import { RevealCssClass } from '../../../hooks/useReveal';

/* ── The four pains (R313 · D7 §3 → R322 · 2-d on Heron's open
 * columns) — the honest inverse of the live ledger: each pain names a
 * real gap in Libyan higher-ed today and is answered by a capability
 * that WORKS in the system (the full matrix lives on /capabilities).
 * No invented statistics — only the pains the product itself was built
 * to solve, framed from the ledger's truth. The `keyword` is the
 * reference's own meta-row seat (mono Latin, ~6–8ch); `num` is the
 * ghost 2-digit index riding the row's far edge. */
const PAINS = [
  {
    num: '01',
    keyword: 'LECTURE',
    title: 'محاضرة بلا أثر مقيس',
    text: 'تُلقى المحاضرة ثم ينتهي أثرها: لا نقطة فحص تُثبِّت الفهم، ولا حضور يُحتسب تلقائيًا.',
    answer: 'الجواب: المحاضرات التفاعلية بنقاط الفحص',
  },
  {
    num: '02',
    keyword: 'GRADING',
    title: 'تصحيح يأتي متأخرًا',
    text: 'تمرّ أسابيع قبل أن يعرف الطالب خطأه — وفرصة المراجعة تكون قد فاتت.',
    answer: 'الجواب: التصحيح التلقائي للموضوعي',
  },
  {
    num: '03',
    keyword: 'MASTERY',
    title: 'غياب خريطة الإتقان',
    text: 'الطالب يعرف درجته النهائية، لا مفاهيمه الناقصة ولا خطوته التالية.',
    answer: 'الجواب: مصفوفة الإتقان لكل مفهوم',
  },
  {
    num: '04',
    keyword: 'ARCHIVE',
    title: 'بحوث تُسلَّم وتُنسى',
    text: 'البحث يُقدَّم ورقيًا ثم يختفي: لا فهرسة ولا بحث عربي ولا مراجعة معلَّمة تبقى.',
    answer: 'الجواب: مكتبة البحوث بالفهرسة العربية',
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
    <section id="live" className="pm-section" aria-labelledby="pm-title">
      <div className="pm-frame">
        <header className="pm-head">
          <div className="pm-title-wrap">
            <span className="fo-label"><span className="fo-mono" dir="ltr">[03]</span> التحديات</span>
            <RevealCssClass as="h2" className="pm-title" delay={1} id="pm-title">
              أربعة أوجاع من <em>التعليم العالي الليبي</em>
            </RevealCssClass>
          </div>
          <RevealCssClass as="p" className="pm-sub" delay={2}>
            ليست أحكامًا على أحد — بل هي المشكلات التي بُنيت مدارك لحلّها؛
            تحت كل وجع بند يعمل اليوم، والسجل الكامل في
            <Link to="/capabilities" className="fo-text-link">صفحة القدرات</Link>.
          </RevealCssClass>
        </header>

        <ol className="pm-cols" ref={colsRef} aria-label="الأوجاع الأربعة">
          {PAINS.map((p) => (
            <li
              key={p.num}
              className="pm-col"
              data-mdrk-reveal="item"
            >
              <div className="pm-meta">
                <span className="pm-keyword fo-mono" dir="ltr">{p.keyword}</span>
                <span className="pm-index fo-mono" dir="ltr">{p.num}</span>
                <span className="pm-dot" aria-hidden="true" />
              </div>
              <div className="pm-artzone">
                <PainArt kind={p.num} />
              </div>
              <div className="pm-content">
                <h3 className="pm-item-title">{p.title}</h3>
                <p className="pm-item-sub">{p.text}</p>
                <p className="pm-item-answer">{p.answer}</p>
              </div>
            </li>
          ))}
        </ol>

        {/* ≤767 only — the reference's swiper dot rail (2.02×0.2rem
            dots, 1st active): one button per column, the active dot
            follows the snap position, a tap centers its column. */}
        <div className="pm-dots" ref={dotsRef} aria-hidden="true">
          {PAINS.map((p) => (
            <button key={p.num} type="button" className="pm-dot-btn" data-pm-num={p.num} tabIndex={-1}>
              <span className="pm-dot-bar" />
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
