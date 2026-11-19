/* r368 T3 — [5] المنصّة فعليًا — the IMAGE-LED un-mirrored rewrite on
 * the frozen heron spec (docs/redesign/r335/heron-spec/
 * home-platform-wrap.<bp>.json) + the reference's fidelity crops
 * (docs/audit/evidence/primary/reference/home-platform-wrap.*.png).
 * The r338 pass-3 mirrored the band's halves for RTL and opened on
 * text; the r368 fidelity E law scores SSIM over ALIGNED regions, so
 * the mirrored seat structurally placed its image column against the
 * reference's text half (E 49.2). The measured remedy (this pass):
 *
 *   · UN-MIRROR — the grid flips to the reference's own VISUAL order
 *     (frozen @1440: head x7-368 the LEFT quarter · imgs x367-968 the
 *     left-of-center 42% · side x969-1433 the RIGHT third; heron's own
 *     768 fold: img x7 LEFT, text x384 RIGHT). Declaration
 *     'side | imgs | head' — RTL renders col1 at the RIGHT (the Arabic
 *     reading START) and col3 at the LEFT — the same flip statement.css
 *     landed for the intro seat ('stmt media'); the Arabic text itself
 *     stays RTL inside every cell. The three measured widths are the
 *     same trio, re-ordered (619 | 802 | 481 @1920).
 *   · IMAGE-LED — the dominant anchor at the top capture is the r368
 *     floor-plan drawing (manifest id r368/platform-floorplan, 1344×768
 *     light+dark webp twins, object-fit cover at the frozen spec's
 *     largest img rect: 599×354 @1440 = the imgs column's top row);
 *     the second capture is a real data-table screenshot
 *     (student-matrix-1280 — the mastery matrix) — 3 real content
 *     visuals with generous quiet margins (the sheet's own hairlines).
 *   · THE DARK SPEC PANEL — the frozen spec's ONE dark ground
 *     (rgb(40,40,40) div @1440: x969 y8723 w480 h120 = x67.3% y9.2%
 *     w33.6% h16.9% of the band) becomes the visible spec panel: the
 *     student-dashboard capture strip + the assistant's three spec
 *     lines (the r338 hover menu's own copy, keys intact). The panel
 *     spans the side cell's width (heron's own menu hangs 16px past
 *     the sheet edge — a hover artifact; the static panel clips to the
 *     column) and sits in the flow under the side text (~20px under
 *     its measured y — the static stack clears the text's tail; the
 *     reference's own menu OVERLAYS that zone on hover). ≤991 the
 *     panel is display:none — heron's own census carries no menu node
 *     at 768/390.
 *   · TYPE CONTRAST — the reference's utility label is fs 11.67 @1440
 *     (the --fs-mono-md rung): the label rides the mono family under
 *     the ONE display line (3.2rem — the frozen spec's biggest text,
 *     26.67 @1440). The saturated budget stays ONE accent: the
 *     measured CTA orange rgb(250,54,0) on the CTA's lead line + the
 *     panel's question line (the reference's own orange LEARN-MORE /
 *     tooltip lines); the rest stays ink + the measured hairlines.
 *
 * The r338 grammar survives whole: the marquee pair cross-fade
 * (pr-item-fade + its RM belt), the title scrub flourish, every
 * platform.* data-spec key on its element, the href="#cta" funnel
 * anchor, and the drafting frame chrome on every capture. Arabic =
 * transformed expectations; the copy is ours (the exam/ai-tutor
 * captures retire from this seat with the image-led rework — the
 * capabilities live on in the row copy + the panel's spec lines; the
 * why seat keeps its own gallery). */
import { ChevronLeft } from 'lucide-react';
import { Icon } from '../../Icon';
import { RevealCssClass } from '../../../hooks/useReveal';
import { Hairline, Numeral } from '../patterns';

/* the r368 media set — the platform band's three real content visuals
 * (frontend/public/media/manifest.json documents each: original
 * Madarek artwork + the seeded-demo captures, no personal data). */
/* R368 T3 — the ORIGINAL card compositions for the two capture seats
 * (platform-media-*), authored by scripts/art/r368-original-media.py from
 * geometric primitives in our palette: a plan card (orange header, ruled
 * rooms) and a dashboard card (header dots, ruled table, meter column).
 * No reference image, crop or pixel participates; provenance
 * docs/audit/evidence/media-provenance-r368.json. The frozen 598×351 /
 * 372×226 img boxes are unchanged, so the seat geometry does not move. */
const PLATFORM_ART = [
  {
    /* the top capture seat — reference img sr 362,1 599×354 @1440 and
     * 0,0 374×226 @390 */
    wide: '/media/illustrations/r368/platform/platform-media-1440-a.png',
    wideW: 598,
    wideH: 351,
    narrow: '/media/illustrations/r368/platform/platform-media-390-a.png',
    narrowW: 372,
    narrowH: 226,
  },
  {
    /* the lower capture seat — reference img sr 362,356 599×354 @1440
     * and 0,474 374×226 @390 */
    wide: '/media/illustrations/r368/platform/platform-media-1440-b.png',
    wideW: 598,
    wideH: 351,
    narrow: '/media/illustrations/r368/platform/platform-media-390-b.png',
    narrowW: 372,
    narrowH: 225,
  },
] as const;

const PANEL_SHOT = {
  /* the dark spec panel's capture — the student dashboard (1280×800) */
  light: '/media/product/student-dashboard-1280.webp',
  width: 1280,
  height: 800,
} as const;

/* the two platform items — copy-driven, mirroring heron's two
 * carousel items (label/title/long-text/two CTA lines each).
 * r368: item 1 rides the floor-plan twins (the dominant anchor — the
 * reference's own top visual), item 2 the matrix capture (the
 * reference's data-table seat); the assistant dialog stays the dark
 * spec panel's spec lines. */
const PLATFORM_ITEMS = [
  {
    label: '[05] المنصّة فعليًا',
    title: 'هذه الواجهة نفسها',
    text: 'اختبار إلكتروني يعمل اليوم: مؤقّت، وتصحيح تلقائي للموضوعي، ومقالية للأستاذ — على بيانات الطالب نفسها.',
    cta1: 'أنشئ حسابك',
    cta2: 'لتجربتها حيّة الآن',
    img: PLATFORM_ART[0],
    alt: 'مخطط طابق ولوحة مساعدة على ورق دافئ بلمسة برتقالية',
  },
  {
    label: '[05] المنصّة فعليًا',
    title: 'كل الأدوات في قاعة',
    text: 'من نقطة الفحص إلى خطة المراجعة: كل أداة على بيانات الطالب نفسها — لا أنظمة متفرّقة.',
    cta1: 'ابدأ بجلسة',
    cta2: 'محاضرة حيّة الآن',
    img: PLATFORM_ART[1],
    alt: 'صفوف بيانات ولوحة أدوات على ورق دافئ بلمسة برتقالية',
  },
] as const;

type PlatformItem = (typeof PLATFORM_ITEMS)[number];
type PlatformMediaArt = PlatformItem['img'];

/* one media seat — the R368 breakpoint twins (the hero/roles idiom): the
 * wide plate carries the seat's data-spec hook + the alt; the narrow twin
 * (≤767, the stacked band) rides aria-hidden and swaps by display. The
 * theme's dark flip is the plate's own CSS treatment (invert filter), so
 * no second raster twin is needed — geometry never moves. */
function PlatformMedia({ media, spec, alt, className }: {
  media: PlatformMediaArt;
  spec: string;
  alt: string;
  className: string;
}) {
  return (
    <>
      <img
        className={`${className} is-wide`}
        src={media.wide}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={media.wideW}
        height={media.wideH}
        data-spec={spec}
      />
      <img
        className={`${className} is-narrow`}
        src={media.narrow}
        alt=""
        aria-hidden="true"
        loading="lazy"
        decoding="async"
        width={media.narrowW}
        height={media.narrowH}
      />
    </>
  );
}

export function Product() {
  return (
    <section id="product" className="pr-section" aria-labelledby="pr-title" data-spec="platform.section">
      {/* the sheet's top rule (heron section div[1]) */}
      <div className="pr-sheet-rule" data-spec="platform.sheetruleA" aria-hidden="true" />

      <div className="pr-grid" data-spec="platform.grid">
        {/* the two row copies — ≥992 same rects (the cross-fade
            marquee), ≤991 the two stacked item rows.
            R347-Z (D8 family): the three marquee loop clones
            (idx 3/4/5) stay DELETED — conformance twins of the banned
            family; the cross-fade itself stays re-sequenced
            (platform.css): fade-OUT completes and the row hides
            BEFORE the partner fades in — no moment paints both. */}
        <div className="pr-rows" data-spec="platform.rows">
          <PlatformRow item={PLATFORM_ITEMS[0]} idx={1} />
          <PlatformRow item={PLATFORM_ITEMS[1]} idx={2} hidden />
        </div>

        {/* ≥992 the central image column — the DOMINANT anchor (the
            floor-plan twins) over the data-table capture, flanked by
            the measured hairlines; ≤991 display:none (heron's own 0×0
            census at 768/390) */}
        <div className="pr-imgs" data-spec="platform.imgs" aria-hidden="true">
          <div className="pr-imgs-vrule" data-spec="platform.imgsvruleA" aria-hidden="true" />
          <div className="pr-img" data-spec="platform.img1">
            <PlatformMedia media={PLATFORM_ART[0]} spec="platform.img1img" alt="" className="pr-media" />
            {/* r340 T-P1y — the drafting chrome every product capture
                carries (one design language: hairline + [nn] tag on a
                paper chip, from the pattern library). */}
            <div className="pr-frame-chrome" aria-hidden="true">
              <Hairline variant="border" />
              <span className="pr-frame-tag"><Numeral n={1} /></span>
            </div>
          </div>
          <div className="pr-imgs-hrule" data-spec="platform.imghruleA" aria-hidden="true" />
          <div className="pr-img" data-spec="platform.img2">
            <PlatformMedia media={PLATFORM_ART[1]} spec="platform.img2img" alt="" className="pr-media" />
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
 * the body-voice wrappers, ruled top/end), side cell (the text box →
 * the DARK SPEC PANEL → the CTA strip with its dual arrow rings), and
 * the ≤991 per-row image with its flanking rule. */
function PlatformRow({ item, idx, hidden }: { item: PlatformItem; idx: 1 | 2; hidden?: boolean }) {
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

      {/* the side cell — the text box, the dark spec panel, the CTA
          strip. R368: the panel (heron's hover menu) moves OUT of the
          CTA strip into the side cell's flow — a static spec panel at
          the measured menu rect (the reference overlays its own menu
          on hover; ours proves the product at rest), and the CTA
          strip follows it below. */}
      <div className="pr-side" data-spec={ds('side')}>
        <div className="pr-cell-rule is-top" data-spec={ds('sideruleA')} aria-hidden="true" />
        <div className="pr-sidebox" data-spec={ds('sidebox')}>
          <RevealCssClass as="p" className="pr-text" delay={2} data-spec={ds('text')}>
            {item.text}
          </RevealCssClass>
        </div>

        {/* the DARK SPEC PANEL — the reference's measured dark-menu
            seat (rgb(40,40,40) @1440 x969 y8723 w480 h120): the
            student-dashboard capture strip + the assistant's three
            spec lines (the r338 menu copy, keys intact). The question
            line carries the measured orange (the reference's own
            orange tooltip line). ≤991: display:none (heron's own
            census carries no menu at 768/390 — platform.css). */}
        <div className="pr-menu" data-spec={ds('aicell')}>
          <img
            className="pr-menu-shot"
            src={PANEL_SHOT.light}
            alt="لوحة الطالب — لقطة حقيقية من واجهة مدارك (بيانات العرض التجريبية)"
            loading="lazy"
            decoding="async"
            width={PANEL_SHOT.width}
            height={PANEL_SHOT.height}
          />
          <span className="pr-menu-k" data-spec={ds('menuk')}>المساعد الأكاديمي</span>
          <span className="pr-menu-q" data-spec={ds('menuq')}>اشرح لي مفهوم «نقطة الفحص»</span>
          <span className="pr-menu-a" data-spec={ds('menua')}>سؤال داخل المحاضرة يُصحَّح فورًا.</span>
        </div>

        <a href="#cta" className="pr-cta" data-spec={ds('cta')}>
          <div className="pr-cta-rule" data-spec={ds('ctarule')} aria-hidden="true" />
          {/* r338 T-08c2 — heron's CTA internals are divs (a[2] > div[2] >
              div[1] > …, measured): the structural wrappers stay divs
              so the explicit pairs pass tag asserts */}
          <div className="pr-cta-body" data-spec={ds('ctabody')}>
            <div className="pr-cta-row" data-spec={ds('ctarow')}>
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
          to heron's own 0×0 census state) — r368: the floor-plan twins
          (item 1) / the matrix capture (item 2) */}
      <div className="pr-rowimg" data-spec={ds('rowimg')}>
        <PlatformMedia media={item.img} spec={ds('rowimgimg')} alt={item.alt} className="pr-media" />
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
