/**
 * The working-drawing family's shared chrome — the r362 integration seal.
 *
 * r359 (TechnicalSheet) and r360 (TechnicalPlate) each drew the same
 * registration frame, measurement grid, north marker, title block and
 * surface wrapper — the jscpd ratchet caught the copies (r362 baseline:
 * 196 → 198). One family, one ink grammar: the chrome lives HERE, once,
 * and both sheets mount it. The markup is byte-identical to the
 * r359/r360 originals so screenshots and conformance captures stay
 * stable.
 *
 * Ink law (inherited from the r359 sheet contract): no raw colors, no
 * shadows, no gradients — every stroke rides the tp-* classes that
 * styles/technical-sheet.css owns.
 *
 * Public surface (everything else is module-private by design — the
 * knip ratchet rejects growth in unused exports):
 *  · SheetSurface    — the div + svg + description + frame + grid mount
 *  · SheetNorth      — the north marker + N caption
 *  · SheetTitleBlock — the title block, caller-owned values
 */
import { useId, type ReactNode } from 'react';

/** The 40px module the whole drafting family is drawn on. */
const GRID_X = Array.from({ length: 9 }, (_, i) => 40 + i * 40);
const GRID_Y = Array.from({ length: 13 }, (_, i) => 40 + i * 40);

/** The decorative-by-default / promotable drawing pattern: omit `label`
 *  and the drawing never enters the accessibility tree; supply one and
 *  it becomes a described role="img". */
function useSheetA11y(label?: string) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const titleId = `tp-title-${uid}`;
  const descId = `tp-desc-${uid}`;
  const a11y = label
    ? { role: 'img' as const, 'aria-labelledby': `${titleId} ${descId}` }
    : { 'aria-hidden': true as const, focusable: 'false' as const };
  return { titleId, descId, a11y };
}

/** The <title>/<desc> pair — rendered only when a label promotes the drawing. */
function SheetDescription({
  titleId,
  descId,
  label,
}: {
  titleId: string;
  descId: string;
  label?: string;
}) {
  if (!label) return null;
  return (
    <>
      <title id={titleId}>لوحة رسم هندسية</title>
      <desc id={descId}>{label}</desc>
    </>
  );
}

/** 00 · the sheet frame + registration crosses. */
function SheetFrame() {
  return (
    <g className="tp-frame" aria-hidden>
      <rect x="8" y="8" width="384" height="544" />
      <path d="M8 20v-12h12M392 20v-12h-12M8 540v12h12M392 540v12h-12" />
    </g>
  );
}

/** 01 · the background measurement grid. */
function SheetGrid() {
  return (
    <g className="tp-grid" aria-hidden>
      {GRID_X.map((x) => (
        <line key={`gx-${x}`} x1={x} y1="24" x2={x} y2="472" pathLength={1} />
      ))}
      {GRID_Y.map((y) => (
        <line key={`gy-${y}`} x1="24" y1={y} x2="376" y2={y} pathLength={1} />
      ))}
    </g>
  );
}

/**
 * The surface every working drawing mounts on: the promotable root
 * (decorative by default), the one deterministic SVG, the description
 * pair, the registration frame and the measurement grid — then the
 * caller's layers on top.
 */
export function SheetSurface({
  label,
  baseClasses,
  className,
  children,
}: {
  /** Arabic description — omit for decorative chrome (aria-hidden). */
  label?: string;
  /** the drawing's own marker classes (e.g. technical-sheet--plan). */
  baseClasses: string[];
  className?: string;
  children: ReactNode;
}) {
  const { titleId, descId, a11y } = useSheetA11y(label);
  const classes = [...baseClasses];
  if (className) classes.push(className);
  return (
    <div className={classes.join(' ')} {...a11y}>
      <svg viewBox="0 0 400 560" preserveAspectRatio="xMidYMid meet" focusable="false">
        <SheetDescription titleId={titleId} descId={descId} label={label} />
        {/* ── 00 · sheet frame + registration crosses ─────────────── */}
        <SheetFrame />
        {/* ── 01 · background grid ────────────────────────────────── */}
        <SheetGrid />
        {children}
      </svg>
    </div>
  );
}

/** The north marker + its N caption (rides inside a tp-note group). */
export function SheetNorth() {
  return (
    <>
      <g className="tp-north">
        <circle cx="344" cy="46" r="11" />
        <path d="M344 38v16M338 46h12" />
        <path d="M344 38l-4 7h8z" />
      </g>
      <text className="tp-text" x="344" y="72" textAnchor="middle">
        N
      </text>
    </>
  );
}

/**
 * 08 · the title block — brand column, drawing code/sheet, name/scale.
 * Every value is caller-owned; the family shares only the geometry.
 */
export function SheetTitleBlock({
  code,
  name,
  scale,
  sheet = '01 / 04',
}: {
  code: string;
  name: string;
  scale: string;
  sheet?: string;
}) {
  return (
    <g className="tp-title" aria-hidden>
      <line x1="24" y1="488" x2="376" y2="488" pathLength={1} />
      <line x1="196" y1="488" x2="196" y2="536" pathLength={1} />
      <line x1="300" y1="488" x2="300" y2="536" pathLength={1} />
      <text className="tp-text tp-text--strong" x="32" y="508">
        MADAREK
      </text>
      <text className="tp-text" x="32" y="524">
        SMART LEARNING
      </text>
      <text className="tp-text" x="204" y="508">
        {code}
      </text>
      <text className="tp-text" x="204" y="524">
        {sheet}
      </text>
      <text className="tp-text" x="308" y="508">
        {name}
      </text>
      <text className="tp-text" x="308" y="524">
        {scale}
      </text>
    </g>
  );
}
