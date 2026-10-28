# R322 BOARD — "DESIGN DIRECTOR EDITION"

Live board. The foreman updates after every merge. Head at cycle open:
`85da463b` (R321 c1 close). Brief: [`BRIEF.md`](BRIEF.md) (owner's full text).

**The method change (owner's verdict, §0):** the unit of work is a SECTION or
COMPONENT judged by a design critique — three independent reviewers, mean ≥ 9/10,
no category < 8, side-by-side Heron|Madarek screenshots at 1440/768/390 — not a
metric. Gates stay as safety nets; they never declare success. **Subtract**
before polishing. **Transplant** Heron's structure (DOM nesting, grid, cell
sizes in rem, type scale, spacing, material, motion), then fill with Madarek's
own Arabic copy and artwork. Never copy Heron's text, logo, images, artwork or
BT Grotesk.

## Cycle state

| Cycle | Packages | State |
|---|---|---|
| C1 | kill-list quick kills · design system + fonts · Heron extraction · scroll spec · desktop perf | **OPEN** |

## §1 KILL LIST (V1–V12) — tracked to zero

| # | Defect | Source(s) | State | Evidence |
|---|---|---|---|---|
| V1 | Debug/revision/coordinate text shown to users | LandingPage.tsx:1198 `[R313] — MADAREK · 2026 · INDEPENDENT` · :1203 `.fo-cta-corners` runtime coords · ElevationDrawing.tsx:200-201 `MDRK · CAMPUS · ELEV A-A` + `SCALE 1:200 · UNITS M` · LearningPlanDrawing.tsx:369-370 `MDRK · LEARNING FLOOR · PLAN` + `SCALE 1:150 · UNITS M` · JourneyScene.tsx:626 `[01–04] · LIVE` + station metas `live · checkpoints` | OPEN (WP 1-a) | baseline/ |
| V2 | Map intro broken: duplicate giant headlines + orphan 12px paragraph + empty plan grid | JourneyScene.tsx `.jt-intro*` | OPEN (C3) | — |
| V3 | «مقدمة» card = black slab with void, covers plan rooms | JourneyScene.tsx intro card | OPEN (C3) | — |
| V4 | Voids/blank bands: ≈250px under role cards (1440); ≈160px bands on phone | landing.css sections | OPEN (C2+) | — |
| V5 | Type too heavy/inconsistent: black-weight 80–110px, ≥4 display sizes; phone one-word lines | landing.css display ladder | OPEN (WP 1-b/1-d) | — |
| V6 | Platform cluttered: blurry screenshots + pasted tooltips/chips | PlatformCanvas/ProductFrame | OPEN (C4) | — |
| V7 | Edge tab clips body copy at 1440 | EdgeTab + landing.css | OPEN (WP 1-a) | — |
| V8 | Orphan paragraphs & broken 12-col grid (problem section) | landing.css | OPEN (C2) | — |
| V9 | Map label contrast/collisions in transitions | JourneyScene + landing.css | OPEN (C3) | — |
| V10 | Phone hero art tiny (~160px in 330px window); map card clips «شاهد»; red marker at x=0 | HeroInkWindow + journey mobile | OPEN (C2/C3) | — |
| V11 | Desktop jank: 106/215 frames >33ms, p95 50ms, CLS 0.27, LCP 21s (loader-on) | A1 continuation | OPEN (WP 1-e) | audits/evidence/r321/a1-analysis.md |
| V12 | Older tickets: legal clip (FIXED R321-A4), dup ERR (FIXED A5), decor `+` (FIXED A6), «الإدارة» (FIXED A7), collapsed demo panel (FIXED A8 — but A8-prod OPEN), authed pages unfinished (sweep continues) | — | PARTIAL | R321 board |

Carried R321 tickets folded into this board: A1→V11 · A3→V10 · A9→V9 ·
A8-prod (demo panel must be dev-gated, not default-open in prod) ·
A2-R ladder seats 320/430/600/1180 · Bverify-P3-1 (competition-detail dark
h1=0) · B4-rem / B3-rem dedupe remainders.

## §2 HERON EXTRACTION (transplant basis)

Target: `docs/redesign/r322/heron/<section>-<bp>.json` + plain-words `.md`.
Order: hero → header/menu → statement → problem → map (6 states) → platform →
why/roles → use-case → CTA → footer → loader → cursor/consent → inner pages.
Scroll spec: `docs/redesign/r322/heron/scroll-spec.json`.

| Section | 1440 | 768 | 390 | State |
|---|---|---|---|---|
| hero | — | — | — | OPEN (WP 1-c) |
| header/menu | — | — | — | OPEN (WP 1-c) |
| statement | — | — | — | OPEN (WP 1-c) |
| problem | — | — | — | OPEN (WP 1-c) |
| scroll-spec | — | — | — | OPEN (WP 1-c) |

## §3 REVIEW RECORD (per accepted section — mean ≥ 9, no category < 8)

| Section/Page | Reviewer 1 | Reviewer 2 | Reviewer 3 | Mean | Defects left | Locked |
|---|---|---|---|---|---|---|
| — | — | — | — | — | — | — |

## §4 DESIGN SYSTEM (R322)

- Grid: 12 columns, gutter/margins in rem, logical properties only.
- Spacing scale (rem): 0.25 · 0.5 · 0.75 · 1 · 1.5 · 2 · 3 · 4 · 6 · 8 · 12 — no other values.
- Type: ONE display scale, weights 400–600 (never 800–900), leading 1.0–1.15,
  `text-wrap: balance`; body 15–17px @ 1.7; mono 11–12px Latin-only labels.
  Font candidates under test: IBM Plex Sans Arabic · Noto Kufi Arabic ·
  Readex Pro · Alexandria · Tajawal (same headline × 3 sizes, reviewer vote).
- Material: paper `#F6F6EE` · ink `#282828` · orange `#FA3600` · hairline
  `#B3B3AF` · guides `#E0E0DA`; radius 0; no shadows; grain; dashed frame;
  dark pair = paper↔ink swap.
- Component gallery route `/__design` (dev+preview only) — planned C5.

## §5 SCROLL/MOTION

Target: same ScrollTrigger/Lenis table as Heron ±10 %, one rAF loop,
`gsap.matchMedia` per bp, cleanup on route change, native touch on phones,
reduced-motion = complete static page.

## §6 PERF (desktop is the failing half)

1440 targets: ≥98 % frames ≤ 20 ms · CLS ≤ 0.05 · LCP ≤ 2.5 s (loader
skipped) / ≤ 4 s first visit. Phone (390: 0/255 janky, CLS 0, LCP 1.0 s) —
protect it. Basis: `audits/evidence/r321/a1-analysis.md` (UpdateLayoutTree
4.5 s is #1; intro var-chain 10 ms/frame; 756-family hunt; loader plateau).

## Cycle log

### Cycle 1 — OPEN

| Package | Task ID | Agent | State |
|---|---|---|---|
| V1+V7 quick kills | 1-a | sub-agent (wt kill-v1) | RUNNING |
| Design system + fonts | 1-b | sub-agent (wt dsys) | RUNNING |
| Heron extraction ×4 + scroll spec | 1-c | sub-agent (wt heron) | RUNNING |
| Type-scale implementation | 1-d | after 1-b | QUEUED |
| Desktop perf trace + intro chain | 1-e | after 1-a | QUEUED |
