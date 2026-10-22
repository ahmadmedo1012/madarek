/**
 * BlueprintSvg — «مخطط مدارك» (r306).
 *
 * The original hero artwork: a technical sectional drawing of the
 * learning system as a drafted structure — the lecture hall (reading
 * start, RTL), the checkpoint signal, the exam gate, the research
 * library wing, and the mastery tower (reading end), connected by the
 * dashed journey path. Pure SVG line work on the token system (the
 * bp-* classes live in landing.css — zero raw colors), so the artwork
 * follows both themes.
 *
 * Lives under components/landing/ — the icon-gate's documented
 * illustrative-diagram authoring zone (the same category as
 * lib/illustrations — NOT UI iconography; UI icons keep going through
 * <Icon icon={...} /> everywhere). The interactive semantics (the
 * hotspot buttons + the details panel) live OUTSIDE the drawing in
 * LandingPage; the svg itself carries role="img" + a full Arabic
 * description, so nothing is hidden behind pointer interaction.
 */
/* ══ BlueprintSvg — «مخطط مدارك» ════════════════════════════════════
 * The original r306 hero artwork: a technical sectional drawing of
 * the learning system as a drafted structure — the lecture hall
 * (reading start, RTL), the checkpoint signal, the exam gate, the
 * research library wing, and the mastery tower (reading end). Pure
 * SVG line work on the token system (zero raw colors — the classes
 * are defined in landing.css): graphite ink, construction hairlines,
 * ONE orange signal (the checkpoint flag + the active stage ring).
 * The interactive semantics live OUTSIDE the drawing (the hotspot
 * buttons + the details panel) — the drawing itself carries an
 * img role + a full Arabic description, so nothing is hidden behind
 * pointer interaction. */
export function BlueprintSvg({ active }: { active: number }) {
  const on = (i: number) => (active === i ? ' bp-on' : '');
  return (
    <svg
      className="bp-svg"
      viewBox="0 0 760 460"
      role="img"
      aria-label="مخطط تقني لمسار التعلّم في مدارك: قاعة المحاضرات، فحص نقطة التحقق، بوابة الاختبار، جناح المكتبة والبحوث، وبرج الإتقان — متصلان بمسار متقطّع يُقرأ من اليمين إلى اليسار"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* corner registration marks — the drawing sheet's own + marks */}
      <g className="bp-hair" aria-hidden="true">
        <path d="M20 30 h16 M28 22 v16"  pathLength={1} />
        <path d="M724 30 h16 M732 22 v16"  pathLength={1} />
        <path d="M20 430 h16 M28 422 v16"  pathLength={1} />
        <path d="M724 430 h16 M732 422 v16"  pathLength={1} />
      </g>

      {/* the ground line + the ruler tick strip */}
      <line className="bp-ink" x1="36" y1="402" x2="724" y2="402" aria-hidden="true"  pathLength={1} />
      <g className="bp-hair" aria-hidden="true">
        {Array.from({ length: 18 }, (_, i) => 56 + i * 38).map((x) => (
          <line key={x} x1={x} y1="402" x2={x} y2={x % 2 === 0 ? 409 : 406}  pathLength={1} />
        ))}
      </g>

      {/* ══ 01 · the lecture hall (reading start) ═════════════════ */}
      <g className={`bp-stage${on(0)}`} aria-hidden="true">
        <rect className="bp-fill" x="598" y="286" width="128" height="116"  pathLength={1} />
        <polygon className="bp-ink-fill" points="598,286 662,246 726,286"  pathLength={1} />
        {/* the screen + the play mark */}
        <rect className="bp-hair" x="614" y="306" width="30" height="20"  pathLength={1} />
        <circle className="bp-ink-fill" cx="672" cy="336" r="13"  pathLength={1} />
        <polygon className="bp-signal-fill" points="668,329 668,343 680,336"  pathLength={1} />
        {/* stepped seating */}
        <g className="bp-hair">
          <polyline points="700,372 700,360 712,360 712,344"  pathLength={1} />
          <polyline points="688,372 688,364 696,364 696,352"  pathLength={1} />
        </g>
        <text className="bp-name" x="662" y="428" textAnchor="middle">المحاضرات</text>
      </g>

      {/* ══ 02 · the checkpoint signal (the ONE orange flag) ══════ */}
      <g className={`bp-stage${on(1)}`} aria-hidden="true">
        <line className="bp-ink" x1="520" y1="402" x2="520" y2="316"  pathLength={1} />
        <line className="bp-hair" x1="512" y1="322" x2="528" y2="322"  pathLength={1} />
        <polygon className="bp-signal-fill" points="520,316 552,325 520,334"  pathLength={1} />
        {/* the checkpoint quiz card */}
        <rect className="bp-fill" x="486" y="346" width="68" height="44"  pathLength={1} />
        <line className="bp-hair" x1="496" y1="360" x2="544" y2="360"  pathLength={1} />
        <line className="bp-hair" x1="496" y1="370" x2="532" y2="370"  pathLength={1} />
        <polyline className="bp-signal" points="538,376 542,381 548,372"  pathLength={1} />
        <text className="bp-name" x="520" y="428" textAnchor="middle">نقطة الفحص</text>
      </g>

      {/* ══ 03 · the exam gate ════════════════════════════════════ */}
      <g className={`bp-stage${on(2)}`} aria-hidden="true">
        <rect className="bp-fill" x="362" y="300" width="14" height="102"  pathLength={1} />
        <rect className="bp-fill" x="424" y="300" width="14" height="102"  pathLength={1} />
        <rect className="bp-ink-fill" x="352" y="286" width="96" height="14"  pathLength={1} />
        {/* the timer dial */}
        <circle className="bp-fill" cx="400" cy="342" r="17"  pathLength={1} />
        <circle className="bp-hair" cx="400" cy="342" r="17"  pathLength={1} />
        <line className="bp-ink" x1="400" y1="342" x2="400" y2="331"  pathLength={1} />
        <line className="bp-ink" x1="400" y1="342" x2="408" y2="346"  pathLength={1} />
        {/* the threshold steps */}
        <g className="bp-hair">
          <line x1="356" y1="402" x2="356" y2="394"  pathLength={1} />
          <line x1="444" y1="402" x2="444" y2="394"  pathLength={1} />
        </g>
        <text className="bp-name" x="400" y="428" textAnchor="middle">الاختبار</text>
      </g>

      {/* ══ 04 · the research library wing ════════════════════════ */}
      <g className={`bp-stage${on(3)}`} aria-hidden="true">
        <rect className="bp-fill" x="186" y="300" width="116" height="102"  pathLength={1} />
        <line className="bp-ink" x1="186" y1="300" x2="302" y2="300"  pathLength={1} />
        {/* the parapet */}
        <line className="bp-hair" x1="182" y1="292" x2="306" y2="292"  pathLength={1} />
        {/* document lines — the papers on the shelf */}
        <g className="bp-hair">
          <line x1="198" y1="316" x2="290" y2="316"  pathLength={1} />
          <line x1="198" y1="328" x2="272" y2="328"  pathLength={1} />
          <line x1="198" y1="340" x2="284" y2="340"  pathLength={1} />
          <line x1="198" y1="352" x2="260" y2="352"  pathLength={1} />
        </g>
        {/* the bookmark */}
        <polygon className="bp-signal-fill" points="232,362 232,382 240,374 248,382 248,362"  pathLength={1} />
        {/* the annotation pin */}
        <circle className="bp-hair" cx="270" cy="370" r="8"  pathLength={1} />
        <text className="bp-name" x="244" y="428" textAnchor="middle">المكتبة والبحوث</text>
      </g>

      {/* ══ 05 · the mastery tower (reading end) ══════════════════ */}
      <g className={`bp-stage${on(4)}`} aria-hidden="true">
        <rect className="bp-fill" x="62" y="196" width="72" height="206"  pathLength={1} />
        {/* the mastery rungs — a rising ladder */}
        <g className="bp-hair">
          <line x1="72" y1="240" x2="124" y2="240"  pathLength={1} />
          <line x1="72" y1="280" x2="124" y2="280"  pathLength={1} />
          <line x1="72" y1="320" x2="124" y2="320"  pathLength={1} />
          <line x1="72" y1="360" x2="124" y2="360"  pathLength={1} />
        </g>
        {/* the rising steps */}
        <polyline className="bp-ink" points="74,362 88,330 100,300 112,268 122,242"  pathLength={1} />
        {/* the pinnacle flag — the second orange mark */}
        <line className="bp-ink" x1="98" y1="196" x2="98" y2="164"  pathLength={1} />
        <polygon className="bp-signal-fill" points="98,164 124,172 98,180"  pathLength={1} />
        <text className="bp-name" x="98" y="428" textAnchor="middle">الإتقان</text>
      </g>

      {/* ══ the journey path — dashed, reading right → left ══════ */}
      <g aria-hidden="true">
        <line className="bp-dash" x1="648" y1="440" x2="116" y2="440"  pathLength={1} />
        {/* the arrowhead (RTL: pointing left) */}
        <polyline className="bp-ink" points="124,432 112,440 124,448"  pathLength={1} />
        {/* the stage ticks connecting the path to the ground */}
        <g className="bp-hair">
          <line x1="662" y1="402" x2="662" y2="440"  pathLength={1} />
          <line x1="520" y1="402" x2="520" y2="440"  pathLength={1} />
          <line x1="400" y1="402" x2="400" y2="440"  pathLength={1} />
          <line x1="244" y1="402" x2="244" y2="440"  pathLength={1} />
          <line x1="98" y1="402" x2="98" y2="440"  pathLength={1} />
        </g>
        <text className="bp-tag" x="380" y="456" textAnchor="middle">مسار التعلّم — من المحاضرة إلى الإتقان</text>
      </g>
    </svg>
  );
}
