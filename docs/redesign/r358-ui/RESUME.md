# R358-UI — execution log

Branch: `wip/r358-ui` from `origin/main` at `1aa08883`. Visual-only lane; never touch production or release assets.

## A1 — mobile emulator evidence
- Expanded the manual-only `ui-screens.yml` into a 20-job matrix: five roles × four profiles (light/dark standard and light/dark at 1.3 font scale on 360×640); no automatic trigger added.
- Added role flows that authenticate with the existing test accounts and screenshot each persistent tab by testID. Workflow/profile YAML parse passed; mobile UI evidence is pending the dispatched run and artifact review.
- Baseline dispatch 43813713084 started against `main` before the extension; still in progress at last check and has not produced a downloadable artifact.
