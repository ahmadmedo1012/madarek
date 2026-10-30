# 4-A10 — Responsive All-Devices Sweep («لكل الأجهزة»)

Campaign 4 «سيادة المظهر» · Wave 19 · audit-only (no source edits, no git).
**Scope:** cross-cutting responsive matrix — 14 routes × 6 viewports (320×700, 390×844, 768×1024, 1024×768, 1440×900, 1920×1080) + touch targets, input zoom, gaps, truncation, sticky/fixed overlap, blurry images, safe-area.
**Method:** one crash-safe playwright probe (`/home/z/a10/a10-probe.mjs`, 84 page loads, storage-state auth, instant scroll + 350–400ms settle at top/mid/bottom of the `.content` scroll container) + 3 verification probes (`a10-verify*.mjs`, `a10-scroll-check.mjs`) + 5 VLM critique calls (≤8 budget) with every VLM claim re-measured before filing. Evidence: 13 new screenshots + ~40 inherited from the crashed first A10 attempt, all `/tmp/madarek-shots/a10-*`. Data: `/tmp/a10-data.jsonl`.

## Verdict in one line

The steady-state responsive floor is **solid** — zero horizontal overflow, zero blurry images, correct safe-area insets, no permanently blocked controls on any of the 84 route×viewport cells — but two cross-cutting P1s (loading-state overflow skeleton, 15px inputs → iOS zoom) and one P2 family (320px topbar title truncation, sub-44 targets) repeat on every page.

## Findings matrix (route × viewport)

`ovf` = horizontal overflow px (steady state) · `tt` = sub-44px targets at ≤390 (shell chrome targets shared by all authed routes are marked `shell`) · `si` = inputs <16px · `tr` = meaningful truncation. All cells otherwise clean; **no overflow, no blocked controls, no blurry images on ANY cell ≥768px.**

| Route | 320 | 390 | 768 | 1024 | 1440 | 1920 |
|---|---|---|---|---|---|---|
| `/` landing | tt4 (brand 30px, footer links 21px — A1) | tt4 | ✓ | ✓ | ✓ | ✓ |
| `/auth` | tt2, **si2 (15px)** | **si2 (15px)** | ✓ | ✓ | ✓ | ✓ |
| `/student/dashboard` | tt4 shell + skel-clip | **ovf30 during load** (skeleton) | ✓ | ✓ | ✓ | ✓ |
| `/student/courses` | tt4 shell | tt5 shell | ✓ | ✓ | ✓ | ✓ |
| `/student/exams` | tt4 shell, **title −25px** | tt4 shell | ✓ | ✓ | ✓ | ✓ |
| `/student/matrix` | tt4 shell, **title −45px** | tt4 shell | ✓ | ✓ | ✓ | ✓ |
| `/student/social` | tt4 shell, **si1 (13px)**, نشر 42×44 | si1, نشر 42×44 | ✓ | ✓ | ✓ | ✓ |
| `/community` | tt4 shell, title −31px | tt4 shell | ✓ | ✓ | ✓ | ✓ |
| `/training` | tt5, title −5px | tt4 shell | ✓ | ✓ | ✓ | ✓ |
| `/teacher/dashboard` | tt5 (retry 37px on error state) | tt4 shell | ✓ | ✓ | ✓ | ✓ |
| `/teacher/grades` | tt4, **si1 (15px select)**, link 19px | si1, **text-link 106×19** | ✓ | ✓ | ✓ | ✓ |
| `/admin/dashboard` | tt4 shell | tt7 (drawer footer 26–32px) | ✓ | ✓ | ✓ | ✓ |
| `/colleges` | tt4 shell | tt7 (drawer footer) | ✓ | ✓ | ✓ | ✓ |
| `/owner/realtime` | tt6, title −10px | **tt8** (drawer+topbar) | ✓ | ✓ | ✓ | ✓ |

The 4 shared shell targets on every authed route at ≤390 (A2's scope, cross-referenced): `sidebar-mobile-close` 36×36, `topbar-mobile-toggle` 38×38, `topbar-notif` 36×36, `اسأل AI` `a.btn.primary.sm` 39×44.

## Clean bills (measured, not assumed)

- **Horizontal overflow: 0px on all 84 cells** in steady state (`documentElement.scrollWidth − clientWidth`, verified at top/mid/bottom scroll). Only the transient skeleton case (P1-1) breaks this.
- **Blurry images: 0** — no `img` renders wider than 1.5× `naturalWidth` anywhere in the matrix.
- **Safe-area: present and correct** — `viewport-fit=cover` (index.html:5); bottom-nav `max(8px, env(safe-area-inset-bottom))` (notifications.css:302), content push `max(80px, 72px + env(…))` (notifications.css:310), mobile drawer block padding (layout.css:225–226), `.content-inner` (base.css:234), notifications panel (notifications.css:208).
- **Sticky/fixed overlap: no permanently blocked controls.** Three initial "CTA behind bottom-nav" suspicions (exams `فتح المصفوفة`, training retry, teacher-grades link at 390) were **disproven by scroll-container measurement**: the app scrolls inside `.content` (overflow-y:auto, AppShell.tsx:283) with 80px bottom padding, and the bottom-nav hides on scroll — after `.content` scrolls 488px the exams CTA sits fully clear (top=274). False positives from measuring `documentElement` only.
- **Bottom-nav items 70×59px** (5 items, 390) — pass. **Post action buttons 44×44** (social). **Auth demo-account buttons 44–117×44**. **Filter pills 8px gaps** (768). **Topbar action gaps 8px**.

## P1 — Major

### P1-1 · Loading skeleton is 420px wide → horizontal drag/clip on every cold route-load ≤ ~430px
- **Where:** `frontend/src/components/primitives/States.tsx:342` (`<Skeleton width={420} height={12} />` — PageSkeleton eyebrow) and `:366` (`width={480}` — detail-page skeleton, worse).
- **Evidence:** student-dashboard@390 during load: `documentElement.scrollWidth 420 vs clientWidth 390` → **30px horizontal overflow**; the same skeleton at 320 spans `left=−130…right=290` (clipped past both edges, masked by overflow-x). `AppShell.tsx:296` wraps every authed route in `<Suspense fallback={<PageSkeleton />}>`, so **every first navigation to a lazy chunk on a phone** shows a 420px element inside a ~330px content box. Resolves once data lands (measured ovf −10 after 5s) — but it is the first thing every mobile user sees, on every cold load.
- **Fix sketch:** `Skeleton` already accepts `string` widths — use `width="min(420px, 100%)"` / `"min(480px, 100%)"` at States.tsx:342/:366 (and audit the remaining numeric widths in the file: 260/300 are also > 320−gutters but only marginally).

### P1-2 · Every form control renders at 15px → iOS Safari auto-zooms on focus, app-wide
- **Where:** `frontend/src/styles/components.css:631` (`font-size: var(--type-body-size)` in the shared input recipe) ← `tokens.css:219` (`--type-body-size: var(--fs-body)` = **15px**); worst instance `.social-composer { font-size: var(--type-label-size) }` = **13px** (`student.css:1900`).
- **Evidence (measured computed sizes at 390):** auth email + password **15px** (the login form!), teacher-grades course `select` **15px**, social composer `textarea` **13px**. Anything <16px makes iOS zoom the whole page on focus — on the login form this hits 100% of mobile users at their first tap.
- **Fix sketch:** in the shared recipe: `input, select, textarea { font-size: max(16px, var(--type-body-size)); }` (keeps desktop 15px if desired, or simply bump the recipe to 16px — body text is 15px but control text at 16px is imperceptible); delete the 13px override at student.css:1900 so the composer inherits.

## P2 — Should fix

### P2-1 · Topbar page-title truncates at 320px (7 of 14 routes, 5–45px clipped)
- **Where:** `styles/layout.css:267` (`.topbar-title` min-inline-size:0 + ellipsis) × `:290-293` (≤920px grid `auto 1fr auto` keeps the full actions cluster).
- **Evidence (measured at 320):** exams «تحليل الاختبارات» `scrollWidth 96 → clientWidth 71` (−25px, **26% of the title**); matrix −45px, social −35px, community −31px, grades −11px, realtime −10px, training −5px. Row budget at 320: toggle 38 + title 71 + actions 137 (AI 39 + notif 36 + user 46 + 2×8 gap) — the title is the only shrinkable track and it loses.
- **Fix sketch:** at ≤420px reduce the actions cluster (drop the `اسأل AI` quick-action from the topbar — it's already in the sidebar/AI route — and/or collapse `topbar-user` to avatar-only), or let the title wrap to 2 lines (line-clamp 2) instead of ellipsizing a 2-word page name.

### P2-2 · Sub-44px touch targets on mobile (page-level, not A2's chrome)
- **Where / evidence (measured):**
  - `a.text-link` **106×19** — teacher-grades «شاهد الذكاء الأكاديميّ» (inline link, 19px tall).
  - `a.auth-register-link` **92×19** — auth «أنشئ حسابك الآن» (the signup funnel link!).
  - `.btn.sm { block-size: 32px }` (`components.css:418`) → error-state retry CTAs **97×37**, composer submit **42×44**, topbar `اسأل AI` **39×44** (19 route×viewport occurrences).
  - `button.auth-demo-hint-close` **40×44**.
- **Fix sketch:** `@media (max-width: 640px) { .btn.sm { min-block-size: 44px; } a.text-link, .auth-register-link { … padding-block to reach ≥44 … } }` — the codebase already uses exactly this pattern for `.moderation-actions .btn.sm { min-block-size: 44px !important }` (components.css:2646-2648); generalize it instead of per-module pins.

### P2-3 · Mobile drawer footer: 26–32px controls (cross-ref A2 P2 "sub-44 chrome")
- **Evidence (measured at 390, drawer open):** `sidebar-logout` **26×26**, `theme-toggle-option` **30×28**, `sidebar-tour-trigger` **294×32**, `sidebar-mobile-close` **36×36**. A2 owns the shell fix; listed here so the wave-21 batch sizes them once.
- **Fix sketch:** footer controls adopt 44px hit areas (padding, not visual size — keep the 26px glyph inside a 44px button).

## P3 — Minor / observations

- **P3-1 · `.nav-group { gap: 1px }`** (`layout.css:87-91`) — sidebar nav rows 1px apart. Full-width ~40px rows make actual mis-taps unlikely, but the drawer reads denser than the 4/8px scale elsewhere. Consider `gap: 2px`–`4px`.
- **P3-2 · Filter pills 36px tall** (courses@768, 64–121px wide, 8px gaps) — under the 44 bar on height; acceptable segmented-control pattern, noting for the record.
- **P3-3 · `::after` ripple inflates `scrollWidth`** on `.btn` (نشر: sw 84 vs cw 40, `::after content:""`) — harmless, but it poisons any scrollWidth-based truncation audit (and did produce one false "clipped 44px" reading here, disproven by rect check).
- **P3-4 · bottom-nav `gap: 2px`** (notifications.css:302) — intentional tab-bar density; pass.
- **P3-5 · 1024×768 landscape rhythm** — section gaps 60–84px (`--sp` scale). VLM called it a "massive empty void"; measured on-scale, filed as taste, not a defect.

## Disproven VLM claims (measured before filing — 7 of 13 claims were hallucinations)

| VLM claim | Measurement | Verdict |
|---|---|---|
| Bottom-nav 5 items squeezed <44px (×3 calls) | items **70×59** | ✗ hallucinated |
| Courses@768 title truncated/obscured | sw=cw=519, clip **0px** | ✗ |
| Filter pills cramped (<8px) | minGap **8px** | ✗ |
| Social like/comment icons <44px | **44×44** | ✗ |
| Auth demo-account grid buttons <44px | all **44×117×44** | ✗ |
| Exams KPI "status dots" tiny interactive | no such elements in DOM | ✗ |
| 1024 landscape "massive empty void" | gaps 60–84px, on `--sp` scale | ✗ (taste) |
| Auth inputs <16px → iOS zoom | **15px** computed | ✓ P1-2 |
| Drawer footer cramped sub-44 | 26/28/32px | ✓ P2-3 |
| Topbar title clipping at 320 | −25…−45px | ✓ P2-1 |
| Register/forgot links small | register **92×19** | ✓ P2-2 |
| "Forgot-password link cramped near field" | tight-gap scan found 0 pairs <8px on `/auth`; link not sibling-measurable | unproven, not filed |

## Top-10 quick wins

1. `States.tsx:342` + `:366` → `width="min(420px, 100%)"` / `"min(480px, 100%)"` (kills P1-1).
2. `components.css:631` → `font-size: max(16px, var(--type-body-size))` (kills P1-2 for every input/select/textarea).
3. `student.css:1900` → delete the 13px override (composer inherits the fixed recipe).
4. `components.css:~418` mobile block → `@media (max-width:640px){ .btn.sm{min-block-size:44px} }` and drop the per-module `!important` pins at :2646-2648.
5. `layout.css:290-293` → at ≤420px hide the topbar `اسأل AI` quick-action (frees 47px → titles stop truncating).
6. Auth register link + `a.text-link` → 44px hit area via padding-block.
7. Drawer footer buttons (logout/theme/tour) → 44px hit areas (coordinate with A2's shell batch).
8. `layout.css:87` `.nav-group` gap 1px → 3px.
9. Topbar title: allow `line-clamp: 2` under 420px instead of ellipsis (belt-and-braces with #5).
10. Add a regression guard: a tiny probe asserting `documentElement.scrollWidth ≤ clientWidth` at 320/390 for the 14 routes incl. the Suspense fallback frame (would have caught P1-1).

## Files to touch

- `frontend/src/components/primitives/States.tsx` (P1-1)
- `frontend/src/styles/components.css` (P1-2, P2-2)
- `frontend/src/styles/tokens.css` (only if the 16px bump is chosen at token level)
- `frontend/src/styles/student.css` (P1-2 composer)
- `frontend/src/styles/layout.css` (P2-1, P3-1; P2-3 if drawer footer lives here)
- `frontend/src/components/layout/Sidebar.tsx` + `Topbar.tsx` (P2-1/P2-3 markup side, coordinate with A2)
- `frontend/src/pages/AuthPage.tsx` / `styles/auth.css` (P2-2 auth links)
