# R308 Parity Matrix — reference behavior → Madarek implementation

Derived from `reference-observations.md` + `reference-interaction-map.json` (both measured live
on heronaiapp.com) and the R307 production baseline audit. This matrix is the binding
implementation map: every high-salience reference behavior gets a Madarek translation, an
owning component, and a verification path. Where the reference grammar conflicts with a
Madarek hard contract (RTL/Arabic shaping, honesty pins, token canon, funnel counts), the
translation column records the adaptation — never a silent copy, never a silent drop.

## A. Entrance

| Ref | Madarek translation | Owner | Verify |
|---|---|---|---|
| Asset-gated non-linear loader 0→100% (~4.9s), mono % counter, orange center band | `SheetLoader` on the landing only: real progress from fonts/hero-image/load signals; mono % (IBM Plex Mono, dir=ltr); band = `--accent` on paper ground; never shown on internal navigation (sessionStorage gate) | `SheetLoader.tsx` + `.sl-*` | unit: loader gate logic; browser: first-frame + replay |
| Loader line drawing + system log list + ruler + X/Y readout | Original educational linework (the «مخطط مدارك» geometry) drawing itself progressively (staged `stroke-dashoffset`, pathLength=1): primary geometry → secondary lines → registration marks → details → scan line → markers → labels; honest Arabic init log («تهيئة النظام…» states that ARE true); ruler + crosshair + scene readout | `SheetLoader.tsx` (reuses `BlueprintDraw` primitives) | browser capture sequence |
| Exit: center-out horizontal clip-path split (two panels → widening slit) | Same geometry: `.sl-panel` top/bottom clip sweep via CSS vars `--sl-open` on tokens | `SheetLoader.tsx` | browser: mid-exit frame |
| Skip/continue + reduced-motion + no replay on return | «تخطّي» button (Esc/Enter/Space), `prefers-reduced-motion` → skip to settled state, sessionStorage `madarek-intro-seen` | `SheetLoader.tsx` | unit + browser |

## B. Cursor system (fine pointers; the landing sheet only — the authenticated app keeps the native cursor)

| Ref | Madarek translation | Owner | Verify |
|---|---|---|---|
| Canvas 2D: 9×9 `#FA3600` square, lerp 0.18, DPR-capped, wake/sleep loop | `SheetCursor` canvas: 9px square in `--accent`, lerp 0.18, single ticker via the conductor, sleeps ~8 frames after settle, wakes on move | `cursor/SheetCursor.tsx` | browser: canvas draw at known points + idle sleep |
| Velocity trail: only when fast (speed > ~1.5), per-segment quadratic alpha ramp, vanishes on still frame, lineWidth 1.4 | Same behavior, `--accent` strokes, no permanent tail; disabled under reduced-motion | `SheetCursor.tsx` | browser: fast sweep vs slow move |
| Interactive-state layer: 2px `#FC724D` square, press → contracting reticle scale .56 op .68 | Hover ring square (2px `--accent` border) over interactive elements (`a, button, [role=button]`); press = reticle contract; GSAP-free WAAPI/CSS on tokens | `SheetCursor.tsx` | browser: hover + press states |
| `data-cursor="hidden"` suppression zones; hero swaps to local instrument | Same attribute contract: loader + hero drawing + lens zones suppress the global cursor; the hero runs its own guides/plus/readout | `SheetCursor.tsx` + `HeroInspect` | browser |
| Color adaptation over dark surfaces | `--accent` dot keeps AA against both themes' grounds via a 1px `--bg` halo under the square (Madarek has real dark DOM surfaces — the reference could not verify theirs) | `SheetCursor.tsx` | browser: dark theme |

## C. Hero interactive drawing

| Ref | Madarek translation | Owner | Verify |
|---|---|---|---|
| Guide lines (#E0E0DA 1px, full-span, lerped) + 8×8 orange plus + scene-relative mono readout (origin at interact wrap) | `HeroInspect` over `.bp-stage`: h+v guide lines (`--border`), 8×8 plus (`--accent`), readout `X:…PX Y:…PX` scene-relative, dir=ltr, eased digits | `cursor/HeroInspect.tsx` | browser: readout at known points |
| Hint text «Click and drag…» persistent | «اسحب فوق الرسم لاستكشاف مراحل الرحلة» mono micro-label, persistent | `HeroInspect.tsx` | browser |
| Drag: threshold 2px → selection box (normalize, 1px `#F15534` border, 315° direction-tinted gradient) | Identical math on `--c-coral-ink` border + `color-mix` gradient; box removed on release | `HeroInspect.tsx` | browser: drag rect alignment |
| Violation markers (2): 12×12 pulsing dot → expand to labeled box + code label; AABB activation; persist after release | «محطات الفحص» — 3 markers on REAL capabilities (نقطة الفحص داخل المحاضرة / فجوة إتقان / مراجعة بحث معلَّقة): pulsing 12px dot (`--accent`, 72%→99% opacity pulse) → expands to annotation box (Arabic label + mono code `[CP]`/`[MG]`/`[RR]`); AABB vs selection box; persist after release; «إعادة الضبط» restore link appears once any marker is open | `HeroInspect.tsx` | unit: AABB + remap math; browser: drag-to-reveal |
| Markers remapped to displayed object-fit box (letterbox math) | Same: markers defined in SVG viewBox coords → mapped through the `preserveAspectRatio="xMidYMid meet"` letterbox transform of the rendered `.bp-svg` — real coordinate transformation, correct after resize/crop | `HeroInspect.tsx` | unit: mapping at 3 scales; browser resize |
| Hotspot buttons (existing accessible path) carry aria-pressed + panel live region | Kept unchanged (keyboard/AT parity) — the drag system is layered on top, never replaces it | `LandingPage.tsx` | existing tests |

## D. Continuous instruments

| Ref | Madarek translation | Owner | Verify |
|---|---|---|---|
| Hero marquee ticker (10s linear, ≈40px/s, benefit items) | `.fo-hero-ticker`: the 6 live capabilities crawl (mono + Lucide micro icons), duplicated track, `animation: marquee` hand-tuned in landing.css (the authored-choreography file), `dir` isolated per item | `LandingPage.tsx` + landing.css | browser: measured px/s; unit: aria-hidden duplicate |
| Flowing dashes on drawings (1s loop) + pulsing marker dots | `.bp-dash` gets a dash-flow loop on the journey path + stage rings; marker dots pulse (see C) | landing.css | browser |
| Problem-card draw-in keyframes (draw → dash appear → dash flow) | The pinned journey's stage overlays draw in with the same 3-layer grammar (draw 1s / dash appear .35s / dash flow 1s loop) | landing.css | browser |

## E. Scroll story

| Ref | Madarek translation | Owner | Verify |
|---|---|---|---|
| Pinned walkthrough = 51% of page, CSS sticky (NOT GSAP pin), 4 stacked images cross-fade while pinned, same object persists | «رحلة التعلّم» inside `#chapters`: a 4-stage walkthrough (شاهد المحاضرة → تحقّق نقطة الفحص → اختبر → أتقن المصفوفة) — CSS `position: sticky` full-viewport drawing window; the SAME base drawing persists; per-stage overlay layers (highlight + annotations + Mini fragments) cross-fade driven by scroll progress; chapters 05–06 remain ledger rows below | `journey/JourneyScene.tsx` | browser: stage swap at measured scroll bands; unit: progress math |
| Number stations riding the scroll track | `[01]`–`[04]` mono stations ride the tall section; active station = `--accent` number (the reference's active-role grammar) | `JourneyScene.tsx` | browser |
| Right column expands width 0→~464px 0.4s at pin end | The capability checklist column expands at the walkthrough's end (same width transition, once, on token easing) | `JourneyScene.tsx` | browser |
| Ink masks: quadratic-curve SVG mask top→bottom sweep, scroll-scrubbed, turbulence edge (feTurbulence .045/.055 octaves 4 seed 5 → displacement 100 → blur 1.8 → alpha slope 2.2 intercept −.6) | `InkMaskFrame` wraps the campus-life photos + the product lead: the hairline-drawing overlay (grid + registration marks) wipes into the photograph through the same curve+filter (inline SVG filter, CSP-safe) as the section scrolls | `journey/InkMaskFrame.tsx` | browser: mid-wipe frames |
| Text choreography: per-word masked reveals (Arabic-safe: split on spaces only, never mid-word) | `WordReveal` (Arabic amendment to DESIGN.md §4 — word-boundary splits preserve shaping; block-level fallback when clamped/reduced-motion) | `journey/WordReveal.tsx` | unit: split keeps words intact; browser |
| Scrub-linked intro title (reversible) | The statement title reveal is scrub-linked to scroll | landing.css + conductor | browser |
| Why-section hold plateaus (state machine with 74% holds) | The vision status pairs adopt sequenced hold-plateau reveals (loading → check snap) on existing statuses — no content change | landing.css | browser |
| Viewport height reshapes composition; sticky dies ≤991px; ≤767 footer swaps variant | The journey walkthrough: sticky ≥992px + re-measured per `window.innerHeight`; ≤991px degrades to stacked stage cards (no pin); footer lens hidden on touch (static strip) | landing.css | browser: 1440×700 vs ×900; 768; 390 |

## F. Footer + transitions

| Ref | Madarek translation | Owner | Verify |
|---|---|---|---|
| Pointer lens on image strip: circle mask r→99 in ≈0.55s, leave ≈0.8s, pulse ring 1.05×, lerped chase (0.09/0.15), reveals filtered layer | Footer «شريط الفحص»: a hairline strip carrying the original mastery-tower linework (sketch state); the pointer lens reveals the resolved state (full ink + signal marks) through an SVG circle mask (lerp 0.09, pulse 0.15, in 500ms/out 800ms on tokens); touch → static resolved strip | `footer/FooterLens.tsx` | browser: lens frames; touch fallback |
| Footer logo 215×215 fades in with scroll | Large `StarMark` line-logo fades in with scroll at the footer's reading end | `FooterLens.tsx` | browser |
| Route transitions: inverse trans/mask % sweep + line-width spike, ~1.6s, no fade, no loader on subpages | Landing-exit sweep ONLY (funnel safety: navigation is never delayed): imperative overlay appended to body on internal link clicks, `--trans`/`--mask` inverse sweep + line spike, ~700ms total, skipped under reduced-motion; no transitions on authenticated routes | `lib/motion/sheetExit.ts` | browser: landing → /auth/register |
| CTA corner coordinate labels `[0,246]…` | The CTA section carries mono corner coordinate labels (real viewport-derived values) | `LandingPage.tsx` | browser |

## G. Ladders (adapted, not copied)

> **R313 override (annotation — the rows below are round-r308 history, not current
> policy).** The owner's R313 parity order supersedes this section: the fluid rem root
> (html `0.5787037037vw` + ≤991/≤767 bands, 13px Arabic floor kept as a minimum), Geist
> Mono, paper `#F6F6EE`, and radius 0 (no shadows) are now **adopted**. BT Grotesk stays
> a **permanent exception** (proprietary — Alexandria/IBM Plex Sans Arabic remain).
> Full ledger with commits + evidence: [`docs/redesign/r313/OVERRIDE-LEDGER.md`](../r313/OVERRIDE-LEDGER.md).

| Ref | Madarek translation |
|---|---|
| Fluid rem type (root 8.33px@1440 → 9.92px@390) | NOT adopted — Madarek's own `--fs-*` ladder + 13px Arabic floor is the canon; the mono micro voice transfers via IBM Plex Mono |
| BT Grotesk / Geistmono | NOT adopted — Alexandria / IBM Plex Sans Arabic / IBM Plex Mono (OFL, Arabic-correct) per DESIGN.md §3 |
| Paper #F6F6EE | Madarek paper `#F6F8FA` (the r305 measured canon) — the relationship (warm near-white ground + graphite + one orange) is what transfers |
| 7px page frame + fixed edge hairline | The existing `.sheet-frame` registration marks carry the grammar; the edge inset stays as authored in landing.css |
| `hover:hover` + `min-width:992px` gating; touch → static drawing + hamburger | Same ladder: full instrument system at `(hover:hover) and (min-width:992px)`; canvas cursor on fine pointers at any width; touch → tap-to-inspect markers, no drag; reduced-motion → complete static sheet (content never hidden) |

## H. Not translated (recorded, with reason)

> **R313 override (annotation — the rows below are round-r308 history, not current
> policy).** Lenis 1.1.5 is now **adopted** (guest pages only, conductor-driven, lerp
> 0.1, scrollbar hidden, `.content` native); the loader was rebuilt to the Heron
> asset-gated timeline (10 log lines, a real 835ms two-band exit, every full load);
> and the route transition is now the 1.6s four-edge inset wipe (still no Barba —
> React Router reproduces the observable). GSAP / Webflow / web-components stay
> rejected (original implementation on the existing token system). Permanent
> exceptions unchanged: BT Grotesk, Arabic glyph metrics, honest copy. Full ledger:
> [`docs/redesign/r313/OVERRIDE-LEDGER.md`](../r313/OVERRIDE-LEDGER.md).

- Lenis smooth-scroll wrapper: rejected — the canon's «no scrolljacking» + e2e/hermetic-test compatibility; native scroll + the shared conductor rAF reaches the same sync guarantee without hijacking.
- Barba full-page transitions: rejected — conflicts with React Router lifecycle (mission §9); the landing-exit overlay reproduces the observable sweep safely.
- Webflow/web-component architecture, GSAP dependency: rejected — original Vite/React implementation on the existing token system; no new runtime dependencies.
- Loader logo stroke-draw (`--loading-logo-dasharray`): NOT VERIFIED on the reference (stays 0) — not reproduced.
- Cursor color adaptation via blend modes: adapted (see B) — the reference's own claim could not be reproduced on their DOM.

## Verification map

- Unit (vitest): conductor ticker lifecycle; AABB + letterbox remap math; loader gating (session/reduced-motion/skip); word-split integrity (Arabic joins preserved); funnel counts unchanged (existing tests stay green).
- Browser (agent-browser + the repo's Playwright): every table row above at 1440×900 deep pass; 1440×700, 1280×800, 768×1024, 390×844, 360×800 lighter passes; light+dark; capture sequences (before/during/completed/interacting/released) into `/home/z/evidence/r308/local/` with manifest.
- Repo gates: `npm run lint && npm run typecheck && npm test && npm run build -w frontend` + the design-gate belt (`check-icons`, `check-motion-tokens`, `check-csp-hash`, `verify-parity-export`, `check-colors`, `check-raw-css`) + `test:e2e` (hermetic).
- Updated (narrowly, with this matrix as justification): `r306-landing-sheet` pins «no canvas/no conductor» (the r306 ban targeted the retired 3D world; R308's instrument canvas is a different, documented system) and «zero keyframes» (R308 continuous instruments amend the canon; scoped to `.landing`, reduced-motion belt still collapses them); chapter-ledger grammar pin (01–04 move into the walkthrough; 05–06 keep the ledger).
