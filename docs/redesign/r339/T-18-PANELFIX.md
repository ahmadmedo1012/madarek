# T-18 — Landing panel fixes (r339) — FINAL

Branch `r339/t18`. A1 landed in b3f4c00e; this round re-verifies it, finishes
A2–A6 + gate rot on owned surfaces, and lands the prior session's unverified
working tree (which arrived broken — see B0).
## B0 — the uncommitted tree was broken (caught + fixed first)
- gen-why-wrap.mjs SYNTAX error (617/621): the prior session's color-gate
  comment edit dropped template-literal backticks — the generator could not
  load. Fixed; `node --check` OK.
- why.css: 20 UNTERMINATED `/*` comments (same edit): comments swallow to
  the next `*/` — the first ran to T05I-CAP-END, eating the ENTIRE
  generated caption block (5 bp var sets + capbar rules) at parse time.
  Both gates strip comments the same way, so it passed while silently
  re-breaking A1 at runtime. Fixed to the generator's emitted form
  (`value /* color-gate: allow — … */;`); census 145/145 balanced;
  regeneration byte-consistent.
## A1 — why-stage 75% regression (b3f4c00e) — RE-VERIFIED
- Evidence (@1440×900, 75% scroll): capbar live, caption top 72px (the
  ≥992 clamp clears the 63px on-scroll header; spec y48 was measured
  under the reference's slimmer chrome); carousel chrome all present
  (progress + player cluster + map); cards at the staircase seats (t
  −145/373/891 — fold-crossing is the pinned design); 5 stage-2 minis
  at the committed spec seats, none stray. Screenshot
  /home/z/t18-final/a1-why75.png; vision pass flagged only the
  fold-crossing (expected mid-scroll).
## A2 — 390 voids (problem + pre-footer) — VERIFIED CLEAN
- Prior fix holds. @390×844 (fixed chrome excluded): painted spans
  merge into 1 contiguous span over the full 12402px document; gaps
  >250px: NONE.
## A3 — 390 hero safe-area + [01]–[03] indices — VERIFIED
- Indices [01] x354–383, [02] x180–209, [03] x30–59 — all numerals
  fully inside the 390 viewport, mono 9.92px (the measured fs-xxs
  scale), ink var(--text-faint). The crop beyond [03] is the authored
  `overflow:hidden` seat (hero-mechanics ≤991 band) — no mid-word
  numeral clipping. Screenshot a3-hero390.png.
## A4 — consent toast — VERIFIED
- @390: .cb-banner fixed z240, x7–327 × y753–837; hero CTA y597–645 →
  no overlap; .cb-accept removes the banner (verified true).
## A5 — CTA hover contrast — FIXED (cta.css), VERIFIED
- Cause: the hover seat kept the frozen rest wash #FA3600 (white label
  3.76:1 — AA fail). Fix: hover (+ .probe-hover) deepens the wash to
  var(--accent-ink); recorded transitions untouched (the chevron slide
  carries the motion); light + dark both (dark ember ink --warm-ink
  5.6:1 unaffected). Evidence: hover bg rgb(199,46,0) vs white label =
  5.5:1 ≥ 4.5:1 (rest wash rgb(250,54,0) preserved).
## A6 — ScrollRule — LANDED (new chrome + sheet, mounted)
- scroll-rule.css (new): 1px accent pair at 50vh spanning the frame's
  7px inset; scroll-driven split (top −387.5px / bottom +310.5px, the
  r335 band-exit flights) over the first 50% of root scroll on
  var(--motion-ease-band-exit); mono % readout 18px above at x33.
  Zero JS ticks, zero durations, composited props only; no-timeline
  engines render nothing (base opacity 0).
- ScrollRule.tsx (new) + LandingPage mount: under the nav (z45),
  aria-hidden, pointer-events none; matchMedia RM guard never mounts
  it under prefers-reduced-motion (+ CSS belt).
- Evidence (@1440×900): rule y450/h1/x7–1433; easing computed
  cubic-bezier(1,0,0.44,1) (token resolves on the landing sheet);
  readout 0%→25% live; at 60% scroll opacity 0 + translateY(−387.5);
  RM emulation: not mounted.
## B — gate rot on owned surfaces — FIXED; 2 out-of-scope for medic
- B-tokens (tokens.css +13, preloader.css): the r335 recorded exit
  curve + ground are canonical landing-resolvable tokens —
  --motion-ease-band-exit: cubic-bezier(1,0,0.44,1) and
  --preloader-exit-ground: #b3b3af (tokens.css :root; computed-style
  read on the landing sheet confirms both). Closes the r339 T-11c
  finding (unified-parity --motion-ease-band fell back to `all 0s
  ease` there) — preloader's raw beziers retired onto the token.
- cta.css: rgb(40,40,40) seats → var(--text) (byte-equal light ink,
  now theme-following). hero-mechanics.css: --hro-ink-72 →
  color-mix(var(--text) 72%); --hro-flare → var(--accent); --hro-paper
  keeps frozen white with a same-line allow (no stable-white token
  exists). hero.css: allow comments moved onto the value lines (the
  gate reads same-line markers; the old line-above form never
  suppressed). why.css: 20 generated caption seats carry same-line
  allow comments (via the generator, so regeneration keeps them).
- Gates: check-motion-tokens.sh — owned surfaces PASS;
  check-colors.sh --strict — same (87 allow-suppressed lines).
  Out-of-scope (medic): 1) patterns.css:104 — `animation:
  fo-ticker-rtl 36s linear infinite` (T-14's lp-marquee): raw 36s +
  raw `linear`; exit: --motion-duration-ambient-* + --ease-linear.
  2) journey.css:175 — --jt-ink: rgb(40 40 40 / 72%) raw token
  definition; exit: color-mix(in srgb, var(--text) 72%, transparent).
## Gates / conformance / bundle
- verify.sh --fast: FAST PASS — 3051 tests; bundle 765.4 KB gz ≤ 770.
- Scoped conformance (why + cta): why 89/89/91/89/88 · cta 94/94/95/92/90
  (1920→390) — TOTAL 90.9%, edge390 fails 0. First honest scoped number
  ON THIS BRANCH (prior artifacts are cross-worktree); cta identical to
  the wt-t14 full-run baseline. Clamp cost measured: 89.0 (off) vs 89.1
  (on) @1440 — the ~2pt why delta vs pre-A1 runs is the committed A1
  fix's known cost (b3f4c00e), not this round's changes. Ratchet file
  untouched; results.json (last-writer-wins) restored to HEAD.
- Scratch probes (frontend/t18-*.mjs) deleted; evidence in /home/z/t18-final/.
