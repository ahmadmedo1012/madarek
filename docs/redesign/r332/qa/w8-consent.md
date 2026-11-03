# W8 — Consent card · the hairline corner cell + the conditional yield (R332)

Lane re-run, decided design executed verbatim. Changed:
`components/landing/chrome/ConsentBanner.tsx` (rules retired, yield watcher)
+ **new** `styles/landing/consent.css` (imported by the component).
`r314-chrome.css` (owns the seat) and `landing/chrome.css` untouched — no git.
Evidence: `/home/z/evidence-r332/w8/` (probe_w8.py, probe-before.json,
probe-after.json, 12 PNGs).

## Storage contract (verified, unchanged)

`rg -ni "consent" frontend/src --glob '*.ts*'` — the gate writes **`madarek.consent`**
= the plain decision (`"accepted"`/`"rejected"`), the one-comparison read every
gate uses first; **`madarek.consent.record`** = the JSON audit twin
`{"decision":…,"ts":<epoch-ms>}`. Reject additionally purges `mdrk-ui` +
`mdrk-doc-side-w` (kept: `madarek-theme`, `mdrk-theme-profile`, `mdrk-auth`).
Readers found: the banner itself, the legal ledger (`LegalPages.tsx` lists both
keys as «أساسي»), `legal-pages.test.tsx` (source-level pins — green).

## Overprint matrix (fresh context, consent UNANSWERED, rest + full scroll pass)

| VP | before box / type (text·more·accept) | before overprints | after box / type | after overprints | yield |
|---|---|---|---|---|---|
| 1440×900 | 360×66 · 13.33·11.67·11.67px | rest 0 · **transient 1** (footer CTA «أنشئ حسابك…») | 320×68 · **13·12·12px** | rest 0 · **0** | attr+hidden @y8472 · rect+docH stable · back by ~704ms |
| 1024×768 | 360×59 · 13·11.67·11.67px | rest 0 · **transient 3** («الحياة الجامعية»…) | 320×61 · 13·12·12px | rest 0 · **0** | hidden @y384 · stable · ~703ms |
| 768×1024 | 360×71 · **14.73**·12.89px | rest 0 · **transient 1** | 320×71 · 13·12px | rest 0 · **0** | hidden @y512 · stable · ~716ms |
| 390×844 | **340×85 · 15.88**·13.89px | rest 0 · **transient 1** | **320**×84 · 13·12px | rest 0 · **0** | hidden @y844 · stable · ~707ms |

Yield proof (all VPs): while a visible link would cross the cell →
`data-cb-yield` set + computed `visibility:hidden`; link rects and
`scrollHeight` byte-identical while hidden (**zero layout shift, zero CLS**);
still yielded at +450ms (no flicker); attribute cleared ~600ms after the corner
clears (probe granularity lands 703–716ms). Resting overprints 0 before and
after — the never-hide end-reserve stays honest; the yield only covers the
transient scroll frames.

## Substantive differences (before → after)

1. **Four ink-rule spans → ONE hairline.** `.cb-rule-t/r/b/l` deleted from the
   JSX (probe `rulesLeft`: 4 → 0); the cell is one `1px solid var(--rule)`
   border, radius 0, `box-shadow:none`, paper `--bg` — theme-reactive
   (light rgb(179,179,175) / dark rgb(111,111,107)), no forks.
2. **360px → 320px ceiling.** `inline-size: min(320px, calc(100vw - 50px))` —
   320 wide at all four VPs (was 360/340).
3. **Type pinned 12–13px at EVERY viewport** (landing.css hand-tuned-chrome
   precedent): text 13 · more/accept 12 · reject 13. Kills the rem ladder's
   mobile floors (15.88px text @390, 14.73 @768).
4. **Brand accent only on accept.** «اعرف أكثر» drops `--accent-ink`
   (rgb(199,46,0)) for muted ink w/ ink hover; the accent survives solely as
   the accept hover/focus fill-wipe. One doubled-class rule
   (`.cb-banner a.cb-more.cb-more`, (0,3,1)/(0,4,1)) also retires r314's dark
   hover fork without adding one.
5. **The conditional yield** (above) — the fixed box recedes via
   `visibility:hidden` (stays measured), 600ms hysteresis, rAF-throttled
   scroll(capture)/resize + one mount pass, one `querySelectorAll` + rect
   reads/pass, pre-reveal (opacity 0) elements count as clear. Focus inside
   the cell when it yields falls to `<body>` — transient scroll-driven state.

Cascade (verified live in dev): the component-imported sheet injects at
style-tag **23**, r314-chrome.css at **24** — overrides win on specificity
((0,2,0)–(0,4,1) vs bare (0,1,0) `.cb-*`); no `!important`, no IDs.

## Gates

`npx tsc -b --noEmit` clean · `npx -y stylelint@16 src/styles/landing/consent.css`
0 issues · `vitest run r306-landing-sheet + landing-funnel` **32/32** · belt:
`legal-pages` 90/90 (its source pins on the storage keys + /legal/cookies
target still hold). No test edits.
