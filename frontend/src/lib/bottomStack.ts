/**
 * bottomStack — Y6 (R325) — the BOTTOM-STACK MANAGER.
 *
 * One coordination layer for every piece of bottom-anchored fixed chrome
 * (the consent gate · the toast stack · the feedback FAB), so the layers
 * STACK — consent bar → toast stack → FAB, each sitting ABOVE the
 * previous — instead of overlapping, with the transitions owned by CSS
 * (`inset-block-end` rides `var(--t-fast)` = 200ms in every consumer).
 *
 * ── The contract ─────────────────────────────────────────────────────
 * A layer registers its live element; the manager measures its border
 * box (ResizeObserver — the consent bar's phone expand/collapse and the
 * toast stack's enter/exit are tracked automatically, no magic numbers)
 * and writes TWO kinds of custom properties:
 *
 *   · `--app-bottom-stack` on `:root`  → the TOTAL height of the pile
 *     (the stack top: what page content / future consumers must clear).
 *   · `--app-bottom-stack` INLINE on each registered element → that
 *     layer's own base offset (the sum of every LOWER layer's height
 *     plus a seam). Inline wins the cascade over :root, so each
 *     consumer reads one uniform grammar:
 *
 *       inset-block-end: calc(var(--app-bottom-stack, 0px) + <own seat>);
 *
 *     (the consent gate is the BASE layer — offset 0 — and simply owns
 *     the seat; it registers so the layers above can clear it).
 *     P2.3 note: the toast stack (.toast-stack) reads the same var
 *     through `translate` instead — the wake-pill seat is static (it
 *     re-reads on seat changes without animating), and animating an
 *     inset is a layout-property transition the motion gate bans
 *     (4-A11 P2-10); the offset lifts the layer transform-only.
 *     Same var, same geometry.
 *
 * Generalises the r324 X1 `body:has(.cb-banner)` lift: that fix hoisted
 * the toast stack over the consent seat with hardcoded rem numbers
 * tuned to one width — wrong at any other root font-size (the fluid rem
 * root is 8.33px @1440 but 9.92px @390) and blind to the bar's real
 * height (the phone expand toggle) and to the FAB entirely. Measured
 * pixels replace all of it.
 *
 * ── Rank (the mission arrow, fixed) ──────────────────────────────────
 *   consent (base seat) → toast (above it) → fab (above toasts)
 * Material's own snackbar+FAB behaviour: the persistent button rises
 * above the transient feedback, never the reverse.
 *
 * Framework-free on purpose (the toast store precedent): React binds
 * through hooks/useBottomStackLayer.ts; this file never imports React.
 */

/** The coordinated layers, in stack rank (bottom of the pile first). */
export type BottomStackLayerId = 'consent' | 'toast' | 'fab';

/**
 * The seam between two stacked layers — --sp-3's rung (12px). A
 * coordination constant, not a design value: it only ever separates two
 * pieces of fixed chrome that must never kiss (hairlines stay legible).
 */
export const BOTTOM_STACK_SEAM_PX = 12;

const RANK: readonly BottomStackLayerId[] = ['consent', 'toast', 'fab'];

interface BottomStackEntry {
  el: HTMLElement | null;
  /** Last measured border-box height (px, rounded). */
  height: number;
}

const layers = new Map<BottomStackLayerId, BottomStackEntry>();

let observer: ResizeObserver | null = null;

function ensureObserver(): void {
  if (observer || typeof ResizeObserver === 'undefined') return;
  observer = new ResizeObserver((entries) => {
    let dirty = false;
    for (const entry of entries) {
      for (const [, layer] of layers) {
        if (layer.el === entry.target) {
          const next = Math.round(entry.target.getBoundingClientRect().height);
          if (next !== layer.height) {
            layer.height = next;
            dirty = true;
          }
        }
      }
    }
    if (dirty) recompute();
  });
}

/**
 * PURE — the stack math, exported for the unit suite. `heights` maps a
 * layer id to its measured height (0/absent = the layer is not on
 * screen). Returns each layer's base offset (what its `bottom` must add
 * its own seat to) and the stack's total top. Only PRESENT layers
 * contribute, and the seam only counts between two present layers — so
 * a lone layer always sits at offset 0 (its natural seat, exactly the
 * pre-manager geometry when nothing else is on screen).
 */
export function computeStackOffsets(heights: Partial<Record<BottomStackLayerId, number>>): {
  offsets: Record<BottomStackLayerId, number>;
  total: number;
} {
  const offsets: Record<BottomStackLayerId, number> = { consent: 0, toast: 0, fab: 0 };
  let running = 0;
  let anyPresent = false;
  for (const id of RANK) {
    const height = Math.max(0, Math.round(heights[id] ?? 0));
    if (height > 0) {
      offsets[id] = running;
      running += height + BOTTOM_STACK_SEAM_PX;
      anyPresent = true;
    } else {
      offsets[id] = anyPresent ? running : 0;
    }
  }
  const total = anyPresent ? running - BOTTOM_STACK_SEAM_PX : 0;
  return { offsets, total };
}

/** Re-measure every registered layer and rewrite the custom properties. */
function recompute(): void {
  if (typeof document === 'undefined') return;
  const heights: Partial<Record<BottomStackLayerId, number>> = {};
  for (const [id, layer] of layers) {
    const live = layer.el
      ? Math.round(layer.el.getBoundingClientRect().height)
      : layer.height;
    layer.height = live;
    heights[id] = live;
  }
  const { offsets, total } = computeStackOffsets(heights);

  const root = document.documentElement;
  if (total > 0) root.style.setProperty('--app-bottom-stack', `${total}px`);
  else root.style.removeProperty('--app-bottom-stack');

  for (const [id, layer] of layers) {
    if (!layer.el) continue;
    layer.el.style.setProperty('--app-bottom-stack', `${offsets[id]}px`);
  }
}

/**
 * Register (or re-bind) a layer's live element. `null` binds the layer
 * as absent (its earlier height stops counting) — the shape the React
 * callback ref lands in on unmount. Idempotent; safe under
 * StrictMode's double-invoked effects.
 */
export function registerBottomLayer(
  id: BottomStackLayerId,
  el: HTMLElement | null,
): void {
  const entry = layers.get(id) ?? { el: null, height: 0 };
  if (entry.el && entry.el !== el && observer) observer.unobserve(entry.el);
  entry.el = el;
  entry.height = el ? Math.round(el.getBoundingClientRect().height) : 0;
  layers.set(id, entry);
  if (el) {
    ensureObserver();
    observer?.observe(el);
  }
  recompute();
}

/** Remove a layer from the stack entirely (unmount / answered gate). */
export function unregisterBottomLayer(id: BottomStackLayerId): void {
  const entry = layers.get(id);
  if (entry?.el && observer) observer.unobserve(entry.el);
  layers.delete(id);
  recompute();
}

/** The current stack top (px) — what content must clear. 0 when idle. */
export function getBottomStackTotal(): number {
  const heights: Partial<Record<BottomStackLayerId, number>> = {};
  for (const [id, layer] of layers) heights[id] = layer.height;
  return computeStackOffsets(heights).total;
}

/** Test isolation hook — drop every registration (unit suites only). */
export function resetBottomStackForTests(): void {
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  layers.clear();
}
