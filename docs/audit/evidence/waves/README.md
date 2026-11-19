# Wave snapshots — the Heron fidelity scorecard history

Every full paired run overwrites `docs/audit/evidence/{capture,manifest,scorecard}.json`
and `primary/{local,reference}/*.png`. This directory keeps the *dial readings* of
superseded runs so a later number can be compared to the one it replaced, per the
plan's "no historic copies of results into current status" rule — the live
scorecard is always the current tree's own run; these are archives only.

| snapshot | tree | E | T | Q | note |
|---|---|---:|---:|---:|---|
| `r368-w1-before-original-media.*` | `wip/r368-t3` tip + instrument fix #3 | 57.2 | 83.7 % | 100 | first full 10 targets × 5 viewports × 4 states × 2 sides matrix; hero/usecase/platform still carried reference-band crops |
| `r368-w2-original-media.*` | `exec/r368-fidelity-v2` (authored media + preloader fix) | 55.0 | 96.5 % | 100 | the phase-close run: platform −11.2 / usecase −4.1 / hero −2.0 from the originality swap; T rose because the 1440 reference stage reached its maximum this run |

Reading a snapshot: `scorecard.json` carries `perSection` (E/T/covered/pairs and each
state's E), `dials`, `invalidRows` (both-sides reasons) and `E_unscored` (preregistered
mask-cap refusals). `manifest.json` carries the capture profile, census, mask policy and
the validator's rejection list.

Commands that produced them (this host):

```bash
PLAYWRIGHT_BROWSERS_PATH=/tmp/pw-browsers node scripts/conformance/fidelity.mjs \
  --local http://localhost:5303 --reference https://heronaiapp.com/ \
  --out docs/audit/evidence
```

`--score-only` re-derives E/T/Q from the committed crops alone, so any archived pair can
be re-scored without a browser.
