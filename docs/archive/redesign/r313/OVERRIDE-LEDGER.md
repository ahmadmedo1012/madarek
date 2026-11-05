# R313 — Override Ledger (D1–D17)

**The authority.** In round R313 the owner ordered full visual and behavioural
identity with `heronaiapp.com`. This ledger records, per divergence item, the
pre-R313 state, the R313 canon, the commit(s) that shipped it, and the measured
evidence. It supersedes every prior adaptation decision (r306 «adapted, not
copied»; r308 §G/§H non-adoptions). It does **not** touch the hard contracts:
a11y, honest copy, CSP, the funnel pins (5 register CTAs + 5 logins + the pinned
section ids), and the no-proprietary-assets rule.

- **Round state:** [`STATE.md`](STATE.md) · **D15 rationale:** [`NOTES-D15.md`](NOTES-D15.md) ·
  **OG deferral:** [`NOTES-OG.md`](NOTES-OG.md)
- **Canon prose:** `DESIGN.md` §0 (the override ledger in one line per item) ·
  agent contract note: `AGENTS.md` §5.4 · r308 history annotated:
  [`../r308/parity-matrix.md`](../r308/parity-matrix.md) §G/§H
- **Measured basis:** `audits/evidence/r313/` — reference (live Heron census,
  `reference/digest.json` + `reference/NOTES.md`), baseline (production @
  `eb69c870`, `baseline/digest.json` + `baseline/NOTES.md`), and
  `parity-table.md` (3 match / 55 mismatch at base). Evidence paths below are
  relative to `audits/evidence/r313/`.

## The ledger

| Item | Old (pre-R313) | New (R313 canon) | Commit(s) | Evidence |
|---|---|---|---|---|
| **D1** paper | `#F6F8FA` pinned 6× (tokens.css ×3, index.html metas ×2, theme-color, assets.test, parity gate, SheetCursor fallback, theme.ts) | `#F6F6EE` at every seat — tokens, print lock, theme-color metas, boot plate, `syncThemeColor` + CSP re-pin, `theme.ts` CHROME_BG, SheetCursor plate, `validate-college-identity` | `02a9f1f5` | `reference/digest.json` → `paper`; `parity-table.md` D1; `baseline/NOTES.md` D1 |
| **D2** radius | ladder 2/4/6/8/12/16/20 + pill; landing sweep 126/1966 non-zero | policy **0** everywhere; `--r-full` kept for circles/dots (avatars, pings, check marks); reference's own exceptions mirrored (fallback cursor dot 50%, why-dots) | `02a9f1f5` (tokens) + the D16 re-skin sweeps below | `reference/digest.json` → `radius`; `parity-table.md` D2 |
| **D3** shadows | elev-1..5 charcoal-tinted; landing sweep 6/1966 | **none** — zero exceptions (focus rings + forced-colors outline fallbacks kept; skeleton shimmer token-based) | `02a9f1f5` (tokens) + the D16 re-skin sweeps below | `reference/digest.json` → `shadows`; `parity-table.md` D3 |
| **D4** buttons & inputs | oklab-brighten hover + `translateY(-1px)` + glow shadow, radius 6px, `--warm-ink` labels | **fill-wipe + dual-label roll** (±16.33px, icon slide), radius 0, transparent grounds; nav washes to ink `#282828`, CTAs fill `#FA3600`; **white-on-accent = documented AA exception** (Arabic labels ride weight ≥600); inputs 1px `#B3B3AF` → focus `#ED4C1F` → filled `#FA3600` (.45s), square, halo retired | `64d8f21a` (buttons) + `bd73a6b0` (inputs) | `reference/digest.json` → `buttons` (16 recipes) + `inputs`; `parity-table.md` D4 |
| **D5** type ladder & root | fixed `--fs-*` px ladder, root 16px at all viewports; IBM Plex Mono | **fluid rem root**: `html 0.5787037037vw` + bands ≤991px `1.1990407674vw` / ≤767px `2.5445292621vw`; ladder converted to rem with **13px Arabic floors** (`max()`); **Geist Mono** self-hosted 400/500 (OFL) first in `--font-mono` | `02a9f1f5` | `reference/digest.json` → `rootFontSize` + `typography`; `parity-table.md` D5 |
| **D6** scroll engine | native window scroll (§7.1 A/B), probe tail 0ms | **Lenis 1.1.5, guest routes only**: lerp 0.1, wheelMultiplier 1, syncTouch true, smoothTouch false, infinite false; conductor-driven (wake/sleep preserved, stale-clock snap guard); scrollbar hidden while live (`html[data-lenis-on]`); `.content` native scroller untouched; RM never inits | `fe528f3a` | `reference/digest.json` → `scroll` (params + probe tail 1540ms); `parity-table.md` D6 |
| **D7** landing sections | 12 sections / 16,280px @1440×900 (journey pin 32.7%); 1024×768 spikes to 20,121px | **9-section Heron map** (hero → statement → problem → map/journey pin ≈51% → platform → why → usecase → cta → footer), main content within ~1% of 12,355px; the documentary media band + capability ledger moved to the guest pages **/campus** + **/capabilities**; funnel anchors preserved | `5d30e9c4` + `f93a2fea` + `3af33d01` | `reference/digest.json` → `sections` + `pageHeight`; `parity-table.md` D7 |
| **D8** header | 57px sticky, backdrop-blur, no hide/show | **56px fixed at the 7px inset**, measured `on-scroll`/`on-hide` classes (latched `on-hide` at top), 4 nav seats + dropdowns, MENU button <992px; nav washes to ink, CTA fills `#FA3600` | `b5f8250b` (+ `18fd8a23` menu reconciliation) | `reference/digest.json` → `header`; `parity-table.md` D8 |
| **D9** page frame | partial `.sheet-frame` registration marks (desktop decorative), inset as authored | **full fixed page frame**: 1px `#B3B3AF` at the 7px inset (scales 6/7 by viewport), 10×10 plus marks, ruler strips, coordinate labels; never scrolls | `f93a2fea` + `3af33d01` | `reference/digest.json` → `frame` |
| **D10** loader | session-gated (`madarek-intro-seen`): 5s ramp + 3.6s hold, 5 log lines, exit **cut short ~21ms** (the D5-onDone remount race) | **asset-gated progress curve** (16% @0.44s → 100% @4.9s, honest to real load signals), **10 log lines**, **835ms two-band center-out exit that actually plays**, replayed on **every full load**; no replay on in-app transitions | `9616dfb6` | `reference/digest.json` → `loader`; `parity-table.md` D10 |
| **D11** route transition | 721ms `.sx` sweep + 500ms GuestReveal running concurrently (~927ms perceived) | **1.6s four-edge inset wipe** (path swap @~142ms, trans 0→50% by 897ms, mask opens → ~100% @1616ms, line spike at the 50% midpoint); GuestReveal folded in; no loader replay | `9616dfb6` | `reference/digest.json` → `routeTransition`; `parity-table.md` D11 |
| **D12** cursor | carried at parity since R310/R311 (one authoritative pointer per route) | **kept — no override needed** (square `#FA3600`, reticle `#FC724D`, suppressed in hero zone, none on touch); only the plate fallback re-pinned to the new paper | `02a9f1f5` (fallback only) | `reference/digest.json` → `cursor`; `parity-table.md` D12 |
| **D13** choreography | scrub/plateau choreography on the 12-section map | re-based onto the **new 9-section set**: scrub-linked reveals + hold plateaus ride the map/journey ≈51% pin; stage sizing tuned to the Heron section heights | `f93a2fea` + `3af33d01` (+ `4366b542` stage-sizing fix) | `reference/NOTES.md` (section map + motion); worklog 5-wave1-integration |
| **D14** footer | hairline colophon footer + lens strip | **3-column footer** (title + honest subscribe form / links + address / 215×215 line logo) + **inspection lens** r 99.09 / pulse 104.04, lerp .09/.15, in .55s / out .8s; honest subscribe state; «ما يعمل اليوم» reconciled → `/capabilities` | `18fd8a23` | `reference/digest.json` → `footer` |
| **D15** cookie banner | none (nothing to consent) | **intentionally omitted — permanent exception**: Madarek sets no tracking cookies (first-party auth session only); a consent banner would claim a cookie practice that does not exist — the honest-copy contract outranks visual parity | — (docs only) | `reference/digest.json` → `cookieBanner`; `parity-table.md` D15; [`NOTES-D15.md`](NOTES-D15.md) |
| **D16** app surfaces | authenticated surfaces on the radius ladder + elevations + tint rings + glow hovers (pre-R313 "before" = `audits/evidence/r305-shell/`) | **all surfaces re-skinned to the Heron grammar**: square chips/controls/pills, hairline row rules `#E0E0DA`, structural seams `#B3B3AF`, flat tiles (lift/glow/backdrop retired), circles via `--r-full`, mono headers weight 600, Heron input recipe, Geist Mono `dir=ltr` indices | WP-D `64d8f21a` `bd73a6b0` `f71bf198` `72d6d081` `83bcd9f3` · WP-E `686c261b` `2b996c2c` `2c334a4b` `23602ebf` `7d8974bd` `4cae9d31` · WP-F `52f2c1b8` `1030c59e` `775f4f2f` `65524e66` `ba8f3f44` · WP-G `9034d7a0` `c8054808` `2e526f01` `7c2ae6d0` `31bde737` `813acc97` `5b056933` (+ `11cc316d` pin re-pin) | `reference/digest.json` (buttons/inputs grammar); `baseline/digest.json` → `surfaceSweepPerRole` (pre); worklog 5-e/5-f |
| **D17** dark theme | dark block inherited the elev ladder (shadows de-emphasized, not removed) | **re-derived from the R313 canon**: the shadow-removal policy is theme-wide; dark depth = surface step + hairline; dark hairlines kept `#4A4A48`/`#5C5C5A`; white-on-accent AA exception re-checked per theme | `02a9f1f5` | `02a9f1f5` tokens.css dark block; `reference/digest.json` → `palette` (light canon) |

## Wave-2 integration (cross-cutting fixes riding every row above)

| Commit | What it reconciled |
|---|---|
| `4366b542` | 8 e2e failures after wave 2 — landing menu close race (outside-tap vs the burger's own click), nav dedupe (dropped the duplicated `#chapters` child; «ما يعمل اليوم» moved to the mobile sub-index), hero `[LIVE]` ledger chip → `/capabilities`, stage sizing (`.bp-stage`/`.bp-panel` shrink-to-fit bug), loader replay specs (skip key cleared on every init run) |
| `c3e0430d` | wave-2 polish — bottom-anchoring shadow + research focus ring + parity badges retired, sidebar seam `#B3B3AF`, landing panel focus language removed |

## The permanent exceptions

1. **BT Grotesk is proprietary** — Alexandria + IBM Plex Sans Arabic stay (OFL,
   Arabic-correct); Geist Mono (OFL) is adopted.
2. **Arabic glyph metrics** — no uppercase exists; hierarchy transfers through
   weight + size, never letter-spacing (joins). The 13px Arabic reading floor stays
   (as a minimum under the fluid root).
3. **Honest-copy rules unchanged** — «جامعة مدارك التجريبية» disclosure, banned
   marketing wording, real numbers only.
4. **Funnel pins unchanged** — 5 register CTAs + 5 login affordances + the pinned
   section ids (`statement/chapters/live/roles/colleges/vision`).
5. **D15 cookie banner** — intentionally omitted (no tracking cookies; see
   [`NOTES-D15.md`](NOTES-D15.md)).
