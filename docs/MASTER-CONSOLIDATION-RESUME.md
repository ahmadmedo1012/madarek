# MASTER CONSOLIDATION RESUME — living state

Update after every substantial commit/integration. Format: done / next / gotchas.

## done

- **M0 complete** (session 1): baseline verified `main@86c9d615`, CI green, release
  audited (verify.json gap found), three inventories landed (university showcase:
  13 delete + ~90 modify + removal-order plan; brand: footer MARK_PATHS bypass +
  mobile BrandMark distortion bypass; android pipeline: trigger gaps + verify.json
  one-liner + /app EAS references). Board = `MASTER-CONSOLIDATION-PLAN.md`.
  Root deps installed; mobile deps NOT yet installed.

## next (in order)

1. A1-A3 (wip/android-release): /app rebuild + workflow fixes + docs sync → merge.
2. D1-D8 + B1-B2 (wip/brand-neutralization): the removal waves → merge.
3. E1/F1/G1 in parallel worktrees (schema first — E owns schema.prisma).
4. C1 web completion; H1 corpora + D12.
5. Z1 final: full verify.sh, re-arm android build, confirm 5 release assets,
   MASTER-CONSOLIDATION-REPORT.md.

## gotchas

- `inst-zawia-showcase` / `madarek-demo` ids are FK anchors — display names only.
- home-intro-wrap conformance mapping binds the crawl cells — regen WITH the removal
  or the gate fails; footer.json binds `footer.markpath.1-8` — Option A keeps them.
- legal-pages test pins sitemap at exactly 16 public routes → 15 after /campus.
- r307-landing-media test is the showcase contract — rework in lockstep with D3.
- CSP frame-src youtube exists solely for showcase videos — tighten only in D7.
- Background processes may die between tool calls: vite + instrument in ONE call.
- `docs/releases.json` referenced by RELEASE.md does not exist (phantom) — fix text.
