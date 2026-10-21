# R305-A2 — Heron-style interaction system: public contracts

Branch: `redesign/r305-heron-interactions` · Base: `1b766512` (origin/main, post-R304)
Owner lane: A2 (cursor / buttons / shared motion). Reference: heronaiapp.com (mechanics reimplemented as
original Madarek code — no Heron code, fonts, images, or assets were copied).

Everything here is **additive** — zero call sites changed, zero removed rules; existing surfaces render
bit-identically at rest until they adopt a contract. Two r305 hover families apply to pre-existing elements
by class alone (`.btn.outline` sweep, `.nav-item` indicator): at-rest pixels are unchanged (the 72-capture
drift run proves it) but their hover/focus feedback is upgraded without further opt-in.

---

## 1. Cursor layer (global, already mounted)

`<CursorManager />` is mounted **once** in `App.tsx` next to `<ToastStack/>` (outside the route tree and the
error boundary). Do **not** mount it per page.

### Gating (all must hold; re-evaluated live)
| Condition | Fallback behavior |
|---|---|
| `(hover: hover) and (pointer: fine)` | touch/coarse/stylus → layer **never renders**, native pointer everywhere |
| viewport width ≥ 992px | narrower → layer never renders (Heron's own desktop gate) |
| NOT `prefers-reduced-motion` | RM → layer never renders (JS gate + CSS belt) |
| JS available | if JS dies the layer simply never exists — **no `cursor: none` anywhere**, so the native pointer is always the safe fallback |

Layer z-index **399**: above content + floating ladder (`--z-dropdown` 100 / `--z-popover` 200 /
`--z-tooltip` 250 / `--z-sheet` 300), below interruptions (`--z-modal` 400 / `--z-toast` 500 /
`--z-lightbox` 600). `pointer-events: none`, `aria-hidden`, inert until the first pointermove.

### Opt-in attributes (work on ANY element on ANY surface)
| Attribute | Effect |
|---|---|
| `data-cursor="drag"` | dot renders a restrained crosshair (over maps/canvas/draggables) |
| `data-cursor="none"` | dot fully suppressed (use over the landing world / cinematic canvases) |
| `data-cursor-lines="cross"` | construction hairlines (1 h + 1 v) follow the pointer inside the element, clipped to it, plus a mono coordinate readout — Heron's blueprint language |
| `data-cursor-lines="x"` / `"y"` | only the horizontal / vertical hairline |

State machine (informational, for QA/testing): layer carries `data-active` (after first move),
`data-state` = `default | link | text | drag | hidden | down`, `data-lines` = `on | off`,
`data-lines-axis` = `cross | x | y`. Interactive targets (a, button, `[role=button/link]`, `.btn`,
`.nav-item`, summary, label) bloom a 28px ring; text fields shrink the dot to a faint 3px (native
I-beam stays the precise pointer); `pointerdown` presses the dot (scale .85).

Perf contract: one `pointermove` listener (passive) + two self-cancelling rAF trackers (dot lerp 0.18,
lines 0.1, stop epsilon 0.001 — **zero work when the pointer rests**, Heron's idle-stop pattern).
Transforms/opacity only; no layout reads in the hot path; cached container rect refreshed on rAF-throttled
capture-phase scroll (works with the shell's `.content` scroller) + resize. StrictMode double-mount leaves
zero listeners/raf (tested).

Edge case (documented for the landing wave): if a `data-cursor-lines` container unmounts **while the pointer
is parked and the rAF loop is idle**, the hairlines stay frozen until the next pointer wake-up
(pointermove/press). No surface ships the attribute yet; when the landing adopts it, add an `isConnected`
heal check to the press handlers (and the two one-line tests) — see review finding 4.

Modules: `frontend/src/components/motion/CursorManager.tsx` (+ colocated `cursor.css`),
`frontend/src/lib/motion/pointer.ts` (pure math: `lerp`, `distance`, `shouldStop`, `PointerTracker`,
`finePointerSupported`, `desktopCursorAllowed`, `resolveCursorState`, constants `LERP_FACTOR` 0.18,
`LINE_LERP_FACTOR` 0.1, `STOP_EPS` 0.001, `MIN_VIEWPORT` 992).

---

## 2. Button primitive additions (`frontend/src/components/primitives/Form.tsx`)

```tsx
import { ArrowLeft } from 'lucide-react';

<Button variant="primary" labelMotion iconRight={<ArrowLeft />}>ابدأ رحلتك</Button>
```

| Prop | Default | Behavior |
|---|---|---|
| `labelMotion?: boolean` | `false` | duplicate-label vertical slide (Heron's clipped-label reveal, direction-neutral). Duplicate is `aria-hidden` — the accessible name stays exactly one copy. Loading path unchanged (spinner wins). |
| `iconRight?: ReactNode` | — | diagonal arrow swap window (`.btn-motion-icon`), exits toward inline-end/top, duplicate enters from inline-start/bottom, `var(--motion-direction)`-aware (RTL correct). Whole window `aria-hidden` (decorative). |

Root hooks for CSS/QA: `data-motion-label="true"`, `data-motion-icon="true"`.
Keyboard parity: every hover choreography is paired with an ungated `:focus-visible` twin.
Gates everywhere: `:not(:disabled):not([data-loading="true"])`; hover slide additionally rides
`@media (hover: hover) and (pointer: fine)` (no touch sticky-hover); RM snaps via the token belt.
Timing: `var(--t-slow) var(--ease-out)` (380ms decel ≈ Heron's 0.48s snap, Madarek's own curve).

### CSS classes (components.css r305 block)
`.btn-motion-label > .btn-motion-label-track` (+ `.btn-motion-label-dup`) ·
`.btn-motion-icon` (+ `.btn-motion-icon-dup`) · `.btn.outline:not(.primary):not(.accent):not(.gold)`
fill sweep (uses `::before` + `isolation:isolate` — `polish.css` owns `.btn::after`) ·
`.nav-item:not(.on)::after` 2px indicator rail (`scaleY 0→1`, suppressed by the existing collapsed-rail
stand-down) · `.link-underline-motion:not(a)` inline-start underline draw (pairs with `.text-link`; bare
`<a>` draw is owned by polish v19 — do not double-apply).

Layer note: these style **child elements / pseudo-elements only**. The `.btn` root transition and hover
gates remain owned by `polish.css` (overrides layer) — never re-declare them.

---

## 3. Shared motion engine

### Reveal line-wipe variant (`frontend/src/components/motion/Reveal.tsx`)
```tsx
<Reveal variant="line">…</Reveal>   // Heron-style clip-path wipe, [dir=rtl]-mirrored
<Reveal>…</Reveal>                  // unchanged lift (default; no DOM diff)
```
Same IO belt, fling-hardening, settle belts, RM snap, stagger via `RevealGroup`. CSS:
`[data-reveal][data-reveal-variant="line"]` in motion.css (explicit RM kill included — the variant rules
out-specify the shared RM block).

### Runtime token bridge (`frontend/src/lib/motion/tokens.ts`)
```ts
getMotionDuration('page');   // → 320 (ms) on real DOM; 0 under RM (caller treats 0 as instant);
                             // SSR/no-DOM → documented rung fallbacks (80/160/240/380/320/360/700/1200)
getMotionEase('decelerate'); // → resolved cubic-bezier string on real DOM; 'var(--motion-ease-…)'
                             // reference fallback (raw beziers are banned in .ts by the motion gate)
```
Use these instead of duplicating numbers in JS — tokens.css stays the single source of truth.

### Utilities (motion.css r305 section)
`.motion-hairline` — 1px rule, `var(--rule)` (the blueprint line language).
`.motion-cine-lift` — opt-in cinematic lift riding the existing reveal belt at `var(--t-cinema)`.

### Engine boundaries (deliberate)
- **No gsap import in the shared path** — gsap/ScrollTrigger remain the landing chunk's engine
  (`scroll-conductor.ts` + story system). We introduced **no second scroll engine**; page reveals keep the
  IO belt (cheaper than ScrollTrigger for the app surface, already battle-tested here).
- No new observers, no perpetual decorative loops; zero work at rest anywhere in the system.

---

## 4. Surface-drift / QA notes
- The cursor layer renders **nothing until the first pointermove** (`data-active` gate + opacity 0 at
  rest), so the 72-capture `surface-baseline.json` audit stays pixel-identical; captures that never move
  the mouse cannot see the layer.
- Landing (`.landing`) is intentionally untouched: the world's own pointer parallax remains the single
  pointer reader there; pages that want the dot suppressed over canvas opt in with `data-cursor="none"`.
- Tests: `frontend/tests/motion/{pointer,CursorManager,ButtonMotion,tokens,RevealLine}.test.*` (80 tests in
  the motion dir). Browser QA evidence: see the branch handoff report (1440×1000 / 390×844 / 360×800).
