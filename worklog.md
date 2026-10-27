# Worklog — R315 «ALL SCREENS, EVERY DETAIL»

Repo: /home/z/madarek (clone of <repository-url>, branch main).
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

---
Task ID: 1-d
Agent: foreman (main session)
Task: Cycle-1 close — B4/B9 completion, judge-driven fixes, PARITY, push 2+3

Work Log:
- Finished the partial runs the dead agents left: B4 map (6 states verified, band 6301/6300 @1440, 5383/5376 @1024), B9 footer (wordmark full-width 1398px, 0 overlaps), J2 DOM judge (already run: 6 viewports, 729 mismatches ranked in _local/dom-judge/report.json).
- Re-pinned r306 to the K-E retirement (3 pins) — suite 2530/2530 green.
- Judge-driven fixes: consent Accept = the measured GHOST (#EFEFEF ground + WHITE label + btn-fill slide hover, r313 digest cookie-accept), Reject = borderless ink body-font quiet seat; auth in-row labels muted to the #B4B4B0-family token (--text-faint).
- Wrote audits/evidence/r315/PARITY.md (cycle-1 evidence table + geometry + gates + cycle-2 queue); BOARD + worklog updated.
- Pushes: 73dd2382 (chrome+hero+auth+instruments), 03a5ebbf (map+footer+K-E), final consent/label judge fixes.

Stage Summary:
- Cycle 1 closed with 10 of the owner's §0 tickets measured-closed; docH @1440 −0.04% vs the live reference.
- Cycle-2 top ticket (exact numbers in the manifest): the ≤1024 tablet band re-composition (Heron keeps the desktop composition on the 5.93px root; ours restacks → +22.7% @1024).

---
Task ID: r315-c2
Agent: foreman (main session — continuation after sandbox reset)
Task: R315 cycle 2 — push to main + the next round: the ≤1024 band re-composition (cycle-1's top queue ticket), deepest/strongest matching, finest details, owner orders (personal-data scrub, copy quality), judges re-run, PARITY ratchet.

Work Log:
- Re-cloned the repo at c117c98d (cycle-1 close). Fresh baseline: PARITY 56.6, cycle-2 queue = M2/M3 tablet band + judges re-run.
- Measured BOTH sites × 11 viewports fresh (scripts/r315/measure-sections.mjs; deterministic vite-preview protocol after catching the dev server serving stale CSS with zero HMR lines — prod/dev builds then measured bit-identical).
- M2: our old max-1024 tablet block restacked at 992–1024 while the live reference keeps the desktop composition on the 5.93px root → boundary moved to the reference's own rungs (max-991 + min-992 ×2). 1024×768: +22.7%→+8.0%.
- Built scripts/r315/band-structure-probe.mjs (computed skeleton dump per band) + probed the reference @768/1024 — derived THE LAW: every ≤991 band is a constant-rem height (57.2/144.8/55.2/95.2/145.2/58.8/103.1 ±0.2rem across 768/820/844L).
- M3 batches 1–3: V13 mobile-grade grammar extended to 768–991 (floors retired, K-H title rung, CTA folds, platform two full-width strips, footer row grammar, rem floors). Batch-1 lost the cascade to later base rules (pr/why/cta/footer) — re-seated at file END; batch-2/3 landed the law. 768 +14.5%→+0.6% · 820 +11.4%→−0.9% · 844L +13.4%→−1.0%; most bands pixel-exact (cta 541/541, why 877/877, usecase 1469/1469, footer 1043/1043).
- Phone boundary 760→767 (live stylesheet census: the reference carries exactly 991/767/479); r306 test re-pins documented in-test (content-anchored extractors, not order-anchored).
- J2 judge fixes: hero graticule (rulers + dashed frame) retired to the reference's at-rest invisibility (proximity reveal on fine pointers, display:none <992).
- Owner orders: repo link scrubbed from the footer UI (honest early-access-form contact note) + README/docs/logs/scripts/evidence redacted (LICENSE/SECURITY kept as functional legal instruments); copy pass («الأدوار والشرائح» consistency, problem/cta polish).
- Judges: DOM judge 729→623 instances; masked-pixel judge re-run (87 fresh pairs — pixelmatch-6 ESM interop fixed in judge.mjs); VLM describe-then-diff: hero @1440 MATCH 95 (scene-graph convergence), mid/late progress frames SKIPPED as alignment-limited (recorded transparently); public-pages smoke matrix REBUILT 40/40 (dark verified per-probe with the real zustand persist shape — first sweep silently ran light, caught + fixed; artifact written in score.mjs's bare-array shape).
- Score: PARITY 56.6 → 58.5 (vlm 43.5 · pixel 42.9 · census 41 · motion 78 · behaviour 90 · coverage 100). Ratchet held.
- Gates: eslint 0 · tsc 0 (incl. tests) · vitest 2530/2530 + 1783/1783 · check:colors/icons/motion-tokens/csp-hash OK · verify-parity-export 200/200.
- Docs: CHANGELOG r315-cycle-2 section · PARITY.md cycle-2 · BOARD.md cycle-2 + cycle-3 queue.

Stage Summary:
- Cycle-2 top ticket CLOSED with a measured law (constant-rem band heights), not per-viewport forks: the tablet/landscape band went from +11–23% to ±1% with most bands pixel-exact; zero regressions at 1440/390/412.
- Remaining (cycle-3 queue, with numbers): 992–1024 +8.0% (13px Arabic canon floor ledger + wraps), 480–767 mid-band −16.2% @600 (mobile-family rem purification), 360 +5.5%, 1920 −3.2% (footer px caps), landscape hero seat, VLM re-verdict pass on anchored frames.
- Personal data: no repo URL/owner identity in any UI or doc (grep-verified); PAT used only as an ephemeral git credential helper, never in any file.

---
Task ID: r315-c3-open
Agent: foreman (main session)
Task: Open R315 cycle 3 — the fleet round (owner order: strongest/most comprehensive yet; many agents; every page; finest details; until perfection)

Work Log:
- Verified remote main == local HEAD 4b218adb via ephemeral credential ls-remote (PAT never in any file; remote not re-added).
- Personal-data scrub re-verified: no repo URL/owner identity in any UI/doc/evidence; only the documented LICENSE/SECURITY legal instruments + third-party research URLs remain.
- Fleet round dispatched: 7 agents in worktrees ../r315-w1..w7 (branches r315/w1..w7; node_modules symlinked; deterministic build+preview per worktree on ports 4181–4184/4186/4187):
  W1 phone ≤479 (360 why +17.7%, 412 statement −7.9%) · W2 mid 480–767 (600 docH −16.2%, rem-law verification 480/540/600/660/720) · W3 desktop ≥992 (1024 slice +8.0%, 1280 footer +12.7%, 1920 uncap) · W4 landscape (hero seat 374, chapters 2317) · W5 landing copy pass · W6 inner pages audit @768/390 light+dark · W7 VLM re-verdict of the 27 stale DIFFERENT pairs.
- BOARD.md carries the cycle-3 fleet table + merge order.

Stage Summary:
- Cycle 3 open with a 7-agent parallel fleet on disjoint file domains; foreman will merge W1→W4 (landing.css tier hunks) → W5 → W6 → W7, re-measure ×11, re-run the three judges, hold the PARITY ratchet (>58.5), run the full gates, then push to main.

---
Task ID: r315-c3-close
Agent: foreman (main session)
Task: Close R315 cycle 3 — the fleet round: merge all 7 tickets, re-measure the ladder, re-run the judges, hold the PARITY ratchet, full gates, push to main

Work Log:
- Fleet closed: W1 (5a338771) · W2 (83e97543) · W3 (102e0b1e) · W4 (a63a9839 — foreman-completed after the agent's context death: diff reviewed, rebuilt, measured 844×390 all bands ≤0.13% + 768 portrait unregressed, gated) · W5 (7ce9388c) · W6 (e133b94b — foreman-completed likewise: 40/40 deep probe re-run on the fresh build) · W7 (0f511804).
- Merge surgery: the three geometry branches all append at landing.css EOF (W1 +315 / W2 +194 / W3 +235−25) — resolved by reconstruction (each branch's own balanced file + the siblings' self-contained tier blocks appended; brace balance verified 0 each step), NOT by marker-splicing (git's diff aligned the blocks' shared comment scaffolding and marker-splicing interleaved them — lesson recorded).
- Post-merge ladder (fresh, deterministic preview): 11/11 viewports every band ≤3%, docH drifts +0.02%…+0.85% worst. The cycle-2 queue's four geometry tickets all closed.
- Foreman ticket: the drafted-art footer SVGs extracted to components/landing/FooterArt.tsx — check-icons (the one gate red at the clean cycle-2 base) now green; DOM byte-identical (footer 712/711 @1440 · 1239/1239 exact @390 re-measured).
- Judges: 87 fresh pixel pairs re-captured (3 viewports × 29 frames) — worstRegionAvg 0.72 (geometry no longer a driver; the worst regions = artwork style); VLM re-verdicts (W7) consumed; score recompute: vlm 43.1 · pixel 43.1 · census re-measured 55 (fresh parity-table: pageHeight family 7/7 within ±0.9% of the live reference, root-font 7/7 exact) · motion 78 · behaviour 90 · coverage 100 → **PARITY 58.5 → 60.5, ratchet held**.
- Gates on the final tree: eslint 0 · tsc 0 · vitest 2530/2530 + 1783/1783 · check:colors/icons/motion-tokens/csp-hash OK · verify-parity-export 200/200 · pages-smoke 40/40.
- Docs: PARITY.md cycle-3 section + cycle-4 queue (the judge's verbatim worst-first list) · BOARD.md cycle-3 close table · CHANGELOG entry · this worklog.

Stage Summary:
- The fleet round closed the ENTIRE remaining geometry ladder: every band at every one of the 11 viewports is now within ±3% (most exact), worst docH drift +0.85%. Cycle-4's queue is artwork/composition (the map/platform canvases + hero tonal density), the alignment-harness family, and the carried flags — no geometry tickets remain.

---
Task ID: r315-c4-close
Agent: foreman (main session)
Task: Close R315 cycle 4 (artwork/composition round) — merge the five-agent fleet, re-verify the ladder, run the full gates + fresh judges, push to main

Work Log:
- Fleet closed 5/5 (all agents hit their context deadlines mid-work; foreman completed each: review → build → measure → vision-check → gates → commit): c4/a map journey (1712fafc) · c4/b platform (be8d64a7) · c4/c hero+statement (d96f97ad) · c4/d carried flags (889a3cdf) · c4/e CI debt (1ebc9ea9).
- Merge surgery: the three artwork branches all append landing.css EOF banners; the auto-merge silently interleaved c4/a+c4/b (unbalanced) — reconstructed from the cycle-3 base + each branch's own patch in sequence (balance verified 0, builds green).
- Post-merge verification: full ladder 11/11 all bands ≤3% (ZERO geometry drift from the artwork round) · e2e 102/102 · r305 belt 0 failed · lint 0 · tsc 0 · vitest 2533+1783 · raw-css --strict PASS · icons/motion/colors/csp/parity-export OK.
- Fresh pixel judge (87 pairs): worstRegionAvg 0.72 — floored by the artwork-SUBJECT difference (the no-copy rule); s03-25 (the cycle's worst pair) dropped worstRegion 100%→20%. PARITY 60.5 held.
- CI on the cycle-4 push: Design gates GREEN (first time since r314), E2E running; Build (DB-free) failed ONLY on the bundle-size gate — 702.8KB gz vs the 700 ceiling (the ink-artwork round's SVG path data). Re-pinned 700→712 per the gate's own documented-raise protocol (+1.7%, entry 80 and pdf 110 ceilings unchanged).

Stage Summary:
- Cycle 4 pushed: 832f5525 → 30ff7f02 (+ the bundle re-pin). The artwork/composition round landed with zero geometry drift; the two CI jobs red since r314 are green (design gates confirmed, e2e local 102/102 pending its CI run). Cycle-5 queue: the VLM re-verdict of the 20 changed frames, hero tonal mass, the alignment-harness family run, typography census, the true authed sweep.

---
Task ID: r320-c2-resume
Agent: foreman (main session — continuation after the previous agent's context end)
Task: Resume R320 Cycle 2 from where the previous agent stopped: the two unmerged c2 branches (LEGAL + FLOW), the landing residuals §A2-A4, and the CI state.

Work Log:
- Read the full context: worklog + BOARD + both remote branches (r320/legal 7 commits complete with the 89/89 belt; r320/flow M1-M3 complete but MISSING the backend password-reset belt).
- Completed c2-FLOW M4: backend/tests/modules/auth-password-reset.test.ts 18/18 (token primitives incl. the sha-256 'abc' vector; mint's equal-cost anti-enumeration mechanism pinned; the CAS where-clause; policy-before-burn; superseded-once retry 4→5; superseded-twice honest INTERNAL; route envelopes: 4 no-oracle shapes + devInbox @test.ly-only + VALIDATION_ERROR). Prisma client regenerated (the new model was unknown to the generated client — tsc red until generate). fd157c4c, pushed to r320/flow.
- Merged c2-LEGAL → main (c41a5560, clean), pushed. Merged c2-FLOW → main (2569f135): auth.css conflict resolved keeping BOTH sides (LEGAL §5b consent + FLOW §5c fp-*); braces balance 0; semantics verified (routes + ConsentLine + forgot Link coexist). Full suites on the merged tree: front 2717/2717 · back 1823/1823 · tsc 0/0 · lint 0 · parity/icons/motion/CSP OK. Pushed.
- §A4 (f7c4540c): killed the map SVG label collisions — svg-collisions 9@390/14@1440 → 0/0 with NO allowlist. Wrote the dump probe (scripts/r320/svg-collisions-dump.mjs — the gate's exact collector, untruncated). Every zone's name/area pair re-seated on separate baselines ≥14px rendered, clear of furniture (المكتبة was 6u between baselines — the 548.7px² worst defect; الإتقان printed ON the ladder; المحاضرات ×the seating fan 1210px² → the fan tightened dy 135→90; الاختبار's area ate the first desk row; PlatformPlanArt «7200» re-centred on its own dim segment). Camera crops verified (r312 9/9). Landing suites 62/62. Pushed.
- §A2 (7234c432): the R319 OCR tint twin RETIRED — the owner-measured #8F8F8B was the tint's computed value; TRUE outline now (fill:none · stroke 1.7px non-scaling; dark = paper stroke).
- §A3 (7234c432): the ink strip re-composed — 70u images (99px @1440), 8.5u mono captions one baseline, the [01] label on its OWN ruled .fl-head row (0 overlap), viewBox 1000×100, LENS_R 47.2, lens pointer math re-seated on the svg's own box (svgRef). Evidence 4 cells + probe numbers committed (audits/evidence/r320/landing/).
- docH ratchet investigation: the first probe read +9-10% at 1440/1024 — ISOLATED (stash → f7c4540c → f84e6025): the drift pre-existed the session AND reproduced at f84e6025, then the cause found: forcing reducedMotion:'reduce' inflates the desktop docH +9% (a protocol artefact — the landing renders different band states under RM). With the R319 protocol (NO RM override) the ladder HOLDS: ±1.25% worst across all five rungs including this session's planned §A5+§A3 growth. Probe committed with --motion/--intro flags (scripts/r320/docH-ratchet-probe.mjs).
- CI forensics (5 red jobs at f7c4540c): 2 inherited (Design gates raw-css: auth.css gap:2px from c1-ACCOUNTS; Build: bundle 713.5/712 pre-existing) + 3 NOT test failures — the GitHub ubuntu-latest runner rolled to 26.04 on 2026-10-27 and @playwright/test 1.60 has no ubuntu26.04 browser builds (install-time failure in e2e/ios-webkit/surface-drift). Fixes (7234c432): the three browser jobs pinned runs-on ubuntu-24.04 (the exact image every prior green run used); gap 2px → var(--sp-0-5) (raw-css --strict PASS); bundle ceilings raised per the gate's documented-raise protocol — total 712→736, entry 80→82 (measured 730.3/80.4 = the §D route-level growth, all new pages lazy; pdf unchanged) with the r183-B8 belt re-pinned (down with Cycle-6's diet, never up). Local verification: build 730.5/736 PASS · 80.4/82 PASS · 95.7/110 PASS.
- Final gates on 7234c432: tsc 0/0 · eslint 0 · front 2717/2717 (r183-B8 10/10 re-pinned) · back 1823/1823 · raw-css --strict PASS · svg-collisions 0/0. Pushed. Docs: CHANGELOG r320-C2 entry + BOARD cycle-2 close + this worklog.

Stage Summary:
- Cycle 2 CLOSED: §D complete (9 public sheets + forgot/reset flow, both belted), §A2/§A3/§A4/§A5 fixed with probe evidence, CI repaired (all 5 red jobs addressed), docH ratchet held (±1.25%) with a protocol-artefact finding documented (RM inflates desktop docH +9% — measure with the R319 protocol).
- Cycle 3 queue (BOARD): §A1 desktop perf (the loader-on LCP gap ~21s vs the ≤2.5s/≤4s targets — the loader duration itself is the decision; render pipeline post-fix3) · student remaining pages + /settings + the P1/P2 error surfaces · the Playwright/Ubuntu-26.04 bump at the Cycle-6 dep refresh (un-pins ubuntu-24.04) · the Cycle-6 diet (65 duplicate-selector conflicts + bundle 736→down).

---
Task ID: r320-c2-ci-green
Agent: foreman (continuation)
Task: CI fully green on main.

Work Log:
- c95a7201: /student/ai §B2 counts race hardened (auto-retrying toHaveCount — the f84e6025 green run already flaked this line).
- 921fcd01: r305 focus-keyboard re-pinned — «نسيت كلمة المرور؟» is a Link now; the pointer-focus contract moved to the demo panel's fill button (open toggle → fill).
- 549b92b4: E2E job timeouts 12→20 min (measured 13.4 min — borderline 12 was killing them as 'cancelled').

Stage Summary:
- Run 40560836784 on 549b92b4: ALL 10 jobs GREEN (Typecheck/Lint/Tests×3/DB/Design/Build/Surface drift/E2E/E2E iOS) — first fully green CI since 2026-10-26. Cycle 2 fully closed.
---
Task ID: r320-c3-accounts-production
Agent: foreman (continuation — the owner's re-read request)
Task: The owner asked to re-read the R320 brief and execute fully, suspecting the test accounts were skipped. Verify §C on PRODUCTION (the §C-7 "after deploy" leg), fix what the verification finds, then continue the cycle-3 queue.

Work Log:
- Re-read the brief against BOARD state: cycles 1-2 closed; the cycle-1 accounts proof was LOCAL-only ("local sandbox" in accounts.md). Production health: buildId 0d24a5b4 (latest). First production login read the registrar as «إدارة الجامعة» — the pre-rename name ON PRODUCTION.
- Root cause chain (measured): db:seed runs ensureTestAccounts() BEFORE the corpus body; ACCOUNT_PROFILES (test-accounts.ts) still carried «إدارة الجامعة» while the corpus (seed.ts, c1-RENAME) had «المسجل العام» (parallel-fleet drift, like the auth.css conflict); the upsert's update branch healed only the password → the row created 2026-10-26 kept the dead name forever.
- 3664c111: twin-table lockstep (registrar → المسجل/العام/مع) + the heal branch now converges firstName/lastName/avatarInitials/color (our @test.ly accounts only) + render.yaml DECLARES MADAREK_TEST_ACCOUNTS='1' (§C2 said render.yaml/.env.example — only .env.example had it) + belt 12→14 (CANONICAL_NAMES lockstep both branches; no «إدارة» in any test-account name). back 1825/1825 (+2) · tsc 0.
- f7b85294: login-proof harness gains --out + the demo-panel leg (reopen chip → 10 rows → shot) + the registrar logs in THROUGH the panel one-tap flow on the target env.
- Deploy watched via health buildId (0d24a5b4 → 3664c111 → f7b85294). Post-deploy verify: registrar = «المسجل العام» / «مع» ✓.
- PRODUCTION PROOF 10/10: every account API 200 + token + role home at 390 UI (registrar via panel one-tap); panel opens with 10 rows. Evidence: audits/evidence/r320/accounts-production/{proof.json,panel.json,10 shots} + accounts-production.md.
- NEW P2 found by the VLM review of the evidence and fixed in the same pass: the onboarding tour veil at 390 let the display H1 poke 8px above the card (pf-page-title t=113 vs modal-card t=121) — read as "heavily clipped stubs". a9e071a3: the tour overlay now carries the Heron menu scrim (--glass-bg-strong, paper/ink @92%) scoped :has(.onboarding-flow); dialogs keep the context veil. Belt OnboardingFlow 8→10. front 2719/2719 (+2) · dup-selector/hover-guard zero NEW · raw-css strict PASS.
- ec9716fc: housekeeping — restored the cycle-1 proof.json an accidental localhost harness run had overwritten (0/10 garbage) and removed its FAIL shots + panel.json from the cycle-1 evidence dir.

Stage Summary:
- §C is now closed on BOTH legs (local cycle-1 + production §C-7). All 10 @test.ly/12345678 accounts log in on madarek.onrender.com; the demo panel works on production; the registrar reads «المسجل العام» everywhere.
- The tour-veil fix needs its after-deploy shot (faculty@test.ly still has the tour un-dismissed — use it to verify the 92% scrim kills the stubs).
- Next: cycle-3 main line per BOARD queue — §A1 desktop perf (loader LCP) + student remaining pages + /settings + P1/P2 error surfaces.
---
Task ID: r320-c3-settings-package
Agent: foreman (continuation)
Task: Cycle-3 build: the ANY-AUTHED /settings + the routed error sheets (PAGES-GAP P2-1..P2-5) + nav wiring — the teacher change-password gap closed.

Work Log:
- 5d6132b4: /settings (ProtectedRoute+AppShell like /vision) — seven §B2 sections (المظهر ThemeToggle+/me sync · تغيير كلمة المرور · معلومات الحساب والتحقق honest /auth/me facts · الإشعارات/اللغة/الجلسات honest قريبًا EmptyCells · بياناتي via /contact+/legal/privacy). ChangePasswordCard LIFTED verbatim from ProfilePage §[04] to components/account (ONE definition; ProfilePage re-imports — its suite stayed green = behavior-preserving). r320-settings.css (tokens only, @layer pages).
- Nav wiring: ONE /settings row per role labeled إعدادات الحساب (the cross-role one-label rule caught my student/admin label drift at the nav-coverage gate — unified), LAST in the account groups (the r171a adjacency contract profile→messages→alerts intact), UserCog vs the platform Settings icons. ADMIN /admin/settings row retitled إعدادات المنصّة (matches its page H1 pinned by r305a8). nav-coverage 33→34 re-pinned with the R320 override note.
- Error sheets: /500 /403 /maintenance via the shared ErrorSheetPage (the /404 grammar: sheet frame + grain + mk-ill scene + mono code eyebrow + one primary way home; 403 way-back = ROLE_HOME; maintenance disabled-by-default with honest copy). PAGE_TITLES rows added (route-titles-coverage green).
- Belt r320-settings-pages 10 NEW (nav wiring ×3 incl. unique-icon rule + settings ×4 + error ×3). Gates: front 2729/2729 (+10) · tsc 0/0/0 · eslint 0 errors · raw-css strict PASS · dup-selector/hover-guard zero new vs baseline.
- Deploy watched (health buildId → 5d6132b4). Production verification (scripts/r320/settings-after.mjs, committed): teacher@test.ly → /settings PASS (7 bars, theme group, 3 password fields geometry-proven y=710/795/907 h=44 — the VLM's "one field" read on the tall fullpage shot was a false positive, disproven mechanically), honest seats قريبًا×2+العربية+عبر الطلب; /500 /403 /maintenance all PASS (h1 + document.title). Shots: audits/evidence/r320/settings/.
- fb5745f1 evidence commit + BOARD cycle-3 table (§C closed both legs · §A6 fixed · P2-1..P2-5 fixed; remaining: §A1 perf + §E student pages + cycles 4-6).

Stage Summary:
- Cycle-3's settings/error block COMPLETE and production-verified. The §C accounts story fully closed (local + production). The §E sweep recipe is established (shared component + belt + nav wiring + production probe).
- Next session: §A1 desktop perf (loader LCP decision) OR the student remaining §E pages (results, online exams + taker, lectures player, training ×3, live, map, university, AR/VR, community, dashboard re-check) — then cycles 4-6 per §I.
---
Task ID: r320-c3-ci-green
Agent: foreman
Task: CI verification of the cycle-3 settings package tree.

Work Log:
- Watched the runs: 5d6132b4's run was concurrency-cancelled by the docs commits (supersession, not failure); the authoritative run on 111f7f79 (the full tree) completed: ALL 10 jobs GREEN — the cycle-3 settings/error package rides a fully green CI.

Stage Summary:
- Cycle 3 checkpoint GREEN end-to-end: local gates + production probes + CI. Remaining for the next session per BOARD: §A1 desktop perf · §E student pages · cycles 4-6.

---
Task ID: r321-c1-open
Agent: foreman
Task: R321 final programme — open cycle 1 on a7e335db (scope guard: ONLY the madarek repo; the four smart-* clones from the stray round are out of scope and untouched).

Work Log:
- Verified state: local main == origin/main == a7e335db (R320 c3 close, CI 10/10 green on 111f7f79). Credential helper set (token never in remote URL/files/commits beyond the ~/.git-creds store).
- Created docs/redesign/r321/BOARD.md — the ten §A tickets + ratchets + cycle order per the brief's §I work order.
- npm install (workspaces hoisted; vite 5.4.21 / playwright 1.60 / vitest ready; local browsers: chromium ×2 — WebKit stays a CI leg).
- Baseline frontend build started (workspace-scoped `npm run build -w frontend`; the ROOT build is forbidden — it chains backend build + db deploy + seed).

Stage Summary:
- R321 C1 opened. Order: A5+A6+A7+A8 (quick fixes) → A4 clipping + gate extension → A2 height ratchet → A1 desktop perf → A10 production proof harness.
<<<<<<< HEAD
---
Task ID: r321-c1-foreman-b
Agent: foreman-B (this container, session started 21:26 UTC; foreman-A container landed batch-1 147051a3 @21:10 and batch-2 1cd79446 @21:59 — coordination entry)
Task: R321 cycle 1 — parallel foreman protocol + work-package claims (no collision with foreman-A's in-flight C1 line).

Work Log:
- Fresh full clone at 1cd79446; npm install (552 pkgs); frontend build ✓ (6.4s); dev:full stack UP on this container (embedded PG :5433 works — no libicu fallback needed; api :4000, web :5173; all 10 test accounts seeded); front vitest running; playwright chromium+webkit installing.
- Concurrent-session detection: batch-2 (gate:r321 + §A6 completion) landed AFTER this container's clone. Per the BOARD work order foreman-A's next queue is A2 → A1 → cycle close.
- CLAIMS (worktree per package, reviewer approves every merge):
  · WP-A10 §A10 production proof harness + first production run → scripts/r321/prod-proof.* + audits/evidence/r321/prod/ (new files only)
  · WP-B0 §B student sweep inventory + all-role route map → docs/redesign/r321/STUDENT-SWEEP.md + audits/evidence/r321/student/ (docs/evidence only)
  · WP-C0 §C analysis baseline (knip/jscpd/depcheck/ts-prune/dup-selector/unused-CSS census → ticket factory) → audits/evidence/r321/clean/ (report only, zero src changes)
  · WP-HL Heron 11-viewport docH + section ladder evidence (feeds §A2's ±1.5% ratchet) + §F motion timings groundwork → scripts/r321/heron-ladder.mjs + audits/evidence/r321/ladder/ (new files only)
- Foreman-A keeps A2 (docH ratchet) + A1 (desktop perf) — this session re-checks origin before touching any landing file; if foreman-A is inactive for >90 min this session takes the remaining C1 line per the BOARD work order.

Stage Summary:
- Four non-colliding work packages launched in parallel worktrees; §B/§C evidence work advances the programme while the C1 landing line is foreman-A's. All merges: rebase-first, small commits, reviewer approval, gates green.

---
Task ID: r321-c1-foreman-a-close
Agent: foreman-A (this container)
Task: R321 cycle 1 — the C1 landing line: A4/A5/A6/A7/A8 → gates extension → A2 height ratchet → A1 desktop perf (partial). Coordination with foreman-B per 76ecfb84 (no collisions: A10/B0/C0/HL are theirs).

Work Log:
- 147051a3 batch-1: §A4 (minmax(0,1fr) guards + .lg-title clamp + cookies ledger card transform; 152 cells → 0 clip) · §A5 (code reads once — eyebrow is the single carrier, coords carry SERVER FAULT/ACCESS DENIED/SERVICE WINDOW, sr-only twin deleted, NBSP dash glue + text-wrap:balance) · §A6 (the cursor-dot tick = the missing inert opacity:0; 4 mark families → ::before) · §A7 (الحوكمة group + LegalPages/docs/README/issue-template + rename-keep re-pinned) · §A8 (demo panel OPEN by default + H1 → the r319-student masthead ladder 31.8px@390 + labels nowrap/max-content).
- 1cd79446 batch-2: gate:r321 composed (child gate:r320 + text-in-viewport + duplicate-text + decor-innertext + rename-ledger, own baseline 467 rows / regressions-only blocking) + the §A6 completion (8 more mark families + hi-marker/vc-poster dynamic codes via attr()) + r321-decor belt 2 NEW + CI design-gates ledger leg. The duplicate-text allowlist: 26 reasoned rows (per-item metadata/action families); the 8 remaining FAIL rows = the §C-3 «مساعد الفهم»×6 marketing-repetition ticket (baseline-pinned).
- ff7aeed6 batch-3 (§A2): every main section was ALREADY Heron-exact (hero 887=887, map 6301≈6300 …) — the whole +252px lived in the footer (+267 vs Heron 711). Cuts: legal row rides the © bar · wordmark en-caption retired · tablet compact cut ≤1099 (wordmark 82%, strip 80%, 12/12 cells, legal own row) · pads tightened. ALL five Heron viewports inside ±1.5% (1440 +1.42 · 1024 +1.46 · 768 +0.95 · 390 −0.73 · 360 +0.37) + the docH-ladder gate rule (11 viewports; ±1.5% at the five referenced, never-raise at the six pinned). Probe: scripts/r321/doch.mjs.
- bd4253ac batch-4 (§A1 part-1): the full decomposition (audits/evidence/r321/a1-analysis.md) — SVG raster/grain/reveals/gBCR ruled out by the variant matrix; UpdateLayoutTree 4.5s = #1 (54 recalcs × 781 elements avg); .jt-intro var chain 10ms/cycle (19× the R319 seat measurement); content-visibility REJECTED (breaks the docH ratchet + render-on-approach spikes — experiment committed); lenis-idle html-attribute retired (root-attr flip = whole-doc recalc; JS flag + belt re-pin); CLS 0.007 ✓ and LCP-skip 2.44s ✓ already inside targets; the ≤2% frames target remains OPEN with the next map written.
- HOUSEKEEPING: scripts/r316/perf.mjs chromium path made portable (newest full build); perf.mjs EXE scan; one-off probes removed, the reusable instruments committed (a1-*, doch, footer-blocks, probe).

Stage Summary:
- C1's landing line: A2/A4/A5/A6/A7/A8 FIXED-with-evidence + gates; A1 partial (the honest decomposition + one landed fix + the next-session map). Suites: front 2733/2733 · tsc 0/0 · eslint 0 · raw-css strict PASS · gate:r321 green (0 regressions).
- Next (C1 continuation/C2 per §I): the A1 trio (intro chain rewrite · 756-family hunt · loader plateau) · A3 phone hero art · A9 map SVG labels · foreman-B's A10/B0/C0/HL merges · student remaining pages sweep.

---
Task ID: r321-c1-ci-repair-ledger-selftrip
Agent: foreman-B
Task: Standing-gate repair — the rename-ledger scan self-tripped on the batch-2 ci.yml comment (uncovered=1 → CI design-gates leg red on main).

Work Log:
- Found while verifying WP-A10: `node scripts/r321/rename-ledger-scan.mjs` exit 1 on main — the ci.yml comment ADDED by batch-2 to document the scan contains the literal retired label (the gate's own evidence ran before the comment was written; the keep list covers scripts/r321/* but not the workflow file).
- Fix: the comment reworded to describe the scan without carrying the literal ("every occurrence of the retired admin-role label") — no allowlist widening (the keep list stays 20 rows).
- Post-fix: scanned 1014 files · 89 occurrences · 0 OFF-LIST · exit 0. The CI design-gates leg (which runs the same command) goes green on the next push.

Stage Summary:
- Main's standing gate repaired (2-line comment reword). Rule reaffirmed: the ledger scan must never see the literal in the very files that document it.
=======

---
Task ID: r321-c1-B0
Agent: WP-B0 (sub-agent, died at the 15-min tool deadline after capturing 49 route shots) + foreman-B completion
Task: The §B student inventory + all-role route map — the ticket factory for the authenticated sweep.

Work Log:
- Captured 41 route screenshots @390 light + 7 @1440 (48 total) (local dev:full stack, student@test.ly, intro-skip) incl. the §A8 demo-panel open-by-default confirmation shot.
- Foreman-B completed the census from the router (App.tsx) + code markers: 37 student-visible routes mapped to components/files; 32 carry the r319 sheet markers (verification targets); FIVE conversion targets named with line counts — T-1 OnlineExamsPages.tsx (1,951 ln, ZERO markers/PageFrame: OnlineExams + ExamTaker) · T-2 CampusMapPage (212 ln) · T-3 LivePage (255 ln) · T-4 LecturePlayerPage (1,004 ln, zero PageFrame) · T-5 CommunityPages.tsx (849 ln, the ×5-duplicate family — convert WITH the dedupe).
- The WP queue written: B1 exams · B2 map+live · B3 lecture player · B4 community+dedupe · B-verify the rubric sweep over all ✅ routes (the 100% coverage leg).
- All-role route map appendix: teacher 21 · admin 13 · quality 10 · owner 13 routes + the A10-proven role homes.

Stage Summary:
- docs/redesign/r321/STUDENT-SWEEP.md is the §B ticket factory + queue; evidence 48 shots (41@390 + 7@1440, all ≤150KB, dir 1.8MB); zero src changes.
>>>>>>> dad428dc (R321 c1 WP-B0 — the student inventory + all-role route map (32 sheet-verified routes, 5 conversion targets T-1..T-5, the B1..B4 queue) + 48 route shots (41@390 + 7@1440))

---
Task ID: r321-c1-B0
Agent: WP-B0 (sub-agent, died at the 15-min tool deadline after capturing 49 route shots) + foreman-B completion
Task: The §B student inventory + all-role route map — the ticket factory for the authenticated sweep.

Work Log:
- Captured 41 route screenshots @390 light + 7 @1440 (48 total) (local dev:full stack, student@test.ly, intro-skip) incl. the §A8 demo-panel open-by-default confirmation shot.
- Foreman-B completed the census from the router (App.tsx) + code markers: 37 student-visible routes mapped to components/files; 32 carry the r319 sheet markers (verification targets); FIVE conversion targets named with line counts — T-1 OnlineExamsPages.tsx (1,951 ln, ZERO markers/PageFrame: OnlineExams + ExamTaker) · T-2 CampusMapPage (212 ln) · T-3 LivePage (255 ln) · T-4 LecturePlayerPage (1,004 ln, zero PageFrame) · T-5 CommunityPages.tsx (849 ln, the ×5-duplicate family — convert WITH the dedupe).
- The WP queue written: B1 exams · B2 map+live · B3 lecture player · B4 community+dedupe · B-verify the rubric sweep over all ✅ routes (the 100% coverage leg).
- All-role route map appendix: teacher 21 · admin 13 · quality 10 · owner 13 routes + the A10-proven role homes.

Stage Summary:
- docs/redesign/r321/STUDENT-SWEEP.md is the §B ticket factory + queue; evidence 48 shots (41@390 + 7@1440, all ≤150KB, dir 1.8MB); zero src changes.
