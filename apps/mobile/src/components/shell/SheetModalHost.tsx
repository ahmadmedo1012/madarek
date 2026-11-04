import type { ReactNode } from "react";

/**
 * R334 3-a (audit round 2) — the app-root sheet host.
 *
 * `BottomSheetModalProvider` is now AVAILABLE at the root layout: any
 * consumer that renders a `BottomSheetModal` directly (not just the
 * `AppSheet` wrappers) finds a provider ancestor, per the shell spec.
 *
 * WHY THE MODULE IS REQUIRED LAZILY (the render-net regression fix, kept):
 * `ui/sheet.tsx` loads `@gorhom/bottom-sheet` (and RNGH v3) on FIRST SHEET
 * RENDER precisely so the UI barrel never pulls RNGH's import-time native
 * install into the jest nets. This host follows the same pattern for the
 * same reason — the require below executes at first ROOT render on device
 * (Metro caches it after that), and jest never imports `_layout` files
 * (the render net skips them), so the nets stay green either way.
 *
 * NESTING NOTE: `AppSheet` keeps its own per-sheet provider (2-c's file,
 * untouched here — dropping it is 2-c's call). @gorhom/bottom-sheet v5
 * modals bind to the NEAREST provider context, so each AppSheet still uses
 * its own host and queue; this root provider serves direct consumers and
 * costs one inert `pointerEvents="box-none"` hosting container.
 */
function bs(): typeof import("@gorhom/bottom-sheet") {
  // eslint-disable-next-line @typescript-eslint/no-require-imports -- lazy load keeps the sheet engine out of the root module graph (same fix as ui/sheet.tsx)
  return require("@gorhom/bottom-sheet");
}

/**
 * Mounts `BottomSheetModalProvider` around the app's navigator subtree.
 * Render once, high in the tree (see `app/_layout.tsx`).
 */
export function RootSheetModalProvider({ children }: { children: ReactNode }) {
  const { BottomSheetModalProvider } = bs();
  return <BottomSheetModalProvider>{children}</BottomSheetModalProvider>;
}
