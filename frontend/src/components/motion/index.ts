/**
 * Motion primitives barrel export.
 * Populated incrementally — see
 * specs/001-premium-motion-system/contracts/motion-primitives.tsx.md
 *
 * PLATFORM INVENTORY (refreshed r157 per the overlays/index.ts pattern —
 * the export now names what each primitive actually is):
 *   - useReducedMotion → the reduced-motion gate read by pages with
 *     pointer choreography (student dashboard, AI assistant, owner
 *     charts/education/governance/AI, admin sync/pages, quality,
 *     CourseDetailPage, OnlineExamsPages).
 *   - PageTransition → AppShell's route transition (the single mount).
 *   - Skeleton → RegisterPage (faculty field placeholder) +
 *     CollegePages gallery scaffolds — both already sit inside
 *     explicit aria contexts of their own; the
 *     primitive's aria-label prop is the opt-in busy cue for the
 *     consumer that needs it announced.
 *   - Reveal / RevealGroup → CourseDetailPage (PaymentPage imports
 *     Reveal) — the scroll-triggered entrance family.
 *
 * SkeletonGroup was REMOVED (r157): zero consumers ever rendered it
 * (rg-verified across src+tests), and its .skeleton-group /
 * .skeleton-still-loading CSS rules in motion.css are dead weight
 * handed to the CSS-foundations wave.
 */
export { useReducedMotion } from './useReducedMotion';
export { PageTransition } from './PageTransition';
export { Skeleton } from './Skeleton';
export type { SkeletonVariant } from './Skeleton';
export { Reveal, RevealGroup } from './Reveal';
/* r305-A2: the Heron-style cursor layer — mounted ONCE globally in
 * App.tsx (next to <ToastStack/>), not consumed per-page. Re-exported
 * here so the motion kit stays the single import surface. Contract:
 * docs/r305-heron-interactions.md */
export { CursorManager } from './CursorManager';
