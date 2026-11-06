# T-31 — landing-sheet liveness pass (batch A: landing, NOT auth.css)

Branch `r339/t31`, base 3e7a9f2f → da8e5445. Method + per-file table + counts.

## Method

1. **Static census** (node): every `.class` token in `styles/landing/*.css` matched
   against the concatenated non-CSS source (`src/**` + `scripts/**`). Zero hits ⇒
   candidate. Template-built names (`why.${ds}in`, `hro-deco-${i+1}`, `ind-*--state`,
   `r305ao-*`) were excluded — a literal miss is not death when a template can mint it.
2. **Dynamic probe** (playwright @ :5321): all 9 measured routes — `/`, `/auth`,
   `/auth/register`, `/help`, `/about`, `/app/download`, `/legal/privacy`,
   `/legal/terms`, 404 — queried `locator('.<class>')` per candidate.
   Zero matches on zero routes ⇒ dead. (`scripts/gates/t31-probe-dead.mjs`.)
3. **Test-pin check** (rg over `frontend/tests`): anything referenced by a test is
   law — saved, not deleted.
4. **Gates**: `verify.sh --fast` (tsc/jest/bundle 765.6 gz ≤770/stylelint ratchet)
   + `css-counts.mjs` before every commit; scoped conformance footer rate re-read.

A rule is deleted only if dead on ALL routes AND not test-pinned AND not a
transient-state arm AND not a referenced @keyframes seat.

## Per-file deletions (net lines)

| file | −lines | dead families |
|---|---|---|
| landing/footer.css | 18 | `.fo-col3rule` (2 arms), `.fo-ilink-t` + hover + dark arm, `.fo-reg-tl/tr/bl/br` (base + 768-belt arms) |
| landing/hero.css | 21 | `.bp-hotspot-num`, `.fo-hero-meta`, `.bp-ink-fill` (+ `.bp-on` arm) |
| landing/home.css | 15 | `.st-body-col .st-title`, `.st-partner-label`, `.st-partner .fo-ticker-item`, `.st-section .st-art-cell .st-art-svg` |
| landing/journey.css | 3 | `.wy-stack` gap arm |
| landing/shared.css | 6 | `.st-body-col` + `.wy-stack` fold arms |
| landing/statement.css | 3 | `.st-stmt-rule` mobile fold |
| landing/strata.css | 128 | `fl-head/svg/sketch/resolved/render/signal/labels/pulse/coord` family, `.fl:not(:has(.fl-pulse))`, `.pr-lede`, `.pr-stage`, `.st-body-col` phone arm, `.wy-stage-num/title` |
| landing/why.css | 124 | `wy-tag*` family (superseded by `wy-cap*`), `wy-rrule`, `why.row4 .wy-pt[data-pt]` ×12 (attr never rendered), `wy-vic-path`/`wy-chk-path` (mask paths carry no class) |

Total: **8 files, −318/+4 (net −314) lines, ~58 rule arms.**
Side fix: `scripts/r319/paired-state-allowlist.json` — one entry retired with its
rule (`.fo-ilink:hover .fo-ilink-t`), paired-state lint re-green (117 XOR rules).

## Counts before → after (base 3e7a9f2f → HEAD)

- CSS lines `frontend/src/styles`: **46,184 → 45,870**
- stylelintErrors **45 → 44** (DOWN) · stylelintWarnings **57 → 56** (DOWN)
- importantDeclarations **52 → 52** · rawZIndex **79 → 79** (held)
- rawHex **36 → 34** (DOWN) · bundle **765.6 gz ≤ 770** (held)
- css files 76 (held). `verify.sh --fast` PASS both batches; r306-landing-sheet 21/21.

## False-positive saves (kept, with reason)

- `.fo-ticker-track` / `fo-ticker-rtl` — no markup, but **test-pinned** (r306
  RM_COLLAPSED belt + keyframe whitelist). Law.
- `hro-deco-1/2` — minted by template `hro-deco-${i+1}` (Hero.tsx:160).
- `why.pt2…pt12`, `why.mk2in` — minted by `data-spec={`why.${ds}`}` templates.
- `ind-*--absent/late/present`, `ind-segment--empty/full/partial`,
  `ind-streak-tick--done/missed`, `r323d-role-swatch--*` — transient state arms.
- `.st-title` base — lives in Statement.tsx; only the `.st-body-col` descendant died.

## Next actions (batch B, out of this time box)

- `hero-mechanics.css` `.bp-ink-fill` selector-list lines (needs list surgery).
- `r305ao-panel*` (heron-admin-owner.css — owner-app scope, verify first).
- Run the full `css-coverage.mjs` sweep (checkpointed) for a route-union second
  opinion before touching shared/components sheets beyond landing.
