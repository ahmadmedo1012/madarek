# Madarek docs — one-page map

One page: what is live, what is archived, and where the program state lives. If you are looking for a redesign round, it is either **live** below or in **`docs/archive/redesign/`**.

## The program (one paragraph)

Madarek's landing frontend is being conformed, section by section, to the Heron reference (heronaiapp.com) under the **R341 conformance program** (rounds r338–r340 closed; the standing law carries forward): frozen per-breakpoint reference specs (`docs/redesign/r335/heron-spec/` — 5 breakpoints × sections + footer + `_page`/`_motion`, extracted by `scripts/spec/extract-heron.mjs`) are diffed against our live DOM by `scripts/conformance/run.mjs` (light + `--dark`; section bindings in `scripts/conformance/mapping/*.json`; inner pages gate via `conformance/pages.mjs`, panel findings via `conformance/panel.mjs`). Every section must reach **≥90% on all 5 breakpoints + dark theme**; the full-matrix floor is ratcheted (91.8 — the r340 honesty re-pin from 93.6 under the hardened instrument; never lowered) and the JS bundle ceiling is 770 KB gz. Impossible cells may only be excused with a written justification in `docs/redesign/r338/excusals.md` (the standing ledger). Per-section numbers and the open task queue live in **`docs/redesign/r341/QUEUE.md`** (round handoffs: `docs/redesign/r341/HANDOFF.md`). The binding law for every agent is `AGENTS.md`.

## Where the live docs live

| Path | What |
|---|---|
| `AGENTS.md` | binding agent rules (repo root) |
| `scripts/README.md` | how to run every script (conformance instrument, gates, spec extraction) |
| `docs/redesign/r341/` | **live round**: `QUEUE.md` (task queue), `HANDOFF.md` (queen wave log), `OWNERSHIP.md` (binding per-wave ownership), `tasks/` (task briefs), `arsenal.md` |
| `docs/redesign/r338/excusals.md` | kept live (only file left in `r338/`): the **standing excusal ledger** — required by `AGENTS.md` (impossible cells need a written justification here) and referenced from `mapping/footer.json`/`home-intro-wrap.json` reason strings; stays unarchived, the rest of r338 is archived |
| `docs/redesign/r339/T-10-CHROME.md` | kept live (only file left in `r339/`), referenced by the instrument: 177 reason strings in `scripts/conformance/mapping/chrome.json` + its generator `gen-chrome-mapping.py` + the frozen `heron-spec/chrome.*.json` provenance — re-pointing would mean editing the frozen specs, so the file stays at this path unarchived; the rest of r339 is archived |
| `docs/redesign/r335/heron-spec/` | **FROZEN Heron specs** — read by `scripts/conformance/{run,scroll,interact}.mjs` + written by `scripts/spec/extract-heron.mjs`; path is load-bearing — do not move |
| `docs/redesign/r337/OWNERSHIP.md` | kept live: the r337/r338-era section→file seat table (historical; the per-wave binding is the current round's `OWNERSHIP.md`) |
| `docs/redesign/r331/` | kept live: `heron-program.json` is the spec-of-record for `scripts/twin/` (`scripts/twin/config.json`) |
| `docs/redesign/r320/` | kept live: `rename-keep.json` is the rename ledger read by the r320 gate (`scripts/r320/rules-runtime.mjs`) |
| `docs/redesign/assets/` | kept live: r305/r306 reference evidence, linked from the two spec docs below |
| `docs/redesign/BLUEPRINT.md`, `docs/redesign/r305-heron-reference-spec.md`, `docs/redesign/r306-heron-exclusivity-spec.md` | standing design / Heron-parity canon |

## Archive

Closed rounds and superseded evidence live in **`docs/archive/redesign/`** (moved in T-21, branch `r338/t21-docs`):

- `r308, r310, r311, r313, r323, r332, r333` — closed round evidence (r313's `OVERRIDE-LEDGER.md` remains linked from `AGENTS.md` at its archive path).
- `r338, r339, r340` — closed-round evidence, archived (task 8-i, branch `wip/arch`) with two keep-live exceptions documented in the live-docs table above: `r338/excusals.md` (the standing excusal ledger) and `r339/T-10-CHROME.md` (instrument-referenced) remain under `docs/redesign/`; r334/r336 never existed as directories.
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
