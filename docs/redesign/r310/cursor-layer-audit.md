# R310 — Phase 1 · Cursor Layer Audit + Ownership Policy

**Measured from:** the live dev build (`:5173`, main @ 97ed3539) — evidence
`audits/evidence/r310/baseline/cursor/*.png` — plus a fresh reference pass
(`audits/evidence/r310/reference/*.png`, heronaiapp.com, 1440×900), both
captured 2026-10-22. Source selectors verified in `SheetCursor.tsx`,
`HeroInspect.tsx`, `FooterLens.tsx`, `SheetLoader.tsx`, `landing.css`.

## 1. The measured layer inventory (R309 state)

| # | Layer | Source | Renders | Gate |
|---|---|---|---|---|
| L1 | Canvas 9px signal square + 13px plate | `SheetCursor.tsx` `.sc-canvas` | always while live + hasMoved | fine pointer + hover, never RM |
| L2 | Velocity trail (≤26 segments) | `SheetCursor.tsx` canvas | speed > 1.5 px/frame only | same |
| L3 | 24px interactive ring (`.sc-ring`) | `SheetCursor.tsx` DOM | over `a, button, …` (contracts to 0.56 on press) | same |
| L4 | **Native cursor** | browser | `cursor: none !important` under `[data-sheet-cursor='live']` — **except** suppression zones restore `cursor: crosshair !important` | CSS |
| L5 | Hero guides (H/V full-span) | `HeroInspect.tsx` `.hi-guide-*` | pointer inside the drawing frame | ≥992px + hover, never RM |
| L6 | Hero 8×8 plus | `HeroInspect.tsx` `.hi-plus` | same | same |
| L7 | Hero coordinate readout | `HeroInspect.tsx` `.hi-readout` | same | same |
| L8 | Drag selection box | `HeroInspect.tsx` `.hi-box` | during drag (≥2px move) | same |
| L9 | Station dots (44px buttons) | `HeroInspect.tsx` `.hi-marker` | always (also the touch path) | universal |
| L10 | Loader cross + coord | `SheetLoader.tsx` `.sl-cross/.sl-coord` | during the entrance | entrance playing |
| L11 | Footer lens mask + pulse ring | `FooterLens.tsx` `.fl-*` | pointer inside the strip | fine + hover, never RM |
| L12 | Hotspot pins (01–05) | `LandingPage.tsx` `.bp-hotspot` | always in the hero | universal |

## 2. Per-region glyph counts — the defects

Evidence: `c01…c07` (Madarek) vs `reference/hero-drag.png` (reference).

| Region | Visible pointer glyphs (R309) | Count | Verdict |
|---|---|---|---|
| Blank page / text | L1 (+L2 when fast) | 1 | ✓ |
| Link/button hover | L1 + L3 (ring encloses dot — one instrument, two glyphs, the reference's own hover grammar) | 1 instrument | ✓ |
| **Hero drawing (≥992px)** | **L4 native crosshair + L6 plus** (+L5/L7 instruments) | **2 competing pointers** | ✗ DEFECT A |
| Hero during drag | L4 crosshair + L6 plus + L8 box | 2 pointers + box | ✗ DEFECT A |
| Hero station dots | L4 crosshair + L6 plus + L9 dot | 3 glyphs at one spot | ✗ DEFECT A |
| **Loader** | **L4 crosshair + L10 loader cross** | 2 | ✗ DEFECT B |
| **Footer strip** | L4 crosshair + L11 lens | crosshair competes with the lens | ✗ DEFECT C |
| Touch / RM | native only | 1 | ✓ |
| 768–991px fine pointer | L1 only (L5–L8 gated ≥992) | 1 | ✓ |

## 3. Reference calibration (fresh captures)

- Reference hero drag (`reference/hero-drag.png`): **exactly ONE pointer glyph**
  — the local 8×8 plus. No native cursor, no global canvas dot. The guides span
  the canvas; the readout sits beside the plus; the violation cards are **solid
  signal-filled** (code + text), not hairline boxes.
- Reference footer strip: **no `data-cursor="hidden"`** — the global 9px square
  stays live AND the lens follows (the lens is an inspection instrument lagging
  at lerp 0.09, not a pointer glyph). One pointer + one instrument.
- Reference loader (`.loading-inner` carries `data-cursor="hidden"`): the
  loader's own cross + readout is the sole instrument; the global cursor is
  suppressed; the native cursor does not come back.

## 4. The R310 ownership state machine

Exactly one authoritative pointer per instant, owned by a region:

| Mode | Region | Pointer glyph | Other layers |
|---|---|---|---|
| `native` | touch, RM, instrument failure | the OS cursor | nothing else renders |
| `global-custom` | everything outside local zones | 9px square (+ trail when fast; ring state on interactive — one instrument) | — |
| `hero-inspection` | inside the hero drawing frame (≥992px + fine, never RM) | the local 8×8 plus + guides + readout | native cursor **hidden** (`cursor: none`), global canvas suppressed |
| `dragging` | drag in progress in the hero | same plus | + selection box; stations revealed by AABB |
| `loader` | entrance playing | the loader cross + coord readout | native **hidden**, global suppressed |
| `footer-lens` | inside the footer strip | **the global 9px square stays** (reference behavior) | + the lens mask instrument |

### The fixes (code-level)

- **A (hero):** `[data-cursor='hidden']` zones change from
  `cursor: crosshair !important` to `cursor: none !important` **while the local
  instrument owns the zone**. The hero's zone keeps `data-cursor="hidden"`
  (suppressing the global canvas — already correct). Native hidden ⇒ one glyph.
- **B (loader):** same rule covers `.sl` (it already carries
  `data-cursor="hidden"` — only the CSS restore changes).
- **C (footer):** `FooterLens` **stops** carrying `data-cursor="hidden"`; the
  global cursor remains live over the strip (reference parity), the lens keeps
  following. `cursor: none` applies (global live), so one pointer + the lens.
- Failure path unchanged: if the global instrument never comes live
  (`data-sheet-cursor` absent), the native cursor is the complete fallback; the
  hero/loader zones must therefore only hide the native cursor **under the same
  `[data-sheet-cursor='live']` gate** — never unconditionally.

## 5. Acceptance test (Phase 1.5)

At every state above, count visible pointer glyphs — must equal **one
authoritative pointer** (the ring-enclosing-dot hover state counts as one
instrument). Re-capture `c01…c07` after the fix; transitions between regions
must swap ownership without intermediate duplicates (enter/leave edge cases:
`pointerleave` clears the local instrument; the global canvas wakes on the next
move outside the zone).
