import { router } from "expo-router";
import { Assistant } from "@/features/ai/Assistant";

/**
 * Pushed: /teacher/ai — the AI academic assistant with the honest provider
 * badge. R331 A-App-Shell: no longer a fake "tab" wrapping itself in a
 * per-screen bar — it pushes OVER the persistent (tabs) shell (bar hidden,
 * stack depth) and carries its own back affordance; the tab below keeps its
 * state alive for the return trip.
 */
export default function Ai() {
  return <Assistant stacked onBack={() => router.back()} />;
}
