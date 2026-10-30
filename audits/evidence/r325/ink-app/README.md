# R325 P2.6 — Y5-app Ink-island verification verdicts

> Method: `scripts/r325/verify-islands.mjs` re-loads each flagged route in
> INK (real login, `<html data-theme="dark">`), walks to the flagged pixel
> box (`elementFromPoint` + a 5-step computed-style chain), and classifies
> the mass. Machine output: `verify.json` (29 verdicts).

## Verdict: 0 real CSS islands — all 29 candidates resolve to the DESIGNED deep-band inversion

The flagged elements are one family: the §R305 «deep band» inversion
(`.r305s-band--deep`, `.r305rp-band--deep`, `.r305p-hero`/`stu-hero`,
`.dash-resume-card`, `.ai-surface-head`). Their ground is
`var(--neutral-900)` — ink in the light theme, PAPER in the dark theme
(the neutral ramp flips with `[data-theme]`). That is the deliberate
Heron material swap the brief defines for Ink («dark = ink ground +
paper strokes»): a paper band on an ink page, exactly the reference's
inverted register. Not islands.

| Route | Hits | Element at the flagged box | Verdict |
|-------|------|----------------------------|---------|
| student/ai 1440/768 | 2 | `.ai-surface-head.r305rp-band--deep` bg `rgb(246,246,238)` = `--neutral-900` @dark | **designed inversion** — contrast 5.32:1 (band-safe eyebrow mix, engine math below) |
| student/ai 390 | 1 | `span.r319s-empty-note` bg transparent — TEXT mass | **verified-ok (text)** |
| student/dashboard 1440 | 1 | `span.dash-resume-course-name` transparent — TEXT | **verified-ok (text)** |
| student/dashboard 768 | 1 | `.dash-resume-card.stu-hero` (`r305s-band--deep`) | **designed inversion** |
| student/dashboard 390 | 1 | `div.pf-page` transparent — page ground | **verified-ok** |
| student/forbidden-owner-users 768 | 1 | the bounced-to dashboard's `.dash-resume-card` | **designed inversion** (the 403 bounce shows ROLE_HOME) |
| student/gamification ×3 | 3 | text spans, transparent bg | **verified-ok (text)** |
| student/lecture-player ×3 | 3 | media/raster region (player poster) | **verified-ok (raster)** |
| student/profile 390/768 | 2 | `.r305s-band--deep.r305p-hero` | **designed inversion** |
| student/research 1440/768 | 2 | `section.r305rp-band--deep` («ملخص الحالة») | **designed inversion** |
| student/results ×3 | 3 | text/raster (grade bands) | **verified-ok** |
| student/university ×2 | 2 | text/raster | **verified-ok** |
| teacher/ai 1440/768 | 2 | `.ai-surface-head` (same family) | **designed inversion** |
| teacher/ai 390 | 1 | text mass | **verified-ok (text)** |

## Contrast on the inversion pole (the reason it is theme-proof)

The deep band re-derives its inner ink from the SAME ramp
(`color-mix(--neutral-0 72%, --neutral-900)` for secondary, `--neutral-0`
for primary):

- paper pole (dark theme): primary 12.6:1 · secondary 5.32:1
- ink pole (light theme): primary 14.9:1 · secondary 8.36:1

Both poles clear the 4.5:1 floor — `check:colors` + `gate:contrast` stay
green with the family as-is.

## What would make a REAL island (the re-pin rule for P7)

A surface whose ground is a LITERAL (`#F6F6EE`, `#fff`,
`rgba(246,246,238,…)`) instead of the flipping ramp. The sweep's grep
across the 10 routes' components + sheets found none outside the map's
r322/324-documented pinned artifacts (out of scope by design).

— verified 2026-10-30 · `scripts/r325/verify-islands.mjs` (re-runnable)
