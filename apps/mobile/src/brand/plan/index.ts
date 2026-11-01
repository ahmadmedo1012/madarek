/**
 * plan — the R330 signature library (توقيع مدارك البصري).
 *
 * Four drafted sheets in the website's architectural-plan language:
 * hairline ink (stroke 1–1.5), lettered axis scaffolds, dimension
 * ticks, 45° hatch, double-drafted walls — and exactly ONE orange
 * signal per sheet. Every sheet draws itself in progressively via
 * usePlanDraw (strokeDash reveal, ~900ms heron ease-out) when
 * `autoplay` is set, honours `progress` for controlled reveals, and
 * renders fully drawn by default.
 *
 *   <PlanBuilding autoplay />   — facade elevation (hero sheet)
 *   <PlanLectureHall />         — desks in arcs facing the screen wall
 *   <PlanExamHall />            — desk grid + the checkpoint dot
 *   <PlanLibrary />             — shelf walls + reading tables
 */
export { PLAN_ASPECT, PLAN_VIEWBOX } from "./types";
export type { PlanArtProps, PlanDash, PlanDrawHandle, PlanProgress } from "./types";
export { usePlanDraw } from "./usePlanDraw";
export { PlanBuilding } from "./PlanBuilding";
export { PlanLectureHall } from "./PlanLectureHall";
export { PlanExamHall } from "./PlanExamHall";
export { PlanLibrary } from "./PlanLibrary";
