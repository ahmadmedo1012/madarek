# SHELL-MATRIX — R366 Agent 2 · L4 — the shell/bars on every screen size

The §7 matrix, executed against the real app (production preview build)
with the repo's own instruments. Every claim carries its command + the
evidence file. The two defects this pass found in MY lane are fixed in
this branch (see §fixes); everything cross-lane is in the REQUESTS files.

## The breakpoint behaviours (documented from layout.css + chrome.css + measured)

| band | sidebar | topbar | bottom dock | evidence |
|---|---|---|---|---|
| ≤ 640px (320–600/640) | hidden; drawer via burger (`--z-menu-drawer` 530, scrim one rung under, focus-trapped, body-locked) | pinned `--topbar-h`, title 2-line clamp + hard cap at the bar, search via ⌘K pill button | visible, 52px cell floor, safe-area `max(--sp-1-5, env(safe-area-inset-bottom))`, hide-on-scroll, **scroller ends above the dock** (the R366 root fix — no text ever paints behind it) | overlap stress ZERO below |
| 641–920px (717×512 foldable-open, 820) | hidden; drawer | same phone contract | same dock contract | overlap stress ZERO |
| 921–1279px (1024×768 tablet landscape) | collapsed icon rail (`data-sidebar-collapsed`), `aria-label` per item (names survive), groups = one toggle row | full flex bar (title + scope chips, ellipsis) | hidden | nav-audit: rows/glyphs/labels pinned |
| 1280–2559px (1280/1440/1920/2560) | rail or expanded (persisted `sidebarCollapsed`), footer pinned (`.sidebar-nav` is the scroller, `overscroll-behavior: contain`) | full bar | hidden | overlap stress ZERO at 1920/2560 |
| landscape phones 640×360, 844×390 | drawer contract | title clamps inside the bar (the R366 cap) | dock contract (36px-tall viewport; the matrix runs clean) | overlap student runs incl. 640×360: ZERO |
| zoom 200 % / text-scale 130 % | full contracts hold (title capped; dock margin scales with rem) | no overlap (the KPI `ind-*` findings are Agent 3's — REQUESTS R1) | 130 %: ZERO · 200 %: only Agent 3's KPI shapes | overlap-scale130/zoom200.json |

Focus & pointer laws: `.content` is `tabindex=0` + role=region (keyboard
scroll — pinned in r366-scroll-parity); the focus rescue lands orphaned
focus on the topbar title; hover-only affordances ride
`(hover: hover) and (pointer: fine)` (chrome.css); the focus-visible ring
is the universal motion.css rule — the mobile-bottom-nav suite pins the
44px targets, safe-area, RTL badges, active state.

## The stress sweeps (what ran, what it found)

All sweeps: `node scripts/qa/overlap.mjs --url http://localhost:4173
--stress` against a production `vite preview` build, light+dark, hostile
content (the harness's stress mutator). Result files:
`audits/evidence/r366/overlap-*.json` (copy of the run outputs).

| sweep | routes | bps | verdict |
|---|---|---|---|
| public narrow | `/`, `/auth` | 320×600, 390×844, 640×360, 844×390, 717×512 | `/auth` ZERO · `/` 16 stops — ALL landing illustrations (Agent 1 → REQUESTS R2) |
| public wide | `/`, `/auth` | 768×1024, 1024×768, 1280×800, 1440×900, 1920×1080, 2560×1440 | `/auth` ZERO · `/` 36 stops — all landing (Agent 1 → REQUESTS R2) |
| **student** | dashboard, courses | 320×600, 390×844, 640×360, 717×512, 768×1024, 1024×768, 1440×900, 1920×1080 | **ZERO** (after the two §fixes) |
| **teacher** | dashboard, students, schedule | same set minus foldable | **ZERO** |
| **registrar (admin)** | dashboard, students, faculties | same | **ZERO** |
| **quality** | dashboard, courses, reports | same | **ZERO** |
| **owner** | dashboard, users, realtime | same | **ZERO** |
| text-scale 130 % | student ×2 routes | 320–1440 | **ZERO** |
| browser zoom 200 % | student ×2 routes | 320–1440 | topbar+dock **ZERO** (4 stops: the KPI `ind-*` family — Agent 3 → REQUESTS R1) |

The dock/open-state interaction (popover/dialog states) is covered by
the no-chaining tests (r366-scroll-parity: notifications list + sidebar
rail) and the r319-shell-states suite (drawer/dropdown open states).

## The two fixes this pass landed (my lane, both in `styles/shell/chrome.css`)

1. **The dock-clearance root fix** (≤920px): `.content` ends above the
   fixed dock (`margin-block-end: 64px + safe-area + sp-4`). Before it,
   the last visible rows at rest painted BEHIND the dock — measured at
   320×600 under stress: `nav.bottom-nav` over «د. ليلى الفيتوري ·
   محاضرتان» both themes; the per-page `.page` clearance only protected
   the scroll END, never the at-rest viewport. One rule kills the whole
   class (any width, any zoom, any stress) — the student sweep went from
   4 stops/8 findings to ZERO.
2. **The topbar-title hard cap** (every band): `max-block-size:
   var(--topbar-h); overflow: hidden`. At 200 % text scale the title box
   (2-line clamp on phones / chip-flex row on desktop) grew to 122–153px
   against the pinned 56px bar and painted over the page's h1 (measured
   rects in the chrome.css comment). The bar's pinned height (the §A9
   no-shift contract) stays; the title clips inside the bar where the
   tooltip + the page h1 carry the full name.

## nav-audit (the three-menu contract)

`npx tsx scripts/qa/nav-audit.ts` — green: per-role destinations,
collapse groups, 5 bottom-bar rows per role, **zero icon drift (one
glyph per destination)**, zero duplicate glyphs, label variants only
the documented bar shortenings — the R362 compact-spine contract
unchanged. Shell e2e: r319-shell-chrome + r319-shell-states +
mobile-bottom-nav + r305-shell-heron = **46/46 green** after both CSS
fixes.

## Re-run (CI-able)

```bash
cd frontend && npx vite build && (npx vite preview --port 4173 --strictPort &)
# per role:  node scripts/qa/overlap.mjs --url http://localhost:4173 --seed <student|teacher|registrar|quality|owner> \
#              --routes <csv> --bps 320x600,390x844,640x360,717x512,768x1024,1024x768,1440x900,1920x1080 \
#              --themes light,dark --stress --out /tmp/r366/overlap-<role>.json
# zoom/text: ... --fontscale 1.3   (130 % text scale)   ... --fontscale 2  (200 % zoom)
```

Exit 0 = clean. The width set is the §7 matrix; the heights carry the
short (600) and landscape (360) cases; foldable-open 717×512 included.
