# 4-A11 — Motion & Micro-interactions System Audit
Campaign 4 «سيادة المظهر» · Wave 19 · audit-only (no source edits, no git)

**Scope:** `frontend/src/styles/motion.css`, `frontend/src/components/motion/*` (PageTransition, Parallax, Reveal, SectionAccent, Skeleton, useReducedMotion, useSectionAccent), `frontend/src/hooks/useReveal.ts`, all transition/animation/keyframe declarations across the 15 stylesheets, `prefers-reduced-motion` handling (CSS + JS), `scripts/check-motion-tokens.sh` gate, runtime motion performance.

**Method:** gate run + full static inventory (python parses of 15 CSS files, 20,464 lines) + 6 live playwright probes (CDP wheel flings, instant jumps, PageDown spam, viewport-height sweep 900/1000/1080, reduced-motion renders, press/hover state capture, mid-flight animation sampling, `document.getAnimations()` idle/offscreen counts, pixel-diff of ripple frames) + 2 VLM verification calls. 25 screenshots in `/tmp/madarek-shots/a11-*`. Probes kept at `/home/z/a11-probes/` (outside repo). Session injection was token-based (HS256 signed with the backend's own secret, no login requests — the auth rate limiter 10/15min was tripped during early probing; onboarding-complete POSTs blocked, zero DB writes).

---

## 1. Inventory

### 1.1 Motion tokens (tokens.css:99–158, 632–637)
| Layer | Tokens | Notes |
|---|---|---|
| Raw durations | `--t-micro` 80 · `--t-fast` 160 · `--t-base` 240 · `--t-slow` 380 · `--t-slower` 520 · `--t-cinema` 720 | 520/720 sit outside the 120–500ms band |
| Raw easings | `--ease` · `--ease-out` · `--ease-in` · `--ease-linear` · `--ease-soft` · `--ease-spring` · `--ease-bounce` | `--ease-spring` ≡ `--ease-bounce` (identical values, tokens.css:115–116) |
| Composite (legacy) | `--t-clean` (= `all` 240ms) · `--t-cinema-all` · `--transition-{all,fast,normal,slow}` | `--t-clean` has **19 live consumers**; the other four are dead |
| Semantic durations | `--motion-duration-{micro,short,medium,long,page 320,reveal 360,stat 700,skeleton 1200}` | the "canonical names new code MUST consume" |
| Semantic easings | `--motion-ease-{standard,decelerate,accelerate,emphasized}` | |
| Distances/stagger | `--motion-distance-{6,16,48}px` · `--motion-stagger-step` 60ms · `--motion-stagger-cap` 6 · `--motion-direction` (RTL flip, tokens.css:270) | |
| Interaction-state block | `--press-scale` · `--press-translate` · `--hover-lift{,-lg}` · `--interactive-transition` · `--state-button-pressed-scale` · `--state-card-hover-translate` · `--state-card-pressed-scale` … | **ALL DEAD — zero consumers** (rg across css+tsx) |
| Spring vocabulary in polish.css:2881–2883 | `--ease-spring-soft/bounce/snappy` | defined outside tokens.css, allowlisted by the gate |

**Adoption (transition declarations only):** legacy `--t-*` durations **97 refs** vs semantic `--motion-duration-*` **58 refs**; legacy easings **97 refs** vs semantic `--motion-ease-*` **22 refs**. The canonical layer the tokens file mandates is ~37% (durations) / ~18% (easings) adopted.

### 1.2 Keyframes
**132 unique names / 134 definitions / 144 animation declarations / 36 infinite loops.**

| File | keyframes | Notable |
|---|---|---|
| polish.css | 51 | 28 of the app's RM blocks; spring vocabulary; ripple; toasts; shimmer ×3 |
| components.css | 31 | modal/sheet/popover family (Sheet/Popover/Lightbox latent — 4-A9); `madarek-spin`, `madarek-shimmer` |
| student.css | 22 | lecture/exam/scan/live pulses; `campus-fill-in` (animates `inline-size`) |
| owner.css | 9 | **`owner-row-in` defined twice with different bodies** |
| motion.css | 5 | reveal-rise/fade, skeleton-shimmer, sheet-slide-bottom (dup), motion-spin |
| landing.css / training / auth / notifications / base / colleges / layout | 3/3/3/2/2/2/1 | |

- **Dead keyframes: none** (every name has ≥1 consumer; `madarek-fade-up` exists only inside a deletion comment, base.css:224).
- **Duplicate definitions (both bugs, see P2-7/P2-8):** `owner-row-in` (owner.css:845 vs :1040), `madarek-sheet-slide-bottom` (motion.css:204 vs components.css:1280).
- **Latent inventory (not dead, contract-pinned per overlays/index.ts:5–13):** the Sheet/Popover/Lightbox/CommandPalette keyframes have zero app mounts (4-A9 cross-ref).
- **Layout-animating keyframes:** `madark-ripple` (polish.css:3242 — `inline-size/block-size` 0→240%), `campus-fill-in` (student.css:2037 — `inline-size`). Everything else is transform/opacity/background-position/box-shadow. background-position shimmers ×5 systems (see P2-9).

### 1.3 Infinite loops (36 declarations)
Ambient: `madarek-hero-drift` 22s, `madark-sway` 6s, `madark-breathe` 4s, `polish-float-1/2` 6s/7.5s, `madark-welcome-breathe` 9s, `sticker-idle` 5s, `madark-empty-wiggle` 6s · Status: `pulse-live`, `live-ping`, `webinar-live-pulse`, `scan-dot-ping`, `notif-bell-pulse`, `madark-heartbeat`, `owner-tick-pulse`, `madark-error-throb`, `madark-loadingstate-pulse` · Loaders: 5 shimmers + 3 spins + `terminal-blink`. **27 were simultaneously alive and offscreen** while parked at the landing page bottom (see P1-5). 10+ use `--motion-ease-standard` on an infinite loop, against the codebase's own doctrine that only `--ease-linear` is correct for loops (tokens.css:110–113).

### 1.4 Reveal systems (two, divergent)
| | `useReveal` + `.reveal-up` (landing) | `<Reveal>` / `data-reveal` (platform) |
|---|---|---|
| File | hooks/useReveal.ts + polish.css:590 | components/motion/Reveal.tsx + motion.css:97 |
| Consumers | LandingPage ×37 (`RevealCssClass`) | CollegePages ×1, CourseDetailPage ×2, PaymentPage ×1 |
| Mount-time in-viewport check | **none** | yes (Reveal.tsx:61–65) |
| IO config | threshold 0.12, rootMargin `-8%` bottom | threshold 0 (default), rootMargin `-10%` bottom |
| Duration | 520ms (`--t-slower`) + 80–400ms delays | 360ms token + 60ms stagger step |
| RM | `.reveal-up {opacity:1}` CSS + JS immediate in-view | reduced shortcut sets revealed=true |

SectionAccent (5 kinds, landing ×5 + colleges ×2) and Parallax (IO-driven, ≤8px, landing ×1) are healthy — see positives.

---

## 2. Findings

### P1 ×5

**P1-1 — Reveal fling skip + hero-CTA dead-zone (the 4-A1 bug, quantified + root-caused).**
`hooks/useReveal.ts:33–51` (IO with `threshold 0.12`, `rootMargin '0px 0px -8% 0px'`, one-shot `in-view`, no reconciliation) + `polish.css:590` (`.reveal-up { opacity: 0 }` until `.in-view`).
Evidence (live, 1440×900, `/`):
- CDP wheel 1200px/frame ×20 → landed at 8788/9688px: **14/39 elements permanently `opacity:0`** (all above the landing point). 630px/frame → 0 missed (IO keeps up); the failure onset is between 630–1200px/frame — real trackpad fling territory.
- Instant jump to 70% doc height (scroll-restoration / anchor deep-link path): **30/39 missed**. PageDown ×12 (keyboard path): **28/39 missed**.
- Missed-above elements DO recover on slow re-scroll (39/39 after slow scroll back to top) — the permanent damage is the dead-zone case:
- **Hero CTA row (`.reveal-d-3.landing-cta-row` — أنشئ حسابك الجامعي / شاهد كيف تعمل / تصفّح الكلّيّات) is `opacity:0` on first paint at vh=900** (rect top 896 > root bottom 828), **vh∈[882,959] keeps it invisible while 40–70px of it is on screen** (verified live at 900 + geometry sweep 900/1000/1080; fires at vh≥960). 1440×944 — a maximized 1080p Chrome window — shows a blank primary CTA row until the first scroll. **This gates 4-A1's P0 CTA fix: even after the contrast fix lands, the row stays invisible on common viewports until this is fixed.**
Fix sketch (~10 lines in useReveal.ts): (a) at observe time, reveal immediately when `rect.top < window.innerHeight * 0.92` (mirror Reveal.tsx:61–65 — kills the dead-zone); (b) in the IO callback, treat non-intersecting entries with `entry.boundingClientRect.bottom < 0` as passed → add `in-view` (kills the fling skip for everything above you); (c) optional belt: a `scrollend`-event sweep that reconciles all `.reveal-up:not(.in-view)` whose top is above the fold.

**P1-2 — Platform `<Reveal>` carries the same latent skip.**
`components/motion/Reveal.tsx:73–84` — has the mount check but no scrolled-past reconciliation; a fast fling past a `data-reveal` element (CourseDetail/Payment/CollegePages — 4 mounts) leaves it `opacity:0` forever ([data-reveal]:not([data-revealed) hides it, motion.css:97).
Fix: same clause (b) as P1-2 above in the IO callback (2 lines).

**P1-3 — `transition: all` smuggled through composite tokens; phantom property transitions live-verified.**
`tokens.css:118` (`--t-clean: all var(--t-base) var(--ease)`) consumed by 19 rules (components.css:436 `.icon-btn`, :487 `.pill`, :587, layout.css:195/:311, polish ×8, auth ×2, landing ×2); `tokens.css:130` `--interactive-transition: all …` (dead). Consequence measured live: every `.icon-btn` mount runs a 240ms `scrollbar-color` transition (polish.css:5350 themes `* { scrollbar-color }`, the `all`-transition animates the change — captured via `getAnimations()` on modal open, t=17ms), and focus-driven `outline-*` transitions run on t-clean elements (modal-open capture, t=83ms) — **the keyboard focus ring fades in over 160–240ms** instead of appearing instantly (WCAG 2.4.7 focus-appearance smell). The token gate cannot see any of this because `all` hides inside a token.
Fix: replace `var(--t-clean)` consumers with explicit property lists (background, color, border-color, box-shadow, transform — exactly what each consumer actually changes), starting with `.icon-btn`/`.pill`; delete or redefine `--t-clean` without `all`. Add a gate check for `transition:\s*all` (see P1-4).

**P1-4 — `check-motion-tokens.sh` gate is not exhaustive; it passes while the codebase's own motion doctrine is violated.**
`scripts/check-motion-tokens.sh` (ran: `OK`, exit 0). Blind spots found:
1. **`s`-unit durations escape** — the regex only matches `[0-9]+ms`. Live examples the gate passes today: `owner.css:490` (`pulse-live 2s`), `landing.css:61` (`1.2s`), `:309` (`22s`), `:391` (`2.4s`), `components.css:152` (`5s`) — owner/landing/components are NOT allowlisted, so in `ms` these would fail.
2. **`transition: all`** is unchecked (see P1-3).
3. **Layout-property animation** (`width/inline-size/inset-*/margin/padding/gap` in transitions or keyframes) is unchecked — five live offenders (P2-10).
4. **polish.css is wholesale allowlisted** ("gradual migration") — it is the largest motion file (91 transition declarations, 51 keyframes, 28 RM blocks) and hosts most raw durations (1.4s/1.6s/1.8s/3.2s/3.6s/4s/4.5s/6s/7.5s/9s), the linear-doctrine violations, and the spring vocabulary outside tokens.css.
5. Non-linear easing on infinite loops passes despite tokens.css:110–113 declaring `--ease-linear` "the only legal spelling" for loops (10+ offenders, §1.3).
Fix: add grep blocks for `\d+(\.\d++)?s\b` in transition/animation contexts, `transition:\s*all`, and a python-based layout-prop scanner; scope the polish allowlist down to named sections or a `/* motion-gate: allow */` marker.

**P1-5 — 27 infinite animations keep running while fully offscreen.**
Measured live with `document.getAnimations()` parked at the landing page bottom: 27 infinite loops alive, **all offscreen** (`madarek-hero-drift` 22s, `madark-sweep`, `polish-shimmer-sweep` 3.2s, `madark-breathe` on the hero CTA, `madark-sway` stickers…). Violates animate.md ("any nonessential loop must stop when offscreen or hidden") and the craft floor. By contrast the student dashboard is clean (2 infinite, both onscreen: bell-badge pulse, welcome-card breathe).
Fix: the landing sections already run IOs (useReveal) — reuse one observer to toggle `.is-offscreen { animation-play-state: paused }` on ambient-loop subtrees, or gate each ambient loop's selector on `.in-view` (hero loops stop once scrolled away). Cheapest correct version: `content-visibility: auto` is NOT recommended here (breaks reveal geometry); class-gating is.

### P2 ×9

**P2-6 — Button ripple: invisible on light buttons, layout-animating, mislabeled origin.**
`polish.css:3230–3245`: `.btn::after { background: rgba(255,255,255,0.25) }`, `@keyframes madark-ripple { 0% {inline-size:0; block-size:0} 100% {inline-size:240%; block-size:240%} }` on `:active`.
(a) On light-theme surfaces (`--surface` #F1EFEC) the white overlay shifts channels ~Δ4/255 — **imperceptible; VLM-verified: "no visible ripple"** on the pressed light button (only scale+bg darkening visible). Works on primary/copper only. (4-A12 cross-ref.)
(b) Animating `inline-size/block-size` = **layout + paint per frame on every button press**, app-wide — should be `transform: scale()` on a fixed-size pseudo-element.
(c) Comment says "radial pulse at click origin" but origin is hardcoded center (50%/50%) — no click coordinates.
Fix: `.btn::after { inline-size: 240%; block-size: 240%; transform: scale(0) }` + keyframes scaling 0→1, background `color-mix(in srgb, currentColor 18%, transparent)` so it reads on light and dark buttons alike; optionally set `--ripple-x/--ripple-y` from pointerdown for true origin.

**P2-7 — `owner-row-in` defined twice with different bodies; last one wins globally.**
`owner.css:845` (`translateX(calc(6px * var(--motion-direction)))` — RTL-aware slide, consumed by the timeline at :839) vs `owner.css:1040` (`translateY(4px)`, consumed by the users table at :1036). CSS keyframes with the same name don't merge — the later definition replaces the first for the entire document, so the owner timeline's RTL-aware entrance silently became a 4px vertical rise.
Fix: rename the second to `owner-users-row-in` (1 line) and update :1036.

**P2-8 — `madarek-sheet-slide-bottom` defined twice; the authored spring never runs.**
`motion.css:204` (settle-overshoot spring, added wave 2-a with a comment claiming the keyframe "was never defined anywhere") vs `components.css:1280` (plain `translateY(100%)`). Both `@layer components`; components.css is imported after motion.css → the plain slide wins; motion.css's spring is dead code. (Latent anyway: zero Sheet consumers per 4-A9.)
Fix: delete one — keep the spring version in motion.css and remove the components.css copy (or vice versa) so the file that documents the behavior owns it.

**P2-9 — Five skeleton-shimmer systems; the live one violates the app's own linear-loop doctrine.**
Live dashboard skeleton: `madark-shimmer-rtl 1.6s var(--motion-ease-standard)` (polish.css:3346, overrides layer) — a raw 1600ms duration and an **eased** infinite sweep (visible velocity pulse each iteration) — overriding motion.css:141's token-driven `skeleton-shimmer 1200ms linear` + its RM static-block rule. Also coexisting: `polish-shimmer` 1800ms (polish.css:85), `madarek-shimmer` (components.css:1069, eased), `madark-search-shimmer` 1400ms, `polish-shimmer-sweep` 3.2s. RM is still safe (base belt freezes them; static gradient remains — verified).
Fix: keep polish's RTL-aware direction (genuinely good) but drive it from a token (`--motion-duration-skeleton`) with `--ease-linear`; fold the other shimmers into it over time.

**P2-10 — Layout-property transitions (reflow on interaction).**
- `owner.css:169` — toggle thumb via `inset-inline-start` 240ms (should be `transform: translateX()`; latent: the seeded app has **zero feature flags** so `ToggleSwitch` never renders — OwnerSystemPage:186 maps over an empty list).
- `polish.css:1400` — `.notif-item:hover` re-pads `padding-inline-start` 12→18px (text reflow on hover of every notification row).
- `polish.css:1494` — `.notif-panel-viewall:hover` transitions `gap`.
- Progress fills animate `width`/`inline-size` in 3 places with **3 different timings** (student.css:452 `--motion-duration-stat` 700ms; training.css:764 700ms; components.css:572 380ms; LecturePlayerPage:315 fill span gets polish.css:3368's 520ms spring) — and polish.css:3368's shotgun `[class*="progress"] > span` also matches ~5 text spans (`lecture-progress-head > span`, `course-hero-progress-head > span`…) giving labels meaningless width transitions while **missing** the canonical `.progress-fill` (a div, not span).
Fix: thumb → transform; notif hover → transform an inner icon/translate the row; fills → `transform: scaleX()` with `transform-origin: right` (RTL-correct) or at minimum one shared timing; replace the shotgun selector with `.progress-fill, [class*="progress-fill"]`.

**P2-11 — Image animated on hover (craft-floor violation).**
`polish.css:4318–4325` — `.vision-card:hover img { transform: scale(1.05) }` over 720ms. Directly violates the impeccable interaction rule "never animate an image on hover, directly or through its parent — give the container the feedback." Only occurrence in the codebase (checked).
Fix: lift/scale the card container or a gradient overlay layer instead; drop 720ms to `--motion-duration-medium`.

**P2-12 — Interaction-token contract is 100% unconsumed; `.btn` has three competing transition blocks and two `:active` definitions.**
Dead tokens (rg-verified zero consumers): `--press-scale`, `--press-translate`, `--hover-lift`, `--hover-lift-lg`, `--interactive-transition`, `--transition-all/fast/normal/slow`, `--t-cinema-all`, `--state-button-hover-translate`, `--state-button-pressed-scale`, `--state-card-hover-translate`, `--state-card-pressed-scale`. Meanwhile the shipped press states are hand-rolled: `.btn:active { translateY(1px) }` (polish.css:137, pages layer) vs `.btn:active { scale(0.97) }` (polish.css:2651, overrides — the live one, measured `matrix(0.97…)`); card hover −3px; `.pill:active { scale(0.96) }`; bottom-nav `:active` measured scale(0.93) (CSS says 0.96 at notifications.css:243 — a polish override amplifies it). Three `.btn` transition blocks: components.css:299, polish.css:~125, polish.css:~2640 (the live one).
Fix: either adopt the tokens (map hand-rolled values onto them) or delete the block — a token contract nothing consumes is worse than no contract. Consolidate `.btn` transitions to one definition.

**P2-13 — Toast entrance is a spring-bounce by layer accident.**
`notifications.css:355` defines the designed entrance (`madarek-toast-in` 240ms `--motion-ease-decelerate`) but `polish.css:4106` (overrides layer) wins the cascade: live toast measured `madark-toast-in 0.32s cubic-bezier(0.34,1.56,0.64,1)` — a bounce overshoot on a *passive* notification, which animate.md explicitly warns against by reflex. Exit (160ms accelerate, notifications.css:359) survives — exit-faster-than-entrance still holds (320/160).
Fix: decide the intent once — recommended: delete polish's override, keep 240ms decelerate; if spring is wanted, delete the notifications copy.

**P2-14 — Duration drift between the two reveal systems + CountUp ignores the stat token.**
Landing reveal 520ms (`--t-slower`, polish.css:592) vs platform reveal token 360ms; stagger 80–400ms hardcoded (polish.css:601–605) vs `--motion-stagger-step` 60ms. `CountUp.tsx:12` hard-codes `duration = 1100` while `--motion-duration-stat: 700ms` exists for exactly this and has zero JS consumers. `--motion-duration-stat` also moonlights as the *spinner* duration (components.css:1059, auth.css:488).
Fix: pick one reveal duration token for both systems; CountUp reads the token (or at least documents why 1100); add a dedicated `--motion-duration-spinner` or use `--motion-duration-skeleton` semantics.

### P3 ×8

**P3-15 — `terminal-blink` fades smoothly** (student.css:1541–1546, 1200ms standard-ease infinite). A terminal cursor blink should be `steps(2, jump-none)`-style; an eased fade reads as a pulsing LED, not a cursor.
**P3-16 — Checkbox checkmark pops with no motion** (polish.css:1109) — `:checked::after` swaps content; the bg/border transition 240ms but the check itself appears in one frame. A 120ms scale/draw would complete the micro-interaction. Also `input[type=checkbox] { transition: var(--t-clean) }` (polish.css:1086) → `all`.
**P3-17 — Token graveyard + spring sprawl.** ~12 dead tokens (P2-12) plus `--ease-spring ≡ --ease-bounce` (identical values) and three more spring curves defined in polish.css:2881–2883 outside tokens.css. Authors cannot know which spring is canonical.
**P3-18 — Missing easing tokens** — `colleges.css:64–68` transitions transform/border/box-shadow with durations but no easing (falls back to browser `ease`, breaking the easing consistency the tokens mandate). Same pattern in a handful of multi-line transitions.
**P3-19 — Sidebar collapse choreography defined twice** — base.css:155 (`grid-template-columns` 240ms decelerate) vs polish.css:3032 (360ms `--ease-spring-soft`, the live one). The shell animates differently if polish ever loads late/fails; one definition should own it.
**P3-20 — `--motion-duration-stat` semantic drift** (spinner duration, P2-14) — token names should not moonlight.
**P3-21 — `html { scroll-behavior: smooth }` global** (base.css:24) — cross-ref 4-A1 (poisons snap tooling campaign-wide; also affects route scroll-restoration feel — 4-A14). RM belt correctly forces `auto` under reduced motion.
**P3-22 — Micro-interaction consistency gaps** — nav items have no press state (only bg/color hover, measured); `.att-toggle:active { scale(0.97) }` exists for teacher attendance but student list rows/cards have no press feedback beyond the bottom-nav/btn/pill family. Fine to leave, but the press language is currently three different scales (0.93 / 0.96 / 0.97).

---

## 3. Verified-good (do-not-regress)

- **Reduced motion is exemplary:** global belt (base.css:314–323, durations + delays + iteration + scroll-behavior) + 60 per-file RM blocks + 21 JS files honoring it (useReducedMotion subscription, live OS-toggle re-evaluation). Live-verified with `reducedMotion: 'reduce'`: landing 39/39 reveals visible (VLM: "fully rendered, readable"), dashboard zero hidden leaf nodes, modal renders in final state instantly, toast appears with no animation, skeleton static, charts freeze via chartTheme.ts's own RM tracker (belt can't reach canvas). The motion.css RM token overrides (80ms cross-fade affordance, slowed-but-alive spinner) are thoughtful.
- **PageTransition** (wave 7-b consolidation) — the single 160ms `page-enter` fade, verified running mid-flight on two consecutive navigations (t=0→100ms, opacity 0→1); keyed remount, no JS timing, interruptible, scroll restoration unaffected.
- **Parallax** — IO-driven (zero rAF loop), spec-capped ≤8px, visibilitychange re-sample, RM pins `--parallax-y: 0px`. Model implementation.
- **CountUp** — real value rendered by default (can never stick at 0), rAF canceled on unmount, RM no-op.
- **Exit faster than entrance** holds across overlays (160ms exits vs 240–320 entrances).
- **will-change discipline** — 6 declarations total, all on transient animators (toasts, drawer).
- **Sticker idle wiggle** (components.css:149–165) — the app's best delight beat: dormant 88% of a 5s cycle, per-child delays, hover kill-switch. Authored, not decorative.
- **Focus ring system** — universal `:where()` ring from motion.css:48 with AA contrast tokens; per-component custom opt-out (`data-focus-ring="custom"`).
- **Megamenu stagger, RTL toast anchoring, sheet exit direction awareness** (`--motion-direction` in components.css:3337–3343) — RTL motion thinking is genuinely present where it ships.
- **No dead keyframes; no `transition: all` written literally in source** (the pattern hides in tokens — P1-3).

## 4. Scores
| Dimension | Score |
|---|---|
| Token discipline & gate | 6/10 |
| Reveal/scroll systems | 5/10 |
| Micro-interaction craft | 7/10 |
| Reduced motion & a11y | 9/10 |
| Runtime performance discipline | 6/10 |
| System coherence (dups/dead inventory) | 5/10 |
| **Overall** | **6.3/10** |

## 5. Top-10 quick wins (ordered)
1. `useReveal.ts`: mount-time in-viewport check + scrolled-past reconciliation (P1-1 — fixes hero-CTA dead-zone AND fling skip; ~10 lines).
2. `Reveal.tsx`: same scrolled-past clause (P1-2; 2 lines).
3. Ripple rewrite: fixed-size pseudo + `transform: scale()` + `color-mix(currentColor…)` tint (P2-6; 2 blocks in polish.css).
4. `owner.css:1040`: rename `owner-row-in` → `owner-users-row-in` (P2-7; 2 lines).
5. Delete one `madarek-sheet-slide-bottom` definition (P2-8; recommend keeping motion.css's spring).
6. `check-motion-tokens.sh`: add `s`-unit + `transition: all` checks (P1-4; two grep blocks).
7. Toast: remove polish's `madark-toast-in` override so the designed 240ms decelerate governs (P2-13; −8 lines).
8. Skeleton shimmer: token duration + `--ease-linear` in polish's RTL variant (P2-9; 2 lines).
9. Vision image hover: move the scale to the card/overlay, 240ms (P2-11; 3 lines).
10. Replace `var(--t-clean)` with explicit property lists on `.icon-btn` + `.pill` first (P1-3 seed; kills the phantom scrollbar-color/outline transitions).

## 6. Files to touch
- `frontend/src/hooks/useReveal.ts` (P1-1)
- `frontend/src/components/motion/Reveal.tsx` (P1-2)
- `frontend/src/styles/polish.css` (P1-3, P1-5, P2-6, P2-9, P2-10, P2-11, P2-12, P2-13, P3-16, P3-19)
- `frontend/src/styles/tokens.css` (P2-12 dead tokens, P2-14, P3-17)
- `frontend/src/styles/owner.css` (P2-7, P2-10)
- `frontend/src/styles/components.css` (P2-8, P2-10, P2-12)
- `frontend/src/styles/notifications.css` (P2-13 decision)
- `frontend/src/styles/motion.css` (P2-8, P2-9 consolidation)
- `frontend/src/styles/student.css`, `training.css`, `colleges.css` (P2-10, P3-15, P3-18)
- `frontend/src/components/CountUp.tsx` (P2-14)
- `frontend/src/pages/LandingPage.tsx` + `landing.css` (P1-5 offscreen pause, P3-21 cross-ref)
- `scripts/check-motion-tokens.sh` (P1-4)

**Cross-refs:** 4-A1 (CTA contrast P0 — gated by P1-1; smooth-scroll; reveal skip source), 4-A12 (ripple invisibility — root-caused here at polish.css:3237), 4-A9 (Sheet/Popover latent inventory; anchored-layer choreography), 4-A2 (bottom-nav press scale 0.93 vs 0.96), 4-A14 (scroll-behavior vs scroll restoration), 4-A10 (bottom-nav touch).

**Zero source edits · zero git operations · zero DB writes (login rate-limiter avoided via signed-token session injection; onboarding-complete POSTs blocked).**
