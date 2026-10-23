# R313 parity table — after vs reference

Generated: 2026-10-23T07:04:41.283Z

**Summary: 6 match/documented · 52 mismatches · 0 missing**

*Reference = heronaiapp.com live census (audits/evidence/r313/reference/digest.json). Madarek = audits/evidence/r313/after/digest.json.*

| Area | Property | Heron (reference) | Madarek (after) | Status |
|---|---|---|---|---|
| D1 paper | page ground | #F4F4EE (live PNG-sampled @1440x900; computed body bg rgba(0,0,0,0) — paper is painted by bg layers, not body) | rgb(246, 246, 238) | MISMATCH |
| D1 paper | html ground | transparent (html uses background-color: var(--cl-bg); computed resolves rgba(0,0,0,0)) | rgb(246, 246, 238) | MISMATCH |
| D1 paper | theme-color (light) | #F6F6EE (canon) | #F6F6EE | MISMATCH |
| palette | accent | #FA3600 (--content--brand; loader % text, cursor square, fills, marquee index, footer-link hover) | — | MISMATCH |
| palette | secondary | #414140 (--content--secondary) | — | MISMATCH |
| palette | reticle | #FC724D (cursor interactive-state border, 2px; r308/r310) — DOM fallback dot #DD6013 | — | MISMATCH |
| palette | ink | #282828 (--content--primary; headings, dark fills, cookie 'Reject') | — | MISMATCH |
| palette | muted | rgba(40,40,40,0.72) (#282828b8, --content--terriary; nav items, body txt, mono coordinates) | — | MISMATCH |
| palette | hairline | #B3B3AF (--content--border; frame, input borders, loader bar items, disabled #B4B4B0 cousin) | — | MISMATCH |
| palette | hairlineStrong | #282828 (1px cl-black lines: cookie banner border, map markers) | — | MISMATCH |
| palette | guides | #E0E0DA (hero instrument guide lines, 1px) | — | MISMATCH |
| D7 pageHeight | 1440x900 | 12355px | 13666px | MISMATCH |
| D7 pageHeight | 1440x700 | 10555px | 12304px | MISMATCH |
| D7 pageHeight | 1280x800 | 10983px | 12667px | MISMATCH |
| D7 pageHeight | 1024x768 | 9938px | 13494px | MISMATCH |
| D7 pageHeight | 768x1024 | 12577px | 11629px | MISMATCH |
| D7 pageHeight | 390x844 | 11441px | 15308px | MISMATCH |
| D7 pageHeight | 360x800 | 10684px | 15083px | MISMATCH |
| D5 rootFontSize | 360 | 9.16031px | 9.16031px | match |
| D5 rootFontSize | 390 | 9.92366px | 9.92366px | match |
| D5 rootFontSize | 768 | 9.20863px (mobile clamp raises it) | 9.20863px | MISMATCH |
| D5 rootFontSize | 1024 | 5.92593px (= 0.578704vw of 1024 — the fluid formula dips before the mobile clamps take over) | 5.92593px | MISMATCH |
| D5 rootFontSize | 1280 | 7.40741px | 7.40741px | match |
| D5 rootFontSize | 1440 | 8.33333px (html font-size: 0.578704vw — same at 900 and 700 height) | 8.33333px | MISMATCH |
| D7 sections | order+heights@1440x900 | home-hero:887/7.2% → home-intro:723/5.9% → home-problem:743/6% → home-map:6300/51% → home-platform:710/5.7% → home-why:698/5.6% → home-usecase:887/7.2% → cta:698/5.6% → footer:711/5.8% | fo-hero:961/7.0% → sc-canvas:900/6.6% → main:12607/92.3% → sheet-frame:886/6.5% → statement:720/5.3% → live:1032/7.6% → chapters:6439/47.1% → product:760/5.6% → wy-section:1059/7.7% → roles:882/6.5% → vision:755/5.5% → fo-footer:1059/7.7% | MISMATCH (structure differs) |
| D2 radius | policy | 0 everywhere (2 exceptions) | 0 via tokens violations=8 | MISMATCH |
| D2 radius | ref exception | .cursor-inner=50% (DOM fallback cursor dot, 5x5px #DD6013, opacity 0 — almost never visible (canvas cursor does the work)) | n/a (reference-only) | documented |
| D2 radius | ref exception | .home-why-item-card-dot (x3)=99% (2x2 / 1x1 px dots #F2F2F1 in the why-card 'loading dots' sequence (homeWhyCardDotLoading keyframes)) | n/a (reference-only) | documented |
| D3 shadows | policy | none (1 exceptions) | none via tokens violations=1 | MISMATCH |
| D3 shadows | ref exception | .cookie-banner.bg-global.is-visible=rgb(0,0,0) 0px 6.66667px 0px -1.66667px (hard-edged black offset bar under the fixed cookie banner (z 100009) — zero blur, drafting-style drop shadow) | n/a (reference-only) | documented |
| D8 header | height/inset/hideShow | 56px / 7px / true | 56px / — / true | MISMATCH |
| D5 typography | h1 | 46.67px BT Grotesk (heading h1 tb-h3 mb-h2) w700 uppercase |  | MISMATCH |
| D5 typography | h2 | 40px BT Grotesk (heading h2) w600 uppercase |  | MISMATCH |
| D5 typography | h3 | 33.33px BT Grotesk (heading h3 tb-h6 mb-h3 — intro title) w600 uppercase |  | MISMATCH |
| D5 typography | body | 13.33px BT Grotesk (txt-16 / p) w500 none |  | MISMATCH |
| D5 typography | microMono | 8.33px Geistmono (txt-font-mono txt-10) w500 uppercase |  | MISMATCH |
| D4 buttons | header-cta | transparent #FFFFFF r=0 hover=dual stacked labels (label-top/label-bot) roll vertically ±16.33px + orange fill wipe (.btn-fill-bg slide); arrow svg swaps by horizontal slide ±16.66px | (see WP-D) | MISMATCH |
| D4 buttons | header-logo | url(bg.svg) image UA default #0000EE (unstyled) r=0 hover=none beyond the 1px svg size shift | (see WP-D) | MISMATCH |
| D4 buttons | nav-product-dropdown | transparent rgba(40,40,40,0.72) r=0 hover=dark #282828 fill wipe + dual-label roll + dual-chevron roll | (see WP-D) | MISMATCH |
| D4 buttons | nav-pricing | transparent rgba(40,40,40,0.72) r=0 hover=dark fill wipe + dual-label roll (no chevron) | (see WP-D) | MISMATCH |
| D4 buttons | nav-resources (measured on the dropdown item 'Insights') | transparent rgba(40,40,40,0.72) r=0 hover=pure dual-label vertical roll (16px), no fill — the dropdown-item grammar | (see WP-D) | MISMATCH |
| D4 buttons | nav-about | transparent rgba(40,40,40,0.72) r=0 hover=dark fill wipe + dual-label roll | (see WP-D) | MISMATCH |
| D4 buttons | header-menu-btn (hamburger) | r=0 hover=toggles .active on itself + .active on .header-menu (mobile menu overlay) | (see WP-D) | MISMATCH |
| D4 buttons | hero-discover | transparent #FA3600 r=0 hover=orange fill wipe + dual-label roll; focus-visible = lighter-orange text (unique among buttons) | (see WP-D) | MISMATCH |
| D4 buttons | cta-contact | transparent (sits on orange slab) #FFFFFF r=0 hover=fill + dual-label roll + horizontal dual-arrow slide (±37px) | (see WP-D) | MISMATCH |
| D4 buttons | footer-subscribe-btn | transparent #B3B3AF r=0 hover=icon-scale only (13→17px arrow) | (see WP-D) | MISMATCH |
| D4 buttons | footer-link-about | transparent #282828 r=0 hover=colour-only (#282828 → #FA3600) | (see WP-D) | MISMATCH |
| D4 buttons | footer-link-home-current | transparent #FA3600 (current-page state) r=0 hover=none — current page is latched orange | (see WP-D) | MISMATCH |
| D4 buttons | map-number-1 | transparent rgba(40,40,40,0.72) r=0 hover=icon scale-up 11x7 → 32x32 | (see WP-D) | MISMATCH |
| D4 buttons | header-dropdown-item | transparent rgba(40,40,40,0.72) r=0 hover=pure dual-label vertical roll (16px), no fill | (see WP-D) | MISMATCH |
| D4 buttons | cookie-accept | #EFEFEF (rgb(239,239,239)) #FFFFFF r=0 hover=btn-fill fill-small variant roll | (see WP-D) | MISMATCH |
| D4 buttons | cookie-reject | transparent #282828 r=0 hover=dual-label roll, no fill | (see WP-D) | MISMATCH |
| D4 inputs | border/focus | 1px #B3B3AF → focus #ED4C1F → filled #FA3600 (.45s) | — | MISMATCH |
| D10 loader | visible/logLines/exit/gating | 7200ms / 10 lines / exit 835ms clip-path polygon two-band CENTER-OUT SPLIT on .loading-main: a horizontal slit opens at the vertical centre (band 49.94–50.06% at t=6366) and widens symmetrically to 0%/100% at t=7201 (38.38/59.30 @6480 → 28.63/67.11 @6600 → 14.01/78.82 @6841 → 0/100 @7201); counter hits 100% at 5649, ~717ms hold, then exit; element survives as .loading.loaded with inner opacity 0 / none on full loads — REPLAYS on same-tab reload (measured: reloadGate 15% @258ms → 100% @4680ms); NOT replayed on Barba subpage transitions (loaderDisplay 'none' throughout route.json); sessionStorage 'isLoaded' flag exists in the loader class code (heronai-bp main.js) but does not suppress the reload replay | 4868ms / 10 lines / exit 884ms / every full load (R313 D10) | MISMATCH |
| D11 routeTransition | duration/geometry | 1616ms Barba sync swap (path/URL changes at click+~142ms); .main gets clip-path: inset(var(--mask-percent)) !important — a 4-EDGE INSET WIPE: --trans-percent runs 0→50% by 897ms (r308: power1.in), the four .main-deco frame lines converge to the centre, --size--line spikes to 1 (≈8.33px) exactly at the 50% midpoint then decays 1→0; then --mask-percent opens 50%→0% by ~1616ms (r308: power1.out) revealing the new page; no fade, no loader replay | 1600ms cover ~900ms (sheetExit bands) + reveal ~700ms 4-edge inset open (guest-reveal-sweep, --gr-delay sequenced) | MISMATCH |
| D6 scroll | engine/params/tail | lenis 1.1.5 (unpkg) + GSAP 3.12.5 ticker + ScrollTrigger 3.12.5 (ScrollTrigger.update on every lenis scroll) {"wrapper":".main-inner (fallback document.querySelector; barba next container on transitions)","content":"barba next container || document.querySelector(<content sel>)","syncTouch":true,"smoothWheel":true,"smoothTouch":false,"infinite":false,"lerp":"0.1 (constructor default — no override found in heronai-bp.netlify.app/main.js 'new Lenis({...})')","duration":"undefined → lerp mode","easing":"default t => Math.min(1, 1.001 - Math.pow(2, -10*t))","wheelMultiplier":1,"touchMultiplier":1,"note":"exact instantiation read from heronai-bp.netlify.app/main.js: new Lenis({wrapper, content, syncTouch:!0, smoothWheel:!0, smoothTouch:!1, infinite:!1}); idle class added after 150ms scroll-quiet via setTimeout"} tail=1540ms | lenis 1.1.5 window (guest only) tail=1540ms | MISMATCH |
| D12 cursor | present/params | true 10x10px bbox incl. antialias (≈9x9 core), 100 opaque pixels, solid #FA3600 — verified by canvas getImageData at rest over links (telemetry/cursor.json) reticle=interactive state: 2px #FC724D border, scale .56, opacity .68 (r308/r310 deep audit); DOM fallback .cursor-inner = 5px 50% circle #DD6013 opacity 0; .cursor root 1440x900 fixed z999; .cursor-main gets class 'hidden' over header nav | — | MISMATCH |
| D15 cookie | banner | {"present":true,"structure":"#heron-cookie-root[aria-live=polite] > .cookie-banner.bg-global.is-visible — fixed, z 100009, 601x38 @(832,855) @1440, four 1px cl-black border lines, text 'This website uses cookies. Learn more' (p 13.33px #282828; link Geistmono 11.67px #FA3600 uppercase) + Accept + Reject; hard black offset shadow; Accept hides banner instantly (measured); consent persisted as JSON cookie (revision+categories+consentDate, SameSite=Lax, name obfuscated in heronai-bp main.js) and window.HeronConsent exposed; banner root re-renders on reload","buttons":["Accept (fill-small variant: bg #EFEFEF, white text, .btn-fill-bg 120x30)","Reject (no-ic-small: transparent, #282828, .btn-fill-bg 144x36)","Learn more (a /cookie-policy, Geistmono 11.67px #FA3600)"]} | "none" | MISMATCH |
