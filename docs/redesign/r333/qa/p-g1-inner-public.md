# P-G1 — Inner Public Pages: capture + first-pass rubric (R333)

Task: P-G1 · Owner: P-G1 sub-agent · Round: R333 · Status: first-pass (pre blind-panel)
Method: Vite-only dev stack (`scripts/r333/dev-once.sh --web-only`), Chromium (Playwright, `reduced_motion=reduce`, locale ar-SA, DPR 1), full-page captures at **1440×900** and **390×844**, `networkidle` + `fonts.ready` + 1200ms. Programmatic overflow/console/broken-img probes + VLM visual review of 27 slice crops.
Evidence root: `/home/z/evidence-r333/p-g1/` — **40 PNGs** (`<route>-<vp>.png`), `metrics.json` (overflow elements, console errors, scroll dims, fonts, h1/body font stacks). Capture scripts: `/home/z/p-g1-capture.py`, `-capture2.py`, `-capture3.py`. Crops for review: `/tmp/pg1crops/`.

## Scope corrections vs. brief (route discovery from `frontend/src/App.tsx`)
- `/login` → client-redirect to `/auth` (alias). `/register` → `/auth/register`.
- `/competitions` is **protected** (inside `ProtectedRoute` + AppShell): guests bounce to `/auth`. No public sheet exists — excluded from scoring, flagged to lead (brief listed it as public).
- `/colleges` family is public (CollegesLayout); `/colleges/:id` detail is dynamic — not captured (index + leaderboard only).
- Legal family = 6 sheets: privacy, terms, cookies, accessibility, security, data.
- Captured error states: `/auth/reset-password` without token → designed "invalid link" state; `/no-such-page-404` → NotFoundPage.

## Capture-integrity notes (methodology, not product defects)
1. **Stale vite optimizer artifact (false alarm, fixed):** with `--force`, the first browser session hit `504 Outdated Optimize Dep` for `react-hook-form`/`@hookform` deps → auth pages rendered the Suspense fallback «تعذّر تحميل هذا القسم». Re-captured on a fresh vite session: all auth routes render correctly. Do **not** score the fallback shots (`/auth*-desktop/mobile.png` in run 1 — overwritten by run 3).
2. `scrollW 1430 vs innerW 1440` (and 380/390) on every page = 10px scrollbar gutter, not overflow.
3. `/app` broken-img probe fired on `qr-app-page.svg` — false positive (SVG without intrinsic `naturalWidth`); QR renders on desktop. It is however **absent on mobile** (see ticket T10).
4. `reqfail /api/v1/status` everywhere — expected without backend; no public page depends on it visibly (no visible error states except auth reset link, which is client-side).
5. Pages **not image-reviewed** (metrics-only, template-inherited scores below, marked *provisional*): `/auth/forgot-password`, `/auth/reset-password` (error state), `/legal/terms|cookies|accessibility|security|data` (share the LegalSheet template reviewed via `/legal/privacy`).

## Per-page scores (criteria #1 composition · #2 typography craft · #3 spacing rhythm · #9 density/contrast/legibility · #10 consistency · #12 polish/finish)

| route | vp | #1 | #2 | #3 | #9 | #10 | #12 | avg | top defect |
|---|---|---|---|---|---|---|---|---|---|
| /colleges/leaderboard | 1440 | 5 | 6 | 6 | 4 | 7 | 6 | **5.7** | 20-row wall of all-zero rows — empty scaffolding, no top-3 hierarchy; «نقاط الشهر» header truncates to «نقاط الشهـ» |
| /help | 1440+390 | 5 | 6 | 6 | 6 | 6 | 6 | **5.8** | 9 identical FAQ cards, no accordion affordance; bidi scrambles (`test.1y@`, `(12345678)`, browser names); orphaned «لا» split from verb |
| /campus | 1440 | 7 | 6 | 5 | 6 | 6 | 6 | **6.0** | media boxes not aspect-locked → white dead area under portrait photo reads as broken image; audio cards misaligned heights |
| /about | 1440 | 6 | 6 | 6 | 6 | 7 | 6 | **6.2** | right column occupies ~50% width, left half empty beige with no pull-quote/side note to resolve asymmetry; cramped card leading |
| /contact | 1440 | 6 | 7 | 6 | 6 | 7 | 6 | **6.3** | section [03] near-empty card reads as broken component; action row floats against RTL reading order |
| /colleges (mobile) | 390 | 7 | 8 | 5 | 7 | 8 | 5 | 6.7 | **measured 189px horizontal overflow** — `.pf-filterbar-filters` / `.gallery-chip-strip` escape container (R360/L-199); page-end rhythm collapses: 4 one-row region sections with ~180–300px gaps |
| /colleges (desktop) | 1440 | 7 | 8 | 6 | 7 | 8 | 7 | 7.2 | same bottom-half rhythm collapse on desktop; beige-on-white chips near-invisible; `[01]` index sits inside h1 innerText (a11y noise) |
| /app | 1440+390 | 7 | 7 | 7 | 7 | 8 | 7 | 7.2 | RTL CTA order inverted (secondary link reads before primary); mobile action row wraps ragged; QR absent on mobile |
| /auth (login) | 1440+390 | 7 | 8 | 7 | 6 | 8 | 6 | 7.0 | dev/test-credentials panel clipped at fold with no scroll (`scrollH==900` yet content cut); placeholder contrast < 4.5; mobile «تعبئة» truncates |
| /auth/register | 1440+390 | 8 | 8 | 8 | 7 | 8 | 7 | 7.7 | step badge «2» barely legible; footer gray-on-beige weak; role-card arrow floats in dead space |
| /legal/privacy (+ template) | 1440+390 | 7 | 7 | 7 | 7 | 8 | 7 | 7.2 | mono tokens (`mdrk_refresh`, `argon2`) split Arabic phrases without bidi isolation; mobile guillemet/bracket mirroring error («…قبل الإطفاء].») |
| /legal/terms·cookies·accessibility·security·data *provisional* | 1440+390 | 7 | 7 | 7 | 7 | 8 | 7 | 7.2 | template-inherited; cookies mobile = 4603px scroll — longest sheet, check density |
| /auth/forgot-password *provisional* | 1440+390 | 7 | 8 | 7 | 6 | 8 | 7 | 7.2 | family-inherited; not image-reviewed |
| /auth/reset-password (error state) *provisional* | 1440+390 | 7 | 8 | 7 | 6 | 8 | 7 | 7.2 | designed invalid-link state; correct behavior w/o token |
| /404 (NotFoundPage) | 1440+390 | 7 | 7 | 7 | 7 | 7 | 6 | 6.8 | `Illustration name="not-found"` (inline SVG, not broken) **reads as a missing-image placeholder**; button row alignment ad-hoc (third button orphaned) |

Arabic shaping: joined correctly on **every** reviewed page (Alexandria display + IBM Plex Sans Arabic body, optically re-sized 46.7px → 31.8px at 390). No disconnected-letter failures anywhere — the bidi *punctuation/token* class is the open defect (help, app, legal, leaderboard).

## Summary ranking (worst first)
1. `/colleges/leaderboard` **5.7** — zero-density wall + truncated header; needs information design, not just styling
2. `/help` **5.8** — FAQ slab + bidi scrambles
3. `/campus` **6.0** — media-box discipline (aspect locks, aligned player cards)
4. `/about` **6.2** — unresolved asymmetric composition
5. `/contact` **6.3** — empty [03] card, CTA order
6. `/colleges` **6.7 (mobile) / 7.2 (desktop)** — 189px overflow on mobile is the single worst measurable defect in this batch
7. `/404` **6.8** — placeholder-grade illustration
8. `/auth` **7.0** · `/app` **7.2** · `/legal/*` **7.2** · `/auth/register` **7.7** (best)

Best-of-batch: `/auth/register` — the [01]/[02] blueprint-motif role cards, even rhythm, disciplined type = the craft system working end-to-end. It is the internal reference for the rebuilds below.

## Rebuild queue (every page <8 → ticket, craft-system fixes; reference = /auth/register + /legal template spine)

- **T-G1-01 `/colleges/leaderboard` — information design.** Top-3 podium emphasis (rank chip scale jump ≥2×); all-zero rows collapse into designed empty-state band (or default seeded data); «نقاط الشهر» header `white-space:nowrap` + min cell width; bidi-isolate the `[01]` index (`aria-hidden`, `<bdi>`) so it never reads «10[»; kill kashida artifact in «منافسة الكلّيّات».
- **T-G1-02 `/colleges` (mobile) — kill the 189px overflow.** Contain `.pf-filterbar-filters`/`.gallery-chip-strip` in `overflow-x:auto; overscroll-behavior-x:contain; max-width:100%` scroll strip with fade mask (the app's own pattern); chip contrast: add 1px border + text ≥4.5:1; collapse the four one-row region sections («الببان/أبو عيسى/ناصر/مناطق أخرى») into one grouped grid or single card with hairline cells; gap scale at page end must reuse the section cadence (no 180–300px one-offs).
- **T-G1-03 `/help` — FAQ affordance + bidi.** Convert 9 identical cards to accordion (chevron, state, 120–200ms) or 2-col desktop grid; wrap emails/phones/browser names in `<bdi dir="ltr">`; fix orphan «لا / نقدّم» (nowrap bind); footer end-of-page anchor instead of 25% dead beige.
- **T-G1-04 `/campus` — media discipline.** Aspect-lock every media box (`aspect-ratio` + `object-fit:cover`) to kill the white dead area; equalize audio card heights, pin CTA rows to card bottom; caption/panorama gap on the spacing scale.
- **T-G1-05 `/about` — resolve the asymmetry.** Left column gets pull-quote / side-note / secondary imagery (matches hero treatment elsewhere) or narrow the measure; card leading ≥1.7; verify and fix the reported card-straddles-container seam on «من بينها».
- **T-G1-06 `/contact` — complete [03].** Fill or merge the «زمن الاستجابة» card; align action row first-in-RTL (primary rightmost); trim ~200px dead zone at page end.
- **T-G1-07 `/auth` — fold integrity.** Test-credentials panel must be reachable (page scroll or collapsible) — currently clipped with `scrollH==viewport`; input placeholder ≥4.5:1; eye-icon clearance; un-truncate «تعبئة» at 390.
- **T-G1-08 `/legal/*` — bidi token isolation.** `<bdi dir="ltr">` (or styled code chip) around `mdrk_refresh`, `argon2`, versions, dates inside Arabic sentences; fix mobile bracket/guillemet mirroring («قبل الإطفاء].»); in-card leading +0.1–0.15; audit «كللمة»→«كلمة» report on privacy.
- **T-G1-09 `/404` — illustration art-direction.** The `not-found` inline SVG reads as a missing-image placeholder (empty rectangle + dashed box + red plus): redraw on-palette, on-motif (blueprint/hairline style like register cards); align the three-button row.
- **T-G1-10 `/app` — CTA order + QR parity.** Primary APK button first in RTL flow (rightmost); mobile action row must wrap as a unit (flex-wrap with fixed pair); show QR on mobile or drop it deliberately.
- **T-G1-11 (flag, no code) `/competitions`** — brief expected a public sheet; route is auth-gated. Lead to decide: public competition index, or drop from P-G scope.

**Rebuild ticket count: 10 + 1 flag.**
