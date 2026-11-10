# R347 DEFECTS-A — seed from main@e49e721a (final table written at lane close; evidence under audits/evidence/r347/A/, local-only per the r345 law)

| id | where (route/viewport) | before screenshot | cause (verified) | status |
|---|---|---|---|---|
| D1 | `/` statement band, all bps, light+dark: paragraph «منصّة واحدة تدير الرحلة كلها…» printed twice, offset, on top of itself (detector: `منصّة\|كلها` 0.77, `والواجب\|والإتقان` 0.77) | pending baseline | `ScrubReveal` ink-roll twins: `.wr-i2` absolute inset-0 second word copy (WordReveal.tsx `twinSpec` + statement-ai1.css), parked to bind A-I1 spec seats | open |
| D2 | `/` every scroll stop: `button.et-tab` fixed top-left over nav + section text (desktop), `div.bl` strip covering ~12% mobile viewport; fixed-over-text 28/28 stops @1440, 24 @390 | pending baseline | EdgeTab/BootLog fixed chrome never reserved a gutter; the fixed masthead itself also prints nav over scrolled text (227 findings) | open |
| D3 | `/` every section: `div.scr-pct` + tick rail at x≈20–60 over content; `.scr-rule` pair = full-width 1px accent hairlines at 50vh crossing headings/text (Chromium renders the scroll-timeline pair) | pending baseline | ScrollRule seats placed inside the content column (inline-start 33px); rule pair spans inset-inline 7px through mid-viewport | open |
| D4 | `/` first viewport 1440×900: headline+CTAs pushed to the bottom edge, partly cut; «تسجيل الدخول» twice (nav + hero block); elevation drawing buried under dashed grid, crosshairs, labels, `[0x]` tags, red dotted frame | pending baseline | HeroChrome/HeroGrid overlay layers stacked over HeroInkWindow; hero CTA pair duplicated with nav login; fold formula calibrated for the pre-D2 fixed header | open |
| D5 | `/` footer/CTA: `[08] · REGISTRY` overlapped `الدعوة` (0.66 — the BootLog HUD seat); footer strip/social labels over image | pending baseline | BootLog fixed over the registry label; `.fo-fstrip` census pull-ups (−39/−37/−29/−54px) seat the photo strip under the socials' last row | open |

Lane A adds every further finding in its sections to this file before fixing.
