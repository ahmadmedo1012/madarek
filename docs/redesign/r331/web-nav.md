# R331 · A-Web-Nav — the landing masthead, rebuilt to the Heron header's measured mechanics

Task ID 5-b-resume (continuation). The prior run had written `SheetNav.tsx` + `r331/nav.css`
and cut the header block out of `LandingPage.tsx` / `landing.css`; this pass verified the
build, ran the full behavioral proof against the BEFORE server (5179 = `/home/z/madarek`
at the r331-css base), found every spec number already true — **no behavioral fix was
needed** — and committed the report + thumbs.

| | |
|---|---|
| Component | `frontend/src/components/landing/chrome/SheetNav.tsx` (the bar + state machine + menu lifecycle) |
| Stylesheet | `frontend/src/styles/r331/nav.css` (the masthead's whole surface; imported by the component) |
| Retired | the header JSX block + scroll driver in `LandingPage.tsx` (−470 lines), every header rule in `landing.css` (−578 lines) |
| Reference | `docs/redesign/r331/heron-program.md` §6 + heron-program.json `header` (merged from main; probes `/home/z/heron-lab/data/nav-{1440,390}.json`) |
| Proof artifacts | `/home/z/heron-lab/webnav/` (out of git): `probe1…probe6b*.json`, `cmp-*.png` composites |
| Committed thumbs | `docs/redesign/r331/thumbs/webnav/` — 4 images, ≤150 KB each |

---

## 1 · Fact → today → delta → fix

| # | Reference fact (measured) | BEFORE (r331 base) | AFTER (this worktree) | Fix |
|---|---|---|---|---|
| 1 | Fixed bar h≈56 px at the frame's 7 px inset, **transparent in every state** (computed bg `rgba(0,0,0,0)` at scrollY 0…900, no shadow) | 56 px, transparent at top, but `on-scroll` (y>6) painted the solid-paper wash `rgb(246,246,238)` | 56 px @1440 / **49.61 px @390** (the reference's own 5rem mobile rung), `background: transparent` in all states, no blur/shadow | already built by prior run — verified, kept |
| 2 | `on-scroll` class at **>1× bar height** (~56 px), state marker only | flipped at y>6 (the old `.scrolled` vocabulary) | flips at `y > offsetHeight` — measured **ON at y=57, OFF at y=56** | verified, kept |
| 3 | `on-hide` at **>5× (~280 px) scrolling down** → inner bar `translateY(-101%)`, transform **.4s ease** | latched on any 8 px-down delta at y≥40; hid the WHOLE bar at `translateY(calc(-100% - 8px))` = −64 px (imperative inline transform) | inner bar `translateY(-101%)` = **measured −56.56 px**, CSS-driven on `.fo-header-inner`, pointer-events killed while lifted | verified, kept |
| 4 | Show on **any upward scroll, immediate** (debounce is the hide branch's alone) | show required a −8 px delta | any `y < prev` drops `on-hide` in the same frame — measured seated again after a 50 px up-scroll at y=550 | verified, kept |
| 5 | **100 ms debounce** before the hide latches (direction re-checked at fire time) | none (latched on the first 8 px-down frame) | 100 ms timer; a down-flick reversed after 40 ms cancels (bar visible at y=340 and y=890) | verified, kept |
| 6 | **`:hover` guard** — pointer over the bar suppresses the hide; open menu ditto | only an open dropdown held the bar | `pointerenter/leave` seat + `menuOpenRef`; pointer parked over the bar at y=600 → no `on-hide` | verified, kept |
| 7 | Bar is **pointer-transparent** (the reference's `pointer-events:none` seat); cells re-enable per cell | the whole bar ate clicks | bar `pointer-events:none`, cells `auto` (ordered after the on-hide kill); on-hide re-kills them | verified, kept |
| 8 | ≤991: bar collapses to [logo \| «القائمة» + **3-line burger**]; menu opens on the **clip-path wipe `inset(0 0 100%)` → `inset(0)`, 0.4s ease** + hairline L/R rules | menu opened with the old opacity/grid fold (`transition: all`), Lucide X/Menu icon swap, visible «القائمة» head row inside the overlay | clip-path wipe (sampled below), the reference's own burger (three 1.5rem hair lines, outer pair `scale(0)` on active, .4s), visible label rides the button | verified, kept |
| 9 | Menu items mask-reveal at **delay 0.25 + i×0.02 (CTA row 0.2)** on the 0.8s easeOutCubic register | no stagger (rows painted with the panel) | `.fo-mb-txt` translateY(110%)→0, delay ladder in CSS, transition only on the open state | verified, kept |
| 10 | `lenis.stop()` while the menu is open (the reference freezes its smooth scroller) | ref-counted body lock present (r309) | same lock — `mdrk-scroll-locked` on html+body; sheetLenis's observer calls `lenis.stop()`; **wheel-verified below** | verified, kept |
| 11 | Link hover **micro-motion** (fill-wipe 0.5s cb(.23,1,.32,1) + dual-label roll 0.48s cb(.625,.05,0,1)) | present in landing.css | carried into nav.css verbatim, hover-guards behind `(hover:hover) and (pointer:fine)` | verified, kept |
| 12 | Theme toggle intact; RTL correct (logical properties); `:focus-visible` owned by base.css | theme toggle in the actions cell | toggle in the actions cell + the mobile theme row; light↔dark flip measured (`light→dark`); header stays transparent in dark (`rule` → `rgb(133,133,127)`); all geometry logical (inset-inline/border-inline); zero `:focus-visible` rules in nav.css | verified, kept |

## 2 · Thresholds & timings implemented (the spec's numbers, as coded)

- `on-scroll` ⇔ `y > header.offsetHeight` (56 px desktop / 49.61 px mobile — fluid)
- `on-hide` ⇔ `y > 5 × offsetHeight` scrolling down **and** 100 ms debounce fires with the
  direction re-checked against live `scrollY` (`now >= lastY`), pointer-not-over-bar, menu closed
- show ⇔ any `y < prev` (immediate, no debounce)
- lift: `translateY(-101%)` on `transform .4s ease` (inner bar)
- menu: `clip-path .4s ease` both ways; unmount holds the DOM 420 ms for the exit clip;
  `.is-open` lands two rAF frames after mount (first-paint cadence)
- reveal ladder: `0.8s cubic-bezier(.215,.61,.355,1)`, delay `calc(0.25s + var(--i) × 0.02s)`, CTA row `0.2s`
- burger lines: `transform .4s ease`, outer pair → `scale(0)` on open
- reduced motion: classes still flip (state), every transform/transition collapsed, bar stays pinned

## 3 · Behavioral proof (measured, both servers; after=5175 this worktree, before=5179 madarek base)

**Header states @1440** (`probe1-header-states.json`):

| state | BEFORE classes / bg / transform | AFTER classes / bg / transform |
|---|---|---|
| scrollY=0 | `fo-header` · transparent · none | `fo-header` · transparent · none |
| scrollY=300 | `fo-header on-scroll on-hide` · **`rgb(246,246,238)` paper** · bar `matrix(…,-64)` (−100%−8px) | `fo-header on-scroll on-hide` · **`rgba(0,0,0,0)`** · inner `matrix(…,-56.56)` (−101%) |

**Hide/show sequence** (`probe2` — scroll to 600, sample the inner bar at 4 points, then up to 550):

```
hide  t0  cls=fo-header                        tf=none            top=7
      t1  cls=fo-header on-scroll on-hide      tf=…,0             (latched, transition starting)
      t2  cls=fo-header on-scroll on-hide      tf=…,-36.50        (mid-flight, .4s ease)
      t3  cls=fo-header on-scroll on-hide      tf=…,-54.32        (≈ seated)
      settled: tf = matrix(1,0,0,1,0,-56.56)  → translateY(-101%) of 56px ✓
show  t0  cls=… on-hide                        tf=…,-56.56        (still hidden)
      t1  cls=fo-header on-scroll              tf=…,-28.48        (on-hide dropped same frame)
      t2  cls=fo-header on-scroll              tf=…,-5.58
      t3  cls=fo-header on-scroll              tf=none, top=7     ✓ immediate show-on-up at y=550
```

Guards: pointer-over-bar at y=600 → no `on-hide`; 40 ms down-flick → no latch (100 ms debounce);
deep-scroll (y=900, pointer off the bar) → `on-scroll on-hide` latches ✓.

**Menu @390×844** (`probe3-menu-cls.json` — click «القائمة», sample at 0.1 / 0.25 / 0.45 s):

| t | computed clip-path | rows 0-2 translateY (px) |
|---|---|---|
| 0.10 s | `inset(0px 0px 77.91%)` | 28.81 / 28.81 / 28.81 (delays not yet reached) |
| 0.25 s | `inset(0px 0px 12.65%)` | 28.81 / 28.81 / 28.81 |
| 0.45 s | `inset(0px)` (wipe complete) | **12.57 / 13.94 / 15.42** — the 0.25+i×0.02 stagger mid-flight |

While open: body class `mdrk-scroll-locked` ✓, `html` overflow hidden ✓, wheel over panel and
over the bar moves scrollY **0 px** (y pinned at 800 across 9 wheel events; after Escape it
scrolls to 1486 — the engine resumed) — the `lenis.stop()` twin, measured
(`probe5-lenis-settled.json`; note `probe4`'s first run showed +49 px which was the *pre-open*
smooth momentum still settling, not a leak — re-probed after the momentum settled).
Burger: outer lines `matrix(0,…)` while open, centre hair stays; `aria-expanded` + label flip
فتح/إغلاق القائمة; Escape closes, unmounts the panel (`count=0`), releases the lock and
refocuses the burger ✓.

**CLS @390 on load**: **0.02339** over 2 entries — byte-identical to BEFORE (0.02339 / 2): the
rebuilt bar adds zero layout shift (it was already fixed-positioned).

**Theme / RTL**: light→dark flip measured on the header toggle; header transparent in dark;
RTL seats verified (brand cell right edge 1407 = frame 1433 − 26 padding; CTA cell at the far
inline-end, x 7…174); `dir=rtl` on the document.

## 4 · Three+ substantive before/after differences (named)

1. **The on-scroll paper wash is retired.** BEFORE scrolled past y=6 under a solid
   `rgb(246,246,238)` bar (visible on every show-on-up); AFTER is transparent at every scroll
   depth in both themes — the reference's own computed truth.
2. **The hide mechanic moved to the inner bar and to CSS.** BEFORE wrote an imperative inline
   transform on the whole header (`-100% - 8px` = −64 px, React-free rAF writer); AFTER
   `translateY(-101%)` = −56.56 px on `.fo-header-inner` via the `on-hide` class + a `.4s`
   transition — the reference's own seat, value and vocabulary.
3. **The state machine gained the reference's guards.** BEFORE: any 8 px-down delta at y≥40
   hid the bar instantly (no debounce, no hover guard); AFTER: >5× floor, 100 ms debounce with
   a live direction re-check, pointer-over guard, menu-open guard.
4. **The menu opens on the clip-path wipe** (`inset(0 0 100%)` → `inset(0)`, 0.4s) with the
   mask-line reveal ladder (0.25 + i×0.02, CTA 0.2) — BEFORE faded an opacity panel with an
   X/Menu Lucide icon swap and no stagger.
5. **The bar is pointer-transparent** (cells re-enable per cell) — BEFORE the full-width bar
   intercepted clicks across the empty paper.
6. **Desktop nav rebuilt to the real seat register**: the old four-seat dropdown grammar
   (الرحلة/المنصّة/المجتمع/الجامعات) retired for the site's real routes
   (الرئيسية · المقررات (#chapters) · الكليات · الحرم الجامعي · المسابقات · التطبيق) over ruled
   16.4rem cells with the w--current signal square; the dropdown panels are gone.

## 5 · Honest gaps

- **المسابقات is auth-gated**: the seat links the real route; a guest meets the login wall.
  Honest current behaviour, documented — not a nav defect.
- **The deep-scroll 4-point sampling shows the hide's first paint ~150 ms after the scroll
  event** (one rAF + the 100 ms debounce + the sample gap) — by design, not a gap; the debounce
  is the reference's own.
- **`tests/e2e/r309-recovery.e2e.ts:429` is corrupted in the BASE commit**
  (`.fo-mobile-menu aref="#chapters"]` — same accident that mangled `const enuOpen, …]` /
  `aref], button` in the old `LandingPage.tsx`; the nav rewrite removed the page's copies as
  part of the legitimate block deletion). The e2e file is outside this task's ownership —
  flagged here for the test owner; not fixed in this branch.
- The desktop nav's `المقررات` seat targets `#chapters` (the only public courses surface) —
  the router has no guest `/courses`; when one exists the seat should switch to it.
- RTL **visual** audit was done by geometry (computed seats) + composites, not by a human pass
  on a real RTL device; fonts render via the site's own Arabic faces.

## 6 · Verification chain

- `npx vite build` ✓ (6.7 s, green) · `npx tsc --noEmit` ✓ (0 errors)
- `git merge main --no-edit` after this report (css agent's @layer constitution lands under
  this block) — re-built after the merge; the header block keeps no landing.css dependency.
