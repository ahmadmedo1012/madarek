# R339 OWNER NOTE — three items only the repo owner can fix

T-01 medic, round R339. None of these are fixable from an agent sandbox;
each blocks a piece of the pipeline that local verify.sh already covers.

## 1. GitHub Actions is dead — owner-side billing, not the workflows

Every remote run since the quota hit fails immediately with `steps:0`, and
the log download returns 404. That signature is the Actions quota /
spending-limit pattern on a private repo — the job is accepted then never
allocated an execution step, and logs are never produced.
**Fix (2 min):** repo Settings → *Billing and plans* → *Spending limits* →
raise/include Actions minutes, and confirm Actions is enabled for the repo.
No workflow file needs to change; local `verify.sh` mirrors CI exactly.

## 2. Repo ruleset rejects `r338/t13*` branch names

Pushing any branch matching `r338/t13*` is refused by a repository ruleset,
so that round's T13 work cannot land on its intended name. **Fix:** either
add the `r338/t13*` pattern to the ruleset's allowlist (Settings → Rules →
Rulesets → edit the branch-name rule), or confirm the rejection is
intentional so the T13 owner can rename on push. Please record the decision
either way — agents will keep hitting the wall otherwise.

## 3. WebKit conformance cells are host-blocked

The WebKit (Safari) conformance cells cannot run in this sandbox: Playwright's
WebKit launch needs libgtk-4, libGLESv2, and libwoff2dec, the sandbox has no
root to install them, and T-15 is currently attempting user-space library
extraction (unproven). **Fix (pick one):** run the matrix on a host that
already ships those libs (any desktop Linux with GTK4), or add a container
runner image that preinstalls the WebKit deps. Until then, treat WebKit
cells as environmentally excused, not conformance failures.

— end of note. Everything else in R339 is green locally (3051 vitest,
bundle gate 764.3 / 770 KB gz).
