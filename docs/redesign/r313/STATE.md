# R313 — Parity Closure (round state)

**Mission:** Make Madarek visually/behaviourally IDENTICAL to https://heronaiapp.com/ (owner-authorized override of all prior divergence decisions; functional contracts, honest-copy, a11y, CSP stay).

- BASE SHA: `eb69c87041e77e6ecdd608bf18cf6400bb81c7cb`
- Evidence root: `audits/evidence/r313/` (reference = Heron live census; baseline = production census)
- Parity ledger: `audits/evidence/r313/parity-table.md` (baseline: 3 match / 55 mismatch)
- Reference digest: `audits/evidence/r313/reference/digest.json` (+ NOTES.md)
- Baseline digest: `audits/evidence/r313/baseline/digest.json` (+ NOTES.md)

## Reference truth (measured live, 1440×900 unless noted)
- Paper `#F6F6EE` (live sample #F4F4EE–#F5F5EF, JPEG tolerance; canon = #F6F6EE), corners #F8F8F1
- Palette: accent #FA3600 · ink #282828 · secondary #414140 · muted rgba(40,40,40,.72) · hairline #B3B3AF · guides #E0E0DA · reticle #FC724D
- pageHeight: 12355 (1440×900) · 10555 · 10983 · 9938 (1024) · 12577 (768) · 11441 (390) · 10684 (360)
- Root: `font-size: 0.578704vw` desktop (8.333px@1440, 7.407@1280, 5.926@1024); mobile rates ≈1.198vw@≤991, ≈2.5446vw@≤479 (9.924@390, 9.16@360)
- Sections (9): hero 887/7.2% → intro 723/5.9% → problem 743/6.0% → **map 6300/51.0%** → platform 710/5.7% → why 698/5.6% → usecase 887/7.2% → cta 698/5.6% → footer 711/5.8%
- Typography: h1 46.67px/5.6rem 700 lh1.0 ls−0.02em UPPER (BT Grotesk) · h2 40/4.8rem 600 · h3 33.33/4rem 600 #B4B4B0 · body 13.33/1.6rem 500 ls−0.27px · mono Geistmono 500 8.33/10/11.67px UPPER
- Buttons: radius 0, shadow none, JS fill-wipe (btn-fill-bg slide) + dual-label roll ±16.33px + arrow slide; header-cta hover #FA3600 fill; nav hover #282828 fill + roll; footer-subscribe 40×40 #B3B3AF arrow-grow hover
- Inputs: 1px #B3B3AF → focus #ED4C1F → filled #FA3600, .45s
- Loader: ~7.2s asset-gated; counter 16%@1131ms, 50%@2165, 60% plateau 3366–3840, 100%@5649; 10 log lines; exit 835ms center-out two-band clip split; replays on reload; no replay on Barba nav
- Route transition: ~1.6s — path swap @142ms → --trans-percent 0→50% @897ms → --mask-percent opens → 99.96% @1616ms; 4-edge inset wipe; line spike at midpoint
- Scroll: Lenis 1.1.5 `{wrapper: .main-inner, content, syncTouch:true, smoothWheel:true, smoothTouch:false, infinite:false}` lerp 0.1 wheelMultiplier 1 + GSAP 3.12.5 ticker + ScrollTrigger.update per scroll; probe tail 1540ms exponential glide
- Cursor: one body canvas z2147483600; 10×10 #FA3600 square (≈9×9 core); reticle 2px #FC724D scale .56 op .68 lerp .18; suppressed in hero zone; none on touch
- Radius exceptions: .cursor-inner 50% (invisible fallback), 3× .home-why-item-card-dot dots · Shadow exception: cookie-banner `0 6.67px 0 -1.67px #000`
- Motion: 24 keyframes; dominant transition 0.4s; marquee 30s linear dual-direction; easings ease, cb(.23,1,.32,1), cb(.625,.05,0,1), cb(.5,.5,1,1), linear, steps
- Footer 711px: 3 columns; lens r99.09/pulse104.04 lerp .09/.15 in .55s/out .8s; strip 1427×314
- Cookie banner: fixed 601×38 z100009, 4×1px black lines, Accept (fill #EFEFEF)/Reject, JSON consent + window.HeronConsent
- Frame: 7px inset (scales 6/7), 1px #B3B3AF fixed, 10×10 corner plus, ruler strips 64% opacity proximity, 6.4rem hover grid, edge coordinate labels
- Header: fixed 56px @7px inset, 4 nav + CTA, classes `header` → `on-scroll on-hide` → latched `on-hide` at top; hamburger <992px (390: 187×50 MENU)

## Baseline (Madarek production @ eb69c870)
- Paper #F6F8FA; radius violations 126/1966 on landing; shadows 6/1966; rootFontSize 16px at ALL viewports; header 57px sticky no hide/show; loader 8621ms 5 log lines exit CUT at ~21ms (onDone remount race bug); transition 721ms + 500ms GuestReveal; native scroll tail 0; landing 16,280px/12 sections; 1024×768 spike to 20,121px
- Authenticated surfaces: NOT captured — external brute-force actor locked all 5 demo accounts on capture night (ACCOUNT_LOCKED via 429; locks expire 15min after attacker's last attempt). r305-shell evidence (audits/evidence/r305-shell/*.png) serves as the authenticated "before". Re-capture when locks clear.

## Round progress
- [x] Phase 0: census + parity table (commit 31e43057, 560109a5)
- [ ] Phase 1a (4-a): foundation tokens D1–D5 — IN FLIGHT
- [ ] Phase 1b (4-b): Lenis D6
- [ ] Phase 2: WP-A (landing structure D7/D9/D13), WP-B (loader/header/footer/transition/cookie D8/D10/D11/D14/D15), WP-C (cursor D12), WP-D (primitives D4/D16), WP-E (student), WP-F (teacher/quality/admin/owner), WP-G (misc pages + illustrations), WP-H (gates/tests)
- [ ] Phase 3: WP-I independent QA + parity re-run + visual pairs + surface sweep + Lighthouse/axe
- [ ] Phase 4: docs (DESIGN.md, parity-matrix, AGENTS.md §5.4, release-report) + push + Render verify + smoke

## Known constraints & incidents
- GitHub PAT pasted in chat by owner (6+ times) → MUST be revoked after this round
- External brute-force on demo accounts (public creds in seed.ts) → transient lockouts; budget logins (auth rate limit 10/15min/IP)
- Never run root `npm run build` (deploys DB); build workspaces separately
- CSP: index.html inline scripts → re-pin sha256 in backend/src/app.ts + check-csp-hash.sh
- Funnel pins (5 register CTAs + 5 logins + section ids statement/chapters/live/roles/colleges/vision) are hard contracts
- BT Grotesk is proprietary (permanent exception); Geist Mono is OFL (adopted)
