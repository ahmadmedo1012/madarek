# 5-A5 — All-Devices UX Sweep #2 («لكل الأجهزة» — الجولة الثانية)

Campaign 5 «الحرفة الختامية» · audit-only (no source edits, no git).
**Scope:** the full app — 59 routes across all 5 roles + public (landing/auth/register/colleges/leaderboard/college-detail/404, vision, competitions, training, achievements, community, docviewer) × {320×700, 390×844, 768×1024} + 8-route spot set × {1024×768, 1440×900, 1920×1080} + landscape 844×390 (5 surfaces + drawer + palette) + reduced-motion (8 surfaces) + 150% zoom (260px effective, 4 surfaces) + touch-target enumeration (17 routes, 748 interactive elements) + sticky/overlay collision census (exam-bar ×4 viewports, toast, command palette ×4) + image ratio/upscale census (all cells).
**Method:** 9 playwright probes (`/tmp/a5-probes/sweep*.mjs` on the shared `lib.mjs` settle/measure protocol — hydration-gone → skeleton-gone → instant-scroll reveal pass → 420ms settle, worst-of top/mid/bottom), 2 verification reruns for rate-limit-suspect cells, DOM experiments (toggle one computed style → re-measure) for root-cause confirmation, 3 VLM calls with every claim re-measured. Data: `/tmp/a5-probes/data/*.json` (201-cell matrix + sweeps 2-9). Shots: `/tmp/madarek-shots/a5/` (74).

## Verdict in one line

The C4 steady-state floor **holds for 196/201 cells (97.5%)** — but the two leaks that remain are both on the funnel's front door (public `/colleges` overflows 174-244px ≤390; owner users search still triggers iOS zoom), the 320px topbar-title problem **regressed** from C4 (wave-21's search toggle ate the title track: 44 routes now lose >40px at 320, `te-exams` renders the title at **0px**), and 150% zoom on a 390 phone adds a 30px document-wide horizontal drag on every authed page.

## Cell matrix (route × viewport)

Codes: `OVF<n>` document horizontal overflow n px · `ZM` sub-16px control (iOS zoom) · `TBL` table overflow · `TR<n>` topbar title truncated n px @320 (cross-cutting, filed as P1-2; `tr<n>` = >20px @390). All cells not coded pass overflow + iOS-zoom + table + image checks. **Desktop spots (landing, auth, st-dash, st-exams, te-grades, ad-students, ow-realtime, colleges × {1024, 1440, 1920}): 24/24 pass — zero overflow, zero distorted images, zero sub-16 inputs.**

| Route | 320 | 390 | 768 | Title @320 |
|---|---|---|---|---|
| `/` landing | ✓ | ✓ | ✓ | — |
| `/auth` | ✓ | ✓ | ✓ | — |
| `/auth/register` | ✓ | ✓ | ✓ | — |
| `/colleges` | **OVF244** | **OVF174** | ✓ | — |
| `/colleges/leaderboard` | ✓ | ✓ | ✓ | — |
| `/colleges/:id` | ✓ | ✓ | ✓ | — |
| `/404`-route (bad path) | ✓ | ✓ | ✓ | — |
| `/student/dashboard` | ✓ | ✓ | ✓ | TR73 |
| `/student/courses` | ✓ | ✓ | ✓ | TR93 |
| `/student/courses/:id` | ✓ | ✓ | ✓ | TR82 |
| `/student/schedule` | ✓ | ✓ | ✓ | TR93 |
| `/student/results` | ✓ | ✓ | ✓ | TR103 |
| `/student/library` | ✓ | ✓ | ✓ | TR102 |
| `/student/mooc` | ✓ | ✓ | ✓ | TR79 |
| `/student/jobs` | ✓ | ✓ | ✓ | TR70 |
| `/student/matrix` | ✓ | ✓ | ✓ | TR116 |
| `/student/research` | ✓ | ✓ | ✓ | TR78 |
| `/student/profile` | ✓ | ✓ | ✓ | TR89 |
| `/student/webinars` | ✓ | ✓ | ✓ | TR124 |
| `/student/exams` | ✓ | ✓ | ✓ | TR96 |
| `/student/online-exams` | ✓ | ✓ | ✓ | TR117 |
| `/student/online-exams/:id` (taker) | ✓ | ✓ | ✓ | TR78 |
| `/student/social` | ✓ | ✓ | ✓ | TR106 |
| `/student/downloads` | ✓ | ✓ | ✓ | TR86 |
| `/student/university` | ✓ | ✓ | ✓ | TR77 |
| `/student/live` | ✓ | ✓ | ✓ | TR72 |
| `/student/payment` | ✓ | ✓ | ✓ | TR87 |
| `/student/map` | ✓ | ✓ | ✓ | TR128 |
| `/student/labs` | ✓ | ✓ | ✓ | TR109 |
| `/student/gamification` | ✓ | ✓ | ✓ | TR110 |
| `/student/skills` | ✓ | ✓ | ✓ | — |
| `/student/alerts` | ✓ | ✓ | ✓ | TR55 |
| `/student/ar` | ✓ | ✓ | ✓ | TR86 |
| `/student/ai` | ✓ | ✓ | ✓ | — |
| `/training` | ✓ | ✓ | ✓ | TR76 |
| `/training/:track` | ✓ | ✓ | ✓ | TR70 |
| `/training/:track/:lesson` | ✓ | ✓ | ✓ | TR69 |
| `/achievements` | ✓ | ✓ | ✓ | TR118 |
| `/community` | ✓ | ✓ | ✓ | TR102 |
| `/document/:pdf` (docviewer) | ✓ | ✓ | ✓ | TR105 |
| `/teacher/dashboard` | ✓ | ✓ | ✓ | TR72 |
| `/teacher/grades` | ✓ | ✓ | ✓ | TR82 |
| `/teacher/students` | ✓ | ✓ | ✓ | TR77 |
| `/teacher/exams` | ✓ | ✓ | ✓ | **TR136** |
| `/teacher/exams/:id` | ✓ | ✓ | ✓ | **TR136** |
| `/teacher/intelligence/:id` | ✓ | ✓ | ✓ | TR82 |
| `/admin/dashboard` | ✓ | ✓ | ✓ | — |
| `/admin/students` | ✓ | ✓ | ✓ | — |
| `/admin/courses` | ✓ | ✓ | ✓ | — |
| `/admin/settings` | ✓ | ✓ | ✓ | — |
| `/quality/dashboard` | ✓ | ✓ | ✓ | — |
| `/quality/professors` | ✓ | ✓ | ✓ | — |
| `/owner/dashboard` | ✓ | ✓ | ✓ | TR125 |
| `/owner/users` | **ZM** | **ZM** | **ZM** | TR107 |
| `/owner/realtime` | ✓ | ✓ | ✓ | TR81 |
| `/vision` | ✓ | ✓ | ✓ | TR99 |
| `/vision/:slug` | ✓ | ✓ | ✓ | TR59 |
| `/competitions` | ✓ | ✓ | ✓ | TR122 |
| `/competitions/:id` | ✓ | ✓ | ✓ | TR44 |

**Aux sweeps:** landscape 844×390 (dash/exam-taker/landing/auth/admin-students): 0 overflow on all 5; drawer fits (320×390, footer visible); palette fits (t47→b343, 16px input) — but landing hero fails the fold test (P2-2). Reduced-motion ×8 surfaces: pass. 150% zoom (260px): 3/4 fail on the 30px document overflow (P2-1); tables all re-stack correctly. Touch enumeration: 685 interactives across 17 routes.

## C4 disposition — what actually got fixed vs regressed vs still open

| C4 item | Status | Evidence (this sweep) |
|---|---|---|
| **P1-1** skeleton 420/480px overflow on cold load | **FIXED** | `States.tsx:345/347/371/373` now `width="min(260px,100%)"`/`min(420px,100%)`/`min(300px,100%)`/`min(480px,100%)`; cold-load sampling (120ms frames) on exams/matrix@390, library@320, grades@390: worst overflow **0px** every frame. |
| **P1-2** 15px inputs → iOS zoom (auth, grades select, composer) | **FIXED at the recipe — one page residual** | `components.css:673` `font-size: max(16px, var(--type-body-size))` floors every `.input`/raw control; auth + teacher-grades + social composer all measured 16px. **Still broken: `/owner/users` search 13px at all widths (P1-3 below).** No other sub-16 control found on any of the 59 routes (pdf viewer inputs clean in docviewer cells). |
| **P2-1** topbar title truncation at 320 (−5…−45px, 7 routes) | **REGRESSED (now P1)** | 44 routes lose >40px @320; `te-exams`/`te-exam-detail` title measured **clientWidth 0** (scrollWidth 136); at 390, 21 routes truncate >20px (te-exams −66, st-map −58). Cause: wave-21's `topbar-search-toggle` (44px, `layout.css:326-328`) joined the ≤920px actions cluster — `grid-template-columns: auto 1fr auto` (`layout.css:350-352`) now gives the title track 0 at 320. A10's quick-win #5 (drop the AI pill ≤420) was never taken. |
| **P2-2** sub-44 targets (.btn.sm 32px, retry 37px) | **FIXED for .btn.sm; two inline links still open; new .btn gap** | `.btn.sm` floor 44px (`polish.css:2212`) verified live («نشر» 42×44, retry CTAs 44 tall). **Still open:** `a.text-link` 106×19 (te-grades), `a.auth-register-link` 92×19 (auth). **New:** base `.btn` is 40px (P2-3). |
| **P2-3** drawer footer 26–32px controls | **HALF-FIXED** | logout 26→**44×44** (`layout.css:273` min-* floor), mobile-close 36→**44×44**. **Still open:** `theme-toggle-option` **30×28** (`layout.css:569-570` hard size), `sidebar-tour-trigger` **295×32** (`components.css:1666`). |
| **P3-1/2/3/4/5** (nav gap 1px, pills 36px, ripple scrollWidth, bottom-nav gap, 1024 rhythm) | unchanged / accepted | gallery chips still 36px min-block (segmented-control pattern, accepted); ripple still inflates element-level scrollWidth (document-contained — matches A2). |

## P1 — Major

### P1-1 · `/colleges` gallery toolbar: 552px of flex content inside a 380px column toolbar → 174-244px horizontal overflow on the public funnel ≤390
- **Where:** `frontend/src/styles/colleges.css:447` (base `.gallery-toolbar { flex-wrap: wrap }`) × `:585-600` (≤767px block sets `flex-direction: column; align-items: stretch` but **never resets `flex-wrap`**) × `:602-612` (`.gallery-chip-strip { flex-wrap: nowrap }` → strip max-content 595px) × `frontend/src/pages/colleges/CollegePages.tsx:229` (inline `style={{ flex: '1 1 240px' }}` on the search wrapper — written for the desktop row layout).
- **Evidence (measured @390, guest):** `documentElement.scrollWidth 564 vs clientWidth 390` → **174px overflow** (244px @320 — worst cell in the whole matrix, on a PUBLIC page). Wrapper div measured **552×240** inside the 380px toolbar; the search input 552 wide; the chip-strip 552 wide (scrollWidth 595, 7 chips). Mechanism: column+wrap makes the strip's nowrap max-content (595px) size the wrap-line's cross axis, and `align-items: stretch` stretches BOTH children to 552. Bonus defect from the same inline style: in the column direction `flex-basis: 240px` applies to the **main (vertical) axis** → the wrapper is **240px tall with a 44px input in it** (~196px dead gap; toolbar 317px tall).
- **DOM experiments (same page, one property toggled):** `toolbar.style.flexWrap='nowrap'` → wrapper width **552→356 (fixed)**; `wrapper.style.alignSelf='flex-start'` → 383; removing the input's `min-inline-size` or the strip's `overflow-x` alone → no change. Root cause isolated to the un-reset `flex-wrap`.
- **VLM** (colleges-390-toolbar-dissect.png): confirms left-edge cutoff + "massive unjustified white space between the filter row and the results count" — both claims re-measured in DOM (overflow + wrapper h240) before filing.
- **Fix sketch:** in the ≤767px block add `flex-wrap: nowrap` to `.gallery-toolbar`; replace the inline `flex: '1 1 240px'` (CollegePages.tsx:229) with a class that the mobile block resets to `flex: none` (or `flex-basis: auto`) so the wrapper's height collapses to the input's 44px. One-file CSS fix + one inline-style removal.

### P1-2 · Topbar page-title track collapsed at 320 (0px on the worst routes) and truncating at 390 — regression vs C4
- **Where:** `styles/layout.css:350-352` (≤920px `grid-template-columns: auto 1fr auto`) + the four-control mobile actions cluster (search-toggle 44 + AI pill 39 + notif 36 + user 46 ≈ 202px, `layout.css:326-328` + `Topbar.tsx:120-140`).
- **Evidence (measured):** `/teacher/exams` @320: title `clientWidth 0, scrollWidth 136` — **the page name is completely invisible**; toggle 44 + actions 202 consume the row. Across the matrix: 44 routes lose >40px of title at 320 (worst te-exams/te-exam-detail −136, st-map −128, ow-dash −125), 21 routes still truncate >20px at 390 (te-exams −66). C4 measured −5…−45px @320 only — wave-21's search toggle (added for 4-A2 P1-3) took the last ~44px the title had. Corroborates 5-A4 P1-2 (nav lens) with the full-route×viewport picture.
- **Fix sketch (A10's #5, still valid):** at ≤420px drop the `اسأل AI` quick-action from the topbar (it lives in the sidebar + `/student/ai`) and/or collapse `topbar-user` to avatar-only (frees 46px); belt-and-braces: `.topbar-title { -webkit-line-clamp: 2 }` instead of nowrap-ellipsis so a 2-word title always survives. Verify the 260px zoom case with the same probe (P2-1 disappears with it).

### P1-3 · Owner users search renders at 13px → iOS zoom (last live instance of C4 P1-2)
- **Where:** `styles/owner.css:448-458` — `.owner-search-bar input { font-size: var(--fs-sm) }`; `tokens.css:66` `--fs-sm: 13px`. Overrides the 21-b recipe floor (`components.css:673`).
- **Evidence:** computed 13px at 320/390/768 on `/owner/users` — the only sub-16px control found on all 59 routes (every other input/select/textarea measured ≥16px).
- **Fix sketch:** delete the `font-size` line (the input inherits the shared 16px recipe — visual delta none, `.owner-search-bar` keeps its padding/border intent).

## P2 — Should fix

### P2-1 · 150% zoom on a 390 phone (260px effective): 30px document horizontal drag + user avatar pushed off-canvas, every authed page
- **Where:** same topbar grid/cluster as P1-2 (`layout.css:350-352`); no `overflow` guard on the topbar.
- **Evidence (measured @260 CSS px):** `documentElement.scrollWidth 290 vs clientWidth 260` on st-dash, st-exams, te-grades (ad-students 0 — its title is short); `.topbar-actions` rect **l−40 → r162** (202px cluster overflows 40px to the inline-end/left in RTL); `.topbar-user` l−40, avatar l−29 — the user chip is clipped off-screen. Title `clientWidth 0`. The page CONTENT itself reflows correctly (all tables re-stack: admin-students `tbl-stack` 192px, grades 174px; KPI cards stack). VLM judged the zoomed exams page "usable, no overflow" — **the overflow claim is disproven by measurement** (deSW 290); the usability verdict stands for content.
- **Fix sketch:** the P1-2 cluster diet fixes this too (at 260 the row needs ≤216px of chrome); plus a safety `overflow-x: clip` (or `min-inline-size: 0` on the actions cluster + allow it to wrap) so the topbar can never expand the document. WCAG 1.4.10 reflow at 320px passes today (0 overflow) — this is the 150%-zoom bar the brief sets above it.

### P2-2 · Landscape phone (844×390): landing hero headline + both CTAs are 2 screens below the fold
- **Where:** `LandingPage.tsx` hero + `landing.css:285+` (hero stacks eyebrow → 70.9px/2-line h1 → subtitle → CTA row → mockup with no landscape accommodation).
- **Evidence (measured @844×390):** hero section **1352px tall** in a 390px viewport; `h1` top **439** (fs 70.896px, 2 lines); primary CTA «أنشئ حسابك الجديد» top **741**, secondary 741, mockup 892-1395. First screen = header + eyebrow + illustration only. VLM confirms: "headline is cut off, CTA button is not visible." (Portrait is fine: CTA top 625@390 / 669@320 — above the fold both.)
- **Fix sketch:** `@media (min-width: 480px) and (max-height: 480px)` compact hero: display steps down one rung (taste.md's portrait rule applied to landscape), headline + CTA in a row, mockup hidden or capped at remaining height. (A1's Wave-25 landing rework can absorb this.)

### P2-3 · Base `.btn` is 40px tall — under the 44px mobile touch floor (platform-wide)
- **Where:** `components.css:307` `.btn { block-size: 40px }`; the mobile floor exists only for `.btn.sm` (`polish.css:2212`).
- **Evidence (measured @390):** te-exams primary CTA «قالب اختبار جديد» **153×40** (gap 0 to neighbor); exam-taker «بدء الاختبار» **98×40**; exam submit **112×40**; back-links 352×40. The brief's craft floor: "touch target ≥ 44px on mobile". (`.btn.sm` instances all measured 44 tall — that half is healthy.)
- **Fix sketch:** extend the overrides-layer mobile block: `@media (max-width: 640px) { .btn { min-block-size: 44px; } }` — same min-* trick `layout.css:308-310` documents for the topbar (min-* beats the physical `block-size` at used-value time).

### P2-4 · Drawer footer: theme options 30×28 (gap 0) + tour trigger 32px — the still-open half of C4 P2-3
- **Where:** `layout.css:569-570` `.theme-toggle-option { inline-size: 30px; block-size: 28px }` (three adjacent options, container `gap: 0`); `components.css:1666` `.sidebar-tour-trigger` (sp-2/sp-3 padding → 32px).
- **Evidence (drawer open @390, live):** logout **44×44** ✓, mobile-close **44×44** ✓ (both fixed since C4); theme options **30×28** ×3 with 0 gap between them (worst touch cluster on the platform); tour trigger **295×32**. Appears on every authed route drawer (15/15 enumerated authed routes).
- **Fix sketch:** 44px hit areas via padding (keep the 28px glyph); the three-option segmented row gets ≥4px gaps — mirror the `layout.css:273` min-* floor pattern used for logout.

### P2-5 · Inline text links at 19px tall — the signup-funnel link included (C4 P2-2 residue)
- **Where:** `a.text-link` (shared class) + `a.auth-register-link` (`AuthPage.tsx` / auth.css).
- **Evidence (measured @390):** te-grades «شاهد الذكاء الأكاديميّ» **106×19**; auth «أنشئ حسابك الآن» **92×19** — identical to C4's numbers; both are min-dim <32 (hard violation), gaps 46-50px (spacing fine).
- **Fix sketch:** ≤640px `a.text-link, .auth-register-link { padding-block: 12px; }` (hit area 43-44px, visual unchanged — inline links keep their underline baseline).

## P3 — Minor / observations

- **P3-1 · Landing footer/brand links 21-30px tall** — 13 sub-44 targets on `/` (footer links 158×21 gap12, brand 88×30/158×30). Adequate 12px spacing, inline-nav pattern; C4-A1 already tracked. Bump padding only if the footer gets touched anyway.
- **P3-2 · Sticky exam-bar wraps to 110px at 320** — topbar 60 + bar 110 = 170px of sticky chrome in a 700px viewport (24%); at 390+ it is 69px. No overlap defect (sticks at top:60, cards scroll under, timer visible, submit clears the bottom-nav by 295px+ at 390 / 295px at 320). Consider condensing title+timer to one row ≤360px.
- **P3-3 · Ctrl+K does not open the command palette while the mobile drawer is open** — landscape probe with drawer open: no `[role=dialog]` in DOM after Ctrl+K; clean context: palette opens and fits (t47→b343, input 16px/44px). Cross-ref 5-A4's drawer focus-trap debt (same surface).
- **P3-4 · Auth page in landscape** — register link at t:829 (2.1 screens) in 390px-tall landscape; page scrolls fine (public route, window scroll), no overflow. Note only.
- **Note (not a defect):** landing campus photo ratio "distortion" flags are `object-fit: cover` crops (verified `cover`, srcset switches candidates per viewport: 390→750.webp, 1920→larger) — intentional, not squash. No img renders >1.6× naturalWidth anywhere (A10's blur rule holds).

## Verified-good (do not regress)

- **Zero horizontal overflow on 196/201 cells**, incl. every ≥768px cell (24/24 desktop spots at 1024/1440/1920) and 174 of the 177 mobile cells; worst-case measurement at top/mid/bottom scroll.
- **All tables re-stack ≤640** (`tbl-stack` block display verified at 320 AND at the 260px zoom equivalent: admin-students 192px, quality rosters, teacher grades 174px, leaderboard 175 labelled cells from 22-d intact).
- **Cold-load skeleton overflow (C4 P1-1) dead**: `min(px,100%)` widths + 0px overflow in every sampled suspense frame.
- **iOS-zoom floor holds platform-wide except one input** (auth/grades/composer/social/pdf all ≥16px).
- **Reduced motion exemplary** (re-confirmed on 8 surfaces): 0 running animations; nothing stuck mid-reveal (the only sub-0.9 text found is `.btn:disabled` styling — `components.css:335` — and designed muted copy at 0.85); landing parallax freezes at a static scale(1.05), no translation.
- **Sticky/overlay z-ladder clean**: census across 171 cells shows only the expected rungs (skip-link 500, sidebar/backdrop 300/299, topbar/bottom-nav/landing-header/gallery-toolbar 100); exam-bar sticks correctly below the topbar at 320/390/768/1024 with the timer visible and zero card overlap; command palette fits at 320/390/768/1440 + landscape (16px input, 44px tall, list scrolls at 320).
- **Toast vs bottom-nav**: mobile toasts lifted `calc(76px + env(safe-area-inset-bottom))` (`notifications.css:426-432`) above the 66-72px dock; z-toast 500 over z-100 nav. (Live toast trigger not reproducible in seed — owner alerts list is empty in the seed and the system page renders no dirty-able settings, so no save button exists to click; declaration + dock-height math verified.)
- **Safe-area intact**: `viewport-fit=cover` meta; content push `max(80px, 72px + env())` measured 80px; bottom-nav block-end `max(6px, env())` (env-aware).
- **Drawer in landscape fits** (320×390, nav scrolls internally, footer visible); drawer nav items 295×44; bottom-nav items ≥44 (5-max).

## Top-5 quick wins (ordered)

1. `colleges.css` ≤767 block: `flex-wrap: nowrap` + reset the search wrapper's inline flex (kills P1-1's 244px overflow AND the 196px dead gap — one file + one inline style).
2. `layout.css` ≤420px: drop the topbar AI pill / collapse user chip + title line-clamp 2 (kills P1-2 and P2-1 together).
3. `owner.css:455`: delete `font-size: var(--fs-sm)` (kills P1-3).
4. `polish.css` mobile block: `.btn { min-block-size: 44px }` next to the `.btn.sm` rule (kills P2-3).
5. `layout.css`/`components.css`: 44px hit areas for `theme-toggle-option` + `sidebar-tour-trigger` + `a.text-link`/`auth-register-link` (kills P2-4/P2-5).

## Files to touch (fix wave)

- `frontend/src/styles/colleges.css` (P1-1) · `frontend/src/pages/colleges/CollegePages.tsx:229` (P1-1 inline style)
- `frontend/src/styles/layout.css` (P1-2/P2-1 grid + cluster, P2-4) · `frontend/src/components/layout/Topbar.tsx` (P1-2 markup side)
- `frontend/src/styles/owner.css` (P1-3) · `frontend/src/styles/polish.css` (P2-3) · `frontend/src/styles/components.css` (P2-4 tour trigger) · `frontend/src/pages/landing/LandingPage.tsx` + `landing.css` (P2-2, fold into A1's Wave-25)
