# scripts/fidelity — the Madarek⇄Heron fidelity metric (R329 M1)

`run.mjs` scores Madarek's public pages against the **live Heron reference**
captured by `heron-extract.mjs` into `docs/redesign/r329/heron-live/`
(10 pages × 4 viewports — geometry, computed styles, motion facts; **zero
content copied**, see that script's IP policy). `heronaiapp.com` is never
contacted by `run.mjs` — only the committed reference JSONs are read.

## Usage

```bash
# full baseline set (5 pages × 4 viewports × 2 themes)
node scripts/fidelity/run.mjs

# one combo (re-runnable by any agent)
node scripts/fidelity/run.mjs --page / --viewport 1440 --theme light

# scores only — no contact sheets / pixel diffs
node scripts/fidelity/run.mjs --no-sheets --no-diff
```

Flags:

| flag | values | default |
|---|---|---|
| `--page` | route (`/`, `/login`, `/about`, `/help`, `/app`) or slug (`home`, …) or reference slug | all 5 |
| `--viewport` | `1440` \| `1024` \| `768` \| `390` | all 4 |
| `--theme` | `light` \| `dark` | both |
| `--no-sheets` / `--no-diff` | — | artifacts on |
| env `FIDELITY_BASE_URL` | any base | `http://localhost:5175` |

The script **boots vite itself** on `:5175` (frontend dir) if nothing is
listening there, and reuses a running server otherwise — the public pages
render without a backend. Raw full-page screenshots go to
`/tmp/mdrk-fidelity/` (ephemeral, never committed); only downscaled
artifacts land in the repo.

## Measurement hygiene (project rules, enforced in code)

- fresh browser context per page×viewport×theme, `serviceWorkers:'block'`
- theme forced **before load** via `addInitScript`:
  `madarek-theme = {"state":{"mode":<light|dark>,"modeUpdatedAt":…},"version":2}`
  and `mdrk-theme-profile = <light|dark>`; consent banner pre-accepted
  (`madarek.consent = "accepted"`)
- the page is **traversed once** (stepwise to bottom, back to top) via
  `window.__mdrkLenis?.scrollTo(y, {immediate:true})` (+50ms/step) so
  content-visibility and reveal-in-view states settle before measuring
- scroll feel = trusted `mouse.wheel(0, 800)` at viewport centre, 16ms
  scrollTop samples for ~1.15s, least-squares exponential-decay fit → τ
  (synthetic `WheelEvent` fallback if the trusted wheel is swallowed) —
  the identical procedure the reference extractor used
- the Lenis engine is **stopped** before the full-page screenshot so it
  cannot snap the scroll back mid-stitch; screenshots run with
  `animations:'disabled'` (finite CSS animations fast-forward to their
  end state — deterministic)

## Page → reference mapping (documented decision)

The reference is a marketing site; Madarek's measured set is its public
product surface. Mapping is by **page role**, not URL:

| Madarek | Heron reference | why |
|---|---|---|
| `/` | `home` | homepage ↔ homepage |
| `/login` (redirects to `/auth`) | `contact-us` | the reference has no auth page; contact-us is its only form-centric page |
| `/about` | `about-us` | name-matched |
| `/help` | `resources` | help/FAQ sheet ↔ resources/docs page |
| `/app` | `pricing` | the “obtain the product” page (plans ↔ app download + update channels) |

## Section capture + matching rule

**Sections (Madarek)** = direct sizable children of `<main>`, plus the page
`<footer>` when it lives outside `<main>` — mirroring the reference's
content-container children (which include `footer-wrap`).

**Matching = ORDER + ROLE** (Heron has no shared classnames with Madarek,
and text is not copied, so identity is structural): a Needleman–Wunsch
alignment over the two ordered section lists maximizing

- `+2` both sides' headings contain `h1` (`+1` for `h2`; `−0.5` h1
  mismatch), `+0.4` both sides heading-less
- `+2` both identities match `/footer/i` (`−0.75` one-sided)
- `+1` both identities match `/hero/i`
- `+1·(1−|rankRef−rankMdrk|)` normalized document position

with skip cost `0.35`. Consecutive matched pairs must preserve order.

**Unmatched-section penalty:** `coverage = 2·matched / (nRef + nMdrk)`
multiplies the **spacing** and **geometry** axes (structure that a missing
section really breaks); type/color/motion are page-global facts and are not
coverage-scaled. Coverage is reported per combo.

## The five axes (each 0–100)

Common mapping: a relative deviation `dev` scores `1 − dev/tol` (floored at
0). One shared convention: a score of 0 means “off by the tolerance or
worse” — tolerances are stated so the number is auditable, not flattering.

| axis | formula | tolerance |
|---|---|---|
| **أ type-scale ladder** | 70% matched-pair **title rung** (largest rendered text size per section, tag-agnostic — Heron carries several titles as styled divs, Madarek as semantic h2) + 30% page heading ladder (each reference rung scored against the nearest Madarek rung, weighted by reference counts; extra Madarek rungs are visible in the JSON ladder and neutral here) | `ln 1.75` (a rung 75% off = 0) |
| **ب spacing/rhythm** | 45% inter-section gaps (`|gapM−gapH|` absolute, floor 48px = one rhythm unit @1440) + 35% top content inset (first text vs section top — nesting-independent breathing: Heron pads inner containers, Madarek the section itself) + 20% section paddings (DOM-level, low weight by design) — all × coverage | 48px / `ln 2.5` / `ln 2.5` |
| **ج color/contrast** | weighted: paper `ΔE(bodyBg)` 0.25 · heading ink `ΔE` 0.30 · matched-pair heading WCAG contrast (`|ln(cM/cH)|`) 0.30 · accent (most saturated non-ink/non-paper text color) `ΔE` 0.15 — Lab (D65) ΔE76, renormalized when a factor is absent | `ΔE 60` / `ln 1.8` |
| **د geometry** | per matched pair: 0.45 section-height ratio (`|ln(hM/hH)|`) + 0.20 hairline share (1px-borders / all borders) + 0.20 radius-0 share + 0.15 edge discipline (distinct child grid edges, count distance) — × coverage | `ln 2.5` / shares are absolute |
| **هـ motion** | 0.40 scroll-feel τ (`|ln(τM/τH)|`) · 0.30 CSS transition durations (70% median + 30% spread) · 0.15 smooth-scroll engine presence (Lenis) · 0.15 scroll-triggered reveal system presence | `ln 2` / `ln 2.5` |

**Total** = unweighted mean of the five axes. Aggregation flow: per
section (pair) → per page → per viewport×theme cell.

Dark theme is scored against the same light reference (Heron's captured
design is the paper-light one; its `prefers-color-scheme:dark` variant was
never captured) — so dark numbers measure *distance from the reference's
look*, which is exactly the honest question for a redesign baseline.

## Outputs (docs/redesign/r329/fidelity/)

- `<page>.json` — per viewport×theme: the 5 axis scores, matched pairs
  (identities + per-pair contributions), coverage, color/motion factor
  breakdowns, the slim Madarek capture (sections/rects/styles/headings/
  censuses/rhythm/ladder/fonts/motion census/scroll-feel fit), pixel-diff
  ratio
- `summary.md` — aggregate tables (regenerated every run)
- `contact/<page>-<vp>-<theme>.jpg` — Heron|Madarek side-by-side sheets
  (JPEG q80, same policy as the reference's own contact shots)
- `diff/<page>-<vp>.png` — **pixelmatch** diff images (light theme).
  Full-resolution for the reference's PNG pairs (home@1440, home@390),
  420px-scaled for the rest (indicative). The diff **% is evidence, not
  score** — the sites carry different content/languages; only the 5 axes
  are the metric.

## Determinism

Fixed viewport/theme/order, animations disabled at screenshot time, no
timing-dependent values in scores (τ fit is a least-squares over the trace,
r² reported in the JSON). Re-running a combo reproduces the axis scores to
±~1 point (font rendering and reveal timing can shift a census by a pixel);
totals are rounded to 0.1.
