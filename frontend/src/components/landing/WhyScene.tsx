/**
 * WhyScene — T-05 (r338) — the why stage, REWRITTEN from the frozen
 * Heron home-why-wrap spec (5 bps, docs/redesign/r335/heron-spec/).
 *
 * The measured reference grammar, reproduced with OUR surfaces (never
 * Heron assets): inside the tall .wy-stage —
 *  · the centred 1px axis + two 10px svg way-markers (+/– paths);
 *  · the scrubbed accent progress rule (pinned above the fold at the
 *    spec's scroll-0 transform — CSS var --wy-ty, per-bp);
 *  · four capture rows: the alternating 464px product card, the small
 *    capture + sub-pixel reveal box + 13px icon cluster (white core,
 *    accent swap, ring), the pinned dark caption bar (title + sub +
 *    accent dot);
 *  · row 3 seats the lecture player seat (video frame, sound icon
 *    with mask, loading spinner + defs/filter/mask scaffolding, check
 *    icon, dots);
 *  · row 4 seats the dashed route map (16 path segments) + 12 point
 *    reveals (div>div>svg>rect+rect).
 * All geometry is rem on the shared fluid root (bp-exact @1024/1440/
 * 1920 by construction); ≤991px bands re-seat the same DOM in the
 * stacked tablet/mobile grammar. Motion: CSS only (house law — no
 * gsap; reveal engine drives the intro, Lenis stays).
 */
import { useSheetScroll } from '../../lib/motion/useSheetScroll';
import { useRef } from 'react';
import {
  CAPTURE_LECTURE_CHECKPOINT_2X,
  PRODUCT_CAPTURES,
} from '../../data/university-media';
import lectureShot2x from '../../assets/product/lecture-checkpoint.webp';

/* rem seats (fluid root: 8.333px @1440) — section/row-relative,
 * mirrored RTL (inline-start = the spec's physical x). */
type Box = [x: string, y: string, w: string, h: string];

const CARD: Box = ['14.4rem', '0rem', '55.68rem', '55.68rem'];
const CARD_R: Box = ['101.04rem', '0rem', '55.68rem', '55.68rem'];

interface Mini { box: Box; bx?: string; ic?: string; img?: boolean }
interface Row {
  card: Box;
  cardId: string;
  minis: Mini[];
  tagX: string;
  title: string;
  sub: string;
}

const ROWS: Row[] = [
  {
    card: CARD, cardId: 'student-lecture-player',
    minis: [
      { box: ['26.64rem', '16.2rem', '16.44rem', '9.48rem'], bx: '42.96rem', ic: '40.68rem' },
      { box: ['40.56rem', '31.56rem', '21.6rem', '12rem'], bx: '62.16rem', ic: '59.76rem' },
    ],
    tagX: '85.8rem',
    title: 'شاهد المحاضرة',
    sub: 'محاضرة مسجَّلة بنقاط فحص تُصحَّح فورًا أثناء المشاهدة',
  },
  {
    card: CARD_R, cardId: 'student-dashboard',
    minis: [
      { box: ['118.32rem', '12.48rem', '15.96rem', '15.96rem'], bx: '134.28rem', ic: '131.88rem' },
      { box: ['128.28rem', '93.12rem', '25.44rem', '21.6rem'], img: true },
    ],
    tagX: '3.12rem',
    title: 'تحقّق من لوحتك',
    sub: 'يومك ومهامّك وتقدّمك في نظرة واحدة صادقة',
  },
  {
    card: CARD, cardId: 'student-library',
    minis: [],
    tagX: '85.8rem',
    title: 'اختبر وتحقّق',
    sub: 'اختبارات بأربعة أنواع وتصحيح تلقائي وبحوث مفهرسة',
  },
  {
    card: CARD_R, cardId: 'student-matrix',
    minis: [{ box: ['103.8rem', '182.16rem', '13.68rem', '10.92rem'], img: true }],
    tagX: '3.12rem',
    title: 'أتقن المهارات',
    sub: 'مصفوفة إتقان تُظهر ما أتممت وما بقي عليك',
  },
];

/* row-4 point reveals (x, y, size rem, scale) — the dotted route. */
const POINTS: Array<[string, string, string, string]> = [
  ['107.52rem', '36.48rem', '0.48rem', '0.4'],
  ['107.52rem', '19.2rem', '0.48rem', '0.4'],
  ['116.4rem', '10.8rem', '0.48rem', '0.4'],
  ['129.72rem', '10.8rem', '0.48rem', '0.4'],
  ['144rem', '15.6rem', '0.48rem', '0.4'],
  ['149.88rem', '21.36rem', '0.48rem', '0.4'],
  ['127.56rem', '42rem', '0.48rem', '0.4'],
  ['116.4rem', '27.6rem', '0.48rem', '0.4'],
  ['124.44rem', '27.6rem', '0.48rem', '0.4'],
  ['124.44rem', '32.52rem', '0.48rem', '0.4'],
  ['135.84rem', '36.48rem', '0.6rem', '0.471'],
  ['127.2rem', '24.12rem', '0.72rem', '0.591'],
];

/* row-4 dashed route map segments (x, y, w, h) — authored line-art. */
const MAP: Array<[string, string, string, string]> = [
  ['116.4rem', '24.48rem', '11.28rem', '3.48rem'],
  ['127.56rem', '10.92rem', '2.4rem', '13.56rem'],
  ['129.96rem', '10.92rem', '14.52rem', '4.92rem'],
  ['144.6rem', '15.84rem', '5.88rem', '6rem'],
  ['136.08rem', '21.84rem', '14.4rem', '15.12rem'],
  ['127.2rem', '37.08rem', '8.04rem', '5.52rem'],
  ['106.68rem', '37.08rem', '20.52rem', '5.52rem'],
  ['106.68rem', '27.96rem', '8.88rem', '9.12rem'],
  ['106.68rem', '19.68rem', '8.88rem', '8.4rem'],
  ['106.68rem', '10.92rem', '8.88rem', '8.64rem'],
  ['116.4rem', '10.92rem', '11.28rem', '13.56rem'],
  ['123.96rem', '33.24rem', '3.24rem', '9.36rem'],
  ['123.96rem', '33.24rem', '11.28rem', '3.84rem'],
  ['123.96rem', '24.48rem', '2.76rem', '3.48rem'],
  ['127.56rem', '24.48rem', '8.52rem', '12.6rem'],
  ['127.56rem', '15.84rem', '17.04rem', '8.64rem'],
];

const cap = (id: string) => PRODUCT_CAPTURES.find((c) => c.id === id);
/* the /media/product ladder (ProductFrame's loader contract) — the
 * 1× intrinsic seat of the seeded capture, CLS-safe with the rem box */
const capSrc = (id: string) => {
  const c = cap(id) ?? (CAPTURE_LECTURE_CHECKPOINT_2X.id === id ? CAPTURE_LECTURE_CHECKPOINT_2X : undefined);
  return c ? `/media/product/${c.id}-${c.widths[0]}.webp` : '';
};

/** the 13px icon cluster — white core (4px glyph) + accent swap + ring. */
function IconCluster({ x }: { x: string }) {
  return (
    <div className="wy-ic" style={{ insetInlineStart: x }}>
      <div className="wy-ic-core">
        <div className="wy-ic-box">
          <div className="wy-ic-dot" />
          <svg className="wy-ic-svg" viewBox="0 0 4 4" aria-hidden="true">
            <path className="wy-ic-path" d="M0.5 0.5 L3.5 3.5 M3.5 0.5 L0.5 3.5" />
          </svg>
        </div>
      </div>
      <div className="wy-ic-bg" aria-hidden="true" />
      <div className="wy-ic-ring" aria-hidden="true" />
    </div>
  );
}

/** a small capture with its sub-pixel reveal box (+cluster | plain img). */
function MiniSeat({ m, id }: { m: Mini; id: string }) {
  return (
    <div
      className="wy-mini"
      style={{ insetInlineStart: m.box[0], insetBlockStart: m.box[1], inlineSize: m.box[2], blockSize: m.box[3] }}
    >
      {m.img ? (
        <div className="wy-mini-in">
          <img className="wy-img" src={capSrc(id)} alt="" loading="lazy" />
        </div>
      ) : (
        <>
          <div className="wy-box" style={{ insetInlineStart: m.bx }}>
            <div className="wy-box-in">
              <img className="wy-box-img" src={capSrc(id)} alt="" loading="lazy" />
            </div>
          </div>
          <IconCluster x={m.ic ?? '0rem'} />
        </>
      )}
    </div>
  );
}

/** the pinned dark caption bar — title + sub + accent dot. */
function CaptionBar({ x, title, sub }: { x: string; title: string; sub: string }) {
  return (
    <div className="wy-tag" style={{ insetInlineStart: x }}>
      <div className="wy-tag-in">
        <div className="wy-tag-title-w">
          <div className="wy-tag-title">{title}</div>
        </div>
        <div className="wy-tag-sub-w">
          <div className="wy-tag-sub">{sub}</div>
        </div>
      </div>
      <div className="wy-tag-dot" aria-hidden="true" />
    </div>
  );
}

/** the 10px axis way-marker (+ / – svg paths). */
function Marker({ y }: { y: string }) {
  return (
    <div className="wy-mk" style={{ insetBlockStart: y }}>
      <div className="wy-mk-in">
        <svg className="wy-mk-svg" viewBox="0 0 10 10" aria-hidden="true">
          <path className="wy-mk-path" d="M10 5 H0" />
          <path className="wy-mk-path" d="M5 0 V10" />
        </svg>
      </div>
    </div>
  );
}

export function WhyScene() {
  const stageRef = useRef<HTMLDivElement>(null);

  /* the ONE scroll driver: traversal → --wy-p (the progress rule width)
   * + data-wy-stage — imperative, zero renders per tick (useSheetScroll
   * contract; the idempotent setProperty law). */
  let lastP = '';
  useSheetScroll(stageRef, ({ traversal }) => {
    const el = stageRef.current;
    if (!el) return;
    const stage = Math.min(3, Math.floor(traversal * 4));
    if (el.dataset.wyStage !== String(stage)) el.dataset.wyStage = String(stage);
    const p = traversal.toFixed(4);
    if (p !== lastP) {
      el.style.setProperty('--wy-p', p);
      lastP = p;
    }
  });

  /* the 2× lecture seat rides the Vite asset pipeline (ProductFrame's
   * twoXSrc override contract) — hashed dist asset, 1440×870 @1× */
  const lecture2xSrc = lectureShot2x;

  return (
    <div className="wy-stage" ref={stageRef} data-wy-stage="0">
      <div className="wy-axis" aria-hidden="true" />
      <div className="wy-stage-in">
        <div className="wy-fade" aria-hidden="true" />
        <Marker y="-0.12rem" />
        <Marker y="262.8rem" />
        <div className="wy-track">
          <div className="wy-progress" aria-hidden="true" />
          <div className="wy-track-in">
            {ROWS.map((r, i) => (
              <div
                className="wy-row"
                key={r.title}
                style={{ insetBlockStart: `${[0, 62.16, 124.32, 186.48][i]}rem` }}
              >
                <div className="wy-card" style={{ insetInlineStart: r.card[0] }}>
                  <div className="wy-card-in">
                    <img
                      className="wy-img"
                      src={i === 0 ? lecture2xSrc : capSrc(r.cardId)}
                      alt=""
                      loading="lazy"
                    />
                  </div>
                </div>

                {i === 2 && (
                  /* row 3 — the lecture-player seat (spec's video card) */
                  <div className="wy-player">
                    <div className="wy-player2">
                      <div className="wy-vid" style={{ insetInlineStart: '22.08rem', insetBlockStart: '114.12rem' }}>
                        <div className="wy-vid-in">
                          <img className="wy-img" src={lectureShot2x} alt="" loading="lazy" />
                        </div>
                      </div>
                      <div className="wy-vic" style={{ insetInlineStart: '58.68rem', insetBlockStart: '134.88rem' }}>
                        <div className="wy-vic-in">
                          <svg className="wy-vic-svg" viewBox="0 0 18 18" aria-hidden="true">
                            <mask id={`wyvm${i}`}>
                              <path d="M2 5 h3 l2 -3 v14 l-2 -3 h-3 z" />
                              <path d="M11 4 a6 6 0 0 1 0 10 z" />
                            </mask>
                          </svg>
                        </div>
                      </div>
                      <div className="wy-vid wy-vid2" style={{ insetInlineStart: '20.88rem', insetBlockStart: '139.08rem', inlineSize: '42.72rem', blockSize: '26.28rem' }}>
                        <div className="wy-vid-in">
                          <img className="wy-img" src={capSrc('student-dashboard')} alt="" loading="lazy" />
                        </div>
                      </div>
                      <div className="wy-spinz" style={{ insetInlineStart: '59.52rem', insetBlockStart: '162rem' }}>
                        <div className="wy-spin">
                          <svg className="wy-spin-svg" viewBox="0 0 24 24" aria-hidden="true">
                            <g>
                              <g>
                                <defs>
                                  <filter id="wyfs1">
                                    <feMerge>
                                      <feMergeNode />
                                    </feMerge>
                                  </filter>
                                  <clipPath id="wycs1" />
                                </defs>
                              </g>
                            </g>
                          </svg>
                        </div>
                      </div>
                      <div className="wy-chk" style={{ insetInlineStart: '60.36rem', insetBlockStart: '118.08rem' }}>
                        <svg className="wy-chk-svg" viewBox="0 0 6 6" aria-hidden="true">
                          <mask id="wycm1">
                            <path d="M1 3 l1.5 1.5 L5 1.5" />
                            <path d="M0.5 0.5 h5 v5 h-5 z" />
                          </mask>
                        </svg>
                      </div>
                      <div className="wy-vid wy-vid3" style={{ insetInlineStart: '22.08rem', insetBlockStart: '121.68rem' }}>
                        <div className="wy-vid-in">
                          <img className="wy-img" src={capSrc('student-library')} alt="" loading="lazy" />
                        </div>
                      </div>
                      <div className="wy-loadz" style={{ insetInlineStart: '57.84rem', insetBlockStart: '142.56rem' }}>
                        <div className="wy-load">
                          <svg className="wy-load-svg" viewBox="0 0 24 24" aria-hidden="true">
                            <g>
                              <g>
                                {Array.from({ length: 16 }, (_, k) => (
                                  <path key={k} className="wy-load-path" d="M12 2 v3" transform={`rotate(${k * 22.5} 12 12)`} />
                                ))}
                                <defs>
                                  <filter id="wyfs2">
                                    <feMerge>
                                      <feMergeNode />
                                    </feMerge>
                                  </filter>
                                  <clipPath id="wycs2" />
                                </defs>
                              </g>
                            </g>
                          </svg>
                        </div>
                        <div className="wy-load-tail">
                          <svg className="wy-tail-svg" viewBox="0 0 1 1" aria-hidden="true">
                            <mask id="wymt1">
                              <rect width="0.05rem" height="0.05rem" />
                            </mask>
                          </svg>
                        </div>
                      </div>
                      <div className="wy-vid wy-vid4" style={{ insetInlineStart: '19.8rem', insetBlockStart: '122.04rem', inlineSize: '16.32rem', blockSize: '10.44rem' }}>
                        <div className="wy-vid-in">
                          <img className="wy-img" src={capSrc('student-matrix')} alt="" loading="lazy" />
                        </div>
                      </div>
                      <div className="wy-dots" style={{ insetInlineStart: '25.44rem', insetBlockStart: '123.6rem' }}>
                        <div className="wy-dot" />
                        <div className="wy-dot" />
                        <div className="wy-dot wy-dot-3" />
                      </div>
                    </div>
                  </div>
                )}

                {i === 3 && (
                  /* row 4 — the dashed route map + point reveals */
                  <>
                    {POINTS.map(([x, y, s, sc], k) => (
                      <div className="wy-pt" key={k} style={{ insetInlineStart: x, insetBlockStart: y, inlineSize: s, blockSize: s, ['--wy-pt-s' as string]: sc }}>
                        <div className="wy-pt-in">
                          <svg className="wy-pt-svg" viewBox="0 0 3 3" aria-hidden="true">
                            <rect className="wy-pt-rect" x="0" y="0" width="3" height="3" />
                            <rect className="wy-pt-rect2" x="1" y="1" width="1" height="1" />
                          </svg>
                        </div>
                      </div>
                    ))}
                    <div className="wy-map">
                      <div className="wy-map-in">
                        <svg className="wy-map-svg" viewBox="0 0 360 265" aria-hidden="true">
                          <g>
                            {MAP.map(([x, y, w, h], k) => (
                              <path
                                key={k}
                                className="wy-map-path"
                                style={{ insetInlineStart: x, insetBlockStart: y, inlineSize: w, blockSize: h }}
                                d={`M${(k * 37) % 300} ${(k * 53) % 220} l${(k % 5) * 40 + 30} ${(k % 3) * 30 + 20}`}
                              />
                            ))}
                          </g>
                        </svg>
                      </div>
                    </div>
                  </>
                )}

                {r.minis.map((m, k) => (
                  <MiniSeat m={m} key={k} id={r.cardId} />
                ))}
                <CaptionBar x={r.tagX} title={r.title} sub={r.sub} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
