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
import { RevealCssClass } from '../../hooks/useReveal';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
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

interface Mini { box: Box; bx?: string; ic?: string; img?: boolean; capId?: string }
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
      { box: ['128.28rem', '30.96rem', '25.44rem', '21.6rem'], img: true },
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
    /* R342-05: the small evidence seat carries the TEACHER surface —
     * a distinct real capture (matrix already owns this row's card). */
    minis: [{ box: ['90.96rem', '40.56rem', '13.68rem', '10.92rem'], img: true, capId: 'teacher-dashboard' }],
    tagX: '3.12rem',
    title: 'أتقن المهارات',
    sub: 'مصفوفة إتقان تُظهر ما أتممت وما بقي عليك',
  },
];

/* row-4 point reveals (x, y, size rem, scale) — the dotted route.
 * R342-05: the cluster is translated −64.8rem inline (the measured
 * geometry-skipped seats sat under row 4's capture face; the route
 * now hangs in the clear band beside the axis — see MAP). */
const POINTS: Array<[string, string, string, string]> = [
  ['42.72rem', '36.48rem', '0.48rem', '0.4'],
  ['42.72rem', '19.2rem', '0.48rem', '0.4'],
  ['51.6rem', '10.8rem', '0.48rem', '0.4'],
  ['64.92rem', '10.8rem', '0.48rem', '0.4'],
  ['79.2rem', '15.6rem', '0.48rem', '0.4'],
  ['85.08rem', '21.36rem', '0.48rem', '0.4'],
  ['62.76rem', '42rem', '0.48rem', '0.4'],
  ['51.6rem', '27.6rem', '0.48rem', '0.4'],
  ['59.64rem', '27.6rem', '0.48rem', '0.4'],
  ['59.64rem', '32.52rem', '0.48rem', '0.4'],
  ['71.04rem', '36.48rem', '0.6rem', '0.471'],
  ['62.4rem', '24.12rem', '0.72rem', '0.591'],
];

/* row-4 dashed route map — 16 authored orthogonal segments (R342-05
 * redraw). The seats keep their mp1…mp16 bindings; the earlier
 * arithmetic placeholder d-attrs rendered as disjoint scribbles that
 * crossed the cards and never touched the 12 station reveals. The
 * route is one continuous metro-style line through every station +
 * three margin ticks, drawn in the svg's own coordinate system and
 * TRANSLATED +540px physical into the row's empty inline-end band —
 * the measured station cluster (geometry-skipped tween seats) sat
 * under row 4's capture face; the clear zone right of the axis reads
 * as the journey leg the card's mastery view points at. Mapping:
 * viewBox 816×265 ≈ the full row aspect (816×1.75 = 1428),
 * xMinYMin meet; vx = (x+540)/1.75 · vy = y/1.75, measured from the
 * rendered station rects @1440. */
const MAP: string[] = [
  'M569 53 H505',                    // pt3 → pt4 (top run)
  'M505 53 V75 H437',                // pt4 elbow → pt5
  'M437 75 V103 H409',               // pt5 elbow → pt6
  'M409 103 V175 H476',              // pt6 down → pt11
  'M476 175 H611',                   // pt11 → pt1 (the base line)
  'M611 175 V93',                    // pt1 → pt2
  'M611 93 V53 H569',                // pt2 elbow → pt3 (loop closes)
  'M569 133 V53',                    // pt8 → pt3 (col spine)
  'M569 133 H530',                   // pt8 → pt9
  'M530 133 V156',                   // pt9 → pt10
  'M517 117 V53',                    // pt12 → joins the top run at x517
  'M517 117 V133 H530',              // pt12 spur → pt9
  'M476 175 V201 H515',              // pt11 branch → pt7
  'M627 175 H611',                   // margin tick — pt1 approach
  'M409 103 V90',                    // margin tick — pt6 spur
  'M627 53 H611',                    // margin tick — pt2 approach
];

const cap = (id: string) => PRODUCT_CAPTURES.find((c) => c.id === id);
/* R342-05 — the four role captures beyond PRODUCT_CAPTURES. The
 * registry's provenance lives in `frontend/public/media/manifest.json`
 * (products[] — same R308 seeded-demo method, verifiedByPrincipal);
 * this map only re-states the id → ladder widths so the gallery can
 * give every capture a distinct role instead of repeating the student
 * surfaces three times. Files verified on disk under /media/product. */
const EXTRA_CAPTURES: Record<string, number[]> = {
  'teacher-dashboard': [720, 1280],
  'admin-dashboard': [720, 1280],
  'owner-dashboard': [720, 1280],
  'quality-dashboard': [720, 1280],
};
/* the /media/product ladder (ProductFrame's loader contract) — the
 * 1× intrinsic seat of the seeded capture, CLS-safe with the rem box */
const capSrc = (id: string) => {
  const c = cap(id) ?? (CAPTURE_LECTURE_CHECKPOINT_2X.id === id ? CAPTURE_LECTURE_CHECKPOINT_2X : undefined);
  if (c) return `/media/product/${c.id}-${c.widths[0]}.webp`;
  const widths = EXTRA_CAPTURES[id];
  return widths ? `/media/product/${id}-${widths[0]}.webp` : '';
};

/** the 13px icon cluster — white core (4px glyph) + accent swap + ring. */
function IconCluster({ x, ds }: { x: string; ds: string }) {
  return (
    <div className="wy-ic" data-spec={`why.${ds}`} style={{ '--wy-ix': x } as React.CSSProperties}>
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

/** a small capture with its sub-pixel reveal box (+cluster | plain img).
 * L1-a (r341): the seats ride the --wy-* custom properties — NOT the
 * physical properties — so the sheet's ≤991/≤767 measured re-seat
 * rules (direct values, higher in the cascade) actually WIN on the
 * tablet/phone belts; the inline physical props had been killing
 * them (desktop geometry on phone = the clipped/stray thumbnails). */
function MiniSeat({ m, id, ds }: { m: Mini; id: string; ds: string }) {
  return (
    <div
      className="wy-mini"
      data-spec={`why.${ds}`}
      style={{ '--wy-sx': m.box[0], '--wy-sy': m.box[1], '--wy-sw': m.box[2], '--wy-sh': m.box[3] } as React.CSSProperties}
    >
      {m.img ? (
        <div className="wy-mini-in">
          <img className="wy-img" src={capSrc(id)} alt="" loading="lazy" />
        </div>
      ) : (
        <>
          <div className="wy-box" data-spec={`why.${ds}b`} style={{ '--wy-bx': m.bx } as React.CSSProperties}>
            <div className="wy-box-in">
              <img className="wy-box-img" src={capSrc(id)} alt="" loading="lazy" />
            </div>
          </div>
          <IconCluster x={m.ic ?? '0rem'} ds={`${ds}c`} />
        </>
      )}
    </div>
  );
}

/* the pinned dark caption bar now lives ONCE at stage level (below) —
 * the spec pins ALL FOUR tween captions at viewport y48 (sr.y -326
 * @1440); a single stage-driven bar carries the four states. */

/** the 10px axis way-marker (+ / – svg paths). */
function Marker({ y, ds }: { y: string; ds: string }) {
  return (
    <div className="wy-mk" data-spec={`why.${ds}`} style={{ insetBlockStart: y }}>
      <div className="wy-mk-in" data-spec={`why.${ds}in`}>
        <svg className="wy-mk-svg" data-spec={`why.${ds}svg`} viewBox="0 0 10 10" aria-hidden="true">
          <path className="wy-mk-path" data-spec={`why.${ds}p1`} d="M10 5 H0" />
          <path className="wy-mk-path" data-spec={`why.${ds}p2`} d="M5 0 V10" />
        </svg>
      </div>
    </div>
  );
}

/**
 * R342-05 — the cycle overview figure (ASSET-CONTRACT §3.5, published
 * by R342-01): the whole learning cycle as one original architectural
 * ink piece — the conceptual anchor closing the gallery. The product
 * PROOF stays in the deck above; this seat explains the progression.
 * Theme twins per the contract's -light/-dark naming law. The figure
 * renders only while at least one twin resolves — until R342-01
 * lands the why/ files the section renders exactly as before
 * (contract §2: filenames stable once published). No data-spec: the
 * frozen spec has no counterpart for this seat, so it is never
 * bound — authored chrome, off-book by design.
 */
function CycleFigure() {
  const [missing, setMissing] = useState({ light: false, dark: false });
  if (missing.light && missing.dark) return null;
  /* a missing twin can arrive as a REAL 404 (error) or as the dev
   * server's SPA fallback — 200 text/html, which completes the load
   * with naturalWidth 0. Both routes must hide the twin. */
  const settle = (key: 'light' | 'dark') => (e: React.SyntheticEvent<HTMLImageElement>) => {
    const broken = e.type === 'error' || e.currentTarget.naturalWidth === 0;
    if (broken) setMissing((m) => (m[key] ? m : { ...m, [key]: true }));
  };
  return (
    <figure className="wy-cycle">
      <RevealCssClass as="div" className="wy-cycle-frame reveal-fade" delay={1}>
        <img
          className="wy-cycle-img is-light"
          src="/media/illustrations/r342/why/why-cycle-light.webp"
          alt="دورة المنصّة من اليمين إلى اليسار: مرصد التعلّم، جدار الفجوات، ممر التدريب، وسلّم التقدّم الصاعد"
          loading="lazy"
          onError={settle('light')}
          onLoad={settle('light')}
        />
        <img
          className="wy-cycle-img is-dark"
          src="/media/illustrations/r342/why/why-cycle-dark.webp"
          alt=""
          loading="lazy"
          onError={settle('dark')}
          onLoad={settle('dark')}
        />
      </RevealCssClass>
      <figcaption className="wy-cycle-cap">دورة مدارك في لوحة واحدة — من المشاهدة إلى الإتقان</figcaption>
    </figure>
  );
}

export function WhyScene() {
  const stageRef = useRef<HTMLDivElement>(null);
  /* L1-a (r341) — the ≤767 deck belt: .wy-track IS the snap scroller
   * (why.css ≤767: overflow-x auto + scroll-snap x mandatory); the
   * arrows/dots chrome reads + drives its scroll seat. ≥768 the belt
   * is not scrollable and the chrome is display:none — inert. */
  const trackRef = useRef<HTMLDivElement>(null);
  const [deckAt, setDeckAt] = useState(0);
  const deckGo = (i: number) => {
    const t = trackRef.current;
    if (!t) return;
    const rows = t.querySelectorAll<HTMLElement>('.wy-row');
    const row = rows[Math.max(0, Math.min(rows.length - 1, i))];
    row?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  };
  const onDeckScroll = () => {
    const t = trackRef.current;
    if (!t) return;
    const port = t.getBoundingClientRect();
    const mid = port.left + port.width / 2;
    let best = 0;
    let bestD = Infinity;
    t.querySelectorAll<HTMLElement>('.wy-row').forEach((r, i) => {
      const rc = r.getBoundingClientRect();
      const d = Math.abs(rc.left + rc.width / 2 - mid);
      if (d < bestD) { bestD = d; best = i; }
    });
    setDeckAt(best);
  };
  /* the pinned caption bar is PORTALED to document.body: the why
   * section rides the r323 content-visibility skirt (strata.css),
   * whose layout+paint containment makes the section the containing
   * block of its position:fixed descendants — the viewport-pinned
   * captions were trapped at section-top+48px (invisible mid-scrub,
   * clipped mid-word at the section's paint boundary). At body level
   * the fixed seats pin to the real viewport, exactly like the frozen
   * spec's recorded seats. */
  const capbarRef = useRef<HTMLDivElement>(null);

  /* the ONE scroll driver: traversal → --wy-p (the progress rule width)
   * + data-wy-stage — imperative, zero renders per tick (useSheetScroll
   * contract; the idempotent setProperty law). */
  let lastP = '';
  useSheetScroll(stageRef, ({ traversal }) => {
    const el = stageRef.current;
    if (!el) return;
    const stage = Math.min(3, Math.floor(traversal * 4));
    if (el.dataset.wyStage !== String(stage)) el.dataset.wyStage = String(stage);
    const live = traversal > 0.002 && traversal < 0.998 ? '1' : '0';
    if (el.dataset.wyLive !== live) el.dataset.wyLive = live;
    /* the portaled caption bar carries the same state flags — it is
     * no longer a .wy-stage descendant, so the CSS gates read its own
     * data attributes (idempotent setAttribute law, zero renders). */
    const cap = capbarRef.current;
    if (cap) {
      if (cap.dataset.wyStage !== String(stage)) cap.dataset.wyStage = String(stage);
      if (cap.dataset.wyLive !== live) cap.dataset.wyLive = live;
    }
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
    <>
    <div className="wy-stage" data-spec="why.stage" ref={stageRef} data-wy-stage="0">
      <div className="wy-axis" aria-hidden="true" data-spec="why.axis" />
      <div className="wy-stage-in" data-spec="why.stagein">
        <div className="wy-fade" aria-hidden="true" data-spec="why.fade" />
        <Marker y="-0.12rem" ds="mk1" />
        <Marker y="262.8rem" ds="mk2" />
        <div className="wy-track" data-spec="why.track" ref={trackRef} onScroll={onDeckScroll}>
          <div className="wy-progress" aria-hidden="true" data-spec="why.progress" />
          <div className="wy-track-in" data-spec="why.rows">
            {ROWS.map((r, i) => (
              <div
                className="wy-row"
                data-spec={`why.row${i + 1}`}
                key={r.title}
                style={{ '--wy-ry': `${[0, 62.16, 124.32, 186.48][i]}rem` } as React.CSSProperties}
              >
                <div className="wy-card" data-spec={`why.card${i + 1}`} style={{ '--wy-cx': r.card[0] } as React.CSSProperties}>
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
                  <div className="wy-player" data-spec="why.player">
                    <div className="wy-player2" data-spec="why.player2">
                      <div className="wy-vid" data-spec="why.vid1" style={{ '--wy-sx': '22.92rem', '--wy-sy': '-10.44rem', '--wy-sw': '38.76rem', '--wy-sh': '23.88rem' } as React.CSSProperties}>
                        <div className="wy-vid-in">
                          <img className="wy-img" src={lectureShot2x} alt="" loading="lazy" />
                        </div>
                      </div>
                      <div className="wy-vic" data-spec="why.vic" style={{ '--wy-sx': '58.68rem', '--wy-sy': '10.56rem' } as React.CSSProperties}>
                        <div className="wy-vic-in" data-spec="why.vicin">
                          <svg className="wy-vic-svg" data-spec="why.vicsvg" viewBox="0 0 18 18" aria-hidden="true">
                            <mask id={`wyvm${i}`}>
                              <path d="M2 5 h3 l2 -3 v14 l-2 -3 h-3 z" />
                              <path d="M11 4 a6 6 0 0 1 0 10 z" />
                            </mask>
                          </svg>
                        </div>
                      </div>
                      {/* R342-05: the collage frames now carry DISTINCT real
                          captures (admin/owner/quality — manifest.json
                          products[]) instead of repeating the student
                          surfaces this stage already shows. */}
                      <div className="wy-vid wy-vid2" data-spec="why.vid2" style={{ '--wy-sx': '20.88rem', '--wy-sy': '14.76rem', '--wy-sw': '42.72rem', '--wy-sh': '26.28rem' } as React.CSSProperties}>
                        <div className="wy-vid-in">
                          <img className="wy-img" src={capSrc('admin-dashboard')} alt="" loading="lazy" />
                        </div>
                      </div>
                      <div className="wy-spinz" data-spec="why.spinz" style={{ '--wy-sx': '59.52rem', '--wy-sy': '37.68rem' } as React.CSSProperties}>
                        <div className="wy-spin" data-spec="why.spin">
                          <svg className="wy-spin-svg" data-spec="why.spinsvg" viewBox="0 0 24 24" aria-hidden="true">
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
                      <div className="wy-chk" data-spec="why.chk" style={{ '--wy-sx': '60.36rem', '--wy-sy': '-6.24rem' } as React.CSSProperties}>
                        <svg className="wy-chk-svg" data-spec="why.chksvg" viewBox="0 0 6 6" aria-hidden="true">
                          <mask id="wycm1">
                            <path d="M1 3 l1.5 1.5 L5 1.5" />
                            <path d="M0.5 0.5 h5 v5 h-5 z" />
                          </mask>
                        </svg>
                      </div>
                      <div className="wy-vid wy-vid3" data-spec="why.vid3" style={{ '--wy-sx': '22.92rem', '--wy-sy': '42.6rem', '--wy-sw': '38.76rem', '--wy-sh': '23.88rem' } as React.CSSProperties}>
                        <div className="wy-vid-in">
                          <img className="wy-img" src={capSrc('owner-dashboard')} alt="" loading="lazy" />
                        </div>
                      </div>
                      <div className="wy-loadz" data-spec="why.loadz" style={{ '--wy-sx': '57.84rem', '--wy-sy': '18.24rem' } as React.CSSProperties}>
                        <div className="wy-load" data-spec="why.load">
                          <svg className="wy-load-svg" data-spec="why.loadsvg" viewBox="0 0 24 24" aria-hidden="true">
                            <g>
                              <g>
                                {Array.from({ length: 16 }, (_, k) => (
                                  <path key={k} className="wy-load-path" data-spec={`why.lp${k + 1}`} d="M12 2 v3" transform={`rotate(${k * 22.5} 12 12)`} />
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
                          <svg className="wy-tail-svg" data-spec="why.tailsvg" viewBox="0 0 1 1" aria-hidden="true">
                            <mask id="wymt1">
                              <rect width="0.05rem" height="0.05rem" />
                            </mask>
                          </svg>
                        </div>
                      </div>
                      <div className="wy-vid wy-vid4" data-spec="why.vid4" style={{ '--wy-sx': '20.64rem', '--wy-sy': '42.6rem', '--wy-sw': '16.32rem', '--wy-sh': '10.44rem' } as React.CSSProperties}>
                        <div className="wy-vid-in">
                          <img className="wy-img" src={capSrc('quality-dashboard')} alt="" loading="lazy" />
                        </div>
                      </div>
                      <div className="wy-dots" data-spec="why.dots" style={{ '--wy-sx': '25.44rem', '--wy-sy': '-0.72rem' } as React.CSSProperties}>
                        <div className="wy-dot" data-spec="why.dot1" />
                        <div className="wy-dot" data-spec="why.dot2" />
                        <div className="wy-dot wy-dot-3" data-spec="why.dot3" />
                      </div>
                    </div>
                  </div>
                )}

                {i === 3 && (
                  /* row 4 — the dashed route map + point reveals */
                  <>
                    {POINTS.map(([x, y, s, sc], k) => (
                      <div className="wy-pt" key={k} data-spec={`why.pt${k + 1}`} style={{ '--wy-sx': x, '--wy-sy': y, '--wy-sw': s, '--wy-sh': s, ['--wy-pt-s' as string]: sc } as React.CSSProperties}>
                        <div className="wy-pt-in">
                          <svg className="wy-pt-svg" data-spec={`why.pt${k + 1}svg`} viewBox="0 0 3 3" aria-hidden="true">
                            <rect className="wy-pt-rect" data-spec={`why.pt${k + 1}r1`} x="0" y="0" width="3" height="3" />
                            <rect className="wy-pt-rect2" data-spec={`why.pt${k + 1}r2`} x="1" y="1" width="1" height="1" />
                          </svg>
                        </div>
                      </div>
                    ))}
                    <div className="wy-map" data-spec="why.map">
                      <div className="wy-map-in" data-spec="why.mapin">
                        {/* xMinYMin + the row-proportioned 816×265 system:
                            the route shares one coordinate space with the
                            measured station seats and hangs in the clear
                            band inline-end of the axis (the default
                            xMidYMid letterboxed the art into a centre
                            band the stations never entered). */}
                        <svg className="wy-map-svg" data-spec="why.mapsvg" viewBox="0 0 816 265" preserveAspectRatio="xMinYMin meet" aria-hidden="true">
                          <g data-spec="why.mapg">
                            {MAP.map((d, k) => (
                              <path
                                key={k}
                                className="wy-map-path"
                                data-spec={`why.mp${k + 1}`}
                                d={d}
                              />
                            ))}
                          </g>
                        </svg>
                      </div>
                    </div>
                  </>
                )}

                {r.minis.map((m, k) => (
                  <MiniSeat m={m} key={k} id={m.capId ?? r.cardId} ds={`mini${i + 1}_${k + 1}`} />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* the pinned caption bar — ONE stage-driven bar at viewport y48
         * (the spec's four tween captions all pin there, sr.y -326 @1440):
         * four fixed-seat states, data-wy-stage swaps the live one.
         * Portaled to body (see capbarRef note above). */}
        {createPortal(
          <div className="wy-capbar" data-spec="why.capbar" ref={capbarRef}>
          {ROWS.map((r, i) => (
            <div className="wy-cap" data-spec={`why.tag${i + 1}`} key={r.title}>
              <div className="wy-cap-in" data-spec={`why.tag${i + 1}in`}>
                <div className="wy-cap-tw" data-spec={`why.tag${i + 1}tw`}>
                  <div className="wy-cap-t" data-spec={`why.tag${i + 1}t`}>{r.title}</div>
                </div>
                <div className="wy-cap-sw" data-spec={`why.tag${i + 1}sw`}>
                  <div className="wy-cap-s" data-spec={`why.tag${i + 1}s`}>{r.sub}</div>
                </div>
              </div>
              <div className="wy-cap-dot" aria-hidden="true" data-spec={`why.tag${i + 1}dot`} />
            </div>
          ))}
          </div>,
          document.body,
        )}
      </div>

      {/* L1-a (r341) — the ≤767 deck carousel chrome: snap-belt arrows
       * + dots seated in the stage's bottom band (why.css hides it
       * ≥768; no data-spec — an off-book chrome seat, never measured). */}
      <div className="wy-deck-chrome">
        <button type="button" className="wy-deck-btn" onClick={() => deckGo(deckAt - 1)} aria-label="المرحلة السابقة" disabled={deckAt === 0}>
          <svg className="wy-deck-svg" viewBox="0 0 12 12" aria-hidden="true">
            <path className="wy-deck-path" d="M4.5 1.5 L9 6 L4.5 10.5" />
          </svg>
        </button>
        <div className="wy-deck-dots" role="group" aria-label="مراحل الرحلة">
          {ROWS.map((r, i) => (
            <button
              type="button"
              key={r.title}
              className={`wy-deck-dot${i === deckAt ? ' is-on' : ''}`}
              onClick={() => deckGo(i)}
              aria-label={r.title}
              aria-current={i === deckAt}
            />
          ))}
        </div>
        <button type="button" className="wy-deck-btn" onClick={() => deckGo(deckAt + 1)} aria-label="المرحلة التالية" disabled={deckAt === ROWS.length - 1}>
          <svg className="wy-deck-svg" viewBox="0 0 12 12" aria-hidden="true">
            <path className="wy-deck-path" d="M7.5 1.5 L3 6 L7.5 10.5" />
          </svg>
        </button>
      </div>
    </div>
    {/* the cycle overview — closes the gallery with the whole learning
     * progression in one architectural piece (ASSET-CONTRACT §3.5). */}
    <CycleFigure />
    </>
  );
}
