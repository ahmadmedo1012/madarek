# R331 · A-Web-Hero — the landing hero rebuilt to Heron construction

**Owner**: A-Web-Hero (Task 5-a-resume) · **Branch**: `wt/hero` · **Base**: `1641934d`
**Source of record**: `docs/redesign/r331/heron-program.md` (§2 rem + type ladder, §4 hero
recipe, §7 motion values) + `heron-program.json` (`imagery.hero`, `durations`, `staggers`).
**Owned**: `components/landing/hero/**`, the hero JSX block in `pages/LandingPage.tsx`,
`styles/r331/hero.css`, the hero-rule deletions in `landing.css` / `r330-home.css`,
this report + `thumbs/webhero/`. NOT owned: header/nav, other sections, CSS entry, tokens.

---

## 1. What shipped

| Commit | Content |
| --- | --- |
| `3a5bfb9b` | `feat(r331-hero)` — hero rebuilt: `components/landing/hero/Hero.tsx` (new) + `styles/r331/hero.css` (new, 863 lines); old hero JSX block out of `LandingPage.tsx`; old hero rules deleted from `landing.css` (−996) and `r330-home.css` (−119). Build ✓ 6.9s. |
| `1eaf05b8` | `docs(r331-hero)` — before/after + animation-proof thumbnails (4 jpg, all ≤52KB). |
| *(this commit)* | `docs(r331-hero)` — this report. |

Stable test hooks kept (contracts): `.fo-hero` · `.fo-hero-title` · `.fo-hero-actions`
`.fo-hero-cta` · `.fo-hero-work`. Everything else is namespaced `hro-*` / reuses the R322
`bp-*` drafting chrome. One orange CTA, secondary login link, no English in UI.

## 2. fact → today → delta → fix

| # | Fact (heron-program.md / reference) | Today (this rebuild) | Delta vs old Madarek hero | Fix |
| --- | --- | --- | --- | --- |
| 1 | Title = SplitText mask-lines, `yPercent 100→0`, **0.8s power2.out, stagger 0.02** (ref: 9 wrapped lines) | Per-authored-line `overflow:hidden` masks; inner `.hro-line` `translateY(102%)→0`, `0.8s cubic-bezier(.215,.61,.355,1)`, stagger `0.02s` (+0.05s t₀ seat); Arabic carries the same statement in **3 lines** | Old hero: the title was **one block** `.reveal-up` fade | Per-line mask reveal |
| 2 | Mask lines settle at exactly 0 | Probe at rest: `translateY(0)` all lines | **Old cascade bug**: `.fo-hero .reveal-up{translateY(24px)}` (r330-home.css, imported after landing.css) ties `.reveal-up.in-view{translateY(0)}` at equal specificity and wins by order → hero blocks **rested permanently at +24px, only opacity animated** (live-probed on main: title & actions `matrix(…,24)` @ opacity 1) | Dead — the new grammar owns the hero; lines settle at 0 (proof §4) |
| 3 | Hairline draw: 4 edge strips `scaleX/Y 0→1`, **1.2s, ease none**, origin top-left (page) | `.hro-edge-t/b/s/e` wipe `scaleX/scaleY 0→1`, `1.2s linear`, origins mirrored for RTL (top **right** = reading start) | Old: static `border` on the stage — nothing ever drew | Wiping frame edges |
| 4 | Rem ladder `0.5787037vw ≥992 · 1.1990408vw ≤991 · 2.5445293vw ≤767` | Reused **untouched** from tokens.css R313; every hero value is rem (the 3.2rem rise measures 26.67px @1440 / 31.76px @390 — the spec's own numbers, probe-verified) | Old: mixed px seats (`63px` chrome) + rem | Pure rem ladder |
| 5 | `.heading.h1` 5.6rem/700/lh 1/−0.02em (46.67px @1440) | `--fs-d1` = clamp(31.74px, 4.8vw, 5.6rem) / **700** / lh **1.12** (Arabic mask breathing) | Old (r330): clamp(44px→62px), **w600**, lh 1.05 | Spec rung + Arabic canon (the Latin −0.02em tracking is dropped for the cursive joins — zero tracking on Arabic, kept only on LTR mono chips) |
| 6 | Body `txt-16` 1.6rem/500 | Lead 1.6rem/500, lh 1.75, **line-split masked** like the title (2 authored lines, +0.16s) | Old: one `<p>` block fade (d-3) | Masked lead |
| 7 | CTA = biggest block in the strip; sub-wrap carries a secondary link | ONE orange primary «أنشئ حسابك الجامعي» (funnel contract byte-identical) 4.6rem min-height, full-width ≤767, **+ new login secondary** beside it | Old: primary only, no secondary | Reference sub-wrap pair |
| 8 | Deco cards item1/item2: mono micro-copy + 1.6rem brand square on `fadeLoop 1.5s`; seats 26%/14% & 22%/50% | `.hro-deco` ×2 indexed to the honest capability ledger ([01] المحاضرة التفاعلية · [03] مصفوفة الإتقان), `fadeLoop 1.5s`, seats mirrored (`inset-inline-start` 10% / 44%), ≥992 only | Old: **none** in the hero | Deco layer restored (aria-hidden) |
| 9 | img/deco/frame fades **1s power3.out**; work-card rise **y 3.2rem, 1s power3.out** | SVG ink fade `1s p3.out` @0.25; deco fade @0.85; actions rise @0.3; work strip rise @1.05 | Old: single block fades on the d-1…d-4 ladder (80/160/240/320ms), no rise grammar | Spec sequence seats |
| 10 | RTL: reference is LTR (origin top-left, left seats) | Full logical-property mapping: `inline-start` seats, edge transform-origins flipped, y-axis motion (masks/rises) direction-neutral | Old: RTL sheet but static seats, nothing mirrored *in motion* | Motion-level RTL mirroring |
| 11 | Reference post-loading GSAP timeline (no RM capture) | `prefers-reduced-motion` belt in `r331/hero.css` collapses every hidden state to the settled sheet; the R308 gate itself never plays under RM (introGate R318) | Old: `.reveal-up` RM neutralize only | Full RM collapse incl. mid-flight flip |
| 12 | Reference engine: GSAP + Barba | **Zero new deps** — CSS transitions + the landing's own `.landing.intro-draw→intro-done` gate (R308 loader exit slit starts the timeline); GSAP eases ride documented cubic-bezier equivalents (§7) | Old: IO-gated block fades | Same choreography, own engine |

## 3. Motion register implemented (the spec's numbers, verbatim)

| Property | Value | Spec source |
| --- | --- | --- |
| Mask line duration | `0.8s` `cubic-bezier(0.215,0.61,0.355,1)` (power2.out) | §7 durations/eases |
| Mask line stagger | `0.02s` per line; title lines seated +0.05/+0.07/+0.09s, lead +0.16/+0.18s | §7 staggers (+ loader-slit t₀ seat) |
| Hairline wipes | `1.2s` `linear` (`ease none`), `scaleX` (t/b) · `scaleY` (s/e), origin right = reading start | §4 hairline draw |
| Block rise | `3.2rem → 0` + `opacity 0→1`, `1s` `cubic-bezier(0.165,0.84,0.44,1)` (power3.out), actions @0.3s, work @1.05s | §4 block rise |
| Fades | ink SVG @0.25s, deco @0.85s, `1s` power3.out | §4 plain fades |
| Ink-in draw | `stroke-dashoffset 650ms` + `fill-opacity 500ms`, 10 drafting-order layers, delays 250→1550ms (+250ms over the R322 belt — the drawing lands as the title masks resolve) | §7 sequence + R322 mechanism |
| Deco pulse | `hro-fade-loop 1.5s` infinite (0.32→1→0.32) | §7 fadeLoop 1.5s |
| Hidden states | masks `translateY(102%)` (descender-safe), edges `scale 0`, rises `opacity 0 + y 3.2rem`, ink `dashoffset 1 / fill-opacity 0`, texts `opacity 0` | init-state grammar |
| RM belt | every state above → settled sheet, `transition: none`, pulse `animation: none` @ opacity 0.72 | RM contract |

## 4. The animation proof — t=0.3s vs t=3s

**Method.** The intro is once-per-session and `introGate`'s R318 lowCores skip suppresses it
when `hardwareConcurrency ≤ 2` — which headless Chromium reports, so a naive headless run
never sees the timeline (root born `intro-done`, zero transitions; this is exactly what the
first naive probe showed). The honest proof replays the real sequence on a **warm** page:
load once (Vite compile settles) → `sessionStorage.clear()` + reload → the loader replays →
rAF-poll the `.intro-done` flip → capture at dt 0.15 / 0.3 / 0.6 / 3.0 (a
`hardwareConcurrency=8` override models a normal device; dt recorded per capture).
Raw JSON: `/home/z/heron-lab/webhero/proof-report.json` (lab dir, out of git).

**1440×900** (dt = seconds after the gate flip; line box ≈ 52.3px → full mask offset 53.3px;
rise 3.2rem = 26.67px):

| dt | L1 y | L3 y | lead y | edge-T scaleX | edge-E scaleY | CTA opacity / y | ink L2 dashoffset | SVG opacity |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.296 | **19.49px** (mid-clip) | **24.08px** | 30.45px | **0.222** | 0.222 | 0 / 26.67px (not started — delay 0.3s) | 1px (not started) | 0.081 |
| 0.472 | 7.41px | 9.50px | 12.73px | 0.361 | 0.361 | **0.478 / 13.93px** (mid-rise) | 0.462px (drawing) | 0.587 |
| 0.796 | 0.20px | 0.45px | 1.06px | 0.639 | 0.639 | 0.897 / 2.74px | 0.008px | 0.922 |
| 3.134 | **0** (settled) | 0 | 0 | 1 | 1 | 1 / 0 | 0px | 1 |

**390×844** (rise 3.2rem = 31.76px — the spec's own @390 number): L1 y 18.76 → 8.33 → 0.72 →
0; edge-T 0.167 → 0.292 → 0.556 → 1; CTA 0/31.76px → 0.221/24.74px → 0.828/5.46px → 1/0;
ink 1px → 0.934 → 0.033 → 0; SVG 0 → 0.388 → 0.866 → 1.

**Readings.**
- The title is **mid-reveal early**: at dt≈0.3 lines 1–3 ride 14–18% of the mask box with
  line 3 lagging line 1 (24.08 vs 19.49px — the 0.02s stagger is visible), then settle to
  exactly 0 — the mask reveal runs and lands.
- Hairlines **grow linearly** (0.222 → 0.361 → 0.639 → 1 across equal steps — the 1.2s
  `ease none` signature), top edge (scaleX, origin right) and end edge (scaleY) in lockstep.
- The CTA **rises while fading** on the power3.out seat (26.67px → 13.93 → 2.74 → 0 with
  opacity 0 → 0.478 → 0.897 → 1 — a decelerating curve, not a linear one).
- The ink **draws**: normalized dashoffset 1px (fully hidden) → 0.462 → 0.008 → 0.
- Pixel corroboration: at t≈0.3 the top 40px band is the loader slit's uniform light band
  (extrema 245/245) while at t=3 the page's own chrome shows (50–255); the title region is
  measurably lighter early (paper still showing through the masks).
- Screenshots: `proof-1440-t0.3s.png` (mid-reveal, slit open) vs `proof-1440-t3.0s.png`
  (settled); composites `webhero-1440-proof-0.3s-vs-3s.png` / `webhero-390-…`; thumbnails
  committed under `docs/redesign/r331/thumbs/webhero/`.

## 5. Before/after diff summary

**Before** (clean main `4f85e953`, served @5179): hero = 115 lines of JSX inline in
`LandingPage.tsx`; reveal = per-block `.reveal-up` fades (IO-gated, 0.65s expo-out,
d-1…d-4 ladder) — and the r330 hero-scoped `translateY(24px)` override pins those blocks at
+24px at rest (cascade bug, §2 row 2); static hairline border; no masks, no wipes, no deco,
no secondary CTA; title one text block with a `<br/>`.

**After** (this branch, served @5174): hero = one `Hero` component owning `r331/hero.css`;
per-line mask reveal, wiping frame edges, masked lead, CTA+secondary, deco cards, work-strip
rise, staged ink-in — all on the intro gate, all rem-laddered, all RTL-mirrored.

Diff: **5 files, +1076 / −1220**. Settled-probe diff (1440 @ rest): title
`matrix(…,24)/op1` → `matrix(…,0)/op1`; title text block-joined → 3 mask lines; CTA row
y+24 → y0; ink dashoffset 0 both (settled end state identical by design).

Captures (lab, out of git): `/home/z/heron-lab/webhero/` — `before/after-{1440,390}-settled.png`,
`proof-1440-t{0.15,0.3,0.6,3.0}s.png`, `proof-390-…`, `webhero-*-before-after.png`,
`webhero-*-proof-0.3s-vs-3s.png`, `report.json`, `proof-report.json`, `capture.py`, `proof.py`.

## 6. Substantive differences a reviewer can name

1. **Title anatomy**: a single-block fade that rests stuck at +24px (live-probed cascade bug
   on main) → three Arabic mask lines rising 102%→0 behind `overflow:hidden` masks on the
   reference's 0.8s power2.out / 0.02s stagger register, settling at exactly 0.
2. **The frame draws**: static stage border → four hairline edges wiping in over 1.2s linear
   from the reading start (RTL-mirrored origins) — the hero now has an opening gesture.
3. **Content band rebuilt to the reference grammar**: H1 cell ‖ 1px divider ‖ sub cell, lead
   masked line-for-line, and the **login secondary** added beside the single orange CTA
   (full-width ≤767); old band was lead + CTA in a plain row with no secondary.
4. **Deco layer exists**: two mono micro-copy cards ([01] المحاضرة التفاعلية · [03] مصفوفة
   الإتقان — indexed to the honest ledger, never new claims) with the 1.5s brand-square
   fadeLoop, ≥992 only; the old hero carried none.
5. **Type decided by the spec**: h1 w600/lh1.05 clamp(44→62px) → 700/lh1.12 on the 5.6rem
   rung; zero tracking on Arabic (the reference's −0.02em is a Latin rule); work strip stays
   the 13px-class mono voice but gains the 3.2rem/1s rise and snap-scroll <1200.

## 7. Honest gaps

- **Authored-line masks, not runtime SplitText.** The reference splits lines/words at
  runtime (9 title / 25 sub lines). We hand-split 3 title + 2 lead lines — right for
  authored copy, but a future copy edit must keep each line short enough for its mask (no
  auto re-split). The lead's `44ch` cap + flex-wrap can still re-wrap on narrow desktop:
  the two lead masks are authored seams, not measured ones.
- **Edge strips 1px vs the reference's ~7px bars** — deliberate deviation (the sheet's
  whole chrome language is 1px); documented in `r331/hero.css` §3.
- **Reference micro-mechanics not transplanted**: deco `.active` card expansion, the
  ruler's clip-path half-reveal on hover (our rulers brighten instead), the btn-fill
  0.58s steps(19) hover (our CTA keeps the platform button). HeroInspect remains Madarek's
  own R315 instrument rather than the reference's interact card.
- **Weak devices see no choreography by design**: `introGate`'s R318 lowCores/saveData skip
  renders the settled sheet instantly (the proof needed a cores override in headless —
  §4). RM collapses everything, as specced.
- **`<992` has no deco cards and `<768` no ruler overlay** — measured reference behavior,
  but it means the phone's art band is quieter than desktop's.
- The before-state +24px cascade bug (§2 row 2) existed in `.st-section`/`.pm-section`
  too (same r330 override) — those sections belong to other owners; flagged here, not
  fixed here.
