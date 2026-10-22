/**
 * LearningPlanDrawing — R310 «مسطح التعلّم» — Artwork B.
 *
 * The journey scene's original architectural PLAN VIEW — an entirely
 * different drawing from the hero's elevation (spec §2.2): one
 * learning floor organized around a central corridor spine (RTL
 * reading), with six zones — the lecture hall (raked seating + stage,
 * reading start), the exam hall (desk grid), the mastery room
 * (stepped seminar), the checkpoint kiosk, the library wing
 * (shelves + reading table), and the entry reception — built as real
 * plan geometry: double-line walls with door swing arcs, window
 * runs, a column grid with lettered bubbles, dimension chains, room
 * labels with areas, numbered station markers at each zone door, and
 * the journey path running the corridor with branch arrows.
 *
 * The scene's stage contract (CSS, driven by .jt[data-stage]):
 *  · stage 0 (شاهد) — the envelope + grid + corridor + LECTURE zone
 *  · stage 1 (تحقّق) — + the CHECKPOINT zone
 *  · stage 2 (اختبر) — + the EXAM hall + the LIBRARY wing
 *  · stage 3 (أتقن) — + the MASTERY room + every annotation — resolved
 * The build is monotonic within a stage and REVERSIBLE with scroll
 * (scrub semantics — the same contract as the overlay cross-fades).
 * The active stage's zone carries the signal wash + warm outline.
 *
 * Engineering contracts:
 *  · Every drawn element carries `bp-drawable` — the R310 lesson:
 *    Chromium's style invalidation for class/attr changes does not
 *    reach SVG elements matched via [pathLength] attribute
 *    selectors; the class-based selectors are the reliable path.
 *  · Zero raw colors — the pl-* classes ride the tokens (landing.css).
 *  · `role="img"` + a full Arabic description — the plan is
 *    informative without any pointer interaction.
 */

/* The plan's own frame — the single coordinate space for the journey
 * overlays (rings/callouts re-anchored here by JourneyScene). */
export const PLAN_VB = { w: 1200, h: 760 } as const;

/* A door opening + its quarter-circle swing arc (the plan grammar). */
function Door({
  x,
  y,
  w,
  h,
  hinge,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  /** which corner the hinge sits on: 'tl' | 'tr' | 'bl' | 'br' */
  hinge: 'tl' | 'tr' | 'bl' | 'br';
}) {
  const r = Math.min(w, h);
  let arc: string;
  let leaf: string;
  if (hinge === 'tl') {
    leaf = `M ${x} ${y} L ${x} ${y + h}`;
    arc = `M ${x} ${y + h} A ${r} ${r} 0 0 1 ${x + w} ${y}`;
  } else if (hinge === 'tr') {
    leaf = `M ${x + w} ${y} L ${x + w} ${y + h}`;
    arc = `M ${x} ${y} A ${r} ${r} 0 0 1 ${x + w} ${y + h}`;
  } else if (hinge === 'bl') {
    leaf = `M ${x} ${y + h} L ${x} ${y}`;
    arc = `M ${x} ${y} A ${r} ${r} 0 0 0 ${x + w} ${y + h}`;
  } else {
    leaf = `M ${x + w} ${y + h} L ${x + w} ${y}`;
    arc = `M ${x + w} ${y} A ${r} ${r} 0 0 0 ${x} ${y + h}`;
  }
  return (
    <g className="pl-door-g" aria-hidden="true">
      <path className="bp-hair bp-drawable" d={leaf} pathLength={1} />
      <path className="bp-hair bp-drawable" d={arc} pathLength={1} />
    </g>
  );
}

/* A window run — the triple-line drafting symbol inside a wall gap. */
function Win({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  const mid = h > w ? x + w / 2 : y + h / 2;
  return (
    <g className="bp-hair" aria-hidden="true">
      {h > w ? (
        <>
          <line className="bp-drawable" x1={x} y1={y} x2={x} y2={y + h} pathLength={1} />
          <line className="bp-drawable" x1={mid} y1={y} x2={mid} y2={y + h} pathLength={1} />
          <line className="bp-drawable" x1={x + w} y1={y} x2={x + w} y2={y + h} pathLength={1} />
        </>
      ) : (
        <>
          <line className="bp-drawable" x1={x} y1={y} x2={x + w} y2={y} pathLength={1} />
          <line className="bp-drawable" x1={x} y1={mid} x2={x + w} y2={mid} pathLength={1} />
          <line className="bp-drawable" x1={x} y1={y + h} x2={x + w} y2={y + h} pathLength={1} />
        </>
      )}
    </g>
  );
}

/* A lecture/exam seat row tick or desk — the repeated plan marks. */
function Seat({ x, y, w = 22, h = 10 }: { x: number; y: number; w?: number; h?: number }) {
  return <rect className="bp-hair bp-drawable" x={x} y={y} width={w} height={h} pathLength={1} />;
}

export function LearningPlanDrawing() {
  return (
    <svg
      className="bp-svg jt-plan"
      viewBox={`0 0 ${PLAN_VB.w} ${PLAN_VB.h}`}
      role="img"
      aria-label="مسطح معماري لطابق التعلّم في مدارك: قاعة محاضرات بصفوف مدرّجة ومنصة، قاعة اختبارات بمصافّ منظمة، غرفة إتقان مدرّجة، كشك نقطة فحص، مكتبة بأرفف وطاولة قراءة، واستقبال — حول ممر مركزي يمتد من المدخل يمينًا إلى غرفة الإتقان يسارًا، مع شبكة أعمدة وسلاسل أبعاد ومسار متقطّع بأسهم عند كل باب"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* ═══ the envelope — double-line walls + the corridor spine ═══ */}
      <g className="pl-l-envelope" aria-hidden="true">
        {/* outer + inner wall lines */}
        <rect className="bp-ink bp-drawable" x="70" y="70" width="1060" height="620" pathLength={1} />
        <rect className="bp-ink bp-drawable" x="78" y="78" width="1044" height="604" pathLength={1} />
        {/* the corridor walls (double-line) with door gaps drawn as segments */}
        {/* north corridor wall — gaps at lecture/exam/mastery doors */}
        <line className="bp-ink bp-drawable" x1="78" y1="392" x2="250" y2="392" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="290" y1="392" x2="500" y2="392" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="540" y1="392" x2="640" y2="392" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="680" y1="392" x2="830" y2="392" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="870" y1="392" x2="960" y2="392" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="1000" y1="392" x2="1122" y2="392" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="78" y1="400" x2="250" y2="400" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="290" y1="400" x2="500" y2="400" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="540" y1="400" x2="640" y2="400" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="680" y1="400" x2="830" y2="400" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="870" y1="400" x2="960" y2="400" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="1000" y1="400" x2="1122" y2="400" pathLength={1} />
        {/* south corridor wall — gaps at checkpoint/library/reception doors */}
        <line className="bp-ink bp-drawable" x1="78" y1="460" x2="150" y2="460" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="190" y1="460" x2="500" y2="460" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="540" y1="460" x2="830" y2="460" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="870" y1="460" x2="1122" y2="460" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="78" y1="468" x2="150" y2="468" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="190" y1="468" x2="500" y2="468" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="540" y1="468" x2="830" y2="468" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="870" y1="468" x2="1122" y2="468" pathLength={1} />
        {/* zone partition walls (north) */}
        <rect className="bp-ink bp-drawable" x="416" y="78" width="8" height="314" pathLength={1} />
        <rect className="bp-ink bp-drawable" x="756" y="78" width="8" height="314" pathLength={1} />
        {/* zone partition walls (south) */}
        <rect className="bp-ink bp-drawable" x="296" y="468" width="8" height="192" pathLength={1} />
        <rect className="bp-ink bp-drawable" x="756" y="468" width="8" height="192" pathLength={1} />
        {/* the main entry — an opening in the right wall + door */}
        <line className="bp-hair bp-drawable" x1="1114" y1="404" x2="1114" y2="456" pathLength={1} />
        <Door x={1114} y={404} w={50} h={52} hinge="bl" />
        {/* window runs — the triple-line symbols on the outer walls */}
        <Win x={200} y={70} w={90} h={8} />
        <Win x={440} y={70} w={90} h={8} />
        <Win x={680} y={70} w={90} h={8} />
        <Win x={920} y={70} w={90} h={8} />
        <Win x={70} y={200} w={8} h={80} />
        <Win x={70} y={480} w={8} h={80} />
        <Win x={200} y={682} w={90} h={8} />
        <Win x={440} y={682} w={90} h={8} />
        <Win x={680} y={682} w={90} h={8} />
        <Win x={1130} y={200} w={8} h={80} />
        {/* the column grid — dashed lines + lettered bubbles */}
        {[180, 300, 420, 540, 660, 780, 900, 1020].map((x, i) => (
          <g key={x} className="bp-hair">
            <line className="bp-gridline bp-drawable" x1={x} y1="78" x2={x} y2="682" pathLength={1} />
            <circle className="bp-drawable" cx={x} cy="56" r="9" pathLength={1} />
            <text className="bp-micro" x={x} y="59.5" textAnchor="middle">
              {String.fromCharCode(65 + i)}
            </text>
          </g>
        ))}
        {[180, 300, 540, 660].map((y, i) => (
          <g key={y} className="bp-hair">
            <line className="bp-gridline bp-drawable" x1="78" y1={y} x2="1122" y2={y} pathLength={1} />
            <circle className="bp-drawable" cx="52" cy={y} r="9" pathLength={1} />
            <text className="bp-micro" x="52" y={y + 3.5} textAnchor="middle">
              {i + 1}
            </text>
          </g>
        ))}
      </g>

      {/* ═══ zone: قاعة المحاضرات — raked seating + stage (stage 0) ═══ */}
      <g className="pl-l-lecture" aria-hidden="true">
        <rect className="pl-zone" data-zone="lecture" x="764" y="79" width="350" height="313" />
        {/* the stage platform + screen wall (reading start, RTL) */}
        <rect className="bp-fill bp-drawable" x="1058" y="180" width="48" height="140" pathLength={1} />
        <line className="bp-ink bp-ink-2 bp-drawable" x1="1110" y1="180" x2="1110" y2="320" pathLength={1} />
        <line className="bp-hair bp-drawable" x1="1064" y1="250" x2="1100" y2="250" pathLength={1} />
        {/* raked seating — four concentric arcs facing the stage */}
        {[300, 262, 224, 186].map((r) => (
          <path
            key={r}
            className="bp-hair bp-drawable"
            d={`M 1110 ${250 - r} A ${r} ${r} 0 0 1 1110 ${250 + r}`}
            pathLength={1}
          />
        ))}
        {/* seat ticks on the front row */}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => {
          const a = -0.45 + i * 0.15;
          const cx = 1110 - 186 * Math.cos(a);
          const cy = 250 + 186 * Math.sin(a);
          return <Seat key={i} x={cx - 11} y={cy - 5} />;
        })}
        {/* zone doors from the corridor */}
        <Door x={830} y={392} w={40} h={48} hinge="tl" />
        <Door x={960} y={392} w={40} h={48} hinge="tr" />
        {/* the AV niche + the attendance sensor mark */}
        <rect className="bp-hair bp-drawable" x="790" y="100" width="26" height="16" pathLength={1} />
        <rect className="bp-signal-fill bp-drawable" x={824} y={104} width="8" height="8" pathLength={1} />
        {/* zone label + area */}
        <text className="pl-name" x="930" y="126" textAnchor="middle">قاعة المحاضرات</text>
        <text className="bp-micro" x="930" y="142" textAnchor="middle">240 M2</text>
      </g>

      {/* ═══ zone: كشك نقطة الفحص — counter + queue (stage 1) ═══ */}
      <g className="pl-l-checkpoint" aria-hidden="true">
        <rect className="pl-zone" data-zone="checkpoint" x="764" y="469" width="350" height="191" />
        {/* the counter */}
        <rect className="bp-fill bp-drawable" x="880" y="530" width="170" height="16" pathLength={1} />
        {/* queue dots */}
        {[0, 1, 2, 3, 4].map((i) => (
          <circle key={i} className="bp-hair bp-drawable" cx={905 + i * 26} cy={590} r="4" pathLength={1} />
        ))}
        {/* the display panel + the device symbol */}
        <rect className="bp-hair bp-drawable" x="1040" y="490" width="40" height="24" pathLength={1} />
        <line className="bp-hair bp-drawable" x1="1040" y1="514" x2="1080" y2="490" pathLength={1} />
        {/* the checkpoint signal — the ONE orange mark in this zone */}
        <rect className="bp-signal-fill bp-drawable" x="918" y="534" width="8" height="8" pathLength={1} />
        <Door x={830} y={410} w={40} h={50} hinge="bl" />
        <text className="pl-name" x="930" y="622" textAnchor="middle">نقطة الفحص</text>
        <text className="bp-micro" x="930" y="638" textAnchor="middle">36 M2</text>
      </g>

      {/* ═══ zone: قاعة الاختبار — the desk grid (stage 2) ═══ */}
      <g className="pl-l-exam" aria-hidden="true">
        <rect className="pl-zone" data-zone="exam" x="424" y="79" width="332" height="313" />
        {/* the desk grid — 5 columns × 4 rows */}
        {[0, 1, 2, 3].map((row) =>
          [0, 1, 2, 3, 4].map((col) => (
            <Seat key={`${row}-${col}`} x={456 + col * 58} y={140 + row * 56} w={26} h={16} />
          )),
        )}
        {/* the invigilator desk */}
        <rect className="bp-fill bp-drawable" x="666" y="240" width="16" height="80" pathLength={1} />
        {/* the wall clock symbol */}
        <circle className="bp-fill bp-drawable" cx="446" cy="98" r="10" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="446" y1="98" x2="446" y2="91" pathLength={1} />
        <line className="bp-ink bp-drawable" x1="446" y1="98" x2="451" y2="101" pathLength={1} />
        <Door x={500} y={392} w={40} h={48} hinge="tl" />
        <Door x={640} y={392} w={40} h={48} hinge="tr" />
        <text className="pl-name" x="590" y="126" textAnchor="middle">قاعة الاختبار</text>
        <text className="bp-micro" x="590" y="142" textAnchor="middle">150 M2</text>
      </g>

      {/* ═══ zone: المكتبة — shelves + reading table (stage 2) ═══ */}
      <g className="pl-l-library" aria-hidden="true">
        <rect className="pl-zone" data-zone="library" x="304" y="469" width="452" height="191" />
        {/* shelf runs with book ticks */}
        <rect className="bp-fill bp-drawable" x="360" y="506" width="330" height="12" pathLength={1} />
        <rect className="bp-fill bp-drawable" x="360" y="542" width="330" height="12" pathLength={1} />
        <rect className="bp-fill bp-drawable" x="360" y="578" width="330" height="12" pathLength={1} />
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={`a${i}`} className="bp-hair bp-drawable" x1={376 + i * 40} y1="506" x2={376 + i * 40} y2="518" pathLength={1} />
        ))}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <line key={`b${i}`} className="bp-hair bp-drawable" x1={376 + i * 40} y1="542" x2={376 + i * 40} y2="554" pathLength={1} />
        ))}
        {/* the reading table + chairs */}
        <circle className="bp-hair bp-drawable" cx="380" cy="622" r="18" pathLength={1} />
        {[0, 90, 180, 270].map((deg) => {
          const a = (deg * Math.PI) / 180;
          return (
            <rect
              key={deg}
              className="bp-hair bp-drawable"
              x={380 + 26 * Math.cos(a) - 5}
              y={622 + 26 * Math.sin(a) - 5}
              width="10"
              height="10"
              pathLength={1}
            />
          );
        })}
        {/* the service counter */}
        <rect className="bp-fill bp-drawable" x="700" y="500" width="14" height="70" pathLength={1} />
        <Door x={500} y={410} w={40} h={50} hinge="tl" />
        <text className="pl-name" x="530" y="648" textAnchor="middle">المكتبة والبحوث</text>
        <text className="bp-micro" x="530" y="662" textAnchor="middle">96 M2</text>
      </g>

      {/* ═══ zone: غرفة الإتقان — the stepped seminar (stage 3) ═══ */}
      <g className="pl-l-mastery" aria-hidden="true">
        <rect className="pl-zone" data-zone="mastery" x="79" y="79" width="337" height="313" />
        {/* the stepped rows facing the west focus wall */}
        {[0, 1, 2].map((i) => (
          <rect
            key={i}
            className="bp-hair bp-drawable"
            x={150 + i * 62}
            y={130 + i * 26}
            width={200 - i * 62}
            height={190 - i * 52}
            pathLength={1}
          />
        ))}
        {/* the focus screen + the mentor mark */}
        <line className="bp-ink bp-ink-2 bp-drawable" x1="90" y1="170" x2="90" y2="330" pathLength={1} />
        <circle className="bp-hair bp-drawable" cx="120" cy="250" r="12" pathLength={1} />
        {/* the mastery ladder — five ascending steps along the north wall */}
        {[0, 1, 2, 3, 4].map((i) => (
          <rect key={i} className="bp-hair bp-drawable" x={110 + i * 34} y={100 + (4 - i) * 7} width="30" height={8 + (4 - i) * 7} pathLength={1} />
        ))}
        <Door x={250} y={392} w={40} h={48} hinge="tl" />
        <text className="pl-name" x="248" y="126" textAnchor="middle">غرفة الإتقان</text>
        <text className="bp-micro" x="248" y="142" textAnchor="middle">84 M2</text>
      </g>

      {/* ═══ zone: الاستقبال — reception + bench (stage 3) ═══ */}
      <g className="pl-l-entry" aria-hidden="true">
        {/* the L reception counter */}
        <rect className="bp-fill bp-drawable" x="100" y="560" width="120" height="14" pathLength={1} />
        <rect className="bp-fill bp-drawable" x="206" y="560" width="14" height="60" pathLength={1} />
        {/* the waiting bench */}
        <rect className="bp-hair bp-drawable" x="110" y="620" width="70" height="12" pathLength={1} />
        {/* planters */}
        <circle className="bp-hair bp-drawable" cx="260" cy="620" r="12" pathLength={1} />
        <circle className="bp-hair bp-drawable" cx="260" cy="650" r="9" pathLength={1} />
        <Door x={150} y={410} w={40} h={50} hinge="tl" />
        <text className="pl-name" x="196" y="516" textAnchor="middle">الاستقبال</text>
      </g>

      {/* ═══ the annotations — journey path + stations + dims (stage 3) ═══ */}
      <g className="pl-l-annot" aria-hidden="true">
        {/* the journey path — the corridor spine, RTL */}
        <line className="bp-dash bp-dash-2 bp-drawable" x1="1118" y1="430" x2="120" y2="430" pathLength={1} />
        <polyline className="bp-ink bp-drawable" points="130,424 118,430 130,436" pathLength={1} />
        {/* branch arrows at each zone door */}
        {[
          [850, 392, 850, 416],
          [850, 468, 850, 448],
          [520, 392, 520, 416],
          [520, 468, 520, 448],
          [270, 392, 270, 416],
        ].map(([x1, y1, x2, y2]) => (
          <line key={`${x1}-${y1}`} className="bp-hair bp-drawable" x1={x1} y1={y1} x2={x2} y2={y2} pathLength={1} />
        ))}
        {/* station markers at the doors — [NN] in mono */}
        <text className="bp-micro pl-station" data-station="0" x="850" y="384" textAnchor="middle">[01]</text>
        <text className="bp-micro pl-station" data-station="1" x="850" y="492" textAnchor="middle">[02]</text>
        <text className="bp-micro pl-station" data-station="2" x="520" y="384" textAnchor="middle">[03]</text>
        <text className="bp-micro pl-station" data-station="3" x="520" y="492" textAnchor="middle">[04]</text>
        <text className="bp-micro pl-station" data-station="4" x="270" y="384" textAnchor="middle">[05]</text>
        {/* the dimension chains — overall width + height */}
        <g className="bp-hair">
          <line className="bp-drawable" x1="70" y1="712" x2="1130" y2="712" pathLength={1} />
          {[70, 420, 760, 1130].map((x) => (
            <line key={x} className="bp-drawable" x1={x - 4} y1="716" x2={x + 4} y2="708" pathLength={1} />
          ))}
          <line className="bp-drawable" x1="70" y1="682" x2="70" y2="720" pathLength={1} />
          <line className="bp-drawable" x1="420" y1="682" x2="420" y2="716" pathLength={1} />
          <line className="bp-drawable" x1="760" y1="682" x2="760" y2="716" pathLength={1} />
          <line className="bp-drawable" x1="1130" y1="682" x2="1130" y2="720" pathLength={1} />
        </g>
        <text className="bp-micro" x="245" y="730" textAnchor="middle">11.6M</text>
        <text className="bp-micro" x="590" y="730" textAnchor="middle">11.3M</text>
        <text className="bp-micro" x="945" y="730" textAnchor="middle">12.3M</text>
        {/* the vertical overall dim */}
        <g className="bp-hair">
          <line className="bp-drawable" x1="36" y1="70" x2="36" y2="690" pathLength={1} />
          <line className="bp-drawable" x1="32" y1="70" x2="40" y2="70" pathLength={1} />
          <line className="bp-drawable" x1="32" y1="690" x2="40" y2="690" pathLength={1} />
        </g>
        <text className="bp-micro" x="28" y="384" textAnchor="end">20.6M</text>
        {/* the sheet title block */}
        <text className="bp-micro" x="1130" y="48" textAnchor="end">MDRK · LEARNING FLOOR · PLAN</text>
        <text className="bp-micro" x="70" y="48">SCALE 1:150 · UNITS M</text>
        {/* the plan's north arrow */}
        <g className="bp-hair">
          <circle className="bp-drawable" cx="1108" cy="730" r="12" pathLength={1} />
          <polyline className="bp-drawable" points="1108,738 1103,726 1108,729 1113,726" pathLength={1} />
        </g>
      </g>
    </svg>
  );
}
