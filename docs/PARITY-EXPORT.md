# Parity Export — the family bridge · جسر التكافؤ

**Contract:** how the Madarek design canon ([`DESIGN.md`](../DESIGN.md)) crosses from this reference repo to the four Smart products (Smart-Menu · Smart-Link · SmartBot · Smart-Order), and what the verify gate enforces.

**One command, four gates:**

```bash
node scripts/verify-parity-export.mjs
# PASS — 163 token checks verified against tokens.css; 0 broken var() refs; 0 retired values; both files parse.
```

Dependency-free (`node:fs` / `node:path` / `node:url` only) — runs anywhere Node runs, including CI.

---

## 1. The export pair — what it is, and what it is NOT

| File | Role | Lines |
|---|---|---|
| `frontend/src/styles/unified-smart-parity.css` | **Canonical export** — a faithful distillation of `tokens.css` / `motion.css` / `components.css`: both theme blocks (light cream + copper, dark night + gold), status/accent families, elevation recipes, glass surfaces, structural component recipes | ~1193 |
| `frontend/src/styles/shared-design-system.css` | **Structural skeleton** — the non-color layer: spacing, radius, type scale, motion ladder, z-order, layout dimensions, type roles. **Color always comes from the parity file.** | ~399 |

**The two hard facts about the pair:**

1. **It is NOT imported by madarek's own app.** The app chain is `fonts → tokens → motion → base → components → layout → auth → notifications → student → polish` — the export pair sits outside it, as reference artifacts.
2. **It is NOT applied to any Smart repo.** Each product carries its **own pin-verified token bridge** (hundreds of pinned assertions per repo). The export pair is what those bridges are diffed *against* — the reconciliation surface, not a runtime dependency.

> **History (why this contract exists):** the first revision of the parity file (added in cc03c2e with the claim *"Applied to: Smart-Link, Smart-Bot, Smart-Menu"* — a false claim; it was never applied anywhere) diverged from canonical `tokens.css` in 40+ tokens: a generic near-black dark ground instead of night indigo, a 100/200/300ms motion scale instead of the 80/160/240/380/520/720 ladder, a saffron/ember light accent instead of copper-on-cream, an invented 24px radius rung, Tailwind-gray neutrals, a dark `.btn.primary` referencing an un-inverted neutral ramp, a reduced-motion hole (raw `--t-*` never zeroed), and an invented ten-band z-scale. The r127-F1 rewrite corrected every divergence, and the verify script now pins the export to the canonical source so it can never silently drift again.

**Load order (for products that choose to adopt the pair as their bridge base):** `unified-smart-parity.css` first (color + motion + state source), then `shared-design-system.css` (structural layer). Host aliases are tolerated **only** when the parity file is absent (shadcn-style hosts): `--foreground`, `--muted-foreground`, `--card`, `--card-muted`, `--ring`. Everything else resolves from the pair.

---

## 2. The four gates · البوابات الأربع

| # | Gate | Asserts | Failure mode |
|---|---|---|---|
| **1** | **Token parity** | Builds resolved light/dark token maps for `tokens.css` and the export (theme blocks + `var()` chains + fallbacks) and asserts **163/163 key tokens match exactly**. Headline tokens are additionally **pinned to their documented values** — night `#070B16`, gold `#E9B44C`, copper `#B57438`, cream `#FBFAF9`, sand `#F2EFE6` — so a future drift of the *reference itself* fails loudly instead of silently dragging the export along. A meta-check requires ≥100 token checks to be defined. | Any divergence, either direction, exits 1 with a readable diff. |
| **2** | **Undefined-var audit** | Every `var(--x)` in the export must resolve within the export itself — directly or through a complete fallback chain. The shared skeleton is audited against `shared ∪ parity ∪` the documented host-alias set. | A broken reference (token defined nowhere) fails the run. |
| **3** | **Forbidden retired values** | The **43 retired divergent spellings** (§3) must be absent from **both** files — comments included, so a "retired but mentioned" value still fails. | Any hit names the file and the exact needle. |
| **4** | **Brace balance** | Both files must parse: balanced braces, no negative depth, after comment stripping. | Unbalanced file fails the run. |

Sanctioned opt-in consumer hooks (the only undefined names allowed): `--reveal-distance`, `--reveal-index` — permitted **only** with complete fallback chains, so a host that never sets them still renders.

Documented canonical wrinkle: `--journey-core` historically spelled `var(--ink)` with `--ink` defined nowhere; `--ink` is now defined in both theme blocks (= `#191918` light, the sand `#F2EFE6` dark) and the export asserts through the normal path (r130-W2-7).

---

## 3. The 43 retired values · القيم المُحالة للتقاعد

These spellings are **retired from the family forever**. They must never reappear in the export pair, and products should treat them as anti-patterns (the values that never shipped):

| Group | Retired values |
|---|---|
| Saffron/ember accents (the wrong light accent) | `#bc4700` · `#a33d00` · `#d45500` |
| Generic dark grounds (not night indigo) | `#0f0f0f` · `#151515` · `#1a1a1a` · `#222222` |
| Divergent dark secondary/borders | `#c4c0b8` · `#2a2a2a` · `#3d3d3d` |
| Tailwind grays | `#f7f8fa` · `#f0f1f3` · `#e5e7eb` · `#d1d5db` · `#6b7280` · `#9ca3af` |
| Tailwind status colors | `#3b82f6` · `#dc2626` · `#d97706` · `#0ea579` |
| Non-canonical shadows | `oklch(` · `--glass-shadow` · `--shadow-glow` · `--shadow-glow-strong` |
| Invented z bands | `99999` (z-max) · `--z-max` · `--z-sticky` · `--z-drawer` · `--z-header` · `--z-overlay` |
| Wrong ease-out curve | `0.16, 1, 0.2, 1` (both spacings) — canonical decelerate is `(0.16,1,0.3,1)` |
| Non-canonical glass blur | `blur(20px)` — canonical is 16px surfaces / 4px scrims |
| Invented token names | `--lh-relaxed` · `--btn-primary-bg` · `--btn-primary-hover` · `--primary-hover` · `--primary-text` · `--elev-card` · `--elev-modal` · `--surface-raised` · `--motion-ease-decalerate` |
| Renamed selector | `.input-field` — canonical is `.input` |

---

## 4. Scope exclusions — deliberate, not omissions · ما لا يُصدَّر

| Stays out of the export | Why |
|---|---|
| **Orbit Ink (`--ln-*` family + the 42s marquee)** | Landing-only vocabulary — the marketing world is madarek's own; products have their own landing language. Reference doc: `DESIGN.md` §1a. |
| **Role-accent / college-accent slots** (`body[data-role]`) | Madarek-app identity slots; the Smart products carry no `data-role` contract. |
| **Illustration palette (`--ill-*)`** | Illustration-layer vocabulary (incl. its `prefers-contrast` stroke thickening) — stays with the illustration system. |

---

## 5. How a product consumes this · كيف تتبنّى

1. **Do not import the pair as-is into a product.** Carry your own pin-verified token bridge (as all four Smart repos do) and diff it against this pair when reconciling.
2. **A product that needs a different value is proposing a family change** — open an issue here; don't fork the token silently.
3. **Run the gate after any reference token change** — `node scripts/verify-parity-export.mjs` must stay green (`163/163`) before a change to `tokens.css` ships.
4. The canon in human-readable form is [`DESIGN.md`](../DESIGN.md); the authored values live in `frontend/src/styles/tokens.css`.

---

*Source of truth for this contract: `scripts/verify-parity-export.mjs` (the gate is the documentation). File headers of the export pair carry the same history.*
