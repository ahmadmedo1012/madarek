import { Assistant } from "@/features/ai/Assistant";

/**
 * Tab «المساعد» — the AI academic assistant (student framing: explain /
 * quiz / summarize within the institution's scope). The feature owns the
 * whole surface; this wrapper stays thin (route-inventory: the 12
 * feature-wrapper routes).
 */
export default function Ai() {
  return <Assistant role="student" />;
}
