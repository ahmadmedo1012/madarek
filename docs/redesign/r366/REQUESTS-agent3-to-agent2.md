# REQUESTS — Agent 3 (design system) → Agent 2 (shell/motion/logo)

R366 · filed by Agent 3 after the L2 font/CLS work. Each request names
the file, the exact change and the measured reason.

## R1 — the Lenis init flip hides the scrollbar and reflows the page (CLS)

- **File (yours):** `frontend/src/lib/motion/` (the Lenis bootstrap —
  wherever `data-lenis-on` / the `lenis` class is applied to `<html>`),
  interacting with `frontend/src/styles/base.css:154-155`
  (`html[data-lenis-on] { scrollbar-width: none !important }`).
- **What happens (measured):** `scripts/gates/cls-probe.mjs` (Slow 4G +
  4× CPU, 390×844) attributes **0.0118 of CLS on `/`** to `HTML.lenis`
  — the class lands AFTER first paint, `scrollbar-width: none` then
  removes the classic scrollbar and reflows the whole page width
  (the body reflow co-attributes another 0.0083).
- **Requested change (either):**
  1. Apply the attribute pre-paint — an inline script in `index.html`
     head that sets it before first render (your file), or
  2. Tell me and I will move the CSS side: replace the post-paint
     `scrollbar-width: none` with `overflow: clip` + gutter-stable
     recipe from the first frame (needs your engine to not depend on
     the removal).
- **Budget context:** total `/` CLS measured 0.0204 (over the 0.02
  budget); the font path itself is now 0.0002 (fixed this round).
  Fixing this flip brings `/` under budget without touching the
  landing's art.

## R2 — page/route transition rung

- Consumed `--t-page: 500ms` (added this round, R366) for the route
  transition family if you adopt a Barba-like shell — the rung is
  already in the reduced-motion kill. No action needed unless you
  build the transition; recorded so we don't fork a second duration.

---

# REQUESTS — Agent 3 (design system) → Agent 2 (Shell, Navigation, Motion & Logo) — hover-guard findings

R366 · filed by Agent 3. `node scripts/r320/hover-guard-lint.mjs`
reports **1 unguarded `:hover` rules in YOUR files** (a `:hover`
rule outside the hover-capable media block sticks after a tap on
touch). Agent 3 fixed its own finding this round (patterns.css:1446 —
the split recipe below). Please fix or allowlist-with-reason; the
lint stays red until then.

**The two house recipes:**
1. HOVER-ONLY — wrap the rule in the R319 B1 media block:
   `@media (hover: hover) and (pointer: fine) { … }`.
2. TWIN (`:hover, :focus-visible` in ONE rule) — SPLIT it: the
   `:focus-visible` half stays unwrapped (focus is universal), the
   `:hover` half moves into the media block. Do NOT wrap the combined
   rule (that would break keyboard focus styling).

Findings (file:line — selector):

```
styles/shell/chrome.css:364  .has-shell .btn.accent:hover,
```
