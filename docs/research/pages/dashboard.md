# Heron — /heron-dashboard

**Crawl:** `heron-dashboard-1440x900.json` / `-390x844.json`. Title «Heron Dashboard | See every change, flag, and approval in one place». docH **9005** @1440 — **byte-identical section skeleton to /heron-chat-widget** (product-hero 886.66 · product-key 4409.59 · product-how 1800 · product-faq 499.98 · cta 698.16 · footer 710.66). Read `chat-widget.md` for the shared template grammar; only the content deltas are listed here.

## Deltas vs /heron-chat-widget (@1440)

| item | chat-widget | dashboard |
|---|---|---|
| `.product-hero-label` (26.66,106.66) | «Your AI design agent, right in the tools…» 272.77 wide | 251.78 wide |
| H1 `h1.heading.h1.tb-h2` (26.66,136.31 463.33×…) | «Ask, and Heron does it for you» — **93.34 tall (2 lines)** | «See every change, flag, and approval in one place» — **186.69 tall (4 lines)** |
| hero right panel | `.product-hero-chat` chat mockup 270×346.08 | dashboard mockup panel (same seat/size family) |
| product-key h2 (480.02,1049.64 466.66×80) | «From a question to a finished change» | «Full oversight, no digging around» |
| key slides `.product-key-main-title` (118.31, 366.66 wide) | first slide 99.98 tall (y 1604.95) | first slide 66.66 tall (y 1621.63) — different copy lengths only |
| product-how h2 | (26.66,5338.25 705.58×40) | same seat |
| faq h2 (26.66,7152.56 359.16×120) | «Got questions? …» 3 lines | same grammar |

- Both pages carry `div.product-hero-logo-cms-wrap` (0,753.33 1426.69×133.33) — the Swiper logo strip — and identical `a.product-hero-btn` (497.44,667.5 216.73×86.66) «Discover more» cells.
- **Builder note:** one template, two content fills — geometry is content-driven (heading line counts), never re-authored. Madarek's dashboard/auth surfaces should reuse the same cell seats with their own copy and let heights breathe.
- @390: identical stacking behavior to chat-widget (h1 4 lines → ~5 lines @31.76px; mockup centered ≈276 wide; steps 1-col).
