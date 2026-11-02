# R331 — Heron capture: frames / videos / nav evidence index

All binaries stay **out of git** (except the 8 committed thumbnails below). Source captures live in the lab tree:

## Frames (51 PNGs each, `f-000.png` … `f-100.png`, ~2% scroll steps)

| viewport | path | metrics |
|---|---|---|
| 1440×900 | `/home/z/heron-lab/frames/1440x900/` | scrollHeight 12355 · maxScroll 11468 (frame step ≈ 229px) |
| 1920×1080 | `/home/z/heron-lab/frames/1920x1080/` | rem 11.11px |
| 390×844 | `/home/z/heron-lab/frames/390x844/` | scrollHeight 11441 · maxScroll 10613 |
| 768×1024 | `/home/z/heron-lab/frames/768x1024/` | rem 9.21px (tablet rate) |

Frame landmarks (1440): `f-000` hero settled · `f-002` hero mid-reveal · `f-004/f-006` intro · `f-022` map journey start ("RIGHT THERE WITH YOU") · `f-050` journey mid (floor plan) · `f-098` footer wordmark.

## Videos

| file | duration | content |
|---|---|---|
| `/home/z/heron-lab/videos/heron-home-1440-wheel.mp4` | 28.64s | full-page wheel scroll @1440 |
| `/home/z/heron-lab/videos/heron-home-390-wheel.mp4` | 25.08s | full-page wheel scroll @390 |
| `/home/z/heron-lab/videos/heron-home-to-about-1440.mp4` | 13.56s | barba home → about transition |

## Nav captures

`/home/z/heron-lab/nav/`: `header-top.png`, `header-scrolled600.png`, `menu-closed-1440.png`, `menu-open-1440.png`, `menu-closed-after-1440.png`, `menu-closed-390.png`, `menu-open-390.png`, `navlink-before.png`, `navlink-hover.png` (last two are 15KB crops — probe failed to capture hover delta).

## Data (JSON probes)

`/home/z/heron-lab/data/`: `program-1440.json` (187KB — triggers + tween tables + type/fonts), `program-390.json` (63KB), `deep-probe.json` (70KB — trigger vars + navLinks + lenis keys), `cssdeep.json` (16KB — css vars + keyframes + hero/map/footer/header computed), `map-deep.json` + `map-struct.json` (journey DOM), `journey-states.json` (**inconclusive** — defaults under instant jumps), `nav-1440.json` / `nav-390.json`, `page-transition.json` (**inconclusive** — wrong selectors), `rem-scale.json` (rem base 320–2560), `lenis-decay.json` (**inconclusive** — window.scrollY), `probe3.json` (scripts list). Plus `probe-top.png` (loading overlay) and `probe-bottom.png` (page bottom).

## Committed thumbnails (`thumbs/`, each ≤150KB PNG, quantized)

| thumb | source | shows |
|---|---|---|
| `thumbs/hero-1440-t0-loading.png` | `data/probe-top.png` | loading overlay (logo draw, no UI) |
| `thumbs/hero-1440-settled.png` | `frames/1440x900/f-000.png` | hero settled — title, line-art, frame |
| `thumbs/journey-1440-start.png` | `frames/1440x900/f-022.png` | journey start — "RIGHT THERE WITH YOU" sticky state |
| `thumbs/journey-1440-mid.png` | `frames/1440x900/f-050.png` | journey mid — floor-plan layer active |
| `thumbs/journey-390-mid.png` | `frames/390x844/f-050.png` | mobile journey mid |
| `thumbs/menu-open-390.png` | `nav/menu-open-390.png` | mobile menu open (clip-path overlay) |
| `thumbs/header-scrolled-1440.png` | `nav/header-scrolled600.png` | header scrolled state (transparent bg, hairline menu) |
| `thumbs/footer-1440.png` | `frames/1440x900/f-098.png` | footer wordmark reveal |
