# R328 HANDOFF — «حرفية البكسل» (PIXEL CRAFT)

> **Resume protocol:** read this file first; continue from the first non-done row.
> Push after EVERY step. Commit prefix `feat|fix|chore|docs(r328): …`.
> **One branch: `main`.** Order is strict **S → H → T → P → N → C → Q**; ≤25% of
> the session per stage. Every visual claim = a screenshot (same width + scroll),
> Heron|Madarek side by side, opened with eyes (VLM reads logged) — DOM numbers
> alone never close a row.

## The programme

R328 = appearance-only polish to **Heron** parity (paper #F6F6EE · ink #282828 ·
orange #FA3600 · radius 0 · no shadows · Lenis + GSAP feel), light + dark,
320→1920. Homepage first (H), then every page (P). Work by subtraction: before
every addition ask «ماذا أحذف؟». R327's mobile/store threads stay untouched.

## Status board

| Phase | Scope (short) | Status | Evidence |
|-------|---------------|--------|----------|
| S | live diagnosis on `main` @ `0ac6a79` — re-shoot the landing myself, confirm the 8 reported defects, add mine | **done** | Full local stack (embedded PG :5433 · api :4000 · vite :3000) booted via `scripts/r319` pieces; 30 frames captured `docs/redesign/r328/shots/S/` (1440×900 + 390×844 × {0..100%} + dark pair) + DOM geometry. Findings ledger below — all 8 user defects CONFIRMED with geometry, +7 new ones (S-A…S-G). scrollHeight 12429 d / 11417 m matches the report. |
| H1 | cookies as Heron language (corner card ≤360px, never covers, excluded from evaluation shots) | **done** | `189c74ac` — the corner card: ≤360px inside the 7px frame, no shadow, hairline rules, LIVE never-hide reserve (var(--app-bottom-stack)+14 on .landing AND the hero), 200ms rise; clearances: CTA→card 127/137/109/77/61px @1440/390/1280/1024/768, strip→card ≥12px at 7 widths; loader-overlap phone pin PASSES |
| H2 | hero desktop: whole fold (nav · title · lead · CTA · all six indicators un-faded) | **done** | `9e2ff818` — the stage cap 56svh: the art row's sizing had pushed the strip behind the card at 1280 (−55px)/1920 (−12px); all clearances positive at 7 widths; six indicators static space-between ≥1200, zero mask (the crawl + its duplicate track deleted) |
| H3 | hero phone: 100svh−bar, proportionate art, one connected block, CTA above fold, snap strip | **done** | `189c74ac` — aspect 8:5 stage (376×235 @390), the 33rem dead mat dead; connected title·lead·CTA with gaps 24/32 exact; lead re-seats to txt-16 + flex 0 0 auto (the 24rem row-basis was sizing its HEIGHT in the column form — 238px around 2 lines); snap strip <1200; five stale .fo-hero overrides deleted (sp-5/8, 100svh−71, −1.62rem, 10.5rem, 8.5rem, sp-4, 26rem) |
| H4 | pinned chapters: title never over ink, two-step fade, `مقدمة` = label, no pin jump | **done** | `5c89a361` — the plaques left the plan's surface: caption band ABOVE the drawing ≥992 / paper card BELOW ≤991 (one grid cell, crossfade); 0.2s dead gap between the fades (out 1.0–1.4, in 1.6–2.0); the dark chip → small mono label; svg caps stack-aware; height-gate PASS (≤0.017%); VLM: zero crossings, one statement at a time |
| H5 | one vertical rhythm ladder + `[nn]` indices | **done** | `22a4aab2` — the pr/wy/rl trio 4rem→8rem (measured gaps 33/33/33→67/67/67 = the st/pm rung), the closer 12/8rem, contain-intrinsic re-fitted (the r325 seat ran +69 stale), [09]→[08]; height-gate back to green after the re-fit |
| H6 | the hollow closing word + footer | **done** | `af7ab768` — verified COMPLETE at 1440/1920/768/390/320 (the S-era «cut» was the consent banner over the legal row — dead with the H1 reserve); images: square aspect-true windows, ONE unified line treatment |
| H7 | homepage acceptance: 3 reviewers ≥ 9 + CLS < 0.02 | **round 1 done — 3/4 sets ≥ 9** | `0c166080`+this — R3 d-dark 9 · m-dark 9 (pixel-verified fixes D1 rules 2.20→2.92:1 via shared tokens, D2 zero raw-orange text, D3 doubled fold rule dead); R2 d-light 9 (halo + margin-rules fixes verified); R2 m-light 8→ the two named fixes landed LIVE + captured (byte-sizes changed — R2's own test) — **final 9 confirm = next pass's first action**. WebKit env-blocked (no system libs, no sudo) — CI owns it. CLS 0.0159 ✓. **FIRST CAPTURE ROUND WAS INVALID**: Lenis raced the probes (scrollTo(0) snaps back to ~1800px in 700ms) — fixed with the window.__mdrkLenis seam; all frames re-captured at target==settled |
| T | one scroll contract (Lenis + GSAP once) + `motion.md` index + 60fps throttled | **pending** | — |
| P | every page: critique → subtract → arrange → contrast/states → polish → panel | **pending** | — |
| N | `gate:clean` to ZERO base (kill the 76/179 R326 overrides), dead assets, naming | **pending** | — |
| C | Expo parity via `shared/design-tokens.json` (RN-web 390/360) | **pending** | — |
| Q | `REPORT.md` + before/after film + next-3 HANDOFF | **pending** | — |

## S findings ledger (all confirmed on the live local stack)

The user's 8 (re-verified, with my measured numbers):

1. **Consent bar covers the UI in every frame** — desktop `.cb-banner` = 601×38 at
   **left:0, bottom:0** (flush to the viewport corner, NOT the sheet grid; the
   reference seats it in the corner of the grid); mobile = full-width 390×48.
   It intersects the hero work-marquee band (832–869) at 862–900 → the marquee
   row is partly behind it, and it overlays the footer's last rows at 100%.
2. **Desktop hero @1440×900** — art band 0–747 (svg 148–653), content band
   747–887: title 768–866, lead 768–819, CTA 769–817 (x 24–212), marquee
   832–869. Only 21px under the title, 31px under the marquee — the cookie bar
   (862–900) covers the strip; `[01]`/`[06]` are additionally dissolved by the
   64px mask fade (landing.css ~L996) — «نصفه شفاف» = the mask, not opacity.
3. **Phone hero @390×844** — `.fo-hero` phone has NO svh min (rows auto auto) +
   `.bp-stage` min-block-size 33rem (~524px) + stacked content ⇒ hero ≈1100px ≫
   fold; wide ink inside the tall stage leaves the dead paper band; lead wraps
   to ~238px (7 lines); CTA lands at the fold edge behind the bar.
4. **Pinned chapters (desktop)** — the phase title sits directly ON the wall
   lines (VLM frames 024/040: text crosses the black walls mid-fade);
   transitions pass through «double semi-visible» frames; the black «مقدمة»
   slab repeats every frame bottom-corner.
5. **Pinned chapters (phone)** — frame 032: `[01/05]` half-hidden behind a
   translucent overlay; the plan is cropped hard at both sides; ~60% dead
   whitespace above/below the drawing (VLM).
6. **Page end** — the hollow word's tail glyphs clip at the frame bottom on
   desktop (frame 100); footer otherwise complete; images consistent.
7. **Rhythm** — sections butt at gap 0 but internal block padding varies
   wildly (731/743/6272/710/564/887/698 px) — no single ladder.
8. **`gate:clean` overrides** — R326 pinned 76/179 seats; not re-verified this
   session (N owns the reset to zero).

My additions (S-A…S-G):

- **S-A** Consent banner desktop is flush `left:0` — even the reference's own
  measured geometry (601×38 bottom-LEFT on LTR) seats INSIDE the sheet corner,
  ours ignores the 7px frame inset entirely.
- **S-B** The hero hint «اسحب فوق الرسم لكشف محطات الفحص» = 13px
  rgb(112,112,106) on paper — sub-4.5 contrast (H2 demands ≥12px AND ≥4.5).
- **S-C** Phone marquee: the same 40px edge mask + `overflow:hidden` crops the
  six-indicator row mid-word on 390 (H3 wants a snap strip, no crop).
- **S-D** Dark theme: the elevation's tree lines render too faint on the night
  paper (VLM flagged); recheck every landing SVG weight in dark.
- **S-E** **Theme-forcing gotcha (extends R327 Z10):** `madarek-theme` is a
  zustand persist JSON — `localStorage['madarek-theme']='dark'` (bare string)
  FAILS JSON.parse → silently LIGHT. Force with
  `JSON.stringify({state:{mode:'dark',modeUpdatedAt:Date.now()},version:2})`.
  `mdrk-theme-profile` is the pre-paint cache (auth'd profile wins after `me`).
- **S-F** Sections' internal `[nn]` indices exist in some bands but not all;
   the statement/product/why/roles/cta bands each re-derive their own head
   anatomy (H5 will unify).
- **S-G** The `.et-tab` edge rail (h=175 desktop / 0 mobile) rides the left
   edge mid-page — verify it never collides with content at 1024 (H5 sweep).

## Environment (verified this session)

```bash
# stack: embedded PG :5433 (node scripts/r319/local-db.mjs start — SURVIVES
# command exit via pg_ctl daemonise; dev-full.mjs does NOT survive: it
# self-tears-down when orphaned) + detached pieces:
#   api:  cd madarek && DOTENV_CONFIG_PATH=backend/.env.local PORT=4000 npm run dev -w backend
#   web:  cd madarek/frontend && npx vite --port 3000 --host 0.0.0.0
# (sandbox reaps processes at command end; the double-fork pattern
#  bash -c 'setsid nohup CMD </dev/null >log 2>&1 &' SURVIVES — verified)
# playwright: chromium+webkit installed (npx playwright install chromium webkit)
# screenshots: docs/redesign/r328/shots/…  · VLM reads: z-ai vision -p … -i …
```

Test logins `*@test.ly` / `12345678` (seeded locally). Never run root
`npm run build`. Mobile gates stay in `apps/mobile`.

## Skills/tools actually used (logged as they fire)

- Playwright 1.60 (chromium) — S frames + geometry probes
- z-ai vision (VLM) — S frame reads (hero d/m, pinned ×4, end, dark pair)
- No webkit shots yet (installed; first fires in H7)

## Exact next 3 actions

1. **H7 close-out** — R2's m-light final confirm (the two named fixes are
   LIVE + captured with changed byte-sizes — one VLM pass on
   shots/H7/m-light-{075,100}.png settles the 9); then the wordmark face
   audit (R2 reads soft Tajawal-like terminals — check whether
   `wordmark-art.generated.ts` still rides Alexandria instead of the Plex 600
   the comments claim) and the m-025/m-050 near-blank statement-era frames
   (the phone pin's dead runway — needs the T-phase scrub-timing work).
2. **T — the scroll contract** — one Lenis+GSAP registration table
   (scripts/gsap are NOT in package.json — decide: adopt or keep the
   zero-dependency conductor), `docs/redesign/r328/motion.md` (name ·
   trigger · duration · curve · scrub? · fallback for EVERY animation,
   the 120/240/480/720 ladder decision incl. the consent card's 240ms),
   60fps CPU×4 trace, and the five canonical scroll films (Heron|Madarek).
3. **P — the page queue** (770-shot order): auth/register → student
   dashboard → courses → lecture → AI → exams → teacher → registrar →
   owner → settings → notifications → 404/500 → /app. Per page:
   critique → subtract → arrange → states/contrast → polish → panel ≥ 9.
   NOTE for every probe: use window.__mdrkLenis for offset shots; force
   dark via the zustand JSON ({state:{mode:'dark'},version:2}); accept
   `madarek.consent` before graded shots.
