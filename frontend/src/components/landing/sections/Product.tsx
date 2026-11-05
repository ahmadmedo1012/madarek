/* P2-0 (r335 split) — [5] المنصّة فعليًا — r325 Y2: the band rebuilt on the
 * extracted grammar (full-<bp>.json, home-platform 361/601/464
 * @1440): the heading + hairline STEP LIST at the reading-start
 * column, ONE wide product frame (the drawn lecture-player) in
 * the centre, the matrix + assistant cells at the inline end,
 * and the former plan tooltip re-seated as the frame's CAPTION
 * BELOW the art — nothing floats over the drawing. The r323
 * frame-head chrome («[05] · MADAREK · UI GRAMMAR») and the
 * plan miniature retire (filler / overlaid art). Hairline
 * cells, mono indexes ≥11px, orange as the single accent,
 * radius 0. Exactly ONE disclosure line «بيانات تجريبية». The
 * CTA still scrolls to the conversion row (the funnel counts
 * stay exact — no extra auth links on the sheet).
 *
 * Fully self-contained: the drawn frame, the real-capture proof
 * strip and their data live here — no composer refs. */
import { ArrowLeft } from 'lucide-react';
import { Icon } from '../../Icon';
import { RevealCssClass } from '../../../hooks/useReveal';
/* P-A2 R333 (INV-08 · heron-craft row 13) — the platform band's
 * product-proof strip: three REAL captures of the running platform,
 * re-captured @2880×1740 (the heron platform frame's 1440×870 @1×)
 * from the seeded stack. Vite-asset imports — the import IS the
 * fingerprinted dist asset; lazy <img>s, Arabic alt, never eager. */
import lectureShot from '../../../assets/product/lecture-checkpoint.webp';
import aiTutorShot from '../../../assets/product/ai-tutor.webp';
import examActiveShot from '../../../assets/product/exam-active.webp';

/* ── r325 Y2 — the platform §05's ONE product frame, rebuilt on the
 * extracted grammar (docs/redesign/r324/heron/full-<bp>.json,
 * home-platform: content 361px | img-wrap 601px | content-right 464px
 * @1440 — the 3/5/4 twelve-col seat our ≥992 grid re-derives):
 *
 *   · ONE wide product frame — the drawn lecture-player (slide with a
 *     concept chain, the playhead track, the checkpoint card) on the
 *     sheet's hairline figure. The r323 frame-head chrome
 *     («[05] · MADAREK · UI GRAMMAR») carried no information — the
 *     filler label is retired with the bar.
 *   · the floor-plan tooltip («قاعة المحاضرة التفاعلية — نقطة فحص
 *     تُصحَّح فورًا») is re-seated as the frame's CAPTION BELOW the art
 *     (the reference's own caption grammar) — nothing floats over the
 *     drawing, and the plan miniature retires with its pin.
 *   · the hairline step list (the player's concept index) moves
 *     BESIDE the frame into the heading column (the extracted
 *     content cell's own step list), drawn as ruled rows.
 *   · the mastery matrix + the assistant cell ride the inline-end
 *     column (the extracted content-right seat).
 *
 * Honest by construction: every cell states the grammar of a REAL
 * surface (the player's checkpoint mechanism, the qualitative matrix,
 * the assistant's LIVE concept-explain scope — the r168b truthfulness
 * canon: no summarisation promise), and the section carries exactly
 * ONE demo-data disclosure. Pure drafting chrome: the drawing body is
 * aria-hidden; the reading lives in the caption, the lede and the
 * section's own copy. */
function PlatformShowcase() {
  return (
    <figure className="pr-frame">
      <div className="pr-frame-art" aria-hidden="true">
        <div className="pr-cell-bar">
          <span className="pr-cell-idx fo-mono" dir="ltr">[01]</span>
          <span className="pr-cell-title">المحاضرة التفاعلية</span>
          <span className="pr-cell-note fo-mono" dir="ltr">24:36</span>
        </div>

        {/* the player screen — the slide's drafted plate: the position
            counter, the heading mass, the concept chain with the ONE
            accent checkpoint node, over the playhead track */}
        <div className="pr-screen">
          <span className="pr-slide-kicker fo-mono" dir="ltr">02 / 04</span>
          <div className="pr-slide">
            <span className="pr-slide-rule" />
            <span className="pr-slide-rule is-sub" />
            <div className="pr-chain">
              <span className="pr-node">
                <i className="pr-node-line" />
                <i className="pr-node-line is-short" />
              </span>
              <span className="pr-chain-link" />
              <span className="pr-node is-acc">
                <i className="pr-node-dot" />
                <i className="pr-node-line is-short" />
              </span>
              <span className="pr-chain-link" />
              <span className="pr-node">
                <i className="pr-node-line" />
                <i className="pr-node-line is-short" />
              </span>
            </div>
            <span className="pr-slide-line" />
            <span className="pr-slide-line is-short" />
          </div>
          <div className="pr-track">
            <span className="pr-track-fill" />
            <i className="pr-tick" />
            <i className="pr-tick" />
            <i className="pr-tick" />
            <span className="pr-track-head" />
          </div>
        </div>

        {/* the checkpoint card — the one honest checkpoint surface */}
        <div className="pr-check">
          <span className="pr-check-k">نقطة فحص</span>
          <p className="pr-check-q">سؤال قصير يُصحَّح فورًا داخل المحاضرة</p>
          <span className="pr-check-btn">تحقّق</span>
        </div>
      </div>

      {/* the caption BELOW the frame — the former plan pin, re-seated */}
      <figcaption className="pr-frame-cap">
        <span className="pr-cap-title">قاعة المحاضرة التفاعلية</span>
        <span className="pr-cap-line">نقطة فحص تُصحَّح فورًا داخل القاعة</span>
      </figcaption>
    </figure>
  );
}

/* ── P-A2 R333 (INV-08 · heron-craft row 13) — THE PRODUCT-PROOF
 * STRIP. Heron's platform band proves the drawing became a working
 * tool with its real app windows; the r325 Y2 rebuild kept the drawn
 * frame alone (the supervisor defect: the sheet's only real captures
 * lived in the why strip). The proof strip seats the 2× captures as
 * three prf-card-grammar panels — hairline frame, radius 0, the
 * paper chip (mono index + Arabic label — the caption IS content) —
 * under the band's grid (row 3, inside the row-1 stretch's slack:
 * height-neutral by construction, the twin floor stays exact).
 *
 * The entrance is row 13's own imgCardReveal (scale 0.8→1 + fade):
 * the panels ride reveals.ts CARD_SEL → .reveal-card, the house
 * IO-driven rung — reduced motion bails before arming and the strip
 * ships visible; JS-off the same (the module owns ALL hiding).
 * Honest by construction: the alts describe the REAL seeded UI; the
 * chips name the surface; zero links (the funnel counts stay 5+5). */
const PLATFORM_SHOTS = [
  {
    src: lectureShot,
    chip: '[01]',
    labelAr: 'محاضرة تفاعلية',
    altAr: 'مشغّل محاضرة مدارك أثناء محاضرة «هندسة البرمجيات» مع بطاقة نقطة فحص مدمجة في الفيديو — بيانات العرض التجريبية',
  },
  {
    src: aiTutorShot,
    chip: '[02]',
    labelAr: 'معلّم ذكي',
    altAr: 'المساعد الأكاديمي في مدارك يجيب عن سؤال الطالب داخل الواجهة — بيانات العرض التجريبية',
  },
  {
    src: examActiveShot,
    chip: '[03]',
    labelAr: 'اختبار',
    altAr: 'اختبار إلكتروني في مدارك أثناء عمله بمؤقّت حيّ مع عدّاد الأسئلة — بيانات العرض التجريبية',
  },
] as const;

function PlatformShots() {
  return (
    <div className="pr-shots" role="group" aria-label="واجهات المنصّة الحقيقية" data-spec="platform.shots">
      {PLATFORM_SHOTS.map((s) => (
        <figure key={s.chip} className="pr-shot">
          <div className="pr-shot-media">
            <img
              src={s.src}
              data-spec={s.chip === '[01]' ? 'platform.shotimg' : undefined}
              alt={s.altAr}
              loading="lazy"
              decoding="async"
              width={1440}
              height={870}
            />
            {/* the drafting frame layer — four corner registration
                marks riding the repo's CSS plus-mark grammar (the
                hero's .bp-plus: pseudo-content glyph, no icon import,
                no raw svg under the icon gate); pure chrome,
                aria-hidden */}
            <span aria-hidden="true" className="pr-shot-tick pr-shot-tick-tl" />
            <span aria-hidden="true" className="pr-shot-tick pr-shot-tick-tr" />
            <span aria-hidden="true" className="pr-shot-tick pr-shot-tick-bl" />
            <span aria-hidden="true" className="pr-shot-tick pr-shot-tick-br" />
          </div>
          <figcaption className="prf-idxchip pr-shot-chip">
            <span className="fo-mono" dir="ltr">{s.chip}</span>
            <span className="pr-shot-label">{s.labelAr}</span>
          </figcaption>
        </figure>
      ))}
    </div>
  );
}

export function Product() {
  return (
    <section id="product" className="pr-section" aria-labelledby="pr-title" data-spec="platform.section">
      {/* the heading column — the extracted content cell: label,
          title, lede, then the player's concept steps as the
          hairline index BESIDE the frame (the extracted cell's own
          step list; aria-hidden drafting chrome — the honest read
          lives in the title/lede/caption/note). */}
      <div className="pr-head" data-spec="platform.head">
        <span className="fo-label" data-spec="platform.label"><span className="fo-mono" dir="ltr">[05]</span> المنصّة فعليًا</span>
        <RevealCssClass as="h2" className="pr-title" delay={1} id="pr-title" data-spec="platform.title">
          لا وعود — هذه <em>الواجهة نفسها</em>
        </RevealCssClass>
      </div>

      {/* r338 T-08b — the head column's lower free zone (heron's left
          col is empty below its two 193px rows): lede + step list ride
          the same column as unbound drafting chrome */}
      <div className="pr-head-more">
        <RevealCssClass as="p" className="pr-lede" delay={2}>
          بنية الواجهات نفسها برسم داخلي: مشغّل المحاضرة بنقاط الفحص،
          ومصفوفة الإتقان، والمساعد الأكاديمي — كما تعمل اليوم داخل المنصّة.
        </RevealCssClass>
        <ol className="pr-chapters" aria-hidden="true">
          <li className="pr-ch">
            <span className="fo-mono" dir="ltr">[01]</span>
            مفهوم: بناء المحاضرة
          </li>
          <li className="pr-ch is-now">
            <span className="fo-mono" dir="ltr">[02]</span>
            مفهوم: نقطة الفحص
            <span className="pr-ch-play" />
          </li>
          <li className="pr-ch">
            <span className="fo-mono" dir="ltr">[03]</span>
            مفهوم: التصحيح التلقائي
          </li>
          <li className="pr-ch">
            <span className="fo-mono" dir="ltr">[04]</span>
            مفهوم: خطط المراجعة
          </li>
        </ol>
      </div>

      <RevealCssClass as="div" className="pr-stage" delay={2} data-spec="platform.stage">
        <PlatformShowcase />
      </RevealCssClass>

      {/* the inline-end column — the two drawn surfaces (the
          extracted content-right seat; aria-hidden drafting
          chrome; folds at ≤1024 with the strips-only bands) */}
      <RevealCssClass as="div" className="pr-side" delay={3} aria-hidden="true" data-spec="platform.side">
        <div className="pr-cell pr-cell-matrix" data-spec="platform.matrixcell">
          <div className="pr-cell-bar">
            <span className="pr-cell-idx fo-mono" dir="ltr">[02]</span>
            <span className="pr-cell-title">مصفوفة الإتقان</span>
          </div>
          <div className="pr-matrix">
            {/* ONE solid accent cell — the reference's drawings
                carry one orange signal per frame; the two warm
                cells keep the outline. */}
            <span className="pr-mc is-hot" />
            <span className="pr-mc" />
            <span className="pr-mc is-warm" />
            <span className="pr-mc" />
            <span className="pr-mc" />
            <span className="pr-mc is-warm" />
            <span className="pr-mc" />
            <span className="pr-mc" />
          </div>
          <div className="pr-mrows">
            <span className="pr-mrow"><span className="pr-mfill" style={{ inlineSize: '78%' }} /></span>
            <span className="pr-mrow"><span className="pr-mfill" style={{ inlineSize: '52%' }} /></span>
            <span className="pr-mrow"><span className="pr-mfill" style={{ inlineSize: '31%' }} /></span>
          </div>
        </div>

        {/* one assistant bubble — the LIVE concept-explain scope */}
        <div className="pr-cell pr-cell-ai" data-spec="platform.aicell">
          <div className="pr-cell-bar">
            <span className="pr-cell-idx fo-mono" dir="ltr">[03]</span>
            <span className="pr-cell-title">المساعد الأكاديمي</span>
          </div>
          <p className="pr-ai-q">اشرح لي مفهوم «نقطة الفحص»</p>
          <p className="pr-ai-a">سؤال قصير داخل المحاضرة يُصحَّح فورًا، فيثبُت الفهم قبل الانتقال.</p>
        </div>
      </RevealCssClass>

      {/* the row-2 note — a DIRECT child of the section grid (the
          ≥992 seat is cols 9–12 / row 2, the reference's own
          inspector-note position; under the frame at ≤767; hidden
          with the head at the strips-only 768–1024 bands). The
          r307 contract kept: the CTA scrolls to the conversion
          row (#cta) — never an auth link. */}
      <RevealCssClass as="div" className="pr-note" delay={3} data-spec="platform.note">
        <span className="pr-frame-demo fo-mono">بيانات تجريبية</span>
        <a href="#cta" className="fo-text-link pr-frame-cta" data-spec="platform.cta">
          أنشئ حسابك لتجربتها حيّة
          <Icon icon={ArrowLeft} size={13} />
        </a>
      </RevealCssClass>

      {/* P-A2 (INV-08 · heron row 13) — the product-proof strip:
          the band's real 2× captures, seated in row 3 (the ≥992
          grid's stretch slack — height-neutral). ≤991 the band's
          capture-free fold stands (the twin lock): the strip
          renders ≥992 only. */}
      <PlatformShots />
    </section>
  );
}
