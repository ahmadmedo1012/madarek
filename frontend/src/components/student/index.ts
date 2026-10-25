/* Agent G1 (DASHBOARD) student sheet components — R319 §B2 barrel.
 * Page-scoped to /student/dashboard (DashboardPage.tsx). */
export { SectionBar, BarCount } from './SectionBar';
export { RulerGauge, semesterWeeks } from './RulerGauge';
export { CourseBar } from './CourseBar';
export { StatusChip, dueChip, dueDays, STATUS_CHIP_TONES } from './StatusChip';
export type { StatusChipTone } from './StatusChip';
export { WeekStrip } from './WeekStrip';
export { EmptyCell } from './EmptyCell';
/* R319 (c2-G1): StudentSheet was retired pre-wire — the shared shell
 * (C2-G2's SheetFrame + SheetGrain + PageHeader ambient sheet code)
 * now owns the frame/grain/SHEET S-01 register on every authenticated
 * route, so a page-level twin would double-draw the chrome. */
