/**
 * R334 3-a — the tab bar's immersive-hide policy.
 *
 * The persistent bar NEVER unmounts (R331 A-App-Shell contract, pinned by
 * src/test/navigation-stability.test.tsx). Some routes are full-bleed
 * experiences where the bar is noise: the lecture player, the exam runner,
 * and — while the keyboard is up — the assistant chat composer tab. There
 * the bar ANIMATES away (reanimated translateY on the UI thread,
 * transform-only per the motion contract) and slides back on exit.
 *
 * WIRING DISCIPLINE: the policy is ROUTE-driven and is wired ONLY from the
 * shell layouts (`app/<role>/(tabs)/_layout.tsx` via `useImmersiveTabBar()`).
 * Screen files never call it — a screen cannot hide the shell chrome it
 * doesn't own (the assistant/player/exam screens are owned by other
 * branches anyway).
 *
 * How it works: `useSegments()` (expo-router GLOBAL route state) reports the
 * currently focused route from ANY still-mounted layout — including the
 * (tabs) layouts sitting UNDER a pushed detail screen. Detail routes
 * (lectures/[lectureId], online-exams/[templateId]) push OVER the bar from
 * the parent role Stack, so they cover it anyway; hiding there additionally
 * keeps the bar from peeking during the push/pop transition frames and
 * guarantees no overlap if a detail screen ever runs a transparent
 * contentStyle. The chat-composer case is the in-tab one that actually
 * changes layout: while the keyboard is open on /student/ai the bar leaves
 * the flow (position flip — the same mechanism the stock UIKit bar uses
 * when hidden) so the composer owns the bottom edge.
 *
 * Honesty: `tsc`-verified + unit-pinned (segment matchers + bar contract);
 * the animated feel is device-UNVERIFIED (no emulator in this sandbox).
 */
import { useSegments } from "expo-router";
import { useKeyboardState } from "react-native-keyboard-controller";

/** A segment matcher: receives the GLOBAL focused-route segments. */
export type SegmentMatcher = (segments: readonly string[]) => boolean;

/**
 * Routes that ALWAYS hide the bar while focused.
 *
 *  · /student/lectures/[lectureId] — مشغّل المحاضرة (fullscreen video)
 *  · /student/online-exams/[templateId] — غرفة الاختبار (timer + questions)
 *
 * `s.length >= 3` is what separates the DYNAMIC detail route from its
 * parent list route (/student/online-exams — the exam CENTER list — keeps
 * the bar; the RUNNER hides it).
 */
export const IMMERSIVE_ROUTE_MATCHERS: readonly SegmentMatcher[] = [
  (s) => s[0] === "student" && s[1] === "lectures" && s.length >= 3,
  (s) => s[0] === "student" && s[1] === "online-exams" && s.length >= 3,
];

/**
 * In-tab COMPOSER routes: the bar hides only while the KEYBOARD is open
 * (typing), and returns the moment it closes — the tab itself stays
 * navigable. Today that's the student assistant tab /student/ai.
 */
export const COMPOSER_ROUTE_MATCHERS: readonly SegmentMatcher[] = [
  (s) => s[0] === "student" && s[1] === "ai",
];

/** Does this focused route always want the bar hidden? */
export function isImmersiveRoute(segments: readonly string[]): boolean {
  return IMMERSIVE_ROUTE_MATCHERS.some((matches) => matches(segments));
}

/** Is this focused route an in-tab chat composer? */
export function isComposerRoute(segments: readonly string[]): boolean {
  return COMPOSER_ROUTE_MATCHERS.some((matches) => matches(segments));
}

/**
 * The ONE hook the (tabs) layouts consume — wires the global route state +
 * keyboard visibility into a single `hidden` boolean for `RoleTabBar`.
 * (Kept in the shell so every role layout imports the same policy.)
 */
export function useImmersiveTabBar(): boolean {
  const segments = useSegments();
  const { isVisible: keyboardVisible } = useKeyboardState();
  return isImmersiveRoute(segments) || (keyboardVisible && isComposerRoute(segments));
}
