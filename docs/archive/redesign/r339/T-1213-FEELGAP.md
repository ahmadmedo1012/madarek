# T-1213 — FEELGAP closure: dark-ink all-sections zero + 390 sheet gutters

Branch `r339/t1213-feelgap` (bc800238 + this landing). Instrument: the t02b-hardened
conformance runner (staged `/tmp/t12h`, = origin/r339/t02b) — all-nodes darkInk census
(every text-bearing node, WCAG AA ≥4.5:1 vs composited effective bg) + edge390 gutters
(±2px vs the spec's recorded 390 section-root gutter, Heron sheet = 8px, root x8 w374).
Auth pages (outside the instrument's landing scope): `/home/z/t1213-auth-dark.mjs` —
same compositing law (alpha-aware parseColor, composited ancestor bg stack, ink×opacity).

## darkInk — all 9 sections × 5 bps (1920/1440/1024/768/390)

Final full-matrix run: **fails 0 / checked 1289 / skipped 260** (skips = uncountable
seats, reported not silent). Before→after per fix seat (bc800238 = predecessor commit):

| section | before (worst) | after | fix (token, scoped `[data-theme="dark"]`) |
|---|---|---|---|
| platform | 10 fails @1:1 | 0 | CTA strip frozen-flip: transition color-leg dropped (bc800238) |
| footer | 18 fails @3.97:1 | 0 | `.fo-legal-sep` → `--text-muted` 7.0:1 (bc800238) |
| pains | soft-ink @1:1 | 0 | `--pm-soft-ink` dark flip (bc800238) |
| hero | flare/CTA-ink @<4.5 | 0 | `--accent-ink` night seats (bc800238) |
| cta | 23 fails @1:1 + 3.76:1 | 0 | resolve fill → `--accent`, labels `--warm-ink` 5.6:1; ghost/text links drop color-leg (this landing) |
| map | 170 fails @1:1 | 0 | `--jt-ink` → rgba(246,246,238,.72) ≈7.7:1; `jt-window` marks → `--text-muted` 7.0:1 (this landing) |
| usecase | 0 (census-clean) | 0 | `.rl-row-icon` → `--text-muted` 7.0:1 (glyph seat, prophylactic) |
| intro | 0 | 0 | — (clean at HEAD) |
| why | 0 | 0 | — (clean at HEAD) |
| problem | 0 | 0 | — (clean at HEAD) |

Before-proofs (fixes stashed, same instrument): cta+map+usecase = **193 fails** /
checked 402 (cta 23, map 170, usecase 0); worst rows: cta anchors rgb(40,40,40) on
rgb(40,40,40) = 1:1; map SVG `text` rgba(40,40,40,.72) on #282828 = 1:1 (46+ nodes,
all bps). The map re-point keeps the rgba() literal form so the census stays parseable.

## Auth pages (login /auth, register /auth/register — logged-out, what the panel saw)

| route | @1440 | @390 | fails |
|---|---|---|---|
| login | 95 nodes checked | 95 nodes checked | **0** |
| register | 17 nodes checked | 17 nodes checked | **0** |

No fix needed — the auth sheets already sit on flipped tokens.

## edge390 — hero/why sheet gutters @390 (Heron 8px sheet, spec root x8 w374)

| seat | before | after | note |
|---|---|---|---|
| hero art band + reg marks | 0/0 full-bleed (Δ-8) | **8/8** | re-seated on 0.81rem inset (bc800238) |
| why sheet frame | x-7 overflow, content x1/r15 | **x8 w374** | zero margin + 0.81rem padding (bc800238) |

Final: `--bps 390 --sections hero,why` → **edge390 fails 0**; full-matrix run also 0
(147 geometry fails at 390 are other groups' y/x-mirror/w asserts — not T-1213's).

## Regression

- Light A/B (fixes stashed vs present, 3 touched sections × 5 bps, light-only run):
  map 91/91/91/91/91, cta 94/94/92/91/90, usecase 95/95/93/94/89 — identical at every
  bp; totals 15554→15555/16811 (±1 sub-pixel wobble). bc800238: hero+why @390
  89.8%→90.1%; dark pass-rate up 4210→4218.
- `bash scripts/verify.sh --fast` GREEN; bundle 764.3 KB gz ≤ 770.
- r183-B8 vitest pin reconciled 777→770 (the R339 gate restoration c8a61806 moved the
  law down; the pin follows it DOWN — stricter, never weaker; 992d520d pattern).

## Residuals

- darkInk skips 260/1549 (bg-image ancestors, opacity<0.3, unparseable) — reported,
  not silent; t02b landing puts the census itself on main.
- Arabic copy untouched (color/geometry-only seats). Light mode untouched (every rule
  scoped `html[data-theme='dark']` / `[data-theme='dark']`).
