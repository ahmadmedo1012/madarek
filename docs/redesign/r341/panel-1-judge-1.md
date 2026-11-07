# Panel 1 — Judge 1 (blind) — R333 rubric

- Build: `wip/j1` worktree, vite dev server port 5321, captured 2026-11-07.
- Reference: **live** https://heronaiapp.com/ (reachable; captured at 1440×900, metrics + 2 shots).
- Method: Playwright Chromium, 3 viewports (1440×900 / 768×1024 / 390×844) × 2 themes, full-page + 0/25/50/75/100% scroll (1.2s settle), hover nav/CTA/card, Tab ×4 + direct CTA focus, computed-style metrics. 58 ours captures + ref, all in /tmp.
- Theme note: the prescribed boot-dark (`localStorage madarek-theme=dark` before first paint) **does not render dark** — verified 3× (`ls:"dark"` but `data-theme=light`, bodyBg rgb(246,246,238)); dark was therefore judged via the working theme toggle (inverts to bg rgb(40,40,40)/text rgb(246,246,238), contrast ≈13–14:1, full-page flip, 8/10 dark polish).

## Score table (0–7 each)

| # | Criterion | Score | Measured justification |
|---|---|---|---|
| 1 | Composition | 5 | 10 sections, asymmetric blueprint hero with clear zones; but H1 clipped at right viewport edge (~0px gutter), 450–600px dead voids in gallery section, footer text/logo + "EARLY ACCESS" box collisions. |
| 2 | Typography | 5 | IBM Plex Sans Arabic + Geist Mono; h1 46.67px/600 (ref: 46.67px/700, ls −0.93px) and nav 56px fixed mirror ref tokens; but 7 distinct H2 sizes (13.3/22.1/26.7/33.3/40/44.2/46.7px) and an H2 rendered at 13px as a caption. |
| 3 | Spacing | 4 | Hero crammed to edges (~0–8px) vs ref's 32–140px breathing room; ~500px empty gap between hero text blocks; p line-height 22px/13.3px = 1.65 (OK); gallery voids 450–600px. |
| 4 | Imagery | 5 | 36 imgs + 89 SVG icons in a coherent CAD/blueprint language; defects: half-loaded placeholder column in footer photo strip, thumbnails overlapping panel borders, 1 thumbnail clipped at left edge (x≈0–590). |
| 5 | Storytelling | 5 | Headings form a real arc (أربعة أوجاع → الرحلة أربعة فصول → كل الأدوات → لكل دور مقعده → جاهز لبدء رحلتك؟); but 402 words vs ref 689, gallery→footer transition reads abrupt/archival. |
| 6 | Motion richness | 6 | 25 distinct declared animations/transitions (guest-reveal-sweep 0.7s, fo-ticker-rtl 36s, jt-head-scrub 0.9s, hi-pulse 2.2s, madarek-img-in 0.5s; transitions 0.2–1.2s) + Lenis smooth scroll. |
| 7 | Scroll feel | 5 | Lenis (`lenis js-reveal-armed`), scroll-progress indicator; but 15,195px page at 6–10 elements/viewport produces long empty stretches between set-pieces. |
| 8 | Micro-interactions | 5 | Nav hover = orange color + underline + text-roll (visible); Tab focus-visible 2px solid rgb(255,107,51) rings on first 4 stops; but CTA hover is color-only (201→246, no bg/shadow/transform) and card hover shows zero computed delta (border/shadow/transform identical). |
| 9 | Density | 4 | 6–10 elements/viewport desktop (sparse), 12,436px mobile scroll; hero ~500px dead gap; mobile OK-dense; sections unevenly filled. |
| 10 | Consistency | 5 | Single palette (rgb(40,40,40) / rgba(40,40,40,.72) / orange rgb(250,54,0) ×49), radii limited to 50%/99px — but CTA radius 0px vs 99px elsewhere, H2 scale drift (7 sizes), some sharp vs rounded card corners in gallery. |
| 11 | Arabic/RTL craft | 6 | True `dir=rtl lang=ar`, Arabic display font, RTL marquee (fo-ticker-rtl), only 51 scoped `dir=ltr` islands (numerals/mono); docked 1 for 9–11px illegible Arabic annotations over hero grid. |
| 12 | Polish | 4 | Boot-dark persistence broken (measured above), hero headline edge-clipping, footer overlaps (logo/paragraph, EARLY ACCESS box, cookie bar crowding, right-edge truncation), mobile "تسجيل الدخول" touch target ≈20px < 44px. |

**Total: 59 / 84**

## Top-5 weakest findings + fixes

1. **Boot-time dark theme never applies** — `madarek-theme=dark` in localStorage before first paint still yields `data-theme=light`, cream bg (verified 3×: 2 capture runs + dedicated probe). Fix: hydrate the theme store synchronously from the persisted key (inline `<head>` script or sync store init) so first paint honors it.
2. **Edge clipping / missing page gutter** — H1 touches the right viewport edge (~0px), bottom index strip `[01]–[05]` sits ~8px from the edge, mobile `[01][02]` strip cut off at right edge, footer rows truncated at viewport edge. Fix: enforce a ≥32px page gutter (container padding) at all three breakpoints and add overflow guards on horizontal strips.
3. **Gallery section voids and collisions** — 450–600px dead columns, thumbnails overlapping panel borders, one thumbnail clipped at x≈0–590, mixed sharp/rounded corners. Fix: reflow to a balanced masonry with equal gutters, `overflow:hidden` on panels, single corner-radius token.
4. **Shallow CTA/card micro-interactions** — primary CTA is a 112×64px radius-0 transparent text link whose hover changes color only; card hover produces zero computed style delta. Fix: add bg fill + shadow ramp + translateY(−2px) on CTA hover; border-color/shadow transition on cards.
5. **Heading scale drift + semantic misuse** — 7 different H2 sizes (13.3px → 46.7px), H2 at 13px used as a caption. Fix: lock a 4-step display scale (≈46.7/40/26.7/13.3px) and demote caption H2s to styled label `<p>`s.

Also noted (not top-5): mobile login link ≈20px touch target; nav links contain duplicated text spans (roll effect) — ensure `aria-label` so screen readers don't announce "الرئيسيةالرئيسية".
