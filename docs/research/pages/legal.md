# Heron — legal pages (Privacy Policy · Terms and Conditions · Cookie Policy)

One shared `policy-*` template. **Crawl:** `privacy-policy-1440x900.json` etc. (all three at 1440×900 + 390×844).

| page | title | docH @1440 | policy-hero h |
|---|---|---|---|
| /privacy-policy | Heron AI \| Privacy Policy | 2940 | 2229.45 |
| /terms-and-conditions | Heron AI \| Terms and Conditions | 3025 | 2314.11 |
| /cookie-policy | Heron AI \| Cookie Policy | 2395 | 1684.16 |

Then the shared 710.66px footer. (All content-height differences are richtext length only.)

## Template @1440

```
section.policy-hero (0,0 1426.69×h)
├ [breadcrumb row] (532.75,66.66): mono .txt-font-mono.txt-14 items
│   «… > Privacy Policy» — current crumb div.policy-hero-breakscrum-link-item.item-curr #B4B4B1;
│   right side: «Last updated:» muted + span.txt-primary «4 August, 2026» #282828 — all Geistmono 11.6667/500 UPPER
├ div.policy-hero-main.grid (0,96.31 1426.69×h−96)
│ ├ [LEFT: sticky TOC] div.policy-hero-table-inner (0,96.31 464.45×720.13)
│ │   ├ .policy-hero-table-head (0,96.31 464.45×62): .heading.h6.tb-h16 «Table of contents» 20px/700 #282828 (20,116.31)
│ │   └ .policy-hero-table-list.bg-global (0,158.31 464.45×658.13): rows .policy-hero-table-item 464.45×50.63
│ │       active item: title #282828 + a white-on-dark tooltip .policy-hero-table-item-tooltip (21.39,137.66 400×37.31)
│ │       item text .txt-16.txt-clamp 13.33px, x inset 52.33; scroll-spy highlights the current section
│ └ [RIGHT: body] div.policy-hero-content-richtext.w-richtext (491.11,122.97 908.92×body-h)
│     h1 «PRIVACY POLICY» strong BT Grotesk 60px (908.92×60)
│     h2#n-slug 20px (22 tall)  ·  p 13.3333px/400–500 (17.31 lines)  ·  em/links #FA3600 on paper
```

- The gap between TOC (ends 464.45) and body (starts 491.11) is a 26.66px (2rem) gutter; the vertical hairline between them comes from the grid rules.
- TOC is sticky (follows scroll; 720.13 tall column, shorter than the body).
- No other decoration: no cards, no boxed asides — pure ruled columns + richtext.

## @390

- Breadcrumb wraps; TOC collapses away (the 464.45 column is hidden on mobile — body goes full-bleed 342.38 wide at x 15.88); heading sizes scale with root 9.9237 (h1 60px→~71.7px equivalent… measured: body text 15.88px, h2 ~23.85px).
- Shared mobile footer.

## Builder notes

- Madarek legal pages (privacy/terms/cookie in Arabic) should reuse: mono breadcrumb row → sticky-or-collapsed TOC column → 60px-class display h1 → 20px numbered h2 rhythm → 13.33px body. Numbers per section mirror Heron's `#1-who-we-are` slug ids (anchor-scroll).
- Cookie policy links back to the consent banner («Learn more» target).
