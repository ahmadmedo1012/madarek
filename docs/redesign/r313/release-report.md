# R313 — Parity Closure · Release Report

**Round:** R313 «إغلاق التكافؤ» — make Madarek visually/behaviourally identical to heronaiapp.com
**Base:** `eb69c87041e77e6ecdd608bf18cf6400bb81c7cb` → **Head:** `9ef91a93` (24 commits, all on `main`, pushed)
**Reference:** heronaiapp.com live census (`audits/evidence/r313/reference/`) · **Baseline:** madarek.onrender.com @ base (`audits/evidence/r313/baseline/`) · **After:** local build census (`audits/evidence/r313/after/`)

## 1 — Result (5 lines)

1. The design system is now the Heron grammar end-to-end: warm paper `#F6F6EE`, radius 0, zero decorative shadows, fluid rem root (`0.5787037037vw` + Webflow bands), Geist Mono voice, hairline `#B3B3AF`/`#E0E0DA`.
2. The landing is Heron's 9-section composition (hero→intro→problem→map 51%→platform→why→usecase→cta→footer; main content 12,475px vs reference 12,355px — within 1%), with the extra material moved to `/campus` + `/capabilities`.
3. Behaviour matches: Lenis 1.1.5 (lerp 0.1, conductor-driven, guest-only, scrollbar hidden), asset-gated loader (10 log lines, 835–884ms two-band exit that actually plays), the reference's 1.6s two-phase route transition (cover ~900ms + sequenced reveal ~700ms), header 56px/7px-inset with on-scroll/on-hide, square plus-mark inspection stations.
4. Every gate is green locally: lint 0 errors · typecheck · 1,783/1,783 unit · build · bundle 695.7KB gz · parity-export 200 checks · colors/motion/raw-css/icons/csp · e2e 102 passed + 6 skipped (prod-gated) with the two documented local-load flakes re-verified green in isolation · r305 belt 73/73.
5. Two external incidents mar the release: the GitHub PAT pasted in chat (must be revoked) and an external actor that locked then rotated the public demo-account passwords on production (blocks live role-login verification; owner action required).

## 2 — D1–D17 status

| # | Area | Status | Commit(s) | Evidence |
|---|------|--------|-----------|----------|
| D1 | Paper `#F6F6EE` | ✅ closed | `02a9f1f5` | after/primary bodyBg `rgb(246,246,238)`; print lock, theme-color, boot plate, OG (deferral note: `NOTES-OG.md`) |
| D2 | Radius 0 | ✅ closed | `02a9f1f5` + sweeps | violations 126→12 (all `--r-full` circles: 3 dots + 2 avatars + 3 stations→squared in `9ef91a93`) |
| D3 | No shadows | ✅ closed | `02a9f1f5` + sweeps | 6→1 (the theme-toggle active hairline ring — a 1px inset border, documented) |
| D4 | Button grammar | ✅ closed | `64d8f21a` | fill-wipe + dual-label roll, primary #FA3600/white, secondary #282828+`#B3B3AF` thread; white-on-accent AA exception documented (Arabic labels ≥600 weight) |
| D5 | Fluid type | ✅ closed | `02a9f1f5` | root 8.333px@1440 → 5.926@1024 → 9.924@390 (measured after); 13px Arabic floor kept as `max()` |
| D6 | Lenis | ✅ closed | `fe528f3a` + `9ef91a93` (lock fix) | window-Lenis, lerp 0.1, conductor clock, `data-lenis-on` scrollbar hiding, RM never inits, `.content` native; scroll-lock now stops the engine |
| D7 | Landing structure | ✅ closed | `f93a2fea`+`3af33d01` | 9 sections, map 48.8–51%, heights table in after/; funnel pins 5+5 verified (landing-funnel 11/11) |
| D8 | Header | ✅ closed | `b5f8250b`+`4366b542` | 56px fixed @7px inset, 4 seats + 2 dropdowns, on-scroll/on-hide, roll hovers, <992px MENU overlay |
| D9 | Page frame | ✅ closed | `f93a2fea`+`5b056933` | 7px inset hairline + corner plus marks + hero rulers at all breakpoints |
| D10 | Loader | ✅ closed | `9616dfb6`+`4366b542` | asset-gated curve (7%@618ms→100%@3650ms local; network-bound by design), 10 honest Arabic log lines, exit 884ms two-band split (the 21ms bug fixed), replays every full load, no replay on route nav |
| D11 | Route transition | ✅ closed | `9ef91a93` | measured live: cover ~900ms → reveal ~700ms sequenced via `--gr-delay` = 1.6s total (reference: 142→897→1616ms); capture-phase listener (React preventDefault race fixed); never blocks navigation |
| D12 | Cursor | ✅ closed | `9ef91a93` (stations) | canvas 1440×900 z250, ~13px square #FA3600 (reference ≈10px — minor size delta noted), reticle present, hero-zone suppression, no canvas on touch |
| D13 | Choreography | ✅ closed | `f93a2fea`+`4366b542` | ScrubReveal intro, WhyScene plateau stages, PainArt draw-in cards, ink-mask retained from R308 family |
| D14 | Footer | ✅ closed | `18fd8a23` | 3 columns, lens params verified, honest subscribe state (no fake submissions) |
| D15 | Cookie banner | ✅ intentional omission | `NOTES-D15.md` | Madarek sets no tracking cookies — a consent banner would be dishonest theatre (owner order permits omission) |
| D16 | All app surfaces | ✅ closed | `64d8f21a..83bcd9f3`, `686c261b..4cae9d31`, `52f2c1b8..ba8f3f44`, `9034d7a0..11cc316d` | per-family sweeps in worklog; surfaceSweep after: 12 radius (legit circles) / 1 shadow (hairline ring) |
| D17 | Dark theme | ✅ closed | `02a9f1f5` + family sweeps | #282828 ground kept, warm re-derivation, hairlines #4A4A48/#5C5C5A |

## 3 — Gate outputs (final local run @ 9ef91a93)

- `npm run lint` → **0 errors** (16 pre-existing warnings)
- `npm run typecheck` → **clean**
- `npm test` → **76 files / 1,783 tests passed**
- `npm run build -w frontend` → **built in 7.44s**; `check-bundle-size` → **PASS 695.7KB gz / entry 79.0KB / pdf 95.7KB**
- `node scripts/verify-parity-export.mjs` → **PASS 200 token checks, 0 retired values**
- `check-colors --strict` / `check-motion-tokens` / `check-raw-css --strict` / `check-icons` / `check-csp-hash` → **all PASS**
- `npm run test:e2e -w frontend` → **102 passed / 6 skipped (MADAREK_PROD_VERIFY-gated) / 0 failed** (two specs flaked once under local parallel load — the repo-documented D4-class mount flake; both green in isolation)
- `npm run test:r305 -w frontend` → **73 passed**

## 4 — Parity summary

- **Structural:** landing main content 12,475px vs reference 12,355px (±1%); section order/ids match the 9-slot map; map pin 48.8% (reference 51.0%).
- **Tokens:** paper, radius, shadows, hairlines, mono voice, fluid root — all verified live on the built app.
- **Behaviour:** loader curve/exit, 1.6s transition sequence, Lenis glide (tail ≈1,540ms both sides), header states, cursor system — measured live.
- **Honest mismatches that remain (documented, content-driven):** viewport height variance beyond 1440 (e.g. 390×844: 15,308 vs 11,441 — Madarek's Arabic content + journey camera occupy more vertical space; the 1024 spike was reduced 20,121→13,494 but stays over); cursor square 13px vs reference ≈10px; loader duration is asset-bound (faster on localhost, network-parity in production).

## 5 — Unavoidable exceptions

1. **BT Grotesk (proprietary)** — Alexandria / IBM Plex Sans Arabic remain for Arabic; Geist Mono (OFL) adopted for the technical voice. Permanent.
2. **Arabic glyph metrics** — no uppercase in Arabic; hierarchy via weight/size/spacing; Latin micro-labels (`[01]`, `X:…PX`) stay uppercase mono. Permanent.
3. **Honest-copy rules** — demo-data disclosures, real-UI tags, licence captions — unchanged by owner order.
4. **White-on-#FA3600 labels** — the reference ships it; contrast 3.5:1 is below AA for small text; Arabic labels on accent get weight ≥600 (documented in DESIGN.md §0).
5. **Cookie banner** — intentionally omitted (no tracking cookies; see `NOTES-D15.md`).
6. **Funnel pins** — 5 register CTAs + 5 login affordances + pinned section ids — preserved (hard contract).

## 6 — Evidence index

- Reference census: `audits/evidence/r313/reference/` (digest.json, NOTES.md, loader/buttons/lenis/route/cookie/surfaces telemetry, 7-viewport matrix, frames)
- Baseline census: `audits/evidence/r313/baseline/` (digest.json, NOTES.md)
- After census: `audits/evidence/r313/after/` (summary, styles/motion census, axe ×3 = 0 violations, perf LCP 544ms/CLS 0.007/TBT 27ms, pairs, RM run, dark run)
- Parity tables: `parity-table.md` (baseline: 3 match / 55 mismatch) · `parity-table-after.md` (naive string diff — see §4 for the honest read)
- Override ledger: `docs/redesign/r313/OVERRIDE-LEDGER.md` · STATE.md · NOTES-D15.md · NOTES-OG.md

## 7 — Not done / blocked (with reasons)

1. **Authenticated role-login verification (surface sweep + prod smoke)** — BLOCKED: an external attacker brute-forced the public demo accounts, then rotated their passwords (all logins now `INVALID_CREDENTIALS`; locks expired but credentials changed). **Owner action:** restore via `npm run db:rotate-password`/re-seed with production env on Render, rotate the seed password away from the public repo value, then re-run `npm run smoke` + the role surface sweep. Local authenticated surfaces were verified via the hermetic e2e mock suite (102 specs) instead.
2. **Production re-census** — the Render deploy of `9ef91a93` was in flight at report time; verify `buildId` on `/api/v1/health` then re-run the public census commands (documented in worklog).
3. **Surface-inventory baselines** (r305-shell PNGs) — deliberately NOT re-promoted mid-round; promote after the owner confirms the visual state (`npm run audit:baseline`).
4. **OG image ground** — no regenerable source; deferred (`NOTES-OG.md`).

## 8 — SECURITY (owner must act)

1. **The GitHub PAT was pasted in plaintext in the chat multiple times** — treat as compromised: revoke it (GitHub → Settings → Developer settings → Fine-grained tokens), review its recent use, and never paste tokens in chat again.
2. **Demo credentials compromised on production** — the seeded demo passwords are public in the repo; an external actor rotated them. Restore + rotate to non-public values.
