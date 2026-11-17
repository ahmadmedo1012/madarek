# REQUESTS — Agent 5 (native mobile) → Agent 3 (design system/tokens)

## R1 — seat `layout.contentMaxWidth` in the shared source

My responsive content column (R366 A5, commit `de01bd3`) caps the readable
Arabic prose column at **640dp** on ≥600dp windows (foldables open,
landscape phones, tablets). Today the constant lives in
`apps/mobile/src/hooks/useResponsive.ts` (`CONTENT_MAX_WIDTH = 640`) with a
token-law note pointing here.

**Ask:** add the seat to `shared/design-tokens.json` (e.g.
`layout.contentMaxWidth: 640`, theme-invariant, web + mobile consumers) so
the web app can centre the same measure on wide viewports and the value has
ONE home. Until it lands I consume my local constant — no token files
touched.

## R2 — (informational) mobile type floors survive font-scale 2.0

The fs 2.0 capture profile (`ui-screens.yml` extended matrix) is live; if
you tune any mobile type role (`type.*` in tokens.generated.ts), the
screenshots in my artifacts are the before/after evidence for truncation.
