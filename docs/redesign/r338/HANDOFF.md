# R338 HANDOFF — lead-only log

- wave1 launched: T-00..T-07 (2026-11-05T10:20:23Z)
- wave1: T-00 done; T-06 partial (r338/t06-footer rewrite unmeasured); T-01/03/04/05/07 killed by harness deadline (8 parallel + dead shared install) → wave-1b respawn after install restart 2026-11-05T10:56:58Z
- wave-1b: T-03 partial (r338/t03-intro @70.6%), T-05 partial (r338/t05-why rewrite unmeasured); T-01/02/04/06b/07 died (backend deadline at 7 concurrent + flock starvation). POLICY: ≤4 concurrent, no flock, own ports 53NN, commit+push every sub-step. Install: node_modules usable; pw chromium retry low-prio; webkit unknown. Dark: instrument lacks dark path → T-14a queued 2026-11-05T11:32:05Z
- wave-2: T-01 DONE (a362bcb5 green, unlanded: main red root = results.json 846KB>500KB per-file + r309 floor; FCP /auth/register noise passed on rerun); T-07 DONE (scroll 5/5, feel 30/30); T-02/T-04 died twice → split into a/b. Wave-3: L-3 lander + T-02a + T-04a + T-03b 2026-11-05T12:04:55Z
