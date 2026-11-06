# W10a — Inner public: routes & dead links (R332)

Lane note: the original run's tree was lost with the environment reset; the
**route-table decisions were re-applied verbatim** to the fresh clone (the
commit history carried `bd55775c`; the aliases below are the same edits,
re-verified). This doc records the decisions of record.

## Route count
**137 `<Route path>` rows** in `frontend/src/App.tsx` (134 before + 3 new
aliases): 4 guest auth · 4 legacy/alias Navigate rows (`/login` + 3 new) ·
2 dev specimens · 1 root + catch-all · 33 student (+ redirects) · 22 teacher ·
13 admin · 10 quality · 15 owner · 3 public colleges · 12 public GuestReveal
sheets · 6 any-authed · 4 error sheets.

## Dead links → fixed (root, App.tsx only — no link rewrites needed)
All 17 unique in-UI hrefs (landing desktop seats + SheetNav mobile menu +
footer + 25 probed public pages) already resolved — the §W10 dead URLs were
stale/typed URLs with no route rows, so the fix is the `/login → /auth`
alias pattern:

| URL | before | decision | after |
|---|---|---|---|
| `/register` | 404 | alias → `/auth/register` (RegisterPage's real mount) | redirects ✓ |
| `/universities` | 404 | alias → `/colleges` (the product's universities surface IS the public colleges gallery; no standalone page exists) | renders ✓ |
| `/features` | 404 | alias → `/capabilities` (the honesty ledger «ما يعمل اليوم», where feature-claims route) | renders ✓ |

Before: **3 dead URLs, 0 broken in-UI hrefs** → after: **0 / 0**.
`lib/navLinks.ts` deliberately NOT created — a second link map would drift
from `lib/nav.ts` / `NAV_SEATS` (decision: one source of truth).

## Error sheets (live-probed)
`/definitely-unknown`, `/404` → the designed 404 (h1 «هذه الصفحة تغيّبت عن
الحضور», 3 exits); `/403`, `/500`, `/maintenance` all render their sheets —
no blanks. Screenshots: `/home/z/evidence-r332/w10a/` (regenerate command in
the original probe: python playwright, guest context, wait networkidle).

## Gates
`nav-coverage` + `nav-routes-consistency` + `App-routes` +
`r183-public-funnel` 50/50 · extra `drift` + `r305-nav-maps` +
`landing-funnel` 54/54 · `tsc -b --noEmit` clean. No test pins moved.

## Report-only (resolved during the round)
The `/auth` family live-render crash (Invalid hook call — the dev server's
Vite dep-optimization graph went stale after concurrent wave edits) was
**cleared by a `vite --force` re-optimization** — /auth renders with zero
page errors afterwards. Not a product bug.
