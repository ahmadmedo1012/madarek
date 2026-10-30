# r325 · Y5-landing — the doc-wide Ink parity sheets (landing, beyond the map)

Defect Y5 (landing part): doc-wide Ink (dark) parity beyond the map was
UNPROVEN for the landing page. This pass proves it — Paper/Ink sheets for
EVERY landing section at both pinned breakpoints, three independent island
instruments, and the gate belt. The map §04's Ink ground itself was already
done in r324 X12 (56c58b1d) and is out of scope here; its sheets ride along
as the parity reference.

**Result: 0 light-paper CSS islands found → 0 fixes needed.** Every box,
border, SVG fill and pseudo-element paint on the landing resolves from the
theme pairs (`--bg`/`--text`/`--rule`/`--accent`/… ) and flips with
`[data-theme]`. The two raster families on the sheet (the why-captures and
the footer lens renders) are CONTENT assets, not theme surfaces — see
«Honest gaps».

## How the sheets were shot

- Server: the worktree's own vite (`npx vite --port 5208`, /api → :4000).
- Themes: the theme store's persisted key —
  `localStorage['madarek-theme'] = {"state":{"mode":"light|dark",…},"version":2}`
  (the same state `ThemeToggle`/`useThemeSync` write to `<html data-theme>`).
  Verified per pass: `data-theme` attr + `body` computed ground
  (light rgb(246,246,238) · ink rgb(40,40,40)).
- Breakpoints: 1440×900 and 390×844. Consent banner pre-answered
  (`madarek.consent=accepted`) so it never photobombs a section.
- Statement §02 captured at the scrub's SETTLED state (title centre at
  0.4×vh → `--wr-p = 1`) so the per-word ink state is complete in both
  themes.
- Map §04 is 6272px of pinned walkthrough — four viewport slices per
  theme/bp instead of one element shot (sticky pinning would smear an
  element capture).

## Verdict matrix — every section × bp × theme

| section | sheets | ink verdict |
|---|---|---|
| [1] hero (`fo-hero`, art + ticker) | `hero-<bp>-<theme>.webp` | PARITY — art is drawn line-work on `var(--bg)`; `.hi-card` borders ride `--accent-strong` (flips: #A32400 → #FFC5AE); ticker strokes are paper strokes |
| [2] statement (`#statement`, per-char/word scrub) | `statement-<bp>-<theme>.webp` | PARITY — scrub words ride `--text`/`--text-faint`; `.st-poché` is the drafting solid mass and correctly INVERTS to paper in Ink (ink mass in Paper ⇄ paper mass in Ink) |
| [3] pains (`#live`, icon grid) | `pains-<bp>-<theme>.webp` | PARITY — PainArt line icons flip; card rows/rules ride `--rule` |
| [4] map (`#chapters` — r324 X12 ground, reference) | `map-1..4-<bp>-<theme>.webp` | DONE in X12 — plan rides the semantic pairs; the pinned paper plate (`.jt-card-plate::before`) + pinned ink plaques are the documented both-themes artifacts (color-gate allow, landing.css ~5886) |
| [5] platform (`#product`, drawn figure + steps) | `platform-<bp>-<theme>.webp` | PARITY — `.pr-slide-rule`/`.pr-node` flip `--text` (ink rules ⇄ paper rules), `.pr-node-dot`/`.pr-mc` flip `--accent` (#FA3600 ⇄ #FF5A1F); frame hairlines ride `--rule` |
| [6] why (`wy-section`, screenshot + steps) | `why-<bp>-<theme>.webp` | CHROME PARITY — ProductFrame chrome (stage hairline, caption row, demo disclosure) all flip; the capture raster itself stays a light window (content — see gaps) |
| [7] roles (`#roles`, 2-col ledger) | `roles-<bp>-<theme>.webp` | PARITY — ledger hairlines/tags flip |
| [8] cta/registry (`#vision` + `cg-strip`) | `cta-<bp>-<theme>.webp` | PARITY — accent CTA flips #FA3600 ⇄ #FF5A1F, ghost button + hairlines flip |
| [9] footer (`fo-footer`, lens strip + colophon) | `footer-<bp>-<theme>.webp` | PARITY — band rides the page ground (r324 X23), wordmark/brand marks are paper strokes, `.fo-fcell-tag` chip flips |

## The three island instruments

1. **Theme-diff DOM audit** (`diff-themes.mjs`): walks EVERY element in all
   8 non-map sections (+ pseudo-elements `::before`/`::after`), resolves
   bg / border / SVG-fill computed paints in light AND dark, and reports
   paints that are IDENTICAL across themes. Identical + light = a
   hardcoded paper island; identical + dark = pinned ink chrome.
   **Outcome: 0 outside the map.** The mechanism self-proves on the map
   sanity probe: it correctly flags `.jt-card-plate::before#bg
   = rgb(246,246,238)` (the documented pinned plate) and the `<line>`
   default-black fill false-positives.
2. **Pixel scan** (`scan-ink-pixels.py`): every ink sheet scanned for
   near-paper masses (lum > 200, spread < 26; ≥400 px blobs reported).
   Every blob resolves to text glyphs, drawing strokes, or raster
   CONTENT — no unthemed box. Largest legit masses: why-capture window
   (481×301 raster), footer glyph clusters, statement poché mass.
3. **VLM spot reviews** on hero / statement / pains / roles / platform /
   cta / footer ink sheets: PARITY-OK on all; the flagged "white bars" in
   platform are the drawn slide rules (paper strokes — correct Ink
   language), the cta "orange slab" is the accent CTA.

Source greps agree: `landing.css` + the landing component family carry no
live light-paper literals (only the documented color-gate-allow comments —
the map pins, the #DB3A00 hover ground, and the mask-luminance fills in
InkSketch/FooterLens which are SVG mask semantics, not pigments).

## Gates

- `npm run typecheck -w frontend` — **green** (tsc -b --noEmit, clean)
- `npm run check:colors` — **green** (no raw literals outside sanctioned zones; 57 lines under inline allows)
- Landing vitest suites (13 files): landing-funnel · landing-scrollspy-grain · r306-landing-sheet · r307-landing-media · r188-brand-integrity · r177-brand-neutrality · r168b-truthfulness · r312-guest-reveal · r313-lenis · r324-text-gate · token-snapshot · r324-sheetloader-grant-belt · r323-brand-system — **174/174 green**
- `npm run gate:height` (repo root) — **PASS** @1440/1024/768/390/360 (worst drift 0.017%)
- No production build was run (the `npm run build` ban holds).

## Honest gaps (recorded, not fixed — outside the token-re-key mandate)

1. **Why-captures are light-theme rasters.** The four real-UI captures
   (`/media/product/student-*.webp`, the R307 sanctioned pattern) keep
   their light pixels in Ink — the chrome around them flips, the pixels
   don't. Healing this needs DARK capture assets (regenerate the four
   surfaces with the app in Ink + an asset-pipeline pass, or an owner
   ruling that captures are photographs-on-ink like the reference's own
   framed captures). A CSS re-key cannot touch rasters, so this pass
   records it instead of redesigning.
2. **Dead render reference in the folded strip cell.** `.fo-fcell-strip`
   (the in-grid `[01] CAMPUS · INK RENDER` cell) is `display:none` at
   EVERY tier (≥768 by the R314 rule, ≤767 by the mobile fold) and its
   `crop-garyounis-classic-960.webp` src does not exist on disk (vite
   SPA-fallbacks it to text/html). Never renders → no visual defect →
   out of Y5's visual-parity scope, but the dead `<img>` + missing asset
   deserve a cleanup ticket (r324's reencode family owns that dir).

## Provenance

- `shoot-sheets.mjs` — the sheet shooter (workspace-absolute paths; port 5208).
- `diff-themes.mjs` — instrument #1 (theme-diff DOM audit incl. pseudos).
- `scan-ink-pixels.py` — instrument #2 (pixel scan; runs in place against these sheets).
- 48 sheets: 9 sections × 2 bps × 2 themes (map = 4 slices instead of 1).
