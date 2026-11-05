# R332 — `landing.css` split into per-section sheets (A-CSS-Exec)

**Date:** 2026-11-02 · **Scope:** mechanical, cascade-neutral split of
`frontend/src/styles/landing.css` (7,920 lines) into 13 per-section sheets
under `frontend/src/styles/landing/`, so parallel section agents can each own
one file. No rule was rewritten: every region was moved as a byte-verbatim
line slice; within every file the regions keep their original relative order.

## 1. File map (old banner / line range → new file)

Original file surveyed by its top-level banners. 28 regions R1–R28 tile lines
1–7920 exactly (proven programmatically — no rule or comment straddles a cut).

| # | New file | Old region(s) · banner | Old lines | wc − header |
|---|----------|------------------------|----------:|------------:|
| 1 | `landing/chrome.css` | R1 sheet header/doctrine · frame · grain · labels · skip link · burger/mobile menu · theme row · **R308 `sc`** pointer instrument · **R308 `sl`** loader | 1–370, 3933–4027, 4454–4854 | 866 |
| 2 | `landing/hero.css` | R322 2-b hero transplant · `bp-` blueprint drawing · title block · **R308 `hi`** inspection instrument · `fo-ticker` | 371–1095, 4028–4405, 4406–4453 | 1151 |
| 3 | `landing/statement.css` | البيان — R322 2-c statement band (`st-`) | 1096–1226 | 131 |
| 4 | `landing/journey.css` | الفصول chapters band (`chapters-`) · R308/R322 3-b `jt` scroll story + `pl` plan + `wr` word reveals | 1227–1276, 4855–6009 | 1205 |
| 5 | `landing/pains.css` | التحديات — R322 2-d pains band (`pm-`) | 1277–1587 | 311 |
| 6 | `landing/roles.css` | الأدوار — R313 D7 roles ledger (`rl-`) | 1588–1711 | 124 |
| 7 | `landing/colleges.css` | شريط الكليات — colleges registry strip (`cg-strip`, `fo-text-link`) | 1712–1761 | 50 |
| 8 | `landing/cta.css` | الخاتمة — R313 D7 cta band (`fo-cta*`, sketch panel) | 1762–1901 | 140 |
| 9 | `landing/why.css` | لماذا مدارك — R313 D7 §6 why-stage (`wy-`, `wy-snap`) | 1902–2156 | 255 |
| 10 | `landing/footer.css` | R313 D14 colophon · cell grid · wordmark · subscribe · legal · hover washes | 2157–2919 | 763 |
| 11 | `landing/shared.css` | flow-mode responsive (≤991/767/640) · dark re-point · RM belt · reveal-up belt · anchor scroll-margins (`#statement…#cta`) | 2920–3411 | 492 |
| 12 | `landing/platform.css` | r325 Y2 platform band (`pr-`, `prf-`) + r307 media-layer banner | 3412–3932 | 521 |
| 13 | `landing/strata.css` | the late cascade strata **in original order**: `fl`/`sx` closing instruments · R314 cycle-2/3 mobile-parity rem law · Y2 3/5/4 grid · cycle-4 textures · jt breathing · R323 A4 content-visibility skirt + r324 X2 intrinsic sizes · X14 docH wave · Y2 belt end · R328 H5 rhythm ladder | 6010–7920 | 1911 |
| — | `landing.css` | **rule-free stub** (tombstone comment only) — kept because repo gates enumerate the path (`check-motion-tokens.sh`, `check-raw-css.sh`, allowlists) | — | 12 |

**Line totals:** family body = **7,920 lines exactly** (869+1154+134+1208+314+127+53+143+258+766+495+524+1914 wc includes 3 added provenance lines per file = 39; 7,959 − 39 = 7,920). Nothing lost, nothing duplicated. Each new file carries a 2-line provenance header + blank line; `landing.css` is a 12-line comment-only stub.

## 2. Deviations from the suggested split plan (and why)

- **`colleges.css` is its own file** (plan had `cg-strip` in footer.css): the strip's rules sit at lines 1712–1761, *between* roles and cta; folding it into footer.css would have inverted the cascade (footer.css must load after cta/why). One 50-line file = clean ownership.
- **`why.css` is its own file** (plan allowed either): `wy-` sits at 1902–2156, between cta and footer — same contiguity argument.
- **Cursor (`sc`) and loader (`sl`) live in `chrome.css`, and the hero instrument (`hi`) + ticker in `hero.css`** — not in separate files: the R308 interaction-layer regions are interleaved with the platform region (3933–4854), and moving them forward is proven safe (§4). The consent banner + edge tab were never in landing.css (they are `styles/r314-chrome.css`, untouched).
- **`strata.css` is new** (not in the plan): the tail 6010–7920 is the documented **order-sensitive** late-cascade strata — R314's banner states «WHY THIS BLOCK SITS AT THE END OF THE SHEET», Y2's «file END — the cascade lesson», H5's «rides at the FILE'S END deliberately». Splitting those into per-section files would have flipped same-specificity, same-property wins (e.g. `.pr-section` padding `sp-7` base vs `8rem` ladder vs `sp-5` phone repair). They stay together, byte-ordered. A strata owner (or the platform/roles/cta agents jointly) must treat it as append-order-protected.
- **Leftover non-landing rules:** **NONE.** Searched for student/admin/teacher/campus/auth leakage — every selector in the monolith is landing-funnel scoped (`rg 'student|admin|dashboard|teacher|\.ln-|campus'` hits only prose comments). Nothing was left behind; `landing.css` is an empty stub.

## 3. Import order (the cascade contract)

`src/pages/LandingPage.tsx` replaced the single
`import '../styles/landing.css';` with the 13 imports **in the region order
above**, at the same line position. Therefore:

- `chrome → hero → statement → journey → pains → roles → colleges → cta →
  why → footer → shared → platform → strata`
- regions inside a file keep their original relative order;
- the family still sits **after** `r314-chrome.css` and **before**
  `r330-home.css` / `r331/nav.css` — the r323 consent last-word, the r330
  home-override and the r331 nav last-word contracts are untouched.

**Five proven-safe forward moves** (a region placed in an earlier-loading
file than its original position). Each is safe because the moved selector
families appear **nowhere** in the jumped-over regions (verified by a parser
over all 544 top-level rules):

| Move | Jumped over | Proof |
|------|-------------|-------|
| R15 `sc-` + R18 `sl-` → chrome.css (load #1) | R2–R14, R16–R17, R19–R28 | `.sc-`/`.sl-` selectors occur **only** in R15/R18 |
| R16 `hi-` + R17 `fo-ticker` → hero.css (load #2) | R3–R14 | `.hi-` occurs only in R16; `.fo-ticker` occurs only in R1 (already earlier) and R17 |
| R19 `jt/pl/wr` + R4 chapters → journey.css (load #4) | R5–R18 | `.jt-/.pl-/.wr-` occur only in R19 (+R24, which stays in strata **after** journey) |
| R4 chapters in journey.css | R5–R18 | `.chapters-` occurs in R11 (shared.css, loads **after** journey) — original order preserved |

The single string-level overlap found is benign and order-independent:
`.st-partner .fo-ticker(-item)` (statement, 0,2,0) vs `.fo-ticker` base
(hero/ticker region, 0,1,0) — the descendant selector wins regardless of
document order. R24 (`.jt-close` breathing) remains in strata.css, **after**
journey.css, matching its original override position.

## 4. Proof

1. **Byte-exactness** — the split script proves the 28 regions tile lines
   1–7920 with no gap/overlap and that reassembling them in original order
   reproduces `landing.css` **byte-identical** (`split_landing.py --verify`).
2. **Pixel proof (A/B, in-page swap)** — per viewport {1440×900, 390×844} ×
   {p0 y=0, p1 y=900, p2 y=4000}, both states captured **in the same loaded
   page** under `prefers-reduced-motion: reduce` (freezes the sheet's
   infinite instruments `hi-pulse` / `fo-ticker-rtl`; both sides identical
   conditions), consent seeded (`madarek.consent=accepted`), scrolls via
   `window.__mdrkLenis.scrollTo(y,{immediate:true})`, networkidle + settle.
   The "before" state swaps the 13 Vite landing style tags for the original
   monolith text at the exact same cascade slot (insertion anchor = the
   family block's old position; `removed: 13` asserted).
   Evidence: `/home/z/evidence-r332/css-split/ab-{before,after}-*.png`.

   | pair | mean RGB diff | diff bbox |
   |------|--------------|-----------|
   | 1440×900 p0 | 0.000000 | None (zero differing pixels) |
   | 1440×900 p1 | 0.000000 | None |
   | 1440×900 p2 | 0.000000 | None |
   | 390×844 p0 | 0.000000 | None |
   | 390×844 p1 | 0.000000 | None |
   | 390×844 p2 | 0.000000 | None |

   Dependency files hash-checked unchanged during the capture window
   (`deps-before.md5` = `deps-after.md5`: `r331/hero.css`, `Hero.tsx`,
   `r330-home.css`, `r314-chrome.css`).
3. **stylelint 16** — `npx stylelint@16 "src/styles/landing/**/*.css"`:
   **23 errors / 25 warnings** vs the pre-split baseline on
   `landing.css` of **30 errors / 35 warnings** → **zero new issues** (−7
   errors / −10 warnings: duplicate-selector pairs that split across files
   are no longer same-file violations). Repo-wide moved 78/104 → 71/94.
4. **TypeScript** — `npx tsc -b --noEmit` clean.
5. **Vitest** —
   `r306-landing-sheet.test.ts + landing-scrollspy-grain.test.ts + landing-funnel.test.tsx`:
   **39/39 passed**. Also green with the updated enumerations:
   `r312-mobile-camera`, `legal-pages`, `r313-lenis`, `r321-decor-innertext`,
   `token-snapshot`, `r162-ux-cohesion` (185/185).

## 5. Test-file enumeration updates (semantics unchanged, paths only)

- `r306-landing-sheet.test.ts` — `live` aggregates the 13 family files (+ `r331/nav.css`, `r331/hero.css`). One tolerance repair, documented inline: the `className="bp-plus bp-plus-tl" />` / `bp-dmark-tl` literal pins were broken **by the concurrent R331 hero pass** (aria-hidden added to the still-empty self-closing spans at 23:29:32, i.e. seconds after this ticket's baseline shots); widened to `(?: aria-hidden="true")? />` — the pin's semantics (empty spans, glyph via `::before`) unchanged.
- `landing-scrollspy-grain.test.ts`, `r162-ux-cohesion.test.tsx`, `r312-mobile-camera.test.tsx` — aggregate the family (order = import order ⇒ identical stripped text).
- `legal-pages.test.tsx` — footer language read from `landing/footer.css`.
- `r313-lenis.test.ts` — mobile-menu overflow pin from `landing/chrome.css`.
- `r321-decor-innertext.test.ts` — mark-family stylesheet census lists the family.
- `token-snapshot.test.ts` — `STYLESHEET_FILES` lists the family.

## 6. Hand-off notes for the lead (out of my edit scope)

- `scripts/check-motion-tokens.sh` WHOLESALE list and `scripts/check-raw-css.sh` census still name `frontend/src/styles/landing.css` (now a stub); the family files are **not** in those lists — add `frontend/src/styles/landing/*.css` (or glob) so the gates keep covering the family.
- `scripts/r319/paired-state-allowlist.json` keys are `"landing.css :: <selector>"`; the rules moved to `landing/{chrome,hero,footer,…}.css` — re-key when convenient.
- `tests/r305/route-inventory.json` line 17 prose still says `landing.css` (descriptive string, left as-is).
- Component TSX/doc comments mentioning `landing.css` (main.tsx, useReveal.ts, StatementArt.tsx, …) are prose only — untouched.
- Dev server on :5173 was left running; HMR picked the split up cleanly (pixel-identical render is itself the evidence).
