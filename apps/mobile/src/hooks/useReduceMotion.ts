import { useEffect, useState } from "react";
import { AccessibilityInfo } from "react-native";

/**
 * prefers-reduced-motion — every animated affordance in the app reads this
 * once and degrades to a static (or opacity-only) presentation. The Heron
 * loaders converge instantly instead of animating (B2 rule).
 */
export function useReduceMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let sub: { remove: () => void } | null = null;
    try {
      sub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduced);
    } catch {
      /* some contexts (tests) have no accessibility bridge */
    }
    AccessibilityInfo.isReduceMotionEnabled()
      .then(setReduced)
      .catch(() => undefined);
    return () => sub?.remove();
  }, []);
  return reduced;
}
