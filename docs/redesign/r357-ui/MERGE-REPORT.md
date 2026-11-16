# R357-UI — merge report

Merged `wip/r357-ui` onto `main` @ `09d50535` with `--no-ff` (commit `91867e24`).
Main's own last commit was the CI-lane `await-ci` fix; **zero file overlap** with
this lane's files, so the merge is clean (`git merge` reported no conflict and
no manual edit was needed).

## 1. Arabic string parity: IDENTICAL
Extraction: every Arabic run inside string-ish text in `frontend/src` +
`apps/mobile/{app,src}` (`*.ts`,`*.tsx`), compared ref-to-ref.

| ref | strings | sha1 |
|---|---|---|
| `origin/main` | 19 330 | `aca7c6996c0e34340c6d767fc196788712ecefdd` |
| merged HEAD | 19 330 | `aca7c6996c0e34340c6d767fc196788712ecefdd` |

No Arabic copy was added, changed or removed by this lane.

## 2. Diff scope
Ten files, all inside the UI lane's ownership; **no logic, route, permission,
API, copy or backend file touched**:

- `frontend/src/lib/nav.ts` — accordion flags for four low-frequency groups.
- `frontend/src/styles/landing/journey.css` — one media-query seat for the
  short tablet window.
- `apps/mobile/src/components/shell/roleTabs.ts` — tab glyphs.
- `apps/mobile/.maestro/screens-student.yaml` — new screenshot flow.
- `.github/workflows/ui-screens.yml` — new manual workflow (never runs on push).
- `scripts/qa/nav-audit.ts` — new audit.
- `scripts/r323/contrast-gate.mjs`, `scripts/r323/contrast-exemptions.json` —
  gate probe + named exemption ledger.
- `docs/redesign/r357-ui/{RESUME,COPY-REQUESTS,MERGE-REPORT}.md`.

## 3. Metrics on the merged tree (`origin/main` before → merged)

| metric | before | after |
|---|---|---|
| bundle total (gz, ceiling 773 KB) | 741.9 KB | **741.9 KB** |
| CSS counts (files / !important / raw-z / raw-hex) | 76 / 41 / 66 / 35 | **76 / 41 / 66 / 35** |
| stylelint ratchet | green | **green** (45 errors = baseline; 68 warnings tracked) |
| contrast gate findings | 14 | **0** (+10 documented exemption hits on the frozen hero seat) |
| text-on-text at `/` 1024×600 | 6 (2 stops) | **0** (also 0 at 1024×768) |
| icon drift across the three menus | 23 (4+5+5+5+4) | **0** |
| default visible sidebar rows (student/teacher/admin/quality/owner) | 19/23/15/13/16 | **19/12/7/5/7** |
| Arabic string parity | — | **identical** |
| mobile jest | 1250 | **1250** (49 suites) |
| nav unit suite | 78 | **78** (nav-coverage + r305-nav-maps + route-titles + rename-belt) |

## 4. Gates run on this tree
`npm run build -w frontend` ✓ · `check-bundle-size.mjs` PASS (741.9/65.5/95.4) ·
`gates/stylelint-gate.sh` ratchet green · `check-colors.sh --strict` ✓ ·
`check-raw-css.sh --strict` ✓ · `gates/css-counts.mjs` unchanged ·
`r323/contrast-gate.mjs` PASS · `qa/overlap.mjs` 1024×600 & 1024×768 = 0 ·
frontend nav unit suite 78/78 · mobile jest 1250/1250.

## 5. Visual evidence
No new contact sheets were cut this round: the two defects are geometry and
colour, both proven numerically above with the probes' own coordinates and
ratios. The mobile screenshots are owed from `ui-screens.yml` (manual
dispatch); nothing was claimed as seen on a device.
