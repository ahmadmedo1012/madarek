/**
 * drawKit — r362 (Agent 3) · the interactive family's shared utensils.
 *
 * The window helper + the TiNode seat, shared by ConceptField and
 * RouteSurvey so the two drawings never duplicate the machinery (the
 * jscpd ratchet's law: one grammar, one seat) and every export stays
 * consumed (the knip ratchet's law).
 *
 * The window contract (technical-interactive.css owns the engine):
 *  · `win(a, b)` rides an element (or a wrapper group — dashoffset and
 *    dasharray are INHERITED svg properties) as inline `--a`/`--b`.
 *  · The drawing's root carries its progress var (--cf-p / --cr-p,
 *    written imperatively by the section's scroll driver; default 1 =
 *    the finished drawing — JS-off and reduced-motion both ship the
 *    complete sheet, the reveals family's own law).
 *  · A solid stroke draws through `ti-draw` (dashoffset 1 → 0 inside
 *    the window); a dashed or textured stroke fades through `ti-fade`
 *    (its own dasharray would be clobbered by the draw technique).
 *
 * The TiNode seat — the ONE interactive-station implementation, on the
 * r331 HeroInspect model (hover ≠ tap): HOVER is the transient channel
 * (enter sets, leave clears — and the leave is guarded by the live
 * `hovered` prop, so the enter-before-leave race between neighbouring
 * stations never steals the highlight), TAP is the persistent channel
 * (click / Enter / Space toggles, Escape dismisses, focus mirrors
 * hover for the keyboard). aria-pressed rides ONLY the tap channel —
 * a transient hover is never a pressed state. The effective highlight
 * (tap ?? hover) lives in the drawing; the seat stays presentational.
 */
import type { CSSProperties, ReactNode } from 'react';

/**
 * A draw window: the element starts drawing at scroll progress `a`
 * and completes at `a + b` (both unitless 0..1). Numbers stay unitless
 * on purpose — React serialises custom-property numbers without a
 * unit, exactly what the calc engine consumes.
 */
export const win = (a: number, b: number): CSSProperties =>
  ({ '--a': a, '--b': b } as CSSProperties);

interface TiNodeSeat {
  /** the station's id — rides data-id and drives the CSS activation. */
  id: string;
  /** the station's Arabic name — the button's accessible label. */
  ar: string;
  /** whether the HOVER channel currently holds this station. */
  hovered: boolean;
  /** whether the TAP channel currently holds this station (aria-pressed). */
  pressed: boolean;
  /** the hover channel report: an id enters, null leaves (guarded). */
  onHover: (id: string | null) => void;
  /** the tap channel toggle — click / Enter / Space. */
  onToggle: (id: string) => void;
  /** the tap channel dismissal — Escape. */
  onDismiss: () => void;
  /** the station's own windowed drawing content (hit + mark + ring). */
  children: ReactNode;
}

/** The interactive station seat — see the module note. */
export function TiNode({
  id,
  ar,
  hovered,
  pressed,
  onHover,
  onToggle,
  onDismiss,
  children,
}: TiNodeSeat) {
  return (
    <g
      className="ti-node"
      data-id={id}
      tabIndex={0}
      role="button"
      aria-pressed={pressed}
      aria-label={ar}
      onPointerEnter={() => onHover(id)}
      onPointerLeave={() => {
        if (hovered) onHover(null);
      }}
      onFocus={() => onHover(id)}
      onBlur={() => {
        if (hovered) onHover(null);
      }}
      onClick={(e) => {
        e.preventDefault();
        onToggle(id);
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
          e.preventDefault();
          onToggle(id);
        } else if (e.key === 'Escape') {
          onDismiss();
        }
      }}
    >
      {children}
    </g>
  );
}
