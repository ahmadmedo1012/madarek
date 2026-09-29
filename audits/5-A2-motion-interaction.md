# Audit 5-A2 — Motion & Micro-interaction System (Campaign 5 «الحرفة الختامية»)

**Agent:** 5-A2 (audit-only — zero source files modified)
**Scope:** `frontend/src/styles/{motion,polish,tokens,base,components,layout,landing}.css`, `components/motion/**`, inline TSX transitions, gate `scripts/check-motion-tokens.sh`, live DOM on http://localhost:5173.
**Method:** full read of the 7 scope stylesheets + all 8 motion-component files + `hooks/useReveal.ts` + `CountUp.tsx`; reproduced the gate's scanner in python to get exact `file:line` for every allowlisted debt line (the gate prints counts only, and its reported line numbers are **comment-stripped** coordinates — the table below maps to **raw file lines**); 3 Playwright probe rounds (v2/v4 click-safe with a capture-phase click blocker so :active measurement doesn't navigate; v5 focused ripple/RM/CTA/interruptibility) across 9 page-contexts × desktop + 2 × mobile(390×844, hasTouch) + 1 reduced-motion context; 45-step keyboard Tab pass per page for :focus-visible.
**Reference floor:** scroll-craft `taste.md` (Motion + States), impeccable `craft-floor.md`, AGENTS-BRIEF §3 guardrails + §4 craft floor.

> ⚠ **Tooling warning for every future agent (near-false-positive, documented so nobody re-files it):**
> the Bash tool's output pipeline **eats the literal two bytes `[m`** when displaying file contents (it interprets them as an ANSI SGR-reset). `scripts/check-motion-tokens.sh:290` *displays* as `debts_seenatched] += 1` and `LandingPage.tsx:74` *displays* as `const enuOpen, setMenuOpen]` — both files are byte-perfect (`debts_seen[matched] += 1` / `const [menuOpen, setMenuOpen]`, verified by hex dump + successful `ast.parse`). Always hex-dump before filing "corruption". This is the same artifact worklog wave 12 documented.

---

## 1. Motion-token debt — the 28 allowlisted lines, catalogued with fixes

Gate state: `bash scripts/check-motion-tokens.sh` → **OK, 28 reviewed debt lines** across 9 reasons. Full catalogue (raw line numbers):

### 1a. Ambient infinite-loop durations — 21 lines (fix: ONE token family)

All are `animation: <name> <raw-s>s … infinite` where only the duration is off-token. The debt reason itself names the fix: *"awaiting an `--motion-duration-ambient` token family in tokens.css (4-A11 §1.3, P1-5)"*. The family was never planned in `specs/001-premium-motion-system/contracts/motion-tokens.md` (grep: zero "ambient" hits) — it needs to be authored.

| # | file:line | animation | proposed token |
|---|-----------|-----------|----------------|
| 1 | polish.css:548 | `polish-bar-breathe 3.6s` | `--motion-duration-ambient-slow` (3.6s) |
| 2 | polish.css:566 | `polish-float-1 6s` | `--motion-duration-ambient-drift` (6s) |
| 3 | polish.css:567 | `polish-float-2 7.5s` | `--motion-duration-ambient-drift` (6–8s band: use 7.5s value or normalize) |
| 4 | polish.css:619 | `polish-shimmer-sweep 3.2s` | `--motion-duration-ambient-slow` |
| 5 | polish.css:1154 | `polish-hydration-pulse 1.4s` | `--motion-duration-ambient-pulse` (1.6s band: normalize 1.4→1.6 or keep 1.4) |
| 6 | polish.css:1367 | `notif-bell-pulse 2.4s` | `--motion-duration-ambient` (2.4s) |
| 7 | polish.css:2408 | `madark-breathe 4s` | `--motion-duration-ambient-slow` |
| 8 | polish.css:2436 | `madark-sweep 4.5s` (delay 1.2s exempt) | `--motion-duration-ambient-slow` |
| 9 | polish.css:2764 | `madark-welcome-breathe 9s` | `--motion-duration-ambient-cinema` (9s) |
| 10 | polish.css:3488 | `madark-sway 6s` | `--motion-duration-ambient-drift` |
| 11 | polish.css:3923 | `madark-heartbeat 2.4s` | `--motion-duration-ambient` |
| 12 | polish.css:3933 | `madark-pulse-ring 2.4s` | `--motion-duration-ambient` |
| 13 | polish.css:3958 | `madark-alert-glow 3s` | `--motion-duration-ambient-slow` (3s band) |
| 14 | polish.css:4322 | `madark-empty-wiggle 6s` | `--motion-duration-ambient-drift` |
| 15 | polish.css:4337 | `madark-error-throb 1.6s` | `--motion-duration-ambient-pulse` |
| 16 | polish.css:5066 | `madark-loadingstate-pulse 1.6s` | `--motion-duration-ambient-pulse` |
| 17 | components.css:162 | `madarek-sticker-idle 5s` | `--motion-duration-ambient-drift` (5–6s band) |
| 18 | landing.css:61 | `madarek-typing 1.2s` | `--motion-duration-ambient-pulse` (typing blink; 1.2s vs 1.6s is a visible cadence — keep 1.2s as its own value or accept the shift) |
| 19 | landing.css:309 | `madarek-hero-drift 22s` | `--motion-duration-ambient-scene` (22s) |
| 20 | landing.css:391 | `madarek-pulse-dot 2.4s` | `--motion-duration-ambient` |
| 21 | owner.css:562 | `pulse-live 2s` | `--motion-duration-ambient` (2–2.4s band) |

**Proposed family (6 tokens covers all 21 lines):**
```css
--motion-duration-ambient-pulse: 1.6s;  /* throb / typing / hydration   */
--motion-duration-ambient:       2.4s;  /* breathe / heartbeat / pulse  */
--motion-duration-ambient-slow:  3.6s;  /* bar-breathe / sweep / glow   */
--motion-duration-ambient-drift: 6s;    /* float / sway / wiggle        */
--motion-duration-ambient-cinema: 9s;   /* welcome-breathe              */
--motion-duration-ambient-scene: 22s;   /* hero drift                   */
```
plus `@media (prefers-reduced-motion: reduce) { :root { --motion-duration-ambient-*: 0ms; } }` in tokens.css for belt-independence, then swap the 21 declarations and **delete the 4 matching DEBT regexes** (entries stop matching → gate fails → forced re-review, per the documented protocol). Values that don't normalize cleanly (1.2s typing, 7.5s float-2, 5s sticker, 22s drift) get their own token rather than a visible cadence change — or the orchestrator approves the normalization explicitly.

### 1b. Spring easing vocabulary outside tokens — 3 lines (fix: adopt, don't invent)

| # | file:line | declaration |
|---|-----------|-------------|
| 22 | polish.css:2916 | `--ease-spring-soft: cubic-bezier(0.34, 1.18, 0.64, 1);` |
| 23 | polish.css:2917 | `--ease-spring-bounce: cubic-bezier(0.34, 1.56, 0.64, 1);` |
| 24 | polish.css:2918 | `--ease-spring-snappy: cubic-bezier(0.5, 1.6, 0.4, 1);` |

tokens.css already ships `--ease-spring`/`--ease-bounce` — but both are the **same** curve `(0.34, 1.36, 0.64, 1)` (tokens.css:123-124), while polish's bounce is genuinely bouncier (1.56). Fix: move the three verbatim into tokens.css next to the existing spring tokens (they are real, distinct, consumed vocabulary — polish.css:3349 metric underline-draw etc.), keep the cascade identical (tokens layer + polish re-definition site deleted), delete the DEBT regex. Bonus cleanup: dedupe `--ease-bounce` ≡ `--ease-spring` or differentiate them deliberately.

### 1c. Layout-property transitions (4-A11 P2-10 leftovers) — 4 lines (fix: scaleX conversions)

| # | file:line | rule | proper fix |
|---|-----------|------|-----------|
| 25 | student.css:123 | `.lecture-progress-fill { transition: inline-size var(--motion-duration-stat) … }` | Width is set inline by LecturePlayerPage — mirror the 23-b ProgressBar conversion: page sets `--fill-scale` (0..1) inline instead of width; CSS becomes `inline-size: 100%; transform: scaleX(var(--fill-scale, 0)); transform-origin: inline-start` (`[dir=rtl]` flips to `inline-end`); transition moves to `transform`. Needs the TSX coordination the debt entry names. |
| 26 | student.css:2211 | `@keyframes campus-fill-in { from { inline-size: 0; } }` | Rewrite to `from { transform: scaleX(0); }` on a full-width fill with `transform-origin: 100% 50%` under `[dir=rtl]` (city bars grow from the reading edge). Consumer `.campus-city-fill` + its RM kill at student.css:2228 stay. |
| 27 | components.css:1646 | `.onboarding-flow-dot { transition: background …, inline-size var(--t-fast) }` (pill grows 8→22px when active) | Convert to `::after` pill that is always 22px wide and `scaleX(0)`→`scaleX(1)` with `transform-origin: inline-start`; keeps the pill shape via fixed radius on the pseudo. |
| 28 | components.css:2268 | `.trend-bar { transition: inline-size var(--t-slow) var(--ease-out) }` | Trend bars are data widths — convert to full-track `scaleX()` fills like 23-b's `.progress-fill` (transform-origin follows reading direction), or accept the debt (bars are 14px tall, cheap reflow) with a re-reviewed entry. |

All four fixes follow the 23-b precedent (`.progress-fill` scaleX conversion — components.css:592-607), which also shows the RTL transform-origin pattern to copy.

---

## 2. Interaction-state completeness — gap matrix

Legend: ✓ = styled + live-measured (or statically verified where live isn't reachable); ◐ = partial; ✗ = missing; — = not applicable. “FV” = focus-visible ring (universal ring from motion.css:48 + polish v22). Live columns from the click-safe probe (hover = real mouse-over computed delta; active = real mousedown computed delta).

| Component (evidence) | hover | FV | active/press | disabled | cursor | touch ≥44px |
|---|---|---|---|---|---|---|
| `.btn` all variants (live ×20 samples, 8 pages) | ✓ bg+border+lift | ✓ (0 misses / 44-stop Tab pass ×9 pages) | ✓ **scale(0.97)** (taste target hit) | ✓ opacity .55 + not-allowed (base.css:79, components.css:335) | ✓ pointer | ✓ (`.sm` bumped 44px on mobile, polish.css:270 group; comp-score/moderation `.btn.sm` pinned 44px, components.css:2793) |
| `.icon-btn` (live: topbar-notif, search-toggle, mobile-toggle) | ✓ bg+color | ✓ | **✗ no press cue** — no `:active` rule in any sheet; live mousedown shows only the hover bg | ✓ (button global) | ✓ | ✓ mobile min-44 (polish.css:270); 38px desktop OK |
| `.pill` filter chips (live ×8) | ✓ bg+color+border | ✓ | ✓ scale(0.96) | ◐ `.pill:disabled` absent but `<button disabled>` inherits base.css:79 | ✓ | ✓ |
| `.tab` (live: community tablist ×3) | ✓ color + underline scaleX(.45) | ✓ | ✓ scale(0.96) | — (tabs never disabled) | ✓ | ✓ |
| `a.nav-item` sidebar (live ×21) | ✓ bg+color | ✓ | ✓ scale(0.985) | — | ✓ | ✓ 44px (mobile drawer rows measured 295×44) |
| `.dropdown-item` (static, components.css:1466-1474) | ✓ + `[data-active]` roving focus | ✓ (1470) | ✗ no `:active` rule | ✓ `[aria-disabled]` (1474) | ✓ | ✓ |
| `.thumb-card` cards-as-links (live ×12, desktop+mobile) | ✓ border+shadow+**translateY(−2px) lift** | ✓ | **✗ INVERTED** — no `:active`; during real mousedown the card stays lifted (measured matrix(1,0,0,1,0,−3) on 6/6 course cards) | — (never disabled) | ✓ | ✓ |
| `.landing-final-cta-btn` (live ×2) | ✓ bg+lift −2px | ✓ | ◐ measured −2px during press (hover lift only, no press-down) | — | ✓ | ✓ (52px) |
| inputs (`.input` etc., components.css:657-696) | ✓ border→strong — **but the topbar search pill's hover is a no-op**, see P1-2 | ✓ accent border + halo + ring | — (text inputs don't press; click-focus ring measured ✓) | **✗ text/select/textarea disabled unthemed** — `--state-input-disabled-opacity` (tokens.css:190) has **zero consumers**; only checkbox/radio are covered (polish.css:1133) | ✓ text | ✓ 44px (components.css:663) |
| `select.input` (live: teacher-grades) | ✓ | ✓ | ✓ | ✗ (same text-control gap) | **◐ cursor: default** (measured) — polish cursor audit (3174) covers button/[role]/.pill/.tab/summary, not select | ✓ |
| `.table-pagination-actions button` (static 876-888) | ✓ | ✓ | ◐ active state = `.active` page style; no `:active` press | ✓ opacity .45 + not-allowed | ✓ | ✓ (44px @640px, 889) |
| `.toast-close` (static 1389-1401) | ✓ color | ✓ | ✗ | — | ✓ | **◐ ~26×22px** — sub-44 on touch |
| `.chat-send` (static polish.css:1820) | ✓ (1834) | ✓ | ✓ (press transforms at 1839 area) | ✓ (1839) | ✓ | **◐ 40×40** |
| `.theme-toggle-option` (live ×7; static layout.css:569) | ✓ color | ✓ | ✓ bg (measured) | — | ✓ | **✗ 30×28, no mobile bump** — the theme menu opens on phones |
| `.sidebar-collapse-btn` (live) | ✓ | ✓ | ✓ | — | ✓ | — desktop-only chrome (28×28, sidebar hidden ≤920px) |
| `.skip-link` (live) | — by design (only exists for keyboard) | ✓ ring (measured) | — | — | ✓ | ✓ 45px |
| `.landing-nav-link` / `.landing-megamenu-item` (live ×7) | ✓ | ✓ (landing.css:202, 247) | ✓ megamenu bg (landing.css:248) | — | ✓ | ✓ (65px items measured) |
| `.landing-brand` (live ×2) | **✗** no visual change (children carry explicit colors defeating base.css:69 `a:hover`) | ✓ | ✗ | — | ✓ | ✓ |
| `.text-link` (teacher-grades, live) | ◐ underline color strengthens only (components.css:1211 — decor-color 45%→100%; not in my measured property set, verified statically) | ✓ | ✗ (inline text links — acceptable without press) | — | ✓ | ✓ |
| Sortable headers | — none exist in the app (no `aria-sort` anywhere) | | | | | |
| Sheet drag-handle | — none exist (Sheet = side/bottom panels + swipe-dismiss toast only) | | | | | |
| Toast stack (Toast.tsx) | ✓ swipe-to-dismiss + timers; exit anim before unmount | ✓ | ✓ | — | ✓ | ◐ close button above |

**Press-feedback census (taste.md: “anything pressable visibly presses — scale(0.97) or translateY(1px)”):** `.btn` ✓ 0.97, `.pill` ✓ 0.96, `.nav-item` ✓ 0.985, `.tab` ✓ 0.96, cards ✓✗ (lifts instead — inverted), `.icon-btn` ✗, dropdown items ✗, `.chat-send`/`.checkpoint-option`/`.ai-gap-card`/`.post-action` ✓ (student.css:293/579/2014 translateY(1px) family). The four primitive controls press; the two most-used chrome classes (icon buttons, cards-as-links) do not.

---

## 3. Easing & duration quality (taste.md rules)

| taste.md rule | verdict | evidence |
|---|---|---|
| UI transitions < 300ms | ✓ for controls; **✗ for route entrance** | hover/press transitions all ride `--t-fast` 160ms / `--motion-duration-micro` 80ms; but the route-change stack settles in ~680–900ms (see §4/P1-1) |
| Hover 120–180ms | ✓ | `.btn`/`.nav-item`/`.tab`/`.pill` all `--t-fast` (160ms). **Exception:** `.btn.primary/.accent::before` hover sheen sweeps over `--motion-duration-stat` **700ms** (components.css:356/388) — a one-shot sweep, decorative, but 4× the hover budget (P3) |
| No ease-in on UI | ✓ entrances/hover all `--ease-out`/`--ease`/`--motion-ease-decelerate` (cubic-bezier(0.16,1,0.3,1) ≈ taste's exponential ease-out). **Exits** use `--motion-ease-accelerate` (components.css:3446-3498) — correct exit doctrine (accelerate out), deliberate, documented; not a violation |
| Exponential ease-out | ✓ | `--ease-out (0.16,1,0.3,1)` / `--ease-soft (0.22,1,0.36,1)` — both in the taste-approved family; `--ease (0.4,0,0.2,1)` for micro feedback |
| Never scale(0) on entrances | ✓ | entrances start at scale(0.92)–(0.98)+opacity (`madark-pop-in` 0.92, `madarek-pop` 0.98, section-accent number-tick 0.96, `madarek-popover-in`). The only scale(0) is the **ripple's press** (polish.css:3314-3323) — a press effect fading 0.6→0, not a content entrance; acceptable reading of the rule, note-only |
| Stagger 30–80ms | ✓ | `--motion-stagger-step: 60ms` (tokens.css:161) consumed by Reveal (motion.css:104) and landing (landing.css:1316-20); polish grid stagger steps 50ms (polish.css:2598-2625); landing `.reveal-d-*` steps 80ms — all inside 30–80 |
| Hover gated to (hover:hover)+(pointer:fine) | ◐ | 18 gates in polish.css (card ::after 3261, metric lift 2664, megamenu…) but the **transform hovers of `.btn.primary/.accent` (−1px, components.css:333) and `.thumb-card` (−2px, polish.css:1973/components.css:1819) are ungated** — iOS sticky-hover will leave buttons/cards stuck in lift on first tap (P2). Color-only hovers left ungated are fine. Live mobile context confirmed gated rules correctly don't fire |
| RM = fewer/gentler, not zero | ◐ zero, by design collision | motion.css:25-36 explicitly keeps 80ms page/reveal cross-fades under RM (“cross-fades collapse to ≤80ms so transitional affordance remains perceivable”) — but base.css:314-323's universal `0.01ms !important` belt **overrides it unconditionally**. What ships = zero motion with full comprehension (opacity preserved, content visible — live-verified). Safest possible reading, but the 80ms accommodation in motion.css is dead code (P3: either honor it by scoping the belt, or delete the claim) |

**Infinite-loop easing doctrine conflict (P3):** tokens.css:118-121 declares `--ease-linear` “the only correct curve for infinite loops” — and the continuous loops comply (shimmer 619, spinners). But the *pulse* loops use `--ease-out`/`--motion-ease-decelerate` (landing.css:391 pulse-dot, polish.css:1367 bell-pulse, polish.css:3933 pulse-ring). Beats want ease-out; the doctrine text says linear. Reconcile the doctrine wording (“continuous sweeps/spins = linear; beats may decelerate”) or normalize.

**JS-driven durations escape the token system (P3, gate blind spot):** the gate scans CSS `transition:`/`animation:` only. `CountUp` defaults to 1100ms (components/CountUp.tsx:12, cubic ease-out, RM-aware ✓), Toast `durationMs`, onboarding timers — all reasonable values, all untracked by any token. Document as policy or extend the gate.

---

## 4. Authored moments — verdict per page

Live inventory per page (running `animation-name` census + reveal/accent/parallax counts):

| Page | Entrance stack (live) | Ambient loops (live) | Reveal/SectionAccent/Parallax | Verdict |
|---|---|---|---|---|
| `/student/dashboard` | `page-enter` 160ms (.content-inner) + `madark-page-in` 380ms (.page) + topbar-in (load) | error-throb ×1 (state) | 0 / 0 / 0 | **No authored moment** — only the compound route fade |
| `/student/courses` | same + `madark-page-title-in` (520ms+80ms spring) | error-throb ×2, retry-pop ×2 | 0 / 0 / 0 | Same |
| `/student/exams` | same + `madark-stagger-up` ×3 grids | — | 0 / 0 / 0 | Same + grid stagger stamped ×3 |
| `/student/results` (grades) | same | error-throb ×1 | 0 / 0 / 0 | Same |
| `/community` | same + stagger ×3 + `madark-pop-in` ×3 | error-throb ×1 | 0 / 0 / 0 | Same |
| `/teacher/grades` | same | `madark-empty-wiggle` ×1 (empty state) | 0 / 0 / 0 | Same |
| `/admin/dashboard` | same | error-throb ×1 | 0 / 0 / 0 | Same |
| `/` landing | word-by-word title (60-460ms) + 34 × `reveal-up` (520ms, delays to 400ms) + `polish-rise` ×7 + img-in + CountUp ×8 | **~20 simultaneous**: bar-breathe ×7, sway ×6, typing ×3, float ×2, pulse-dot, shimmer, hero-drift 22s | 39 reveal / 2 SectionAccent(scene-paint) / 1 Parallax | **Over-authored** — rich, coherent, but the same `reveal-up` entrance is stamped on every section ×34 and ~20 infinite loops run concurrently (incl. off-screen) |

**Findings:**
- **P1-1 (systemic):** every route change plays **3–4 compounding entrances** — `.content-inner` `page-enter` 160ms (base.css:217's `madarek-page-enter` is overridden by polish v9's `page-enter`), `.page` `madark-page-in` 380ms (polish.css:2572), `.page-header .page-title-block` `madark-page-title-in` 520ms + 80ms delay with the off-token spring (polish.css:3700-3702), and `madark-stagger-up` 380ms + ≤300ms delay on **every child of `.grid-2/3/4/auto-200/auto-260`** (polish.css:2587-2625 — **128 grid usages across 43 files**). Nested opacity ramps multiply; last grid child settles ~680ms after navigation. PageTransition.tsx's docblock (wave 7-b) claims "The ONE mechanism that survives is the keyed remount" — true for motion.css, but polish's entrance family re-introduced the compounding the consolidation removed.
- **P2 (taste §“one authored moment”):** 7/8 app pages share one identical entrance stack and own zero distinctive motion identity (0 Reveal/SectionAccent/Parallax consumers outside landing/colleges/payment/CourseDetail); landing over-authors (34 stamped reveals + ~20 loops). Neither end matches "ONE authored moment per page". This is the authored-moments verdict, deliberately P2 (taste) not P1 (nothing breaks).
- Positive: landing's hero (word-by-word + parallax + typing) IS a real authored moment; SectionAccent's five kinds + useSectionAccent are well-built and RM-aware; the mockup bars' 220ms stagger (polish.css:548-556) is genuinely nice.

---

## 5. Interruptibility

- **Entrances never lock input:** no `pointer-events: none` during any entrance (only on `:disabled` / `.card.disabled`, correct). ✓
- **Reveal system:** transition-driven (`.reveal-up` opacity/transform), one-shot, fling-hardened (above-fold + scrollend + resize/load belts — useReveal.ts:62-158, Reveal.tsx:61-163). Transitions can reverse mid-flight. ✓
- **Overlays:** entrance/exit are keyframes with `useDelayedUnmount` + `onAnimationEnd` (Modal.tsx:53-58, Sheet.tsx:68-73, Dropdown.tsx:177-178, Toast.tsx:184-242 with token+slack timer net). **Live mid-entrance toggle test:** opened the topbar dropdown and Escape-closed it 60ms into its 160ms entrance → exits cleanly, unmounts, no stuck `[data-closing]`, no input lock. ✓ Keyframe exits restart from their own `from` state (not from current position) — the standard transition-vs-animation tradeoff, acceptable for 160ms overlays, note-only.
- **Route transitions:** keyed remount, declarative, scroll restoration unaffected (PageTransition.tsx). Remount during entrance = fresh entrance, never a lock. ✓
- **Grid stagger uses `backwards` fill** (the 4-b fix, polish.css:2588-2592 comment) so hover-lifts survive post-entrance. ✓ (`.page`/`.content-inner` use `both` but pin `transform: none` on non-hovering containers — harmless.)

## 6. Motion safety (prefers-reduced-motion)

- **Global belt (base.css:314-323):** `animation-duration: 0.01ms !important` + `animation-delay: 0s !important` + `animation-iteration-count: 1 !important` + transition equivalents + `scroll-behavior: auto !important`. **Live-verified under emulated RM: 0 running animations on landing AND dashboard; every transition duration = 1e-05s; content opacity 1; `.parallax` pinned `--parallax-y: 0px` (component gates via useReducedMotion, listener attached only when allowed).** No parallax/scroll-driven motion ignores the gate (Parallax.tsx:53-56; landing scroll-progress bar is scroll-scrubbed with no own duration — hand-paced, exempt by doctrine, conveys position).
- **Token-level belts:** tokens.css:650-655 zeroes `--t-fast…--t-cinema`, tokens.css:880-884 zeroes `--t-micro`, motion.css:25-36 zeroes the semantic set (with the 80ms page/reveal intent that the global belt trumps — see §3).
- **Per-family explicit off-switches:** present for reveal-fade, skeleton, sheet-panel-bottom, section-accent family, ripple, floats, bar-breathe, shimmer, hydration, bell-pulse, sway, empty-wiggle, error-throb, stagger-up, page-in, rise. **Missing own switches (belt-covered only, guardrail #6 asks for own):** `madark-breathe` (2408), `madark-sweep` (2436), `madark-welcome-breathe` (2764), `madark-heartbeat` (3923), `madark-pulse-ring` (3933), `madark-alert-glow` (3958), `madark-loadingstate-pulse` (5066), `madarek-sticker-idle` (components.css:162), `pulse-live` (owner.css:562), `madarek-typing` (landing.css:61), `madarek-hero-drift` (landing.css:309), `madarek-pulse-dot` (landing.css:391) — 12 families (P3: zero user impact today, but each new belt bypass reintroduces them silently).
- CountUp checks matchMedia and shows the real value instantly (CountUp.tsx:21-24) ✓. Spinner under RM slows to 2s instead of stopping (motion.css:228-234) — deliberate, documented ✓.

## 7. Ripple — current state (C4 follow-up)

`.btn::after` ripple was rewritten in 4-A11 P2-6 to a transform-scaled pseudo (polish.css:3305-3330) with its own RM kill. **Live measurement (student dashboard):**
- At rest: `scrollWidth 187 vs clientWidth 89` (**2.1×**) — the hover-sheen `::before` at `translateX(-110%)` (components.css:347-359) hangs outside the padding box even while idle; `overflow: hidden` (polish.css:3271) clips the paint but scrollWidth still reports the overflow.
- During press: `scrollWidth 360` (4×), `::after` running `madark-ripple` 0.52s, button transform scale(0.97).
- **Document-level: contained** — `documentElement.scrollWidth 1270 < clientWidth 1280`, parent row 229/229. No page scrollbar, no layout shift.

Verdict: **P2** — the C4-noted scrollWidth inflation persists at the element level (it moved from the ::after sizing to the ::before/::after overflow region). Harm contained today, but it poisons any `scrollWidth`-based measurement (snap scripts, future ripple-from-pointer JS) and runs on every primary/accent button. Proper fix: sheen as `background-position` animation on an `inset: 0` pseudo (backgrounds never contribute to scrollable overflow), or size the pseudos in px and clip via a wrapper.

---

## 8. Classification

### P0 — none
No motion/interaction finding breaks function, blocks input, fails WCAG, or leaks layout to the document. The keyboard focus system is exemplary (0 ring misses across 9 pages × ~44 stops), reduced-motion is airtight (live-verified), press feedback exists on all four primitive controls.

### P1 (2)
1. **Route-change entrance compounding** — 3–4 stacked entrance animations per navigation; ~680–900ms settle; same stack on every page; violates the 7-b “ONE mechanism” doctrine + taste “under 300ms”/“one authored moment”. Evidence: live anims census (§4 table), polish.css:2572 (`madark-page-in` 380ms), polish.css:3700-3702 (`madark-page-title-in` 520ms + 80ms + off-token spring), polish.css:2587-2625 (`madark-stagger-up` on 128 grid usages / 43 files), base.css:217 vs polish `page-enter`. **Fix direction:** keep exactly one of {content-inner fade, page-in} at ≤240ms; drop the title-block spring; keep ONE stagger per page hero section only.
2. **Topbar search-pill hover is a no-op via a dead token chain** — `--state-card-hover-border: var(--rule-strong, var(--rule, var(--neutral-200)))` (tokens.css:182) where **`--rule-strong` is never defined anywhere**; it resolves to `--rule` ≡ `--border` (`#E9E7E2`), so `.topbar-search input:hover` (components.css:729) sets the border to its own resting color. Live-verified both computed values identical. The app-wide search affordance on every authenticated page has zero hover feedback. Same dead token consumed at polish.css:69, polish.css:1087, colleges.css:251, colleges.css:489. **Fix:** define `--rule-strong: var(--border-strong)` in tokens.css (1 line), then re-verify those 5 consumers render the intended strengthen.

### P2 (7)
3. **`.icon-btn` has no press feedback** — no `:active` rule in any stylesheet (grep across all 15 sheets); live mousedown shows only the hover bg. The most-pressed chrome class (notif bell, search toggle, theme toggle, overlay close). Fix: `.icon-btn:active:not(:disabled) { transform: scale(0.94); transition-duration: var(--motion-duration-micro); }` (+ RM reset in polish's belt group).
4. **Cards-as-links press INVERTED** — `.thumb-card:hover { translateY(-2px) }` with no `:active`: during real press the card stays lifted (measured −3px on 6/6 course cards, desktop + mobile). taste.md: press = 0.97/1px-down. Fix: `.thumb-card:active { transform: translateY(0) scale(0.99) }` (and same for `.landing-final-cta-btn`, measured −2px while pressed).
5. **28-line motion-token debt** — full fix table in §1 (one ambient token family kills 21 lines; spring adoption kills 3; four scaleX conversions kill 4).
6. **Ripple/sheen pseudo overflow** — §7 (element scrollWidth 2.1× at rest, 4× on press; document contained).
7. **Text-control disabled state unthemed** — `--state-input-disabled-opacity` dead token; input/select/textarea disabled = UA default; craft floor requires the state, tokens already define it. Fix: `.input:disabled, input:disabled, textarea:disabled, select:disabled { opacity: var(--state-input-disabled-opacity); cursor: not-allowed; }` (+ background tint per theme).
8. **Ungated hover-lift transforms** — `.btn.primary/.accent:hover` (−1px), `.thumb-card:hover` (−2px) not inside `(hover: hover)`; iOS sticky-hover pins the lift after tap. Polish gates 18 rules already — extend to the two transform hovers (or all transform hovers).
9. **Authored-moment imbalance** — §4: 7/8 app pages share one identical compound entrance and have no distinctive moment; landing stamps `reveal-up` ×34 on every section + ~20 concurrent ambient loops (several off-screen). Fix direction: per-page single moment (e.g. exams = one stagger on the exam list; grades = chart draw-in), landing: cut stamped reveals on sections 3+ to calm reveals or none.

### P3 (9)
10. 12 keyframe families without explicit RM off-switches (§6 list) — belt-covered, live-verified inert; guardrail #6 wants own switches.
11. motion.css's 80ms RM cross-fade accommodation is inert under the global belt — honor or delete (motion.css:25-36 vs base.css:314-323).
12. Infinite-loop easing doctrine conflict — pulses use ease-out vs tokens.css's "linear for infinite loops" (landing.css:391, polish.css:1367, 3933).
13. `.btn` hover sheen 700ms (`--motion-duration-stat`) — 4× the 120–180ms hover budget (components.css:356, 388).
14. Selected tab / current nav-item show no hover delta (cascade order: polish.css:283 beats :275; layout.css:145 beats :143) — the currently-active control is the one place hover dies.
15. Sub-44px touch targets: `.theme-toggle-option` 30×28 (layout.css:570, no mobile bump), `.chat-send` 40×40, `.toast-close` ~26×22.
16. `select` cursor stays `default` (measured) — extend polish's cursor audit selector (polish.css:3174).
17. `.landing-brand` no hover feedback (children's explicit colors defeat base.css `a:hover`).
18. JS motion durations outside the token system (CountUp 1100ms, Toast timers) — gate blind spot; document as policy.
19. tokens.css:126-131 still ships `--t-clean: all …` + `--t-cinema-all`/`--transition-all` (neutralized app-wide by polish's overrides-layer redefinition, polish.css:2930-2941 — but the smuggling hazard the 4-A11 audit flagged lives on at the source; the 22 consumers keep working only because polish wins the cascade).

---

## 9. Is the system 9+-ready?

**Close, not there.** What's already at or above the bar: token discipline (gate green, only reviewed debt), the focus-visible system (universal, AA-safe, 0 misses live), reduced-motion safety (live-verified total neutralization with comprehension preserved), press feedback on all four primitive controls, stagger grammar (60ms step, caps), exit-animation hygiene (delayed unmount + animationend + timer nets), Reveal fling-hardening.

**What blocks the 9+:** the P1 pair — route entrance compounding (every page's first impression is a 700ms double-fade of a fade) and the dead `--rule-strong` chain killing the platform's most-used hover affordance — plus the two press-feedback holes (icon-btn, cards) that taste.md calls out by name. Fix order: **P1-2 (1-line token + verify) → P1-1 (entrance diet) → P2-3/4 (press rules, ~6 lines) → P2-5 (debt table §1) → P2-7/8 → P3s opportunistically.** After P1+P2-3/4 I would call it 9+.

**Hand-offs to other agents:** P2-9 authored moments is a design decision (orchestrator) before any fix wave; P2-7 Form primitive disabled styling belongs to the primitives owner; §1a ambient token family + §1b spring adoption is a tokens.css-author task (file-disjoint from page sheets).

*All live numbers in this audit are from measurement runs on this machine (chromium via playwright, localhost:5173, seeded states); every static claim carries file:line. No source files were modified.*
