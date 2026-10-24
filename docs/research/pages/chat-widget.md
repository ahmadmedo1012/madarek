# Heron — /heron-chat-widget

**Crawl:** `heron-chat-widget-1440x900.json` / `-390x844.json`. Title «Heron Chat Widget | Ask, and Heron does it for you». docH **9005** @1440. This page and /heron-dashboard share ONE template (`product-*` classes) — see `dashboard.md` for the deltas; this file documents the shared grammar in full.

| section | y | h |
|---|---|---|
| product-hero | 0 | 886.66 (exactly 100svh) |
| product-key (pinned scrollytelling) | 886.66 | 4409.59 |
| product-how | 5296.25 | 1800 |
| product-faq | 7096.25 | 499.98 |
| cta band | 7596.23 | 698.16 |
| shared footer | 8294.39 | 710.66 |

## product-hero (100svh)

```
div.product-hero-title-wrap (26.66,53.33 713.34×229.66)        ← LEFT half, x inset 26.66 (2rem)
├ .product-hero-label  mono txt-14 «Your AI design agent, right in the tools…» (26.66,106.66 272.77×16.33) Geistmono 11.67/500 UPPER muted
└ h1.heading.h1.tb-h2  (26.66,136.31 463.33×93.34) «Ask, and Heron does it for you» BT Grotesk 46.6667/700 #282828 (2 lines)
[RIGHT half]: chat mockup window div.product-hero-chat.bg-global (1143.36,388.92 270×346.08)
  ├ .product-hero-chat-head (268×27.31): .txt-font-mono.txt-12 «Heron Chat» 10px + window controls
  └ .product-hero-chat-body (268×240.78): message bubbles .product-hero-chat-message (e.g. item-my-chat 166.66×53.47 @ (1235.7,594.55)) —
      the ONLY rounded-ish speech geometry on the site is here via illustration, DOM bubbles are square ruled cells
[bottom band] div.product-hero-sub-wrap (0,667.5 713.34×86.66), top hairline:
  ├ .product-hero-sub: .txt-20.tb-txt-16 16.67px (26.66,680.83 444.13×60)
  └ a.product-hero-btn (497.44,667.5 216.73×86.66) «Discover more» — mono dual labels, btn-fill grammar (orange text at rest)
[logo marquee] div.product-hero-logo-cms-wrap (0,753.33 1426.69×133.33): .product-hero-logo-inner.swiper-wrapper 4103.72 wide
  — client logo strip, Swiper 11 marquee; closes at the frame line 885.66
```

## product-key — the pinned walkthrough (51%-of-page pattern, same family as the landing map)

- Head: mono label + `h2.heading.h2.tb-h4` (480.02,1049.64 466.66×80) 40px/600 «From a question to a finished change».
- Body (0,1262.97 … 4033.28 tall): 3-column pin —
  - `div.product-key-main-left-wrap` (0,… **66.66** wide) — a thin ruled spine at the left edge;
  - `div.product-key-main-title-wrap.w-dyn-list` (118.31,1262.97 595.03×4033.28) — 5 stacked title slides `.product-key-main-title-inner.bg-global` **448.33×806.66** each (y 1262.97, 2069.63, 2876.28, 3682.94, 4489.59), each holding a `.product-key-main-title` (366.66×66.66–99.98, 33.33px-class heading);
  - `div.product-key-main-img-wrap` (713.34 wide) — the sticky screenshot panel that cross-fades as titles scroll.
- Sticky/fade driven by GSAP ScrollTrigger (lenis wrapper; r313 D7).

## product-how (5296.25, 1800)

- Head row: `h2` 40px/600 left (26.66,5338.25 705.58×40) + sub right.
- Steps grid: 3 × `.product-how-item` **475.56×247.83** (x 0 / 475.56 / 951.13; row y 5935.08; a second row below at +~360):
  - `.product-how-item-head` 42.98 tall: mono `.product-how-item-label` 11.67 UPPER at 26.66 inset;
  - `.product-how-item-content`: `.product-how-item-title` 26.67 box (≈20px/700) + `.product-how-item-sub` 13.33px muted (368.61×40);
  - item top edges carry hairline rules (ruled grid, no boxes).
- `.product-how-img-wrap` band below (5420.25, 514.83) — wide illustration strip.

## product-faq + cta + footer

Same FAQ accordion and CTA band as /pricing (see pricing.md); shared footer (landing-chrome.md §6).

## @390

Hero: label + h1 ~31.76px 3–4 lines full-width; the chat mockup window scales to ≈276×355 (centered, y≈460); «Discover more» becomes a full-width 63.5px row under the sub (mobile hero-band grammar); logo marquee strip full-bleed. product-key: the 3-col pin collapses — titles full-width stacked (no sticky image cross-fade; images follow their titles); steps stack 1-col (~344 wide); FAQ single column. Root 9.9237 → all mono labels 13.89px, body 15.88px.
