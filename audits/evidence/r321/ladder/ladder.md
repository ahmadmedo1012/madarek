# R321 WP-HL — the Heron reference ladder evidence (r321-c1-HL)

Measured 2026-10-27T22:39:38.142Z · https://heronaiapp.com/ · chromium 148.0.7778.96 (headless) · playwright-core 1.60.0 · harness `scripts/r321/heron-ladder.mjs` (plain-headless).

**Measurements only** — nothing from the reference is copied into the codebase;
the shots in this directory are internal judging evidence. The §A2 ratchet compares
Madarek against these Heron numbers; the §F motion numbers seed the `motion ≥ 90` judging.

## Method — and the scroll-jack finding (read first)

Protocol per viewport: `goto https://heronaiapp.com/` (waitUntil `networkidle`, cap 45s)
→ settle 2s → docH read → re-read +5s (late-growth) → bonus read +10s (post-intro).
**No reducedMotion override** (the r319 ladder protocol). UA: a realistic iPhone string
(+ `isMobile`/`hasTouch`) for widths ≤430; a desktop Chrome string for ≥480.

**Finding:** Heron’s document is a Lenis wrapper lock — `window.scrollY` never moves and
`documentElement.scrollHeight` **equals the viewport height** at every width; the real page
height lives in the Lenis wrapper (`.main-inner.lenis`), whose `scrollHeight` equals
`.main-content`’s height. That wrapper reading reproduces the BOARD’s five Heron ratchet
numbers **exactly** (1440=12,355 · 1024=9,938 · 768=12,577 · 390=11,441 · 360=10,684).
The ladder’s `docH` below is that scrollable content height (the honest page height a user
experiences); the window docH is recorded alongside in `heron-docH.json` (always ≈ viewport).

## §A2 ratchet table — docH: Heron (fresh) vs Madarek current (BOARD a7e335db)

±1.5% target band = Heron × [0.985, 1.015]. The Madarek numbers are the owner-measured
values from the R321 BOARD (base a7e335db); the six viewports the BOARD does not cover are
marked **madarek to measure** — §A2 must pin them with the madarek ladder protocol
(networkidle + settle + NO reducedMotion override, per the r320 finding).

| Viewport | Heron docH | Heron (BOARD ref) | Madarek current | Δ vs Heron | ±1.5% band | In band? |
|---|---:|---:|---:|---:|---|---|
| 320x568 | 8,650 | — | — | — | 8,520–8,780 | **madarek to measure** |
| 360x800 | 10,684 | 10,684 ✓ | 10,742 | +0.54% | 10,524–10,844 | ✅ IN |
| 390x844 | 11,441 | 11,441 ✓ | 11,388 | -0.46% | 11,269–11,613 | ✅ IN |
| 430x932 | 12,634 | — | — | — | 12,444–12,824 | **madarek to measure** |
| 480x800 | 12,585 | — | — | — | 12,396–12,774 | **madarek to measure** |
| 600x1024 | 15,802 | — | — | — | 15,565–16,039 | **madarek to measure** |
| 768x1024 | 12,577 | 12,577 ✓ | 12,795 | +1.73% | 12,388–12,766 | ❌ OUT |
| 820x1180 | 13,925 | — | — | — | 13,716–14,134 | **madarek to measure** |
| 1024x768 | 9,938 | 9,938 ✓ | 10,184 | +2.48% | 9,789–10,087 | ❌ OUT |
| 1180x900 | 11,587 | — | — | — | 11,413–11,761 | **madarek to measure** |
| 1440x900 | 12,355 | 12,355 ✓ | 12,607 | +2.04% | 12,170–12,540 | ❌ OUT |

Late-growth settle deltas (content docH):
- 320x568: networkidle→settle +0px · settle→+5s +0px · +5s→+10s +0px
- 360x800: networkidle→settle +0px · settle→+5s +0px · +5s→+10s +0px
- 390x844: networkidle→settle +0px · settle→+5s +0px · +5s→+10s +0px
- 430x932: networkidle→settle +0px · settle→+5s +0px · +5s→+10s +0px
- 480x800: networkidle→settle +0px · settle→+5s +0px · +5s→+10s +0px
- 600x1024: networkidle→settle +0px · settle→+5s +0px · +5s→+10s +0px
- 768x1024: networkidle→settle +0px · settle→+5s +0px · +5s→+10s +0px
- 820x1180: networkidle→settle +0px · settle→+5s +0px · +5s→+10s +0px
- 1024x768: networkidle→settle +0px · settle→+5s +0px · +5s→+10s +0px
- 1180x900: networkidle→settle +0px · settle→+5s +0px · +5s→+10s +0px
- 1440x900: networkidle→settle +0px · settle→+5s +0px · +5s→+10s +0px

## §A2 UPDATE (foreman-B, post batch-3 ff7aeed6) — Madarek vs the FRESH 11-viewport Heron ladder

The six seats batch-3 could only pin (never-raise) now have Heron references. The BOARD's §A2
target is ±1.5% of Heron at ALL 11 viewports — four seats remain OUT (composition work, not gate
loosening; the five referenced seats from batch-3 stay green):

| Viewport | Heron docH (fresh) | Madarek @ff7aeed6 | Δ vs Heron | In ±1.5%? |
|---|---:|---:|---:|---|
| 320x568 | 8,650 | 9,308 | **+7.61%** | ❌ OUT (tallest gap) |
| 360x800 | 10,684 | 10,724 | +0.37% | ✅ |
| 390x844 | 11,441 | 11,357 | −0.73% | ✅ |
| 430x932 | 12,634 | 12,411 | **−1.77%** | ❌ OUT (low side) |
| 480x800 | 12,585 | 12,675 | +0.72% | ✅ |
| 600x1024 | 15,802 | 14,774 | **−6.51%** | ❌ OUT (short) |
| 768x1024 | 12,577 | 12,697 | +0.95% | ✅ |
| 820x1180 | 13,925 | 13,808 | −0.84% | ✅ |
| 1024x768 | 9,938 | 10,083 | +1.46% | ✅ |
| 1180x900 | 11,587 | 10,937 | **−5.61%** | ❌ OUT (short) |
| 1440x900 | 12,355 | 12,530 | +1.42% | ✅ |

Ticket A2-R (the remaining §A2 composition work): 320 is 658px TALLER than Heron (phone-compact
seats of the map/footer bands) · 600 is 1,028px SHORTER (the tablet ladder's bands break early)
· 1180 is 650px SHORTER (the desktop-compact seat) · 430 is 223px short (borderline). These four
seats need per-band section census against Heron's section table (below) — the same
section-matching method batch-3 used to cut the footer at the five green seats. NOTE: any fix
must keep the five green seats green (the gate now guards them at ±1.5%).

## Section census (the "every section ±1.5%" reference basis)

### @390x844 — docH 11,441 · 9 sections · strategy `S1: .main-content > * → section/footer`

Top/height in the Lenis wrapper’s scroll coordinate space; label = the first heading’s
innerText truncated to 24 chars (**measurement label only — never reused as copy**);
the ±1.5% height band is shown for §A2’s per-section ratchet.

| # | section | top | height | h ±1.5% band | label (evidence) |
|---:|---|---:|---:|---|---|
| 1 | `home-hero` | 0 | 828 | 816–840 | AN AI AGENT THAT WORKS I |
| 2 | `home-intro` | 828 | 847 | 834–860 | THE REPETITIVE PARTS OF  |
| 3 | `home-problem` | 1,675 | 869 | 856–882 | YOUR DESIGN TOOLS DO WHA |
| 4 | `home-map` | 2,545 | 4,819 | 4,747–4,891 | RIGHT THERE WITH YOU |
| 5 | `home-platform` | 7,364 | 558 | 550–566 | HERON CHAT WIDGET |
| 6 | `home-why` | 7,922 | 806 | 794–818 | BUILT TO WORK THE WAY YO |
| 7 | `home-usecase` | 8,728 | 948 | 934–962 | MADE FOR THE PEOPLE IN T |
| 8 | `cta` | 9,676 | 500 | 493–507 | SEE WHAT HERON CAN DO IN |
| 9 | `footer` | 10,176 | 1,265 | 1,246–1,284 | AN AI AGENT THAT WORKS I |
| | | **reach** | 11,441 | | coverage 100% of docH |

### @1440x900 — docH 12,355 · 9 sections · strategy `S1: .main-content > * → section/footer`

Top/height in the Lenis wrapper’s scroll coordinate space; label = the first heading’s
innerText truncated to 24 chars (**measurement label only — never reused as copy**);
the ±1.5% height band is shown for §A2’s per-section ratchet.

| # | section | top | height | h ±1.5% band | label (evidence) |
|---:|---|---:|---:|---|---|
| 1 | `home-hero` | 0 | 887 | 874–900 | AN AI AGENT THAT WORKS I |
| 2 | `home-intro` | 887 | 723 | 712–734 | THE REPETITIVE PARTS OF  |
| 3 | `home-problem` | 1,609 | 743 | 732–754 | YOUR DESIGN TOOLS DO WHA |
| 4 | `home-map` | 2,352 | 6,300 | 6,206–6,394 | RIGHT THERE WITH YOU |
| 5 | `home-platform` | 8,652 | 710 | 699–721 | HERON DASHBOARD |
| 6 | `home-why` | 9,362 | 698 | 688–708 | OBSERVE |
| 7 | `home-usecase` | 10,060 | 887 | 874–900 | MADE FOR THE PEOPLE IN T |
| 8 | `cta` | 10,947 | 698 | 688–708 | cta *(class)* |
| 9 | `footer` | 11,645 | 711 | 700–722 | THANKS FOR REACHING OUT! |
| | | **reach** | 12,356 | | coverage 100% of docH |

## §F motion groundwork

### (a) loader timeline (navigationStart → the main h1’s first appearance)

From the in-page observer (MutationObserver timestamps + `performance.now()`, installed
before the reference’s own JS runs). "h1 appeared" = h1 visible AND the `.loading` curtain
gone — the moment a user first sees the hero. Milestones in ms from navigationStart
(≈ `performance.timeOrigin`):

| Viewport | networkidle | h1 in DOM | h1 first text | h1 visible | curtain gone | **h1 appeared (loader duration)** |
|---|---:|---:|---:|---:|---:|---:|
| 390x844 | 4769 | 462 | 597 | 598 | 9344 | **9344** |
| 1440x900 | 3018 | 231 | 308 | 308 | 8319 | **8319** |

(The 11-viewport ladder rows in `heron-docH.json` carry the same loader milestones.)

### (b) wheel-scroll motion trace (8 × deltaY 240px, per-rAF sampling)

The trace drives the reference’s own scroll system (Lenis responds to wheel; the page’s
scroll position = the Lenis wrapper’s `scrollTop`, since the window itself never scrolls —
see the finding above). Drivers are tried in order until one moves the page; "trusted
wheel" = real browser input events. Up to 3 fixed/sticky elements are sampled per frame
(rect.y + computed transform). Full frame sets live in `motion.json`.

#### @390x844

| Driver | moved | frames moving | frames→settle | mean frame | p95 frame | max frame |
|---|---:|---:|---:|---:|---:|---:|
| untrusted-wheel | 1920px | 51 | 63 | 42.6ms | 133ms | 233ms |

Lenis class transitions observed during the trace: `main-inner lenis lenis-scrolling lenis-smooth` @8–2142ms · `main-inner lenis` @2351–2351ms · `main-inner lenis lenis-stopped` @2615–2615ms

- `header.header`: rectY 8→8 (variance 0px) · no transform changes
- `div.home-map-main-stick-inner`: rectY 633→2553 (variance 1920px) · no transform changes
- `div.cookie-banner.bg-global`: rectY 743→743 (variance 0px) · transforms observed: `matrix(1, 0, 0, 1, 0, 0)`

#### @1440x900

| Driver | moved | frames moving | frames→settle | mean frame | p95 frame | max frame |
|---|---:|---:|---:|---:|---:|---:|
| untrusted-wheel | 1847px | 66 | 78 | 31.2ms | 50ms | 600ms |

Lenis class transitions observed during the trace: `main-inner lenis lenis-scrolling lenis-smooth` @2–19ms · `main-inner lenis lenis-scrolling lenis-smooth lenis-stopped` @187–187ms · `main-inner lenis lenis-scrolling lenis-smooth` @662–2095ms · `main-inner lenis` @2197–2197ms · `main-inner lenis lenis-stopped` @2356–2356ms

- `header.header`: rectY 7→7 (variance 0px) · no transform changes
- `div.home-map-inner`: rectY 438→2285 (variance 1847px) · no transform changes
- `div.cookie-banner.bg-global`: rectY 855→855 (variance 0px) · transforms observed: `matrix(1, 0, 0, 1, 0, 0)`

## Section-anchored frames (shot manifest)

| file | section | scroll anchor | bytes |
|---|---|---:|---:|
| `heron-s1-390.jpg` | s1 `home-hero` | 0 | 44,708 |
| `heron-s2-390.jpg` | s2 `home-intro` | 828 | 51,179 |
| `heron-s3-390.jpg` | s3 `home-problem` | 1675 | 43,272 |
| `heron-s4-390.jpg` | s4 `home-map` | 2545 | 24,719 |
| `heron-s5-390.jpg` | s5 `home-platform` | 7364 | 38,392 |
| `heron-s6-390.jpg` | s6 `home-why` | 7922 | 48,000 |
| `heron-s7-390.jpg` | s7 `home-usecase` | 8728 | 38,518 |
| `heron-s8-390.jpg` | s8 `cta` | 9676 | 40,717 |
| `heron-s9-390.jpg` | s9 `footer` | 10176 | 44,502 |
| `heron-s1-1440.jpg` | s1 `home-hero` | 0 | 102,885 |
| `heron-s2-1440.jpg` | s2 `home-intro` | 887 | 99,439 |
| `heron-s3-1440.jpg` | s3 `home-problem` | 1609 | 90,558 |
| `heron-s4-1440.jpg` | s4 `home-map` | 2352 | 38,657 |
| `heron-s5-1440.jpg` | s5 `home-platform` | 8652 | 69,459 |
| `heron-s6-1440.jpg` | s6 `home-why` | 9362 | 58,245 |
| `heron-s7-1440.jpg` | s7 `home-usecase` | 10060 | 54,583 |
| `heron-s8-1440.jpg` | s8 `cta` | 10947 | 48,995 |
| `heron-s9-1440.jpg` | s9 `footer` | 11645 | 58,855 |
| | | **total (jpg)** | **995,683** |

Shots: every file ≤150KB; directory jpg total 995,683 bytes; directory total (jpg+json, excl. this file) 1,066,278 bytes against the 2,097,152 cap.
