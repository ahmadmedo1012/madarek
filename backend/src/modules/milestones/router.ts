/**
 * Milestones module — `POST /api/v1/me/milestones/:id/fire`.
 *
 * Implemented in T129..T132 per
 * specs/012-design-graphics-uplift/contracts/onboarding-milestone.md.
 *
 * Milestone IDs (V1 fixed catalogue):
 *   - first-assignment-complete
 *   - first-course-complete
 *   - exam-window-opens:<windowId>
 */
import { Router } from 'express';

export const milestonesRouter = Router();

export const MILESTONE_ID_PATTERN =
  /^(first-assignment-complete|first-course-complete|exam-window-opens:[a-zA-Z0-9_-]+)$/;
