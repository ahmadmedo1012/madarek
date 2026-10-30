# 4-A2 — App Shell & Navigation Audit (سيادة المظهر · Campaign 4)

**Agent:** 4-A2 · **Scope:** the chrome around every authed page — `AppShell.tsx`, `Sidebar.tsx`, `Topbar.tsx`, `BottomNav.tsx`, `GlobalSearch.tsx`, `NotificationDropdown.tsx`, `ThemeToggle.tsx`, `overlays/CommandPalette.tsx`, `styles/layout.css`, `App.tsx` route→shell wiring (+ their real style homes in `base.css`, `notifications.css`, `polish.css`, `components.css` — layout.css alone loses the cascade war, documented in-file).
**Method:** 6 playwright interaction probes (desktop 1440×900, mobile 390×844 @2x touch, tablet 768, dark 1280, 3 roles), pixel-level PNG scan of the active-marker geometry, 4 VLM critique passes (VLM claims on the marker position were hallucinated and were disproven by pixel scan — DOM/pixel evidence wins). Screenshots: `/tmp/madarek-shots/a2-*.png` (18 shots).

## Scores

| Surface | Score | Verdict |
|---|---|---|
| **Desktop shell** | **8 / 10** | Correct RTL geometry (active marker pixel-verified on the right edge), role-accented chrome, strong keyboard/Esc choreography, working collapsed rail with portaled tooltips. Docked: footer below fold in every state, squeezed theme toggle in rail, unwired CommandPalette, badge contrast. |
| **Mobile shell** | **6 / 10** | BottomNav is genuinely good (59px items, aria-current, safe-area, hide-on-scroll). Docked: notification panel clipped off-viewport (P1), zero search access ≤920px, drawer opens from the wrong edge with no focus trap, sub-44px chrome targets. |
| **Dark shell** | **8 / 10** | Role accents resolve (student #7C9BFF, nav label 7.87:1), elevation tokens theme-aware. Docked: badge 2.12:1, translucent topbar gradient edge over content. |

**Counts: P0 0 · P1 4 · P2 8 · P3 7** (the mobile-drawer direction issue borders the campaign's "RTL = P0" rule; rated P1 because the drawer is internally consistent and fully usable — flag for orchestrator ruling.)

---

## P1 — Major defects

### P1-1 · Notification panel overflows the mobile viewport (every open, every role)
- **Where:** `frontend/src/components/overlays/anchoredPosition.ts:122-131` (phase A) + `:140-176` (phase B) × `overlays/useDelayedUnmount.ts:44-54` (mount ordering).
- **Evidence:** 390×844 student, bell tap → panel rect `x:74, w:342, right:416` vs viewport 390 → **26px of the panel (its inline-start/title side in RTL) permanently off-screen**. Reproduces on first open AND every reopen (`NOTIF_FIRST_OPEN` / `NOTIF_REOPEN` both right=416). Desktop is masked only because the panel fits.
- **Root cause:** phase A computes the estimate with `pw=0`, so the horizontal clamp (`left = min(max(left,pad), vw-pad-pw)`) is a no-op. Phase B (the only pass that knows the real 342px width) runs when `estimate` changes — but the panel **mounts one commit later** (`useDelayedUnmount` flips `rendered` in a `useEffect`, after phase B's layout effect already ran with `panelRef.current === null`). No dep of phase B changes after mount → the pw=0 position is final. The scroll/resize listeners would fix it, but a tap-open on a static page never scrolls.
- **Fix sketch:** after the panel actually mounts, run one refine — e.g. phase B also depends on a `panelMounted` state (callback ref) or schedules `requestAnimationFrame(refine)` from a `useLayoutEffect` that watches `panelRef.current`; alternatively make `useDelayedUnmount`'s open-branch a `useLayoutEffect` and add `rendered` to phase B's deps. Same latent bug family affects `Dropdown`/`Popover` whenever anchor+width approach the viewport edge.

### P1-2 · Sidebar footer (user card, logout, theme toggle, tour) sits below the fold in every shell state
- **Where:** `frontend/src/styles/layout.css:38-44` (whole `.sidebar` is the scroll container) + `:166-173` (`.sidebar-footer` is ordinary in-flow content with `margin-block-start:auto` — the auto margin only wins when there's free space, which there never is).
- **Evidence (900px/844px viewports):** collapsed rail footer y=924 (177px rail overflow); expanded footer y=951 (224px overflow); mobile drawer footer y=1256 (577px overflow). The account cluster — logout, theme, tour, identity — is invisible without a non-obvious inner scroll. On the DEFAULT first visit (collapsed rail) the entire footer is hidden.
- **Fix sketch:** flex-column shell with a pinned footer: `.sidebar { display:flex; flex-direction:column; overflow:hidden }` → new `.sidebar-nav { flex:1; min-block-size:0; overflow-y:auto }` wrapping the nav groups → `.sidebar-footer` stays pinned. (Also fixes the "scroll the rail to find logout" hunt on touch.)

### P1-3 · Global search is unreachable on every viewport ≤920px
- **Where:** `frontend/src/styles/layout.css:290` (`.topbar .global-search { display: none }`), `GlobalSearch.tsx:170-191` (the `/` and ⌘K handlers `focus()` the hidden input — a no-op on a `display:none` element; verified `MOBILE_SLASH activeEl=BODY`).
- **Evidence:** search pill absent on 390px and 768px; no search entry in the drawer nav (`lib/nav.ts` has none) or BottomNav. Searching courses/lectures/papers/tracks — a core LMS capability — does not exist on phones, which is the primary student device.
- **Fix sketch:** smallest: a search icon-button in the mobile topbar that routes to a search surface or expands a full-width topbar search row; the ⌘K/`/` handlers should early-return when the input isn't rendered (or the chord should open the new mobile surface). At minimum add search to the drawer head.

### P1-4 · Mobile drawer slides from the LEFT while the desktop sidebar, its trigger, and the RTL reading direction put it on the RIGHT
- **Where:** `frontend/src/styles/layout.css:215-217` — `inset-inline-end: 0` anchors the drawer to the inline-END edge (= physical LEFT in RTL; correct in LTR), and `:229` hides it with `translateX(-100%)`.
- **Evidence:** drawer rect `x:0, w:320` on RTL phone (left edge) while the burger trigger sits in the topbar's inline-start (right) cluster; the desktop grid puts `.sidebar` in column 1 = right edge. Rotating a phone or resizing across 920px makes the nav jump sides. Borderline P0 under campaign rule 5 (RTL correctness) — the surface is usable and internally RTL-consistent, hence P1.
- **Fix sketch:** anchor to `inset-inline-start: 0` (right in RTL) + hidden transform `translateX(100%)` for `[dir="rtl"]` (and mirror for LTR) — one symmetric swap with the existing per-dir transform rules.

---

## P2 — Noticeable problems

### P2-5 · Mobile drawer: no focus trap, background not inert
- **Where:** `Sidebar.tsx:37` registers the drawer in the overlay stack (chord/Esc choreography only) but never uses `useFocusTrap` or inerts the page.
- **Evidence:** drawer open, focus on the last drawer control, `Tab` → `activeElement = topbar-mobile-toggle` — an element **behind the scrim** (backdrop z=299 > topbar z=100). `main` keeps no `aria-hidden`.
- **Fix sketch:** reuse `useFocusTrap({ open: sidebarOpen && isMobile, containerRef: asideRef, overlayKind: 'sidebar-drawer' })` (it already exists and lists this surface in its docblock), or set `aria-hidden` + `inert` on `.main`/BottomNav while the drawer owns the screen.

### P2-6 · Sub-44px touch targets across the mobile chrome
- **Where:** bell `polish.css:1322-1323` (36×36), burger `layout.css:259` (38×38), AI pill width 39px, drawer close (`Sidebar.tsx` + components) 36×36, logout `layout.css:190-196` (26×26), tour trigger 32px tall, theme options `layout.css:482-489` (30×28).
- **Evidence (390px):** measured rects — every chrome control except nav items (44px, fixed by wave 3b `polish.css:5525-5529`) and the user trigger (46×44) is under 44×44. Logout at 26×26 is the worst.
- **Fix sketch:** extend the existing 44px floor to the ≤920px drawer band + topbar icon buttons (min-block-size/inline-size 44px, or padding + negative-margin hit-area expansion). Icons can stay 16-18px.

### P2-7 · Notification badge digits fail contrast in BOTH themes
- **Where:** `polish.css:1346-1366` — `background: var(--danger); color: #fff` — but dark-mode `--danger` is a light pink tuned for text-on-dark.
- **Evidence:** light `rgb(221,110,120)` + white = **3.2:1**; dark `rgb(240,155,163)` + white = **2.12:1** (10px bold digits; AA needs 4.5:1).
- **Fix sketch:** pair the badge background with a foreground token (`--danger-fg`) per theme, or pin a saturated red background + white in both themes; the 2px `--surface` ring already isolates it from the bell.

### P2-8 · CommandPalette is dead inventory — the ⌘K surface doesn't exist
- **Where:** `overlays/CommandPalette.tsx` (focus trap + scroll lock + Esc, fully built, styled at `components.css:1599-1611` + exit anim at `polish.css:3697-3711`) — **zero mount sites** (grep: only exports/index + CSS). ⌘K/Ctrl+K focuses the topbar GlobalSearch (verified: no `.cmd-palette-overlay`, search input focused).
- **Fix sketch:** either wire it (⌘K → palette that federates nav routes + global search + theme toggle, de-duplicating GlobalSearch's chord) or delete component + CSS blocks under the no-dead-code floor. Decide in Wave 20.

### P2-9 · Collapsed-rail theme toggle renders as three 13px slivers
- **Where:** `layout.css:474-495` (`theme-toggle-option` fixed 30×28, no collapsed-mode adaptation) × the 64px rail (47px of content width).
- **Evidence:** DOM: buttons measure **13×28** each (14px SVGs in 13px buttons); VLM confirms "horizontally squeezed slivers… rather than distinct square buttons". Visible in the default desktop state (rail + scrolled footer).
- **Fix sketch:** in the collapsed rail, stack the 3 options vertically (column toggle), or show only the active mode + cycle-on-click, or a single icon that opens the 3-way menu.

### P2-10 · User-menu theme item doesn't close the menu
- **Where:** `Topbar.tsx:172-175` — the theme `DropdownItem`'s `onSelect` calls `setThemeMode(...)` without `setMenuOpen(false)` (the other two items close).
- **Evidence:** click → theme swaps, `menuStillOpen: true`, `aria-expanded` stays `true`; label flips to «الوضع الفاتح» under the user's cursor.
- **Fix sketch:** add `setMenuOpen(false)` to match sibling items (or make it an explicit toggle that keeps focus on the trigger).

### P2-11 · Topbar page-title map misses five real routes
- **Where:** `AppShell.tsx:26-117` (`PAGE_TITLES`/`DYNAMIC_TITLES`) vs `App.tsx` routes.
- **Evidence:** `/teacher/ai`, `/teacher/library`, `/teacher/alerts`, `/teacher/exams` (+ `/:templateId` — also missing from DYNAMIC_TITLES), `/student/ar` all fall back to «منصة الزاوية» in the topbar AND `document.title` («منصة الزاوية · مدارك»).
- **Fix sketch:** add the five static entries + one dynamic pattern `/^\/teacher\/exams\/[^/]+$/ → «بنك الأسئلة والاختبارات»`; consider deriving titles from `lib/nav.ts` to keep the two maps from drifting.

### P2-12 · Rail-dot ::after uses `--accent` while the bar/icon use `--role-accent`
- **Where:** `polish.css:3450` (`background: var(--accent)`) vs `layout.css:140,148` (`var(--role-accent, var(--accent))`).
- **Evidence:** pixel scan of the active rail item: bar+icon = role accent `#3B5BDB` (student light) but the dot renders `#B57438`; for TEACHER/OWNER roles the dot disagrees with the teal/gray role chrome. The dot also renders ~3×2px — invisible dead weight.
- **Fix sketch:** swap the dot to `var(--role-accent, var(--accent))` and either give it real presence (5px is fine) or delete it.

---

## P3 — Polish

- **P3-13 · Skip-link pill is off-center in RTL** — `polish.css:4484-4488`: `inset-inline-start: 50%` (→ `right:50%` in RTL) + `translateX(-50%)` shifts it a full width left of center (measured center x=532 vs viewport center 720). Functionally fine (appears at y=8 on focus, Enter lands focus on `#main`). Fix: physical `left: 50%` + `translateX(-50%)` (direction-proof).
- **P3-14 · Search-row arrow points into the content in RTL** — `GlobalSearch.tsx:394` uses `ArrowRight`; at the row's trailing (left) edge it reads as "back". Use `ArrowLeft` — `NotificationDropdown.tsx:198` (ChevronLeft) is the correct pattern.
- **P3-15 · `.sidebar-brand` is a non-interactive affordance lie** — `layout.css:53-56` gives it `cursor:pointer` + hover background, but `Sidebar.tsx:113-121` attaches no action. Remove the pointer/hover or make it a link to the role dashboard.
- **P3-16 · Dev-only axe hints: "Some page content is not contained by landmarks"** — fires after opening portaled `Dropdown`/`NotificationPanel` (portaled to `document.body` outside any landmark). Advisory; wrap portals in a labelled container or accept.
- **P3-17 · Collapsed default strips the AI/LIVE badges** — `polish.css:392-394` hides `.nav-badge` in the rail; the only "new/AI" signals (student AI ×2, teacher AI ×2, owner LIVE) vanish in the default desktop state. Consider a rail-mode dot variant.
- **P3-18 · Dark collapsed topbar is a 60%-transparent gradient at its content edge** — `polish.css:5116-5120` (rail-side edge transparent, blur compensates). Title contrast stays ≥3:1 for large text but the user-name/scope text over bright content is borderline; consider a higher solid stop in dark.
- **P3-19 · Theme-toggle + tour + logout cluster duplicated** — sidebar footer hosts theme 3-way + tour + logout while the topbar user menu ALSO hosts theme + logout (Topbar.tsx:172-182). Two competing model for the same actions; consolidate (drawer: identity + logout; topbar menu: theme) — IA decision, not a bug.

---

## Verified-good (so fix waves don't regress them)
- Active-state marker RTL geometry **pixel-verified** on the right edge in both rail (x=1419-1422) and expanded (item.right+3) states — VLM's "left edge" claims were hallucinations (two independent pixel scans).
- `aria-current="page"` present on the active sidebar NavLink and the active BottomNav item (exactly 1 each); rail tooltips expose `aria-describedby` + render on keyboard focus (not just hover).
- Esc choreography: user menu & notif panel return focus to their triggers; drawer answers Esc only as topmost layer; backdrop click closes; body scroll locked while the drawer is open (ref-counted).
- GlobalSearch: full combobox ARIA (`aria-expanded/controls/activedescendant`), Arabic counted-noun live region, debounced+aborted queries, retryable error state ≠ empty state, 4 suggestion pills, ↑/↓/Enter/Esc all work; dropdown RTL direction + `text-align: start` correct.
- BottomNav: 5 role-correct routes per role (all verified against App.tsx), 59-72px targets, labels always shown, safe-area `env()` padding, hide-on-scroll with near-top always-show, reduced-transparency + reduced-motion accommodations.
- Notif panel content: read/unread states, Arabic relative times (`منذ ساعة`), mark-all-read, view-all link, bespoke empty illustration, lazy list query, 99+ badge cap with counted-noun `aria-label` and `aria-hidden` on the visual badge.
- document.title per route + restore on unmount; scroll restoration on back/forward; topbar elevation only after scroll; skip-link → `#main` focus works.

## Top-10 quick wins (Wave 20 order)
1. **P1-1** one-rAF refine after panel mount in `anchoredPosition.ts` (fixes Dropdown family too).
2. **P1-2** pinned sidebar footer + internal `.sidebar-nav` scroller (`layout.css`).
3. **P1-4** drawer to `inset-inline-start` + mirrored transforms (`layout.css:215-231`).
4. **P1-3** mobile search entry (topbar icon → expanded search row) + guard the `/`/⌘K handlers when input is hidden.
5. **P2-6** 44px floor for topbar/drawer icon buttons on ≤920px.
6. **P2-7** badge `--danger-fg` pairing (`polish.css:1354-1355` + tokens).
7. **P2-9** collapsed-rail theme toggle: vertical stack or single-cycle button (`layout.css:474-495`).
8. **P2-10 + P3-14 + P3-15** three one-liners: close menu on theme select; `ArrowLeft` in search rows; drop the brand's pointer cursor.
9. **P2-11** add the 5 missing PAGE_TITLES + 1 dynamic pattern (`AppShell.tsx`).
10. **P2-8** decide CommandPalette: wire ⌘K to it or delete it (+ its CSS blocks).

## Files to touch
`frontend/src/components/overlays/anchoredPosition.ts` · `overlays/useDelayedUnmount.ts` · `overlays/CommandPalette.tsx` (wire-or-delete) · `components/layout/Sidebar.tsx` · `layout/Topbar.tsx` · `layout/GlobalSearch.tsx` · `layout/AppShell.tsx` (titles) · `styles/layout.css` · `styles/notifications.css` · `styles/polish.css` · `styles/tokens.css` (badge fg) · `lib/nav.ts` (if search/more entries move).

*Cross-refs:* dark-mode content contrast items (hero banner, stat labels) → 4-A12; route/IA deep flows → 4-A14; overlay primitives internals → 4-A9.
