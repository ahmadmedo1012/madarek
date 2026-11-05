# Madarek docs — one-page map

One page: what is live, what is archived, and where the program state lives. If you are looking for a redesign round, it is either **live** below or in **`docs/archive/redesign/`**.

## The program (one paragraph)

Madarek's landing frontend is being conformed, section by section, to the Heron reference (heronaiapp.com) under the **R338 conformance program**: frozen per-breakpoint reference specs (`docs/redesign/r335/heron-spec/` — 5 breakpoints × sections + footer + `_page`/`_motion`, extracted by `scripts/spec/extract-heron.mjs`) are diffed against our live DOM by `scripts/conformance/run.mjs` (light + `--dark`; section bindings in `scripts/conformance/mapping/*.json`). Every section must reach **≥90% on all 5 breakpoints + dark theme**; the full-matrix floor is ratcheted (53.7, never lowered) and the JS bundle ceiling is 777 KB gz. Impossible cells may only be excused with a written justification in `docs/redesign/r338/excusals.md`. Per-section numbers and the open task queue live in **`docs/redesign/r338/QUEUE.md`** (round handoffs: `docs/redesign/r338/HANDOFF.md`). The binding law for every agent is `AGENTS.md`.

## Where the live docs live

| Path | What |
|---|---|
| `AGENTS.md` | binding agent rules (repo root) |
| `scripts/README.md` | how to run every script (conformance instrument, gates, spec extraction) |
| `docs/redesign/r338/` | live round: `QUEUE.md` (task queue), `HANDOFF.md` (lead), `excusals.md`, `arsenal.md`, `BRIEF.md` |
| `docs/redesign/r335/heron-spec/` | **FROZEN Heron specs** — read by `scripts/conformance/{run,scroll,interact}.mjs` + written by `scripts/spec/extract-heron.mjs`; path is load-bearing — do not move |
| `docs/redesign/r337/OWNERSHIP.md` | section→file ownership binding (referenced by `AGENTS.md` and task briefs) |
| `docs/redesign/r331/` | kept live: `heron-program.json` is the spec-of-record for `scripts/twin/` (`scripts/twin/config.json`) |
| `docs/redesign/r320/` | kept live: `rename-keep.json` is the rename ledger read by the r320 gate (`scripts/r320/rules-runtime.mjs`) |
| `docs/redesign/assets/` | kept live: r305/r306 reference evidence, linked from the two spec docs below |
| `docs/redesign/BLUEPRINT.md`, `docs/redesign/r305-heron-reference-spec.md`, `docs/redesign/r306-heron-exclusivity-spec.md` | standing design / Heron-parity canon |

## Archive

Closed rounds and superseded evidence live in **`docs/archive/redesign/`** (moved in T-21, branch `r338/t21-docs`):

- `r308, r310, r311, r313, r323, r332, r333` — closed round evidence (r313's `OVERRIDE-LEDGER.md` remains linked from `AGENTS.md` at its archive path).
- `handoff/` — r304/r305-era section handoffs and QA audits.
- `r335/` — round docs only (`HANDOFF.md`, `OWNERSHIP.md`, `REPORT.md`, `arsenal.md`); `heron-spec/` stayed live (see above).
- `r337/` — `HANDOFF.md` + `SECTION-BRIEF.md`; `OWNERSHIP.md` stayed live (see above).

Pre-redesign historical documents are directly under `docs/archive/`. Links from live docs into moved rounds were updated; archived docs keep their original relative links as a historical record.

## GitHub-Release offload candidates (future — NOT done here)

Heavy evidence dirs that could be attached to a GitHub Release instead of living in git. None were uploaded (API quota); offloading anything below requires a fetch/extract step in the reading script first:

- `docs/redesign/r335/heron-spec/` — **5.8 MB**, largest dir in the tree, but required in-place by the conformance instrument.
- `docs/archive/redesign/handoff/` — 4.2 MB of closed-round handoffs (safest first offload: read-only history).
- `docs/redesign/assets/` — 3.2 MB r305/r306 reference evidence (update the two spec-manifest links if moved).
- `docs/redesign/r331/` — 1.8 MB twin spec-of-record incl. `thumbs/` (same instrument caveat as heron-spec).
