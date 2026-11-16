# R358-UI — execution log

Branch: `wip/r358-ui` from `origin/main` at `1aa08883`. Visual-only lane; screenshots use runner-local Postgres/API and the QA workflow never publishes an APK.

## A1 — mobile emulator evidence
- Manual-only workflow captures five roles × four profiles (light/dark standard; light/dark at 1.3 on 360×640). It builds a throwaway APK and uses ephemeral local Postgres/API; no production endpoint or release publication.
- First legacy workflow dispatch 43813713084 failed before artifact; unsafe production-API capture run 43883296880 was canceled before jobs started.
- Preview build failed on 43885258561 because `ubuntu-latest` lacked the expected SDK path. Workflow is pinned to repo-required `ubuntu-24.04`.
- Safe baseline dispatch 43886460275 uses main APK source: preview APK build succeeded at 15:29 UTC; role/profile screenshot jobs are still running/queued. Download artifacts when the run completes. Earlier SDK lookup runs 43884733615, 43885258561, 43885548054 failed before capture.
- Flow YAML and workflow YAML parse passed. No production endpoint or release publication was used.

## A2 — navigation
- Replaced oversized per-role sidebar lists with 8 always-visible destinations and one collapsed overflow; original census retained: student 34, teacher 23, admin 15, quality 13, owner 16.
- `cd frontend && TZ=UTC npx vitest run tests/unit/nav-coverage.test.ts`: 17 passed. `npx tsx scripts/qa/nav-audit.ts --json`: each role 8 visible + overflow, max 2 clicks, glyph drift 0, 5 destinations repeated across sidebar/bottom/tabs.
- `npx tsx scripts/qa/nav-audit.ts --json`: STUDENT 34/8/26/2/0/5; TEACHER 23/8/15/2/0/5; ADMIN 15/8/7/2/0/5; QUALITY 13/8/5/2/0/5; OWNER 16/8/8/2/0/5 (census/visible/overflow/max clicks/glyph drift/duplicate destinations).
- Reviewed real local app contact sheets: [desktop light/dark 1440](evidence/web/A2-nav-desktop-light-dark.png), [drawer light/dark 390](evidence/web/A2-nav-drawers-light-dark-390.png).

## A3 — web component consistency (in progress)
- Real web captures found the teacher grades table left about half its 1440px card unused and overflowed at 390px; a long card title wrapped into four lines. Added shared table sizing/scroll/focus/sticky-header rules, a data-label card layout at ≤640px, and a smaller phone card-title rung in `frontend/src/styles/components.css`.
- Consolidated duplicate `.pill`, `.pill.on`, `.tab`, `.state`, and `.state-icon` rules in the same sheet. `stylelint-gate.sh`: errors 45→40, warnings 68→67; ratchet passes. Raw CSS, color, and generated-token checks passed before the final brace correction; repeat them after continuing.
- `npm run build -w frontend` passed after the TypeScript guard and CSS syntax correction. `node scripts/check-bundle-size.mjs`: total 746.0 KB gz, entry 66.3 KB, PDF 95.7 KB; all ceilings pass. `cd frontend && TZ=UTC npx vitest run tests/unit/nav-coverage.test.ts`: 17 passed.
- A5 before sheets are saved at `evidence/web/A5-before-01.png`–`A5-before-08.png`. A later capture set was invalidated by a temporary CSS brace error; it has since been fixed, but public pages and all after sheets must be recaptured and reviewed before A3/A5 are checked.
