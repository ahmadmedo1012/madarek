# Task A-F3 — Footer col2 subtree: link-group seats + contact + socials (THE BIG MASS)
Section: `footer` · Port 5203 · Worktree /home/z/wt/A-F3 · Branch wip/r343-A-F3

## Goal
The reference has **4-div nests inside every link seat** (coverage-review: "deep wrapper chains (4-div nests inside every link seat)"). Mirror that topology across **col2** in `Footer.tsx` (~lines 271-352: c2top, lgroup.N, lglinks.N, the account links, c2bottom, bgroup.1-3, the contact biglink, socials).

1. Reference: `heron-spec/footer.{390,1440}.json` — col2 = the middle column (paths under the second top-level column div): every link seat (`a[1..n]` with its inner div chain), group headers, the big contact link, the socials row. Compare with `mapping/footer.json` explicit (85 today) — most seats are unbound.
2. Rebuild each link seat so the reference's inner chain exists for real (text wrapper, hover-ink twin, arrow box where the reference has one). Keep existing `data-spec` names (e2e depends on some) — ADD `footer.af3.*` hooks on the new wrappers.
3. Bindings in NEW `mapping/footer-A-F3.json`.

## Owned files
`Footer.tsx` (ONLY col2 JSX region) · `mapping/footer-A-F3.json` (new) · `landing/footer-af3.css` (new) · one @import in `landing/home.css`.

## Numeric acceptance
- ≥14 new bound elements (this subtree carries the largest unbound mass), ≥160 measured checks, green at 390 + 1440.
- Hover states must still work (the component has data-spec-hover logic ~line 142 — keep it intact).
- No new fails/excused.

## Commands
Preamble flow; two chunks; kill vite.
