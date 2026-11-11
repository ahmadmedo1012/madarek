# R349 RESUME-ALL — LANE: ALL (one serial session; heartbeat per commit)

Spec: R349 master prompt (supersedes R347), written against `main@15fb3b48`. Owner tokens in
`/home/z/.madarek-env` (600, outside repo). Lane order: Q → M1/U/B → D/P/S/I/W/N → Z.

## done

### §0 stop-checks (2026-11-11)
- env saved (600) · clone OK (`--filter=blob:none`, .git 36 MB) · structure confirmed
  (apps/mobile, backend/prisma/schema.prisma, frontend/src, MASTER-CONSOLIDATION-RESUME.md, AGENTS.md).
- Push test `wip/all-hello` push+delete OK. §1 facts re-verified: 0 `'worklet'` directives in
  apps/mobile; `runOnJS` in CountUp.tsx:110; `useDerivedValue(() => formatter(...))` with a plain
  JS formatter = the M1 crash suspect confirmed in tree.
- Playwright chromium **1223** installed to `/home/z/.cache/ms-playwright` (sandbox had only 1200 —
  caused the first verify.sh conformance/overlap/e2e failures; environmental, not the tree).
- Tools: claude-mem/gstack/ruflo MCP plugins not available on this box (no claude code runtime) —
  logged, not blocking (spec §0.5). z-ai sub-agents available for read-only analysis instead.

### LANE Q — Q1 gate table on `main@15fb3b48` (measured this session, this box)
| gate | result |
|---|---|
| tsc frontend | ✓ |
| vitest frontend | ✓ 3036 passed |
| tsc backend | ✓ 0 errors |
| vitest backend | ✓ 2125 passed · 19 skipped |
| vite build + bundle | ✓ total 753.4 KB gz ≤ 770 · entry 64.3 ≤ 92 · pdf 95.7 ≤ 110 |
| stylelint + CSS ratchet | ✓ importantDeclarations 52 (held) |
| design gates ×7 (tokens/icons/motion/csp/parity/colors/raw-css) | ✓ all |
| eslint | ✓ |
| conformance `--gate` full matrix | ✓ **93.5%** (54748/58537) ≥ floor 91.6 — r347 close was 93.0 |
| qa:overlap (preview 4173, / × 1440/768/390 × light/dark) | ✓ stops-with-defects=0 |
| playwright e2e hermetic | ✓ (28 r309 specs green after browser install) |
| CI on 15fb3b48 | CI ✓ · Size gate ✓ · deadcode ✓ · **iOS-SideStore ✓ completed success** (run 42969927481) |

Conformance run needs the dev server on :5173 first (`cd frontend && npx vite --port 5173 &`);
overlap boots its own preview on 4173. Full verify.sh + dev-server boot exceeds one 10-min tool
call on this box — run conformance separately when scoping (evidence: /tmp/verify-full3.log).

## next (in order)
1. Q2 extended matrix (`--gate --scroll --interact`) like-with-like vs ratchet; fix causes.
2. Q3 r305 scroll-restore flake deterministic (wait on signal, not timer; 20/20 under 4-worker load).
3. Q4 `scripts/qa/identity-guard.mjs` + wire into verify.sh + CI.
4. Then M1 (crash), U (one logo), B (one logo), D, P, S, I, W, N, Z.

## gotchas
- Sandbox bash calls hard-cap at 10 min; background processes die at call boundaries — always
  boot vite + run the scoped gate in ONE call.
- verify.sh conformance step defaults to :5173 (dev), overlap/e2e are hermetic (own preview).
- Backend vitest prints intentional error-handler fixtures (level 40/50 logs) — suite green.
