# R313 — Madarek Production Baseline (BEFORE snapshot)

- **Captured:** 2026-10-22/23 UTC · production `https://madarek.onrender.com/`
- **Deployed build:** main @ `eb69c870` (buildId `7d3326439e69` per lead recon)
- **Harness:** frozen `audits/evidence/r313/census.mjs` v2 + own probes (`telemetry.mjs`, `loader-probe.mjs`, `loader-diag.mjs`, `transition-probe.mjs`, `login-diag.mjs`) — all in this directory.
- **Legend:** every claim below cites its evidence file *in this directory* unless prefixed.

> D-numbering note: the R313 divergence ledger (D1–D17) was not yet published in
> `docs/redesign/r313/` at capture time; the items below are numbered to cover the
> full topic list from the work package (paper, radius, shadow, loader, loader-exit,
> transition, scroll, type ladder, fonts, section map, header, buttons, rem, cursor,
> viewport matrix, login reality, misc), each with today's measured production truth.

---

## D1 — Paper / ground color

- `body` bg **`rgb(246, 248, 250)` = `#F6F8FA`**, `html` bg same, `<meta name="theme-color">` = **`#F6F8FA`** — the pinned token `--bg #F6F8FA`, NOT the reference's measured `#F6F6EE` (r305/r308 finding still true in production).
- Evidence: `primary/meta.json` (`bodyBg`, `htmlBg`, `themeColor`), `telemetry.json` → `confirmations.themeColorMeta`, `confirmations.bodyBg`.
- Reference delta: ground is 6×-pinned in code (tokens.css, index.html, assets.test, verify-parity-export, SheetCursor fallback, lib/theme.ts) — the R313 paper override must touch all pins.

## D2 — Radius policy (landing)

- Token ladder in force: 2/4/6/8/12/16/20/pill. Landing **surfaceSweep: 1966 sampled → 126 with non-zero radius (6.4%)** — `primary/styles.json` → `surfaceSweep`.
- Computed distribution over sampled records (`primary/styles.json`): `0px` ×172, `2px` ×26, `6px` ×9, `4px` ×6, `9999px` (pill) ×6, `50%` ×2.
- Reference (3-a, from lead's Heron census): 2774 sampled → 4 non-zero. **Madarek is ~30× more rounded than the reference today.**
- Subpath sweeps: `/colleges` 592/24 radius, 7 shadow; `/auth` 71/11; `/auth/register` 76/13 (`post/*/styles.json`).

## D3 — Shadow policy (landing)

- **surfaceSweep: 6 elements with non-none box-shadow** (`primary/styles.json`). Observed shadows: accent glow `0 4px 12px rgba(250,54,0,.16)` (CTA et al. ×8 in records), inset ring `0 0 0 1px rgb(200,200,200)` ×2; 211 records `none`.
- Reference: 1 shadowed element. Madarek keeps its elev ladder in the app shell (roles below).

## D4 — Loader timeline (SheetLoader `.sl`, session-gated)

- Gating: `sessionStorage['madarek-intro-seen']` — fresh context plays it once; pre-seeding the key skips it entirely (verified both ways). `telemetry.json` → `confirmations.introSeenSession`, `loader-probe.json`.
- Measured timeline (`loader-probe.json`, t=0 = nav commit; `.sl` mounts at **t≈1603 ms** after JS load):
  - counter 0→100 % rides the choreographed ramp: **100 % at ≈4 992 ms after mount** (PROGRESS_MS 5000 ✓), eased `displayed` under a linear target (PROGRESS_EASE 0.085)
  - log: **5 lines** (`001 تهيئة لوحة الرسم` … `005 جاهز — مدارك`), lit progressively at 0/25/50/75/100 % checkpoints (DOM sampler confirms max 5)
  - orange band `scaleX(0→1)`, scan-line sweep animation `sl-scan` (5 450 ms), sheet frame + ruler cross + `X:Y` readout, skip button «تخطّي — SKIP» (Esc/Enter/Space)
  - hold at 100 %: **3 600 ms** (exit clip first frame at mount+8 600 ms = 5000+3600 exactly)
- Visual corroboration: `primary/loader/l00–l19.jpg` (20 × 450 ms) — e.g. l04 shows counter ~32 % + 2 lit log lines + staged linework; `loader-probe-early.jpg` / `loader-probe-mid.jpg`.

## D5 — Loader EXIT is CUT SHORT in production (new finding)

- Designed exit: 650 ms center-out two-band clip-path split (EXIT_MS, `sl-main` polygon animation).
- **Measured: the `.sl` element detaches ~15–21 ms after the exit animation starts** — the animation never visibly plays; the sheet vanishes as a hard cut.
- Evidence: `loader-probe.json` (exit clip first computed at t=10 203, `present:false` at t=10 224 — 21 ms later); `loader-diag.json` + `loader-diag.mjs` console (animation `running` at t=9855, element gone at t=9870; `landing` class flips `intro-draw → intro-done` at the same frame).
- Mechanism (code-read, `SheetLoader.tsx` + `LandingPage.tsx`): the gate effect has deps `[onDone]`, and `onDone`/`onExitStart` are inline arrows — when `finish()` fires `onExitStart → setIntroDone(true)`, the parent re-render hands the loader a NEW `onDone`, the gate effect re-runs, sees the intro already marked seen and calls `onDone()` immediately → unmount → the exit animation is cancelled with the element.
- Net loader visibility: **≈8 621 ms mount→detach** (5 000 ramp + 3 600 hold + ~20 ms) vs the documented ≈9 250 ms. (R309/R312's "8.8 s" measurement matches the SHORT exit — the 650 ms split was never actually observable.)

## D6 — Guest route transition ( / → /colleges )

- Two concurrent overlays start at route commit (`transition-probe.json`):
  - **landing-exit sweep `.sx`**: center-out two-band polygon clip, **observed 721 ms** (designed SWEEP_MS 700) + 1 px architectural line spike at midpoint; overlay removed at click+927 ms.
  - **GuestReveal** on the incoming route: top-down `inset()` clip sweep, token duration **0.5 s** (`--motion-duration-long` = `--t-slow` 500 ms, decelerate easing; 70 % keyframe crosses the fold), plus a fixed traveling 1 px rule.
- click → URL change: **206 ms**; total perceived (click → all overlays gone): **≈927 ms**. Reference: ≈1.6 s two-phase mask sweep (r308 §14) — Madarek is faster by design (R308 funnel lesson), and the two layers overlap instead of sequencing.
- `transition-after-colleges.jpg` shows the settled /colleges page.

## D7 — Scroll engine

- **Native window scrolling** (`scroller.type = "window"` at all 7 viewports; no Lenis/GSAP/Barba globals; `lenisEls: 0`). `html { scroll-behavior: smooth }` (CSS).
- Wheel probe (`primary/probe-scroll.json`): 3 × 240 px CDP wheel impulses land stepwise **240 → 480 → 720 px with no smoothing tail** — final 720 px reached at t≈264 ms and stays flat for the remaining ~2.7 s (**probeTailMs ≈ 0**, no post-impulse glide).
- Reference uses Lenis+ScrollTrigger wrapper (`.main-inner.lenis`); Madarek's §7.1 A/B (no user-facing gap) still stands as the current state.

## D8 — Typography ladder (13 px floor)

- root font-size **16 px at every viewport** (no fluid rem; 1440/1280/1024/768/390/360 all `16px`) — `viewports/*/meta.json`, `telemetry.json`.
- Landing computed (from `primary/styles.json`):
  - h1 (`.fo-hero-title`): **Alexandria 700, 64 px / 81.92 px**, `#282828`
  - h2 (section titles): **Alexandria 700, 48 px / 61.44 px**, `#282828`; hero statement 38 px/600; video card titles 18 px/700
  - body: **IBM Plex Sans Arabic 400, 16 px / 26.4–27.2 px**, `rgb(65,65,64)` (#414140)
  - eyebrow/meta: IBM Plex Sans Arabic 600, **13 px / 21.45 px**, `rgb(98,98,96)`
  - micro-mono (`.fo-mono`): **IBM Plex Mono 400, 13 px / 21.45 px**, `rgb(114,114,111)`; accents `#C72E00`; `+` sheet marks 13 px/13 px `#B4B4B0`
- **13 px floor confirmed** — nothing below 13 px in any sampled record.

## D9 — Fonts (no BT Grotesk / Geist)

- Live `document.fonts` (`primary/styles.json` → fonts): **IBM Plex Sans Arabic 400/500/600/700, IBM Plex Mono 400/500, Alexandria 600/700** (8 faces; RTL Arabic-first stack + `Tajawal` fallback in the family chain).
- Reference: BT Grotesk 400–700 + Geist Mono (deliberate §G non-adoption — current state unchanged).

## D10 — Landing section map (1440×900, totalHeight 16 280 px)

| n | id / marker | cls | top | height | pct |
|---|---|---|---|---|---|
| 1 | hero (h1 «مدارك») | `.fo-hero` | 57 | 1 807 | 11.1 % |
| 2 | `#statement` | `.st-section` | 1 864 | 512 | 3.1 % |
| 3 | `#campus-life` | `.um-section` | 2 376 | 1 864 | 11.4 % |
| 4 | `#chapters` (journey, 480 dvh pin) | `.chapters` | 4 240 | 5 318 | 32.7 % |
| 5 | `#product` | `.pr-section` | 9 558 | 1 331 | 8.2 % |
| 6 | `#videos` | `.vd-section` | 10 889 | 824 | 5.1 % |
| 7 | `#live` | `.lv-section` | 11 713 | 758 | 4.7 % |
| 8 | `#roles` | `.rl-section` | 12 470 | 958 | 5.9 % |
| 9 | `#colleges` | `.cg-section` | 13 428 | 893 | 5.5 % |
| 10 | `#vision` | `.vs-section` | 14 321 | 637 | 3.9 % |
| 11 | `#cta` | `.fo-cta` | 14 958 | 651 | 4.0 % |
| 12 | footer | `.fo-footer` | 15 609 | 671 | 4.1 % |

- Pinned ids `statement/chapters/live/roles/colleges/vision` all present (r306 funnel contract) plus `campus-life/product/videos/cta` (11 semantic sections + hero inside `<main>`; a fixed `.sc-canvas` cursor canvas overlays at z 250).
- Reference (Heron, 3-a/lead): 9 sections, 12 355 px. Madarek is 12 sections / +3 925 px — the map is longer and more granular.

## D11 — Header behaviour (landing masthead)

- `.fo-header`, **sticky top, 57 px bounding (56 px inner + 1 px `--grid-line` border-bottom)**, z 60, backdrop-filter blur(10 px).
- At true top: class `fo-header`, bg `color-mix(--bg 82%, transparent)`; scrolled: adds **`scrolled`** → bg 95 % opaque. Transition: `background 0.5s cubic-bezier(.23,1,.32,1)` (`--t-slow --ease`).
- **No hide-on-scroll / no show-on-scroll-up** — transform `none`, opacity 1 in every state (no `on-hide`/`on-scroll` classes like the reference). Evidence: `telemetry.json` → `headerStates` (atTop/scrolledDown1/scrolledDown2/scrolledUp/backToTop).
- App shell headers (roles) are separate (see `roles/*/primary/meta.json` → `headerInfo`).

## D12 — Buttons / primary CTA

- Landing primary CTA `a.btn.accent.lg.fo-hero-cta` «أنشئ حسابك الجامعي» (→ `/auth/register`), 212×48 px:
  - default: bg **`#FA3600`**, color `#191918` (warm ink), radius **6 px** (`--r-md`), IBM Plex Sans Arabic 600 **16 px**, shadow `0 4px 12px rgba(250,54,0,.16)`, border 1 px accent
  - hover: bg brightens (oklab(0.69 .169 .111) — toward white), shadow `0 8px 16px rgba(250,54,0,.18)`, **translateY(-1 px)** (transform 0.08 s), transitions on `--t-base` 0.2 s
  - Evidence: `telemetry.json` → `buttons[0]` (default/hover/::before).
- Header pair: `.btn.primary.sm` «ابدأ الآن» (bg `#282828`, ink `#F6F8FA`, 13 px/600, radius 4 px) + `.btn.ghost.sm` «تسجيل الدخول»; ghost buttons transparent w/ 1 px border (`primary/styles.json` button records).

## D13 — REM / responsive ladder

- rootFontSize 16 px at 1440/1280/1024/768/390/360 (no fluid rem — §G non-adoption holds). Section heights change across the matrix (see D15) via CSS media queries, not rem scaling.

## D14 — Cursor layers

- Landing `/`: single `SheetCursor` canvas `.sc-canvas` (fixed, 1 440×900, z 250, `cursor: none`), app-level `.cursor-layer` count **0** (R311 D1 fix holding in production — `telemetry.json` → confirmations).
- `/colleges`: the app-level CursorManager layer IS present (`post/colleges/meta.json` sections list `cursor-layer` 900 px) — correct per-route ownership.
- `data-cursor="none"` vocabulary on `.sl` loader and `.bp-stage`.

## D15 — Viewport height matrix (landing)

| viewport | totalHeight | rootFontSize | sections |
|---|---|---|---|
| 1440×900 | 16 280 | 16 px | 14 |
| 1440×700 | 15 428 | 16 px | 14 |
| 1280×800 | 15 908 | 16 px | 14 |
| 1024×768 | **20 121** | 16 px | 14 |
| 768×1024 | 15 887 | 16 px | 14 |
| 390×844 | 16 724 | 16 px | 14 |
| 360×800 | 17 110 | 16 px | 14 |

(14 = 12 semantic sections + `<main>` + `.sc-canvas` child rows; scroller = window everywhere. The 1024×768 tall-jump is the tablet reflow.) Evidence: `viewports/*/meta.json`, `summary.json`.

## D16 — Login reality (production auth)

- Demo login POST endpoint: `POST /api/v1/auth/login` (NOT `/api/auth/*`). Login form at `/auth` (`#auth-email` text input, `input[type=password]`, `button[type=submit]`); success persists a zustand store to `localStorage['mdrk-auth']` and routes to `ROLE_HOME[role]`.
- **`student@demo.madarek.ly` was ACCOUNT-LOCKED at capture time** (≥5 failed logins by an external actor; per-user lockout = 5 failures / 15 min — `backend/src/modules/auth/lockout.ts`). Response: 423-family envelope «الحساب مقفل مؤقتاً — حاول مرة أخرى بعد قليل» shown in `.auth-error[role=alert]`. Evidence: `login-diag-student.jpg` (VLM-read), `login-diag-student.json`, `roles-student.log`.
- Auth limiter: 10 FAILED requests / 15 min / IP bucket (`skipSuccessfulRequests`), shared-edge-keyed on Render (r170c note) — successful logins are free; lockout responses DO count as failures.
- Role census outcomes: see `roles/*/` + digest (`loginOutcomes`).

## D17 — Misc / global state

- `<html lang="ar" dir="rtl">`; title «مدارك · منصّة التعليم الذكي»; 14 `<img>` on landing; no cookie banner (`primary/meta.json`).
- No Lenis / GSAP / Barba / Swiper globals anywhere (`lenis` block in every meta.json).
- Motion census (landing, `primary/motion.json`): 174 transition rules, 101 animation rules, 6 keyframe sets (`wake-pill-in`, `madarek-group-reveal`, `hi-pulse`, `fo-ticker-rtl`, `sl-scan`, `vs-tag-snap`); durations ride `--motion-duration-*` tokens.
- /colleges: 2 689 px, 3 `college-city-section` blocks; /auth + /auth/register: single 900 px guest sheets (`post/*/meta.json`).

---

## Role dashboards (STEP 2 evidence)

See `roles/<role>/primary/meta.json` (+ `styles.json`, `motion.json`, `frames/`, `full*.jpg`) and `roles/<role>/post/*/…` for the key subpaths. Summary table in `digest.json` → `surfaceSweepPerRole` and `loginOutcomes`.

---

## Role census results (3-b-resume, 2026-10-23 00:04–00:22 UTC)

**ALL FIVE role logins FAILED — every demo account is locked by an external brute-force actor.**
Per-role outcome (login POSTs this session: 6/6 budget consumed, 0 successes):

| role | census runs (UTC) | result | surfaceSweep captured |
|---|---|---|---|
| student | 23:41 (3-b, prev agent) | **FAILED** — account locked (lock alert VLM-confirmed twice, see below) | 71 / 11 / 2 (= /auth page) |
| teacher | 00:07 + 00:12 retry | **FAILED** — `ACCOUNT_LOCKED` **confirmed via direct API probe** | 71 / 11 / 2 (= /auth page) |
| quality | 00:15 | **FAILED** — identical /auth-redirect signature | 71 / 11 / 2 (= /auth page) |
| admin | 00:19 | **FAILED** — identical /auth-redirect signature | 71 / 11 / 2 (= /auth page) |
| owner | 00:21 | **FAILED** — identical /auth-redirect signature | 71 / 11 / 2 (= /auth page) |

- Because no token landed, every `roles/<role>/` capture (primary + both posts) is the **`/auth` login page** (900 px, 2 sections: `.guest-reveal` + `.auth-bottom`), NOT the role dashboard. The `surfaceSweepPerRole` numbers in `digest.json` are therefore the /auth guest sheet's sweep (identical to `post/auth`), kept for record + clearly flagged in `loginOutcomes`.
- **Teacher lock proof** (only direct API observation of the session): `POST /api/v1/auth/login` with `teacher@demo.madarek.ly:Madarek2026!` → **HTTP 429 in 0.45 s**, body `{"error":{"code":"TOO_MANY_REQUESTS","message":"الحساب مقفل مؤقتاً — حاول مرة أخرى بعد قليل"}}` — the per-user ACCOUNT_LOCKED path (`auth.service.ts` L397–410), NOT the IP limiter (which answers «محاولات دخول كثيرة…»), and NOT a cold start (server verified warm: `GET /api/v1/health` 200 in 0.6 s).
- Lock mechanics (read from `backend/src/modules/auth/lockout.ts` + `auth.service.ts`): 5 failed logins / 15 min per USER → `lockedUntil`; attempts against a locked account short-circuit (429) **without extending the lock**; a successful login resets the counter.
- **Student lock re-verified**: independent VLM read of `login-diag-student.jpg` confirms the lock alert «الحساب مقفل مؤقتاً — حاول مرة أخرى بعد قليل» with the form still displayed → D16 stands. Correction: `login-diag-student.json`'s `token: true` is a **false positive** — zustand `persist` writes the `mdrk-auth` key with an empty session on store init, so key-presence ≠ authenticated; the login itself failed.
- Attribution: demo emails + password are public in `backend/prisma/seed.ts` on GitHub; an external actor brute-forced the demo list (student locked by 23:43, teacher by 00:07, quality/admin/owner by 00:15–00:21). This session contributed at most 4 failed POSTs (2 of them teacher) and never exceeded the 10-failed/15-min/IP auth limiter.
- Failed-attempt metadata archived: `roles/student/_auth-redirect-attempt/` and `roles/teacher/_auth-redirect-attempt/` (meta + styles + summary of the /auth captures).
- **Next action (future session, fresh budget):** the locks auto-expire 15 min after the actor's last failed attempt — wait for quiet, then re-run the four census commands verbatim (teacher → quality → admin → owner, 70 s apart). Durable fix (platform side): rotate demo passwords or shield demo accounts from lockout.

## Completion

- Landing (guest) baseline **complete and rich**: primary @1440×900 + 7-viewport matrix + /colleges + /auth + /auth/register + loader/transition/scroll probes — D1–D17 above all evidence-backed.
- `digest.json` written (site paper, pageHeight matrix, 14-row section map with pct, header, typography records, CTA default/hover, radius/shadow violation counts, loader timeline incl. the D5 short-exit anomaly, route transition, scroll probe, per-role sweeps + loginOutcomes, fonts).
- Role dashboards **NOT captured** (external lockout — see above); the /auth-redirect captures are preserved as failure evidence. Evidence tree 22 MB (< 30 MB budget).
- 3-b (original) died mid-work after the landing census + student attempt; **3-b-resume** finished the remaining role census attempts, diagnosis, digest, and this log. Repo source untouched; `census.mjs` untouched; nothing committed.
