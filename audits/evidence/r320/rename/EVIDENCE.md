# RENAME evidence — «الإدارة» → «المسجل العام» wrap check (R320 §B, task c1-RENAME)

30 WebP captures (15 surfaces × before/after), each ≤48KB (budget 150KB).
Shot on vite :4251 with the hermetic mock-transport context (the e2e
pattern — every `/api/v1/**` call fulfilled by an embedded route table;
no backend). BEFORE shots = the pristine fork state; AFTER = the swept
tree. Labels verified by VLM read-back (before: third demo button =
«الإدارة», drawer group label = «الإدارة») + the DOM probe below.

## Surfaces (before/after pairs)

| Surface | Viewports × themes | What carries the new label |
|---|---|---|
| auth page | 390 light/dark + 1440 light | demo panel context (role buttons crop below) |
| auth demo role buttons | 390 light/dark + 1440 light | the ADMIN button «المسجل العام» |
| admin dashboard | 390 + 1440 × light/dark | topbar kicker + title, sidebar group label, user role chip, page h1 |
| admin drawer (390) | light/dark | group label «المسجل العام» + user role chip |
| scoped admin (scopeFacultyId) | 1440 light + 390 light/dark | topbar scope chip «المسجل العام · كلية الهندسة» |

## Wrap verdict (DOM geometry probe, live tree)

Every measured cell renders the longer label **without truncation,
ellipsis, type-scale shrink, horizontal overflow, or viewport escape**:

- demo ADMIN button: 120×44px, 1 line, fs 13px (row 324×97 @390 and
  594×45 @1440 — **byte-identical dimensions before/after**: the row's
  2-button-wrap shape at 390 predates the rename)
- drawer/sidebar group label «المسجل العام»: 295×33px = ONE line
  (8px+4px padding + 21.45px line box — same height as «النظام»;
  the probe script's "2L" was padding-inflated math)
- sidebar user role chip: 179×21px, `nowrap`, no overflow
- page h1 «لوحة المسجل العام»: 350×114px @390 = wraps to 2 lines
  (the sanctioned Heron fix — no overflow/escape), 383×48px 1L @1440
- breadcrumbs root crumb (`.pf-breadcrumbs`, /admin/faculties):
  105px wide, nav 1 line 21px, no overflow @390/1440 × light/dark
- topbar title: 1 line at 390 (158×19) and 1440 (807×40)
- scoped-admin topbar chip «المسجل العام · كلية الهندسة»: 166×24px, no overflow

**No CSS fix was needed** — the cells absorb the longer label within
the existing type scale. The wrap probe's three FAIL flags are
artifacts, disproven above: (1)+(2) the auth demo-actions row sits
below the fold on the tall auth page at 390 (pre-existing — identical
row dimensions before/after prove no rename effect); (3) the
"breadcrumb" selector `nav[aria-label]` matched the **off-canvas
drawer nav** on the dashboard (the dashboard has no breadcrumbs — the
real `.pf-breadcrumbs` were probed separately on /admin/faculties and
pass at every viewport × theme).

## Provenance

- tools (committed alongside this evidence): `tools/r320-rename-shots.mjs`
  (before/after capture), `tools/r320-rename-wrap-probe.mjs` (geometry
  probe), `tools/r320-rename-webp.mjs` (PNG → ≤150KB WebP re-encode)
- chromium via playwright-core (`~/.cache/ms-playwright/chromium-1223`)
