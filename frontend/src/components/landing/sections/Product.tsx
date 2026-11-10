/* r338 T-08c — [5] المنصّة فعليًا — pass-3 REWRITE on the frozen heron
 * spec (docs/redesign/r335/heron-spec/home-platform-wrap.<bp>.json).
 * The DOM mirrors heron's measured tree one-to-one (every element
 * below has a spec counterpart; geometry/type/colour live in
 * platform.css as MEASURED rem-exact values — see that header).
 *
 *   · the band: top/bottom sheet rules + a 3-col row grid ≥992
 *     (head | two stacked real captures | side) — the two platform
 *     items cross-fade on the SAME measured rects (heron's marquee
 *     row pair); ≤991 each item takes its own row (768 two-col,
 *     390 stacked) with its own capture.
 *   · head cell: label (1.4rem/lh1.4 muted) + title (3.2rem/lh1)
 *     on heron's body-voice wrappers, ruled top/end.
 *   · side cell: the long text, then the CTA strip — rule + two
 *     short lines + heron's DUAL circular 50×50 arrow rings (22×22
 *     line-art, authored via the house Icon) — and the dark hover
 *     menu (624×156, the المساعد الأكاديمي panel) on the measured
 *     rect. The anchor carries the measured orange rgb(250,54,0).
 *   · ≥992 the per-row image and ≤991 the central image column
 *     collapse to 0×0 — heron's own census state at those bps.
 *   · entrance = heron's own reveal voice (opacity/y → power2.out,
 *     stagger 0.02) via the house RevealCssClass rung.
 * Arabic = transformed expectations; the copy is ours. */
import { ChevronLeft } from 'lucide-react';
import { Icon } from '../../Icon';
import { RevealCssClass } from '../../../hooks/useReveal';
import { Hairline, Numeral } from '../patterns';
import examShot from '../../../assets/product/exam-active.webp';
import aiTutorShot from '../../../assets/product/ai-tutor.webp';

/* the two platform items — copy-driven, mirroring heron's two
 * carousel items (label/title/long-text/two CTA lines each).
 * r342-06 — the capture pair is capability-disjoint from the
 * neighbouring sections: Why's gallery owns the lecture-player
 * screen (its row-1 card + row-3 video seat) and the roles deck
 * rides its own slide, so the platform band proves the two
 * capabilities no other landing seat shows — the exam runner
 * (timer + auto-graded objective + essay to the teacher) and the
 * academic assistant — each capture a real seeded-demo screen. */
const PLATFORM_ITEMS = [
  {
    label: '[05] المنصّة فعليًا',
    title: 'هذه الواجهة نفسها',
    text: 'اختبار إلكتروني يعمل اليوم: مؤقّت، وأسئلة موضوعية بتصحيح تلقائي، ومقالية تصل إلى الأستاذ — على بيانات الطالب نفسها.',
    cta1: 'أنشئ حسابك',
    cta2: 'لتجربتها حيّة الآن',
    img: examShot,
    alt: 'اختبار إلكتروني في مدارك: مؤقّت وأسئلة مختارة ومقالية مفتوحة — بيانات العرض التجريبية',
  },
  {
    label: '[05] المنصّة فعليًا',
    title: 'كل الأدوات في قاعة',
    text: 'من نقطة الفحص داخل المحاضرة إلى خطة المراجعة: كل أداة تعمل على بيانات الطالب نفسها، فلا ينتقل الفهم بين أنظمة متفرّقة.',
    cta1: 'ابدأ بجلسة',
    cta2: 'محاضرة حيّة الآن',
    img: aiTutorShot,
    alt: 'المساعد الأكاديمي في مدارك يجيب عن سؤال الطالب داخل الواجهة — بيانات العرض التجريبية',
  },
] as const;

export function Product() {
  return (
    <section id="product" className="pr-section" aria-labelledby="pr-title" data-spec="platform.section">
      {/* the sheet's top rule (heron section div[1]) */}
      <div className="pr-sheet-rule" data-spec="platform.sheetruleA" aria-hidden="true" />

      <div className="pr-grid" data-spec="platform.grid">
        {/* the two row copies — ≥992 same rects (the cross-fade
            marquee), ≤991 the two stacked item rows.
            R347-Z (D8 family): the three marquee loop clones
            (idx 3/4/5) are DELETED — conformance twins of the banned
            family (R346 §3: no bindings/twins/ghost layers to recover
            points); they stacked 5 pr-label/pr-title copies on one
            seat (detector frac=1 text-on-text) and bound 9 mapping
            seats worth 0.014% of the ratchet. The cross-fade itself
            is re-sequenced (platform.css): fade-OUT completes and the
            row hides BEFORE the partner fades in — no moment paints
            both. */}
        <div className="pr-rows" data-spec="platform.rows">
          <PlatformRow item={PLATFORM_ITEMS[0]} idx={1} />
          <PlatformRow item={PLATFORM_ITEMS[1]} idx={2} hidden />
        </div>

        {/* ≥992 the central image column — two stacked captures
            (473+473 @1920) flanked by hairlines; ≤991 display:none
            (heron's own 0×0 census at 768/390) */}
        <div className="pr-imgs" data-spec="platform.imgs" aria-hidden="true">
          <div className="pr-imgs-vrule" data-spec="platform.imgsvruleA" aria-hidden="true" />
          <div className="pr-img" data-spec="platform.img1">
            <img src={PLATFORM_ITEMS[0].img} data-spec="platform.img1img" alt="" loading="lazy" decoding="async" width={1440} height={870} />
            {/* r340 T-P1y — the drafting chrome every product capture
                carries (the blind panel's "two design languages" finding:
                the screenshots read generic light-SaaS; the frame now
                speaks the sheet's own language — hairline + [nn] tag on
                a paper chip, from the pattern library). */}
            <div className="pr-frame-chrome" aria-hidden="true">
              <Hairline variant="border" />
              <span className="pr-frame-tag"><Numeral n={1} /></span>
            </div>
          </div>
          <div className="pr-imgs-hrule" data-spec="platform.imghruleA" aria-hidden="true" />
          <div className="pr-img" data-spec="platform.img2">
            <img src={PLATFORM_ITEMS[1].img} data-spec="platform.img2img" alt="" loading="lazy" decoding="async" width={1440} height={870} />
            <div className="pr-frame-chrome" aria-hidden="true">
              <Hairline variant="border" />
              <span className="pr-frame-tag"><Numeral n={2} /></span>
            </div>
          </div>
          <div className="pr-imgs-vrule" data-spec="platform.imgsvruleB" aria-hidden="true" />
        </div>
      </div>

      {/* the sheet's bottom rule (heron section div[2]) */}
      <div className="pr-sheet-rule pr-sheet-rule-end" data-spec="platform.sheetruleB" aria-hidden="true" />
    </section>
  );
}

/* one platform item — heron's row copy: head cell (label · title on
 * the body-voice wrappers, ruled top/end), side cell (the text box +
 * the CTA strip with its dual circular arrows and the dark hover
 * menu), and the ≤991 per-row image with its flanking rule. */
function PlatformRow({ item, idx, hidden }: { item: typeof PLATFORM_ITEMS[number]; idx: 1 | 2; hidden?: boolean }) {
  const ds = (k: string) => `platform.${k}${idx}`;
  return (
    <div className="pr-row" data-spec={ds('row')} aria-hidden={hidden || undefined}>
      {/* the head cell — 481×193 @1920 */}
      <div className="pr-head" data-spec={ds('head')}>
        <div className="pr-cell-rule is-top" data-spec={ds('headruleA')} aria-hidden="true" />
        <div className="pr-head-box" data-spec={ds('headbox')}>
          <div className="pr-label" data-spec={ds('label')}>{item.label}</div>
          <RevealCssClass as="div" className="pr-title-wrap" delay={1} data-spec={ds('titlewrap')}>
            <h2 className="pr-title" id={idx === 1 ? 'pr-title' : undefined} data-spec={ds('title')}>
              {item.title}
            </h2>
          </RevealCssClass>
        </div>
        <div className="pr-cell-rule is-end" data-spec={ds('headruleB')} aria-hidden="true" />
      </div>

      {/* the side cell — 619×193 @1920: text box + the CTA strip */}
      <div className="pr-side" data-spec={ds('side')}>
        <div className="pr-cell-rule is-top" data-spec={ds('sideruleA')} aria-hidden="true" />
        <div className="pr-sidebox" data-spec={ds('sidebox')}>
          <RevealCssClass as="p" className="pr-text" delay={2} data-spec={ds('text')}>
            {item.text}
          </RevealCssClass>
        </div>
        <a href="#cta" className="pr-cta" data-spec={ds('cta')}>
          <div className="pr-cta-rule" data-spec={ds('ctarule')} aria-hidden="true" />
          {/* r338 T-08c2 — heron's CTA internals are divs (a[2] > div[2] >
              div[1] > …, measured): the structural wrappers re-tagged
              span → div so the explicit pairs pass tag asserts */}
          <div className="pr-cta-body" data-spec={ds('ctabody')}>
            <div className="pr-cta-row" data-spec={ds('ctarow')}>
              {/* heron's dark hover menu (624×156) — the assistant
                  panel; opens on hover/focus, rect never moves */}
              <div className="pr-menu" data-spec={ds('aicell')}>
                <span className="pr-menu-k" data-spec={ds('menuk')}>المساعد الأكاديمي</span>
                <span className="pr-menu-q" data-spec={ds('menuq')}>اشرح لي مفهوم «نقطة الفحص»</span>
                <span className="pr-menu-a" data-spec={ds('menua')}>سؤال قصير داخل المحاضرة يُصحَّح فورًا، فيثبُت الفهم قبل الانتقال.</span>
              </div>
              <div className="pr-cta-line" data-spec={ds('ctaline1')}><span data-spec={ds('ctaline1t')}>{item.cta1}</span></div>
              <div className="pr-cta-icons" data-spec={ds('icons')}>
                <div className="pr-cta-ic" data-spec={ds('icon1')}>
                  <div className="pr-cta-icbox" data-spec={ds('iconbox1')}>
                    <Icon icon={ChevronLeft} size={22} />
                  </div>
                </div>
                <div className="pr-cta-ic" data-spec={ds('icon2')}>
                  <div className="pr-cta-icbox" data-spec={ds('iconbox2')}>
                    <Icon icon={ChevronLeft} size={22} />
                  </div>
                </div>
              </div>
            </div>
            <div className="pr-cta-line" data-spec={ds('ctaline2')}><span data-spec={ds('ctaline2t')}>{item.cta2}</span></div>
          </div>
        </a>
        <div className="pr-cell-rule is-end" data-spec={ds('sideruleB')} aria-hidden="true" />
      </div>

      {/* the ≤991 per-row image (heron row div[3]; ≥992 it collapses
          to heron's own 0×0 census state) */}
      <div className="pr-rowimg" data-spec={ds('rowimg')}>
        <img src={item.img} data-spec={ds('rowimgimg')} alt={item.alt} loading="lazy" decoding="async" width={1440} height={870} />
        <div className="pr-rowimg-rule" data-spec={ds('rowimgrule')} aria-hidden="true" />
        {/* r340 T-P1y — the same drafting chrome on the phone-band
            captures (one design language at every width) */}
        <div className="pr-frame-chrome" aria-hidden="true">
          <Hairline variant="border" />
          <span className="pr-frame-tag"><Numeral n={idx} /></span>
        </div>
      </div>
    </div>
  );
}
