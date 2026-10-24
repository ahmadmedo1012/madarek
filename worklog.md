# Worklog — R315 «ALL SCREENS, EVERY DETAIL»

Repo: /home/z/madarek (clone of https://github.com/ahmadmedo1012/madarek.git, branch main).
Baseline at session start: f1c44f73 (R314 cycle 2, PARITY 56.6).
Shared board: docs/redesign/r315/BOARD.md — every agent updates it with ticket status.

---
Task ID: 0
Agent: foreman (main session)
Task: Environment rebuild + R315 cycle-1 setup

Work Log:
- Re-cloned madarek repo at f1c44f73 (sandbox was reset; R314 _local captures lost by design, r313 committed evidence survives).
- Verified: node v24.21.0, playwright 1.57 + chromium-1200 at ~/.cache/ms-playwright (the EXE path scripts/r314/capture.mjs expects).
- Verified network: heronaiapp.com 200 @0.53s (fresh reference captures possible); madarek.onrender.com cold (Render free tier sleep; local vite dev server is the verification target).
- Started `npm install` at repo root (workspaces: backend + frontend) — background /tmp/npm-install.log.
- Created docs/redesign/r315/BOARD.md (cycle-1 ticket table, worst-first per owner §0) + this worklog.
- Located all owner §0 defects in code: sheet-coord-ts mono label (LandingPage.tsx:685), fo-progress orange bar (LandingPage.tsx:695), consent banner (r314-chrome.css §1), header grammar (landing.css 221–570), R310 leftovers Mini demo blocks (LandingPage.tsx:317–393), hero (HeroInkWindow/ElevationDrawing), footer (FooterLens + fo-wordmark CSS).

Stage Summary:
- Cycle 1 dispatched next: J-agents (captures + DOM judge) and B-agents (tickets A1–J builders) in parallel; foreman rebases, gate-checks, pushes to main أول بأول.

---
Task ID: 2-a
Agent: P1 (ticket K-I — /auth + /auth/register Heron sheet chrome)
Task: Rebuild the auth pages' CHROME to the Heron /contact-us sheet grammar — full-page framed sheet, ruled cell composition, mono indices, transparent inputs with the border ladder, fill-wipe submit — keeping 100% of functionality.

Work Log:
- Read the canons (DESIGN.md r313 override ledger, tokens.css, landing.css sheet-frame/fo-grain/fo-label, r313 reference digest) + the r313 evidence for the input ladder (footer-subscribe-input: 1px #B3B3AF → :focus #ED4C1F → filled+focus #FA3600, transition 0.45s).
- frontend/src/styles/auth.css — rebuilt the auth family to the sheet grammar:
  · .auth-frame (fixed 1px var(--border-strong) at the 7px inset, z50, pointer-transparent) + .auth-mark ×4 (10×10 mono '+' centered ON the frame corners — PHYSICAL anchors: the landing's logical-inline recipe drifts the marks 10px inside the corners under RTL; measured live on the landing at 1422/18 vs corner 1433/7 — flagged for the landing owner, fixed here + on the 404's .nf-mark twins in the same file);
  · .auth-grain — the landing's .fo-grain recipe verbatim, own class (grain-tile-light.webp + micro-grid.svg, multiply; dark twin grain-tile-dark.webp, plain alpha 0.9);
  · .auth-card DISSOLVED: transparent ground, no side borders/shadow — keeps one structural seam (border-block-start var(--border-strong), the masthead rule above the mono label row); widths 620/720px;
  · .auth-sheet-label — the mono micro-label row ([MDRK-AUTH] · SHEET 01/01; register carries the honest two-step SHEET 01/02→02/02), dir=ltr run, aria-hidden;
  · .auth-cells/.auth-cell — the ruled composition: 1px var(--rule) separators between rows, the block opens+closes with its own rule; grid [index var(--sp-9) | label 11–15rem | control 1fr], stacks <640px; .auth-cell-index mono [NN] dir=ltr;
  · input ladder: default 1px var(--border-strong) (auth.css) → :focus #ED4C1F + .45s≈--t-slow (polish v22, untouched) → filled+focus var(--accent) via a documented @layer overrides rung (input.auth-input[placeholder]:not(:placeholder-shown):focus — specificity 0,4,1 beats polish's 0,2,0 inside the same layer; cascade reasoning in the file tail);
  · .auth-submit — the reference fill-wipe: transparent + 1px hairline + mono-voice label; the accent slab parks beyond the INLINE-START edge (translateX(calc(var(--motion-direction) * -101%)) — RTL-mirrored via the token, transform-only so the motion gate stays green) and wipes in on hover/focus-visible while the label flips to --accent-fg; :not(:disabled)-guarded; 48px (≥44 floor);
  · role rows: .role-card-grid becomes a ruled block (rows separated by var(--rule)), .role-card transparent + the fo-nav-link accent drop-slab fill-wipe + .role-card-index mono cell (icon wells retired);
  · errors/banner/notice join the grammar: .auth-field-error + .auth-error are mono red micro-labels (transparent ground, 1px --danger hairline on the banner), .auth-forgot-notice 1px --warning-ink hairline, .auth-demo-hint/.role-invitation-note hairline rules on bare paper; radius 0 everywhere (tokens), zero raw colors (color-gate strict OK), zero new keyframes;
  · RM belt extended to every new mover (wipe slabs, submit, role rows); the token kill collapses the rest.
- frontend/src/pages/AuthPage.tsx — frame+grain+sheet-label mounted; card chrome (brand-mini) retired; form rebuilt as ruled cells [01]/[02](/[03] ambiguity) with the forgot action inside the password row (pinned DOM order home→email→password→toggle→forgot→submit→register kept); input icons removed (Mail/Lock), eye toggle kept; institution chooser rows carry [NN] indices; heading copy de-tashkeeled («مرحباً»→«مرحبا») per the heavy-tight display rule. All logic untouched (RHF/zod, 429 lockout branch, authErrorView, ambiguity recovery, demo panel, sr-only mirrors, landmarks).
- frontend/src/pages/RegisterPage.tsx — same chrome; Field scaffold renders the cell row (new `index` prop, ARIA contract unchanged); student sheet [01]..[09], teacher sheet [01]..[08], role rows [01]/[02] — monotonic; two-column .auth-row-2 usage retired on this page (class kept for OwnerInstitutionsPage); input icons removed; honest placeholders added (12-dot password floor, student email example) so the ladder's filled+focus rung is reachable.
- tests/unit/AuthPage-alignment.test.tsx — ONE re-pin with an `R315 override` note: the h1 name («مرحباً بعودتك»→«مرحبا بعودتك», the tashkeel ban). Every other pin (auth-meta recipe, flat-paper/no-gradient/card-hairline CSS asserts, focus order, demo panel, landmarks) passes unchanged.

Verification:
- eslint (both pages) clean · `tsc -b --noEmit` clean.
- vitest: AuthPage-alignment 11 + AuthPage-rate-limit 8 (the mandated *auth* set) = 19 ✓; RegisterPage-steps/institution-step/departments-errors/password-blocklist = 27 ✓; adjacent belts (r170e-a11y-pins, r177-brand-neutrality, G-final-shared-surfaces, r168a-shell-grid-a11y, route-titles-coverage, auth-store ×2, useAuth-session, landing-funnel) = 113 ✓. Total 159 green, 0 failures.
- Design gates: check-colors --strict OK · check-motion-tokens OK (after switching the wipe from inline-size to transform) · check-raw-css --strict: zero auth.css findings.
- Playwright (chromium-1200 @ localhost:5173), screenshots in _local/p1-preview/ (auth + register × 1440×900/390×844 × light/dark): 81/81 geometry checks PASS — frame 7px inset + 4 corner marks centered, card ground transparent (pixel-proof: in-column == out-column == #F6F6EE / #282828, no white box), inputs transparent + ladder #B3B3AF→rgb(237,76,31)→rgb(250,54,0) verified live, submit 48px + wipe engages + label flips to white, role-row fill-wipe engages, monotonic indices, nothing crosses the frame, no horizontal overflow, dark grain twin + #5C5C5A frame verified, RM collapses the wipe to instant.
- VLM visual pass was attempted but the service is rate-limited (429 — J-fleet judge traffic); the objective DOM-geometry + pixel probes above stand in for it.

Stage Summary:
- K-I shipped: both auth surfaces now read as the same drawing sheet as the landing. Two follow-ups OUTSIDE my ownership: (1) landing.css .sheet-mark-* carries the same RTL 10px corner drift (evidence in this log — one-line physical-anchor fix for its owner); (2) polish's :focus #ED4C1F is raw-with-allow (token seat still pending, pre-existing note). The full-page frame on /auth also implies the header could eventually take the fixed-56px masthead seat — left for a later ticket, not K-I scope.

---
Task ID: 1-b
Agent: E-crawl
Task: Heron DOM/geometry GRAMMAR crawl — one crawler script + committed-quality markdown specs in docs/research/pages/ that builders + judges code against (extending r313 digest.json with selector-level detail).

Work Log:
- scripts/r315/heron-dom-crawl.mjs — playwright-core (chromium-1200 EXE, never `playwright install`): per URL+viewport ONE pass (retry once then record failure): goto → poll `.loading` gone (≤15s) → ≥11s settle → walk every rendered element and dump JSON: stable selector + class path from body, PHYSICAL x/y/w/h from LEFT relative to `.main-inner` origin, computed font family/size/weight/lh/ls/transform/color, bg/borders×4/radius/shadow/opacity, layout (position/z/margin/padding/gap/overflow/transform/object-fit), ::before/::after paint, own text, key attrs; forced never-skip set (header/footer subtrees, headings/p/links/buttons/inputs/tables/svg/img, custom web-components, data-*, keyword classes: cookie/edge/ticker/marquee/ruler/tick/frame/deco/logo/menu/cta/btn/hero/mark/plus…). Plus: section skeleton, :root token vars, at-rest + footer screenshots, and in-page state probes (desktop dropdown hover, mobile menu click, contact form focus/fill ladder + submit hover). Output _local/heron-dom/<page>-<WxH>.json + shots/ + crawl-log.json.
- Ran the full matrix on heronaiapp.com: / @1440x900, 390x844, 768x1024, 1024x768 + /contact-us /about-us /pricing /heron-chat-widget /heron-dashboard /resources /privacy-policy /terms-and-conditions /cookie-policy + 404 probe @1440x900 & 390x844 — **24/24 passes ok, first attempt each** (loader ~7.5–7.9s on /; subpages no loader replay; 404 = real 404, no loader). ~29MB of dumps, 391–2353 elements per page.
- Wrote 10 spec files in docs/research/pages/ (committed quality, every number viewport-cited): landing-chrome.md (THE critical file), contact-us.md, about-us.md, pricing.md, resources.md, chat-widget.md, dashboard.md, legal.md (3 policy pages), 404.md, grammar-sheet.md (component inventory + states).
- Key extractions (all @1440 unless noted): header 1426.69×56.3 fixed, cells logo 705.02 | nav 4×136.67 | CTA 166.66 with 1×56.3 #B3B3AF separators at x 713.34/850.02/986.69/1123.36/1260.03 + bottom rule y=55.3; nav labels Geistmono 11.67/500 UPPER; CTA dual mono «contact us» labels are **#FA3600 at rest** (digest's #FFFFFF is only the anchor's inherited color; pixel-verified), .btn-fill-bg 240×60 top:50%/translateY(−50%) CSS opacity:0 (display:none ≤991px). Mobile @390: bar 374.13×49.61, [logo 187.06 | MENU 187.06] one mid separator, 3 bars 14.88×1; menu overlay rows 40.08 + CTA 50.98; **no ticker under the bar** — the work marquee is the hero's last band (0,788.42 374.13×39.69, mono 13.89px items «Faster iterations/Fewer mistakes/Less busywork», hairlines both edges, every mobile band hairline-separated).
- Consent banner: desktop 601.25×38.33 @(825.44,848.36) (= digest's 832,855 ABS ✓), 4× 1px #282828 line DIVS (not border), hard shadow 0 6.67 0 −1.67, Accept 78.63×27.98 #EFEFEF / Reject 80.63×28.33, «Learn more» Geistmono #FA3600; mobile **374.13×93.45** @(0,734.67) (owner's ≈100 included the 7.94 shadow), buttons side-by-side 93.61/95.61×37.1.
- Edge tab = .awwwards (only edge element): FIXED z999 width:5.3rem top:50% right:.8rem translateY(−50%) — 44.16×139.45 @1440, 52.59×166.33 @390, no breakpoint, 1px #B3B3AF border open to the frame; **nothing anywhere at the frame's top edge — Heron has NOTHING overlapping the header** (DOM + pixel proof for K-A4/A5).
- Fixed frame: .main-deco 4×1px #B3B3AF at 0.8rem inset (6.66 @1440 — digest's "7" is 390/768 rounding; 4.74 @1024), no plus marks on it; hero drawing window .bg-border 1406.69×679.98 with 6.66 bars + 10×10 plus marks at bar corners; window 16.66 inside; artwork img object-fit CONTAIN; dashed graticule = 8 quadrant-gated .line-dash overlays (border2.svg tile, op .64 on proximity reveal) + 3 #FA3600 origin lines; 2 orange 12.05×12.05 markers with hidden IBC mono labels; ground line/palms live in the artwork image.
- Footer: 711 ✓ (710.66+rule), columns 357.08/714.58/357.09, subscribe input 358.08×40 1px #B3B3AF (ladder →#ED4C1F→#FA3600 per r313) + 40×40 arrow, 215×215 SVG logo cell (214.98 measured), ruled link matrix + address + socials, ink strip 314.16 with own bg-border, copyright band 41.83 with policy-link hairline cells; @390 stacks to 1239.11.
- /contact-us (the /auth template): borderless 75px rows (59.53 @390) with in-row labels 20px/700 #B4B4B1, live-verified ladder = bottom rule #B3B3AF → .active slides a #FA3600 .line-brand over it (NO #ED4C1F and no borders here — different from the footer input), error chips #FA3600, submit = full-row 86.66 btn-fill with .disable gray labels until valid; right half = image panel bleeding 7px.
- Product pages share one template (chat-widget/dashboard: hero 100svh + key scrollytelling 4409.59 + how 1800 + faq + cta + footer); pricing = 5×285.33 ruled grid (packages Free/$99/$295/Custom + 50.63px comparison rows + 62px FAQ accordion + #282828-filled Monthly/Yearly tabs 428.02×43.97); resources = 356.67×392.95 CMS cards with corner-plus art mats; legal = breadcrumb + sticky 464.45 TOC (50.63 rows) + 60px-class richtext; **404 = one viewport, drawing window + centered 404.svg 655×320.84 and NO text on desktop** (the «Page not found» noti card with #282828 head bar is mobile-only).
- Deltas vs digest.json recorded inline in the specs (header 56 vs 56.3; inset 7 vs 6.66@1440; CTA label color; btn-fill-bg mechanism; cookie 601×38 ✓ exact + mobile 93.45 vs ≈100; H1 width 54.1% of content @1440 vs K-A2's ≈47%; page heights −12…−78px drift; FAQ/mobile-menu/edge-tab/ruler internals all new).

Stage Summary:
- Deliverables complete: scripts/r315/heron-dom-crawl.mjs + _local/heron-dom/** (24 dumps, gitignored) + docs/research/pages/*.md ×10. 24/24 crawl passes succeeded; zero failures. NOT committed/pushed (research task — foreman commits). Builders (B-fleet) and the DOM-geometry judge (J-fleet) can now code against exact selectors/geometry per viewport; the two grammar surprises to watch: contact-form ladder ≠ footer-input ladder, and mobile has no under-bar ticker (the marquee is the hero's closing band).
---
Task ID: 1-a
Agent: J1 (fresh Heron+Madarek captures)
Task: Deterministic Playwright capture sweep — Heron landing at 11 viewports, Madarek landing 11 light + 2 dark, Heron 10 inner pages × 2 viewports, and a fresh geometry manifest (docH + 9 bands per site per viewport) with r313 drift audit.

Work Log:
- Read worklog + scripts/r314/capture.mjs. NOTE: a previous J1 process of this same task died at 12:46 mid-sweep (after 9 heron viewports + all 13 madarek dirs); I verified its output on disk (meta.json/stitch present, docH sane) and completed the remainder as one coherent set — no capture was re-hit unnecessarily (Heron gentleness rule).
- scripts/r314/capture.mjs upgraded (backward-compatible, in file header): `--url`/`--out`/`--wait` overrides; flag() normalization fix (r314's flag('--stitch') built '----stitch' so --stitch/--loader-frames/--chrome NEVER fired); meta records finalUrl/title/mainStatus (the 404 pass proves it: mainStatus=404, notfound-hero band); dark-theme gate fixed to the real zustand persist key 'madarek-theme' + data-theme (old 'madarek.theme'/'theme' keys were no-ops → r314 dark captures were light); 7 doc-progress fallback frames for inner pages with no >300px band. Loader-gate logic untouched (heron 11s / madarek 9s settle).
- Heron landing → _local/captures/heron-r315/<WxH>/ at 360x800 390x844 412x915 768x1024 820x1180 1024x768 1280x800 1440x700 1440x900 1920x1080 844x390(landscape): 29 section-relative frames + scroll-stitch + meta.json each (1920x1080 + 844x390 captured by me this pass; the other 9 inherited-complete from the dead twin, verified). Progress log: _local/captures/heron-r315.log.
- Madarek landing → _local/captures/madarek-r315/<WxH>/ same 11 viewports (light) + dark at 1440x900-dark/ and 390x844-dark/ (--theme dark): 29 frames + stitch + meta each. Dark verified by PIXEL PROOF (canvas sampling of stitch-0000: 1440x900-dark TL 12,12,12 / mid 24,24,24; 390x844-dark 37,37,37 / 40,40,40 — dark paper, not #F6F6EE).
- Heron inner pages → _local/captures/heron-pages/<page>/<WxH>/ at 1440x900 + 390x844: about-us, contact-us, pricing, heron-chat-widget, heron-dashboard, resources, privacy-policy, terms-and-conditions, cookie-policy, no-such-404 (real 404 status + notfound-hero template). Section frames + stitch + meta each; log _local/captures/heron-pages.log. All 20 passes first-try, zero retries needed.
- scripts/r315/measure-sections.mjs (new): full load → fonts.ready → per-site loader wait → stability loop (two consecutive identical reads); docH = Heron .main-inner Lenis wrapper scrollHeight (doc never scrolls) / Madarek document scroll height (html.lenis root is window-equivalent, guarded); 9 band offsetHeights + tops + pct; r313 anchors inline. Band selectors verified LIVE: Heron .home-hero .home-intro .home-problem .home-map .home-platform .home-why .home-usecase .cta .footer (capture log shows all 9 at every viewport); Madarek probe on localhost:5173 confirmed .fo-hero 887, .st-section 720, .pm-section 743, .chapters 6439, .pr-section 711, .wy-section 680, .rl-section 882, .fo-cta 698, .fo-footer 712 @1440x900 (all unique, in DOM order).
- Ran measure for BOTH sites × ALL 11 viewports → _local/captures/r315-manifest.json (zero failures). Log: _local/captures/r315-measure.log.

Stage Summary:
- Fresh manifest (docH heron→madarek @viewport): 360x800 10615→11215 · 390x844 11363→11426 · 412x915 12172→11748 · 768x1024 12535→13248 · 820x1180 13905→14174 · 1024x768 9926→12209 · 1280x800 10967→11407 · 1440x700 10538→10652 · 1440x900 12338→12470 · 1920x1080 15371→14965 · 844x390 9364→11110.
- r313 drift audit: ALL 7 page-height anchors within 2% (worst -0.68% @390x844); sections @1440x900 identical to reference EXCEPT one flagged drift: why 681 vs ref 698 (-2.44%) — recorded in manifest drift/driftSummary fields, fresh value kept authoritative alongside ref (live Heron's why band is 17px shorter than at r313 time; both capture.mjs and measure-sections agree on 681, so it is a real live-site change, not noise).
- Note for parity judges: Madarek docH varies slightly between consecutive runs at some mid viewports (e.g. 768x1024: 12970 capture vs 13248 measure ≈ +2.1%; 1024x768: 12335 vs 12209 ≈ -1.0%) — dev-build reflow variance (chapters/problem bands), not a Heron-side issue; heron docH was bit-identical across capture and measure passes at all 11 viewports.
- Failures: NONE (all 11+11 landing passes, 20 inner-page passes, 22 measure passes succeeded; no retries consumed).
- Paths written: scripts/r314/capture.mjs (upgraded) · scripts/r315/measure-sections.mjs (new) · _local/captures/{heron-r315, madarek-r315, heron-pages}/** · _local/captures/r315-manifest.json (+ heron-r315.log, heron-pages.log, r315-measure.log). Nothing committed/pushed; frontend/src + backend untouched.

---
Task ID: 1-c
Agent: foreman (main session)
Task: K-A4/A5/C/B chrome fixes + white-box kill + gate + push 1

Work Log:
- Removed the fixed mono label MADAREK · LEARNING SHEET + ALL page-frame plus marks/coords (E-crawl ground truth: the reference's .main-deco = 4 hairlines ONLY, nothing overlaps the header); drafting ± marks stay on the hero window where the reference carries them.
- Retired the top orange progress ribbon (.fo-progress markup + CSS + imperative --p); re-pinned landing-scrollspy-grain to assert ABSENCE (R315 override).
- Consent banner (K-C): ONE line «يستخدم هذا الموقع التخزين المحلي. اعرف أكثر»; mirrored bottom-LEFT seat; Accept 79×28 on the measured #EFEFEF ground (light-pinned raw + color-gate: allow), Reject 81×28 outlined; mobile 359×94 with the 44px a11y floor (measured 374×93.45).
- Header cell grammar (K-B): 56px ruled row [logo cell (flex) | nav 4×16.4rem cells | theme icon cells (unboxed) | login cell | CTA 20rem=166.66px measured ✓]; brand compact (mark + 20px wordmark, tagline retired → r177 re-pin 2→1); burger = 3 bars; separators 1px #B3B3AF everywhere; CTA = transparent + accent-ink read + orange fill-wipe + dual-label roll, ZERO :focus-visible rules (r190 canon kept — base ring owns focus).
- White-box kill: .fo-hero-window .bp-fill { fill: none } scoped to the hero (the map keeps poché); verified 0 pure-white px in the art region post-loader (was the LOADER's own art painting white in earlier probes — the hero rule is correct and loader-scoped art untouched).
- Edge tab mirrored to the physical LEFT edge (44×139, offset 0.8rem, visible at all widths per E-crawl — no breakpoint on the reference), z40 ≤991 so it can never eat a heading; hover nudge mirrored.
- Re-pins (R315 override notes): landing-scrollspy-grain, r177-brand-neutrality, landing-funnel (header cell classes), r162-ux-cohesion (CTA cell class + zero focus-visible restored), r309 e2e pair (sheet-coords absent).
- Verified via Playwright at 1440/390/768/1024 (post-loader gate): header 1426×56 exact, hero 887 exact, H1 fully inside viewport at every band, no overflowX anywhere.
- Gates: eslint 0 errors (16 pre-existing warnings) · tsc 0 · vitest 2531/2531 · check:colors OK (26 allow lines) · check:icons OK · check:motion-tokens OK · check:raw-css report-only.

Stage Summary:
- Push 1 of cycle 1 ready: chrome + hero + auth + capture/grammar instruments (J1/E-crawl scripts + docs/research/pages/*) + BOARD/worklog. Score recompute (PARITY ratchet ≥56.6) lands at cycle close after J2/J3 judges + B4/B9.
