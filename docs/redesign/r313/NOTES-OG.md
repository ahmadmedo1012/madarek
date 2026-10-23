# R313 — OG image deferral (NOTES-OG)

**Status:** deferred (5-g-resume, R313).

`public/brand/madarek-og.jpg` (1280×698, the r188 folio social sheet) has **no
regenerable source** — `scripts/media/` builds only the WebP photo/product
derivatives (`manifest.json`), and no OG SVG/template exists in the repo (only
`madarek-og.jpg` + `madarek-mark.svg` survive in `public/brand/`). Its ground
samples rgb(251,249,248) ≈ #FBF9F8, not the R313 paper #F6F6EE. Regeneration
needs an authored folio source (HTML→PNG or SVG→JPG pipeline with the Arabic
lockup) — a design decision for the owner, not a recolour this round.

Pinned references: `frontend/index.html` og:image/twitter:image →
`https://madarek.onrender.com/brand/madarek-og.jpg`; `assets.test.ts` keeps
the file in the public-asset ledger.
